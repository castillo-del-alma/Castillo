exports.handler = async (event) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const hdrs = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action || event.queryStringParameters?.action;

    // ── SUBSCRIBE (from website form) ──
    if (action === 'subscribe') {
      const { email, name, interests, country, lang = 'da', source = 'website' } = body;
      if (!email || !email.includes('@')) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Ugyldig e-mail' }) };
      }
      // Check if already exists
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=id,status`, { headers: hdrs });
      const existing = await checkRes.json();

      if (existing.length > 0) {
        if (existing[0].status === 'active') {
          return { statusCode: 200, body: JSON.stringify({ success: true, alreadySubscribed: true }) };
        }
        // Reactivate — nyere oplysninger fra formularen tages med
        const genaktiver = { status: 'active', unsubscribed_at: null };
        if (name) genaktiver.full_name = name;
        if (interests) genaktiver.interests = interests;
        if (country) genaktiver.country = country;
        await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: { ...hdrs, 'Prefer': 'return=minimal' },
          body: JSON.stringify(genaktiver)
        });
        return { statusCode: 200, body: JSON.stringify({ success: true, reactivated: true }) };
      }

      // Generate unsubscribe token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
        method: 'POST',
        headers: { ...hdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          email,
          full_name: name || null,
          interests: interests || null,
          country: country || null,
          lang,
          source,
          status: 'active',
          unsubscribe_token: token
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Database fejl');
      }
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // ── UNSUBSCRIBE (from email link) ──
    if (action === 'unsubscribe') {
      const token = body.token || event.queryStringParameters?.token;
      if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'Mangler token' }) };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?unsubscribe_token=eq.${token}`, {
        method: 'PATCH',
        headers: { ...hdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      });
      if (!res.ok) return { statusCode: 400, body: JSON.stringify({ error: 'Token ikke fundet' }) };
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Ukendt handling' }) };

  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
