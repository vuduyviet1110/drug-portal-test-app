import React from 'react';

interface SetupViewProps {
  handleSaveSettings: (e: React.FormEvent, isSetupMode: boolean) => Promise<void>;
  setupError: string | null;
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
  cfgProxyUrl: string;
  setCfgProxyUrl: (val: string) => void;
  isConfiguring: boolean;
}

export default function SetupView({
  handleSaveSettings,
  setupError,
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
  cfgProxyUrl,
  setCfgProxyUrl,
  isConfiguring,
}: SetupViewProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center p-4 bg-[#f8fafc]">
      <form
        onSubmit={(e) => handleSaveSettings(e, true)}
        className="form-card w-full max-w-md shadow-2xl relative z-10"
        style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
      >
        <div className="text-center mb-6">
          <i className="fa-solid fa-prescription-bottle-medical text-4xl text-[#0d9488] mb-2"></i>
          <h2 className="text-xl font-bold text-slate-800">Cấu hình iCare Portal</h2>
          <p className="text-xs text-slate-500 mt-1">Vui lòng cung cấp tài khoản CSDL Dược để kích hoạt hệ thống</p>
        </div>

        {setupError && (
          <div className="mb-4 p-3.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-md leading-relaxed">
            <i className="fa-solid fa-circle-exclamation mr-2 text-rose-500"></i>
            <strong>Đăng nhập thất bại:</strong> {setupError}
          </div>
        )}

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

        <div className="form-group mb-4">
          <label htmlFor="setup-proxy-url">Proxy Server URL (Tùy chọn)</label>
          <input
            type="text"
            id="setup-proxy-url"
            placeholder="http://username:password@proxy-ip:port"
            value={cfgProxyUrl}
            onChange={(e) => setCfgProxyUrl(e.target.value)}
          />
          <span className="text-[10px] text-slate-500 leading-relaxed mt-1 block">
            * Nếu trống, hệ thống sẽ tự động quét & tìm proxy Việt Nam miễn phí (có rủi ro dễ hết hạn/chậm, nên dùng proxy riêng trả phí của bạn để ổn định nhất).
          </span>
        </div>

        <details className="mb-4 text-xs text-slate-500 cursor-pointer">
          <summary className="font-semibold text-slate-700 mb-2">Cấu hình Cổng Đơn Thuốc QĐ 228 (Tùy chọn)</summary>
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
  );
}
