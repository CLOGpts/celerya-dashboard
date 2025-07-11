// 1. IMPORTAZIONI PULITE E FOCALIZZATE
// Sono state rimosse tutte le importazioni non necessarie, inclusa quella di 'testFirestore'.
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/firebase'; // Corretto per App.tsx nella root

// Componenti principali dell'applicazione
import { LoginPage } from "./src/LoginPage";
import Sidebar from './components/Sidebar';
import { SettingsPage } from './components/SettingsPage';
import DashboardPage from './components/DashboardPage';
import AlertsDashboardPage from './components/AlertsDashboardPage';
import DataViewPage from './components/DataViewPage';
import SuppliersListPage from './components/SuppliersListPage';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

// Tipi (non usati direttamente qui, ma mantenuti per coerenza)
import type { Customer } from './types';

// ==================================================================

const App: React.FC = () => {
  // 2. STATO DEL COMPONENTE
  const [activePage, setActivePage] = useState<string>('Dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 3. GESTIONE DELL'AUTENTICAZIONE (CUORE DELL'APP)
  // Questo useEffect gestisce il cambiamento dello stato di login.
  // È l'unica logica che deve essere eseguita all'avvio.
  useEffect(() => {
    // onAuthStateChanged "ascolta" i cambiamenti di stato dell'utente (login, logout)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsInitializing(false);
    });

    // Funzione di pulizia: rimuove l'ascoltatore quando il componente viene distrutto
    // per evitare perdite di memoria.
    return () => unsubscribe();
  }, []); // L'array vuoto [] assicura che questo effetto venga eseguito solo una volta, all'avvio.

  // 4. GESTIONE DEL CARICAMENTO INIZIALE
  // Mostra uno spinner finché Firebase non ha finito di controllare lo stato di autenticazione.
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <SpinnerIcon className="w-12 h-12 text-slate-500" />
      </div>
    );
  }

  // 5. RENDER CONDIZIONALE: LOGIN O APP?
  // Se, dopo l'inizializzazione, non c'è un utente valido, mostra la pagina di Login.
  if (!currentUser) {
    return <LoginPage />;
  }

  // 6. RENDER DELL'APPLICAZIONE PRINCIPALE
  // Se l'utente è loggato, mostra l'interfaccia principale dell'applicazione.
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar activePage={activePage} setActivePage={setActivePage} user={currentUser} />
      <main className="flex-1 overflow-y-auto">
        {activePage === 'Dashboard' && <DashboardPage />}
        {activePage === 'Cruscotto Alert' && <AlertsDashboardPage />}
        {activePage === 'SYD AGENT' && <DataViewPage />}
        {activePage === 'Lista Fornitori' && <SuppliersListPage />}
        {activePage === 'Impostazioni' && <SettingsPage />}
      </main>
    </div>
  );
};

export default App;
