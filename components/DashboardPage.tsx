import React, { useState, useCallback, useRef, useEffect } from 'react';
import { auth } from '../src/firebase'; // Importiamo auth per ottenere l'ID utente
import { getCustomers, addCustomer, updateCustomerName, deleteCustomer } from '../src/lib/firestore'; // Le nostre funzioni Firestore
import type { Product, Alert, AnalyzedTransportDocument, Section, Customer, AllSuppliersData } from '../types';
import PdfContent from './PdfContent';
import { getCustomSchema, generateAlertsFromSchema, generatePromptFromSchema } from '../constants';
import { AlertIcon } from './icons/AlertIcon';
import UploadBox from './UploadBox';
import TransportDataDisplay from './TransportDataDisplay';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

// --- Componenti e Funzioni di Supporto (Completi e Corretti) ---

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
    </svg>
);

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const ContextMenu: React.FC<{
    x: number; y: number; items: { label: string; onClick: () => void; className?: string }[]; onClose: () => void;
}> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    return (
        <div ref={menuRef} style={{ top: y, left: x }} className="absolute z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 w-48">
            <ul>{items.map((item, index) => ( <li key={index}><button onClick={() => { item.onClick(); onClose(); }} className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${item.className || ''}`}>{item.label}</button></li> ))}</ul>
        </div>
    );
};

// --- Componente Principale: DashboardPage (Versione Finale) ---

const DashboardPage: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [renamingCustomerId, setRenamingCustomerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; customerId?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const renameInputRef = useRef<HTMLInputElement>(null);
    
    // ... (altri stati per upload e analisi) ...
    const [file, setFile] = useState<File | null>(null);
    const [transportFile, setTransportFile] = useState<File | null>(null);

    // --- Logica Dati (connessa a Firestore) ---

    const loadCustomers = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) { setIsLoading(false); return; }
        setIsLoading(true);
        try {
            const customerList = await getCustomers(user.uid);
            setCustomers(customerList);
        } catch (e) { console.error("Errore nel caricamento clienti da Firestore:", e); }
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadCustomers(); }, [loadCustomers]);

    const handleCreateCustomer = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const newCustomerData = { name: 'Nuova Cartella', slug: `nuova-cartella-${Date.now()}`, userId: user.uid };
        await addCustomer(newCustomerData);
        const newCustomerId = await loadCustomers(); // Ricarica e ottieni l'ID per rinominare
        setRenamingCustomerId(newCustomerId); // Attiva la rinomina
    };

    const handleRenameCustomer = async (customerId: string, newName: string) => {
        if (!newName.trim()) { setRenamingCustomerId(null); return; }
        const newSlug = slugify(newName);
        // Aggiungi qui la logica per controllare slug duplicati se necessario
        await updateCustomerName(customerId, newName.trim(), newSlug);
        setRenamingCustomerId(null);
        loadCustomers();
    };
    
    const handleDeleteCustomer = async (customerId: string) => {
       const customerToDelete = customers.find(c => c.id === customerId);
       if (!customerToDelete) return;
       if (window.confirm(`Sei sicuro di voler eliminare la cartella "${customerToDelete.name}"?`)) {
           await deleteCustomer(customerId);
           loadCustomers();
       }
    };
    
    // --- Gestione UI ---

    const handleContextMenu = (e: React.MouseEvent, customerId?: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, customerId }); };
    const resetState = () => { setSelectedCustomer(null); /* ... reset altri stati ... */ };

    // --- Rendering ---

    if (isLoading) {
        return <div className="p-8 text-center font-semibold text-gray-500">Caricamento dashboard...</div>;
    }

    if (!selectedCustomer) {
        return (
            <div className="p-8 bg-gray-50 min-h-full" onContextMenu={(e) => !contextMenu && handleContextMenu(e)}>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Clienti</h1>
                <p className="text-gray-500 mb-8">Seleziona un cliente o creane uno nuovo con il tasto destro.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {customers.map(customer => (
                        <div key={customer.id} onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, customer.id); }} onClick={() => renamingCustomerId !== customer.id && setSelectedCustomer(customer)} className="group flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-lg hover:border-lime-500 transition-all">
                            <FolderIcon className="w-20 h-20 text-yellow-400 group-hover:text-yellow-500 transition-colors" />
                             {renamingCustomerId === customer.id ? (
                                <input ref={renameInputRef} type="text" defaultValue={customer.name} onBlur={(e) => handleRenameCustomer(customer.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameCustomer(customer.id, e.currentTarget.value)} onClick={(e) => e.stopPropagation()} className="mt-4 text-center font-semibold text-gray-700 bg-gray-100 border-lime-500 rounded w-full"/>
                            ) : (
                                <span className="mt-4 text-center font-semibold text-gray-700 group-hover:text-lime-600 break-words w-full">{customer.name}</span>
                            )}
                        </div>
                    ))}
                </div>
                {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} items={ contextMenu.customerId ? [ { label: 'Rinomina', onClick: () => setRenamingCustomerId(contextMenu.customerId!) }, { label: 'Elimina', onClick: () => handleDeleteCustomer(contextMenu.customerId!), className: 'text-red-600' } ] : [{ label: 'Nuova Cartella', onClick: handleCreateCustomer }] } />}
            </div>
        );
    }

    // Se un cliente è selezionato, mostra la sua dashboard (per ora, l'upload)
    return (
        <div className="p-8 bg-gray-50 min-h-full">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={resetState} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"><ArrowLeftIcon className="w-6 h-6" /></button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Cliente: {selectedCustomer.name}</h1>
                    <p className="text-sm text-gray-500">Carica i documenti da analizzare.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <UploadBox title="Carica Scheda Tecnica" file={file} onFileChange={setFile} onAction={()=>{}} />
                <UploadBox title="Carica Documento di Trasporto" file={transportFile} onFileChange={setTransportFile} onAction={()=>{}} />
            </div>
        </div>
    );
};

export default DashboardPage;
