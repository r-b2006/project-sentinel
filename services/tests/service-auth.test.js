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
    console.log('Running service-auth tests...\n');

    let passed = 0;
    let failed = 0;

    try {
        // Test 1: /health returns HTTP 200
        console.log('Test 1: /health endpoint returns HTTP 200');
        const result1 = await makeRequest('http://localhost:3001/health');
        if (result1.statusCode === 200) {
            console.log('  ✅ PASSED: Status code is 200');
            passed++;
        } else {
            console.log(`  ❌ FAILED: Expected 200, got ${result1.statusCode}`);
            failed++;
        }

        // Test 2: Response contains {status: 'OK'}
        console.log('\nTest 2: Response contains {status: "OK"}');
        if (result1.body && result1.body.status === 'OK') {
            console.log('  ✅ PASSED: Response status is "OK"');
            passed++;
        } else {
            console.log(`  ❌ FAILED: Expected status "OK", got "${result1.body?.status}"`);
            failed++;
        }

        // Test 3: Server started without errors
        console.log('\nTest 3: Server started without errors');
        if (result1.body && result1.body.service === 'auth') {
            console.log('  ✅ PASSED: Service name is "auth"');
            passed++;
        } else {
            console.log(`  ❌ FAILED: Expected service "auth", got "${result1.body?.service}"`);
            failed++;
        }

    } catch (error) {
        console.log(`  ❌ FAILED: ${error.message}`);
        failed++;
    }

    console.log(`\n========================================`);
    console.log(`Total: ${passed + failed} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`========================================`);

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED');
        process.exit(0);
    } else {
        console.log('\n⚠️ SOME TESTS FAILED');
        process.exit(1);
    }
}

runTests();