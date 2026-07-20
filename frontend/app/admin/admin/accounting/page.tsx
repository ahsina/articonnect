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
    <div className="p-6 sm:p-7 max-w-5xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Export comptable
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
          Grand livre de la plateforme Krafolt : commissions perçues et TVA
          collectée sur la période, exportables au format CSV.
        </p>
      </div>

      {/* Export card */}
      <Card className="rounded-2xl border-border shadow-sm mb-6 p-0 gap-0">
        <CardHeader className="flex flex-col gap-0.5 border-b border-border px-5 py-4">
          <CardTitle className="font-display text-base font-semibold">
            Période à exporter
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choisissez un intervalle ou un raccourci
          </p>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Raccourcis
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border bg-card hover:bg-muted"
                onClick={() => setPreset('thisMonth')}
              >
                Ce mois-ci
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border bg-card hover:bg-muted"
                onClick={() => setPreset('lastMonth')}
              >
                Mois dernier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border bg-card hover:bg-muted"
                onClick={() => setPreset('thisYear')}
              >
                Cette année
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border bg-card hover:bg-muted"
                onClick={() => setPreset('lastYear')}
              >
                Année dernière
              </Button>
            </div>
          </div>

          {/* Date pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Date de début
              </label>
              <Input
                type="date"
                className="rounded-xl border-border"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                Date de fin
              </label>
              <Input
                type="date"
                className="rounded-xl border-border"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap border-t border-border pt-4">
            <p className="text-sm text-muted-foreground max-w-xl">
              Le fichier contient une ligne par écriture (facture finalisée) et
              une ligne de totaux. Nom généré :{' '}
              <span className="font-mono text-xs text-foreground">
                krafolt-grand-livre-{startDate}-{endDate}.csv
              </span>
            </p>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="rounded-xl bg-primary text-primary-foreground"
            >
              {exporting ? 'Génération…' : 'Exporter le CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="rounded-2xl border-border shadow-sm p-0 gap-0">
        <CardHeader className="border-b border-border px-5 py-4">
          <CardTitle className="font-display text-base font-semibold">
            Contenu du grand livre
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <li className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-sm before:bg-foreground">
              <span className="font-semibold text-foreground">Date</span> — date
              d&apos;émission de l&apos;écriture.
            </li>
            <li className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-sm before:bg-foreground">
              <span className="font-semibold text-foreground">
                Type / Référence
              </span>{' '}
              — nature (mission, marketplace, no-show) et numéro de facture.
            </li>
            <li className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-sm before:bg-foreground">
              <span className="font-semibold text-foreground">
                Montant HT / TVA
              </span>{' '}
              — base hors taxe et TVA collectée.
            </li>
            <li className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-sm before:bg-foreground">
              <span className="font-semibold text-foreground">Commission</span> —
              revenu perçu par la plateforme Krafolt.
            </li>
            <li className="relative pl-4 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-sm before:bg-foreground">
              <span className="font-semibold text-foreground">Net</span> — montant
              reversé à l&apos;artisan.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-4">
            Seules les factures finalisées (émises, payées, en retard) sont
            incluses ; les brouillons et factures annulées sont exclus.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
