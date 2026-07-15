const { Resend } = require('resend');
const { buildEmail, getLang } = require('./email-template');

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
    besked, kilde, ringop
  } = data;

  if (!navn || !telefon || !email || !land || !deltagere || !periode || !varighed || !formaal || !besked) {
    return { statusCode: 400, body: 'Manglende påkrævede felter' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const internHtml = buildEmail({
    lang: 'da',
    title: `UDLEJNING — ${navn}`,
    greetingName: String(navn || '').split(/\s+/)[0] || navn,
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
          ['Ønsker opringning', ringop ? 'JA — ring venligst op' : 'Nej'],
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

  // Bekræftelse til forespørgeren: dansk hvis land = Danmark, ellers engelsk
  const ulLang = getLang(land);
  const U = ulLang === 'da' ? {
    subject: 'Tak for din forespørgsel — Castillo del Alma',
    title: 'Tak for din forespørgsel',
    intro: ['Tak for din interesse i at afholde dit retreat på Castillo del Alma. Vi har modtaget din forespørgsel og vender tilbage inden for 24 timer.'],
    secLabel: 'Din forespørgsel', lType: 'Type arrangement', lDeltagere: 'Antal deltagere', lPeriode: 'Ønsket periode', lVarighed: 'Varighed',
    note: 'Har du spørgsmål i mellemtiden, er du velkommen til at skrive direkte til hello@castillodelalma.es'
  } : {
    subject: 'Thank you for your inquiry — Castillo del Alma',
    title: 'Thank you for your inquiry',
    intro: ['Thank you for your interest in hosting your retreat at Castillo del Alma. We have received your inquiry and will get back to you within 24 hours.'],
    secLabel: 'Your inquiry', lType: 'Type of event', lDeltagere: 'Number of participants', lPeriode: 'Preferred period', lVarighed: 'Duration',
    note: 'If you have any questions in the meantime, feel free to write directly to hello@castillodelalma.es'
  };

  const bekræftHtml = buildEmail({
    lang: ulLang,
    title: U.title,
    intro: U.intro,
    sections: [
      {
        label: U.secLabel,
        rows: [
          [U.lType, formaal],
          [U.lDeltagere, deltagere],
          [U.lPeriode, periode],
          [U.lVarighed, varighed],
        ]
      }
    ],
    note: U.note
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
        subject: U.subject,
        html: bekræftHtml
      })
    ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Resend fejl:', err);
    return { statusCode: 500, body: 'Email kunne ikke sendes' };
  }
};
