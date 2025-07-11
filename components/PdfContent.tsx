
import React, { forwardRef, useMemo } from 'react';
import type { Product, Alert, Section } from '../types';
import { CELERYA_STANDARD } from '../constants';
import DetailSection from './DetailSection';

interface PdfContentProps {
  data: Product;
  alerts: Alert[];
  schema: Section[] | null;
  qrCodeDataUrl?: string;
}

const getFieldKeyMap = () => {
    const map: Record<string, string> = {};
    Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => {
        Object.entries(sectionValue.fields).forEach(([fieldKey, fieldValue]) => {
            map[fieldValue.label] = `${sectionKey}.${fieldKey}`;
        });
    });
    return map;
}

const PdfContent = forwardRef<HTMLDivElement, PdfContentProps>(({ data, alerts, schema, qrCodeDataUrl }, ref) => {
  if (!data) return null;

  const fieldKeyMap = useMemo(() => getFieldKeyMap(), []);

  const activeSections = useMemo(() => {
    if (!schema) return [];
    
    return schema
        .map(section => {
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
            
            // Return null if sectionData is empty after processing
            if (Object.keys(sectionData).length === 0) return null;

            return {
                key: section.id,
                title: section.title,
                data: sectionData,
                sectionKey: section.id
            };
        })
        .filter((section): section is Exclude<typeof section, null> => section !== null);

  }, [schema, data, fieldKeyMap]);

  return (
    <div ref={ref} className="p-4 sm:p-6 bg-slate-100 rounded-lg relative">
        <header className="mb-8 text-center border-b border-gray-300 pb-6">
            <h2 className="text-3xl font-bold text-slate-900">{data.identificazione?.produttore}</h2>
            <p className="text-lg text-slate-700 mt-1">{data.descrizione?.denominazioneLegale}</p>
            <p className="text-sm text-slate-500 mt-2">
                Codice: {data.identificazione?.codiceProdotto} &middot; Revisione: {data.identificazione?.numeroRevisione} del {data.identificazione?.dataRedazione ? new Date(data.identificazione.dataRedazione).toLocaleDateString('it-IT') : ''}
            </p>
             <p className="text-xs text-slate-400 mt-1 font-mono">
                ID Risorsa: {data.id}
            </p>
            {qrCodeDataUrl && (
              <div className="absolute top-4 right-4 p-1 bg-white rounded-md shadow-md">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24" />
              </div>
            )}
        </header>

        <div className="md:columns-2 gap-6 space-y-6">
            {activeSections.map(section => (
                <DetailSection 
                    key={section.key}
                    title={section.title}
                    data={section.data}
                    sectionKey={section.sectionKey}
                    alerts={alerts}
                />
            ))}
        </div>
    </div>
  );
});

export default PdfContent;