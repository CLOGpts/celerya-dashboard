import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentReference, writeBatch } from 'firebase/firestore';
import type { Customer, Product, Supplier, DDT } from '../../types';

// --- GESTIONE CLIENTI ---
// Questa sezione è corretta e rimane invariata.
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
    // Nota: in una versione di produzione, qui andrebbe aggiunta la logica
    // per eliminare anche tutti i documenti associati a questo cliente.
    await deleteDoc(doc(db, 'customers', customerId));
};

// --- GESTIONE SCRITTURA DOCUMENTI (POTENZIATA E CORRETTA) ---
// Questa funzione ora gestisce in modo intelligente sia Schede Tecniche che DDT.
export const addDocumentToSupplier = async (userId: string, customerId: string, documentData: any) => {
    // **MODIFICA CHIAVE 1**: Riconosce il fornitore sia da 'produttore' (per le schede tecniche)
    // che da 'mittente' (per i DDT), rendendo la funzione flessibile.
    const supplierName = documentData.identificazione?.produttore || documentData.mittente;

    if (!supplierName) {
        throw new Error("Il nome del fornitore (produttore o mittente) è mancante.");
    }

    const suppliersColRef = collection(db, 'suppliers');
    const q = query(suppliersColRef, where("userId", "==", userId), where("name", "==", supplierName));
    const querySnapshot = await getDocs(q);

    let supplierId: string;
    const batch = writeBatch(db);

    if (querySnapshot.empty) {
        // Se il fornitore non esiste, lo crea.
        const newSupplierRef = doc(suppliersColRef);
        supplierId = newSupplierRef.id;
        batch.set(newSupplierRef, {
            name: supplierName,
            userId: userId,
            lastUpdate: new Date().toISOString(),
            customerId: customerId,
        });
    } else {
        // Se il fornitore esiste già, aggiorna la data dell'ultimo contatto.
        const supplierDoc = querySnapshot.docs[0];
        supplierId = supplierDoc.id;
        batch.update(doc(db, 'suppliers', supplierId), {
            lastUpdate: new Date().toISOString(),
            customerId: customerId,
        });
    }
    
    // **MODIFICA CHIAVE 2**: Determina dove salvare il documento in base al suo tipo.
    // Se è un DDT, lo salva nella cartella 'ddts', altrimenti in 'technical_sheets'.
    const subcollectionPath = documentData.docType === 'ddt' ? 'ddts' : 'technical_sheets';
    const documentRef = doc(collection(db, 'suppliers', supplierId, subcollectionPath));
    
    // Salva il documento nella sottocartella corretta, aggiungendo il suo nuovo ID univoco.
    batch.set(documentRef, { ...documentData, id: documentRef.id }); 
    
    // Esegue tutte le operazioni (creazione/aggiornamento fornitore e salvataggio documento) in un colpo solo.
    await batch.commit();
};

// --- GESTIONE LETTURA DOCUMENTI (POTENZIATA E CORRETTA) ---
// Questa funzione ora recupera correttamente tutti i documenti (schede e DDT) per ogni fornitore.
export const getSuppliersWithDocuments = async (userId: string): Promise<Supplier[]> => {
    const customers = await getCustomers(userId);
    const customerMap = new Map(customers.map(c => [c.id, c.name]));

    const suppliersCol = collection(db, 'suppliers');
    const q = query(suppliersCol, where("userId", "==", userId));
    const supplierSnapshot = await getDocs(q);

    if (supplierSnapshot.empty) return [];

    const suppliersPromises = supplierSnapshot.docs.map(async (supplierDoc) => {
        const supplierData = supplierDoc.data();
        
        // Recupera le schede tecniche
        const pdfsCol = collection(db, 'suppliers', supplierDoc.id, 'technical_sheets');
        const pdfsSnapshot = await getDocs(pdfsCol);
        const pdfs = pdfsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        
        // **MODIFICA CHIAVE 3**: Recupera attivamente anche i DDT dalla loro sottocartella.
        const ddtsCol = collection(db, 'suppliers', supplierDoc.id, 'ddts');
        const ddtsSnapshot = await getDocs(ddtsCol);
        const ddts = ddtsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DDT));

        return {
            id: supplierDoc.id,
            name: supplierData.name,
            lastUpdate: supplierData.lastUpdate,
            customerName: customerMap.get(supplierData.customerId) || 'N/A',
            customerSlug: '', // Non più necessario se si usa customerName
            pdfs,
            ddts,
        } as Supplier;
    });

    const suppliers = await Promise.all(suppliersPromises);
    return suppliers.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
};

// --- Funzioni per URL QR (Invariate) ---
export const savePdfResourceUrl = async (supplierId: string, pdfId: string, qrCodeUrl: string): Promise<void> => {
    const docRef = doc(db, "suppliers", supplierId, "technical_sheets", pdfId);
    await updateDoc(docRef, { qrCodeUrl: qrCodeUrl });
};

export const saveDdtResourceUrl = async (supplierId: string, ddtId: string, qrCodeUrl: string): Promise<void> => {
    const docRef = doc(db, "suppliers", supplierId, "ddts", ddtId);
    await updateDoc(docRef, { qrCodeUrl: qrCodeUrl });
};
