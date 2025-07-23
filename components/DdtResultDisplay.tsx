// Nome del file: DdtResultDisplay.tsx

import React from 'react';
import type { Ddt } from '../types';
import * as XLSX from 'xlsx'; // Importiamo la libreria per creare file Excel

interface DdtResultDisplayProps {
  data: Ddt;
  onAnalyzeAnother: () => void;
}

// Componente per la visualizzazione pulita delle informazioni principali del DDT
const InfoField: React.FC<{ label: string; value: any }> = ({ label, value }) => {
  let displayValue = 'N/D';

  if (typeof value === 'string' && value) {
    displayValue = value;
  } else if (typeof value === 'object' && value !== null && value.nome) {
    displayValue = value.nome;
  }

  return (
    <div>
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-base text-gray-800">{displayValue}</p>
    </div>
  );
};

// Componente principale per la visualizzazione dei risultati del DDT
const DdtResultDisplay: React.FC<DdtResultDisplayProps> = ({ data, onAnalyzeAnother }) => {
  
  // **FUNZIONE AGGIUNTA**: Logica completa per esportare i dati in formato Excel
  const handleExportToExcel = () => {
    if (!data || !data.prodotti) return;

    // 1. Prepara i dati per il foglio di calcolo, come li vedi nella tabella
    const worksheetData = data.prodotti.map(prodotto => ({
      'Prodotto': prodotto.nomeProdotto || 'N/D',
      'Quantità': prodotto.quantita ?? 'N/D',
      'Lotto': prodotto.lotto || 'MANCANTE',
      'Scadenza': prodotto.scadenza || 'MANCANTE'
    }));

    // 2. Crea il foglio di lavoro a partire dai dati
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // 3. Crea il file Excel
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dettaglio DDT');

    // 4. Imposta il nome del file e avvia il download nel browser
    const fileName = `DDT_${data.numeroDDT || 'export'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Risultati Analisi DDT</h2>
          <p className="text-sm text-gray-500 mt-1">Dati estratti dal documento di trasporto caricato.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Il pulsante "Esporta Excel" ora è collegato alla funzione corretta */}
          <button 
            onClick={handleExportToExcel}
            className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Esporta Excel
          </button>
          <button 
            onClick={onAnalyzeAnother}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-lime-600 rounded-md hover:bg-lime-700"
          >
            Analizza un altro
          </button>
        </div>
      </div>

      {/* Sezione con le informazioni principali del DDT (invariata) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-4 bg-gray-50 rounded-lg">
        <InfoField label="Mittente" value={data.mittente} />
        <InfoField label="Destinatario" value={data.destinatario} />
        <InfoField label="Numero DDT" value={data.numeroDDT} />
        <InfoField label="Data DDT" value={data.dataDDT} />
      </div>

      {/* Tabella con la lista dei prodotti e alert visivi (invariata) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Prodotti Elencati</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Prodotto</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantità</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lotto</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Scadenza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.prodotti?.map((prodotto, index) => {
                const isLottoMissing = !prodotto.lotto;
                const isScadenzaMissing = !prodotto.scadenza;

                return (
                  <tr key={index}>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-800">{prodotto.nomeProdotto || 'N/D'}</td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-800">{prodotto.quantita ?? 'N/D'}</td>
                    <td className={`py-4 px-4 whitespace-nowrap text-sm ${isLottoMissing ? 'bg-red-50 font-bold text-red-600' : 'text-gray-800'}`}>
                      {prodotto.lotto || 'MANCANTE'}
                    </td>
                    <td className={`py-4 px-4 whitespace-nowrap text-sm ${isScadenzaMissing ? 'bg-red-50 font-bold text-red-600' : 'text-gray-800'}`}>
                      {prodotto.scadenza || 'MANCANTE'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DdtResultDisplay;
