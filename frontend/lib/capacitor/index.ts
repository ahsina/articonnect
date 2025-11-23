/**
 * Capacitor Utilities
 *
 * Helper functions for native mobile features via Capacitor
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';

/**
 * Check if app is running on a native platform
 */
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the current platform (ios, android, web)
 */
export const getPlatform = () => {
  return Capacitor.getPlatform();
};

/**
 * Camera - Take photo or choose from gallery
 */
export const capturePhoto = async (source: 'camera' | 'gallery' = 'camera') => {
  try {
    const result = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    });

    return {
      base64: result.base64String,
      format: result.format,
      dataUrl: `data:image/${result.format};base64,${result.base64String}`,
    };
  } catch (error) {
    console.error('Camera error:', error);
    throw error;
  }
};

/**
 * Geolocation - Get current position
 */
export const getCurrentLocation = async (): Promise<Position> => {
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    return position;
  } catch (error) {
    console.error('Geolocation error:', error);
    throw error;
  }
};

/**
 * Geolocation - Watch position changes
 */
export const watchLocation = async (
  callback: (position: Position) => void
): Promise<string> => {
  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
    callback
  );

  return watchId;
};

/**
 * Geolocation - Stop watching position
 */
export const clearLocationWatch = async (watchId: string) => {
  await Geolocation.clearWatch({ id: watchId });
};

/**
 * Share - Share content via native share sheet
 */
export const shareContent = async (options: {
  title?: string;
  text?: string;
  url?: string;
  files?: string[];
}) => {
  try {
    await Share.share({
      title: options.title,
      text: options.text,
      url: options.url,
      files: options.files,
    });
  } catch (error) {
    console.error('Share error:', error);
    throw error;
  }
};

/**
 * Haptics - Provide haptic feedback
 */
export const hapticImpact = async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (!isNativePlatform()) return;

  try {
    const impactStyle = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    }[style];

    await Haptics.impact({ style: impactStyle });
  } catch (error) {
    console.error('Haptics error:', error);
  }
};

/**
 * Haptics - Vibrate
 */
export const hapticVibrate = async () => {
  if (!isNativePlatform()) return;

  try {
    await Haptics.vibrate();
  } catch (error) {
    console.error('Haptics error:', error);
  }
};

/**
 * Status Bar - Set style
 */
export const setStatusBarStyle = async (style: 'light' | 'dark' = 'dark') => {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setStyle({
      style: style === 'dark' ? Style.Dark : Style.Light,
    });
  } catch (error) {
    console.error('Status bar error:', error);
  }
};

/**
 * Status Bar - Show/Hide
 */
export const setStatusBarVisibility = async (show: boolean) => {
  if (!isNativePlatform()) return;

  try {
    if (show) {
      await StatusBar.show();
    } else {
      await StatusBar.hide();
    }
  } catch (error) {
    console.error('Status bar error:', error);
  }
};

/**
 * Network - Get current status
 */
export const getNetworkStatus = async () => {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    console.error('Network status error:', error);
    return { connected: true, connectionType: 'unknown' };
  }
};

/**
 * Network - Add listener for network changes
 */
export const addNetworkListener = (
  callback: (status: { connected: boolean; connectionType: string }) => void
) => {
  const listener = Network.addListener('networkStatusChange', callback);
  return listener;
};
