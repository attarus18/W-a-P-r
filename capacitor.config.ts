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
      // FIT_CENTER (usato prima) mostra l'immagine intera senza ritagli, ma
      // lascia dei margini colorati con `backgroundColor` (fisso, un solo
      // valore statico) quando le proporzioni dello schermo non combaciano
      // esattamente con quelle dell'immagine -- su schermi con proporzioni
      // diverse si vedevano barre bianche, anche con lo splash scuro attivo.
      // Le immagini splash.png sono state riequilibrate (margine sopra il
      // logo = margine sotto la scritta) apposta per poter usare CENTER_CROP:
      // riempie sempre tutto lo schermo ritagliando, quindi lo sfondo non è
      // mai visibile, in nessuna combinazione di proporzioni/tema.
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
      showSpinner: false,
    },
  },
};

export default config;
