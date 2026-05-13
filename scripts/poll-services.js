const Database = require('better-sqlite3');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sentinel.db');
const db = new Database(dbPath);

const services = [
    { name: 'service-auth', url: 'http://localhost:3001/health', path: 'C:\\Users\\HP\\project-sentinel\\services\\service-auth.js' },
    { name: 'service-payment', url: 'http://localhost:3002/health', path: 'C:\\Users\\HP\\project-sentinel\\services\\service-payment.js' },
    { name: 'service-inventory', url: 'http://localhost:3003/health', path: 'C:\\Users\\HP\\project-sentinel\\services\\service-inventory.js' }
];

function getStatus(serviceName) {
    try {
        const stmt = db.prepare('SELECT status, resolved_by FROM service_status WHERE service_name = ?');
        const row = stmt.get(serviceName);
        return row ? { status: row.status, resolved_by: row.resolved_by } : null;
    } catch {
        return null;
    }
}

function updateStatus(serviceName, status) {
    try {
        const stmt = db.prepare(`
            UPDATE service_status
            SET status = ?, last_checked = datetime('now'), updated_at = datetime('now')
            WHERE service_name = ?
        `);
        stmt.run(status, serviceName);
    } catch (e) {
        console.error('DB update error:', e.message);
    }
}

function restartService(service) {
    return new Promise((resolve) => {
        console.log(`   🔄 Restarting ${service.name}...`);

        // Use Windows start /b to run in background without new window
        const child = spawn('cmd', ['/c', 'start', '/b', 'node', service.path], {
            detached: true,
            stdio: 'ignore',
            shell: false
        });
        child.unref();

        // Wait 5 seconds for service to start, then check health
        setTimeout(async () => {
            try {
                const response = await fetch(service.url, { signal: AbortSignal.timeout(3000) });
                if (response.ok) {
                    console.log(`   ✅ ${service.name} restarted successfully`);
                    updateStatus(service.name, 'OK');
                } else {
                    console.log(`   ❌ ${service.name} restart failed - non-200 response`);
                    // Try one more time after another 3 seconds
                    setTimeout(async () => {
                        try {
                            const retryResponse = await fetch(service.url, { signal: AbortSignal.timeout(3000) });
                            if (retryResponse.ok) {
                                console.log(`   ✅ ${service.name} restarted (retry)`);
                                updateStatus(service.name, 'OK');
                            }
                        } catch {}
                        resolve();
                    }, 3000);
                    return;
                }
            } catch (e) {
                console.log(`   ❌ ${service.name} restart failed - ${e.message}`);
            }
            resolve();
        }, 5000);
    });
}

async function checkService(service) {
    const info = getStatus(service.name);
    const currentStatus = info ? info.status : null;
    const resolvedBy = info ? info.resolved_by : '';

    // If status is RESOLVED and has resolved_by, restart the service
    if (currentStatus === 'RESOLVED' && resolvedBy && resolvedBy.trim() !== '') {
        await restartService(service);
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(service.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            updateStatus(service.name, 'OK');
            console.log(`✅ ${service.name}: OK`);
        } else {
            updateStatus(service.name, 'CRITICAL');
            console.log(`🔴 ${service.name}: CRITICAL`);
        }
    } catch (error) {
        updateStatus(service.name, 'CRITICAL');
        console.log(`🔴 ${service.name}: CRITICAL`);
    }
}

async function pollAllServices() {
    console.log(`\n[${new Date().toISOString()}] Polling services...`);
    for (const service of services) {
        await checkService(service);
    }
}

console.log('🔍 Sentinel Monitor active — polling every 10 seconds...');

pollAllServices();
setInterval(pollAllServices, 10000);