import React, { useState, useEffect } from 'react';
import { DocumentRecord, AppView, RowStatus } from './types';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { DetailView } from './components/DetailView';
import { Database, Plus } from 'lucide-react';

const STORAGE_KEY = 'pdf-db-documents';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setDocuments(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored documents", e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

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

  // Funkce pro změnu stavu konkrétního řádku v konkrétním dokumentu
  const handleRowStatusChange = (docId: string, rowIndex: number, newStatus: RowStatus) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== docId) return doc;

        // Vytvoříme hlubokou kopii dokumentu, abychom neupravovali state přímo
        const newDoc = { ...doc };
        newDoc.data = { ...doc.data };
        newDoc.data.tableRows = [...doc.data.tableRows];
        
        // Upravíme konkrétní řádek
        const existingRow = newDoc.data.tableRows[rowIndex];
        newDoc.data.tableRows[rowIndex] = {
            ...existingRow,
            status: newStatus
        };

        return newDoc;
      });
    });
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
            onAddClick={() => setView(AppView.UPLOAD)}
            onDeleteClick={handleDelete}
            onViewClick={handleViewDoc}
            onStatusChange={handleRowStatusChange}
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
