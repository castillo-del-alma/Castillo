const { buildEmail, getLang, fmtDate, texts } = require('./email-template');
const { retreatPris, beregnBookingpris } = require('./beloeb');
const { hentRabat } = require('./rabat');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;

  try {
    // `gaester`, `price_per_guest` og `deposit_pct` pilles bevidst IKKE ud af
    // kroppen. Siderne sender dem stadig, men alt der handler om penge og
    // antal regnes ud herinde. Står de ikke her, kan de heller ikke snige sig
    // ind i en beregning ved et uheld senere.
    //
    // Det samme gælder rabatten: `rabatkode` læses, men en medsendt
    // `rabat_pct` gør det ikke. Procenten slås op i rabatkoder-tabellen.
    const { fornavn, efternavn, email, telefon, nationalitet, vaerelse, addon_foer, addon_efter, addon_massage, selected_addons, kommentar, ekstra_gaester, retreat_id, retreat_name, arrival_date, departure_date, direct_payment, betingelser_accepteret, rabatkode } = JSON.parse(event.body);

    if (!fornavn || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Fornavn og email er påkrævet' }) };
    }

    function fmtDateDK(iso) {
      if (!iso) return '—';
      const months = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
      const d = new Date(iso);
      return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    // ── PRISEN ───────────────────────────────────────────────────────────
    // Slås op på retreatet. Browseren sender stadig `price_per_guest` og
    // `deposit_pct` med, men de læses ikke: ellers kunne enhver oprette en
    // booking til prisen nul og få den bekræftet ved at betale nul.
    //
    // Antal gæster tælles også her. Klienten sendte både `gaester` og listen
    // over medrejsende, og de to kunne være uenige — så ville totalen dække
    // færre end dem der faktisk kommer.
    const antalGaesterTotal = 1 + (Array.isArray(ekstra_gaester) ? ekstra_gaester.filter(g => g && String(g.navn || '').trim()).length : 0);

    const priser = await retreatPris(retreat_id);
    if (!priser && direct_payment) {
      // Ingen pris at regne ud fra, og kunden er på vej til betaling.
      // Bookingen må ikke oprettes med et beløb vi ikke kan stå inde for.
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prisen på dette retreat kunne ikke bekræftes. Kontakt os venligst.' })
      };
    }
    if (!priser) {
      console.warn(`create-booking: ingen pris fundet for retreat ${retreat_id} — forespørgsel oprettes med beløb 0`);
    }

    // ── RABATKODEN ───────────────────────────────────────────────────────
    // Slås op nu, med samme regler som da gæsten tastede den. Er den nået
    // at udløbe eller blive opbrugt i mellemtiden, oprettes bookingen til
    // fuld pris — ikke med en fejl. Gæsten har udfyldt hele formularen, og
    // en afvist booking her ville koste en tilmelding for at spare en
    // rabat, vi selv har annonceret.
    let rabat = null;
    if (rabatkode) {
      const svar = await hentRabat(rabatkode);
      if (svar && !svar.fejl) {
        rabat = svar;
      } else {
        console.warn(`create-booking: rabatkode "${(svar && svar.kode) || ''}" ikke anvendt (${(svar && svar.fejl) || 'ukendt'})`);
      }
    }

    const beregnet = priser
      ? beregnBookingpris(priser.pris, priser.pct, antalGaesterTotal, rabat ? rabat.procent : 0)
      : { totalPrice: 0, depositAmount: 0, rabatPct: 0, rabatBeloeb: 0 };
    const { totalPrice, depositAmount } = beregnet;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    };

    // ── KAPACITETSSPÆRRING (forhindrer overbooking) ──
    // En plads regnes optaget hvis bookingen: er betalt, afventer betaling med
    // aktiv 24t-frist, eller er midt i direkte betaling (pending-betaling < 24t gammel).
    // Løse forespørgsler og annullerede bookinger tæller IKKE med.
    // Gælder kun NYE bookinger — restbetaling af eksisterende bookinger går udenom.
    if (retreat_id && arrival_date) {
      try {
        const maxRes = await fetch(`${SUPABASE_URL}/rest/v1/retreats?id=eq.${retreat_id}&select=max_guests`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const maxArr = await maxRes.json();
        const maxGuests = parseInt(maxArr && maxArr[0] && maxArr[0].max_guests, 10);

        if (maxGuests && maxGuests > 0) {
          const dato = String(arrival_date).slice(0, 10);
          const bRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?retreat_id=eq.${retreat_id}&arrival_date=eq.${dato}&select=guests,status,deadline,created_at,payments(status)`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const bRows = await bRes.json();
          const naa = Date.now();
          const HOLD_MS = 24 * 60 * 60 * 1000;
          let optaget = 0;
          for (const b of Array.isArray(bRows) ? bRows : []) {
            if (b.status === 'annulleret') continue;
            const antal = parseInt(b.guests, 10) || 0;
            const betalt = Array.isArray(b.payments) && b.payments.some(p => p && p.status === 'paid');
            const pending = Array.isArray(b.payments) && b.payments.some(p => p && p.status === 'pending');
            const nyligOprettet = b.created_at && (naa - new Date(b.created_at).getTime()) < HOLD_MS;
            const deadlineAktiv = b.deadline && new Date(b.deadline).getTime() > naa;
            const holderPlads = betalt
              || (b.status === 'afventer_betaling' && deadlineAktiv)
              || (pending && nyligOprettet);
            if (holderPlads) optaget += antal;
          }

          const nyeGaester = antalGaesterTotal;
          if (optaget + nyeGaester > maxGuests) {
            return {
              statusCode: 409,
              body: JSON.stringify({
                error: 'Der er desværre ikke plads nok på den valgte dato.',
                code: 'sold_out',
                remaining: Math.max(0, maxGuests - optaget)
              })
            };
          }
        }
      } catch (capErr) {
        // Et teknisk fejlet kapacitetstjek må ikke i sig selv blokere en gyldig booking,
        // men det skal være tydeligt i loggen (fail-open, bevidst valg).
        console.error('create-booking: kapacitetstjek fejlede (fortsætter):', capErr.message);
      }
    }

    // Tjek om kunde eksisterer
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=id,full_name,email`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const existing = await checkRes.json();

    let kunde;
    if (existing && existing.length > 0) {
      kunde = existing[0];
    } else {
      const kundeRes = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          full_name: `${fornavn} ${efternavn}`.trim(),
          email: email,
          phone: telefon || null,
          nationality: nationalitet || null,
        })
      });
      const kundeData = await kundeRes.json();
      kunde = Array.isArray(kundeData) ? kundeData[0] : kundeData;
    }

    if (!kunde || !kunde.id) throw new Error('Kunde kunne ikke oprettes');

    // Opret booking
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_id: kunde.id,
        retreat_name: retreat_name || 'Ukendt retreat',
        arrival_date: arrival_date || null,
        departure_date: departure_date || null,
        guests: antalGaesterTotal,
        room: vaerelse || null,
        extra_guests: ekstra_gaester || [],
        total_price: totalPrice,
        deposit_amount: depositAmount,
        status: 'forespørgsel',
        retreat_id: retreat_id || null,
        addon_foer: addon_foer || false,
        addon_efter: addon_efter || false,
        addon_massage: addon_massage || false,
        notes: kommentar || null,
        // Rabatten skal kunne ses på bookingen bagefter. Uden de her tre
        // felter står der bare en lavere total uden forklaring — hverken
        // godt for regnskabet eller for at måle hvilken kampagne der virkede.
        rabatkode: rabat ? rabat.kode : null,
        rabat_pct: rabat ? beregnet.rabatPct : null,
        rabat_beloeb: rabat ? beregnet.rabatBeloeb : null
      })
    });
    const bookingData = await bookingRes.json();
    const booking = Array.isArray(bookingData) ? bookingData[0] : bookingData;

    // Opret gæsterækkerne med det samme. Navn og e-mail har vi allerede fra
    // formularen — så gæsterne er rigtige deltagere fra første færd og kan
    // selv udfylde deres pasoplysninger.
    // Invitationsmailen sendes FØRST, når bookingen er betalt (invite-guests.js).
    if (booking?.id) {
      try {
        const gaesteRaekker = [{
          booking_id: booking.id,
          guest_no: 1,
          full_name: `${fornavn} ${efternavn || ''}`.trim(),
          email: String(email).trim().toLowerCase(),
          invited_at: new Date().toISOString()   // bookeren har allerede adgang
        }];

        (ekstra_gaester || []).forEach((g, i) => {
          const navn = String(g?.navn || '').trim();
          if (!navn) return;
          let gEmail = String(g?.email || '').trim().toLowerCase();
          if (gEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gEmail)) gEmail = '';
          gaesteRaekker.push({
            booking_id: booking.id,
            guest_no: i + 2,
            full_name: navn.slice(0, 200),
            email: gEmail || null,
            invited_at: null   // samme nøglesæt som bookeren — ellers afviser PostgREST hele bulk-insert'en
          });
        });

        const gRes = await fetch(`${SUPABASE_URL}/rest/v1/booking_guests?on_conflict=booking_id,guest_no`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(gaesteRaekker)
        });

        // Fejl her må IKKE være usynlig. Log status OG svar, så vi kan se årsagen
        // (fx RLS-afvisning hvis service-nøglen mangler).
        if (!gRes.ok) {
          const fejltekst = await gRes.text();
          console.error('create-booking: booking_guests-indsættelse afvist', gRes.status, fejltekst);
        } else {
          const skrevet = await gRes.json().catch(() => []);
          console.log(`create-booking: ${Array.isArray(skrevet) ? skrevet.length : 0} gæsterække(r) oprettet for booking ${booking.id}`);
        }
      } catch (e) {
        // Bookingen skal oprettes uanset hvad — gæsterne kan tilføjes i admin
        console.error('create-booking: kunne ikke oprette gæsterækker:', e.message, e.stack);
      }
    }
    console.log('Booking data:', JSON.stringify(bookingData));
    if (!booking || !booking.id) throw new Error('Booking fejlede: ' + JSON.stringify(bookingData));

    // Dokumentér accept af salgs- og bookingbetingelser (betingelser.html).
    // Kører som separat PATCH der må fejle stille, så bookingen aldrig blokeres,
    // hvis kolonnen terms_accepted_at endnu ikke er oprettet (sql/2026-07-12-terms-accepted.sql).
    if (betingelser_accepteret) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ terms_accepted_at: new Date().toISOString() })
        });
      } catch(e) { console.warn('terms_accepted_at kunne ikke gemmes:', e.message); }
    }

    // Opret betaling
    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        booking_id: booking.id,
        amount: depositAmount,
        type: 'deposit',
        status: 'pending'
      })
    });

    // Gem valgte tilvalg på bookingen
    const addonListe = selected_addons || [];
    if (addonListe.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ selected_addons: addonListe })
      });
    }

    // Send email via Resend API direkte (kun ved forespørgsel, ikke ved direkte betaling)
    let emailData = null;
    if (!direct_payment) {
    const lang = getLang(nationalitet);
    const t = texts[lang];
    let savedHtml = '';
    console.log('Sender email til:', email);
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: email,
        subject: lang === 'en' ? t.reservation_subject : 'Vi har modtaget din reservation — Castillo del Alma',
        html: savedHtml = buildEmail({
          lang,
          title: t.reservation_title,
          intro: t.reservation_intro,
          sections: [{
            label: t.reservation_details,
            rows: [
              [t.label_retreat, retreat_name],
              [t.label_arrival, fmtDate(arrival_date, lang)],
              [t.label_departure, fmtDate(departure_date, lang)],
              [t.label_guests, String(antalGaesterTotal)],
              [t.label_room, vaerelse || null],
              [t.label_addons, (selected_addons||[]).length > 0 ? (selected_addons.map(a=>a.text).join(', ') + ' (' + t.addons_note + ')') : null],
              [t.label_rabat, rabat ? `${beregnet.rabatPct}% (${rabat.kode}) − €${beregnet.rabatBeloeb.toFixed(2)}` : null],
              [t.label_deposit, '€' + depositAmount.toFixed(2)],
              [t.label_total, '€' + totalPrice.toFixed(2)],
            ]
          }],
          buttons: [
            { label: t.btn_minbooking, url: 'https://castillodelalma.es/min-booking', primary: true },
            { label: t.btn_pay_deposit, url: 'https://castillodelalma.es/betal?booking=' + booking.id, primary: false }
          ],
          note: t.reservation_login + ' <a href="mailto:booking@castillodelalma.es" style="color:#7a1f35;">booking@castillodelalma.es</a>'
        })
      })
    });

    emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.log('FEJL ved afsendelse af kunde-email:', emailRes.status, JSON.stringify(emailData));
    } else {
      console.log('Kunde-email sendt:', JSON.stringify(emailData));
      await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          customer_id: kunde.id,
          booking_id: booking.id,
          subject: 'Vi har modtaget din reservation — Castillo del Alma',
          type: 'reservation',
          status: 'sent',
          body: savedHtml
        })
      });
    }
    } else {
      console.log('Springer "Tak for din reservation" over (direkte betalingsflow)');
    }

    // Send admin notifikation
    const addons = [
      addon_foer ? 'Ekstra overnatning før retreat (€60)' : null,
      addon_efter ? 'Ekstra overnatning efter retreat (€60)' : null,
      addon_massage ? 'Kropsmassage 60 min. (€50)' : null
    ].filter(Boolean);

    const ekstraGaesterHtml = ekstra_gaester && ekstra_gaester.length > 0
      ? ekstra_gaester.map(g => `<p style="margin:4px 0;">👤 ${g.navn} — ${g.email}</p>`).join('')
      : '<p style="margin:4px 0;color:#999;">Ingen ekstra gæster</p>';

    const adminEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Castillo del Alma <booking@castillodelalma.es>',
        to: 'booking@castillodelalma.es',
        subject: 'Ny reservation: ' + fornavn + ' ' + efternavn,
        html: `<h2 style="color:#b88a1e;">Ny reservation modtaget</h2>
               <h3>Gæst</h3>
               <p><strong>Navn:</strong> ${fornavn} ${efternavn}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Telefon:</strong> ${telefon || '—'}</p>
               <h3>Booking</h3>
               <p><strong>Retreat:</strong> ${retreat_name || '—'}</p>
               <p><strong>Ankomst:</strong> ${fmtDateDK(arrival_date)}</p>
               <p><strong>Afrejse:</strong> ${fmtDateDK(departure_date)}</p>
               <p><strong>Værelse:</strong> ${vaerelse || '—'}</p>
               <h3>Tilvalg</h3>
               <p>${addons.length > 0 ? addons.join('<br>') : 'Ingen tilvalg'}</p>
               <h3>Ekstra gæster</h3>
               ${ekstraGaesterHtml}
               <h3>Særlige ønsker</h3>
               <p>${kommentar || '—'}</p>
               ${rabat ? `<h3>Rabatkode</h3><p><strong>${rabat.kode}</strong> — ${beregnet.rabatPct}% (−€${beregnet.rabatBeloeb.toFixed(2)})</p>` : ''}`
      })
    });
    const adminEmailData = await adminEmailRes.json();
    if (!adminEmailRes.ok) {
      console.log('FEJL ved afsendelse af admin-notifikation:', adminEmailRes.status, JSON.stringify(adminEmailData));
    } else {
      console.log('Admin-notifikation sendt:', JSON.stringify(adminEmailData));
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, email: emailData, bookingId: booking.id })
    };

  } catch (e) {
    console.log('Error:', e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
