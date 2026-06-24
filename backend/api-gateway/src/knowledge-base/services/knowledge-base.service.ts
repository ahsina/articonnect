import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateArticleDto,
  UpdateArticleDto,
  ArticleTranslationDto,
  ArticleFilterDto,
  ArticleFeedbackDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  SearchQueryDto,
  BulkUpdateStatusDto,
  ArticleStatus,
  TargetAudience,
} from '../dto/knowledge-base.dto';
import { safeJsonCast } from '../../common/types/json-fields.types';

@Injectable()
export class KnowledgeBaseService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.knowledgeBaseArticle.findUnique({
        where: { slug },
      });

      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // Article CRUD
  async createArticle(authorId: string, dto: CreateArticleDto) {
    // Verify author is admin
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!author || author.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can create knowledge base articles');
    }

    const baseSlug = this.generateSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const article = await this.prisma.knowledgeBaseArticle.create({
      data: {
        title: dto.title,
        slug,
        content: dto.content,
        excerpt: dto.excerpt || dto.content.substring(0, 200) + '...',
        category: dto.category,
        subcategory: dto.subcategory,
        tags: dto.tags || [],
        targetAudience: dto.targetAudience || TargetAudience.ALL,
        metaTitle: dto.metaTitle || dto.title,
        metaDescription: dto.metaDescription || dto.excerpt,
        status: dto.status || ArticleStatus.DRAFT,
        locale: dto.locale || 'en',
        authorId,
        publishedAt: dto.status === ArticleStatus.PUBLISHED ? new Date() : null,
      },
    });

    return article;
  }

  async findAllArticles(filters: ArticleFilterDto, userId?: string) {
    const {
      category,
      subcategory,
      targetAudience,
      status,
      search,
      tag,
      locale,
      featured,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Determine user role for filtering
    let userRole: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      userRole = user?.role || null;
    }

    const where: any = {};

    // Non-admins can only see published articles
    if (userRole !== 'ADMIN') {
      where.status = ArticleStatus.PUBLISHED;
    } else if (status) {
      where.status = status;
    }

    // Filter by audience
    if (targetAudience) {
      where.targetAudience = targetAudience;
    } else if (userRole && userRole !== 'ADMIN') {
      where.targetAudience = { in: [TargetAudience.ALL, userRole] };
    }

    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (locale) where.locale = locale;

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [articles, total] = await Promise.all([
      this.prisma.knowledgeBaseArticle.findMany({
        where,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.knowledgeBaseArticle.count({ where }),
    ]);

    return {
      data: articles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findArticleById(idOrSlug: string, userId?: string) {
    let article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id: idOrSlug },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!article) {
      article = await this.prisma.knowledgeBaseArticle.findUnique({
        where: { slug: idOrSlug },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Check access
    let userRole: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      userRole = user?.role || null;
    }

    if (userRole !== 'ADMIN' && article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Article not found');
    }

    // Increment view count
    await this.prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    // Get related articles
    const relatedArticles = await this.prisma.knowledgeBaseArticle.findMany({
      where: {
        id: { not: article.id },
        status: ArticleStatus.PUBLISHED,
        OR: [
          { category: article.category },
          { tags: { hasSome: article.tags } },
        ],
      },
      take: 5,
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
      },
    });

    return {
      ...article,
      viewCount: article.viewCount + 1,
      relatedArticles,
    };
  }

  async updateArticle(articleId: string, userId: string, dto: UpdateArticleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update articles');
    }

    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const updateData: any = { ...dto };

    // Update slug if title changed
    if (dto.title && dto.title !== article.title) {
      const baseSlug = this.generateSlug(dto.title);
      updateData.slug = await this.ensureUniqueSlug(baseSlug, articleId);
    }

    // Set publishedAt if publishing
    if (dto.status === ArticleStatus.PUBLISHED && article.status !== ArticleStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const updated = await this.prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: updateData,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return updated;
  }

  async deleteArticle(articleId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete articles');
    }

    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    await this.prisma.knowledgeBaseArticle.delete({
      where: { id: articleId },
    });

    return { success: true, message: 'Article deleted successfully' };
  }

  async publishArticle(articleId: string, userId: string) {
    return this.updateArticle(articleId, userId, { status: ArticleStatus.PUBLISHED });
  }

  async unpublishArticle(articleId: string, userId: string) {
    return this.updateArticle(articleId, userId, { status: ArticleStatus.DRAFT });
  }

  async archiveArticle(articleId: string, userId: string) {
    return this.updateArticle(articleId, userId, { status: ArticleStatus.ARCHIVED });
  }

  // Translations
  async addTranslation(articleId: string, userId: string, dto: ArticleTranslationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can add translations');
    }

    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const translations = safeJsonCast<Record<string, unknown>>(article.translations, {});
    translations[dto.locale] = {
      title: dto.title,
      content: dto.content,
      excerpt: dto.excerpt,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      updatedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: { translations: translations as Prisma.InputJsonValue },
    });

    return updated;
  }

  async removeTranslation(articleId: string, locale: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can remove translations');
    }

    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const translations = safeJsonCast<Record<string, unknown>>(article.translations, {});
    delete translations[locale];

    await this.prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: { translations: translations as Prisma.InputJsonValue },
    });

    return { success: true, message: `Translation for ${locale} removed` };
  }

  // Feedback
  async submitFeedback(articleId: string, userId: string | null, dto: ArticleFeedbackDto) {
    const article = await this.prisma.knowledgeBaseArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const updateData = dto.helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } };

    await this.prisma.knowledgeBaseArticle.update({
      where: { id: articleId },
      data: updateData,
    });

    // Store detailed feedback if provided
    if (dto.comment) {
      await this.prisma.platformConfig.create({
        data: {
          key: `kb_feedback_${articleId}_${Date.now()}`,
          value: JSON.stringify({
            articleId,
            userId,
            helpful: dto.helpful,
            comment: dto.comment,
            createdAt: new Date().toISOString(),
          }),
          dataType: 'JSON',
          category: 'GENERAL',
          description: 'Knowledge base article feedback',
          isPublic: false,
          isActive: true,
        },
      });
    }

    return {
      success: true,
      message: 'Thank you for your feedback',
    };
  }

  // Search
  async search(query: SearchQueryDto, userId?: string) {
    const { query: searchTerm, audience, locale, limit = 10 } = query;

    let userRole: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      userRole = user?.role || null;
    }

    const where: any = {
      status: ArticleStatus.PUBLISHED,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { excerpt: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { hasSome: searchTerm.split(' ') } },
      ],
    };

    if (audience) {
      where.targetAudience = { in: [TargetAudience.ALL, audience] };
    } else if (userRole && userRole !== 'ADMIN') {
      where.targetAudience = { in: [TargetAudience.ALL, userRole] };
    }

    if (locale) {
      where.locale = locale;
    }

    const articles = await this.prisma.knowledgeBaseArticle.findMany({
      where,
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { helpfulCount: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        tags: true,
        viewCount: true,
        helpfulCount: true,
      },
    });

    // Calculate relevance score
    const results = articles.map((article) => {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const excerptLower = article.excerpt?.toLowerCase() || '';
      const searchLower = searchTerm.toLowerCase();

      if (titleLower.includes(searchLower)) score += 10;
      if (titleLower.startsWith(searchLower)) score += 5;
      if (excerptLower.includes(searchLower)) score += 3;
      if (article.tags.some((t) => t.toLowerCase().includes(searchLower))) score += 2;

      score += Math.log(article.viewCount + 1) * 0.5;
      score += article.helpfulCount * 0.3;

      return { ...article, relevanceScore: score };
    });

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      results,
      total: results.length,
      query: searchTerm,
    };
  }

  // Categories
  async getCategories() {
    const articles = await this.prisma.knowledgeBaseArticle.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      select: { category: true, subcategory: true },
    });

    const categoryMap: Record<string, { count: number; subcategories: Record<string, number> }> = {};

    for (const article of articles) {
      if (!categoryMap[article.category]) {
        categoryMap[article.category] = { count: 0, subcategories: {} };
      }
      categoryMap[article.category].count++;

      if (article.subcategory) {
        if (!categoryMap[article.category].subcategories[article.subcategory]) {
          categoryMap[article.category].subcategories[article.subcategory] = 0;
        }
        categoryMap[article.category].subcategories[article.subcategory]++;
      }
    }

    return Object.entries(categoryMap).map(([category, data]) => ({
      category,
      articleCount: data.count,
      subcategories: Object.entries(data.subcategories).map(([name, count]) => ({
        name,
        articleCount: count,
      })),
    }));
  }

  async getPopularTags(limit = 20) {
    const articles = await this.prisma.knowledgeBaseArticle.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    for (const article of articles) {
      for (const tag of article.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  // Bulk operations
  async bulkUpdateStatus(userId: string, dto: BulkUpdateStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can perform bulk operations');
    }

    const updateData: any = { status: dto.status };
    if (dto.status === ArticleStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const result = await this.prisma.knowledgeBaseArticle.updateMany({
      where: { id: { in: dto.articleIds } },
      data: updateData,
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }

  // Analytics
  async getAnalytics(userId: string, startDate?: Date, endDate?: Date) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can view analytics');
    }

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    const articles = await this.prisma.knowledgeBaseArticle.findMany({
      where: startDate || endDate ? { createdAt: dateFilter } : {},
    });

    const totalArticles = articles.length;
    const publishedArticles = articles.filter((a) => a.status === ArticleStatus.PUBLISHED).length;
    const draftArticles = articles.filter((a) => a.status === ArticleStatus.DRAFT).length;
    const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);
    const totalHelpful = articles.reduce((sum, a) => sum + a.helpfulCount, 0);
    const totalNotHelpful = articles.reduce((sum, a) => sum + a.notHelpfulCount, 0);

    const topArticles = [...articles]
      .filter((a) => a.status === ArticleStatus.PUBLISHED)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        viewCount: a.viewCount,
        helpfulCount: a.helpfulCount,
        helpfulRate: a.helpfulCount + a.notHelpfulCount > 0
          ? Math.round((a.helpfulCount / (a.helpfulCount + a.notHelpfulCount)) * 100)
          : null,
      }));

    const byCategory = articles.reduce((acc, article) => {
      if (!acc[article.category]) {
        acc[article.category] = { count: 0, views: 0 };
      }
      acc[article.category].count++;
      acc[article.category].views += article.viewCount;
      return acc;
    }, {} as Record<string, { count: number; views: number }>);

    const byAudience = articles.reduce((acc, article) => {
      if (!acc[article.targetAudience]) {
        acc[article.targetAudience] = 0;
      }
      acc[article.targetAudience]++;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalArticles,
      publishedArticles,
      draftArticles,
      archivedArticles: totalArticles - publishedArticles - draftArticles,
      totalViews,
      totalHelpful,
      totalNotHelpful,
      helpfulRate: totalHelpful + totalNotHelpful > 0
        ? Math.round((totalHelpful / (totalHelpful + totalNotHelpful)) * 100)
        : null,
      averageViewsPerArticle: totalArticles > 0 ? Math.round(totalViews / totalArticles) : 0,
      topArticles,
      byCategory: Object.entries(byCategory).map(([category, data]) => ({
        category,
        ...data,
      })),
      byAudience: Object.entries(byAudience).map(([audience, count]) => ({
        audience,
        count,
      })),
    };
  }

  // Featured articles
  async getFeaturedArticles(audience?: TargetAudience, limit?: number) {
    // `limit` peut arriver undefined/NaN/string via la query → coercion robuste.
    const take = Number(limit) > 0 ? Math.floor(Number(limit)) : 5;
    const where: any = {
      status: ArticleStatus.PUBLISHED,
    };

    if (audience) {
      where.targetAudience = { in: [TargetAudience.ALL, audience] };
    }

    return this.prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: [
        { viewCount: 'desc' },
        { helpfulCount: 'desc' },
      ],
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        viewCount: true,
      },
    });
  }

  // Recently updated
  async getRecentlyUpdated(limit = 10) {
    return this.prisma.knowledgeBaseArticle.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        updatedAt: true,
      },
    });
  }
}
