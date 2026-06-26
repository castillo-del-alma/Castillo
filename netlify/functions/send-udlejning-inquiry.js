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
    budget, besked, kilde
  } = data;

  // Valider påkrævede felter
  if (!navn || !telefon || !email || !land || !deltagere || !periode || !varighed || !formaal || !besked) {
    return { statusCode: 400, body: 'Manglende påkrævede felter' };
  }

  const formaalLabels = {
    yoga: 'Yoga retreat', meditation: 'Meditation / mindfulness',
    coaching: 'Coaching / personlig udvikling', terapi: 'Terapeutisk retreat',
    kreativt: 'Kreativt retreat', corporate: 'Corporate / teambuilding', andet: 'Andet'
  };
  const kildeLabels = {
    google: 'Google-søgning', instagram: 'Instagram', facebook: 'Facebook',
    anbefaling: 'Anbefaling fra andre', andet: 'Andet'
  };

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Email til Erik (intern notifikation)
  const internHtml = buildEmail({
    lang: 'da',
    title: `Ny udlejningsforespørgsel fra ${navn}`,
    intro: `Der er indkommet en ny forespørgsel om leje af Castillo del Alma.`,
    sections: [
      {
        heading: 'Kontaktperson',
        rows: [
          ['Navn', navn],
          ['Telefon', telefon],
          ['E-mail', email],
          ...(hjemmeside ? [['Hjemmeside', hjemmeside]] : []),
          ['Land', land],
        ]
      },
      {
        heading: 'Arrangement',
        rows: [
          ['Type', formaalLabels[formaal] || formaal],
          ['Antal deltagere', deltagere],
          ['Ønsket periode', periode],
          ['Varighed', varighed],
          ...(budget ? [['Budget', budget]] : []),
          ...(kilde ? [['Fundet via', kildeLabels[kilde] || kilde]] : []),
        ]
      },
      {
        heading: 'Besked',
        text: besked
      }
    ]
  });

  // Bekræftelsesmail til afsender
  const bekræftHtml = buildEmail({
    lang: 'da',
    title: 'Tak for din forespørgsel',
    intro: `Kære ${navn},\n\nTak for din interesse i at afholde dit retreat på Castillo del Alma. Vi har modtaget din forespørgsel og vender tilbage inden for 24 timer til en uforpligtende samtale.`,
    sections: [
      {
        heading: 'Din forespørgsel',
        rows: [
          ['Type arrangement', formaalLabels[formaal] || formaal],
          ['Antal deltagere', deltagere],
          ['Ønsket periode', periode],
          ['Varighed', varighed],
        ]
      }
    ],
    note: 'Har du spørgsmål i mellemtiden, er du velkommen til at skrive direkte til booking@castillodelalma.es'
  });

  try {
    await Promise.all([
      // Til Erik
      resend.emails.send({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: 'hello@castillodelalma.es',
        replyTo: email,
        subject: `UDLEJNING — ${navn}`,
        html: internHtml
      }),
      // Bekræftelse til afsender
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
