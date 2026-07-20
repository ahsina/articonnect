'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api/client';
import { notificationsApi } from '@/lib/api/notifications';
import { quoteApi, num, type Quote, type QuoteStatus } from '@/lib/api/quote';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'À traiter',
  VIEWED: 'Vu',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
  CONVERTED: 'Signé',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-muted text-foreground',
  SENT: 'bg-amber-100 text-amber-800',
  VIEWED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-muted text-muted-foreground',
  CONVERTED: 'bg-primary/10 text-primary',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function ClientQuotesPage() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fallback historique : reconstruit l'inbox à partir des notifications « Nouveau devis reçu »
  // (link = /client/quotes/:id) puis GET /quotes/:id. Utilisé uniquement si l'endpoint client-scopé
  // /quotes/received n'est pas disponible (rétrocompatibilité).
  const loadFromNotifications = async (): Promise<Quote[]> => {
    const notifs = await notificationsApi.getAll(100);
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const n of notifs) {
      const link = n.link || '';
      const m = link.match(/^\/client\/quotes\/([^/?#]+)/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        ids.push(m[1]);
      }
    }
    const fetched = await Promise.all(ids.map((id) => quoteApi.get(id).catch(() => null)));
    return fetched.filter((q): q is Quote => !!q);
  };

  const load = async () => {
    setLoading(true);
    try {
      // Source primaire : endpoint client-scopé GET /quotes/received (Quote.clientId = utilisateur
      // courant), qui liste directement les vrais devis reçus (sans reparser les notifications).
      let list: Quote[] = [];
      try {
        const res = await apiClient.get('/quotes/received');
        list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      } catch {
        // Fallback rétrocompatible si l'endpoint n'est pas encore déployé.
        list = await loadFromNotifications();
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQuotes(list);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger vos devis.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-9 px-4">
      <div className="max-w-[1120px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Mes devis</h1>
          <p className="text-muted-foreground mt-1.5">Les devis que vous avez reçus des artisans.</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="text-center py-10 pt-10 text-muted-foreground">Chargement…</CardContent>
          </Card>
        ) : quotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10 pt-10 text-muted-foreground">
              <p>Vous n&apos;avez pas encore reçu de devis.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {quotes.map((q, idx) => {
              const artisanName = q.artisan
                ? [q.artisan.firstName, q.artisan.lastName].filter(Boolean).join(' ')
                : 'Artisan';
              return (
                <Link key={q.id} href={`/client/quotes/${q.id}`} className="block">
                  <div className={`flex items-start justify-between gap-[18px] p-5 hover:bg-muted transition-colors ${idx > 0 ? 'border-t border-border' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2.5">
                        <span className="font-mono text-[11.5px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{q.quoteNumber}</span>
                        <h4 className="font-display font-bold text-foreground truncate">{q.title}</h4>
                        <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                      </div>
                      <p className="text-[13.5px] text-muted-foreground mt-1.5">De : {artisanName}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-[13px] text-muted-foreground">
                        <span>Reçu le {formatDate(q.sentAt || q.createdAt)}</span>
                        <span>Valide jusqu&apos;au {formatDate(q.validUntil)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-xl font-extrabold text-foreground">{formatCurrency(num(q.totalAmount))}</div>
                      <div className="text-xs text-muted-foreground">dont TVA {formatCurrency(num(q.taxAmount))}</div>
                      <Button variant="outline" size="sm" className="mt-2.5">Voir le devis</Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
