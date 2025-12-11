import React, { useMemo } from 'react';
import { DocumentRecord } from '../types';
import { FileText, Calendar, Trash2, Search, Plus, MapPin, Clock, Database, ArrowRight, Layers } from 'lucide-react';
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

// Helper to detect date column index based on header name
const findDateColumnIndex = (headers: string[]): number => {
  if (!headers) return -1;
  const lowerHeaders = headers.map(h => h.toLowerCase());
  return lowerHeaders.findIndex(h => 
    h.includes('datum') || 
    h.includes('dne') || 
    h.includes('kdy') || 
    h.includes('termín') ||
    h.includes('date')
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ documents, onAddClick, onDeleteClick, onViewClick }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [centerFilter, setCenterFilter] = React.useState<string>('all');
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');
  const [mergeDuplicates, setMergeDuplicates] = React.useState<boolean>(true); // Nový přepínač

  // 1. KROK: Zploštění všech řádků a volitelná deduplikace
  const allRows = useMemo(() => {
    // Seřadíme dokumenty od nejnovějšího po nejstarší (podle data nahrání)
    // To zajistí, že pokud máme duplicitu, prioritizujeme řádek z novějšího souboru (nebo naopak, dle logiky)
    // Zde bereme prostě "první nalezený" jako unikátní.
    const sortedDocs = [...documents].sort((a, b) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );

    const rows = [];
    const seenSignatures = new Set<string>();

    for (const doc of sortedDocs) {
        const dateColIdx = findDateColumnIndex(doc.data.tableHeaders);

        for (let i = 0; i < (doc.data.tableRows || []).length; i++) {
            const row = doc.data.tableRows[i];
            const rowDateStr = dateColIdx >= 0 ? row.values[dateColIdx] : '';

            // Vytvoříme unikátní podpis řádku spojením všech jeho hodnot
            // Přidáme i středisko, aby stejná data v různých střediscích nebyla považována za duplicitu
            // Normalizujeme text (trim, lowercase) pro lepší shodu
            const signature = [
                doc.data.center, 
                ...row.values.map(v => v?.trim().toLowerCase())
            ].join('|');

            // Pokud je zapnuto slučování a tento řádek jsme už viděli, přeskočíme ho
            if (mergeDuplicates && seenSignatures.has(signature)) {
                continue;
            }

            if (mergeDuplicates) {
                seenSignatures.add(signature);
            }

            rows.push({
                id: `${doc.id}_${i}`,
                originalDoc: doc,
                values: row.values,
                filterDate: rowDateStr
            });
        }
    }

    return rows;
  }, [documents, mergeDuplicates]);

  // --- Pomocné funkce pro parsování data z řádku ---
  const getYearFromRow = (dateStr: string) => {
    if (!dateStr) return '';
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : '';
  };

  const getMonthFromRow = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length > 1) {
        return parseInt(parts[1], 10).toString();
    }
    const partsDot = dateStr.split('.');
    if (partsDot.length > 1) {
        return parseInt(partsDot[1], 10).toString();
    }
    return '';
  };

  // 2. KROK: Extrakt unikátních hodnot pro filtry (z ŘÁDKŮ)
  const centers = Array.from(new Set(documents.map(d => d.data.center))).filter(Boolean).sort();
  
  const years = Array.from(new Set(allRows.map(r => getYearFromRow(r.filterDate))))
    .filter(y => y && y.length === 4)
    .sort()
    .reverse();

  // 3. KROK: Filtrování řádků
  const filteredRows = allRows.filter(row => {
    const rowYear = getYearFromRow(row.filterDate);
    const rowMonth = getMonthFromRow(row.filterDate);
    const center = row.originalDoc.data.center;

    const matchesCenter = centerFilter === 'all' || center === centerFilter;
    const matchesYear = yearFilter === 'all' || rowYear === yearFilter;
    const matchesMonth = monthFilter === 'all' || rowMonth === monthFilter;

    const lowerTerm = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      row.values.some(val => val && val.toLowerCase().includes(lowerTerm)) ||
      center.toLowerCase().includes(lowerTerm) ||
      row.originalDoc.data.title.toLowerCase().includes(lowerTerm);

    return matchesCenter && matchesYear && matchesMonth && matchesSearch;
  });

  const displayHeaders = filteredRows.length > 0 
    ? filteredRows[0].originalDoc.data.tableHeaders 
    : (documents.length > 0 ? documents[0].data.tableHeaders : []);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            
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
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Hledat</label>
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
            </div>

            {/* Merge Duplicates Toggle */}
            <div className="relative flex items-center h-full pt-6">
                <label className="flex items-center cursor-pointer select-none">
                    <div className="relative">
                        <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={mergeDuplicates}
                            onChange={(e) => setMergeDuplicates(e.target.checked)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${mergeDuplicates ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${mergeDuplicates ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <div className="ml-3 text-sm font-medium text-slate-600 flex items-center">
                        <Layers size={16} className="mr-1.5 text-slate-400" />
                        Sloučit duplicity
                    </div>
                </label>
            </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {filteredRows.length === 0 ? (
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
                  {/* Sloupec Středisko */}
                  {centerFilter === 'all' && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        Středisko
                    </th>
                  )}
                  
                  {/* Dynamické sloupce z PDF (včetně data inspekce, které je teď součástí tabulky) */}
                  {displayHeaders.map((header, idx) => (
                    <th 
                      key={idx} 
                      scope="col" 
                      className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                        header.toLowerCase().includes('datum') ? 'text-blue-700 bg-blue-50' : 'text-slate-800'
                      }`}
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
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50 transition-colors group">
                    
                    {/* Středisko */}
                    {centerFilter === 'all' && (
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-medium">
                            {row.originalDoc.data.center}
                        </td>
                    )}

                    {/* Dynamická data - pouze hodnoty z PDF */}
                    {displayHeaders.map((header, colIdx) => (
                        <td 
                            key={colIdx} 
                            className={`px-4 py-3 text-sm font-medium ${
                                header.toLowerCase().includes('datum') ? 'text-blue-700 whitespace-nowrap' : 'text-slate-800'
                            }`}
                        >
                            {row.values[colIdx] || '-'}
                        </td>
                    ))}

                    {/* Odkaz na dokument / Akce */}
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap w-24">
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
        
        {filteredRows.length > 0 && (
             <div className="bg-slate-50 p-3 text-xs text-slate-500 text-center border-t border-slate-200 flex justify-between items-center">
                <span>Zobrazeno {filteredRows.length} řádků.</span>
                {mergeDuplicates && (
                    <span className="text-blue-600 flex items-center">
                        <Layers size={12} className="mr-1" />
                        Duplicity jsou skryté
                    </span>
                )}
            </div>
        )}
      </div>
    </div>
  );
};