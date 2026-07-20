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
  configSteps: { step: string; message: string; type?: string }[];
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
  configSteps,
}: SetupViewProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center p-4 bg-[#f8fafc]">
      <form
        onSubmit={(e) => handleSaveSettings(e, true)}
        className="form-card w-full max-w-md shadow-2xl relative z-10 overflow-hidden"
        style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
      >
        {isConfiguring && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 transition-all duration-300">
            {/* Radar Scanner Animation Container */}
            <div className="relative w-40 h-40 rounded-full border-2 border-teal-500/30 flex items-center justify-center overflow-hidden bg-teal-950/5 shadow-[0_0_25px_rgba(20,184,166,0.15)] mb-6">
              {/* Grid circles */}
              <div className="absolute w-28 h-28 rounded-full border border-teal-500/20"></div>
              <div className="absolute w-16 h-16 rounded-full border border-teal-500/10"></div>
              <div className="absolute w-full h-0.5 bg-teal-500/15"></div>
              <div className="absolute w-0.5 h-full bg-teal-500/15"></div>
              
              {/* Sweep Line */}
              <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 rounded-full origin-center animate-spin bg-[conic-gradient(from_0deg,transparent_50%,rgba(20,184,166,0.45)_100%)]"></div>
              
              {/* Center Dot */}
              <div className="absolute w-3 h-3 rounded-full bg-teal-400 animate-ping"></div>
              <div className="absolute w-2 h-2 rounded-full bg-teal-500"></div>

              {/* Dots appearing on radar screen */}
              <div className="absolute top-10 left-12 w-2 h-2 rounded-full bg-teal-400 opacity-60 animate-[pulse_1s_infinite]"></div>
              <div className="absolute bottom-12 right-14 w-2 h-2 rounded-full bg-teal-400 opacity-80 animate-[pulse_1.5s_infinite]"></div>
            </div>

            <div className="text-center space-y-2 mb-6">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide animate-pulse uppercase">ĐANG THIẾT LẬP KẾT NỐI SDK...</h3>
              <p className="text-xs text-slate-500 max-w-sm px-4">Đang chạy chuỗi kiểm thử kết nối, tìm kiếm proxy và đăng nhập xác thực. Vui lòng giữ nguyên màn hình.</p>
            </div>

            {/* Step list logs */}
            <div className="w-full bg-slate-900 rounded-lg p-4 border border-slate-800 h-44 overflow-y-auto text-left font-mono text-[10px] space-y-1.5 shadow-inner">
              {configSteps.map((step, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start space-x-1.5 ${
                    step.type === 'error' 
                      ? 'text-rose-400' 
                      : step.type === 'success' 
                        ? 'text-emerald-400 font-semibold' 
                        : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span>
                    {step.type === 'error' && '❌ '}
                    {step.type === 'success' && '✅ '}
                    {step.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
