import React from 'react';

interface SettingsTabProps {
  handleSaveSettings: (e: React.FormEvent, isSetupMode: boolean) => Promise<void>;
  cfgDuocUser: string;
  setCfgDuocUser: (val: string) => void;
  cfgDuocPass: string;
  setCfgDuocPass: (val: string) => void;
  cfgDuocStore: string;
  setCfgDuocStore: (val: string) => void;
  cfgDuocWh: string;
  setCfgDuocWh: (val: string) => void;
  cfgRxAppName: string;
  setCfgRxAppName: (val: string) => void;
  cfgRxAppKey: string;
  setCfgRxAppKey: (val: string) => void;
  isConfiguring: boolean;
}

export default function SettingsTab({
  handleSaveSettings,
  cfgDuocUser,
  setCfgDuocUser,
  cfgDuocPass,
  setCfgDuocPass,
  cfgDuocStore,
  setCfgDuocStore,
  cfgDuocWh,
  setCfgDuocWh,
  cfgRxAppName,
  setCfgRxAppName,
  cfgRxAppKey,
  setCfgRxAppKey,
  isConfiguring,
}: SettingsTabProps) {
  return (
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
  );
}
