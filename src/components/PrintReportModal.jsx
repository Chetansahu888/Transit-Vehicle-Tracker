import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Check, 
  Building2 
} from 'lucide-react';
import { formatEntryDate, getStatusCategory } from '../constants';
import { exportToPDF } from '../utils/exportUtils';

export default function PrintReportModal({ isOpen, onClose, records, activeFirm }) {
  const [orientation, setOrientation] = useState('landscape');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Direct print via invisible print iframe with executive-grade corporate styling
  const handleDirectPrint = () => {
    setIsPrinting(true);

    const generatedDate = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const docMonth = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' }).toUpperCase();

    // Summary counts for KPI strip
    const totalCount = records.length;
    const reachedCount = records.filter(r => getStatusCategory(r.vehicleStatus) === 'reached').length;
    const transitCount = records.filter(r => getStatusCategory(r.vehicleStatus) === 'transit').length;
    const pendingCount = records.filter(r => getStatusCategory(r.vehicleStatus) === 'pending').length;

    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'fixed';
    printWindow.style.top = '-10000px';
    printWindow.style.left = '-10000px';
    printWindow.style.width = '1200px';
    printWindow.style.height = '1200px';
    document.body.appendChild(printWindow);

    const rowsHtml = records.map((r, i) => {
      const cat = getStatusCategory(r.vehicleStatus);
      const isReached = cat === 'reached';

      let badgeClass = 'badge-neutral';
      let dotColor = '#64748b';
      if (cat === 'reached') {
        badgeClass = 'badge-success';
        dotColor = '#059669';
      } else if (cat === 'transit') {
        badgeClass = 'badge-transit';
        dotColor = '#2563eb';
      } else if (cat === 'pending') {
        badgeClass = 'badge-danger';
        dotColor = '#dc2626';
      }

      return `
        <tr class="${isReached ? 'row-reached' : ''}">
          <td class="text-center col-num">${r.slNo || i + 1}</td>
          <td class="text-center col-date">${formatEntryDate(r.createdAt)}</td>
          <td class="text-center"><span class="firm-badge">${r.firm || ''}</span></td>
          <td class="col-invoice">${r.invoiceNo || '-'}</td>
          <td class="col-vendor">${r.vendorName || '-'}</td>
          <td class="col-material">${r.material || '-'}</td>
          <td>
            <span class="status-chip ${badgeClass}">
              <span class="status-dot" style="background-color: ${dotColor};"></span>
              <span>${r.vehicleStatus || '-'}</span>
            </span>
          </td>
          <td class="text-center col-vehicle">${r.vehicleNo || '-'}</td>
          <td class="col-remark">${r.remark || '-'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>VEHICLE TRACKING REPORT</title>
          <style>
            @page {
              size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 10px;
              line-height: 1.35;
            }

            /* Executive Masthead */
            .header-wrap {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding-bottom: 10px;
              border-bottom: 2px solid #0f172a;
              margin-bottom: 8px;
            }
            .header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand-logo {
              width: 44px;
              height: 44px;
              object-fit: contain;
              image-rendering: -webkit-optimize-contrast;
            }
            .title-area {
              display: flex;
              flex-direction: column;
            }
            .title-sub {
              font-size: 8.5px;
              font-weight: 700;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              color: #475569;
              margin-bottom: 2px;
            }
            .title-main {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: -0.3px;
              color: #0f172a;
              margin: 0;
              line-height: 1.1;
            }
            
            /* Meta Details Card */
            .meta-card {
              display: grid;
              grid-template-columns: auto auto;
              column-gap: 16px;
              row-gap: 3px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 12px;
              font-size: 9px;
            }
            .meta-item {
              display: flex;
              gap: 5px;
            }
            .meta-label {
              color: #64748b;
              font-weight: 500;
            }
            .meta-val {
              color: #0f172a;
              font-weight: 700;
            }

            /* KPI Summary Bar */
            .kpi-bar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              background: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 5px;
              padding: 6px 12px;
              margin-bottom: 10px;
              font-size: 9px;
            }
            .kpi-group {
              display: flex;
              align-items: center;
              gap: 18px;
            }
            .kpi-chip {
              display: flex;
              align-items: center;
              gap: 5px;
              font-weight: 600;
              color: #334155;
            }
            .kpi-chip strong {
              font-weight: 800;
              color: #0f172a;
            }
            .kpi-dot {
              width: 7px;
              height: 7px;
              border-radius: 50%;
              display: inline-block;
            }

            /* Table Styles */
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9.5px;
            }
            th {
              background-color: #0f172a !important;
              color: #ffffff !important;
              font-size: 8.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.6px;
              padding: 7px 6px;
              border: 1px solid #0f172a;
              text-align: left;
              vertical-align: middle;
            }
            td {
              padding: 6px 6px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            tbody tr:nth-child(even) td {
              background-color: #fbfcfd;
            }
            tbody tr.row-reached td {
              background-color: #fefce8 !important;
            }

            /* Column Specifics */
            .text-center { text-align: center; }
            .col-num {
              font-weight: 600;
              color: #64748b;
              font-variant-numeric: tabular-nums;
            }
            .col-invoice {
              font-weight: 700;
              color: #0f172a;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .col-vendor {
              font-weight: 600;
              color: #1e293b;
            }
            .col-material {
              color: #334155;
            }
            .col-vehicle {
              font-weight: 700;
              color: #0f172a;
              letter-spacing: 0.4px;
              font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .col-date {
              font-variant-numeric: tabular-nums;
              color: #334155;
              font-size: 8.5px;
              white-space: nowrap;
            }
            .col-remark {
              color: #475569;
              font-size: 8.5px;
            }

            .firm-badge {
              font-weight: 700;
              font-size: 8.5px;
              padding: 2px 5px;
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              border-radius: 3px;
              color: #1e293b;
              display: inline-block;
            }

            /* Refined Status Chips */
            .status-chip {
              display: inline-flex;
              align-items: center;
              gap: 4.5px;
              padding: 2.5px 6px;
              border-radius: 4px;
              font-size: 8.5px;
              font-weight: 600;
              line-height: 1;
              white-space: nowrap;
            }
            .status-dot {
              width: 5px;
              height: 5px;
              border-radius: 50%;
              flex-shrink: 0;
            }
            .badge-success {
              background: #ecfdf5 !important;
              color: #047857 !important;
              border: 1px solid #a7f3d0;
            }
            .badge-transit {
              background: #eff6ff !important;
              color: #1d4ed8 !important;
              border: 1px solid #bfdbfe;
            }
            .badge-danger {
              background: #fff1f2 !important;
              color: #b91c1c !important;
              border: 1px solid #fecdd3;
            }
            .badge-neutral {
              background: #f8fafc !important;
              color: #475569 !important;
              border: 1px solid #e2e8f0;
            }

            /* Authorization / Sign-Off Section */
            .sign-off-section {
              margin-top: 24px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .sign-box {
              border: 1px dashed #cbd5e1;
              background: #fafafa;
              border-radius: 4px;
              padding: 8px 10px;
              text-align: center;
            }
            .sign-title {
              font-size: 8.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
              margin-bottom: 24px;
            }
            .sign-line {
              border-top: 1px solid #94a3b8;
              margin-bottom: 3px;
            }
            .sign-role {
              font-size: 8px;
              color: #64748b;
              font-weight: 500;
            }

            /* Footer */
            .doc-footer {
              margin-top: 14px;
              padding-top: 6px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              font-size: 8px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <!-- Corporate Header -->
          <div class="header-wrap">
            <div class="header-left">
              <img src="/logo.png" class="brand-logo" alt="Logo" />
              <div class="title-area">
                <span class="title-sub">Transit Logistics & Material Inward System</span>
                <h1 class="title-main">VEHICLE TRACKING REPORT</h1>
              </div>
            </div>
            <div class="meta-card">
              <div class="meta-item"><span class="meta-label">Target Firm:</span> <span class="meta-val">${activeFirm}</span></div>
              <div class="meta-item"><span class="meta-label">Generated:</span> <span class="meta-val">${generatedDate}</span></div>
              <div class="meta-item"><span class="meta-label">Total Entries:</span> <span class="meta-val">${totalCount} Vehicles</span></div>
              <div class="meta-item"><span class="meta-label">Document Ref:</span> <span class="meta-val">TVT-${docMonth}</span></div>
            </div>
          </div>

          <!-- KPI Summary Strip -->
          <div class="kpi-bar">
            <div class="kpi-group">
              <div class="kpi-chip">
                <span>Total Inward:</span>
                <strong>${totalCount}</strong>
              </div>
              <div class="kpi-chip">
                <span class="kpi-dot" style="background: #059669;"></span>
                <span>Reached Plant:</span>
                <strong style="color: #047857;">${reachedCount}</strong>
              </div>
              <div class="kpi-chip">
                <span class="kpi-dot" style="background: #2563eb;"></span>
                <span>In Transit:</span>
                <strong style="color: #1d4ed8;">${transitCount}</strong>
              </div>
              <div class="kpi-chip">
                <span class="kpi-dot" style="background: #dc2626;"></span>
                <span>Pending / Delayed:</span>
                <strong style="color: #b91c1c;">${pendingCount}</strong>
              </div>
            </div>
            <div style="font-size: 8px; color: #64748b; font-weight: 500;">
              All times reported in IST (UTC+05:30)
            </div>
          </div>

          <!-- Main Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">S No</th>
                <th style="width: 105px; text-align: center;">Entry Date</th>
                <th style="width: 48px; text-align: center;">Firm</th>
                <th style="width: 95px;">Invoice No</th>
                <th>Vendor Name</th>
                <th>Material</th>
                <th style="width: 110px;">Status</th>
                <th style="width: 85px; text-align: center;">Vehicle No</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Official Sign-off Block -->
          <div class="sign-off-section">
            <div class="sign-box">
              <div class="sign-title">Prepared By</div>
              <div class="sign-line"></div>
              <div class="sign-role">Logistics Desk Clerk / Entry Operator</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Verified By</div>
              <div class="sign-line"></div>
              <div class="sign-role">Security Gate / Weighbridge Officer</div>
            </div>
            <div class="sign-box">
              <div class="sign-title">Authorized By</div>
              <div class="sign-line"></div>
              <div class="sign-role">Plant Logistics / Stores Manager</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="doc-footer">
            <span>Transit Vehicle Tracker ERP &bull; Confidential &bull; For Internal Plant Logistics Only</span>
            <span>Document generated on ${generatedDate}</span>
          </div>
        </body>
      </html>
    `;

    const doc = printWindow.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    printWindow.onload = () => {
      setTimeout(() => {
        setIsPrinting(false);
        printWindow.contentWindow.focus();
        printWindow.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(printWindow);
          onClose();
        }, 1000);
      }, 350);
    };
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    await exportToPDF(records, activeFirm, orientation);
    setIsExporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-5 animate-scale-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Print Report Setup
              </h3>
              <p className="text-[11px] text-slate-500">
                Configure orientation for VEHICLE TRACKING REPORT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope info */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Target Firm: <strong>{activeFirm}</strong></span>
          </div>
          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
            {records.length} Entries
          </span>
        </div>

        {/* Orientation Selector */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 block">
            Select Orientation
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Landscape */}
            <div
              onClick={() => setOrientation('landscape')}
              className={`p-3.5 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                orientation === 'landscape'
                  ? 'bg-indigo-50/60 border-indigo-600 text-indigo-950 shadow-2xs ring-1 ring-indigo-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-5 border-2 border-current rounded-xs flex items-center justify-center text-[9px] font-bold">
                  —
                </div>
                {orientation === 'landscape' && <Check className="w-4 h-4 text-indigo-600" />}
              </div>
              <span className="text-xs font-bold block">Landscape</span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Wide table (Recommended)
              </span>
            </div>

            {/* Portrait */}
            <div
              onClick={() => setOrientation('portrait')}
              className={`p-3.5 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
                orientation === 'portrait'
                  ? 'bg-indigo-50/60 border-indigo-600 text-indigo-950 shadow-2xs ring-1 ring-indigo-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-5 h-7 border-2 border-current rounded-xs flex items-center justify-center text-[9px] font-bold">
                  |
                </div>
                {orientation === 'portrait' && <Check className="w-4 h-4 text-indigo-600" />}
              </div>
              <span className="text-xs font-bold block">Portrait</span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Standard vertical page
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExporting || isPrinting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
              title="Download as PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              disabled={isExporting || isPrinting}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg px-4 py-2 shadow-2xs transition disabled:opacity-50"
              title="Open browser print popup"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Opening...' : 'Print Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
