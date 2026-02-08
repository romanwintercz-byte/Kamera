
import React, { useMemo } from 'react';
import { DocumentRecord, AnnualTargets, RowStatus } from '../types';
import { Ruler, TrendingUp, AlertCircle, CheckCircle2, PieChart, Wrench, Ban, Clock } from 'lucide-react';

interface StatisticsPanelProps {
  documents: DocumentRecord[];
  targets: AnnualTargets;
  yearFilter: string; // 'all' or specific year like '2023'
  monthFilter: string; // 'all' or '1'-'12'
  mergeDuplicates: boolean;
}

// Re-use helper functions logic
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
    
    // Prioritní hledání "ZKONTROLOVÁNO"
    const priorityIdx = lowerHeaders.findIndex(h => h === 'zkontrolováno' || h === 'zkontrolovano');
    if (priorityIdx !== -1) return priorityIdx;

    return lowerHeaders.findIndex(h => 
        h.includes('délka') || h.includes('delka') || h.includes('metr') || h.includes('metráž') || h.includes('length') || h === 'm'
    );
};

const parseLengthValue = (str: string | undefined): number => {
    if (!str) return 0;
    // Odstranit mezery a nečíselné znaky
    const cleanStr = str.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
    const normalized = cleanStr.replace(',', '.');
    const val = parseFloat(normalized);
    return isNaN(val) ? 0 : val;
};

const MONTH_NAMES_SHORT = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ 
  documents, 
  targets, 
  yearFilter, 
  monthFilter,
  mergeDuplicates 
}) => {

  const { data, statusCounts } = useMemo(() => {
    const data: Record<string, Record<number, number>> = {};
    const statusCounts: Record<string, { total: number, uploaded: number, gisIssues: number }> = {}; 
    const seenSignatures = new Set<string>();

    const centersFromTargets = new Set<string>();
    Object.values(targets).forEach(yearData => {
        Object.keys(yearData).forEach(c => centersFromTargets.add(c));
    });
    
    const allCenters = new Set<string>([...centersFromTargets, ...documents.map(d => d.data.center)]);
    
    allCenters.forEach(c => {
        if (!c || c === 'Neurčeno') return;
        data[c] = {};
        for(let m=1; m<=12; m++) data[c][m] = 0;
        
        statusCounts[c] = {
            total: 0,
            uploaded: 0,
            gisIssues: 0
        };
    });

    documents.forEach(doc => {
        const center = doc.data.center;
        if (!center || center === 'Neurčeno') return;

        const dateColIdx = findDateColumnIndex(doc.data.tableHeaders);
        const lenColIdx = findLengthColumnIndex(doc.data.tableHeaders);

        doc.data.tableRows.forEach((row, idx) => {
            const signature = [center, ...row.values.map(v => v?.trim().toLowerCase())].join('|');
            if (mergeDuplicates) {
                if (seenSignatures.has(signature)) return;
                seenSignatures.add(signature);
            }

            let month = 0;
            let year = 0;
            
            if (dateColIdx >= 0 && row.values[dateColIdx]) {
                const d = new Date(row.values[dateColIdx]);
                if (!isNaN(d.getTime())) {
                    month = d.getMonth() + 1;
                    year = d.getFullYear();
                }
            } 
            
            if (month === 0) {
                 const d = new Date(doc.data.date);
                 if (!isNaN(d.getTime())) {
                    month = d.getMonth() + 1;
                    year = d.getFullYear();
                 }
            }

            if (yearFilter !== 'all' && year.toString() !== yearFilter) return;
            if (monthFilter !== 'all' && month.toString() !== monthFilter) return;

            if (lenColIdx >= 0) {
                const meters = parseLengthValue(row.values[lenColIdx]);
                if (!data[center]) {
                    data[center] = {};
                    for(let m=1; m<=12; m++) data[center][m] = 0;
                }
                data[center][month] = (data[center][month] || 0) + meters;
            }

            if (statusCounts[center]) {
                statusCounts[center].total++;
                if (row.status === RowStatus.UPLOADED) {
                    statusCounts[center].uploaded++;
                }
                if (row.requiresGisFix) {
                    statusCounts[center].gisIssues++;
                }
            }
        });
    });

    return { data, statusCounts };
  }, [documents, targets, yearFilter, monthFilter, mergeDuplicates]);

  const activeCenters = Object.keys(data).sort();

  const getFilteredPlanTotal = (center: string) => {
     let annualTarget = 0;

     if (yearFilter !== 'all') {
         annualTarget = targets[yearFilter]?.[center] || 0;
     } else {
         Object.keys(targets).forEach(y => {
             annualTarget += (targets[y]?.[center] || 0);
         });
     }
     
     if (monthFilter !== 'all') {
         return annualTarget / 12;
     }
     
     return annualTarget;
  };
  
  const getFilteredActualTotal = (center: string) => {
    if (monthFilter !== 'all') {
        return data[center][parseInt(monthFilter)] || 0;
    }
    return Object.values(data[center]).reduce((a: number, b: number) => a + b, 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. SECTION: Center Overview */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Ruler className="mr-2 text-blue-600" size={20} />
            Přehled plnění plánu podle středisek
            {yearFilter !== 'all' ? <span className="ml-2 text-slate-400 font-normal">({yearFilter})</span> : <span className="ml-2 text-slate-400 font-normal">(všechny roky)</span>}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCenters.map(center => {
                const plan = getFilteredPlanTotal(center);
                const actual = getFilteredActualTotal(center);
                const percent = plan > 0 ? (actual / plan) * 100 : 0;
                const isSuccess = percent >= 100;
                
                return (
                    <div key={center} className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-700">{center}</h4>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                {percent.toFixed(0)} %
                            </span>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Realita:</span>
                                <span className="font-semibold text-slate-900">{new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(actual)} m</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Plán ({monthFilter === 'all' ? 'rok' : 'měsíc'}):</span>
                                <span className="font-medium text-slate-600">{new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(plan)} m</span>
                            </div>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                                className={`h-2.5 rounded-full ${isSuccess ? 'bg-emerald-500' : (percent < 50 ? 'bg-red-500' : 'bg-amber-500')}`} 
                                style={{ width: `${Math.min(percent, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

       {/* 2. SECTION: Quality & Status Statistics */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <PieChart className="mr-2 text-blue-600" size={20} />
            Kvalita dat a stavy
        </h3>
        <div className="overflow-x-auto">
             <table className="min-w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <th className="p-3 text-left font-semibold">Středisko</th>
                        <th className="p-3 text-right font-semibold">Celkem záznamů</th>
                        <th className="p-3 text-right font-semibold text-emerald-600">Hotovo (Nahráno)</th>
                        <th className="p-3 text-right font-semibold text-orange-600">Chybovost (GIS Úpravy)</th>
                        <th className="p-3 text-left font-semibold w-1/3">Podíl chybovosti</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                     {activeCenters.map(center => {
                         const stats = statusCounts[center] || { total: 0, uploaded: 0, gisIssues: 0 };
                         if (stats.total === 0) return null;

                         const pctGisIssues = (stats.gisIssues / stats.total) * 100;
                         const pctUploaded = (stats.uploaded / stats.total) * 100;

                         return (
                             <tr key={center} className="hover:bg-slate-50">
                                 <td className="p-3 font-medium text-slate-700">{center}</td>
                                 <td className="p-3 text-right text-slate-600 font-medium">
                                     {stats.total}
                                 </td>
                                 <td className="p-3 text-right font-medium text-emerald-600">
                                     {stats.uploaded} <span className="text-xs text-slate-400">({pctUploaded.toFixed(0)}%)</span>
                                 </td>
                                 <td className="p-3 text-right font-bold text-orange-700">
                                     {stats.gisIssues}
                                 </td>
                                 <td className="p-3">
                                     <div className="flex items-center gap-2">
                                        <div className="flex-1 h-3 rounded-full overflow-hidden bg-slate-100">
                                            <div className="bg-orange-500 h-full" style={{ width: `${pctGisIssues}%` }} title="Chybovost" />
                                        </div>
                                        <span className="text-xs font-bold text-orange-600 w-10 text-right">{pctGisIssues.toFixed(1)}%</span>
                                     </div>
                                 </td>
                             </tr>
                         );
                     })}
                </tbody>
             </table>
        </div>
       </div>

      {/* 3. SECTION: Monthly Matrix */}
      {monthFilter === 'all' && (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-600" size={20} />
            Měsíční detail (Metráž)
        </h3>
        
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-500">
                        <th className="p-3 text-left font-semibold">Středisko</th>
                        {MONTH_NAMES_SHORT.map(m => (
                            <th key={m} className="p-2 text-right font-semibold w-20">{m}</th>
                        ))}
                        <th className="p-3 text-right font-bold text-slate-700 bg-slate-100">Celkem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {activeCenters.map(center => {
                         const yearlyTotal = Object.values(data[center]).reduce((a: number, b: number) => a + b, 0);
                         
                         let annualTarget = 0;
                         if (yearFilter !== 'all') {
                             annualTarget = targets[yearFilter]?.[center] || 0;
                         } else {
                             const currentYear = new Date().getFullYear().toString();
                             annualTarget = targets[currentYear]?.[center] || 0;
                         }
                         
                         const monthlyTarget = annualTarget / 12;

                         return (
                            <tr key={center} className="hover:bg-blue-50/30">
                                <td className="p-3 font-medium text-slate-700">{center}</td>
                                {MONTH_NAMES_SHORT.map((_, idx) => {
                                    const monthNum = idx + 1;
                                    const val = data[center][monthNum];
                                    
                                    const metTarget = monthlyTarget > 0 && val >= monthlyTarget;
                                    const closeToTarget = monthlyTarget > 0 && val >= (monthlyTarget * 0.8);
                                    
                                    // Set text color for the cell based on target achievement
                                    let textColor = "text-slate-400";
                                    if (val > 0) textColor = metTarget ? "text-emerald-600 font-bold" : (closeToTarget ? "text-amber-600" : "text-red-600");
                                    if (yearFilter === 'all' && val > 0) textColor = "text-slate-700 font-medium";

                                    return (
                                        <td key={idx} className={`p-2 text-right ${textColor}`}>
                                            {val > 0 ? Number(val / 1000).toFixed(1) + 'k' : '-'}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-right font-bold text-slate-800 bg-slate-50">
                                    {/* Use Intl.NumberFormat to handle Czech number formatting safely */}
                                    {new Intl.NumberFormat('cs-CZ').format(yearlyTotal)}
                                </td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </div>
        <div className="mt-2 text-xs text-slate-400 text-right">
            * Hodnoty v tabulce jsou v tisících metrů (k). {yearFilter !== 'all' && "Zelená = Splněn měsíční průměr."}
        </div>
      </div>
      )}
    </div>
  );
};
