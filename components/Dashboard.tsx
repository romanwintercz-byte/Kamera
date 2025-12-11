import React from 'react';
import { DocumentRecord } from '../types';
import { FileText, Calendar, Tag, Trash2, Search, Plus, MapPin, Filter } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  documents: DocumentRecord[];
  onAddClick: () => void;
  onDeleteClick: (id: string) => void;
  onViewClick: (doc: DocumentRecord) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ documents, onAddClick, onDeleteClick, onViewClick }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [centerFilter, setCenterFilter] = React.useState<string>('all');

  const categories = Array.from(new Set(documents.map(d => d.data.category))).filter(Boolean);
  const centers = Array.from(new Set(documents.map(d => d.data.center))).filter(Boolean);

  const filteredDocs = documents.filter(doc => {
    const lowerTerm = searchTerm.toLowerCase();
    
    // 1. Prohledávání metadat (titulek, shrnutí, středisko)
    const matchesMeta = 
      doc.data.title.toLowerCase().includes(lowerTerm) || 
      doc.data.summary.toLowerCase().includes(lowerTerm) ||
      (doc.data.center && doc.data.center.toLowerCase().includes(lowerTerm));

    // 2. Prohledávání obsahu tabulky (ulice, čísla šachet, atd.)
    const matchesTableData = doc.data.tableRows?.some(row => 
      row.values.some(val => val && val.toLowerCase().includes(lowerTerm))
    );

    const matchesSearch = matchesMeta || matchesTableData;
    const matchesCategory = categoryFilter === 'all' || doc.data.category === categoryFilter;
    const matchesCenter = centerFilter === 'all' || doc.data.center === centerFilter;
    
    return matchesSearch && matchesCategory && matchesCenter;
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Celkem dokumentů</p>
          <p className="text-3xl font-bold text-slate-800">{documents.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Poslední přidání</p>
          <p className="text-3xl font-bold text-slate-800">
            {documents.length > 0 
              ? new Date(documents[0].uploadDate).toLocaleDateString('cs-CZ') 
              : '-'}
          </p>
        </div>
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-start justify-center">
          <Button onClick={onAddClick} className="w-full h-full text-lg">
            <Plus className="mr-2" size={20} />
            Přidat dokument
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto flex-1">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Hledat (ulice, šachta, ID...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-400"
            />
          </div>

          {/* Center Filter (Dropdown) */}
          <div className="relative w-full sm:max-w-[200px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Všechna střediska</option>
              {centers.map(center => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter size={14} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Category Filter (Buttons) */}
        <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
          <button 
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${categoryFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Vše
          </button>
          {categories.map(cat => (
             <button 
             key={cat}
             onClick={() => setCategoryFilter(cat)}
             className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${categoryFilter === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
           >
             {cat}
           </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg">Žádné dokumenty nenalezeny</p>
            {documents.length === 0 ? (
              <p className="text-sm mt-2">Začněte nahráním prvního PDF.</p>
            ) : (
              <p className="text-sm mt-2">Zkuste změnit vyhledávací výraz nebo filtry.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-slate-50 transition-colors group">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 cursor-pointer" onClick={() => onViewClick(doc)}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {doc.data.category}
                      </span>
                      {doc.data.center && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <MapPin size={10} className="mr-1" />
                          {doc.data.center}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {new Date(doc.data.date).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {doc.data.title}
                    </h3>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-3">
                      {doc.data.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {doc.data.tags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          <Tag size={10} className="mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:self-center">
                    <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => onDeleteClick(doc.id)}>
                      <Trash2 size={18} />
                    </Button>
                    <Button variant="secondary" onClick={() => onViewClick(doc)}>
                      Detail
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
