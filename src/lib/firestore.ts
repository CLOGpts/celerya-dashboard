import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import type { Customer } from '../../types';

// Funzione per recuperare tutte le cartelle di un utente
export const getCustomers = async (userId: string): Promise<Customer[]> => {
  const customersCol = collection(db, 'customers');
  const q = query(customersCol, where("userId", "==", userId));
  const customerSnapshot = await getDocs(q);
  const customerList = customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  return customerList;
};

// Funzione per aggiungere una nuova cartella
export const addCustomer = async (newCustomerData: Omit<Customer, 'id'>) => {
  await addDoc(collection(db, 'customers'), newCustomerData);
};

// Funzione per aggiornare il nome di una cartella
export const updateCustomerName = async (customerId: string, newName: string, newSlug: string) => {
  const customerDoc = doc(db, 'customers', customerId);
  await updateDoc(customerDoc, { name: newName, slug: newSlug });
};

// Funzione per eliminare una cartella
export const deleteCustomer = async (customerId: string) => {
  await deleteDoc(doc(db, 'customers', customerId));
};
