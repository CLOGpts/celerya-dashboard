import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/firebase';
import { LoginPage } from './components/LoginPage';
import { RegistrationPage } from './components/RegistrationPage'; // <-- NUOVO IMPORT
import Sidebar from './components/Sidebar';
import { SettingsPage } from './components/SettingsPage';
import DashboardPage from './components/DashboardPage';
import AlertsDashboardPage from './components/AlertsDashboardPage';
import DataViewPage from './components/DataViewPage';
import SuppliersListPage from './components/SuppliersListPage';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import type { Customer } from './types';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('Dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login'); // <-- IL NOSTRO INTERRUTTORE

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

  // Se l'utente non è loggato, usiamo l'interruttore per decidere cosa mostrare
  if (!currentUser) {
    if (authView === 'login') {
      return <LoginPage onSwitchView={() => setAuthView('register')} />;
    } else {
      return <RegistrationPage onSwitchView={() => setAuthView('login')} />;
    }
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
