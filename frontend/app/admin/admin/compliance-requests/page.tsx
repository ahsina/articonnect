'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';

// ----- Types (miroir de GET /compliance/admin/gdpr/requests et /requests/:userId) -----
interface GdprRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  accountCreatedAt: string;
  requestedAt: string | null;
  scheduledFor: string | null;
  overdue: boolean;
  daysRemaining: number | null;
  processed: boolean;
  processedCount: number;
  lastProcessedAt: string | null;
  lastOutcome: string | null;
}
interface GdprHistoryItem {
  id: string;
  processedBy: string | null;
  outcome: string | null;
  notes: string | null;
  createdAt: string;
}
interface GdprRequestDetail {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  accountCreatedAt: string;
  requestedAt: string | null;
  scheduledFor: string | null;
  overdue: boolean;
  pending: boolean;
  history: GdprHistoryItem[];
}

const OUTCOMES = [
  { value: 'ANONYMIZED', label: 'Compte anonymisé / effacé' },
  { value: 'EXPORTED', label: 'Données exportées (droit d’accès)' },
  { value: 'REJECTED', label: 'Refusé (obligation de conservation)' },
  { value: 'INFO', label: 'Note / suivi' },
] as const;

const OUTCOME_LABEL: Record<string, string> = OUTCOMES.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

function outcomeColor(outcome?: string | null) {
  switch (outcome) {
    case 'ANONYMIZED':
      return 'bg-green-100 text-green-700';
    case 'EXPORTED':
      return 'bg-blue-100 text-blue-700';
    case 'REJECTED':
      return 'bg-red-100 text-red-700';
    case 'INFO':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function ComplianceRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [meta, setMeta] = useState<{ total: number; overdue?: number }>({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<GdprRequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [outcome, setOutcome] = useState<string>('ANONYMIZED');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/compliance/admin/gdpr/requests');
      setRequests(res.data?.data ?? []);
      setMeta(res.data?.meta ?? { total: 0 });
      setError(null);
    } catch (err: any) {
      console.error('Error loading GDPR requests:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError('Impossible de charger les demandes RGPD.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const openRequest = async (userId: string) => {
    setDetailLoading(true);
    setNotes('');
    setOutcome('ANONYMIZED');
    try {
      const res = await apiClient.get(`/compliance/admin/gdpr/requests/${userId}`);
      setSelected(res.data);
    } catch (err) {
      console.error('Error loading request detail:', err);
      setError('Impossible de charger la demande.');
    } finally {
      setDetailLoading(false);
    }
  };

  const process = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const res = await apiClient.post(
        `/compliance/admin/gdpr/requests/${selected.userId}/process`,
        { outcome, notes: notes.trim() || undefined },
      );
      setSelected(res.data); // read-back : détail à jour avec la nouvelle trace
      setNotes('');
      await load();
    } catch (err) {
      console.error('Error processing request:', err);
      setError('Impossible de tracer le traitement.');
    } finally {
      setProcessing(false);
    }
  };

  const stats = {
    total: meta.total,
    overdue: meta.overdue ?? requests.filter((r) => r.overdue).length,
    processed: requests.filter((r) => r.processed).length,
    untouched: requests.filter((r) => !r.processed).length,
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Retour
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Demandes RGPD</h1>
              <p className="text-muted-foreground mt-1">
                Droit à l’effacement : demandes de suppression de compte en attente et leur traitement.
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'Chargement…' : 'Rafraîchir'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border rounded-lg text-red-700">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'En attente', value: stats.total, cls: 'text-foreground' },
            { label: 'Délai dépassé', value: stats.overdue, cls: 'text-red-600' },
            { label: 'Tracées', value: stats.processed, cls: 'text-green-600' },
            { label: 'Non traitées', value: stats.untouched, cls: 'text-amber-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {loading && requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Chargement…</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">Aucune demande en attente</p>
                <p className="text-sm mt-2">
                  Aucun utilisateur n’a de demande de suppression RGPD en cours.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {requests.map((r) => (
                  <div
                    key={r.userId}
                    onClick={() => openRequest(r.userId)}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {r.firstName} {r.lastName}
                          </h3>
                          <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                            {r.role}
                          </span>
                          {r.overdue ? (
                            <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">
                              Délai dépassé
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">
                              {r.daysRemaining != null ? `${r.daysRemaining} j restants` : 'En attente'}
                            </span>
                          )}
                          {r.processed && (
                            <span className={`px-2 py-0.5 text-xs rounded ${outcomeColor(r.lastOutcome)}`}>
                              {r.lastOutcome ? OUTCOME_LABEL[r.lastOutcome] ?? r.lastOutcome : 'Tracé'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.email}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>
                            Demandé le{' '}
                            {r.requestedAt ? new Date(r.requestedAt).toLocaleString('fr-FR') : '—'}
                          </span>
                          <span>
                            Effacement prévu le{' '}
                            {r.scheduledFor ? new Date(r.scheduledFor).toLocaleDateString('fr-FR') : '—'}
                          </span>
                          {r.processedCount > 0 && <span>{r.processedCount} trace(s)</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRequest(r.userId);
                        }}
                        className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 whitespace-nowrap"
                      >
                        Traiter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground mt-3">
          {requests.length} demande(s) en attente.
        </p>
      </div>

      {/* Detail / process modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border sticky top-0 bg-card z-10 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {selected.firstName} {selected.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailLoading ? (
                <p className="text-muted-foreground text-center py-6">Chargement…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-background rounded-lg border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Rôle</p>
                      <p className="font-medium text-foreground">{selected.role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Statut du compte</p>
                      <p className="font-medium text-foreground">{selected.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Demandé le</p>
                      <p className="font-medium text-foreground">
                        {selected.requestedAt
                          ? new Date(selected.requestedAt).toLocaleString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Effacement prévu</p>
                      <p className={`font-medium ${selected.overdue ? 'text-red-600' : 'text-foreground'}`}>
                        {selected.scheduledFor
                          ? new Date(selected.scheduledFor).toLocaleString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {!selected.pending && (
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
                      Cet utilisateur n’a plus de demande de suppression active (elle a peut-être été
                      annulée). Les traces ci-dessous restent consultables.
                    </div>
                  )}

                  {/* History */}
                  <div>
                    <h3 className="font-medium text-foreground mb-2">Historique de traitement</h3>
                    {selected.history?.length ? (
                      <div className="space-y-2">
                        {selected.history.map((h) => (
                          <div
                            key={h.id}
                            className="p-3 rounded-lg bg-background border border-border"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded ${outcomeColor(h.outcome)}`}>
                                {h.outcome ? OUTCOME_LABEL[h.outcome] ?? h.outcome : 'Trace'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(h.createdAt).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            {h.notes && <p className="text-sm text-foreground">{h.notes}</p>}
                            {h.processedBy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Par admin {h.processedBy.slice(0, 8)}…
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune trace pour le moment.</p>
                    )}
                  </div>

                  {/* Process form */}
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium text-foreground mb-2">Tracer une décision</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enregistre une décision horodatée au registre RGPD (aucune donnée n’est effacée
                      par cette action).
                    </p>
                    <label className="block text-sm text-muted-foreground mb-1">Issue</label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-card mb-3"
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className="block text-sm text-muted-foreground mb-1">Notes (optionnel)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Détails de la décision…"
                      className="w-full px-3 py-2 border border-border rounded-md bg-card resize-y"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Fermer
              </button>
              <button
                onClick={process}
                disabled={processing || detailLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {processing ? 'Enregistrement…' : 'Enregistrer la trace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
