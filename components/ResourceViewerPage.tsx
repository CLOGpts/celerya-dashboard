
import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as QRCode from 'qrcode';
import type { Product, Alert, Section } from '../types';
import { getCustomSchema, generateAlertsFromSchema, CELERYA_STANDARD } from '../constants';
import PdfContent from './PdfContent';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { AlertIcon } from './icons/AlertIcon';

const createFieldKeyMap = () => {
    const map: Record<string, string> = {};
    Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => {
        Object.entries(sectionValue.fields).forEach(([fieldKey, fieldValue]) => {
            map[fieldValue.label] = `${sectionKey}.${fieldKey}`;
        });
    });
    return map;
};

const DataErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 text-center">
        <div className="bg-white p-10 rounded-xl shadow-md max-w-lg">
            <AlertIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Errore nel Caricamento</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
                href={window.location.origin}
                className="inline-block px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors"
            >
                Torna alla Dashboard
            </a>
        </div>
    </div>
);

export const ResourceViewerPage: React.FC<{ product: (Product & { qrCodeUrl?: string }) | null }> = ({ product }) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfGenRef = useRef<HTMLDivElement>(null);
    const [pdfToGenerate, setPdfToGenerate] = useState<{ product: Product, qrCodeDataUrl?: string } | null>(null);

    if (!product || typeof product.identificazione !== 'object' || typeof product.descrizione !== 'object') {
        return <DataErrorState message="Impossibile visualizzare la risorsa. I dati sono incompleti o corrotti." />;
    }

    const fullSchema = useMemo(() => getCustomSchema(), []);
    const alerts = useMemo(() => generateAlertsFromSchema(product, fullSchema), [product, fullSchema]);
    const fieldKeyMap = useMemo(() => createFieldKeyMap(), []);

    const activeSections = useMemo(() => {
        if (!fullSchema) return [];
        return fullSchema
            .map(section => {
                const activeFields = section.fields.filter(f => f.active);
                if (activeFields.length === 0) return null;

                const sectionData: { key: string; label: string; value: any }[] = [];
                activeFields.forEach(field => {
                    const path = fieldKeyMap[field.name];
                    if (path) {
                        const value = path.split('.').reduce((o, i) => (o && o[i] !== undefined) ? o[i] : null, product);
                        const key = path.split('.').pop()!;
                        sectionData.push({ key, label: field.name, value });
                    }
                });

                if (sectionData.length === 0) return null;

                return {
                    key: section.id,
                    title: section.title,
                    data: sectionData
                };
            })
            .filter((section): section is Exclude<typeof section, null> => section !== null);
    }, [fullSchema, product, fieldKeyMap]);

    const handleDownloadPdf = async () => {
        let qrCodeDataUrlForPdf: string | undefined = undefined;
        // The QR code URL should be constructed from the product ID, which is always present.
        const resourceUrl = `${window.location.origin}${window.location.pathname}?resource_id=${product.id}`;
        try {
            qrCodeDataUrlForPdf = await QRCode.toDataURL(resourceUrl, { width: 96, margin: 1 });
        } catch (err) {
            console.error("Failed to generate QR for PDF download", err);
        }
        
        setPdfToGenerate({ product, qrCodeDataUrl: qrCodeDataUrlForPdf });
    };

    useEffect(() => {
        const generate = async () => {
            if (pdfToGenerate && pdfGenRef.current) {
                setIsGeneratingPdf(true);
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
                setIsGeneratingPdf(false);
            }
        };
        generate();
    }, [pdfToGenerate]);
    
    const renderValue = (value: any, key: string) => {
        if (value === null || value === undefined || value === '') {
            return <span className="text-gray-400 italic">N/D</span>;
        }
        if (typeof value === 'boolean') {
            return value ? 'Sì' : 'No';
        }
        if (Array.isArray(value)) {
            if (value.length === 0) return <span className="text-gray-500 italic">Nessuno</span>;
            return (
                <ul className="list-disc list-inside space-y-1">
                    {value.map((item, index) => 
                        <li key={index}>
                            {(typeof item === 'object' && item.tipo && item.scadenza) 
                                ? `${item.tipo} (scade il: ${new Date(item.scadenza).toLocaleDateString('it-IT')})` 
                                : String(item)}
                        </li>
                    )}
                </ul>
            );
        }
        if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('scadenza'))) {
            try {
               const date = new Date(value);
               if(!isNaN(date.getTime())) {
                   return date.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
               }
            } catch(e) { /* fallback to string */ }
        }
        return String(value);
    }

    return (
        <div className="bg-gray-100 min-h-screen p-2 sm:p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <header className="bg-slate-800 p-6 text-white">
                    <h1 className="text-2xl md:text-3xl font-bold">{product.descrizione.denominazioneLegale}</h1>
                    <p className="text-lg text-slate-300 mt-1">da {product.identificazione.produttore}</p>
                    <p className="text-sm text-slate-400 mt-2 font-mono">ID Risorsa: {product.id}</p>
                </header>

                <main className="p-6 space-y-8">
                    {activeSections.map(section => (
                        <div key={section.key}>
                            <h2 className="text-xl font-semibold text-gray-800 border-b-2 border-lime-500 pb-2 mb-4">{section.title}</h2>
                            <dl>
                                {section.data.map(item => (
                                    <div key={item.key} className="py-3 grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4 border-b border-gray-200 last:border-b-0">
                                        <dt className="text-sm font-semibold text-gray-600">{item.label}</dt>
                                        <dd className="text-sm text-gray-800 mt-1 md:mt-0 md:col-span-2">{renderValue(item.value, item.key)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ))}
                </main>

                <footer className="p-6 bg-gray-50 border-t border-gray-200 text-center">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:bg-slate-500"
                    >
                        {isGeneratingPdf ? <SpinnerIcon /> : <DownloadIcon />}
                        {isGeneratingPdf ? 'Generazione PDF...' : 'Scarica PDF Standard'}
                    </button>
                </footer>
            </div>
            {/* Hidden component for PDF generation */}
            {pdfToGenerate && (
                 <div className="fixed left-[-9999px] top-0 p-4 w-[8.5in]">
                    <PdfContent 
                        data={pdfToGenerate.product} 
                        alerts={alerts}
                        schema={fullSchema} 
                        ref={pdfGenRef} 
                        qrCodeDataUrl={pdfToGenerate.qrCodeDataUrl}
                    />
                </div>
            )}
        </div>
    );
};
