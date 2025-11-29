import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { I18nService } from '../services/i18n.service';
import {
  SupportedLocale,
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
  TranslationValidationDto,
  ApproveTranslationDto,
  RejectTranslationDto,
  TranslationHistoryFilterDto,
  PluralRulesDto,
  InterpolationTestDto,
} from '../dto/i18n.dto';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('locales')
  @UseGuards(OptionalJwtAuthGuard)
  async getActiveLocales() {
    return this.i18nService.getActiveLocales();
  }

  @Get('locales/:locale/config')
  @UseGuards(OptionalJwtAuthGuard)
  async getLocaleConfig(@Param('locale') locale: SupportedLocale) {
    return this.i18nService.getLocaleConfig(locale);
  }

  @Get('translations/:locale/:namespace')
  @UseGuards(OptionalJwtAuthGuard)
  async getTranslationsByNamespace(
    @Param('locale') locale: SupportedLocale,
    @Param('namespace') namespace: TranslationNamespace,
  ) {
    return this.i18nService.getTranslationsByNamespace(locale, namespace);
  }

  @Get('translations/:locale')
  @UseGuards(OptionalJwtAuthGuard)
  async getAllTranslationsForLocale(@Param('locale') locale: SupportedLocale) {
    return this.i18nService.getAllTranslationsForLocale(locale);
  }

  @Post('detect')
  @UseGuards(OptionalJwtAuthGuard)
  async detectLocale(
    @Body() dto: LocaleDetectionDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.i18nService.detectLocale({
      ...dto,
      acceptLanguage: dto.acceptLanguage || acceptLanguage,
    });
  }

  // ==================== AUTHENTICATED USER ENDPOINTS ====================

  @Get('user/locale')
  @UseGuards(JwtAuthGuard)
  async getUserLocale(@Request() req) {
    return this.i18nService.getUserLocale(req.user.id);
  }

  @Put('user/locale')
  @UseGuards(JwtAuthGuard)
  async setUserLocale(@Request() req, @Body() dto: SetUserLocaleDto) {
    return this.i18nService.setUserLocale(req.user.id, dto);
  }

  // ==================== ADMIN LOCALE MANAGEMENT ====================

  @Get('admin/locales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllLocales() {
    return this.i18nService.getAllLocales();
  }

  @Post('admin/locales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createLocale(@Body() dto: CreateLocaleDto) {
    return this.i18nService.createLocale(dto);
  }

  @Put('admin/locales/:locale')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateLocale(
    @Param('locale') locale: SupportedLocale,
    @Body() dto: UpdateLocaleDto,
  ) {
    return this.i18nService.updateLocale(locale, dto);
  }

  @Put('admin/locales/:locale/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async toggleLocale(
    @Param('locale') locale: SupportedLocale,
    @Body('isActive') isActive: boolean,
  ) {
    return this.i18nService.toggleLocale(locale, isActive);
  }

  // ==================== ADMIN TRANSLATION MANAGEMENT ====================

  @Get('admin/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findTranslations(@Query() filters: TranslationFilterDto) {
    return this.i18nService.findTranslations(filters);
  }

  @Post('admin/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async createTranslation(@Body() dto: CreateTranslationDto) {
    return this.i18nService.createTranslation(dto);
  }

  @Put('admin/translations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateTranslation(
    @Param('id') id: string,
    @Body() dto: UpdateTranslationDto,
  ) {
    return this.i18nService.updateTranslation(id, dto);
  }

  @Delete('admin/translations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async deleteTranslation(@Param('id') id: string) {
    return this.i18nService.deleteTranslation(id);
  }

  // ==================== BULK OPERATIONS ====================

  @Post('admin/translations/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async bulkCreateTranslations(@Body() dto: BulkTranslationDto) {
    return this.i18nService.bulkCreateTranslations(dto);
  }

  @Put('admin/translations/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async bulkUpdateTranslations(@Body() dto: BulkUpdateTranslationDto) {
    return this.i18nService.bulkUpdateTranslations(dto);
  }

  // ==================== IMPORT/EXPORT ====================

  @Post('admin/translations/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async importTranslations(@Body() dto: ImportTranslationsDto) {
    return this.i18nService.importTranslations(dto);
  }

  @Post('admin/translations/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async exportTranslations(@Body() dto: ExportTranslationsDto) {
    return this.i18nService.exportTranslations(dto);
  }

  // ==================== COMPARISON & VALIDATION ====================

  @Post('admin/translations/compare')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async compareTranslations(@Body() dto: TranslationComparisonDto) {
    return this.i18nService.compareTranslations(dto);
  }

  @Post('admin/translations/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async validateTranslations(@Body() dto: TranslationValidationDto) {
    return this.i18nService.validateTranslations(dto);
  }

  // ==================== APPROVAL WORKFLOW ====================

  @Post('admin/translations/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async approveTranslations(@Request() req, @Body() dto: ApproveTranslationDto) {
    return this.i18nService.approveTranslations(req.user.id, dto);
  }

  @Post('admin/translations/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async rejectTranslations(@Request() req, @Body() dto: RejectTranslationDto) {
    return this.i18nService.rejectTranslations(req.user.id, dto);
  }

  @Post('admin/translations/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async publishTranslations(
    @Body('locale') locale: SupportedLocale,
    @Body('namespace') namespace?: TranslationNamespace,
  ) {
    return this.i18nService.publishTranslations(locale, namespace);
  }

  // ==================== HISTORY ====================

  @Get('admin/translations/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getTranslationHistory(@Query() filters: TranslationHistoryFilterDto) {
    return this.i18nService.getTranslationHistory(filters);
  }

  // ==================== PLURAL & INTERPOLATION ====================

  @Post('admin/translations/plural')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async setPluralForms(@Body() dto: PluralRulesDto) {
    return this.i18nService.setPluralForms(dto);
  }

  @Post('test/interpolation')
  @UseGuards(JwtAuthGuard)
  async testInterpolation(@Body() dto: InterpolationTestDto) {
    return this.i18nService.testInterpolation(dto);
  }

  // ==================== ANALYTICS ====================

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getTranslationAnalytics() {
    return this.i18nService.getTranslationAnalytics();
  }
}
