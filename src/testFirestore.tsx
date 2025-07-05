// src/testFirestore.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";          // stesso livello del file firebase.ts

export async function testFirestore() {
  // prova a leggere la collection “demo” (puoi cambiarla più tardi)
  const snap = await getDocs(collection(db, "demo"));
  console.log("Docs letti:", snap.docs.length);
}
