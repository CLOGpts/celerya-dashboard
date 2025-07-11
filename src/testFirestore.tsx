import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "./firebase";

/** legge e stampa tutti i documenti */
export async function testFirestore() {
  // scrivi un nuovo doc di prova
  await addDoc(collection(db, "prodotti_demo"), {
    nome: "Caffè",
    prezzo: 3.5,
    ts: Date.now(),
  });

  // leggi la raccolta
  const snap = await getDocs(collection(db, "prodotti_demo"));
  console.log("Docs letti:", snap.size);
  snap.forEach((d) => console.log(d.id, d.data()));
}

