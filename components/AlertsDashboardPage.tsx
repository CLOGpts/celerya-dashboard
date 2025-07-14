import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Alert } from '../types';
// --- MODIFICA CHIAVE: Import corretto delle icone ---
import { ShieldAlertIcon, ShieldCheckIcon, ShieldQuestionIcon } from './icons';

interface EnrichedAlert extends Alert {
  productId: string;
  productName: string;
  supplierName: string;
  customerName: string;
  savedAt: string;
}

const SummaryCard: React.FC<{ title: string; count: number; color: string }> = ({ title, count, color }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200`}>
        <h3 className={`text-sm font-medium text-${color}-600 uppercase tracking-wider`}>{title}</h3>
        <p className={`mt-2 text-4xl font-bold text-${color}-700`}>{count}</p>
    </div>
);

const AlertsDashboardPage: React.FC = () => {
    const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadAlerts = useCallback(() => {
        setIsLoading(true);
        try {
            const storedAlerts = JSON.parse(localStorage.getItem('celerya_alerts_data') || '[]') as EnrichedAlert[];
            setAlerts(storedAlerts.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
        } catch (e) {
            console.error("Errore caricamento alert:", e);
            setAlerts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAlerts();
        window.addEventListener('celerya-data-updated', loadAlerts);
        return () => {
            window.removeEventListener('celerya-data-updated', loadAlerts);
        };
    }, [loadAlerts]);

    const summary = useMemo(() => {
        const critical = alerts.filter(a => a.severity === 'critical').length;
        const warning = alerts.filter(a => a.severity === 'warning').length;
        const productsWithAlerts = new Set(alerts.map(a => a.productId)).size;
        return { critical, warning, productsWithAlerts };
    }, [alerts]);

    if (isLoading) {
        return <div className="p-8 text-center font-semibold text-gray-500">Caricamento cruscotto alert...</div>;
    }

    return (
        <div className="p-8 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Cruscotto Alert</h1>
            <p className="text-gray-500 mb-8">Una visione d'insieme di tutti gli alert di conformità rilevati.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <SummaryCard title="Alert Critici" count={summary.critical} color="red" />
                <SummaryCard title="Avvertimenti" count={summary.warning} color="yellow" />
                <SummaryCard title="Prodotti con Alert" count={summary.productsWithAlerts} color="slate" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <h3 className="p-4 text-lg font-semibold text-gray-800 border-b border-gray-200">Elenco Alert Recenti</h3>
                <div className="max-h-[60vh] overflow-y-auto">
                    {alerts.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {alerts.map((alert, index) => (
                                <li key={index} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                                    <div className="flex-shrink-0 mt-1">
                                        {alert.severity === 'critical' && <ShieldAlertIcon className="w-6 h-6 text-red-500" />}
                                        {alert.severity === 'warning' && <ShieldQuestionIcon className="w-6 h-6 text-yellow-500" />}
                                        {alert.severity === 'ok' && <ShieldCheckIcon className="w-6 h-6 text-green-500" />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-gray-800">{alert.field}</p>
                                        <p className="text-sm text-gray-600">{alert.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {alert.supplierName} - {alert.productName} (Cliente: {alert.customerName})
                                        </p>
                                    </div>
                                    <div className="text-right text-xs text-gray-400 flex-shrink-0">
                                        {new Date(alert.savedAt).toLocaleString('it-IT')}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="p-12 text-center text-gray-500">
                            <p className="font-semibold">Tutto tranquillo!</p>
                            <p className="mt-1 text-sm">Nessun alert di conformità rilevato.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertsDashboardPage;
