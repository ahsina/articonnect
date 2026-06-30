#!/usr/bin/env node
// Cartographie RBAC : pour chaque contrôleur, son chemin, ses guards, et les méthodes/route sans @Roles.
const fs=require('fs'), cp=require('child_process');
const files=cp.execSync("find src -name '*.controller.ts'",{cwd:__dirname+'/../backend/api-gateway',encoding:'utf8'}).trim().split('\n');
const root=__dirname+'/../backend/api-gateway/';
const SENSITIVE=/admin|platform|moderation|verification|fraud|audit|cron|compliance|payment|payout|invoice|dispute|no-show|reputation|kyc|gdpr|user|analytics|company|employee|earnings/i;
let flagged=[];
for(const f of files){const s=fs.readFileSync(root+f,'utf8');
  const ctrl=(s.match(/@Controller\((?:['"`]([^'"`]*)['"`])?\)/)||[])[1]||'';
  const guards=(s.match(/@UseGuards\(([^)]*)\)/)||[])[1]||'';
  const hasRolesGuard=/RolesGuard/.test(guards);
  // méthodes HTTP
  const methods=[...s.matchAll(/@(Get|Post|Put|Patch|Delete)\((?:['"`]([^'"`]*)['"`])?\)[\s\S]{0,200}?(?:async\s+)?(\w+)\s*\(/g)];
  for(const m of methods){const verb=m[1], sub=m[2]||'', name=m[3];
    // chercher @Roles dans les ~6 lignes avant la méthode
    const idx=m.index; const before=s.slice(Math.max(0,idx-300), idx+s.slice(idx).indexOf(name));
    const hasRoles=/@Roles\(/.test(s.slice(Math.max(0,idx-300), idx));
    const sensitive=SENSITIVE.test(ctrl)||SENSITIVE.test(f);
    if(sensitive && !hasRoles){ flagged.push({f:f.replace('src/',''), ctrl, verb, sub, name, rolesGuard:hasRolesGuard}); }
  }
}
// regrouper
const byCtrl={}; for(const x of flagged){byCtrl[x.ctrl+' ('+x.f+')']=byCtrl[x.ctrl+' ('+x.f+')']||{rg:x.rolesGuard,m:[]}; byCtrl[x.ctrl+' ('+x.f+')'].m.push(x.verb+' /'+x.sub+' ['+x.name+']');}
console.log('Contrôleurs sensibles avec méthode SANS @Roles:', Object.keys(byCtrl).length, '| méthodes:', flagged.length);
for(const [c,v] of Object.entries(byCtrl).sort()){ console.log(`\n❌ ${c}  [RolesGuard:${v.rg}]`); v.m.slice(0,8).forEach(x=>console.log('    '+x)); if(v.m.length>8)console.log(`    ...+${v.m.length-8}`);}
