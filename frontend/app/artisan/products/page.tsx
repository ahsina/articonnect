'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { marketplaceApi, Product, ProductStatus } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ArtisanProductsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const CATEGORIES = [
    { id: 'tools', name: t('marketplace', 'tools') },
    { id: 'materials', name: t('marketplace', 'materials') },
    { id: 'decorations', name: t('marketplace', 'decorations') },
    { id: 'furniture', name: t('marketplace', 'furniture') },
    { id: 'equipment', name: t('marketplace', 'equipment') },
    { id: 'lighting', name: t('marketplace', 'lighting') },
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // Get products for current artisan (artisanId will be determined by auth token)
      const response = await marketplaceApi.getProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const newStatus: ProductStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await marketplaceApi.updateProduct(productId, { status: newStatus });

      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, status: newStatus } : p
        )
      );
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t('artisan', 'deleteProductConfirm'))) return;

    try {
      await marketplaceApi.deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId)?.name || categoryId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('artisan', 'myProducts')}</h1>
            <p className="text-gray-600">
              {t('artisan', 'manageProducts')}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            + {t('artisan', 'addProduct')}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('artisan', 'totalProducts')}</div>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('artisan', 'active')}</div>
              <div className="text-2xl font-bold text-green-600">
                {products.filter((p) => p.status === 'ACTIVE').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('artisan', 'outOfStock')}</div>
              <div className="text-2xl font-bold text-red-600">
                {products.filter((p) => p.stock === 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">{t('artisan', 'stockValue')}</div>
              <div className="text-2xl font-bold text-blue-600">
                {products.reduce((sum, p) => sum + p.price * p.stock, 0).toFixed(0)}€
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <div className="space-y-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-4">📦</div>
                <p className="text-gray-500 mb-4">
                  {t('artisan', 'noProducts')}
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  {t('artisan', 'addFirstProduct')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Product Image */}
                    <img
                      src={product.images[0] || 'https://via.placeholder.com/150?text=Produit'}
                      alt={product.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />

                    {/* Product Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {getCategoryName(product.category)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {product.status === 'ACTIVE' ? (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              {t('artisan', 'activeStatus')}
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-gray-100 text-gray-800">
                              {t('artisan', 'inactiveStatus')}
                            </Badge>
                          )}
                          {product.stock === 0 && (
                            <Badge variant="error" className="bg-red-100 text-red-800">
                              {t('artisan', 'outOfStockStatus')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">{t('artisan', 'price')}:</span>
                          <p className="font-semibold text-lg">{product.price}€</p>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('artisan', 'stock')}:</span>
                          <p className="font-semibold text-lg">{product.stock}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('artisan', 'value')}:</span>
                          <p className="font-semibold text-lg">
                            {(product.price * product.stock).toFixed(0)}€
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/client/marketplace/${product.id}`)}
                        >
                          👁️ {t('artisan', 'view')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          ✏️ {t('common', 'edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(product.id)}
                        >
                          {product.status === 'ACTIVE' ? `⏸️ ${t('artisan', 'deactivate')}` : `▶️ ${t('artisan', 'activate')}`}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          🗑️ {t('common', 'delete')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add/Edit Product Modal Placeholder */}
        {(showAddModal || editingProduct) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <CardTitle>
                  {editingProduct ? t('artisan', 'editProduct') : t('artisan', 'addProduct')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Formulaire d'ajout/modification de produit à implémenter
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                    }}
                  >
                    {t('common', 'cancel')}
                  </Button>
                  <Button>{t('common', 'save')}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
