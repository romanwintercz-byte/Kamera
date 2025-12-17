import React, { useState, useEffect } from 'react';
import { DocumentRecord, AppView, RowStatus, AnnualTargets } from './types';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { DetailView } from './components/DetailView';
import { Database, Plus } from 'lucide-react';

const STORAGE_KEY = 'pdf-db-documents';
const TARGETS_KEY = 'pdf-db-targets';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [targets, setTargets] = useState<AnnualTargets>({});
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Load documents
  useEffect(() => {
    const storedDocs = localStorage.getItem(STORAGE_KEY);
    if (storedDocs) {
      try {
        setDocuments(JSON.parse(storedDocs));
      } catch (e) {
        console.error("Failed to parse stored documents", e);
      }
    }
    
    // Load targets
    const storedTargets = localStorage.getItem(TARGETS_KEY);
    if (storedTargets) {
      try {
        setTargets(JSON.parse(storedTargets));
      } catch (e) {
        console.error("Failed to parse stored targets", e);
      }
    }
  }, []);

  // Save documents
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  // Save targets
  useEffect(() => {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  }, [targets]);

  const handleScanComplete = (newDoc: DocumentRecord) => {
    setDocuments(prev => [newDoc, ...prev]);
    setView(AppView.DASHBOARD);
  };

  const handleDelete = (id: string) => {
    if (confirm("Opravdu chcete tento dokument smazat z databáze?")) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      if (selectedDocId === id) {
        setView(AppView.DASHBOARD);
        setSelectedDocId(null);
      }
    }
  };

  const handleViewDoc = (doc: DocumentRecord) => {
    setSelectedDocId(doc.id);
    setView(AppView.DETAIL);
  };

  const handleRowStatusChange = (docId: string, rowIndex: number, newStatus: RowStatus) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== docId) return doc;

        const newDoc = { ...doc };
        newDoc.data = { ...doc.data };
        newDoc.data.tableRows = [...doc.data.tableRows];
        
        const existingRow = newDoc.data.tableRows[rowIndex];
        newDoc.data.tableRows[rowIndex] = {
            ...existingRow,
            status: newStatus
        };

        return newDoc;
      });
    });
  };

  const handleBulkStatusChange = (items: { docId: string, rowIndex: number }[], newStatus: RowStatus) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        // Zjistíme, jestli se tento dokument má updatovat
        const updatesForDoc = items.filter(item => item.docId === doc.id);
        
        if (updatesForDoc.length === 0) return doc;

        const newDoc = { ...doc };
        newDoc.data = { ...doc.data };
        newDoc.data.tableRows = [...doc.data.tableRows];

        updatesForDoc.forEach(update => {
            if (newDoc.data.tableRows[update.rowIndex]) {
                newDoc.data.tableRows[update.rowIndex] = {
                    ...newDoc.data.tableRows[update.rowIndex],
                    status: newStatus
                };
            }
        });

        return newDoc;
      });
    });
  };

  const handleRowGisFixToggle = (docId: string, rowIndex: number) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== docId) return doc;

        const newDoc = { ...doc };
        newDoc.data = { ...doc.data };
        newDoc.data.tableRows = [...doc.data.tableRows];
        
        const existingRow = newDoc.data.tableRows[rowIndex];
        newDoc.data.tableRows[rowIndex] = {
            ...existingRow,
            requiresGisFix: !existingRow.requiresGisFix
        };

        return newDoc;
      });
    });
  };

  const handleTargetsUpdate = (newTargets: AnnualTargets) => {
    setTargets(newTargets);
  };

  const selectedDocument = documents.find(d => d.id === selectedDocId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setView(AppView.DASHBOARD)}
          >
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Database size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              PDF Databáze
            </h1>
          </div>
          
          {view === AppView.DASHBOARD && (
            <button 
              onClick={() => setView(AppView.UPLOAD)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Nahrát PDF
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === AppView.DASHBOARD && (
          <Dashboard 
            documents={documents} 
            targets={targets}
            onAddClick={() => setView(AppView.UPLOAD)}
            onDeleteClick={handleDelete}
            onViewClick={handleViewDoc}
            onStatusChange={handleRowStatusChange}
            onBulkStatusChange={handleBulkStatusChange}
            onGisFixToggle={handleRowGisFixToggle}
            onTargetsUpdate={handleTargetsUpdate}
          />
        )}

        {view === AppView.UPLOAD && (
          <Scanner 
            onScanComplete={handleScanComplete} 
            onCancel={() => setView(AppView.DASHBOARD)} 
          />
        )}

        {view === AppView.DETAIL && selectedDocument && (
          <DetailView 
            document={selectedDocument} 
            onBack={() => setView(AppView.DASHBOARD)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
