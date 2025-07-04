import type { Product } from '../types';

const today = new Date();
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export const PRODUCTS_DATA: Product[] = [
  { 
    id: '1', 
    identificazione: {
      produttore: 'Azienda Alimentare S.p.A.', 
      logo: 'https://logo.clearbit.com/mutti-parma.com',
      denominazioneScheda: 'Salsa Pronta di Pomodoro', 
      codiceProdotto: 'SPP-001', 
      dataRedazione: addMonths(today, -13).toISOString(), // <-- Alert: > 12 mesi
      numeroRevisione: 3,
    },
    descrizione: {
        denominazioneLegale: 'Salsa di pomodoro con basilico',
        ingredienti: 'Pomodoro (90%), cipolla, olio di oliva, basilico (1%), sale.',
        allergeni: 'Può contenere tracce di sedano.',
        descrizioneProdotto: 'Salsa densa e saporita, pronta per condire la pasta.',
        proprietaSensoriali: 'Colore rosso vivo, profumo intenso di pomodoro e basilico.'
    },
    nutrizionale: {
        energia: '35kcal/146kJ',
        proteine: '1.2g',
        grassi: '1.5g',
        carboidrati: '4.0g',
        sale: '0.5g',
        ph: 4.2,
        umidita: 85,
        residuiAdditivi: 'Conforme al Reg. (CE) 1881/2006'
    },
    sicurezza: {
        listeria: 'Assente in 25g',
        salmonella: 'Assente in 25g',
        eColi: '< 10 ufc/g',
        enterobacteriaceae: '< 10 ufc/g',
        stafilococchi: '< 10 ufc/g',
        limitiContaminanti: 'Conforme'
    },
    conservazione: {
        tmcScadenza: addDays(today, 250).toISOString(),
        condizioniStoccaggio: 'Luogo fresco e asciutto, lontano da fonti di calore.',
        shelfLifePostApertura: '3 giorni in frigorifero',
        modalitaUso: 'Scaldare prima dell\'uso.'
    },
    packaging: {
        tipoImballaggio: 'Vasetto in vetro',
        materiali: 'Vetro, alluminio (capsula)',
        dimensioni: '7x7x12 cm',
        pesoNetto: '0.350 kg',
        composizionePallet: '120 casse x 12 vasetti'
    },
    conformita: {
        normative: 'Reg. (CE) 852/2004',
        certificazioni: [
            { tipo: 'BIO', scadenza: addDays(today, 300).toISOString() },
            { tipo: 'IFS', scadenza: addDays(today, 45).toISOString() } // <-- Alert: < 60 giorni
        ],
        origineIngredienti: 'Pomodoro: Italia; Olio: Spagna'
    }
  },
  { 
    id: '2', 
    identificazione: {
      produttore: 'Caseificio Molisano', 
      logo: 'https://logo.clearbit.com/caseificiomolisano.it',
      denominazioneScheda: 'Mozzarella di Bufala Campana DOP', 
      codiceProdotto: 'MBC-012', 
      dataRedazione: addMonths(today, -2).toISOString(),
      numeroRevisione: 1,
    },
    descrizione: {
        denominazioneLegale: 'Formaggio fresco a pasta filata',
        ingredienti: 'Latte di bufala, siero innesto naturale, caglio, sale.',
        allergeni: 'Latte',
        descrizioneProdotto: 'Mozzarella DOP prodotta con latte di bufala fresco.',
        proprietaSensoriali: '' // <-- Alert: campo obbligatorio mancante (anche se non lo è nello schema, per test)
    },
    nutrizionale: {
        energia: '288kcal/1205kJ',
        proteine: '17g',
        grassi: '24g',
        carboidrati: '0.8g',
        sale: '0.7g',
        ph: 5.2,
        umidita: 58,
        residuiAdditivi: 'N/A'
    },
    sicurezza: {
        listeria: 'Assente in 25g',
        salmonella: 'Assente in 25g',
        eColi: 'Assente',
        enterobacteriaceae: '< 10 ufc/g',
        stafilococchi: '< 100 ufc/g',
        limitiContaminanti: 'Conforme ai limiti di legge'
    },
    conservazione: {
        tmcScadenza: addDays(today, 15).toISOString(), // <-- Alert: < 30 giorni
        condizioniStoccaggio: 'In frigorifero a +4°C, immersa nel suo liquido di governo.',
        shelfLifePostApertura: '1 giorno',
        modalitaUso: 'Consumare a temperatura ambiente.'
    },
    packaging: {
        tipoImballaggio: 'Busta in plastica',
        materiali: 'Polietilene per alimenti',
        dimensioni: '15x20 cm',
        pesoNetto: '0.250 kg',
        pesoSgocciolato: '0.125 kg',
        composizionePallet: '100 casse x 8 buste'
    },
    conformita: {
        normative: 'Disciplinare DOP',
        certificazioni: [
            { tipo: 'DOP', scadenza: addDays(today, 700).toISOString() },
        ],
        origineIngredienti: 'Latte: Italia (area DOP)'
    }
  },
   { 
    id: '3', 
    identificazione: {
      produttore: 'Forno Antico', 
      denominazioneScheda: 'Biscotti Frollini al Cacao', 
      codiceProdotto: 'BFC-305', 
      dataRedazione: addMonths(today, -1).toISOString(),
      numeroRevisione: 1,
    },
    descrizione: {
        denominazioneLegale: 'Biscotti frollini',
        ingredienti: 'Farina di frumento, zucchero, burro, uova, cacao in polvere (8%).',
        allergeni: 'Frumento, burro, uova. Può contenere tracce di frutta a guscio.',
        descrizioneProdotto: 'Frollini friabili e golosi, perfetti per la colazione.',
        proprietaSensoriali: 'Colore bruno, odore intenso di cacao e burro.'
    },
    nutrizionale: {
        energia: '480kcal/2008kJ',
        proteine: '7g',
        grassi: '22g',
        carboidrati: '63g',
        sale: '0.2g',
        umidita: 4,
        residuiAdditivi: '' // <-- Alert: campo obbligatorio mancante (anche se non lo è nello schema, per test)
    },
    sicurezza: {
        listeria: 'Non applicabile',
        salmonella: 'Assente in 25g',
        eColi: 'Non applicabile',
        enterobacteriaceae: 'Non applicabile',
        stafilococchi: 'Non applicabile',
        limitiContaminanti: 'Conforme'
    },
    conservazione: {
        tmcScadenza: addDays(today, 180).toISOString(),
        condizioniStoccaggio: 'Luogo fresco e asciutto.',
        shelfLifePostApertura: '7 giorni',
        modalitaUso: 'Ideali per l\'inzuppo.'
    },
    packaging: {
        tipoImballaggio: 'Sacchetto in polipropilene',
        materiali: 'PP',
        dimensioni: '20x30x5 cm',
        pesoNetto: '0.400 kg',
        composizionePallet: '50 casse x 20 sacchetti'
    },
    conformita: {
        normative: 'Reg. (UE) 1169/2011',
        certificazioni: [
           { tipo: 'BRC', scadenza: addDays(today, -10).toISOString() }, // <-- Alert: scaduta
        ],
        origineIngredienti: 'UE / non UE'
    }
  },
];