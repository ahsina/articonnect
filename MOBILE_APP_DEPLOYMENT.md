# 📱 Mobile App Deployment Guide

## App Store (iOS) and Play Store (Android) Deployment

**Project:** ArtiConnect Mobile Apps
**Technology:** Capacitor + Next.js
**Status:** ✅ Ready for App Store Deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [iOS App Store Deployment](#ios-app-store-deployment)
5. [Android Play Store Deployment](#android-play-store-deployment)
6. [Native Features](#native-features)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ArtiConnect now supports native mobile apps for iOS and Android using **Capacitor**. This wraps your existing Next.js web app into native containers, giving you:

✅ **100% code reuse** - Same codebase for web and mobile
✅ **Native performance** - Modern WebViews are fast
✅ **Native features** - Camera, Push Notifications, Geolocation, etc.
✅ **Quick deployment** - 1-2 weeks to App Store/Play Store

**App Details:**
- **App ID:** `com.articonnect.app`
- **App Name:** ArtiConnect
- **Bundle ID (iOS):** `com.articonnect.app`
- **Package Name (Android):** `com.articonnect.app`

---

## Prerequisites

### For Both Platforms
- ✅ Node.js 18+ installed
- ✅ npm or yarn package manager
- ✅ Git installed
- ✅ ArtiConnect backend running

### For iOS Development
- 🍎 **macOS computer** (required for iOS builds)
- 🍎 **Xcode 15+** installed from Mac App Store
- 🍎 **CocoaPods** installed: `sudo gem install cocoapods`
- 🍎 **Apple Developer Account** ($99/year)
  - Sign up: https://developer.apple.com

### For Android Development
- 🤖 **Android Studio** (any OS)
  - Download: https://developer.android.com/studio
- 🤖 **Java JDK 17+** installed
- 🤖 **Android SDK** installed via Android Studio
- 🤖 **Google Play Developer Account** ($25 one-time)
  - Sign up: https://play.google.com/console

---

## Quick Start

### 1. Build Mobile App

```bash
cd frontend

# Build static export for mobile
npm run mobile:build
```

This creates an optimized static build in the `out/` directory.

### 2. Sync with Native Projects

```bash
# Sync both iOS and Android
npm run mobile:sync

# Or sync individually
npm run mobile:sync:ios
npm run mobile:sync:android
```

This copies the web assets to the native projects and installs native plugins.

### 3. Open in Native IDE

```bash
# Open iOS project in Xcode
npm run mobile:open:ios

# Open Android project in Android Studio
npm run mobile:open:android
```

---

## iOS App Store Deployment

### Step 1: Configure App in Xcode

1. **Open iOS project:**
   ```bash
   npm run mobile:open:ios
   ```

2. **In Xcode:**
   - Select `App` target
   - Go to **Signing & Capabilities**
   - Select your Apple Developer Team
   - Verify Bundle ID: `com.articonnect.app`

3. **Configure App Icons:**
   - App icons are located in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - You need icons in these sizes:
     - 20x20 @ 2x, 3x
     - 29x29 @ 2x, 3x
     - 40x40 @ 2x, 3x
     - 60x60 @ 2x, 3x
     - 76x76 @ 1x, 2x
     - 83.5x83.5 @ 2x
     - 1024x1024 @ 1x (App Store)

   **Quick Icon Generation:**
   ```bash
   # Use online tool: https://www.appicon.co/
   # Or use ImageMagick:
   convert logo.png -resize 1024x1024 icon-1024.png
   ```

4. **Configure Launch Screen:**
   - Edit `ios/App/App/Base.lproj/LaunchScreen.storyboard`
   - Add your logo and brand colors

### Step 2: Configure Capabilities

In Xcode, go to **Signing & Capabilities** and add:

- ✅ **Push Notifications**
- ✅ **Background Modes** → Remote notifications
- ✅ **Sign in with Apple** (if using OAuth)

### Step 3: Update Info.plist

Add required permissions in `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>ArtiConnect needs camera access to upload photos of your work</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>ArtiConnect needs photo library access to choose images</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>ArtiConnect uses your location to find nearby artisans</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>ArtiConnect needs location access to provide location-based services</string>
```

### Step 4: Build for Release

1. **Select Device:**
   - In Xcode, select **Any iOS Device (arm64)**

2. **Archive:**
   - Product → Archive
   - Wait for archive to complete (5-10 minutes)

3. **Distribute:**
   - Click **Distribute App**
   - Select **App Store Connect**
   - Select **Upload**
   - Wait for upload (5-15 minutes)

### Step 5: Submit to App Store

1. **Go to App Store Connect:**
   - https://appstoreconnect.apple.com

2. **Create New App:**
   - Click **My Apps** → **+** → **New App**
   - Platform: iOS
   - Name: ArtiConnect
   - Primary Language: French (or your choice)
   - Bundle ID: com.articonnect.app
   - SKU: articonnect-ios-001

3. **Fill App Information:**
   - **Category:** Business
   - **Subcategory:** Networking
   - **Content Rights:** You own or have the rights

4. **Add Screenshots:**
   - Required sizes:
     - 6.5" Display (iPhone 14 Pro Max): 1290 x 2796 pixels
     - 5.5" Display (iPhone 8 Plus): 1242 x 2208 pixels
     - 12.9" Display (iPad Pro): 2048 x 2732 pixels

   **Capture screenshots:**
   ```bash
   # Run in iOS Simulator
   npm run mobile:run:ios
   # Press Cmd+S to save screenshots
   ```

5. **Add App Preview Video** (Optional but recommended)
   - 15-30 second video showing app features
   - Same sizes as screenshots

6. **Write App Description:**
   ```
   ArtiConnect - Trouvez les meilleurs artisans près de chez vous

   ArtiConnect est la plateforme qui met en relation les clients avec des artisans qualifiés pour tous vos besoins de rénovation, réparation et construction.

   FONCTIONNALITÉS :
   • Recherchez des artisans par spécialité et localisation
   • Consultez les profils et avis clients
   • Demandez des devis gratuits
   • Réservez des interventions en ligne
   • Paiement sécurisé intégré
   • Suivi en temps réel de vos missions

   Pour les artisans :
   • Créez votre profil professionnel
   • Recevez des demandes de clients
   • Gérez votre calendrier
   • Acceptez les paiements en ligne
   • Construisez votre réputation

   Téléchargez ArtiConnect dès maintenant et trouvez le bon artisan pour votre projet !
   ```

7. **Add Keywords:**
   ```
   artisan, rénovation, construction, plombier, électricien, menuisier, peintre, devis, travaux
   ```

8. **Set Pricing:**
   - Free (ArtiConnect is free to download)

9. **Add Privacy Policy:**
   - URL: https://articonnect.com/privacy (create this page!)

10. **Add Support URL:**
    - URL: https://articonnect.com/support

11. **App Review Information:**
    - First Name: [Your name]
    - Last Name: [Your name]
    - Phone: [Your phone]
    - Email: support@articonnect.com

    **Demo Account** (for Apple reviewers):
    - Email: demo@articonnect.com
    - Password: DemoPassword123!

12. **Age Rating:**
    - Complete questionnaire (likely 4+)

13. **Submit for Review:**
    - Click **Add for Review**
    - Click **Submit to App Store**

### Step 6: Wait for Review

- **Typical review time:** 1-3 days
- **Status updates:** Via email and App Store Connect
- **Common rejection reasons:**
  - Missing privacy policy
  - Broken features
  - Misleading screenshots
  - Missing demo account

---

## Android Play Store Deployment

### Step 1: Configure App in Android Studio

1. **Open Android project:**
   ```bash
   npm run mobile:open:android
   ```

2. **Update `android/app/build.gradle`:**
   ```gradle
   android {
       defaultConfig {
           applicationId "com.articonnect.app"
           minSdkVersion 22
           targetSdkVersion 34  // Android 14+
           versionCode 1
           versionName "1.0.0"
       }
   }
   ```

3. **Update App Name:**
   - Edit `android/app/src/main/res/values/strings.xml`:
   ```xml
   <resources>
       <string name="app_name">ArtiConnect</string>
       <string name="title_activity_main">ArtiConnect</string>
       <string name="package_name">com.articonnect.app</string>
       <string name="custom_url_scheme">articonnect</string>
   </resources>
   ```

### Step 2: Configure App Icons

1. **Generate icons:**
   - Use: https://romannurik.github.io/AndroidAssetStudio/
   - Or Android Studio: Right-click `res` → New → Image Asset

2. **Required icon sizes:**
   - mipmap-mdpi: 48x48
   - mipmap-hdpi: 72x72
   - mipmap-xhdpi: 96x96
   - mipmap-xxhdpi: 144x144
   - mipmap-xxxhdpi: 192x192

### Step 3: Generate Signing Key

```bash
# Generate keystore
keytool -genkey -v -keystore articonnect-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias articonnect

# Answer questions:
# - Password: [Choose strong password]
# - What is your first and last name? ArtiConnect
# - What is the name of your organizational unit? Engineering
# - What is the name of your organization? ArtiConnect
# - What is the name of your City or Locality? Luxembourg
# - What is the name of your State or Province? Luxembourg
# - What is the two-letter country code for this unit? LU
```

**⚠️ IMPORTANT:** Store this keystore file safely! You cannot update your app without it.

### Step 4: Configure Signing

1. **Create `android/key.properties`:**
   ```properties
   storePassword=[YOUR_KEYSTORE_PASSWORD]
   keyPassword=[YOUR_KEY_PASSWORD]
   keyAlias=articonnect
   storeFile=../articonnect-release-key.jks
   ```

2. **Update `android/app/build.gradle`:**
   ```gradle
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       signingConfigs {
           release {
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
               storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
               storePassword keystoreProperties['storePassword']
           }
       }

       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

### Step 5: Build Release APK/AAB

```bash
cd android

# Build App Bundle (recommended for Play Store)
./gradlew bundleRelease

# Build APK (for testing)
./gradlew assembleRelease
```

**Output locations:**
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### Step 6: Create Play Store Listing

1. **Go to Google Play Console:**
   - https://play.google.com/console

2. **Create New App:**
   - Click **Create app**
   - App name: ArtiConnect
   - Default language: French
   - App or game: App
   - Free or paid: Free
   - Accept declarations

3. **Set Up App:**

   **Store Listing:**
   - Short description (80 chars):
     ```
     Trouvez et réservez les meilleurs artisans pour vos travaux
     ```

   - Full description (4000 chars max):
     ```
     ArtiConnect - La plateforme qui simplifie la recherche d'artisans qualifiés

     ArtiConnect connecte les clients avec des artisans professionnels pour tous types de travaux : rénovation, construction, réparation, et bien plus encore.

     🔨 POUR LES CLIENTS :
     • Recherchez des artisans par spécialité et localisation
     • Consultez les profils détaillés et avis vérifiés
     • Demandez plusieurs devis gratuitement
     • Comparez les prix et disponibilités
     • Réservez en ligne en quelques clics
     • Paiement sécurisé intégré (Stripe)
     • Suivi en temps réel de vos interventions
     • Chat direct avec votre artisan
     • Laissez des avis et notations

     ⚒️ POUR LES ARTISANS :
     • Créez votre vitrine professionnelle
     • Mettez en avant vos compétences et réalisations
     • Recevez des demandes de clients qualifiés
     • Gérez votre calendrier d'interventions
     • Acceptez les paiements en ligne
     • Construisez votre réputation
     • Développez votre activité

     🛡️ SÉCURITÉ ET CONFIANCE :
     • Paiements sécurisés via Stripe
     • Vérification des profils artisans
     • Système d'avis et notations
     • Service client réactif
     • Protection des données (RGPD)

     📱 FONCTIONNALITÉS :
     • Interface intuitive et moderne
     • Notifications push en temps réel
     • Géolocalisation pour trouver des artisans proches
     • Upload de photos et documents
     • Calendrier de réservation intelligent
     • Historique de vos interventions

     Téléchargez ArtiConnect maintenant et simplifiez vos projets de travaux !

     Support : support@articonnect.com
     Site web : https://articonnect.com
     ```

   - App icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - Screenshots: At least 2 per device type
     - Phone: 720-1080 wide
     - Tablet (optional): 1080-1920 wide

4. **Add Screenshots:**
   ```bash
   # Run app in emulator
   npm run mobile:run:android

   # Take screenshots (varies by emulator)
   # Or use Android Studio's screenshot tool
   ```

5. **Content Rating:**
   - Fill out questionnaire
   - Likely rated: PEGI 3 / ESRB Everyone

6. **Target Audience:**
   - Age: 18 and over
   - Appeals to children: No

7. **Data Safety:**
   - Does your app collect or share data? **Yes**
   - Data collected:
     - Personal info (name, email, phone)
     - Location (approximate)
     - Photos (uploaded by users)
   - Purpose: App functionality, Analytics
   - Data encryption: In transit
   - Can users request data deletion? Yes

8. **App Access:**
   - Unrestricted (available to all users)

9. **Ads:**
   - Contains ads? No

### Step 7: Upload and Release

1. **Create Release:**
   - Production → Create new release
   - Upload `app-release.aab`

2. **Release Notes:**
   ```
   Version 1.0.0 - Premier lancement !

   Bienvenue sur ArtiConnect, votre plateforme pour trouver et réserver des artisans qualifiés.

   Fonctionnalités :
   • Recherche d'artisans par spécialité
   • Demande de devis gratuits
   • Réservation et paiement en ligne
   • Chat et notifications en temps réel
   • Gestion de vos projets

   Nous sommes impatients de recevoir vos retours !
   ```

3. **Countries:**
   - Select target countries (Luxembourg, France, Belgium, etc.)

4. **Review and Rollout:**
   - Review all sections
   - Click **Start rollout to Production**

### Step 8: Wait for Review

- **Typical review time:** 1-2 days (faster than iOS)
- **Status updates:** Via email and Play Console
- **App will go live** automatically after approval

---

## Native Features

### Push Notifications

**Setup in app:**
```typescript
import { usePushNotifications } from '@/lib/capacitor/usePushNotifications';

function MyComponent() {
  const { token, registered } = usePushNotifications((notification) => {
    console.log('Received notification:', notification);
  });

  useEffect(() => {
    if (token) {
      // Send token to backend
      sendPushTokenToBackend(token, userId);
    }
  }, [token]);
}
```

**Backend integration needed:**
- iOS: Configure APNs (Apple Push Notification service)
- Android: Configure FCM (Firebase Cloud Messaging)

### Camera

```typescript
import { capturePhoto } from '@/lib/capacitor';

const handleTakePhoto = async () => {
  try {
    const photo = await capturePhoto('camera');
    console.log('Photo:', photo.dataUrl);
    // Upload to backend
  } catch (error) {
    console.error('Camera error:', error);
  }
};
```

### Geolocation

```typescript
import { getCurrentLocation } from '@/lib/capacitor';

const handleGetLocation = async () => {
  try {
    const position = await getCurrentLocation();
    console.log('Location:', position.coords);
  } catch (error) {
    console.error('Location error:', error);
  }
};
```

### Share

```typescript
import { shareContent } from '@/lib/capacitor';

const handleShare = async () => {
  await shareContent({
    title: 'Check out ArtiConnect!',
    text: 'Find the best artisans near you',
    url: 'https://articonnect.com',
  });
};
```

---

## Testing

### iOS Testing

**Simulator:**
```bash
npm run mobile:run:ios
```

**Real Device:**
1. Connect iPhone via USB
2. In Xcode, select your device
3. Click Run (or Cmd+R)

**TestFlight (Beta Testing):**
1. Upload build to App Store Connect
2. Go to TestFlight tab
3. Add internal testers (up to 100)
4. Add external testers (up to 10,000)
5. Send invites

### Android Testing

**Emulator:**
```bash
npm run mobile:run:android
```

**Real Device:**
1. Enable Developer Mode on Android device
2. Enable USB Debugging
3. Connect via USB
4. Click Run in Android Studio

**Internal Testing:**
1. Upload AAB to Play Console
2. Create Internal Testing release
3. Add testers by email
4. Share test link

---

## Troubleshooting

### iOS Build Errors

**Error: "No signing certificate found"**
```bash
# Solution: Add Apple Developer account in Xcode
# Xcode → Preferences → Accounts → Add Apple ID
```

**Error: "Missing required icon"**
```bash
# Solution: Generate all icon sizes
# Use https://www.appicon.co/ or add manually to Assets.xcassets
```

**Error: "Provisioning profile issue"**
```bash
# Solution: In Xcode
# Signing & Capabilities → Automatically manage signing
```

### Android Build Errors

**Error: "SDK location not found"**
```bash
# Solution: Create local.properties
echo "sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk" > android/local.properties
```

**Error: "Keystore not found"**
```bash
# Solution: Check key.properties path
# Ensure storeFile path is relative to android/app
```

**Error: "Build failed with Gradle"**
```bash
# Solution: Clean and rebuild
cd android
./gradlew clean
./gradlew bundleRelease
```

### Runtime Errors

**Error: "Network request failed"**
```bash
# Solution: Check capacitor.config.ts
# Ensure server.url points to your API
# For local dev, use your machine's IP, not localhost
```

**Error: "Camera permission denied"**
```bash
# Solution: Add usage descriptions to Info.plist (iOS)
# or AndroidManifest.xml (Android)
```

---

## Cost Summary

### One-Time Costs
- **Apple Developer Account:** $99/year
- **Google Play Developer Account:** $25 one-time
- **Total First Year:** $124

### Ongoing Costs
- **Apple Developer:** $99/year
- **App Store Commission:** 30% (15% if <$1M revenue)
- **Play Store Commission:** 30% (15% if <$1M revenue)

**Note:** In-app purchases/subscriptions trigger commission. You can avoid this by handling payments on your website and using the app just for content.

---

## Next Steps

1. ✅ **Build mobile app:** `npm run mobile:build`
2. ✅ **Test on simulator/emulator**
3. ⏳ **Create developer accounts** (Apple + Google)
4. ⏳ **Generate app icons and screenshots**
5. ⏳ **Configure push notifications** (APNs + FCM)
6. ⏳ **Submit to App Store**
7. ⏳ **Submit to Play Store**
8. ⏳ **Monitor reviews and ratings**
9. ⏳ **Plan updates and new features**

**Estimated Timeline:**
- Week 1: iOS preparation and submission
- Week 2: Android preparation and submission
- Week 3: Review process (both platforms)
- Week 4: Launch! 🚀

---

## Support

**Documentation:**
- Capacitor: https://capacitorjs.com/docs
- iOS Development: https://developer.apple.com/documentation
- Android Development: https://developer.android.com/docs

**Need Help?**
- Email: dev@articonnect.com
- Issues: GitHub Issues

---

**Good luck with your mobile app launch!** 🎉
