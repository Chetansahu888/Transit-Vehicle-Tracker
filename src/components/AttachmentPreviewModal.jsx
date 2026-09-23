import React, { useEffect } from 'react';
import { X, ExternalLink, Download, FileText, Image as ImageIcon } from 'lucide-react';

export default function AttachmentPreviewModal({ isOpen, onClose, attachmentLink, attachmentName, recordInfo }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !attachmentLink) return null;

  const isBase64 = attachmentLink.startsWith('data:');
  const isPdf = attachmentLink.toLowerCase().includes('.pdf') || attachmentLink.includes('application/pdf');
  const isImage = attachmentLink.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i) || attachmentLink.includes('image/');
  const isDriveLink = attachmentLink.includes('drive.google.com');

  let embedUrl = attachmentLink;
  if (isDriveLink) {
    if (attachmentLink.includes('/view')) {
      embedUrl = attachmentLink.replace(/\/view.*$/, '/preview');
    } else if (attachmentLink.includes('id=')) {
      const match = attachmentLink.match(/id=([^&]+)/);
      if (match && match[1]) {
        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {attachmentName || 'Invoice Attachment Document'}
              </h3>
              {recordInfo && (
                <p className="text-xs text-slate-500 truncate">
                  Invoice: <span className="font-mono font-semibold text-slate-700">{recordInfo.invoiceNo || 'N/A'}</span> • {recordInfo.vendorName} ({recordInfo.firm})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachmentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition"
              title="Open document in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Tab</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-slate-100/60 p-4 overflow-auto flex items-center justify-center min-h-[400px]">
          {isImage ? (
            <img
              src={attachmentLink}
              alt={attachmentName || 'Attachment preview'}
              className="max-h-[66vh] w-auto max-w-full object-contain rounded-lg shadow-xs border border-slate-200 bg-white"
            />
          ) : isPdf || isDriveLink ? (
            <iframe
              src={embedUrl}
              title={attachmentName || 'PDF Viewer'}
              className="w-full h-[66vh] rounded-lg border border-slate-200 bg-white shadow-2xs"
              allow="autoplay"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-xl shadow-2xs border border-slate-200 max-w-md">
              <FileText className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900 mb-1">{attachmentName || 'Document File'}</h4>
              <p className="text-xs text-slate-500 mb-4">
                Preview not directly embeddable for this format. You can download or view it in Google Drive.
              </p>
              <a
                href={attachmentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Download / Open
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Google Drive Cloud Storage</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
