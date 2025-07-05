// src/components/Sidebar.tsx
import { loadCustomers, addCustomer, deleteCustomer, CustomerDoc } from "../src/db";
import React, { useEffect, useState } from "react";
import { DashboardIcon }    from "./icons/DashboardIcon";
import { TableIcon }        from "./icons/TableIcon";
import { SettingsIcon }     from "./icons/SettingsIcon";
import { ChangelogIcon }    from "./icons/ChangelogIcon";
import { FactoryIcon }      from "./icons/FactoryIcon";
import { ShieldAlertIcon }  from "./icons/ShieldAlertIcon";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <li
    className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
      isActive ? "bg-lime-500 text-slate-900 font-semibold" : "text-gray-300 hover:bg-slate-700"
    }`}
    onClick={onClick}
  >
    <span className="mr-4">{icon}</span>
    {label}
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  /* ------------------------------------------------------------------ */
  /* 1️⃣  Stato e fetch iniziale dei clienti (micro-step 1 D-1)          */
  /* ------------------------------------------------------------------ */
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");

  useEffect(() => {
    loadCustomers()
      .then(setCustomers)
      .catch(console.error);
  }, []);

  useEffect(() => {
    // puro debug per verificare che arrivino i dati
    console.log("Clienti caricati:", customers);
  }, [customers]);
  /* ------------------------------------------------------------------ */
  const handleAddCustomer = async (e: React.FormEvent) => {
  e.preventDefault(); // Impedisce alla pagina di ricaricarsi quando si invia il form
  if (!newCustomerName.trim()) return; // Non fa nulla se il nome è vuoto o contiene solo spazi

  try {
    // Chiama la funzione dal nostro file db.ts per salvare su Firestore
    const newCustomer = await addCustomer(newCustomerName);
    
    // Aggiorna la lista dei clienti all'istante, senza dover ricaricare la pagina
    setCustomers([...customers, newCustomer]);
    
    // Pulisce il campo di testo dopo l'aggiunta
    setNewCustomerName(""); 
  } catch (error) {
    console.error("Errore nell'aggiungere il cliente:", error);
  }
};


  /*  Nav statico già esistente  */
  const navItems = [
    { id: "Dashboard",       label: "Dashboard",        icon: <DashboardIcon /> },
    { id: "Cruscotto Alert", label: "Cruscotto Alert",  icon: <ShieldAlertIcon /> },
    { id: "SYD AGENT",       label: "SYD AGENT",        icon: <TableIcon /> },
    { id: "Lista Fornitori", label: "Lista Fornitori",  icon: <FactoryIcon /> },
    { id: "Impostazioni",    label: "Impostazioni",     icon: <SettingsIcon /> },
    { id: "Changelog",       label: "Changelog",        icon: <ChangelogIcon /> },
  ];

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Celerya SYD
        </h1>
      </div>

      {/* NAV PRINCIPALE */}
      <nav>
        <ul>
          {/* Form per nuovo cliente */}
<form onSubmit={handleAddCustomer} className="px-2 mt-4">
  <input
    type="text"
    value={newCustomerName}
    onChange={(e) => setNewCustomerName(e.target.value)}
    placeholder="Nuovo cliente..."
    className="w-full p-2 text-sm text-white bg-slate-700 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-400"
  />
  <button
    type="submit"
    className="w-full mt-2 p-2 text-sm font-bold text-slate-900 bg-lime-400 rounded-md hover:bg-lime-500 transition-colors"
  >
    Aggiungi
  </button>
</form>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activePage === item.id}
              onClick={() => setActivePage(item.id)}
            />
          ))}
        </ul>
      </nav>

      {/* (⚠️ Prossimi micro-step: render dei clienti, aggiungi-elimina, ecc.) */}
    </div>
  );
};

export default Sidebar;
