
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Alert, AnalyzedTransportDocument, Section, Customer, AllSuppliersData } from '../types';
import PdfContent from './PdfContent';
import { getCustomSchema, generateAlertsFromSchema, generatePromptFromSchema } from '../constants';
import { AlertIcon } from './icons/AlertIcon';
import UploadBox from './UploadBox';
import TransportDataDisplay from './TransportDataDisplay';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';


const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
    </svg>
);

const transportDocSchemaForPrompt = `
interface TransportProduct {
  descrizione: string;
  quantita: string;
  lotto: string;
  scadenza: string; // ISO Date string
}

interface TransportInfo {
  mittente: string;
  numeroDDT: string;
  dataDDT: string; // ISO Date string
  vettore: string;
  destinatario: string;
}

interface AnalyzedTransportDocument {
    info: TransportInfo;
    prodotti: TransportProduct[];
}
`;
const transportPrompt = `Analizza il documento di trasporto (DDT) fornito. Estrai le informazioni generali del documento, inclusi mittente e destinatario, e un elenco di tutti i prodotti trasportati. Il mittente è l'azienda che ha emesso il documento. Restituisci un singolo oggetto JSON che aderisca strettamente alla seguente interfaccia TypeScript. Non includere testo, spiegazioni o markdown (come \`\`\`json) al di fuori dell'oggetto JSON. Tutte le date devono essere in formato stringa ISO 8601. Se un'informazione non è presente, utilizza una stringa vuota.

${transportDocSchemaForPrompt}
`;

type Status = {
  severity: 'critical' | 'warning' | 'ok';
  text: string;
};

const getOverallStatus = (alerts: Alert[]): Status => {
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasWarning = alerts.some(a => a.severity === 'warning');

    if (hasCritical) {
        return { severity: 'critical', text: 'Critico' };
    }
    if (hasWarning) {
        return { severity: 'warning', text: 'Attenzione' };
    }
    return { severity: 'ok', text: 'Conforme' };
};


const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
    const baseClasses = "inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full";
    const statusClasses = {
        critical: 'bg-red-100 text-red-800',
        warning: 'bg-yellow-100 text-yellow-800',
        ok: 'bg-green-100 text-green-800'
    };
    return <span className={`${baseClasses} ${statusClasses[status.severity]}`}>{status.text}</span>;
};


const AlertsPanel: React.FC<{ alerts: Alert[], status: Status }> = ({ alerts, status }) => {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const warningAlerts = alerts.filter(a => a.severity === 'warning');

    return (
        <div className="sticky top-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Quadro Sinottico Alert</h3>
            <div className="mb-6">
                <StatusBadge status={status} />
            </div>

            {alerts.length === 0 ? (
                <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-4 font-semibold text-gray-700">Nessun alert rilevato.</p>
                    <p className="text-sm text-gray-500">Il prodotto è conforme allo standard.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {criticalAlerts.length > 0 && (
                        <div>
                            <h4 className="text-red-600 font-semibold mb-3 text-sm uppercase tracking-wider">Critici ({criticalAlerts.length})</h4>
                            <ul className="space-y-3">
                                {criticalAlerts.map((alert, index) => (
                                    <li key={`crit-${index}`} className="flex items-start gap-3 text-sm">
                                        <AlertIcon className="text-red-500 mt-0.5 flex-shrink-0 w-4 h-4" />
                                        <span className="text-gray-700">{alert.message}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {warningAlerts.length > 0 && (
                         <div>
                            <h4 className="text-yellow-600 font-semibold mb-3 text-sm uppercase tracking-wider">Avvertimenti ({warningAlerts.length})</h4>
                            <ul className="space-y-3">
                                {warningAlerts.map((alert, index) => (
                                    <li key={`warn-${index}`} className="flex items-start gap-3 text-sm">
                                        <AlertIcon className="text-yellow-500 mt-0.5 flex-shrink-0 w-4 h-4" />
                                        <span className="text-gray-700">{alert.message}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.substring(result.indexOf(',') + 1);
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
};

const generateCeleryaId = (): string => `C-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

interface ContextMenuItem {
    label: string;
    onClick: () => void;
    className?: string;
}

const ContextMenu: React.FC<{
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-48">
            <ul>
                {items.map((item, index) => (
                    <li key={index}>
                        <button
                            onClick={() => { item.onClick(); onClose(); }}
                            className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors ${item.className || ''}`}
                        >
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};


const DashboardPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [renamingCustomerId, setRenamingCustomerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; customerId?: string } | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [extractedData, setExtractedData] = useState<Product | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [activeSchema, setActiveSchema] = useState<Section[] | null>(null);
    
    const [transportFile, setTransportFile] = useState<File | null>(null);
    const [isAnalyzingTransport, setIsAnalyzingTransport] = useState(false);
    const [transportError, setTransportError] = useState<string | null>(null);
    const [transportData, setTransportData] = useState<AnalyzedTransportDocument | null>(null);

    const pdfContentRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    const loadCustomers = useCallback(() => {
        try {
            const storedCustomers = localStorage.getItem('celerya_customers');
            if (storedCustomers) {
                setCustomers(JSON.parse(storedCustomers));
            } else {
                const defaultCustomer: Customer[] = [{ id: 'default-customer', name: 'Clienti', slug: 'clienti' }];
                localStorage.setItem('celerya_customers', JSON.stringify(defaultCustomer));
                setCustomers(defaultCustomer);
            }
        } catch (e) { console.error("Failed to load customers:", e); }
    }, []);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);
    
    useEffect(() => {
        if (renamingCustomerId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingCustomerId]);

    useEffect(() => {
        if (extractedData && selectedCustomer) {
            const producer = extractedData.identificazione.produttore;
            const producerSlug = slugify(producer);
            const pdfId = extractedData.id;
            let allData: AllSuppliersData;
            try {
                allData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
            } catch (e) {
                console.error("Error parsing celerya_suppliers_data, data will be overwritten.", e);
                allData = {};
            }
            if (!allData[selectedCustomer.slug]) allData[selectedCustomer.slug] = { suppliers: {} };
            const customerData = allData[selectedCustomer.slug];
            if (!customerData.suppliers[producerSlug]) {
                customerData.suppliers[producerSlug] = { name: producer, pdfs: {}, ddts: {}, celeryaId: generateCeleryaId(), lastUpdate: '' };
            }
            customerData.suppliers[producerSlug].pdfs[pdfId] = { ...extractedData, savedAt: new Date().toISOString() };
            customerData.suppliers[producerSlug].lastUpdate = new Date().toISOString();
            localStorage.setItem('celerya_suppliers_data', JSON.stringify(allData));
        }
    }, [extractedData, selectedCustomer]);

    const handleCreateCustomer = () => {
        const newCustomer: Customer = { id: `customer-${Date.now()}`, name: 'Nuova Cartella', slug: `nuova-cartella-${Date.now()}` };
        const updatedCustomers = [...customers, newCustomer];
        setCustomers(updatedCustomers);
        localStorage.setItem('celerya_customers', JSON.stringify(updatedCustomers));
        setRenamingCustomerId(newCustomer.id);
    };

    const handleRenameCustomer = (customerId: string, newName: string) => {
        const oldCustomer = customers.find(c => c.id === customerId);
        if (!oldCustomer || !newName.trim()) { setRenamingCustomerId(null); return; }

        const newSlug = slugify(newName);
        if (customers.some(c => c.id !== customerId && c.slug === newSlug)) {
            alert(`Esiste già una cartella con un nome simile. Scegli un nome diverso.`);
            if(renameInputRef.current) renameInputRef.current.focus();
            return;
        }

        const updatedCustomers = customers.map(c => c.id === customerId ? { ...c, name: newName.trim(), slug: newSlug } : c);
        setCustomers(updatedCustomers);
        localStorage.setItem('celerya_customers', JSON.stringify(updatedCustomers));

        let allData: AllSuppliersData;
        try {
            allData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        } catch (e) {
            console.error("Error parsing celerya_suppliers_data, operation may fail.", e);
            allData = {};
        }

        if (oldCustomer.slug !== newSlug && allData[oldCustomer.slug]) {
            allData[newSlug] = allData[oldCustomer.slug];
            delete allData[oldCustomer.slug];
            localStorage.setItem('celerya_suppliers_data', JSON.stringify(allData));
        }
        setRenamingCustomerId(null);
    };
    
    const handleDeleteCustomer = (customerId: string) => {
       const customerToDelete = customers.find(c => c.id === customerId);
       if (!customerToDelete) return;

       if (window.confirm(`Sei sicuro di voler eliminare la cartella "${customerToDelete.name}"? Tutti i fornitori e i documenti associati andranno persi definitivamente.`)) {
           const updatedCustomers = customers.filter(c => c.id !== customerId);
           setCustomers(updatedCustomers);
           localStorage.setItem('celerya_customers', JSON.stringify(updatedCustomers));
            
           let allData: AllSuppliersData;
           try {
               allData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
           } catch (e) {
               console.error("Error parsing celerya_suppliers_data, operation may fail.", e);
               allData = {};
           }

           if (allData[customerToDelete.slug]) {
               delete allData[customerToDelete.slug];
               localStorage.setItem('celerya_suppliers_data', JSON.stringify(allData));
           }
       }
    };

    const handleFileChange = useCallback((selectedFile: File | null) => { setFile(selectedFile); setError(null); }, []);
    const handleTransportFileChange = useCallback((selectedFile: File | null) => { setTransportFile(selectedFile); setTransportError(null); }, []);

    const handleExtract = async () => {
        if (!file || !selectedCustomer) return;
        setIsExtracting(true); setError(null); setExtractedData(null); setAlerts([]);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const customSchema = getCustomSchema();
            const dynamicPrompt = generatePromptFromSchema(customSchema);
            const imagePart = { inlineData: { mimeType: file.type, data: await fileToBase64(file) } };
            const textPart = { text: dynamicPrompt };

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, textPart] },
                config: { responseMimeType: "application/json" },
            });
            
            let jsonStr = response.text.trim();
            const match = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
            if (match && match[2]) jsonStr = match[2].trim();
            
            const parsedData = JSON.parse(jsonStr);
            const newProduct: Product = { id: generateCeleryaId(), ...parsedData };
            setAlerts(generateAlertsFromSchema(newProduct, customSchema));
            setExtractedData(newProduct);
            setActiveSchema(customSchema);
            setFile(null);
        } catch (e) {
            console.error("Extraction failed:", e);
            setError("L'estrazione dei dati è fallita. Controlla il file e riprova.");
        } finally { setIsExtracting(false); }
    };
    
    const handleAnalyzeTransport = async () => {
        if (!transportFile || !selectedCustomer) return;
        setIsAnalyzingTransport(true); setTransportError(null); setTransportData(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const imagePart = { inlineData: { mimeType: transportFile.type, data: await fileToBase64(transportFile) } };
            const textPart = { text: transportPrompt };

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: { parts: [imagePart, textPart] },
                config: { responseMimeType: "application/json" },
            });
            
            let jsonStr = response.text.trim();
            const match = jsonStr.match(/^```(\w*)?\s*\n?(.*?)\n?\s*```$/s);
            if (match && match[2]) jsonStr = match[2].trim();
            
            const parsedData = JSON.parse(jsonStr);
            if (!parsedData?.info || !Array.isArray(parsedData.prodotti)) throw new Error("Invalid DDT data structure from AI.");
            const ddtWithId: AnalyzedTransportDocument = { ...parsedData, id: generateCeleryaId() };
            setTransportData(ddtWithId);
            setTransportFile(null);
            
            const mittente = ddtWithId.info.mittente;
            if (mittente) {
                const mittenteSlug = slugify(mittente);
                let allData: AllSuppliersData;
                try {
                    allData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
                } catch (e) {
                    console.error("Error parsing celerya_suppliers_data, DDT save may fail.", e);
                    allData = {};
                }
                if (!allData[selectedCustomer.slug]) allData[selectedCustomer.slug] = { suppliers: {} };
                const customerData = allData[selectedCustomer.slug];
                if (!customerData.suppliers[mittenteSlug]) customerData.suppliers[mittenteSlug] = { name: mittente, pdfs: {}, ddts: {}, celeryaId: generateCeleryaId(), lastUpdate: '' };
                if (!customerData.suppliers[mittenteSlug].ddts) customerData.suppliers[mittenteSlug].ddts = {};
                customerData.suppliers[mittenteSlug].ddts![ddtWithId.id] = { ...ddtWithId, savedAt: new Date().toISOString() };
                customerData.suppliers[mittenteSlug].lastUpdate = new Date().toISOString();
                localStorage.setItem('celerya_suppliers_data', JSON.stringify(allData));
            }
        } catch (e) {
            console.error("Transport analysis failed:", e);
            setTransportError("L'analisi del documento di trasporto è fallita.");
        } finally { setIsAnalyzingTransport(false); }
    };
    
    const handleContextMenu = (e: React.MouseEvent, customerId?: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, customerId }); };
    const status = extractedData ? getOverallStatus(alerts) : null;
    const resetState = () => {
        setFile(null); setExtractedData(null); setAlerts([]); setError(null); setActiveSchema(null);
        setTransportFile(null); setTransportData(null); setTransportError(null);
    };

    const handleGoToCustomerSelection = () => { setSelectedCustomer(null); resetState(); };
    const handleGoToCustomerDashboard = () => resetState();

    return (
        <div className="p-8 bg-gray-50 min-h-full" onContextMenu={(e) => !contextMenu && handleContextMenu(e)}>
            {!selectedCustomer ? (
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                    <p className="text-gray-500 mb-8">Seleziona un cliente o creane uno nuovo con il tasto destro.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {customers.map(customer => (
                            <div
                                key={customer.id}
                                onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, customer.id); }}
                                onClick={() => renamingCustomerId !== customer.id && setSelectedCustomer(customer)}
                                className="group flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-lg hover:border-lime-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500"
                            >
                                <FolderIcon className="w-20 h-20 text-yellow-400 group-hover:text-yellow-500 transition-colors" />
                                {renamingCustomerId === customer.id ? (
                                    <input
                                        ref={renameInputRef} type="text" defaultValue={customer.name}
                                        onBlur={(e) => handleRenameCustomer(customer.id, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameCustomer(customer.id, e.currentTarget.value);
                                            if (e.key === 'Escape') setRenamingCustomerId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-4 text-center font-semibold text-gray-700 bg-gray-100 border border-lime-500 rounded-md w-full"
                                    />
                                ) : (
                                    <span className="mt-4 text-center font-semibold text-gray-700 group-hover:text-lime-600 transition-colors break-all">{customer.name}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : extractedData && status && activeSchema ? (
                <div>
                    <div className="flex justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={handleGoToCustomerSelection} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors" aria-label="Torna alla selezione clienti"><ArrowLeftIcon className="w-6 h-6" /></button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">Risultati Estrazione</h1>
                                <p className="text-gray-500 mt-1">Scheda tecnica per <span className="font-semibold">{selectedCustomer.name}</span> analizzata con successo.</p>
                            </div>
                        </div>
                        <button onClick={handleGoToCustomerDashboard} className="flex-shrink-0 flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors">Estrai un altro documento</button>
                    </div>
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-8"><div ref={pdfContentRef}><PdfContent data={extractedData} alerts={alerts} schema={activeSchema} /></div></div>
                        <div className="col-span-12 lg:col-span-4"><AlertsPanel alerts={alerts} status={status} /></div>
                    </div>
                </div>
            ) : (
                <div>
                     <div className="flex items-center gap-4 mb-6">
                        <button onClick={handleGoToCustomerSelection} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors" aria-label="Torna alla selezione clienti"><ArrowLeftIcon className="w-6 h-6" /></button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                            <p className="text-sm text-gray-500">Cliente: <span className="font-semibold">{selectedCustomer.name}</span></p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <UploadBox title="Carica una scheda tecnica" description="Trascina qui un file PDF o clicca per selezionarlo." actionButtonText="Estrai Informazioni" file={file} isProcessing={isExtracting} onFileChange={handleFileChange} onAction={handleExtract} error={error} acceptedFileTypes=".pdf,.doc,.docx,image/jpeg,image/png" idPrefix="spec-sheet" />
                        {transportData ? (
                            <TransportDataDisplay data={transportData} onAnalyzeAnother={() => { setTransportData(null); setTransportError(null); }} />
                        ) : (
                            <UploadBox title="Carica un documento di trasporto" description="Trascina qui un DDT o un altro documento di trasporto." actionButtonText="Analizza Documento" file={transportFile} isProcessing={isAnalyzingTransport} onFileChange={handleTransportFileChange} onAction={handleAnalyzeTransport} error={transportError} acceptedFileTypes=".pdf,.doc,.docx,image/jpeg,image/png" idPrefix="transport-doc" />
                        )}
                    </div>
                </div>
            )}
            {contextMenu && (
                <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}
                    items={
                        contextMenu.customerId
                            ? [
                                { label: 'Rinomina', onClick: () => setRenamingCustomerId(contextMenu.customerId!) },
                                { label: 'Elimina Cartella', onClick: () => handleDeleteCustomer(contextMenu.customerId!), className: 'text-red-600 hover:bg-red-50' }
                              ]
                            : [{ label: 'Crea Nuova Cartella', onClick: handleCreateCustomer }]
                    }
                />
            )}
        </div>
    );
};

export default DashboardPage;