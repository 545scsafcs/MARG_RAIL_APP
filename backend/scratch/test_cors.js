// Test CORS headers from the Vite dev origin
const API_BASE = 'http://localhost:5000/api';
const ORIGIN = 'http://localhost:5173';

async function testCors() {
  console.log('=== MARG CORS VERIFICATION ===\n');
  console.log(`Testing with Origin: ${ORIGIN}\n`);

  // 1. Test preflight OPTIONS
  console.log('--- 1. OPTIONS Preflight /api/auth/login ---');
  const preflightRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      'Origin': ORIGIN,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });
  console.log('Status:', preflightRes.status);
  console.log('Access-Control-Allow-Origin:', preflightRes.headers.get('access-control-allow-origin'));
  console.log('Access-Control-Allow-Methods:', preflightRes.headers.get('access-control-allow-methods'));
  console.log('Access-Control-Allow-Headers:', preflightRes.headers.get('access-control-allow-headers'));
  console.log('Access-Control-Allow-Credentials:', preflightRes.headers.get('access-control-allow-credentials'));
  
  const preflightOk = preflightRes.headers.get('access-control-allow-origin') === ORIGIN;
  console.log(preflightOk ? '[PASS] Preflight OK' : '[FAIL] Preflight Missing ACAO header');

  // 2. Test actual GET with Origin header
  console.log('\n--- 2. GET /api/health with Origin header ---');
  const healthRes = await fetch(`${API_BASE}/health`, {
    headers: { 'Origin': ORIGIN }
  });
  const healthACAO = healthRes.headers.get('access-control-allow-origin');
  console.log('Status:', healthRes.status);
  console.log('Access-Control-Allow-Origin:', healthACAO);
  console.log(healthACAO === ORIGIN ? '[PASS] GET health CORS OK' : '[FAIL] GET health missing ACAO');

  // 3. Test actual POST login with Origin header
  console.log('\n--- 3. POST /api/auth/login with Origin header ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Origin': ORIGIN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginACAO = loginRes.headers.get('access-control-allow-origin');
  const loginBody = await loginRes.json();
  console.log('Status:', loginRes.status);
  console.log('Access-Control-Allow-Origin:', loginACAO);
  console.log('Response:', JSON.stringify(loginBody));
  const loginOk = loginRes.status === 200 && loginBody.success === true && loginACAO === ORIGIN;
  console.log(loginOk ? '[PASS] Login CORS + Auth OK' : '[FAIL] Login failed');

  // 4. Test wrong credentials
  console.log('\n--- 4. POST /api/auth/login - wrong credentials ---');
  const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Origin': ORIGIN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: 'admin', password: 'wrongpass' })
  });
  const badLoginBody = await badLoginRes.json();
  console.log('Status:', badLoginRes.status);
  console.log('Response:', JSON.stringify(badLoginBody));
  const badLoginOk = badLoginRes.status === 401 && badLoginBody.success === false;
  console.log(badLoginOk ? '[PASS] 401 response for wrong credentials OK' : '[FAIL] Wrong error code for bad credentials');

  console.log('\n=== CORS VERIFICATION COMPLETE ===');
  if (preflightOk && loginOk && badLoginOk) {
    console.log('\n✓ CORS is correctly configured for http://localhost:5173');
  } else {
    console.log('\n✗ Some CORS checks failed. Review the above output.');
  }
}

testCors().catch(console.error);
