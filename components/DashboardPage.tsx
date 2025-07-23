import React, { useState, useCallback, useRef, useEffect } from 'react';
import { auth } from '../src/firebase';
import { getCustomers, addCustomer, updateCustomerName, deleteCustomer, addDocumentToSupplier } from '../src/lib/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Product, Alert, Customer, AllSuppliersData, Ddt } from '../types';
import PdfContent from './PdfContent';
import { getCustomSchema, generateAlertsFromSchema, generatePromptFromSchema } from '../constants';
import UploadBox from './UploadBox';
import { FolderIcon, ArrowLeftIcon } from './icons';
import DdtResultDisplay from './DdtResultDisplay';

// --- Componenti di Supporto (Invariati) ---
const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = error => reject(error); });
const ContextMenu: React.FC<{ x: number; y: number; items: { label: string; onClick: () => void; className?: string }[]; onClose: () => void; }> = ({ x, y, items, onClose }) => { const menuRef = useRef<HTMLDivElement>(null); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [onClose]); return ( <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-white rounded-md shadow-lg border py-1 w-48"> <ul>{items.map((item, index) => ( <li key={index}><button onClick={() => { item.onClick(); onClose(); }} className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${item.className || ''}`}>{item.label}</button></li> ))}</ul> </div> ); };

// --- Componente Principale ---
const DashboardPage: React.FC = () => {
    // --- Stati Esistenti ---
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [renamingCustomerId, setRenamingCustomerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; customerId?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const renameInputRef = useRef<HTMLInputElement>(null);

    // --- Stati per Schede Tecniche ---
    const [productFile, setProductFile] = useState<File | null>(null);
    const [isExtractingProduct, setIsExtractingProduct] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [extractedProductData, setExtractedProductData] = useState<Product | null>(null);
    
    // --- Stati per Documenti di Trasporto (DDT) ---
    const [ddtFile, setDdtFile] = useState<File | null>(null);
    const [isExtractingDdt, setIsExtractingDdt] = useState(false);
    const [ddtError, setDdtError] = useState<string | null>(null);
    const [extractedDdtData, setExtractedDdtData] = useState<Ddt | null>(null);
    
    // --- Stato Unificato per gli Alert ---
    const [alerts, setAlerts] = useState<Alert[]>([]);

    // --- Caricamento e Gestione Clienti ---
    const loadCustomers = useCallback(async () => { setIsLoading(true); try { const user = auth.currentUser; if (user) { const customerList = await getCustomers(user.uid); setCustomers(customerList); } } catch (e) { console.error("Errore caricamento clienti:", e); } finally { setIsLoading(false); } }, []);
    useEffect(() => { loadCustomers(); }, [loadCustomers]);
    useEffect(() => { if (renamingCustomerId && renameInputRef.current) { renameInputRef.current.focus(); renameInputRef.current.select(); } }, [renamingCustomerId]);

    const handleCreateCustomer = async () => { const user = auth.currentUser; if (!user) return; const newCustomerData = { name: 'Nuova Cartella', slug: `nuova-cartella-${Date.now()}`, userId: user.uid }; await addCustomer(newCustomerData); await loadCustomers(); setRenamingCustomerId(null); };
    const handleRenameCustomer = async (customerId: string, newName: string) => { if (!newName.trim()) { setRenamingCustomerId(null); return; } const newSlug = slugify(newName); await updateCustomerName(customerId, newName.trim(), newSlug); await loadCustomers(); setRenamingCustomerId(null); };
    const handleDeleteCustomer = async (customerId: string) => { const customerToDelete = customers.find(c => c.id === customerId); if (!customerToDelete) return; if (window.confirm(`Sei sicuro di voler eliminare la cartella "${customerToDelete.name}"?`)) { await deleteCustomer(customerId); await loadCustomers(); } };
    const handleContextMenu = (e: React.MouseEvent, customerId?: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, customerId }); };

    // --- Logica di Estrazione per Schede Tecniche ---
    const handleExtractProduct = async () => {
        const user = auth.currentUser;
        if (!productFile || !selectedCustomer || !user) return;
        
        setIsExtractingProduct(true);
        setProductError(null);
        setExtractedProductData(null);
        setAlerts([]);
        setExtractedDdtData(null); // **MODIFICA CHIAVE**: Pulisce i dati DDT precedenti.
        
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
            const customSchema = getCustomSchema();
            const prompt = generatePromptFromSchema(customSchema);
            const imagePart = { inlineData: { data: await fileToBase64(productFile), mimeType: productFile.type } };
            const result = await model.generateContent([prompt, imagePart]);
            const parsedData = JSON.parse(result.response.text());
            const newProduct: Product = { id: `prod-${Date.now()}`, docType: 'product', ...parsedData };
            
            await addDocumentToSupplier(user.uid, selectedCustomer.id, newProduct);
            
            const supplierName = newProduct.identificazione?.produttore;
            if (supplierName) {
                const suppliersData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
                if (!suppliersData[supplierName]) suppliersData[supplierName] = { pdfs: [], ddts: [] };
                if (!suppliersData[supplierName].pdfs) suppliersData[supplierName].pdfs = [];
                suppliersData[supplierName].pdfs.push(newProduct);
                suppliersData[supplierName].lastUpdate = new Date().toISOString();
                suppliersData[supplierName].customerSlug = selectedCustomer.slug;
                suppliersData[supplierName].customerName = selectedCustomer.name;
                localStorage.setItem('celerya_suppliers_data', JSON.stringify(suppliersData));
            }
            
            const generatedAlerts = generateAlertsFromSchema(newProduct, customSchema);
            const allAlerts = JSON.parse(localStorage.getItem('celerya_alerts_data') || '[]');
            const enrichedAlerts = generatedAlerts.map(alert => ({ ...alert, productId: newProduct.id, productName: newProduct.descrizione?.denominazioneLegale || 'N/D', supplierName: newProduct.identificazione?.produttore || 'N/D', customerName: selectedCustomer.name, savedAt: new Date().toISOString() }));
            localStorage.setItem('celerya_alerts_data', JSON.stringify([...allAlerts, ...enrichedAlerts]));
            
            setAlerts(generatedAlerts);
            setExtractedProductData(newProduct);
            window.dispatchEvent(new Event('celerya-data-updated'));
        } catch (e) {
            console.error("Estrazione Scheda Tecnica fallita:", e);
            setProductError("L'estrazione è fallita. Il modello AI non è riuscito a leggere il file. Riprova.");
        } finally {
            setIsExtractingProduct(false);
        }
    };
    
    // --- Logica di Estrazione per DDT ---
    const handleExtractDdt = async () => {
        const user = auth.currentUser;
        if (!ddtFile || !selectedCustomer || !user) return;
        
        setIsExtractingDdt(true);
        setDdtError(null);
        setExtractedDdtData(null);
        setAlerts([]);
        setExtractedProductData(null); // **MODIFICA CHIAVE**: Pulisce i dati Scheda Tecnica precedenti.
        
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
            const ddtPrompt = `Analizza questo Documento di Trasporto (DDT). Estrai le seguenti informazioni e restituiscile come oggetto JSON: 'numeroDDT', 'dataDDT', 'mittente', 'destinatario', 'vettore', e un array 'prodotti' dove ogni oggetto ha 'nomeProdotto', 'quantita', 'lotto', e 'scadenza'. Se un campo non è presente, omettilo o usa null.`;
            const imagePart = { inlineData: { data: await fileToBase64(ddtFile), mimeType: ddtFile.type } };
            const result = await model.generateContent([ddtPrompt, imagePart]);
            const parsedDdt = JSON.parse(result.response.text());
            const newDdt: Ddt = { id: `ddt-${Date.now()}`, docType: 'ddt', ...parsedDdt };

            await addDocumentToSupplier(user.uid, selectedCustomer.id, newDdt);
            
            const supplierName = newDdt.mittente;
            if (supplierName) {
                const suppliersData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
                if (!suppliersData[supplierName]) suppliersData[supplierName] = { pdfs: [], ddts: [] };
                if (!suppliersData[supplierName].ddts) suppliersData[supplierName].ddts = [];
                suppliersData[supplierName].ddts.push(newDdt);
                localStorage.setItem('celerya_suppliers_data', JSON.stringify(suppliersData));
            }
            
            setExtractedDdtData(newDdt);
            window.dispatchEvent(new Event('celerya-data-updated'));
        } catch (e) {
            console.error("Estrazione DDT fallita:", e);
            setDdtError("L'estrazione del DDT è fallita. Il modello AI non ha analizzato il file. Riprova.");
        } finally {
            setIsExtractingDdt(false);
        }
    };
    
    // --- Funzione di Reset Aggiornata ---
    const resetState = () => {
        setSelectedCustomer(null);
        setProductFile(null);
        setExtractedProductData(null);
        setProductError(null);
        setDdtFile(null);
        setExtractedDdtData(null);
        setDdtError(null);
        setAlerts([]);
    };

    // --- Logica di Rendering ---
    if (isLoading) { return <div className="p-8 text-center font-semibold text-gray-500">Caricamento Dashboard...</div>; }
    
    // Vista Risultato Scheda Tecnica
    if (selectedCustomer && extractedProductData) {
        return (
            <div className="p-8 bg-gray-50 min-h-full">
                <button onClick={resetState} className="flex items-center gap-2 mb-6 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"><ArrowLeftIcon className="w-5 h-5" /> Torna alla Dashboard</button>
                <PdfContent data={extractedProductData} alerts={alerts} schema={getCustomSchema()} />
            </div>
        );
    }
    
    // Vista Risultato DDT
    if (selectedCustomer && extractedDdtData) {
        return (
            <div className="p-8 bg-gray-50 min-h-full">
                <button onClick={resetState} className="flex items-center gap-2 mb-6 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"><ArrowLeftIcon className="w-5 h-5" /> Torna alla Dashboard</button>
                <DdtResultDisplay data={extractedDdtData} />
            </div>
        );
    }

    // Vista di Upload per un Cliente Selezionato
    if (selectedCustomer) {
        return (
            <div className="p-8 bg-gray-50 min-h-full">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={resetState} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeftIcon className="w-6 h-6" /></button>
                    <div><h1 className="text-3xl font-bold">Cartella: {selectedCustomer.name}</h1><p className="text-sm text-gray-500">Carica i documenti da analizzare.</p></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <UploadBox title="Carica Scheda Tecnica" file={productFile} onFileChange={setProductFile} onAction={handleExtractProduct} isProcessing={isExtractingProduct} error={productError} />
                    <UploadBox title="Carica Documento di Trasporto" file={ddtFile} onFileChange={setDdtFile} onAction={handleExtractDdt} isProcessing={isExtractingDdt} error={ddtError} />
                </div>
            </div>
        );
    }
    
    // Vista Principale della Dashboard
    return (
        <div className="p-8 bg-gray-50 min-h-full" onContextMenu={(e) => !contextMenu && handleContextMenu(e)}>
            <h1 className="text-3xl font-bold mb-2">Dashboard Clienti</h1>
            <p className="text-gray-500 mb-8">Seleziona una cartella o creane una nuova.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {customers.map(customer => (
                    <div key={customer.id} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, customer.id); }} onClick={() => renamingCustomerId !== customer.id && setSelectedCustomer(customer)} className="group flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-lg hover:border-lime-500">
                        <FolderIcon className="w-20 h-20 text-yellow-400 group-hover:text-yellow-500" />
                        {renamingCustomerId === customer.id ? (
                            <input ref={renameInputRef} type="text" defaultValue={customer.name} onBlur={(e) => handleRenameCustomer(customer.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCustomer(customer.id, e.currentTarget.value); if (e.key === 'Escape') setRenamingCustomerId(null); }} onClick={(e) => e.stopPropagation()} className="mt-4 text-center font-semibold bg-gray-100 border-2 border-lime-500 rounded-md w-full p-1"/>
                        ) : (
                            <span className="mt-4 text-center font-semibold group-hover:text-lime-600 break-words w-full px-2">{customer.name}</span>
                        )}
                    </div>
                ))}
            </div>
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} items={ contextMenu.customerId ? [ { label: 'Rinomina', onClick: () => setRenamingCustomerId(contextMenu.customerId!) }, { label: 'Elimina Cartella', onClick: () => handleDeleteCustomer(contextMenu.customerId!), className: 'text-red-600' } ] : [{ label: 'Nuova Cartella', onClick: handleCreateCustomer }] } />}
        </div>
    );
};

export default DashboardPage;
