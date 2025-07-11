// IMPORTAZIONI AGGIORNATE
import { signOut } from 'firebase/auth';
import { auth } from '../src/firebase';
import { User } from 'firebase/auth';
import { loadCustomers, addCustomer } from "../src/db";
import React, { useEffect, useState } from "react";

// Icone dalla libreria LUCIDE
import { LayoutDashboard, ShieldAlert, Bot, Factory, Settings, ScrollText, LogOut } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  user: User | null;
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
    <span className="mr-4 w-5 h-5">{icon}</span>
    {label}
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, user }) => {
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [newCustomerName, setNewCustomerName] = useState("");

  useEffect(() => {
    if (user) {
      loadCustomers(user.uid)
        .then(setCustomers)
        .catch(console.error);
    } else {
      setCustomers([]);
    }
  }, [user]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !user) return;
    try {
      const newCustomer = await addCustomer(newCustomerName, user.uid);
      setCustomers(prev => [...prev, newCustomer]);
      setNewCustomerName("");
    } catch (error) {
      console.error("Errore nell'aggiungere il cliente:", error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  };

  const navItems = [
    { id: "Dashboard",       label: "Dashboard",        icon: <LayoutDashboard size={20} /> },
    { id: "Cruscotto Alert", label: "Cruscotto Alert",  icon: <ShieldAlert size={20} /> },
    { id: "SYD AGENT",       label: "SYD AGENT",        icon: <Bot size={20} /> },
    { id: "Lista Fornitori", label: "Lista Fornitori",  icon: <Factory size={20} /> },
    { id: "Impostazioni",    label: "Impostazioni",     icon: <Settings size={20} /> },
    { id: "Changelog",       label: "Changelog",        icon: <ScrollText size={20} /> },
  ];

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col p-4 h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Celerya SYD
        </h1>
        {user && <p className="text-xs text-lime-300 truncate mt-1" title={user.email || ''}>{user.email}</p>}
      </div>

      <nav className="flex-1">
        <ul>
          <form onSubmit={handleAddCustomer} className="px-2 mb-4">
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

      {user && (
        <div className="mt-auto pt-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 rounded-lg text-red-400 hover:bg-red-500 hover:text-white transition-colors"
          >
            <span className="mr-4 w-5 h-5"><LogOut size={20} /></span>
            <span className="font-semibold">Esci</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
