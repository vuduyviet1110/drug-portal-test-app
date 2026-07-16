import React from 'react';
import { PrescriptionData } from '../types';

interface PrescriptionTabProps {
  handleRxLookup: (e?: React.FormEvent) => Promise<void>;
  isRxLoading: boolean;
  rxInput: string;
  setRxInput: (val: string) => void;
  rxError: string | null;
  rxData: PrescriptionData | null;
  rxSaleQuantities: Record<string, number>;
  handleRxQtyChange: (drugCode: string, value: number, max: number) => void;
  handleRxReportSale: () => Promise<void>;
  isReportingSale: boolean;
}

export default function PrescriptionTab({
  handleRxLookup,
  isRxLoading,
  rxInput,
  setRxInput,
  rxError,
  rxData,
  rxSaleQuantities,
  handleRxQtyChange,
  handleRxReportSale,
  isReportingSale,
}: PrescriptionTabProps) {
  return (
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
                <i className="fa-solid fa-cloud-arrow-up"></i> Gửi báo cáo số lượng bán
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
