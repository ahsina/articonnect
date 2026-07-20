'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Search, X, Send } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

function statusColor(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'OPEN':
      return 'warning';
    case 'IN_PROGRESS':
      return 'info';
    case 'WAITING_FOR_CUSTOMER':
      return 'secondary';
    case 'WAITING_FOR_SUPPORT':
      return 'warning';
    case 'RESOLVED':
      return 'success';
    case 'CLOSED':
      return 'secondary';
    default:
      return 'secondary';
  }
}
function priorityColor(priority: string): BadgeProps['variant'] {
  switch (priority) {
    case 'URGENT':
      return 'destructive';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
      return 'success';
    default:
      return 'secondary';
  }
}
function slaColor(status?: string): BadgeProps['variant'] {
  switch (status) {
    case 'BREACHED':
      return 'error';
    case 'AT_RISK':
      return 'warning';
    default:
      return 'success';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/admin/admin/dashboard')}
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Inbox support
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tous les tickets de support, tous utilisateurs confondus.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={loadTickets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, cls: 'text-foreground' },
          { label: 'Ouverts', value: stats.open, cls: 'text-foreground' },
          { label: 'Attente support', value: stats.waiting, cls: 'text-warning' },
          { label: 'Urgents', value: stats.urgent, cls: 'text-destructive' },
          { label: 'Non assignés', value: stats.unassigned, cls: 'text-warning' },
          { label: 'Résolus (page)', value: stats.resolved, cls: 'text-success' },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className={`mt-2 font-display text-3xl font-extrabold tracking-tight ${s.cls}`}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Statut
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Priorité
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Catégorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground"
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
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Recherche
              </label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
                placeholder="N° de ticket ou sujet"
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Button onClick={loadTickets}>Rechercher</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
                setSearch('');
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading && tickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
          ) : tickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <p className="font-display text-lg font-semibold text-foreground">Aucun ticket</p>
              <p className="mt-2">Aucun ticket ne correspond aux filtres.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => openTicket(ticket.id)}
                  className="w-full text-left p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {ticket.ticketNumber}
                        </span>
                        <Badge variant={statusColor(ticket.status)}>
                          {STATUS_LABEL[ticket.status] ?? ticket.status}
                        </Badge>
                        <Badge variant={priorityColor(ticket.priority)}>
                          {PRIORITY_LABEL[ticket.priority] ?? ticket.priority}
                        </Badge>
                        <Badge variant="outline">
                          {CATEGORY_LABEL[ticket.category] ?? ticket.category}
                        </Badge>
                      </div>
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {ticket.description}
                      </p>
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
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        {tickets.length} affiché(s) sur {meta.total} au total.
      </p>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
            {/* Modal header */}
            <div className="border-b border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{selected.ticketNumber}</p>
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                    {selected.subject}
                  </h2>
                  {selected.user && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.user.firstName} {selected.user.lastName}
                      {selected.user.email ? ` · ${selected.user.email}` : ''}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelected(null)}
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Status / priority controls */}
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Statut
                  </label>
                  <select
                    value={selected.status}
                    disabled={savingMeta}
                    onChange={(e) => updateMeta({ status: e.target.value })}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground disabled:opacity-50"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Priorité
                  </label>
                  <select
                    value={selected.priority}
                    disabled={savingMeta}
                    onChange={(e) => updateMeta({ priority: e.target.value })}
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground disabled:opacity-50"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                {selected.slaStatus && (
                  <div className="flex items-center gap-2">
                    <Badge variant={slaColor(selected.slaStatus.firstResponse?.status)}>
                      1re réponse : {selected.slaStatus.firstResponse?.status}
                    </Badge>
                    <Badge variant={slaColor(selected.slaStatus.resolution?.status)}>
                      Résolution : {selected.slaStatus.resolution?.status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Conversation */}
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Chargement…</div>
              ) : (
                <>
                  {/* Original description */}
                  <div className="rounded-2xl border border-border bg-muted p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Demande initiale</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {selected.description}
                    </p>
                  </div>

                  {selected.messages?.length ? (
                    selected.messages.map((m) => {
                      const fromAdmin = m.sender?.role === 'ADMIN';
                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl p-3 ${
                            m.isInternal
                              ? 'border border-warning/30 bg-warning/10'
                              : fromAdmin
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span
                              className={`text-xs font-medium ${
                                fromAdmin && !m.isInternal
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : 'Système'}
                              {fromAdmin ? ' · Support' : ''}
                              {m.isInternal ? ' · Note interne' : ''}
                            </span>
                            <span
                              className={`text-xs ${
                                fromAdmin && !m.isInternal
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {new Date(m.createdAt).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm">{m.content}</p>
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
            <div className="border-t border-border bg-card p-4">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Répondre au client…"
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-foreground resize-y"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  Note interne (invisible pour le client)
                </label>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    Fermer
                  </Button>
                  <Button onClick={sendReply} disabled={!reply.trim() || sending}>
                    <Send className="h-4 w-4" />
                    {sending ? 'Envoi…' : isInternal ? 'Ajouter la note' : 'Envoyer'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
