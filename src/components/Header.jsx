import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { FIRMS } from '../constants';
import { 
  Truck, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  FileDown,
  Printer,
  Link2,
  Copy,
  Check,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { getScriptUrl, setCustomScriptUrl } from '../api/sheetApi';

export default function Header({ onOpenAddModal, onExportExcel, onExportPDF }) {
  const { 
    isLive, 
    refreshing, 
    secondsUntilRefresh, 
    loadData, 
    selectedFirm, 
    setSelectedFirm,
    records,
    firms = FIRMS,
    showToast
  } = useData();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { success: boolean, msg: string }
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setUrlInput(getScriptUrl() || '');
  }, [showConfigModal]);

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/Code.gs');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
      if (showToast) showToast('Copied!', 'Code.gs copied to clipboard. Ready to paste in Apps Script.', 'success');
    } catch (e) {
      alert('Could not copy automatically. You can find Code.gs in your project apps-script/ folder.');
    }
  };

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();

    if (!cleanUrl) {
      setCustomScriptUrl('');
      setTestStatus({ success: true, msg: 'Switched to local Demo Mode.' });
      loadData(true);
      setTimeout(() => setShowConfigModal(false), 1200);
      return;
    }

    if (!cleanUrl.startsWith('https://script.google.com/macros/s/')) {
      setTestStatus({
        success: false,
        msg: 'Please enter a valid Google Apps Script Web App URL (starts with https://script.google.com/macros/s/.../exec)'
      });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);

    try {
      const testUrl = `${cleanUrl}?action=list&firm=ALL&_t=${Date.now()}`;
      const res = await fetch(testUrl);
      const data = await res.json();

      if (data && data.success) {
        setCustomScriptUrl(cleanUrl);
        setTestStatus({
          success: true,
          msg: `Connected successfully! Found ${data.count || 0} records in Google Sheet.`
        });
        loadData(true);
        if (showToast) showToast('Google Sheet Connected', 'Live synchronization active', 'success');
        setTimeout(() => setShowConfigModal(false), 1500);
      } else {
        setTestStatus({
          success: false,
          msg: data?.error || 'Apps Script responded with error. Verify deployment settings.'
        });
      }
    } catch (err) {
      setTestStatus({
        success: false,
        msg: `Connection failed: ${err.message}. Ensure "Who has access" is set to "Anyone" in Web App deployment.`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between shadow-2xs shrink-0 z-30">
        {/* Left: Brand + Firm Switcher Tabs */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Company Logo"
              className="w-8 h-8 object-contain shrink-0 rounded-md"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                Transit Vehicle Tracker
              </span>
            </div>
          </div>

          {/* Firm Tabs directly in Navbar */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setSelectedFirm('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                selectedFirm === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Firms
            </button>
            {(firms && firms.length > 0 ? firms : FIRMS).map(firm => {
              const count = records.filter(r => r.firm === firm).length;
              return (
                <button
                  key={firm}
                  onClick={() => setSelectedFirm(firm)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                    selectedFirm === firm
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{firm}</span>
                  <span className="text-[10px] font-mono opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Actions: Add Entry, Exports, Sync, Refresh */}
        <div className="flex items-center gap-2.5">
          {/* Primary Add Entry Button */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg px-3.5 py-1.5 shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Entry</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={onExportExcel}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg shadow-2xs transition"
            title="Export Excel (.xlsx)"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>

          {/* Print / PDF Report */}
          <button
            onClick={onExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg shadow-2xs transition"
            title="Print / PDF Report"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print / PDF</span>
          </button>



          {/* Refresh Button */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`p-1.5 rounded-lg border text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border-slate-200 transition ${
              refreshing ? 'cursor-not-allowed opacity-50' : ''
            }`}
            title="Sync latest data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* Google Sheet Connection Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg p-5 animate-scale-up space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Link Google Sheet Database</h3>
                  <p className="text-[11px] text-slate-500">Live 2-way sync with your Google Spreadsheet</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Current Status Badge */}
            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isLive 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                {isLive ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold">
                  {isLive ? 'Currently Connected & Synchronized' : 'Running in Interactive Demo Mode'}
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/80 border border-current">
                {isLive ? 'LIVE' : 'DEMO'}
              </span>
            </div>

            {/* Setup Form */}
            <form onSubmit={handleTestAndSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Apps Script Web App URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Paste the deployment URL from your Google Apps Script. Leave blank to revert to Demo mode.
                </span>
              </div>

              {testStatus && (
                <div className={`p-2.5 rounded-lg text-xs font-medium border ${
                  testStatus.success 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {testStatus.msg}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  title="Copy the backend Code.gs script to paste in Google Apps Script"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Code.gs Copied!' : 'Copy Code.gs'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg px-4 py-2 shadow-2xs transition disabled:opacity-50"
                  >
                    {isTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick 3-Step Setup Guide */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
              <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                Quick Setup (1 Minute):
              </span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                <li>Open your Google Sheet &rarr; Click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>.</li>
                <li>Click <strong>Copy Code.gs</strong> above and paste it into the Apps Script editor.</li>
                <li>Click <strong>Deploy &rarr; New deployment</strong> &rarr; Select <strong>Web app</strong> &rarr; Set <em>Who has access: Anyone</em> &rarr; Click <strong>Deploy</strong> &rarr; Copy URL & paste here!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
