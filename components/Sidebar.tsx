
import React from 'react';
import { DashboardIcon } from './icons/DashboardIcon';
import { TableIcon } from './icons/TableIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ChangelogIcon } from './icons/ChangelogIcon';
import { FactoryIcon } from './icons/FactoryIcon';
import { ShieldAlertIcon } from './icons/ShieldAlertIcon';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <li
      className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-lime-500 text-slate-900 font-semibold'
          : 'text-gray-300 hover:bg-slate-700'
      }`}
      onClick={onClick}
    >
      <span className="mr-4">{icon}</span>
      {label}
    </li>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'Cruscotto Alert', label: 'Cruscotto Alert', icon: <ShieldAlertIcon /> },
    { id: 'SYD AGENT', label: 'SYD AGENT', icon: <TableIcon /> },
    { id: 'Lista Fornitori', label: 'Lista Fornitori', icon: <FactoryIcon /> },
    { id: 'Impostazioni', label: 'Impostazioni', icon: <SettingsIcon /> },
    { id: 'Changelog', label: 'Changelog', icon: <ChangelogIcon /> },
  ];

  return (
    <div className="w-64 bg-slate-800 text-white flex flex-col p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Celerya Spec-</h1>
        <h1 className="text-xl font-bold text-white -mt-1">Extractor</h1>
      </div>
      <nav>
        <ul>
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
    </div>
  );
};

export default Sidebar;