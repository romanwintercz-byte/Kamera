import React from 'react';
import { DocumentRecord } from '../types';
import { FileText, Calendar, Trash2, Search, Plus, MapPin, Clock, Database, ArrowRight } from 'lucide-react';
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

  // --- Pomocné funkce pro práci s datem ---
  // Datum v DB je očekáváno jako YYYY-MM-DD
  const getYearFromStr = (dateStr: string) => dateStr ? dateStr.split('-')[0] : '';
  const getMonthFromStr = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    // Pokud je formát YYYY-MM-DD, měsíc je na indexu 1
    // Odstraníme úvodní nulu, aby "05" bylo "5" (shoda s indexem v poli měsíců 1-12)
    return parts.length > 1 ? parseInt(parts[1], 10).toString() : '';
  };

  // --- Extrakt unikátních hodnot pro filtry ---
  const centers = Array.from(new Set(documents.map(d => d.data.center))).filter(Boolean).sort();
  
  const years = Array.from(new Set(documents.map(d => getYearFromStr(d.data.date))))
    .filter(y => y.length === 4)
    .sort()
    .reverse();

  // --- Filtrování dokumentů ---
  const filteredDocs = documents.filter(doc => {
    const docYear = getYearFromStr(doc.data.date);
    const docMonth = getMonthFromStr(doc.data.date);

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

  // --- Agregace řádků pro zobrazení "Data rovnou" ---
  // Vytvoříme jedno velké pole všech řádků ze všech vyfiltrovaných dokumentů
  const aggregatedRows = filteredDocs.flatMap(doc => {
    return (doc.data.tableRows || []).map((row, index) => ({
      id: `${doc.id}_${index}`, // Unikátní ID pro React key
      originalDoc: doc,
      values: row.values
    }));
  });

  // Získáme hlavičky z prvního dokumentu (předpokládáme, že ve stejném středisku/filtru budou stejné)
  // Pokud nejsou žádné dokumenty, nemáme hlavičky
  const tableHeaders = filteredDocs.length > 0 && filteredDocs[0].data.tableHeaders 
    ? filteredDocs[0].data.tableHeaders 
    : [];

  // Pokud dokumenty mají různé počty sloupců, ošetříme to při vykreslování
  
  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <FileText className="mr-2 text-blue-600" />
            Databáze prohlídek
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
             <Button onClick={onAddClick} className="w-full sm:w-auto">
                <Plus className="mr-2" size={20} />
                Nahrát PDF
            </Button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Center Filter */}
            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Středisko</label>
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
            </div>

            {/* Year Filter */}
            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Rok</label>
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
            </div>

            {/* Month Filter */}
            <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Měsíc</label>
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

             {/* Search */}
             <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Hledat v datech</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                    type="text"
                    placeholder="Hledat text..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {aggregatedRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Database size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium">Žádná data k zobrazení.</p>
            <p className="text-sm">Zkuste upravit filtry nebo nahrajte nový dokument.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {/* Pevné sloupce: Datum, Středisko (pokud není filtrováno) */}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-24">
                    Datum
                  </th>
                  {centerFilter === 'all' && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Středisko
                    </th>
                  )}
                  
                  {/* Dynamické sloupce z PDF */}
                  {tableHeaders.map((header, idx) => (
                    <th 
                      key={idx} 
                      scope="col" 
                      className="px-4 py-3 text-left text-xs font-bold text-slate-800 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}

                  {/* Akce */}
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    Zdroj
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {aggregatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50 transition-colors group">
                    {/* Datum */}
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {row.originalDoc.data.date}
                    </td>
                    
                    {/* Středisko (pokud není vybrané) */}
                    {centerFilter === 'all' && (
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-medium">
                            {row.originalDoc.data.center}
                        </td>
                    )}

                    {/* Dynamická data */}
                    {tableHeaders.map((_, colIdx) => (
                        <td key={colIdx} className="px-4 py-3 text-sm text-slate-800 font-medium">
                            {row.values[colIdx] || '-'}
                        </td>
                    ))}

                    {/* Odkaz na dokument / Akce */}
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => onViewClick(row.originalDoc)}
                                title="Zobrazit originální dokument"
                                className="text-blue-600 hover:text-blue-800 p-1"
                             >
                                <ArrowRight size={16} />
                             </button>
                             <button 
                                onClick={() => onDeleteClick(row.originalDoc.id)}
                                title="Smazat dokument"
                                className="text-red-400 hover:text-red-600 p-1"
                             >
                                <Trash2 size={16} />
                             </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {aggregatedRows.length > 0 && (
             <div className="bg-slate-50 p-3 text-xs text-slate-500 text-center border-t border-slate-200">
                Zobrazeno {aggregatedRows.length} řádků z {filteredDocs.length} dokumentů.
            </div>
        )}
      </div>
    </div>
  );
};
