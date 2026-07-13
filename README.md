# iCare Clinic Portal — Vietnam National Drug Portal Integration

Ứng dụng thử nghiệm tích hợp bộ thư viện `@icare1/drug-portal-sdk` viết bằng **Next.js (App Router)**, **Tailwind CSS v4**, **Prisma ORM**, và giao diện điều khiển chuyên nghiệp theo chuẩn thiết kế phòng khám.

---

## 🚀 Hướng dẫn khởi chạy nhanh

### 1. Cấu hình môi trường
Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```
*(Bạn có thể để trống các khóa tài khoản trong `.env` để kiểm tra màn hình cấu hình ban đầu trực quan trên giao diện).*

### 2. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 3. Tạo cơ sở dữ liệu SQLite cục bộ (Prisma Migration)
```bash
npx prisma migrate dev --name init
```

### 4. Khởi chạy máy chủ phát triển
```bash
npm run dev
```
Truy cập **[http://localhost:3000](http://localhost:3000)** trên trình duyệt.

---

## 🛠️ Quản lý & Làm sạch Cấu hình (SQLite)

Thông tin cấu hình tài khoản (CSDL Dược & QĐ 228) sau khi điền trên giao diện sẽ được mã hóa và lưu trữ cố định vào tệp tin SQLite `dev.db` cục bộ của bạn.

### Cách 1: Reset trắng toàn bộ Database
Nếu muốn làm sạch toàn bộ dữ liệu mẫu, xóa trắng tài khoản và lịch sử giao dịch để chạy lại từ đầu:
```bash
npx prisma db push --force-reset
```

### Cách 2: Xem và sửa trực quan bằng Prisma Studio
Để kiểm tra hoặc xóa sửa thủ công từng bản ghi cấu hình/log giao dịch mà không cần lệnh SQL:
```bash
npx prisma studio
```
Truy cập đường dẫn hiển thị trên terminal (mặc định: `http://localhost:5555`) để xem bảng dữ liệu trực quan.

---

## ☁️ Triển khai lên Vercel & Thiết lập CI/CD

Vì mã nguồn đã được đẩy lên GitHub, cách tốt nhất để triển khai và thiết lập CI/CD tự động là liên kết tài khoản GitHub của bạn với Vercel.

### Các bước kết nối:
1. Truy cập **[Vercel Dashboard](https://vercel.com/new)**.
2. Đăng nhập bằng tài khoản **GitHub**.
3. Bấm **Import** dự án `drug-portal-test-app`.
4. Trong mục **Environment Variables**, bạn có thể cấu hình các biến môi trường mặc định (xem file `.env.example`).
5. Bấm **Deploy**.

> [!WARNING]
> **Lưu ý quan trọng về SQLite trên Vercel**:
> Vercel hoạt động trên môi trường **Serverless (Stateless / Ephemeral)**:
> - Tệp cơ sở dữ liệu SQLite `dev.db` sẽ bị xóa sạch hoặc mất đồng bộ mỗi khi Serverless Function khởi động lại hoặc có nhiều yêu cầu xử lý song song.
> - **Giải pháp khuyến nghị cho Production**: Nếu deploy lên Vercel, bạn nên thay đổi provider trong `schema.prisma` sang **PostgreSQL** (ví dụ: dùng **Vercel Postgres** miễn phí hoặc **Supabase / Neon Database**) thay vì dùng SQLite để đảm bảo dữ liệu cấu hình và log giao dịch được lưu trữ vĩnh viễn.

---

## 📦 Lệnh Build & Production
Để tạo bản build tối ưu hóa cho môi trường production:
```bash
npm run build
npm start
```
*Lưu ý: Lệnh build và dev của dự án này đã được cấu hình mặc định sử dụng trình biên dịch Webpack để tương thích tốt nhất với việc nạp thư viện cục bộ (local symlink).*
