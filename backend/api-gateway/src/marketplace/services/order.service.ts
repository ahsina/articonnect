import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderItemDto } from '../dto/order.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PlatformConfigService } from '../../config/services/platform-config.service';
import { StripeService } from '../../payment/services/stripe.service';
import { FeeSettingsDto } from '../../config/dto/platform-config.dto';
import { InvoiceService } from '../../invoice/services/invoice.service';
import { ShippingPolicyService } from './shipping-policy.service';
import { UpdateShippingPolicyDto } from '../dto/shipping-policy.dto';

// Statuts pour lesquels une commande est considérée réellement encaissée (facture de vente due,
// stock réservé). Partagé par plusieurs méthodes.
const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
// Seuil d'alerte de stock bas exposé au vendeur.
const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  // Frais de port dynamiques par vendeur (ShippingPolicy). Instancié ici (dépendance = PrismaService
  // uniquement) pour rester dans la partition « marketplace/order + shipping » sans toucher au module.
  private readonly shippingPolicyService: ShippingPolicyService;

  constructor(
    private prisma: PrismaService,
    private platformConfig: PlatformConfigService,
    private stripeService: StripeService,
    private invoiceService: InvoiceService,
  ) {
    this.shippingPolicyService = new ShippingPolicyService(prisma);
  }

  /**
   * Commission plateforme sur une vente marketplace, avec plancher/plafond configurés — MÊME formule
   * que les missions (PaymentService.computeCommission) pour une intégrité commission homogène :
   *  - base * taux, clampée à min/max (stockés EN CENTIMES en config -> /100) ;
   *  - jamais <= 0 (backstop 0,01 €), jamais > base encaissée.
   */
  private computeCommission(base: number, fee: FeeSettingsDto): number {
    const safeBase = Number(base) || 0;
    if (safeBase <= 0) return 0;
    const rate = (Number(fee.platformCommissionRate) || 0) / 100;
    const floorEuros = (Number(fee.minCommissionAmount) || 0) / 100;
    const capEuros = (Number(fee.maxCommissionAmount) || 0) / 100;
    let commission = safeBase * rate;
    if (floorEuros > 0) commission = Math.max(commission, floorEuros);
    if (capEuros > 0) commission = Math.min(commission, capEuros);
    commission = Math.max(commission, 0.01);
    commission = Math.min(commission, safeBase);
    return Math.round(commission * 100) / 100;
  }

  async create(clientId: string, items: OrderItemDto[], shippingAddress: string) {
    // Validate and calculate totals. La TVA est calculée LIGNE PAR LIGNE selon le taux DU PRODUIT
    // (Product.vatRate) — plus de taux plateforme uniforme : deux produits à 3 % et 17 % dans la
    // même commande cumulent leur TVA respective.
    let subtotal = 0;
    let vat = 0;

    // FRAIS DE PORT DYNAMIQUES : sous-total produits (HT) regroupé PAR VENDEUR (product.artisanId),
    // pour appliquer la ShippingPolicy de chaque vendeur (cf. computeShippingTotal). Un vendeur sans
    // politique retombe sur le forfait historique 5,99 € (rétrocompat mono-vendeur).
    const subtotalBySeller = new Map<string, number>();

    // Prepare order items with prices (variante prise en compte).
    const orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      variantId?: string;
    }> = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} introuvable`);
      }

      let unitPrice = Number(product.price);

      // VARIANTE : si une variante est demandée, le prix unitaire = prix produit + ajustement de la
      // variante (priceAdjustment, éventuellement négatif = remise), et c'est le STOCK DE LA VARIANTE
      // qui fait foi (pas le stock global du produit).
      if (item.variantId) {
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant || variant.productId !== product.id) {
          throw new BadRequestException(
            `Variante ${item.variantId} invalide pour le produit ${product.name}`,
          );
        }
        unitPrice = Number(product.price) + Number(variant.priceAdjustment);
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour la variante « ${variant.name} ». Disponible: ${variant.stock}`,
          );
        }
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`,
          );
        }
      }

      unitPrice = Math.round(unitPrice * 100) / 100;
      const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
      const lineVat = (totalPrice * Number(product.vatRate)) / 100;
      subtotal += totalPrice;
      vat += lineVat;

      // Cumule le sous-total (HT) par vendeur pour le calcul des frais de port par politique.
      const sellerId = product.artisanId;
      subtotalBySeller.set(sellerId, (subtotalBySeller.get(sellerId) || 0) + totalPrice);

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        variantId: item.variantId,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    vat = Math.round(vat * 100) / 100;
    // Frais de port = somme des politiques par vendeur (0 si franco/gratuit, sinon forfait vendeur ;
    // défaut 5,99 € si le vendeur n'a pas de politique).
    const shippingCost = await this.shippingPolicyService.computeShippingTotal(subtotalBySeller);
    const total = Math.round((subtotal + vat + shippingCost) * 100) / 100;

    // Crée la commande en PENDING. Le stock GLOBAL d'un produit (ligne sans variante) n'est PAS
    // décrémenté ici : sa réservation se fait au PAIEMENT (settleOrderPayment), sinon une commande
    // abandonnée consommerait le stock. En revanche le stock de VARIANTE est réservé immédiatement
    // (le lien commande->variante n'étant pas persistable sur OrderItem, il ne peut pas être décrémenté
    // plus tard au règlement) — décrément fait dans la même transaction que la création.
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          clientId,
          shippingAddress,
          subtotal: new Decimal(subtotal),
          vat: new Decimal(vat),
          shippingCost: new Decimal(shippingCost),
          total: new Decimal(total),
          items: {
            create: orderItems.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: new Decimal(it.unitPrice),
              totalPrice: new Decimal(it.totalPrice),
              // PERSISTE la déclinaison commandée : le vendeur saura quelle variante expédier et le
              // stock de variante pourra être ré-incrémenté à l'annulation/refund.
              variantId: it.variantId ?? null,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      for (const it of orderItems) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { decrement: it.quantity } },
          });
        }
      }

      return created;
    });

    return order;
  }

  /**
   * Paiement d'une commande marketplace par le client (tunnel d'achat) — VRAI encaissement Stripe.
   *
   * Réutilise le pattern mission : crée un PaymentIntent Stripe (montant = total commande) et une
   * Transaction marketplace traçable (type PRODUCT, commission plateforme calculée). Renvoie le
   * `clientSecret` que le front confirme avec Stripe.js (carte / Apple Pay / Google Pay).
   *
   * L'encaissement effectif (order PAID + décrément stock + versement vendeur) est réalisé par le
   * WEBHOOK Stripe (charge.succeeded / payment_intent.succeeded -> PaymentService.settleOrderPayment),
   * exactement comme l'escrow des missions. Idempotent : réutilise l'intent existant s'il est encore
   * payable ; refuse une commande déjà payée.
   */
  async payOrder(orderId: string, clientId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: { items: { include: { product: true } }, transaction: true },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    // Déjà payée (ou statut ultérieur) : rien à réencaisser.
    if (order.status !== 'PENDING') {
      if (order.paidAt) {
        return {
          alreadyPaid: true,
          orderId,
          status: order.status,
          order: await this.findOne(orderId, clientId),
        };
      }
      throw new BadRequestException(
        `Cette commande ne peut pas être payée (statut ${order.status}).`,
      );
    }

    // RE-vérifie la disponibilité AVANT de créer l'intent (le stock a pu changer depuis la création).
    for (const item of order.items) {
      if (!item.product) {
        throw new NotFoundException(`Produit ${item.productId} introuvable`);
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${item.product.name}. Disponible: ${item.product.stock}`,
        );
      }
    }

    const total = Number(order.total);
    if (!(total >= 1)) {
      throw new BadRequestException('Montant de commande invalide (min 1€).');
    }

    // IDEMPOTENCE : 1 seule Transaction par commande (orderId unique). Si un intent encore payable
    // existe, on renvoie le même clientSecret plutôt que d'empiler un 2e PaymentIntent.
    if (order.transaction) {
      if (['HELD', 'COMPLETED'].includes(order.transaction.status as string)) {
        throw new BadRequestException('Cette commande est déjà payée');
      }
      if (order.transaction.stripePaymentIntentId) {
        const pi = await this.stripeService.retrievePaymentIntent(
          order.transaction.stripePaymentIntentId,
        );
        const reusable =
          pi &&
          ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'].includes(
            pi.status,
          );
        if (reusable && pi.client_secret) {
          return { clientSecret: pi.client_secret, orderId, amount: total, status: order.status };
        }
      }
    }

    // Répartition vendeur(s) : commission plateforme sur le CA produits de chaque artisan.
    const feeSettings = await this.platformConfig.getFeeSettings();
    const breakdown = this.computeSellerBreakdown(order.items, feeSettings);
    const totalCommission = breakdown.reduce((s, b) => s + b.commission, 0);
    const totalNet = breakdown.reduce((s, b) => s + b.net, 0);

    // Stripe customerId du client (3D Secure / wallets).
    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId: clientId },
      select: { stripeCustomerId: true },
    });

    // PaymentIntent en capture AUTOMATIQUE (bien physique -> encaissement immédiat, pas d'escrow à
    // valider comme une mission). payment_intent.succeeded / charge.succeeded déclenchent le règlement.
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: Math.round(total * 100),
      currency: 'eur',
      captureMethod: 'automatic',
      metadata: {
        orderId: order.id,
        userId: clientId,
        type: 'PRODUCT',
      },
      customerId: clientProfile?.stripeCustomerId || undefined,
    });

    const txData = {
      type: 'PRODUCT' as const,
      amount: new Decimal(total),
      commission: new Decimal(Math.round(totalCommission * 100) / 100),
      artisanAmount: new Decimal(Math.round(totalNet * 100) / 100),
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING' as const,
    };
    await this.prisma.transaction.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, ...txData },
      update: txData,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      amount: total,
      commission: Math.round(totalCommission * 100) / 100,
      status: order.status,
    };
  }

  /**
   * Répartit une commande par vendeur (artisan) : CA brut produits, commission plateforme, net vendeur.
   * La TVA et les frais de port ne sont PAS du revenu vendeur (reversés fisc / logistique plateforme) :
   * la commission et le net portent uniquement sur le CA produits (item.totalPrice).
   */
  private computeSellerBreakdown(
    items: Array<{ totalPrice: Decimal | number; product?: { artisanId?: string } | null; productId: string }>,
    fee: FeeSettingsDto,
  ) {
    const grossBySeller = new Map<string, number>();
    for (const it of items) {
      const artisanId = it.product?.artisanId;
      if (!artisanId) continue;
      grossBySeller.set(artisanId, (grossBySeller.get(artisanId) || 0) + Number(it.totalPrice));
    }
    return Array.from(grossBySeller.entries()).map(([artisanId, gross]) => {
      const commission = this.computeCommission(gross, fee);
      const net = Math.round((gross - commission) * 100) / 100;
      return { artisanId, gross: Math.round(gross * 100) / 100, commission, net };
    });
  }

  async findAll(userId: string) {
    // L'utilisateur voit :
    //  - les commandes qu'il a passées (acheteur / clientId), ET
    //  - les commandes contenant au moins un de ses produits (vendeur / artisan),
    //    afin de pouvoir gérer la fulfillment de ses ventes via l'API.
    return this.prisma.order.findMany({
      where: {
        OR: [
          { clientId: userId },
          { items: { some: { product: { artisanId: userId } } } },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(orderId: string, userId: string) {
    // Autorise l'acheteur (clientId) OU l'artisan vendeur d'un item de la commande.
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { clientId: userId },
          { items: { some: { product: { artisanId: userId } } } },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }

  /**
   * REMBOURSEMENT d'une commande PAYÉE (annulation client ou vendeur, ou passage REFUNDED).
   *
   * Réutilise le pattern PROUVÉ de remboursement (return.service.executeRefund / payment.service.refund*) :
   * `stripe.refunds.create` sur le PaymentIntent de la Transaction de la commande, via le stripeService
   * DÉJÀ injecté (pas de dépendance sur return.service / payment/*). Le montant remboursé = montant
   * encaissé de la Transaction (TVA + port inclus, l'acheteur est intégralement remboursé).
   *
   * IDEMPOTENT — deux garde-fous :
   *   1) Transaction.status === 'REFUNDED' -> déjà remboursée, on ne renvoie PAS un 2e refund Stripe.
   *   2) l'appelant ne déclenche ce remboursement que depuis un statut PAYÉ (PAID/PROCESSING/...),
   *      donc une commande déjà CANCELLED/REFUNDED ne repasse jamais ici.
   *
   * Le Stripe refund est émis AVANT toute écriture de statut de commande (comme payment.service) : si
   * Stripe échoue, la commande reste PAYÉE (aucun stock relâché, l'acheteur peut réessayer) plutôt que
   * de laisser une commande « annulée mais non remboursée ».
   */
  private async refundPaidOrder(orderId: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { orderId },
    });

    // Aucune Transaction : rien n'a été encaissé via Stripe pour cette commande -> rien à rembourser.
    if (!transaction) {
      this.logger.warn(
        `Annulation commande ${orderId} sans Transaction associée : aucun remboursement Stripe à émettre.`,
      );
      return false;
    }

    // GARDE IDEMPOTENCE : déjà remboursée -> on n'émet pas un second refund.
    if (transaction.status === 'REFUNDED') {
      return false;
    }

    if (transaction.paymentMethod === 'STRIPE' && transaction.stripePaymentIntentId) {
      // Refund total de l'encaissement (Transaction.amount = total commande payé par l'acheteur).
      await this.stripeService.refundPayment(
        transaction.stripePaymentIntentId,
        Math.round(Number(transaction.amount) * 100),
      );
    } else {
      // Autres moyens de paiement (PayPal / virement / SEPA) : pas d'intégration de refund automatique
      // ici (traité manuellement par l'admin, cf. return.service). On trace tout de même le REFUND.
      this.logger.warn(
        `Remboursement commande ${orderId} (moyen ${transaction.paymentMethod}) : pas de refund Stripe ` +
          `automatique, à traiter manuellement. Transaction marquée REFUNDED.`,
      );
    }

    // TRACE : la Transaction de la commande passe REFUNDED (type PRODUCT conservé). orderId étant @unique
    // sur Transaction, c'est CETTE ligne qui matérialise le remboursement (pas de 2e ligne possible).
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'REFUNDED' },
    });

    this.logger.log(`Commande ${orderId} remboursée (Transaction ${transaction.id} -> REFUNDED).`);
    return true;
  }

  /**
   * Écrit le changement de statut d'une commande en restaurant le stock réservé si c'est une annulation
   * (CANCELLED/REFUNDED). Logique de restauration PARTAGÉE entre la mise à jour vendeur (updateStatus)
   * et l'annulation client (cancelByClient). Voir updateStatus pour le détail des deux réservoirs de
   * stock (produit réservé au paiement / variante réservée à la création).
   */
  private async persistStatusChange(
    orderId: string,
    orderItems: Array<{ productId: string; quantity: number; variantId?: string | null }>,
    opts: {
      cancelling: boolean;
      productStockReserved: boolean;
      variantStockReserved: boolean;
      data: Record<string, unknown>;
    },
  ) {
    const { cancelling, productStockReserved, variantStockReserved, data } = opts;
    if (cancelling && (productStockReserved || variantStockReserved)) {
      return this.prisma.$transaction(async (tx) => {
        for (const it of orderItems) {
          if (productStockReserved) {
            await tx.product.update({
              where: { id: it.productId },
              data: { stock: { increment: it.quantity } },
            });
          }
          if (variantStockReserved && it.variantId) {
            await tx.productVariant.update({
              where: { id: it.variantId },
              data: { stock: { increment: it.quantity } },
            });
          }
        }
        return tx.order.update({
          where: { id: orderId },
          data: data as any,
          include: { items: { include: { product: true, variant: true } } },
        });
      });
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: data as any,
      include: { items: { include: { product: true, variant: true } } },
    });
  }

  /**
   * ANNULATION PAR LE CLIENT de SA propre commande (bouton « Annuler ma commande »).
   *
   * Gardé par JwtAuthGuard seul (pas @Roles ARTISAN) côté contrôleur : ownership vérifiée ICI
   * (order.clientId === clientId). Le client peut annuler TANT que la commande n'est pas préparée
   * ni expédiée — donc uniquement depuis PENDING ou PAID (jamais PROCESSING/SHIPPED/DELIVERED, où
   * la voie normale devient la demande de RETOUR après réception).
   *
   * - PENDING (jamais encaissée) -> CANCELLED, restauration du stock de variante réservé à la création.
   * - PAID (encaissée) -> REFUNDED : remboursement Stripe réel + Transaction REFUNDED + restauration
   *   du stock produit et variante. Idempotent (voir refundPaidOrder + garde statut ci-dessous).
   */
  async cancelByClient(orderId: string, clientId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { artisanId: true } } } } },
    });

    // Ownership : on ne révèle pas l'existence d'une commande d'autrui (404, pas 403).
    if (!order || order.clientId !== clientId) {
      throw new NotFoundException('Commande introuvable');
    }

    // IDEMPOTENCE : déjà annulée / remboursée -> pas de double remboursement, on renvoie l'état courant.
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return this.findOne(orderId, clientId);
    }

    // Le client ne peut annuler que TANT que la commande n'est pas en préparation / expédiée / livrée.
    const cancellable = ['PENDING', 'PAID'];
    if (!cancellable.includes(order.status as string)) {
      throw new BadRequestException(
        'Cette commande est déjà en cours de préparation ou expédiée : elle ne peut plus être annulée. ' +
          'Après réception, vous pouvez demander un retour.',
      );
    }

    const wasPaid = PAID_STATUSES.includes(order.status as string);
    const targetStatus = wasPaid ? 'REFUNDED' : 'CANCELLED';

    // 1) REMBOURSEMENT d'abord (si payée) : Stripe avant la BDD, échec Stripe = commande inchangée.
    if (wasPaid) {
      await this.refundPaidOrder(orderId);
    }

    // 2) Restauration du stock + écriture du statut (logique partagée avec updateStatus).
    const orderItems = ((order as any).items || []) as Array<{
      productId: string;
      quantity: number;
      variantId?: string | null;
    }>;
    const productStockReserved = wasPaid; // stock produit réservé uniquement si payée
    const variantStockReserved = orderItems.some((it) => it.variantId); // variante réservée dès création
    return this.persistStatusChange(orderId, orderItems, {
      cancelling: true,
      productStockReserved,
      variantStockReserved,
      data: { status: targetStatus },
    });
  }

  async updateStatus(orderId: string, artisanId: string, status: string, trackingNumber?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { artisanId: true } } } } },
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    // SÉCURITÉ : seul l'artisan vendeur d'un produit de la commande peut changer son statut.
    const owns = (order as any).items?.some((it: any) => it.product?.artisanId === artisanId);
    if (!owns) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette commande');
    }

    // Validate status is a valid OrderStatus
    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Statut invalide: ${status}`);
    }

    // INTÉGRITÉ ARGENT (faille bloquante) : le passage à PAID est STRICTEMENT réservé au règlement
    // réel — webhook Stripe (payment_intent/charge succeeded) -> PaymentService.settleOrderPayment,
    // qui écrit status='PAID' + paidAt directement en base. Il ne doit JAMAIS pouvoir être forcé
    // manuellement par le vendeur (ou l'admin) via cette API : sinon un vendeur marque sa propre
    // commande PENDING « payée » sans aucun encaissement, ce qui gonfle son CA (getSellerStats.revenue)
    // et déclenche l'émission d'une facture de vente sans contrepartie financière.
    if (status === 'PAID') {
      throw new ForbiddenException(
        'Le statut « payé » ne peut pas être appliqué manuellement : il est enregistré automatiquement à la réception du paiement (Stripe).',
      );
    }

    // Le vendeur ne fait avancer la fulfillment QU'À PARTIR d'une commande payée. Il ne peut pas
    // marquer PROCESSING/SHIPPED/DELIVERED une commande encore PENDING (non encaissée).
    const fulfillmentStatuses = ['PROCESSING', 'SHIPPED', 'DELIVERED'];
    if (fulfillmentStatuses.includes(status) && order.status === 'PENDING') {
      throw new BadRequestException(
        'La commande doit être payée avant d\'être préparée / expédiée.',
      );
    }

    // Renseigne les horodatages du cycle de vie (colonnes jusqu'ici jamais écrites).
    const now = new Date();
    const data: Record<string, unknown> = { status };
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;
    // (PAID est bloqué plus haut — l'horodatage paidAt est posé par settleOrderPayment au règlement réel.)
    if (status === 'SHIPPED') {
      if (!order.paidAt) data.paidAt = now; // expédié implique payé
      if (!order.shippedAt) data.shippedAt = now;
    }
    if (status === 'DELIVERED') {
      if (!order.paidAt) data.paidAt = now;
      if (!order.shippedAt) data.shippedAt = now;
      if (!order.deliveredAt) data.deliveredAt = now;
    }

    // RESTAURATION DU STOCK à l'annulation / remboursement. Deux réservoirs de stock distincts, avec
    // des moments de réservation différents :
    //   - PRODUIT (ligne globale) : stock décrémenté au PAIEMENT (settleOrderPayment). Réservé
    //     uniquement pour les statuts payés -> à restaurer seulement si la commande était payée.
    //   - VARIANTE : stock décrémenté dès la CRÉATION de la commande (immédiat). Réservé tant que la
    //     commande n'est pas déjà annulée/remboursée -> à restaurer MÊME depuis PENDING (jamais payée).
    // Idempotence : une commande déjà CANCELLED/REFUNDED n'a plus de stock réservé, donc un 2e passage
    // ne re-restaure rien (ni produit ni variante).
    const cancelling = status === 'CANCELLED' || status === 'REFUNDED';
    const alreadyReleased = order.status === 'CANCELLED' || order.status === 'REFUNDED';
    const productStockReserved = PAID_STATUSES.includes(order.status);
    const orderItems = ((order as any).items || []) as Array<{ productId: string; quantity: number; variantId?: string | null }>;
    // La variante n'est à restaurer que si la commande la réservait encore ET qu'au moins un item
    // porte une variantId.
    const variantStockReserved = !alreadyReleased && orderItems.some((it) => it.variantId);

    // REMBOURSEMENT (faille argent) : une commande PAYÉE (productStockReserved = statut encaissé) qui
    // passe CANCELLED/REFUNDED doit rembourser réellement l'acheteur — Stripe refund + Transaction
    // REFUNDED, IDEMPOTENT (refundPaidOrder ne renvoie rien si déjà remboursée). Émis AVANT l'écriture
    // du statut : si Stripe échoue, la commande reste inchangée (pas d'annulation « sans remboursement »).
    if (cancelling && productStockReserved) {
      await this.refundPaidOrder(orderId);
    }

    const result = await this.persistStatusChange(orderId, orderItems, {
      cancelling,
      productStockReserved,
      variantStockReserved,
      data,
    });

    // FACTURE DE VENTE : dès qu'une commande est (ou passe) payée, on garantit qu'une facture par
    // vendeur existe (idempotent). Best-effort : la génération de facture ne doit jamais faire
    // échouer la mise à jour de statut.
    if (PAID_STATUSES.includes(status)) {
      try {
        await this.invoiceService.generateInvoicesForOrder(orderId, { requirePaid: true });
      } catch {
        /* best-effort : facture rattrapée à la lecture des ventes (getSellerOrders) */
      }
    }

    return result;
  }

  // ==================== VENDEUR : EXPÉDITION / SUIVI ====================

  /**
   * Marque une commande comme expédiée par le vendeur et pose le numéro de suivi.
   * PAID/PROCESSING -> SHIPPED (+ shippedAt + trackingNumber). Ownership vérifiée dans updateStatus.
   */
  async shipOrder(orderId: string, artisanId: string, trackingNumber?: string) {
    return this.updateStatus(orderId, artisanId, 'SHIPPED', trackingNumber);
  }

  // ==================== VENDEUR : POLITIQUE DE FRAIS DE PORT ====================

  /**
   * Politique de frais de port du vendeur connecté (ou les défauts 5,99 € si aucune n'est encore
   * définie). Délègue au ShippingPolicyService (clé = artisanId). Exposé au vendeur via le contrôleur.
   */
  async getShippingPolicy(artisanId: string) {
    return this.shippingPolicyService.getPolicy(artisanId);
  }

  /**
   * Crée / met à jour (upsert) la politique de frais de port du vendeur connecté.
   */
  async upsertShippingPolicy(artisanId: string, dto: UpdateShippingPolicyDto) {
    return this.shippingPolicyService.upsertPolicy(artisanId, dto);
  }

  // ==================== VENDEUR : MES VENTES ====================

  /**
   * Commandes contenant AU MOINS un produit de l'artisan connecté (côté vendeur/fulfillment).
   * Distinct de findAll (qui mêle achats + ventes) : ici uniquement les ventes.
   */
  async getSellerOrders(artisanId: string) {
    const orders = await this.prisma.order.findMany({
      where: { items: { some: { product: { artisanId } } } },
      include: {
        // La DÉCLINAISON commandée est incluse pour que le vendeur voie quelle variante expédier.
        items: { include: { product: true, variant: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        transaction: { select: { status: true, commission: true, artisanAmount: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // FILET DE SÉCURITÉ FACTURE : les commandes réglées par le WEBHOOK Stripe (settleOrderPayment,
    // hors de ce service) ne passent pas par updateStatus -> on garantit ici, à la lecture des ventes,
    // qu'une facture de vente existe pour chaque commande payée. Idempotent (aucun doublon).
    const paidOrderIds = orders
      .filter((o) => PAID_STATUSES.includes(o.status as string))
      .map((o) => o.id);
    if (paidOrderIds.length) {
      await Promise.all(
        paidOrderIds.map((id) =>
          this.invoiceService
            .generateInvoicesForOrder(id, { requirePaid: true })
            .catch(() => undefined),
        ),
      );
    }

    return orders;
  }

  /**
   * Statistiques de vente de l'artisan connecté : CA net (commandes payées), nb de commandes,
   * unités vendues, et top produits. Le CA se base sur les commandes réellement encaissées
   * (statuts PAID/PROCESSING/SHIPPED/DELIVERED) et sur les items appartenant au vendeur.
   */
  async getSellerStats(artisanId: string) {
    const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

    // Toutes les commandes payées contenant un produit du vendeur.
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: paidStatuses as any },
        items: { some: { product: { artisanId } } },
      },
      include: { items: { include: { product: { select: { id: true, name: true, artisanId: true } } } } },
    });

    let revenue = 0; // CA brut produits du vendeur (item.totalPrice)
    let unitsSold = 0;
    const orderIds = new Set<string>();
    const perProduct = new Map<string, { productId: string; name: string; revenue: number; units: number }>();

    for (const order of orders) {
      let orderHasSellerItem = false;
      for (const it of order.items) {
        if (it.product?.artisanId !== artisanId) continue;
        orderHasSellerItem = true;
        const line = Number(it.totalPrice);
        revenue += line;
        unitsSold += it.quantity;
        const entry = perProduct.get(it.productId) || {
          productId: it.productId,
          name: it.product?.name || '',
          revenue: 0,
          units: 0,
        };
        entry.revenue += line;
        entry.units += it.quantity;
        perProduct.set(it.productId, entry);
      }
      if (orderHasSellerItem) orderIds.add(order.id);
    }

    // Net vendeur estimé (CA - commission plateforme) avec le barème courant.
    const feeSettings = await this.platformConfig.getFeeSettings();
    const commission = this.computeCommission(revenue, feeSettings);
    const netRevenue = revenue > 0 ? Math.round((revenue - commission) * 100) / 100 : 0;

    const topProducts = Array.from(perProduct.values())
      .map((p) => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Nombre de produits actifs au catalogue du vendeur.
    const activeProducts = await this.prisma.product.count({
      where: { artisanId, status: 'ACTIVE' },
    });

    // ALERTE STOCK : produits du vendeur en rupture (SOLD_OUT / stock <= 0) ou en stock bas
    // (0 < stock <= seuil). Permet au vendeur de réapprovisionner avant la rupture.
    const sellerProducts = await this.prisma.product.findMany({
      where: { artisanId, status: { in: ['ACTIVE', 'SOLD_OUT'] as any } },
      select: { id: true, name: true, stock: true, status: true },
    });
    const lowStockProducts = sellerProducts
      .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
      .map((p) => ({ productId: p.id, name: p.name, stock: p.stock }));
    const outOfStockProducts = sellerProducts
      .filter((p) => p.stock <= 0 || p.status === 'SOLD_OUT')
      .map((p) => ({ productId: p.id, name: p.name, stock: p.stock }));

    return {
      revenue: Math.round(revenue * 100) / 100,
      netRevenue,
      commission,
      orderCount: orderIds.size,
      unitsSold,
      activeProducts,
      topProducts,
      // Alertes de stock exposées au tableau de bord vendeur.
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      outOfStockCount: outOfStockProducts.length,
      outOfStockProducts,
    };
  }
}
