import React, { forwardRef, useMemo, useState, useRef } from 'react';
import type { Product, Alert, Section } from '../types';
import { getCustomSchema, CELERYA_STANDARD } from '../constants';
import DetailSection from './DetailSection';
import { DownloadIcon, QrCodeIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldQuestionIcon } from './icons';
import { ExcelIcon as FileSpreadsheetIcon } from './icons';
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

// --- Componente Principale Unificato e Corretto ---
const PdfContent = ({ data, alerts, schema }: PdfContentProps) => {
    if (!data) return null;

    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const pdfRef = useRef<HTMLDivElement>(null);

    const fieldKeyMap = useMemo(() => {
        const map: Record<string, string> = {};
        Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => { Object.entries(sectionValue.fields).forEach(([fieldKey, fieldValue]) => { map[fieldValue.label] = `${sectionKey}.${fieldKey}`; }); });
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

    const handleGenerateQrCode = async () => {
        const url = `https://celerya.app/resource/${data.id}`;
        try {
            const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
            setQrCodeDataUrl(dataUrl);
        } catch (err) { console.error('Failed to generate QR code', err); }
    };

    const handleDownloadPdf = async () => {
        const element = pdfRef.current;
        if (!element) return;
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        const today = new Date().toLocaleDateString('it-IT').replace(/\//g, '-');
        const supplierName = data.identificazione?.produttore || 'Fornitore';
        pdf.save(`SchedaTecnica_Celerya_${today}_${supplierName}.pdf`);
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData: (string | { v: string; s: any } | null)[][] = [];
        const merges: XLSX.Range[] = [];
        const sectionTitleStyle = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: "E7E6E6" } } };
        const labelStyle = { font: { bold: true } };

        const formatValueForExcel = (value: any): string => {
            if (value instanceof Date) return value.toLocaleDateString('it-IT');
            if (typeof value === 'boolean') return value ? 'Sì' : 'No';
            if (value === null || value === undefined || value === '') return 'N/D';
            if (Array.isArray(value)) { return value.map(item => typeof item === 'object' ? `${item.tipo} (Scadenza: ${item.scadenza || 'N/D'})` : item).join('\n'); }
            return String(value);
        };
        
        wsData.push([{ v: `Scheda Tecnica Prodotto: ${data.descrizione?.denominazioneLegale || 'Senza nome'}`, s: { font: { bold: true, sz: 14 } } }, null]);
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
        wsData.push([]);

        Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => {
            const sectionData = (data as any)[sectionKey];
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
                        if (label.trim().toLowerCase().startsWith('di cui')) { label = `  ${label}`; }
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
        const supplierName = data.identificazione?.produttore || 'Fornitore';
        XLSX.writeFile(wb, `Standard_Celerya_${today}_${supplierName}.xlsx`);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <div ref={pdfRef} className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 relative">
                    <header className="mb-6 text-center border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-bold text-slate-800">{data.identificazione?.produttore}</h2>
                        <p className="text-md text-slate-600 mt-1">{data.descrizione?.denominazioneLegale}</p>
                        <p className="text-xs text-slate-500 mt-2"> Codice: {data.identificazione?.codiceProdotto} &middot; Rev: {data.identificazione?.numeroRevisione} del {data.identificazione?.dataRedazione ? new Date(data.identificazione.dataRedazione).toLocaleDateString('it-IT') : ''} </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">ID: {data.id}</p>
                        {qrCodeDataUrl && ( <div className="absolute top-4 right-4 p-1 bg-white rounded-md shadow"> <img src={qrCodeDataUrl} alt="QR Code" className="w-20 h-20" /> </div> )}
                    </header>
                    <div className="md:columns-2 gap-6 space-y-6">
                        {activeSections.map(section => ( <DetailSection key={section.key} title={section.title} data={section.data} sectionKey={section.sectionKey} alerts={alerts} /> ))}
                    </div>
                </div>
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

export default PdfContent;
