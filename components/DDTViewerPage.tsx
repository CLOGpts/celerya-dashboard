
import React from 'react';
import type { AnalyzedTransportDocument } from '../types';
import { AlertIcon } from './icons/AlertIcon';

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/D';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString('it-IT');
};

const MissingValue: React.FC = () => (
    <span className="text-red-500 italic">Mancante</span>
);

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

const DDTViewerPage: React.FC<{ ddt: AnalyzedTransportDocument | null }> = ({ ddt }) => {

    if (!ddt || typeof ddt.info !== 'object' || !Array.isArray(ddt.prodotti)) {
        return <DataErrorState message="Impossibile visualizzare il documento di trasporto. I dati sono incompleti o corrotti." />;
    }

    return (
        <div className="bg-gray-100 min-h-screen p-2 sm:p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <header className="bg-slate-800 p-6 text-white">
                    <h1 className="text-2xl md:text-3xl font-bold">Documento di Trasporto</h1>
                    <p className="text-lg text-slate-300 mt-1">Mittente: {ddt.info.mittente || <MissingValue />}</p>
                    <p className="text-sm text-slate-400 mt-2 font-mono">ID Risorsa: {ddt.id}</p>
                </header>

                <main className="p-6 space-y-8">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 border-b-2 border-lime-500 pb-2 mb-4">Informazioni Generali</h2>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                             <div className="py-3">
                                <dt className="text-sm font-semibold text-gray-600">Numero DDT</dt>
                                <dd className="text-sm text-gray-800 mt-1">{ddt.info.numeroDDT || <MissingValue />}</dd>
                            </div>
                            <div className="py-3">
                                <dt className="text-sm font-semibold text-gray-600">Data DDT</dt>
                                <dd className="text-sm text-gray-800 mt-1">{formatDate(ddt.info.dataDDT)}</dd>
                            </div>
                             <div className="py-3">
                                <dt className="text-sm font-semibold text-gray-600">Destinatario</dt>
                                <dd className="text-sm text-gray-800 mt-1">{ddt.info.destinatario || <MissingValue />}</dd>
                            </div>
                            <div className="py-3">
                                <dt className="text-sm font-semibold text-gray-600">Vettore</dt>
                                <dd className="text-sm text-gray-800 mt-1">{ddt.info.vettore || <MissingValue />}</dd>
                            </div>
                        </dl>
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 border-b-2 border-lime-500 pb-2 mb-4">Prodotti Trasportati</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3 font-semibold text-gray-600 border-b border-gray-200">Descrizione</th>
                                        <th className="p-3 font-semibold text-gray-600 border-b border-gray-200">Quantità</th>
                                        <th className="p-3 font-semibold text-gray-600 border-b border-gray-200">Lotto</th>
                                        <th className="p-3 font-semibold text-gray-600 border-b border-gray-200">Scadenza</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ddt.prodotti.map((product, index) => (
                                        <tr key={index}>
                                            <td className="p-3 text-gray-800 font-medium">{product.descrizione || <MissingValue />}</td>
                                            <td className="p-3 text-gray-700">{product.quantita || <MissingValue />}</td>
                                            <td className="p-3 text-gray-700">{product.lotto || <MissingValue />}</td>
                                            <td className="p-3 text-gray-700">{formatDate(product.scadenza)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                 <footer className="p-6 bg-gray-50 border-t border-gray-200 text-center print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        Stampa o Salva come PDF
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default DDTViewerPage;