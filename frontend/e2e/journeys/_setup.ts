import { Page, expect } from '@playwright/test';

/** Comptes de démo seedés (cf. deploy/.env.deploy / seed.ts). */
export const DEMO_USERS = {
  client: { email: 'jean.dupont@example.com', password: 'Client1234!', role: 'CLIENT', dashboard: '/client/dashboard' },
  artisan: { email: 'pierre.plombier@example.com', password: 'Artisan1234!', role: 'ARTISAN', dashboard: '/artisan/dashboard' },
  admin: { email: 'admin@articonnect.com', password: 'Admin1234!', role: 'ADMIN', dashboard: '/admin/dashboard' },
} as const;

export type Persona = keyof typeof DEMO_USERS;

/** Connexion via l'Uï réelle (/auth/login) puis attente de la redirection par rôle. */
export async function login(page: Page, persona: Persona): Promise<void> {
  const u = DEMO_USERS[persona];
  await page.goto('/auth/login');
  await page.locator('input[type="email"]').fill(u.email);
  await page.locator('input[type="password"]').fill(u.password);
  await page.locator('button[type="submit"]').click();
  // Redirection par rôle (ou au moins quitter la page de login)
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 20000 });
}

/**
 * Crée un contexte de requêtes API authentifié pour un persona (cookies httpOnly stockés).
 * Utilisé pour les flux d'écriture multi-personas (client/artisan/admin) sans navigateur.
 */
export async function apiContext(playwright: any, persona: Persona) {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://149.56.131.178:9443';
  const ctx = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });
  const u = DEMO_USERS[persona];
  const r = await ctx.post('/api/auth/login', { data: { email: u.email, password: u.password } });
  if (r.status() >= 300) throw new Error(`apiLogin ${persona} -> ${r.status()} ${await r.text()}`);
  return ctx;
}

/** Visite une page et vérifie qu'elle rend sans erreur fatale (pas d'écran d'erreur Next/boundary). */
export async function visitOk(page: Page, path: string): Promise<void> {
  const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
  // La navigation SPA peut renvoyer null (pas de doc HTTP) — on tolère.
  if (resp) expect(resp.status(), `GET ${path}`).toBeLessThan(400);
  // Pas d'erreur applicative visible
  await expect(page.locator('text=/Application error|Internal Server Error|something went wrong/i')).toHaveCount(0);
}
