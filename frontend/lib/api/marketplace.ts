import apiClient from './client';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  vatRate?: number;
  category?: string;
  categoryId?: string;
  images: string[]; // normalisé côté client à partir de `photos` (champ Prisma backend)
  photos?: string[];
  stock: number;
  sku?: string | null;
  status: ProductStatus;
  variants?: ProductVariant[];
  artisanId: string;
  artisan?: {
    id?: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    city?: string;
    artisanProfile?: {
      companyName?: string;
      rating?: string | number;
    };
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ProductVariant {
  id: string;
  productId?: string;
  name: string;
  // Ajustement de prix par rapport au prix produit (peut être négatif = remise). Prisma Decimal
  // sérialisé en string -> normalisé en nombre côté client.
  priceAdjustment: number;
  stock: number;
  createdAt?: string;
}

// NB : le modèle ProductVariant (schéma gelé) ne porte que name / priceAdjustment / stock.
// Aucun champ SKU au niveau variante (le SKU reste porté par le produit).
export interface CreateVariantDto {
  name: string;
  priceAdjustment: number;
  stock: number;
}

export type UpdateVariantDto = Partial<CreateVariantDto>;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  active?: boolean;
  children?: Category[];
  _count?: { products: number };
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  vatRate?: number;
  category: string; // slug OU id (les deux acceptés par le backend)
  images?: string[];
  stock: number;
  sku?: string;
  status?: ProductStatus;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: ProductStatus;
}

// ==================== ORDERS ====================

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice?: number | string;
  totalPrice?: number | string;
  price?: number; // rétro-compat
  product?: Product;
}

export interface Order {
  id: string;
  clientId?: string;
  status: string;
  subtotal?: number | string;
  vat?: number | string;
  shippingCost?: number | string;
  total?: number | string;
  totalAmount?: number; // rétro-compat
  shippingAddress?: string;
  trackingNumber?: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  client?: { id: string; firstName: string; lastName: string };
}

// ==================== REVIEWS ====================

export interface ProductReview {
  id: string;
  productId: string;
  rating: number;
  comment?: string | null;
  sellerReply?: string | null;
  sellerReplyAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
}

// ==================== SELLER STATS ====================

export interface SellerTopProduct {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface SellerStats {
  revenue: number; // Chiffre d'affaires produits (net des remboursements)
  orderCount: number; // Nombre de commandes contenant au moins un produit du vendeur
  productCount: number; // Nombre de produits en catalogue
  activeProducts: number;
  outOfStock: number;
  pendingShipments: number; // Commandes payées non encore expédiées
  topProducts: SellerTopProduct[];
}

// ==================== SHIPPING POLICY ====================

/**
 * Politique de livraison d'un vendeur (une seule par vendeur, clé = artisanId côté backend).
 *  - `freeShipping` : livraison toujours offerte sur les produits du vendeur.
 *  - `flatRate` : forfait de port appliqué (ignoré si `freeShipping`).
 *  - `freeThreshold` : franco de port — port offert dès que le panier dépasse ce montant (null = aucun).
 * Les montants sont des Prisma Decimal sérialisés en string -> normalisés en nombre côté client.
 */
export interface ShippingPolicy {
  freeShipping: boolean;
  flatRate: number;
  freeThreshold: number | null;
}

export interface UpdateShippingPolicyDto {
  freeShipping: boolean;
  flatRate: number;
  freeThreshold?: number | null;
}

// ==================== RETURNS ====================

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURN_SHIPPED'
  | 'RECEIVED'
  | 'INSPECTING'
  | 'REFUNDED'
  | 'COMPLETED';

export interface ReturnItem {
  id: string;
  orderItemId?: string;
  productId: string;
  quantity: number;
  reason?: string;
  reasonDetails?: string | null;
  refundAmount?: number | string;
  product?: { id: string; name: string; photos?: string[] };
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  clientId: string;
  status: ReturnStatus;
  reason?: string | null;
  description?: string | null;
  totalRefundAmount?: number | string | null;
  trackingNumber?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: ReturnItem[];
  order?: { id: string; createdAt: string; total: number | string };
  client?: { id: string; firstName: string; lastName: string; email?: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const num = (v: unknown): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

/**
 * Normalise un produit renvoyé par le backend pour l'UI :
 *  - `images` (toujours un tableau) dérivé du champ Prisma `photos`
 *  - `price` / `vatRate` convertis en nombre (Prisma Decimal est sérialisé en string)
 */
function normalizeProduct<T extends { images?: string[]; photos?: string[]; price?: unknown; vatRate?: unknown }>(
  p: T,
): T {
  if (!p) return p;
  const images = (p.images && p.images.length ? p.images : p.photos) || [];
  return {
    ...p,
    images,
    price: p.price !== undefined && p.price !== null ? Number(p.price) : p.price,
    vatRate: p.vatRate !== undefined && p.vatRate !== null ? Number(p.vatRate) : p.vatRate,
  };
}

// Conservé pour rétro-compatibilité (import éventuel ailleurs).
const normalizeProductImages = normalizeProduct;
export { normalizeProductImages };

export const marketplaceApi = {
  // ==================== PRODUCTS ====================
  getProducts: async (filters?: {
    category?: string;
    search?: string;
    artisanId?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get<PaginatedResponse<Product>>('/marketplace/products', { params: filters });
    return { ...response.data, data: (response.data.data || []).map(normalizeProduct) };
  },

  getProductById: async (id: string) => {
    const response = await apiClient.get(`/marketplace/products/${id}`);
    return normalizeProduct(response.data);
  },

  /**
   * Produits DU VENDEUR connecté uniquement.
   * Utilise l'endpoint dédié `/marketplace/products/mine` (ajouté côté backend).
   * Repli robuste : si l'endpoint n'est pas (encore) disponible, on filtre le catalogue
   * public par `artisanId` afin de garantir un affichage correct dans tous les cas.
   */
  getMyProducts: async (fallbackArtisanId?: string): Promise<Product[]> => {
    try {
      const response = await apiClient.get('/marketplace/products/mine');
      const raw = Array.isArray(response.data) ? response.data : response.data?.data || [];
      return raw.map(normalizeProduct);
    } catch (err) {
      if (!fallbackArtisanId) throw err;
      const response = await apiClient.get<PaginatedResponse<Product>>('/marketplace/products', {
        params: { artisanId: fallbackArtisanId, limit: 200 },
      });
      return (response.data.data || []).map(normalizeProduct);
    }
  },

  createProduct: async (data: CreateProductDto) => {
    const response = await apiClient.post('/marketplace/products', data);
    return normalizeProduct(response.data);
  },

  updateProduct: async (id: string, data: UpdateProductDto) => {
    const response = await apiClient.patch(`/marketplace/products/${id}`, data);
    return normalizeProduct(response.data);
  },

  deleteProduct: async (id: string) => {
    await apiClient.delete(`/marketplace/products/${id}`);
  },

  // Upload d'une photo produit (multipart -> S3/MinIO). Renvoie l'URL publique.
  uploadPhoto: async (file: File): Promise<{ url: string }> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileType', 'product-photo');
    const response = await apiClient.post('/upload/file', fd);
    return response.data;
  },

  // ==================== CATEGORIES ====================
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/marketplace/categories');
    return response.data;
  },

  // ==================== ORDERS ====================
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/marketplace/orders');
    return response.data;
  },

  /**
   * Commandes contenant au moins un produit du VENDEUR connecté (route dédiée backend,
   * inclut le client et les items). Repli : filtre `/marketplace/orders` par produit vendeur.
   */
  getSellerOrders: async (myUserId: string): Promise<Order[]> => {
    try {
      const response = await apiClient.get('/marketplace/seller/orders');
      const raw = Array.isArray(response.data) ? response.data : response.data?.data || [];
      return raw as Order[];
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const all = await marketplaceApi.getOrders();
        return all.filter((o) => (o.items || []).some((it) => it.product?.artisanId === myUserId));
      }
      throw err;
    }
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/marketplace/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: {
    items: { productId: string; quantity: number; variantId?: string }[];
    shippingAddress: string;
  }) => {
    const response = await apiClient.post('/marketplace/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/marketplace/orders/${id}/status`, { status });
    return response.data;
  },

  /**
   * Paiement d'une commande produit (checkout client).
   * Route backend : POST `/marketplace/orders/:id/pay` (même pattern que l'escrow mission).
   * Renvoie un `clientSecret` Stripe à confirmer côté client via Stripe.js.
   * Cas idempotent : si la commande est déjà payée, le backend renvoie `{ alreadyPaid: true, ... }`
   * SANS clientSecret — l'appelant doit alors simplement rediriger vers la commande.
   * NB : la réponse backend peut contenir des champs internes (répartition/commission plateforme) ;
   * ne JAMAIS les exposer au client (anti-désintermédiation) — seul `clientSecret` est utilisé.
   */
  payOrder: async (
    id: string,
  ): Promise<{
    clientSecret?: string;
    orderId: string;
    amount?: number;
    status?: string;
    alreadyPaid?: boolean;
  }> => {
    const response = await apiClient.post(`/marketplace/orders/${id}/pay`);
    const d = response.data || {};
    // On ne relaie QUE les champs sûrs (pas de commission/répartition vendeur).
    return {
      clientSecret: d.clientSecret,
      orderId: d.orderId ?? id,
      amount: d.amount,
      status: d.status,
      alreadyPaid: d.alreadyPaid,
    };
  },

  /**
   * Annulation d'une commande PAR LE CLIENT.
   * Route backend dédiée : POST `/marketplace/orders/:id/cancel` (renvoie la commande annulée).
   * (L'endpoint `/status` est réservé au vendeur — @Roles('ARTISAN') — d'où le 403 côté client.)
   */
  cancelOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post(`/marketplace/orders/${id}/cancel`);
    return response.data;
  },

  /**
   * Expédie une commande : pose le numéro de suivi et passe le statut à SHIPPED.
   * Route dédiée `/marketplace/orders/:id/ship` (ajoutée côté backend, expédition).
   * Repli : si l'endpoint n'existe pas encore, on avance au moins le statut à SHIPPED
   * via `/status` (le numéro de suivi sera posable une fois le back déployé).
   */
  shipOrder: async (id: string, trackingNumber: string): Promise<Order> => {
    try {
      const response = await apiClient.post(`/marketplace/orders/${id}/ship`, { trackingNumber });
      return response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response = await apiClient.patch(`/marketplace/orders/${id}/status`, { status: 'SHIPPED' });
        return response.data;
      }
      throw err;
    }
  },

  // ==================== SELLER STATS ====================
  /**
   * Statistiques de ventes du vendeur.
   * Essaie l'endpoint dédié `/marketplace/seller/stats`. Complète / remplace par un calcul
   * local fiable à partir des commandes réelles (filtrées sur les produits du vendeur) afin
   * de toujours afficher des chiffres corrects, même si l'endpoint n'est pas encore déployé.
   */
  getSellerStats: async (myUserId: string): Promise<SellerStats> => {
    const local = await computeSellerStatsLocal(myUserId);
    try {
      const { data } = await apiClient.get('/marketplace/seller/stats');
      if (data && typeof data === 'object') {
        const revenue = num(data.revenue ?? data.totalRevenue ?? data.salesTotal);
        const orderCount = num(data.orderCount ?? data.totalOrders ?? data.ordersCount);
        const topProducts = Array.isArray(data.topProducts)
          ? data.topProducts.map((tp: any) => ({
              productId: tp.productId ?? tp.id,
              name: tp.name ?? tp.productName ?? '',
              unitsSold: Number(tp.unitsSold ?? tp.quantity ?? tp.units ?? 0),
              revenue: Number(tp.revenue ?? tp.total ?? 0),
            }))
          : undefined;
        return {
          ...local,
          revenue: revenue !== undefined ? revenue : local.revenue,
          orderCount: orderCount !== undefined ? orderCount : local.orderCount,
          pendingShipments: num(data.pendingShipments) ?? local.pendingShipments,
          topProducts: topProducts && topProducts.length ? topProducts : local.topProducts,
        };
      }
    } catch {
      // endpoint indisponible -> on garde le calcul local
    }
    return local;
  },

  // ==================== PRODUCT REVIEWS ====================
  getProductReviews: async (productId: string): Promise<ProductReview[]> => {
    const response = await apiClient.get(`/marketplace/products/${productId}/reviews`);
    return response.data;
  },

  /**
   * Réponse publique du vendeur à un avis produit.
   * Route backend : POST `/marketplace/products/:productId/reviews/:reviewId/reply` (body `{ reply }`).
   */
  replyToReview: async (productId: string, reviewId: string, reply: string): Promise<ProductReview> => {
    const response = await apiClient.post(
      `/marketplace/products/${productId}/reviews/${reviewId}/reply`,
      { reply },
    );
    return response.data;
  },

  // ==================== PRODUCT VARIANTS ====================
  /**
   * Variantes d'un produit (déclinaisons : couleur, taille…). Chaque variante ajuste le prix
   * (`priceAdjustment`, négatif possible) et porte son propre stock. Routes backend :
   *  GET    /marketplace/products/:id/variants
   *  POST   /marketplace/products/:id/variants
   *  PATCH  /marketplace/variants/:variantId
   *  DELETE /marketplace/variants/:variantId
   */
  getVariants: async (productId: string): Promise<ProductVariant[]> => {
    const response = await apiClient.get(`/marketplace/products/${productId}/variants`);
    const raw = Array.isArray(response.data) ? response.data : response.data?.data || [];
    return raw.map(normalizeVariant);
  },

  createVariant: async (productId: string, data: CreateVariantDto): Promise<ProductVariant> => {
    const response = await apiClient.post(`/marketplace/products/${productId}/variants`, data);
    return normalizeVariant(response.data);
  },

  updateVariant: async (variantId: string, data: UpdateVariantDto): Promise<ProductVariant> => {
    const response = await apiClient.patch(`/marketplace/variants/${variantId}`, data);
    return normalizeVariant(response.data);
  },

  deleteVariant: async (variantId: string): Promise<void> => {
    await apiClient.delete(`/marketplace/variants/${variantId}`);
  },

  // ==================== SHIPPING POLICY ====================
  /**
   * Politique de livraison du VENDEUR connecté.
   * Route backend : GET /marketplace/shipping-policy -> { freeShipping, flatRate, freeThreshold }.
   * Si aucune politique n'est encore définie (ou endpoint pas encore déployé -> 404), on renvoie
   * des valeurs par défaut sûres afin que le formulaire s'affiche toujours correctement.
   */
  getShippingPolicy: async (): Promise<ShippingPolicy> => {
    try {
      const { data } = await apiClient.get('/marketplace/shipping-policy');
      return normalizeShippingPolicy(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { freeShipping: false, flatRate: 5.99, freeThreshold: null };
      }
      throw err;
    }
  },

  /**
   * Enregistre (upsert) la politique de livraison du vendeur connecté.
   * Route backend : PUT /marketplace/shipping-policy -> renvoie la politique enregistrée.
   */
  updateShippingPolicy: async (data: UpdateShippingPolicyDto): Promise<ShippingPolicy> => {
    const { data: saved } = await apiClient.put('/marketplace/shipping-policy', {
      freeShipping: data.freeShipping,
      flatRate: data.flatRate,
      freeThreshold: data.freeThreshold ?? null,
    });
    return normalizeShippingPolicy(saved);
  },
};

/**
 * Normalise une politique de livraison backend pour l'UI : `flatRate`/`freeThreshold`
 * (Prisma Decimal -> string) convertis en nombre ; `freeThreshold` absent/null -> null.
 */
function normalizeShippingPolicy(p: any): ShippingPolicy {
  return {
    freeShipping: Boolean(p?.freeShipping),
    flatRate: p?.flatRate !== undefined && p?.flatRate !== null ? Number(p.flatRate) : 5.99,
    freeThreshold:
      p?.freeThreshold !== undefined && p?.freeThreshold !== null ? Number(p.freeThreshold) : null,
  };
}

/**
 * Normalise une variante backend pour l'UI : `priceAdjustment` (Prisma Decimal -> string) en nombre.
 */
function normalizeVariant(v: any): ProductVariant {
  if (!v) return v;
  return {
    ...v,
    priceAdjustment:
      v.priceAdjustment !== undefined && v.priceAdjustment !== null ? Number(v.priceAdjustment) : 0,
    stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : 0,
  };
}

/**
 * Calcule les stats vendeur à partir des commandes réelles.
 * Ne compte que les items dont le produit appartient au vendeur (`product.artisanId`).
 */
async function computeSellerStatsLocal(myUserId: string): Promise<SellerStats> {
  const [orders, products] = await Promise.all([
    marketplaceApi.getOrders().catch(() => [] as Order[]),
    marketplaceApi.getMyProducts(myUserId).catch(() => [] as Product[]),
  ]);

  const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  let revenue = 0;
  let orderCount = 0;
  let pendingShipments = 0;
  const top: Record<string, SellerTopProduct> = {};

  for (const order of orders) {
    const myItems = (order.items || []).filter((it) => it.product?.artisanId === myUserId);
    if (myItems.length === 0) continue;
    orderCount += 1;

    const countsForRevenue = REVENUE_STATUSES.includes(order.status);
    if (order.status === 'PAID' || order.status === 'PROCESSING') pendingShipments += 1;

    for (const it of myItems) {
      const line = Number(it.totalPrice ?? 0) || Number(it.unitPrice ?? 0) * (it.quantity || 0);
      if (countsForRevenue) revenue += line;
      const pid = it.productId;
      if (!top[pid]) {
        top[pid] = { productId: pid, name: it.product?.name || '', unitsSold: 0, revenue: 0 };
      }
      top[pid].unitsSold += it.quantity || 0;
      if (countsForRevenue) top[pid].revenue += line;
    }
  }

  const topProducts = Object.values(top).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return {
    revenue,
    orderCount,
    productCount: products.length,
    activeProducts: products.filter((p) => p.status === 'ACTIVE').length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    pendingShipments,
    topProducts,
  };
}

// ==================== RETURNS API ====================

export const returnsApi = {
  getReturns: async (filters?: { status?: ReturnStatus; page?: number; limit?: number }) => {
    const response = await apiClient.get('/marketplace/returns', { params: filters });
    // Backend renvoie { data, meta }
    return response.data as { data: ReturnRequest[]; meta: { total: number; page: number; limit: number; totalPages: number } };
  },

  getReturn: async (id: string): Promise<ReturnRequest> => {
    const response = await apiClient.get(`/marketplace/returns/${id}`);
    return response.data;
  },

  approveReturn: async (id: string, approvalNotes?: string): Promise<ReturnRequest> => {
    const response = await apiClient.post(`/marketplace/returns/${id}/approve`, approvalNotes ? { approvalNotes } : {});
    return response.data;
  },

  rejectReturn: async (id: string, rejectionReason: string): Promise<ReturnRequest> => {
    const response = await apiClient.post(`/marketplace/returns/${id}/reject`, { rejectionReason });
    return response.data;
  },

  /**
   * Réception du retour : marque tous les items comme reçus (état GOOD, remis en stock).
   * Simplifie l'inspection détaillée par item (couverte par le DTO backend ReceiveReturnDto).
   */
  receiveReturn: async (
    ret: ReturnRequest,
    inspectionNotes?: string,
  ): Promise<ReturnRequest> => {
    const items = (ret.items || []).map((it) => ({
      returnItemId: it.id,
      receivedQuantity: it.quantity,
      condition: 'GOOD' as const,
      restockable: true,
    }));
    const response = await apiClient.post(`/marketplace/returns/${ret.id}/receive`, {
      items,
      ...(inspectionNotes ? { inspectionNotes } : {}),
    });
    return response.data;
  },

  refundReturn: async (
    id: string,
    opts?: { refundAmount?: number; refundNotes?: string; restockItems?: boolean },
  ): Promise<ReturnRequest> => {
    const body: Record<string, unknown> = { refundMethod: 'ORIGINAL_PAYMENT' };
    if (opts?.refundAmount !== undefined) body.refundAmount = opts.refundAmount;
    if (opts?.refundNotes) body.refundNotes = opts.refundNotes;
    if (opts?.restockItems !== undefined) body.restockItems = opts.restockItems;
    const response = await apiClient.post(`/marketplace/returns/${id}/refund`, body);
    return response.data;
  },

  completeReturn: async (id: string): Promise<ReturnRequest> => {
    const response = await apiClient.post(`/marketplace/returns/${id}/complete`, {});
    return response.data;
  },
};
