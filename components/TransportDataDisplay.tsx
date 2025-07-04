import React from 'react';
import type { AnalyzedTransportDocument } from '../types';
import * as XLSX from 'xlsx';
import { ExcelIcon } from './icons/ExcelIcon';

interface TransportDataDisplayProps {
  data: AnalyzedTransportDocument;
  onAnalyzeAnother: () => void;
}

const InfoItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 font-semibold">{value || 'N/D'}</dd>
    </div>
);

const MissingValue: React.FC = () => (
    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">MANCANTE</span>
);

const formatDate = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return null;
    }
    return date.toLocaleDateString('it-IT');
}

const TransportDataDisplay: React.FC<TransportDataDisplayProps> = ({ data, onAnalyzeAnother }) => {
    const handleDownloadExcel = () => {
        // 1. Prepare Info Sheet
        const infoData = [
            { Campo: 'Mittente', Valore: data.info.mittente || 'N/D' },
            { Campo: 'Destinatario', Valore: data.info.destinatario || 'N/D' },
            { Campo: 'Numero DDT', Valore: data.info.numeroDDT || 'N/D' },
            { Campo: 'Data DDT', Valore: formatDate(data.info.dataDDT) ?? data.info.dataDDT ?? 'N/D' },
            { Campo: 'Vettore', Valore: data.info.vettore || 'N/D' },
        ];
        const infoSheet = XLSX.utils.json_to_sheet(infoData);
        infoSheet['!cols'] = [{ wch: 20 }, { wch: 50 }];

        // 2. Prepare Products Sheet
        const productsData = data.prodotti.map(product => ({
            'Prodotto': product.descrizione || 'MANCANTE',
            'Quantità': product.quantita || 'MANCANTE',
            'Lotto': product.lotto || 'MANCANTE',
            'Scadenza': formatDate(product.scadenza) || 'MANCANTE'
        }));
        const productsSheet = XLSX.utils.json_to_sheet(productsData);
        productsSheet['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

        // 3. Create and download workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, infoSheet, 'Informazioni DDT');
        XLSX.utils.book_append_sheet(wb, productsSheet, 'Elenco Prodotti');
        
        const ddtNumber = data.info.numeroDDT || 'DDT';
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Standard Celerya - ${ddtNumber.replace(/[\/\\]/g, '_')} - ${timestamp}.xlsx`;

        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Risultati Analisi DDT</h2>
                <div className="flex items-center gap-4">
                     <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500 transition-all whitespace-nowrap"
                    >
                        <ExcelIcon className="w-4 h-4 text-green-700" />
                        <span>Esporta Excel</span>
                    </button>
                    <button
                        onClick={onAnalyzeAnother}
                        className="text-sm font-medium text-lime-600 hover:text-lime-800 transition-colors flex-shrink-0"
                    >
                        Analizza un altro
                    </button>
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                <InfoItem label="Mittente" value={data.info.mittente} />
                <InfoItem label="Destinatario" value={data.info.destinatario} />
                <InfoItem label="Numero DDT" value={data.info.numeroDDT} />
                <InfoItem label="Data DDT" value={formatDate(data.info.dataDDT) ?? data.info.dataDDT} />
                <div className="col-span-2">
                 <InfoItem label="Vettore" value={data.info.vettore} />
                </div>
            </dl>
            
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-gray-600">Prodotto</th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Quantità</th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Lotto</th>
                            <th className="px-4 py-3 font-semibold text-gray-600">Scadenza</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.prodotti.map((product, index) => {
                            const formattedDate = formatDate(product.scadenza);
                            const isLottoMissing = !product.lotto || product.lotto.trim() === '';
                            const isScadenzaMissing = !formattedDate;

                            return (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-800 font-medium">{product.descrizione || <MissingValue />}</td>
                                    <td className="px-4 py-3 text-gray-600">{product.quantita || <MissingValue />}</td>
                                    <td className={`px-4 py-3 text-gray-600 ${isLottoMissing ? 'bg-red-50/75' : ''}`}>
                                        {isLottoMissing ? <MissingValue /> : product.lotto}
                                    </td>
                                    <td className={`px-4 py-3 text-gray-600 ${isScadenzaMissing ? 'bg-red-50/75' : ''}`}>
                                        {isScadenzaMissing ? <MissingValue /> : formattedDate}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransportDataDisplay;