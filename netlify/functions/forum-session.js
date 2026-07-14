// Fælles hjælper: slå en login-session op og returnér e-mailen.
// Bruges af forum-my.js. Udløbne sessioner afvises.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const sbHeaders = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
};

async function emailFraSession(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/login_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${now}&select=email&limit=1`,
    { headers: sbHeaders }
  );
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0].email : null;
}

module.exports = { emailFraSession, sbHeaders, SUPABASE_URL };
