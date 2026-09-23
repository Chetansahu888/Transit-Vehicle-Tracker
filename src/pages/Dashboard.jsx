import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { VEHICLE_STATUS_OPTIONS, getStatusCategory } from '../constants';
import KpiCard from '../components/KpiCard';
import DataTable from '../components/DataTable';
import EntryForm from '../components/EntryForm';
import { 
  Truck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Paperclip, 
  Search, 
  Filter, 
  RotateCcw, 
  X,
  Plus
} from 'lucide-react';

export default function Dashboard({ isAddModalOpen, setIsAddModalOpen }) {
  const { 
    records, 
    loading, 
    selectedFirm, 
    vendorSuggestions 
  } = useData();

  // Filters state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter records by selected firm & filters
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Firm scope
      if (selectedFirm !== 'ALL' && (r.firm || '').toUpperCase() !== selectedFirm.toUpperCase()) return false;

      // 2. Status
      if (statusFilter !== 'ALL' && (r.vehicleStatus || '') !== statusFilter) return false;

      // 3. Vendor
      if (vendorFilter !== 'ALL' && (r.vendorName || '') !== vendorFilter) return false;

      // 4. Date range
      if (startDate) {
        const itemDate = (r.createdAt || '').slice(0, 10);
        if (itemDate && itemDate < startDate) return false;
      }
      if (endDate) {
        const itemDate = (r.createdAt || '').slice(0, 10);
        if (itemDate && itemDate > endDate) return false;
      }

      // 5. Global search (Invoice, Vendor, Material, Vehicle No, Remark)
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
  }, [records, selectedFirm, statusFilter, vendorFilter, startDate, endDate, searchTerm]);

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const scopeRecords = selectedFirm === 'ALL' 
      ? records 
      : records.filter(r => r.firm === selectedFirm);

    let reached = 0;
    let transit = 0;
    let pending = 0;
    let withAttachment = 0;

    scopeRecords.forEach(r => {
      const cat = getStatusCategory(r.vehicleStatus);
      if (cat === 'reached') reached++;
      else if (cat === 'transit') transit++;
      else if (cat === 'pending') pending++;

      if (r.attachmentLink && r.attachmentLink.trim()) {
        withAttachment++;
      }
    });

    return {
      total: scopeRecords.length,
      reached,
      transit,
      pending,
      withAttachment
    };
  }, [records, selectedFirm]);

  const resetFilters = () => {
    setStatusFilter('ALL');
    setVendorFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-3.5 animate-fade-in flex flex-col flex-1">
      {/* 1. Sleek High-Density KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          title="Total Shipments"
          value={kpiStats.total}
          icon={Truck}
          color="indigo"
        />
        <KpiCard
          title="Gate Reached"
          value={kpiStats.reached}
          icon={CheckCircle2}
          color="emerald"
        />
        <KpiCard
          title="In Transit"
          value={kpiStats.transit}
          icon={Clock}
          color="amber"
        />
        <KpiCard
          title="Pending / Delayed"
          value={kpiStats.pending}
          icon={AlertCircle}
          color="rose"
        />
        <KpiCard
          title="With Attachments"
          value={kpiStats.withAttachment}
          icon={Paperclip}
          color="blue"
        />
      </div>

      {/* 2. Unified Enterprise Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Global Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Invoice No, Vendor Name, Material, Vehicle No, or Remark..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder-slate-400 pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
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

          {/* Quick Filter Reset */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-mono font-semibold text-slate-500">
              {filteredRecords.length} / {kpiStats.total} records
            </span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="ALL">All Statuses</option>
              {VEHICLE_STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="ALL">All Vendors</option>
              {vendorSuggestions.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="From Date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
            />
          </div>

          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="To Date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-2.5 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. Enterprise Data Grid Table */}
      <DataTable
        records={filteredRecords}
        loading={loading}
        showFirmColumn={selectedFirm === 'ALL'}
        itemsPerPage={15}
      />

      {/* 4. Sleek Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-xl p-5 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  New Material & Vehicle Entry
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <EntryForm
              initialFirm={selectedFirm === 'ALL' ? 'PMMPL' : selectedFirm}
              isEdit={false}
              onSuccess={() => setIsAddModalOpen(false)}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
