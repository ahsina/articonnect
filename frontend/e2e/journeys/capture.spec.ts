import { test, expect } from '@playwright/test';

// Harnais de capture avant/après refonte design. CAPTURE_DIR=before|after
const DIR = process.env.CAPTURE_DIR || 'before';
const OUT = `/out/${DIR}`;
const ADMINPW = process.env.E2E_ADMIN_PASSWORD || 'Admin1234!';

const USERS: Record<string, { email: string; pw: string } | null> = {
  public: null,
  client: { email: 'jean.dupont@example.com', pw: 'Client1234!' },
  artisan: { email: 'pierre.plombier@example.com', pw: 'Artisan1234!' },
  admin: { email: 'admin@articonnect.com', pw: ADMINPW },
};

const ROUTES: Record<string, string[]> = {
  public: ['/', '/design-system', '/offline', '/auth/login', '/auth/register',
    '/auth/forgot-password', '/auth/reset-password', '/auth/2fa-verify'],
  client: ['/client/dashboard', '/client/artisans', '/client/marketplace', '/client/missions',
    '/client/missions/new', '/client/cart', '/client/orders', '/client/invoices', '/client/disputes',
    '/client/favorites', '/client/messages', '/client/notifications', '/client/profile',
    '/client/settings', '/client/settings/2fa', '/client/become-artisan'],
  artisan: ['/artisan/dashboard', '/artisan/missions', '/artisan/quotations',
    '/artisan/availability/calendar', '/artisan/availability/working-hours', '/artisan/availability/time-off',
    '/artisan/certifications', '/artisan/products', '/artisan/earnings', '/artisan/reviews',
    '/artisan/analytics', '/artisan/messages', '/artisan/time-tracking', '/artisan/profile',
    '/artisan/settings', '/artisan/stripe', '/artisan/company/create', '/artisan/company/dashboard',
    '/artisan/company/employees', '/artisan/company/assignments', '/artisan/company/reports',
    '/artisan/company/settings'],
  admin: ['/admin/admin/dashboard', '/admin/admin/users', '/admin/admin/missions', '/admin/admin/disputes',
    '/admin/admin/moderation', '/admin/admin/monitoring', '/admin/admin/analytics', '/admin/admin/audit-logs',
    '/admin/admin/certifications', '/admin/admin/cron', '/admin/admin/feature-flags',
    '/admin/admin/fraud-settings', '/admin/admin/no-shows', '/admin/admin/reputation',
    '/admin/admin/specialties', '/admin/admin/verifications', '/admin/admin/settings',
    '/admin/admin/settings/fees', '/admin/admin/settings/payments', '/admin/admin/settings/tax',
    '/admin/admin/settings/notifications', '/admin/admin/settings/users'],
};

const slug = (r: string) => r.replace(/^\//, '').replace(/\//g, '_') || 'home';

async function uiLogin(page: any, email: string, pw: string) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(pw);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
}

for (const persona of Object.keys(ROUTES)) {
  test(`capture ${persona}`, async ({ page }) => {
    test.setTimeout(180000);
    const u = USERS[persona];
    if (u) await uiLogin(page, u.email, u.pw);
    for (const route of ROUTES[persona]) {
      try {
        await page.goto(route, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${OUT}/${persona}__${slug(route)}.png`, fullPage: true });
      } catch (e) {
        // capture quand même ce qui est rendu
        try { await page.screenshot({ path: `${OUT}/${persona}__${slug(route)}.png`, fullPage: true }); } catch {}
        // eslint-disable-next-line no-console
        console.log(`WARN ${persona} ${route}: ${(e as Error).message.slice(0, 80)}`);
      }
    }
    expect(true).toBe(true);
  });
}
