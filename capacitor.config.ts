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
    // IMPORTANTE (dalla documentazione ufficiale del plugin): su Android 12+
    // l'OS mostra SEMPRE il proprio splash "di lancio" nativo (solo icona +
    // colore) nell'istante in cui l'app parte, e non e' disattivabile ne'
    // personalizzabile con un'immagine intera -- e' un vincolo della
    // piattaforma, non del plugin. androidSplashResourceName/androidScaleType
    // /splashFullScreen/splashImmersive "Doesn't work ... on launch when
    // using the Android 12 API": per questo splash.png (logo + scritta WAX
    // PRO) non compariva mai, qualunque opzione impostassimo qui.
    //
    // launchShowDuration/launchAutoHide restano per tenere breve quello
    // splash nativo automatico (solo icona). Il nostro splash.png completo
    // viene invece mostrato "a mano" chiamando SplashScreen.show() da
    // codice (vedi src/components/native-splash-screen.tsx, montato nel
    // root layout): quella chiamata NON e' "on launch", quindi il plugin
    // usa la sua vecchia implementazione a overlay/Dialog, che rispetta
    // davvero androidSplashResourceName e androidScaleType.
    //
    // splashFullScreen/splashImmersive qui restano OFF: la modalita'
    // immersiva (barre di sistema nascoste) e' gia' gestita da
    // MainActivity.enableImmersiveMode(); lasciare che anche il plugin la
    // tocchi ha causato l'artefatto della barra di navigazione dell'app
    // scurita dopo la chiusura dello splash.
    SplashScreen: {
      launchShowDuration: 300,
      launchAutoHide: true,
      backgroundColor: '#ffffffff',
      androidSplashResourceName: 'splash',
      // CENTER_CROP ritaglia per riempire lo schermo: su schermi piu' "alti"
      // dell'immagine tagliava via la scritta WAX PRO in basso, che ha meno
      // margine del logo in alto. FIT_CENTER mostra l'immagine intera senza
      // ritagli; lo sfondo del margine e' bianco come lo sfondo della splash,
      // quindi non si vede alcuna cornice.
      androidScaleType: 'FIT_CENTER',
      splashFullScreen: false,
      splashImmersive: false,
      showSpinner: false,
    },
  },
};

export default config;
