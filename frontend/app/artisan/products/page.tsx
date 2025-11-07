'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  active: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { id: 'tools', name: 'Outils' },
  { id: 'materials', name: 'Matériaux' },
  { id: 'decorations', name: 'Décoration' },
  { id: 'furniture', name: 'Meubles' },
  { id: 'equipment', name: 'Équipements' },
  { id: 'lighting', name: 'Éclairage' },
];

export default function ArtisanProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // TODO: Replace with actual API call
      // const data = await marketplaceApi.getMyProducts();

      // Mock data
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Table en chêne massif',
          description: 'Belle table artisanale en chêne massif, 160x90cm',
          price: 850,
          stock: 3,
          category: 'furniture',
          images: ['https://via.placeholder.com/300x200?text=Table'],
          active: true,
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'Étagère murale bois',
          description: 'Étagère murale en bois recyclé, 120cm',
          price: 120,
          stock: 8,
          category: 'furniture',
          images: ['https://via.placeholder.com/300x200?text=Etagere'],
          active: true,
          createdAt: '2024-01-10T14:00:00Z',
        },
        {
          id: '3',
          name: 'Set d\'outils professionnel',
          description: 'Coffret complet 120 pièces',
          price: 350,
          stock: 0,
          category: 'tools',
          images: ['https://via.placeholder.com/300x200?text=Outils'],
          active: false,
          createdAt: '2024-01-05T09:00:00Z',
        },
      ];

      setProducts(mockProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (productId: string) => {
    try {
      // TODO: Replace with actual API call
      // await marketplaceApi.toggleProductStatus(productId);

      setProducts(
        products.map((p) =>
          p.id === productId ? { ...p, active: !p.active } : p
        )
      );
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      // TODO: Replace with actual API call
      // await marketplaceApi.deleteProduct(productId);

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
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes produits</h1>
            <p className="text-gray-600">
              Gérez vos produits sur le marketplace
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            + Ajouter un produit
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total produits</div>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Actifs</div>
              <div className="text-2xl font-bold text-green-600">
                {products.filter((p) => p.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">En rupture</div>
              <div className="text-2xl font-bold text-red-600">
                {products.filter((p) => p.stock === 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Valeur stock</div>
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
                  Vous n'avez pas encore de produits
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  Ajouter votre premier produit
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
                          {product.active ? (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-gray-100 text-gray-800">
                              Inactif
                            </Badge>
                          )}
                          {product.stock === 0 && (
                            <Badge variant="error" className="bg-red-100 text-red-800">
                              Rupture
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">Prix:</span>
                          <p className="font-semibold text-lg">{product.price}€</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Stock:</span>
                          <p className="font-semibold text-lg">{product.stock}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Valeur:</span>
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
                          👁️ Voir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          ✏️ Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(product.id)}
                        >
                          {product.active ? '⏸️ Désactiver' : '▶️ Activer'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          🗑️ Supprimer
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
                  {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
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
                    Annuler
                  </Button>
                  <Button>Enregistrer</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
