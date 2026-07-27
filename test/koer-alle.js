// Kører alle tests i mappen og opsummerer til sidst.
// Bruges via:  npm test

const path = require('path');
const { spawnSync } = require('child_process');

const TESTS = [
  ['Struktur',      'struktur.js'],
  ['Sprogskifter',  'sprog-links.js'],
  ['Sprog-kapløb',  'sprog-kaploeb.js'],
  ['Nyhedsbrev-slet', 'nyhedsbrev-slet.js'],
  ['Admin-login',   'admin-login.js'],
  ['RLS-antagelser', 'rls-antagelser.js'],
  ['Portal-data',   'portal-data.js'],
  ['Min booking',   'min-booking-portal.js'],
  ['Adgang',        'adgang.js'],
  ['Beløb',         'beloeb.js'],
  ['Bilag',         'bilag.js'],
];

const resultat = [];

for (const [navn, fil] of TESTS) {
  console.log('\n' + '─'.repeat(64));
  console.log('  ' + navn.toUpperCase());
  console.log('─'.repeat(64));
  const p = spawnSync(process.execPath, [path.join(__dirname, fil)], { stdio: 'inherit' });
  resultat.push([navn, p.status === 0]);
}

console.log('\n' + '═'.repeat(64));
for (const [navn, ok] of resultat) {
  console.log('  ' + (ok ? '✓' : '✗') + '  ' + navn + (ok ? '' : '   ← se fejlene ovenfor'));
}
const antalFejl = resultat.filter(([, ok]) => !ok).length;
console.log('═'.repeat(64));
console.log(antalFejl === 0
  ? '  Alt bestået — klar til push.\n'
  : `  ${antalFejl} test fejlede. Ret dem før du pusher.\n`);

process.exit(antalFejl === 0 ? 0 : 1);
