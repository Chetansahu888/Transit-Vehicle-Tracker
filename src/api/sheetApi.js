import { INITIAL_DEMO_RECORDS } from '../constants';

export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxYg99ZB4HzJmLSZgdnr49MG-wBxvqqk_CAGOEUe9OIz-KHbTkoZg9hNgPKO4wj2itB/exec';

const STORAGE_KEY = 'transit_vehicle_tracking_mock_db';
const LIVE_CACHE_KEY = 'transit_live_cached_records';
const FIRMS_CACHE_KEY = 'transit_cached_firms';

// In-flight request deduplication & short-lived memory cache (3.5s)
let inFlightFetchPromise = null;
let lastMemoryCache = {
  timestamp: 0,
  firm: null,
  result: null
};

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

// Helper to get cached live records
export function getLiveCachedRecords() {
  try {
    const raw = localStorage.getItem(LIVE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [];
}

export function getScriptUrl() {
  try {
    const localUrl = localStorage.getItem('transit_custom_script_url');
    if (localUrl && localUrl.trim().startsWith('https://script.google.com/macros/s/')) {
      return localUrl.trim();
    }
  } catch (e) {
    // ignore
  }
  const envUrl = import.meta.env.VITE_SCRIPT_URL ? import.meta.env.VITE_SCRIPT_URL.trim() : '';
  return envUrl || DEFAULT_SCRIPT_URL;
}

export function setCustomScriptUrl(url) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem('transit_custom_script_url');
    } else {
      localStorage.setItem('transit_custom_script_url', url.trim());
    }
    // Invalidate memory cache on URL change
    lastMemoryCache = { timestamp: 0, firm: null, result: null };
  } catch (e) {
    console.error('Failed to save custom script URL:', e);
  }
}

export function isLiveBackendConfigured() {
  const url = getScriptUrl();
  return Boolean(url && url.startsWith('http'));
}

/**
 * Fetch records for a firm or ALL firms with:
 * 1. In-flight promise deduplication (never spam multiple parallel requests to Apps Script)
 * 2. In-memory short-lived memoization (3.5s)
 * 3. Fast abort timeout with instantaneous fallback to local cache
 */
export async function listRecords(firm = 'ALL', forceRefresh = false) {
  const scriptUrl = getScriptUrl();

  // If live backend is configured
  if (scriptUrl && scriptUrl.startsWith('http')) {
    const now = Date.now();

    // Check in-memory cache if not forced
    if (
      !forceRefresh &&
      lastMemoryCache.firm === firm &&
      now - lastMemoryCache.timestamp < 3500 &&
      lastMemoryCache.result
    ) {
      return lastMemoryCache.result;
    }

    // If an identical fetch is already running, piggyback on that exact promise
    if (inFlightFetchPromise && !forceRefresh) {
      return inFlightFetchPromise;
    }

    // Launch single optimized fetch
    inFlightFetchPromise = (async () => {
      let lastError = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

        try {
          const cacheBuster = forceRefresh ? `&fresh=1&_t=${Date.now()}` : `&_t=${Math.floor(Date.now() / 15000)}`;
          const url = `${scriptUrl}?action=list&firm=${encodeURIComponent(firm)}${cacheBuster}`;
          
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          const json = await res.json();
          if (json && json.success) {
            // Cache successful records in localStorage
            try {
              localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(json.data || []));
              if (json.firms) localStorage.setItem(FIRMS_CACHE_KEY, JSON.stringify(json.firms));
            } catch (e) {}

            const response = {
              success: true,
              isLive: true,
              data: json.data || [],
              firms: Array.isArray(json.firms) && json.firms.length > 0 ? json.firms : null
            };

            // Update in-memory cache
            lastMemoryCache = {
              timestamp: Date.now(),
              firm,
              result: response
            };

            return response;
          }
          throw new Error(json?.error || 'Apps Script returned error');
        } catch (err) {
          clearTimeout(timeoutId);
          lastError = err;
          console.warn(`Apps Script fetch attempt ${attempt + 1} notice:`, err.message || err);
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }

      // Fast fallback to cached live records if network fails or times out
      try {
        const cached = localStorage.getItem(LIVE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const filtered = firm === 'ALL' ? parsed : parsed.filter(r => (r.firm || '').toUpperCase() === firm.toUpperCase());
            let cachedFirms = null;
            try {
              const rawFirms = localStorage.getItem(FIRMS_CACHE_KEY);
              if (rawFirms) cachedFirms = JSON.parse(rawFirms);
            } catch (e) {}

            return {
              success: true,
              isLive: true,
              data: filtered,
              firms: cachedFirms,
              isCached: true
            };
          }
        }
      } catch (e) {}

      return {
        success: false,
        isLive: true,
        error: lastError ? lastError.message : 'Failed to reach Google Sheet backend',
        data: []
      };
    })().finally(() => {
      inFlightFetchPromise = null;
    });

    return inFlightFetchPromise;
  }

  // Fallback ONLY when NO script URL is configured at all (Demo Mode)
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
      const url = `${scriptUrl}?action=getFirms&_t=${Math.floor(Date.now() / 60000)}`;
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
 * Find record by invoice number:
 * Checks local cache first for sub-millisecond response, then falls back to backend if not found!
 */
export async function getByInvoice(invoiceNo) {
  if (!invoiceNo) return { success: false, error: 'Invoice number required' };
  const cleanTarget = invoiceNo.trim().toLowerCase();

  // 1. Instant check in live cached records (0ms response time!)
  const liveCached = getLiveCachedRecords();
  const cachedMatch = liveCached.find(r => (r.invoiceNo || '').trim().toLowerCase() === cleanTarget);
  if (cachedMatch) {
    return { success: true, isLive: true, data: cachedMatch, isInstant: true };
  }

  // 2. Query live Google Apps Script if not found locally
  if (isLiveBackendConfigured()) {
    try {
      const scriptUrl = getScriptUrl();
      const url = `${scriptUrl}?action=getByInvoice&invoice=${encodeURIComponent(invoiceNo)}&_t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.success) {
        return { success: true, isLive: true, data: json.data };
      }
      throw new Error(json?.error || 'Record not found in Google Sheet');
    } catch (err) {
      console.warn('Apps Script invoice lookup failed, checking local mock store:', err);
    }
  }

  // 3. Local storage mock fallback
  const records = getLocalRecords();
  const found = records.find(r => (r.invoiceNo || '').trim().toLowerCase() === cleanTarget);

  if (found) {
    return { success: true, isLive: false, data: found };
  }
  return { success: false, error: `No record found with invoice: ${invoiceNo}` };
}

/**
 * Invalidate memory cache so updates are immediately visible
 */
function invalidateLocalCache() {
  lastMemoryCache = { timestamp: 0, firm: null, result: null };
}

/**
 * Add a new record
 */
export async function addRecord(payload) {
  invalidateLocalCache();

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
        // Also update local cached records immediately
        try {
          const cached = getLiveCachedRecords();
          localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify([...cached, json.data]));
        } catch (e) {}

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
  invalidateLocalCache();

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
        // Also update local cached records immediately
        try {
          const cached = getLiveCachedRecords();
          const next = cached.map(item => {
            if (
              (item.firm || '').toUpperCase() === (payload.firm || '').toUpperCase() &&
              (String(item.slNo) === String(payload.slNo) || (payload.invoiceNo && item.invoiceNo === payload.invoiceNo))
            ) {
              return json.data;
            }
            return item;
          });
          localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(next));
        } catch (e) {}

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
  invalidateLocalCache();

  if (isLiveBackendConfigured()) {
    try {
      const res = await fetch(getScriptUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'delete', firm, slNo })
      });
      const json = await res.json();
      if (json && json.success) {
        try {
          const cached = getLiveCachedRecords();
          const next = cached.filter(item => !(item.firm === firm && String(item.slNo) === String(slNo)));
          localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify(next));
        } catch (e) {}

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
