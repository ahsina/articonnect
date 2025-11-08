/**
 * ================================================================
 * ArtiConnect - Tests de Charge (Load Testing)
 * ================================================================
 *
 * Framework: k6 (https://k6.io/)
 *
 * Installation:
 *   brew install k6          (macOS)
 *   apt install k6           (Ubuntu/Debian)
 *   choco install k6         (Windows)
 *
 * Exécution:
 *   k6 run load-test.js                    (Test par défaut)
 *   k6 run load-test.js --vus 100 --duration 5m
 *   k6 run --out influxdb=http://localhost:8086 load-test.js
 *
 * Objectifs:
 *   - Tester la scalabilité de l'API
 *   - Identifier les goulots d'étranglement
 *   - Vérifier temps de réponse < 500ms @ 1000 users
 *   - Valider taux d'erreur < 1%
 * ================================================================
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ================================================================
// MÉTRIQUES PERSONNALISÉES
// ================================================================

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// ================================================================
// CONFIGURATION DU TEST
// ================================================================

export const options = {
  // Scénarios de charge
  scenarios: {
    // Scénario 1: Charge constante (warmup)
    warmup: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      tags: { scenario: 'warmup' },
    },

    // Scénario 2: Rampe progressive (test de scalabilité)
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },   // Montée à 50 users
        { duration: '2m', target: 100 },  // Montée à 100 users
        { duration: '2m', target: 500 },  // Montée à 500 users
        { duration: '2m', target: 1000 }, // Montée à 1000 users
        { duration: '3m', target: 1000 }, // Plateau à 1000 users
        { duration: '2m', target: 0 },    // Descente progressive
      ],
      gracefulStop: '30s',
      startTime: '30s', // Commence après warmup
      tags: { scenario: 'ramp_up' },
    },

    // Scénario 3: Test de stress (pic de charge)
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 2000 }, // Pic rapide à 2000 users
        { duration: '1m', target: 2000 },  // Maintien 1 minute
        { duration: '30s', target: 0 },    // Descente rapide
      ],
      gracefulStop: '30s',
      startTime: '13m', // Commence après ramp_up
      tags: { scenario: 'stress' },
    },
  },

  // Seuils de performance (SLO/SLA)
  thresholds: {
    // Taux d'erreur global < 1%
    errors: ['rate<0.01'],

    // 95% des requêtes < 500ms
    http_req_duration: ['p(95)<500'],

    // 99% des requêtes < 1000ms
    'http_req_duration{scenario:ramp_up}': ['p(99)<1000'],

    // Taux de succès > 99%
    checks: ['rate>0.99'],
  },

  // Délai max d'exécution
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
};

// ================================================================
// CONFIGURATION DE L'ENVIRONNEMENT
// ================================================================

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

// Tokens d'authentification (à générer avant le test)
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || 'test_admin_token';
const CLIENT_TOKEN = __ENV.CLIENT_TOKEN || 'test_client_token';
const ARTISAN_TOKEN = __ENV.ARTISAN_TOKEN || 'test_artisan_token';

const headers = {
  'Content-Type': 'application/json',
};

// ================================================================
// FONCTIONS UTILITAIRES
// ================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[randomInt(0, array.length - 1)];
}

function logError(response, endpoint) {
  if (response.status !== 200 && response.status !== 201) {
    console.error(`❌ ${endpoint} failed: ${response.status} - ${response.body}`);
  }
}

// ================================================================
// SCÉNARIOS DE TEST
// ================================================================

export default function () {
  // Sélection aléatoire du type d'utilisateur
  const userType = randomItem(['client', 'artisan', 'guest']);

  group('ArtiConnect API Load Test', () => {
    // Test 1: Homepage / Health Check
    group('1. Health & Public Endpoints', () => {
      const healthRes = http.get(`${BASE_URL}/health`);
      check(healthRes, {
        'health check status 200': (r) => r.status === 200,
        'health check < 100ms': (r) => r.timings.duration < 100,
      });
      apiResponseTime.add(healthRes.timings.duration);
      errorRate.add(healthRes.status !== 200);
    });

    // Test 2: Authentification
    if (userType !== 'guest') {
      group('2. Authentication', () => {
        const loginPayload = {
          email: userType === 'client' ? 'client@test.com' : 'artisan@test.com',
          password: 'TestPassword123!',
        };

        const loginRes = http.post(
          `${BASE_URL}/auth/login`,
          JSON.stringify(loginPayload),
          { headers }
        );

        const loginSuccess = check(loginRes, {
          'login status 200': (r) => r.status === 200 || r.status === 201,
          'login returns token': (r) => {
            try {
              return JSON.parse(r.body).token !== undefined;
            } catch (e) {
              return false;
            }
          },
          'login < 300ms': (r) => r.timings.duration < 300,
        });

        apiResponseTime.add(loginRes.timings.duration);
        errorRate.add(!loginSuccess);

        if (loginSuccess) {
          successfulRequests.add(1);
        } else {
          failedRequests.add(1);
          logError(loginRes, 'POST /auth/login');
        }
      });
    }

    // Test 3: Recherche d'artisans (haute fréquence)
    group('3. Search Artisans', () => {
      const searchParams = `latitude=48.8566&longitude=2.3522&radius=10&category=Plomberie`;
      const searchRes = http.get(`${BASE_URL}/artisans/search?${searchParams}`, {
        headers: {
          ...headers,
          Authorization: `Bearer ${CLIENT_TOKEN}`,
        },
      });

      check(searchRes, {
        'search status 200': (r) => r.status === 200,
        'search returns array': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body));
          } catch (e) {
            return false;
          }
        },
        'search < 500ms': (r) => r.timings.duration < 500,
      });

      apiResponseTime.add(searchRes.timings.duration);
      errorRate.add(searchRes.status !== 200);
    });

    // Test 4: Récupération liste de missions
    if (userType === 'client' || userType === 'artisan') {
      group('4. Get Missions', () => {
        const token = userType === 'client' ? CLIENT_TOKEN : ARTISAN_TOKEN;
        const missionsRes = http.get(`${BASE_URL}/missions`, {
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });

        check(missionsRes, {
          'missions status 200': (r) => r.status === 200,
          'missions returns array': (r) => {
            try {
              return Array.isArray(JSON.parse(r.body));
            } catch (e) {
              return false;
            }
          },
          'missions < 400ms': (r) => r.timings.duration < 400,
        });

        apiResponseTime.add(missionsRes.timings.duration);
        errorRate.add(missionsRes.status !== 200);
      });
    }

    // Test 5: Notifications (WebSocket simulation avec polling)
    if (userType !== 'guest') {
      group('5. Get Notifications', () => {
        const token = userType === 'client' ? CLIENT_TOKEN : ARTISAN_TOKEN;
        const notifRes = http.get(`${BASE_URL}/notifications`, {
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });

        check(notifRes, {
          'notifications status 200': (r) => r.status === 200,
          'notifications < 200ms': (r) => r.timings.duration < 200,
        });

        apiResponseTime.add(notifRes.timings.duration);
        errorRate.add(notifRes.status !== 200);
      });
    }

    // Test 6: Marketplace (lecture produits)
    group('6. Marketplace Products', () => {
      const productsRes = http.get(`${BASE_URL}/marketplace/products?limit=20`, {
        headers,
      });

      check(productsRes, {
        'products status 200': (r) => r.status === 200,
        'products returns array': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body));
          } catch (e) {
            return false;
          }
        },
        'products < 400ms': (r) => r.timings.duration < 400,
      });

      apiResponseTime.add(productsRes.timings.duration);
      errorRate.add(productsRes.status !== 200);
    });

    // Test 7: Création de mission (write operations)
    if (userType === 'client' && randomInt(1, 10) === 1) {
      // Seulement 10% des clients créent une mission
      group('7. Create Mission', () => {
        const missionPayload = {
          type: randomItem(['EMERGENCY', 'SCHEDULED', 'QUOTE']),
          title: `Test mission ${Date.now()}`,
          description: 'Mission de test pour load testing',
          category: randomItem(['Plomberie', 'Électricité', 'Serrurerie']),
          address: '10 Rue de Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566 + (Math.random() - 0.5) * 0.1,
          longitude: 2.3522 + (Math.random() - 0.5) * 0.1,
        };

        const createRes = http.post(
          `${BASE_URL}/missions`,
          JSON.stringify(missionPayload),
          {
            headers: {
              ...headers,
              Authorization: `Bearer ${CLIENT_TOKEN}`,
            },
          }
        );

        check(createRes, {
          'create mission status 201': (r) => r.status === 201,
          'create mission < 600ms': (r) => r.timings.duration < 600,
        });

        apiResponseTime.add(createRes.timings.duration);
        errorRate.add(createRes.status !== 201);
      });
    }

    // Test 8: Dashboard admin (admin only)
    if (randomInt(1, 100) === 1) {
      // 1% de chances (simule trafic admin)
      group('8. Admin Dashboard', () => {
        const dashboardRes = http.get(`${BASE_URL}/analytics/dashboard`, {
          headers: {
            ...headers,
            Authorization: `Bearer ${ADMIN_TOKEN}`,
          },
        });

        check(dashboardRes, {
          'dashboard status 200': (r) => r.status === 200,
          'dashboard < 800ms': (r) => r.timings.duration < 800,
        });

        apiResponseTime.add(dashboardRes.timings.duration);
        errorRate.add(dashboardRes.status !== 200);
      });
    }
  });

  // Pause aléatoire entre 1 et 3 secondes (simule comportement utilisateur réel)
  sleep(randomInt(1, 3));
}

// ================================================================
// FONCTIONS DE LIFECYCLE
// ================================================================

export function setup() {
  console.log('🚀 Démarrage des tests de charge ArtiConnect');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log('⏱️  Durée totale estimée: ~15 minutes');
  console.log('');

  // Vérifier que l'API est accessible
  const healthRes = http.get(`${BASE_URL}/health`);
  if (healthRes.status !== 200) {
    console.error('❌ API non accessible! Vérifiez que le serveur tourne.');
    throw new Error('API health check failed');
  }

  console.log('✅ API accessible - Démarrage du test');
  return { startTime: new Date().toISOString() };
}

export function teardown(data) {
  console.log('');
  console.log('✅ Tests de charge terminés');
  console.log(`🕐 Démarré à: ${data.startTime}`);
  console.log(`🕑 Terminé à: ${new Date().toISOString()}`);
  console.log('');
  console.log('📊 Consultez les métriques détaillées ci-dessus');
}

// ================================================================
// NOTES D'UTILISATION
// ================================================================

/**
 * Commandes utiles:
 *
 * 1. Test rapide (1 minute, 50 users):
 *    k6 run --vus 50 --duration 1m load-test.js
 *
 * 2. Test avec variables d'environnement:
 *    k6 run --env API_URL=https://api.articonnect.com load-test.js
 *
 * 3. Export des résultats vers InfluxDB + Grafana:
 *    k6 run --out influxdb=http://localhost:8086/k6 load-test.js
 *
 * 4. Export JSON:
 *    k6 run --out json=results.json load-test.js
 *
 * 5. Test de smoke (validation rapide):
 *    k6 run --vus 1 --duration 10s load-test.js
 *
 * Interprétation des résultats:
 * - http_req_duration: Temps de réponse moyen
 * - http_req_failed: Taux d'échec
 * - vus: Nombre d'utilisateurs virtuels
 * - iterations: Nombre total de requêtes
 *
 * Objectifs de performance:
 * - p(95) < 500ms: 95% des requêtes en moins de 500ms
 * - errors < 1%: Moins de 1% d'erreurs
 * - 1000 VUs: Supporter 1000 utilisateurs simultanés
 */
