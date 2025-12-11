import React from 'react';
import { DocumentRecord } from '../types';
import { FileText, Calendar, Tag, Trash2, Search, Plus, MapPin, Filter, Clock } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  documents: DocumentRecord[];
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
  onViewClick: (doc: DocumentRecord) => void;
}

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
];

export const Dashboard: React.FC<DashboardProps> = ({ documents, onAddClick, onDeleteClick, onViewClick }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [centerFilter, setCenterFilter] = React.useState<string>('all');
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');

  // Extrakt unikátních hodnot pro filtry
  const centers = Array.from(new Set(documents.map(d => d.data.center))).filter(Boolean).sort();
  
  const years = Array.from(new Set(documents.map(d => {
    try { return new Date(d.data.date).getFullYear().toString(); } catch { return null; }
  }))).filter(Boolean).sort().reverse();

  // Filtrování
  const filteredDocs = documents.filter(doc => {
    const docDate = new Date(doc.data.date);
    const docYear = docDate.getFullYear().toString();
    const docMonth = (docDate.getMonth() + 1).toString(); // 1-12

    const lowerTerm = searchTerm.toLowerCase();
    
    // 1. Prohledávání metadat
    const matchesMeta = 
      doc.data.title.toLowerCase().includes(lowerTerm) || 
      doc.data.summary.toLowerCase().includes(lowerTerm) ||
      (doc.data.center && doc.data.center.toLowerCase().includes(lowerTerm));

    // 2. Prohledávání tabulky
    const matchesTableData = doc.data.tableRows?.some(row => 
      row.values.some(val => val && val.toLowerCase().includes(lowerTerm))
    );

    const matchesSearch = searchTerm === '' || matchesMeta || matchesTableData;
    const matchesCenter = centerFilter === 'all' || doc.data.center === centerFilter;
    const matchesYear = yearFilter === 'all' || docYear === yearFilter;
    const matchesMonth = monthFilter === 'all' || docMonth === monthFilter;
    
    return matchesSearch && matchesCenter && matchesYear && matchesMonth;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <FileText className="mr-2 text-blue-600" />
            Archiv dokumentů
        </h2>
        <Button onClick={onAddClick}>
            <Plus className="mr-2" size={20} />
            Přidat dokument
        </Button>
      </div>

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                type="text"
                placeholder="Hledat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Center Filter */}
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white text-slate-700 cursor-pointer"
                >
                <option value="all">Všechna střediska</option>
                {centers.map(center => (
                    <option key={center} value={center}>{center}</option>
                ))}
                </select>
            </div>

            {/* Year Filter */}
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white text-slate-700 cursor-pointer"
                >
                <option value="all">Všechny roky</option>
                {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
                </select>
            </div>

            {/* Month Filter */}
            <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white text-slate-700 cursor-pointer"
                >
                <option value="all">Všechny měsíce</option>
                {MONTH_NAMES.map((name, index) => (
                    <option key={index} value={(index + 1).toString()}>{name}</option>
                ))}
                </select>
            </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg">Žádné dokumenty neodpovídají výběru.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group">
                
                {/* Left side: Icon + Title + Center */}
                <div className="flex items-start sm:items-center gap-4 cursor-pointer flex-1" onClick={() => onViewClick(doc)}>
                    <div className="bg-blue-50 p-3 rounded-lg text-blue-600 hidden sm:block">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {doc.data.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-1">
                             <span className="flex items-center text-emerald-600 font-medium">
                                <MapPin size={14} className="mr-1" />
                                {doc.data.center}
                             </span>
                             <span className="text-slate-300">|</span>
                             <span className="flex items-center">
                                <Calendar size={14} className="mr-1" />
                                {new Date(doc.data.date).toLocaleDateString('cs-CZ')}
                             </span>
                             <span className="text-slate-300">|</span>
                             <span>
                                {doc.data.category}
                             </span>
                        </div>
                    </div>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button variant="secondary" onClick={() => onViewClick(doc)} className="text-sm">
                      Zobrazit
                    </Button>
                    <Button variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => onDeleteClick(doc.id)}>
                      <Trash2 size={18} />
                    </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
