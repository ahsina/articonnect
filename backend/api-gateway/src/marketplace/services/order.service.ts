import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderItemDto } from '../dto/order.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PlatformConfigService } from '../../config/services/platform-config.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private platformConfig: PlatformConfigService,
  ) {}

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
   * Paiement d'une commande marketplace par le client (tunnel d'achat).
   *
   * Transition PENDING -> PAID : renseigne `paidAt` et décrémente le stock de façon atomique
   * (transaction). Idempotent : si la commande est déjà PAID (ou au-delà), on la renvoie sans
   * re-décrémenter le stock ni ré-encaisser.
   */
  async payOrder(orderId: string, clientId: string) {
    const existing = await this.prisma.order.findFirst({
      where: { id: orderId, clientId },
      include: { items: true },
    });

    if (!existing) {
      throw new NotFoundException('Commande introuvable');
    }

    // Idempotence : déjà payée (ou statut ultérieur) -> on renvoie la commande telle quelle.
    if (existing.status !== 'PENDING') {
      if (existing.paidAt) {
        return this.findOne(orderId, clientId);
      }
      throw new BadRequestException(
        `Cette commande ne peut pas être payée (statut ${existing.status}).`,
      );
    }

    const paid = await this.prisma.$transaction(async (tx) => {
      // RE-vérifie la disponibilité au moment du paiement (le stock a pu changer depuis la création).
      for (const item of existing.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundException(`Produit ${item.productId} introuvable`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`,
          );
        }
      }

      // Décrémente le stock (réservation effective au paiement).
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID', paidAt: new Date() },
        include: { items: { include: { product: true } } },
      });
    });

    return paid;
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

  async updateStatus(orderId: string, artisanId: string, status: string) {
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

    // Renseigne les horodatages du cycle de vie (colonnes jusqu'ici jamais écrites).
    const now = new Date();
    const data: Record<string, unknown> = { status };
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
    });
  }
}
