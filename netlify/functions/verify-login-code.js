// Bekræfter engangskoden til Min booking og opretter en login-session.
//
// Sessionen (en lang, tilfældig nøgle) gemmes i browserens localStorage og er
// beviset på, at man rent faktisk har gennemført login. Den kræves, før der
// udleveres følsomme ting som personlige forum-links — en e-mail alene er
// ikke nok.

const crypto = require('crypto');

const SESSION_DAGE = 30;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  let email, code;
  try { ({ email, code } = JSON.parse(event.body)); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig data' }) }; }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  // Find gyldig kode
  const now = new Date().toISOString();
  const codeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/login_codes?email=eq.${encodeURIComponent(email)}&code=eq.${encodeURIComponent(code)}&used=eq.false&expires_at=gt.${now}&select=id&limit=1`,
    { headers }
  );
  const codes = await codeRes.json();

  if (!Array.isArray(codes) || codes.length === 0) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Forkert eller udløbet kode' }) };
  }

  // Marker kode som brugt
  await fetch(`${SUPABASE_URL}/rest/v1/login_codes?id=eq.${codes[0].id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ used: true })
  });

  // Opret session
  const token = crypto.randomBytes(32).toString('base64url');
  const expires_at = new Date(Date.now() + SESSION_DAGE * 86400000).toISOString();

  const sesRes = await fetch(`${SUPABASE_URL}/rest/v1/login_sessions`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ token, email: String(email).trim().toLowerCase(), expires_at })
  });

  if (!sesRes.ok) {
    // Login lykkedes stadig — kunden kommer ind, men uden forum-adgang
    console.error('verify-login-code: kunne ikke oprette session');
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, session: token }) };
};
