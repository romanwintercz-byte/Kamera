import React from 'react';
import { DocumentRecord } from '../types';
import { ArrowLeft, Calendar, Tag, FileText, Database, MapPin } from 'lucide-react';
import { Button } from './Button';

interface DetailViewProps {
  document: DocumentRecord;
  onBack: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({ document, onBack }) => {
  const { data } = document;

  // Fallback for empty data
  const headers = data.tableHeaders || [];
  const rows = data.tableRows || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack} className="pl-0 hover:bg-transparent hover:text-blue-600">
        <ArrowLeft className="mr-2" size={20} />
        Zpět na seznam
      </Button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {data.category}
              </span>
              {data.center && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <MapPin size={14} className="mr-1.5" />
                  Středisko: {data.center}
                </span>
              )}
            </div>
            <div className="text-slate-500 text-sm flex items-center">
              <Calendar size={16} className="mr-2" />
              Dokument z: {new Date(data.date).toLocaleDateString('cs-CZ')}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{data.title}</h1>
          
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
              <FileText size={16} className="mr-2" />
              Shrnutí
            </h3>
            <p className="text-slate-800 leading-relaxed">
              {data.summary}
            </p>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {data.tags.map((tag, idx) => (
              <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-600">
                <Tag size={12} className="mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Table Section */}
        <div className="p-0">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center">
            <Database size={18} className="text-blue-600 mr-2" />
            <h3 className="font-semibold text-slate-800">
              Extrahovaná Data ({rows.length} záznamů)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            {headers.length > 0 && rows.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">
                      #
                    </th>
                    {headers.map((header, idx) => (
                      <th 
                        key={idx} 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                        {rowIdx + 1}
                      </td>
                      {/* Ensure we map over headers length to avoid overflow if row data is mismatched, though schema prevents this */}
                      {headers.map((_, colIdx) => (
                        <td key={colIdx} className="px-6 py-4 text-sm text-slate-700 whitespace-pre-wrap">
                          {row.values[colIdx] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-500">
                <p className="italic">V dokumentu nebyla nalezena žádná strukturovaná tabulka.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-200 text-xs text-slate-400">
          ID souboru: {document.id} • Název souboru: {document.fileName}
        </div>
      </div>
    </div>
  );
};
