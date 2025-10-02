// Test script for the public invoice sharing system
const http = require('http');

const BASE_URL = 'http://localhost:5000';
const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI4YWEzNTQzMy1hYjRlLTRlNzAtYmJhOC02M2FlMzFkNzhmMzIiLCJlbWFpbCI6ImFkbWluQGZydWl0c3RhbmQuY29tIiwicm9sZSI6IkFETUlOIiwidGVuYW50SWQiOiI4YWEzNTQzMy1hYjRlLTRlNzAtYmJhOC02M2FlMzFkNzhmMzIiLCJpYXQiOjE3Mjc3MTI2NzB9.MO8FJxr6jQJbr4bGcpUmfaEfVZmSgVqW5acrKFf0Ga8';

// Simple HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = { 
            status: res.statusCode, 
            data: JSON.parse(data),
            ok: res.statusCode >= 200 && res.statusCode < 300
          };
          resolve(result);
        } catch (err) {
          resolve({ status: res.statusCode, data, ok: res.statusCode >= 200 && res.statusCode < 300 });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('🧪 Testing Public Invoice Sharing System...\n');

    // Step 1: Get a purchase invoice to work with
    console.log('1️⃣ Getting purchase invoices...');
    const invoicesResponse = await makeRequest(`${BASE_URL}/api/purchase-invoices`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!invoicesResponse.ok) {
      throw new Error(`Failed to get invoices: ${invoicesResponse.status} - ${JSON.stringify(invoicesResponse.data)}`);
    }

    const invoices = invoicesResponse.data;
    console.log(`✅ Found ${invoices.length} purchase invoices`);

    if (invoices.length === 0) {
      console.log('❌ No invoices found to test with');
      return;
    }

    const testInvoice = invoices[0];
    console.log(`🎯 Using invoice: ${testInvoice.invoiceNumber} (ID: ${testInvoice.id})\n`);

    // Step 2: Create a share link for the purchase invoice
    console.log('2️⃣ Creating share link for purchase invoice...');
    const shareResponse = await makeRequest(`${BASE_URL}/api/purchase-invoices/${testInvoice.id}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!shareResponse.ok) {
      throw new Error(`Failed to create share link: ${shareResponse.status} - ${JSON.stringify(shareResponse.data)}`);
    }

    const shareData = shareResponse.data;
    console.log('✅ Share link created successfully');
    console.log(`🔗 Public URL: ${shareData.data.publicUrl}`);
    console.log(`🎫 Token: ${shareData.data.shareLink.token}\n`);

    // Step 3: Test accessing the public endpoint (no authentication)
    console.log('3️⃣ Testing public access to shared invoice...');
    const publicResponse = await makeRequest(`${BASE_URL}/api/public/share/${shareData.data.shareLink.token}`);

    if (!publicResponse.ok) {
      throw new Error(`Failed to access public invoice: ${publicResponse.status} - ${JSON.stringify(publicResponse.data)}`);
    }

    const publicData = publicResponse.data;
    console.log('✅ Public invoice accessed successfully');
    console.log(`📋 Invoice Type: ${publicData.data.invoiceType}`);
    console.log(`📄 Invoice Number: ${publicData.data.invoice.invoiceNumber}`);
    console.log(`💰 Total Amount: $${publicData.data.invoice.netAmount}`);
    console.log(`🏢 Vendor: ${publicData.data.vendor?.name || 'N/A'}`);
    console.log(`🏭 Tenant: ${publicData.data.tenant.name}\n`);

    // Step 4: Test health check endpoint
    console.log('4️⃣ Testing public health check...');
    const healthResponse = await makeRequest(`${BASE_URL}/api/public/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}`);
    }

    const healthData = healthResponse.data;
    console.log('✅ Health check passed');
    console.log(`⚡ Status: ${healthData.status}`);

    console.log('\n🎉 All tests passed! Public invoice sharing system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testAPI();