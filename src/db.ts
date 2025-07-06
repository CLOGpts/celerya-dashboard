import { collection, addDoc, getDocs, doc, deleteDoc, DocumentData } from "firebase/firestore";
import { db } from "./firebase"; // Assicurati che il percorso a firebase.ts sia corretto

// Il tipo di documento per un cliente non cambia.
export interface CustomerDoc {
  id: string;
  name: string;
}

/**
 * Carica i clienti ESCLUSIVAMENTE per l'utente specificato.
 * @param uid L'ID dell'utente autenticato (User ID). Se non fornito, restituisce un array vuoto.
 * @returns Una promessa che si risolve con l'array dei documenti dei clienti.
 */
export async function loadCustomers(uid: string): Promise<CustomerDoc[]> {
  // Se per qualche motivo non abbiamo un UID, non procediamo per evitare di leggere dati errati.
  if (!uid) {
    console.warn("loadCustomers chiamato senza UID utente. Impossibile caricare i dati.");
    return [];
  }

  // NUOVA LOGICA: Costruiamo un percorso dinamico che punta alla sotto-collezione
  // 'customers' specifica dell'utente.
  const customersCollectionRef = collection(db, 'users', uid, 'customers');
  
  const snap = await getDocs(customersCollectionRef);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerDoc));
}

/**
 * Aggiunge un nuovo cliente NELL'AREA dell'utente specificato.
 * @param name Il nome del nuovo cliente.
 * @param uid L'ID dell'utente autenticato che sta creando il cliente.
 * @returns Una promessa che si risolve con il nuovo documento del cliente.
 */
export async function addCustomer(name: string, uid: string) {
  if (!uid) {
    throw new Error("Impossibile aggiungere un cliente: l'utente non è autenticato.");
  }

  // NUOVA LOGICA: Aggiungiamo il documento alla sotto-collezione 'customers' dell'utente.
  const customersCollectionRef = collection(db, 'users', uid, 'customers');

  const newDocData = { name };
  const ref = await addDoc(customersCollectionRef, newDocData);
  
  return { id: ref.id, ...newDocData };
}

/**
 * Cancella un cliente DALL'AREA dell'utente specificato.
 * @param customerId L'ID del documento del cliente da cancellare.
 * @param uid L'ID dell'utente autenticato a cui appartiene il cliente.
 */
export async function deleteCustomer(customerId: string, uid: string) {
  if (!uid) {
    throw new Error("Impossibile cancellare il cliente: l'utente non è autenticato.");
  }

  // NUOVA LOGICA: Creiamo un riferimento al documento specifico dentro la sotto-collezione dell'utente.
  const customerDocRef = doc(db, 'users', uid, 'customers', customerId);

  await deleteDoc(customerDocRef);
}
