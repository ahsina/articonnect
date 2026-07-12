'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { marketplaceApi, SellerStats as SellerStatsType } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, TrendingUp, ShoppingBag, Truck, Package, Trophy } from 'lucide-react';

interface SellerStatsProps {
  myUserId: string;
}

export default function SellerStats({ myUserId }: SellerStatsProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<SellerStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUserId]);

  const load = async () => {
    setLoading(true);
    try {
      const s = await marketplaceApi.getSellerStats(myUserId);
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t('common', 'loading') || 'Chargement…'}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          {t('artisan', 'noStats') || 'Statistiques indisponibles.'}
        </CardContent>
      </Card>
    );
  }

  const tiles = [
    {
      label: t('artisan', 'revenue') || "Chiffre d'affaires",
      value: `${(Number(stats.revenue) || 0).toFixed(2)}€`,
      icon: TrendingUp,
    },
    {
      label: t('artisan', 'ordersCount') || 'Commandes',
      value: String(stats.orderCount ?? 0),
      icon: ShoppingBag,
    },
    {
      label: t('artisan', 'toShip') || 'À expédier',
      value: String(stats.pendingShipments ?? 0),
      icon: Truck,
    },
    {
      label: t('artisan', 'activeProducts') || 'Produits actifs',
      value: `${stats.activeProducts ?? 0}/${stats.productCount ?? 0}`,
      icon: Package,
    },
  ];

  const maxRevenue = Math.max(1, ...stats.topProducts.map((p) => p.revenue || 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Card key={tile.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{tile.label}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-foreground">{tile.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top produits */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">{t('artisan', 'topProducts') || 'Meilleures ventes'}</h3>
          </div>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('artisan', 'noSales') || 'Aucune vente enregistrée pour l’instant.'}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground truncate">{p.name || t('common', 'product') || 'Produit'}</span>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap ml-2">
                        {(Number(p.revenue) || 0).toFixed(2)}€
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.max(4, ((p.revenue || 0) / maxRevenue) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.unitsSold} {t('artisan', 'unitsSold') || 'vendu(s)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
