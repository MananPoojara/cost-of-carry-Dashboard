/**
 * Test the improved XTS connection
 */
require('dotenv').config();
const XTSService = require('./XTSService');

async function testConnection() {
    console.log('🧪 Testing improved XTS connection...');

    const xtsService = new XTSService();
    const results = await xtsService.testConnection();
    console.log(results)

    console.log('\n📊 Test Results:');
    console.log('================');
    console.log('Credentials Present:', results.credentialsPresent ? '✅' : '❌');
    console.log('Authentication Success:', results.authenticationSuccess ? '✅' : '❌');
    console.log('WebSocket Success:', results.websocketSuccess ? '✅' : '❌');
    console.log('Overall Success:', results.overallSuccess ? '✅' : '❌');

    if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }

    console.log('\n📋 Status:', xtsService.getStatus());
}

testConnection().catch(console.error);