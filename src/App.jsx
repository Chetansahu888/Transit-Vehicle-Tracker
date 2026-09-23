import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import Header from './components/Header';
import ToastContainer from './components/Toast';
import Dashboard from './pages/Dashboard';
import PrintReportModal from './components/PrintReportModal';
import { exportToExcel } from './utils/exportUtils';

function MainApp() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const { records, selectedFirm } = useData();

  const currentScopeRecords = selectedFirm === 'ALL'
    ? records
    : records.filter(r => r.firm === selectedFirm);

  const handleExportExcel = () => {
    exportToExcel(currentScopeRecords, selectedFirm);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Enterprise Navbar */}
      <Header
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportPDF={() => setIsPrintModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-5">
        <div className="max-w-[1600px] mx-auto w-full">
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  isAddModalOpen={isAddModalOpen}
                  setIsAddModalOpen={setIsAddModalOpen}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* Print / PDF Setup Modal with Portrait / Landscape options */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        records={currentScopeRecords}
        activeFirm={selectedFirm}
      />

      {/* Notification Toasts */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <MainApp />
      </BrowserRouter>
    </DataProvider>
  );
}
