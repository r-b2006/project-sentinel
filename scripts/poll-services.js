const Database = require('better-sqlite3');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sentinel.db');
const db = new Database(dbPath);
const errorLogPath = path.join(__dirname, '..', 'services', 'error.log');

const services = [
    { name: 'service-auth', url: 'http://localhost:3001/health', file: 'C:/Users/HP/project-sentinel/services/service-auth.js' },
    { name: 'service-payment', url: 'http://localhost:3002/health', file: 'C:/Users/HP/project-sentinel/services/service-payment.js' },
    { name: 'service-inventory', url: 'http://localhost:3003/health', file: 'C:/Users/HP/project-sentinel/services/service-inventory.js' }
];

// Map service names to port for killing
const portMap = { 'service-auth': 3001, 'service-payment': 3002, 'service-inventory': 3003 };

function getPreviousStatus(serviceName) {
    try {
        const stmt = db.prepare('SELECT status FROM service_status WHERE service_name = ?');
        const row = stmt.get(serviceName);
        return row ? row.status : null;
    } catch {
        return null;
    }
}

function restartService(service) {
    return new Promise((resolve) => {
        const port = portMap[service.name];
        console.log(`   🔄 Restarting ${service.name} (port ${port})...`);

        // Kill existing process on port
        exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (err, stdout) => {
            if (stdout && stdout.trim()) {
                const pid = stdout.trim().split(/\s+/).pop();
                if (pid && !isNaN(pid)) {
                    exec(`taskkill /F /PID ${pid}`, () => {
                        setTimeout(() => {
                            exec(`node "${service.file}"`, (spawnErr, stdout, stderr) => {
                                if (spawnErr) {
                                    console.log(`   ❌ Restart failed: ${spawnErr.message}`);
                                } else {
                                    console.log(`   ✅ Service restarted`);
                                }
                                resolve();
                            });
                        }, 1000);
                    });
                } else {
                    resolve();
                }
            } else {
                // No process running, start it
                exec(`node "${service.file}"`, (spawnErr) => {
                    if (spawnErr) {
                        console.log(`   ❌ Start failed: ${spawnErr.message}`);
                    } else {
                        console.log(`   ✅ Service started`);
                    }
                    resolve();
                });
            }
        });
    });
}

async function checkApiReachable() {
    try {
        const response = await fetch('http://localhost:3000/api/services', { method: 'GET', signal: AbortSignal.timeout(2000) });
        return response.ok;
    } catch {
        return false;
    }
}

async function updateServiceWithRetry(serviceName, status, errorMessage, maxRetries = 3) {
    const reachable = await checkApiReachable();

    if (!reachable) {
        return updateDirectDb(serviceName, status, errorMessage);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('http://localhost:3000/api/services/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_name: serviceName,
                    status: status,
                    error_message: errorMessage
                })
            });
            const result = await response.json();
            if (result.success) {
                return { success: true };
            }
        } catch (error) {
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    return updateDirectDb(serviceName, status, errorMessage);
}

function updateDirectDb(serviceName, status, errorMessage) {
    try {
        const stmt = db.prepare(`
            UPDATE service_status
            SET status = ?, error_message = ?, updated_at = datetime('now')
            WHERE service_name = ?
        `);
        stmt.run(status, errorMessage || '', serviceName);
        return { success: true, source: 'direct_db' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function checkService(service) {
    const previousStatus = getPreviousStatus(service.name);
    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(service.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: Non-200 response`);
        }

        const data = await response.json();

        if (duration > 3000) {
            throw new Error(`Timeout: Response took ${duration}ms (>3s)`);
        }

        if (data.status === 'OK') {
            // Only update to OK if not already RESOLVED or INVESTIGATING (preserve manual status)
            if (previousStatus !== 'RESOLVED' && previousStatus !== 'INVESTIGATING') {
                const stmt = db.prepare(`
                    UPDATE service_status
                    SET status = 'OK', last_checked = datetime('now'), error_message = '', updated_at = datetime('now')
                    WHERE service_name = ?
                `);
                stmt.run(service.name);
                console.log(`✅ ${service.name}: OK (${duration}ms)`);
            } else {
                console.log(`✅ ${service.name}: OK (${duration}ms) [status preserved: ${previousStatus}]`);
            }

            // Auto-restart if previously CRITICAL (service was fixed)
            if (previousStatus === 'CRITICAL') {
                console.log(`   🔄 Service was CRITICAL, now OK — restarting to pick up fix...`);
                await restartService(service);
            }
        } else if (data.status === 'BROKEN') {
            // Set to INVESTIGATING first when issue detected
            const stmt = db.prepare(`
                UPDATE service_status
                SET status = 'INVESTIGATING', last_checked = datetime('now'), error_message = ?, updated_at = datetime('now')
                WHERE service_name = ?
            `);
            stmt.run(`Status: ${data.status}`, service.name);
            console.log(`🔍 ${service.name}: INVESTIGATING (status: BROKEN)`);
        } else {
            throw new Error(`Status: ${data.status}`);
        }
    } catch (error) {
        const errorMessage = error.message;
        const isConnRefused = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed');

        // Only update to INVESTIGATING if not already RESOLVED (preserve resolved status)
        if (previousStatus !== 'RESOLVED') {
            const stmt = db.prepare(`
                UPDATE service_status
                SET status = 'INVESTIGATING', last_checked = datetime('now'), error_message = ?, updated_at = datetime('now')
                WHERE service_name = ?
            `);
            stmt.run(errorMessage, service.name);
        }

        // Call API with retry logic
        await updateServiceWithRetry(service.name, 'INVESTIGATING', errorMessage);

        // Auto-restart ALL services when they're down (connection refused)
        if (isConnRefused) {
            console.log(`   🔄 Service is down, attempting auto-restart...`);
            await restartService(service);

            // After restart attempt, update to CRITICAL if still down
            const checkStmt = db.prepare(`
                UPDATE service_status
                SET status = 'CRITICAL', last_checked = datetime('now'), error_message = ?, updated_at = datetime('now')
                WHERE service_name = ?
            `);
            checkStmt.run(errorMessage, service.name);
        }

        if (isConnRefused) {
            console.log(`❌ ${service.name}: CRITICAL — connection refused`);
        } else {
            console.log(`❌ ${service.name}: CRITICAL — ${errorMessage}`);
        }

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] CRITICAL: ${service.name} — ${errorMessage}\n`;
        fs.appendFileSync(errorLogPath, logEntry);
    }
}

async function pollAllServices() {
    console.log(`\n[${new Date().toISOString()}] Polling services...`);
    const promises = services.map(checkService);
    await Promise.all(promises);
}

console.log('🔍 Sentinel Monitor active — polling every 5 seconds...');

pollAllServices();
setInterval(pollAllServices, 5000);