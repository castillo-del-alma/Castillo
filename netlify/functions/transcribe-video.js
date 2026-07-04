// transcribe-video.js
// Modtager lyd (base64) fra video-tekster.html, transskriberer dansk tale
// via OpenAI Whisper og oversætter hvert segment til engelsk.
// Kræver miljøvariablen OPENAI_API_KEY i Netlify.

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
    const { audioBase64 } = JSON.parse(event.body || '{}');
    if (!audioBase64) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ingen lyddata modtaget' }) };
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // 1) Transskription med Whisper (dansk, med tidsstempler pr. segment)
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

    // 2) Oversættelse af alle segmenter til engelsk i ét kald
    const danishLines = segments.map((s) => s.da);

    const translateRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You translate Danish subtitle lines to natural, concise English suitable for on-screen subtitles. ' +
              'You receive a JSON array of Danish strings. Respond ONLY with a JSON array of English strings ' +
              'of exactly the same length and order. No markdown, no explanations.',
          },
          { role: 'user', content: JSON.stringify(danishLines) },
        ],
      }),
    });

    let englishLines = danishLines.map(() => '');
    if (translateRes.ok) {
      try {
        const tData = await translateRes.json();
        const raw = (tData.choices?.[0]?.message?.content || '')
          .replace(/```json|```/g, '')
          .trim();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === danishLines.length) {
          englishLines = parsed.map((t) => String(t).trim());
        }
      } catch (e) {
        console.error('Kunne ikke parse oversættelse:', e);
      }
    } else {
      console.error('Oversættelse fejlede:', await translateRes.text());
    }

    const result = segments.map((s, i) => ({ ...s, en: englishLines[i] || '' }));

    return { statusCode: 200, headers, body: JSON.stringify({ segments: result }) };
  } catch (err) {
    console.error('Serverfejl:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Serverfejl', detail: String(err).slice(0, 300) }),
    };
  }
};
