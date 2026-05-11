const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3003;
const SERVICE_NAME = 'inventory';
const LOG_FILE = path.join(__dirname, 'logs', 'service-inventory.log');

app.get('/health', (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] GET /health called on ${SERVICE_NAME}`);
        res.json({ status: 'OK', service: SERVICE_NAME, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in /health:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/work', (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] GET /work called on ${SERVICE_NAME}`);
        res.json({ message: 'Inventory checked', timestamp: new Date().toISOString() });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in /work:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

function logRunningStatus() {
    const logEntry = `[${new Date().toISOString()}] service-inventory RUNNING port:3003\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
        console.log(`[${new Date().toISOString()}] Logged to ${LOG_FILE}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to write log:`, error.message);
    }
}

app.listen(PORT, () => {
    console.log(`✅ Service Inventory running on port ${PORT}`);
    logRunningStatus();
    setInterval(logRunningStatus, 30000);
});