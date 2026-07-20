'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/lib/api/client';

// Forme EXACTE renvoyée par le backend (SessionInfo, cf. GET /sessions).
// Vérifiée par curl : { sessions: SessionDevice[] } et GET /sessions/current : { session }.
interface SessionDevice {
  id: string;
  userId: string;
  deviceInfo: {
    type: 'MOBILE' | 'WEB' | 'TABLET' | 'DESKTOP';
    browser?: string;
    os?: string;
    ipAddress: string;
  };
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  isActive: boolean;
}

const DEVICE_ICON: Record<SessionDevice['deviceInfo']['type'], string> = {
  MOBILE: '📱',
  TABLET: '📲',
  DESKTOP: '💻',
  WEB: '🖥️',
};

const DEVICE_LABEL: Record<SessionDevice['deviceInfo']['type'], string> = {
  MOBILE: 'Mobile',
  TABLET: 'Tablette',
  DESKTOP: 'Ordinateur',
  WEB: 'Navigateur web',
};

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deviceDescription(s: SessionDevice): string {
  const parts: string[] = [];
  if (s.deviceInfo.browser) parts.push(s.deviceInfo.browser);
  if (s.deviceInfo.os) parts.push(s.deviceInfo.os);
  const detail = parts.join(' · ');
  return detail
    ? `${DEVICE_LABEL[s.deviceInfo.type]} — ${detail}`
    : DEVICE_LABEL[s.deviceInfo.type];
}

export default function ClientDevicesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionDevice[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const [listRes, currentRes] = await Promise.all([
        apiClient.get<{ sessions: SessionDevice[] }>('/sessions'),
        apiClient
          .get<{ session: SessionDevice | null }>('/sessions/current')
          .catch(() => ({ data: { session: null } })),
      ]);

      const list = Array.isArray(listRes.data?.sessions) ? listRes.data.sessions : [];
      // Tri : appareil courant en premier, puis par dernière activité décroissante.
      const current = currentRes.data?.session?.id ?? null;
      list.sort((a, b) => {
        if (a.id === current) return -1;
        if (b.id === current) return 1;
        return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
      });

      setSessions(list);
      setCurrentId(current);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger vos appareils connectés.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (id: string) => {
    if (id === currentId) return;
    setRevoking(id);
    try {
      await apiClient.delete(`/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Appareil déconnecté', description: 'La session a été révoquée.' });
    } catch (error) {
      console.error('Error revoking session:', error);
      toast({
        title: 'Erreur',
        description: 'La révocation a échoué. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (!confirm('Déconnecter tous les autres appareils ? Vous resterez connecté sur celui-ci.'))
      return;
    setRevokingOthers(true);
    try {
      await apiClient.delete('/sessions/all/except-current');
      await loadSessions();
      toast({
        title: 'Terminé',
        description: 'Tous les autres appareils ont été déconnectés.',
      });
    } catch (error) {
      console.error('Error revoking other sessions:', error);
      toast({
        title: 'Erreur',
        description: 'L\'opération a échoué. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setRevokingOthers(false);
    }
  };

  const otherCount = sessions.filter((s) => s.id !== currentId).length;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Retour aux réglages
        </button>

        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground mb-6">
          Appareils connectés
        </h1>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="font-display">Vos sessions actives</CardTitle>
            <CardDescription>
              Voici les appareils actuellement connectés à votre compte. Si vous ne reconnaissez
              pas un appareil, déconnectez-le et changez votre mot de passe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-muted-foreground py-6 text-center">Chargement…</div>
            ) : sessions.length === 0 ? (
              <div className="text-muted-foreground py-6 text-center">
                Aucun appareil connecté.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {sessions.map((s) => {
                    const isCurrent = s.id === currentId;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-start gap-4 p-4 rounded-2xl border ${
                          isCurrent ? 'border-foreground bg-muted' : 'border-border'
                        }`}
                      >
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl leading-none"
                          aria-hidden
                        >
                          {DEVICE_ICON[s.deviceInfo.type]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-foreground">
                              {deviceDescription(s)}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center rounded-full bg-foreground text-background text-[11px] font-bold px-2.5 py-0.5">
                                Cet appareil
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            <div>
                              IP : <span className="font-medium text-foreground">{s.deviceInfo.ipAddress || '—'}</span>
                            </div>
                            <div>
                              Connecté le <span className="font-medium text-foreground">{formatDate(s.createdAt)}</span>
                              {' · '}Dernière activité{' '}
                              <span className="font-medium text-foreground">{formatDate(s.lastAccessedAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-auto shrink-0 flex items-center">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <span className="h-2 w-2 rounded-full bg-success" />
                              Actif
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => handleRevoke(s.id)}
                              disabled={revoking === s.id}
                            >
                              {revoking === s.id ? 'Révocation…' : 'Déconnecter'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {otherCount > 0 && (
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                      variant="destructive"
                      onClick={handleRevokeOthers}
                      disabled={revokingOthers}
                    >
                      {revokingOthers
                        ? 'Déconnexion…'
                        : 'Déconnecter tous les autres appareils'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
