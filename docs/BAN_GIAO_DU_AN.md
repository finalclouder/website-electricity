# TÀI LIỆU BÀN GIAO DỰ ÁN

## 1. Thông tin chung

- **Tên dự án:** Liveline PCBN - PATCTC Generator
- **Loại hệ thống:** Ứng dụng web full-stack phục vụ tạo, quản lý và xuất phương án tổ chức thi công trên cao thế (PATCTC), kèm mạng xã hội nội bộ, quản lý tài liệu và khu vực quản trị nội dung.
- **Ngôn ngữ lập trình chính:** TypeScript
- **Mô hình triển khai:** 01 ứng dụng Node.js chạy đồng thời backend Express và frontend React/Vite
- **Cơ sở dữ liệu chính:** Supabase PostgreSQL
- **Lưu trữ tệp:** Supabase Storage, Cloudflare R2 và thư mục cục bộ `uploads/` cho media landing page

## 2. Mục tiêu hệ thống

Hệ thống được xây dựng để phục vụ nghiệp vụ lập phương án thi công trong ngành điện lực, đồng thời số hóa một số tác vụ vận hành nội bộ:

- Tạo và chỉnh sửa biểu mẫu PATCTC.
- Xuất hồ sơ ra định dạng `DOCX` và `PDF`.
- Lưu trữ, tra cứu, sao chép và chia sẻ tài liệu nội bộ.
- Quản lý bài đăng, bình luận, tương tác và thông báo nội bộ.
- Quản trị người dùng, phê duyệt tài khoản và biên tập landing page.

## 3. Phạm vi chức năng hiện tại

### 3.1. Khối PATCTC

- Nhập liệu hồ sơ PATCTC theo nhiều phần biểu mẫu.
- Tự động xem trước nội dung trước khi xuất file.
- Lưu tài liệu vào hệ thống với các trạng thái như `draft`, `completed`, `approved`.
- Xuất tài liệu qua API:
  - `POST /api/export/docx`
  - `POST /api/export/pdf`

### 3.2. Khối xác thực và phân quyền

- Đăng ký tài khoản mới.
- Đăng nhập bằng email và mật khẩu.
- Xác thực bằng JWT.
- Phân quyền `admin` và `user`.
- Kiểm soát trạng thái tài khoản `pending`, `approved`, `rejected`.

### 3.3. Khối mạng xã hội nội bộ

- Đăng bài viết có nội dung và media.
- Bình luận, thích, chia sẻ bài viết.
- Theo dõi người dùng, gửi và xử lý lời mời kết bạn.
- Gửi thông báo realtime dựa trên Supabase Realtime.

### 3.4. Khối quản lý tài liệu

- Lưu và cập nhật tài liệu PATCTC.
- Tra cứu tài liệu công khai hoặc tài liệu theo người dùng.
- Theo dõi lượt tải tài liệu.

### 3.5. Khối quản trị

- Xem danh sách người dùng.
- Phê duyệt hoặc từ chối tài khoản.
- Quản lý nội dung landing page.
- Upload ảnh và video cho landing page.

## 4. Kiến trúc kỹ thuật

Hệ thống đang được tổ chức theo mô hình full-stack TypeScript:

- **Frontend:** React 19 + Vite 6 + Tailwind CSS 4.
- **Backend:** Express 4 chạy bằng `tsx`.
- **Database layer:** tập trung trong file `database.ts`, giao tiếp với Supabase bằng `@supabase/supabase-js`.
- **State management:** Zustand.
- **Realtime:** Supabase Realtime dùng phía client cho thông báo và cập nhật bài viết.
- **Xuất tài liệu:** `docx` để sinh DOCX và `pdfkit-table` để sinh PDF.

Luồng tổng quát:

1. Người dùng thao tác trên giao diện React.
2. Frontend gọi API nội bộ thông qua `src/utils/api.ts`.
3. Express xử lý nghiệp vụ, xác thực bằng JWT middleware.
4. Dữ liệu được đọc/ghi tại Supabase PostgreSQL.
5. Media được lưu ở Supabase Storage, Cloudflare R2 hoặc thư mục cục bộ tùy chức năng.

## 5. Nền tảng chạy

### 5.1. Môi trường phát triển

- Hệ điều hành hỗ trợ: Windows, Linux, macOS.
- Runtime yêu cầu:
  - Node.js 18 trở lên
  - npm 9 trở lên
- Chạy local bằng lệnh:
  - `npm install`
  - `npm run dev`

### 5.2. Môi trường triển khai

- Ứng dụng backend chạy bằng Node.js.
- Frontend production build được sinh vào thư mục `dist/`.
- `server.ts` phục vụ:
  - Vite middleware trong môi trường development
  - static file từ `dist/` trong môi trường production
- Ứng dụng có thể chạy sau reverse proxy như Nginx/Cloudflare.

## 6. Công nghệ sử dụng

### 6.1. Frontend

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Zustand
- Lucide React
- Sonner
- Motion

### 6.2. Backend

- Express 4
- tsx
- jsonwebtoken
- bcryptjs
- multer
- helmet
- express-rate-limit
- docx
- pdfkit-table

### 6.3. Dịch vụ tích hợp

- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- Google Safe Browsing API
- Google Gemini API
- Cloudflare R2

## 7. Cấu trúc thư mục chính

```text
server.ts
database.ts
package.json
.env.example
supabase/
src/
  api/
  components/
  pages/
  store/
  utils/
public/
uploads/
tests/
docs/
```

Các thành phần quan trọng:

- `server.ts`: khởi tạo Express server, mount API, xuất DOCX/PDF, phục vụ frontend.
- `database.ts`: lớp truy cập dữ liệu tập trung.
- `src/api/`: các route backend theo từng nghiệp vụ.
- `src/pages/`: các màn hình chính của hệ thống.
- `src/store/`: Zustand stores cho auth, social, landing, editor.
- `supabase/schema.sql`: cấu trúc CSDL PostgreSQL hiện tại.
- `supabase/migrate-sqlite-to-supabase.mjs`: script migrate dữ liệu từ SQLite cũ sang Supabase.

## 8. Biến môi trường cần cấu hình

Các biến môi trường chính đang được sử dụng:

- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- `GOOGLE_SAFE_BROWSING_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `PATCTC_UPLOAD_ROOT`
- `SEED_DEFAULT_USERS`

Chi tiết cách dùng được mô tả tại [HUONG_DAN_DUNG_LOCAL.md](./HUONG_DAN_DUNG_LOCAL.md).

## 9. Phương án bàn giao Supabase

Nếu cơ sở dữ liệu đang vận hành trên Supabase, có 2 phương án bàn giao kỹ thuật phù hợp.

### 9.1. Phương án ưu tiên: chuyển nguyên project Supabase

Đây là phương án nên ưu tiên khi đối tác cần tiếp quản luôn môi trường hiện tại, vì sẽ giữ nguyên:

- dữ liệu database,
- project URL,
- storage trong cùng project,
- cấu hình đang vận hành trên project đó.

Quy trình đề xuất:

1. Bên nhận tạo hoặc chuẩn bị sẵn một `organization` trên Supabase.
2. Bên bàn giao phải là `Owner` của organization nguồn.
3. Bên bàn giao cần là thành viên của organization đích.
4. Tại Supabase Dashboard, vào `Project Settings > General > Transfer Project`.
5. Chọn organization đích và xác nhận chuyển.
6. Sau khi bên nhận kiểm tra đầy đủ quyền truy cập, bên bàn giao rút quyền hoặc rời organization.

Điều kiện cần kiểm tra trước khi chuyển:

- không còn GitHub integration đang hoạt động,
- không có cấu hình chặn việc transfer như một số project-scoped roles hoặc log drains,
- organization đích có đủ điều kiện gói dịch vụ tương ứng.

Lưu ý:

- chuyển project không dùng để đổi region,
- có thể phát sinh downtime ngắn nếu thay đổi giữa các gói dịch vụ khác nhau,
- billing sau khi chuyển sẽ tính về organization đích.

### 9.2. Phương án thay thế: tạo project mới và migrate dữ liệu

Phương án này dùng khi:

- đối tác muốn tách hẳn sang project riêng,
- cần đổi region,
- hoặc không thể dùng tính năng transfer project.

Các bước tổng quát:

1. Tạo project Supabase mới.
2. Sao lưu schema và dữ liệu từ project cũ.
3. Restore sang project mới.
4. Sao chép storage objects nếu đang dùng Supabase Storage.
5. Cấu hình lại API keys, realtime, secrets và tích hợp liên quan.
6. Cập nhật lại file `.env` của ứng dụng.

Trong trường hợp này cần rà soát tối thiểu các biến:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 9.3. Lưu ý riêng cho dự án hiện tại

Theo code hiện tại của dự án:

- dữ liệu nghiệp vụ chính đang đọc/ghi qua Supabase PostgreSQL,
- xác thực ứng dụng đang dùng JWT riêng và bảng `users` riêng của hệ thống,
- một phần media landing page đang lưu ở thư mục cục bộ `uploads/`,
- media bài viết có thể liên quan đến Supabase Storage hoặc Cloudflare R2 tùy luồng upload.

Do đó khi bàn giao cần kiểm tra đủ các thành phần sau:

1. Supabase project.
2. Thư mục `uploads/` trên máy chủ nếu đang dùng.
3. Cloudflare R2 nếu dữ liệu media bài viết đang nằm ở đó.

## 10. Tài liệu đi kèm khi bàn giao

Đề xuất bàn giao cho đối tác tối thiểu các tài liệu sau:

- [KIEN_TRUC_HE_THONG.md](./KIEN_TRUC_HE_THONG.md)
- [TAI_LIEU_CSDL.md](./TAI_LIEU_CSDL.md)
- [HUONG_DAN_DUNG_LOCAL.md](./HUONG_DAN_DUNG_LOCAL.md)
- [TAI_LIEU_KY_THUAT_TONG_HOP.md](./TAI_LIEU_KY_THUAT_TONG_HOP.md)
- Mã nguồn hiện tại của dự án
- File `.env.example`
- Script SQL trong thư mục `supabase/`

## 11. Phạm vi hỗ trợ dựng local

Sau khi bàn giao mã nguồn và tài liệu, phạm vi hỗ trợ dựng local thường gồm:

- Hướng dẫn cài Node.js và dependency.
- Hướng dẫn tạo project Supabase hoặc cấp thông tin kết nối Supabase hiện có.
- Import schema SQL.
- Cấu hình file `.env`.
- Hỗ trợ xử lý lỗi môi trường khi chạy `npm run dev`.

