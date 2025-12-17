import React, { useState } from 'react';
import { AnnualTargets } from '../types';
import { Button } from './Button';
import { X, Target, Calendar } from 'lucide-react';

interface PlanModalProps {
  centers: string[];
  currentTargets: AnnualTargets;
  onSave: (targets: AnnualTargets) => void;
  onClose: () => void;
  initialYear?: string;
}

export const PlanModal: React.FC<PlanModalProps> = ({ centers, currentTargets, onSave, onClose, initialYear }) => {
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState<string>(
    initialYear && initialYear !== 'all' ? initialYear : currentYear
  );
  
  // Create a deep copy to edit
  const [tempTargets, setTempTargets] = useState<AnnualTargets>(JSON.parse(JSON.stringify(currentTargets)));

  const years = Array.from({length: 5}, (_, i) => (parseInt(currentYear) - 2 + i).toString()); // Last 2 years, current, next 2

  const handleChange = (center: string, value: string) => {
    const numValue = parseFloat(value);
    setTempTargets(prev => {
      const yearTargets = prev[selectedYear] || {};
      return {
        ...prev,
        [selectedYear]: {
          ...yearTargets,
          [center]: isNaN(numValue) ? 0 : numValue
        }
      };
    });
  };

  const handleSave = () => {
    onSave(tempTargets);
    onClose();
  };

  const getValue = (center: string) => {
    return tempTargets[selectedYear]?.[center] || 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Target className="mr-2 text-blue-600" />
            Nastavení ročních cílů
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
          <div className="flex items-center gap-3 mb-6 bg-blue-50 p-4 rounded-lg">
             <Calendar size={20} className="text-blue-600" />
             <span className="font-semibold text-slate-700">Plán pro rok:</span>
             <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="ml-auto bg-white border border-slate-300 rounded px-3 py-1 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
             >
                {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
             </select>
          </div>

          <p className="text-sm text-slate-500 mb-6">
            Zadejte <strong>celkový roční plán</strong> (v metrech) pro střediska na rok {selectedYear}.
          </p>

          <div className="space-y-4">
            {centers.length === 0 ? (
                <p className="text-center text-slate-400 py-4">Žádná střediska nebyla nalezena.</p>
            ) : (
                centers.map(center => (
                <div key={center} className="flex items-center justify-between gap-4">
                    <label className="text-sm font-medium text-slate-700 w-1/2 break-words">
                    {center}
                    </label>
                    <div className="relative w-1/2">
                    <input
                        type="number"
                        min="0"
                        step="1000"
                        value={getValue(center) || ''}
                        onChange={(e) => handleChange(center, e.target.value)}
                        placeholder="0"
                        className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">m</span>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSave}>Uložit cíle</Button>
        </div>
      </div>
    </div>
  );
};
