'use client';

import { TradeIcon } from '@/components/shared/TradeIcon';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ProductGridSkeleton, Skeleton } from '@/components/ui/skeleton';
import { marketplaceApi, PaginatedResponse, Product } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCartStore } from '@/lib/stores/cartStore';
import { useToast } from '@/hooks/use-toast';

type MarketplaceSortOption = 'price-asc' | 'price-desc' | 'newest';

export default function MarketplacePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { addItem } = useCartStore();
  const { toast } = useToast();

  const CATEGORIES = [
    { id: 'all', name: t('marketplace', 'all'), icon: '' },
    { id: 'tools', name: t('marketplace', 'tools'), icon: '' },
    { id: 'materials', name: t('marketplace', 'materials'), icon: '' },
    { id: 'decorations', name: t('marketplace', 'decorations'), icon: '' },
    { id: 'furniture', name: t('marketplace', 'furniture'), icon: '' },
    { id: 'equipment', name: t('marketplace', 'equipment'), icon: '' },
    { id: 'lighting', name: t('marketplace', 'lighting'), icon: '' },
  ];
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest'>('newest');

  // Advanced filters
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1500]);
  const [maxPrice, setMaxPrice] = useState(1500);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery, sortBy, priceRange, minRating, currentPage, itemsPerPage]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [sortField, sortDir] = sortBy === 'price-asc'
        ? ['price', 'asc']
        : sortBy === 'price-desc'
        ? ['price', 'desc']
        : ['newest', 'desc'];

      const data = await marketplaceApi.getProducts({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchQuery || undefined,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        minRating: minRating > 0 ? minRating : undefined,
        sortBy: sortField,
        sortOrder: sortDir,
        page: currentPage,
        limit: itemsPerPage,
      });

      setProducts(data.data);
      setPagination(data.pagination);

      // Calculate max price from the first load
      if (maxPrice === 1500 && data.data.length > 0) {
        const max = Math.ceil(Math.max(...data.data.map((p) => p.price)));
        setMaxPrice(max);
        setPriceRange([0, max]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();

    if (product.stock <= 0) {
      toast({
        title: t('marketplace', 'outOfStock'),
        description: t('marketplace', 'productOutOfStock'),
        variant: 'destructive',
      });
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
      artisan: product.artisan
        ? {
            id: product.artisan.id,
            name: product.artisan.companyName || `${product.artisan.firstName} ${product.artisan.lastName}`,
          }
        : undefined,
    });

    toast({
      title: t('marketplace', 'addedToCart'),
      description: `${product.name} ${t('marketplace', 'hasBeenAdded')}`,
      variant: 'success',
    });
  };


  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setPriceRange([0, maxPrice]);
    setMinRating(0);
    setSortBy('newest');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8" role="status" aria-label={t('clientMarketplace', 'loadingAria')}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>

          {/* Filters skeleton */}
          <div className="mb-8 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="flex-1 h-10" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-40" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-full" />
              ))}
            </div>
          </div>

          {/* Results info skeleton */}
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>

          {/* Products grid skeleton */}
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('clientMarketplace', 'heading')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('clientMarketplace', 'subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar & Sort */}
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-0">
              <Input
                placeholder={t('clientMarketplace', 'searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="whitespace-nowrap"
            >
              {showFilters ? `${t('clientMarketplace', 'hide')}` : `${t('clientMarketplace', 'advancedFilters')}`}
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MarketplaceSortOption)}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="newest">{t('clientMarketplace', 'sortNewest')}</option>
              <option value="price-asc">{t('clientMarketplace', 'sortPriceAsc')}</option>
              <option value="price-desc">{t('clientMarketplace', 'sortPriceDesc')}</option>
            </select>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 min-w-0 max-w-full">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground hover:bg-accent'
                }`}
              >
                <TradeIcon name={category.name} className="h-4 w-4" />
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Price Range Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-foreground">
                      {t('clientMarketplace', 'price')}
                    </label>
                    <span className="text-sm text-muted-foreground">
                      {(Number(priceRange[0]) || 0).toFixed(0)}€ - {(Number(priceRange[1]) || 0).toFixed(0)}€
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={maxPrice}
                    step={10}
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>0€</span>
                    <span>{maxPrice}€</span>
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    {t('clientMarketplace', 'minRating')}
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors ${
                          minRating === rating
                            ? 'bg-primary text-primary-foreground border-blue-600'
                            : 'bg-card text-foreground border-border hover:bg-accent'
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {rating === 0 ? t('clientMarketplace', 'all') : `${rating}+`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="flex-1"
                  >
                    {t('clientMarketplace', 'reset')}
                  </Button>
                  <Button
                    onClick={() => setShowFilters(false)}
                    className="flex-1"
                  >
                    {t('clientMarketplace', 'apply')} ({pagination.total} {t('clientMarketplace', 'products')})
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Info */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.total > 0
              ? `${pagination.total} ${pagination.total > 1 ? t('clientMarketplace', 'productsFoundPlural') : t('clientMarketplace', 'productFound')} - ${t('clientMarketplace', 'page')} ${currentPage} ${t('clientMarketplace', 'of')} ${pagination.totalPages}`
              : t('clientMarketplace', 'noProductsFound')}
          </p>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-1 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={6}>6 {t('clientMarketplace', 'perPage')}</option>
            <option value={12}>12 {t('clientMarketplace', 'perPage')}</option>
            <option value={24}>24 {t('clientMarketplace', 'perPage')}</option>
            <option value={48}>48 {t('clientMarketplace', 'perPage')}</option>
          </select>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{t('clientMarketplace', 'noProductsFound')}</p>
              <Button onClick={resetFilters}>
                {t('clientMarketplace', 'resetFilters')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/marketplace/${product.id}`)}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center rounded-t-lg bg-muted text-5xl text-muted-foreground">
                        
                      </div>
                    )}
                    {product.stock < 5 && (
                      <Badge variant="warning" className="absolute top-2 right-2">
                        {t('clientMarketplace', 'limitedStock')}
                      </Badge>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Product Name */}
                    <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Artisan */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <span></span>
                      <span className="truncate">{product.artisan?.companyName || t('clientMarketplace', 'artisan')}</span>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-primary">
                        {(Number(product.price) || 0).toFixed(2)}€
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {product.stock} {t('clientMarketplace', 'inStock')}
                      </span>
                    </div>

                    {/* Actions */}
                    <Button
                      className="w-full"
                      onClick={(e) => handleAddToCart(product, e)}
                      disabled={product.stock <= 0}
                    >
                      {product.stock <= 0
                        ? t('marketplace', 'outOfStock')
                        : t('marketplace', 'addToCart')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                {t('clientMarketplace', 'previous')}
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    // Show first page, last page, current page, and pages around current
                    return (
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    );
                  })
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;

                    return (
                      <div key={page} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                        <Button
                          variant={currentPage === page ? 'default' : 'outline'}
                          onClick={() => setCurrentPage(page)}
                          className="w-10 h-10 p-0"
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                disabled={!pagination.hasNextPage}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                {t('clientMarketplace', 'next')} 
              </Button>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
}
