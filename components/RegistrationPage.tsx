import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // <-- NUOVI IMPORT
import { doc, setDoc } from 'firebase/firestore'; // <-- NUOVI IMPORT
import { auth, db } from '../src/firebase'; // <-- IMPORTIAMO ANCHE IL DATABASE (db)

interface RegistrationPageProps {
  onSwitchView: () => void;
}

export const RegistrationPage = ({ onSwitchView }: RegistrationPageProps): JSX.Element => {
  // Stati per gestire gli input e gli errori
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // La funzione che gestisce la creazione dell'utente
  const handleRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password.length < 6) {
        setError("La password deve essere di almeno 6 caratteri.");
        setIsLoading(false);
        return;
    }

    try {
      // 1. Creiamo l'utente nel sistema di autenticazione di Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Aggiorniamo il profilo dell'utente con il suo nome
      await updateProfile(user, { displayName: name });

      // 3. (FACOLTATIVO MA CONSIGLIATO) Creiamo un documento per l'utente in Firestore
      // Questo è utile per salvare in futuro preferenze o altre informazioni legate all'utente
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: name,
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      // Se tutto va a buon fine, il componente App.tsx rileverà il nuovo utente e lo porterà alla dashboard.
      // Non dobbiamo fare altro qui.

    } catch (firebaseError: any) {
      // Gestiamo gli errori più comuni
      if (firebaseError.code === 'auth/email-already-in-use') {
        setError("Questo indirizzo email è già stato registrato.");
      } else {
        setError("Si è verificato un errore durante la registrazione. Riprova.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Crea il tuo Account</h1>
          <p className="text-gray-500 mt-2">Inizia a semplificare il tuo business con Celerya.</p>
        </div>

        {/* Il form ora è collegato alla nostra funzione handleRegistration */}
        <form className="space-y-6" onSubmit={handleRegistration}>
          <div>
            <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">Nome Completo</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mario Rossi" />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-2">Indirizzo Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="tua@email.com" />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">Password (min. 6 caratteri)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
            </div>
          </div>
          {error && <p className="text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
              {isLoading ? 'Creazione account...' : 'Registrati'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600">
          Hai già un account?{' '}
          <button type="button" onClick={onSwitchView} className="font-medium text-blue-600 hover:underline focus:outline-none">
            Accedi
          </button>
        </p>
      </div>
    </div>
  );
};
