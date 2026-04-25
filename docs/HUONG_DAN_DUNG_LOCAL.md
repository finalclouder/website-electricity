# HƯỚNG DẪN DỰNG DỰ ÁN TRÊN MÁY LOCAL

## 1. Mục đích

Tài liệu này hướng dẫn dựng và chạy dự án trên máy local để phục vụ tiếp nhận, kiểm thử và bảo trì.

## 2. Yêu cầu môi trường

Cài đặt trước:

- Node.js `>= 18`
- npm `>= 9`
- Tài khoản hoặc project Supabase đang hoạt động

Khuyến nghị:

- VS Code hoặc IDE hỗ trợ TypeScript
- Git

## 3. Mã nguồn cần có

Sau khi nhận bàn giao, cần có:

- source code dự án
- file `.env.example`
- thư mục `supabase/`
- nếu cần test đầy đủ phần landing media cũ: thư mục `uploads/`

## 4. Cài dependency

Trong thư mục gốc dự án:

```bash
npm install
```

## 5. Cấu hình môi trường

Tạo file `.env` từ file mẫu:

```bash
copy .env.example .env
```

Hoặc trên Linux/macOS:

```bash
cp .env.example .env
```

## 6. Nội dung biến môi trường

### 6.1. Biến bắt buộc

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=thay_bang_secret_rieng

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 6.2. Biến tùy chọn theo chức năng

```env
SUPABASE_ANON_KEY=<anon-key>
VITE_GEMINI_API_KEY=<gemini-api-key>
GOOGLE_SAFE_BROWSING_KEY=<safe-browsing-api-key>

R2_ACCOUNT_ID=<cloudflare-r2-account-id>
R2_ACCESS_KEY_ID=<cloudflare-r2-access-key>
R2_SECRET_ACCESS_KEY=<cloudflare-r2-secret>
R2_BUCKET_NAME=patctc-media
R2_PUBLIC_URL=https://<public-r2-domain>

PATCTC_UPLOAD_ROOT=E:/website/uploads
SEED_DEFAULT_USERS=true
```

Ghi chú:

- Nếu thiếu `SUPABASE_URL` hoặc key phù hợp, backend sẽ không thể truy cập dữ liệu.
- Nếu thiếu `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY`, tính năng realtime sẽ bị tắt.
- Nếu không cấu hình R2, luồng upload media trực tiếp lên R2 sẽ không hoạt động.
- `PATCTC_UPLOAD_ROOT` dùng cho media của landing page; nếu bỏ trống, hệ thống mặc định dùng thư mục `uploads/` trong project.

## 7. Khởi tạo cơ sở dữ liệu

### 7.1. Tạo project Supabase

Tạo một project Supabase mới hoặc sử dụng project đã được bàn giao.

### 7.2. Chạy schema SQL

Mở SQL Editor và chạy nội dung file:

- [supabase/schema.sql](../supabase/schema.sql)

### 7.3. Bật realtime nếu cần

```sql
ALTER PUBLICATION supabase_realtime
ADD TABLE posts, comments, likes, shares, notifications;
```

### 7.4. Seed tài khoản mặc định nếu cần

Trong môi trường development/local, hệ thống **tự động seed** tài khoản mặc định trừ khi đặt:

```env
SEED_DEFAULT_USERS=false
```

Nếu muốn bật rõ ràng (hoặc bật trong production):

```env
SEED_DEFAULT_USERS=true
```

Hệ thống sẽ tạo tài khoản nếu `admin@patctc.vn` chưa tồn tại trong DB.

## 8. Chạy ứng dụng

```bash
npm run dev
```

Sau khi chạy thành công, truy cập:

- `http://localhost:3000`

## 9. Build production local

```bash
npm run build
```

Sau khi build:

- frontend nằm trong thư mục `dist/`
- có thể chạy lại server bằng:

```bash
npm start
```

## 10. Kiểm tra nhanh sau khi dựng

Thực hiện kiểm tra tối thiểu:

1. Mở được trang đăng nhập.
2. Đăng nhập được bằng tài khoản hợp lệ.
3. Tạo được một tài liệu PATCTC mẫu.
4. Xem được danh sách bài viết hoặc tài liệu.
5. Nếu có cấu hình đầy đủ, kiểm tra upload landing image/video.

## 11. Tài khoản mẫu dev

Nếu bật seed mặc định, code hiện tại có thể tạo:

- `admin@patctc.vn`
- `user@patctc.vn`

Lưu ý:

- Đây là tài khoản phục vụ dựng local/dev.
- Cần đổi hoặc vô hiệu hóa trước khi dùng cho môi trường thật.

## 12. Một số lỗi thường gặp

### 12.1. Lỗi thiếu kết nối Supabase

Biểu hiện:

- server báo thiếu `SUPABASE_URL`
- hoặc thiếu `SUPABASE_SERVICE_ROLE_KEY`

Xử lý:

- kiểm tra lại file `.env`
- chắc chắn đang dùng project API URL, không dùng dashboard URL

### 12.2. Không có realtime

Biểu hiện:

- thông báo hoặc feed không cập nhật realtime

Xử lý:

- kiểm tra `VITE_SUPABASE_URL`
- kiểm tra `VITE_SUPABASE_ANON_KEY`
- kiểm tra publication realtime trên Supabase

### 12.3. Upload media bài viết lỗi

Biểu hiện:

- không upload được media qua cơ chế presigned URL

Xử lý:

- kiểm tra lại cấu hình Cloudflare R2
- kiểm tra CORS bucket
- kiểm tra `R2_*`

### 12.4. Upload landing media lỗi

Biểu hiện:

- upload landing image/video thất bại

Xử lý:

- kiểm tra quyền ghi thư mục `uploads/`
- kiểm tra `PATCTC_UPLOAD_ROOT`

## 13. Phạm vi hỗ trợ khi bên nhận dựng local

Thông thường bên bàn giao hỗ trợ các bước sau:

- xác nhận đúng phiên bản Node.js
- rà lại file `.env`
- hỗ trợ import schema lên Supabase
- xử lý lỗi phát sinh khi chạy `npm run dev`
- kiểm tra các chức năng chính sau khi dựng xong
