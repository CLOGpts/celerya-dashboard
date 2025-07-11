// Codice completo per: src/utils/exportUtils.ts

import * as XLSX from 'xlsx';
import type { Product } from '../types'; 

// Funzione per esportare i dati in formato Excel
export const exportToExcel = (productData: Product, fileName: string) => {
  const workbook = XLSX.utils.book_new();

  // Itera su ogni sezione del prodotto (es. "identificazione", "ingredienti", etc.)
  Object.entries(productData).forEach(([sectionTitle, sectionContent]) => {
    // Controlla che la sezione sia un oggetto valido e non vuoto
    if (typeof sectionContent === 'object' && sectionContent !== null && Object.keys(sectionContent).length > 0) {
      
      // Trasforma l'oggetto in un array di righe per Excel
      const data = Object.entries(sectionContent).map(([key, value]) => ({
        'Campo': key,
        'Valore': String(value) // Converte tutti i valori in stringhe per sicurezza
      }));
      
      // Crea un nuovo foglio di lavoro
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Imposta la larghezza delle colonne per una migliore leggibilità
      worksheet['!cols'] = [{ wch: 30 }, { wch: 60 }];

      // Aggiunge il foglio di lavoro al file Excel, usando il titolo della sezione
      // Il nome del foglio non può superare i 31 caratteri
      XLSX.utils.book_append_sheet(workbook, worksheet, sectionTitle.substring(0, 31));
    }
  });

  // Salva il file Excel con il nome fornito
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
