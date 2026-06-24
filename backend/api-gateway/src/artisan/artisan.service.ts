import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeConnectService } from '../user/services/stripe-connect.service';

const NUM_TO_DOW = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
const DOW_TO_NUM: Record<string, number> = NUM_TO_DOW.reduce((a, d, i) => ((a[d] = i), a), {} as any);
const PLATFORM_FEE = Number(process.env.PLATFORM_COMMISSION_PERCENT || 10) / 100;

/**
 * Couche "artisan" : agrège/relie les fonctionnalités de l'espace artisan
 * (profil, certifs, dispos, earnings, dashboard, etc.) sur les modèles existants.
 */
@Injectable()
export class ArtisanService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeConnectService,
  ) {}

  /** Résout l'ArtisanProfile de l'utilisateur courant (id du profil ≠ id user). */
  private async profile(userId: string) {
    const p = await this.prisma.artisanProfile.findUnique({ where: { userId } });
    if (!p) throw new ForbiddenException("Cet utilisateur n'a pas de profil artisan");
    return p;
  }

  // ---------- Profil ----------
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        artisanProfile: {
          include: {
            specialties: true,
            certifications: true,
            workingHours: true,
            availabilitySlots: true,
            timeOffs: true,
          },
        },
      },
    });
    if (!user?.artisanProfile) throw new NotFoundException('Profil artisan introuvable');
    const ap: any = user.artisanProfile;
    return {
      ...ap,
      userId,
      hourlyRate: ap.hourlyRate != null ? Number(ap.hourlyRate) : undefined,
      rating: Number(ap.rating ?? 0),
      workingHours: (ap.workingHours || []).map(this.mapWorkingHours),
      availabilitySlots: (ap.availabilitySlots || []).map(this.mapSlot),
      timeOffs: ap.timeOffs || [],
    };
  }

  async updateProfile(userId: string, dto: any) {
    const p = await this.profile(userId);
    const data: any = {};
    for (const k of ['companyName', 'description', 'website', 'serviceRadius', 'baseAddress', 'latitude', 'longitude', 'emergencyRate']) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.hourlyRate !== undefined) data.hourlyRate = dto.hourlyRate;
    const updated = await this.prisma.artisanProfile.update({ where: { id: p.id }, data });
    return { ...updated, hourlyRate: updated.hourlyRate != null ? Number(updated.hourlyRate) : undefined, rating: Number(updated.rating ?? 0) };
  }

  async toggleAvailability(userId: string, available: boolean) {
    const p = await this.profile(userId);
    await this.prisma.artisanProfile.update({ where: { id: p.id }, data: { available } });
    return { available };
  }

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const p = await this.profile(userId);
    await this.prisma.artisanProfile.update({ where: { id: p.id }, data: { latitude, longitude } });
    return { success: true };
  }

  // ---------- Stripe ----------
  getStripeStatus(userId: string) { return this.stripe.getOnboardingStatus(userId); }
  createStripeOnboarding(userId: string) { return this.stripe.createOnboardingLink(userId); }
  refreshStripeOnboarding(userId: string) { return this.stripe.refreshOnboardingLink(userId); }

  // ---------- Certifications ----------
  async getCertifications(userId: string) {
    const p = await this.profile(userId);
    return this.prisma.certification.findMany({ where: { artisanId: p.id }, orderBy: { createdAt: 'desc' } });
  }
  async addCertification(userId: string, dto: any) {
    const p = await this.profile(userId);
    return this.prisma.certification.create({
      data: {
        artisanId: p.id,
        name: dto.name,
        issuer: dto.issuer,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        document: dto.document ?? null,
      },
    });
  }
  async updateCertification(userId: string, id: string, dto: any) {
    const p = await this.profile(userId);
    await this.assertOwnCert(p.id, id);
    const data: any = {};
    for (const k of ['name', 'issuer', 'document']) if (dto[k] !== undefined) data[k] = dto[k];
    if (dto.issueDate) data.issueDate = new Date(dto.issueDate);
    if (dto.expiryDate) data.expiryDate = new Date(dto.expiryDate);
    return this.prisma.certification.update({ where: { id }, data });
  }
  async deleteCertification(userId: string, id: string) {
    const p = await this.profile(userId);
    await this.assertOwnCert(p.id, id);
    await this.prisma.certification.delete({ where: { id } });
    return { message: 'Certification supprimée' };
  }
  private async assertOwnCert(artisanId: string, id: string) {
    const c = await this.prisma.certification.findUnique({ where: { id } });
    if (!c || c.artisanId !== artisanId) throw new NotFoundException('Certification introuvable');
  }

  // ---------- Working hours ----------
  private mapWorkingHours = (w: any) => ({ id: w.id, artisanId: w.artisanId, dayOfWeek: DOW_TO_NUM[w.dayOfWeek] ?? 0, startTime: w.startTime, endTime: w.endTime, isEnabled: w.isActive });
  async getWorkingHours(userId: string) {
    const p = await this.profile(userId);
    const wh = await this.prisma.workingHours.findMany({ where: { artisanId: p.id } });
    return wh.map(this.mapWorkingHours);
  }
  async setWorkingHours(userId: string, items: any[]) {
    const p = await this.profile(userId);
    await this.prisma.workingHours.deleteMany({ where: { artisanId: p.id } });
    for (const it of items || []) {
      const dow = NUM_TO_DOW[it.dayOfWeek] ?? 'MONDAY';
      await this.prisma.workingHours.create({
        data: { artisanId: p.id, dayOfWeek: dow as any, startTime: it.startTime, endTime: it.endTime, isActive: it.isEnabled ?? true },
      });
    }
    return this.getWorkingHours(userId);
  }

  // ---------- Availability slots ----------
  private mapSlot = (s: any) => ({ id: s.id, artisanId: s.artisanId, date: s.startTime, startTime: s.startTime, endTime: s.endTime, isAvailable: !s.isBooked });
  async getAvailability(userId: string, params: { startDate?: string; endDate?: string }) {
    const p = await this.profile(userId);
    const where: any = { artisanId: p.id };
    if (params.startDate || params.endDate) {
      where.startTime = {};
      if (params.startDate) where.startTime.gte = new Date(params.startDate);
      if (params.endDate) where.startTime.lte = new Date(params.endDate);
    }
    const slots = await this.prisma.availabilitySlot.findMany({ where, orderBy: { startTime: 'asc' } });
    return slots.map(this.mapSlot);
  }
  async createAvailability(userId: string, dto: any) {
    const p = await this.profile(userId);
    const s = await this.prisma.availabilitySlot.create({
      data: { artisanId: p.id, startTime: new Date(dto.startTime ?? dto.date), endTime: new Date(dto.endTime ?? dto.date) },
    });
    return this.mapSlot(s);
  }
  async deleteAvailability(userId: string, id: string) {
    const p = await this.profile(userId);
    const s = await this.prisma.availabilitySlot.findUnique({ where: { id } });
    if (!s || s.artisanId !== p.id) throw new NotFoundException('Créneau introuvable');
    await this.prisma.availabilitySlot.delete({ where: { id } });
    return { message: 'Créneau supprimé' };
  }

  // ---------- Time off ----------
  async getTimeOffs(userId: string) {
    const p = await this.profile(userId);
    return this.prisma.timeOff.findMany({ where: { artisanId: p.id }, orderBy: { startDate: 'desc' } });
  }
  async requestTimeOff(userId: string, dto: any) {
    const p = await this.profile(userId);
    const VALID = ['VACATION', 'SICK_LEAVE', 'PERSONAL', 'PUBLIC_HOLIDAY', 'OTHER'];
    const type = VALID.includes(dto.type) ? dto.type : 'VACATION';
    return this.prisma.timeOff.create({
      data: { artisanId: p.id, type, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), reason: dto.reason ?? undefined } as any,
    });
  }
  async cancelTimeOff(userId: string, id: string) {
    const p = await this.profile(userId);
    const t = await this.prisma.timeOff.findUnique({ where: { id } });
    if (!t || t.artisanId !== p.id) throw new NotFoundException('Congé introuvable');
    await this.prisma.timeOff.delete({ where: { id } });
    return { message: 'Congé annulé' };
  }

  // ---------- Reviews (liées via mission.artisanId = userId) ----------
  async getMyReviews(userId: string, params: { page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const where = { mission: { artisanId: userId } };
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { mission: { select: { title: true } } } }),
      this.prisma.review.count({ where }),
    ]);
    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ---------- Earnings ----------
  private async completedMissions(userId: string) {
    return this.prisma.mission.findMany({
      where: { artisanId: userId, status: 'COMPLETED' as any },
      select: { id: true, title: true, agreedPrice: true, completedAt: true, createdAt: true },
      orderBy: { completedAt: 'desc' },
    });
  }
  private toEarning(m: any) {
    const gross = Number(m.agreedPrice ?? 0);
    const fee = +(gross * PLATFORM_FEE).toFixed(2);
    return { id: m.id, artisanId: '', missionId: m.id, missionTitle: m.title, grossAmount: gross, platformFee: fee, netAmount: +(gross - fee).toFixed(2), status: 'PAID' as const, createdAt: m.completedAt ?? m.createdAt };
  }
  async getEarnings(userId: string, params: { page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const all = (await this.completedMissions(userId)).map((m) => this.toEarning(m));
    const total = all.length;
    return { data: all.slice((page - 1) * limit, page * limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
  async getEarningsSummary(userId: string) {
    const earnings = (await this.completedMissions(userId)).map((m) => this.toEarning(m));
    const sum = (arr: any[]) => arr.reduce((s, e) => s + e.netAmount, 0);
    const now = new Date();
    const thisMonth = earnings.filter((e) => { const d = new Date(e.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = earnings.filter((e) => { const d = new Date(e.createdAt); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
    const totalEarnings = sum(earnings);
    return {
      totalEarnings, pendingEarnings: 0, paidEarnings: totalEarnings,
      totalMissions: earnings.length,
      averagePerMission: earnings.length ? +(totalEarnings / earnings.length).toFixed(2) : 0,
      thisMonthEarnings: sum(thisMonth), lastMonthEarnings: sum(lastMonth),
    };
  }

  // ---------- Dashboard ----------
  async getDashboard(userId: string) {
    const p = await this.prisma.artisanProfile.findUnique({ where: { userId } });
    const [total, completed, active, pending, recent] = await Promise.all([
      this.prisma.mission.count({ where: { artisanId: userId } }),
      this.prisma.mission.count({ where: { artisanId: userId, status: 'COMPLETED' as any } }),
      this.prisma.mission.count({ where: { artisanId: userId, status: 'IN_PROGRESS' as any } }),
      this.prisma.mission.count({ where: { artisanId: userId, status: 'PENDING' as any } }),
      this.prisma.mission.findMany({ where: { artisanId: userId }, take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true, agreedPrice: true, createdAt: true } }),
    ]);
    const summary = await this.getEarningsSummary(userId);
    return {
      totalMissions: total, completedMissions: completed, activeMissions: active, pendingMissions: pending,
      totalEarnings: summary.totalEarnings, pendingEarnings: summary.pendingEarnings,
      averageRating: Number(p?.rating ?? 0), totalReviews: p?.reviewCount ?? 0,
      recentMissions: recent,
    };
  }

  async getAnalytics(userId: string) {
    const dash = await this.getDashboard(userId);
    const summary = await this.getEarningsSummary(userId);
    const growth = summary.lastMonthEarnings
      ? Math.round(((summary.thisMonthEarnings - summary.lastMonthEarnings) / summary.lastMonthEarnings) * 100)
      : 0;
    // Forme riche attendue par la page (les séries de graphiques sont vides faute de data agrégée).
    return {
      earnings: { total: summary.totalEarnings, growth, byMonth: [] as any[] },
      missions: {
        completed: dash.completedMissions,
        total: dash.totalMissions,
        conversionRate: dash.totalMissions ? Math.round((dash.completedMissions / dash.totalMissions) * 100) : 0,
        byCategory: [] as any[],
      },
      performance: { averageRating: dash.averageRating, totalReviews: dash.totalReviews, repeatClientRate: 0, responseTime: 0 },
      trends: { peakHours: [] as any[], peakDays: [] as any[] },
      geography: { topCities: [] as any[] },
    };
  }

  // ---------- Quotations (devis de l'artisan) ----------
  async getQuotations(userId: string, params: { page?: number; limit?: number; status?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const where: any = { artisanId: userId };
    if (params.status) where.status = params.status;
    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { client: { select: { firstName: true, lastName: true, email: true } }, lineItems: true },
      }),
      this.prisma.quote.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ---------- Notification preferences ----------
  async getNotificationPreferences(userId: string) {
    const pref = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    const disabled = new Set(pref?.disabledTypes ?? []);
    return {
      emailNotifications: pref?.email ?? true,
      pushNotifications: pref?.push ?? true,
      smsNotifications: pref?.sms ?? false,
      newMissionAlerts: !disabled.has('NEW_MISSION'),
      missionUpdates: !disabled.has('MISSION_UPDATE'),
      paymentNotifications: !disabled.has('PAYMENT_RECEIVED'),
      reviewNotifications: !disabled.has('REVIEW_NEW'),
      marketingEmails: !disabled.has('MARKETING'),
    };
  }
  async updateNotificationPreferences(userId: string, dto: any) {
    const base = { email: dto.emailNotifications, push: dto.pushNotifications, sms: dto.smsNotifications };
    const data: any = {};
    for (const k of ['email', 'push', 'sms'] as const) if (base[k] !== undefined) data[k] = base[k];
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return this.getNotificationPreferences(userId);
  }

  // ---------- Badges ----------
  async getMyBadges(userId: string) {
    return this.prisma.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { earnedAt: 'desc' } }).catch(() => []);
  }
}
