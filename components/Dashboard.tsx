import React, { useMemo, useState, useRef, useEffect } from 'react';
import { DocumentRecord, RowStatus, AnnualTargets } from '../types';
import { FileText, Calendar, Search, Plus, MapPin, Clock, Database, Layers, CheckCircle2, AlertTriangle, Ban, Eye, Activity, Hash, Ruler, Target, BarChart3, List, Wrench, CheckSquare, X } from 'lucide-react';
import { Button } from './Button';
import { PlanModal } from './PlanModal';
import { StatisticsPanel } from './StatisticsPanel';

interface DashboardProps {
  documents: DocumentRecord[];
  targets: AnnualTargets;
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
  onViewClick: (doc: DocumentRecord) => void;
  onStatusChange: (docId: string, rowIndex: number, status: RowStatus) => void;
  onBulkStatusChange: (items: { docId: string, rowIndex: number }[], status: RowStatus) => void;
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

// Helper to detect length/meters column index
const findLengthColumnIndex = (headers: string[]): number => {
  if (!headers) return -1;
  const lowerHeaders = headers.map(h => h.toLowerCase());
  return lowerHeaders.findIndex(h => 
    h.includes('délka') || 
    h.includes('delka') || 
    h.includes('metr') || 
    h.includes('metráž') ||
    h.includes('length') ||
    h === 'm' ||
    h === 'bm'
  );
};

// Helper to parse numeric value from string (e.g. "14,5 m" -> 14.5)
const parseLengthValue = (str: string | undefined): number => {
  if (!str) return 0;
  const normalized = str.replace(',', '.');
  const match = normalized.match(/[\d.]+/);
  if (!match) return 0;
  const val = parseFloat(match[0]);
  return isNaN(val) ? 0 : val;
};

// --- Komponenta pro Status Menu ---
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

export const Dashboard: React.FC<DashboardProps> = ({ documents, targets, onAddClick, onDeleteClick, onViewClick, onStatusChange, onBulkStatusChange, onGisFixToggle, onTargetsUpdate }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [centerFilter, setCenterFilter] = React.useState<string>('all');
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');
  const [mergeDuplicates, setMergeDuplicates] = React.useState<boolean>(true);
  
  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Toggles
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

            const signature = [
                doc.data.center, 
                ...row.values.map(v => v?.trim().toLowerCase())
            ].join('|');

            if (mergeDuplicates && seenSignatures.has(signature)) {
                continue;
            }

            if (mergeDuplicates) {
                seenSignatures.add(signature);
            }

            rows.push({
                id: `${doc.id}_${i}`,
                docId: doc.id,
                rowIndex: i,
                originalDoc: doc,
                values: row.values,
                filterDate: rowDateStr,
                status: row.status || RowStatus.NEW,
                requiresGisFix: !!row.requiresGisFix // Default to false if undefined
            });
        }
    }

    return rows;
  }, [documents, mergeDuplicates]);

  // --- Helpers for date filters ---
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

  const displayHeaders = filteredRows.length > 0 
    ? filteredRows[0].originalDoc.data.tableHeaders 
    : (documents.length > 0 ? documents[0].data.tableHeaders : []);

  // --- SELECTION HANDLERS ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        const allIds = new Set(filteredRows.map(r => r.id));
        setSelectedRowIds(allIds);
    } else {
        setSelectedRowIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRowIds);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedRowIds(newSelected);
  };

  const handleBulkAction = (status: RowStatus) => {
    if (selectedRowIds.size === 0) return;
    
    // Convert selected IDs to {docId, rowIndex} array
    const itemsToUpdate: {docId: string, rowIndex: number}[] = [];
    
    allRows.forEach(row => {
        if (selectedRowIds.has(row.id)) {
            itemsToUpdate.push({
                docId: row.docId,
                rowIndex: row.rowIndex
            });
        }
    });

    onBulkStatusChange(itemsToUpdate, status);
    setSelectedRowIds(new Set()); // Clear selection after action
  };

  const isAllSelected = filteredRows.length > 0 && filteredRows.every(r => selectedRowIds.has(r.id));
  const isIndeterminate = selectedRowIds.size > 0 && !isAllSelected;

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const lengthColIdx = findLengthColumnIndex(displayHeaders);
    
    return filteredRows.reduce((acc, row) => {
        acc.count++;
        
        if (row.requiresGisFix) {
            acc.gisFixCount++;
        }

        if (lengthColIdx >= 0) {
            const val = parseLengthValue(row.values[lengthColIdx]);
            acc.totalMeters += val;
            if (row.status === RowStatus.UPLOADED) {
                acc.uploadedMeters += val;
            } else if (row.status === RowStatus.NEW || row.status === RowStatus.REVISION) {
                acc.todoMeters += val;
            }
        }
        return acc;
    }, { totalMeters: 0, uploadedMeters: 0, todoMeters: 0, count: 0, gisFixCount: 0 });
  }, [filteredRows, displayHeaders]);

  const revisionPercentage = stats.count > 0 ? (stats.gisFixCount / stats.count) * 100 : 0;

  const getRowClasses = (status: RowStatus, isSelected: boolean) => {
    let base = "transition-colors border-b border-slate-100 last:border-0";
    if (isSelected) base += " bg-blue-50/80"; // Highlight selected
    else {
        switch(status) {
            case RowStatus.UPLOADED: base += " bg-emerald-50/70 hover:bg-emerald-100/80"; break;
            case RowStatus.REVISION: base += " bg-orange-50/70 hover:bg-orange-100/80"; break;
            case RowStatus.UNUSABLE: base += " bg-red-50/70 hover:bg-red-100/80"; break;
            default: base += " hover:bg-blue-50";
        }
    }
    return base;
  };

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Top Action Bar */}
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

      {/* Filters Row */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            
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
                        Smart Merge
                    </div>
                </label>
            </div>
        </div>
      </div>

      {/* STATISTICS CARDS (Always visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Length */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-sm font-semibold text-slate-500">Celková délka</h3>
                <Ruler size={18} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800 relative z-10">
                {stats.totalMeters.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
            </p>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 z-0"></div>
        </div>

        {/* Uploaded (Done) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-200 relative overflow-hidden">
             <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-sm font-semibold text-emerald-600">Nahráno (GIS)</h3>
                <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 relative z-10">
                {stats.uploadedMeters.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
            </p>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-50 rounded-full opacity-50 z-0"></div>
        </div>

        {/* GIS Fixes Needed (Permanent Attribute) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-sm font-semibold text-orange-600">Nutná úprava v GIS</h3>
                <Wrench size={18} className="text-orange-500" />
            </div>
            <div className="relative z-10">
                <span className="text-2xl font-bold text-orange-700 block">
                    {stats.gisFixCount}
                </span>
                <span className="text-xs font-medium text-orange-600">
                    {revisionPercentage.toFixed(1)}% z celku
                </span>
            </div>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-orange-50 rounded-full opacity-50 z-0"></div>
        </div>

        {/* To Do / In Progress (Current Status) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-sm font-semibold text-amber-600">Zbývá (m)</h3>
                <Activity size={18} className="text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-700 relative z-10">
                {stats.todoMeters.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m
            </p>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-50 rounded-full opacity-50 z-0"></div>
        </div>

        {/* Count */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2 relative z-10">
                <h3 className="text-sm font-semibold text-slate-500">Počet úseků</h3>
                <Hash size={18} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800 relative z-10">
                {stats.count}
            </p>
             <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 z-0"></div>
        </div>
      </div>
      
      {/* View Toggle (Table vs Stats) */}
      <div className="flex justify-center border-b border-slate-200 mb-4">
        <div className="flex space-x-6">
            <button 
                onClick={() => setActiveTab('table')}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'table' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <List size={18} className="mr-2" />
                Seznam dat
            </button>
            <button 
                onClick={() => setActiveTab('stats')}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <BarChart3 size={18} className="mr-2" />
                Statistiky & Plán
            </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {filteredRows.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
                <Database size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-lg font-medium">Žádná data k zobrazení.</p>
                <p className="text-sm">Zkuste upravit filtry nebo nahrajte nový dokument.</p>
            </div>
            ) : (
            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                    <th className="px-4 py-3 w-10">
                         <div className="flex items-center">
                            <input 
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                checked={isAllSelected}
                                ref={input => {
                                    if (input) input.indeterminate = isIndeterminate;
                                }}
                                onChange={handleSelectAll}
                            />
                        </div>
                    </th>
                    {centerFilter === 'all' && (
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            Středisko
                        </th>
                    )}

                    {/* NOVÝ SLOUPEC: GIS check */}
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-16">
                        GIS?
                    </th>
                    
                    {displayHeaders.map((header, idx) => (
                        <th 
                        key={idx} 
                        className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                            header.toLowerCase().includes('datum') ? 'text-blue-700 bg-blue-50/50' : 'text-slate-700'
                        }`}
                        >
                        {header}
                        </th>
                    ))}

                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-48">
                        Stav / Akce
                    </th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {filteredRows.map((row) => {
                        const isSelected = selectedRowIds.has(row.id);
                        return (
                        <tr key={row.id} className={getRowClasses(row.status, isSelected)}>
                            <td className="px-4 py-3">
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                        checked={isSelected}
                                        onChange={() => handleSelectRow(row.id)}
                                    />
                                </div>
                            </td>
                            
                            {centerFilter === 'all' && (
                                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-medium">
                                    {row.originalDoc.data.center}
                                </td>
                            )}

                            {/* Tlačítko pro označení chyby v GISu */}
                            <td className="px-4 py-3 text-center">
                                <button 
                                    onClick={() => onGisFixToggle(row.docId, row.rowIndex)}
                                    title={row.requiresGisFix ? "Odznačit nutnost úpravy" : "Označit jako nutné upravit v GIS"}
                                    className={`p-1.5 rounded-full transition-all ${
                                        row.requiresGisFix 
                                            ? "bg-orange-100 text-orange-600 hover:bg-orange-200" 
                                            : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                                    }`}
                                >
                                    <Wrench size={16} fill={row.requiresGisFix ? "currentColor" : "none"} />
                                </button>
                            </td>

                            {displayHeaders.map((header, colIdx) => (
                                <td 
                                    key={colIdx} 
                                    className={`px-4 py-3 text-sm font-medium ${
                                        header.toLowerCase().includes('datum') ? 'text-blue-800 whitespace-nowrap font-bold' : 'text-slate-700'
                                    }`}
                                >
                                    {row.values[colIdx] || '-'}
                                </td>
                            ))}

                            {/* Stav a Akce */}
                            <td className="px-4 py-2 text-right whitespace-nowrap relative">
                                <div className="flex items-center justify-end gap-3">
                                    <StatusMenu 
                                        currentStatus={row.status} 
                                        onSelect={(newStatus) => onStatusChange(row.docId, row.rowIndex, newStatus)}
                                    />
                                    
                                    <button 
                                        onClick={() => onViewClick(row.originalDoc)}
                                        title="Zobrazit originál"
                                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
                </table>
            </div>
            )}
            
            {filteredRows.length > 0 && (
                <div className="bg-slate-50 p-3 text-xs text-slate-500 text-center border-t border-slate-200 flex justify-between items-center">
                    <span>Zobrazeno {filteredRows.length} řádků.</span>
                    {mergeDuplicates && (
                        <span className="text-blue-600 flex items-center bg-blue-50 px-2 py-1 rounded">
                            <Layers size={12} className="mr-1" />
                            Smart Merge aktivní
                        </span>
                    )}
                </div>
            )}
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

      {/* Floating Bulk Action Bar */}
      {selectedRowIds.size > 0 && activeTab === 'table' && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 p-2 z-50 flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
            <div className="pl-4 pr-2 flex items-center border-r border-slate-200">
                <span className="font-bold text-slate-800 mr-1">{selectedRowIds.size}</span>
                <span className="text-sm text-slate-500">vybráno</span>
                <button 
                    onClick={() => setSelectedRowIds(new Set())} 
                    className="ml-2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
                >
                    <X size={14} />
                </button>
            </div>
            
            <div className="flex items-center gap-2 pr-2">
                <button 
                    onClick={() => handleBulkAction(RowStatus.UPLOADED)}
                    className="flex items-center px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors"
                >
                    <CheckCircle2 size={16} className="mr-2" />
                    Nahráno
                </button>
                 <button 
                    onClick={() => handleBulkAction(RowStatus.REVISION)}
                    className="flex items-center px-3 py-2 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-sm font-semibold transition-colors"
                >
                    <Wrench size={16} className="mr-2" />
                    GIS Úprava
                </button>
                <button 
                    onClick={() => handleBulkAction(RowStatus.UNUSABLE)}
                    className="flex items-center px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                >
                    <Ban size={16} className="mr-2" />
                    Nepoužitelné
                </button>
                 <button 
                    onClick={() => handleBulkAction(RowStatus.NEW)}
                    className="flex items-center px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
                >
                    Reset
                </button>
            </div>
        </div>
      )}

      {showPlanModal && (
          <PlanModal 
            centers={centers}
            currentTargets={targets}
            onSave={onTargetsUpdate}
            onClose={() => setShowPlanModal(false)}
          />
      )}
    </div>
  );
};
