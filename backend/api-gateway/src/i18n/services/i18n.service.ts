import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  SupportedLocale,
  TextDirection,
  TranslationStatus,
  TranslationNamespace,
  CreateLocaleDto,
  UpdateLocaleDto,
  CreateTranslationDto,
  UpdateTranslationDto,
  BulkTranslationDto,
  BulkUpdateTranslationDto,
  ImportTranslationsDto,
  ExportTranslationsDto,
  TranslationFilterDto,
  LocaleDetectionDto,
  SetUserLocaleDto,
  TranslationComparisonDto,
  MachineTranslationDto,
  BulkMachineTranslationDto,
  TranslationValidationDto,
  ApproveTranslationDto,
  RejectTranslationDto,
  TranslationHistoryFilterDto,
  PluralRulesDto,
  InterpolationTestDto,
} from '../dto/i18n.dto';

@Injectable()
export class I18nService {
  private readonly DEFAULT_LOCALE = SupportedLocale.FR;
  private readonly FALLBACK_LOCALE = SupportedLocale.EN;

  // Locale configurations with RTL support
  private readonly localeConfigs = new Map([
    [SupportedLocale.FR, { name: 'French', nativeName: 'Francais', direction: TextDirection.LTR, flag: '🇫🇷', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.EN, { name: 'English', nativeName: 'English', direction: TextDirection.LTR, flag: '🇬🇧', dateFormat: 'MM/DD/YYYY', timeFormat: 'h:mm A', currencyCode: 'GBP', currencySymbol: '£' }],
    [SupportedLocale.DE, { name: 'German', nativeName: 'Deutsch', direction: TextDirection.LTR, flag: '🇩🇪', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.ES, { name: 'Spanish', nativeName: 'Espanol', direction: TextDirection.LTR, flag: '🇪🇸', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.IT, { name: 'Italian', nativeName: 'Italiano', direction: TextDirection.LTR, flag: '🇮🇹', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.NL, { name: 'Dutch', nativeName: 'Nederlands', direction: TextDirection.LTR, flag: '🇳🇱', dateFormat: 'DD-MM-YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.PT, { name: 'Portuguese', nativeName: 'Portugues', direction: TextDirection.LTR, flag: '🇵🇹', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.AR, { name: 'Arabic', nativeName: 'العربية', direction: TextDirection.RTL, flag: '🇸🇦', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', currencyCode: 'SAR', currencySymbol: 'ر.س' }],
    [SupportedLocale.TR, { name: 'Turkish', nativeName: 'Turkce', direction: TextDirection.LTR, flag: '🇹🇷', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', currencyCode: 'TRY', currencySymbol: '₺' }],
    [SupportedLocale.PL, { name: 'Polish', nativeName: 'Polski', direction: TextDirection.LTR, flag: '🇵🇱', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', currencyCode: 'PLN', currencySymbol: 'zł' }],
    [SupportedLocale.RO, { name: 'Romanian', nativeName: 'Romana', direction: TextDirection.LTR, flag: '🇷🇴', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', currencyCode: 'RON', currencySymbol: 'lei' }],
    [SupportedLocale.BE, { name: 'Belgian', nativeName: 'Belge', direction: TextDirection.LTR, flag: '🇧🇪', dateFormat: 'DD/MM/YYYY', timeFormat: 'HH:mm', currencyCode: 'EUR', currencySymbol: '€' }],
    [SupportedLocale.CH, { name: 'Swiss', nativeName: 'Suisse', direction: TextDirection.LTR, flag: '🇨🇭', dateFormat: 'DD.MM.YYYY', timeFormat: 'HH:mm', currencyCode: 'CHF', currencySymbol: 'CHF' }],
  ]);

  // Cache for translations
  private translationCache: Map<string, Map<string, string>> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  // ==================== LOCALE MANAGEMENT ====================

  async getActiveLocales() {
    const locales = await this.prisma.locale.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (locales.length === 0) {
      // Return default configurations if no DB entries
      return Array.from(this.localeConfigs.entries()).map(([code, config]) => ({
        code,
        ...config,
        isActive: true,
        sortOrder: 0,
      }));
    }

    return locales;
  }

  async getAllLocales() {
    const dbLocales = await this.prisma.locale.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Merge with default configs
    const result = [];
    for (const [code, config] of this.localeConfigs) {
      const dbLocale = dbLocales.find(l => l.code === code);
      result.push({
        code,
        ...config,
        ...dbLocale,
        isActive: dbLocale?.isActive ?? true,
        sortOrder: dbLocale?.sortOrder ?? 0,
      });
    }

    return result;
  }

  async getLocaleConfig(locale: SupportedLocale) {
    const dbLocale = await this.prisma.locale.findUnique({
      where: { code: locale },
    });

    const defaultConfig = this.localeConfigs.get(locale);
    if (!defaultConfig && !dbLocale) {
      throw new NotFoundException(`Locale ${locale} not found`);
    }

    return {
      code: locale,
      ...defaultConfig,
      ...dbLocale,
    };
  }

  async createLocale(dto: CreateLocaleDto) {
    const existing = await this.prisma.locale.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Locale ${dto.code} already exists`);
    }

    return this.prisma.locale.create({
      data: {
        code: dto.code,
        name: dto.name,
        nativeName: dto.nativeName,
        direction: dto.direction,
        flag: dto.flag,
        dateFormat: dto.dateFormat,
        timeFormat: dto.timeFormat,
        currencyCode: dto.currencyCode,
        currencySymbol: dto.currencySymbol,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateLocale(locale: SupportedLocale, dto: UpdateLocaleDto) {
    const existing = await this.prisma.locale.findUnique({
      where: { code: locale },
    });

    if (!existing) {
      // Create if doesn't exist
      const defaultConfig = this.localeConfigs.get(locale);
      return this.prisma.locale.create({
        data: {
          code: locale,
          name: dto.name ?? defaultConfig?.name ?? locale,
          nativeName: dto.nativeName ?? defaultConfig?.nativeName ?? locale,
          direction: dto.direction ?? defaultConfig?.direction ?? TextDirection.LTR,
          flag: dto.flag ?? defaultConfig?.flag,
          dateFormat: dto.dateFormat ?? defaultConfig?.dateFormat,
          timeFormat: dto.timeFormat ?? defaultConfig?.timeFormat,
          currencyCode: dto.currencyCode ?? defaultConfig?.currencyCode,
          currencySymbol: dto.currencySymbol ?? defaultConfig?.currencySymbol,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    }

    return this.prisma.locale.update({
      where: { code: locale },
      data: dto,
    });
  }

  async toggleLocale(locale: SupportedLocale, isActive: boolean) {
    return this.updateLocale(locale, { isActive });
  }

  // ==================== TRANSLATION MANAGEMENT ====================

  async createTranslation(dto: CreateTranslationDto) {
    const existingTranslation = await this.prisma.translation.findFirst({
      where: {
        key: dto.key,
        namespace: dto.namespace,
        locale: dto.locale,
      },
    });

    if (existingTranslation) {
      throw new ConflictException(`Translation for key "${dto.key}" in locale "${dto.locale}" already exists`);
    }

    const translation = await this.prisma.translation.create({
      data: {
        key: dto.key,
        namespace: dto.namespace,
        locale: dto.locale,
        value: dto.value,
        pluralValue: dto.pluralValue,
        description: dto.description,
        context: dto.context,
        status: dto.status ?? TranslationStatus.DRAFT,
      },
    });

    // Record history
    await this.recordTranslationHistory(translation.id, null, 'CREATE', dto.value);

    // Invalidate cache
    this.invalidateCache(dto.locale, dto.namespace);

    return translation;
  }

  async updateTranslation(id: string, dto: UpdateTranslationDto) {
    const existing = await this.prisma.translation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Translation not found');
    }

    const updated = await this.prisma.translation.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    // Record history if value changed
    if (dto.value && dto.value !== existing.value) {
      await this.recordTranslationHistory(id, existing.value, 'UPDATE', dto.value);
    }

    // Invalidate cache
    this.invalidateCache(existing.locale as SupportedLocale, existing.namespace as TranslationNamespace);

    return updated;
  }

  async deleteTranslation(id: string) {
    const existing = await this.prisma.translation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Translation not found');
    }

    // Record history BEFORE deleting the translation. The TranslationHistory
    // FK (translationId) is onDelete: Cascade, so writing history after the
    // delete would violate the foreign key (and the row would be cascade-
    // deleted anyway). We record first for auditability, accepting that the
    // cascade removes it together with the translation.
    await this.recordTranslationHistory(id, existing.value, 'DELETE', null);

    await this.prisma.translation.delete({
      where: { id },
    });

    // Invalidate cache
    this.invalidateCache(existing.locale as SupportedLocale, existing.namespace as TranslationNamespace);

    return { success: true };
  }

  async findTranslations(filters: TranslationFilterDto) {
    const { locale, namespace, status, search, missingOnly, outdatedOnly, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (locale) where.locale = locale;
    if (namespace) where.namespace = namespace;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { key: { contains: search, mode: 'insensitive' } },
        { value: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [translations, total] = await Promise.all([
      this.prisma.translation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
      }),
      this.prisma.translation.count({ where }),
    ]);

    return {
      translations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTranslation(key: string, locale: SupportedLocale, namespace: TranslationNamespace) {
    const translation = await this.prisma.translation.findFirst({
      where: {
        key,
        locale,
        namespace,
        status: TranslationStatus.PUBLISHED,
      },
    });

    if (!translation) {
      // Try fallback locale
      const fallback = await this.prisma.translation.findFirst({
        where: {
          key,
          locale: this.FALLBACK_LOCALE,
          namespace,
          status: TranslationStatus.PUBLISHED,
        },
      });

      if (fallback) return fallback;

      // Return key as value if no translation found
      return { key, value: key, locale, namespace };
    }

    return translation;
  }

  async getTranslationsByNamespace(locale: SupportedLocale, namespace: TranslationNamespace) {
    const cacheKey = `${locale}:${namespace}`;

    // Check cache
    if (this.translationCache.has(cacheKey) && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return Object.fromEntries(this.translationCache.get(cacheKey)!);
    }

    const translations = await this.prisma.translation.findMany({
      where: {
        locale,
        namespace,
        status: TranslationStatus.PUBLISHED,
      },
    });

    const result: Record<string, string> = {};
    translations.forEach(t => {
      result[t.key] = t.value;
    });

    // Update cache
    this.translationCache.set(cacheKey, new Map(Object.entries(result)));
    this.cacheTimestamp = Date.now();

    return result;
  }

  async getAllTranslationsForLocale(locale: SupportedLocale) {
    const translations = await this.prisma.translation.findMany({
      where: {
        locale,
        status: TranslationStatus.PUBLISHED,
      },
    });

    // Group by namespace
    const result: Record<string, Record<string, string>> = {};
    translations.forEach(t => {
      if (!result[t.namespace]) {
        result[t.namespace] = {};
      }
      result[t.namespace][t.key] = t.value;
    });

    return result;
  }

  // ==================== BULK OPERATIONS ====================

  async bulkCreateTranslations(dto: BulkTranslationDto) {
    const { locale, namespace, translations } = dto;
    const results = [];

    for (const [key, value] of Object.entries(translations)) {
      try {
        const existing = await this.prisma.translation.findFirst({
          where: { key, locale, namespace },
        });

        if (existing) {
          // Update existing
          const updated = await this.prisma.translation.update({
            where: { id: existing.id },
            data: { value, updatedAt: new Date() },
          });
          results.push({ key, action: 'updated', translation: updated });
        } else {
          // Create new
          const created = await this.prisma.translation.create({
            data: {
              key,
              locale,
              namespace,
              value,
              status: TranslationStatus.DRAFT,
            },
          });
          results.push({ key, action: 'created', translation: created });
        }
      } catch (error) {
        results.push({ key, action: 'error', error: error.message });
      }
    }

    // Invalidate cache
    this.invalidateCache(locale, namespace);

    return {
      success: true,
      processed: results.length,
      results,
    };
  }

  async bulkUpdateTranslations(dto: BulkUpdateTranslationDto) {
    const results = [];

    for (const translation of dto.translations) {
      try {
        const existing = await this.prisma.translation.findFirst({
          where: {
            key: translation.key,
            locale: translation.locale,
            namespace: translation.namespace,
          },
        });

        if (existing) {
          const updated = await this.prisma.translation.update({
            where: { id: existing.id },
            data: {
              value: translation.value,
              pluralValue: translation.pluralValue,
              description: translation.description,
              context: translation.context,
              status: translation.status,
              updatedAt: new Date(),
            },
          });
          results.push({ key: translation.key, locale: translation.locale, action: 'updated', translation: updated });
        } else {
          const created = await this.prisma.translation.create({
            data: translation,
          });
          results.push({ key: translation.key, locale: translation.locale, action: 'created', translation: created });
        }
      } catch (error) {
        results.push({ key: translation.key, locale: translation.locale, action: 'error', error: error.message });
      }
    }

    // Invalidate all caches
    this.clearCache();

    return {
      success: true,
      processed: results.length,
      results,
    };
  }

  // ==================== IMPORT/EXPORT ====================

  async importTranslations(dto: ImportTranslationsDto) {
    const { locale, namespace, data, overwrite = false, createMissing = true } = dto;
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const flattenedData = this.flattenObject(data);

    for (const [key, value] of Object.entries(flattenedData)) {
      try {
        const existing = await this.prisma.translation.findFirst({
          where: {
            key,
            locale,
            namespace: namespace ?? this.detectNamespaceFromKey(key),
          },
        });

        if (existing) {
          if (overwrite) {
            await this.prisma.translation.update({
              where: { id: existing.id },
              data: { value: String(value), updatedAt: new Date() },
            });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else if (createMissing) {
          await this.prisma.translation.create({
            data: {
              key,
              locale,
              namespace: namespace ?? this.detectNamespaceFromKey(key),
              value: String(value),
              status: TranslationStatus.DRAFT,
            },
          });
          results.created++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push(`${key}: ${error.message}`);
      }
    }

    // Invalidate cache
    this.clearCache();

    return results;
  }

  async exportTranslations(dto: ExportTranslationsDto) {
    const { locale, namespace, status, format = 'json' } = dto;

    const where: any = {};
    if (locale) where.locale = locale;
    if (namespace) where.namespace = namespace;
    if (status) where.status = status;

    const translations = await this.prisma.translation.findMany({
      where,
      orderBy: [{ locale: 'asc' }, { namespace: 'asc' }, { key: 'asc' }],
    });

    switch (format) {
      case 'json':
        return this.exportToJson(translations);
      case 'csv':
        return this.exportToCsv(translations);
      case 'xliff':
        return this.exportToXliff(translations);
      default:
        return this.exportToJson(translations);
    }
  }

  private exportToJson(translations: any[]) {
    const result: Record<string, Record<string, Record<string, string>>> = {};

    translations.forEach(t => {
      if (!result[t.locale]) result[t.locale] = {};
      if (!result[t.locale][t.namespace]) result[t.locale][t.namespace] = {};
      result[t.locale][t.namespace][t.key] = t.value;
    });

    return {
      format: 'json',
      data: result,
    };
  }

  private exportToCsv(translations: any[]) {
    const headers = ['locale', 'namespace', 'key', 'value', 'status'];
    const rows = translations.map(t => [
      t.locale,
      t.namespace,
      t.key,
      `"${t.value.replace(/"/g, '""')}"`,
      t.status,
    ].join(','));

    return {
      format: 'csv',
      data: [headers.join(','), ...rows].join('\n'),
    };
  }

  private exportToXliff(translations: any[]) {
    // Group by locale
    const byLocale: Record<string, any[]> = {};
    translations.forEach(t => {
      if (!byLocale[t.locale]) byLocale[t.locale] = [];
      byLocale[t.locale].push(t);
    });

    const xliffDocs: Record<string, string> = {};

    for (const [locale, trans] of Object.entries(byLocale)) {
      xliffDocs[locale] = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="fr" target-language="${locale}" datatype="plaintext">
    <body>
${trans.map(t => `      <trans-unit id="${t.key}">
        <source>${this.escapeXml(t.key)}</source>
        <target>${this.escapeXml(t.value)}</target>
      </trans-unit>`).join('\n')}
    </body>
  </file>
</xliff>`;
    }

    return {
      format: 'xliff',
      data: xliffDocs,
    };
  }

  // ==================== LOCALE DETECTION ====================

  async detectLocale(dto: LocaleDetectionDto): Promise<SupportedLocale> {
    const { acceptLanguage, browserLocale, userPreference, ipCountry } = dto;

    // Priority: userPreference > browserLocale > acceptLanguage > ipCountry > default
    if (userPreference && this.isValidLocale(userPreference)) {
      return userPreference as SupportedLocale;
    }

    if (browserLocale && this.isValidLocale(browserLocale)) {
      return browserLocale as SupportedLocale;
    }

    if (acceptLanguage) {
      const parsed = this.parseAcceptLanguage(acceptLanguage);
      for (const lang of parsed) {
        if (this.isValidLocale(lang)) {
          return lang as SupportedLocale;
        }
      }
    }

    if (ipCountry) {
      const localeFromCountry = this.getLocaleFromCountry(ipCountry);
      if (localeFromCountry) {
        return localeFromCountry;
      }
    }

    return this.DEFAULT_LOCALE;
  }

  async setUserLocale(userId: string, dto: SetUserLocaleDto) {
    const { locale, saveAsDefault } = dto;

    if (!this.isValidLocale(locale)) {
      throw new BadRequestException(`Invalid locale: ${locale}`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredLocale: locale,
      },
    });

    return {
      success: true,
      locale,
      localeConfig: await this.getLocaleConfig(locale),
    };
  }

  async getUserLocale(userId: string): Promise<SupportedLocale> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredLocale: true },
    });

    return (user?.preferredLocale as SupportedLocale) || this.DEFAULT_LOCALE;
  }

  // ==================== TRANSLATION COMPARISON ====================

  async compareTranslations(dto: TranslationComparisonDto) {
    const { sourceLocale, targetLocale, namespace } = dto;

    const where: any = {};
    if (namespace) where.namespace = namespace;

    const [sourceTranslations, targetTranslations] = await Promise.all([
      this.prisma.translation.findMany({
        where: { ...where, locale: sourceLocale },
      }),
      this.prisma.translation.findMany({
        where: { ...where, locale: targetLocale },
      }),
    ]);

    const sourceKeys = new Set(sourceTranslations.map(t => `${t.namespace}:${t.key}`));
    const targetKeys = new Set(targetTranslations.map(t => `${t.namespace}:${t.key}`));

    const missing: string[] = [];
    const extra: string[] = [];
    const outdated: string[] = [];

    sourceKeys.forEach(key => {
      if (!targetKeys.has(key)) {
        missing.push(key);
      }
    });

    targetKeys.forEach(key => {
      if (!sourceKeys.has(key)) {
        extra.push(key);
      }
    });

    // Check for outdated translations (source updated after target)
    for (const source of sourceTranslations) {
      const target = targetTranslations.find(t => t.key === source.key && t.namespace === source.namespace);
      if (target && source.updatedAt > target.updatedAt) {
        outdated.push(`${source.namespace}:${source.key}`);
      }
    }

    return {
      sourceLocale,
      targetLocale,
      statistics: {
        sourceCount: sourceTranslations.length,
        targetCount: targetTranslations.length,
        missingCount: missing.length,
        extraCount: extra.length,
        outdatedCount: outdated.length,
        completionRate: ((targetTranslations.length / sourceTranslations.length) * 100).toFixed(2) + '%',
      },
      missing,
      extra,
      outdated,
    };
  }

  // ==================== VALIDATION & APPROVAL ====================

  async validateTranslations(dto: TranslationValidationDto) {
    const { locale, namespace } = dto;

    const where: any = { locale };
    if (namespace) where.namespace = namespace;

    const translations = await this.prisma.translation.findMany({ where });

    const issues: { key: string; type: string; message: string }[] = [];

    for (const t of translations) {
      // Check for empty values
      if (!t.value || t.value.trim() === '') {
        issues.push({ key: t.key, type: 'empty', message: 'Translation value is empty' });
      }

      // Check for placeholder mismatches
      const placeholders = t.key.match(/\{\{[^}]+\}\}/g) || [];
      const valuePlaceholders = t.value.match(/\{\{[^}]+\}\}/g) || [];
      if (placeholders.length !== valuePlaceholders.length) {
        issues.push({ key: t.key, type: 'placeholder_mismatch', message: 'Placeholder count mismatch' });
      }

      // Check for HTML tags balance
      const openTags = (t.value.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (t.value.match(/<\/[^>]+>/g) || []).length;
      if (openTags !== closeTags) {
        issues.push({ key: t.key, type: 'html_mismatch', message: 'Unbalanced HTML tags' });
      }

      // Check for leading/trailing whitespace
      if (t.value !== t.value.trim()) {
        issues.push({ key: t.key, type: 'whitespace', message: 'Leading or trailing whitespace detected' });
      }
    }

    return {
      locale,
      namespace,
      total: translations.length,
      valid: translations.length - issues.length,
      invalid: issues.length,
      issues,
    };
  }

  async approveTranslations(userId: string, dto: ApproveTranslationDto) {
    const { translationIds, comment } = dto;

    const results = await this.prisma.translation.updateMany({
      where: {
        id: { in: translationIds },
        status: TranslationStatus.PENDING_REVIEW,
      },
      data: {
        status: TranslationStatus.APPROVED,
        updatedAt: new Date(),
      },
    });

    // Record approval history
    for (const id of translationIds) {
      await this.recordTranslationHistory(id, null, 'APPROVE', comment || 'Approved');
    }

    this.clearCache();

    return {
      success: true,
      approved: results.count,
    };
  }

  async rejectTranslations(userId: string, dto: RejectTranslationDto) {
    const { translationIds, reason } = dto;

    const results = await this.prisma.translation.updateMany({
      where: {
        id: { in: translationIds },
        status: TranslationStatus.PENDING_REVIEW,
      },
      data: {
        status: TranslationStatus.DRAFT,
        updatedAt: new Date(),
      },
    });

    // Record rejection history
    for (const id of translationIds) {
      await this.recordTranslationHistory(id, null, 'REJECT', reason);
    }

    return {
      success: true,
      rejected: results.count,
    };
  }

  async publishTranslations(locale: SupportedLocale, namespace?: TranslationNamespace) {
    const where: any = {
      locale,
      status: TranslationStatus.APPROVED,
    };
    if (namespace) where.namespace = namespace;

    const results = await this.prisma.translation.updateMany({
      where,
      data: {
        status: TranslationStatus.PUBLISHED,
        updatedAt: new Date(),
      },
    });

    this.clearCache();

    return {
      success: true,
      published: results.count,
    };
  }

  // ==================== TRANSLATION HISTORY ====================

  private async recordTranslationHistory(
    translationId: string,
    oldValue: string | null,
    action: string,
    newValue: string | null,
    userId?: string,
  ) {
    await this.prisma.translationHistory.create({
      data: {
        translationId,
        oldValue,
        newValue,
        action,
        userId,
      },
    });
  }

  async getTranslationHistory(filters: TranslationHistoryFilterDto) {
    const { translationId, key, locale, userId, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (translationId) where.translationId = translationId;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [history, total] = await Promise.all([
      this.prisma.translationHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          translation: true,
        },
      }),
      this.prisma.translationHistory.count({ where }),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== PLURAL HANDLING ====================

  async setPluralForms(dto: PluralRulesDto) {
    const { locale, key, forms } = dto;

    // Store plural forms as JSON
    const pluralValue = JSON.stringify(forms);

    const existing = await this.prisma.translation.findFirst({
      where: { key, locale },
    });

    if (existing) {
      return this.prisma.translation.update({
        where: { id: existing.id },
        data: { pluralValue, updatedAt: new Date() },
      });
    }

    return this.prisma.translation.create({
      data: {
        key,
        locale,
        namespace: this.detectNamespaceFromKey(key),
        value: forms.one,
        pluralValue,
        status: TranslationStatus.DRAFT,
      },
    });
  }

  getPluralForm(locale: SupportedLocale, count: number, forms: any): string {
    const pluralRules = new Intl.PluralRules(locale);
    const category = pluralRules.select(count);

    return forms[category] || forms.other || forms.one;
  }

  // ==================== INTERPOLATION ====================

  interpolate(template: string, variables: Record<string, any>, locale?: SupportedLocale): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');

      let formattedValue = value;

      // Format numbers
      if (typeof value === 'number' && locale) {
        formattedValue = new Intl.NumberFormat(locale).format(value);
      }

      // Format dates
      if (value instanceof Date && locale) {
        formattedValue = new Intl.DateTimeFormat(locale).format(value);
      }

      result = result.replace(regex, formattedValue);
    }

    return result;
  }

  testInterpolation(dto: InterpolationTestDto) {
    const { template, variables, locale } = dto;
    return {
      input: template,
      variables,
      output: this.interpolate(template, variables, locale),
    };
  }

  // ==================== ANALYTICS ====================

  async getTranslationAnalytics() {
    const [
      totalTranslations,
      byLocale,
      byNamespace,
      byStatus,
      recentUpdates,
    ] = await Promise.all([
      this.prisma.translation.count(),
      this.prisma.translation.groupBy({
        by: ['locale'],
        _count: true,
      }),
      this.prisma.translation.groupBy({
        by: ['namespace'],
        _count: true,
      }),
      this.prisma.translation.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.translation.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          key: true,
          locale: true,
          namespace: true,
          updatedAt: true,
        },
      }),
    ]);

    // Calculate completion rates per locale
    const completionRates: Record<string, number> = {};
    const baseLocaleCount = byLocale.find(b => b.locale === this.DEFAULT_LOCALE)?._count || 0;

    byLocale.forEach(locale => {
      completionRates[locale.locale] = baseLocaleCount > 0
        ? Math.round((locale._count / baseLocaleCount) * 100)
        : 0;
    });

    return {
      total: totalTranslations,
      byLocale: byLocale.map(b => ({ locale: b.locale, count: b._count })),
      byNamespace: byNamespace.map(b => ({ namespace: b.namespace, count: b._count })),
      byStatus: byStatus.map(b => ({ status: b.status, count: b._count })),
      completionRates,
      recentUpdates,
    };
  }

  // ==================== HELPER METHODS ====================

  private isValidLocale(locale: string): boolean {
    return Object.values(SupportedLocale).includes(locale as SupportedLocale);
  }

  private parseAcceptLanguage(acceptLanguage: string): string[] {
    return acceptLanguage
      .split(',')
      .map(lang => {
        const [code, q] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(),
          quality: parseFloat(q || '1'),
        };
      })
      .sort((a, b) => b.quality - a.quality)
      .map(lang => lang.code);
  }

  private getLocaleFromCountry(countryCode: string): SupportedLocale | null {
    const countryToLocale: Record<string, SupportedLocale> = {
      FR: SupportedLocale.FR,
      BE: SupportedLocale.BE,
      CH: SupportedLocale.CH,
      DE: SupportedLocale.DE,
      AT: SupportedLocale.DE,
      ES: SupportedLocale.ES,
      IT: SupportedLocale.IT,
      NL: SupportedLocale.NL,
      PT: SupportedLocale.PT,
      BR: SupportedLocale.PT,
      GB: SupportedLocale.EN,
      US: SupportedLocale.EN,
      SA: SupportedLocale.AR,
      AE: SupportedLocale.AR,
      TR: SupportedLocale.TR,
      PL: SupportedLocale.PL,
      RO: SupportedLocale.RO,
    };

    return countryToLocale[countryCode.toUpperCase()] || null;
  }

  private detectNamespaceFromKey(key: string): TranslationNamespace {
    const prefix = key.split('.')[0]?.toLowerCase();
    const namespaceMap: Record<string, TranslationNamespace> = {
      common: TranslationNamespace.COMMON,
      auth: TranslationNamespace.AUTH,
      dashboard: TranslationNamespace.DASHBOARD,
      missions: TranslationNamespace.MISSIONS,
      marketplace: TranslationNamespace.MARKETPLACE,
      artisans: TranslationNamespace.ARTISANS,
      admin: TranslationNamespace.ADMIN,
      notifications: TranslationNamespace.NOTIFICATIONS,
      emails: TranslationNamespace.EMAILS,
      errors: TranslationNamespace.ERRORS,
      validation: TranslationNamespace.VALIDATION,
    };

    return namespaceMap[prefix] || TranslationNamespace.COMMON;
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenObject(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private invalidateCache(locale: SupportedLocale, namespace: TranslationNamespace) {
    const cacheKey = `${locale}:${namespace}`;
    this.translationCache.delete(cacheKey);
  }

  private clearCache() {
    this.translationCache.clear();
    this.cacheTimestamp = 0;
  }
}
