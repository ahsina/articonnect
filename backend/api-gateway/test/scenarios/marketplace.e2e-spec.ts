import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Marketplace E2E Tests (Complete)', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: string;
  let artisanToken: string;
  let artisanId: string;
  let productId: string;
  let variantId: string;
  let orderId: string;
  let favoriteId: string;
  let requestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Create test users
    await createTestUsers();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestUsers() {
    // Create CLIENT
    const clientRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `marketplace-client-${Date.now()}@test.com`,
        password: 'TestPass123!',
        firstName: 'Marketplace',
        lastName: 'Client',
        role: 'CLIENT',
      })
      .expect(201);

    clientToken = clientRes.body.accessToken;
    clientId = clientRes.body.user.id;

    // Create ARTISAN
    const artisanRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `marketplace-artisan-${Date.now()}@test.com`,
        password: 'TestPass123!',
        firstName: 'Marketplace',
        lastName: 'Artisan',
        role: 'ARTISAN',
      })
      .expect(201);

    artisanToken = artisanRes.body.accessToken;
    artisanId = artisanRes.body.user.id;
  }

  // ==================== PRODUCTS ====================

  describe('Products Management', () => {
    it('should create a product as artisan', () => {
      return request(app.getHttpServer())
        .post('/marketplace/products')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Table en chêne massif',
          description: 'Belle table artisanale en chêne massif',
          price: 850,
          category: 'furniture',
          stock: 5,
          sku: 'TABLE-OAK-001',
          status: 'ACTIVE',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Table en chêne massif');
          expect(res.body.price).toBe(850);
          expect(res.body.status).toBe('ACTIVE');
          productId = res.body.id;
        });
    });

    it('should fail to create product without auth', () => {
      return request(app.getHttpServer())
        .post('/marketplace/products')
        .send({
          name: 'Test Product',
          description: 'Test',
          price: 100,
          category: 'tools',
          stock: 10,
        })
        .expect(401);
    });

    it('should get all products with pagination', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ page: 1, limit: 12 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('pagination');
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('limit');
          expect(res.body.pagination).toHaveProperty('total');
          expect(res.body.pagination).toHaveProperty('totalPages');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter products by category', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ category: 'furniture', page: 1, limit: 12 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          res.body.data.forEach((product: any) => {
            expect(product.category).toBe('furniture');
          });
        });
    });

    it('should filter products by price range', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ minPrice: 500, maxPrice: 1000, page: 1, limit: 12 })
        .expect(200)
        .expect((res) => {
          res.body.data.forEach((product: any) => {
            expect(product.price).toBeGreaterThanOrEqual(500);
            expect(product.price).toBeLessThanOrEqual(1000);
          });
        });
    });

    it('should search products by keyword', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ search: 'table', page: 1, limit: 12 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should sort products by price ascending', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ sortBy: 'price', sortOrder: 'asc', page: 1, limit: 12 })
        .expect(200)
        .expect((res) => {
          const prices = res.body.data.map((p: any) => p.price);
          const sortedPrices = [...prices].sort((a, b) => a - b);
          expect(prices).toEqual(sortedPrices);
        });
    });

    it('should get product by ID', () => {
      return request(app.getHttpServer())
        .get(`/marketplace/products/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(productId);
          expect(res.body.name).toBe('Table en chêne massif');
        });
    });

    it('should update product as owner', () => {
      return request(app.getHttpServer())
        .patch(`/marketplace/products/${productId}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          price: 900,
          stock: 3,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.price).toBe(900);
          expect(res.body.stock).toBe(3);
        });
    });

    it('should fail to get non-existent product', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products/non-existent-id')
        .expect(404);
    });
  });

  // ==================== PRODUCT VARIANTS ====================

  describe('Product Variants', () => {
    it('should create a product variant', () => {
      return request(app.getHttpServer())
        .post(`/marketplace/products/${productId}/variants`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Grande taille (200x100cm)',
          priceAdjustment: 150,
          stock: 2,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Grande taille (200x100cm)');
          expect(res.body.priceAdjustment).toBe(150);
          variantId = res.body.id;
        });
    });

    it('should get product variants', () => {
      return request(app.getHttpServer())
        .get(`/marketplace/products/${productId}/variants`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should get variant by ID', () => {
      return request(app.getHttpServer())
        .get(`/marketplace/variants/${variantId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(variantId);
          expect(res.body).toHaveProperty('product');
        });
    });

    it('should update variant as owner', () => {
      return request(app.getHttpServer())
        .patch(`/marketplace/variants/${variantId}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          priceAdjustment: 200,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.priceAdjustment).toBe(200);
        });
    });

    it('should delete variant as owner', () => {
      return request(app.getHttpServer())
        .delete(`/marketplace/variants/${variantId}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);
    });
  });

  // ==================== ORDERS ====================

  describe('Orders Management', () => {
    it('should create an order as client', () => {
      return request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [
            {
              productId: productId,
              quantity: 1,
            },
          ],
          shippingAddress: {
            street: '123 Test Street',
            city: 'Luxembourg',
            postalCode: 'L-1234',
            country: 'Luxembourg',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('items');
          expect(res.body.items.length).toBe(1);
          expect(res.body.status).toBe('PENDING');
          orderId = res.body.id;
        });
    });

    it('should fail to create order without auth', () => {
      return request(app.getHttpServer())
        .post('/marketplace/orders')
        .send({
          items: [{ productId: productId, quantity: 1 }],
        })
        .expect(401);
    });

    it('should get user orders', () => {
      return request(app.getHttpServer())
        .get('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should update order status', () => {
      return request(app.getHttpServer())
        .patch(`/marketplace/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          status: 'CONFIRMED',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('CONFIRMED');
        });
    });
  });

  // ==================== FAVORITES ====================

  describe('Favorites Management', () => {
    it('should add product to favorites', () => {
      return request(app.getHttpServer())
        .post(`/marketplace/favorites/products/${productId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.productId).toBe(productId);
          expect(res.body).toHaveProperty('product');
          favoriteId = res.body.id;
        });
    });

    it('should fail to add duplicate favorite', () => {
      return request(app.getHttpServer())
        .post(`/marketplace/favorites/products/${productId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(409);
    });

    it('should add artisan to favorites', () => {
      return request(app.getHttpServer())
        .post(`/marketplace/favorites/artisans/${artisanId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.artisanId).toBe(artisanId);
          expect(res.body).toHaveProperty('artisan');
        });
    });

    it('should get all user favorites', () => {
      return request(app.getHttpServer())
        .get('/marketplace/favorites')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('products');
          expect(res.body).toHaveProperty('artisans');
          expect(res.body).toHaveProperty('total');
          expect(res.body.total).toBeGreaterThanOrEqual(2);
        });
    });

    it('should get favorite products only', () => {
      return request(app.getHttpServer())
        .get('/marketplace/favorites/products')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should get favorite artisans only', () => {
      return request(app.getHttpServer())
        .get('/marketplace/favorites/artisans')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should get favorites statistics', () => {
      return request(app.getHttpServer())
        .get('/marketplace/favorites/stats')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('products');
          expect(res.body).toHaveProperty('artisans');
        });
    });

    it('should check if product is favorite', () => {
      return request(app.getHttpServer())
        .get(`/marketplace/favorites/check/product/${productId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isFavorite).toBe(true);
        });
    });

    it('should check if artisan is favorite', () => {
      return request(app.getHttpServer())
        .get(`/marketplace/favorites/check/artisan/${artisanId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.isFavorite).toBe(true);
        });
    });

    it('should remove favorite', () => {
      return request(app.getHttpServer())
        .delete(`/marketplace/favorites/${favoriteId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
        });
    });

    it('should fail to remove non-existent favorite', () => {
      return request(app.getHttpServer())
        .delete('/marketplace/favorites/non-existent-id')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(404);
    });
  });

  // ==================== REQUESTS / QUOTES ====================

  describe('Requests Management', () => {
    it('should create a request as client', () => {
      return request(app.getHttpServer())
        .post('/marketplace/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          title: 'Rénovation cuisine complète',
          description: 'Je souhaite rénover ma cuisine de 15m²',
          category: 'renovation',
          address: '10 Rue de Test',
          city: 'Luxembourg',
          postalCode: 'L-1234',
          estimatedBudget: 5000,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Rénovation cuisine complète');
          expect(res.body.status).toBe('PENDING');
          requestId = res.body.id;
        });
    });

    it('should fail to create request without auth', () => {
      return request(app.getHttpServer())
        .post('/marketplace/requests')
        .send({
          title: 'Test',
          description: 'Test',
          category: 'test',
        })
        .expect(401);
    });

    it('should get all requests with filters', () => {
      return request(app.getHttpServer())
        .get('/marketplace/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({ status: 'PENDING' })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get user\'s own requests', () => {
      return request(app.getHttpServer())
        .get('/marketplace/requests/my')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should get request by ID', () => {
      return request(app.getHttpServer())
        .get(`/marketplace/requests/${requestId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(requestId);
          expect(res.body.title).toBe('Rénovation cuisine complète');
        });
    });

    it('should get request statistics', () => {
      return request(app.getHttpServer())
        .get('/marketplace/requests/stats')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('byStatus');
        });
    });

    it('should update request as owner', () => {
      return request(app.getHttpServer())
        .patch(`/marketplace/requests/${requestId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          estimatedBudget: 6000,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.estimatedBudget).toBe(6000);
        });
    });

    it('should assign artisan to request', () => {
      return request(app.getHttpServer())
        .post(`/marketplace/requests/${requestId}/assign/${artisanId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.artisanId).toBe(artisanId);
        });
    });

    it('should delete request as owner', () => {
      return request(app.getHttpServer())
        .delete(`/marketplace/requests/${requestId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
    });
  });

  // ==================== CATEGORIES ====================

  describe('Categories', () => {
    it('should get all categories', () => {
      return request(app.getHttpServer())
        .get('/marketplace/categories')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  // ==================== EDGE CASES & ERROR HANDLING ====================

  describe('Edge Cases & Error Handling', () => {
    it('should handle invalid product ID', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products/invalid-id-format')
        .expect(404);
    });

    it('should validate product creation data', () => {
      return request(app.getHttpServer())
        .post('/marketplace/products')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Test',
          // Missing required fields
        })
        .expect(400);
    });

    it('should handle negative price filter', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ minPrice: -100, maxPrice: 1000 })
        .expect(200);
    });

    it('should handle large page numbers gracefully', () => {
      return request(app.getHttpServer())
        .get('/marketplace/products')
        .query({ page: 999999, limit: 12 })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toEqual([]);
        });
    });

    it('should prevent unauthorized product modification', () => {
      return request(app.getHttpServer())
        .patch(`/marketplace/products/${productId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ price: 1 })
        .expect(403);
    });
  });
});
