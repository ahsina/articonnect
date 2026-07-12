'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Send, Users, Info } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/admin/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Retour
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Annonces plateforme</h1>
              <p className="text-muted-foreground mt-1">
                Diffusez un message (maintenance, information globale) à tous les utilisateurs.
              </p>
            </div>
          </div>
        </div>

        {/* Success banner */}
        {result && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <p className="font-medium text-green-800">Annonce envoyée</p>
              <p className="text-sm text-green-700 mt-1">
                {result.successful} notification(s) livrée(s)
                {result.failed > 0 ? `, ${result.failed} échec(s)` : ''} sur{' '}
                {result.total} destinataire(s).
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Info note */}
        <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-muted text-sm text-muted-foreground">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p>
            Chaque destinataire reçoit une notification (visible dans la cloche) et une
            alerte temps réel s’il est connecté. Action tracée dans le journal d’audit.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Ex : Maintenance planifiée ce soir"
                className="w-full px-3 py-2 border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/120</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                rows={5}
                placeholder="Le contenu de votre annonce…"
                className="w-full px-3 py-2 border border-border rounded-md bg-card resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/1000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Lien (optionnel)
              </label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                maxLength={500}
                placeholder="Ex : /maintenance"
                className="w-full px-3 py-2 border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ouvert au clic sur la notification.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Destinataires
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className="w-full px-3 py-2 border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setError(null);
                  setResult(null);
                  setConfirming(true);
                }}
                disabled={!canSend}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Envoyer l’annonce
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5" />
                Confirmer la diffusion
              </h2>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Cette annonce sera envoyée à : <strong className="text-foreground">{audienceLabel}</strong>.
                Cette action est irréversible.
              </p>
              <div className="p-3 rounded-lg bg-background border border-border">
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{message}</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
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
