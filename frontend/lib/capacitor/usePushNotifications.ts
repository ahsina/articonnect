/**
 * Push Notifications Hook
 *
 * React hook for managing push notifications in mobile apps
 */

import { useEffect, useState } from 'react';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { isNativePlatform } from './index';

export interface PushNotificationState {
  token: string | null;
  registered: boolean;
  error: string | null;
}

export const usePushNotifications = (onNotificationReceived?: (notification: any) => void) => {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    registered: false,
    error: null,
  });

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let mounted = true;

    const setupPushNotifications = async () => {
      try {
        // Request permission
        const result = await PushNotifications.requestPermissions();

        if (result.receive === 'granted') {
          // Register with APNs or FCM
          await PushNotifications.register();
        } else {
          if (mounted) {
            setState((prev) => ({
              ...prev,
              error: 'Push notification permission denied',
            }));
          }
        }
      } catch (error) {
        console.error('Push notification setup error:', error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      }
    };

    // Setup listeners (these return Promises)
    const setupListeners = async () => {
      const registrationListener = await PushNotifications.addListener(
        'registration',
        (token: Token) => {
          console.log('Push registration success, token:', token.value);
          if (mounted) {
            setState((prev) => ({
              ...prev,
              token: token.value,
              registered: true,
            }));
          }

          // TODO: Send token to backend
          // await sendTokenToBackend(token.value);
        }
      );

      const registrationErrorListener = await PushNotifications.addListener(
        'registrationError',
        (error: any) => {
          console.error('Push registration error:', error);
          if (mounted) {
            setState((prev) => ({
              ...prev,
              error: error.error || 'Registration failed',
            }));
          }
        }
      );

      const pushNotificationReceivedListener = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: any) => {
          console.log('Push notification received:', notification);
          if (onNotificationReceived && mounted) {
            onNotificationReceived(notification);
          }
        }
      );

      const pushNotificationActionListener = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          console.log('Push notification action:', action);
          // Handle notification tap
          if (action.notification.data?.url) {
            window.location.href = action.notification.data.url;
          }
        }
      );

      return {
        registrationListener,
        registrationErrorListener,
        pushNotificationReceivedListener,
        pushNotificationActionListener,
      };
    };

    let listeners: Awaited<ReturnType<typeof setupListeners>> | null = null;

    setupListeners().then((l) => {
      listeners = l;
    });

    setupPushNotifications();

    // Cleanup
    return () => {
      mounted = false;
      if (listeners) {
        listeners.registrationListener.remove();
        listeners.registrationErrorListener.remove();
        listeners.pushNotificationReceivedListener.remove();
        listeners.pushNotificationActionListener.remove();
      }
    };
  }, [onNotificationReceived]);

  return state;
};

/**
 * Send push token to backend
 */
export const sendPushTokenToBackend = async (token: string, userId: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Send httpOnly cookies
      body: JSON.stringify({
        token,
        userId,
        platform: isNativePlatform() ? 'mobile' : 'web',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send push token to backend');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending push token:', error);
    throw error;
  }
};
