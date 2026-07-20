'use client';

import React, { useState, useEffect } from 'react';
import { DrugItem, UnitItem, TransactionHistoryItem, PrescriptionItem, PrescriptionData } from '../types';
import Header from '../components/Header';
import SetupView from '../components/SetupView';
import SearchTab from '../components/SearchTab';
import StockTab from '../components/StockTab';
import PrescriptionTab from '../components/PrescriptionTab';
import SettingsTab from '../components/SettingsTab';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'stock' | 'prescription' | 'settings'>('search');

  // Configuration settings state
  const [cfgDuocUser, setCfgDuocUser] = useState('');
  const [cfgDuocPass, setCfgDuocPass] = useState('');
  const [cfgDuocStore, setCfgDuocStore] = useState('');
  const [cfgDuocWh, setCfgDuocWh] = useState('');
  const [cfgRxAppName, setCfgRxAppName] = useState('');
  const [cfgRxAppKey, setCfgRxAppKey] = useState('');
  const [cfgProxyUrl, setCfgProxyUrl] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Setup gate state (null = checking, false = show setup page, true = authenticated)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Catalog search & pagination state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<DrugItem[]>([]);
  const [searchCount, setSearchCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false); // check if user performed keyword search

  // Pagination states for default catalog loading
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Display 10 items per page
  const [catalogError, setCatalogError] = useState<string | null>(null);

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
  const [configSteps, setConfigSteps] = useState<{ step: string; message: string; type?: string }[]>([]);

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

      if (data.csdlDuoc && data.csdlDuoc.username) {
        setCfgDuocUser(data.csdlDuoc.username || '');
        setCfgDuocPass(data.csdlDuoc.password || '');
        setCfgDuocStore(data.csdlDuoc.storeId || '');
        setCfgDuocWh(data.csdlDuoc.warehouseCode || '');
        if (data.qd228) {
          setCfgRxAppName(data.qd228.appName || '');
          setCfgRxAppKey(data.qd228.appKey || '');
        }
        setCfgProxyUrl(data.proxyUrl || '');
        setIsConfigured(true);
        loadMasterUnits();
        loadCatalogDrugs(1);
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
        setCfgDuocPass(data.csdlDuoc.password || '');
        setCfgDuocStore(data.csdlDuoc.storeId || '');
        setCfgDuocWh(data.csdlDuoc.warehouseCode || '');
      }
      if (data.qd228) {
        setCfgRxAppName(data.qd228.appName || '');
        setCfgRxAppKey(data.qd228.appKey || '');
      }
      setCfgProxyUrl(data.proxyUrl || '');
    } catch (err: any) {
      console.warn('Không thể tải cấu hình lưu sẵn:', err.message);
    }
  }

  async function handleSaveSettings(e: React.FormEvent, isSetupMode = false) {
    e.preventDefault();
    setIsConfiguring(true);
    setSetupError(null);
    setConfigSteps([]);
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
          } : undefined,
          proxyUrl: cfgProxyUrl.trim() || undefined
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Không thể kết nối đến máy chủ API để lưu cấu hình.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          
          if (data.error) {
            setConfigSteps(prev => [...prev, { step: 'error', message: data.error, type: 'error' }]);
            throw new Error(data.error);
          }
          
          setConfigSteps(prev => [...prev, { step: data.step, message: data.message, type: data.step === 'success' || data.step === 'validation_success' ? 'success' : 'info' }]);
        }
      }

      // Small delay so they can read the success message
      await new Promise(r => setTimeout(r, 850));

      if (isSetupMode) {
        setIsConfigured(true);
      }

      loadMasterUnits();
      loadCatalogDrugs(1);
      loadTxHistory();
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setIsConfiguring(false);
    }
  }

  async function handleResetSettings() {
    if (
      !confirm(
        'Bạn có chắc chắn muốn xóa toàn bộ cấu hình kết nối SDK? Ứng dụng sẽ yêu cầu cấu hình lại từ đầu.',
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/config', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi xóa cấu hình');
      }
      alert('✅ Đã xóa cấu hình thành công!');
      // Reset form states
      setCfgDuocUser('');
      setCfgDuocPass('');
      setCfgDuocStore('');
      setCfgDuocWh('');
      setCfgRxAppName('');
      setCfgRxAppKey('');
      setCfgProxyUrl('');
      setIsConfigured(false);
    } catch (err: any) {
      alert(`❌ Lỗi khi xóa cấu hình: ${err.message}`);
    }
  }

  // ─── MASTER DATA ──────────────────────────────────────────────────
  async function loadMasterUnits() {
    try {
      const res = await fetch('/api/master/units');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      const units = Array.isArray(data) ? data : (data.items || []);
      setUnitsDropdown(units);
      if (units.length > 0) {
        setStockUnitId(units[0].id);
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

  // Load catalog list with page parameter
  async function loadCatalogDrugs(pageNumber: number) {
    setIsSearching(true);
    setIsSearchActive(false);
    setCatalogError(null);
    try {
      const res = await fetch(`/api/drugs?page=${pageNumber}&pageSize=${pageSize}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Không thể tải danh sách thuốc từ CSDL Dược');
      }

      const items = data.items || [];
      setSearchResults(items);
      setSearchCount(data.totalCount || data.total || items.length);
      setCurrentPage(pageNumber);

      // Populate dropdown for sync tab
      setDrugsDropdown(items);
      if (items.length > 0) {
        setStockDrugId(items[0].registrationNumber || items[0].id);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh mục thuốc:', err.message);
      setCatalogError(err.message);
      setSearchResults([]);
      setSearchCount(0);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchKeyword.trim()) {
      loadCatalogDrugs(1);
      return;
    }
    setIsSearching(true);
    setIsSearchActive(true);
    setCatalogError(null);
    try {
      const res = await fetch(`/api/drugs/search?keyword=${encodeURIComponent(searchKeyword)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tìm kiếm thuốc');
      }

      const items = data.items || [];
      setSearchResults(items);
      setSearchCount(data.total || items.length);

      // Sync dropdown with search results
      if (items.length > 0) {
        setDrugsDropdown(items);
        setStockDrugId(items[0].registrationNumber || items[0].id);
      }
    } catch (err: any) {
      setCatalogError(err.message);
      setSearchResults([]);
      setSearchCount(0);
    } finally {
      setIsSearching(false);
    }
  }

  // Calculate total pages for default catalog pagination
  const totalPages = Math.ceil(searchCount / pageSize);

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
      if (result.status === 'completed') {
        addLog('Đồng bộ dữ liệu lên CSDL Dược thành công!', 'success');
      } else {
        const rawData = result.raw || {};
        const messages = rawData.messages || rawData.message || rawData.errors || [];
        const msgStr = Array.isArray(messages) ? messages.join(', ') : String(messages);
        addLog(`Đồng bộ thất bại: ${msgStr || 'CSDL Dược báo lỗi không xác định'}`, 'error');
      }

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

      alert('✅ Đã gửi báo cáo số lượng bán lên Cổng đơn thuốc quốc gia thành công!');
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
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc] text-[#0f172a]">
        <div className="text-center">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#0d9488] mb-4"></i>
          <p className="text-sm text-slate-500 font-medium">Đang kiểm tra cấu hình kết nối...</p>
        </div>
      </div>
    );
  }

  // 2. Setup/Login Page when credentials are missing
  if (isConfigured === false) {
    return (
      <SetupView
        handleSaveSettings={handleSaveSettings}
        setupError={setupError}
        cfgDuocUser={cfgDuocUser}
        setCfgDuocUser={setCfgDuocUser}
        cfgDuocPass={cfgDuocPass}
        setCfgDuocPass={setCfgDuocPass}
        cfgDuocStore={cfgDuocStore}
        setCfgDuocStore={setCfgDuocStore}
        cfgDuocWh={cfgDuocWh}
        setCfgDuocWh={setCfgDuocWh}
        cfgRxAppName={cfgRxAppName}
        setCfgRxAppName={setCfgRxAppName}
        cfgRxAppKey={cfgRxAppKey}
        setCfgRxAppKey={setCfgRxAppKey}
        cfgProxyUrl={cfgProxyUrl}
        setCfgProxyUrl={setCfgProxyUrl}
        isConfiguring={isConfiguring}
        configSteps={configSteps}
      />
    );
  }

  // 3. Normal Dashboard Layout when authenticated
  return (
    <div className="container-custom">
      <Header />

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
        {activeTab === 'search' && (
          <SearchTab
            handleSearch={handleSearch}
            isSearching={isSearching}
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
            catalogError={catalogError}
            setActiveTab={setActiveTab}
            searchResults={searchResults}
            searchCount={searchCount}
            isSearchActive={isSearchActive}
            handleSelectDrugForSync={handleSelectDrugForSync}
            totalPages={totalPages}
            currentPage={currentPage}
            loadCatalogDrugs={loadCatalogDrugs}
          />
        )}

        {activeTab === 'stock' && (
          <StockTab
            stockTxType={stockTxType}
            setStockTxType={setStockTxType}
            stockReason={stockReason}
            setStockReason={setStockReason}
            stockDrugId={stockDrugId}
            setStockDrugId={setStockDrugId}
            drugsDropdown={drugsDropdown}
            unitsDropdown={unitsDropdown}
            stockQty={stockQty}
            setStockQty={setStockQty}
            stockUnitId={stockUnitId}
            setStockUnitId={setStockUnitId}
            stockBatch={stockBatch}
            setStockBatch={setStockBatch}
            stockExpiry={stockExpiry}
            setStockExpiry={setStockExpiry}
            stockManufacturer={stockManufacturer}
            setStockManufacturer={setStockManufacturer}
            stockRef={stockRef}
            setStockRef={setStockRef}
            isSyncing={isSyncing}
            handleSyncSubmit={handleSyncSubmit}
            logs={logs}
            txHistory={txHistory}
            loadCatalogDrugs={loadCatalogDrugs}
            isSearching={isSearching}
          />
        )}

        {activeTab === 'prescription' && (
          <PrescriptionTab
            handleRxLookup={handleRxLookup}
            isRxLoading={isRxLoading}
            rxInput={rxInput}
            setRxInput={setRxInput}
            rxError={rxError}
            rxData={rxData}
            rxSaleQuantities={rxSaleQuantities}
            handleRxQtyChange={handleRxQtyChange}
            handleRxReportSale={handleRxReportSale}
            isReportingSale={isReportingSale}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            handleSaveSettings={handleSaveSettings}
            cfgDuocUser={cfgDuocUser}
            setCfgDuocUser={setCfgDuocUser}
            cfgDuocPass={cfgDuocPass}
            setCfgDuocPass={setCfgDuocPass}
            cfgDuocStore={cfgDuocStore}
            setCfgDuocStore={setCfgDuocStore}
            cfgDuocWh={cfgDuocWh}
            setCfgDuocWh={setCfgDuocWh}
            cfgRxAppName={cfgRxAppName}
            setCfgRxAppName={setCfgRxAppName}
            cfgRxAppKey={cfgRxAppKey}
            setCfgRxAppKey={setCfgRxAppKey}
            cfgProxyUrl={cfgProxyUrl}
            setCfgProxyUrl={setCfgProxyUrl}
            handleResetSettings={handleResetSettings}
            isConfiguring={isConfiguring}
            configSteps={configSteps}
          />
        )}
      </main>
    </div>
  );
}
