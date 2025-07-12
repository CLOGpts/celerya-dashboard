import React, { useState, useCallback, useRef, useEffect } from 'react';
import { auth, db } from '../src/firebase';
import { getCustomers, addCustomer, updateCustomerName, deleteCustomer } from '../src/lib/firestore';
import { collection, addDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Product, Alert, AnalyzedTransportDocument, Section, Customer } from '../types';
import PdfContent from './PdfContent';
import { getCustomSchema, generateAlertsFromSchema, generatePromptFromSchema } from '../constants';
import UploadBox from './UploadBox';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

// --- Componenti di Supporto (Invariati e Funzionanti) ---
const FolderIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" /></svg> );
const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve((reader.result as string).split(',')[1]); reader.onerror = error => reject(error); });
const ContextMenu: React.FC<{ x: number; y: number; items: { label: string; onClick: () => void; className?: string }[]; onClose: () => void; }> = ({ x, y, items, onClose }) => { const menuRef = useRef<HTMLDivElement>(null); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [onClose]); return ( <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-48"> <ul>{items.map((item, index) => ( <li key={index}><button onClick={() => { item.onClick(); onClose(); }} className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${item.className || ''}`}>{item.label}</button></li> ))}</ul> </div> ); };
const getOverallStatus = (alerts: Alert[]): { severity: 'critical' | 'warning' | 'ok'; text: string; } => { if (alerts.some(a => a.severity === 'critical')) return { severity: 'critical', text: 'Critico' }; if (alerts.some(a => a.severity === 'warning')) return { severity: 'warning', text: 'Attenzione' }; return { severity: 'ok', text: 'Conforme' }; };

// --- Componente Principale: DashboardPage ---
const DashboardPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [renamingCustomerId, setRenamingCustomerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; customerId?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<Product | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    
    const loadCustomers = useCallback(async () => { const user = auth.currentUser; if (!user) { setIsLoading(false); return; } setIsLoading(true); try { const customerList = await getCustomers(user.uid); setCustomers(customerList); } catch (e) { console.error("Errore caricamento clienti:", e); } finally { setIsLoading(false); } }, []);
    useEffect(() => { loadCustomers(); }, [loadCustomers]);
    useEffect(() => { if (renamingCustomerId && renameInputRef.current) { renameInputRef.current.focus(); renameInputRef.current.select(); } }, [renamingCustomerId]);

    const handleCreateCustomer = async () => { const user = auth.currentUser; if (!user) return; const newCustomerData = { name: 'Nuova Cartella', slug: `nuova-cartella-${Date.now()}`, userId: user.uid }; const newCustomerRef = await addCustomer(newCustomerData); setCustomers(prev => [...prev, { ...newCustomerData, id: newCustomerRef.id }]); setRenamingCustomerId(newCustomerRef.id); };
    const handleRenameCustomer = async (customerId: string, newName: string) => { if (!newName.trim()) { setRenamingCustomerId(null); await loadCustomers(); return; } const newSlug = slugify(newName); await updateCustomerName(customerId, newName.trim(), newSlug); setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, name: newName.trim(), slug: newSlug } : c)); setRenamingCustomerId(null); };
    const handleDeleteCustomer = async (customerId: string) => { const customerToDelete = customers.find(c => c.id === customerId); if (!customerToDelete) return; if (window.confirm(`Sei sicuro di voler eliminare la cartella "${customerToDelete.name}"? L'azione è irreversibile.`)) { await deleteCustomer(customerId); setCustomers(prev => prev.filter(c => c.id !== customerId)); } };
    const handleContextMenu = (e: React.MouseEvent, customerId?: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, customerId }); };
    
    // CORREZIONE FINALE: Logica di pulizia del JSON estremamente robusta
    const handleExtract = async () => {
        if (!file || !selectedCustomer) return;
        setIsExtracting(true); setError(null); setExtractedData(null); setAlerts([]);
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const customSchema = getCustomSchema();
            const prompt = generatePromptFromSchema(customSchema);
            const imagePart = { inlineData: { data: await fileToBase64(file), mimeType: file.type } };

            const result = await model.generateContent([prompt, imagePart]);
            const response = result.response;
            const text = response.text();

            // Logica "chirurgica" per estrarre il JSON, ignorando tutto il resto
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) {
                throw new Error("Nessun oggetto JSON valido trovato nella risposta dell'AI.");
            }
            const jsonText = text.substring(startIndex, endIndex + 1);
            
            const parsedData = JSON.parse(jsonText);
            const newProduct: Product = { id: `prod-${Date.now()}`, ...parsedData };

            await addDoc(collection(db, "customers", selectedCustomer.id, "technical_sheets"), { ...newProduct, fileName: file.name, analyzedAt: new Date().toISOString() });
            setAlerts(generateAlertsFromSchema(newProduct, customSchema));
            setExtractedData(newProduct);
        } catch (e) {
            console.error("Estrazione fallita:", e);
            setError("L'estrazione è fallita. Controlla la console per i dettagli e la risposta dell'AI.");
        } finally {
            setIsExtracting(false);
        }
    };
    
    const resetState = () => { setSelectedCustomer(null); setFile(null); setExtractedData(null); setError(null); setAlerts([]); };

    // --- Rendering ---
    if (isLoading) { return <div className="p-8 text-center font-semibold text-gray-500">Caricamento dashboard...</div>; }
    if (selectedCustomer && extractedData) { return ( <div className="p-8 bg-gray-50 min-h-full"> <button onClick={resetState} className="flex items-center gap-2 mb-6 px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors"> <ArrowLeftIcon className="w-5 h-5" /> Torna alla Dashboard </button> <PdfContent data={extractedData} alerts={alerts} schema={getCustomSchema()} /> </div> ); }
    if (selectedCustomer) { return ( <div className="p-8 bg-gray-50 min-h-full"> <div className="flex items-center gap-4 mb-6"> <button onClick={resetState} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"><ArrowLeftIcon className="w-6 h-6" /></button> <div><h1 className="text-3xl font-bold text-gray-800">Cliente: {selectedCustomer.name}</h1><p className="text-sm text-gray-500">Carica i documenti da analizzare.</p></div> </div> <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> <UploadBox title="Carica Scheda Tecnica" file={file} onFileChange={setFile} onAction={handleExtract} isProcessing={isExtracting} error={error} /> <UploadBox title="Carica Documento di Trasporto" file={null} onFileChange={()=>{}} onAction={()=>{}} isProcessing={false} error={null} /> </div> </div> ); }
    
    return (
        <div className="p-8 bg-gray-50 min-h-full" onContextMenu={(e) => !contextMenu && handleContextMenu(e)}>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Clienti</h1>
            <p className="text-gray-500 mb-8">Seleziona un cliente o creane uno nuovo con il tasto destro.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {customers.map(customer => (
                    <div key={customer.id} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, customer.id); }} onClick={() => renamingCustomerId !== customer.id && setSelectedCustomer(customer)} className="group flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-lg hover:border-lime-500 transition-all">
                        <FolderIcon className="w-20 h-20 text-yellow-400 group-hover:text-yellow-500 transition-colors" />
                         {renamingCustomerId === customer.id ? (
                            <input ref={renameInputRef} type="text" defaultValue={customer.name} onBlur={(e) => handleRenameCustomer(customer.id, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCustomer(customer.id, e.currentTarget.value); if (e.key === 'Escape') setRenamingCustomerId(null); }} onClick={(e) => e.stopPropagation()} className="mt-4 text-center font-semibold text-gray-700 bg-gray-100 border-2 border-lime-500 rounded-md w-full p-1"/>
                        ) : (
                            <span className="mt-4 text-center font-semibold text-gray-700 group-hover:text-lime-600 break-words w-full px-2">{customer.name}</span>
                        )}
                    </div>
                ))}
            </div>
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} items={ contextMenu.customerId ? [ { label: 'Rinomina', onClick: () => setRenamingCustomerId(contextMenu.customerId!) }, { label: 'Elimina Cartella', onClick: () => handleDeleteCustomer(contextMenu.customerId!), className: 'text-red-600 hover:bg-red-50' } ] : [{ label: 'Nuova Cartella', onClick: handleCreateCustomer }] } />}
        </div>
    );
};

export default DashboardPage;
