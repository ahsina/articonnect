import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Espaces authentifiés : pas d'indexation.
        disallow: ['/client/', '/artisan/', '/admin/', '/api/'],
      },
    ],
    sitemap: 'https://krafolt.com/sitemap.xml',
    host: 'https://krafolt.com',
  };
}
