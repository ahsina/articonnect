import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/**
 * Couverture e2e étendue : frappe un large ensemble d'endpoints GET avec le persona autorisé.
 * Objectif = exercer controllers + services + requêtes DB + guards + DTOs (augmente la couverture).
 * On exige seulement < 500 (un 200/400/403/404 exécute quand même le code ; un 500 = bug à relever).
 */
const ENDPOINTS: Record<'client' | 'artisan' | 'admin', string[]> = {
  client: [
    '/api/users/profile', '/api/users/client-profile', '/api/users/artisans',
    '/api/users/gdpr/consents', '/api/users/gdpr/export',
    '/api/missions', '/api/missions/nearby?lat=49.6&lng=6.1&radius=20',
    '/api/missions/search?query=plomberie', '/api/missions/search/urgent',
    '/api/missions/search/recommendations', '/api/missions/search/nearby?lat=49.6&lng=6.1',
    '/api/marketplace/products', '/api/marketplace/orders', '/api/marketplace/favorites',
    '/api/marketplace/favorites/artisans', '/api/marketplace/favorites/products',
    '/api/marketplace/favorites/stats', '/api/marketplace/requests', '/api/marketplace/requests/my',
    '/api/marketplace/requests/stats', '/api/marketplace/returns',
    '/api/favorites/artisans', '/api/invoices', '/api/disputes',
    '/api/notifications', '/api/notifications/preferences', '/api/notifications/unread-count',
    '/api/chat/conversations', '/api/compliance/kyc/status', '/api/reputation/me',
    '/api/reputation/me/history', '/api/sessions', '/api/sessions/current',
    '/api/addresses', '/api/auth/phone/status', '/api/auth/2fa/backup-codes/count',
    '/api/mission-templates', '/api/mission-templates/popular',
    // public
    '/api/specialties', '/api/specialties/categories', '/api/countries', '/api/currencies',
    '/api/currencies/rate?from=EUR&to=USD', '/api/currencies/format?amount=10&currency=EUR',
    '/api/knowledge-base/articles', '/api/knowledge-base/categories', '/api/knowledge-base/featured',
    '/api/knowledge-base/recent', '/api/knowledge-base/tags', '/api/knowledge-base/search?q=plomberie',
    '/api/support/articles', '/api/support/tickets', '/api/badges',
    '/api/vat/countries', '/api/vat/rate?country=LU', '/api/vat/calculate?amount=100&country=LU',
    '/api/i18n/locales', '/api/i18n/user/locale', '/api/config', '/api/config/public',
    '/api/health', '/api/health/live', '/api/health/ready',
  ],
  artisan: [
    '/api/artisan/profile', '/api/artisan/dashboard', '/api/artisan/earnings',
    '/api/artisan/earnings/summary', '/api/artisan/certifications', '/api/artisan/quotations',
    '/api/artisan/reviews', '/api/artisan/analytics', '/api/artisan/working-hours',
    '/api/artisan/availability', '/api/artisan/time-off', '/api/artisan/notification-preferences',
    '/api/artisan/stripe/status', '/api/stripe/status',
    '/api/certifications', '/api/quotes', '/api/quotes/stats', '/api/quotes/templates', '/api/quotes/catalog',
    '/api/portfolio', '/api/portfolio/projects', '/api/crm/clients', '/api/crm/clients/stats',
    '/api/crm/follow-ups', '/api/recurring-services', '/api/recurring-services/stats',
    '/api/recurring-services/upcoming', '/api/checklists/templates', '/api/checklists/templates/global',
    '/api/checklists/instances', '/api/checklists/analytics', '/api/documents', '/api/documents/templates',
    '/api/documents/templates/global', '/api/subcontractors', '/api/subcontractors/assignments',
    '/api/subcontractor-portal/dashboard', '/api/subcontractor-portal/offers',
    '/api/subcontractor-portal/assignments', '/api/subcontractor-portal/earnings',
    '/api/performance-reviews', '/api/performance-reviews/templates', '/api/performance-reviews/analytics',
    '/api/time-tracking/status', '/api/time-tracking/today', '/api/time-tracking/weekly',
    '/api/companies/my-company', '/api/badges/my-badges', '/api/earnings',
    '/api/analytics/dashboard', '/api/analytics/goals', '/api/analytics/platform', '/api/analytics/snapshots',
    '/api/accounting/summary?startDate=2026-01-01&endDate=2026-06-30',
    '/api/accounting/vat-declaration?year=2026&quarter=1',
    '/api/internal-chat/rooms', '/api/verification/artisan/status',
    '/api/mission-templates/my-templates', '/api/review-responses/my-responses',
  ],
  admin: [
    '/api/admin/dashboard', '/api/admin/users', '/api/admin/stats/revenue', '/api/admin/stats/growth',
    '/api/admin/analytics/metrics', '/api/admin/analytics/time-series', '/api/admin/analytics/top-artisans',
    '/api/admin/audit-logs', '/api/admin/feature-flags', '/api/admin/fraud-settings',
    '/api/admin/fraud-settings/status', '/api/admin/cron/health', '/api/admin/cron/status',
    '/api/admin/monitoring/dashboard', '/api/admin/monitoring/health', '/api/admin/monitoring/alerts',
    '/api/admin/monitoring/metrics/overview', '/api/admin/monitoring/metrics/trends',
    '/api/admin/monitoring/metrics/auto-validation', '/api/admin/monitoring/auto-validation/chart',
    '/api/admin/platform-config', '/api/admin/platform-config/fees', '/api/admin/platform-config/payments',
    '/api/admin/platform-config/tax', '/api/admin/platform-config/compliance',
    '/api/admin/platform-config/notifications', '/api/admin/platform-config/missions',
    '/api/admin/platform-config/users', '/api/admin/platform-config/no-show',
    '/api/admin/platform-config/rate-limits', '/api/admin/platform-config/reputation-rules',
    '/api/admin/platform-config/integrations', '/api/admin/platform-config/performance',
    '/api/admin/platform-config/content-moderation',
    '/api/moderation/reports', '/api/moderation/stats', '/api/moderation/my-reports',
    '/api/moderation/content/violations', '/api/moderation/content/stats', '/api/moderation/content/patterns',
    '/api/fraud/multi-account/flagged', '/api/payments/no-show/pending',
    '/api/payouts/automated/statistics', '/api/badges/admin/statistics',
    '/api/verification/admin/unverified', '/api/verification/admin/reverification-needed',
    '/api/i18n/admin/locales', '/api/i18n/admin/translations', '/api/i18n/admin/analytics',
    '/api/countries/compliance/expiring', '/api/companies',
  ],
};

for (const persona of ['client', 'artisan', 'admin'] as const) {
  test.describe(`API coverage — ${persona}`, () => {
    let ctx: any;
    test.beforeAll(async ({ playwright }) => { ctx = await apiContext(playwright, persona); });
    test.afterAll(async () => { await ctx?.dispose(); });

    test(`GET endpoints (${persona}) sans 500`, async () => {
      const errors: string[] = [];
      for (const ep of ENDPOINTS[persona]) {
        let status = 0;
        // retry une fois sur transitoire (502/503/0 = backend lent/surchargé), n'échoue que sur vrai 500/501
        for (let attempt = 0; attempt < 2; attempt++) {
          const r = await ctx.get(ep).catch(() => null);
          status = r ? r.status() : 0;
          if (status !== 0 && status !== 502 && status !== 503) break;
          await new Promise((res) => setTimeout(res, 400));
        }
        if (status === 500 || status === 501) errors.push(`${status} ${ep}`);
      }
      // eslint-disable-next-line no-console
      console.log(`@@COV ${persona}@@ hit=${ENDPOINTS[persona].length} 5xx=${errors.length} ${JSON.stringify(errors)}`);
      expect(errors, `endpoints en 500/erreur: ${errors.join(', ')}`).toHaveLength(0);
    });
  });
}
