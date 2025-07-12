// 1. IMPORTAZIONI PULITE E FOCALIZZATE
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

// =================================================================================
// CORREZIONE DEFINITIVA: 
// Ho corretto tutti i percorsi per riflettere la posizione di App.tsx
// nella cartella principale del progetto.
// =================================================================================
import { auth } from './src/firebase';
import { LoginPage } from './components/LoginPage';
import Sidebar from './components/Sidebar';
import { SettingsPage } from './components/SettingsPage';
import DashboardPage from './components/DashboardPage';
import AlertsDashboardPage from './components/AlertsDashboardPage';
import DataViewPage from './components/DataViewPage';
import SuppliersListPage from './components/SuppliersListPage';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import type { Customer } from './types';

// ==================================================================

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('Dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <SpinnerIcon className="w-12 h-12 text-slate-500" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoginPage />
      </div>
    );
  }

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
