exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const { email, code } = JSON.parse(event.body);

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  // Find gyldig kode
  const now = new Date().toISOString();
  const codeRes = await fetch(
    `${SUPABASE_URL}/rest/v1/login_codes?email=eq.${encodeURIComponent(email)}&code=eq.${code}&used=eq.false&expires_at=gt.${now}&select=id&limit=1`,
    { headers }
  );
  const codes = await codeRes.json();

  if (!codes || codes.length === 0) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Forkert eller udløbet kode' }) };
  }

  // Marker kode som brugt
  await fetch(`${SUPABASE_URL}/rest/v1/login_codes?id=eq.${codes[0].id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ used: true })
  });

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
