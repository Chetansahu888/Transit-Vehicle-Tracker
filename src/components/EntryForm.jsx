import React, { useState, useEffect, useRef } from 'react';
import { FIRMS, VEHICLE_STATUS_OPTIONS } from '../constants';
import { useData } from '../context/DataContext';
import { 
  Building2, 
  FileText, 
  User, 
  Package, 
  Truck, 
  AlertCircle, 
  CheckCircle, 
  UploadCloud, 
  X, 
  File, 
  Loader2,
  AlertTriangle
} from 'lucide-react';

export default function EntryForm({ initialData = null, initialFirm = '', isEdit = false, onSuccess, onCancel }) {
  const { 
    firms = FIRMS,
    handleAddRecord, 
    handleUpdateRecord, 
    checkDuplicateInvoice 
  } = useData();

  const defaultFirm = initialData?.firm || initialFirm || (firms && firms[0]) || 'PMMPL';

  const [firm, setFirm] = useState(defaultFirm);
  const [invoiceNo, setInvoiceNo] = useState(initialData?.invoiceNo || '');
  const [vendorName, setVendorName] = useState(initialData?.vendorName || '');
  const [material, setMaterial] = useState(initialData?.material || '');
  const [statusSelect, setStatusSelect] = useState(() => {
    if (!initialData?.vehicleStatus) return 'In transit';
    return VEHICLE_STATUS_OPTIONS.includes(initialData.vehicleStatus) 
      ? initialData.vehicleStatus 
      : 'Other (custom)';
  });
  const [customStatus, setCustomStatus] = useState(() => {
    if (initialData?.vehicleStatus && !VEHICLE_STATUS_OPTIONS.includes(initialData.vehicleStatus)) {
      return initialData.vehicleStatus;
    }
    return '';
  });
  const [vehicleNo, setVehicleNo] = useState(initialData?.vehicleNo || '');
  const [remark, setRemark] = useState(initialData?.remark || '');

  // File upload state
  const [fileObject, setFileObject] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(initialData?.attachmentLink || '');
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const invoiceRef = useRef(null);
  const vendorRef = useRef(null);
  const materialRef = useRef(null);
  const vehicleNoRef = useRef(null);
  const remarkRef = useRef(null);

  const handleEnterNext = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      }
    }
  };

  // Only sync edit data when isEdit is true and editing target changes
  const editId = isEdit ? (initialData?.slNo ?? initialData?.invoiceNo ?? 'editing') : null;
  useEffect(() => {
    if (isEdit && initialData) {
      setFirm(initialData.firm || defaultFirm);
      setInvoiceNo(initialData.invoiceNo || '');
      setVendorName(initialData.vendorName || '');
      setMaterial(initialData.material || '');
      if (VEHICLE_STATUS_OPTIONS.includes(initialData.vehicleStatus)) {
        setStatusSelect(initialData.vehicleStatus);
        setCustomStatus('');
      } else {
        setStatusSelect('Other (custom)');
        setCustomStatus(initialData.vehicleStatus || '');
      }
      setVehicleNo(initialData.vehicleNo || '');
      setRemark(initialData.remark || '');
      setPreviewUrl(initialData.attachmentLink || '');
    }
  }, [editId, isEdit]);

  const handleVehicleNoChange = (e) => {
    setVehicleNo(e.target.value.toUpperCase());
  };

  const isDuplicateInvoice = checkDuplicateInvoice(
    firm, 
    invoiceNo, 
    isEdit ? initialData?.slNo : null
  );

  const handleFileChange = (e) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('File size exceeds 10 MB limit.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only PDF, JPG, and PNG files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setFileObject({
        base64: base64,
        mimeType: file.type,
        fileName: file.name,
        size: file.size
      });
      setPreviewUrl(base64);
    };
    reader.onerror = () => {
      setFileError('Error reading file.');
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setFileObject(null);
    setPreviewUrl('');
    setFileError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const finalStatus = statusSelect === 'Other (custom)' ? customStatus.trim() : statusSelect;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert('Vendor Name is required.');
      return;
    }
    if (!material.trim()) {
      alert('Material description is required.');
      return;
    }
    if (!finalStatus) {
      alert('Vehicle Status is required.');
      return;
    }

    setSubmitting(true);

    const payload = {
      firm,
      invoiceNo: invoiceNo.trim(),
      vendorName: vendorName.trim(),
      material: material.trim(),
      vehicleStatus: finalStatus,
      vehicleNo: vehicleNo.trim(),
      remark: remark.trim(),
      file: fileObject,
      attachmentLink: fileObject ? '' : (initialData?.attachmentLink || ''),
      attachmentName: fileObject ? fileObject.fileName : (initialData?.attachmentName || '')
    };

    if (isEdit && initialData) {
      payload.slNo = initialData.slNo;
      const res = await handleUpdateRecord(payload);
      setSubmitting(false);
      if (res.success && onSuccess) {
        onSuccess(res.data);
      }
    } else {
      const res = await handleAddRecord(payload);
      setSubmitting(false);
      if (res.success) {
        setInvoiceNo('');
        setVendorName('');
        setMaterial('');
        setStatusSelect('In transit');
        setCustomStatus('');
        setVehicleNo('');
        setRemark('');
        removeSelectedFile();
        if (onSuccess) onSuccess(res.data);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Duplicate invoice warning */}
      {isDuplicateInvoice && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Duplicate Warning: Invoice <strong>{invoiceNo}</strong> already exists in {firm}.</span>
        </div>
      )}

      {/* Row 1: Firm & Invoice No */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="entryFirm" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
            Firm <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="entryFirm"
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              disabled={isEdit}
              className={`w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition ${
                isEdit ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {(firms && firms.length > 0 ? firms : FIRMS).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label htmlFor="entryInvoiceNo" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
            Invoice No.
          </label>
          <div className="relative">
            <input
              id="entryInvoiceNo"
              ref={invoiceRef}
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              onKeyDown={(e) => handleEnterNext(e, vendorRef)}
              placeholder="e.g. ARPPL/26-27/136"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 2: Vendor Name & Material Description (Clean direct text inputs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="entryVendorName" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
            Vendor Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="entryVendorName"
              ref={vendorRef}
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              onKeyDown={(e) => handleEnterNext(e, materialRef)}
              placeholder="Vendor / Supplier name"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <User className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label htmlFor="entryMaterial" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
            Material Description <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="entryMaterial"
              ref={materialRef}
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              onKeyDown={(e) => handleEnterNext(e, vehicleNoRef)}
              placeholder="Material details / grade"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <Package className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 3: Status & Vehicle Number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="entryVehicleStatus" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
            Vehicle Status <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-1.5">
            <select
              id="entryVehicleStatus"
              value={statusSelect}
              onChange={(e) => setStatusSelect(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              {VEHICLE_STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            {statusSelect === 'Other (custom)' && (
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="Enter custom status"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            )}
          </div>
        </div>

        <div>
          <label htmlFor="entryVehicleNo" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
            Vehicle Registration No.
          </label>
          <div className="relative">
            <input
              id="entryVehicleNo"
              ref={vehicleNoRef}
              type="text"
              value={vehicleNo}
              onChange={handleVehicleNoChange}
              onKeyDown={(e) => handleEnterNext(e, remarkRef)}
              placeholder="e.g. GJ25U9491"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 font-mono font-bold tracking-wider focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <Truck className="w-4 h-4 text-slate-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Row 4: Remark */}
      <div>
        <label htmlFor="entryRemark" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block cursor-pointer">
          Remark / Transit Notes
        </label>
        <textarea
          id="entryRemark"
          ref={remarkRef}
          rows={2}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Notes, driver contact, gate slip number..."
          className="w-full bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs px-3 py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition resize-y"
        />
      </div>

      {/* Row 5: Attachment Box */}
      <div>
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 block">
          Bill / Document Attachment
        </label>

        {previewUrl ? (
          <div className="flex items-center justify-between p-2.5 bg-indigo-50/40 border border-indigo-200 rounded-lg">
            <div className="flex items-center gap-2.5 min-w-0">
              {fileObject?.mimeType === 'application/pdf' || previewUrl.toLowerCase().includes('.pdf') ? (
                <div className="w-8 h-8 rounded bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <File className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {fileObject?.fileName || initialData?.attachmentName || 'Attachment Available'}
                </p>
                <p className="text-[10px] text-indigo-600 font-medium">
                  {fileObject ? `${(fileObject.size / 1024).toFixed(1)} KB` : 'Attached'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={removeSelectedFile}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/20 rounded-lg p-3.5 text-center cursor-pointer transition flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-indigo-600"
          >
            <UploadCloud className="w-4 h-4" />
            <span className="font-semibold">Upload Invoice PDF or Image (max 10MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {fileError && (
          <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {fileError}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg px-4 py-2 shadow-2xs transition disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isEdit ? 'Update Record' : 'Save Entry'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
