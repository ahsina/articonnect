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

    // Create order with transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
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

      // Decrease stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    return order;
  }

  async findAll(clientId: string) {
    return this.prisma.order.findMany({
      where: { clientId },
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

  async findOne(orderId: string, clientId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        clientId,
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
    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Statut invalide: ${status}`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' },
    });
  }
}
