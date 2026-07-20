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
  cfgProxyUrl: string;
  setCfgProxyUrl: (val: string) => void;
  handleResetSettings: () => void;
  isConfiguring: boolean;
  configSteps: { step: string; message: string; type?: string }[];
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
  cfgProxyUrl,
  setCfgProxyUrl,
  handleResetSettings,
  isConfiguring,
  configSteps,
}: SettingsTabProps) {
  return (
    <div className="animate-fade">
      <form onSubmit={(e) => handleSaveSettings(e, false)} className="form-card max-w-2xl mx-auto relative overflow-hidden">
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
            autoComplete="new-password"
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

        <div className="form-group mt-4">
          <label htmlFor="cfg-proxy-url">Proxy Server URL (Tùy chọn)</label>
          <input
            type="text"
            id="cfg-proxy-url"
            placeholder="http://username:password@proxy-ip:port"
            value={cfgProxyUrl}
            onChange={(e) => setCfgProxyUrl(e.target.value)}
          />
          <span className="text-[11px] text-slate-500 leading-relaxed mt-1 block">
            * Nếu trống, hệ thống sẽ tự động quét & tìm proxy Việt Nam miễn phí (có rủi ro dễ hết hạn/chậm, nên dùng proxy riêng trả phí của bạn để ổn định nhất khi deploy lên Vercel/Cloud nước ngoài).
          </span>
        </div>

        <h4 className="sub-title pt-6 border-t border-slate-100 mt-8">CỔNG ĐƠN THUỐC QUỐC GIA (QĐ 228)</h4>

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
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button type="submit" className="submit-btn flex-grow" disabled={isConfiguring}>
            {isConfiguring ? 'Đang lưu cấu hình...' : 'Lưu & Áp dụng cấu hình'}
          </button>
          <button
            type="button"
            onClick={handleResetSettings}
            className="px-4 py-2 text-sm border border-rose-200 text-rose-600 bg-[#fff5f5] hover:bg-rose-100 transition rounded-md font-semibold"
          >
            <i className="fa-solid fa-trash-can mr-2"></i> Xóa cấu hình
          </button>
        </div>
      </form>
    </div>
  );
}
