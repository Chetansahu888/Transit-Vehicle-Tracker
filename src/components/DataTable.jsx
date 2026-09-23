import React, { useState } from 'react';
import StatusBadge from './StatusBadge';
import AttachmentPreviewModal from './AttachmentPreviewModal';
import EntryForm from './EntryForm';
import { useData } from '../context/DataContext';
import { 
  Paperclip, 
  Edit3, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  X,
  Layers
} from 'lucide-react';
import { getStatusCategory, formatEntryDate } from '../constants';

export default function DataTable({ 
  records = [], 
  loading = false, 
  showFirmColumn = true,
  itemsPerPage = 15,
  compact = false 
}) {
  const { handleDeleteRecord } = useData();

  // State for preview modal
  const [previewItem, setPreviewItem] = useState(null);

  // State for edit modal
  const [editingItem, setEditingItem] = useState(null);

  // State for delete modal
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(records.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = records.slice(startIndex, startIndex + itemsPerPage);

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    await handleDeleteRecord(deletingItem.firm, deletingItem.slNo);
    setIsDeleting(false);
    setDeletingItem(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-2xs">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-slate-100 rounded w-1/4"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
          <div className="h-10 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Records Found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No matching material entries found for the selected firm or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-slate-100 z-20 border-b border-slate-300 text-[11px] font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                <th className="sticky left-0 bg-slate-100 z-30 py-2.5 px-4 w-14 text-center border-r border-slate-200">S No</th>
                <th className="py-2.5 px-4 min-w-[145px]">Entry Date</th>
                {showFirmColumn && <th className="py-2.5 px-4 w-20">Firm</th>}
                <th className="py-2.5 px-4 min-w-[130px]">Invoice No.</th>
                <th className="py-2.5 px-4 min-w-[180px]">Vendor Name</th>
                <th className="py-2.5 px-4 min-w-[180px]">Material</th>
                <th className="py-2.5 px-4 min-w-[160px]">Vehicle Status</th>
                <th className="py-2.5 px-4 min-w-[120px]">Vehicle No.</th>
                {!compact && <th className="py-2.5 px-4 min-w-[200px]">Remark</th>}
                <th className="py-2.5 px-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.map((r, idx) => {
                const category = getStatusCategory(r.vehicleStatus);
                const isReached = category === 'reached';

                return (
                  <tr
                    key={`${r.firm}-${r.slNo}-${idx}`}
                    className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 group ${
                      isReached ? 'bg-amber-50/25' : ''
                    }`}
                  >
                    {/* Sticky First Column: S No */}
                    <td className={`sticky left-0 z-10 py-3 px-4 text-center font-mono font-medium text-xs text-slate-500 border-r border-slate-200 ${
                      isReached ? 'bg-amber-50/40 group-hover:bg-amber-50/60' : 'bg-white group-hover:bg-slate-50'
                    }`}>
                      {startIndex + idx + 1}
                    </td>

                    {/* Entry Date */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {formatEntryDate(r.createdAt)}
                    </td>

                    {/* Firm */}
                    {showFirmColumn && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          {r.firm}
                        </span>
                      </td>
                    )}

                    {/* Invoice No. */}
                    <td className="py-3 px-4 font-mono text-sm whitespace-nowrap">
                      {r.attachmentLink ? (
                        <button
                          type="button"
                          onClick={() => setPreviewItem(r)}
                          className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left group"
                          title="Click to preview attached bill"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{r.invoiceNo || 'View File'}</span>
                        </button>
                      ) : (
                        <span className="font-semibold text-slate-800">
                          {r.invoiceNo || <span className="text-slate-400 italic font-sans font-normal text-xs">None</span>}
                        </span>
                      )}
                    </td>

                    {/* Vendor Name */}
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      <span className="line-clamp-2">{r.vendorName}</span>
                    </td>

                    {/* Material */}
                    <td className="py-3 px-4 text-sm text-slate-600">
                      <span className="line-clamp-2">{r.material}</span>
                    </td>

                    {/* Vehicle Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={r.vehicleStatus} />
                    </td>

                    {/* Vehicle No. */}
                    <td className="py-3 px-4 font-mono font-bold tracking-wider text-xs text-slate-900 whitespace-nowrap">
                      {r.vehicleNo || <span className="text-slate-400 font-sans font-normal italic">-</span>}
                    </td>

                    {/* Remark */}
                    {!compact && (
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                        <span className="line-clamp-2">{r.remark || '-'}</span>
                      </td>
                    )}



                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingItem(r)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Entry"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(r)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination controls */}
        {totalPages > 1 && (
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div>
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">{Math.min(startIndex + itemsPerPage, records.length)}</span> of{' '}
              <span className="font-semibold text-slate-800">{records.length}</span> entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-semibold px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attachment Preview Modal */}
      {previewItem && (
        <AttachmentPreviewModal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          attachmentLink={previewItem.attachmentLink}
          attachmentName={previewItem.attachmentName}
          recordInfo={previewItem}
        />
      )}

      {/* Edit Entry Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-xl p-5 animate-scale-up max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Entry #{editingItem.slNo} ({editingItem.firm})
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <EntryForm
              initialData={editingItem}
              isEdit={true}
              onSuccess={() => setEditingItem(null)}
              onCancel={() => setEditingItem(null)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Enterprise Dialog Pattern) */}
      {deletingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 animate-scale-up">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to permanently delete record{' '}
              <span className="font-mono font-bold text-slate-900">
                #{deletingItem.slNo} ({deletingItem.invoiceNo || 'No Invoice'})
              </span>{' '}
              for firm <span className="font-bold text-slate-900">{deletingItem.firm}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
