import {
  Wrench, Zap, Hammer, Paintbrush, KeyRound, Snowflake, Flame, Blocks, Sprout, LayoutGrid,
  Sofa, Settings, Lightbulb,
  type LucideIcon,
} from 'lucide-react';

// Table de correspondance métier / catégorie produit -> icône de trait (Uber : jamais d'emoji).
const MAP: { test: RegExp; Icon: LucideIcon }[] = [
  { test: /^tous$|^all$|toutes/i, Icon: LayoutGrid },
  { test: /plomb|plumb/i, Icon: Wrench },
  { test: /electr|électr|elec/i, Icon: Zap },
  { test: /menuis|carpent|bois|wood|meuble|furnitur/i, Icon: Hammer },
  { test: /peint|paint|d[ée]cor/i, Icon: Paintbrush },
  { test: /serrur|lock|cl[eé]|key/i, Icon: KeyRound },
  { test: /clim|cool|a[ée]ration/i, Icon: Snowflake },
  { test: /chauff|heat|thermi|gaz/i, Icon: Flame },
  { test: /ma[çc]on|mason|brique|brick|b[aâ]ti|mat[ée]riau|material/i, Icon: Blocks },
  { test: /jardin|garden|paysag|green|espace vert/i, Icon: Sprout },
  { test: /outil|tool/i, Icon: Wrench },
  { test: /lumi|light|[ée]clair/i, Icon: Lightbulb },
  { test: /[ée]quip|equipment|outillage/i, Icon: Settings },
  { test: /meuble|furnitur|canap|sofa/i, Icon: Sofa },
];

export function TradeIcon({
  name,
  className = 'h-4 w-4',
  strokeWidth = 1.75,
}: {
  name?: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = MAP.find((x) => x.test.test(name || ''))?.Icon || Wrench;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
