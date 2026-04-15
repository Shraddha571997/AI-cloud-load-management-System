import React, { useState, useEffect, useMemo } from 'react';
import { analyticsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth.jsx';
import { Card } from '../components/ui/Card';
import { Activity, ArrowUp, ArrowDown, Minus, Filter, ChevronUp, ChevronDown, Search, Download, FileText, ChevronLeft, ChevronRight, Calendar, Server } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom hook for debouncing search input
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const HistoryPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  
  // Advanced Filter States
  const [filterAction, setFilterAction] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 750);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loadRange, setLoadRange] = useState({ min: '', max: '' });
  
  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch whenever filters or pagination change
  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch, filterAction, dateRange.start, dateRange.end, loadRange.min, loadRange.max]);

  // Reset page to 1 if any filter (other than page itself) changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterAction, dateRange.start, dateRange.end, loadRange.min, loadRange.max, limit]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      const payload = {
        page,
        limit,
        scope: user?.role === 'admin' ? 'all' : 'user',
        action: filterAction,
        search: debouncedSearch,
        start_date: dateRange.start ? new Date(dateRange.start).toISOString() : '',
        end_date: dateRange.end ? new Date(dateRange.end).toISOString() : '',
        min_load: loadRange.min,
        max_load: loadRange.max
      };
      
      const res = await analyticsAPI.getHistory(payload);
      setData(res.data.items || []);
      const totalCount = res.data.total_count || 0;
      setTotalPages(Math.max(1, Math.ceil(totalCount / limit)));
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    const scope = user?.role === 'admin' ? 'all' : 'user';
    try {
      toast.loading(`Generating ${type.toUpperCase()}...`, { id: 'export' });
      const res = type === 'csv'
        ? await analyticsAPI.exportCSV({ scope })
        : await analyticsAPI.exportPDF({ scope });
      const mimeType = type === 'csv' ? 'text/csv' : 'application/pdf';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: mimeType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'csv' ? 'prediction_history.csv' : 'prediction_report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Delay revocation to ensure Chrome successfully triggers the download with the proper filename
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      
      toast.success(`${type.toUpperCase()} downloaded!`, { id: 'export' });
    } catch (err) {
      toast.error(`Export failed`, { id: 'export' });
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const displayData = useMemo(() => {
    let sorted = [...data];
    
    sorted.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [data, sortConfig]);

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-12 font-sans">
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/60 backdrop-blur-xl p-6 rounded-2xl border border-white/40 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 tracking-tight">
            Prediction History
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Review past AI load forecasts and assigned scaling actions.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          {/* Global Search */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search recommendation message or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-gray-700 bg-white shadow-sm placeholder:text-gray-400"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Action Bar */}
      <Card className="bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-sm p-4 rounded-xl flex flex-wrap gap-4 items-end">
        <div>
           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center"><Calendar size={12} className="mr-1"/> Date Range</label>
           <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
             <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 outline-none p-1 cursor-pointer" />
             <span className="text-gray-300 font-bold">-</span>
             <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 outline-none p-1 cursor-pointer" />
           </div>
        </div>
        
        <div>
           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center"><Activity size={12} className="mr-1"/> Load Range (%)</label>
           <div className="flex items-center gap-2 bg-gray-50 p-1.5 px-3 rounded-lg border border-gray-100">
             <input type="number" min="0" max="100" placeholder="Min" value={loadRange.min} onChange={e => setLoadRange({...loadRange, min: e.target.value})} className="w-16 bg-transparent border-b border-gray-300 text-sm text-center text-gray-700 focus:border-indigo-500 outline-none" />
             <span className="text-gray-300 font-bold">-</span>
             <input type="number" min="0" max="100" placeholder="Max" value={loadRange.max} onChange={e => setLoadRange({...loadRange, max: e.target.value})} className="w-16 bg-transparent border-b border-gray-300 text-sm text-center text-gray-700 focus:border-indigo-500 outline-none" />
           </div>
        </div>

        <div>
           <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 flex items-center"><Server size={12} className="mr-1"/> Action Type</label>
           <div className="bg-gray-50 rounded-lg border border-gray-100 pr-2">
            <select 
              value={filterAction} 
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 outline-none pl-3 pr-8 py-2 w-full cursor-pointer"
            >
              <option value="ALL">All Recorded Actions</option>
              <option value="SCALE UP">Scale Up Only</option>
              <option value="SCALE DOWN">Scale Down Only</option>
              <option value="NO ACTION">No Action Only</option>
            </select>
           </div>
        </div>
        
        <div className="ml-auto flex items-center">
           <button onClick={() => {
             setSearchQuery('');
             setDateRange({start:'', end:''});
             setLoadRange({min:'', max:''});
             setFilterAction('ALL');
           }} className="text-xs font-bold text-red-500 hover:text-red-700 underline underline-offset-4 decoration-red-200 transition-colors px-2 py-2">
             Clear All Filters
           </button>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="bg-white border border-gray-100 shadow-xl shadow-gray-200/40 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100/80">
                <SortHeader label="Timestamp" sortKey="timestamp" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Time Slot" sortKey="time_slot" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Predicted Load" sortKey="predicted_load" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Action" sortKey="action" config={sortConfig} onSort={handleSort} />
                <SortHeader label="Confidence" sortKey="confidence" config={sortConfig} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {displayData.map((row) => (
                <tr key={row._id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-bold border border-gray-200 shadow-sm">
                      Hour {row.time_slot}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-extrabold">
                    {row.predicted_load.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold shadow-sm ${
                      row.action === 'SCALE UP' ? 'bg-red-50 text-red-700 border border-red-100/50' :
                      row.action === 'SCALE DOWN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/50' : 
                      'bg-blue-50 text-blue-700 border border-blue-100/50'
                    }`}>
                      {row.action === 'SCALE UP' ? <ArrowUp size={14} /> : 
                       row.action === 'SCALE DOWN' ? <ArrowDown size={14} /> : 
                       <Minus size={14} />}
                      {row.action}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium">
                    {(row.confidence ? (row.confidence * 100) : 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {displayData.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Search size={32} className="opacity-40" />
                      <p>No prediction records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 0 && (
          <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 bg-gray-50/30 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              Showing page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
              <span className="mx-2 text-gray-300">|</span>
              <select 
                value={limit} 
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-md text-xs py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1.5 mx-1 hidden sm:flex">
                 {/* Smart rendering of page numbers around current page */}
                 {Array.from({ length: totalPages }).map((_, i) => {
                   const p = i + 1;
                   if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                     return (
                      <button 
                        key={p} 
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${page === p ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
                      >
                        {p}
                      </button>
                     );
                   }
                   if (p === page - 2 || p === page + 2) {
                     return <span key={p} className="text-gray-400 text-xs">...</span>;
                   }
                   return null;
                 })}
              </div>
              
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const SortHeader = ({ label, sortKey, config, onSort }) => {
  const isActive = config.key === sortKey;
  return (
    <th 
      className="px-6 py-4 text-xs font-bold tracking-wider text-gray-500 uppercase cursor-pointer hover:bg-gray-100/80 transition-colors select-none group"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        <span className={`flex flex-col opacity-40 group-hover:opacity-100 transition-opacity ${isActive ? '!opacity-100 text-indigo-600' : ''}`}>
          <ChevronUp size={10} className={`-mb-1 ${isActive && config.direction === 'asc' ? 'opacity-100 text-indigo-600' : 'opacity-50'}`} />
          <ChevronDown size={10} className={`${isActive && config.direction === 'desc' ? 'opacity-100 text-indigo-600' : 'opacity-50'}`} />
        </span>
      </div>
    </th>
  );
};

export default HistoryPage;
