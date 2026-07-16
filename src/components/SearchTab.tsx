import React from 'react';
import { DrugItem } from '../types';

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
}: SearchTabProps) {
  return (
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

      {catalogError && (
        <div className="results-card mb-6" style={{ borderColor: 'var(--danger-color)', background: 'rgba(225, 29, 72, 0.03)' }}>
          <h3 className="card-title" style={{ color: 'var(--danger-color)', borderBottomColor: 'rgba(225, 29, 72, 0.1)' }}>
            <i className="fa-solid fa-circle-exclamation"></i> Lỗi kết nối CSDL Dược
          </h3>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            {catalogError}
          </p>
          <button className="action-btn" onClick={() => setActiveTab('settings')}>
            <i className="fa-solid fa-gears"></i> Đi tới Cấu hình hệ thống để cập nhật lại mật khẩu
          </button>
        </div>
      )}

      {!isSearching && !catalogError && searchResults.length > 0 && (
        <div className="results-card">
          <h3 className="card-title">
            <i className="fa-solid fa-layer-group"></i>
            {isSearchActive ? 'Kết quả tìm kiếm' : 'Danh mục thuốc CSDL Dược'} ({searchCount})
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

          {/* Pagination Controls - only display when not searching by keyword */}
          {!isSearchActive && totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => loadCatalogDrugs(currentPage - 1)}
                disabled={currentPage === 1}
                className="action-btn disabled:opacity-40"
              >
                <i className="fa-solid fa-chevron-left"></i> Trang trước
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => loadCatalogDrugs(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="action-btn disabled:opacity-40"
              >
                Trang sau <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {!isSearching && !catalogError && searchResults.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          Không tìm thấy thuốc nào trong danh sách.
        </div>
      )}
    </div>
  );
}
