'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marketplaceApi, Product, ProductStatus, Category } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, Package, ShoppingBag, RotateCcw, BarChart3, Star } from 'lucide-react';
import ProductForm from './ProductForm';
import ProductReviewsModal from './ProductReviewsModal';
import SellerOrders from './SellerOrders';
import SellerReturns from './SellerReturns';
import SellerStats from './SellerStats';

type Tab = 'products' | 'orders' | 'returns' | 'sales';

export default function ArtisanShopPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [reviewsFor, setReviewsFor] = useState<Product | null>(null);

  useEffect(() => {
    if (user?.id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        marketplaceApi.getMyProducts(user!.id),
        marketplaceApi.getCategories().catch(() => [] as Category[]),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (e) {
      console.error('Erreur chargement boutique', e);
    } finally {
      setLoading(false);
    }
  };

  const categoryName = (p: Product): string => {
    const id = p.categoryId || p.category;
    const found = categories.find((c) => c.id === id || c.slug === id);
    return found?.name || '';
  };

  const handleToggleActive = async (product: Product) => {
    const newStatus: ProductStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await marketplaceApi.updateProduct(product.id, { status: newStatus });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));
    } catch (e) {
      console.error('Erreur changement statut', e);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(t('artisan', 'deleteProductConfirm') || 'Supprimer ce produit ?')) return;
    try {
      await marketplaceApi.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (e) {
      console.error('Erreur suppression', e);
    }
  };

  const handleSaved = (saved: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  };

  const stockValue = products.reduce((sum, p) => sum + (Number(p.price) || 0) * (p.stock || 0), 0);

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'products', label: t('artisan', 'myProducts') || 'Mes produits', icon: Package },
    { key: 'orders', label: t('artisan', 'salesOrders') || 'Commandes', icon: ShoppingBag },
    { key: 'returns', label: t('artisan', 'returns') || 'Retours', icon: RotateCcw },
    { key: 'sales', label: t('artisan', 'salesDashboard') || 'Ventes', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">{t('artisan', 'myShop') || 'Ma boutique'}</h1>
            <p className="text-muted-foreground">{t('artisan', 'manageProducts') || 'Gérez vos produits, commandes et ventes'}</p>
          </div>
          {tab === 'products' && (
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('artisan', 'addProduct') || 'Ajouter un produit'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tb) => {
              const Icon = tb.icon;
              return (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                    tab === tb.key
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tb.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {tab === 'products' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">{t('artisan', 'totalProducts') || 'Total produits'}</div>
                  <div className="text-2xl font-bold text-foreground">{products.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">{t('artisan', 'active') || 'Actifs'}</div>
                  <div className="text-2xl font-bold text-foreground">
                    {products.filter((p) => p.status === 'ACTIVE').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">{t('artisan', 'outOfStock') || 'Rupture'}</div>
                  <div className="text-2xl font-bold text-foreground">{products.filter((p) => p.stock === 0).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">{t('artisan', 'stockValue') || 'Valeur du stock'}</div>
                  <div className="text-2xl font-bold text-primary">{(Number(stockValue) || 0).toFixed(0)}€</div>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {t('common', 'loading') || 'Chargement…'}
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">{t('artisan', 'noProducts') || 'Vous n’avez pas encore de produit.'}</p>
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setShowForm(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('artisan', 'addFirstProduct') || 'Ajouter un premier produit'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <img
                          src={product.images[0] || 'https://via.placeholder.com/150?text=Produit'}
                          alt={product.name}
                          className="w-full sm:w-32 h-32 object-cover rounded-lg border border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2 gap-2 flex-wrap">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">{categoryName(product)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
                                {t('productStatus', product.status) || product.status}
                              </Badge>
                              {product.stock === 0 && (
                                <Badge variant="error">{t('artisan', 'outOfStockStatus') || 'Rupture'}</Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-foreground mb-3 line-clamp-2">{product.description}</p>

                          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'price') || 'Prix'}</span>
                              <p className="font-semibold text-lg">{(Number(product.price) || 0).toFixed(2)}€</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'stock') || 'Stock'}</span>
                              <p className="font-semibold text-lg">{product.stock}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('artisan', 'value') || 'Valeur'}</span>
                              <p className="font-semibold text-lg">
                                {((Number(product.price) || 0) * (product.stock || 0)).toFixed(0)}€
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/client/marketplace/${product.id}`)}>
                              {t('artisan', 'view') || 'Voir'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditing(product);
                                setShowForm(true);
                              }}
                            >
                              {t('common', 'edit') || 'Modifier'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setReviewsFor(product)}>
                              <Star className="h-4 w-4 mr-1" />
                              {t('artisan', 'reviews') || 'Avis'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleToggleActive(product)}>
                              {product.status === 'ACTIVE' ? t('artisan', 'deactivate') || 'Désactiver' : t('artisan', 'activate') || 'Activer'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(product)} className="text-destructive hover:text-destructive">
                              {t('common', 'delete') || 'Supprimer'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'orders' && user?.id && <SellerOrders myUserId={user.id} />}
        {tab === 'returns' && <SellerReturns />}
        {tab === 'sales' && user?.id && <SellerStats myUserId={user.id} />}
      </div>

      {/* Modals */}
      {showForm && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
      {reviewsFor && <ProductReviewsModal product={reviewsFor} onClose={() => setReviewsFor(null)} />}
    </div>
  );
}
