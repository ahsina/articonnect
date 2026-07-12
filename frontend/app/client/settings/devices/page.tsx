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
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          Retour
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-6">Appareils connectés</h1>

        <Card>
          <CardHeader>
            <CardTitle>Vos sessions actives</CardTitle>
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
                        className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="text-2xl leading-none" aria-hidden>
                            {DEVICE_ICON[s.deviceInfo.type]}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">
                                {deviceDescription(s)}
                              </span>
                              {isCurrent && (
                                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-2 py-0.5">
                                  Cet appareil
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                              <div>IP : {s.deviceInfo.ipAddress || '—'}</div>
                              <div>Connecté le : {formatDate(s.createdAt)}</div>
                              <div>Dernière activité : {formatDate(s.lastAccessedAt)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isCurrent ? (
                            <span className="text-sm text-muted-foreground">Actif</span>
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
                  <div className="flex justify-end pt-2 border-t border-border">
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
