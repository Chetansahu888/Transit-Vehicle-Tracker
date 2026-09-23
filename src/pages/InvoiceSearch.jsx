import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { getByInvoice } from '../api/sheetApi';
import StatusBadge from '../components/StatusBadge';
import HeaderBannerCard from '../components/HeaderBannerCard';
import { 
  Search, 
  ExternalLink, 
  User, 
  Package, 
  Truck, 
  FileText, 
  Calendar, 
  Paperclip,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function InvoiceSearch() {
  const { records } = useData();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  // Sample invoices for quick test pills
  const sampleInvoices = records.filter(r => r.invoiceNo).slice(0, 4).map(r => r.invoiceNo);

  const handleSearch = async (targetQuery = query) => {
    const q = (targetQuery || '').trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setSearched(true);
    setResult(null);

    try {
      const res = await getByInvoice(q);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || `No record found with invoice: ${q}`);
      }
    } catch (err) {
      setError(err.message || 'Error occurred while searching for invoice.');
    } finally {
      setLoading(false);
    }
  };

  // If URL has ?inv= param (e.g. from top navbar search)
  useEffect(() => {
    const invFromUrl = searchParams.get('inv');
    if (invFromUrl) {
      setQuery(invFromUrl);
      handleSearch(invFromUrl);
    }
  }, [searchParams]);

  const handleQuickClick = (inv) => {
    setQuery(inv);
    handleSearch(inv);
  };

  const hasAttachment = Boolean(result && result.attachmentLink);
  const isImage = hasAttachment && (result.attachmentLink.match(/\.(jpg|jpeg|png|webp)($|\?)/i) || result.attachmentLink.includes('image/'));
  const isPdf = hasAttachment && (result.attachmentLink.toLowerCase().includes('.pdf') || result.attachmentLink.includes('application/pdf'));
  const isDriveLink = hasAttachment && result.attachmentLink.includes('drive.google.com');

  let embedUrl = result?.attachmentLink;
  if (isDriveLink) {
    if (result.attachmentLink.includes('/view')) {
      embedUrl = result.attachmentLink.replace(/\/view.*$/, '/preview');
    } else if (result.attachmentLink.includes('id=')) {
      const match = result.attachmentLink.match(/id=([^&]+)/);
      if (match && match[1]) {
        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* 1. Header Banner Card */}
      <HeaderBannerCard
        icon={Search}
        title="Cross-Firm Invoice Lookup & Document Viewer"
        description="Search across PMMPL, RKL, and PURAB sheets to verify arrival status and review attached invoices"
      />

      {/* 2. Search Container Surface */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }} 
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter exact Invoice No. (e.g. PMMPL/26-27/089, RKL/2026/452)"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm placeholder-slate-400 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg px-4 py-2 shadow-sm transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </form>

        {/* Quick test pills */}
        {sampleInvoices.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap pt-1">
            <span className="font-semibold text-slate-500">Quick Test:</span>
            {sampleInvoices.map((inv, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickClick(inv)}
                className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition"
              >
                {inv}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error State */}
      {searched && error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs animate-scale-up">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <div>
            <p className="font-bold">{error}</p>
            <p className="text-rose-600 mt-0.5">
              Please verify spelling or check across the firm sheets in Reports.
            </p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-scale-up">
          {/* Record Attributes Card */}
          <div className={`${hasAttachment ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Verified Invoice
                  </span>
                  <h3 className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {result.invoiceNo || 'No Invoice Number'}
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {result.firm}
                </span>
              </div>

              {/* Status */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Current Status
                </span>
                <StatusBadge status={result.vehicleStatus} />
              </div>

              {/* Attributes list */}
              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Vendor Name</span>
                    <span className="font-semibold text-slate-900">{result.vendorName || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Material</span>
                    <span className="font-medium text-slate-800">{result.material || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Truck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Vehicle Registration</span>
                    <span className="font-mono font-bold tracking-wider text-slate-900">
                      {result.vehicleNo || 'Not Provided'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Remark</span>
                    <span className="text-slate-600">{result.remark || '-'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] text-slate-400 block">Recorded At</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {result.createdAt || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {hasAttachment && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 truncate">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="truncate">{result.attachmentName || 'Attachment Available'}</span>
                  </div>
                  <a
                    href={result.attachmentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <span>Open Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Embedded Document Viewer Card */}
          {hasAttachment && (
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Document Attachment Viewer</span>
                </span>
                <a
                  href={result.attachmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                >
                  <span>Open Full View</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex-1 bg-slate-100/60 rounded-lg border border-slate-200 p-2 min-h-[440px] flex items-center justify-center overflow-hidden">
                {isImage ? (
                  <img
                    src={result.attachmentLink}
                    alt={result.attachmentName || 'Invoice preview'}
                    className="max-h-[480px] w-auto max-w-full object-contain rounded-md shadow-2xs bg-white"
                  />
                ) : isPdf || isDriveLink ? (
                  <iframe
                    src={embedUrl}
                    title="Invoice Document"
                    className="w-full h-[500px] rounded-md border-0 bg-white"
                  />
                ) : (
                  <div className="text-center p-6 text-xs text-slate-500">
                    <p className="mb-2">Preview cannot be embedded directly.</p>
                    <a
                      href={result.attachmentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-md font-semibold inline-flex items-center gap-1"
                    >
                      Download Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
