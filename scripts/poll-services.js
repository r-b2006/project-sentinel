const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sentinel.db');
const db = new Database(dbPath);
const errorLogPath = path.join(__dirname, '..', 'services', 'error.log');

const services = [
    { name: 'service-auth', url: 'http://localhost:3001/health' },
    { name: 'service-payment', url: 'http://localhost:3002/health' },
    { name: 'service-inventory', url: 'http://localhost:3003/health' }
];

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
            const stmt = db.prepare(`
                UPDATE service_status
                SET status = 'OK', last_checked = datetime('now'), error_message = '', updated_at = datetime('now')
                WHERE service_name = ?
            `);
            stmt.run(service.name);
            console.log(`✅ ${service.name}: OK (${duration}ms)`);
        } else {
            throw new Error(`Status: ${data.status}`);
        }
    } catch (error) {
        const errorMessage = error.message;
        const isConnRefused = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed');

        // Update database directly
        const stmt = db.prepare(`
            UPDATE service_status
            SET status = 'CRITICAL', last_checked = datetime('now'), error_message = ?, updated_at = datetime('now')
            WHERE service_name = ?
        `);
        stmt.run(errorMessage, service.name);

        // Call API with retry logic
        await updateServiceWithRetry(service.name, 'CRITICAL', errorMessage);

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

console.log('🔍 Sentinel Monitor active — polling every 10 seconds...');

pollAllServices();
setInterval(pollAllServices, 10000);