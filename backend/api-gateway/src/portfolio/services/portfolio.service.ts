import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreatePortfolioDto,
  CreatePortfolioProjectDto,
  UpdatePortfolioProjectDto,
  AddPortfolioPhotoDto,
} from '../dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getOrCreatePortfolio(artisanId: string) {
    let portfolio = await this.prisma.portfolio.findUnique({
      where: { artisanId },
      include: {
        projects: {
          where: { isPublic: true },
          orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
          include: { photos: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });

    if (!portfolio) {
      portfolio = await this.prisma.portfolio.create({
        data: { artisanId },
        include: {
          projects: {
            include: { photos: { orderBy: { displayOrder: 'asc' } } },
          },
        },
      });
    }

    return portfolio;
  }

  async updatePortfolio(artisanId: string, dto: CreatePortfolioDto) {
    const portfolio = await this.getOrCreatePortfolio(artisanId);

    return this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        title: dto.title,
        description: dto.description,
        isPublic: dto.isPublic,
      },
    });
  }

  async getPublicPortfolio(artisanId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { artisanId },
      include: {
        projects: {
          where: { isPublic: true },
          orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
          include: { photos: { orderBy: { displayOrder: 'asc' } } },
        },
        artisan: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            artisanProfile: {
              select: {
                companyName: true,
                rating: true,
                reviewCount: true,
                specialties: true,
              },
            },
          },
        },
      },
    });

    if (!portfolio || !portfolio.isPublic) {
      throw new NotFoundException('Portfolio not found');
    }

    // Increment view count
    await this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: { totalViews: { increment: 1 } },
    });

    return portfolio;
  }

  async createProject(artisanId: string, dto: CreatePortfolioProjectDto) {
    const portfolio = await this.getOrCreatePortfolio(artisanId);

    return this.prisma.portfolioProject.create({
      data: {
        portfolioId: portfolio.id,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        trade: dto.trade,
        city: dto.city,
        country: dto.country,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
        duration: dto.duration,
        beforePhotos: dto.beforePhotos || [],
        afterPhotos: dto.afterPhotos || [],
        videoUrl: dto.videoUrl,
        projectScope: dto.projectScope,
        challenges: dto.challenges,
        solutions: dto.solutions,
        budgetRange: dto.budgetRange,
        missionId: dto.missionId,
        clientTestimonial: dto.clientTestimonial,
        isPublic: dto.isPublic ?? true,
        isFeatured: dto.isFeatured ?? false,
        tags: dto.tags || [],
      },
      include: { photos: true },
    });
  }

  async getProjects(artisanId: string) {
    const portfolio = await this.getOrCreatePortfolio(artisanId);

    return this.prisma.portfolioProject.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
      include: { photos: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  async getProject(id: string, userId: string) {
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { displayOrder: 'asc' } },
        portfolio: true,
        mission: {
          select: { id: true, title: true, completedAt: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Increment view count for public views
    await this.prisma.portfolioProject.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return project;
  }

  async updateProject(id: string, artisanId: string, dto: UpdatePortfolioProjectDto) {
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id },
      include: { portfolio: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: project.portfolioId },
    });

    if (portfolio?.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.portfolioProject.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        trade: dto.trade,
        city: dto.city,
        country: dto.country,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : undefined,
        duration: dto.duration,
        beforePhotos: dto.beforePhotos,
        afterPhotos: dto.afterPhotos,
        videoUrl: dto.videoUrl,
        projectScope: dto.projectScope,
        challenges: dto.challenges,
        solutions: dto.solutions,
        budgetRange: dto.budgetRange,
        clientTestimonial: dto.clientTestimonial,
        isPublic: dto.isPublic,
        isFeatured: dto.isFeatured,
        displayOrder: dto.displayOrder,
        tags: dto.tags,
      },
      include: { photos: true },
    });
  }

  async deleteProject(id: string, artisanId: string) {
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id },
      include: { portfolio: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: project.portfolioId },
    });

    if (portfolio?.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.portfolioProject.delete({ where: { id } });

    return { success: true };
  }

  async addPhoto(projectId: string, artisanId: string, dto: AddPortfolioPhotoDto) {
    const project = await this.prisma.portfolioProject.findUnique({
      where: { id: projectId },
      include: { portfolio: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: project.portfolioId },
    });

    if (portfolio?.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.portfolioPhoto.create({
      data: {
        projectId,
        url: dto.url,
        caption: dto.caption,
        isBefore: dto.isBefore ?? false,
        isAfter: dto.isAfter ?? false,
        isFeatured: dto.isFeatured ?? false,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async deletePhoto(photoId: string, artisanId: string) {
    const photo = await this.prisma.portfolioPhoto.findUnique({
      where: { id: photoId },
      include: { project: { include: { portfolio: true } } },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: photo.project.portfolioId },
    });

    if (portfolio?.artisanId !== artisanId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.portfolioPhoto.delete({ where: { id: photoId } });

    return { success: true };
  }
}
