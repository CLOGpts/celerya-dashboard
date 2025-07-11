export interface Alert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  field: string;
  deadline?: string; // ISO date string
}

export interface Product {
  id: string;
  qrCodeUrl?: string;
  identificazione: {
    produttore: string;
    logo?: string;
    denominazioneScheda: string;
    codiceProdotto: string;
    dataRedazione: string; // ISO date string
    numeroRevisione: number;
  };
  descrizione: {
    denominazioneLegale: string;
    ingredienti: string;
    allergeni: string;
    descrizioneProdotto: string;
    proprietaSensoriali: string;
  };
  nutrizionale: {
    energia: string; // e.g., "480kcal/2008kJ"
    proteine: string; // e.g., "7g"
    grassi: string; // e.g., "22g"
    carboidrati: string; // e.g., "63g"
    sale: string; // e.g., "0.2g"
    ph?: number;
    aw?: number;
    umidita?: number; // percentage
    residuiAdditivi: string;
  };
  sicurezza: {
    listeria: string;
    salmonella: string;
    eColi: string;
    enterobacteriaceae: string;
    stafilococchi: string;
    limitiContaminanti: string;
  };
  conservazione: {
    tmcScadenza: string; // ISO date string
    condizioniStoccaggio: string;
    shelfLifePostApertura: string; // e.g., "7 giorni"
    modalitaUso: string;
  };
  packaging: {
    tipoImballaggio: string;
    materiali: string;
    dimensioni: string;
    pesoNetto: string; // e.g., "0.400 kg"
    pesoSgocciolato?: string;
    composizionePallet: string;
  };
  conformita: {
    normative: string;
    certificazioni: {
      tipo: string;
      scadenza: string; // ISO date string
    }[];
    origineIngredienti: string;
  };
}

export interface Field {
  name: string;
  mandatory: boolean;
  critical: boolean;
  active: boolean;
}

export interface Section {
  id: string;
  title: string;
  fields: Field[];
}

export interface TransportProduct {
  descrizione: string;
  quantita: string;
  lotto: string;
  scadenza: string; // ISO Date string
}

export interface TransportInfo {
  mittente: string;
  numeroDDT: string;
  dataDDT: string; // ISO Date string
  vettore: string;
  destinatario: string;
}

export interface AnalyzedTransportDocument {
    id: string;
    qrCodeUrl?: string;
    info: TransportInfo;
    prodotti: TransportProduct[];
}

export interface Customer {
  id: string;
  name: string;
  slug: string;
}

export interface SupplierData {
    name: string;
    pdfs: Record<string, Product & { savedAt: string }>;
    ddts?: Record<string, AnalyzedTransportDocument & { savedAt: string }>;
    celeryaId?: string;
    lastUpdate: string;
}

export interface CustomerSuppliersData {
    suppliers: Record<string, SupplierData>;
}

export type AllSuppliersData = Record<string, CustomerSuppliersData>;


// --- Web Speech API Types ---
export interface SpeechRecognitionAlternative {
    transcript: string;
}

export interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onstart: (this: SpeechRecognition, ev: Event) => any;
    onend: (this: SpeechRecognition, ev: Event) => any;
    onresult: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any;
    onerror: (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any;
}

export interface SpeechRecognitionStatic {
    new (): SpeechRecognition;
}

// Augment the global Window interface
declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionStatic;
        webkitSpeechRecognition?: SpeechRecognitionStatic;
        gapi: any; // Google API Client
        google: any; // Google Identity Services
    }
}