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
      // CENTER_CROP ritaglia per riempire lo schermo: su schermi piu' "alti"
      // dell'immagine tagliava via la scritta WAX PRO in basso, che ha meno
      // margine del logo in alto. FIT_CENTER mostra l'immagine intera senza
      // ritagli; lo sfondo del margine e' bianco come lo sfondo della splash,
      // quindi non si vede alcuna cornice.
      androidScaleType: 'FIT_CENTER',
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },
  },
};

export default config;
