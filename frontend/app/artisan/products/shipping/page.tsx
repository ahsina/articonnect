'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { marketplaceApi } from '@/lib/api/marketplace';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Truck } from 'lucide-react';

/**
 * Configuration de la politique de livraison du vendeur.
 * Contrat backend :
 *   GET /marketplace/shipping-policy -> { freeShipping, flatRate, freeThreshold }
 *   PUT /marketplace/shipping-policy  (upsert)  -> politique enregistrée
 * Une seule politique par vendeur. Anti-désintermédiation : aucune donnée de commission ici.
 */
export default function ShippingPolicyPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Champs texte pour laisser l'utilisateur saisir librement (parse au save).
  const [freeShipping, setFreeShipping] = useState(false);
  const [flatRate, setFlatRate] = useState('5.99');
  const [hasThreshold, setHasThreshold] = useState(false);
  const [freeThreshold, setFreeThreshold] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const policy = await marketplaceApi.getShippingPolicy();
      setFreeShipping(policy.freeShipping);
      setFlatRate(String(policy.flatRate ?? 5.99));
      if (policy.freeThreshold !== null && policy.freeThreshold !== undefined) {
        setHasThreshold(true);
        setFreeThreshold(String(policy.freeThreshold));
      } else {
        setHasThreshold(false);
        setFreeThreshold('');
      }
    } catch (e) {
      console.error('Erreur chargement politique de livraison', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description: 'Impossible de charger la politique de livraison.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const rate = Number(flatRate);
    if (!freeShipping && (!Number.isFinite(rate) || rate < 0)) {
      toast({
        title: t('common', 'error') || 'Erreur',
        description: 'Le forfait de port doit être un montant valide (≥ 0).',
        variant: 'destructive',
      });
      return;
    }

    let threshold: number | null = null;
    if (!freeShipping && hasThreshold) {
      const parsed = Number(freeThreshold);
      if (freeThreshold.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
        toast({
          title: t('common', 'error') || 'Erreur',
          description: 'Le montant du franco de port doit être un montant valide (> 0).',
          variant: 'destructive',
        });
        return;
      }
      threshold = parsed;
    }

    setSaving(true);
    try {
      const saved = await marketplaceApi.updateShippingPolicy({
        freeShipping,
        flatRate: freeShipping ? Number(flatRate) || 0 : rate,
        freeThreshold: threshold,
      });
      // Resynchronise avec la valeur normalisée renvoyée par le backend.
      setFreeShipping(saved.freeShipping);
      setFlatRate(String(saved.flatRate ?? 0));
      setHasThreshold(saved.freeThreshold !== null && saved.freeThreshold !== undefined);
      setFreeThreshold(
        saved.freeThreshold !== null && saved.freeThreshold !== undefined
          ? String(saved.freeThreshold)
          : '',
      );
      toast({
        title: t('common', 'success') || 'Enregistré',
        description: 'Votre politique de livraison a été enregistrée.',
        variant: 'success',
      });
    } catch (e) {
      console.error('Erreur enregistrement politique de livraison', e);
      toast({
        title: t('common', 'error') || 'Erreur',
        description: "Échec de l'enregistrement de la politique de livraison.",
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/artisan/products')}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la boutique
          </button>
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted flex-shrink-0">
              <Truck className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                Politique de livraison
              </h1>
              <p className="text-sm text-muted-foreground">
                Définissez les frais de port appliqués à vos produits.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {t('common', 'loading') || 'Chargement…'}
          </div>
        ) : (
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader>
              <CardTitle className="font-display text-lg font-bold">Frais de port</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Livraison gratuite */}
              <div className="rounded-xl border border-border p-4">
                <Switch
                  checked={freeShipping}
                  onChange={(e) => setFreeShipping(e.target.checked)}
                  label="Livraison gratuite"
                  description="Aucun frais de port ne sera facturé à vos clients."
                />
              </div>

              {/* Forfait de port */}
              <div className={freeShipping ? 'opacity-50' : ''}>
                <Label htmlFor="flatRate">Forfait de port (€)</Label>
                <div className="relative">
                  <Input
                    id="flatRate"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    className="pr-9"
                    value={flatRate}
                    disabled={freeShipping}
                    onChange={(e) => setFlatRate(e.target.value)}
                    placeholder="5.99"
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">€</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Montant facturé au client pour la livraison de sa commande.
                </p>
              </div>

              {/* Franco de port */}
              <div className={`rounded-xl border border-border p-4 ${freeShipping ? 'opacity-50' : ''}`}>
                <Switch
                  checked={hasThreshold}
                  disabled={freeShipping}
                  onChange={(e) => setHasThreshold(e.target.checked)}
                  label="Franco de port"
                  description="Offrez la livraison lorsque le montant du panier dépasse un seuil."
                />
                {hasThreshold && !freeShipping && (
                  <div className="mt-4">
                    <Label htmlFor="freeThreshold">
                      Livraison offerte au-delà de (€)
                    </Label>
                    <div className="relative">
                      <Input
                        id="freeThreshold"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="pr-9"
                        value={freeThreshold}
                        onChange={(e) => setFreeThreshold(e.target.value)}
                        placeholder="50.00"
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted-foreground">€</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Au-delà de ce montant, la livraison est automatiquement offerte au client.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => router.push('/artisan/products')} disabled={saving}>
                  {t('common', 'cancel') || 'Annuler'}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {t('common', 'save') || 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
