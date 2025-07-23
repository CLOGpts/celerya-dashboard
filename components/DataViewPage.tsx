import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, DynamicRetrievalConfigMode } from "@google/genai";
import { PRODUCTS_DATA } from '../data/products';
import { DDT_DATA } from '../data/ddt';
import { SUPPLIERS_DATA } from '../data/suppliers';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SendIcon } from './icons/SendIcon';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import McpFileSelector from './McpFileSelector';
import type { AllSuppliersData, SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent } from '../types';

const SourceLink: React.FC<{ uri: string, title: string }> = ({ uri, title }) => (
  <a href={uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
    <span className="text-xs font-medium text-gray-700 truncate" title={title}>{title || uri}</span>
  </a>
);

const ChatMessage: React.FC<{ role: 'user' | 'model'; text: string; sources?: any[] }> = ({ role, text, sources }) => {
  const isUser = role === 'user';
  const bubbleClasses = isUser ? 'bg-lime-600 text-white' : 'bg-white text-gray-800 border border-gray-200';
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
            {sources.map((source, index) =>
              source.uri && <SourceLink key={index} uri={source.uri} title={source.title || source.uri} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const fileToBase64 = (file: File): Promise<{ mimeType: string, data: string }> => {
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

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SYD_INTRO_PROMPT =
  `Ciao! Sono SYD AGENT, il tuo assistente AI integrato in questa piattaforma.
La mia missione è essere il tuo copilota intelligente: ti aiuto a navigare, analizzare e sfruttare i dati in modo rapido ed efficace.
Sono attivo in 4 aree principali:
1. **Assistente Dati Aziendali**: rispondo a domande su prodotti, DDT e fornitori salvati nella piattaforma.
2. **Gestore File e Cloud**: ti aiuto a elencare, selezionare e analizzare file locali o in cloud.
3. **Ricercatore Web**: effettuo ricerche aggiornate online e cito sempre le fonti.
4. **Esperto Comunicazione Commerciale**: preparo bozze, email e messaggi basati sui tuoi dati.
Puoi chiedermi qualsiasi cosa: sono qui per automatizzare le attività, farti risparmiare tempo e darti sempre risposte precise.`;

// Utility per individuare richieste "interne" (prodotti, DDT, fornitori)
const matchInternalData = (query: string) => {
  // Esempio: modificare/estendere con regex e logica più sofisticata su base esigenza reale
  if (/allergeni/i.test(query) && PRODUCTS_DATA) {
    // Cerca prodotto per nome
    const prod = Object.values(PRODUCTS_DATA).find(p => query.toLowerCase().includes((p.nome || '').toLowerCase()));
    if (prod) return { type: 'product', result: prod };
  }
  if (/ddt/i.test(query) && DDT_DATA) {
    const ddtNum = query.match(/ddt\s*(n(umero)?\.?\s*)?(\d+)/i)?.[3];
    if (ddtNum) {
      const ddt = DDT_DATA.find(d => d.numero === ddtNum);
      if (ddt) return { type: 'ddt', result: ddt };
    }
  }
  if (/fornitore|supplier/i.test(query) && SUPPLIERS_DATA) {
    // Estende la logica di ricerca fornitori
    const forn = SUPPLIERS_DATA.find(f => query.toLowerCase().includes(f.ragioneSociale.toLowerCase()));
    if (forn) return { type: 'supplier', result: forn };
  }
  return null;
};

const DataViewPage: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; sources?: any[] }[]>([
    { role: 'model', text: SYD_INTRO_PROMPT }
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

  useEffect(() => () => mcpEventSourceRef.current?.close(), []);

  useEffect(() => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionApi) {
      setIsSpeechRecognitionSupported(true);
      const recognition: SpeechRecognition = new SpeechRecognitionApi();
      recognition.continuous = false;
      recognition.lang = 'it-IT';
      recognition.interimResults = false;
      recognition.onstart = () => { setIsListening(true); setError(null); };
      recognition.onresult = (event: SpeechRecognitionEvent) => { setInput(event.results[event.results.length - 1][0].transcript.trim()); };
      recognition.onerror = () => { setError("Errore durante il riconoscimento vocale."); setIsListening(false); };
      recognition.onend = () => { setIsListening(false); };
      speechRecognitionRef.current = recognition;
    } else {
      setIsSpeechRecognitionSupported(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { setAttachedFile(e.target.files[0]); }
    e.target.value = '';
  };

  const handleRemoveFile = () => { setAttachedFile(null); };

  const handleListen = () => {
    if (!speechRecognitionRef.current || isLoading) return;
    if (isListening) { speechRecognitionRef.current.stop(); }
    else { speechRecognitionRef.current.start(); }
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const userMessageText = messageOverride || input.trim();
    if ((!userMessageText && !attachedFile) || isLoading) return;

    let userMessageToDisplay = userMessageText;
    if (attachedFile) { userMessageToDisplay += `\n\n📄 File allegato: ${attachedFile.name}`; }

    setMessages(prev => [...prev, { role: 'user', text: userMessageToDisplay }]);

    const fileToSend = attachedFile;
    setInput(''); setAttachedFile(null); setSelectableFiles(null); setIsLoading(true); setError(null);

    // Tentativo risposta dai dati interni
    const internal = matchInternalData(userMessageText);

    if (internal) {
      // Genera risposta da dati interni e aggiungi in chat
      let responseText = '';
      if (internal.type === 'product') {
        responseText = `Scheda prodotto: ${internal.result.nome}\nAllergeni: ${internal.result.allergeni || 'N/D'}`;
      } else if (internal.type === 'ddt') {
        responseText = `DDT N°${internal.result.numero}: prodotti inclusi: ${internal.result.prodotti.map((p: any) => p.nome).join(', ')}`;
      } else if (internal.type === 'supplier') {
        responseText = `Fornitore: ${internal.result.ragioneSociale}\nCertificazioni: ${internal.result.certificazioni?.join(', ') || 'N/D'}`;
      }
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      setIsLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      // Prompting potenziato
      let fullPromptText = `RUOLO: SYD AGENT AI, copilota 4-in-1.
CONTESTO: Hai accesso a questi dati interni:
- Prodotti: ${JSON.stringify(PRODUCTS_DATA).slice(0, 16000) || 'N/D'}
- DDT: ${JSON.stringify(DDT_DATA).slice(0, 12000) || 'N/D'}
- Fornitori: ${JSON.stringify(SUPPLIERS_DATA).slice(0, 8000) || 'N/D'}
ISTRUZIONI:
- Se puoi rispondere ai quesiti usando questi dati, fallo in modo sintetico e preciso.
- Se la domanda riguarda file recenti, integrali nella risposta.
- Se serve una ricerca online, usa la search Google e mostra le fonti consultate ai fini di massima trasparenza.
- Se va preparata una comunicazione, una email o un paragrafo commerciale, basala sui dati sopra e su quanto fornito.

Domanda utente: ${userMessageText}`;

      const contents = { parts: [{ text: fullPromptText }] };
      if (fileToSend) {
        const { mimeType, data: base64Data } = await fileToBase64(fileToSend);
        contents.parts.unshift({ inlineData: { mimeType, data: base64Data } });
      }

      const retrievalTool = {
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: DynamicRetrievalConfigMode.MODE_UNSPECIFIED,
          },
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        tools: [retrievalTool],
      });

      const responseText = response.text.trim();
      const groundingAttributions = response.candidates?.[0]?.groundingMetadata?.groundingAttributions;
      const sources = groundingAttributions
        ? groundingAttributions.map(att => ({ uri: att.web?.uri, title: att.web?.title }))
        : [];

      setMessages(prev => [...prev, { role: 'model', text: responseText, sources }]);
    } catch (e) {
      console.error("SYD AGENT error:", e);
      const errorMessage = e instanceof Error ? e.message : "Oops! Qualcosa è andato storto.";
      setError(errorMessage);
      setMessages(prev => [...prev, { role: 'model', text: `Errore: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelection = (fileName: string) => {
    if (mcpEventSourceRef.current) { mcpEventSourceRef.current.close(); }
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
        <p className="text-sm text-gray-500 mt-1">Copilota AI - dati aziendali, cloud e web, sempre attivo su Celerya.</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {messages.map((msg, index) =>
              <ChatMessage key={index} role={msg.role} text={msg.text} sources={msg.sources} />
            )}
            {isLoading && !selectableFiles && (
              <div className="flex justify-start">
                <div className="max-w-2xl px-4 py-3 rounded-xl shadow-sm bg-white text-gray-800 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <SpinnerIcon className="text-gray-500" />
                    <span className="text-sm italic">SYD sta pensando...</span>
                  </div>
                </div>
              </div>
            )}
            {selectableFiles && <McpFileSelector files={selectableFiles} onSelect={handleFileSelection} />}
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
              <button onClick={handleRemoveFile} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><XIcon className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="p-3 rounded-lg border bg-white hover:bg-gray-100 disabled:bg-gray-200"><PaperclipIcon className="w-5 h-5 text-gray-600" /></button>
            <button onClick={handleListen} disabled={isLoading || !isSpeechRecognitionSupported} className={`p-3 rounded-lg border transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'} disabled:bg-gray-200`}><MicrophoneIcon className="w-5 h-5" /></button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Chiedi qualsiasi cosa: dati Celerya, file o web... (⌘+Enter)" rows={3} className="w-full flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-lime-500" disabled={isLoading} />
            <button onClick={() => handleSendMessage()} disabled={isLoading || (!input.trim() && !attachedFile)} className="p-3 rounded-lg bg-lime-600 text-white hover:bg-lime-700 disabled:bg-gray-400"><SendIcon className="w-5 h-5" /></button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DataViewPage;
