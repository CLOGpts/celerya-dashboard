
import type { Section, Product, Alert } from './types';

type FieldDefinition = {
    label: string;
    mandatory: boolean;
    critical?: boolean;
    priority: 'Critica' | 'Obbligatoria' | 'Importante' | 'Raccomandata';
};

type SectionDefinition = {
    title: string;
    fields: Record<string, FieldDefinition>;
};

export const CELERYA_STANDARD: Record<string, SectionDefinition> = {
    identificazione: {
        title: 'Identificazione',
        fields: {
            produttore: { label: 'Produttore', mandatory: true, critical: false, priority: 'Obbligatoria' },
            logo: { label: 'Logo', mandatory: false, critical: false, priority: 'Raccomandata' },
            denominazioneScheda: { label: 'Denominazione scheda', mandatory: true, critical: false, priority: 'Obbligatoria' },
            codiceProdotto: { label: 'Codice prodotto', mandatory: true, critical: false, priority: 'Obbligatoria' },
            dataRedazione: { label: 'Data redazione', mandatory: true, critical: false, priority: 'Obbligatoria' },
            numeroRevisione: { label: 'Numero revisione', mandatory: true, critical: false, priority: 'Obbligatoria' },
        }
    },
    descrizione: {
        title: 'Descrizione',
        fields: {
            denominazioneLegale: { label: 'Denominazione legale', mandatory: true, critical: false, priority: 'Obbligatoria' },
            ingredienti: { label: 'Ingredienti', mandatory: true, critical: false, priority: 'Obbligatoria' },
            allergeni: { label: 'Allergeni', mandatory: true, critical: true, priority: 'Critica' },
            descrizioneProdotto: { label: 'Descrizione prodotto', mandatory: true, critical: false, priority: 'Obbligatoria' },
            proprietaSensoriali: { label: 'Proprietà sensoriali', mandatory: false, critical: false, priority: 'Raccomandata' },
        }
    },
    nutrizionale: {
        title: 'Nutrizionale & Chimico-fisico',
        fields: {
            energia: { label: 'Energia', mandatory: true, critical: false, priority: 'Obbligatoria' },
            proteine: { label: 'Proteine', mandatory: true, critical: false, priority: 'Obbligatoria' },
            grassi: { label: 'Grassi', mandatory: true, critical: false, priority: 'Obbligatoria' },
            carboidrati: { label: 'Carboidrati', mandatory: true, critical: false, priority: 'Obbligatoria' },
            sale: { label: 'Sale', mandatory: true, critical: false, priority: 'Obbligatoria' },
            ph: { label: 'pH', mandatory: false, critical: false, priority: 'Raccomandata' },
            aw: { label: 'aw', mandatory: false, critical: false, priority: 'Raccomandata' },
            umidita: { label: 'Umidità', mandatory: false, critical: false, priority: 'Raccomandata' },
            residuiAdditivi: { label: 'Residui/Additivi', mandatory: true, critical: true, priority: 'Critica' },
        }
    },
    sicurezza: {
        title: 'Sicurezza & Microbiologia',
        fields: {
            listeria: { label: 'Listeria', mandatory: true, critical: true, priority: 'Critica' },
            salmonella: { label: 'Salmonella', mandatory: true, critical: true, priority: 'Critica' },
            eColi: { label: 'E.coli', mandatory: true, critical: true, priority: 'Critica' },
            enterobacteriaceae: { label: 'Enterobacteriaceae', mandatory: false, critical: false, priority: 'Importante' },
            stafilococchi: { label: 'Stafilococchi', mandatory: false, critical: false, priority: 'Importante' },
            limitiContaminanti: { label: 'Limiti contaminanti', mandatory: true, critical: true, priority: 'Critica' },
        }
    },
    conservazione: {
        title: 'Conservazione',
        fields: {
            tmcScadenza: { label: 'TMC/Scadenza', mandatory: true, critical: false, priority: 'Obbligatoria' },
            condizioniStoccaggio: { label: 'Condizioni stoccaggio', mandatory: true, critical: false, priority: 'Obbligatoria' },
            shelfLifePostApertura: { label: 'Shelf-life post-apertura', mandatory: false, critical: false, priority: 'Raccomandata' },
            modalitaUso: { label: 'Modalità d’uso', mandatory: false, critical: false, priority: 'Importante' },
        }
    },
    packaging: {
        title: 'Packaging & Logistica',
        fields: {
            tipoImballaggio: { label: 'Tipo imballaggio', mandatory: false, critical: false, priority: 'Importante' },
            materiali: { label: 'Materiali', mandatory: false, critical: false, priority: 'Importante' },
            dimensioni: { label: 'Dimensioni', mandatory: false, critical: false, priority: 'Importante' },
            pesoNetto: { label: 'Peso netto', mandatory: true, critical: false, priority: 'Obbligatoria' },
            pesoSgocciolato: { label: 'Peso sgocciolato', mandatory: false, critical: false, priority: 'Obbligatoria' },
            composizionePallet: { label: 'Composizione pallet', mandatory: false, critical: false, priority: 'Raccomandata' },
        }
    },
    conformita: {
        title: 'Conformità',
        fields: {
            normative: { label: 'Normative', mandatory: true, critical: false, priority: 'Obbligatoria' },
            certificazioni: { label: 'Certificazioni', mandatory: false, critical: false, priority: 'Importante' },
            origineIngredienti: { label: 'Origine ingredienti', mandatory: true, critical: false, priority: 'Obbligatoria' },
        }
    }
};

export const FLATTENED_HEADERS = Object.entries(CELERYA_STANDARD).flatMap(([sectionKey, sectionValue]) => 
    Object.entries(sectionValue.fields).map(([fieldKey, fieldValue]) => ({
        section: sectionValue.title,
        field: fieldValue.label,
        key: `${sectionKey}.${fieldKey}`
    }))
);

// --- Settings Management ---

const SCHEMA_STORAGE_KEY = 'celerya_schema_settings';

export const getDefaultSchema = (): Section[] => {
    return Object.entries(CELERYA_STANDARD).map(([sectionId, sectionData]) => ({
        id: sectionId,
        title: sectionData.title,
        fields: Object.entries(sectionData.fields).map(([, fieldData]) => ({
            name: fieldData.label,
            mandatory: fieldData.mandatory,
            critical: fieldData.critical ?? false,
            active: true,
        })),
    }));
};

export const getCustomSchema = (): Section[] => {
    try {
        const storedSchema = localStorage.getItem(SCHEMA_STORAGE_KEY);
        if (storedSchema) {
            return JSON.parse(storedSchema);
        }
    } catch (error) {
        console.error("Failed to parse custom schema from localStorage", error);
    }
    return getDefaultSchema();
};

export const saveCustomSchema = (schema: Section[]): void => {
    try {
        localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(schema));
    } catch (error) {
        console.error("Failed to save custom schema to localStorage", error);
    }
};

const createFieldKeyMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    Object.entries(CELERYA_STANDARD).forEach(([sectionKey, sectionValue]) => {
        Object.entries(sectionValue.fields).forEach(([fieldKey, fieldValue]) => {
            map[fieldValue.label] = `${sectionKey}.${fieldKey}`;
        });
    });
    return map;
};

const fieldKeyMap = createFieldKeyMap();

export const generatePromptFromSchema = (schema: Section[]): string => {
    const reverseFieldKeyMap: Record<string, string> = {};
    Object.entries(fieldKeyMap).forEach(([label, path]) => {
        const key = path.split('.').pop()!;
        reverseFieldKeyMap[path] = key;
    });

    let interfaceString = 'interface Product {\n';
    schema.forEach(section => {
        const activeFields = section.fields.filter(f => f.active);
        if (activeFields.length > 0) {
            interfaceString += `  ${section.id}: {\n`;
            activeFields.forEach(field => {
                const objectPath = fieldKeyMap[field.name];
                const tsKey = reverseFieldKeyMap[objectPath];
                if(tsKey) {
                    let tsType = 'string';
                    if (['numeroRevisione', 'ph', 'aw', 'umidita'].includes(tsKey)) {
                        tsType = 'number';
                    } else if (tsKey === 'certificazioni') {
                        tsType = '{ tipo: string; scadenza: string; }[]';
                    }
                    interfaceString += `    ${tsKey}: ${tsType};\n`;
                }
            });
            interfaceString += `  };\n`;
        }
    });
    interfaceString += '}';

    return `Analizza il documento fornito, che è una scheda tecnica di un prodotto alimentare. Estrai SOLO le informazioni per i campi attivi e restituiscile come un singolo oggetto JSON. Non includere alcun testo, spiegazione o markdown (come \`\`\`json) al di fuori dell'oggetto JSON. L'oggetto JSON deve aderire strettamente alla seguente interfaccia TypeScript. Tutte le date devono essere in formato stringa ISO 8601. Se un'informazione non è presente, utilizza un valore predefinito appropriato (es. stringa vuota, 0, array vuoto).

${interfaceString}
`;
};

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export const generateAlertsFromSchema = (product: Product, schema: Section[]): Alert[] => {
    if (!product) return []; // Safety guard for null/undefined product

    const alerts: Alert[] = [];
    const now = new Date();
    const flatFields = schema.flatMap(s => s.fields);

    schema.forEach(section => {
        section.fields.forEach(field => {
            if (field.active && field.mandatory) {
                const objectPath = fieldKeyMap[field.name];
                if (objectPath) {
                    const value = objectPath.split('.').reduce((o, i) => (o ? o[i] : undefined), product);
                    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                        alerts.push({
                            severity: field.critical ? 'critical' : 'warning',
                            message: `Campo obbligatorio mancante: ${field.name}`,
                            field: objectPath,
                        });
                    }
                }
            }
        });
    });

    const isFieldActive = (label: string) => flatFields.find(f => f.name === label)?.active ?? false;
    
    if (isFieldActive('Data redazione') && product.identificazione?.dataRedazione) {
        const redazioneDate = new Date(product.identificazione.dataRedazione);
        if (isValidDate(redazioneDate)) {
            const monthsDiff = (now.getFullYear() - redazioneDate.getFullYear()) * 12 + (now.getMonth() - redazioneDate.getMonth());
            if (monthsDiff >= 12) {
                alerts.push({ severity: 'warning', message: `Scheda non revisionata da ${monthsDiff} mesi`, field: 'identificazione.dataRedazione' });
            }
        }
    }
    
    if (isFieldActive('TMC/Scadenza') && product.conservazione?.tmcScadenza) {
        const scadenzaTMC = new Date(product.conservazione.tmcScadenza);
        if(isValidDate(scadenzaTMC)){
            const daysToScadenzaTMC = Math.ceil((scadenzaTMC.getTime() - now.getTime()) / (1000 * 3600 * 24));
            if (daysToScadenzaTMC <= 0) {
                alerts.push({ severity: 'critical', message: `Prodotto scaduto`, field: 'conservazione.tmcScadenza', deadline: product.conservazione.tmcScadenza });
            } else if (daysToScadenzaTMC <= 30) {
                alerts.push({ severity: 'warning', message: `Prodotto in scadenza tra ${daysToScadenzaTMC} giorni`, field: 'conservazione.tmcScadenza', deadline: product.conservazione.tmcScadenza });
            }
        }
    }
    
    if (isFieldActive('Certificazioni') && product.conformita?.certificazioni?.length) {
        product.conformita.certificazioni.forEach(cert => {
            if (cert.scadenza) {
                const scadenzaCert = new Date(cert.scadenza);
                if(isValidDate(scadenzaCert)){
                    const daysToScadenza = Math.ceil((scadenzaCert.getTime() - now.getTime()) / (1000 * 3600 * 24));
                    if (daysToScadenza <= 0) {
                        alerts.push({ severity: 'critical', message: `Certificazione "${cert.tipo}" scaduta`, field: 'conformita.certificazioni', deadline: cert.scadenza });
                    } else if (daysToScadenza <= 60) {
                        alerts.push({ severity: 'warning', message: `Certificazione "${cert.tipo}" in scadenza tra ${daysToScadenza} giorni`, field: 'conformita.certificazioni', deadline: cert.scadenza });
                    }
                }
            }
        });
    }

    return alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
};
