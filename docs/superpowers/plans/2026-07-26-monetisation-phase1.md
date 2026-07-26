# Monétisation Krafolt — Phase 1 (fondation) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Une commission au succès dont le taux dépend du **tier d'abonnement** de l'artisan, **100 % paramétrable côté admin**, avec commission **visible** à l'artisan, **facture de commission (TVA)** Krafolt→artisan à la validation, et **transparence TTC/TVA** côté client — sans dépendance aux clés Stripe billing.

**Architecture:** Le pricing (taux par tier, prix des tiers, plancher/plafond) vit dans `PlatformConfig` (`settings.fees`), déjà éditable via l'écran admin. Un `ArtisanSubscription` (défaut FREE) porte le tier de chaque artisan. Un résolveur `resolveCommissionRate(artisanId)` lit le tier → taux, branché dans `payment.service`. La commission génère une facture séparée (émetteur Krafolt). Le front affiche commission (artisan) et TTC/TVA (client).

**Tech Stack:** NestJS (backend/api-gateway), Prisma (Postgres), Next.js (frontend), jest.

## Global Constraints
- Marketplace **LU/FR/BE**. Devise EUR. Montants Decimal(10,2), taux Decimal(5,2).
- **Non rétroactif** : un changement de paramètre n'affecte que les nouvelles missions/factures ; les commissions/factures émises restent figées.
- **Source unique de commission** : `net artisan = montant − commission` (déjà en place, commit d0758d2). Ne pas réintroduire `artisanPayoutPercentage`.
- **Tiers & taux par défaut** (éditables admin) : `FREE` 15 % · `PRO` 10 % (39 €/mois) · `PREMIUM` 8 % (99 €/mois). Plancher/plafond existants conservés.
- **P2B** : commission transparente ; **jamais** afficher tel/email artisan sur un PDF.
- Rôles : endpoints d'écriture config = `@Roles(UserRole.ADMIN)`.
- Ne PAS toucher au billing Stripe (Phase 2) : en Phase 1 l'abonnement est posé/édité manuellement (défaut FREE).

---

### Task 1: Config des tiers dans FeeSettings (source admin-paramétrable)

**Files:**
- Modify: `backend/api-gateway/src/config/dto/platform-config.dto.ts` (FeeSettingsDto)
- Modify: `backend/api-gateway/src/config/services/platform-config.service.ts` (DEFAULT_FEE_SETTINGS + helper resolveCommissionRate)
- Test: `backend/api-gateway/src/config/services/platform-config.service.spec.ts`

**Interfaces:**
- Produces: `FeeSettingsDto.tiers: TierConfig[]` où `TierConfig = { code: 'FREE'|'PRO'|'PREMIUM'; commissionRate: number; monthlyPrice: number; features: string[] }`.
- Produces: `PlatformConfigService.resolveCommissionRate(tierCode: string): Promise<number>` — renvoie le `commissionRate` du tier, sinon celui de FREE, sinon `platformCommissionRate` legacy.

- [ ] **Step 1: Écrire le test qui échoue** — `platform-config.service.spec.ts` :
```ts
it('resolveCommissionRate renvoie le taux du tier, défaut FREE', async () => {
  // getFeeSettings mocké pour renvoyer tiers par défaut
  jest.spyOn(service, 'getFeeSettings').mockResolvedValue({
    ...DEFAULT_FEE_SETTINGS,
  } as any);
  expect(await service.resolveCommissionRate('PRO')).toBe(10);
  expect(await service.resolveCommissionRate('PREMIUM')).toBe(8);
  expect(await service.resolveCommissionRate('FREE')).toBe(15);
  expect(await service.resolveCommissionRate('INCONNU')).toBe(15); // fallback FREE
});
```

- [ ] **Step 2: Lancer, vérifier l'échec** — Run: `cd backend/api-gateway && npx jest platform-config.service --silent`. Expected: FAIL (`resolveCommissionRate` n'existe pas / `tiers` absent).

- [ ] **Step 3: Ajouter `TierConfig` + `tiers` au DTO** — dans `platform-config.dto.ts`, à la fin de la classe `FeeSettingsDto` :
```ts
export class TierConfigDto {
  @ApiProperty() @IsString() code: string; // FREE | PRO | PREMIUM
  @ApiProperty() @IsNumber() commissionRate: number; // %
  @ApiProperty() @IsNumber() monthlyPrice: number; // € / mois
  @ApiProperty({ type: [String] }) @IsArray() features: string[];
}
// dans FeeSettingsDto :
  @ApiPropertyOptional({ type: [TierConfigDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TierConfigDto)
  tiers?: TierConfigDto[];
```
(importer `ValidateNested`, `Type` si absents — vérifier les imports en tête du fichier.)

- [ ] **Step 4: Défaut + résolveur** — dans `platform-config.service.ts`, ajouter aux `DEFAULT_FEE_SETTINGS` :
```ts
  tiers: [
    { code: 'FREE',    commissionRate: 15, monthlyPrice: 0,  features: ['marketplace','offers','quotes_basic','escrow','reviews'] },
    { code: 'PRO',     commissionRate: 10, monthlyPrice: 39, features: ['reduced_commission','featured_standard','tools_unlimited','badge_pro','priority_support'] },
    { code: 'PREMIUM', commissionRate: 8,  monthlyPrice: 99, features: ['reduced_commission','featured_boosted','multi_employee','accounting_export','mission_guarantee'] },
  ],
```
et la méthode :
```ts
  async resolveCommissionRate(tierCode?: string): Promise<number> {
    const fees = await this.getFeeSettings();
    const tiers = fees.tiers || [];
    const free = tiers.find(t => t.code === 'FREE');
    const t = tiers.find(t => t.code === (tierCode || 'FREE'));
    return Number(
      (t?.commissionRate ?? free?.commissionRate ?? fees.platformCommissionRate) || 0,
    );
  }
```

- [ ] **Step 5: Lancer, vérifier le succès** — Run: `npx jest platform-config.service --silent`. Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add backend/api-gateway/src/config/
git commit -m "feat(config): tiers de commission (FREE/PRO/PREMIUM) paramétrables + resolveCommissionRate"
```

---

### Task 2: Modèle ArtisanSubscription (tier de l'artisan, défaut FREE)

**Files:**
- Modify: `backend/shared/prisma/schema.prisma` (nouveau model + relation ArtisanProfile)
- Test: `backend/api-gateway/src/config/services/platform-config.service.spec.ts` (helper de résolution du tier d'un artisan — voir Task 3)

**Interfaces:**
- Produces: model `ArtisanSubscription { id, artisanProfileId (unique), plan (String, default "FREE"), status (String, default "ACTIVE"), currentPeriodEnd (DateTime?), stripeSubscriptionId (String?) }` + relation 1-1 sur `ArtisanProfile`.

- [ ] **Step 1: Ajouter le model au schéma** — dans `schema.prisma`, après le model `ArtisanProfile` :
```prisma
model ArtisanSubscription {
  id               String   @id @default(uuid())
  artisanProfileId String   @unique
  artisanProfile   ArtisanProfile @relation(fields: [artisanProfileId], references: [id], onDelete: Cascade)
  plan             String   @default("FREE") // FREE | PRO | PREMIUM
  status           String   @default("ACTIVE") // ACTIVE | PAST_DUE | CANCELLED
  currentPeriodEnd DateTime?
  stripeSubscriptionId String? @unique
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([plan])
}
```
et dans `model ArtisanProfile { ... }` ajouter la relation inverse :
```prisma
  subscription ArtisanSubscription?
```

- [ ] **Step 2: Appliquer le schéma (db push)** — Run:
```bash
docker exec articonnect-backend sh -c 'cd /app/backend/shared/prisma && npx prisma db push --skip-generate'
```
(en dev, après rebuild backend ; en local sans conteneur, `npx prisma db push` depuis `backend/shared/prisma`.) Expected: `Your database is now in sync`.

- [ ] **Step 3: Vérifier la table** — Run:
```bash
docker exec articonnect-postgres psql -U articonnect -d articonnect -c '\dt "ArtisanSubscription"'
```
Expected: la table existe.

- [ ] **Step 4: Commit**
```bash
git add backend/shared/prisma/schema.prisma
git commit -m "feat(schema): ArtisanSubscription (tier artisan, défaut FREE)"
```

---

### Task 3: Résolveur de commission par artisan + branchement paiement

**Files:**
- Create: `backend/api-gateway/src/payment/services/commission.service.ts`
- Modify: `backend/api-gateway/src/payment/payment.module.ts` (provider)
- Modify: `backend/api-gateway/src/payment/services/payment.service.ts:196-208` (utiliser le taux résolu)
- Test: `backend/api-gateway/src/payment/services/commission.service.spec.ts`

**Interfaces:**
- Consumes: `PlatformConfigService.resolveCommissionRate` (Task 1), `PlatformConfigService.getFeeSettings` (plancher/plafond).
- Produces: `CommissionService.rateForArtisan(artisanUserId: string): Promise<number>` (résout le tier via ArtisanSubscription → taux) et `CommissionService.compute(base: number, artisanUserId: string): Promise<number>` (applique taux + plancher/plafond).

- [ ] **Step 1: Écrire le test qui échoue** — `commission.service.spec.ts` :
```ts
it('rateForArtisan renvoie le taux du tier de l abonnement (défaut FREE)', async () => {
  prisma.artisanProfile.findUnique = jest.fn().mockResolvedValue({ subscription: { plan: 'PRO', status: 'ACTIVE' } });
  cfg.resolveCommissionRate = jest.fn().mockResolvedValue(10);
  expect(await service.rateForArtisan('u1')).toBe(10);
});
it('compute applique le plancher', async () => {
  jest.spyOn(service, 'rateForArtisan').mockResolvedValue(10);
  cfg.getFeeSettings = jest.fn().mockResolvedValue({ minCommissionAmount: 100, maxCommissionAmount: 0 }); // 1€ plancher
  expect(await service.compute(5, 'u1')).toBe(1); // 10% de 5 = 0,50 -> plancher 1€
});
```

- [ ] **Step 2: Lancer, vérifier l'échec** — Run: `npx jest commission.service --silent`. Expected: FAIL (service inexistant).

- [ ] **Step 3: Implémenter le service** — `commission.service.ts` :
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PlatformConfigService } from '../../config/services/platform-config.service';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService, private cfg: PlatformConfigService) {}

  /** Taux (%) applicable à l'artisan selon son tier d'abonnement (défaut FREE). */
  async rateForArtisan(artisanUserId: string): Promise<number> {
    const p = await this.prisma.artisanProfile.findUnique({
      where: { userId: artisanUserId },
      select: { subscription: { select: { plan: true, status: true } } },
    });
    const plan = p?.subscription?.status === 'ACTIVE' ? p.subscription.plan : 'FREE';
    return this.cfg.resolveCommissionRate(plan);
  }

  /** Commission en € : taux du tier + plancher/plafond, jamais nulle ni > base. */
  async compute(base: number, artisanUserId: string): Promise<number> {
    const rate = (await this.rateForArtisan(artisanUserId)) / 100;
    const fees = await this.cfg.getFeeSettings();
    const floor = (Number(fees.minCommissionAmount) || 0) / 100;
    const cap = (Number(fees.maxCommissionAmount) || 0) / 100;
    let c = base * rate;
    if (floor > 0) c = Math.max(c, floor);
    if (cap > 0) c = Math.min(c, cap);
    c = Math.max(c, 0.01);
    c = Math.min(c, base);
    return Math.round(c * 100) / 100;
  }
}
```

- [ ] **Step 4: Enregistrer le provider** — dans `payment.module.ts`, ajouter `CommissionService` aux `providers` et aux `exports`, et s'assurer que `ConfigModule` (celui qui exporte `PlatformConfigService`) est importé.

- [ ] **Step 5: Brancher dans payment.service** — remplacer le calcul commission de `payment.service.ts` (~l.196-208) :
```ts
const grossAmount = Number(mission.agreedPrice);
const commission = await this.commissionService.compute(grossAmount, mission.artisanId);
const artisanNet = Math.round((grossAmount - commission) * 100) / 100;
```
(injecter `private commissionService: CommissionService` au constructeur ; retirer l'usage résiduel de `feeSettings.artisanPayoutPercentage`.)

- [ ] **Step 6: Lancer, vérifier le succès** — Run: `npx jest commission.service --silent`. Expected: PASS.

- [ ] **Step 7: Commit**
```bash
git add backend/api-gateway/src/payment/
git commit -m "feat(commission): taux par tier d'artisan + branchement escrow (net = montant - commission)"
```

---

### Task 4: Facture de commission Krafolt→artisan (TVA) — gap légal #1

**Files:**
- Modify: `backend/shared/prisma/schema.prisma` (enum InvoiceType += PLATFORM_COMMISSION)
- Modify: `backend/api-gateway/src/invoice/services/invoice.service.ts` (méthode `generateCommissionInvoice`)
- Modify: `backend/api-gateway/src/mission/services/mission.service.ts` (appel après `generateInvoiceSafe`)
- Test: `backend/api-gateway/src/invoice/services/invoice.service.spec.ts`

**Interfaces:**
- Consumes: `Transaction { commission }` de la mission ; identité Krafolt (config), identité artisan (ArtisanProfile).
- Produces: `InvoiceService.generateCommissionInvoice(missionId: string)` — idempotent, émetteur = **Krafolt** (raison sociale plateforme depuis `PlatformConfig`), destinataire = artisan, `subtotal = commission HT`, `taxRate` = TVA du pays de l'artisan (LU 17 / FR 20 / BE 21), type `PLATFORM_COMMISSION`. Renvoie la facture (ou existante).

- [ ] **Step 1: Ajouter la valeur d'enum + db push**
```prisma
enum InvoiceType {
  MISSION
  MARKETPLACE
  NO_SHOW_FEE
  PLATFORM_COMMISSION // commission plateforme facturée à l'artisan
}
```
Run: `docker exec articonnect-backend sh -c 'cd /app/backend/shared/prisma && npx prisma db push --skip-generate'`. Expected: sync OK.

- [ ] **Step 2: Écrire le test qui échoue** — `invoice.service.spec.ts` :
```ts
it('generateCommissionInvoice: HT = commission, émetteur = Krafolt, TVA du pays artisan', async () => {
  // mission avec Transaction.commission = 50, artisan LU
  const inv = await service.generateCommissionInvoice('m1');
  expect(inv.type).toBe('PLATFORM_COMMISSION');
  expect(Number(inv.subtotal)).toBe(50);      // commission HT
  expect(Number(inv.taxRate)).toBe(17);        // LU
  expect((inv.issuerAddress as any).name).toMatch(/Krafolt/i);
});
```

- [ ] **Step 3: Lancer, vérifier l'échec** — Run: `npx jest invoice.service --silent`. Expected: FAIL.

- [ ] **Step 4: Implémenter** — dans `invoice.service.ts`, s'inspirer de `generateForMission` :
```ts
async generateCommissionInvoice(missionId: string) {
  const existing = await this.prisma.invoice.findFirst({ where: { missionId, type: InvoiceType.PLATFORM_COMMISSION } });
  if (existing) return existing;
  const mission = await this.prisma.mission.findUnique({
    where: { id: missionId },
    include: { transaction: { select: { commission: true } },
      artisan: { select: { firstName: true, lastName: true, artisanProfile: { select: { companyName: true, siret: true, vatNumber: true, baseAddress: true } } } } },
  });
  const commission = Number(mission?.transaction?.commission || 0);
  if (!mission || !mission.artisanId || !(commission > 0)) return null;
  const ap = mission.artisan?.artisanProfile;
  const platform = await this.platformConfig.getPlatformIdentity?.() ?? { name: 'Krafolt', address: '-', city: '', postalCode: '', country: 'LU', vat: null };
  const stdVat: Record<string, number> = { LU: 17, FR: 20, BE: 21 };
  const taxRate = stdVat[(mission.country || 'LU').toUpperCase()] ?? 21;
  return this.create({
    type: InvoiceType.PLATFORM_COMMISSION,
    missionId,
    issuerId: (await this.platformConfig.getPlatformUserId?.()) ?? mission.artisanId, // fallback : voir note
    clientId: mission.artisanId, // le "client" de cette facture = l'artisan
    subtotal: commission,
    taxRate,
    lineItems: [{ description: 'Commission de mise en relation Krafolt', quantity: 1, unitPrice: commission, total: commission }],
    issuerAddress: { name: platform.name, address: platform.address, city: platform.city, postalCode: platform.postalCode, country: platform.country, vat: platform.vat || undefined },
    clientAddress: { name: ap?.companyName || `${mission.artisan?.firstName ?? ''} ${mission.artisan?.lastName ?? ''}`.trim() || 'Artisan', address: ap?.baseAddress || '-', city: '', postalCode: '', country: (mission.country || 'LU').toUpperCase(), siret: ap?.siret || undefined, vat: ap?.vatNumber || undefined },
    notes: 'Commission de mise en relation — TVA applicable. Facture émise par Krafolt à l\'artisan.',
  });
}
```
> Note d'implémentation : `issuerId`/`clientId` sont des FK User. Pour l'émetteur « Krafolt », créer (une fois) un **User système "Krafolt"** ou ajouter `PlatformConfig.getPlatformUserId()`/`getPlatformIdentity()`. Si non trivial, faire une sous-tâche : seeder un User `platform@krafolt.com` (role ADMIN) réutilisé comme issuer. Adapter `create()` si une contrainte l'exige.

- [ ] **Step 5: Appeler à la validation** — dans `mission.service.ts`, juste après chaque `await this.generateInvoiceSafe(missionId);` (validateCompletion + chemin code), ajouter :
```ts
try { await this.invoiceService.generateCommissionInvoice(missionId); } catch (e) { console.warn(`[commission-invoice] ${missionId}: ${(e as any)?.message}`); }
```

- [ ] **Step 6: Lancer, vérifier le succès** — Run: `npx jest invoice.service --silent`. Expected: PASS.

- [ ] **Step 7: Commit**
```bash
git add backend/api-gateway/src/invoice/ backend/api-gateway/src/mission/services/mission.service.ts backend/shared/prisma/schema.prisma
git commit -m "feat(facture): facture de commission Krafolt->artisan avec TVA (P2B, gap #1)"
```

---

### Task 5: Commission visible à l'artisan (dynamique) — gap légal #2

**Files:**
- Modify: `backend/api-gateway/src/artisan/artisan.controller.ts` (endpoint `GET /artisan/commission`)
- Modify: `frontend/lib/api/artisan.ts` (méthode `getCommission`)
- Modify: `frontend/app/artisan/missions/[id]/page.tsx` (bloc « Net à percevoir » : taux dynamique)
- Modify: `frontend/app/artisan/earnings/page.tsx` (afficher le taux/commission)

**Interfaces:**
- Produces: `GET /artisan/commission` → `{ tier: string, ratePercent: number }` (via `CommissionService.rateForArtisan(req.user.userId)`).
- Consumes (front) : `artisanApi.getCommission()`.

- [ ] **Step 1: Endpoint backend** — dans `artisan.controller.ts` :
```ts
@Get('commission')
@UseGuards(JwtAuthGuard)
async getCommission(@Request() req) {
  const ratePercent = await this.commissionService.rateForArtisan(req.user.userId);
  return { ratePercent };
}
```
(injecter `CommissionService` ; importer le module si besoin.)

- [ ] **Step 2: Vérifier manuellement l'endpoint** — Run:
```bash
# login artisan puis:
curl -s -b cookie.txt https://krafolt.com/api/artisan/commission
```
Expected: `{"ratePercent":15}` (défaut FREE).

- [ ] **Step 3: Méthode front** — dans `frontend/lib/api/artisan.ts` :
```ts
getCommission: async (): Promise<{ ratePercent: number }> => {
  const r = await apiClient.get('/artisan/commission'); return r.data;
},
```

- [ ] **Step 4: Remplacer le taux codé en dur** — dans `artisan/missions/[id]/page.tsx`, charger le taux (`useState` + `artisanApi.getCommission()` au montage) et remplacer la clé i18n `tracking.netCommission` (« commission plateforme 10% ») + le calcul du net par le **taux dynamique** (`ratePercent`). Le net affiché = `agreedPrice − agreedPrice*ratePercent/100`.

- [ ] **Step 5: Afficher dans Gains** — dans `artisan/earnings/page.tsx`, afficher « Votre commission : {ratePercent} % (tier {tier}) » et un lien vers la page Packages (Phase 2).

- [ ] **Step 6: Build + vérif** — `docker compose ... build frontend && up -d frontend`. Vérifier que le net affiché reflète 15 % (défaut).

- [ ] **Step 7: Commit**
```bash
git add backend/api-gateway/src/artisan/artisan.controller.ts frontend/lib/api/artisan.ts "frontend/app/artisan/missions/[id]/page.tsx" frontend/app/artisan/earnings/page.tsx
git commit -m "feat(artisan): commission visible et dynamique (avant acceptation + gains) — P2B gap #2"
```

---

### Task 6: Transparence client TTC + TVA + séquestre avant paiement — gap légal #3

**Files:**
- Modify: `frontend/app/client/payment/[id]/page.tsx` (récap paiement)
- (lecture) `frontend/app/client/missions/[id]/page.tsx` popup « Accepter et payer » (déjà enrichie — vérifier cohérence)

**Interfaces:**
- Consumes : `mission.agreedPrice` (TTC), `mission.vatRate` ou le taux calculé (VatService) pour décomposer HT/TVA.

- [ ] **Step 1: Récap TTC/TVA** — sur l'écran de paiement, afficher un récap : **Total TTC** (ce que le client paie), **dont TVA** (montant + taux), mention **« Paiement sécurisé sous séquestre — versé à l'artisan uniquement après validation des travaux ; remboursable en cas de litige. »**, + rappel du rôle d'intermédiaire de Krafolt + identité de l'artisan. Aucune mention de la commission (B2B).

- [ ] **Step 2: Décomposition HT/TVA** — `HT = TTC / (1 + taux/100)` ; `TVA = TTC − HT` ; formater en EUR. Réutiliser la logique existante si présente.

- [ ] **Step 3: Build + vérif visuelle** — l'écran de paiement montre TTC + « dont TVA X € (Y %) » + conditions séquestre, avant le bouton payer.

- [ ] **Step 4: Commit**
```bash
git add "frontend/app/client/payment/[id]/page.tsx"
git commit -m "feat(client): transparence TTC + détail TVA + conditions séquestre avant paiement (gap #3)"
```

---

### Task 7: Écran admin — éditer les tiers (prix + taux)

**Files:**
- Modify: `frontend/app/admin/admin/settings/fees/page.tsx` (ajouter l'édition des `tiers`)
- (backend déjà OK : `updateFeeSettings` accepte `tiers` via FeeSettingsDto — Task 1)

**Interfaces:**
- Consumes : `GET /config/...fees` (FeeSettings avec `tiers`) ; `PUT` pour sauver.

- [ ] **Step 1: Charger + éditer les tiers** — dans la page fees admin, afficher un tableau éditable des `tiers` : pour chaque (FREE/PRO/PREMIUM) champs `commissionRate` et `monthlyPrice` (+ lecture des features). Conserver l'édition existante du plancher/plafond.

- [ ] **Step 2: Sauver** — inclure `tiers` dans le payload d'update envoyé à l'endpoint fees. Toast succès.

- [ ] **Step 3: Vérif bout-en-bout** — modifier PRO à 11 % dans l'admin → sauver → un artisan PRO voit désormais 11 % (Task 5) et une nouvelle mission calcule la commission à 11 %. **Non rétroactif** : les factures déjà émises inchangées.

- [ ] **Step 4: Commit**
```bash
git add frontend/app/admin/admin/settings/fees/page.tsx
git commit -m "feat(admin): édition des tiers (taux commission + prix) — pricing 100% paramétrable"
```

---

## Self-Review
- **Couverture spec** : commission par tier (T1,T3) · abonnement artisan (T2) · pricing admin-paramétrable (T1,T7) · commission visible dynamique (T5) · facture commission TVA (T4) · transparence client TTC/TVA (T6). ✅ Tous couverts.
- **Non rétroactif** : commissions/factures figées à l'émission ; seuls les nouveaux calculs lisent la config → respecté (T3,T4 lisent la config au moment de la transaction/validation).
- **Type consistency** : `resolveCommissionRate(tierCode)` (T1) ↔ utilisé par `rateForArtisan` (T3) ↔ endpoint (T5) — cohérent. `generateCommissionInvoice(missionId)` (T4) ↔ appelé dans mission.service — cohérent.
- **Point ouvert à trancher en implémentation** : l'`issuerId` de la facture de commission (User « Krafolt »). Task 4 propose un User système seedé — à confirmer avant T4.
