import { INITIAL_DEMO_RECORDS } from '../constants';

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL ? import.meta.env.VITE_SCRIPT_URL.trim() : '';

const STORAGE_KEY = 'transit_vehicle_tracking_mock_db';

// Helper to get local mock data from localStorage
function getLocalRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
      return INITIAL_DEMO_RECORDS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed reading localStorage, using initial mock:', e);
    return INITIAL_DEMO_RECORDS;
  }
}

// Helper to save local mock data
function saveLocalRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed saving to localStorage:', e);
  }
}

export function getScriptUrl() {
  try {
    const localUrl = localStorage.getItem('transit_custom_script_url');
    if (localUrl && localUrl.trim().startsWith('http')) {
      return localUrl.trim();
    }
  } catch (e) {
    // ignore
  }
  return import.meta.env.VITE_SCRIPT_URL ? import.meta.env.VITE_SCRIPT_URL.trim() : '';
}

export function setCustomScriptUrl(url) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('transit_custom_script_url');
    } else {
      localStorage.setItem('transit_custom_script_url', url.trim());
    }
  } catch (e) {
    console.error('Failed to save custom script URL:', e);
  }
}

export function isLiveBackendConfigured() {
  const url = getScriptUrl();
  return Boolean(url && url.startsWith('http'));
}

/**
 * Fetch records for a firm or ALL firms
 */
export async function listRecords(firm = 'ALL') {
  if (isLiveBackendConfigured()) {
    try {
      const scriptUrl = getScriptUrl();
      const url = `${scriptUrl}?action=list&firm=${encodeURIComponent(firm)}&_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.success) {
        return { 
          success: true, 
          isLive: true, 
          data: json.data || [], 
          firms: Array.isArray(json.firms) && json.firms.length > 0 ? json.firms : null 
        };
      }
      throw new Error(json?.error || 'Apps Script returned error');
    } catch (err) {
      console.warn('Apps Script fetch failed, falling back to local storage:', err);
      // Fallback
    }
  }

  // Local storage mock fallback
  const records = getLocalRecords();
  const filtered = firm === 'ALL' ? records : records.filter(r => (r.firm || '').toUpperCase() === firm.toUpperCase());
  return {
    success: true,
    isLive: false,
    data: filtered,
    firms: null
  };
}

/**
 * Fetch dynamic firm names from the Master sheet
 */
export async function fetchFirms() {
  if (isLiveBackendConfigured()) {
    try {
      const scriptUrl = getScriptUrl();
      const url = `${scriptUrl}?action=getFirms&_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.success && Array.isArray(json.firms) && json.firms.length > 0) {
        return json.firms;
      }
    } catch (e) {
      console.warn('Failed fetching firms from Master sheet:', e);
    }
  }
  return null;
}

/**
 * Find record by invoice number across all firms
 */
export async function getByInvoice(invoiceNo) {
  if (!invoiceNo) return { success: false, error: 'Invoice number required' };

  if (isLiveBackendConfigured()) {
    try {
      const scriptUrl = getScriptUrl();
      const url = `${scriptUrl}?action=getByInvoice&invoice=${encodeURIComponent(invoiceNo)}&_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.success) {
        return { success: true, isLive: true, data: json.data };
      }
      throw new Error(json?.error || 'Record not found in Apps Script');
    } catch (err) {
      console.warn('Apps Script invoice lookup failed, checking local records:', err);
    }
  }

  // Local storage fallback
  const records = getLocalRecords();
  const cleanTarget = invoiceNo.trim().toLowerCase();
  const found = records.find(r => (r.invoiceNo || '').toLowerCase() === cleanTarget);

  if (found) {
    return { success: true, isLive: false, data: found };
  }
  return { success: false, error: `No record found with invoice: ${invoiceNo}` };
}

/**
 * Add a new record
 */
export async function addRecord(payload) {
  if (isLiveBackendConfigured()) {
    try {
      const cleanPayload = { ...payload };
      if (cleanPayload.file && cleanPayload.file.base64 && typeof cleanPayload.file.base64 === 'string') {
        const raw = cleanPayload.file.base64;
        cleanPayload.file = {
          ...cleanPayload.file,
          base64: raw.includes('base64,') ? raw.split('base64,')[1] : raw
        };
      }

      const res = await fetch(getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'add', ...cleanPayload })
      });
      const json = await res.json();
      if (json && json.success) {
        return { success: true, isLive: true, data: json.data };
      }
      return { success: false, error: json?.error || 'Google Sheet add operation failed' };
    } catch (err) {
      console.error('Apps Script add failed:', err);
      return { success: false, error: err.message || 'Error communicating with Google Sheets' };
    }
  }

  // Local mock add
  const records = getLocalRecords();
  const firmRecords = records.filter(r => r.firm === payload.firm);
  const maxSl = firmRecords.reduce((max, r) => Math.max(max, Number(r.slNo) || 0), 0);
  const nextSl = maxSl + 1;

  let attachmentLink = payload.attachmentLink || '';
  let attachmentName = payload.attachmentName || '';

  // If local base64 file provided, create a blob / data URL preview
  if (payload.file && payload.file.base64) {
    attachmentLink = payload.file.base64;
    attachmentName = payload.file.fileName || 'uploaded_document';
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const newRecord = {
    slNo: nextSl,
    invoiceNo: payload.invoiceNo || '',
    vendorName: payload.vendorName || '',
    material: payload.material || '',
    vehicleStatus: payload.vehicleStatus || '',
    vehicleNo: (payload.vehicleNo || '').toUpperCase().replace(/\s+/g, ''),
    remark: payload.remark || '',
    attachmentLink,
    attachmentName,
    firm: payload.firm,
    createdAt: now,
    updatedAt: now
  };

  const updatedRecords = [newRecord, ...records];
  saveLocalRecords(updatedRecords);

  return { success: true, isLive: false, data: newRecord };
}

/**
 * Update an existing record
 */
export async function updateRecord(payload) {
  if (isLiveBackendConfigured()) {
    try {
      const cleanPayload = { ...payload };
      if (cleanPayload.file && cleanPayload.file.base64 && typeof cleanPayload.file.base64 === 'string') {
        const raw = cleanPayload.file.base64;
        cleanPayload.file = {
          ...cleanPayload.file,
          base64: raw.includes('base64,') ? raw.split('base64,')[1] : raw
        };
      }

      const res = await fetch(getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'update', ...cleanPayload })
      });
      const json = await res.json();
      if (json && json.success) {
        return { success: true, isLive: true, data: json.data };
      }
      return { success: false, error: json?.error || 'Google Sheet update operation failed' };
    } catch (err) {
      console.error('Apps Script update failed:', err);
      return { success: false, error: err.message || 'Error communicating with Google Sheets' };
    }
  }

  // Local mock update
  const records = getLocalRecords();
  const targetIdx = records.findIndex(r => 
    r.firm === payload.firm && 
    (String(r.slNo) === String(payload.slNo) || (payload.invoiceNo && r.invoiceNo === payload.invoiceNo))
  );

  if (targetIdx === -1) {
    return { success: false, error: 'Record not found for update in local database' };
  }

  const existing = records[targetIdx];
  let attachmentLink = existing.attachmentLink;
  let attachmentName = existing.attachmentName;

  if (payload.file && payload.file.base64) {
    attachmentLink = payload.file.base64;
    attachmentName = payload.file.fileName || existing.attachmentName;
  } else if (payload.attachmentLink !== undefined) {
    attachmentLink = payload.attachmentLink;
    attachmentName = payload.attachmentName || existing.attachmentName;
  }

  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const updated = {
    ...existing,
    invoiceNo: payload.invoiceNo !== undefined ? payload.invoiceNo : existing.invoiceNo,
    vendorName: payload.vendorName !== undefined ? payload.vendorName : existing.vendorName,
    material: payload.material !== undefined ? payload.material : existing.material,
    vehicleStatus: payload.vehicleStatus !== undefined ? payload.vehicleStatus : existing.vehicleStatus,
    vehicleNo: payload.vehicleNo !== undefined ? payload.vehicleNo.toUpperCase().replace(/\s+/g, '') : existing.vehicleNo,
    remark: payload.remark !== undefined ? payload.remark : existing.remark,
    attachmentLink,
    attachmentName,
    updatedAt: now
  };

  records[targetIdx] = updated;
  saveLocalRecords(records);

  return { success: true, isLive: false, data: updated };
}

/**
 * Delete a record by Firm + Sl.no
 */
export async function deleteRecord(firm, slNo) {
  if (isLiveBackendConfigured()) {
    try {
      const res = await fetch(getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete', firm, slNo })
      });
      const json = await res.json();
      if (json && json.success) {
        return { success: true, isLive: true };
      }
      throw new Error(json?.error || 'Apps Script delete operation failed');
    } catch (err) {
      console.warn('Apps Script delete failed, removing from local store:', err);
    }
  }

  // Local mock delete
  const records = getLocalRecords();
  const nextRecords = records.filter(r => !(r.firm === firm && String(r.slNo) === String(slNo)));
  saveLocalRecords(nextRecords);

  return { success: true, isLive: false };
}

/**
 * Reset local storage mock data back to default template
 */
export function resetLocalMockData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
  return INITIAL_DEMO_RECORDS;
}
