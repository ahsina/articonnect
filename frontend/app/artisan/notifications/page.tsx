'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notificationsApi, Notification } from '@/lib/api/notifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Coins, CheckCircle2, XCircle, Briefcase, BadgeCheck, CreditCard, Star,
  MessageSquare, AtSign, Clock, AlertTriangle, ShieldCheck, ShieldAlert,
  Navigation, Bell, type LucideIcon,
} from 'lucide-react';

// Mappe un `type` de notification (enum backend NotificationType) → icône + couleur.
// Cohérent avec components/notifications/NotificationBell.tsx :
// offre/négociation → bleu · paiement → noir · acceptée/validée → vert ·
// avertissement/tracking → ambre · message → violet · refus/annulation → rouge · défaut → gris.
interface NotifVisual {
  Icon: LucideIcon;
  color: string;
  bg: string;
}

const NOTIFICATION_VISUALS: Record<string, NotifVisual> = {
  NEGOTIATION_NEW: { Icon: Coins, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  NEW_MISSION: { Icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  NEGOTIATION_ACCEPTED: { Icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  MISSION_ACCEPTED: { Icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  MISSION_COMPLETED: { Icon: BadgeCheck, color: 'text-success', bg: 'bg-success/10' },
  KYC_VERIFIED: { Icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10' },
  NEGOTIATION_REJECTED: { Icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  MISSION_CANCELLED: { Icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  CERTIFICATION_EXPIRED: { Icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  PAYMENT_RECEIVED: { Icon: CreditCard, color: 'text-foreground', bg: 'bg-foreground/10' },
  MESSAGE_NEW: { Icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  CHAT_MESSAGE: { Icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  CHAT_MENTION: { Icon: AtSign, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  REVIEW_NEW: { Icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
  CERTIFICATION_EXPIRING: { Icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  KYC_REQUIRES_INPUT: { Icon: ShieldAlert, color: 'text-warning', bg: 'bg-warning/10' },
  TRACKING_UPDATE: { Icon: Navigation, color: 'text-warning', bg: 'bg-warning/10' },
  MISSION_EN_ROUTE: { Icon: Navigation, color: 'text-warning', bg: 'bg-warning/10' },
};

const DEFAULT_VISUAL: NotifVisual = { Icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' };

function getNotificationVisual(type: string): NotifVisual {
  return NOTIFICATION_VISUALS[type] || DEFAULT_VISUAL;
}

export default function ArtisanNotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Texte : privilégie le namespace i18n « notifications », sinon FR direct.
  const humanizeKey = (s: string): string =>
    s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  const td = (key: string, fr: string): string => {
    const v = t('notifications', key);
    return v === humanizeKey(key) ? fr : v;
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getAll(50, false);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(
        notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      toast({
        title: t('common', 'success'),
        description: td('allMarkedRead', 'Tout marqué comme lu'),
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    // Route vers le lien de la notif, sinon reste sur la liste artisan.
    router.push(notification.link || '/artisan/notifications');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes} min`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else if (days < 7) {
      return `${days}j`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{t('common', 'loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          {t('common', 'back')}
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{td('title', 'Notifications')}</h1>
            {unreadCount > 0 && (
              <p className="text-muted-foreground mt-1">
                {unreadCount} {td('unread', 'non lues')}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              {td('markAllRead', 'Tout marquer comme lu')}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {t('common', 'all')} ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            {td('unread', 'non lues')} ({unreadCount})
          </Button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="h-7 w-7" />
                </span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {td('noNotifications', 'Aucune notification')}
              </h3>
              <p className="text-muted-foreground">
                {td('noNotificationsDesc', "Vous n'avez aucune notification pour le moment")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const visual = getNotificationVisual(notification.type);
              const Icon = visual.Icon;
              return (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-colors ${
                    !notification.read ? 'bg-primary/5 border-primary/20' : 'hover:bg-accent'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <span
                        className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${visual.bg} ${visual.color}`}
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-foreground">{notification.title}</h4>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                        {!notification.read && (
                          <Badge className="mt-2 bg-primary">{td('new', 'Nouveau')}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
