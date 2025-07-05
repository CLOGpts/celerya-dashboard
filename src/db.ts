import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

// Tipi minimi
export interface CustomerDoc { id: string; name: string; }

// Leggi tutti i clienti
export async function loadCustomers(): Promise<CustomerDoc[]> {
  const snap = await getDocs(collection(db, "customers"));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as CustomerDoc[];
}

// Aggiungi un cliente
export async function addCustomer(name: string) {
  const ref = await addDoc(collection(db, "customers"), { name });
  return { id: ref.id, name };
}

// Cancella un cliente
export async function deleteCustomer(id: string) {
  await deleteDoc(doc(db, "customers", id));
}

