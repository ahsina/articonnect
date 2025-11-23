import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.articonnect.app',
  appName: 'ArtiConnect',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // IMPORTANT: Update this URL to your production API
    // For local development, use your machine's IP address
    url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    cleartext: true, // Allow HTTP in development
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563EB',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
