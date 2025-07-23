import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Supplier, Product, DDT } from '../types';
import { DownloadIcon, ExcelIcon, QrCodeIcon, EyeIcon, ArrowLeftIcon } from './icons';
import PdfContent from './PdfContent';
import ResourceQrModal from './ResourceQrModal';
import DDTResourceQrModal from './DDTResourceQrModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx-js-style';
import { auth } from '../src/firebase';
import { getSuppliersWithDocuments, savePdfResourceUrl, saveDdtResourceUrl } from '../src/lib/firestore';
import { CELERYA_STANDARD } from '../constants';

// --- Componente Principale ---
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

    const loadSuppliers = useCallback(async () => {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
            setIsLoading(false);
            setSuppliers([]);
            return;
        }
        try {
            const supplierList = await getSuppliersWithDocuments(user.uid);
            setSuppliers(supplierList);
        } catch (e) {
            console.error("Errore caricamento fornitori da Firestore:", e);
            setSuppliers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                loadSuppliers();
            } else {
                setSuppliers([]);
                setIsLoading(false);
            }
        });
        window.addEventListener('celerya-data-updated', loadSuppliers);
        return () => {
            unsubscribe();
            window.removeEventListener('celerya-data-updated', loadSuppliers);
        };
    }, [loadSuppliers]);

    useEffect(() => {
        if (pdfToGenerate && pdfRef.current) {
            setIsGenerating(true);
            setTimeout(async () => {
                const element = pdfRef.current;
                if (element) {
                    const canvas = await html2canvas(element, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    const today = new Date().toLocaleDateString('it-IT').replace(/\//g, '-');
                    const supplierName = pdfToGenerate.identificazione?.produttore || 'Fornitore';
                    pdf.save(`SchedaTecnica_Celerya_${today}_${supplierName}.pdf`);
                }
                setPdfToGenerate(null);
                setIsGenerating(false);
            }, 500);
        }
    }, [pdfToGenerate]);

    const getSupplierDisplayName = (nameField: any): string => {
        if (typeof nameField === 'string') return nameField;
        if (typeof nameField === 'object' && nameField !== null && nameField.nome) return nameField.nome;
        return 'Fornitore non definito';
    };

    const handleSupplierClick = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setActiveTab('pdfs');
        setDrawerOpen(true);
    };

    const handleDownloadPdfClick = (pdfData: Product) => setPdfToGenerate(pdfData);

    const handleDownloadExcelClick = (product: Product) => {
        const wb = XLSX.utils.book_new();
        const wsData: (string | { v: string; s: any } | null)[][] = [];
        const merges: XLSX.Range[] = [];

        const sectionTitleStyle = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: "E7E6E6" } } };
        const labelStyle = { font: { bold: true } };

        const formatValueForExcel = (value: any): string => {
            if (value instanceof Date) return value.toLocaleDateString('it-IT');
            if (typeof value === 'boolean') return value ? 'Sì' : 'No';
            if (value === null || value === undefined || value === '') return 'N/D';
            if (Array.isArray(value)) {
                return value.map(item => typeof item === 'object' ? `${item.tipo} (Scadenza: ${item.scadenza || 'N/D'})` : item).join('\n');
            }
            return String(value);
        };
        
        wsData.push([{ v: `Scheda Tecnica Prodotto: ${product.descrizione?.denominazioneLegale || 'Senza nome'}`, s: { font: { bold: true, sz: 14 } } }, null]);
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
        wsData.push([]);

        Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => {
            const sectionData = (product as any)[sectionKey];
            if (!sectionData) return;

            const validFields = Object.keys(sectionValue.fields).filter(fieldKey => formatValueForExcel((sectionData as any)[fieldKey]) !== 'N/D');
            if (validFields.length === 0) return;

            wsData.push([{ v: sectionValue.title, s: sectionTitleStyle }, null]);
            merges.push({ s: { r: wsData.length - 1, c: 0 }, e: { r: wsData.length - 1, c: 1 } });
            
            Object.entries(sectionValue.fields).forEach(([fieldKey, fieldDef]) => {
                let label = fieldDef.label;
                const value = formatValueForExcel((sectionData as any)[fieldKey]);

                if (value !== 'N/D') {
                    if (fieldKey === 'allergeni') {
                        const allergeni = String((sectionData as any)[fieldKey]);
                        const keyword = "può contenere tracce di";
                        const keywordRegex = new RegExp(`,?\\s*${keyword}`, 'i');
                        
                        if (allergeni.toLowerCase().includes(keyword.toLowerCase())) {
                            const parts = allergeni.split(keywordRegex);
                            wsData.push([{ v: "Allergeni Presenti", s: labelStyle }, formatValueForExcel(parts[0].replace(/contiene/i, '').trim())]);
                            wsData.push([{ v: "Contaminazione crociata", s: labelStyle }, formatValueForExcel(`${keyword}${parts[1]}`)]);
                        } else {
                            wsData.push([{ v: "Allergeni Presenti", s: labelStyle }, formatValueForExcel(allergeni.replace(/contiene/i, '').trim())]);
                        }
                    } else {
                        if (label.trim().toLowerCase().startsWith('di cui')) {
                            label = `  ${label}`;
                        }
                        wsData.push([{ v: label, s: labelStyle }, value]);
                    }
                }
            });
            wsData.push([]);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!merges'] = merges;
        ws['!cols'] = [{ wch: 35 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(wb, ws, "Scheda Tecnica");
        
        const today = new Date().toLocaleDateString('it-IT').replace(/\//g, '-');
        const supplierName = product.identificazione?.produttore || 'Fornitore';
        XLSX.writeFile(wb, `Standard_Celerya_${today}_${supplierName}.xlsx`);
    };
    
    // **MODIFICA CHIAVE**: Abbiamo implementato la logica per l'esportazione Excel dei DDT.
    const handleDownloadDDTClick = (ddtData: DDT) => {
        if (!ddtData || !ddtData.prodotti) return;

        const worksheetData = ddtData.prodotti.map(prodotto => ({
            'Prodotto': prodotto.nomeProdotto || 'N/D',
            'Quantità': prodotto.quantita ?? 'N/D',
            'Lotto': prodotto.lotto || 'MANCANTE',
            'Scadenza': prodotto.scadenza || 'MANCANTE'
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dettaglio DDT');

        const fileName = `DDT_${ddtData.numeroDDT || 'export'}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };
    
    const handleCreateResourceClick = (pdf: Product, supplier: Supplier) => setResourceModal({ isOpen: true, data: pdf, supplier });
    const handleCreateDDTResourceClick = (ddt: DDT, supplier: Supplier) => setDdtResourceModal({ isOpen: true, data: ddt, supplier });

    const handleSaveResource = async (supplierId: string, pdfId: string, qrCodeUrl: string) => {
        try {
            await savePdfResourceUrl(supplierId, pdfId, qrCodeUrl);
            await loadSuppliers();
            setSelectedSupplier(prev => prev && prev.id === supplierId ? { ...prev, pdfs: prev.pdfs.map(p => p.id === pdfId ? { ...p, qrCodeUrl } : p) } : prev);
        } catch (error) { console.error("Errore salvataggio risorsa QR:", error); } 
        finally { setResourceModal({ isOpen: false, data: null, supplier: null }); }
    };
    
    const handleSaveDDTResource = async (supplierId: string, ddtId: string, qrCodeUrl: string) => {
        try {
            await saveDdtResourceUrl(supplierId, ddtId, qrCodeUrl);
            await loadSuppliers();
            setSelectedSupplier(prev => prev && prev.id === supplierId ? { ...prev, ddts: prev.ddts.map(d => d.id === ddtId ? { ...d, qrCodeUrl } : d) } : prev);
        } catch (error) { console.error("Errore salvataggio risorsa QR per DDT:", error); }
        finally { setDdtResourceModal({isOpen: false, data: null, supplier: null }); }
    };

    if (isLoading && suppliers.length === 0) {
        return <div className="p-8 text-center font-semibold text-gray-500">Caricamento fornitori in corso...</div>;
    }
    
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
                                <th className="p-4 font-semibold text-sm text-gray-600">CLIENTE ASSOCIATO</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">DOCUMENTI</th>
                                <th className="p-4 font-semibold text-sm text-gray-600">ULTIMA ANALISI</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {suppliers.length > 0 ? suppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{getSupplierDisplayName(supplier.name)}</td>
                                    <td className="p-4 text-gray-600">{supplier.customerName}</td>
                                    <td className="p-4 text-gray-600">{(supplier.pdfs?.length || 0) + (supplier.ddts?.length || 0)}</td>
                                    <td className="p-4 text-gray-600 font-mono text-sm">{new Date(supplier.lastUpdate).toLocaleString('it-IT')}</td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleSupplierClick(supplier)} className="p-2 rounded-md hover:bg-gray-200"><EyeIcon className="w-5 h-5 text-gray-600" /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <p className="font-semibold">Nessun fornitore trovato.</p>
                                        <p className="mt-1 text-sm">Inizia analizzando un documento dalla dashboard.</p>
                                    </td>
                                </tr>
                            )}
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
                                <h2 className="text-xl font-bold text-gray-800">{getSupplierDisplayName(selectedSupplier.name)}</h2>
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
                                        <p className="font-semibold">{pdf.descrizione?.denominazioneLegale || 'Scheda senza nome'}</p>
                                        <p className="text-xs text-gray-500">ID: {pdf.id}</p>
                                        {pdf.qrCodeUrl && <span className="mt-1 inline-block text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Risorsa Creata</span>}
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
                                        <p className="font-semibold">DDT N. {ddt.numeroDDT || 'Senza numero'}</p>
                                        <p className="text-xs text-gray-500">ID: {ddt.id}</p>
                                        {ddt.qrCodeUrl && <span className="mt-1 inline-block text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Risorsa Creata</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleCreateDDTResourceClick(ddt, selectedSupplier)} title="Crea Risorsa QR per DDT" className="p-2 rounded-md hover:bg-gray-100"><QrCodeIcon className="w-5 h-5 text-blue-600"/></button>
                                        <button onClick={() => handleDownloadDDTClick(ddt)} title="Esporta DDT in Excel" className="p-2 rounded-md hover:bg-gray-100"><ExcelIcon className="w-5 h-5 text-green-600"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {isGenerating && pdfToGenerate && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                    <PdfContent ref={pdfRef} data={pdfToGenerate} alerts={[]} schema={null} />
                </div>
            )}
            
            {resourceModal.isOpen && <ResourceQrModal isOpen={resourceModal.isOpen} data={resourceModal.data} supplier={resourceModal.supplier} onClose={() => setResourceModal({isOpen: false, data: null, supplier: null})} onSave={handleSaveResource} />}
            {ddtResourceModal.isOpen && <DDTResourceQrModal isOpen={ddtResourceModal.isOpen} data={ddtResourceModal.data} supplier={ddtResourceModal.supplier} onClose={() => setDdtResourceModal({isOpen: false, data: null, supplier: null})} onSave={handleSaveDDTResource} />}
        </>
    );
};

export default SuppliersListPage;
