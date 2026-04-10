const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const dataStr = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(dataStr)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                resolve({ status: res.statusCode, data: JSON.parse(responseData) });
            });
        });

        req.on('error', reject);
        req.write(dataStr);
        req.end();
    });
}

async function test() {
    console.log('=== Test 1: Send SMS ===');
    const phone = '15112345678';
    const smsResult = await post('/api/auth/send-sms', { phone });
    console.log('Status:', smsResult.status);
    console.log('Response:', JSON.stringify(smsResult.data, null, 2));

    if (smsResult.data.success) {
        console.log('\n=== Test 2: SMS Login (Wrong Code) ===');
        const wrongLogin = await post('/api/auth/sms-login', { phone, code: '123456' });
        console.log('Status:', wrongLogin.status);
        console.log('Response:', JSON.stringify(wrongLogin.data, null, 2));
    }

    console.log('\n=== Test 3: Send SMS (Invalid Phone) ===');
    const invalidPhone = await post('/api/auth/send-sms', { phone: '123' });
    console.log('Status:', invalidPhone.status);
    console.log('Response:', JSON.stringify(invalidPhone.data, null, 2));

    console.log('\n=== All Tests Completed ===');
}

test().catch(console.error);