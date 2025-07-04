
import React from 'react';
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { SettingsPage } from './components/SettingsPage';
import DataViewPage from './components/DataViewPage';
import DashboardPage from './components/DashboardPage';
import SuppliersListPage from './components/SuppliersListPage';
import DocumentViewer from './components/DocumentViewer';
import { ResourceViewerPage } from './components/ResourceViewerPage';
import DDTViewerPage from './components/DDTViewerPage';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import type { Product, Alert, Section, AnalyzedTransportDocument, Customer, AllSuppliersData } from './types';
import { getCustomSchema, generateAlertsFromSchema } from './constants';
import AlertsDashboardPage from './components/AlertsDashboardPage';


const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('Dashboard');
  const [viewerDoc, setViewerDoc] = useState<{product: Product, alerts: Alert[], schema: Section[]} | null>(null);
  const [resourceToView, setResourceToView] = useState<Product | null>(null);
  const [ddtToView, setDdtToView] = useState<AnalyzedTransportDocument | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // --- Data Migration for existing users ---
    const customersData = localStorage.getItem('celerya_customers');
    const suppliersDataStr = localStorage.getItem('celerya_suppliers_data');
    if (!customersData && suppliersDataStr) {
      try {
        const suppliersData = JSON.parse(suppliersDataStr);
        // Check if it's the old flat structure by looking for a 'name' property on a supposed supplier
        const firstKey = Object.keys(suppliersData)[0];
        if (firstKey && suppliersData[firstKey] && suppliersData[firstKey].name) {
          console.log("Migrating old data structure to new customer-based structure...");
          
          const defaultCustomer: Customer[] = [{ id: 'default-customer', name: 'Clienti', slug: 'clienti' }];
          const newNestedData: AllSuppliersData = {
            'clienti': {
              suppliers: suppliersData
            }
          };

          localStorage.setItem('celerya_customers', JSON.stringify(defaultCustomer));
          localStorage.setItem('celerya_suppliers_data', JSON.stringify(newNestedData));
          console.log("Data migration complete.");
        }
      } catch (e) {
        console.error("Failed to migrate old data:", e);
      }
    }
    // --- End of Data Migration ---


    const params = new URLSearchParams(window.location.search);
    const resourceId = params.get('resource_id');
    const supplierSlug = params.get('supplier_slug');
    const pdfId = params.get('pdf_id');
    const ddtId = params.get('ddt_id');

    if (resourceId) {
        try {
            const allData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
            let foundDoc: Product | null = null;
            
            // Iterate over all customers and their suppliers
            for (const customerKey in allData) {
              const customerData = allData[customerKey];
              // Add defensive check to prevent crashes on corrupted/incomplete data
              if (customerData && customerData.suppliers) {
                for (const supplierKey in customerData.suppliers) {
                  const supplier = customerData.suppliers[supplierKey];
                   if (supplier && supplier.pdfs) {
                      const doc = Object.values(supplier.pdfs).find((p: any) => p.id === resourceId);
                      if (doc) {
                          foundDoc = doc as Product;
                          break;
                      }
                  }
                }
              }
              if(foundDoc) break;
            }

            if (foundDoc) {
                setResourceToView(foundDoc);
            }
        } catch (e) {
            console.error("Failed to load resource:", e);
        } finally {
            setIsInitializing(false);
        }
        return;
    }
    
    if (supplierSlug && ddtId) {
         try {
            const allData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
            let ddtData: AnalyzedTransportDocument | null = null;

            for (const customerKey in allData) {
                const supplier = allData[customerKey]?.suppliers?.[supplierSlug];
                if (supplier?.ddts?.[ddtId]) {
                    ddtData = supplier.ddts[ddtId];
                    break;
                }
            }

            if (ddtData) {
                setDdtToView(ddtData);
            }
        } catch(e) {
            console.error("Failed to load DDT for viewer:", e);
        } finally {
            setIsInitializing(false);
        }
        return;
    }

    // This logic seems deprecated or for a different flow. Keep it for now.
    if (supplierSlug && pdfId) {
      try {
        const allData: AllSuppliersData = JSON.parse(localStorage.getItem('celerya_suppliers_data') || '{}');
        let pdfData: Product | null = null;
        for (const customerKey in allData) {
            const supplier = allData[customerKey]?.suppliers?.[supplierSlug];
            if (supplier?.pdfs?.[pdfId]) {
                pdfData = supplier.pdfs[pdfId];
                break;
            }
        }
        
        if (pdfData) {
          const schema = getCustomSchema();
          const alerts = generateAlertsFromSchema(pdfData, schema);
          setViewerDoc({ product: pdfData, alerts: alerts, schema: schema });
          
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      } catch(e) {
        console.error("Failed to load document for viewer:", e);
      }
    }
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <SpinnerIcon className="w-12 h-12 text-slate-500" />
      </div>
    );
  }

  if (resourceToView) {
    return <ResourceViewerPage product={resourceToView} />;
  }

  if (ddtToView) {
    return <DDTViewerPage ddt={ddtToView} />;
  }
  
  if (viewerDoc) {
    return <DocumentViewer product={viewerDoc.product} alerts={viewerDoc.alerts} schema={viewerDoc.schema} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 overflow-y-auto">
        {activePage === 'Dashboard' && <DashboardPage />}
        {activePage === 'Cruscotto Alert' && <AlertsDashboardPage />}
        {activePage === 'SYD AGENT' && <DataViewPage />}
        {activePage === 'Lista Fornitori' && <SuppliersListPage />}
        {activePage === 'Impostazioni' && <SettingsPage />}
        {/* Other pages can be rendered here based on activePage state */}
      </main>
    </div>
  );
};

export default App;