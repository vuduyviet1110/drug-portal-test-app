'use client';

import React, { useState, useEffect } from 'react';

interface DrugItem {
  id: string;
  name: string;
  registrationNumber?: string;
  source: string;
}

interface UnitItem {
  id: string;
  name: string;
}

interface TransactionHistoryItem {
  id: string;
  type: string;
  date: string;
  status: string;
  reason?: string;
  referenceNumber?: string;
  items: string; // JSON string
  attempts: number;
  errorMessage?: string;
}

interface PrescriptionItem {
  drugCode?: string;
  drugName?: string;
  unitName?: string;
  prescribedQuantity?: number;
  usageInstruction?: string;
  soldQuantity?: number;
}

interface PrescriptionData {
  maDonThuoc: string;
  patientName?: string;
  patientBirthDate?: string;
  diagnosis?: string;
  doctorName?: string;
  items: PrescriptionItem[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'stock' | 'prescription' | 'settings'>('search');

  // Configuration settings state
  const [cfgDuocUser, setCfgDuocUser] = useState('');
  const [cfgDuocPass, setCfgDuocPass] = useState('');
  const [cfgDuocStore, setCfgDuocStore] = useState('');
  const [cfgDuocWh, setCfgDuocWh] = useState('');
  const [cfgRxAppName, setCfgRxAppName] = useState('');
  const [cfgRxAppKey, setCfgRxAppKey] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Setup gate state (null = checking, false = show setup page, true = authenticated)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  // Catalog search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<DrugItem[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Sync Form state
  const [stockTxType, setStockTxType] = useState<'stock-in' | 'stock-out' | 'stock-taking'>('stock-in');
  const [stockDrugId, setStockDrugId] = useState('');
  const [stockUnitId, setStockUnitId] = useState('');
  const [stockQty, setStockQty] = useState<number>(1);
  const [stockBatch, setStockBatch] = useState('');
  const [stockExpiry, setStockExpiry] = useState('');
  const [stockManufacturer, setStockManufacturer] = useState('Dược Phẩm iCare');
  const [stockReason, setStockReason] = useState('supplier');
  const [stockRef, setStockRef] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Dropdown lists
  const [drugsDropdown, setDrugsDropdown] = useState<DrugItem[]>([]);
  const [unitsDropdown, setUnitsDropdown] = useState<UnitItem[]>([]);

  // Logs terminal state
  const [logs, setLogs] = useState<{ text: string; type: 'info' | 'warn' | 'error' | 'success' }[]>([]);

  // Transaction history state
  const [txHistory, setTxHistory] = useState<TransactionHistoryItem[]>([]);

  // Prescription lookup state
  const [rxInput, setRxInput] = useState('01CXUpzrizjk-c');
  const [isRxLoading, setIsRxLoading] = useState(false);
  const [rxData, setRxData] = useState<PrescriptionData | null>(null);
  const [rxError, setRxError] = useState<string | null>(null);
  const [isReportingSale, setIsReportingSale] = useState(false);
  const [rxSaleQuantities, setRxSaleQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    // Set default reference and expiry dates
    setStockRef('REF-TX-' + Date.now());
    const tomorrow = new Date();
    tomorrow.setFullYear(tomorrow.getFullYear() + 1);
    setStockExpiry(tomorrow.toISOString().split('T')[0]);
    setStockBatch('LOT-' + new Date().getFullYear() + '-001');

    checkSetupAndInitialize();
  }, []);

  const addLog = (text: string, type: 'info' | 'warn' | 'error' | 'success' = 'info') => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  // Check database configuration on start
  async function checkSetupAndInitialize() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();

      // If CSDL Dược credentials exist, bypass setup page
      if (data.csdlDuoc && data.csdlDuoc.username) {
        setCfgDuocUser(data.csdlDuoc.username || '');
        setCfgDuocStore(data.csdlDuoc.storeId || '');
        setCfgDuocWh(data.csdlDuoc.warehouseCode || '');
        if (data.qd228) {
          setCfgRxAppName(data.qd228.appName || '');
        }

        setIsConfigured(true);
        loadMasterUnits();
        loadAllDrugsOnStartup();
        loadTxHistory();
      } else {
        setIsConfigured(false);
      }
    } catch (err) {
      console.error('Error checking setup configuration:', err);
      setIsConfigured(false);
    }
  }

  // ─── CONFIG ENDPOINTS ─────────────────────────────────────────────
  async function loadSettings() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.csdlDuoc) {
        setCfgDuocUser(data.csdlDuoc.username || '');
        setCfgDuocStore(data.csdlDuoc.storeId || '');
        setCfgDuocWh(data.csdlDuoc.warehouseCode || '');
      }
      if (data.qd228) {
        setCfgRxAppName(data.qd228.appName || '');
      }
    } catch (err: any) {
      console.warn('Không thể tải cấu hình lưu sẵn:', err.message);
    }
  }

  async function handleSaveSettings(e: React.FormEvent, isSetupMode = false) {
    e.preventDefault();
    setIsConfiguring(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csdlDuoc: {
            username: cfgDuocUser.trim(),
            password: cfgDuocPass,
            storeId: cfgDuocStore.trim() || undefined,
            warehouseCode: cfgDuocWh.trim() || undefined,
          },
          qd228: cfgRxAppName.trim() && cfgRxAppKey ? {
            appName: cfgRxAppName.trim(),
            appKey: cfgRxAppKey,
          } : undefined
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi áp dụng cấu hình');

      alert('✅ Cấu hình kết nối SDK đã được lưu và áp dụng thành công!');
      
      if (isSetupMode) {
        setIsConfigured(true);
      }
      
      // Reload metadata
      loadMasterUnits();
      loadAllDrugsOnStartup();
      loadTxHistory();
    } catch (err: any) {
      alert(`❌ Lỗi lưu cấu hình: ${err.message}`);
    } finally {
      setIsConfiguring(false);
    }
  }

  // ─── MASTER DATA ──────────────────────────────────────────────────
  async function loadMasterUnits() {
    try {
      const res = await fetch('/api/master/units');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setUnitsDropdown(data.items || []);
      if (data.items?.length > 0) {
        setStockUnitId(data.items[0].id);
      }
    } catch (err: any) {
      console.warn('Using standard units fallback:', err.message);
      const fallback = [
        { id: '1', name: 'Viên' },
        { id: '2', name: 'Hộp' },
        { id: '3', name: 'Chai' },
        { id: '4', name: 'Vỉ' },
        { id: '5', name: 'Ống' }
      ];
      setUnitsDropdown(fallback);
      setStockUnitId('1');
    }
  }

  async function loadAllDrugsOnStartup() {
    setIsSearching(true);
    try {
      const res = await fetch('/api/drugs?page=1&pageSize=50');
      const data = await res.json();
      const items = data.items || [];
      setSearchResults(items);
      setSearchCount(data.total || items.length);

      // Populate dropdown for sync tab
      setDrugsDropdown(items);
      if (items.length > 0) {
        setStockDrugId(items[0].registrationNumber || items[0].id);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh mục thuốc:', err.message);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchKeyword.trim()) {
      loadAllDrugsOnStartup();
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/drugs/search?keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();
      const items = data.items || [];
      setSearchResults(items);
      setSearchCount(data.total || items.length);

      // Sync dropdown with search results
      if (items.length > 0) {
        setDrugsDropdown(items);
        setStockDrugId(items[0].registrationNumber || items[0].id);
      }
    } catch (err: any) {
      alert(`Lỗi tìm kiếm: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  }

  // ─── STOCK SYNC ──────────────────────────────────────────────────
  async function loadTxHistory() {
    try {
      const res = await fetch('/api/inventory/transactions');
      if (res.ok) {
        const data = await res.json();
        setTxHistory(data);
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử giao dịch:', err);
    }
  }

  async function handleSyncSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stockDrugId || !stockUnitId || !stockQty) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setIsSyncing(true);
    setLogs([]);
    addLog(`Giao dịch ${stockTxType.toUpperCase()} khởi tạo...`, 'info');
    const selectedDrug = drugsDropdown.find(d => (d.registrationNumber || d.id) === stockDrugId);
    addLog(`Thông tin: ${selectedDrug?.name || 'Thuốc'} (Số lượng: ${stockQty})`, 'info');
    addLog('Đang kết nối API Route backend để gọi SDK...', 'info');

    const startTime = Date.now();
    let url = `/api/inventory/${stockTxType}`;
    let body: any = {};

    if (stockTxType === 'stock-in') {
      body = {
        items: [{
          drugId: stockDrugId,
          unitId: stockUnitId,
          quantity: stockQty,
          batchNo: stockBatch,
          expiryDate: stockExpiry,
          manufacturer: stockManufacturer ? { id: '1', name: stockManufacturer } : undefined
        }],
        reason: stockReason,
        referenceNumber: stockRef
      };
    } else if (stockTxType === 'stock-out') {
      body = {
        items: [{
          drugId: stockDrugId,
          unitId: stockUnitId,
          quantity: stockQty
        }],
        reason: stockReason,
        referenceNumber: stockRef
      };
    } else if (stockTxType === 'stock-taking') {
      body = {
        items: [{
          drugId: stockDrugId,
          unitId: stockUnitId,
          quantity: stockQty,
          batchNo: stockBatch
        }],
        referenceNumber: stockRef
      };
    }

    try {
      addLog(`Gửi yêu cầu POST ${url}...`, 'info');
      addLog('Bắt đầu quá trình gửi & poll kết quả tự động từ SDK...', 'warn');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.ok) {
        throw new Error(result.error || 'Lỗi không xác định từ server');
      }

      addLog(`\n[Phản hồi từ CSDL Dược nhận được sau ${duration} giây]`, 'success');
      addLog(`Mã giao dịch (Transaction ID): ${result.transactionId}`, 'success');
      addLog(`Trạng thái cuối (Terminal Status): ${result.status.toUpperCase()}`, 'success');
      addLog(`Số lần thử kiểm tra (Attempts): ${result.attempts || 1}`, 'success');
      addLog('Đồng bộ dữ liệu lên CSDL Dược thành công!', 'success');

      loadTxHistory();
      setStockRef('REF-TX-' + Date.now());
    } catch (err: any) {
      addLog(`\n[Lỗi đồng bộ kho]`, 'error');
      addLog(err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  }

  // ─── PRESCRIPTION LOOKUP ──────────────────────────────────────────
  async function handleRxLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!rxInput.trim()) return;

    setIsRxLoading(true);
    setRxData(null);
    setRxError(null);

    try {
      const res = await fetch(`/api/prescriptions/${encodeURIComponent(rxInput.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        const detail = data.responseBody ? JSON.parse(data.responseBody) : null;
        const detailMsg = detail && detail.error ? ` (${detail.error})` : '';
        throw new Error((data.error || 'Không thể tìm thấy đơn thuốc hoặc lỗi kết nối') + detailMsg);
      }

      setRxData(data);
      const initialQtys: Record<string, number> = {};
      data.items?.forEach((item: PrescriptionItem) => {
        if (item.drugCode) {
          initialQtys[item.drugCode] = item.prescribedQuantity || 0;
        }
      });
      setRxSaleQuantities(initialQtys);
    } catch (err: any) {
      setRxError(err.message);
    } finally {
      setIsRxLoading(false);
    }
  }

  const handleRxQtyChange = (drugCode: string, value: number, max: number) => {
    const val = Math.min(max, Math.max(0, value));
    setRxSaleQuantities((prev) => ({
      ...prev,
      [drugCode]: val,
    }));
  };

  async function handleRxReportSale() {
    if (!rxData) return;

    setIsReportingSale(true);
    try {
      const items = Object.entries(rxSaleQuantities).map(([drugCode, qty]) => ({
        drugCode,
        quantity: qty
      }));

      const res = await fetch('/api/prescriptions/update-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescriptionCode: rxData.maDonThuoc,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const detail = data.responseBody ? JSON.parse(data.responseBody) : null;
        const detailMsg = detail && detail.error ? ` (${detail.error})` : '';
        throw new Error((data.error || 'Lỗi gửi báo cáo số lượng bán') + detailMsg);
      }

      alert('✅ Đã gửi báo cáo số lượng bán (UC05) lên Cổng đơn thuốc quốc gia thành công!');
    } catch (err: any) {
      alert(`❌ Lỗi báo cáo đơn thuốc: ${err.message}`);
    } finally {
      setIsReportingSale(false);
    }
  }

  const handleSelectDrugForSync = (drug: DrugItem) => {
    const drugId = drug.registrationNumber || drug.id;
    if (!drugsDropdown.some(d => (d.registrationNumber || d.id) === drugId)) {
      setDrugsDropdown(prev => [...prev, drug]);
    }
    setStockDrugId(drugId);
    setActiveTab('stock');
  };

  // 1. Loading state when checking setup config
  if (isConfigured === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080c14] text-[#f8fafc]">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#10b981] mb-4"></i>
          <p className="text-sm text-slate-400 font-medium">Đang kiểm tra cấu hình kết nối...</p>
        </div>
      </div>
    );
  }

  // 2. Setup/Login Page when credentials are missing
  if (isConfigured === false) {
    return (
      <>
        <div className="glow-bg"></div>
        <div className="flex h-screen w-screen items-center justify-center p-4">
          <form
            onSubmit={(e) => handleSaveSettings(e, true)}
            className="form-card w-full max-w-md shadow-2xl relative z-10"
            style={{ backdropFilter: 'blur(16px)', background: 'rgba(15, 22, 36, 0.85)' }}
          >
            <div className="text-center mb-6">
              <i className="fa-solid fa-prescription-bottle-medical text-4xl text-[#10b981] mb-2 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"></i>
              <h2 className="text-xl font-bold text-slate-100">Cấu hình iCare Portal</h2>
              <p className="text-xs text-slate-400 mt-1">Vui lòng cung cấp tài khoản CSDL Dược để kích hoạt hệ thống</p>
            </div>

            <div className="form-group">
              <label htmlFor="setup-duoc-user">Tài khoản CSDL Dược *</label>
              <input
                type="text"
                id="setup-duoc-user"
                required
                placeholder="Nhập mã cơ sở nhà thuốc"
                value={cfgDuocUser}
                onChange={(e) => setCfgDuocUser(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="setup-duoc-pass">Mật khẩu CSDL Dược *</label>
              <input
                type="password"
                id="setup-duoc-pass"
                required
                placeholder="Nhập mật khẩu kết nối"
                value={cfgDuocPass}
                onChange={(e) => setCfgDuocPass(e.target.value)}
              />
            </div>

            <div className="form-row mb-4">
              <div className="form-group">
                <label htmlFor="setup-duoc-store">Store ID (Tùy chọn)</label>
                <input
                  type="text"
                  id="setup-duoc-store"
                  placeholder="e.g. STORE-01"
                  value={cfgDuocStore}
                  onChange={(e) => setCfgDuocStore(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="setup-duoc-wh">Warehouse (Tùy chọn)</label>
                <input
                  type="text"
                  id="setup-duoc-wh"
                  placeholder="e.g. WH-01"
                  value={cfgDuocWh}
                  onChange={(e) => setCfgDuocWh(e.target.value)}
                />
              </div>
            </div>

            <details className="mb-4 text-xs text-slate-400 cursor-pointer">
              <summary className="font-semibold text-slate-300 mb-2">Cấu hình Cổng Đơn Thuốc QĐ 228 (Tùy chọn)</summary>
              <div className="pt-2 space-y-3">
                <div className="form-group">
                  <label htmlFor="setup-rx-appname">App Name (QĐ 228)</label>
                  <input
                    type="text"
                    id="setup-rx-appname"
                    placeholder="Mã cơ sở QĐ 228"
                    value={cfgRxAppName}
                    onChange={(e) => setCfgRxAppName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="setup-rx-appkey">App Key (QĐ 228)</label>
                  <input
                    type="password"
                    id="setup-rx-appkey"
                    placeholder="Khóa bảo mật QĐ 228"
                    value={cfgRxAppKey}
                    onChange={(e) => setCfgRxAppKey(e.target.value)}
                  />
                </div>
              </div>
            </details>

            <button type="submit" className="submit-btn" disabled={isConfiguring}>
              {isConfiguring ? 'Đang lưu cấu hình...' : 'Lưu & Bắt đầu làm việc'}
            </button>
          </form>
        </div>
      </>
    );
  }

  // 3. Normal Dashboard Layout when authenticated
  return (
    <>
      <div className="glow-bg"></div>
      <div className="container-custom">
        {/* Header */}
        <header className="glass-header">
          <div className="logo">
            <i className="fa-solid fa-prescription-bottle-medical logo-icon"></i>
            <h1>iCare <span>Pharmacy</span></h1>
          </div>
          <div className="badge-custom">
            <span className="pulse-dot"></span>
            CSDL Dược QĐ 522 & QĐ 228
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <i className="fa-solid fa-magnifying-glass"></i> Tra cứu thuốc
          </button>
          <button
            className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <i className="fa-solid fa-right-left"></i> Đồng bộ kho (Nhập)
          </button>
          <button
            className={`tab-btn ${activeTab === 'prescription' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescription')}
          >
            <i className="fa-solid fa-file-prescription"></i> Tra cứu đơn thuốc
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <i className="fa-solid fa-gears"></i> Cấu hình hệ thống
          </button>
        </nav>

        {/* Main Panel Content */}
        <main className="main-content">
          {/* Tab 1: Search Catalog */}
          {activeTab === 'search' && (
            <div className="animate-fade">
              <form onSubmit={handleSearch} className="search-bar">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  type="text"
                  placeholder="Nhập tên thuốc cần tra cứu (ví dụ: paracetamol)..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
                <button type="submit" disabled={isSearching}>
                  {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>
              </form>

              {isSearching && (
                <div className="loading-spinner">
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Đang tải dữ liệu từ CSDL Dược...
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="results-card">
                  <h3 className="card-title">
                    <i className="fa-solid fa-layer-group"></i> Kết quả tìm kiếm ({searchCount})
                  </h3>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mã thuốc (ID)</th>
                          <th>Tên thuốc</th>
                          <th>Số đăng ký</th>
                          <th>Nguồn</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.id}</strong></td>
                            <td>{item.name}</td>
                            <td>
                              <span className="badge-custom">{item.registrationNumber || 'N/A'}</span>
                            </td>
                            <td>
                              <span className="badge-custom success">{item.source.toUpperCase()}</span>
                            </td>
                            <td>
                              <button
                                className="action-btn"
                                onClick={() => handleSelectDrugForSync(item)}
                              >
                                <i className="fa-solid fa-cart-plus"></i> Chọn nhập/xuất
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!isSearching && searchResults.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Không tìm thấy thuốc nào trong danh sách.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Sync Inventory */}
          {activeTab === 'stock' && (
            <div className="animate-fade">
              <div className="grid-layout">
                {/* Form Sync */}
                <div className="form-card">
                  <h3 className="card-title">
                    <i className="fa-solid fa-file-import"></i> Cập nhật & Đồng bộ kho
                  </h3>
                  <form onSubmit={handleSyncSubmit}>
                    <div className="form-group">
                      <label htmlFor="stock-tx-type">Loại giao dịch *</label>
                      <select
                        id="stock-tx-type"
                        value={stockTxType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setStockTxType(val);
                          setStockReason(val === 'stock-in' ? 'supplier' : 'sale-retail');
                        }}
                      >
                        <option value="stock-in">Nhập kho (Stock-In)</option>
                        <option value="stock-out">Xuất kho (Stock-Out)</option>
                        <option value="stock-taking">Kiểm kho (Stock-Taking)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <div className="flex justify-between items-center mb-1">
                        <label htmlFor="stock-drug-id">Thuốc *</label>
                        <button
                          type="button"
                          onClick={loadAllDrugsOnStartup}
                          className="action-btn"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          disabled={isSearching}
                        >
                          <i className="fa-solid fa-rotate"></i> Tải danh sách
                        </button>
                      </div>
                      <select
                        id="stock-drug-id"
                        value={stockDrugId}
                        onChange={(e) => setStockDrugId(e.target.value)}
                      >
                        {drugsDropdown.length === 0 ? (
                          <option value="">-- Chưa tải danh sách thuốc --</option>
                        ) : (
                          drugsDropdown.map((d) => (
                            <option key={d.id} value={d.registrationNumber || d.id}>
                              {d.name} (SĐK: {d.registrationNumber || 'N/A'})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="stock-qty">Số lượng *</label>
                        <input
                          type="number"
                          id="stock-qty"
                          min="1"
                          value={stockQty}
                          onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="stock-unit-id">Đơn vị *</label>
                        <select
                          id="stock-unit-id"
                          value={stockUnitId}
                          onChange={(e) => setStockUnitId(e.target.value)}
                        >
                          {unitsDropdown.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {stockTxType !== 'stock-out' && (
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="stock-batch">Số lô (Batch No) *</label>
                          <input
                            type="text"
                            id="stock-batch"
                            value={stockBatch}
                            onChange={(e) => setStockBatch(e.target.value)}
                          />
                        </div>
                        {stockTxType === 'stock-in' && (
                          <div className="form-group">
                            <label htmlFor="stock-expiry">Hạn dùng (Expiry Date) *</label>
                            <input
                              type="date"
                              id="stock-expiry"
                              value={stockExpiry}
                              onChange={(e) => setStockExpiry(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {stockTxType === 'stock-in' && (
                      <div className="form-group">
                        <label htmlFor="stock-manufacturer">Nhà sản xuất</label>
                        <input
                          type="text"
                          id="stock-manufacturer"
                          value={stockManufacturer}
                          onChange={(e) => setStockManufacturer(e.target.value)}
                        />
                      </div>
                    )}

                    {stockTxType !== 'stock-taking' && (
                      <div className="form-group">
                        <label htmlFor="stock-reason">Lý do giao dịch *</label>
                        <select
                          id="stock-reason"
                          value={stockReason}
                          onChange={(e) => setStockReason(e.target.value)}
                        >
                          {stockTxType === 'stock-in' ? (
                            <>
                              <option value="supplier">Nhập từ nhà cung cấp</option>
                              <option value="transfer-in">Nhập chuyển kho nội bộ</option>
                              <option value="other">Nhập khác</option>
                            </>
                          ) : (
                            <>
                              <option value="sale-retail">Xuất bán lẻ</option>
                              <option value="transfer-out">Xuất chuyển kho</option>
                              <option value="other">Xuất khác</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="stock-ref">Mã tham chiếu (Reference Number)</label>
                      <input
                        type="text"
                        id="stock-ref"
                        value={stockRef}
                        onChange={(e) => setStockRef(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="submit-btn" disabled={isSyncing}>
                      {isSyncing ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-cloud-arrow-up"></i> Gửi & Đồng bộ CSDL Dược
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Polling Terminal Logs */}
                <div className="logs-card">
                  <h3 className="card-title">
                    <i className="fa-solid fa-satellite-dish"></i> Tiến trình xử lý (Polling Logs)
                  </h3>
                  <div className={`logs-content ${logs.length === 0 ? 'empty' : ''}`}>
                    {logs.length === 0 ? (
                      'Chưa có giao dịch nào được gửi đi. Hãy nhập thông tin bên trái để bắt đầu đồng bộ.'
                    ) : (
                      logs.map((log, i) => (
                        <div key={i} className={`log-line ${log.type}`}>
                          {log.text}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Logs Database History */}
              <div className="results-card mt-8">
                <h3 className="card-title">
                  <i className="fa-solid fa-clock-rotate-left"></i> Lịch sử đồng bộ gần đây
                </h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Mã giao dịch</th>
                        <th>Loại</th>
                        <th>Ngày gửi</th>
                        <th>Tham chiếu</th>
                        <th>Số lần thử</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txHistory.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-slate-500">
                            Chưa có lịch sử giao dịch nào được ghi lại
                          </td>
                        </tr>
                      ) : (
                        txHistory.map((h) => (
                          <tr key={h.id}>
                            <td><strong>{h.id}</strong></td>
                            <td>
                              <span className="badge-custom">{h.type.toUpperCase()}</span>
                            </td>
                            <td>{new Date(h.date).toLocaleString('vi-VN')}</td>
                            <td>{h.referenceNumber || 'N/A'}</td>
                            <td>{h.attempts}</td>
                            <td>
                              <span className={`badge-custom ${h.status === 'completed' ? 'success' : h.status === 'pending' ? 'warn' : 'danger'}`}>
                                {h.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Prescription Lookup & Report UC05 */}
          {activeTab === 'prescription' && (
            <div className="animate-fade">
              <form onSubmit={handleRxLookup} className="search-bar">
                <i className="fa-solid fa-file-prescription search-icon"></i>
                <input
                  type="text"
                  placeholder="Nhập mã đơn thuốc quốc gia (ví dụ: 01CXUpzrizjk-c)..."
                  value={rxInput}
                  onChange={(e) => setRxInput(e.target.value)}
                />
                <button type="submit" disabled={isRxLoading}>
                  {isRxLoading ? 'Đang kiểm tra...' : 'Tra cứu đơn'}
                </button>
              </form>

              {isRxLoading && (
                <div className="loading-spinner">
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Đang kết nối Cổng đơn thuốc QĐ 228...
                </div>
              )}

              {/* Inline Error Container */}
              {rxError && (
                <div className="results-card mb-8" style={{ borderColor: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.03)' }}>
                  <h3 className="card-title" style={{ color: 'var(--danger-color)', borderBottomColor: 'rgba(239, 68, 68, 0.1)' }}>
                    <i className="fa-solid fa-circle-exclamation"></i> Lỗi tra cứu đơn thuốc
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {rxError}
                  </p>
                </div>
              )}

              {rxData && (
                <div className="results-card">
                  <h3 className="card-title">
                    <i className="fa-solid fa-circle-check text-success"></i> Thông tin đơn thuốc
                  </h3>
                  <div className="rx-info-grid">
                    <div className="rx-info-item">
                      <span className="info-label">Bệnh nhân</span>
                      <span className="info-value">{rxData.patientName || 'N/A'}</span>
                    </div>
                    <div className="rx-info-item">
                      <span className="info-label">Chẩn đoán</span>
                      <span className="info-value">{rxData.diagnosis || 'N/A'}</span>
                    </div>
                    <div className="rx-info-item">
                      <span className="info-label">Bác sĩ kê đơn</span>
                      <span className="info-value">{rxData.doctorName || 'N/A'}</span>
                    </div>
                    <div className="rx-info-item">
                      <span className="info-label">Ngày sinh bệnh nhân</span>
                      <span className="info-value">{rxData.patientBirthDate || 'N/A'}</span>
                    </div>
                  </div>

                  <h4 className="sub-title">Danh sách thuốc được kê</h4>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mã thuốc</th>
                          <th>Tên thuốc</th>
                          <th>Số lượng kê</th>
                          <th>Số lượng thực bán *</th>
                          <th>Đơn vị</th>
                          <th>Cách dùng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rxData.items?.map((item) => (
                          <tr key={item.drugCode}>
                            <td><strong>{item.drugCode || 'N/A'}</strong></td>
                            <td>{item.drugName || 'N/A'}</td>
                            <td>{item.prescribedQuantity || 0}</td>
                            <td>
                              <input
                                type="number"
                                className="rx-sale-input"
                                value={item.drugCode ? (rxSaleQuantities[item.drugCode] ?? 0) : 0}
                                min="0"
                                max={item.prescribedQuantity || 0}
                                onChange={(e) => {
                                  if (item.drugCode) {
                                    handleRxQtyChange(
                                      item.drugCode,
                                      parseInt(e.target.value) || 0,
                                      item.prescribedQuantity || 0
                                    );
                                  }
                                }}
                              />
                            </td>
                            <td>
                              <span className="badge-custom">{item.unitName || 'N/A'}</span>
                            </td>
                            <td>{item.usageInstruction || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleRxReportSale}
                    className="submit-btn"
                    style={{ marginTop: '1.5rem', maxWidth: '320px' }}
                    disabled={isReportingSale}
                  >
                    {isReportingSale ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Đang báo cáo...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up"></i> Gửi báo cáo số lượng bán (UC05)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: System Configurations */}
          {activeTab === 'settings' && (
            <div className="animate-fade">
              <form onSubmit={(e) => handleSaveSettings(e, false)} className="form-card max-w-2xl mx-auto">
                <h3 className="card-title">
                  <i className="fa-solid fa-gears"></i> Cấu hình kết nối SDK
                </h3>
                
                <h4 className="sub-title">CƠ SỞ DỮ LIỆU DƯỢC QUỐC GIA (QĐ 522)</h4>
                
                <div className="form-group">
                  <label htmlFor="cfg-duoc-user">Tài khoản CSDL Dược *</label>
                  <input
                    type="text"
                    id="cfg-duoc-user"
                    required
                    value={cfgDuocUser}
                    onChange={(e) => setCfgDuocUser(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cfg-duoc-pass">Mật khẩu CSDL Dược *</label>
                  <input
                    type="password"
                    id="cfg-duoc-pass"
                    placeholder="••••••••"
                    value={cfgDuocPass}
                    onChange={(e) => setCfgDuocPass(e.target.value)}
                  />
                  <span className="text-[11px] text-slate-500">
                    * Để trống nếu không muốn cập nhật lại mật khẩu cũ.
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cfg-duoc-store">Mã nhà thuốc (Store ID) (Tùy chọn)</label>
                    <input
                      type="text"
                      id="cfg-duoc-store"
                      value={cfgDuocStore}
                      onChange={(e) => setCfgDuocStore(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cfg-duoc-wh">Mã kho (Warehouse Code) (Tùy chọn)</label>
                    <input
                      type="text"
                      id="cfg-duoc-wh"
                      value={cfgDuocWh}
                      onChange={(e) => setCfgDuocWh(e.target.value)}
                    />
                  </div>
                </div>

                <h4 className="sub-title mt-8">CỔNG ĐƠN THUỐC QUỐC GIA (QĐ 228)</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="cfg-rx-appname">App Name (Mã cơ sở QĐ 228)</label>
                    <input
                      type="text"
                      id="cfg-rx-appname"
                      value={cfgRxAppName}
                      onChange={(e) => setCfgRxAppName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="cfg-rx-appkey">App Key (Khóa bảo mật QĐ 228)</label>
                    <input
                      type="password"
                      id="cfg-rx-appkey"
                      placeholder="••••••••"
                      value={cfgRxAppKey}
                      onChange={(e) => setCfgRxAppKey(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={isConfiguring}>
                  {isConfiguring ? 'Đang lưu cấu hình...' : 'Lưu & Áp dụng cấu hình'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
