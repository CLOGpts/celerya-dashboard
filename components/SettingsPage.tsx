
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getCustomSchema, saveCustomSchema, getDefaultSchema } from '../constants';
import type { Section, Field } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { GoogleDriveIcon } from './icons/GoogleDriveIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { LinkIcon } from './icons/LinkIcon';

const GDRIVE_CONNECTED_KEY = 'celerya_gdrive_connected';
const GDRIVE_USER_KEY = 'celerya_gdrive_user';
const GDRIVE_FOLDER_URL_KEY = 'celerya_gdrive_folder_url';
const GDRIVE_ACCESS_TOKEN_KEY = 'celerya_gdrive_access_token';
const MCP_CONNECTED_KEY = 'celerya_mcp_connected';

const CLIENT_ID = '325094546058-q2blaibdirt3kr3ehg4htub7uvr9nd70.apps.googleusercontent.com';
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
let gapiReady = false;
let gsiReady = false;


interface CustomCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-600">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-500 cursor-pointer"
    />
    <span>{label}</span>
  </label>
);

interface FieldRowProps {
  field: Field;
  onFieldChange: (fieldName: string, key: keyof Omit<Field, 'name'>, value: boolean) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ field, onFieldChange }) => {
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-200 last:border-b-0">
      <span className="text-gray-700">{field.name}</span>
      <div className="flex items-center space-x-6">
        <CustomCheckbox
          label="Obbligatorio"
          checked={field.mandatory}
          onChange={(e) => onFieldChange(field.name, 'mandatory', e.target.checked)}
        />
        <CustomCheckbox
          label="Critico"
          checked={field.critical}
          onChange={(e) => onFieldChange(field.name, 'critical', e.target.checked)}
        />
        <CustomCheckbox
          label="Attivo"
          checked={field.active}
          onChange={(e) => onFieldChange(field.name, 'active', e.target.checked)}
        />
      </div>
    </div>
  );
};


export const SettingsPage: React.FC = () => {
  const [schema, setSchema] = useState<Section[]>(() => getCustomSchema());
  const [activeTab, setActiveTab] = useState('integrazioni');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [driveUser, setDriveUser] = useState<string | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');
  const [isMcpConnected, setIsMcpConnected] = useState(false);
  const tokenClientRef = useRef<any>(null);


  const handleGapiLoad = useCallback(() => {
    if (gapiReady) return;
    window.gapi.load('client', () => {
      window.gapi.client.load('drive', 'v3', () => {
        gapiReady = true;
      });
    });
  }, []);

  const handleGsiLoad = useCallback(() => {
    if (gsiReady) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPES,
      callback: (tokenResponse: any) => {
        setIsDriveConnecting(false);
        if (tokenResponse.error) {
          console.error("GSI Error:", tokenResponse.error);
          return;
        }

        localStorage.setItem(GDRIVE_ACCESS_TOKEN_KEY, tokenResponse.access_token);
        window.gapi.client.setToken(tokenResponse);

        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
        })
        .then(res => res.json())
        .then(userInfo => {
          const userEmail = userInfo.email || 'Utente Google';
          localStorage.setItem(GDRIVE_USER_KEY, userEmail);
          setDriveUser(userEmail);
        })
        .catch(err => console.error("Failed to fetch user info", err))
        .finally(() => {
          localStorage.setItem(GDRIVE_CONNECTED_KEY, 'true');
          setIsDriveConnected(true);
        });
      },
    });
    gsiReady = true;
  }, []);

  useEffect(() => {
    // Poll for the Google scripts loaded in index.html
    const scriptsReadyCheck = setInterval(() => {
      if (window.gapi && !gapiReady) {
        handleGapiLoad();
      }
      if (window.google && !gsiReady) {
        handleGsiLoad();
      }
      if (gapiReady && gsiReady) {
        clearInterval(scriptsReadyCheck);
      }
    }, 100);

    return () => clearInterval(scriptsReadyCheck);
  }, [handleGapiLoad, handleGsiLoad]);


  useEffect(() => {
    const gdriveConnected = localStorage.getItem(GDRIVE_CONNECTED_KEY) === 'true';
    if (gdriveConnected) {
        setIsDriveConnected(true);
        setDriveUser(localStorage.getItem(GDRIVE_USER_KEY));
        setDriveFolderUrl(localStorage.getItem(GDRIVE_FOLDER_URL_KEY) || '');
        const token = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
        if (token) {
            const interval = setInterval(() => {
                if (gapiReady) {
                    window.gapi.client.setToken({ access_token: token });
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    const mcpConnected = localStorage.getItem(MCP_CONNECTED_KEY) === 'true';
    setIsMcpConnected(mcpConnected);
  }, []);

  useEffect(() => {
    saveCustomSchema(schema);
  }, [schema]);

  const handleFieldChange = useCallback((sectionId: string, fieldName: string, key: keyof Omit<Field, 'name'>, value: boolean) => {
    setSchema(prevSchema =>
      prevSchema.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            fields: section.fields.map(field =>
              field.name === fieldName ? { ...field, [key]: value } : field
            ),
          };
        }
        return section;
      })
    );
  }, []);

  const handleDownloadSchema = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(schema, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "celerya-schema-settings.json";
    link.click();
  };

  const handleResetSchema = () => {
    if(window.confirm("Sei sicuro di voler ripristinare le impostazioni predefinite? Le tue personalizzazioni andranno perse.")) {
      setSchema(getDefaultSchema());
    }
  };
  
  const handleConnectDrive = () => {
    if (!gapiReady || !gsiReady) {
      alert("Le librerie di Google non sono ancora state caricate. Riprova tra un momento.");
      return;
    }
    setIsDriveConnecting(true);
    tokenClientRef.current?.requestAccessToken({ prompt: 'consent' });
  };

  const handleDisconnectDrive = () => {
    const token = localStorage.getItem(GDRIVE_ACCESS_TOKEN_KEY);
    if (token && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
    localStorage.removeItem(GDRIVE_CONNECTED_KEY);
    localStorage.removeItem(GDRIVE_USER_KEY);
    localStorage.removeItem(GDRIVE_FOLDER_URL_KEY);
    localStorage.removeItem(GDRIVE_ACCESS_TOKEN_KEY);
    setIsDriveConnected(false);
    setDriveUser(null);
    setDriveFolderUrl('');
  };

  const handleFolderUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setDriveFolderUrl(url);
    localStorage.setItem(GDRIVE_FOLDER_URL_KEY, url);
  };

  const handleConnectMcp = () => {
    alert("Simulazione dell'autorizzazione all'accesso alla cartella condivisa tramite MCP.");
    localStorage.setItem(MCP_CONNECTED_KEY, 'true');
    setIsMcpConnected(true);
  };

  const handleDisconnectMcp = () => {
    localStorage.setItem(MCP_CONNECTED_KEY, 'false');
    setIsMcpConnected(false);
  };


  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800">Impostazioni</h1>

      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'schema'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Schema "Standard Celerya"
          </button>
          <button
            onClick={() => setActiveTab('alert')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'alert'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Motore di Alert
          </button>
           <button
            onClick={() => setActiveTab('integrazioni')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'integrazioni'
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Integrazioni
          </button>
        </nav>
      </div>

      {activeTab === 'schema' && (
        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex flex-wrap justify-between items-center border-b border-gray-200 pb-4 mb-4 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Personalizzazione Schema</h2>
              <p className="mt-1 text-sm text-gray-500">
                Attiva/disattiva campi e definisci quali sono obbligatori o critici per l'estrazione.
              </p>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={handleResetSchema} className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors">
                <span>Ripristina Standard</span>
              </button>
              <button onClick={handleDownloadSchema} className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors">
                <DownloadIcon />
                <span>Scarica lo Standard</span>
              </button>
            </div>
          </div>

          <div className="mt-2">
            {schema.map(section => (
              <div key={section.id} className="mb-8">
                <h3 className="text-md font-semibold text-lime-700 uppercase tracking-wide">{section.title}</h3>
                <div className="mt-2 flex flex-col">
                  {section.fields.map(field => (
                    <FieldRow 
                      key={field.name} 
                      field={field} 
                      onFieldChange={(fieldName, key, value) => handleFieldChange(section.id, fieldName, key, value)} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'alert' && (
        <div className="mt-8 bg-white p-6 rounded-xl shadow-sm">
           <h2 className="text-xl font-semibold text-gray-800">Configurazione Motore di Alert</h2>
           <p className="mt-1 text-sm text-gray-500">
            La configurazione degli alert (obbligatorio/critico) viene gestita nella scheda "Schema Standard Celerya". (UI aggiuntiva non implementata)
           </p>
        </div>
      )}
      {activeTab === 'integrazioni' && (
        <div className="mt-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-start gap-5">
                     <GoogleDriveIcon className="w-10 h-10 mt-1 flex-shrink-0" />
                    <div className='flex-grow'>
                        <h2 className="text-xl font-semibold text-gray-800">Integrazione Google Drive</h2>
                        <p className="mt-1 text-sm text-gray-500 max-w-3xl">
                           Collega il tuo account Google Drive per permettere a SYD AGENT di cercare e analizzare file direttamente dal tuo cloud.
                        </p>
                         <div className="mt-4">
                            {isDriveConnected ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-100 px-4 py-2 rounded-lg text-sm">
                                            <CheckCircleIcon className="w-5 h-5" />
                                            <span>Connesso come {driveUser}</span>
                                        </div>
                                        <button
                                            onClick={handleDisconnectDrive}
                                            className="text-sm text-red-600 hover:text-red-800 font-semibold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Disconnetti
                                        </button>
                                    </div>
                                    <div className="max-w-xl">
                                      <label htmlFor="drive-folder-url" className="block text-sm font-medium text-gray-700 mb-1">URL Cartella Google Drive</label>
                                      <input
                                          type="text"
                                          id="drive-folder-url"
                                          value={driveFolderUrl}
                                          onChange={handleFolderUrlChange}
                                          placeholder="https://drive.google.com/drive/folders/..."
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-lime-500 focus:border-lime-500 text-sm"
                                      />
                                       <p className="text-xs text-gray-500 mt-1">
                                          SYD AGENT leggerà i file solo da questa cartella.
                                      </p>
                                  </div>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectDrive}
                                    disabled={isDriveConnecting}
                                    className="px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-3 text-base disabled:bg-slate-500"
                                >
                                    {isDriveConnecting ? <SpinnerIcon /> : <GoogleDriveIcon className="w-5 h-5" />}
                                    {isDriveConnecting ? 'Connessione...' : 'Connetti a Google Drive'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 transition-all duration-300 hover:shadow-md">
                <div className="flex items-start gap-5">
                    <LinkIcon className="w-10 h-10 mt-1 flex-shrink-0 text-slate-500" />
                    <div className='flex-grow'>
                        <h2 className="text-xl font-semibold text-gray-800">Cartella Condivisa MCP</h2>
                        <p className="mt-1 text-sm text-gray-500 max-w-3xl">
                           Interagisci con i file tramite il Model Context Protocol.
                        </p>
                         <div className="mt-4">
                            {isMcpConnected ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-green-700 font-semibold bg-green-100 px-4 py-2 rounded-lg text-sm">
                                        <CheckCircleIcon className="w-5 h-5" />
                                        <span>Accesso Autorizzato</span>
                                    </div>
                                    <button
                                        onClick={handleDisconnectMcp}
                                        className="text-sm text-red-600 hover:text-red-800 font-semibold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        Disconnetti
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectMcp}
                                    className="px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-3 text-base"
                                >
                                    <LinkIcon className="w-5 h-5" />
                                    Connetti a MCP
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
