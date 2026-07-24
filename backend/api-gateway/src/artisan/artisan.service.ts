import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StripeConnectService } from '../user/services/stripe-connect.service';
import { BusinessVerificationService } from '../verification/services/business-verification.service';

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
    private verification: BusinessVerificationService,
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
    if (!user?.artisanProfile) throw new ForbiddenException("Cet utilisateur n'a pas de profil artisan");
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
    for (const k of ['companyName', 'description', 'website', 'serviceRadius', 'baseAddress', 'latitude', 'longitude', 'emergencyRate', 'quoteTerms', 'vatNumber']) {
      if (dto[k] !== undefined) data[k] = dto[k];
    }
    if (dto.hourlyRate !== undefined) data.hourlyRate = dto.hourlyRate;
    // TVA facturation : statut (assujetti/franchise) + taux appliqué aux devis/factures.
    if (dto.vatExempt !== undefined) data.vatExempt = !!dto.vatExempt;
    if (dto.vatRate !== undefined) data.vatRate = dto.vatRate === null || dto.vatRate === '' ? null : Number(dto.vatRate);

    // Métiers (relation many-to-many `specialties`). Le formulaire peut envoyer soit des IDs
    // (uuid) soit des noms de métiers. On RÉSOUT chaque valeur vers un enregistrement Specialty
    // réellement existant AVANT de faire un `set`. Cela corrige la sauvegarde du profil : sans
    // cette résolution, un `connect`/`set` sur des identifiants inexistants (slugs "plomberie",
    // métiers non seedés) faisait échouer Prisma avec « Expected N records to be connected,
    // found only 0 ». Les valeurs non résolues sont simplement ignorées (jamais d'erreur).
    if (Array.isArray(dto.specialtyIds)) {
      const wanted = dto.specialtyIds.map((v: any) => String(v));
      const wantedIds = new Set(wanted);
      const wantedNames = new Set(wanted.map((v: string) => v.trim().toLowerCase()));
      const all = await this.prisma.specialty.findMany({ select: { id: true, name: true } });
      const resolved = all.filter((s) => wantedIds.has(s.id) || wantedNames.has(s.name.trim().toLowerCase()));
      data.specialties = { set: resolved.map((s) => ({ id: s.id })) };
    }

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
    // Précondition : l'espace dashboard artisan n'est accessible qu'avec un profil artisan.
    // (Sans cette garde, un CLIENT sans profil recevait un dashboard factice à zéro.)
    const p = await this.profile(userId);
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

  // Distance haversine (km) entre deux points géographiques.
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Analytics détaillées de l'artisan — TOUTES les séries sont calculées en réel
   * (agrégations Prisma) : gains par mois, missions par catégorie/statut, heures/jours
   * de pointe, top villes, taux de clients récurrents, délai de réponse moyen, distance.
   * La forme renvoyée correspond exactement à l'interface AnalyticsData de la page
   * /artisan/analytics (earnings.byMonth[{month,amount}], trends.peakHours[{hour,requests}], …).
   */
  async getAnalytics(userId: string) {
    const p = await this.profile(userId); // garde : profil artisan requis
    const COMPLETED_STATUSES = ['COMPLETED'];
    const CANCELLED_STATUSES = ['CANCELLED', 'CANCELLED_NO_SHOW'];
    const ACTIVE_STATUSES = ['PENDING', 'NEGOTIATING', 'ACCEPTED', 'PENDING_DEPOSIT', 'DEPOSIT_PAID', 'IN_TRANSIT', 'PAID', 'IN_PROGRESS'];

    // 1 seule lecture des missions de l'artisan (via artisanId = userId, comme dashboard/earnings).
    const missions = await this.prisma.mission.findMany({
      where: { artisanId: userId },
      select: {
        id: true, status: true, category: true, city: true, clientId: true,
        agreedPrice: true, finalPrice: true, latitude: true, longitude: true,
        createdAt: true, completedAt: true, scheduledFor: true,
      },
    });

    const net = (m: any) => {
      const gross = Number(m.finalPrice ?? m.agreedPrice ?? 0);
      return +(gross * (1 - PLATFORM_FEE)).toFixed(2);
    };

    const completed = missions.filter((m) => COMPLETED_STATUSES.includes(m.status as any));
    const cancelled = missions.filter((m) => CANCELLED_STATUSES.includes(m.status as any));
    const active = missions.filter((m) => ACTIVE_STATUSES.includes(m.status as any));
    const total = missions.length;

    // ---- Gains par mois (12 derniers mois glissants, buckets continus incl. zéros) ----
    const MOIS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const now = new Date();
    const monthKeys: { key: string; month: string }[] = [];
    const monthMap = new Map<string, { amount: number; count: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push({ key, month: `${MOIS_FR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
      monthMap.set(key, { amount: 0, count: 0 });
    }
    for (const m of completed) {
      const d = new Date(m.completedAt ?? m.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const b = monthMap.get(key);
      if (b) { b.amount = +(b.amount + net(m)).toFixed(2); b.count += 1; }
    }
    const byMonth = monthKeys.map(({ key, month }) => ({ month, amount: monthMap.get(key)!.amount, missions: monthMap.get(key)!.count }));
    const totalEarnings = +completed.reduce((s, m) => s + net(m), 0).toFixed(2);
    const thisMonth = byMonth[byMonth.length - 1]?.amount ?? 0;
    const lastMonth = byMonth[byMonth.length - 2]?.amount ?? 0;
    const growth = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth ? 100 : 0);

    // ---- Missions par catégorie (sur missions complétées) ----
    const catMap = new Map<string, number>();
    for (const m of completed) catMap.set(m.category || 'Autre', (catMap.get(m.category || 'Autre') || 0) + 1);
    const byCategory = [...catMap.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

    // ---- Missions par statut (libellés FR) ----
    const byStatus = [
      { status: 'Complétées', count: completed.length },
      { status: 'En cours', count: active.length },
      { status: 'Annulées', count: cancelled.length },
    ];

    // ---- Heures de pointe (répartition des demandes par heure) ----
    const hourMap = new Map<number, number>();
    for (const m of missions) {
      const d = new Date(m.scheduledFor ?? m.createdAt);
      const h = d.getHours();
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    }
    const peakHours = [...hourMap.entries()].map(([hour, requests]) => ({ hour, requests })).sort((a, b) => a.hour - b.hour);

    // ---- Jours de pointe (lundi → dimanche) ----
    const JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const ORDER = [1, 2, 3, 4, 5, 6, 0];
    const dayMap = new Map<number, number>();
    for (const m of missions) {
      const d = new Date(m.scheduledFor ?? m.createdAt);
      dayMap.set(d.getDay(), (dayMap.get(d.getDay()) || 0) + 1);
    }
    const peakDays = ORDER.map((dow) => ({ day: JOURS_FR[dow], requests: dayMap.get(dow) || 0 }));

    // ---- Top villes par revenu (missions complétées) ----
    const cityMap = new Map<string, { count: number; revenue: number }>();
    for (const m of completed) {
      const c = m.city || 'N/A';
      const e = cityMap.get(c) || { count: 0, revenue: 0 };
      e.count += 1; e.revenue = +(e.revenue + net(m)).toFixed(2);
      cityMap.set(c, e);
    }
    const topCities = [...cityMap.entries()]
      .map(([city, v]) => ({ city, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // ---- Distance moyenne (haversine base artisan ↔ chantiers complétés) ----
    const distances = completed
      .filter((m) => m.latitude != null && m.longitude != null && p.latitude != null && p.longitude != null)
      .map((m) => this.haversineKm(p.latitude!, p.longitude!, m.latitude!, m.longitude!));
    const averageDistance = distances.length ? +(distances.reduce((s, d) => s + d, 0) / distances.length).toFixed(1) : 0;

    // ---- Taux de clients récurrents (clients avec ≥ 2 missions complétées) ----
    const clientCount = new Map<string, number>();
    for (const m of completed) clientCount.set(m.clientId, (clientCount.get(m.clientId) || 0) + 1);
    const distinctClients = clientCount.size;
    const repeatClients = [...clientCount.values()].filter((n) => n > 1).length;
    const repeatClientRate = distinctClients ? Math.round((repeatClients / distinctClients) * 100) : 0;

    // ---- Délai de réponse moyen (mission créée → 1re offre envoyée par l'artisan) ----
    const negos = await this.prisma.negotiation.findMany({
      where: { senderId: userId },
      select: { missionId: true, createdAt: true, mission: { select: { createdAt: true } } },
    });
    const firstResponse = new Map<string, number>(); // missionId -> delai(h) de la 1re offre
    for (const n of negos) {
      if (!n.mission) continue;
      const delayH = (new Date(n.createdAt).getTime() - new Date(n.mission.createdAt).getTime()) / 3_600_000;
      if (delayH < 0) continue;
      const prev = firstResponse.get(n.missionId);
      if (prev == null || delayH < prev) firstResponse.set(n.missionId, delayH);
    }
    const responseTimes = [...firstResponse.values()];
    const responseTime = responseTimes.length ? +(responseTimes.reduce((s, d) => s + d, 0) / responseTimes.length).toFixed(1) : 0;

    const conversionRate = total ? Math.round((completed.length / total) * 100) : 0;
    const completionRate = completed.length + cancelled.length
      ? Math.round((completed.length / (completed.length + cancelled.length)) * 100)
      : 0;

    return {
      earnings: { total: totalEarnings, thisMonth, lastMonth, growth, byMonth },
      missions: {
        total,
        completed: completed.length,
        cancelled: cancelled.length,
        conversionRate,
        byCategory,
        byStatus,
      },
      performance: {
        averageRating: Number(p.rating ?? 0),
        totalReviews: p.reviewCount ?? 0,
        responseTime,
        completionRate,
        repeatClientRate,
      },
      geography: { topCities, averageDistance },
      trends: { peakHours, peakDays },
    };
  }

  // ---------- Quotations (devis de l'artisan) ----------
  async getQuotations(userId: string, params: { page?: number; limit?: number; status?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    // Les « devis » de l'artisan = ses offres de prix (négociations) envoyées.
    // (Auparavant on lisait la table Quote, jamais alimentée par le parcours artisan -> page vide.)
    const where: any = { senderId: userId };
    if (params.status === 'ACCEPTED') where.accepted = true;
    else if (params.status === 'REJECTED') where.accepted = false;
    else if (params.status === 'PENDING') where.accepted = null;

    const [rows, total] = await Promise.all([
      this.prisma.negotiation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          mission: {
            select: {
              id: true,
              title: true,
              category: true,
              // Anti-désintermédiation : pas d'email/téléphone du client sur une simple offre
              // (l'artisan n'a rien payé ni gagné). Le contact n'est révélé qu'après paiement
              // escrow, via le canal mission dédié — jamais sur la liste des devis/offres.
              client: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.negotiation.count({ where }),
    ]);

    const data = rows.map((n) => ({
      id: n.id,
      amount: Number(n.proposedPrice),
      status: n.accepted === true ? 'ACCEPTED' : n.accepted === false ? 'REJECTED' : 'PENDING',
      validUntil: n.expiresAt,
      message: n.message,
      createdAt: n.createdAt,
      mission: n.mission,
    }));

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

  // ---------- Vérification KYC (côté artisan) ----------
  /** État de vérification business de l'artisan courant. */
  async getVerification(userId: string) {
    return this.verification.getVerificationStatus(userId);
  }

  /**
   * Re-soumission KYC par un artisan (notamment quand il est bloqué en REJECTED).
   * - S'il fournit un n° d'enregistrement + pays corrigés, on relance le contrôle automatique :
   *   VERIFIED si valide, sinon on N'ENFERME PAS l'artisan en REJECTED mais on ESCALADE en
   *   MANUAL_REVIEW (file d'attente admin) — c'est la « relance claire » qui manquait.
   * - Sans info exploitable, on bascule directement en MANUAL_REVIEW.
   */
  async resubmitVerification(userId: string, dto: any = {}) {
    const p = await this.profile(userId);

    if (p.businessVerificationStatus === 'VERIFIED') {
      return { status: 'VERIFIED', verified: true, message: 'Votre entreprise est déjà vérifiée.' };
    }

    // Corrections métier éventuelles fournies par l'artisan (persistées sur le profil).
    const patch: any = {};
    if (dto.companyName) patch.companyName = dto.companyName;
    if (dto.siret) patch.siret = dto.siret;
    if (dto.vatNumber !== undefined) patch.vatNumber = dto.vatNumber;
    if (Object.keys(patch).length) {
      await this.prisma.artisanProfile.update({ where: { id: p.id }, data: patch });
    }

    const registrationNumber = dto.registrationNumber ?? dto.siret ?? p.businessRegistrationNumber ?? p.siret;
    const country = (dto.country ?? p.businessCountry) as string | undefined;
    const companyName = dto.companyName ?? p.companyName;

    const escalateToManualReview = async () => {
      const fresh = await this.prisma.artisanProfile.findUnique({
        where: { id: p.id },
        select: { businessVerificationWarnings: true },
      });
      await this.prisma.artisanProfile.update({
        where: { id: p.id },
        data: {
          businessVerificationStatus: 'MANUAL_REVIEW',
          businessVerified: false,
          businessVerifiedAt: null,
          businessVerificationLastCheck: new Date(),
          businessVerificationErrors: [],
          businessVerificationWarnings: [
            ...(fresh?.businessVerificationWarnings || []),
            `RESUBMITTED_BY_ARTISAN: ${new Date().toISOString()}`,
          ],
        },
      });
      return {
        status: 'MANUAL_REVIEW',
        verified: false,
        message: 'Votre dossier a été renvoyé pour vérification manuelle par notre équipe. Vous serez notifié dès qu\'il sera traité.',
      };
    };

    // Relance du contrôle automatique si on dispose d'un n° + pays.
    if (registrationNumber && country) {
      try {
        await this.verification.verifyArtisan(userId, { country: country as any, registrationNumber, companyName });
      } catch {
        return escalateToManualReview();
      }
      const status = await this.verification.getVerificationStatus(userId);
      if (status.verified) {
        return {
          status: 'VERIFIED',
          verified: true,
          message: 'Vérification réussie. Votre entreprise est désormais validée.',
        };
      }
      // Échec automatique → escalade en revue manuelle (jamais de cul-de-sac REJECTED).
      return escalateToManualReview();
    }

    return escalateToManualReview();
  }

  // ---------- Badges ----------
  async getMyBadges(userId: string) {
    return this.prisma.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { earnedAt: 'desc' } }).catch(() => []);
  }
}
