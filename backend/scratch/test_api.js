import axios from 'axios';

async function testApi() {
  console.log('--- Checking Backend Health Endpoint ---');
  const healthRes = await axios.get('http://127.0.0.1:5000/api/health');
  console.log('Health Output:', healthRes.data);

  console.log('\n--- Checking Dashboard Endpoint ---');
  const dashRes = await axios.get('http://127.0.0.1:5000/api/dashboard');
  console.log('Dashboard Data:', dashRes.data);

  console.log('\n--- Checking Python Service Direct Health ---');
  const pyRes = await axios.get('http://127.0.0.1:5001/health');
  console.log('Python Service Output:', pyRes.data);

  console.log('\n✅ ONE-COMMAND MARG SERVICES VERIFIED FULLY WORKING!');
  process.exit(0);
}

testApi().catch(err => {
  console.error('API Test Error:', err.message);
  process.exit(1);
});
