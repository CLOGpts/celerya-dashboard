import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AllSuppliersData, Customer, Supplier, Product, DDT } from '../types';
import { DownloadIcon, ExcelIcon, QrCodeIcon, EyeIcon, ArrowLeftIcon } from './icons';
import PdfContent from './PdfContent';
import ResourceQrModal from './ResourceQrModal';
import DDTResourceQrModal from './DDTResourceQrModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx-js-style';

const SuppliersListPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [activeTab, setActiveTab] = useState<'pdfs' | 'ddts'>('pdfs');
    
    const [pdfToGenerate, setPdfToGenerate] = useState<Product | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);

    const [resourceModal, setResourceModal] = useState<{ isOpen: boolean; data: any; supplier: Supplier | null }>({ isOpen: false, data: null, supplier: null });
    const [ddtResourceModal, setDdtResourceModal] = useState<{ isOpen: boolean; data: any; supplier: Supplier | null }>({ isOpen: false, data: null, supplier: null });

    const loadSuppliers = useCallback(() => {
        setIsLoading(true);
        try {
            const suppliersData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
            const customers: Customer[] = JSON.parse(localStorage.getItem('celerya_customers') || '[]');
            const customerMap = new Map(customers.map(c => [c.slug, c.name]));

            const supplierList: Supplier[] = Object.entries(suppliersData).map(([name, data]) => ({
                id: name.replace(/\s+/g, '-').toLowerCase(),
                name,
                customerName: data.customerName || customerMap.get(data.customerSlug) || 'Cliente non trovato',
                customerSlug: data.customerSlug,
                lastUpdate: data.lastUpdate,
                status: 'Analizzato',
                pdfs: data.pdfs || [],
                ddts: data.ddts || [],
            }));

            setSuppliers(supplierList.sort((a, b) => new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()));
        } catch (e) {
            console.error("Errore nel caricamento dei dati fornitori:", e);
            setSuppliers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSuppliers();
        const handleDataUpdate = () => loadSuppliers();
        window.addEventListener('celerya-data-updated', handleDataUpdate);
        return () => {
            window.removeEventListener('celerya-data-updated', handleDataUpdate);
        };
    }, [loadSuppliers]);

    useEffect(() => {
        if (pdfToGenerate && pdfRef.current) {
            setIsGenerating(true);
            setTimeout(async () => {
                const element = pdfRef.current;
                if (element) {
                    const canvas = await html2canvas(element, { scale: 2 });
                    const data = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`SchedaTecnica_${pdfToGenerate.identificazione?.codiceProdotto || 'export'}.pdf`);
                }
                setPdfToGenerate(null);
                setIsGenerating(false);
            }, 500);
        }
    }, [pdfToGenerate]);

    const handleSupplierClick = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setActiveTab('pdfs');
        setDrawerOpen(true);
    };

    const handleDownloadPdfClick = (pdfData: Product) => {
        setPdfToGenerate(pdfData);
    };

    const handleDownloadExcelClick = (product: Product) => {
        const wb = XLSX.utils.book_new();
        const wsData: any[][] = [
            ["Campo", "Valore"],
            ["Produttore", product.identificazione?.produttore],
            ["Denominazione", product.descrizione?.denominazioneLegale]
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Scheda Tecnica");
        XLSX.writeFile(wb, `Report_${product.identificazione?.codiceProdotto}.xlsx`);
    };
    
    const handleDownloadDDTClick = (ddtData: DDT) => {
        const wb = XLSX.utils.book_new();
        const wsInfo = XLSX.utils.json_to_sheet([
            { A: "Mittente", B: ddtData.mittente },
            { A: "Destinatario", B: ddtData.destinatario },
            { A: "Data", B: ddtData.dataDocumento },
        ], { header: ["A", "B"], skipHeader: true });
        XLSX.utils.book_append_sheet(wb, wsInfo, "Info DDT");
        
        const wsItems = XLSX.utils.json_to_sheet(ddtData.items);
        XLSX.utils.book_append_sheet(wb, wsItems, "Prodotti");
        
        XLSX.writeFile(wb, `DDT_${ddtData.numeroDocumento}.xlsx`);
    };

    const handleCreateResourceClick = (pdf: Product, supplier: Supplier) => {
        setResourceModal({ isOpen: true, data: pdf, supplier });
    };

    const handleCreateDDTResourceClick = (ddt: DDT, supplier: Supplier) => {
        setDdtResourceModal({ isOpen: true, data: ddt, supplier });
    };

    const handleSaveResource = (customerSlug: string, supplierName: string, pdfId: string, qrCodeUrl: string) => {
        const suppliersData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        const supplier = suppliersData[supplierName];
        if (supplier && supplier.pdfs) {
            const pdfIndex = supplier.pdfs.findIndex(p => p.id === pdfId);
            if (pdfIndex > -1) {
                supplier.pdfs[pdfIndex].qrCodeUrl = qrCodeUrl;
                localStorage.setItem('celerya_suppliers_data', JSON.stringify(suppliersData));
                loadSuppliers();
                setSelectedSupplier(prev => prev ? {...prev, pdfs: supplier.pdfs} : null);
            }
        }
        setResourceModal({ isOpen: false, data: null, supplier: null });
    };

    const handleSaveDDTResource = (customerSlug: string, supplierName: string, ddtId: string, qrCodeUrl: string) => {
        const suppliersData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        const supplier = suppliersData[supplierName];
        if (supplier && supplier.ddts) {
            const ddtIndex = supplier.ddts.findIndex(d => d.id === ddtId);
            if (ddtIndex > -1) {
                supplier.ddts[ddtIndex].qrCodeUrl = qrCodeUrl;
                localStorage.setItem('celerya_suppliers_data', JSON.stringify(suppliersData));
                loadSuppliers();
                setSelectedSupplier(prev => prev ? {...prev, ddts: supplier.ddts} : null);
            }
        }
        setDdtResourceModal({ isOpen: false, data: null, supplier: null });
    };

    return (
        <>
            <div className="p-8 bg-gray-50 min-h-full">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Lista Fornitori</h1>
                        <p className="text-gray-500 mt-1">Hub centrale per la gestione dei documenti.</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600">NOME FORNITORE</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">CARTELLA CLIENTE</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">DOCUMENTI</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">ULTIMA ANALISI</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {suppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{supplier.name}</td>
                                    <td className="p-4 text-gray-600">{supplier.customerName}</td>
                                    <td className="p-4 text-gray-600">{(supplier.pdfs?.length || 0) + (supplier.ddts?.length || 0)}</td>
                                    <td className="p-4 text-gray-600 font-mono text-sm">{new Date(supplier.lastUpdate).toLocaleString('it-IT')}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleSupplierClick(supplier)} className="p-2 rounded-md hover:bg-gray-200"><EyeIcon className="w-5 h-5 text-gray-600" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={`fixed top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-40 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: 'clamp(400px, 50vw, 800px)' }}>
                {selectedSupplier && (
                    <div className="flex flex-col h-full">
                        <header className="p-4 border-b bg-gray-50 flex items-center gap-4">
                            <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full hover:bg-gray-200"><ArrowLeftIcon className="w-6 h-6" /></button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{selectedSupplier.name}</h2>
                                <p className="text-sm text-gray-500">Cliente: {selectedSupplier.customerName}</p>
                            </div>
                        </header>
                        <div className="border-b"><nav className="flex gap-4 px-4">
                            <button onClick={() => setActiveTab('pdfs')} className={`py-3 px-1 font-semibold ${activeTab === 'pdfs' ? 'text-lime-600 border-b-2 border-lime-600' : 'text-gray-500'}`}>Schede Tecniche</button>
                            <button onClick={() => setActiveTab('ddts')} className={`py-3 px-1 font-semibold ${activeTab === 'ddts' ? 'text-lime-600 border-b-2 border-lime-600' : 'text-gray-500'}`}>DDT</button>
                        </nav></div>
                        <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
                            {activeTab === 'pdfs' && (selectedSupplier.pdfs || []).map(pdf => (
                                <div key={pdf.id} className="bg-white p-3 rounded-lg shadow-sm mb-3 border flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{pdf.descrizione?.denominazioneLegale}</p>
                                        <p className="text-xs text-gray-500">Codice: {pdf.identificazione?.codiceProdotto}</p>
                                        {pdf.qrCodeUrl && <span className="text-xs font-bold text-green-600">Risorsa QR Creata</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCreateResourceClick(pdf, selectedSupplier)} title="Crea Risorsa QR" className="p-2 rounded-md hover:bg-gray-100"><QrCodeIcon className="w-5 h-5 text-blue-600"/></button>
                                        <button onClick={() => handleDownloadExcelClick(pdf)} title="Esporta Excel" className="p-2 rounded-md hover:bg-gray-100"><ExcelIcon className="w-5 h-5 text-green-600"/></button>
                                        <button onClick={() => handleDownloadPdfClick(pdf)} title="Scarica PDF" className="p-2 rounded-md hover:bg-gray-100"><DownloadIcon className="w-5 h-5 text-red-600"/></button>
                                    </div>
                                </div>
                            ))}
                            {activeTab === 'ddts' && (selectedSupplier.ddts || []).map(ddt => (
                                 <div key={ddt.id} className="bg-white p-3 rounded-lg shadow-sm mb-3 border flex justify-between items-center">
                                     <div>
                                         <p className="font-semibold">DDT N°: {ddt.numeroDocumento}</p>
                                         <p className="text-xs text-gray-500">Data: {ddt.dataDocumento}</p>
                                         {ddt.qrCodeUrl && <span className="text-xs font-bold text-green-600">Risorsa QR Creata</span>}
                                     </div>
                                     <div className="flex gap-2">
                                        <button onClick={() => handleCreateDDTResourceClick(ddt, selectedSupplier)} title="Crea Risorsa QR" className="p-2 rounded-md hover:bg-gray-100"><QrCodeIcon className="w-5 h-5 text-blue-600"/></button>
                                        <button onClick={() => handleDownloadDDTClick(ddt)} title="Esporta Excel" className="p-2 rounded-md hover:bg-gray-100"><ExcelIcon className="w-5 h-5 text-green-600"/></button>
                                     </div>
                                 </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {isGenerating && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                    <PdfContent ref={pdfRef} data={pdfToGenerate!} alerts={[]} schema={null} />
                </div>
            )}
            
            {resourceModal.isOpen && <ResourceQrModal isOpen={resourceModal.isOpen} data={resourceModal.data} supplier={resourceModal.supplier} onClose={() => setResourceModal({isOpen: false, data: null, supplier: null})} onSave={handleSaveResource} />}
            {ddtResourceModal.isOpen && <DDTResourceQrModal isOpen={ddtResourceModal.isOpen} data={ddtResourceModal.data} supplier={ddtResourceModal.supplier} onClose={() => setDdtResourceModal({isOpen: false, data: null, supplier: null})} onSave={handleSaveDDTResource} />}
        </>
    );
};

export default SuppliersListPage;
