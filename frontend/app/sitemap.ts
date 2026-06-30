import type { MetadataRoute } from 'next';

const BASE = 'https://krafolt.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/auth/login',
    '/auth/register',
    '/legal/mentions',
    '/legal/terms',
    '/legal/privacy',
    '/legal/cookies',
  ];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }));
}
