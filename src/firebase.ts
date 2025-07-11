// Importa le funzioni necessarie dai pacchetti Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Questo è il punto chiave:
// Creiamo un oggetto di configurazione leggendo le variabili d'ambiente
// esposte da Vite tramite `import.meta.env`.
// Ogni variabile inizia con il prefisso `VITE_` come definito nel file .env.local
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Controlliamo che le variabili siano state caricate correttamente.
// Se una variabile è mancante, mostriamo un errore chiaro nella console per facilitare il debug.
if (!firebaseConfig.apiKey) {
  throw new Error("La variabile d'ambiente VITE_FIREBASE_API_KEY è mancante o non è stata caricata. Controlla il tuo file .env.local e riavvia il server.");
}

// Inizializza l'applicazione Firebase con la configurazione
const app = initializeApp(firebaseConfig);

// Ottieni le istanze dei servizi che useremo nell'applicazione
const auth = getAuth(app);
const db = getFirestore(app);

// Esporta le istanze per poterle usare in altri file (es. App.tsx, LoginPage.tsx, ecc.)
export { app, auth, db };
