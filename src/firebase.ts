// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// ✨ se in futuro userai Auth o Storage, potrai importare anche:
// import { getAuth } from "firebase/auth";
// import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inizializza l’app Firebase (lo fa una sola volta)
const firebaseApp = initializeApp(firebaseConfig);

// Esporta i servizi che ti servono
export const db = getFirestore(firebaseApp);
// export const auth = getAuth(firebaseApp);
// export const storage = getStorage(firebaseApp);
