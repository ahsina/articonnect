'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { Badge } from '../ui/badge';
import { NotificationSkeleton } from '../ui/skeleton';
import {
  Coins, CheckCircle2, XCircle, Briefcase, BadgeCheck, CreditCard, Star,
  MessageSquare, AtSign, Clock, AlertTriangle, ShieldCheck, ShieldAlert,
  Navigation, Bell, type LucideIcon,
} from 'lucide-react';

// Mappe un `type` de notification (enum backend NotificationType) vers une icône lucide et
// une couleur, pour que chaque notification soit identifiable d'un coup d'œil.
// Couleurs (selon la maquette) : offre/négociation → bleu · paiement → noir ·
// mission acceptée/validée → vert · en route/tracking + avertissements → ambre ·
// message → violet · refus/annulation → rouge · défaut/système → gris.
interface NotifVisual {
  Icon: LucideIcon;
  color: string; // classe texte (couleur de l'icône)
  bg: string;    // classe fond de la pastille d'icône
}

const NOTIFICATION_VISUALS: Record<string, NotifVisual> = {
  // Offres / négociation → bleu
  NEGOTIATION_NEW: { Icon: Coins, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  NEW_MISSION: { Icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  // Acceptations / validations → vert
  NEGOTIATION_ACCEPTED: { Icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  MISSION_ACCEPTED: { Icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  MISSION_COMPLETED: { Icon: BadgeCheck, color: 'text-success', bg: 'bg-success/10' },
  KYC_VERIFIED: { Icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10' },
  // Refus / annulations → rouge
  NEGOTIATION_REJECTED: { Icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  MISSION_CANCELLED: { Icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  CERTIFICATION_EXPIRED: { Icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  // Paiement → noir
  PAYMENT_RECEIVED: { Icon: CreditCard, color: 'text-foreground', bg: 'bg-foreground/10' },
  // Messages → violet
  MESSAGE_NEW: { Icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  CHAT_MESSAGE: { Icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  CHAT_MENTION: { Icon: AtSign, color: 'text-violet-600', bg: 'bg-violet-500/10' },
  // Avertissements / tracking → ambre
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

// `align` = bord d'ancrage du panneau par rapport à la cloche :
//  - 'right' (défaut) : le panneau s'ouvre vers la GAUCHE (bord droit aligné). Correct depuis une
//    top-bar/Navbar où la cloche est à DROITE de l'écran (client, Navbar, top-bar mobile artisan).
//  - 'left' : le panneau s'ouvre vers la DROITE (bord gauche aligné). Nécessaire depuis la SIDEBAR
//    artisan (cloche à gauche/étroite) : avec 'right', un panneau de 384px déborderait hors écran.
// La largeur est bornée par la fenêtre (jamais plus large que le viewport) et la hauteur est plafonnée
// au viewport avec scroll interne — robuste quel que soit le contexte (sidebar étroite ou top-bar).
export function NotificationBell({ align = 'right' }: { align?: 'left' | 'right' } = {}) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Page « liste complète » selon le rôle courant (fallback public /notifications).
  const listHref =
    user?.role === 'ARTISAN'
      ? '/artisan/notifications'
      : user?.role === 'CLIENT'
        ? '/client/notifications'
        : '/notifications';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
    // Route vers le lien de la notif, sinon vers la page liste du rôle (robuste si link absent).
    router.push(notification.link || listHref);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notificationBell', 'justNow') || 'À l\'instant';
    if (diffMins < 60) return `${t('notificationBell', 'minutesAgo') || 'Il y a'} ${diffMins} min`;
    if (diffHours < 24) return `${t('notificationBell', 'hoursAgo') || 'Il y a'} ${diffHours}h`;
    if (diffDays < 7) return `${t('notificationBell', 'daysAgo') || 'Il y a'} ${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label={`${t('notificationBell', 'notifications') || 'Notifications'}${unreadCount > 0 ? ` (${unreadCount} ${t('notificationBell', 'unread') || 'non lues'})` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-[min(24rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] max-h-[85vh] flex flex-col bg-card rounded-lg shadow-xl border border-border z-50`}
          role="dialog"
          aria-label={t('notificationBell', 'panelLabel') || 'Panneau de notifications'}
        >
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">{t('notificationBell', 'notifications') || 'Notifications'}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-primary hover:text-primary"
              >
                {t('notificationBell', 'markAllRead') || 'Tout marquer comme lu'}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <NotificationSkeleton />
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-2xl mb-2">🔔</p>
                <p>{t('notificationBell', 'empty') || 'Aucune notification'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => {
                  const visual = getNotificationVisual(notification.type);
                  const Icon = visual.Icon;
                  return (
                  <div
                    key={notification.id}
                    className={`relative p-4 hover:bg-accent cursor-pointer transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Pastille « non lu » (barre latérale) */}
                    {!notification.read && (
                      <span
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${visual.bg} ${visual.color}`}
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground text-sm">
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="text-muted-foreground hover:text-muted-foreground"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </p>
                          {!notification.read && (
                            <Badge variant="info" className="text-xs">
                              {t('notificationBell', 'new') || 'Nouveau'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="flex-shrink-0 p-3 border-t border-border text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push(listHref);
                }}
                className="text-sm text-primary hover:text-primary font-medium"
              >
                {t('notificationBell', 'viewAll') || 'Voir toutes les notifications'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
