import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { listRecords, addRecord, updateRecord, deleteRecord, isLiveBackendConfigured } from '../api/sheetApi';
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

  const [records, setRecords] = useState([]);
  const [firms, setFirms] = useState(getInitialFirms);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedFirm, setSelectedFirm] = useState('ALL');
  const [isLive, setIsLive] = useState(isLiveBackendConfigured());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(10);
  const [toasts, setToasts] = useState([]);

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

  // Fetch all records & dynamic firms from Master sheet
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await listRecords('ALL');
      if (res.success) {
        // Filter out blank placeholder rows that have no actual shipment details
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
        setSecondsUntilRefresh(10);

        // Dynamic firms from Master sheet
        if (Array.isArray(res.firms) && res.firms.length > 0) {
          setFirms(res.firms);
          localStorage.setItem('transit_cached_firms', JSON.stringify(res.firms));
        } else if (Array.isArray(res.data) && res.data.length > 0) {
          // Fallback: derive unique firms from sheet records
          const dataFirms = [...new Set(res.data.map(r => r.firm).filter(Boolean))];
          if (dataFirms.length > 0) {
            setFirms(prev => {
              const combined = [...new Set([...prev, ...dataFirms])];
              localStorage.setItem('transit_cached_firms', JSON.stringify(combined));
              return combined;
            });
          }
        }
      } else {
        showToast('Fetch Warning', 'Could not refresh latest data from sheet.', 'error');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Connection Error', err.message || 'Error reaching backend', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fast 10-second auto-refresh countdown for live real-time sync with Google Sheets
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh(prev => {
        if (prev <= 1) {
          loadData();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Window Focus & Tab Switch Listener:
  // Whenever user edits Google Sheet in another window/tab and returns to React app,
  // it immediately pulls latest data from Google Sheets!
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  // Add new entry
  const handleAddRecord = async (payload) => {
    try {
      const res = await addRecord(payload);
      if (res.success) {
        // Prepend/add to current records
        setRecords(prev => [res.data, ...prev]);
        showToast('Entry Added', `Successfully recorded for ${payload.firm}`, 'success');
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
