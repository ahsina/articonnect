import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateReturnRequestDto,
  UpdateReturnStatusDto,
  ApproveReturnDto,
  RejectReturnDto,
  ProcessRefundDto,
  ReceiveReturnDto,
  ReturnFilterDto,
  ReturnStatus,
  ReturnReason,
  RefundMethod,
} from '../dto/return.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(private prisma: PrismaService) {}

  private readonly RETURN_WINDOW_DAYS = 30;

  async createReturnRequest(clientId: string, dto: CreateReturnRequestDto) {
    // Verify order exists and belongs to client
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.clientId !== clientId) {
      throw new ForbiddenException('Not authorized to return this order');
    }

    // Check if order is delivered
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Only delivered orders can be returned');
    }

    // Check return window
    if (order.deliveredAt) {
      const daysSinceDelivery = Math.floor(
        (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceDelivery > this.RETURN_WINDOW_DAYS) {
        throw new BadRequestException(
          `Return window of ${this.RETURN_WINDOW_DAYS} days has expired`,
        );
      }
    }

    // Validate items
    let totalRefundAmount = new Decimal(0);
    const validatedItems: any[] = [];

    for (const item of dto.items) {
      const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(`Order item ${item.orderItemId} not found`);
      }

      if (orderItem.productId !== item.productId) {
        throw new BadRequestException(`Product ID mismatch for order item ${item.orderItemId}`);
      }

      if (item.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Cannot return more than ordered quantity for ${orderItem.product.name}`,
        );
      }

      // Check for existing returns on this item
      const existingReturns = await this.prisma.returnItem.findMany({
        where: {
          orderItemId: item.orderItemId,
          return: {
            status: { notIn: ['REJECTED', 'COMPLETED'] },
          },
        },
      });

      const alreadyReturnedQty = existingReturns.reduce((sum, r) => sum + r.quantity, 0);
      if (alreadyReturnedQty + item.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Cannot return more items than ordered for ${orderItem.product.name}. Already returning: ${alreadyReturnedQty}`,
        );
      }

      const itemRefund = orderItem.unitPrice.mul(item.quantity);
      totalRefundAmount = totalRefundAmount.add(itemRefund);

      validatedItems.push({
        productId: item.productId,
        orderItemId: item.orderItemId,
        quantity: item.quantity,
        reason: item.reason,
      });
    }

    // Create return request
    const orderReturn = await this.prisma.orderReturn.create({
      data: {
        orderId: dto.orderId,
        clientId,
        reason: dto.items[0].reason as any,
        description: dto.description,
        status: 'REQUESTED' as any,
        refundAmount: totalRefundAmount,
        photos: dto.photos || [],
        items: {
          create: validatedItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        order: true,
      },
    });

    // Notify artisan(s) about the return request
    const artisanIds = new Set<string>();
    for (const item of order.items) {
      artisanIds.add(item.product.artisanId);
    }

    for (const artisanId of artisanIds) {
      await this.prisma.notification.create({
        data: {
          userId: artisanId,
          type: 'SYSTEM',
          title: 'New Return Request',
          message: `A return request has been submitted for order #${order.id.slice(-8)}`,
          link: `/marketplace/returns/${orderReturn.id}`,
        },
      });
    }

    return orderReturn;
  }

  async findAllReturns(userId: string, filters: ReturnFilterDto) {
    const { status, reason, orderId, clientId, search, startDate, endDate, page = 1, limit = 20 } = filters;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const where: any = {};

    // Role-based filtering
    if (user.role === 'CLIENT') {
      where.clientId = userId;
    } else if (user.role === 'ARTISAN') {
      // Get orders with artisan's products
      const artisanProducts = await this.prisma.product.findMany({
        where: { artisanId: userId },
        select: { id: true },
      });
      const productIds = artisanProducts.map((p) => p.id);

      where.items = {
        some: { productId: { in: productIds } },
      };
    }

    if (status) where.status = status;
    if (reason) where.reason = reason;
    if (orderId) where.orderId = orderId;
    if (clientId && user.role === 'ADMIN') where.clientId = clientId;

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    const [returns, total] = await Promise.all([
      this.prisma.orderReturn.findMany({
        where,
        include: {
          items: {
            include: { product: { select: { id: true, name: true, photos: true } } },
          },
          order: {
            select: { id: true, createdAt: true, total: true },
          },
          client: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.orderReturn.count({ where }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findReturnById(returnId: string, userId: string) {
    const orderReturn = await this.prisma.orderReturn.findUnique({
      where: { id: returnId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        order: {
          include: {
            items: true,
          },
        },
        client: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!orderReturn) {
      throw new NotFoundException('Return not found');
    }

    // Verify access
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'CLIENT' && orderReturn.clientId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    if (user.role === 'ARTISAN') {
      const artisanProducts = await this.prisma.product.findMany({
        where: { artisanId: userId },
        select: { id: true },
      });
      const productIds = artisanProducts.map((p) => p.id);
      const hasAccess = orderReturn.items.some((item) => productIds.includes(item.productId));
      if (!hasAccess) {
        throw new ForbiddenException('Not authorized');
      }
    }

    return orderReturn;
  }

  async approveReturn(returnId: string, userId: string, dto: ApproveReturnDto) {
    const orderReturn = await this.findReturnById(returnId, userId);

    if (orderReturn.status !== 'REQUESTED') {
      throw new BadRequestException('Only requested returns can be approved');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ARTISAN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only artisans or admins can approve returns');
    }

    // Generate return label if not provided
    let returnLabel = dto.returnLabel;
    if (!returnLabel) {
      returnLabel = await this.generateReturnLabel(returnId);
    }

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'APPROVED' as any,
        returnLabel,
        reviewedBy: userId,
        reviewedAt: new Date(),
        resolution: dto.approvalNotes,
        refundAmount: dto.partialRefundAmount
          ? new Decimal(dto.partialRefundAmount)
          : orderReturn.refundAmount,
      },
      include: {
        items: { include: { product: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: orderReturn.clientId,
        type: 'SYSTEM',
        title: 'Return Approved',
        message: `Your return request has been approved. Please ship the items using the provided return label.`,
        link: `/orders/returns/${returnId}`,
        metadata: { returnLabel },
      },
    });

    return updated;
  }

  async rejectReturn(returnId: string, userId: string, dto: RejectReturnDto) {
    const orderReturn = await this.findReturnById(returnId, userId);

    if (orderReturn.status !== 'REQUESTED') {
      throw new BadRequestException('Only requested returns can be rejected');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ARTISAN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only artisans or admins can reject returns');
    }

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'REJECTED' as any,
        reviewedBy: userId,
        reviewedAt: new Date(),
        resolution: dto.rejectionReason,
      },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: orderReturn.clientId,
        type: 'SYSTEM',
        title: 'Return Request Rejected',
        message: `Your return request has been rejected. Reason: ${dto.rejectionReason}`,
        link: `/orders/returns/${returnId}`,
      },
    });

    return updated;
  }

  async updateTrackingNumber(returnId: string, userId: string, trackingNumber: string) {
    const orderReturn = await this.findReturnById(returnId, userId);

    if (!['APPROVED', 'RETURN_SHIPPED'].includes(orderReturn.status)) {
      throw new BadRequestException('Cannot update tracking for this return status');
    }

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        trackingNumber,
        status: 'RETURN_SHIPPED' as any,
      },
    });

    // Notify artisan
    const artisanIds = new Set<string>();
    for (const item of orderReturn.items) {
      artisanIds.add(item.product.artisanId);
    }

    for (const artisanId of artisanIds) {
      await this.prisma.notification.create({
        data: {
          userId: artisanId,
          type: 'SYSTEM',
          title: 'Return Shipped',
          message: `Return items have been shipped. Tracking: ${trackingNumber}`,
          link: `/marketplace/returns/${returnId}`,
        },
      });
    }

    return updated;
  }

  async receiveReturn(returnId: string, userId: string, dto: ReceiveReturnDto) {
    const orderReturn = await this.findReturnById(returnId, userId);

    if (orderReturn.status !== 'RETURN_SHIPPED') {
      throw new BadRequestException('Return must be shipped before it can be received');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ARTISAN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only artisans or admins can receive returns');
    }

    // Update return with inspection data
    const inspectionData = {
      items: dto.items,
      inspectedAt: new Date().toISOString(),
      inspectedBy: userId,
      notes: dto.inspectionNotes,
      photos: dto.inspectionPhotos,
    };

    // Calculate actual refund based on received items
    let actualRefundAmount = new Decimal(0);
    const restockItems: { productId: string; quantity: number }[] = [];

    for (const receivedItem of dto.items) {
      const returnItem = orderReturn.items.find((i) => i.id === receivedItem.returnItemId);
      if (!returnItem) continue;

      const orderItem = orderReturn.order.items.find((oi) => oi.id === returnItem.orderItemId);
      if (!orderItem) continue;

      // Calculate refund based on received quantity and condition
      if (receivedItem.condition !== 'UNSELLABLE') {
        const itemRefund = orderItem.unitPrice.mul(receivedItem.receivedQuantity);
        actualRefundAmount = actualRefundAmount.add(itemRefund);
      }

      // Track items to restock
      if (receivedItem.restockable && receivedItem.condition === 'GOOD') {
        restockItems.push({
          productId: returnItem.productId,
          quantity: receivedItem.receivedQuantity,
        });
      }
    }

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'RECEIVED' as any,
        refundAmount: actualRefundAmount,
        resolution: JSON.stringify(inspectionData),
      },
    });

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: orderReturn.clientId,
        type: 'SYSTEM',
        title: 'Return Received',
        message: 'Your return has been received and is being processed.',
        link: `/orders/returns/${returnId}`,
      },
    });

    return {
      ...updated,
      restockItems,
      calculatedRefund: actualRefundAmount,
    };
  }

  async processRefund(returnId: string, userId: string, dto: ProcessRefundDto) {
    const orderReturn = await this.findReturnById(returnId, userId);

    if (!['RECEIVED', 'INSPECTING'].includes(orderReturn.status)) {
      throw new BadRequestException('Return must be received before refund can be processed');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ARTISAN' && user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only artisans or admins can process refunds');
    }

    const refundAmount = dto.refundAmount
      ? new Decimal(dto.refundAmount)
      : orderReturn.refundAmount;

    // Process the actual refund through payment provider
    const refundResult = await this.executeRefund(orderReturn, refundAmount, dto.refundMethod);

    // Restock items if requested
    if (dto.restockItems) {
      for (const item of orderReturn.items) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'REFUNDED' as any,
        refundedAmount: refundAmount,
        resolution: dto.refundNotes
          ? `${orderReturn.resolution || ''}\nRefund Notes: ${dto.refundNotes}`
          : orderReturn.resolution,
      },
    });

    // Propage l'état à la commande : un article remboursé ne doit pas rester "DELIVERED".
    await this.propagateOrderRefundStatus(orderReturn.orderId);

    // Notify client
    await this.prisma.notification.create({
      data: {
        userId: orderReturn.clientId,
        type: 'PAYMENT_RECEIVED',
        title: 'Refund Processed',
        message: `Your refund of €${refundAmount.toFixed(2)} has been processed.`,
        link: `/orders/returns/${returnId}`,
      },
    });

    return {
      ...updated,
      refundResult,
    };
  }

  /**
   * Après un remboursement de retour, met à jour le statut de la commande :
   * - REFUNDED si le total remboursé (tous retours confondus) couvre le sous-total de la commande,
   * - PARTIALLY_REFUNDED sinon.
   * (Avant : la commande restait "DELIVERED" malgré un article remboursé.)
   */
  private async propagateOrderRefundStatus(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, subtotal: true, status: true },
    });
    if (!order) return;

    // Ne pas régresser un état terminal explicite.
    if (order.status === 'CANCELLED') return;

    const refundedReturns = await this.prisma.orderReturn.findMany({
      where: { orderId, status: 'REFUNDED' as any },
      select: { refundedAmount: true },
    });

    const totalRefunded = refundedReturns.reduce(
      (sum, r) => sum.add(r.refundedAmount ?? new Decimal(0)),
      new Decimal(0),
    );

    if (totalRefunded.lte(0)) return;

    // L'enum OrderStatus contient désormais PARTIALLY_REFUNDED : on propage l'état réel à la commande.
    const newStatus = totalRefunded.gte(order.subtotal) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    if (order.status !== newStatus && order.status !== 'REFUNDED') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus as any },
      });
    }
  }

  async completeReturn(returnId: string, userId: string) {
    const orderReturn = await this.findReturnById(returnId, userId);

    if (orderReturn.status !== 'REFUNDED') {
      throw new BadRequestException('Return must be refunded before it can be completed');
    }

    const updated = await this.prisma.orderReturn.update({
      where: { id: returnId },
      data: {
        status: 'COMPLETED' as any,
        completedAt: new Date(),
      },
    });

    return updated;
  }

  private async executeRefund(
    orderReturn: any,
    amount: Decimal,
    method?: RefundMethod,
  ): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    simulated?: boolean;
  }> {
    // Get the original transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { orderId: orderReturn.orderId },
    });

    if (!transaction) {
      return { success: false, error: 'Original transaction not found' };
    }

    // NOTE: monetary arithmetic (amount Decimal) is left untouched on purpose.
    try {
      if (transaction.paymentMethod === 'STRIPE' && transaction.stripePaymentIntentId) {
        const stripeSecret = process.env.STRIPE_SECRET_KEY;
        if (stripeSecret) {
          // Real Stripe refund when configured (works in Stripe TEST mode too).
          // Lazy-require to avoid adding a hard dependency / cross-module DI.
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const Stripe = require('stripe');
          const stripe = new Stripe(stripeSecret);
          const refund = await stripe.refunds.create({
            payment_intent: transaction.stripePaymentIntentId,
            amount: Math.round(amount.toNumber() * 100),
          });
          return { success: true, transactionId: refund.id };
        }
        // No Stripe key: keep demo behaviour but be HONEST about it.
        this.logger.warn(
          `[SIMULATION] Stripe refund NOT sent (STRIPE_SECRET_KEY missing). ` +
            `Return ${orderReturn.id}, intent ${transaction.stripePaymentIntentId}, amount €${amount.toFixed(2)}. ` +
            `No money moved.`,
        );
        return {
          success: true,
          simulated: true,
          transactionId: `sim_refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      } else if (transaction.paymentMethod === 'PAYPAL' && transaction.paypalCaptureId) {
        // No PayPal SDK/credentials wired in this environment: do not pretend a
        // remote success. Flag as simulated so callers/logs know money didn't move.
        this.logger.warn(
          `[SIMULATION] PayPal refund NOT sent (no PayPal integration configured). ` +
            `Return ${orderReturn.id}, capture ${transaction.paypalCaptureId}, amount €${amount.toFixed(2)}. ` +
            `No money moved.`,
        );
        return {
          success: true,
          simulated: true,
          transactionId: `sim_paypal_refund_${Date.now()}`,
        };
      }

      // Manual / bank-transfer refund: handled off-platform by admin.
      this.logger.warn(
        `[MANUAL] Refund for return ${orderReturn.id} (method ${transaction.paymentMethod}) ` +
          `must be processed manually. Amount €${amount.toFixed(2)}.`,
      );
      return {
        success: true,
        simulated: true,
        transactionId: `manual_refund_${Date.now()}`,
      };
    } catch (error) {
      this.logger.error(
        `Refund failed for return ${orderReturn.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed',
      };
    }
  }

  private async generateReturnLabel(returnId: string): Promise<string> {
    // No shipping-carrier integration (EasyPost/ShipStation) is configured in this
    // environment. Instead of returning a fake URL to a non-existent PDF, flag the
    // label as simulated so the UI/client is not misled into expecting a real file.
    const labelId = `RETURN_${returnId.slice(-8).toUpperCase()}_${Date.now()}`;
    this.logger.warn(
      `[SIMULATION] Return label NOT generated by a carrier (no carrier integration). ` +
        `Placeholder id ${labelId} for return ${returnId}.`,
    );
    return `simulated://return-labels/${labelId}`;
  }

  // Analytics
  async getReturnAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'ARTISAN' && user.role !== 'ADMIN')) {
      throw new ForbiddenException('Not authorized');
    }

    const where: any = {};

    if (user.role === 'ARTISAN') {
      const artisanProducts = await this.prisma.product.findMany({
        where: { artisanId: userId },
        select: { id: true },
      });
      where.items = {
        some: { productId: { in: artisanProducts.map((p) => p.id) } },
      };
    }

    if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

    const returns = await this.prisma.orderReturn.findMany({
      where,
      include: { items: true },
    });

    const totalReturns = returns.length;
    const approvedReturns = returns.filter((r) => ['APPROVED', 'RETURN_SHIPPED', 'RECEIVED', 'REFUNDED', 'COMPLETED'].includes(r.status)).length;
    const rejectedReturns = returns.filter((r) => r.status === 'REJECTED').length;
    const pendingReturns = returns.filter((r) => r.status === 'REQUESTED').length;
    const completedReturns = returns.filter((r) => r.status === 'COMPLETED').length;

    const totalRefunded = returns
      .filter((r) => r.refundedAmount)
      .reduce((sum, r) => sum.add(r.refundedAmount!), new Decimal(0));

    const byReason = returns.reduce((acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgProcessingTime = returns
      .filter((r) => r.completedAt && r.createdAt)
      .map((r) => r.completedAt!.getTime() - r.createdAt.getTime())
      .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

    return {
      totalReturns,
      approvedReturns,
      rejectedReturns,
      pendingReturns,
      completedReturns,
      approvalRate: totalReturns > 0 ? Math.round((approvedReturns / totalReturns) * 100) : 0,
      totalRefunded: totalRefunded.toNumber(),
      byReason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })),
      avgProcessingTimeDays: Math.round(avgProcessingTime / (1000 * 60 * 60 * 24)),
    };
  }
}
