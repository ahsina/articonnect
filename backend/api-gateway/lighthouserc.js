/**
 * ================================================================
 * Lighthouse CI Configuration - ArtiConnect
 * ================================================================
 *
 * Tests de performance et PWA avec Lighthouse
 *
 * Installation:
 *   npm install --save-dev @lhci/cli
 *
 * Utilisation:
 *   npm run lighthouse        (script à ajouter au package.json)
 *   lhci autorun              (exécution automatique)
 *   lhci collect --url=https://articonnect.com
 *
 * Documentation: https://github.com/GoogleChrome/lighthouse-ci
 * ================================================================
 */

module.exports = {
  ci: {
    // ============================================================
    // COLLECT - Configuration de collecte des métriques
    // ============================================================
    collect: {
      // URLs à tester
      url: [
        'http://localhost:3000',                    // Homepage
        'http://localhost:3000/artisans/search',    // Recherche artisans
        'http://localhost:3000/marketplace',        // Marketplace
        'http://localhost:3000/missions/create',    // Création mission
        'http://localhost:3000/dashboard',          // Dashboard
      ],

      // Nombre de runs par URL (pour moyenne)
      numberOfRuns: 3,

      // Options Lighthouse
      settings: {
        // Mode de simulation
        throttlingMethod: 'simulate', // ou 'devtools', 'provided'

        // Configuration réseau (Fast 3G)
        throttling: {
          rttMs: 150,              // Latence réseau (ms)
          throughputKbps: 1638.4,  // Débit download (kb/s)
          requestLatencyMs: 150,   // Latence requête (ms)
          downloadThroughputKbps: 1638.4,
          uploadThroughputKbps: 675,
          cpuSlowdownMultiplier: 4, // Ralentissement CPU
        },

        // Device émulé
        emulatedFormFactor: 'mobile', // ou 'desktop'
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 2.625,
          disabled: false,
        },

        // User Agent
        onlyCategories: ['performance', 'pwa', 'accessibility', 'best-practices', 'seo'],

        // Options PWA
        skipAudits: [],
      },

      // Démarrer serveur local avant les tests (optionnel)
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'Application is running',
      startServerReadyTimeout: 60000, // 60 secondes
    },

    // ============================================================
    // ASSERT - Seuils de performance (budget)
    // ============================================================
    assert: {
      preset: 'lighthouse:no-pwa', // Base de départ

      // Assertions personnalisées
      assertions: {
        // ========================================================
        // PERFORMANCE
        // ========================================================
        'categories:performance': ['error', { minScore: 0.9 }], // Score > 90

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }], // < 1.5s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // < 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],   // < 0.1
        'total-blocking-time': ['error', { maxNumericValue: 300 }],       // < 300ms
        'speed-index': ['error', { maxNumericValue: 3000 }],              // < 3s
        'interactive': ['error', { maxNumericValue: 3000 }],              // < 3s

        // Métriques réseau
        'network-requests': ['warn', { maxNumericValue: 50 }],            // < 50 requêtes
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }],      // < 2MB
        'dom-size': ['warn', { maxNumericValue: 1500 }],                  // < 1500 éléments

        // ========================================================
        // PWA (Progressive Web App)
        // ========================================================
        'categories:pwa': ['error', { minScore: 0.9 }], // Score PWA > 90

        // Critères PWA
        'installable-manifest': 'error',             // manifest.json valide
        'service-worker': 'error',                   // Service Worker présent
        'splash-screen': 'error',                    // Splash screen configuré
        'themed-omnibox': 'error',                   // Theme color défini
        'viewport': 'error',                         // Viewport meta tag
        'content-width': 'error',                    // Contenu adapté à la largeur
        'apple-touch-icon': 'warn',                  // Icône Apple touch

        // PWA optimisations
        'offline-start-url': 'error',                // Page de démarrage offline
        'works-offline': 'error',                    // Fonctionne offline

        // ========================================================
        // ACCESSIBILITY
        // ========================================================
        'categories:accessibility': ['warn', { minScore: 0.9 }], // Score > 90

        'color-contrast': 'warn',                    // Contraste suffisant
        'image-alt': 'warn',                         // Alt text sur images
        'label': 'warn',                             // Labels sur inputs
        'link-name': 'warn',                         // Noms sur liens
        'aria-allowed-attr': 'warn',                 // ARIA valide
        'button-name': 'warn',                       // Noms sur boutons

        // ========================================================
        // BEST PRACTICES
        // ========================================================
        'categories:best-practices': ['warn', { minScore: 0.9 }],

        'uses-https': 'error',                       // HTTPS obligatoire
        'errors-in-console': 'warn',                 // Pas d'erreurs console
        'uses-http2': 'warn',                        // HTTP/2 recommandé
        'no-vulnerable-libraries': 'error',          // Pas de libs vulnérables
        'deprecations': 'warn',                      // Pas d'APIs dépréciées

        // ========================================================
        // SEO
        // ========================================================
        'categories:seo': ['warn', { minScore: 0.9 }],

        'meta-description': 'warn',                  // Meta description présente
        'document-title': 'error',                   // Title présent
        'robots-txt': 'warn',                        // robots.txt configuré
        'canonical': 'warn',                         // URL canonique

        // ========================================================
        // IMAGES & MÉDIAS
        // ========================================================
        'modern-image-formats': 'warn',              // WebP, AVIF recommandés
        'uses-responsive-images': 'warn',            // Images responsive
        'offscreen-images': 'warn',                  // Lazy loading images
        'uses-optimized-images': 'warn',             // Images optimisées
        'efficient-animated-content': 'warn',        // GIFs optimisés

        // ========================================================
        // JAVASCRIPT & CSS
        // ========================================================
        'unused-javascript': 'warn',                 // JS non utilisé
        'unused-css-rules': 'warn',                  // CSS non utilisé
        'unminified-javascript': 'error',            // JS minifié
        'unminified-css': 'error',                   // CSS minifié
        'uses-text-compression': 'error',            // Compression gzip/brotli

        // ========================================================
        // FONTS
        // ========================================================
        'font-display': 'warn',                      // font-display: swap
        'uses-rel-preconnect': 'warn',               // Preconnect DNS

        // ========================================================
        // CACHING
        // ========================================================
        'uses-long-cache-ttl': 'warn',               // Cache long terme
      },
    },

    // ============================================================
    // UPLOAD - Sauvegarde des résultats
    // ============================================================
    upload: {
      // Option 1: Filesystem (local)
      target: 'filesystem',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: 'lighthouse-%%PATHNAME%%-%%DATETIME%%.%%EXTENSION%%',

      // Option 2: Lighthouse CI Server (si configuré)
      // target: 'lhci',
      // serverBaseUrl: 'https://lhci.example.com',
      // token: process.env.LHCI_TOKEN,

      // Option 3: Temporary Public Storage
      // target: 'temporary-public-storage',
    },

    // ============================================================
    // SERVER - Configuration du serveur LHCI (optionnel)
    // ============================================================
    server: {
      port: 9001,
      storage: {
        storageMethod: 'sql',
        sqlDialect: 'postgres',
        sqlConnectionUrl: process.env.DATABASE_URL,
      },
    },
  },
};
