import React, { forwardRef, useMemo, useState, useRef } from 'react';
import type { Product, Alert, Section } from '../types';
import { getCustomSchema, CELERYA_STANDARD } from '../constants';
import DetailSection from './DetailSection';
// --- MODIFICA CHIAVE: Import corretto delle icone ---
import { DownloadIcon, ExcelIcon as FileSpreadsheetIcon, QrCodeIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldQuestionIcon } from './icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx-js-style';

// --- Interfaccia e Componenti di supporto ---
interface PdfContentProps {
  data: Product;
  alerts: Alert[];
  schema: Section[] | null;
}

const AlertBadge: React.FC<{ alert: Alert }> = ({ alert }) => {
    const severityMap = {
        critical: { icon: <ShieldAlertIcon className="w-5 h-5 text-red-500" />, bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-600/20' },
        warning: { icon: <ShieldQuestionIcon className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-50', text: 'text-yellow-800', ring: 'ring-yellow-600/20' },
        ok: { icon: <ShieldCheckIcon className="w-5 h-5 text-green-500" />, bg: 'bg-green-50', text: 'text-green-800', ring: 'ring-green-600/20' }
    };
    const styles = severityMap[alert.severity];
    return (
        <div className={`flex items-start gap-3 p-3 rounded-lg ring-1 ring-inset ${styles.bg} ${styles.ring}`}>
            <div className="flex-shrink-0">{styles.icon}</div>
            <div>
                <p className={`font-semibold text-sm ${styles.text}`}>{alert.field}</p>
                <p className={`text-xs ${styles.text} opacity-90`}>{alert.message}</p>
            </div>
        </div>
    );
};

// --- Componente Principale ---
const PdfContent = ({ data, alerts, schema }: PdfContentProps) => {
    if (!data) return null;

    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    const handleGenerateQrCode = async () => {
        const url = `https://celerya.app/resource/${data.id}`;
        try {
            const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
            setQrCodeDataUrl(dataUrl);
        } catch (err) {
            console.error('Failed to generate QR code', err);
        }
    };

    const handleDownloadPdf = async () => {
        const element = pdfRef.current;
        if (!element) return;
        const canvas = await html2canvas(element, { scale: 2 });
        const data = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`SchedaTecnica_${data.identificazione?.codiceProdotto || 'export'}.pdf`);
    };

    const handleExportExcel = () => {
        const workbook = XLSX.utils.book_new();
        const wsData: any[][] = [];

        wsData.push([{ v: "Scheda Tecnica Prodotto", s: { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F81BD" } } } }]);
        wsData.push([]); 

        wsData.push([{ v: "Identificazione", s: { font: { bold: true, sz: 12 } } }]);
        wsData.push(["Produttore", data.identificazione?.produttore || 'N/D']);
        wsData.push(["Denominazione", data.descrizione?.denominazioneLegale || 'N/D']);
        wsData.push(["Codice Prodotto", data.identificazione?.codiceProdotto || 'N/D']);
        wsData.push([]);

        const customSchema = getCustomSchema();
        customSchema.forEach(section => {
            if (section.fields.some(f => f.active)) {
                wsData.push([{ v: section.title, s: { font: { bold: true, sz: 12 } } }]);
                section.fields.forEach(field => {
                    if (field.active) {
                        const path = `${section.id}.${field.id}`;
                        const value = path.split('.').reduce((o, i) => (o && o[i] !== undefined) ? o[i] : 'N/D', data);
                        wsData.push([field.name, value]);
                    }
                });
                wsData.push([]);
            }
        });
        
        wsData.push([{ v: "Alert di Conformità", s: { font: { bold: true, sz: 12 } } }]);
        alerts.forEach(alert => {
            const severityStyle = {
                critical: { font: { color: { rgb: "C00000" } } },
                warning: { font: { color: { rgb: "FFC000" } } },
                ok: { font: { color: { rgb: "00B050" } } }
            };
            wsData.push([ { v: alert.field, s: severityStyle[alert.severity] }, { v: alert.message, s: severityStyle[alert.severity] } ]);
        });
        
        const worksheet = XLSX.utils.aoa_to_sheet(wsData);
        worksheet['!cols'] = [{ wch: 30 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Scheda Tecnica");
        XLSX.writeFile(workbook, `Report_${data.identificazione?.codiceProdotto || 'export'}.xlsx`);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <PdfView ref={pdfRef} data={data} schema={schema} qrCodeDataUrl={qrCodeDataUrl} alerts={alerts} />
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">Azioni Disponibili</h3>
                    <div className="space-y-3">
                        <button onClick={handleGenerateQrCode} disabled={!!qrCodeDataUrl} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"> <QrCodeIcon className="w-5 h-5" /> Crea Risorsa </button>
                        <button onClick={handleDownloadPdf} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"> <DownloadIcon className="w-5 h-5" /> Scarica PDF </button>
                        <button onClick={handleExportExcel} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"> <FileSpreadsheetIcon className="w-5 h-5" /> Esporta Excel </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">Report Conformità</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {alerts.length > 0 ? alerts.map((alert, i) => <AlertBadge key={i} alert={alert} />) : <p className="text-sm text-gray-500">Nessun alert rilevato.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-componente per la visualizzazione
const PdfView = forwardRef<HTMLDivElement, { data: Product; schema: Section[] | null; qrCodeDataUrl: string | null; alerts: Alert[] }>(({ data, schema, qrCodeDataUrl, alerts }, ref) => {
    const fieldKeyMap = useMemo(() => {
        const map: Record<string, string> = {};
        Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => {
            Object.entries(sectionValue.fields).forEach(([fieldKey, fieldValue]) => { map[fieldValue.label] = `${sectionKey}.${fieldKey}`; });
        });
        return map;
    }, []);

    const activeSections = useMemo(() => {
        const customSchema = getCustomSchema();
        return customSchema.map(section => {
            const activeFields = section.fields.filter(f => f.active);
            if (activeFields.length === 0) return null;
            const sectionData: Record<string, any> = {};
            activeFields.forEach(field => {
                const path = fieldKeyMap[field.name];
                if (path) {
                    const value = path.split('.').reduce((o, i) => (o && o[i] !== undefined) ? o[i] : null, data);
                    const key = path.split('.').pop()!;
                    sectionData[key] = value;
                }
            });
            if (Object.keys(sectionData).length === 0) return null;
            return { key: section.id, title: section.title, data: sectionData, sectionKey: section.id };
        }).filter(Boolean) as { key: string; title: string; data: any; sectionKey: string }[];
    }, [schema, data, fieldKeyMap]);

    return (
        <div ref={ref} className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 relative">
            <header className="mb-6 text-center border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-800">{data.identificazione?.produttore}</h2>
                <p className="text-md text-slate-600 mt-1">{data.descrizione?.denominazioneLegale}</p>
                <p className="text-xs text-slate-500 mt-2"> Codice: {data.identificazione?.codiceProdotto} &middot; Rev: {data.identificazione?.numeroRevisione} del {data.identificazione?.dataRedazione ? new Date(data.identificazione.dataRedazione).toLocaleDateString('it-IT') : ''} </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">ID: {data.id}</p>
                {qrCodeDataUrl && ( <div className="absolute top-4 right-4 p-1 bg-white rounded-md shadow"> <img src={qrCodeaUrl} alt="QR Code" className="w-20 h-20" /> </div> )}
            </header>
            <div className="md:columns-2 gap-6 space-y-6">
                {activeSections.map(section => ( <DetailSection key={section.key} title={section.title} data={section.data} sectionKey={section.sectionKey} alerts={alerts} /> ))}
            </div>
        </div>
    );
});

export default PdfContent;
