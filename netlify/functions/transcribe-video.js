// transcribe-video.js
// 1) Modtager lyd (base64), transskriberer dansk tale via OpenAI Whisper
//    og oversætter hvert segment til engelsk.
// 2) Kan også kaldes med { translateLines: [...] } for kun at oversætte.
// Kræver miljøvariablen OPENAI_API_KEY i Netlify.

async function translateLines(apiKey, lines) {
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
            'You translate Danish subtitle lines into natural, concise English for on-screen video captions. ' +
            'Input is a JSON object {"lines": [...]} with Danish strings. ' +
            'Respond ONLY with a JSON object {"lines": [...]} containing the English translations, ' +
            'exactly the same number of lines, in the same order.',
        },
        { role: 'user', content: JSON.stringify({ lines }) },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error('Oversættelses-API fejlede: ' + (await res.text()).slice(0, 200));
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.lines) || parsed.lines.length !== lines.length) {
    throw new Error('Oversættelsen kom tilbage i forkert format');
  }
  return parsed.lines.map((t) => String(t).trim());
}

async function translateWithRetry(apiKey, lines) {
  try {
    return { lines: await translateLines(apiKey, lines) };
  } catch (e1) {
    console.error('Oversættelse forsøg 1 fejlede:', e1.message);
    try {
      return { lines: await translateLines(apiKey, lines) };
    } catch (e2) {
      console.error('Oversættelse forsøg 2 fejlede:', e2.message);
      return { lines: lines.map(() => ''), error: e2.message };
    }
  }
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

    // Tilstand 2: kun oversættelse (bruges af "Oversæt igen"-knappen)
    if (Array.isArray(body.translateLines)) {
      const t = await translateWithRetry(apiKey, body.translateLines.map(String));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ lines: t.lines, translateError: t.error || null }),
      };
    }

    // Tilstand 1: transskription + oversættelse
    const { audioBase64 } = body;
    if (!audioBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ingen lyddata modtaget' }) };
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');

    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', 'whisper-1');
    form.append('language', 'da');
    form.append('response_format', 'verbose_json');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      console.error('Whisper fejl:', errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Transskription fejlede', detail: errText.slice(0, 300) }),
      };
    }

    const whisperData = await whisperRes.json();
    const segments = (whisperData.segments || []).map((s) => ({
      start: Math.max(0, Math.round(s.start * 100) / 100),
      end: Math.round(s.end * 100) / 100,
      da: (s.text || '').trim(),
    }));

    if (segments.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ segments: [], note: 'Ingen tale fundet i videoen' }),
      };
    }

    const t = await translateWithRetry(apiKey, segments.map((s) => s.da));
    const result = segments.map((s, i) => ({ ...s, en: t.lines[i] || '' }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ segments: result, translateError: t.error || null }),
    };
  } catch (err) {
    console.error('Serverfejl:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Serverfejl', detail: String(err).slice(0, 300) }),
    };
  }
};
