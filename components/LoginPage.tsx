import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../src/firebase'; // Importiamo l'istanza di auth

export const LoginPage = (): JSX.Element => {
  // Stati per gestire l'input dell'utente e gli errori
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Funzione che viene eseguita al momento del login
  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Impedisce alla pagina di ricaricarsi
    setError(null);
    setIsLoading(true);

    try {
      // Usiamo la funzione di Firebase per tentare il login
      await signInWithEmailAndPassword(auth, email, password);
      // Se il login ha successo, il componente App.tsx ci porterà automaticamente alla dashboard
    } catch (firebaseError: any) {
      // Se Firebase restituisce un errore, lo mostriamo all'utente
      setError("Credenziali non valide. Controlla email e password e riprova.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Celerya</h1>
          <p className="text-gray-500 mt-2">Accedi alla tua dashboard</p>
        </div>

        {/* Il form ora è collegato alla nostra funzione handleLogin */}
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">
              Indirizzo Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email} // Il valore dell'input è controllato dal nostro stato
                onChange={(e) => setEmail(e.target.value)} // Aggiorniamo lo stato a ogni digitazione
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="tu@esempio.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password} // Il valore dell'input è controllato dal nostro stato
                onChange={(e) => setPassword(e.target.value)} // Aggiorniamo lo stato a ogni digitazione
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="••••••••"
              />
            </div>
            <div className="text-right mt-2">
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Password dimenticata?
              </a>
            </div>
          </div>

          {/* Mostra il messaggio di errore se presente */}
          {error && (
            <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading} // Il bottone si disabilita durante il caricamento
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="mx-4 text-sm text-gray-500">Oppure</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        
        <p className="text-center text-sm text-gray-600">
          Non hai un account?{' '}
          <a href="#" className="font-medium text-blue-600 hover:underline">
            Registrati ora
          </a>
        </p>
      </div>
    </div>
  );
};
