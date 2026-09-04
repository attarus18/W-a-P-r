import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'appinventor.ai_attarus18.CalcoloCandele',
  appName: 'WaxPro Manager',
  webDir: 'www',
  server: {
    url: 'https://w-a-p-r1.attarus18.workers.dev',
    cleartext: false,
  },
  plugins: {
    // Il tema Android 12+ (windowSplashScreenBackground/AnimatedIcon) accetta
    // solo icona + colore, mai un'immagine a schermo intero: per mostrare
    // davvero splash.png (logo + scritta WAX PRO, gia' pronto per ogni
    // densita' in android/app/src/main/res/drawable*) serve questo plugin,
    // che lo sovrappone come overlay JS mentre la WebView carica, su tutte
    // le versioni Android.
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },
  },
};

export default config;
