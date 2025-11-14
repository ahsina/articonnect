import apiClient from './client';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SOLD_OUT';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  status: ProductStatus;
  variants?: ProductVariant[];
  artisanId: string;
  artisan?: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    city: string;
  };
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  price: number;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  variants?: Omit<ProductVariant, 'id'>[];
}

export interface Order {
  id: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
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

export const marketplaceApi = {
  // Products
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
    return response.data;
  },

  getProductById: async (id: string) => {
    const response = await apiClient.get(`/marketplace/products/${id}`);
    return response.data;
  },

  createProduct: async (data: CreateProductDto) => {
    const response = await apiClient.post('/marketplace/products', data);
    return response.data;
  },

  updateProduct: async (id: string, data: Partial<CreateProductDto>) => {
    const response = await apiClient.patch(`/marketplace/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string) => {
    await apiClient.delete(`/marketplace/products/${id}`);
  },

  // Orders
  getOrders: async () => {
    const response = await apiClient.get('/marketplace/orders');
    return response.data;
  },

  getOrderById: async (id: string) => {
    const response = await apiClient.get(`/marketplace/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: {
    items: { productId: string; quantity: number; variantId?: string }[];
  }) => {
    const response = await apiClient.post('/marketplace/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/marketplace/orders/${id}/status`, { status });
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await apiClient.get('/marketplace/categories');
    return response.data;
  },
};
