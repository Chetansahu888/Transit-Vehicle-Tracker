import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { listRecords, addRecord, updateRecord, deleteRecord, isLiveBackendConfigured, getLiveCachedRecords } from '../api/sheetApi';
import { FIRMS as DEFAULT_FIRMS } from '../constants';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const getInitialFirms = () => {
    try {
      const cached = localStorage.getItem('transit_cached_firms');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_FIRMS;
  };

  const getInitialRecords = () => {
    const cached = getLiveCachedRecords();
    if (cached && cached.length > 0) {
      return cached.filter(r => 
        (r.invoiceNo && r.invoiceNo.trim()) ||
        (r.vendorName && r.vendorName.trim()) ||
        (r.material && r.material.trim()) ||
        (r.vehicleStatus && r.vehicleStatus.trim()) ||
        (r.vehicleNo && r.vehicleNo.trim())
      );
    }
    return [];
  };

  const initialRecords = getInitialRecords();
  const [records, setRecords] = useState(initialRecords);
  const [firms, setFirms] = useState(getInitialFirms);
  
  // Instant load: If we have cached records, do NOT block the screen with full-page loading!
  const [loading, setLoading] = useState(initialRecords.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => initialRecords.length > 0 ? new Date() : null);
  const [selectedFirm, setSelectedFirm] = useState('ALL');
  const [isLive, setIsLive] = useState(isLiveBackendConfigured());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(15);
  const [toasts, setToasts] = useState([]);

  const lastFocusTimeRef = useRef(0);

  const showToast = useCallback((title, message, type = 'success') => {
    const id = Date.now() + Math.random().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch all records & dynamic firms from Google Sheets
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await listRecords('ALL', isManual);
      if (res.success) {
        const cleanData = (res.data || []).filter(r => 
          (r.invoiceNo && r.invoiceNo.trim()) ||
          (r.vendorName && r.vendorName.trim()) ||
          (r.material && r.material.trim()) ||
          (r.vehicleStatus && r.vehicleStatus.trim()) ||
          (r.vehicleNo && r.vehicleNo.trim())
        );
        setRecords(cleanData);
        setIsLive(res.isLive);
        setLastUpdated(new Date());
        setSecondsUntilRefresh(15);

        // Dynamic firms from Master sheet
        if (Array.isArray(res.firms) && res.firms.length > 0) {
          setFirms(res.firms);
          localStorage.setItem('transit_cached_firms', JSON.stringify(res.firms));
        } else if (Array.isArray(res.data) && res.data.length > 0) {
          const dataFirms = [...new Set(res.data.map(r => r.firm).filter(Boolean))];
          if (dataFirms.length > 0) {
            setFirms(prev => {
              const combined = [...new Set([...prev, ...dataFirms])];
              localStorage.setItem('transit_cached_firms', JSON.stringify(combined));
              return combined;
            });
          }
        }
      } else if (isManual) {
        showToast('Fetch Warning', 'Could not refresh latest data from sheet.', 'error');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      if (isManual) {
        showToast('Connection Error', err.message || 'Error reaching backend', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Initial background load
  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Background auto-refresh sync (15 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh(prev => {
        if (prev <= 1) {
          loadData(false);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Window Focus & Tab Switch Listener (Throttled to avoid rapid spam)
  useEffect(() => {
    const handleSyncOnFocus = () => {
      const now = Date.now();
      if (now - lastFocusTimeRef.current > 8000) {
        lastFocusTimeRef.current = now;
        loadData(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncOnFocus();
      }
    };

    window.addEventListener('focus', handleSyncOnFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleSyncOnFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  // Add new entry
  const handleAddRecord = async (payload) => {
    try {
      const res = await addRecord(payload);
      if (res.success) {
        setRecords(prev => [...prev, res.data]);
        showToast('Entry Added', `Successfully recorded for ${payload.firm}`, 'success');
        // Background sync to ensure slNo & order are 100% sheet-aligned
        loadData(false);
        return { success: true, data: res.data };
      } else {
        showToast('Submission Failed', res.error || 'Could not add entry', 'error');
        return { success: false, error: res.error };
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // Update existing entry
  const handleUpdateRecord = async (payload) => {
    try {
      const res = await updateRecord(payload);
      if (res.success) {
        setRecords(prev => prev.map(item => {
          if ((item.firm || '').toUpperCase() === (payload.firm || '').toUpperCase() && (String(item.slNo) === String(payload.slNo) || item.invoiceNo === payload.invoiceNo)) {
            return res.data;
          }
          return item;
        }));
        showToast('Entry Updated', `Updated record for ${payload.firm}`, 'success');
        loadData(false);
        return { success: true, data: res.data };
      } else {
        showToast('Update Failed', res.error || 'Could not update entry', 'error');
        return { success: false, error: res.error };
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // Delete entry
  const handleDeleteRecord = async (firm, slNo) => {
    try {
      const res = await deleteRecord(firm, slNo);
      if (res.success) {
        setRecords(prev => prev.filter(item => !((item.firm || '').toUpperCase() === (firm || '').toUpperCase() && String(item.slNo) === String(slNo))));
        showToast('Entry Deleted', `Removed Sl.no #${slNo} from ${firm}`, 'success');
        loadData(false);
        return { success: true };
      } else {
        showToast('Delete Failed', res.error || 'Could not delete entry', 'error');
        return { success: false, error: res.error };
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // Auto-complete suggestions for vendors and materials
  const vendorSuggestions = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.vendorName && r.vendorName.trim()) {
        set.add(r.vendorName.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  const materialSuggestions = useMemo(() => {
    const set = new Set();
    records.forEach(r => {
      if (r.material && r.material.trim()) {
        set.add(r.material.trim());
      }
    });
    return Array.from(set).sort();
  }, [records]);

  // Duplicate invoice checker in same firm
  const checkDuplicateInvoice = useCallback((firm, invoiceNo, currentSlNo = null) => {
    if (!invoiceNo || !invoiceNo.trim()) return false;
    const cleanInv = invoiceNo.trim().toLowerCase();
    return records.some(r => 
      r.firm === firm && 
      r.invoiceNo && 
      r.invoiceNo.trim().toLowerCase() === cleanInv &&
      (currentSlNo === null || String(r.slNo) !== String(currentSlNo))
    );
  }, [records]);

  const value = {
    records,
    firms,
    loading,
    refreshing,
    lastUpdated,
    secondsUntilRefresh,
    selectedFirm,
    setSelectedFirm,
    isLive,
    toasts,
    showToast,
    dismissToast,
    loadData,
    handleAddRecord,
    handleUpdateRecord,
    handleDeleteRecord,
    vendorSuggestions,
    materialSuggestions,
    checkDuplicateInvoice
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
