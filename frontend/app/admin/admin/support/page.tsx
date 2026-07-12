'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';

// ----- Types (miroir de la réponse GET /support/admin/tickets et /support/tickets/:id) -----
interface TicketUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}
interface TicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  user?: TicketUser | null;
  assignedTo?: TicketUser | null;
  _count?: { messages: number };
}
interface TicketMessage {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  sender?: TicketUser | null;
}
interface TicketDetail extends TicketListItem {
  messages: TicketMessage[];
  resolution?: string | null;
  slaStatus?: {
    firstResponse: { status: string; due: string | null };
    resolution: { status: string; due: string | null };
  };
}

const STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'WAITING_FOR_SUPPORT',
  'RESOLVED',
  'CLOSED',
] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const CATEGORIES = [
  'TECHNICAL_ISSUE',
  'PAYMENT_ISSUE',
  'ACCOUNT_ISSUE',
  'MISSION_ISSUE',
  'DISPUTE',
  'FEATURE_REQUEST',
  'FEEDBACK',
  'OTHER',
] as const;

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  WAITING_FOR_CUSTOMER: 'Attente client',
  WAITING_FOR_SUPPORT: 'Attente support',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};
const CATEGORY_LABEL: Record<string, string> = {
  TECHNICAL_ISSUE: 'Technique',
  PAYMENT_ISSUE: 'Paiement',
  ACCOUNT_ISSUE: 'Compte',
  MISSION_ISSUE: 'Mission',
  DISPUTE: 'Litige',
  FEATURE_REQUEST: 'Suggestion',
  FEEDBACK: 'Retour',
  OTHER: 'Autre',
};

function statusColor(status: string) {
  switch (status) {
    case 'OPEN':
      return 'bg-amber-100 text-amber-800';
    case 'IN_PROGRESS':
      return 'bg-primary/10 text-primary';
    case 'WAITING_FOR_CUSTOMER':
      return 'bg-blue-100 text-blue-700';
    case 'WAITING_FOR_SUPPORT':
      return 'bg-purple-100 text-purple-700';
    case 'RESOLVED':
      return 'bg-green-100 text-green-700';
    case 'CLOSED':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-foreground';
  }
}
function priorityColor(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-700';
    case 'HIGH':
      return 'bg-amber-100 text-amber-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-700';
    case 'LOW':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-muted text-foreground';
  }
}
function slaColor(status?: string) {
  switch (status) {
    case 'BREACHED':
      return 'bg-red-100 text-red-700';
    case 'AT_RISK':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-green-100 text-green-700';
  }
}

export default function SupportInboxPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [meta, setMeta] = useState<{ total: number; overdue?: number }>({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();
      const res = await apiClient.get('/support/admin/tickets', { params });
      setTickets(res.data?.data ?? []);
      setMeta(res.data?.meta ?? { total: 0 });
      setError(null);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      if (err.response?.status === 403) {
        router.push('/');
      } else {
        setError('Impossible de charger les tickets.');
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, search, router]);

  useEffect(() => {
    loadTickets();
  }, [statusFilter, priorityFilter, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openTicket = async (id: string) => {
    setDetailLoading(true);
    setReply('');
    setIsInternal(false);
    try {
      const res = await apiClient.get(`/support/tickets/${id}`);
      setSelected(res.data);
    } catch (err) {
      console.error('Error loading ticket detail:', err);
      setError('Impossible de charger le ticket.');
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/support/tickets/${selected.id}/messages`, {
        content: reply.trim(),
        isInternal,
      });
      setReply('');
      setIsInternal(false);
      await openTicket(selected.id); // read-back : recharge les messages + statut
      await loadTickets();
    } catch (err) {
      console.error('Error sending reply:', err);
      setError("Impossible d'envoyer la réponse.");
    } finally {
      setSending(false);
    }
  };

  const updateMeta = async (patch: { status?: string; priority?: string }) => {
    if (!selected) return;
    setSavingMeta(true);
    try {
      await apiClient.put(`/support/tickets/${selected.id}`, patch);
      await openTicket(selected.id); // read-back
      await loadTickets();
    } catch (err) {
      console.error('Error updating ticket:', err);
      setError('Impossible de mettre à jour le ticket.');
    } finally {
      setSavingMeta(false);
    }
  };

  const stats = {
    total: meta.total,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    waiting: tickets.filter((t) => t.status === 'WAITING_FOR_SUPPORT').length,
    urgent: tickets.filter((t) => t.priority === 'URGENT').length,
    unassigned: tickets.filter((t) => !t.assignedTo).length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-foreground">Inbox support</h1>
              <p className="text-muted-foreground mt-1">
                Tous les tickets de support, tous utilisateurs confondus.
              </p>
            </div>
          </div>
          <button
            onClick={loadTickets}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, cls: 'text-foreground' },
            { label: 'Ouverts', value: stats.open, cls: 'text-foreground' },
            { label: 'Attente support', value: stats.waiting, cls: 'text-primary' },
            { label: 'Urgents', value: stats.urgent, cls: 'text-red-600' },
            { label: 'Non assignés', value: stats.unassigned, cls: 'text-amber-600' },
            { label: 'Résolus (page)', value: stats.resolved, cls: 'text-green-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-card"
                >
                  <option value="">Tous</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Priorité</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-card"
                >
                  <option value="">Toutes</option>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Catégorie</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-card"
                >
                  <option value="">Toutes</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-sm text-muted-foreground mb-1">Recherche</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
                  placeholder="N° de ticket ou sujet"
                  className="w-full px-3 py-2 border border-border rounded-md bg-card"
                />
              </div>
              <button
                onClick={loadTickets}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Rechercher
              </button>
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                  setCategoryFilter('');
                  setSearch('');
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Réinitialiser
              </button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardContent className="p-0">
            {loading && tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Chargement…</div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg font-medium">Aucun ticket</p>
                <p className="text-sm mt-2">Aucun ticket ne correspond aux filtres.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => openTicket(ticket.id)}
                    className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {ticket.ticketNumber}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${statusColor(ticket.status)}`}>
                            {STATUS_LABEL[ticket.status] ?? ticket.status}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${priorityColor(ticket.priority)}`}>
                            {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                            {CATEGORY_LABEL[ticket.category] ?? ticket.category}
                          </span>
                        </div>
                        <h3 className="font-semibold text-foreground truncate">{ticket.subject}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{ticket.description}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {ticket.user && (
                            <span>
                              Par {ticket.user.firstName} {ticket.user.lastName}
                              {ticket.user.email ? ` (${ticket.user.email})` : ''}
                            </span>
                          )}
                          <span>
                            Assigné à{' '}
                            {ticket.assignedTo
                              ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                              : '—'}
                          </span>
                          <span>{ticket._count?.messages ?? 0} message(s)</span>
                          <span>{new Date(ticket.createdAt).toLocaleString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground mt-3">
          {tickets.length} affiché(s) sur {meta.total} au total.
        </p>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="p-6 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{selected.ticketNumber}</p>
                  <h2 className="text-xl font-semibold text-foreground">{selected.subject}</h2>
                  {selected.user && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selected.user.firstName} {selected.user.lastName}
                      {selected.user.email ? ` · ${selected.user.email}` : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                  aria-label="Fermer"
                >
                  ×
                </button>
              </div>

              {/* Status / priority controls */}
              <div className="mt-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Statut</label>
                  <select
                    value={selected.status}
                    disabled={savingMeta}
                    onChange={(e) => updateMeta({ status: e.target.value })}
                    className="px-3 py-1.5 border border-border rounded-md bg-card text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Priorité</label>
                  <select
                    value={selected.priority}
                    disabled={savingMeta}
                    onChange={(e) => updateMeta({ priority: e.target.value })}
                    className="px-3 py-1.5 border border-border rounded-md bg-card text-sm"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                {selected.slaStatus && (
                  <div className="flex gap-2 items-center">
                    <span className={`px-2 py-1 text-xs rounded ${slaColor(selected.slaStatus.firstResponse?.status)}`}>
                      1re réponse : {selected.slaStatus.firstResponse?.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${slaColor(selected.slaStatus.resolution?.status)}`}>
                      Résolution : {selected.slaStatus.resolution?.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation */}
            <div className="p-6 space-y-4">
              {detailLoading ? (
                <p className="text-muted-foreground text-center py-6">Chargement…</p>
              ) : (
                <>
                  {/* Original description */}
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Demande initiale</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selected.description}</p>
                  </div>

                  {selected.messages?.length ? (
                    selected.messages.map((m) => {
                      const fromAdmin = m.sender?.role === 'ADMIN';
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-lg ${
                            m.isInternal
                              ? 'bg-amber-50 border border-amber-200'
                              : fromAdmin
                                ? 'bg-primary/5 border border-primary/20'
                                : 'bg-background border border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : 'Système'}
                              {fromAdmin ? ' · Support' : ''}
                              {m.isInternal ? ' · Note interne' : ''}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(m.createdAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{m.content}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun message pour le moment.</p>
                  )}
                </>
              )}
            </div>

            {/* Reply box */}
            <div className="p-6 border-t border-border sticky bottom-0 bg-card">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Répondre au client…"
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-card resize-y"
              />
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  Note interne (invisible pour le client)
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={sendReply}
                    disabled={!reply.trim() || sending}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sending ? 'Envoi…' : isInternal ? 'Ajouter la note' : 'Envoyer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
