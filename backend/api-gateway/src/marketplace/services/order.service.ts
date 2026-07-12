import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderItemDto } from '../dto/order.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PlatformConfigService } from '../../config/services/platform-config.service';
import { StripeService } from '../../payment/services/stripe.service';
import { FeeSettingsDto } from '../../config/dto/platform-config.dto';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private platformConfig: PlatformConfigService,
    private stripeService: StripeService,
  ) {}

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
    // Get configurable tax settings
    const taxSettings = await this.platformConfig.getTaxSettings();
    const vatRate = (taxSettings.defaultVatRate ?? 17) / 100; // Default 17% Luxembourg VAT
    const flatShippingCost = 5.99; // Flat shipping cost

    // Validate and calculate totals
    let subtotal = 0;

    // Prepare order items with prices
    const orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} introuvable`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`,
        );
      }

      const unitPrice = Number(product.price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    const vat = subtotal * vatRate;
    const shippingCost = flatShippingCost;
    const total = subtotal + vat + shippingCost;

    // Crée la commande en PENDING. Le stock n'est PAS décrémenté ici : la réservation de stock
    // doit se faire au PAIEMENT (payOrder), pas à la création. Sinon une commande jamais payée /
    // abandonnée consommerait définitivement le stock (aucune ré-incrémentation).
    // La disponibilité est vérifiée à la création (ci-dessus) et RE-vérifiée au paiement.
    const order = await this.prisma.order.create({
      data: {
        clientId,
        shippingAddress,
        subtotal: new Decimal(subtotal),
        vat: new Decimal(vat),
        shippingCost: new Decimal(shippingCost),
        total: new Decimal(total),
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: new Decimal(item.unitPrice),
            totalPrice: new Decimal(item.totalPrice),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
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
    if (status === 'PAID' && !order.paidAt) data.paidAt = now;
    if (status === 'SHIPPED') {
      if (!order.paidAt) data.paidAt = now; // expédié implique payé
      if (!order.shippedAt) data.shippedAt = now;
    }
    if (status === 'DELIVERED') {
      if (!order.paidAt) data.paidAt = now;
      if (!order.shippedAt) data.shippedAt = now;
      if (!order.deliveredAt) data.deliveredAt = now;
    }

    // Ré-incrémente le stock si on annule/rembourse une commande dont le stock avait été
    // décrémenté au paiement (statuts >= PAID). Une commande PENDING n'a pas consommé de stock.
    const stockWasReserved = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status);
    if ((status === 'CANCELLED' || status === 'REFUNDED') && stockWasReserved) {
      return this.prisma.$transaction(async (tx) => {
        for (const it of (order as any).items || []) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.quantity } },
          });
        }
        return tx.order.update({ where: { id: orderId }, data: data as any });
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: data as any,
      include: { items: { include: { product: true } } },
    });
  }

  // ==================== VENDEUR : EXPÉDITION / SUIVI ====================

  /**
   * Marque une commande comme expédiée par le vendeur et pose le numéro de suivi.
   * PAID/PROCESSING -> SHIPPED (+ shippedAt + trackingNumber). Ownership vérifiée dans updateStatus.
   */
  async shipOrder(orderId: string, artisanId: string, trackingNumber?: string) {
    return this.updateStatus(orderId, artisanId, 'SHIPPED', trackingNumber);
  }

  // ==================== VENDEUR : MES VENTES ====================

  /**
   * Commandes contenant AU MOINS un produit de l'artisan connecté (côté vendeur/fulfillment).
   * Distinct de findAll (qui mêle achats + ventes) : ici uniquement les ventes.
   */
  async getSellerOrders(artisanId: string) {
    return this.prisma.order.findMany({
      where: { items: { some: { product: { artisanId } } } },
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        transaction: { select: { status: true, commission: true, artisanAmount: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    return {
      revenue: Math.round(revenue * 100) / 100,
      netRevenue,
      commission,
      orderCount: orderIds.size,
      unitsSold,
      activeProducts,
      topProducts,
    };
  }
}
