import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { analyzePdfDocument } from '../services/geminiService';
import { DocumentRecord } from '../types';

interface ScannerProps {
  onScanComplete: (doc: DocumentRecord) => void;
  onCancel: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError("Prosím vyberte pouze PDF soubor.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleScan = async () => {
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      const base64Data = await convertFileToBase64(file);
      const extractedData = await analyzePdfDocument(base64Data);

      // PŘEJMENOVÁNÍ DLE POŽADAVKU: Středisko - Rok/Měsíc
      let formattedTitle = extractedData.title;
      try {
        const dateObj = new Date(extractedData.date);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const centerName = extractedData.center && extractedData.center !== 'Neurčeno' 
                ? extractedData.center 
                : 'Neznámé středisko';
            
            formattedTitle = `${centerName} - ${year}/${month}`;
            extractedData.title = formattedTitle; 
        }
      } catch (e) {
        console.warn("Nepodařilo se formátovat název podle data", e);
      }

      const newRecord: DocumentRecord = {
        id: crypto.randomUUID(),
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        data: extractedData,
      };

      onScanComplete(newRecord);
    } catch (err: any) {
      setError(err.message || "Nastala chyba při analýze dokumentu. Zkuste to prosím znovu.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Upload size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Nahrát nový dokument</h2>
        <p className="text-slate-500 mt-2">Vyberte PDF soubor pro automatickou analýzu a extrakci dat.</p>
      </div>

      <div className="mb-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden" 
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <FileText size={48} className="text-blue-500 mb-2" />
              <p className="font-medium text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-xs text-blue-600 mt-2 font-medium">Klikněte pro změnu</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload size={48} className="text-slate-300 mb-2" />
              <p className="font-medium text-slate-700">Klikněte pro výběr souboru</p>
              <p className="text-sm text-slate-400">Pouze PDF soubory</p>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onCancel} disabled={isScanning}>
          Zrušit
        </Button>
        <Button onClick={handleScan} disabled={!file} isLoading={isScanning}>
          Analyzovat a Uložit
        </Button>
      </div>
    </div>
  );
};