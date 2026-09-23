import React, { useState } from 'react';
import EntryForm from '../components/EntryForm';
import HeaderBannerCard from '../components/HeaderBannerCard';
import { Truck, CheckCircle2, ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AddEntry() {
  const [lastSubmitted, setLastSubmitted] = useState(null);

  const handleSuccess = (record) => {
    setLastSubmitted(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* 1. Header Banner Card */}
      <HeaderBannerCard
        icon={Truck}
        title="Log Material Inward & Vehicle Transit"
        description="Record incoming shipment, gate arrival status, dispatch invoice, and upload bill copies to Google Drive"
        actionButton={
          <Link
            to="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Reports</span>
          </Link>
        }
      />

      {/* Success banner if just submitted */}
      {lastSubmitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-3 text-emerald-900 animate-scale-up">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs">
              <h4 className="font-bold text-sm text-emerald-950">
                Entry Logged Successfully (Sl.no #{lastSubmitted.slNo})
              </h4>
              <p className="mt-0.5 text-emerald-800">
                Firm: <span className="font-semibold">{lastSubmitted.firm}</span> | 
                Vendor: <span className="font-semibold">{lastSubmitted.vendorName}</span> | 
                Invoice: <span className="font-mono font-semibold">{lastSubmitted.invoiceNo || 'N/A'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/reports"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs transition"
            >
              View In Reports
            </Link>
            <button
              onClick={() => setLastSubmitted(null)}
              className="text-emerald-500 hover:text-emerald-700 text-xs px-1.5 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Form Card Surface */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 md:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Inward Form Fields
          </h3>
          <p className="text-xs text-slate-500">
            Please fill all mandatory fields marked with an asterisk (*).
          </p>
        </div>

        <EntryForm onSuccess={handleSuccess} />
      </div>

      {/* Enterprise Policy / Integration Info */}
      <div className="bg-slate-100/70 rounded-xl p-4 border border-slate-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-800 block">Automated Sheet Formatting & Drive Storage</span>
          <p>
            • Entries with status <strong>"Has reached"</strong> or <strong>"Material has reached"</strong> are automatically highlighted with a yellow background (<code className="font-mono text-slate-800">#FFFF00</code>) in the corresponding firm tab.
          </p>
          <p>
            • File attachments (PDF/Images) are renamed with firm, invoice, and vendor details and saved directly in your designated Google Drive folder with view access.
          </p>
        </div>
      </div>
    </div>
  );
}
