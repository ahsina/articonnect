'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { missionsApi } from '@/lib/api/missions';
import {
  quoteApi,
  num,
  type Quote,
  type QuoteStats,
  type QuoteStatus,
  type LineItemType,
  type CreateQuoteLineItemInput,
} from '@/lib/api/quote';

// ----- Libellés & couleurs de statut (devis formels) -----
const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  VIEWED: 'Vu',
  ACCEPTED: 'Accepté',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
  CONVERTED: 'Signé / Facturé',
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

const ITEM_TYPE_LABELS: Record<LineItemType, string> = {
  LABOR: "Main d'œuvre",
  MATERIAL: 'Matériel',
  TRAVEL: 'Déplacement',
  OTHER: 'Autre',
};

interface DraftLine extends CreateQuoteLineItemInput {}

interface ClientOption {
  clientId: string;
  name: string;
  missions: { id: string; title: string; category?: string; address?: string; city?: string; postalCode?: string }[];
}

const emptyLine = (): DraftLine => ({
  itemType: 'LABOR',
  description: '',
  quantity: 1,
  unitPrice: 0,
});

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function QuotationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<QuoteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | QuoteStatus>('all');

  // ----- Formulaire de création -----
  const [showCreate, setShowCreate] = useState(false);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    missionId: '',
    title: '',
    category: '',
    description: '',
    taxRate: 17,
    discountPercent: 0,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    termsAndConditions: '',
  });
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  // ----- Signature artisan -----
  const [showSignature, setShowSignature] = useState(false);
  const [signingQuote, setSigningQuote] = useState<Quote | null>(null);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([
        quoteApi.list(filter === 'all' ? undefined : filter),
        quoteApi.getStats().catch(() => null),
      ]);
      setQuotes(list.data || []);
      if (s) setStats(s);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les devis.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ----- Chargement des clients éligibles (depuis les missions de l'artisan) -----
  const openCreate = async () => {
    setShowCreate(true);
    try {
      const missions = await missionsApi.getAll();
      const list: any[] = Array.isArray(missions) ? missions : missions?.data || [];
      const byClient = new Map<string, ClientOption>();
      for (const m of list) {
        if (!user || m.artisanId !== user.id) continue;
        const cid = m.clientId;
        const c = m.client || {};
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
        if (!cid || !name || name === 'Compte supprimé') continue;
        if (!byClient.has(cid)) byClient.set(cid, { clientId: cid, name, missions: [] });
        byClient.get(cid)!.missions.push({
          id: m.id,
          title: m.title,
          category: m.category,
          address: m.address,
          city: m.city,
          postalCode: m.postalCode,
        });
      }
      setClientOptions(Array.from(byClient.values()));
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger vos clients.', variant: 'destructive' });
    }
  };

  const selectedClient = useMemo(
    () => clientOptions.find((c) => c.clientId === form.clientId) || null,
    [clientOptions, form.clientId],
  );

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0);
    const discountAmount = form.discountPercent ? subtotal * (num(form.discountPercent) / 100) : 0;
    const taxable = subtotal - discountAmount;
    const taxAmount = form.taxRate ? taxable * (num(form.taxRate) / 100) : 0;
    const total = taxable + taxAmount;
    return { subtotal, discountAmount, taxAmount, total };
  }, [lines, form.discountPercent, form.taxRate]);

  const updateLine = (idx: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const resetForm = () => {
    setForm({
      clientId: '',
      missionId: '',
      title: '',
      category: '',
      description: '',
      taxRate: 17,
      discountPercent: 0,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      termsAndConditions: '',
    });
    setLines([emptyLine()]);
  };

  const handleClientChange = (clientId: string) => {
    const opt = clientOptions.find((c) => c.clientId === clientId);
    const firstMission = opt?.missions[0];
    setForm((f) => ({
      ...f,
      clientId,
      missionId: '',
      category: f.category || firstMission?.category || '',
    }));
  };

  const handleMissionChange = (missionId: string) => {
    const mission = selectedClient?.missions.find((m) => m.id === missionId);
    setForm((f) => ({
      ...f,
      missionId,
      category: mission?.category || f.category,
      title: f.title || (mission ? `Devis — ${mission.title}` : f.title),
    }));
  };

  const canSubmit =
    !!form.clientId &&
    form.title.trim().length > 0 &&
    form.category.trim().length > 0 &&
    lines.length > 0 &&
    lines.every((l) => l.description.trim().length > 0 && num(l.quantity) > 0 && num(l.unitPrice) >= 0);

  const handleCreateAndSend = async () => {
    if (!canSubmit) {
      toast({
        title: 'Formulaire incomplet',
        description: 'Vérifiez le client, le titre, la catégorie et les lignes du devis.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const selMission = selectedClient?.missions.find((m) => m.id === form.missionId);
      const created = await quoteApi.create({
        clientId: form.clientId,
        missionId: form.missionId || undefined,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim(),
        address: selMission?.address || undefined,
        city: selMission?.city || undefined,
        postalCode: selMission?.postalCode || undefined,
        taxRate: num(form.taxRate),
        discountPercent: form.discountPercent ? num(form.discountPercent) : undefined,
        validUntil: form.validUntil,
        termsAndConditions: form.termsAndConditions.trim() || undefined,
        lineItems: lines.map((l) => ({
          itemType: l.itemType,
          description: l.description.trim(),
          quantity: num(l.quantity),
          unit: l.unit,
          unitPrice: num(l.unitPrice),
        })),
      });

      // Envoi immédiat au client (DRAFT → SENT + notification « Nouveau devis reçu »).
      await quoteApi.send(created.id);

      toast({
        title: 'Devis envoyé',
        description: `Le devis ${created.quoteNumber} a été envoyé au client.`,
        variant: 'success',
      });
      setShowCreate(false);
      resetForm();
      loadQuotes();
    } catch (error: any) {
      console.error('Erreur création devis:', error);
      toast({
        title: 'Erreur',
        description:
          error?.response?.data?.message?.toString() || "Impossible de créer le devis.",
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Signature (artisan) -----
  const openSignature = (quote: Quote) => {
    setSigningQuote(quote);
    setHasDrawn(false);
    setShowSignature(true);
  };
  const closeSignature = () => {
    setShowSignature(false);
    setSigningQuote(null);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };
  const clearCanvas = () => {
    setHasDrawn(false);
    initCanvas();
  };
  const pos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  };
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const stopDrawing = () => setIsDrawing(false);

  useEffect(() => {
    if (showSignature) setTimeout(initCanvas, 80);
  }, [showSignature]);

  const handleSign = async () => {
    if (!signingQuote) return;
    if (!hasDrawn) {
      toast({ title: 'Signature requise', description: 'Veuillez dessiner votre signature.', variant: 'destructive' });
      return;
    }
    setSigning(true);
    try {
      const signatureImage = canvasRef.current!.toDataURL('image/png');
      // Champs EXACTS du backend : signatureImage / signatureType / signerRole.
      await quoteApi.sign(signingQuote.id, {
        signatureImage,
        signatureType: 'DRAWN',
        signerRole: 'ARTISAN',
      });
      toast({ title: 'Devis signé', description: 'Votre signature a été enregistrée.', variant: 'success' });
      closeSignature();
      loadQuotes();
    } catch (error: any) {
      console.error('Erreur signature:', error);
      toast({
        title: 'Erreur',
        description: error?.response?.data?.message?.toString() || 'Échec de la signature.',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  const FILTERS: ('all' | QuoteStatus)[] = ['all', 'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'CONVERTED'];

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">Devis</h1>
          <p className="text-muted-foreground">Créez, envoyez et suivez vos devis formels signés.</p>
        </div>
        <Button onClick={openCreate}>+ Créer un devis</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
          <div className="text-sm text-muted-foreground">Total devis</div>
          <div className="font-display text-2xl font-extrabold text-foreground mt-1">{stats?.total ?? '—'}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
          <div className="text-sm text-muted-foreground">Envoyés</div>
          <div className="font-display text-2xl font-extrabold text-foreground mt-1">{stats?.sent ?? '—'}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
          <div className="text-sm text-muted-foreground">Acceptés</div>
          <div className="font-display text-2xl font-extrabold text-foreground mt-1">{stats?.accepted ?? '—'}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
          <div className="text-sm text-muted-foreground">Chiffre accepté</div>
          <div className="font-display text-2xl font-extrabold text-success mt-1">
            {stats ? formatCurrency(num(stats.totalAcceptedValue)) : '—'}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-9 px-4 rounded-full border text-sm font-semibold transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted'
            }`}
          >
            {f === 'all' ? 'Tous' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-6 pt-5 pb-1">
          <h3 className="font-display text-lg font-bold text-foreground">Mes devis</h3>
        </div>
        <div className="px-4 pb-5">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement…</div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Aucun devis pour le moment.</p>
              <p className="text-sm mt-2">Cliquez sur « Créer un devis » pour en envoyer un.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quotes.map((q) => {
                const clientName = q.client
                  ? [q.client.firstName, q.client.lastName].filter(Boolean).join(' ')
                  : '—';
                return (
                  <div key={q.id} className="flex items-start gap-4 p-4 border border-border rounded-xl hover:bg-muted/40 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2.5 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{q.quoteNumber}</span>
                        <h4 className="font-semibold text-foreground truncate">{q.title}</h4>
                        <Badge className={STATUS_COLORS[q.status]}>{STATUS_LABELS[q.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Client : {clientName}</p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Créé le {formatDate(q.createdAt)}</span>
                        <span>Valide jusqu&apos;au {formatDate(q.validUntil)}</span>
                        <span>{q.lineItems?.length ?? 0} ligne(s)</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-[150px]">
                      <div className="font-display text-xl font-extrabold text-foreground">{formatCurrency(num(q.totalAmount))}</div>
                      <div className="text-xs text-muted-foreground">TVA {num(q.taxRate)}%</div>
                      <div className="flex flex-col gap-2 mt-3">
                        {q.status === 'SENT' && (
                          <Button size="sm" onClick={() => openSignature(q)}>Signer (pro)</Button>
                        )}
                        <a href={quoteApi.pdfUrl(q.id)} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="w-full">Télécharger le PDF</Button>
                        </a>
                        {q.missionId && (
                          <Link href={`/artisan/missions/${q.missionId}`}>
                            <Button variant="outline" size="sm" className="w-full">Voir mission</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Modal création ---------- */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-lg max-w-2xl w-full my-8 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Nouveau devis</h3>
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>

            {clientOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Aucun client éligible. Un devis ne peut être adressé qu&apos;à un client avec lequel vous
                avez déjà une mission ou une négociation.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Client + mission */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Client *</label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={form.clientId}
                      onChange={(e) => handleClientChange(e.target.value)}
                    >
                      <option value="">— Sélectionner —</option>
                      {clientOptions.map((c) => (
                        <option key={c.clientId} value={c.clientId}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Mission liée (optionnel)</label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                      value={form.missionId}
                      onChange={(e) => handleMissionChange(e.target.value)}
                      disabled={!selectedClient}
                    >
                      <option value="">Aucune (devis libre)</option>
                      {selectedClient?.missions.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Titre + catégorie */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Titre *</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex. Rénovation salle de bain"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Catégorie *</label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="Ex. PLUMBING"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Description (optionnel)</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                {/* Lignes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Lignes du devis *</label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>+ Ligne</Button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((l, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                        <select
                          className="col-span-3 h-9 rounded-md border border-input bg-background px-2 text-xs"
                          value={l.itemType}
                          onChange={(e) => updateLine(idx, { itemType: e.target.value as LineItemType })}
                        >
                          {(Object.keys(ITEM_TYPE_LABELS) as LineItemType[]).map((t) => (
                            <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                        <Input
                          className="col-span-4 h-9"
                          placeholder="Description"
                          value={l.description}
                          onChange={(e) => updateLine(idx, { description: e.target.value })}
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="col-span-2 h-9"
                          placeholder="Qté"
                          value={l.quantity}
                          onChange={(e) => updateLine(idx, { quantity: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="col-span-2 h-9"
                          placeholder="PU €"
                          value={l.unitPrice}
                          onChange={(e) => updateLine(idx, { unitPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="col-span-1 h-9 text-muted-foreground hover:text-red-600 disabled:opacity-30"
                          disabled={lines.length <= 1}
                          aria-label="Supprimer la ligne"
                        >
                          ×
                        </button>
                        <div className="col-span-12 text-right text-xs text-muted-foreground -mt-1">
                          Sous-total ligne : {formatCurrency(num(l.quantity) * num(l.unitPrice))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TVA / remise / validité */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">TVA (%)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      value={form.taxRate}
                      onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Remise (%)</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      value={form.discountPercent}
                      onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value === '' ? 0 : parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Valide jusqu&apos;au</label>
                    <Input
                      type="date"
                      value={form.validUntil}
                      onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Totaux calculés */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sous-total</span><span className="font-medium">{formatCurrency(totals.subtotal)}</span></div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Remise</span><span className="font-medium text-red-600">-{formatCurrency(totals.discountAmount)}</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-muted-foreground">TVA ({num(form.taxRate)}%)</span><span className="font-medium">{formatCurrency(totals.taxAmount)}</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Total TTC</span><span className="font-bold text-primary text-base">{formatCurrency(totals.total)}</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Conditions (optionnel)</label>
                  <Textarea
                    value={form.termsAndConditions}
                    onChange={(e) => setForm((f) => ({ ...f, termsAndConditions: e.target.value }))}
                    rows={2}
                    placeholder="Acompte, délais, garanties…"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
                  <Button onClick={handleCreateAndSend} disabled={submitting || !canSubmit}>
                    {submitting ? 'Envoi…' : 'Créer et envoyer'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Modal signature artisan ---------- */}
      {showSignature && signingQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-foreground">Signer le devis</h3>
              <button onClick={closeSignature} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">{signingQuote.quoteNumber}</div>
              <div className="font-medium text-foreground">{signingQuote.title}</div>
              <div className="text-lg font-bold text-primary mt-1">{formatCurrency(num(signingQuote.totalAmount))}</div>
            </div>
            <label className="block text-sm font-medium text-foreground mb-2">Dessinez votre signature :</label>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={440}
                height={150}
                className="w-full cursor-crosshair touch-none bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-2">Effacer</Button>
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={closeSignature}>Annuler</Button>
              <Button onClick={handleSign} disabled={signing}>{signing ? 'Signature…' : 'Confirmer'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
