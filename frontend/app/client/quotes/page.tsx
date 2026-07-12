'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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

  const load = async () => {
    setLoading(true);
    try {
      // Le CLIENT n'a pas d'endpoint de liste : on reconstruit l'inbox à partir des
      // notifications « Nouveau devis reçu » (link = /client/quotes/:id) puis GET /quotes/:id.
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
      const fetched = await Promise.all(
        ids.map((id) => quoteApi.get(id).catch(() => null)),
      );
      const valid = fetched.filter((q): q is Quote => !!q);
      valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setQuotes(valid);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger vos devis.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mes devis</h1>
        <p className="text-muted-foreground">Les devis que vous avez reçus des artisans.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Devis reçus</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement…</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Vous n&apos;avez pas encore reçu de devis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((q) => {
                const artisanName = q.artisan
                  ? [q.artisan.firstName, q.artisan.lastName].filter(Boolean).join(' ')
                  : 'Artisan';
                return (
                  <Link key={q.id} href={`/client/quotes/${q.id}`} className="block">
                    <div className="p-4 border rounded-lg hover:bg-accent transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{q.quoteNumber}</span>
                            <h4 className="font-medium text-foreground truncate">{q.title}</h4>
                            <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">De : {artisanName}</p>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Reçu le {formatDate(q.sentAt || q.createdAt)}</span>
                            <span>Valide jusqu&apos;au {formatDate(q.validUntil)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-bold text-foreground">{formatCurrency(num(q.totalAmount))}</div>
                          <div className="text-xs text-muted-foreground">dont TVA {formatCurrency(num(q.taxAmount))}</div>
                          <Button variant="outline" size="sm" className="mt-2">Voir le devis</Button>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
