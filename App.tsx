// 1. IMPORTAZIONI PULITE E ORDINATE
// Abbiamo rimosso gli import duplicati e usato i percorsi corretti.
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/firebase'; // Corretto per App.tsx nella root
import { testFirestore } from './src/testFirestore';

// Componenti dell'applicazione
import { LoginPage } from "./src/LoginPage"; // Corretto per usare l'export nominato
import Sidebar from './components/Sidebar';
import { SettingsPage } from './components/SettingsPage';
import DashboardPage from './components/DashboardPage';
import AlertsDashboardPage from './components/AlertsDashboardPage';
import DataViewPage from './components/DataViewPage';
import SuppliersListPage from './components/SuppliersListPage';
import { SpinnerIcon } from './components/icons/SpinnerIcon';

// Tipi (lasciati per coerenza, anche se non usati direttamente in questo file)
import type { Product, Alert, Section, AnalyzedTransportDocument, Customer, AllSuppliersData } from './types';

// ==================================================================

const App: React.FC = () => {
  // 2. STATO DEL COMPONENTE
  // Lo stato è ben organizzato qui.
  const [activePage, setActivePage] = useState<string>('Dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // 3. GESTIONE DELL'AUTENTICAZIONE
  // Questo useEffect gestisce il cambiamento dello stato di login.
  // È il cuore del nostro sistema di autenticazione.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // 4. CHIAMATA A FIRESTORE SPOSTATA QUI
      // Se l'utente è loggato, allora e solo allora proviamo a testare Firestore.
      // Questo risolve gli errori 400 (Bad Request).
      if (user) {
        console.log("Utente autenticato, eseguo testFirestore...");
        testFirestore().catch(error => {
          console.error("Errore durante l'esecuzione di testFirestore:", error);
        });
      }
      
      setIsInitializing(false);
    });

    // Questa è la funzione di pulizia che viene eseguita quando il componente viene "smontato".
    return () => unsubscribe();
  }, []); // L'array vuoto [] assicura che questo effetto venga eseguito solo una volta.

  // 5. GESTIONE DEL CARICAMENTO INIZIALE
  // Mostra uno spinner mentre Firebase controlla se l'utente è già loggato.
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <SpinnerIcon className="w-12 h-12 text-slate-500" />
      </div>
    );
  }

  // 6. RENDER CONDIZIONALE: LOGIN O APP?
  // Se, dopo l'inizializzazione, non c'è un utente, mostriamo la pagina di Login.
  if (!currentUser) {
    return <LoginPage />;
  }

  // 7. RENDER DELL'APPLICAZIONE PRINCIPALE
  // Se l'utente è loggato, mostriamo la dashboard.
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
