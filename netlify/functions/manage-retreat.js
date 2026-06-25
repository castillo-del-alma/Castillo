exports.handler = async (event) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  };

  if (event.httpMethod === 'POST') {
    const data = JSON.parse(event.body);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/retreats`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      return { statusCode: 200, body: JSON.stringify({ success: true, retreat: result[0] }) };
    } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'PATCH') {
    const { id, ...data } = JSON.parse(event.body);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/retreats?id=eq.${id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(result));
      return { statusCode: 200, body: JSON.stringify({ success: true, retreat: result[0] }) };
    } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
