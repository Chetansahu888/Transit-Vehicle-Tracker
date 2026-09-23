import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Building2, 
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { FIRMS } from '../constants';
import { useData } from '../context/DataContext';

export default function Sidebar({ isCollapsed, onToggleCollapse, mobileOpen, onMobileClose, onOpenAddModal }) {
  const { records, firms = FIRMS, selectedFirm, setSelectedFirm } = useData();

  const getFirmCount = (firmName) => {
    return records.filter(r => r.firm === firmName).length;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col transition-all duration-200 ease-out lg:static ${
          isCollapsed ? 'w-16' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-200 px-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate animate-fade-in">
                <span className="font-bold text-slate-900 text-sm tracking-tight block">
                  Material MIS
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                  Transit ERP
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation & Firm Shortcuts */}
        <div className="flex-1 px-2.5 py-4 space-y-5 overflow-y-auto">
          {/* Main Dashboard Link */}
          <div>
            <nav className="space-y-1">
              <NavLink
                to="/"
                onClick={() => {
                  setSelectedFirm('ALL');
                  if (window.innerWidth < 1024) onMobileClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-2 text-sm rounded-lg transition-colors group ${
                    isActive && selectedFirm === 'ALL'
                      ? 'bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4 text-indigo-600 shrink-0" />
                  {!isCollapsed && <span className="truncate">Main Dashboard</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {records.length}
                  </span>
                )}
              </NavLink>
            </nav>
          </div>

          {/* Firm Tabs Shortcuts */}
          <div>
            {!isCollapsed && (
              <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 animate-fade-in">
                Firms View
              </p>
            )}
            <div className="space-y-1">
              {(firms && firms.length > 0 ? firms : FIRMS).map(firm => {
                const count = getFirmCount(firm);
                const isFirmActive = selectedFirm === firm;

                return (
                  <button
                    key={firm}
                    type="button"
                    onClick={() => {
                      setSelectedFirm(firm);
                      if (window.innerWidth < 1024) onMobileClose();
                    }}
                    title={isCollapsed ? `${firm} (${count})` : undefined}
                    className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition-colors text-left ${
                      isFirmActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isFirmActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {!isCollapsed && <span className="truncate">{firm}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                OP
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate">Plant Dispatch</p>
                <p className="text-[10px] text-slate-400">All-in-One Dashboard</p>
              </div>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs mx-auto border border-slate-200">
              OP
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
