'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import apiClient from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Export comptable plateforme (grand livre Krafolt).
 *
 * L'admin choisit une période et exporte le grand livre au format CSV :
 * commissions perçues + TVA collectée par la plateforme, ligne par ligne
 * (date, type, référence, montant HT, TVA, commission, net).
 *
 * Auth par cookie httpOnly → on télécharge via apiClient (withCredentials) en blob,
 * même pattern que le téléchargement des factures PDF côté client.
 */

// Période par défaut : du 1er janvier de l'année en cours à aujourd'hui.
function defaultRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(now) };
}

export default function AdminAccountingPage() {
  const { toast } = useToast();
  const range = defaultRange();
  const [startDate, setStartDate] = useState(range.start);
  const [endDate, setEndDate] = useState(range.end);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Champs requis',
        description: 'Sélectionnez une date de début et une date de fin.',
        variant: 'destructive',
      });
      return;
    }
    if (startDate > endDate) {
      toast({
        title: 'Période invalide',
        description: 'La date de début doit être antérieure à la date de fin.',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);
    try {
      const response = await apiClient.get('/accounting/platform-export', {
        params: { startDate, endDate, format: 'csv' },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `krafolt-grand-livre-${startDate}-${endDate}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export généré',
        description: 'Le grand livre a été téléchargé au format CSV.',
      });
    } catch (error) {
      console.error('Error exporting platform ledger:', error);
      toast({
        title: 'Erreur',
        description: "L'export comptable a échoué. Réessayez.",
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const setPreset = (preset: 'thisYear' | 'lastYear' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    let s: Date;
    let e: Date;
    switch (preset) {
      case 'thisYear':
        s = new Date(now.getFullYear(), 0, 1);
        e = now;
        break;
      case 'lastYear':
        s = new Date(now.getFullYear() - 1, 0, 1);
        e = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'thisMonth':
        s = new Date(now.getFullYear(), now.getMonth(), 1);
        e = now;
        break;
      case 'lastMonth':
        s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        e = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
    }
    setStartDate(iso(s));
    setEndDate(iso(e));
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Export comptable
          </h1>
          <p className="text-muted-foreground mt-2">
            Grand livre de la plateforme Krafolt : commissions perçues et TVA
            collectée sur la période, exportables au format CSV.
          </p>
        </div>

        {/* Export card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Période à exporter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreset('thisMonth')}>
                Ce mois-ci
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('lastMonth')}>
                Mois dernier
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('thisYear')}>
                Cette année
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPreset('lastYear')}>
                Année dernière
              </Button>
            </div>

            {/* Date pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Date de début
                </label>
                <Input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Date de fin
                </label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Le fichier contient une ligne par écriture (facture finalisée) et
                une ligne de totaux.
              </p>
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? 'Génération…' : 'Exporter le CSV'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Contenu du grand livre</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>
                <span className="font-medium text-foreground">Date</span> — date
                d&apos;émission de l&apos;écriture.
              </li>
              <li>
                <span className="font-medium text-foreground">Type / Référence</span>{' '}
                — nature (mission, marketplace, no-show) et numéro de facture.
              </li>
              <li>
                <span className="font-medium text-foreground">Montant HT / TVA</span>{' '}
                — base hors taxe et TVA collectée.
              </li>
              <li>
                <span className="font-medium text-foreground">Commission</span> —
                revenu perçu par la plateforme Krafolt.
              </li>
              <li>
                <span className="font-medium text-foreground">Net</span> — montant
                reversé à l&apos;artisan.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Seules les factures finalisées (émises, payées, en retard) sont
              incluses ; les brouillons et factures annulées sont exclus.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
