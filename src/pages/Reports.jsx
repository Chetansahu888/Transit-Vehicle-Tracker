import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { FIRMS, VEHICLE_STATUS_OPTIONS, getStatusCategory } from '../constants';
import DataTable from '../components/DataTable';
import HeaderBannerCard from '../components/HeaderBannerCard';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown
} from 'lucide-react';

export default function Reports() {
  const { records, firms = FIRMS, loading, vendorSuggestions } = useData();

  // Filters state
  const [firmFilter, setFirmFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [materialFilter, setMaterialFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const resetFilters = () => {
    setFirmFilter('ALL');
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setMaterialFilter('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (firmFilter !== 'ALL' && r.firm !== firmFilter) return false;
      if (statusFilter !== 'ALL' && (r.vehicleStatus || '') !== statusFilter) return false;
      if (vendorFilter !== 'ALL' && (r.vendorName || '') !== vendorFilter) return false;
      if (materialFilter && !((r.material || '').toLowerCase().includes(materialFilter.toLowerCase()))) {
        return false;
      }
      if (startDate) {
        const itemDate = (r.createdAt || '').slice(0, 10);
        if (itemDate && itemDate < startDate) return false;
      }
      if (endDate) {
        const itemDate = (r.createdAt || '').slice(0, 10);
        if (itemDate && itemDate > endDate) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches = 
          (r.invoiceNo || '').toLowerCase().includes(term) ||
          (r.vendorName || '').toLowerCase().includes(term) ||
          (r.material || '').toLowerCase().includes(term) ||
          (r.vehicleNo || '').toLowerCase().includes(term) ||
          (r.remark || '').toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [records, firmFilter, statusFilter, vendorFilter, materialFilter, startDate, endDate, searchTerm]);

  const summaryCounters = useMemo(() => {
    let reached = 0;
    let transit = 0;
    let pending = 0;

    filteredRecords.forEach(r => {
      const cat = getStatusCategory(r.vehicleStatus);
      if (cat === 'reached') reached++;
      else if (cat === 'transit') transit++;
      else if (cat === 'pending') pending++;
    });

    return {
      total: filteredRecords.length,
      reached,
      transit,
      pending
    };
  }, [filteredRecords]);

  const handleExportExcel = () => {
    exportToExcel(filteredRecords, firmFilter);
  };

  const handleExportPDF = () => {
    exportToPDF(filteredRecords, firmFilter);
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col flex-1">
      {/* 1. Header Banner Card with Export actions */}
      <HeaderBannerCard
        icon={FileSpreadsheet}
        title="Firm-wise Transit Reports & Export"
        description="Filter by firm, search movement history, and export verified records to Excel or PDF"
        statPills={[
          { label: 'Firm', value: firmFilter, active: true },
          { label: 'Filtered', value: filteredRecords.length }
        ]}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF (.pdf)</span>
            </button>
          </div>
        }
      />

      {/* 2. Summary Status Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Matching Entries
          </span>
          <span className="text-xl font-mono font-extrabold text-slate-900 mt-0.5 block">
            {summaryCounters.total}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Reached</span>
          </div>
          <span className="text-xl font-mono font-extrabold text-emerald-800 mt-0.5 block">
            {summaryCounters.reached}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            <span>In Transit</span>
          </div>
          <span className="text-xl font-mono font-extrabold text-amber-800 mt-0.5 block">
            {summaryCounters.transit}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Pending</span>
          </div>
          <span className="text-xl font-mono font-extrabold text-rose-800 mt-0.5 block">
            {summaryCounters.pending}
          </span>
        </div>
      </div>

      {/* 3. Input Fields & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Data Grid Filters
            </span>
          </div>

          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>

        {/* Global Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Quick search by Invoice No, Vendor, Material, Vehicle No, or Remark..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Multi-dropdown filter grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-0.5">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 block">
              Firm
            </label>
            <select
              value={firmFilter}
              onChange={(e) => setFirmFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
            >
              <option value="ALL">All Firms</option>
              {(firms && firms.length > 0 ? firms : FIRMS).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 block">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              <option value="ALL">All Statuses</option>
              {VEHICLE_STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 block">
              Vendor
            </label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            >
              <option value="ALL">All Vendors</option>
              {vendorSuggestions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 block">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1 block">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* 4. Enterprise Data Grid */}
      <DataTable
        records={filteredRecords}
        loading={loading}
        showFirmColumn={firmFilter === 'ALL'}
        itemsPerPage={15}
      />
    </div>
  );
}
