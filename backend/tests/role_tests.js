// Pruebas automáticas de roles: login, GET productos, POST intentos
// Ejecutar: node backend/tests/role_tests.js

(async () => {
  const base = 'http://localhost:3000';

  // Compatibilidad con Node <18 si está instalado node-fetch
  let fetchFn;
  if (typeof fetch !== 'undefined') fetchFn = fetch;
  else {
    try { fetchFn = require('node-fetch'); } catch (e) { console.error('Fetch no disponible. Instala node 18+ o node-fetch.'); process.exit(1); }
  }

  const fetchReq = fetchFn;

  const doLogin = async (username, password) => {
    const res = await fetchReq(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const txt = await res.text();
    try { return { status: res.status, body: JSON.parse(txt) }; } catch (e) { return { status: res.status, body: txt }; }
  };

  const doGet = async (token) => {
    const res = await fetchReq(base + '/api/productos', { headers: { Authorization: 'Bearer ' + token } });
    const txt = await res.text();
    try { return { status: res.status, body: JSON.parse(txt) }; } catch (e) { return { status: res.status, body: txt }; }
  };

  const doPost = async (token, payload) => {
    const res = await fetchReq(base + '/api/productos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    try { return { status: res.status, body: JSON.parse(txt) }; } catch (e) { return { status: res.status, body: txt }; }
  };

  console.log('--- Iniciando pruebas de roles ---');

  console.log('\n1) Login Viviana (admin)');
  const viv = await doLogin('viviana', 'viviana1234');
  console.log(viv);

  console.log('\n2) Login Vendedora (vendedor)');
  const vend = await doLogin('vendedora', 'vendedora1234');
  console.log(vend);

  const vivToken = viv.body && viv.body.token;
  const vendToken = vend.body && vend.body.token;

  console.log('\n3) GET /api/productos con token de Viviana');
  console.log(await doGet(vivToken));

  console.log('\n4) POST /api/productos con token de Vendedora (debería fallar con 403)');
  console.log(await doPost(vendToken, { nombre: 'PruebaVendedora', precio: 1.5 }));

  console.log('\n5) POST /api/productos con token de Viviana (debería crear 201)');
  console.log(await doPost(vivToken, { nombre: 'PruebaViviana', precio: 1.5 }));

  console.log('\n--- Pruebas finalizadas ---');
  process.exit(0);
})().catch(e => { console.error('ERROR EN PRUEBAS:', e); process.exit(1); });
