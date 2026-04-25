# TÀI LIỆU KIẾN TRÚC HỆ THỐNG

## 1. Tổng quan

Hệ thống là một ứng dụng web full-stack viết bằng TypeScript. Một tiến trình Node.js duy nhất chịu trách nhiệm:

- phục vụ API backend bằng Express,
- render frontend trong môi trường development thông qua Vite middleware,
- phục vụ static build frontend trong môi trường production.

Kiến trúc hiện tại phù hợp với mô hình triển khai gọn, dễ dựng local và dễ bàn giao kỹ thuật.

## 2. Sơ đồ thành phần

```text
Trình duyệt người dùng
        |
        v
Frontend React + Zustand
        |
        v
API client nội bộ (src/utils/api.ts)
        |
        v
Express server (server.ts)
        |
        +--> Auth middleware (JWT)
        +--> Route modules (src/api/*)
        +--> Export DOCX/PDF
        |
        v
database.ts
        |
        +--> Supabase PostgreSQL
        +--> Supabase Storage
        +--> Supabase Realtime
        +--> Cloudflare R2
        +--> uploads/ (landing media cục bộ)
```

## 3. Thành phần frontend

### 3.1. Công nghệ

- React 19
- Vite 6
- TypeScript
- Tailwind CSS 4
- Zustand

### 3.2. Tổ chức giao diện

Các trang chính:

- `LandingPage`
- `LoginPage`
- `PATCTCEditorPage`
- `SocialPage`
- `DocumentsPage`
- `ProfilePage`
- `AdminPage`

### 3.3. Điều hướng

Hệ thống hiện không phụ thuộc nặng vào router declarative cho luồng chính. Trạng thái điều hướng được quản lý bởi `useNavigationStore`, kết hợp với `history` và query string trên URL để:

- giữ tab đang mở,
- hỗ trợ quay lại bằng Back/Forward của trình duyệt,
- tách luồng landing page và luồng ứng dụng sau đăng nhập.

### 3.4. Quản lý trạng thái

Các store chính trong `src/store/`:

- `useAuthStore`: trạng thái người dùng và xác thực.
- `useStore`: dữ liệu biểu mẫu PATCTC.
- `useSocialStore`: bài viết, tài liệu, thông báo, quan hệ xã hội.
- `useLandingStore`: cấu hình landing page.
- `useNavigationStore`: điều hướng tab và profile.

## 4. Thành phần backend

### 4.1. Điểm vào hệ thống

File `server.ts` là entry point chính, thực hiện:

- seed tài khoản mặc định nếu được bật,
- khởi tạo Express app,
- cấu hình `trust proxy`,
- áp dụng `helmet` và `express-rate-limit`,
- mount các route backend,
- mount `uploads/` static,
- cung cấp API export DOCX/PDF,
- chạy Vite middleware khi `NODE_ENV != production`,
- phục vụ `dist/index.html` khi chạy production.

### 4.2. Các route module chính

- `src/api/authRoutes.ts`
  - đăng ký, đăng nhập, hồ sơ người dùng, quản trị user.
- `src/api/authMiddleware.ts`
  - ký JWT, xác thực token, chặn quyền admin/user.
- `src/api/socialRoutes.ts`
  - bài viết, like, comment, share, upload media.
- `src/api/socialGraphRoutes.ts`
  - theo dõi, lời mời kết bạn, quan hệ giữa người dùng.
- `src/api/documentRoutes.ts`
  - lưu, sửa, xóa, xem và theo dõi lượt tải tài liệu.
- `src/api/landingRoutes.ts`
  - đọc/ghi cấu hình landing page, upload ảnh/video landing.
- `src/api/urlSafety.ts`
  - quét URL độc hại qua Google Safe Browsing.

### 4.3. Tầng truy cập dữ liệu

`database.ts` đóng vai trò như một lớp service/repository tập trung. File này:

- khởi tạo Supabase client,
- chuẩn hóa dữ liệu trả về,
- gom logic truy cập bảng theo từng domain,
- cung cấp các object truy cập như:
  - `userDb`
  - `postDb`
  - `docDb`
  - `followDb`
  - `friendRequestDb`
  - `notificationDb`
  - `landingDb`
  - `documentDownloadDb`

## 5. Luồng nghiệp vụ tiêu biểu

### 5.1. Luồng đăng nhập

1. Frontend gọi `POST /api/auth/login`.
2. Backend kiểm tra user theo email.
3. So khớp mật khẩu bằng `bcryptjs`.
4. Nếu tài khoản ở trạng thái `approved`, hệ thống sinh JWT.
5. Frontend lưu token và dùng cho các request tiếp theo.

### 5.2. Luồng tạo tài liệu PATCTC

1. Người dùng nhập dữ liệu trên `PATCTCEditorPage`.
2. Dữ liệu được giữ trong Zustand store.
3. Người dùng lưu tài liệu qua `POST /api/documents`.
4. Khi cần xuất, frontend gọi API export hoặc dùng tiện ích export tương ứng.
5. Backend sinh file DOCX/PDF từ dữ liệu đầu vào và trả file về trình duyệt.

### 5.3. Luồng bài đăng mạng xã hội

1. Người dùng tạo bài đăng từ giao diện social.
2. Media có thể đi theo 2 đường:
   - upload trực tiếp lên R2 bằng presigned URL,
   - hoặc đi theo luồng cũ qua backend rồi lưu lên Supabase Storage.
3. Backend kiểm tra dữ liệu, quét nội dung URL, lưu bài viết vào DB.
4. Thông báo được tạo tương ứng theo hành động.

### 5.4. Luồng quản lý landing page

1. Admin chỉnh sửa cấu hình landing page trong `AdminPage`.
2. Ảnh và video landing được upload vào thư mục cục bộ `uploads/landing/...`.
3. JSON cấu hình được lưu trong bảng `landing_config`.
4. `LandingPage` đọc cấu hình qua API và render nội dung.

## 6. Bảo mật hiện có

Theo code hiện tại, hệ thống đang có các lớp bảo vệ sau:

- JWT cho xác thực.
- `bcryptjs` để băm mật khẩu.
- `helmet` cho security headers.
- `express-rate-limit` cho auth và API mutation.
- Kiểm tra loại file upload bằng MIME và magic bytes ở social upload.
- Quét link độc hại bằng Google Safe Browsing.
- Kiểm tra trạng thái tài khoản trước khi cho truy cập chức năng.
- Phân quyền `admin` và `user`.

## 7. Điểm cần lưu ý khi tiếp nhận

- Dự án phụ thuộc khá rõ vào Supabase; nếu thiếu `SUPABASE_URL` và key phù hợp thì backend không thể hoạt động đầy đủ.
- Media landing page đang dùng lưu trữ đĩa cục bộ, do đó khi đổi server cần sao chép cả thư mục `uploads/`.
- Trong môi trường development, hệ thống có thể seed tài khoản mặc định nếu đặt `SEED_DEFAULT_USERS` phù hợp và DB đã sẵn sàng.
- Có dấu vết dữ liệu SQLite cũ và script migrate; tuy nhiên luồng vận hành hiện tại đang đi qua Supabase PostgreSQL.

## 8. Danh mục file quan trọng

- [server.ts](../server.ts)
- [database.ts](../database.ts)
- [src/api/authMiddleware.ts](../src/api/authMiddleware.ts)
- [src/api/authRoutes.ts](../src/api/authRoutes.ts)
- [src/api/socialRoutes.ts](../src/api/socialRoutes.ts)
- [src/api/documentRoutes.ts](../src/api/documentRoutes.ts)
- [src/api/landingRoutes.ts](../src/api/landingRoutes.ts)
- [src/App.tsx](../src/App.tsx)
- [supabase/schema.sql](../supabase/schema.sql)
