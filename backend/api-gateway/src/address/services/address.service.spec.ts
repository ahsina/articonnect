import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AddressService', () => {
  let service: AddressService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    address: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'client@example.com',
    role: 'CLIENT',
    clientProfile: {
      id: 'client-profile-123',
    },
  };

  const mockAddress = {
    id: 'address-123',
    clientId: 'client-profile-123',
    label: 'Home',
    street: '123 Main Street',
    city: 'Luxembourg',
    postalCode: '1234',
    country: 'LU',
    latitude: 49.6116,
    longitude: 6.1319,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      label: 'Office',
      street: '456 Business Ave',
      city: 'Luxembourg',
      postalCode: '2222',
      country: 'LU',
      isDefault: false,
    };

    it('should create an address successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.create.mockResolvedValue({
        ...mockAddress,
        ...createDto,
        id: 'new-address',
      });

      const result = await service.create('user-123', createDto);

      expect(result.label).toBe('Office');
      expect(mockPrismaService.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'client-profile-123',
          label: 'Office',
        }),
      });
    });

    it('should unset other default addresses when creating a default address', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.address.create.mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      });

      await service.create('user-123', { ...createDto, isDefault: true });

      expect(mockPrismaService.address.updateMany).toHaveBeenCalledWith({
        where: { clientId: 'client-profile-123' },
        data: { isDefault: false },
      });
    });

    it('should throw ForbiddenException if user has no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(service.create('user-123', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create('nonexistent', createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should use default coordinates if not provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.create.mockResolvedValue(mockAddress);

      await service.create('user-123', createDto);

      expect(mockPrismaService.address.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latitude: 49.6116,
          longitude: 6.1319,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all addresses for a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findMany.mockResolvedValue([mockAddress]);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.address.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client-profile-123' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should return empty array if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      const result = await service.findAll('user-123');

      expect(result).toEqual([]);
    });

    it('should return empty array if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findAll('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a specific address', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(mockAddress);

      const result = await service.findOne('user-123', 'address-123');

      expect(result).toEqual(mockAddress);
    });

    it('should throw ForbiddenException if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(
        service.findOne('user-123', 'address-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if address not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if address belongs to another user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        clientId: 'other-client',
      });

      await expect(
        service.findOne('user-123', 'address-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = {
      label: 'Updated Home',
      street: '789 New Street',
    };

    it('should update an address successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(mockAddress);
      mockPrismaService.address.update.mockResolvedValue({
        ...mockAddress,
        ...updateDto,
      });

      const result = await service.update('user-123', 'address-123', updateDto);

      expect(result.label).toBe('Updated Home');
    });

    it('should unset other defaults when setting as default', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        isDefault: false,
      });
      mockPrismaService.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.address.update.mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      });

      await service.update('user-123', 'address-123', { isDefault: true });

      expect(mockPrismaService.address.updateMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-profile-123',
          id: { not: 'address-123' },
        },
        data: { isDefault: false },
      });
    });

    it('should throw ForbiddenException if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(
        service.update('user-123', 'address-123', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if address not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-123', 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if address belongs to another user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        clientId: 'other-client',
      });

      await expect(
        service.update('user-123', 'address-123', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete an address successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        isDefault: false,
      });
      mockPrismaService.address.delete.mockResolvedValue(mockAddress);

      const result = await service.delete('user-123', 'address-123');

      expect(result.message).toBe('Adresse supprimée avec succès');
    });

    it('should set another address as default when deleting default', async () => {
      const otherAddress = { id: 'other-address', clientId: 'client-profile-123' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      });
      mockPrismaService.address.findMany.mockResolvedValue([otherAddress]);
      mockPrismaService.address.update.mockResolvedValue({
        ...otherAddress,
        isDefault: true,
      });
      mockPrismaService.address.delete.mockResolvedValue(mockAddress);

      await service.delete('user-123', 'address-123');

      expect(mockPrismaService.address.update).toHaveBeenCalledWith({
        where: { id: 'other-address' },
        data: { isDefault: true },
      });
    });

    it('should not set default if no other addresses exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      });
      mockPrismaService.address.findMany.mockResolvedValue([]);
      mockPrismaService.address.delete.mockResolvedValue(mockAddress);

      await service.delete('user-123', 'address-123');

      expect(mockPrismaService.address.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(
        service.delete('user-123', 'address-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if address not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if address belongs to another user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        clientId: 'other-client',
      });

      await expect(
        service.delete('user-123', 'address-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setDefault', () => {
    it('should set an address as default', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(mockAddress);
      mockPrismaService.address.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.address.update.mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      });

      const result = await service.setDefault('user-123', 'address-123');

      expect(result.isDefault).toBe(true);
      expect(mockPrismaService.address.updateMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-profile-123',
          id: { not: 'address-123' },
        },
        data: { isDefault: false },
      });
    });

    it('should throw ForbiddenException if no client profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        clientProfile: null,
      });

      await expect(
        service.setDefault('user-123', 'address-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if address not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue(null);

      await expect(
        service.setDefault('user-123', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if address belongs to another user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        clientId: 'other-client',
      });

      await expect(
        service.setDefault('user-123', 'address-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
