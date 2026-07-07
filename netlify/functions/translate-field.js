// translate-field.js
// Oversætter ét enkelt tekstfelt fra dansk til engelsk for admin-panelet.
// Bevarer inline-HTML (<b>, <br>, <em>) og | -adskillere i liste-/FAQ-felter.
// Bruger den eksisterende miljøvariabel OPENAI_API_KEY i Netlify.

async function translateOnce(apiKey, text) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator for Castillo del Alma, a luxury wellness and wine estate in Andalusia, Spain. ' +
            'Translate the Danish text into natural, elegant English that matches a calm, high-end retreat brand voice. ' +
            'Rules: ' +
            '1) Preserve ALL inline HTML tags exactly (<b>, </b>, <br>, <em>, </em> etc.) in the same positions. ' +
            '2) Preserve the pipe character "|" and line breaks exactly — they are field separators, never translate or move them. ' +
            '3) Do not add, remove or reorder lines. ' +
            '4) Keep proper nouns (Castillo del Alma, Mollina, Málaga, Andalusia) unchanged. ' +
            '5) Do not add quotation marks or commentary. ' +
            'Input is a JSON object {"text": "..."}. ' +
            'Respond ONLY with a JSON object {"translation": "..."} containing the English translation.',
        },
        { role: 'user', content: JSON.stringify({ text }) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error('OpenAI-oversættelse fejlede: ' + (await res.text()).slice(0, 200));
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(content);
  if (typeof parsed.translation !== 'string') {
    throw new Error('Oversættelsen kom tilbage i forkert format');
  }
  return parsed.translation.trim();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'OPENAI_API_KEY mangler i Netlify miljøvariabler' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ingen tekst at oversætte' }) };
    }
    if (text.length > 8000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Teksten er for lang (maks 8000 tegn)' }) };
    }

    let translation;
    try {
      translation = await translateOnce(apiKey, text);
    } catch (e1) {
      console.error('Oversættelse forsøg 1 fejlede:', e1.message);
      translation = await translateOnce(apiKey, text); // ét retry
    }

    return { statusCode: 200, headers, body: JSON.stringify({ translation }) };
  } catch (err) {
    console.error('translate-field fejl:', err.message);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Oversættelsen fejlede. Prøv igen.' }) };
  }
};
