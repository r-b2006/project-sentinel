const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const services = ['service-auth.js', 'service-payment.js', 'service-inventory.js'];
const portMap = { 'service-auth.js': 3001, 'service-payment.js': 3002, 'service-inventory.js': 3003 };

// Shuffle array (Fisher-Yates)
function shuffle(arr) {
    const arr2 = [...arr];
    for (let i = arr2.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr2[i], arr2[j]] = [arr2[j], arr2[i]];
    }
    return arr2;
}

// Track run count for balanced distribution
let runCount = 0;
let shuffledServices = shuffle(services);

const bugs = [
    {
        id: 1,
        name: 'Syntax Error',
        description: 'Added syntax error on line 2',
        apply: (filePath) => {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            lines.splice(1, 0, 'const x = ;');
            fs.writeFileSync(filePath, lines.join('\n'));
        }
    },
    {
        id: 2,
        name: 'Type Mismatch',
        description: 'Port number wrapped in quotes + throw error',
        apply: (filePath) => {
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace(/const PORT = (\d+);/g, 'const PORT = "$1";\nthrow new Error("Port configuration invalid");');
            fs.writeFileSync(filePath, content);
        }
    },
    {
        id: 3,
        name: 'Logic Error',
        description: 'Health check returns BROKEN instead of OK',
        apply: (filePath) => {
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace(/status: 'OK'/g, "status: 'BROKEN'");
            fs.writeFileSync(filePath, content);
        }
    },
    {
        id: 4,
        name: 'Delete Dependency',
        description: 'Express require line commented out',
        apply: (filePath) => {
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace(/^const express = require\('express'\);/m, '// const express = require(\'express\');');
            fs.writeFileSync(filePath, content);
        }
    },
    {
        id: 5,
        name: 'Corrupt JSON Config',
        description: 'Created invalid config.json + require it in service',
        apply: (filePath) => {
            const configPath = path.join(__dirname, '..', 'services', 'config.json');
            fs.writeFileSync(configPath, '{invalid json: [}');
            let content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            lines.splice(2, 0, "const config = require('./config.json');");
            fs.writeFileSync(filePath, lines.join('\n'));
        }
    }
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function createIncident(serviceName, bug) {
    const timestamp = new Date().toISOString();
    const incident = `INCIDENT|${timestamp}|${serviceName}|Bug Type ${bug.id}: ${bug.description}|OPEN\n`;

    fs.appendFileSync(path.join(__dirname, '..', 'services', 'error.log'), `[${timestamp}] Bug Type ${bug.id} - ${bug.description} applied to ${serviceName}\n`);
    fs.appendFileSync(path.join(__dirname, '..', 'docs', 'incident-history.log'), incident);
}

function killServiceByPort(port) {
    return new Promise((resolve) => {
        exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (err, stdout) => {
            if (stdout && stdout.trim()) {
                const pid = stdout.trim().split(/\s+/).pop();
                if (pid && !isNaN(pid)) {
                    console.log(`🔪 Killing process on port ${port} (PID: ${pid})`);
                    exec(`taskkill /F /PID ${pid}`, (killErr) => {
                        if (killErr) {
                            console.log(`   Process not killed: ${killErr.message}`);
                        } else {
                            console.log(`   ✅ Process killed`);
                        }
                        resolve();
                    });
                } else {
                    resolve();
                }
            } else {
                console.log(`   No process found on port ${port}`);
                resolve();
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

async function updateServiceStatusWithRetry(serviceName, status, errorMessage, maxRetries = 3) {
    // First check if API is reachable
    const reachable = await checkApiReachable();

    if (!reachable) {
        console.log(`   ⚠️ Next.js not reachable, using direct database fallback`);
        return updateDirectDb(serviceName, status, errorMessage);
    }

    // Retry logic
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📡 Calling API (attempt ${attempt}/${maxRetries})...`);
            const response = await fetch('http://localhost:3000/api/services/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_name: serviceName,
                    status: status,
                    error_message: errorMessage || ''
                })
            });
            const result = await response.json();
            if (result.success) {
                console.log(`   ✅ API updated: ${serviceName} = ${status}`);
                return result;
            }
        } catch (error) {
            console.log(`   ❌ Attempt ${attempt} failed: ${error.message}`);
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // If all retries fail, use direct database
    console.log(`   🔄 All API attempts failed, using direct database fallback`);
    return updateDirectDb(serviceName, status, errorMessage);
}

function updateDirectDb(serviceName, status, errorMessage) {
    try {
        const Database = require('better-sqlite3');
        const dbPath = path.join(__dirname, '..', 'sentinel.db');
        const db = new Database(dbPath);

        const stmt = db.prepare(`
            UPDATE service_status
            SET status = ?, error_message = ?, updated_at = datetime('now')
            WHERE service_name = ?
        `);
        stmt.run(status, errorMessage || '', serviceName);
        db.close();

        console.log(`   ✅ Direct DB updated: ${serviceName} = ${status}`);
        return { success: true, source: 'direct_db' };
    } catch (error) {
        console.log(`   ❌ Direct DB also failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function run() {
    runCount++;
    if (runCount % 3 === 0) {
        shuffledServices = shuffle(services);
    }
    const serviceFile = shuffledServices[(runCount - 1) % 3];
    const servicePath = path.join(__dirname, '..', 'services', serviceFile);
    const serviceName = serviceFile.replace('.js', '');
    const port = portMap[serviceFile];
    const bug = pickRandom(bugs);

    console.log(`\n🐒 Applying bug to ${serviceFile}...`);

    try {
        bug.apply(servicePath);
        console.log(`   ✅ Bug injected into ${serviceFile}`);

        await killServiceByPort(port);

        createIncident(serviceName, bug);
        console.log(`   ✅ Incident logged`);

        const result = await updateServiceStatusWithRetry(serviceName, 'CRITICAL', `Bug Type ${bug.id}: ${bug.description}`);

        console.log(`\n🐒 CHAOS UNLEASHED: Bug Type ${bug.id} - ${bug.description} in ${serviceFile}\n`);

    } catch (error) {
        console.error(`❌ Failed to apply bug: ${error.message}`);
        process.exit(1);
    }
}

run();