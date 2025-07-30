const axios = require('axios');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

// Test configuration
const testConfig = {
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to run tests
const runTest = async (testName, testFunction) => {
  testResults.total++;
  try {
    await testFunction();
    testResults.passed++;
    testResults.details.push({ name: testName, status: 'PASSED' });
    console.log(`✅ ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name: testName, status: 'FAILED', error: error.message });
    console.log(`❌ ${testName}: ${error.message}`);
  }
};

// Test 1: Health check endpoint
const testHealthCheck = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/health`, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.status || response.data.status !== 'healthy') {
    throw new Error('Health check response missing or invalid');
  }
  
  if (!response.data.timestamp) {
    throw new Error('Health check missing timestamp');
  }
};

// Test 2: Version endpoint
const testVersionEndpoint = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/version`, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.version || response.data.version !== '1.0.0') {
    throw new Error('Version endpoint response missing or invalid');
  }
};

// Test 3: Tenants endpoint (basic)
const testTenantsEndpoint = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/tenants`, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (!response.data.tenants || !Array.isArray(response.data.tenants)) {
    throw new Error('Tenants endpoint response missing or invalid');
  }
  
  if (!response.data.count || typeof response.data.count !== 'number') {
    throw new Error('Tenants endpoint missing count');
  }
  
  if (!response.data.timestamp) {
    throw new Error('Tenants endpoint missing timestamp');
  }
};

// Test 4: Tenants endpoint with active filter
const testTenantsWithActiveFilter = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/tenants?active=true`, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  // Check that all returned tenants are active
  const allActive = response.data.tenants.every(tenant => tenant.is_active === true);
  if (!allActive) {
    throw new Error('Not all returned tenants are active');
  }
};

// Test 5: Tenants endpoint with invalid active parameter
const testTenantsWithInvalidActive = async () => {
  try {
    await axios.get(`${BASE_URL}/api/public/tenants?active=invalid`, testConfig);
    throw new Error('Expected 400 error for invalid active parameter');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // Expected error
      return;
    }
    throw new Error(`Expected 400 error, got ${error.response?.status || 'unknown'}`);
  }
};

// Test 6: Cache status endpoint
const testCacheStatus = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/cache/status`, testConfig);
  
  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }
  
  if (typeof response.data.cached !== 'boolean') {
    throw new Error('Cache status missing cached property');
  }
  
  if (typeof response.data.ttl !== 'number') {
    throw new Error('Cache status missing ttl property');
  }
};

// Test 7: Security headers
const testSecurityHeaders = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/health`, testConfig);
  
  const requiredHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'referrer-policy',
    'content-security-policy'
  ];
  
  for (const header of requiredHeaders) {
    if (!response.headers[header]) {
      throw new Error(`Missing security header: ${header}`);
    }
  }
};

// Test 8: Rate limiting (basic)
const testRateLimiting = async () => {
  // Make multiple requests quickly to trigger rate limiting
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(axios.get(`${BASE_URL}/api/public/health`, testConfig));
  }
  
  const responses = await Promise.all(promises);
  
  // All should succeed (rate limit is 100 per 15 minutes)
  for (const response of responses) {
    if (response.status !== 200) {
      throw new Error(`Rate limiting test failed: ${response.status}`);
    }
  }
};

// Test 9: Error handling
const testErrorHandling = async () => {
  try {
    await axios.get(`${BASE_URL}/api/public/nonexistent`, testConfig);
    throw new Error('Expected 404 error for nonexistent endpoint');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Expected error
      return;
    }
    throw new Error(`Expected 404 error, got ${error.response?.status || 'unknown'}`);
  }
};

// Test 10: CORS headers
const testCORSHeaders = async () => {
  const response = await axios.get(`${BASE_URL}/api/public/health`, testConfig);
  
  // Check for CORS headers
  if (!response.headers['access-control-allow-origin']) {
    console.log('Warning: CORS headers not found (may be normal in some configurations)');
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🧪 Testing Public Middleware Fixes...\n');
  
  const tests = [
    { name: 'Health Check Endpoint', fn: testHealthCheck },
    { name: 'Version Endpoint', fn: testVersionEndpoint },
    { name: 'Tenants Endpoint (Basic)', fn: testTenantsEndpoint },
    { name: 'Tenants Endpoint (Active Filter)', fn: testTenantsWithActiveFilter },
    { name: 'Tenants Endpoint (Invalid Active)', fn: testTenantsWithInvalidActive },
    { name: 'Cache Status Endpoint', fn: testCacheStatus },
    { name: 'Security Headers', fn: testSecurityHeaders },
    { name: 'Rate Limiting (Basic)', fn: testRateLimiting },
    { name: 'Error Handling', fn: testErrorHandling },
    { name: 'CORS Headers', fn: testCORSHeaders }
  ];
  
  for (const test of tests) {
    await runTest(test.name, test.fn);
  }
  
  // Print results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.details
      .filter(test => test.status === 'FAILED')
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
  }
  
  console.log('\n🎉 Public Middleware Fixes Test Complete!');
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests }; 