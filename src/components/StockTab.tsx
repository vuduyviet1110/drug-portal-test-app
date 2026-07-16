import React from 'react';
import { DrugItem, UnitItem, TransactionHistoryItem } from '../types';

interface StockTabProps {
  stockTxType: 'stock-in' | 'stock-out' | 'stock-taking';
  setStockTxType: (val: 'stock-in' | 'stock-out' | 'stock-taking') => void;
  stockReason: string;
  setStockReason: (val: string) => void;
  stockDrugId: string;
  setStockDrugId: (val: string) => void;
  drugsDropdown: DrugItem[];
  unitsDropdown: UnitItem[];
  stockQty: number;
  setStockQty: (val: number) => void;
  stockUnitId: string;
  setStockUnitId: (val: string) => void;
  stockBatch: string;
  setStockBatch: (val: string) => void;
  stockExpiry: string;
  setStockExpiry: (val: string) => void;
  stockManufacturer: string;
  setStockManufacturer: (val: string) => void;
  stockRef: string;
  setStockRef: (val: string) => void;
  isSyncing: boolean;
  handleSyncSubmit: (e: React.FormEvent) => Promise<void>;
  logs: { text: string; type: 'info' | 'warn' | 'error' | 'success' }[];
  txHistory: TransactionHistoryItem[];
  loadCatalogDrugs: (page: number) => Promise<void>;
  isSearching: boolean;
}

export default function StockTab({
  stockTxType,
  setStockTxType,
  stockReason,
  setStockReason,
  stockDrugId,
  setStockDrugId,
  drugsDropdown,
  unitsDropdown,
  stockQty,
  setStockQty,
  stockUnitId,
  setStockUnitId,
  stockBatch,
  setStockBatch,
  stockExpiry,
  setStockExpiry,
  stockManufacturer,
  setStockManufacturer,
  stockRef,
  setStockRef,
  isSyncing,
  handleSyncSubmit,
  logs,
  txHistory,
  loadCatalogDrugs,
  isSearching,
}: StockTabProps) {
  return (
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
                  onClick={() => loadCatalogDrugs(1)}
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
  );
}
