/* ============================================================
   Castillo del Alma — fælles admin-login
   Fase 0 af Supabase Auth.

   Erstatter den gamle konstant-adgangskode i kildekoden med
   Supabase Auth signInWithPassword(). Admin kører herefter med
   en ægte session og rollen 'authenticated'.

   RLS er IKKE ændret i denne fase — alt andet virker som før.

   Kræver at @supabase/supabase-js er indlæst FØR denne fil.

   Sider bruger den sådan:
     <script src="admin-auth.js"></script>
     ...
     document.addEventListener('DOMContentLoaded', () => {
       CDAAuth.start({ onLogin: startDashboard });
     });

   Forventet markup på siden:
     #loginScreen  — login-skærmen (vises med display:flex)
     #dashboard    — selve admin (vises med display:block)
     #emailInput   — e-mail
     #pwInput      — adgangskode
     #loginBtn     — log ind-knappen (valgfri)
     #loginError   — fejlbesked (valgfri)
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL      = 'https://niniwgiytyqvdqejigxg.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_GwrNUpIuWzdg1oswOY5HzA_mKWqhd6y';

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[cda-auth] supabase-js skal indlæses før admin-auth.js');
    return;
  }

  /* Én delt klient for hele siden, så data-kald automatisk
     sender den indloggede brugers token med. */
  var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'cda-admin-auth'
    }
  });

  var onLoginCb = null;
  var startedDashboard = false;

  function el(id) { return document.getElementById(id); }

  function setError(msg) {
    var e = el('loginError');
    if (!e) return;
    e.textContent = msg || '';
    e.style.display = msg ? 'block' : 'none';
  }

  function showLogin(msg) {
    var ls = el('loginScreen'), db = el('dashboard');
    if (ls) ls.style.display = 'flex';
    if (db) db.style.display = 'none';
    var pw = el('pwInput'); if (pw) pw.value = '';
    setError(msg || '');
  }

  function showDashboard() {
    var ls = el('loginScreen'), db = el('dashboard');
    if (ls) ls.style.display = 'none';
    if (db) db.style.display = 'block';
    setError('');
    if (!startedDashboard) {
      startedDashboard = true;
      if (typeof onLoginCb === 'function') {
        try { onLoginCb(); } catch (e) { console.error('[cda-auth] onLogin fejlede:', e); }
      }
    }
  }

  function danskFejl(message) {
    var m = String(message || '');
    if (/Invalid login credentials/i.test(m))  return 'Forkert e-mail eller adgangskode';
    if (/Email not confirmed/i.test(m))        return 'E-mailen er ikke bekræftet endnu';
    if (/rate limit|too many/i.test(m))        return 'For mange forsøg — vent et minut';
    return m || 'Login mislykkedes';
  }

  async function doLogin() {
    var emailEl = el('emailInput'), pwEl = el('pwInput'), btn = el('loginBtn');
    var email = emailEl && emailEl.value ? emailEl.value.trim() : '';
    var pass  = pwEl && pwEl.value ? pwEl.value : '';

    if (!email || !pass) { setError('Udfyld både e-mail og adgangskode'); return; }

    setError('');
    var label = null;
    if (btn) { label = btn.textContent; btn.disabled = true; btn.textContent = 'Logger ind…'; }

    try {
      var res = await client.auth.signInWithPassword({ email: email, password: pass });
      if (res.error) {
        setError(danskFejl(res.error.message));
        if (pwEl) { pwEl.value = ''; pwEl.focus(); }
        return;
      }
      showDashboard();
    } catch (e) {
      console.error('[cda-auth] login-fejl:', e);
      setError('Kunne ikke kontakte serveren — prøv igen');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = label || 'Log ind'; }
    }
  }

  async function doLogout() {
    try { await client.auth.signOut(); } catch (e) { console.error('[cda-auth] logout-fejl:', e); }
    /* Genindlæs, så kunde- og bookingdata ikke bliver hængende i DOM'en. */
    location.reload();
  }

  async function start(opts) {
    onLoginCb = opts && opts.onLogin ? opts.onLogin : null;

    /* Ryd op efter den gamle localStorage-"login" fra før Fase 0. */
    try { localStorage.removeItem('cda_admin_auth'); } catch (e) {}

    var email = el('emailInput');
    if (email) email.focus();

    try {
      var res = await client.auth.getSession();
      if (res && res.data && res.data.session) showDashboard();
      else showLogin('');
    } catch (e) {
      console.error('[cda-auth] kunne ikke læse session:', e);
      showLogin('');
    }

    client.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') showLogin('Din session er udløbet — log ind igen');
    });
  }

  /* Delt klient — admin-siderne bruger den som deres 'sb'. */
  window.cdaSupabase = client;

  window.CDAAuth = {
    client: client,
    start: start,
    login: doLogin,
    logout: doLogout,
    showLogin: showLogin,
    showDashboard: showDashboard
  };

  /* Bevarer de eksisterende onclick="doLogin()" / onclick="doLogout()". */
  window.doLogin  = doLogin;
  window.doLogout = doLogout;
})();
