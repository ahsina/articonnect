'use client';

import { useState, useEffect, useCallback } from 'react';
import { notificationsApi, Notification } from '../api/notifications';
import { useNotificationSocket } from './useNotificationSocket';

// Repli sans socket : on rafraîchit à la fois la liste ET le compteur (25 s) pour que la
// cloche se mette à jour même si le WebSocket est indisponible.
export function useNotifications(autoRefresh = true, refreshInterval = 25000) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Socket temps réel (badge + liste en direct) ; en cas d'échec, le polling ci-dessous couvre.
  const { onNotification, unreadCount: socketUnreadCount } = useNotificationSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll(20);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.delete(notificationId);
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    const init = async () => {
      await refresh();
      setLoading(false);
    };
    init();
  }, [refresh]);

  // Repli polling : rafraîchit liste + compteur toutes les 25 s (même sans socket).
  useEffect(() => {
    if (autoRefresh && !loading) {
      const interval = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, loading, refreshInterval, fetchNotifications, fetchUnreadCount]);

  // Temps réel : une nouvelle notification poussée par le socket est ajoutée en tête de liste
  // et incrémente le badge immédiatement. Dédup par id pour ne pas doubler si un poll la renvoie.
  useEffect(() => {
    const unsubscribe = onNotification((incoming) => {
      if (!incoming || !incoming.id) return;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev; // déjà présente → pas de doublon
        return [incoming, ...prev];
      });
      if (!incoming.read) {
        setUnreadCount((prev) => prev + 1);
      }
    });
    return unsubscribe;
  }, [onNotification]);

  // Compteur non-lus poussé par le serveur (source de vérité quand le socket est actif).
  useEffect(() => {
    if (typeof socketUnreadCount === 'number') {
      setUnreadCount(socketUnreadCount);
    }
  }, [socketUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}
