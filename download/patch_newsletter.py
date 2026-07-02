import pathlib

path = pathlib.Path("admin-anmeldelser.html")
content = path.read_text()

# 1. Tilføj fane-knap
old1 = "    <button class=\"tab-btn\" onclick=\"switchTab('retreats',this)\">Retreats</button>\n  </div>"
new1 = "    <button class=\"tab-btn\" onclick=\"switchTab('retreats',this)\">Retreats</button>\n    <button class=\"tab-btn\" onclick=\"switchTab('newsletter',this)\">Nyhedsbrev</button>\n  </div>"
assert old1 in content, "FEJL 1"
content = content.replace(old1, new1, 1)

# 2. Tilføj fane-indhold
nl_html = '''  <!-- FANE: NYHEDSBREV -->
  <div class="tab-content" id="tab-newsletter" style="padding:2rem 3rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.8rem;">
      <div>
        <h3 style="font-family:'Cinzel',serif;font-weight:300;font-size:1.2rem;color:#2c2318;margin:0 0 .3rem;">Nyhedsbrev tilmeldte</h3>
        <div id="nlCount" style="font-size:.72rem;color:rgba(44,35,24,.6);">Henter\u2026</div>
      </div>
      <button onclick="exportNewsletter()" style="font-size:.62rem;letter-spacing:.15em;text-transform:uppercase;padding:.5rem 1rem;background:rgba(74,80,40,.15);border:1px solid rgba(74,80,40,.3);color:#4a5028;cursor:pointer;font-family:'Manrope',sans-serif;">\u2b07 Eksp\u00f8rt\xe9r CSV</button>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:.78rem;">
      <thead>
        <tr style="border-bottom:2px solid rgba(184,138,30,.2);">
          <th style="text-align:left;padding:.6rem .8rem;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:#7a5c14;">Navn</th>
          <th style="text-align:left;padding:.6rem .8rem;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:#7a5c14;">E-mail</th>
          <th style="text-align:left;padding:.6rem .8rem;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:#7a5c14;">Land</th>
          <th style="text-align:left;padding:.6rem .8rem;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:#7a5c14;">Interesser</th>
          <th style="text-align:left;padding:.6rem .8rem;font-size:.6rem;letter-spacing:.15em;text-transform:uppercase;color:#7a5c14;">Dato</th>
        </tr>
      </thead>
      <tbody id="nlTbody"></tbody>
    </table>
  </div>

  <!-- FANE: ANMELDELSER -->'''

old2 = "  <!-- FANE: ANMELDELSER -->"
assert old2 in content, "FEJL 2"
content = content.replace(old2, nl_html, 1)

# 3. Tilføj i switchTab
old3 = "  if (tab === 'beskeder') loadBeskeder();"
new3 = "  if (tab === 'beskeder') loadBeskeder();\n  if (tab === 'newsletter') loadNewsletter();"
assert old3 in content, "FEJL 3"
content = content.replace(old3, new3, 1)

# 4. Tilføj JS
nl_js = '''async function loadNewsletter() {
  const tbody = document.getElementById('nlTbody');
  const count = document.getElementById('nlCount');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="padding:1rem;color:rgba(44,35,24,.4);">Henter\u2026</td></tr>';
  const { data, error } = await sb.from('newsletter').select('*').order('created_at', { ascending: false });
  if (error || !data) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--wine);">Fejl</td></tr>'; return; }
  count.textContent = data.length + ' tilmeldte';
  window._nlData = data;
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" style="padding:1rem;color:rgba(44,35,24,.4);">Ingen tilmeldte endnu.</td></tr>'; return; }
  tbody.innerHTML = data.map(r => `
    <tr style="border-bottom:1px solid rgba(184,138,30,.1);">
      <td style="padding:.6rem .8rem;">${r.navn||'\u2014'}</td>
      <td style="padding:.6rem .8rem;"><a href="mailto:${r.email}" style="color:#7a1f35;">${r.email||'\u2014'}</a></td>
      <td style="padding:.6rem .8rem;">${r.land||'\u2014'}</td>
      <td style="padding:.6rem .8rem;">${r.interesser||'\u2014'}</td>
      <td style="padding:.6rem .8rem;color:rgba(44,35,24,.5);">${new Date(r.created_at).toLocaleDateString('da-DK',{day:'numeric',month:'short',year:'numeric'})}</td>
    </tr>`).join('');
}

function exportNewsletter() {
  const data = window._nlData;
  if (!data || !data.length) return;
  const csv = ['Navn,E-mail,Land,Interesser,Dato', ...data.map(r =>
    `"${r.navn||''}","${r.email||''}","${r.land||''}","${r.interesser||''}","${new Date(r.created_at).toLocaleDateString('da-DK')}"`)].join('\\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'newsletter-tilmeldte.csv'; a.click();
}

async function visAnmeldelser() {'''

old4 = "async function visAnmeldelser() {"
assert old4 in content, "FEJL 4"
content = content.replace(old4, nl_js, 1)

path.write_text(content)
print("Patched OK")
