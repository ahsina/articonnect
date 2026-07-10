'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => router.push('/client/marketplace')} className="hover:text-foreground">
            {t('marketplace', 'title')}
          </button>
          <span>›</span>
          <span>{getCategoryLabel(product.category)}</span>
          <span>›</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Images */}
          <div>
            <Card className="mb-4">
              <CardContent className="p-0">
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-96 object-cover rounded-t-lg cursor-pointer"
                  onClick={() => setImageModalOpen(true)}
                />
              </CardContent>
            </Card>
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`border-2 rounded-lg overflow-hidden ${
                    selectedImage === index ? 'border-blue-600' : 'border-border'
                  }`}
                >
                  <img src={image} alt={`Vue ${index + 1}`} className="w-full h-20 object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <Badge variant="info">{getCategoryLabel(product.category)}</Badge>
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center">
                <span className="text-foreground text-xl">
                  {''.repeat(Math.round(averageRating))}
                  {''.repeat(5 - Math.round(averageRating))}
                </span>
                <span className="text-muted-foreground ml-2">
                  {(Number(averageRating) || 0).toFixed(1)} ({product.reviews.length} {t('marketplace', 'reviews')})
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="mb-6">
              <span className="text-4xl font-bold text-primary">{(Number(getCurrentPrice()) || 0).toFixed(2)}€</span>
              <p className="text-sm text-muted-foreground mt-1">{t('marketplace', 'taxIncludedDeliveryAvailable')}</p>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('marketplace', 'sizeDimensions')}
                </label>
                <div className="space-y-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.id)}
                      className={`w-full p-3 border-2 rounded-lg text-left transition-colors ${
                        selectedVariant === variant.id
                          ? 'border-blue-600 bg-primary/10'
                          : 'border-border hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{variant.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({variant.stock} {variant.stock > 1 ? t('marketplace', 'availablePlural') : t('marketplace', 'available')})
                          </span>
                        </div>
                        <span className="font-semibold">{(Number(variant.price) || 0).toFixed(2)}€</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">{t('cart', 'quantity')}</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(getCurrentStock(), quantity + 1))}
                  disabled={quantity >= getCurrentStock()}
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {getCurrentStock()} {getCurrentStock() > 1 ? t('marketplace', 'availablePlural') : t('marketplace', 'available')}
                </span>
              </div>
            </div>

            {/* Stock Warning */}
            {getCurrentStock() < 5 && (
              <div className="mb-6 p-3 bg-amber-100 border rounded-lg">
                <p className="text-sm text-amber-800">
                  {t('marketplace', 'stockLimited')} {getCurrentStock()} {getCurrentStock() > 1 ? t('marketplace', 'exemplarPlural') : t('marketplace', 'exemplar')}{' '}
                  {getCurrentStock() > 1 ? t('marketplace', 'availablePlural') : t('marketplace', 'available')}.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 mb-6">
              <Button className="w-full" size="lg" onClick={handleAddToCart}>
                {t('marketplace', 'addToCart')} - {(Number(getCurrentPrice() * quantity) || 0).toFixed(2)}€
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                {t('marketplace', 'contactForCustomization')}
              </Button>
            </div>

            {/* Artisan Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={product.artisan.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                    alt={product.artisan.companyName}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{product.artisan.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.artisan.city} • {product.artisan.rating}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleContactArtisan}>
                    {t('artisans', 'viewProfile')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Description & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace', 'description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace', 'clientReviews')} ({product.reviews.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                      <div className="flex items-start gap-4">
                        <img
                          src={review.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                          alt={review.client.firstName}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold">
                                {review.client.firstName} {review.client.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span className="text-foreground font-semibold">
                                {''.repeat(review.rating)}
                                {''.repeat(5 - review.rating)}
                              </span>
                            </div>
                          </div>
                          <p className="text-foreground">{review.comment}</p>
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
              <CardHeader>
                <CardTitle>{t('marketplace', 'specifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.specifications &&
                    Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium text-right">{value}</span>
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
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              className="absolute top-4 right-4 text-white text-2xl"
              onClick={() => setImageModalOpen(false)}
            >
              
            </button>
            <img
              src={product.images[selectedImage]}
              alt={product.name}
              className="w-full h-auto rounded-lg"
            />
            <div className="flex justify-center gap-2 mt-4">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(index);
                  }}
                  className={`w-3 h-3 rounded-full ${
                    selectedImage === index ? 'bg-card' : 'bg-gray-500'
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
