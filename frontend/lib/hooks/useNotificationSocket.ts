'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Notification } from '../api/notifications';

/**
 * Socket temps réel pour les notifications (namespace `notifications`).
 *
 * Se connecte comme le chat (`useSocket`) : mêmes cookies httpOnly (`withCredentials`),
 * la gateway lit le token dans le cookie `accessToken`. On ajoute simplement le namespace
 * `/notifications` à l'URL et on autorise le transport `polling` en repli (environnements
 * proxifiés où le WebSocket brut ne passe pas).
 *
 * Ce hook ne doit JAMAIS faire planter la page : tout est en try/catch et une erreur de
 * connexion laisse simplement `connected=false` (le polling des écrans prend le relais).
 *
 * Événements serveur écoutés :
 *  - `new_notification`  → un objet notification
 *  - `unread_count`      → { count }
 *  - `notifications_sync`→ { notifications }
 *
 * API exposée :
 *  - connected        : booléen d'état de connexion
 *  - lastNotification : dernière notification reçue (pour usage réactif simple)
 *  - unreadCount      : dernier compteur non-lus poussé par le serveur (null si jamais reçu)
 *  - onNotification(cb): abonnement — renvoie une fonction de désabonnement. Plusieurs
 *                        consommateurs peuvent s'abonner simultanément (registre de refs).
 */

export interface UseNotificationSocketResult {
  connected: boolean;
  lastNotification: Notification | null;
  unreadCount: number | null;
  onNotification: (cb: (n: Notification) => void) => () => void;
}

export function useNotificationSocket(): UseNotificationSocketResult {
  const [connected, setConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const socketRef = useRef<Socket | null>(null);
  // Registre d'abonnés : chaque écran/consommateur peut réagir aux nouvelles notifications.
  const listenersRef = useRef<Set<(n: Notification) => void>>(new Set());

  const onNotification = useCallback((cb: (n: Notification) => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  useEffect(() => {
    let socket: Socket | null = null;

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      // Namespace `notifications` (mêmes cookies que le chat, transport WS + repli polling).
      socket = io(`${base}/notifications`, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setConnected(true);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      // Erreur de connexion : on reste déconnecté sans planter — le polling couvre l'UX.
      socket.on('connect_error', () => {
        setConnected(false);
      });

      socket.on('new_notification', (payload: Notification) => {
        try {
          if (!payload) return;
          setLastNotification(payload);
          listenersRef.current.forEach((cb) => {
            try {
              cb(payload);
            } catch {
              /* un abonné défaillant ne doit pas casser les autres */
            }
          });
        } catch {
          /* jamais planter sur un payload inattendu */
        }
      });

      socket.on('unread_count', (payload: { count?: number }) => {
        if (payload && typeof payload.count === 'number') {
          setUnreadCount(payload.count);
        }
      });

      socket.on('notifications_sync', (payload: { notifications?: Notification[] }) => {
        // Sync initial : on remonte la plus récente comme "dernière" pour les consommateurs
        // qui ne s'appuient que sur lastNotification (le bell garde sa propre liste via fetch).
        if (payload && Array.isArray(payload.notifications) && payload.notifications.length > 0) {
          setLastNotification(payload.notifications[0]);
        }
      });

      socketRef.current = socket;
    } catch {
      // Impossible d'initialiser le socket → on reste en mode dégradé (polling).
      setConnected(false);
    }

    return () => {
      try {
        socket?.disconnect();
      } catch {
        /* noop */
      }
      socketRef.current = null;
    };
  }, []);

  return { connected, lastNotification, unreadCount, onNotification };
}
