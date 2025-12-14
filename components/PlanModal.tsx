import React, { useState } from 'react';
import { MonthlyTargets } from '../types';
import { Button } from './Button';
import { X, Target } from 'lucide-react';

interface PlanModalProps {
  centers: string[];
  currentTargets: MonthlyTargets;
  onSave: (targets: MonthlyTargets) => void;
  onClose: () => void;
}

export const PlanModal: React.FC<PlanModalProps> = ({ centers, currentTargets, onSave, onClose }) => {
  const [tempTargets, setTempTargets] = useState<MonthlyTargets>(currentTargets);

  const handleChange = (center: string, value: string) => {
    const numValue = parseFloat(value);
    setTempTargets(prev => ({
      ...prev,
      [center]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleSave = () => {
    onSave(tempTargets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Target className="mr-2 text-blue-600" />
            Nastavení cílů
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500 mb-6">
            Zadejte cílovou měsíční metráž pro každé středisko. Tato hodnota se použije pro výpočet plnění plánu ve statistikách.
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
                        step="100"
                        value={tempTargets[center] || ''}
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

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button onClick={handleSave}>Uložit cíle</Button>
        </div>
      </div>
    </div>
  );
};
