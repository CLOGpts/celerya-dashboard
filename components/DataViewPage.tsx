

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { PRODUCTS_DATA } from '../data/products';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import McpFileSelector from './McpFileSelector';
import type { AllSuppliersData, SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types';

// The user-provided MCP endpoint for Server-Sent Events
const MCP_SSE_ENDPOINT = 'https://cloud.activepieces.com/api/v1/mcp/mw52JQzyt7Yl34Rrebl7r/sse';

const SourceLink: React.FC<{uri: string, title: string}> = ({ uri, title }) => (
    <a href={uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        <span className="text-xs font-medium text-gray-700 truncate" title={title}>{title || uri}</span>
    </a>
);

const ChatMessage: React.FC<{ role: 'user' | 'model'; text: string; sources?: any[] }> = ({ role, text, sources }) => {
    const isUser = role === 'user';
    const bubbleClasses = isUser
        ? 'bg-lime-600 text-white'
        : 'bg-white text-gray-800 border border-gray-200';
    const alignmentClasses = isUser ? 'items-end' : 'items-start';
    const hasSources = sources && sources.length > 0;

    return (
        <div className={`flex flex-col gap-2 py-2 ${alignmentClasses}`}>
            <div className={`max-w-2xl px-4 py-3 rounded-xl shadow-sm ${bubbleClasses}`}>
                 <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
            {hasSources && (
                 <div className="max-w-2xl w-full mt-1">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Fonti:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                         {sources.map((source, index) => (
                           source.web && <SourceLink key={index} uri={source.web.uri} title={source.web.title} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const data = result.substring(result.indexOf(',') + 1);
            resolve({ mimeType: file.type, data });
        };
        reader.onerror = error => reject(error);
    });
};

const XIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


const DataViewPage: React.FC = () => {
    const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; sources?: any[] }[]>([
        { role: 'model', text: 'Ciao! Sono SYD AGENT. Sono un esperto di dati e comunicazione commerciale con accesso a Internet. Chiedimi qualsiasi cosa!' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [selectableFiles, setSelectableFiles] = useState<string[] | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isListening, setIsListening] = useState(false);
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
    const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
    const mcpEventSourceRef = useRef<EventSource | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, selectableFiles]);
    
    // Setup and cleanup all EventSources
    useEffect(() => {
        // Cleanup function
        return () => {
            mcpEventSourceRef.current?.close();
        };
    }, []);

    useEffect(() => {
        const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognitionApi) {
            setIsSpeechRecognitionSupported(true);
            const recognition: SpeechRecognition = new SpeechRecognitionApi();
            recognition.continuous = false;
            recognition.lang = 'it-IT';
            recognition.interimResults = false;

            recognition.onstart = () => {
                setIsListening(true);
                setError(null);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = event.results[event.results.length - 1][0].transcript.trim();
                setInput(transcript);
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setError("Accesso al microfono negato. Controlla le impostazioni del browser.");
                } else {
                    setError("Errore durante il riconoscimento vocale.");
                }
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            speechRecognitionRef.current = recognition;
        } else {
            setIsSpeechRecognitionSupported(false);
            console.warn("Speech Recognition not supported by this browser.");
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setAttachedFile(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleRemoveFile = () => {
        setAttachedFile(null);
    };

    const handleListen = () => {
        if (!speechRecognitionRef.current || isLoading) return;

        if (isListening) {
            speechRecognitionRef.current.stop();
        } else {
            try {
                speechRecognitionRef.current.start();
            } catch(e) {
                console.error("Could not start recognition: ", e);
                setError("Impossibile avviare il riconoscimento vocale.")
            }
        }
    };
    
    const handleSendMessage = async (messageOverride?: string) => {
        const userMessageText = messageOverride || input.trim();
        if ((!userMessageText && !attachedFile) || isLoading) return;

        let userMessageToDisplay = userMessageText;
        if (attachedFile) {
            userMessageToDisplay += `\n\n📄 File allegato: ${attachedFile.name}`;
        }

        const newUserMessage = { role: 'user' as const, text: userMessageToDisplay };
        setMessages(prev => [...prev, newUserMessage]);
        
        const fileToSend = attachedFile;
        setInput('');
        setAttachedFile(null);
        setSelectableFiles(null);
        setIsLoading(true);
        setError(null);
        
        // Close any existing MCP SSE connection before sending a new message
        if (mcpEventSourceRef.current) {
            mcpEventSourceRef.current.close();
            mcpEventSourceRef.current = null;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const isMcpConnected = localStorage.getItem('celerya_mcp_connected') === 'true';
            const isDriveConnected = localStorage.getItem('celerya_gdrive_connected') === 'true';
            
            let savedData: AllSuppliersData;
            try {
                savedData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
            } catch (e) {
                console.error("Failed to parse celerya_suppliers_data from localStorage. Using empty object for context.", e);
                savedData = {};
            }

            const dataContextObject = {
                staticProducts: PRODUCTS_DATA,
                savedSupplierData: savedData,
                mcp: {
                    connected: isMcpConnected
                },
                gdrive: {
                    connected: isDriveConnected
                }
            };
            const dataContext = JSON.stringify(dataContextObject, null, 2);

            const systemInstruction = `Sei SYD AGENT, un assistente AI avanzato per l'app Celerya Spec-Extractor. Hai due ruoli principali:

1.  **Enterprise Data Assistant:** Il tuo scopo primario è rispondere a domande sui dati estratti (schede tecniche, DDT, fornitori) e interagire con i file da fonti come MCP o Google Drive.
    - **Interazione con Dati Esistenti:** Se l'utente fa una domanda sui dati già analizzati e presenti nel contesto JSON, rispondi usando tali dati.
    - **Interazione con File (MCP & Google Drive):**
      - La cartella condivisa MCP è accessibile se \`mcp.connected\` è \`true\`.
      - Google Drive è accessibile se \`gdrive.connected\` è \`true\`.
      - Se una connessione è attiva e l'utente chiede di cercare/elencare/analizzare un file dalla fonte corrispondente, devi rispondere *esclusivamente* con l'azione appropriata: \`ACTION:LIST_MCP_FILES\` per MCP o \`ACTION:LIST_GDRIVE_FILES\` per Google Drive.
      - Se l'utente seleziona un file, la sua richiesta successiva conterrà il nome del file. Per queste richieste, fornisci un'analisi plausibile basata sul nome del file.
    - **Upload Manuale:** Se un file è allegato, analizza il suo contenuto per rispondere.

2.  **Esperto di Comunicazione Commerciale e Ricercatore Web:**
    - **Proposte Commerciali:** Sei un esperto di comunicazione. Se richiesto, puoi creare bozze di email, messaggi o proposte commerciali basate sui dati di prodotto disponibili o su informazioni generali.
    - **Accesso a Internet:** Hai accesso a Google Search per trovare informazioni aggiornate, rispondere a domande di cultura generale o arricchire le tue risposte. Quando usi la ricerca, è obbligatorio che tu citi le tue fonti. Il frontend mostrerà i link che fornisci.

**Regole Generali:**
- Sii conciso e preciso.
- Formatta le tue risposte usando un markdown leggero per la leggibilità.
- Se una connessione (MCP/Drive) non è attiva, informa l'utente di andare nelle Impostazioni.
- Se un dato non è disponibile nel contesto JSON e non lo trovi online, rispondi "Informazione non trovata".`;

            let contents: any;
            const fullPromptText = `Contesto Dati (JSON):\n\`\`\`json\n${dataContext}\n\`\`\`\n\nDomanda Utente:\n${userMessageText}`;

            if (fileToSend) {
                const { mimeType, data: base64Data } = await fileToBase64(fileToSend);
                const filePart = { inlineData: { mimeType, data: base64Data } };
                const textPart = { text: fullPromptText };
                contents = { parts: [filePart, textPart] };
            } else {
                contents = fullPromptText;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-04-17',
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{googleSearch: {}}]
                }
            });
            
            const responseText = response.text.trim();
            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

            if (responseText === 'ACTION:LIST_GDRIVE_FILES') {
                if (!isDriveConnected) {
                   const modelResponse = { role: 'model' as const, text: `L'accesso a Google Drive non è autorizzato. Per favore, vai alla pagina Impostazioni per abilitare la connessione.` };
                   setMessages(prev => [...prev, modelResponse]);
                   setIsLoading(false);
                   return;
                }
                
                setMessages(prev => [...prev, { role: 'model', text: `Ok, mi connetto a Google Drive per cercare i file...` }]);
                
                const folderUrl = localStorage.getItem('celerya_gdrive_folder_url');
                if (!folderUrl) {
                    const modelResponse = { role: 'model' as const, text: `Nessuna cartella Google Drive è stata configurata. Per favore, vai alla pagina Impostazioni per specificare l'URL della cartella.` };
                    setMessages(prev => [...prev, modelResponse]);
                    setIsLoading(false);
                    return;
                }
            
                const folderIdMatch = folderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
                const folderId = folderIdMatch ? folderIdMatch[1] : null;
            
                if (!folderId) {
                    const modelResponse = { role: 'model' as const, text: `L'URL della cartella Google Drive non è valido. Per favore, controllalo nella pagina Impostazioni.` };
                    setMessages(prev => [...prev, modelResponse]);
                    setIsLoading(false);
                    return;
                }
                
                if (!window.gapi?.client?.drive) {
                    const modelResponse = { role: 'model' as const, text: `Errore: il client di Google Drive non è pronto. Riprova più tardi o riconnettiti dalle Impostazioni.` };
                    setMessages(prev => [...prev, modelResponse]);
                    setIsLoading(false);
                    return;
                }
            
                try {
                    const driveResponse = await window.gapi.client.drive.files.list({
                        q: `'${folderId}' in parents and trashed=false`,
                        fields: 'files(id, name)',
                        pageSize: 50,
                        orderBy: 'modifiedTime desc',
                    });
                    
                    const files = driveResponse.result.files;
                    if (files && files.length > 0) {
                        setSelectableFiles(files.map((f: {name: string}) => `[Drive] ${f.name}`));
                    } else {
                         setMessages(prev => [...prev, { role: 'model', text: `Non ho trovato file nella cartella Google Drive collegata.` }]);
                    }
                } catch (err: any) {
                    console.error("Google Drive API Error:", err);
                    let errorMessage = 'Si è verificato un errore durante la ricerca di file su Google Drive.';
                    if (err.status === 401 || err.status === 403) {
                        errorMessage += ' Prova a disconnettere e riconnettere il tuo account Google dalle Impostazioni.';
                    }
                    setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
                } finally {
                    setIsLoading(false);
                }

            } else if (responseText === 'ACTION:LIST_MCP_FILES') {
                 if (!isMcpConnected) {
                    const modelResponse = { role: 'model' as const, text: `L'accesso a MCP non è autorizzato. Per favore, vai alla Dashboard per abilitare la connessione.` };
                    setMessages(prev => [...prev, modelResponse]);
                    setIsLoading(false);
                    return;
                }
                
                setMessages(prev => [...prev, { role: 'model', text: `Ok, mi connetto a MCP per cercare i file...` }]);
                setSelectableFiles([]); // Show the component in a "loading" state

                const endpoint = MCP_SSE_ENDPOINT; 
                const eventSource = new EventSource(endpoint);
                mcpEventSourceRef.current = eventSource;

                eventSource.onopen = () => console.log(`MCP SSE connection opened.`);

                eventSource.onmessage = (event) => {
                    try {
                        const messageData = JSON.parse(event.data);
                        if (messageData.resource && typeof messageData.resource.name === 'string') {
                             const fileName = messageData.resource.name;
                            setSelectableFiles(prevFiles => {
                                if (!prevFiles) return [fileName];
                                const newFiles = new Set(prevFiles);
                                newFiles.add(fileName);
                                return Array.from(newFiles).sort();
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to parse MCP SSE message:`, e, "Data:", event.data);
                    }
                };
                
                eventSource.onerror = (err) => {
                    console.error(`MCP SSE connection error.`);
                    setError(`Errore di connessione al servizio file MCP. La risorsa potrebbe non essere disponibile.`);
                    setMessages(prev => [...prev, { role: 'model', text: `Impossibile connettersi alla risorsa MCP. Controlla che sia attiva e riprova.` }]);
                    eventSource.close();
                    mcpEventSourceRef.current = null;
                    setSelectableFiles(null);
                    setIsLoading(false);
                };

            } else {
                const modelResponse = { role: 'model' as const, text: responseText, sources: sources };
                setMessages(prev => [...prev, modelResponse]);
                setIsLoading(false);
            }

        } catch (e) {
            console.error("SYD AGENT error:", e);
            const errorMessage = "Oops! Qualcosa è andato storto. Per favore riprova.";
            setError(errorMessage);
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
            setIsLoading(false);
        } 
    };
    
    const handleFileSelection = (fileName: string) => {
        if (mcpEventSourceRef.current) {
            mcpEventSourceRef.current.close();
            mcpEventSourceRef.current = null;
        }
        setSelectableFiles(null);
        handleSendMessage(`Analizza il file: "${fileName}"`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <header className="p-4 sm:p-6 lg:p-8 border-b border-gray-200 bg-white sticky top-0 z-10">
                <h1 className="text-2xl font-bold text-gray-900">SYD AGENT</h1>
                <p className="text-sm text-gray-500 mt-1">Il tuo assistente intelligente per l'analisi dei dati.</p>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <ChatMessage key={index} role={msg.role} text={msg.text} sources={msg.sources} />
                        ))}
                        {isLoading && !selectableFiles && ( // Show thinking spinner only if not waiting for files
                            <div className="flex justify-start">
                                <div className="max-w-2xl px-4 py-3 rounded-xl shadow-sm bg-white text-gray-800 border border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <SpinnerIcon className="text-gray-500" />
                                        <span className="text-sm italic">SYD sta pensando...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {selectableFiles && (
                            <McpFileSelector
                                files={selectableFiles}
                                onSelect={handleFileSelection}
                            />
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            <footer className="p-4 sm:p-6 lg:p-8 border-t border-gray-200 bg-gray-100/50 backdrop-blur-sm sticky bottom-0">
                <div className="max-w-4xl mx-auto">
                    {error && <p className="text-red-600 text-sm text-center mb-2">{error}</p>}
                    
                    {attachedFile && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                                <PaperclipIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 font-medium truncate">{attachedFile.name}</span>
                            </div>
                            <button onClick={handleRemoveFile} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-end gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="p-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                            aria-label="Allega file"
                        >
                            <PaperclipIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                            onClick={handleListen}
                            disabled={isLoading || !isSpeechRecognitionSupported}
                            className={`p-3 rounded-lg border border-gray-300 transition-colors ${
                                isListening
                                ? 'bg-red-500 text-white hover:bg-red-600 ring-2 ring-red-500 ring-offset-2'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                            } disabled:bg-gray-200 disabled:cursor-not-allowed`}
                            aria-label={isListening ? "Ferma registrazione" : "Avvia registrazione"}
                        >
                            {isListening ? (
                                <span className="relative flex h-5 w-5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <MicrophoneIcon className="relative inline-flex h-5 w-5" />
                                </span>
                            ) : (
                                <MicrophoneIcon className="w-5 h-5" />
                            )}
                        </button>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Chiedi qualcosa o allega un file... (⌘+Enter)"
                            rows={3}
                            className="w-full flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-colors text-sm resize-none"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={isLoading || (!input.trim() && !attachedFile)}
                            className="p-3 rounded-lg bg-lime-600 text-white hover:bg-lime-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                            aria-label="Invia messaggio"
                        >
                           <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default DataViewPage;