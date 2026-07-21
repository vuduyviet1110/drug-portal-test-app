import React, { useState } from 'react';
import { DrugItem, BackendActivityEntry } from '../types';
import BackendActivityPanel from './BackendActivityPanel';

interface SearchTabProps {
  handleSearch: (e?: React.FormEvent) => Promise<void>;
  isSearching: boolean;
  searchKeyword: string;
  setSearchKeyword: (val: string) => void;
  catalogError: string | null;
  setActiveTab: (tab: 'search' | 'stock' | 'prescription' | 'settings') => void;
  searchResults: DrugItem[];
  searchCount: number;
  isSearchActive: boolean;
  handleSelectDrugForSync: (drug: DrugItem) => void;
  totalPages: number;
  currentPage: number;
  loadCatalogDrugs: (page: number) => Promise<void>;
  backendActivityLogs: BackendActivityEntry[];
  isBackendActive: boolean;
}

export default function SearchTab({
  handleSearch,
  isSearching,
  searchKeyword,
  setSearchKeyword,
  catalogError,
  setActiveTab,
  searchResults,
  searchCount,
  isSearchActive,
  handleSelectDrugForSync,
  totalPages,
  currentPage,
  loadCatalogDrugs,
  backendActivityLogs,
  isBackendActive,
}: SearchTabProps) {
  const isLoading = isSearching || isBackendActive;
  const hasResults = searchResults.length > 0;
  const showLoadingPlaceholder = isLoading && !hasResults && !catalogError;

  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drugDetail, setDrugDetail] = useState<any | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleViewDetail = async (id: string) => {
    setSelectedDrugId(id);
    setIsFetchingDetail(true);
    setDrugDetail(null);
    setDetailError(null);
    try {
      const res = await fetch(`/api/drugs/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Không thể tải thông tin chi tiết thuốc.');
      }
      const data = await res.json();
      setDrugDetail(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setIsFetchingDetail(false);
    }
  };

  return (
    <div className="animate-fade">
      <form onSubmit={handleSearch} className="search-bar !mb-6">
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

      <div className="search-split-layout">
        <div className="search-split-main">
          {showLoadingPlaceholder && (
            <div className="results-card search-status-card">
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              <p>
                <strong>Đang xử lý yêu cầu...</strong>
                <br />
                Kết quả sẽ hiển thị tại đây. Theo dõi quy trình backend ở cột bên phải.
              </p>
            </div>
          )}

          {catalogError && (
            <div
              className="results-card"
              style={{ borderColor: 'var(--danger-color)', background: 'rgba(225, 29, 72, 0.03)' }}
            >
              <h3
                className="card-title"
                style={{ color: 'var(--danger-color)', borderBottomColor: 'rgba(225, 29, 72, 0.1)' }}
              >
                <i className="fa-solid fa-circle-exclamation"></i> Lỗi kết nối CSDL Dược
              </h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">{catalogError}</p>
              <button className="action-btn" onClick={() => setActiveTab('settings')}>
                <i className="fa-solid fa-gears"></i> Đi tới Cấu hình hệ thống để cập nhật lại mật khẩu
              </button>
            </div>
          )}

          {hasResults && !catalogError && (
            <div className={`results-card ${isLoading ? 'search-results-loading' : ''}`}>
              <h3 className="card-title">
                <i className="fa-solid fa-layer-group"></i>
                {isSearchActive ? 'Kết quả tìm kiếm' : 'Danh mục thuốc CSDL Dược'} ({searchCount})
                {isLoading && (
                  <span className="ml-2 text-xs font-normal text-teal-600">
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Đang cập nhật...
                  </span>
                )}
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
                        <td>
                          <strong>{item.id}</strong>
                        </td>
                        <td>{item.name}</td>
                        <td>
                          <span className="badge-custom">{item.registrationNumber || 'N/A'}</span>
                        </td>
                        <td>
                          <span className="badge-custom success">{item.source.toUpperCase()}</span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="action-btn" onClick={() => handleViewDetail(item.id)}>
                              <i className="fa-solid fa-circle-info"></i> Chi tiết
                            </button>
                            <button className="action-btn" onClick={() => handleSelectDrugForSync(item)}>
                              <i className="fa-solid fa-cart-plus"></i> Chọn
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!isSearchActive && totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => loadCatalogDrugs(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="action-btn disabled:opacity-40"
                  >
                    <i className="fa-solid fa-chevron-left"></i> Trang trước
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => loadCatalogDrugs(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="action-btn disabled:opacity-40"
                  >
                    Trang sau <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLoading && !catalogError && !hasResults && (
            <div className="results-card search-status-card">
              <i className="fa-solid fa-pills"></i>
              <p>Không tìm thấy thuốc nào trong danh sách.</p>
            </div>
          )}
        </div>

        <aside className="search-split-log">
          <BackendActivityPanel
            variant="sidebar"
            title="Nhật ký backend"
            entries={backendActivityLogs}
            isActive={isBackendActive}
            emptyMessage="Thực hiện tìm kiếm hoặc tải danh mục để xem quy trình xử lý phía server (proxy, kết nối, gọi API)..."
          />
        </aside>
      </div>

      {/* Drug Detail Modal */}
      {selectedDrugId !== null && (
        <div className="modal-overlay" onClick={() => setSelectedDrugId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-pills"></i> Chi tiết thông tin thuốc
              </h3>
              <button className="modal-close-btn" onClick={() => setSelectedDrugId(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {isFetchingDetail ? (
                <div className="text-center py-8">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl text-teal-600 mb-2"></i>
                  <p className="text-sm text-slate-500">Đang tải thông tin chi tiết từ CSDL Dược...</p>
                </div>
              ) : detailError ? (
                <div className="p-4 border border-rose-200 bg-rose-50 text-rose-700 rounded-lg text-sm">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                  {detailError}
                </div>
              ) : drugDetail ? (
                <div className="detail-grid">
                  <div className="detail-item detail-full-width">
                    <span className="detail-label">Tên thuốc</span>
                    <span className="detail-value text-base text-teal-700 font-bold">{drugDetail.name}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Mã thuốc (ID)</span>
                    <span className="detail-value">{drugDetail.id}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Mã Thuốc Quốc Gia</span>
                    <span className="detail-value">{drugDetail.maThuocQg || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Số đăng ký</span>
                    <span className="detail-value">
                      <span className="badge-custom">{drugDetail.registrationNumber || 'Chưa cập nhật'}</span>
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Hàm lượng</span>
                    <span className="detail-value">{drugDetail.strength || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Dạng bào chế</span>
                    <span className="detail-value">{drugDetail.dosageForm || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Đường dùng</span>
                    <span className="detail-value">{drugDetail.route?.name || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Đơn vị cơ bản</span>
                    <span className="detail-value">{drugDetail.basicUnitName || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Tỷ lệ quy đổi</span>
                    <span className="detail-value">{drugDetail.conversionRate || '1.0'}</span>
                  </div>

                  <div className="detail-item detail-full-width">
                    <span className="detail-label">Nhà sản xuất</span>
                    <span className="detail-value">
                      {drugDetail.manufacturer?.name || 'Chưa cập nhật'}
                      {drugDetail.manufacturer?.country && ` (${drugDetail.manufacturer.country})`}
                    </span>
                  </div>

                  <div className="detail-item detail-full-width">
                    <span className="detail-label">Nước sản xuất</span>
                    <span className="detail-value">{drugDetail.countryOfManufacture || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="detail-item detail-full-width">
                    <span className="detail-label">Danh sách hoạt chất</span>
                    <span className="detail-value">
                      {drugDetail.activeIngredients && drugDetail.activeIngredients.length > 0
                        ? drugDetail.activeIngredients
                            .map((i: { name?: string; concentration?: string }) => `${i.name || ''} ${i.concentration ? `(${i.concentration})` : ''}`)
                            .join(', ')
                        : 'Không tìm thấy thông tin hoạt chất'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400 py-4">Không có dữ liệu.</div>
              )}
            </div>
            
            <div className="modal-footer">
              {drugDetail && (
                <button
                  className="submit-btn"
                  onClick={() => {
                    handleSelectDrugForSync(drugDetail);
                    setSelectedDrugId(null);
                  }}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  <i className="fa-solid fa-cart-plus"></i> Chọn nhập/xuất
                </button>
              )}
              <button
                className="action-btn"
                onClick={() => setSelectedDrugId(null)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

