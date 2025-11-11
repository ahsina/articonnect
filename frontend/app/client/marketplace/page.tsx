'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { marketplaceApi } from '@/lib/api/marketplace';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  artisan: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    city: string;
  };
}

const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: '🔍' },
  { id: 'tools', name: 'Outils', icon: '🔧' },
  { id: 'materials', name: 'Matériaux', icon: '🧱' },
  { id: 'decorations', name: 'Décoration', icon: '🎨' },
  { id: 'furniture', name: 'Meubles', icon: '🪑' },
  { id: 'equipment', name: 'Équipements', icon: '⚙️' },
  { id: 'lighting', name: 'Éclairage', icon: '💡' },
];

export default function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest'>('newest');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedCategory, searchQuery, sortBy]);

  const loadProducts = async () => {
    try {
      const data = await marketplaceApi.getProducts();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading products:', error);
      // Fallback to mock data on error
      await loadProductsMock();
    }
  };

  // Fallback mock data for demonstration (commented out)
  const loadProductsMock = async () => {
    try {
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Kit de plomberie complet',
          description: 'Ensemble complet d\'outils pour plombier professionnel',
          price: 249.99,
          category: 'tools',
          images: ['https://via.placeholder.com/400x300?text=Kit+Plomberie'],
          stock: 5,
          artisan: {
            id: '1',
            firstName: 'Jean',
            lastName: 'Dupont',
            companyName: 'Plomberie Dupont',
            city: 'Luxembourg',
          },
        },
        {
          id: '2',
          name: 'Lustre moderne LED',
          description: 'Lustre design avec éclairage LED économique',
          price: 189.00,
          category: 'lighting',
          images: ['https://via.placeholder.com/400x300?text=Lustre+LED'],
          stock: 12,
          artisan: {
            id: '2',
            firstName: 'Marie',
            lastName: 'Martin',
            companyName: 'Électricité Martin',
            city: 'Esch-sur-Alzette',
          },
        },
        {
          id: '3',
          name: 'Table en chêne massif',
          description: 'Table artisanale en chêne massif, fabrication sur mesure',
          price: 850.00,
          category: 'furniture',
          images: ['https://via.placeholder.com/400x300?text=Table+Chene'],
          stock: 3,
          artisan: {
            id: '3',
            firstName: 'Pierre',
            lastName: 'Bernard',
            companyName: 'Menuiserie Bernard',
            city: 'Differdange',
          },
        },
        {
          id: '4',
          name: 'Parquet flottant premium',
          description: 'Parquet flottant haute qualité, facile à poser',
          price: 45.00,
          category: 'materials',
          images: ['https://via.placeholder.com/400x300?text=Parquet'],
          stock: 50,
          artisan: {
            id: '3',
            firstName: 'Pierre',
            lastName: 'Bernard',
            companyName: 'Multi-Services Bernard',
            city: 'Differdange',
          },
        },
        {
          id: '5',
          name: 'Miroir décoratif encadré',
          description: 'Miroir avec cadre artisanal en bois sculpté',
          price: 125.00,
          category: 'decorations',
          images: ['https://via.placeholder.com/400x300?text=Miroir'],
          stock: 8,
          artisan: {
            id: '3',
            firstName: 'Pierre',
            lastName: 'Bernard',
            companyName: 'Multi-Services Bernard',
            city: 'Differdange',
          },
        },
      ];

      // Legacy mock - not used anymore
      // setProducts(mockProducts);
    } catch (error) {
      console.error('Error in mock data');
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.artisan.companyName.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'price-asc') {
        return a.price - b.price;
      } else if (sortBy === 'price-desc') {
        return b.price - a.price;
      } else {
        // newest (by id for now)
        return b.id.localeCompare(a.id);
      }
    });

    setFilteredProducts(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-2">
            Découvrez les produits proposés par nos artisans locaux
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un produit, artisan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">Aucun produit trouvé</p>
              <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                Réinitialiser les filtres
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/marketplace/${product.id}`)}
              >
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    {product.stock < 5 && (
                      <Badge variant="warning" className="absolute top-2 right-2">
                        Stock limité
                      </Badge>
                    )}
                  </div>

                  <div className="p-4">
                    {/* Product Name */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    {/* Artisan */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                      <span>👤</span>
                      <span className="truncate">{product.artisan.companyName}</span>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-blue-600">
                        {product.price.toFixed(2)}€
                      </span>
                      <span className="text-sm text-gray-500">
                        {product.stock} en stock
                      </span>
                    </div>

                    {/* Actions */}
                    <Button className="w-full" onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add to cart
                      alert('Fonctionnalité panier à venir');
                    }}>
                      Ajouter au panier
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
