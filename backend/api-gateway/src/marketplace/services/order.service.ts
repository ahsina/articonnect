import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, items: any[], shippingAddress: string) {
    // Calculate totals
    let subtotal = 0;
    let vat = 0;

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      const itemTotal = Number(product.price) * item.quantity;
      const itemVat = itemTotal * (Number(product.vatRate) / 100);

      subtotal += itemTotal;
      vat += itemVat;
    }

    const total = subtotal + vat;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        clientId,
        shippingAddress,
        subtotal,
        vat,
        total,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
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
}
