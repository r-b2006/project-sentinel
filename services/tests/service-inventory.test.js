const http = require('http');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('Running service-inventory tests...\n');

    let passed = 0;
    let failed = 0;

    try {
        console.log('Test 1: /health returns HTTP 200');
        const r = await makeRequest('http://localhost:3003/health');
        if (r.statusCode === 200) { console.log('  ✅ PASSED'); passed++; }
        else { console.log(`  ❌ FAILED: got ${r.statusCode}`); failed++; }

        console.log('\nTest 2: Response has {status: "OK"}');
        if (r.body && r.body.status === 'OK') { console.log('  ✅ PASSED'); passed++; }
        else { console.log(`  ❌ FAILED: got "${r.body?.status}"`); failed++; }

        console.log('\nTest 3: Service name is "inventory"');
        if (r.body && r.body.service === 'inventory') { console.log('  ✅ PASSED'); passed++; }
        else { console.log(`  ❌ FAILED: got "${r.body?.service}"`); failed++; }
    } catch (e) {
        console.log(`  ❌ FAILED: ${e.message}`); failed++;
    }

    console.log(`\n========================================`);
    console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`========================================`);
    console.log(failed === 0 ? '\n🎉 ALL TESTS PASSED' : '\n⚠️ SOME TESTS FAILED');
    process.exit(failed);
}

runTests();