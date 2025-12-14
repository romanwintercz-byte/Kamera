import React, { useMemo } from 'react';
import { DocumentRecord, MonthlyTargets, RowStatus } from '../types';
import { Ruler, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StatisticsPanelProps {
  documents: DocumentRecord[];
  targets: MonthlyTargets;
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
    return lowerHeaders.findIndex(h => 
        h.includes('délka') || h.includes('delka') || h.includes('metr') || h.includes('metráž') || h.includes('length') || h === 'm'
    );
};

const parseLengthValue = (str: string | undefined): number => {
    if (!str) return 0;
    const normalized = str.replace(',', '.');
    const match = normalized.match(/[\d.]+/);
    if (!match) return 0;
    const val = parseFloat(match[0]);
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

  const stats = useMemo(() => {
    // 1. Prepare data structure: Center -> Month -> Meters
    const data: Record<string, Record<number, number>> = {};
    const seenSignatures = new Set<string>();

    // Init centers from targets or docs to ensure all show up
    const allCenters = new Set<string>([...Object.keys(targets), ...documents.map(d => d.data.center)]);
    allCenters.forEach(c => {
        if (!c || c === 'Neurčeno') return;
        data[c] = {};
        for(let m=1; m<=12; m++) data[c][m] = 0;
    });

    documents.forEach(doc => {
        const center = doc.data.center;
        if (!center || center === 'Neurčeno') return;

        const dateColIdx = findDateColumnIndex(doc.data.tableHeaders);
        const lenColIdx = findLengthColumnIndex(doc.data.tableHeaders);
        if (lenColIdx === -1) return;

        doc.data.tableRows.forEach((row, idx) => {
            // Smart Merge Check
            const signature = [center, ...row.values.map(v => v?.trim().toLowerCase())].join('|');
            if (mergeDuplicates) {
                if (seenSignatures.has(signature)) return;
                seenSignatures.add(signature);
            }

            // Parse Date
            let month = 0;
            let year = 0;
            
            // Try row date first
            if (dateColIdx >= 0 && row.values[dateColIdx]) {
                const d = new Date(row.values[dateColIdx]);
                if (!isNaN(d.getTime())) {
                    month = d.getMonth() + 1;
                    year = d.getFullYear();
                }
            } 
            
            // Fallback to document date
            if (month === 0) {
                 const d = new Date(doc.data.date);
                 if (!isNaN(d.getTime())) {
                    month = d.getMonth() + 1;
                    year = d.getFullYear();
                 }
            }

            // Apply Year Filter
            if (yearFilter !== 'all' && year.toString() !== yearFilter) return;

            // Add meters
            const meters = parseLengthValue(row.values[lenColIdx]);
            
            if (!data[center]) { // Should be init above but just in case
                data[center] = {};
                for(let m=1; m<=12; m++) data[center][m] = 0;
            }
            data[center][month] = (data[center][month] || 0) + meters;
        });
    });

    return data;
  }, [documents, targets, yearFilter, mergeDuplicates]);

  const activeCenters = Object.keys(stats).sort();

  // Helper to get plan
  const getPlan = (center: string, monthIdx: number): number => {
      // monthIdx 1-12
      // If filtering by specific month, plan is simple target
      // If filtering by year, plan is simple target * 1 (for that month cell)
      return targets[center] || 0;
  };

  const getFilteredPlanTotal = (center: string) => {
     const monthlyTarget = targets[center] || 0;
     if (monthFilter !== 'all') return monthlyTarget;
     // If all months selected, plan is 12 * monthly target
     return monthlyTarget * 12;
  };
  
  const getFilteredActualTotal = (center: string) => {
    if (monthFilter !== 'all') {
        return stats[center][parseInt(monthFilter)] || 0;
    }
    // Sum all months
    return Object.values(stats[center]).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. SECTION: Center Overview (Cards) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Ruler className="mr-2 text-blue-600" size={20} />
            Přehled plnění plánu podle středisek
            {yearFilter !== 'all' && <span className="ml-2 text-slate-400 font-normal">({yearFilter})</span>}
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
                                <span className="font-semibold text-slate-900">{actual.toLocaleString('cs-CZ')} m</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Plán:</span>
                                <span className="font-medium text-slate-600">{plan.toLocaleString('cs-CZ')} m</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
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

      {/* 2. SECTION: Monthly Matrix (Only if looking at all months) */}
      {monthFilter === 'all' && (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <TrendingUp className="mr-2 text-blue-600" size={20} />
            Měsíční detail
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
                         const yearlyTotal = Object.values(stats[center]).reduce((a, b) => a + b, 0);
                         const target = targets[center] || 0;

                         return (
                            <tr key={center} className="hover:bg-blue-50/30">
                                <td className="p-3 font-medium text-slate-700">{center}</td>
                                {MONTH_NAMES_SHORT.map((_, idx) => {
                                    const monthNum = idx + 1;
                                    const val = stats[center][monthNum];
                                    const metTarget = target > 0 && val >= target;
                                    const closeToTarget = target > 0 && val >= (target * 0.8);
                                    
                                    let textColor = "text-slate-400"; // Empty
                                    if (val > 0) textColor = metTarget ? "text-emerald-600 font-bold" : (closeToTarget ? "text-amber-600" : "text-red-600");

                                    return (
                                        <td key={idx} className={`p-2 text-right ${textColor}`}>
                                            {val > 0 ? (val / 1000).toFixed(1) + 'k' : '-'}
                                        </td>
                                    );
                                })}
                                <td className="p-3 text-right font-bold text-slate-800 bg-slate-50">
                                    {yearlyTotal.toLocaleString('cs-CZ')}
                                </td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </div>
        <div className="mt-2 text-xs text-slate-400 text-right">
            * Hodnoty v tabulce jsou v tisících metrů (k). Zelená = Splněn měsíční cíl.
        </div>
      </div>
      )}
    </div>
  );
};
