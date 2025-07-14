import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import * as QRCode from 'qrcode';
import { Product, Alert, AnalyzedTransportDocument, Section, AllSuppliersData, Customer } from '../types';
import PdfContent from './PdfContent';
import { DownloadIcon } from './icons/DownloadIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { getCustomSchema, generateAlertsFromSchema } from '../constants';
import { ExcelIcon } from './icons/ExcelIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

type EnhancedProduct = Product & { savedAt:string };
type EnhancedDDT = AnalyzedTransportDocument & { savedAt:string };

interface Supplier {
    slug: string;
    name: string;
    docCount: number;
    lastUpdate: string;
    celeryaId?: string;
    pdfs: Record<string, EnhancedProduct>;
    ddts?: Record<string, EnhancedDDT>;
    customerName: string;
    customerSlug: string;
}

const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString('it-IT');
}

const generateDDTExcel = (data: AnalyzedTransportDocument) => {
    const infoData = [
        { Campo: 'Mittente', Valore: data.info.mittente || 'N/D' },
        { Campo: 'Destinatario', Valore: data.info.destinatario || 'N/D' },
        { Campo: 'Numero DDT', Valore: data.info.numeroDDT || 'N/D' },
        { Campo: 'Data DDT', Valore: formatDate(data.info.dataDDT) ?? 'N/D' },
        { Campo: 'Vettore', Valore: data.info.vettore || 'N/D' },
    ];
    const infoSheet = XLSX.utils.json_to_sheet(infoData);
    infoSheet['!cols'] = [{ wch: 20 }, { wch: 50 }];

    const productsData = data.prodotti.map(product => ({
        'Prodotto': product.descrizione || 'MANCANTE',
        'Quantità': product.quantita || 'MANCANTE',
        'Lotto': product.lotto || 'MANCANTE',
        'Scadenza': formatDate(product.scadenza) || 'MANCANTE'
    }));
    const productsSheet = XLSX.utils.json_to_sheet(productsData);
    productsSheet['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, infoSheet, 'Informazioni DDT');
    XLSX.utils.book_append_sheet(wb, productsSheet, 'Elenco Prodotti');
    
    const ddtNumber = data.info.numeroDDT || 'DDT';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Standard Celerya DDT - ${ddtNumber.replace(/[\/\\]/g, '_')} - ${timestamp}.xlsx`;

    XLSX.writeFile(wb, filename);
};

const ResourceCreationModal: React.FC<{
    pdf: EnhancedProduct;
    supplier: Supplier;
    onClose: () => void;
    onSave: (customerSlug: string, supplierSlug: string, pdfId: string, qrCodeUrl: string) => void;
}> = ({ pdf, supplier, onClose, onSave }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [qrLink, setQrLink] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const pdfPreviewRef = useRef<HTMLDivElement>(null);

    const fullSchema = useMemo(() => getCustomSchema(), []);
    const alerts = useMemo(() => generateAlertsFromSchema(pdf, fullSchema), [pdf, fullSchema]);

    useEffect(() => {
        const url = `${window.location.origin}${window.location.pathname}?resource_id=${pdf.id}`;
        setQrLink(url);
        QRCode.toDataURL(url, { width: 256, margin: 1 })
            .then(dataUrl => setQrCodeDataUrl(dataUrl))
            .catch(err => console.error("Failed to generate QR code", err));
    }, [pdf.id]);

    const handleSave = () => {
        setIsSaving(true);
        onSave(supplier.customerSlug, supplier.slug, pdf.id, qrLink);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Crea Risorsa QR (Scheda Tecnica)</h2>
                        <p className="text-sm text-gray-500 truncate">Anteprima per: {pdf.identificazione.denominazioneScheda}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <PdfContent ref={pdfPreviewRef} data={pdf} alerts={alerts} schema={fullSchema} qrCodeDataUrl={qrCodeDataUrl ?? undefined} />
                </main>
                <footer className="p-4 border-t border-gray-200 flex justify-end items-center gap-3 flex-shrink-0 bg-white">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">Annulla</button>
                    <button onClick={handleSave} disabled={isSaving || !qrCodeDataUrl} className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-lime-600 hover:bg-lime-700 disabled:bg-lime-400 flex items-center gap-2">
                        {isSaving ? <SpinnerIcon /> : <QrCodeIcon />}
                        Salva e Associa QR Code
                    </button>
                </footer>
            </div>
        </div>
    );
};

const InfoItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 font-semibold">{value || 'N/D'}</dd>
    </div>
);

const MissingValue: React.FC = () => (
    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">MANCANTE</span>
);


const DDTResourceCreationModal: React.FC<{
    ddt: EnhancedDDT;
    supplier: Supplier;
    onClose: () => void;
    onSave: (customerSlug: string, supplierSlug: string, ddtId: string, qrCodeUrl: string) => void;
}> = ({ ddt, supplier, onClose, onSave }) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [qrLink, setQrLink] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const url = `${window.location.origin}${window.location.pathname}?supplier_slug=${supplier.slug}&ddt_id=${ddt.id}`;
        setQrLink(url);
        QRCode.toDataURL(url, { width: 256, margin: 1 })
            .then(dataUrl => setQrCodeDataUrl(dataUrl))
            .catch(err => console.error("Failed to generate QR code", err));
    }, [ddt.id, supplier.slug]);
    
    const handleSave = () => {
        setIsSaving(true);
        onSave(supplier.customerSlug, supplier.slug, ddt.id, qrLink);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Crea Risorsa QR (DDT)</h2>
                        <p className="text-sm text-gray-500 truncate">Anteprima per DDT N. {ddt.info.numeroDDT}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50 relative">
                     <header className="mb-8 text-center border-b border-gray-300 pb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Documento di Trasporto</h2>
                        <p className="text-lg text-slate-700 mt-1">Mittente: {ddt.info.mittente}</p>
                        <p className="text-sm text-slate-500 mt-2">DDT N. {ddt.info.numeroDDT} &middot; Data: {formatDate(ddt.info.dataDDT)}</p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">ID Risorsa: {ddt.id}</p>
                        {qrCodeDataUrl && (
                        <div className="absolute top-4 right-4 p-1 bg-white rounded-md shadow-md">
                            <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24" />
                        </div>
                        )}
                    </header>
                     <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 bg-white rounded-lg border border-gray-200 mb-6">
                        <InfoItem label="Destinatario" value={ddt.info.destinatario} />
                        <InfoItem label="Vettore" value={ddt.info.vettore} />
                    </dl>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Prodotto</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Quantità</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Lotto</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Scadenza</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {ddt.prodotti.map((product, index) => {
                                    const formattedDate = formatDate(product.scadenza);
                                    const isLottoMissing = !product.lotto || product.lotto.trim() === '';
                                    const isScadenzaMissing = !formattedDate;

                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-gray-800 font-medium">{product.descrizione || <MissingValue />}</td>
                                            <td className="px-4 py-3 text-gray-600">{product.quantita || <MissingValue />}</td>
                                            <td className={`px-4 py-3 text-gray-600 ${isLottoMissing ? 'bg-red-50/75' : ''}`}>{isLottoMissing ? <MissingValue /> : product.lotto}</td>
                                            <td className={`px-4 py-3 text-gray-600 ${isScadenzaMissing ? 'bg-red-50/75' : ''}`}>{isScadenzaMissing ? <MissingValue /> : formattedDate}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>
                <footer className="p-4 border-t border-gray-200 flex justify-end items-center gap-3 flex-shrink-0 bg-white">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">Annulla</button>
                    <button onClick={handleSave} disabled={isSaving || !qrCodeDataUrl} className="px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-lime-600 hover:bg-lime-700 disabled:bg-lime-400 flex items-center gap-2">
                        {isSaving ? <SpinnerIcon /> : <QrCodeIcon />}
                        Salva e Associa QR Code
                    </button>
                </footer>
            </div>
        </div>
    );
};



const SuppliersListPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [pdfToGenerate, setPdfToGenerate] = useState<{ product: EnhancedProduct, qrCodeDataUrl?: string } | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const pdfGenRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'pdfs' | 'ddts'>('pdfs');
    const [resourceModal, setResourceModal] = useState<{ open: boolean; pdf: EnhancedProduct | null; supplier: Supplier | null }>({ open: false, pdf: null, supplier: null });
    const [ddtResourceModal, setDdtResourceModal] = useState<{ open: boolean; ddt: EnhancedDDT | null; supplier: Supplier | null }>({ open: false, ddt: null, supplier: null });


    const loadSuppliers = useCallback(() => {
        let suppliersData: AllSuppliersData;
        try {
            suppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        } catch (e) {
            console.error("Failed to parse celerya_suppliers_data from localStorage. Using empty data.", e);
            suppliersData = {};
        }

        let customers: Customer[];
        try {
            customers = JSON.parse(localStorage.getItem('celerya_customers') || '[]');
        } catch (e) {
            console.error("Failed to parse celerya_customers from localStorage. Using empty data.", e);
            customers = [];
        }

        const customerMap = new Map(customers.map(c => [c.slug, c.name]));
        const supplierList: Supplier[] = [];
        
        for(const customerSlug in suppliersData) {
            const customerName = customerMap.get(customerSlug) || customerSlug;
            const customerSuppliers = suppliersData[customerSlug].suppliers;

            for (const supplierSlug in customerSuppliers) {
                const sData = customerSuppliers[supplierSlug];
                supplierList.push({
                    slug: supplierSlug,
                    name: sData.name,
                    docCount: Object.keys(sData.pdfs || {}).length + Object.keys(sData.ddts || {}).length,
                    lastUpdate: sData.lastUpdate,
                    celeryaId: sData.celeryaId,
                    pdfs: sData.pdfs,
                    ddts: sData.ddts,
                    customerName: customerName,
                    customerSlug: customerSlug
                });
            }
        }
        
        supplierList.sort((a,b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime());
        setSuppliers(supplierList);
    }, []);

    useEffect(() => {
        loadSuppliers();
    }, [loadSuppliers]);

    const pdfRenderData = useMemo(() => {
        if (!pdfToGenerate?.product) return null;
        const schema = getCustomSchema();
        const alerts = generateAlertsFromSchema(pdfToGenerate.product, schema);
        return { schema, alerts };
    }, [pdfToGenerate]);
    
    useEffect(() => {
        const generate = async () => {
            if (pdfToGenerate && pdfGenRef.current && pdfRenderData) {
                setIsGenerating(true);
                await new Promise(resolve => setTimeout(resolve, 500)); 
    
                const productCode = pdfToGenerate.product.identificazione.codiceProdotto;
                const issueDate = new Date(pdfToGenerate.product.identificazione.dataRedazione).toISOString().split('T')[0];
                const filename = `Standard Celerya - ${productCode} - ${issueDate}.pdf`;
    
                const canvas = await html2canvas(pdfGenRef.current, { scale: 2, useCORS: true, backgroundColor: '#f1f5f9' });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: [canvas.width, canvas.height] });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save(filename);
    
                setPdfToGenerate(null);
                setIsGenerating(false);
            }
        }
        generate();
    }, [pdfToGenerate, pdfRenderData]);

    const handleSupplierClick = useCallback((supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setActiveTab('pdfs');
        setDrawerOpen(true);
    }, []);

    const handleCloseDrawer = useCallback(() => {
        setDrawerOpen(false);
    }, []);
    
    const handleDownloadPdfClick = useCallback(async (pdfData: EnhancedProduct) => {
        let qrCodeDataUrlForPdf: string | undefined = undefined;
        if (pdfData.qrCodeUrl) {
            try {
                qrCodeDataUrlForPdf = await QRCode.toDataURL(pdfData.qrCodeUrl, { width: 96, margin: 1 });
            } catch (err) {
                console.error("Failed to generate QR for PDF download", err);
            }
        }
        setPdfToGenerate({ product: pdfData, qrCodeDataUrl: qrCodeDataUrlForPdf });
    }, []);
    
    const handleDownloadDDTClick = useCallback((ddtData: AnalyzedTransportDocument) => {
        generateDDTExcel(ddtData);
    }, []);

    const handleCreateResourceClick = (pdf: EnhancedProduct, supplier: Supplier) => {
        setResourceModal({ open: true, pdf, supplier });
    };

    const handleCreateDDTResourceClick = (ddt: EnhancedDDT, supplier: Supplier) => {
        setDdtResourceModal({ open: true, ddt, supplier });
    };

    const handleSaveResource = (customerSlug: string, supplierSlug: string, pdfId: string, qrCodeUrl: string) => {
        let allData: AllSuppliersData;
        try {
            allData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        } catch (e) {
            console.error("Failed to parse celerya_suppliers_data, resource link may not be saved.", e);
            allData = {};
        }
        
        if (allData[customerSlug]?.suppliers?.[supplierSlug]?.pdfs?.[pdfId]) {
            allData[customerSlug].suppliers[supplierSlug].pdfs[pdfId].qrCodeUrl = qrCodeUrl;
            localStorage.setItem('celerya_suppliers_data', JSON.stringify(allData));
            loadSuppliers();
            
            const updatedSupplierData = allData[customerSlug].suppliers[supplierSlug];
            setSelectedSupplier(s => s ? {
                ...s, 
                pdfs: updatedSupplierData.pdfs,
                ddts: updatedSupplierData.ddts,
            } : null);
        }
        setResourceModal({ open: false, pdf: null, supplier: null });
    };

    const handleSaveDDTResource = (customerSlug: string, supplierSlug: string, ddtId: string, qrCodeUrl: string) => {
        let allData: AllSuppliersData;
        try {
            allData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        } catch (e) {
            console.error("Failed to parse celerya_suppliers_data, resource link may not be saved.", e);
            allData = {};
        }

        if (allData[customerSlug]?.suppliers?.[supplierSlug]?.ddts?.[ddtId]) {
            allData[customerSlug].suppliers[supplierSlug].ddts![ddtId].qrCodeUrl = qrCodeUrl;
            localStorage.setItem('celerya_suppliers_data', JSON.stringify(allData));
            loadSuppliers();
            
            const updatedSupplierData = allData[customerSlug].suppliers[supplierSlug];
             setSelectedSupplier(s => s ? {
                ...s, 
                pdfs: updatedSupplierData.pdfs,
                ddts: updatedSupplierData.ddts,
            } : null);
        }
        setDdtResourceModal({ open: false, ddt: null, supplier: null });
    };

    const sortedPdfs = useMemo(() => {
        if (!selectedSupplier || !selectedSupplier.pdfs) return [];
        return Object.values(selectedSupplier.pdfs).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }, [selectedSupplier]);

    const sortedDdts = useMemo(() => {
        if (!selectedSupplier || !selectedSupplier.ddts) return [];
        return Object.values(selectedSupplier.ddts).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }, [selectedSupplier]);

    const pdfsCount = sortedPdfs.length;
    const ddtsCount = sortedDdts.length;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Lista Fornitori</h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produttore</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Documenti</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultimo Aggiornamento</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {suppliers.length > 0 ? suppliers.map(supplier => (
                            <tr key={`${supplier.customerSlug}-${supplier.slug}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button onClick={() => handleSupplierClick(supplier)} className="text-gray-800 font-medium hover:text-lime-600 hover:underline text-left">
                                        {supplier.name}
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">{supplier.customerName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{supplier.docCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(supplier.lastUpdate).toLocaleString('it-IT')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <button
                                        onClick={() => handleSupplierClick(supplier)}
                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 transition-colors"
                                    >
                                        Gestisci Documenti
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">Nessun fornitore trovato. Inizia estraendo una scheda tecnica.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Drawer Overlay */}
            <div className={`fixed inset-0 bg-black/30 z-30 transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleCloseDrawer}/>

            {/* Drawer Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedSupplier && (
                    <div className="flex flex-col h-full">
                        <header className="p-4 border-b border-gray-200 flex justify-between items-start bg-gray-50">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Documenti per {selectedSupplier.name}</h2>
                                <p className="text-sm text-gray-500">Cliente: {selectedSupplier.customerName} &middot; {selectedSupplier.docCount} documenti</p>
                            </div>
                            <button onClick={handleCloseDrawer} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </header>
                        
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-6 px-4">
                                <button onClick={() => setActiveTab('pdfs')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${ activeTab === 'pdfs' ? 'border-lime-500 text-lime-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}>Schede Tecniche ({pdfsCount})</button>
                                <button onClick={() => setActiveTab('ddts')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${ activeTab === 'ddts' ? 'border-lime-500 text-lime-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }`}>Doc. di Trasporto ({ddtsCount})</button>
                            </nav>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            {activeTab === 'pdfs' && (
                                <ul className="space-y-3">
                                    {sortedPdfs.length > 0 ? sortedPdfs.map(pdf => {
                                        const issueDate = new Date(pdf.identificazione.dataRedazione).toLocaleDateString('it-IT');
                                        return (
                                            <li key={pdf.id} className="p-3 bg-white border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-3">
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-gray-800">{pdf.identificazione.denominazioneScheda}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Codice: {pdf.identificazione.codiceProdotto} &middot; Redazione: {issueDate}</p>
                                                    <p className="text-xs text-gray-500 mt-1">ID Risorsa: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{pdf.id}</span></p>
                                                </div>
                                                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                                    {pdf.qrCodeUrl ? (
                                                        <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 py-1 px-2 rounded-full">
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                            <span>Risorsa Creata</span>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleCreateResourceClick(pdf, selectedSupplier)} 
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                                                            title="Crea Risorsa QR"
                                                        >
                                                            <QrCodeIcon className="w-4 h-4" /> Crea Risorsa
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDownloadPdfClick(pdf)} disabled={isGenerating && pdfToGenerate?.product.id === pdf.id} className="flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md text-slate-600 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:bg-slate-400 disabled:cursor-wait" title="Scarica PDF">
                                                        {isGenerating && pdfToGenerate?.product.id === pdf.id ? <SpinnerIcon className="text-white"/> : <DownloadIcon />}
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    }) : <p className="text-center text-gray-500 py-8">Nessuna scheda tecnica trovata.</p>}
                                </ul>
                            )}
                             {activeTab === 'ddts' && (
                                <ul className="space-y-3">
                                    {sortedDdts.length > 0 ? sortedDdts.map(ddt => {
                                        const ddtDate = formatDate(ddt.info.dataDDT);
                                        return (
                                            <li key={ddt.id} className="p-3 bg-white border border-gray-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-3">
                                                <div className="flex-grow">
                                                    <p className="font-semibold text-gray-800">DDT: {ddt.info.numeroDDT || 'N/D'}</p>
                                                    <p className="text-xs text-gray-500">Data: {ddtDate} &middot; Dest: {ddt.info.destinatario}</p>
                                                    <p className="text-xs text-gray-500 mt-1">ID Risorsa: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{ddt.id}</span></p>
                                                </div>
                                                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                                                    {ddt.qrCodeUrl ? (
                                                        <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 py-1 px-2 rounded-full">
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                            <span>Risorsa Creata</span>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleCreateDDTResourceClick(ddt, selectedSupplier)}
                                                            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                                                            title="Crea Risorsa QR per DDT"
                                                        >
                                                            <QrCodeIcon className="w-4 h-4" /> Crea Risorsa
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDownloadDDTClick(ddt)} className="flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors" title="Scarica Excel"><ExcelIcon /></button>
                                                </div>
                                            </li>
                                        );
                                    }) : <p className="text-center text-gray-500 py-8">Nessun documento di trasporto trovato.</p>}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {resourceModal.open && resourceModal.pdf && resourceModal.supplier && (
                <ResourceCreationModal 
                    pdf={resourceModal.pdf}
                    supplier={resourceModal.supplier}
                    onClose={() => setResourceModal({ open: false, pdf: null, supplier: null })}
                    onSave={handleSaveResource}
                />
            )}

            {ddtResourceModal.open && ddtResourceModal.ddt && ddtResourceModal.supplier && (
                <DDTResourceCreationModal 
                    ddt={ddtResourceModal.ddt}
                    supplier={ddtResourceModal.supplier}
                    onClose={() => setDdtResourceModal({ open: false, ddt: null, supplier: null })}
                    onSave={handleSaveDDTResource}
                />
            )}

            {pdfToGenerate && pdfRenderData && (
                 <div className="fixed left-[-9999px] top-0 p-4 w-[8.5in]">
                    <PdfContent 
                        data={pdfToGenerate.product} 
                        alerts={pdfRenderData.alerts}
                        schema={pdfRenderData.schema} 
                        ref={pdfGenRef} 
                        qrCodeDataUrl={pdfToGenerate.qrCodeDataUrl}
                    />
                </div>
            )}
        </div>
    );
};

export default SuppliersListPage;

