import React, { useState, useEffect, useMemo } from 'react';
import type { AllSuppliersData, Customer, Alert, Product } from '../types';
import { getCustomSchema, generateAlertsFromSchema } from '../constants';
import { AlertIcon } from './icons/AlertIcon';
import { EyeIcon } from './icons/EyeIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface EnrichedAlert extends Alert {
  productId: string;
  productName: string;
  supplierName: string;
  customerName: string;
  savedAt: string;
}

const SummaryCard: React.FC<{ title: string; count: number; color: string }> = ({ title, count, color }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-${color}-200`}>
        <h3 className={`text-sm font-medium text-${color}-600 uppercase`}>{title}</h3>
        <p className={`mt-2 text-3xl font-bold text-${color}-700`}>{count}</p>
    </div>
);

const AlertsDashboardPage: React.FC = () => {
    const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAlerts = () => {
            setIsLoading(true);
            try {
                const suppliersDataStr = localStorage.getItem('celerya_suppliers_data') || '{}';
                const customersDataStr = localStorage.getItem('celerya_customers') || '[]';
                
                const suppliersData: AllSuppliersData = JSON.parse(suppliersDataStr);
                const customers: Customer[] = JSON.parse(customersDataStr);
                
                const customerMap = new Map(customers.map(c => [c.slug, c.name]));
                const customSchema = getCustomSchema();
                const allAlerts: EnrichedAlert[] = [];
                const analyzedProductIds = new Set<string>();

                for (const customerSlug in suppliersData) {
                    const customerName = customerMap.get(customerSlug) || customerSlug;
                    const customerData = suppliersData[customerSlug];

                    // --- ROBUSTNESS FIX ---
                    // Skip this customer if its data is missing or malformed
                    if (!customerData || !customerData.suppliers) continue;

                    for (const supplierSlug in customerData.suppliers) {
                        const supplier = customerData.suppliers[supplierSlug];
                        
                        // Skip this supplier if its data is missing
                        if (!supplier) continue;

                        if (supplier.pdfs) {
                            for (const pdfId in supplier.pdfs) {
                                const product = supplier.pdfs[pdfId];
                                if (!product) continue; // Skip if product data is null/undefined

                                analyzedProductIds.add(product.id);
                                const generatedAlerts = generateAlertsFromSchema(product, customSchema);

                                generatedAlerts.forEach(alert => {
                                    allAlerts.push({
                                        ...alert,
                                        productId: product.id,
                                        productName: product.descrizione?.denominazioneLegale || product.identificazione?.denominazioneScheda || 'Nome non disponibile',
                                        supplierName: supplier.name,
                                        customerName: customerName,
                                        savedAt: product.savedAt,
                                    });
                                });
                            }
                        }
                    }
                }
                
                allAlerts.sort((a, b) => {
                    const severityOrder = { critical: 0, warning: 1, info: 2 };
                    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
                        return severityOrder[a.severity] - severityOrder[b.severity];
                    }
                    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
                });
                
                setAlerts(allAlerts);

            } catch (e) {
                console.error("Failed to load or parse data for alerts dashboard", e);
            } finally {
                setIsLoading(false);
            }
        };

        loadAlerts();
    }, []);

    const criticalAlertsCount = useMemo(() => alerts.filter(a => a.severity === 'critical').length, [alerts]);
    const warningAlertsCount = useMemo(() => alerts.filter(a => a.severity === 'warning').length, [alerts]);
    
    // To get the count of unique products, we need to load them all first.
    // A simplified approach is to count products that have alerts. A more accurate count would require iterating all products again.
    // For simplicity and performance, we count unique products with alerts.
    const productsWithAlertsCount = useMemo(() => new Set(alerts.map(a => a.productId)).size, [alerts]);


    return (
        <div className="p-8 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Cruscotto Alert</h1>
            <p className="text-gray-500 mb-8">Una visione d'insieme di tutti gli alert di conformità rilevati.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <SummaryCard title="Alert Critici" count={criticalAlertsCount} color="red" />
                <SummaryCard title="Avvertimenti" count={warningAlertsCount} color="yellow" />
                <SummaryCard title="Prodotti con Alert" count={productsWithAlertsCount} color="slate" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Elenco Alert</h2>
                </div>
                {isLoading ? (
                    <div className="flex justify-center items-center p-16">
                        <SpinnerIcon className="w-8 h-8 text-slate-500" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="text-center p-16">
                        <svg className="mx-auto h-16 w-16 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mt-4 font-semibold text-lg text-gray-700">Tutto sotto controllo!</p>
                        <p className="text-sm text-gray-500">Nessun alert rilevato nei documenti analizzati.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {alerts.map((alert, index) => {
                            const severityClasses = {
                                critical: { border: 'border-red-500', icon: 'text-red-500' },
                                warning: { border: 'border-yellow-500', icon: 'text-yellow-500' },
                                info: { border: 'border-blue-500', icon: 'text-blue-500' }
                            };
                            const classes = severityClasses[alert.severity];

                            return (
                                <li key={index} className={`p-4 hover:bg-gray-50 flex items-start gap-4`}>
                                    <div className={`mt-1 flex-shrink-0 ${classes.icon}`}>
                                        <AlertIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-gray-800">{alert.message}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Prodotto: <span className="font-medium text-gray-700">{alert.productName}</span> &middot; Fornitore: <span className="font-medium text-gray-700">{alert.supplierName}</span>
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Cliente: {alert.customerName}
                                            {alert.deadline && ` · Scadenza: ${new Date(alert.deadline).toLocaleDateString('it-IT')}`}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                        <a 
                                            href={`/?resource_id=${alert.productId}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 transition-colors"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                            Visualizza
                                        </a>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default AlertsDashboardPage;