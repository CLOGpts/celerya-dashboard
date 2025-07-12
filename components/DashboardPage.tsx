import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Alert, AnalyzedTransportDocument, Section, Customer, AllSuppliersData } from '../types';
import PdfContent from './PdfContent';
import { getCustomSchema, generateAlertsFromSchema, generatePromptFromSchema } from '../constants';
import { AlertIcon } from './icons/AlertIcon';
import UploadBox from './UploadBox';
import TransportDataDisplay from './TransportDataDisplay';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

// NOTA: Abbiamo rimosso l'import di LoginPage perché non serve più qui

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
// ... (il resto del prompt non cambia)
`;
const transportPrompt = `Analizza il documento di trasporto (DDT) fornito... ${transportDocSchemaForPrompt}`;

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
                    {/* ... SVG e testo per nessun alert */}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* ... Logica per mostrare alert critici e warning */}
                </div>
            )}
        </div>
    );
};

const fileToBase64 = (file: File): Promise<string> => {
    // ... (la funzione resta invariata)
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
    // ... (il componente ContextMenu resta invariato)
};


const DashboardPage: React.FC = () => {
    // =========================================================================
    // CORREZIONE DEFINITIVA: 
    // Abbiamo rimosso lo stato 'showLogin' e il blocco 'if (showLogin)'
    // che causavano la riapparizione della pagina di login.
    // =========================================================================

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

    const loadCustomers = useCallback(() => { /* ... la tua logica qui ... */ }, []);
    useEffect(() => { loadCustomers(); }, [loadCustomers]);
    useEffect(() => { /* ... la tua logica qui ... */ }, [renamingCustomerId]);
    useEffect(() => { /* ... la tua logica qui ... */ }, [extractedData, selectedCustomer]);
    const handleCreateCustomer = () => { /* ... la tua logica qui ... */ };
    const handleRenameCustomer = (customerId: string, newName: string) => { /* ... la tua logica qui ... */ };
    const handleDeleteCustomer = (customerId: string) => { /* ... la tua logica qui ... */ };
    const handleFileChange = useCallback((selectedFile: File | null) => { setFile(selectedFile); setError(null); }, []);
    const handleTransportFileChange = useCallback((selectedFile: File | null) => { setTransportFile(selectedFile); setTransportError(null); }, []);
    const handleExtract = async () => { /* ... la tua logica qui ... */ };
    const handleAnalyzeTransport = async () => { /* ... la tua logica qui ... */ };
    const handleContextMenu = (e: React.MouseEvent, customerId?: string) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, customerId }); };
    const status = extractedData ? getOverallStatus(alerts) : null;
    const resetState = () => {
        setFile(null); setExtractedData(null); setAlerts([]); setError(null); setActiveSchema(null);
        setTransportFile(null); setTransportData(null); setTransportError(null);
    };
    const handleGoToCustomerSelection = () => { setSelectedCustomer(null); resetState(); };
    const handleGoToCustomerDashboard = () => resetState();

    // Ora il componente restituisce direttamente la VERA dashboard
    return (
        <div className="p-8 bg-gray-50 min-h-full" onContextMenu={(e) => !contextMenu && handleContextMenu(e)}>
            {!selectedCustomer ? (
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                    {/* ... resto del codice per la selezione dei clienti ... */}
                </div>
            ) : extractedData && status && activeSchema ? (
                <div>
                    {/* ... resto del codice per i risultati dell'estrazione ... */}
                </div>
            ) : (
                <div>
                     <div className="flex items-center gap-4 mb-6">
                        {/* ... resto del codice per l'upload ... */}
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
