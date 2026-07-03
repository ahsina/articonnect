'use client';

import { useLanguage } from '@/contexts/LanguageContext';

// Mappe une valeur de catégorie STOCKÉE (nom FR canonique) -> clé i18n.
// Découple l'affichage (traduit) de la valeur (stable côté backend).
const MAP: { test: RegExp; key: string }[] = [
  { test: /plomb|plumb/i, key: 'catPlumbing' },
  { test: /electr|électr/i, key: 'catElectricity' },
  { test: /menuis|carpent|bois|wood/i, key: 'catCarpentry' },
  { test: /peint|paint/i, key: 'catPainting' },
  { test: /serrur|lock/i, key: 'catLocksmith' },
  { test: /clim|air.?con|cool/i, key: 'catAC' },
  { test: /chauff|heat|thermi/i, key: 'catHeating' },
  { test: /ma[çc]on|mason|brique|brick/i, key: 'catMasonry' },
  { test: /jardin|garden|paysag/i, key: 'catGardening' },
  { test: /^autre$|^other$/i, key: 'catOther' },
];

type T = (ns: string, k: string) => string;

// Version fonction (quand on a déjà t()).
export function categoryLabel(value: string | undefined, t: T): string {
  if (!value) return '';
  const m = MAP.find((x) => x.test.test(value));
  return m ? t('missions', m.key) : value; // fallback : valeur brute
}

// Version composant.
export function CategoryLabel({ value }: { value?: string }) {
  const { t } = useLanguage();
  return <>{categoryLabel(value, t)}</>;
}
