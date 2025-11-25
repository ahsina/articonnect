import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('OrderService', () => {
  let service: OrderService;
  let prismaService: PrismaService;

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    price: new Decimal(100),
    stock: 10,
  };

  const mockOrder = {
    id: 'order-123',
    clientId: 'client-123',
    shippingAddress: '123 Main St, Luxembourg',
    subtotal: new Decimal(200),
    vat: new Decimal(34),
    shippingCost: new Decimal(5.99),
    total: new Decimal(239.99),
    status: 'PENDING',
    createdAt: new Date(),
    items: [
      {
        id: 'item-123',
        orderId: 'order-123',
        productId: 'product-123',
        quantity: 2,
        unitPrice: new Decimal(100),
        totalPrice: new Decimal(200),
        product: mockProduct,
      },
    ],
  };

  const mockTransaction = {
    order: {
      create: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const orderItems = [{ productId: 'product-123', quantity: 2 }];
    const shippingAddress = '123 Main St, Luxembourg';

    it('should create an order successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue(mockOrder),
          },
          product: {
            update: jest.fn().mockResolvedValue(mockProduct),
          },
        };
        return callback(tx);
      });

      const result = await service.create('client-123', orderItems, shippingAddress);

      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create('client-123', orderItems, shippingAddress),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        stock: 1, // Less than requested quantity
      });

      await expect(
        service.create('client-123', orderItems, shippingAddress),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate totals correctly', async () => {
      const expensiveProduct = {
        ...mockProduct,
        price: new Decimal(500),
      };
      mockPrismaService.product.findUnique.mockResolvedValue(expensiveProduct);

      let capturedData: any;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            create: jest.fn().mockImplementation(({ data }) => {
              capturedData = data;
              return mockOrder;
            }),
          },
          product: {
            update: jest.fn().mockResolvedValue(expensiveProduct),
          },
        };
        return callback(tx);
      });

      await service.create('client-123', orderItems, shippingAddress);

      // 2 * 500 = 1000 subtotal
      // 1000 * 0.17 = 170 VAT
      // + 5.99 shipping
      // = 1175.99 total
      expect(Number(capturedData.subtotal)).toBe(1000);
      expect(Number(capturedData.vat)).toBe(170);
      expect(Number(capturedData.shippingCost)).toBe(5.99);
      expect(Number(capturedData.total)).toBe(1175.99);
    });

    it('should decrease product stock', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      let stockDecremented = false;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue(mockOrder),
          },
          product: {
            update: jest.fn().mockImplementation(({ data }) => {
              if (data.stock && data.stock.decrement) {
                stockDecremented = true;
              }
              return mockProduct;
            }),
          },
        };
        return callback(tx);
      });

      await service.create('client-123', orderItems, shippingAddress);

      expect(stockDecremented).toBe(true);
    });

    it('should handle multiple items in order', async () => {
      const multipleItems = [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 3 },
      ];

      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({ ...mockProduct, id: 'product-1', price: new Decimal(100) })
        .mockResolvedValueOnce({ ...mockProduct, id: 'product-2', price: new Decimal(50) });

      let itemsCount = 0;
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            create: jest.fn().mockImplementation(({ data }) => {
              itemsCount = data.items.create.length;
              return mockOrder;
            }),
          },
          product: {
            update: jest.fn().mockResolvedValue(mockProduct),
          },
        };
        return callback(tx);
      });

      await service.create('client-123', multipleItems, shippingAddress);

      expect(itemsCount).toBe(2);
    });
  });

  describe('findAll', () => {
    it('should return all orders for a client', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.findAll('client-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-123' },
        include: expect.objectContaining({
          items: expect.any(Object),
        }),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no orders', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);

      const result = await service.findAll('client-123');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a specific order', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-123', 'client-123');

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'order-123',
          clientId: 'client-123',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'client-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not return orders belonging to other clients', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('order-123', 'other-client'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status to PAID', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'PAID',
      });

      const result = await service.updateStatus('order-123', 'PAID');

      expect(result.status).toBe('PAID');
    });

    it('should update order status to SHIPPED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: 'SHIPPED',
      });

      const result = await service.updateStatus('order-123', 'SHIPPED');

      expect(result.status).toBe('SHIPPED');
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', 'PAID'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus('order-123', 'INVALID_STATUS'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept all valid statuses', async () => {
      const validStatuses = [
        'PENDING',
        'PAID',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ];

      for (const status of validStatuses) {
        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockPrismaService.order.update.mockResolvedValue({
          ...mockOrder,
          status,
        });

        const result = await service.updateStatus('order-123', status);
        expect(result.status).toBe(status);
      }
    });
  });
});
