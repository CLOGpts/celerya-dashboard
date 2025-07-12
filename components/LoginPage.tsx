import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../src/firebase';

interface LoginPageProps {
  onSwitchView: () => void;
}

export const LoginPage = ({ onSwitchView }: LoginPageProps): JSX.Element => {
  const [view, setView] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (firebaseError: any) {
      setError("Credenziali non valide. Riprova.");
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Per favore, inserisci un indirizzo email.");
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Email di reset inviata! Controlla la tua casella di posta (anche lo spam).");
    } catch (firebaseError: any) {
      setError("Indirizzo email non trovato o non valido.");
    }
    setIsLoading(false);
  };
  
  // --- VISTA PER IL RECUPERO PASSWORD ---
  if (view === 'reset') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-gray-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">Recupera Password</h1>
            <p className="text-gray-500 mt-2">Inserisci la tua email per ricevere un link di reset.</p>
          </div>
          <form className="space-y-6" onSubmit={handlePasswordReset}>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">Indirizzo Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="tua@email.com"/>
              </div>
            </div>
            {error && <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            {message && <p className="text-sm text-center text-green-600 bg-green-50 p-3 rounded-lg">{message}</p>}
            <div>
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
                {isLoading ? 'Invio in corso...' : 'Invia link di reset'}
              </button>
            </div>
          </form>
          <p className="text-center text-sm text-gray-600">
            <button type="button" onClick={() => { setView('login'); setError(null); setMessage(null); }} className="font-medium text-blue-600 hover:underline focus:outline-none">
              Torna al Login
            </button>
          </p>
        </div>
      </div>
    );
  }

  // --- VISTA PRINCIPALE DI LOGIN (CON I CAMPI CORRETTI) ---
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Celerya</h1>
          <p className="text-gray-500 mt-2">Accedi alla tua dashboard</p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          {/* Campo Email */}
          <div>
            <label htmlFor="login-email" className="text-sm font-medium text-gray-700 block mb-2">Indirizzo Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="tua@email.com"/>
            </div>
          </div>
          {/* Campo Password */}
          <div>
            <label htmlFor="login-password" className="text-sm font-medium text-gray-700 block mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••"/>
            </div>
            <div className="text-right mt-2">
              <button type="button" onClick={() => { setView('reset'); setError(null); setMessage(null); }} className="text-sm text-blue-600 hover:underline focus:outline-none">
                Password dimenticata?
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400">
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>
        </form>
        <p className="text-center text-sm text-gray-600">
          Non hai un account?{' '}
          <button type="button" onClick={onSwitchView} className="font-medium text-blue-600 hover:underline focus:outline-none">
            Registrati ora
          </button>
        </p>
      </div>
    </div>
  );
};
