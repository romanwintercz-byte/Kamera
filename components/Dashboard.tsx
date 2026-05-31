import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DocumentRecord, RowStatus, AnnualTargets } from '../types.ts';
import { FileText, Calendar, Search, Plus, MapPin, Clock, Database, Layers, CheckCircle2, Eye, Activity, Hash, Ruler, Target, BarChart3, List, Wrench, X, Ban } from 'lucide-react';
import { Button } from './Button.tsx';
import { PlanModal } from './PlanModal.tsx';
import { StatisticsPanel } from './StatisticsPanel.tsx';

interface DashboardProps {
  documents: DocumentRecord[];
  targets: AnnualTargets;
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
  onViewClick: (doc: DocumentRecord) => void;
  onStatusChange: (docId: string, rowIndex: number, status: RowStatus) => void;
  onBulkStatusChange: (items: { docId: string, rowIndex: number }[], status: RowStatus) => void;
  onBulkDelete: (items: { docId: string, rowIndex: number }[]) => void;
  onGisFixToggle: (docId: string, rowIndex: number) => void;
  onTargetsUpdate: (targets: AnnualTargets) => void;
}

interface DashboardRow {
  id: string;
  docId: string;
  rowIndex: number;
  originalDoc: DocumentRecord;
  values: string[];
  filterDate: string;
  status: RowStatus;
  requiresGisFix: boolean;
}

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
];

const findDateColumnIndex = (headers: string[]): number => {
  if (!headers) return -1;
  const lowerHeaders = headers.map(h => h.toLowerCase());
  return lowerHeaders.findIndex(h => 
    h.includes('datum') || h.includes('dne') || h.includes('kdy') || h.includes('termín') || h.includes('date')
  );
};

const findLengthColumnIndex = (headers: string[]): number => {
  if (!headers) return -1;
  const lowerHeaders = headers.map(h => h.toLowerCase());
  const priorityIdx = lowerHeaders.findIndex(h => h.includes('zkontrolo'));
  if (priorityIdx !== -1) return priorityIdx;
  return lowerHeaders.findIndex(h => 
    h.includes('délka') || h.includes('delka') || h.includes('metr') || h.includes('metráž') || h.includes('length') || h === 'm'
  );
};

const parseLengthValue = (str: string | undefined): number => {
  if (!str) return 0;
  const cleanStr = str.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  const normalized = cleanStr.replace(',', '.');
  const val = parseFloat(normalized);
  return isNaN(val) ? 0 : val;
};

const formatToCzechDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('cs-CZ');
};

const StatusMenu: React.FC<{ 
  currentStatus?: RowStatus, 
  onSelect: (s: RowStatus) => void 
}> = ({ currentStatus, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusLabel = () => {
    switch(currentStatus) {
      case RowStatus.UPLOADED: return <span className="flex items-center text-emerald-700 font-bold"><CheckCircle2 size={16} className="mr-1.5"/> Nahráno</span>;
      case RowStatus.REVISION: return <span className="flex items-center text-orange-700 font-bold"><Wrench size={16} className="mr-1.5"/> Úprava GIS</span>;
      case RowStatus.UNUSABLE: return <span className="flex items-center text-red-700 font-bold"><Ban size={16} className="mr-1.5"/> Nelze použít</span>;
      default: return <span className="text-slate-400 font-medium">Nový</span>;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-36 px-3 py-1.5 bg-white/50 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg transition-all text-sm"
      >
        {getStatusLabel()}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden text-sm">
           <div className="p-1 space-y-0.5">
              <button onClick={() => { onSelect(RowStatus.UPLOADED); setIsOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-700 rounded-md flex items-center">
                <CheckCircle2 size={16} className="mr-2"/> Nahráno
              </button>
              <button onClick={() => { onSelect(RowStatus.REVISION); setIsOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-orange-50 text-orange-700 rounded-md flex items-center">
                <Wrench size={16} className="mr-2"/> Nutná úprava v GIS
              </button>
              <button onClick={() => { onSelect(RowStatus.UNUSABLE); setIsOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-700 rounded-md flex items-center">
                <Ban size={16} className="mr-2"/> Nelze použít
              </button>
              <div className="h-px bg-slate-100 my-1"></div>
              <button onClick={() => { onSelect(RowStatus.NEW); setIsOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-600 rounded-md">
                Resetovat stav
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ documents, targets, onAddClick, onDeleteClick, onViewClick, onStatusChange, onBulkStatusChange, onBulkDelete, onGisFixToggle, onTargetsUpdate }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [centerFilter, setCenterFilter] = React.useState<string>('all');
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');
  const [mergeDuplicates, setMergeDuplicates] = React.useState<boolean>(true);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'stats'>('table');

  const allRows = useMemo(() => {
    const sortedDocs = [...documents].sort((a, b) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
    const rows: DashboardRow[] = [];
    const seenSignatures = new Set<string>();
    for (const doc of sortedDocs) {
        const dateColIdx = findDateColumnIndex(doc.data.tableHeaders);
        for (let i = 0; i < (doc.data.tableRows || []).length; i++) {
            const row = doc.data.tableRows[i];
            const rowDateStr = dateColIdx >= 0 ? row.values[dateColIdx] : '';
            const signature = [doc.data.center, ...row.values.map(v => v?.trim().toLowerCase())].join('|');
            if (mergeDuplicates && seenSignatures.has(signature)) continue;
            if (mergeDuplicates) seenSignatures.add(signature);
            rows.push({
                id: `${doc.id}_${i}`,
                docId: doc.id,
                rowIndex: i,
                originalDoc: doc,
                values: row.values,
                filterDate: rowDateStr,
                status: row.status || RowStatus.NEW,
                requiresGisFix: !!row.requiresGisFix 
            });
        }
    }
    return rows;
  }, [documents, mergeDuplicates]);

  const getYearFromRow = (dateStr: string) => {
    if (!dateStr) return '';
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : '';
  };

  const getMonthFromRow = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length > 1) return parseInt(parts[1], 10).toString();
    const partsDot = dateStr.split('.');
    if (partsDot.length > 1) return parseInt(partsDot[1], 10).toString();
    return '';
  };

  const centers = Array.from(new Set(documents.map(d => d.data.center))).filter(c => c && c !== 'Neurčeno').sort();
  const years = Array.from(new Set(allRows.map(r => getYearFromRow(r.filterDate))))
    .filter((y: string) => y && y.length === 4).sort().reverse();

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

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRowIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map(r => r.id)));
    }
  };

  const handleBulkAction = (status: RowStatus) => {
    const items = filteredRows.filter(r => selectedRowIds.has(r.id)).map(r => ({ docId: r.docId, rowIndex: r.rowIndex }));
    onBulkStatusChange(items, status);
    setSelectedRowIds(new Set());
  };

  const handleBulkDeletion = () => {
    if (confirm("Opravdu chcete smazat vybrané prohlídky? Tuto akci nelze vrátit.")) {
      const items = filteredRows.filter(r => selectedRowIds.has(r.id)).map(r => ({ docId: r.docId, rowIndex: r.rowIndex }));
      onBulkDelete(items);
      setSelectedRowIds(new Set());
    }
  };

  const displayHeaders = filteredRows.length > 0 
    ? filteredRows[0].originalDoc.data.tableHeaders 
    : (documents.length > 0 ? documents[0].data.tableHeaders : []);

  const lengthColIdx = findLengthColumnIndex(displayHeaders);
  const dateColIdx = findDateColumnIndex(displayHeaders);

  const stats = useMemo(() => {
    return filteredRows.reduce((acc, row) => {
        acc.count++;
        if (row.requiresGisFix) acc.gisFixCount++;
        if (lengthColIdx >= 0) {
            const val = parseLengthValue(row.values[lengthColIdx]);
            acc.totalMeters += val;
            if (row.status === RowStatus.UPLOADED) acc.uploadedMeters += val;
            else if (row.status === RowStatus.NEW || row.status === RowStatus.REVISION) acc.todoMeters += val;
        }
        return acc;
    }, { totalMeters: 0, uploadedMeters: 0, todoMeters: 0, count: 0, gisFixCount: 0 });
  }, [filteredRows, lengthColIdx]);

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <FileText className="mr-2 text-blue-600" />
            Databáze prohlídek
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
             <Button variant="secondary" onClick={() => setShowPlanModal(true)} className="w-full sm:w-auto">
                <Target className="mr-2" size={20} />
                Nastavit cíle
             </Button>
             <Button onClick={onAddClick} className="w-full sm:w-auto">
                <Plus className="mr-2" size={20} />
                Nahrát PDF
            </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Středisko</label>
                <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="all">Všechna střediska</option>
                    {centers.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Rok</label>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="all">Všechny roky</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Měsíc</label>
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg">
                    <option value="all">Všechny měsíce</option>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={(i+1).toString()}>{m}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Hledat</label>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Hledat..." className="w-full p-2 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex items-center pt-5">
                <label className="flex items-center cursor-pointer text-sm font-medium text-slate-600">
                    <input type="checkbox" checked={mergeDuplicates} onChange={(e) => setMergeDuplicates(e.target.checked)} className="mr-2" />
                    Smart Merge
                </label>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 mb-1">Celková délka</h3>
            <p className="text-xl font-bold">{stats.totalMeters.toLocaleString('cs-CZ')} m</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200">
            <h3 className="text-xs font-semibold text-emerald-600 mb-1">Nahráno (GIS)</h3>
            <p className="text-xl font-bold text-emerald-700">{stats.uploadedMeters.toLocaleString('cs-CZ')} m</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200">
            <h3 className="text-xs font-semibold text-orange-600 mb-1">Úpravy GIS</h3>
            <p className="text-xl font-bold text-orange-700">{stats.gisFixCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200">
            <h3 className="text-xs font-semibold text-amber-600 mb-1">Zbývá</h3>
            <p className="text-xl font-bold text-amber-700">{stats.todoMeters.toLocaleString('cs-CZ')} m</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 mb-1">Počet úseků</h3>
            <p className="text-xl font-bold">{stats.count}</p>
        </div>
      </div>
      
      <div className="flex justify-center border-b border-slate-200 mb-4">
        <div className="flex space-x-6">
            <button onClick={() => setActiveTab('table')} className={`pb-3 px-4 text-sm font-medium ${activeTab === 'table' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Seznam dat</button>
            <button onClick={() => setActiveTab('stats')} className={`pb-3 px-4 text-sm font-medium ${activeTab === 'stats' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500'}`}>Statistiky</button>
        </div>
      </div>

      {activeTab === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {selectedRowIds.size > 0 && (
                <div className="bg-blue-50 border-b border-blue-100 p-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-blue-800">
                        Vybráno položek: {selectedRowIds.size}
                    </div>
                    <div className="flex items-center gap-2">
                        <StatusMenu currentStatus={RowStatus.NEW} onSelect={handleBulkAction} />
                        <button 
                            onClick={handleBulkDeletion}
                            className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <Ban size={16} className="mr-1.5" />
                            Smazat
                        </button>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input 
                                    type="checkbox" 
                                    checked={filteredRows.length > 0 && selectedRowIds.size === filteredRows.length}
                                    onChange={toggleAllSelection}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-4 py-3">Středisko</th>
                        <th className="px-4 py-3">GIS?</th>
                        {displayHeaders.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}
                        <th className="px-4 py-3 text-right">Akce</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRows.map(row => (
                        <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedRowIds.has(row.id) ? 'bg-blue-50/50' : ''}`}>
                            <td className="px-4 py-3">
                                <input 
                                    type="checkbox" 
                                    checked={selectedRowIds.has(row.id)}
                                    onChange={() => toggleRowSelection(row.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                            </td>
                            <td className="px-4 py-3">{row.originalDoc.data.center}</td>
                            <td className="px-4 py-3">
                                <button onClick={() => onGisFixToggle(row.docId, row.rowIndex)} className={`p-1 rounded ${row.requiresGisFix ? 'text-orange-600' : 'text-slate-300'}`}>
                                    <Wrench size={14} />
                                </button>
                            </td>
                            {displayHeaders.map((_, i) => (
                                <td key={i} className="px-4 py-3">
                                    {i === dateColIdx ? formatToCzechDate(row.values[i]) : row.values[i]}
                                </td>
                            ))}
                            <td className="px-4 py-3 text-right">
                                <StatusMenu currentStatus={row.status} onSelect={(s) => onStatusChange(row.docId, row.rowIndex, s)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
      ) : (
          <StatisticsPanel 
            documents={documents}
            targets={targets}
            yearFilter={yearFilter}
            monthFilter={monthFilter}
            mergeDuplicates={mergeDuplicates}
          />
      )}

      {showPlanModal && (
          <PlanModal centers={centers} currentTargets={targets} onSave={onTargetsUpdate} onClose={() => setShowPlanModal(false)} initialYear={yearFilter} />
      )}
    </div>
  );
};