// Test CORS headers from the actual frontend origin (localhost:5174)
const API_BASE = 'http://localhost:5000/api';
const ORIGIN_5174 = 'http://localhost:5174';
const ORIGIN_5173 = 'http://localhost:5173';

async function testCorsForOrigin(origin) {
  console.log(`\nTesting with Origin: ${origin}`);

  // OPTIONS preflight
  const preflightRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'OPTIONS',
    headers: {
      'Origin': origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });
  const preflightACAO = preflightRes.headers.get('access-control-allow-origin');
  console.log(`  OPTIONS preflight status: ${preflightRes.status}, ACAO: ${preflightACAO}`);
  if (preflightACAO !== origin) {
    console.log(`  [FAIL] Preflight CORS not set for ${origin}`);
    return false;
  }
  console.log(`  [PASS] Preflight OK`);

  // POST login
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Origin': origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginBody = await loginRes.json();
  const loginACAO = loginRes.headers.get('access-control-allow-origin');
  const loginOk = loginRes.status === 200 && loginBody.success === true && loginACAO === origin;
  console.log(`  POST login status: ${loginRes.status}, ACAO: ${loginACAO}, success: ${loginBody.success}`);
  console.log(`  ${loginOk ? '[PASS]' : '[FAIL]'} Login CORS for ${origin}`);
  return loginOk;
}

async function runAll() {
  console.log('=== MARG CORS TEST FOR BOTH VITE PORTS ===\n');
  
  // Health
  const h = await fetch(`${API_BASE}/health`);
  const hj = await h.json();
  console.log(`[${h.status === 200 ? 'PASS' : 'FAIL'}] GET /api/health: ${JSON.stringify(hj)}`);

  const ok5173 = await testCorsForOrigin(ORIGIN_5173);
  const ok5174 = await testCorsForOrigin(ORIGIN_5174);

  console.log('\n=== FULL ENDPOINT TEST ===');
  const endpoints = [
    ['GET', '/trains'],
    ['GET', '/assets'],
    ['GET', '/maintenance'],
    ['GET', '/blocks'],
    ['GET', '/dashboard'],
    ['GET', '/data-gov/status'],
    ['GET', '/data-gov/test'],
    ['GET', '/config/status'],
  ];

  for (const [method, ep] of endpoints) {
    try {
      const res = await fetch(`${API_BASE}${ep}`);
      const body = await res.json();
      const count = Array.isArray(body) ? ` (${body.length} records)` : '';
      console.log(`[${res.status === 200 ? 'PASS' : 'FAIL'}] ${method} /api${ep}${count}`);
    } catch (e) {
      console.log(`[FAIL] ${method} /api${ep} - ${e.message}`);
    }
  }

  // Copilot
  try {
    const chatRes = await fetch(`${API_BASE}/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How many trains are in the database?' })
    });
    const chatBody = await chatRes.json();
    console.log(`[${chatRes.status === 200 ? 'PASS' : 'FAIL'}] POST /api/copilot/chat - answer: ${chatBody.answer?.substring(0, 60)}...`);
  } catch(e) {
    console.log(`[FAIL] POST /api/copilot/chat - ${e.message}`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`CORS for localhost:5173: ${ok5173 ? 'PASS' : 'FAIL'}`);
  console.log(`CORS for localhost:5174: ${ok5174 ? 'PASS' : 'FAIL'}`);
}

runAll().catch(console.error);
