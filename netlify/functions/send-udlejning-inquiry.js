const { Resend } = require('resend');
const { buildEmail } = require('./email-template');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Ugyldig data' };
  }

  const {
    navn, telefon, email, hjemmeside, land,
    deltagere, periode, varighed, formaal,
    besked, kilde
  } = data;

  if (!navn || !telefon || !email || !land || !deltagere || !periode || !varighed || !formaal || !besked) {
    return { statusCode: 400, body: 'Manglende påkrævede felter' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const internHtml = buildEmail({
    lang: 'da',
    title: `UDLEJNING — ${navn}`,
    intro: `Ny forespørgsel om leje af Castillo del Alma.`,
    sections: [
      {
        label: 'Kontaktperson',
        rows: [
          ['Navn', navn],
          ['Telefon', telefon],
          ['E-mail', email],
          ['Hjemmeside', hjemmeside || '—'],
          ['Land', land],
        ]
      },
      {
        label: 'Arrangement',
        rows: [
          ['Type arrangement', formaal],
          ['Antal deltagere', deltagere],
          ['Ønsket periode', periode],
          ['Varighed', varighed],
          ['Fundet via', kilde || '—'],
        ]
      },
      {
        label: 'Besked fra afsender',
        rows: [
          ['Besked', besked]
        ]
      }
    ]
  });

  const bekræftHtml = buildEmail({
    lang: 'da',
    title: 'Tak for din forespørgsel',
    intro: `Kære ${navn},\n\nTak for din interesse i at afholde dit retreat på Castillo del Alma. Vi har modtaget din forespørgsel og vender tilbage inden for 24 timer.`,
    sections: [
      {
        label: 'Din forespørgsel',
        rows: [
          ['Type arrangement', formaal],
          ['Antal deltagere', deltagere],
          ['Ønsket periode', periode],
          ['Varighed', varighed],
        ]
      }
    ],
    note: 'Har du spørgsmål i mellemtiden, er du velkommen til at skrive direkte til hello@castillodelalma.es'
  });

  try {
    await Promise.all([
      resend.emails.send({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: 'hello@castillodelalma.es',
        replyTo: email,
        subject: `UDLEJNING — ${navn}`,
        html: internHtml
      }),
      resend.emails.send({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject: 'Tak for din forespørgsel — Castillo del Alma',
        html: bekræftHtml
      })
    ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Resend fejl:', err);
    return { statusCode: 500, body: 'Email kunne ikke sendes' };
  }
};
