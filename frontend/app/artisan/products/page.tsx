'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  marketplaceApi,
  Product,
  ProductStatus,
  Category,
  ProductVariant,
} from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Loader2,
  Plus,
  Package,
  ShoppingBag,
  RotateCcw,
  BarChart3,
  Star,
  Layers,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
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
  const [variantsFor, setVariantsFor] = useState<Product | null>(null);

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
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground mb-1">{t('artisan', 'myShop') || 'Ma boutique'}</h1>
            <p className="text-muted-foreground">{t('artisan', 'manageProducts') || 'Gérez vos produits, commandes et ventes'}</p>
          </div>
          {tab === 'products' && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => router.push('/artisan/products/shipping')}>
                <Truck className="h-4 w-4 mr-1" />
                Livraison
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('artisan', 'addProduct') || 'Ajouter un produit'}
              </Button>
            </div>
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
              <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
                <div className="text-sm text-muted-foreground">{t('artisan', 'totalProducts') || 'Total produits'}</div>
                <div className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">{products.length}</div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
                <div className="text-sm text-muted-foreground">{t('artisan', 'active') || 'Actifs'}</div>
                <div className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
                  {products.filter((p) => p.status === 'ACTIVE').length}
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
                <div className="text-sm text-muted-foreground">{t('artisan', 'outOfStock') || 'Rupture'}</div>
                <div className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">{products.filter((p) => p.stock === 0).length}</div>
              </div>
              <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
                <div className="text-sm text-muted-foreground">{t('artisan', 'stockValue') || 'Valeur du stock'}</div>
                <div className="mt-1 font-display text-2xl font-extrabold tracking-tight text-success">{(Number(stockValue) || 0).toFixed(0)}€</div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {t('common', 'loading') || 'Chargement…'}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl shadow-sm p-10 text-center">
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
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-40 bg-muted">
                      <img
                        src={product.images[0] || 'https://via.placeholder.com/150?text=Produit'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {t('productStatus', product.status) || product.status}
                        </Badge>
                        {product.stock === 0 && (
                          <Badge variant="error">{t('artisan', 'outOfStockStatus') || 'Rupture'}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display font-bold text-base text-foreground leading-snug">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{categoryName(product)}</p>

                      <p className="text-sm text-foreground mt-3 line-clamp-2">{product.description}</p>

                      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">{t('artisan', 'price') || 'Prix'}</span>
                          <p className="font-display font-bold text-foreground">{(Number(product.price) || 0).toFixed(2)}€</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">{t('artisan', 'stock') || 'Stock'}</span>
                          <p className="font-display font-bold text-foreground">{product.stock}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">{t('artisan', 'value') || 'Valeur'}</span>
                          <p className="font-display font-bold text-foreground">
                            {((Number(product.price) || 0) * (product.stock || 0)).toFixed(0)}€
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
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
                        <Button variant="outline" size="sm" onClick={() => setVariantsFor(product)}>
                          <Layers className="h-4 w-4 mr-1" />
                          {t('artisan', 'variants') || 'Variantes'}
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
      {variantsFor && <VariantsModal product={variantsFor} onClose={() => setVariantsFor(null)} />}
    </div>
  );
}

// ==================== VARIANTES PRODUIT ====================

interface VariantsModalProps {
  product: Product;
  onClose: () => void;
}

/**
 * Gestion des variantes (déclinaisons) d'un produit par le vendeur : liste, création, édition
 * (nom / ajustement de prix / stock) et suppression. Le prix effectif d'une variante = prix du
 * produit + priceAdjustment (négatif = remise). Le SKU n'existe pas au niveau variante (schéma).
 */
function VariantsModal({ product, onClose }: VariantsModalProps) {
  const { t } = useLanguage();
  const basePrice = Number(product.price) || 0;

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Formulaire de création
  const [newName, setNewName] = useState('');
  const [newAdj, setNewAdj] = useState('0');
  const [newStock, setNewStock] = useState('0');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setVariants(await marketplaceApi.getVariants(product.id));
    } catch (e) {
      setError(t('artisan', 'variantsLoadError') || 'Impossible de charger les variantes.');
    } finally {
      setLoading(false);
    }
  };

  const effectivePrice = (adj: number) => Math.max(0, basePrice + (Number(adj) || 0));

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError(t('artisan', 'variantNameRequired') || 'Le nom de la variante est requis.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await marketplaceApi.createVariant(product.id, {
        name: newName.trim(),
        priceAdjustment: Number(newAdj) || 0,
        stock: Math.max(0, Math.trunc(Number(newStock) || 0)),
      });
      setVariants((prev) => [...prev, created]);
      setNewName('');
      setNewAdj('0');
      setNewStock('0');
    } catch (e: any) {
      setError(
        e?.response?.data?.message?.toString() ||
          (t('artisan', 'variantSaveError') || "Échec de l'enregistrement de la variante."),
      );
    } finally {
      setCreating(false);
    }
  };

  const patchLocal = (id: string, patch: Partial<ProductVariant>) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const handleSave = async (v: ProductVariant) => {
    if (!v.name.trim()) {
      setError(t('artisan', 'variantNameRequired') || 'Le nom de la variante est requis.');
      return;
    }
    setSavingId(v.id);
    setError(null);
    try {
      const saved = await marketplaceApi.updateVariant(v.id, {
        name: v.name.trim(),
        priceAdjustment: Number(v.priceAdjustment) || 0,
        stock: Math.max(0, Math.trunc(Number(v.stock) || 0)),
      });
      patchLocal(v.id, saved);
    } catch (e: any) {
      setError(
        e?.response?.data?.message?.toString() ||
          (t('artisan', 'variantSaveError') || "Échec de l'enregistrement de la variante."),
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (v: ProductVariant) => {
    if (!confirm(t('artisan', 'variantDeleteConfirm') || 'Supprimer cette variante ?')) return;
    setSavingId(v.id);
    setError(null);
    try {
      await marketplaceApi.deleteVariant(v.id);
      setVariants((prev) => prev.filter((x) => x.id !== v.id));
    } catch (e: any) {
      setError(
        e?.response?.data?.message?.toString() ||
          (t('artisan', 'variantDeleteError') || 'Échec de la suppression de la variante.'),
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t('artisan', 'variants') || 'Variantes'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {product.name} · {t('artisan', 'basePrice') || 'Prix de base'} {basePrice.toFixed(2)}€
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={t('common', 'close') || 'Fermer'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t('common', 'loading') || 'Chargement…'}
            </div>
          ) : (
            <>
              {/* Liste des variantes existantes */}
              {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('artisan', 'noVariants') ||
                    "Aucune variante. Ajoutez des déclinaisons (couleur, taille…) ci-dessous."}
                </p>
              ) : (
                <div className="space-y-3">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-border p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                    >
                      <div className="sm:col-span-4">
                        <Label>{t('artisan', 'variantName') || 'Nom'}</Label>
                        <Input
                          value={v.name}
                          onChange={(e) => patchLocal(v.id, { name: e.target.value })}
                          placeholder="Ex : Blanc chaud"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Label>{t('artisan', 'priceAdjustment') || 'Ajust. prix (€)'}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={String(v.priceAdjustment)}
                          onChange={(e) =>
                            patchLocal(v.id, { priceAdjustment: Number(e.target.value) })
                          }
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t('artisan', 'effectivePrice') || 'Prix'}:{' '}
                          {effectivePrice(v.priceAdjustment).toFixed(2)}€
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>{t('artisan', 'stock') || 'Stock'}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={String(v.stock)}
                          onChange={(e) => patchLocal(v.id, { stock: Number(e.target.value) })}
                        />
                      </div>
                      <div className="sm:col-span-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(v)}
                          disabled={savingId === v.id}
                        >
                          {savingId === v.id && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          {t('common', 'save') || 'Enregistrer'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(v)}
                          disabled={savingId === v.id}
                          className="text-destructive hover:text-destructive"
                          aria-label={t('common', 'delete') || 'Supprimer'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Ajout d'une variante */}
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="mb-2 text-sm font-medium text-foreground">
                  {t('artisan', 'addVariant') || 'Ajouter une variante'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4">
                    <Label htmlFor="nv-name">{t('artisan', 'variantName') || 'Nom'}</Label>
                    <Input
                      id="nv-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex : Blanc chaud"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label htmlFor="nv-adj">{t('artisan', 'priceAdjustment') || 'Ajust. prix (€)'}</Label>
                    <Input
                      id="nv-adj"
                      type="number"
                      step="0.01"
                      value={newAdj}
                      onChange={(e) => setNewAdj(e.target.value)}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t('artisan', 'effectivePrice') || 'Prix'}: {effectivePrice(Number(newAdj) || 0).toFixed(2)}€
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="nv-stock">{t('artisan', 'stock') || 'Stock'}</Label>
                    <Input
                      id="nv-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button onClick={handleCreate} disabled={creating} className="w-full">
                      {creating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      {t('artisan', 'add') || 'Ajouter'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end px-6 py-4 border-t border-border bg-card">
          <Button variant="outline" onClick={onClose}>
            {t('common', 'close') || 'Fermer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
