// Tjekker en rabatkode fra bookingformularen.
//
// Svarer KUN med om koden gælder og hvor mange procent. Aldrig med
// beskrivelsen, forbruget, udløbsdatoen eller andre koder — det her er et
// endpoint som alle kan kalde, og en liste over aktive kampagnekoder skal
// ikke kunne gættes frem én forespørgsel ad gangen.
//
// Svaret her er kun til visning. Rabatten regnes forfra i create-booking,
// når bookingen faktisk oprettes.

const { hentRabat } = require('./rabat');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const svar = (statusCode, krop) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(krop),
  });

  let kode = '';
  try {
    kode = (JSON.parse(event.body || '{}') || {}).kode || '';
  } catch (e) {
    return svar(400, { gyldig: false, grund: 'ukendt' });
  }

  if (!String(kode).trim()) {
    return svar(200, { gyldig: false, grund: 'tom' });
  }

  try {
    const rabat = await hentRabat(kode);
    if (!rabat || rabat.fejl) {
      return svar(200, { gyldig: false, grund: (rabat && rabat.fejl) || 'ukendt' });
    }
    return svar(200, { gyldig: true, kode: rabat.kode, procent: rabat.procent });
  } catch (e) {
    console.error('tjek-rabatkode:', e.message);
    return svar(200, { gyldig: false, grund: 'ukendt' });
  }
};
