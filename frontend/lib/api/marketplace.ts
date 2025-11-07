import apiClient from './client';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  variants?: ProductVariant[];
  artisanId: string;
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

export const marketplaceApi = {
  // Products
  getProducts: async (filters?: {
    category?: string;
    search?: string;
    artisanId?: string;
  }) => {
    const response = await apiClient.get('/marketplace/products', { params: filters });
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
