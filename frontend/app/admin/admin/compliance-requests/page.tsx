'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';

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
      return 'bg-success/10 text-success';
    case 'EXPORTED':
      return 'bg-blue-600/10 text-blue-600';
    case 'REJECTED':
      return 'bg-destructive/10 text-destructive';
    case 'INFO':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function initials(first?: string, last?: string) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?';
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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/admin/admin/dashboard')}
              className="mt-1 text-muted-foreground hover:text-foreground"
            >
              ← Retour
            </button>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                Demandes RGPD
              </h1>
              <p className="text-muted-foreground mt-1">
                Droit à l’effacement : demandes de suppression de compte en attente et leur traitement.
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Chargement…' : 'Rafraîchir'}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'En attente', value: stats.total, cls: 'text-foreground' },
            { label: 'Délai dépassé', value: stats.overdue, cls: 'text-destructive' },
            { label: 'Tracées', value: stats.processed, cls: 'text-success' },
            { label: 'Non traitées', value: stats.untouched, cls: 'text-warning' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p className={`font-display mt-2 text-3xl font-bold tracking-tight ${s.cls}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Legal note */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <b>Délai légal RGPD : 1 mois (30 jours)</b> à compter de la réception de la demande
            (art. 12 §3 du RGPD), prolongeable de 2 mois pour les demandes complexes avec information
            motivée du demandeur. Toute décision est horodatée et conservée au registre.
          </div>
        </div>

        {/* List */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-bold text-foreground">Demandes reçues</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {requests.length} résultat{requests.length > 1 ? 's' : ''}
            </span>
          </div>
          {loading && requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Chargement…</div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium text-foreground">Aucune demande en attente</p>
              <p className="mt-2 text-sm">
                Aucun utilisateur n’a de demande de suppression RGPD en cours.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Demandeur
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Rôle
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Demandé le
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Échéance
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Statut
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Traçabilité
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.userId}
                      onClick={() => openRequest(r.userId)}
                      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {initials(r.firstName, r.lastName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">
                              {r.firstName} {r.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          {r.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs text-muted-foreground">
                          {r.scheduledFor
                            ? new Date(r.scheduledFor).toLocaleDateString('fr-FR')
                            : '—'}
                        </div>
                        {r.overdue ? (
                          <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            En retard
                          </span>
                        ) : (
                          r.daysRemaining != null && (
                            <span className="mt-1 inline-block rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                              {r.daysRemaining} j restants
                            </span>
                          )
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {r.overdue ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            Délai dépassé
                          </span>
                        ) : r.processed ? (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                            Tracée
                          </span>
                        ) : (
                          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {r.processed ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${outcomeColor(
                                r.lastOutcome,
                              )}`}
                            >
                              {r.lastOutcome
                                ? OUTCOME_LABEL[r.lastOutcome] ?? r.lastOutcome
                                : 'Tracé'}
                            </span>
                            {r.processedCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {r.processedCount} trace(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRequest(r.userId);
                          }}
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Traiter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {requests.length} demande(s) en attente.
        </p>
      </div>

      {/* Detail / process modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {initials(selected.firstName, selected.lastName)}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    {selected.firstName} {selected.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">{selected.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-2xl leading-none text-muted-foreground hover:text-foreground"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              {detailLoading ? (
                <p className="py-6 text-center text-muted-foreground">Chargement…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/50 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Rôle</p>
                      <p className="mt-1 font-medium text-foreground">{selected.role}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Statut du compte
                      </p>
                      <p className="mt-1 font-medium text-foreground">{selected.status}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Demandé le
                      </p>
                      <p className="mt-1 font-medium text-foreground">
                        {selected.requestedAt
                          ? new Date(selected.requestedAt).toLocaleString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Effacement prévu
                      </p>
                      <p
                        className={`mt-1 font-medium ${
                          selected.overdue ? 'text-destructive' : 'text-foreground'
                        }`}
                      >
                        {selected.scheduledFor
                          ? new Date(selected.scheduledFor).toLocaleString('fr-FR')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {!selected.pending && (
                    <div className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                      Cet utilisateur n’a plus de demande de suppression active (elle a peut-être été
                      annulée). Les traces ci-dessous restent consultables.
                    </div>
                  )}

                  {/* History */}
                  <div>
                    <h3 className="mb-2 font-display font-semibold text-foreground">
                      Historique de traitement
                    </h3>
                    {selected.history?.length ? (
                      <div className="space-y-2">
                        {selected.history.map((h) => (
                          <div
                            key={h.id}
                            className="rounded-xl border border-border bg-card p-3"
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${outcomeColor(
                                  h.outcome,
                                )}`}
                              >
                                {h.outcome ? OUTCOME_LABEL[h.outcome] ?? h.outcome : 'Trace'}
                              </span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {new Date(h.createdAt).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            {h.notes && <p className="text-sm text-foreground">{h.notes}</p>}
                            {h.processedBy && (
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
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
                    <h3 className="mb-2 font-display font-semibold text-foreground">
                      Tracer une décision
                    </h3>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Enregistre une décision horodatée au registre RGPD (aucune donnée n’est effacée
                      par cette action).
                    </p>
                    <label className="mb-1 block text-sm text-muted-foreground">Issue</label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="mb-3 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className="mb-1 block text-sm text-muted-foreground">
                      Notes (optionnel)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Détails de la décision…"
                      className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-card p-6">
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Fermer
              </button>
              <button
                onClick={process}
                disabled={processing || detailLoading}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
