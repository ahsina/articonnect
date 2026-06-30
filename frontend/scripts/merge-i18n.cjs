#!/usr/bin/env node
// Agrège les fichiers /tmp/i18n/*.json (chacun { namespace, entries: { key: {fr,en,de,nl,es,it,pt} } })
// et régénère lib/i18n/extra.ts (namespaces fusionnés par langue).
const fs = require('fs');
const path = require('path');
const DIR = process.env.I18N_DIR || '/tmp/i18n';
const OUT = path.join(__dirname, '..', 'lib', 'i18n', 'extra.ts');
const LANGS = ['fr', 'en', 'de', 'nl', 'es', 'it', 'pt'];

const extra = {}; for (const l of LANGS) extra[l] = {};
let nsCount = 0, keyCount = 0;
for (const f of fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((x) => x.endsWith('.json')) : []) {
  const data = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const items = Array.isArray(data) ? data : [data];
  for (const { namespace, entries } of items) {
    if (!namespace || !entries) continue;
    nsCount++;
    for (const l of LANGS) extra[l][namespace] = extra[l][namespace] || {};
    for (const [key, vals] of Object.entries(entries)) {
      keyCount++;
      for (const l of LANGS) extra[l][namespace][key] = vals[l] ?? vals.en ?? vals.fr ?? key;
    }
  }
}
const body =
`// Traductions additionnelles (Phase 2) — câblage des textes auparavant codés en dur.
// AUTO-GÉNÉRÉ par scripts/merge-i18n.cjs depuis ${DIR}. Deep-mergé dans allTranslations.
// NB : traductions es/it/nl/pt générées automatiquement → à relire.
export const extra: Record<string, Record<string, Record<string, string>>> = ${JSON.stringify(extra, null, 2)};
`;
fs.writeFileSync(OUT, body);
console.log(`extra.ts régénéré : ${nsCount} namespaces, ${keyCount} clés × ${LANGS.length} langues`);
