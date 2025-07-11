import React from 'react';
import { AlertIcon } from './icons/AlertIcon';
import type { Alert } from '../types';

interface DetailSectionProps {
    title: string;
    data: Record<string, any>;
    alerts: Alert[];
    sectionKey: string;
}

const DetailSection: React.FC<DetailSectionProps> = ({ title, data, alerts, sectionKey }) => {
    if (!data) return null;

    return (
    <div className="bg-white p-6 rounded-lg border border-gray-200/80 shadow-sm break-inside-avoid">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 border-b border-gray-200 pb-3">{title}</h4>
        <dl className="space-y-4">
            {Object.entries(data).map(([key, value]) => {
                const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                let displayValue: React.ReactNode = value;
                
                const fieldAlert = alerts.find(a => a.field === `${sectionKey}.${key}`);

                if (value === null || value === undefined || value === '') {
                    displayValue = <span className="text-gray-400 italic">N/D</span>;
                } else if (Array.isArray(value)) {
                    if (value.length === 0) {
                        displayValue = <span className="text-gray-500 italic">Nessuno</span>;
                    } else {
                        displayValue = (
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
                } else if (typeof value === 'boolean') {
                    displayValue = value ? 'Sì' : 'No';
                } else if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('scadenza'))) {
                     try {
                        const date = new Date(value);
                        if(!isNaN(date.getTime())) {
                            displayValue = date.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
                        } else {
                            displayValue = String(value);
                        }
                     } catch(e) {
                        displayValue = String(value);
                     }
                } else {
                    displayValue = String(value);
                }
                
                return (
                    <div key={key}>
                        <dt className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                            {fieldAlert && (
                                <span title={fieldAlert.message}>
                                    <AlertIcon className={`w-4 h-4 ${fieldAlert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                                </span>
                            )}
                            {displayKey}
                        </dt>
                        <dd className="text-sm text-gray-800 mt-1 ml-1">{displayValue}</dd>
                    </div>
                );
            })}
        </dl>
    </div>
)};

export default DetailSection;