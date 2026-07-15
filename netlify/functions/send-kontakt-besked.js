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

  const { navn, email, telefon, besked, lang, website_url } = data;

  // Honeypot valideres også serverside — bots der poster direkte til API'et fanges her.
  // Vi svarer 200 så botten tror den lykkedes, men sender ingen mails.
  if (website_url) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (!navn || !email || !besked) {
    return { statusCode: 400, body: 'Manglende påkrævede felter' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const internHtml = buildEmail({
    lang: 'da',
    title: `KONTAKT — ${navn}`,
    intro: `Ny besked via kontaktformularen på castillodelalma.es.`,
    sections: [
      {
        label: 'Afsender',
        rows: [
          ['Navn', navn],
          ['E-mail', email],
          ['Telefon', telefon || '—'],
          ['Sprog på siden', lang === 'en' ? 'Engelsk' : 'Dansk'],
        ]
      },
      {
        label: 'Besked',
        rows: [
          ['Besked', besked]
        ]
      }
    ]
  });

  // Bekræftelse til afsenderen — på det sprog siden blev vist i
  const ktLang = lang === 'en' ? 'en' : 'da';
  const K = ktLang === 'da' ? {
    subject: 'Tak for din besked — Castillo del Alma',
    title: 'Tak for din besked',
    intro: ['Tak for din henvendelse til Castillo del Alma. Vi har modtaget din besked og vender tilbage inden for 24 timer.'],
    secLabel: 'Din besked', lBesked: 'Besked',
    note: 'Har du spørgsmål i mellemtiden, er du velkommen til at skrive direkte til hello@castillodelalma.es'
  } : {
    subject: 'Thank you for your message — Castillo del Alma',
    title: 'Thank you for your message',
    intro: ['Thank you for contacting Castillo del Alma. We have received your message and will get back to you within 24 hours.'],
    secLabel: 'Your message', lBesked: 'Message',
    note: 'If you have any questions in the meantime, feel free to write directly to hello@castillodelalma.es'
  };

  const fornavn = String(navn || '').split(/\s+/)[0] || navn;
  const bekræftHtml = buildEmail({
    lang: ktLang,
    title: K.title,
    greetingName: fornavn,
    intro: K.intro,
    sections: [
      {
        label: K.secLabel,
        rows: [
          [K.lBesked, besked]
        ]
      }
    ],
    note: K.note
  });

  try {
    await Promise.all([
      resend.emails.send({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: 'hello@castillodelalma.es',
        replyTo: email,
        subject: `KONTAKT — ${navn}`,
        html: internHtml
      }),
      resend.emails.send({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject: K.subject,
        html: bekræftHtml
      })
    ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Resend fejl:', err);
    return { statusCode: 500, body: 'Email kunne ikke sendes' };
  }
};
