'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, MapPin, X, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marketplaceApi } from '@/lib/api/marketplace';
import { useCartStore } from '@/lib/stores/cartStore';
import { useLanguage } from '@/contexts/LanguageContext';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  variants?: ProductVariant[];
  specifications?: Record<string, string>;
  artisan: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    city: string;
    avatar?: string;
    rating: number;
  };
  reviews: ProductReview[];
  createdAt: string;
}

interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  price: number;
  stock: number;
}

interface ProductReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  client: {
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// Guarantees array/object fields exist so the page never crashes on a
// partial API response (missing reviews / images / variants / artisan, etc.)
function normalizeProduct(data: any): Product {
  const raw = data || {};
  return {
    ...raw,
    id: raw.id,
    name: raw.name || '',
    description: raw.description || '',
    price: Number(raw.price) || 0,
    category: raw.category || '',
    images: Array.isArray(raw.images) ? raw.images : [],
    stock: Number(raw.stock) || 0,
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    specifications:
      raw.specifications && typeof raw.specifications === 'object'
        ? raw.specifications
        : {},
    artisan: {
      id: raw.artisan?.id || '',
      firstName: raw.artisan?.firstName || '',
      lastName: raw.artisan?.lastName || '',
      companyName: raw.artisan?.companyName || '',
      city: raw.artisan?.city || '',
      avatar: raw.artisan?.avatar,
      rating: Number(raw.artisan?.rating) || 0,
    },
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    createdAt: raw.createdAt || '',
  };
}

export default function ProductDetailsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      tools: t('marketplace', 'tools'),
      materials: t('marketplace', 'materials'),
      decorations: t('marketplace', 'decorations'),
      furniture: t('marketplace', 'furniture'),
      equipment: t('marketplace', 'equipment'),
      lighting: t('marketplace', 'lighting'),
    };
    return categoryMap[category] || category;
  };

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      const data = await marketplaceApi.getProductById(productId);
      setProduct(normalizeProduct(data));
      setLoading(false);
    } catch (error) {
      console.error('Error loading product:', error);
      // Fallback to mock data on error
      loadProductMock();
    }
  };

  // Fallback mock (commented)
  const loadProductMock = () => {
    try {
      const mockProduct: Product = {
        id: productId,
        name: 'Table en chêne massif artisanale',
        description:
          'Magnifique table en chêne massif fabriquée à la main par nos artisans menuisiers. Chaque table est unique et conçue avec soin pour durer des générations. Le bois de chêne provient de forêts gérées durablement.\n\nCaractéristiques:\n• Bois de chêne massif européen\n• Finition huile naturelle\n• Traitement anti-taches et anti-humidité\n• Montage facile\n• Garantie 10 ans\n\nLivraison et installation disponibles sur demande.',
        price: 850.0,
        category: 'furniture',
        images: [
          'https://via.placeholder.com/800x600?text=Table+Vue+1',
          'https://via.placeholder.com/800x600?text=Table+Vue+2',
          'https://via.placeholder.com/800x600?text=Table+Vue+3',
          'https://via.placeholder.com/800x600?text=Table+Détail',
        ],
        stock: 3,
        variants: [
          {
            id: 'v1',
            name: 'Petite (120x80cm)',
            options: ['120x80cm'],
            price: 750.0,
            stock: 5,
          },
          {
            id: 'v2',
            name: 'Moyenne (160x90cm)',
            options: ['160x90cm'],
            price: 850.0,
            stock: 3,
          },
          {
            id: 'v3',
            name: 'Grande (200x100cm)',
            options: ['200x100cm'],
            price: 1050.0,
            stock: 2,
          },
        ],
        specifications: {
          Matériau: 'Chêne massif européen',
          Finition: 'Huile naturelle',
          Épaisseur: '4cm',
          Poids: '45-75kg selon taille',
          Origine: 'Fabriqué au Luxembourg',
          Délai: '2-4 semaines',
        },
        artisan: {
          id: '3',
          firstName: 'Pierre',
          lastName: 'Bernard',
          companyName: 'Menuiserie Bernard',
          city: 'Differdange',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pierre',
          rating: 4.9,
        },
        reviews: [
          {
            id: '1',
            rating: 5,
            comment:
              'Table magnifique, qualité exceptionnelle ! La finition est parfaite et le bois est vraiment de première qualité. Très content de mon achat.',
            createdAt: '2024-01-20T14:30:00Z',
            client: {
              firstName: 'Marie',
              lastName: 'Dubois',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marie',
            },
          },
          {
            id: '2',
            rating: 5,
            comment:
              'Superbe travail artisanal. La table est massive et très stable. Pierre est un vrai professionnel.',
            createdAt: '2024-01-15T10:00:00Z',
            client: {
              firstName: 'Jean',
              lastName: 'Dupont',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean',
            },
          },
          {
            id: '3',
            rating: 4,
            comment:
              'Très belle table, juste un peu plus lourde que prévu. Prévoir de l\'aide pour la porter !',
            createdAt: '2024-01-10T16:45:00Z',
            client: {
              firstName: 'Sophie',
              lastName: 'Martin',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
            },
          },
        ],
        createdAt: '2023-12-01T10:00:00Z',
      };

      setProduct(mockProduct);
      if (mockProduct.variants && mockProduct.variants.length > 0) {
        setSelectedVariant(mockProduct.variants[1].id); // Select medium by default
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!product) return;

    const variantInfo = selectedVariant
      ? product.variants?.find((v) => v.id === selectedVariant)
      : null;
    const finalPrice = variantInfo ? variantInfo.price : product.price;

    addItem({
      productId: product.id,
      productName: product.name,
      price: finalPrice,
      quantity,
      variantId: variantInfo?.id,
      variantName: variantInfo?.name,
      image: product.images[0],
      artisan: {
        id: product.artisan.id,
        name: product.artisan.companyName || `${product.artisan.firstName} ${product.artisan.lastName}`,
      },
    });

    // Show success message and option to go to cart
    if (confirm(`${t('marketplace', 'productAddedToCart')}\n\n${t('marketplace', 'goToCart')}`)) {
      router.push('/client/cart');
    }
  };

  const handleContactArtisan = () => {
    router.push(`/client/artisans/${product?.artisan.id}`);
  };

  const getCurrentPrice = () => {
    if (selectedVariant && product?.variants) {
      const variant = product.variants.find((v) => v.id === selectedVariant);
      return variant?.price || product.price;
    }
    return product?.price || 0;
  };

  const getCurrentStock = () => {
    if (selectedVariant && product?.variants) {
      const variant = product.variants.find((v) => v.id === selectedVariant);
      return variant?.stock || product.stock;
    }
    return product?.stock || 0;
  };

  const averageRating = product
    ? product.reviews.reduce((acc, r) => acc + r.rating, 0) / (product.reviews.length || 1)
    : 0;

  const renderStars = (rating: number, size = 'h-4 w-4') => {
    const rounded = Math.round(Number(rating) || 0);
    return (
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rounded ? 'fill-warning text-warning' : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('marketplace', 'productNotFound')}</p>
          <Button onClick={() => router.push('/client/marketplace')}>
            {t('marketplace', 'backToMarketplace')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-7">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-5 flex items-center gap-1 text-[13px] text-muted-foreground">
          <button onClick={() => router.push('/client/marketplace')} className="hover:text-foreground">
            {t('marketplace', 'title')}
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{getCategoryLabel(product.category)}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div>
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="h-96 w-full cursor-pointer rounded-2xl border border-border object-cover"
              onClick={() => setImageModalOpen(true)}
            />
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`overflow-hidden rounded-xl border-2 ${
                    selectedImage === index ? 'border-foreground' : 'border-border'
                  }`}
                >
                  <img src={image} alt={`Vue ${index + 1}`} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-3">
              <Badge variant="info">{getCategoryLabel(product.category)}</Badge>
            </div>

            <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-foreground mb-2">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mb-5 flex items-center gap-2">
              {renderStars(averageRating)}
              <span className="text-sm text-muted-foreground">
                {(Number(averageRating) || 0).toFixed(1)} ({product.reviews.length} {t('marketplace', 'reviews')})
              </span>
            </div>

            {/* Price */}
            <div className="mb-5">
              <span className="font-display text-4xl font-extrabold tracking-tight text-foreground">
                {(Number(getCurrentPrice()) || 0).toFixed(2)}€
              </span>
              <p className="mt-1 text-[13px] text-muted-foreground">{t('marketplace', 'taxIncludedDeliveryAvailable')}</p>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  {t('marketplace', 'sizeDimensions')}
                </label>
                <div className="space-y-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedVariant === variant.id
                          ? 'border-foreground bg-muted'
                          : 'border-border bg-card hover:border-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{variant.name}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            ({variant.stock} {variant.stock > 1 ? t('marketplace', 'availablePlural') : t('marketplace', 'available')})
                          </span>
                        </div>
                        <span className="font-bold">{(Number(variant.price) || 0).toFixed(2)}€</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-foreground">{t('cart', 'quantity')}</label>
              <div className="flex items-center gap-3.5">
                <div className="inline-flex items-center overflow-hidden rounded-xl border border-border">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="-"
                    className="flex h-11 w-10 items-center justify-center bg-card text-lg disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="flex h-11 w-14 items-center justify-center border-x border-border px-3 font-bold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(getCurrentStock(), quantity + 1))}
                    disabled={quantity >= getCurrentStock()}
                    aria-label="+"
                    className="flex h-11 w-10 items-center justify-center bg-card text-lg disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {getCurrentStock()} {getCurrentStock() > 1 ? t('marketplace', 'availablePlural') : t('marketplace', 'available')}
                </span>
              </div>
            </div>

            {/* Stock Warning */}
            {getCurrentStock() < 5 && (
              <div className="mb-5 rounded-xl bg-warning/15 px-4 py-3">
                <p className="text-sm font-semibold text-warning">
                  {t('marketplace', 'stockLimited')} {getCurrentStock()} {getCurrentStock() > 1 ? t('marketplace', 'exemplarPlural') : t('marketplace', 'exemplar')}{' '}
                  {getCurrentStock() > 1 ? t('marketplace', 'availablePlural') : t('marketplace', 'available')}.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mb-5 space-y-2.5">
              <Button className="w-full" size="lg" onClick={handleAddToCart}>
                {t('marketplace', 'addToCart')} — {(Number(getCurrentPrice() * quantity) || 0).toFixed(2)}€
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                {t('marketplace', 'contactForCustomization')}
              </Button>
            </div>

            {/* Artisan Info */}
            <div className="flex items-center gap-3 rounded-2xl border border-border p-4">
              <img
                src={product.artisan.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                alt={product.artisan.companyName}
                className="h-11 w-11 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{product.artisan.companyName}</p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {product.artisan.city}
                  <span className="mx-0.5">·</span>
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {product.artisan.rating}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleContactArtisan}>
                {t('artisans', 'viewProfile')}
              </Button>
            </div>
          </div>
        </div>

        {/* Description & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('marketplace', 'description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line leading-relaxed text-foreground">
                  {product.description}
                </p>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('marketplace', 'clientReviews')} ({product.reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <img
                          src={review.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={review.client.firstName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="font-bold">
                              {review.client.firstName} {review.client.lastName}
                            </p>
                            {renderStars(review.rating, 'h-3.5 w-3.5')}
                          </div>
                          <p className="mb-1.5 text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Specifications */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('marketplace', 'specifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {product.specifications &&
                    Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-border py-2.5 text-sm last:border-b-0">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="text-right font-semibold">{value}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative w-full max-w-5xl">
            <button
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setImageModalOpen(false)}
              aria-label={t('common', 'close')}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="h-auto w-full rounded-2xl"
            />
            <div className="mt-4 flex justify-center gap-2">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(index);
                  }}
                  className={`h-3 w-3 rounded-full ${
                    selectedImage === index ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
