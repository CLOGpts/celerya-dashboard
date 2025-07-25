import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

import { useAuth } from '../hooks/useAuth'; 
import { getAllUserData } from '@/lib/firestore';
import type { Supplier, SpeechRecognition, SpeechRecognitionEvent } from '../types';
import { SpinnerIcon, SendIcon, PaperclipIcon, MicrophoneIcon, TrashIcon } from '../components/icons';
import McpFileSelector from './McpFileSelector';


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

const SYD_INTRO_PROMPT =
  `Ciao! Sono SYD AGENT, il tuo assistente AI integrato.
La mia missione è essere il tuo copilota intelligente per i tuoi dati aziendali.
Chiedimi pure di analizzare fornitori, schede tecniche, DDT o di effettuare ricerche online. Sono qui per farti risparmiare tempo e darti risposte precise.`;

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

  const { user, isLoading: isAuthLoading } = useAuth();
  const [userData, setUserData] = useState<Supplier[] | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, selectableFiles]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      setIsDataLoading(true);
      setError(null);
      const fetchData = async () => {
        try {
          const data = await getAllUserData(user.uid);
          setUserData(data);
        } catch (err) {
          console.error("Errore nel caricamento dei dati utente:", err);
          setError("Non è stato possibile caricare i dati dal database.");
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    } else if (!isAuthLoading) {
        setIsDataLoading(false);
    }
  }, [user, isAuthLoading]);

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

    if (!user) {
        setError("Devi effettuare il login per usare l'assistente.");
        setMessages(prev => [...prev, { role: 'model', text: `Per favore, effettua il login per continuare.` }]);
        return;
    }

    let userMessageToDisplay = userMessageText;
    if (attachedFile) { userMessageToDisplay += `\n\n📄 File allegato: ${attachedFile.name}`; }

    setMessages(prev => [...prev, { role: 'user', text: userMessageToDisplay }]);

    const fileToSend = attachedFile;
    setInput(''); setAttachedFile(null); setSelectableFiles(null); setIsLoading(true); setError(null);
    
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const ai = new GoogleGenerativeAI(apiKey);

        // --- MODIFICA CHIAVE: Corretto il nome dello strumento di ricerca ---
        const tools: any[] = [{ 
            google_search_retrieval: {}
        }];

        const model = ai.getGenerativeModel({
            model: "gemini-1.5-flash-latest",
            systemInstruction: `RUOLO: Sei SYD AGENT AI, un copilota intelligente per la piattaforma Celerya.
CONTESTO: Stai assistendo l'utente con ID '${user.uid}'. Hai accesso in tempo reale a tutti i suoi dati salvati nel database.
ISTRUZIONI:
- Usa i dati forniti nel CONTESTO DATI UTENTE come fonte primaria e veritiera per rispondere. Non inventare informazioni non presenti.
- Se la domanda richiede informazioni non presenti nei dati, puoi usare lo strumento 'google_search_retrieval'. Cita sempre le fonti.
- Sii conciso, professionale e vai dritto al punto.

CONTESTO DATI UTENTE:
${userData ? JSON.stringify(userData, null, 2) : 'Nessun dato disponibile per questo utente.'}
`,
        });

        const messageParts = [{ text: userMessageText }];
        if (fileToSend) {
            const { mimeType, data } = await fileToBase64(fileToSend);
            messageParts.push({ inlineData: { mimeType, data } });
        }
        
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: messageParts }],
            tools: tools,
        });
        
        const response = result.response;
        const responseText = response.text();
        const groundingAttributions = response.candidates?.[0]?.groundingMetadata?.groundingAttributions;

        const sources = groundingAttributions
            ? groundingAttributions.map((att: any) => ({ uri: att.web?.uri, title: att.web?.title })).filter((s: any) => s.uri)
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
    setSelectableFiles(null);
    handleSendMessage(`Analizza il file: "${fileName}"`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isUIBlocked = isLoading || isAuthLoading || isDataLoading;

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
            {(isAuthLoading || isDataLoading) && (
                 <div className="flex justify-center text-sm text-gray-500">Caricamento dati utente...</div>
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
              <button onClick={handleRemoveFile} className="p-1 rounded-full text-gray-500 hover:bg-gray-200"><TrashIcon className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={isUIBlocked}/>
            <button onClick={() => fileInputRef.current?.click()} disabled={isUIBlocked} className="p-3 rounded-lg border bg-white hover:bg-gray-100 disabled:bg-gray-200"><PaperclipIcon className="w-5 h-5 text-gray-600" /></button>
            <button onClick={handleListen} disabled={isUIBlocked || !isSpeechRecognitionSupported} className={`p-3 rounded-lg border transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'} disabled:bg-gray-200`}><MicrophoneIcon className="w-5 h-5" /></button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={isUIBlocked ? "Attendere caricamento dati..." : "Chiedi qualsiasi cosa... (⌘+Enter)"} rows={3} className="w-full flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-lime-500" disabled={isUIBlocked} />
            <button onClick={() => handleSendMessage()} disabled={isUIBlocked || (!input.trim() && !attachedFile)} className="p-3 rounded-lg bg-lime-600 text-white hover:bg-lime-700 disabled:bg-gray-400"><SendIcon className="w-5 h-5" /></button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DataViewPage;
