'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Send, Users, Info } from 'lucide-react';
import apiClient from '@/lib/api/client';

// ----- Audience (miroir de CreateAnnouncementDto.audience côté backend) -----
const AUDIENCES = [
  { value: 'ALL', label: 'Tous les utilisateurs' },
  { value: 'CLIENT', label: 'Clients uniquement' },
  { value: 'ARTISAN', label: 'Artisans uniquement' },
] as const;

type Audience = (typeof AUDIENCES)[number]['value'];

interface BroadcastResult {
  success: boolean;
  audience: Audience;
  total: number;
  successful: number;
  failed: number;
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [audience, setAudience] = useState<Audience>('ALL');

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const canSend = title.trim().length >= 3 && message.trim().length >= 3 && !sending;

  const audienceLabel =
    AUDIENCES.find((a) => a.value === audience)?.label ?? 'Tous les utilisateurs';

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setLink('');
    setAudience('ALL');
  };

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await apiClient.post('/admin/announcements', {
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || undefined,
        audience,
      });
      setResult(res.data as BroadcastResult);
      setConfirming(false);
      resetForm();
    } catch (err: any) {
      console.error('Error broadcasting announcement:', err);
      if (err.response?.status === 403) {
        router.push('/');
        return;
      }
      const msg =
        err.response?.data?.message ||
        "Impossible d'envoyer l'annonce. Réessayez.";
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/admin/dashboard')}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Annonces
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Diffusez un message (maintenance, information globale) aux utilisateurs de la
                plateforme.
              </p>
            </div>
          </div>
        </div>

        {/* Success banner */}
        {result && (
          <div className="mb-6 rounded-2xl border border-success/30 bg-success/10 p-4">
            <p className="font-semibold text-success">Annonce envoyée</p>
            <p className="mt-1 text-sm text-success/90">
              {result.successful} notification(s) livrée(s)
              {result.failed > 0 ? `, ${result.failed} échec(s)` : ''} sur {result.total}{' '}
              destinataire(s).
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Info note */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-muted p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            Chaque destinataire reçoit une notification (visible dans la cloche) et une alerte
            temps réel s’il est connecté. Action tracée dans le journal d’audit.
          </p>
        </div>

        {/* Form card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display font-semibold text-foreground">Nouvelle annonce</h2>
            <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
              Notification in-app
            </span>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {/* Titre */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Titre <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Ex : Maintenance planifiée ce soir"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground focus:border-foreground focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">{title.length}/120 caractères</p>
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Message <span className="text-destructive">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Le contenu de votre annonce…"
                className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-foreground focus:border-foreground focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">{message.length}/1000</p>
            </div>

            {/* Lien */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Lien (optionnel)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={500}
                placeholder="Ex : /maintenance"
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-foreground focus:border-foreground focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Ouvert au clic sur la notification.
              </p>
            </div>

            {/* Destinataires */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Destinataires
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {AUDIENCES.map((a) => {
                  const selected = audience === a.value;
                  return (
                    <label
                      key={a.value}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                        selected
                          ? 'border-foreground bg-muted text-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="audience"
                        value={a.value}
                        checked={selected}
                        onChange={(e) => setAudience(e.target.value as Audience)}
                        className="accent-foreground"
                      />
                      {a.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setError(null);
                  setResult(null);
                  setConfirming(true);
                }}
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Envoyer l’annonce
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="border-b border-border p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                <Users className="h-5 w-5" />
                Confirmer la diffusion
              </h2>
            </div>
            <div className="space-y-3 p-6">
              <p className="text-sm text-muted-foreground">
                Cette annonce sera envoyée à :{' '}
                <strong className="text-foreground">{audienceLabel}</strong>. Cette action est
                irréversible.
              </p>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="font-semibold text-foreground">{title}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="inline-flex items-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Envoi…' : 'Confirmer et envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
