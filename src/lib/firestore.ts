import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentReference, writeBatch } from 'firebase/firestore';
import type { Customer, Product, Supplier, DDT } from '../../types';

// --- GESTIONE CLIENTI (INVARIATA E CORRETTA) ---
export const getCustomers = async (userId: string): Promise<Customer[]> => {
  const customersCol = collection(db, 'customers');
  const q = query(customersCol, where("userId", "==", userId));
  const customerSnapshot = await getDocs(q);
  return customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

export const addCustomer = async (newCustomerData: Omit<Customer, 'id'>): Promise<DocumentReference> => {
  return await addDoc(collection(db, 'customers'), newCustomerData);
};

export const updateCustomerName = async (customerId: string, newName:string, newSlug: string) => {
    await updateDoc(doc(db, 'customers', customerId), { name: newName, slug: newSlug });
};

export const deleteCustomer = async (customerId: string) => {
    await deleteDoc(doc(db, 'customers', customerId));
};


// --- GESTIONE SCRITTURA DOCUMENTI (INVARIATA E CORRETTA) ---
export const addDocumentToSupplier = async (userId: string, customerId: string, product: Product) => {
    const supplierName = product.identificazione?.produttore;
    if (!supplierName) throw new Error("Il nome del produttore (fornitore) è mancante.");

    const suppliersColRef = collection(db, 'suppliers');
    const q = query(suppliersColRef, where("userId", "==", userId), where("name", "==", supplierName));
    const querySnapshot = await getDocs(q);

    let supplierId: string;
    const batch = writeBatch(db);

    if (querySnapshot.empty) {
        const newSupplierRef = doc(suppliersColRef);
        supplierId = newSupplierRef.id;
        batch.set(newSupplierRef, {
            name: supplierName,
            userId: userId,
            lastUpdate: new Date().toISOString(),
            customerId: customerId,
        });
    } else {
        const supplierDoc = querySnapshot.docs[0];
        supplierId = supplierDoc.id;
        batch.update(doc(db, 'suppliers', supplierId), {
            lastUpdate: new Date().toISOString(),
            customerId: customerId,
        });
    }
    
    const productRef = doc(collection(db, 'suppliers', supplierId, 'technical_sheets'));
    // Salva il documento con il suo nuovo ID univoco di Firestore
    batch.set(productRef, { ...product, id: productRef.id }); 
    
    await batch.commit();
};


// --- NUOVE FUNZIONI DI LETTURA E AGGIORNAMENTO PER LE ALTRE PAGINE ---

/**
 * Recupera tutti i fornitori di un utente, completi dei loro documenti.
 * Questa funzione è il nuovo cuore della SuppliersListPage.
 */
export const getSuppliersWithDocuments = async (userId: string): Promise<Supplier[]> => {
    // Passo 1: Recupera i clienti per mappare gli ID ai nomi
    const customers = await getCustomers(userId);
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    // Passo 2: Recupera tutti i fornitori dell'utente
    const suppliersCol = collection(db, 'suppliers');
    const q = query(suppliersCol, where("userId", "==", userId));
    const supplierSnapshot = await getDocs(q);

    if (supplierSnapshot.empty) {
        return []; // Se non ci sono fornitori, restituisce un array vuoto
    }

    // Passo 3: Per ogni fornitore, recupera i documenti dalle sottocollezioni
    const suppliersPromises = supplierSnapshot.docs.map(async (supplierDoc) => {
        const supplierData = supplierDoc.data();
        
        // Recupera le schede tecniche
        const pdfsCol = collection(db, 'suppliers', supplierDoc.id, 'technical_sheets');
        const pdfsSnapshot = await getDocs(pdfsCol);
        const pdfs = pdfsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        
        // Recupera i DDT (per ora vuoto, ma predisposto)
        const ddts: DDT[] = [];

        // Costruisce l'oggetto Supplier completo
        return {
            id: supplierDoc.id,
            name: supplierData.name,
            lastUpdate: supplierData.lastUpdate,
            customerName: customerMap.get(supplierData.customerId) || 'Cliente non associato',
            customerSlug: '', // Non più necessario, gestito da customerName
            pdfs,
            ddts,
        } as Supplier;
    });

    const suppliers = await Promise.all(suppliersPromises);
    
    // Ordina i fornitori per data di aggiornamento più recente
    return suppliers.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
};

/**
 * Salva l'URL della risorsa QR per una specifica scheda tecnica.
 */
export const savePdfResourceUrl = async (supplierId: string, pdfId: string, qrCodeUrl: string): Promise<void> => {
    const docRef = doc(db, "suppliers", supplierId, "technical_sheets", pdfId);
    await updateDoc(docRef, { qrCodeUrl: qrCodeUrl });
};

/**
 * Salva l'URL della risorsa QR per uno specifico DDT.
 */
export const saveDdtResourceUrl = async (supplierId: string, ddtId: string, qrCodeUrl: string): Promise<void> => {
    const docRef = doc(db, "suppliers", supplierId, "ddts", ddtId);
    await updateDoc(docRef, { qrCodeUrl: qrCodeUrl });
};
