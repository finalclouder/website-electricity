# HƯỚNG DẪN DỰNG DỰ ÁN TRÊN MÁY LOCAL

> Tài liệu này hướng dẫn từng bước để clone, cấu hình và chạy dự án trên máy local.
> Áp dụng cho đối tác đã nhận bàn giao đầy đủ: GitHub repo, Supabase project, Cloudflare R2.

---

## 1. Yêu cầu cài đặt trước

| Phần mềm | Phiên bản | Tải tại |
|---|---|---|
| Node.js | >= 18 | https://nodejs.org (chọn bản LTS) |
| Git | Bất kỳ | https://git-scm.com |
| VS Code | Bất kỳ | https://code.visualstudio.com |

Kiểm tra đã cài đúng chưa bằng cách mở Terminal (Command Prompt hoặc PowerShell) và chạy:

```bash
node -v
npm -v
git --version
```

Nếu ra số phiên bản là cài thành công.

---

## 2. Clone source code từ GitHub

```bash
git clone https://github.com/DungDT293/website-electricity.git
cd website-electricity
```

---

## 3. Cài dependency

```bash
npm install
```

Chờ đến khi hoàn tất (khoảng 1–2 phút).

---

## 4. Tạo file môi trường

Trên Windows:

```bash
copy .env.example .env
```

Trên macOS/Linux:

```bash
cp .env.example .env
```

Sau đó mở file `.env` bằng VS Code và điền thông tin theo hướng dẫn bên dưới.

---

## 5. Cấu hình từng biến môi trường

### 5.1. Biến cơ bản

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=Patctc@2024!XyzSecretKey_ThayBangChuoiRieng
```

- `PORT`: cổng chạy ứng dụng, để `3000` là được
- `NODE_ENV`: để `development` khi chạy local
- `JWT_SECRET`: tự đặt một chuỗi bất kỳ dài và ngẫu nhiên, ví dụ `Patctc@Secret!2024xyz` — đây là khóa ký token đăng nhập, không được để lộ

---

### 5.2. Supabase — lấy thông tin từ dashboard

Supabase project đã được transfer sang tài khoản của bạn. Làm theo từng bước:

**Bước 1:** Vào https://supabase.com → đăng nhập → chọn project

**Bước 2:** Vào **Project Settings** (icon bánh răng góc trái dưới) → chọn tab **API**

**Bước 3:** Lấy các giá trị sau:

| Thông tin cần lấy | Vị trí trên dashboard | Điền vào biến |
|---|---|---|
| URL project | Mục **Project URL** | `SUPABASE_URL` và `VITE_SUPABASE_URL` |
| Anon key | Mục **Project API keys** → dòng **anon / public** | `VITE_SUPABASE_ANON_KEY` và `SUPABASE_ANON_KEY` |
| Service role key | Mục **Project API keys** → dòng **service_role** (bấm Reveal để hiện) | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **Service role key** có toàn quyền truy cập database — không bao giờ để lộ ra ngoài hoặc commit lên git.

Ví dụ sau khi điền:

```env
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> `SUPABASE_URL` và `VITE_SUPABASE_URL` điền **cùng một URL**.
> `SUPABASE_ANON_KEY` và `VITE_SUPABASE_ANON_KEY` điền **cùng một anon key**.

---

### 5.3. Cloudflare R2 — lấy thông tin từ dashboard

R2 dùng để lưu ảnh và video của bài đăng mạng xã hội. Làm theo từng bước:

**Bước 1 — Lấy Account ID:**

- Vào https://dash.cloudflare.com → đăng nhập
- Nhìn sidebar trái phần **Account Home** → thấy **Account ID** (chuỗi 32 ký tự)
- Điền vào `R2_ACCOUNT_ID`

**Bước 2 — Tạo bucket R2:**

- Vào **R2 Object Storage** (menu trái) → bấm **Create bucket**
- Đặt tên: `patctc-media`
- Chọn region gần nhất → bấm **Create bucket**
- Điền `R2_BUCKET_NAME=patctc-media`

**Bước 3 — Tạo API Token:**

- Vào **R2 Object Storage** → bấm **Manage R2 API Tokens** → **Create API token**
- Đặt tên tùy ý, ví dụ: `patctc-server`
- Quyền: chọn **Object Read & Write**
- Phạm vi: chọn bucket `patctc-media`
- Bấm **Create API Token**
- **Lưu ngay** 2 giá trị hiện ra (chỉ hiện một lần duy nhất):
  - **Access Key ID** → điền vào `R2_ACCESS_KEY_ID`
  - **Secret Access Key** → điền vào `R2_SECRET_ACCESS_KEY`

**Bước 4 — Bật Public URL:**

- Vào bucket `patctc-media` → tab **Settings**
- Tìm mục **Public access** → bật **R2.dev subdomain**
- Copy URL dạng `https://pub-xxxxx.r2.dev`
- Điền vào `R2_PUBLIC_URL`

**Bước 5 — Cấu hình CORS cho bucket:**

- Vào bucket `patctc-media` → tab **Settings** → mục **CORS Policy**
- Thêm rule sau:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Ví dụ sau khi điền đủ:

```env
R2_ACCOUNT_ID=1234567890abcdef1234567890abcdef
R2_ACCESS_KEY_ID=abc123def456...
R2_SECRET_ACCESS_KEY=xyz789...
R2_BUCKET_NAME=patctc-media
R2_PUBLIC_URL=https://pub-1234567890abcdef.r2.dev
```

---

### 5.4. Các biến tùy chọn

```env
VITE_GEMINI_API_KEY=
GOOGLE_SAFE_BROWSING_KEY=
PATCTC_UPLOAD_ROOT=
SEED_DEFAULT_USERS=true
```

- `VITE_GEMINI_API_KEY`: tính năng AI trong trình soạn thảo — bỏ trống nếu không dùng
- `GOOGLE_SAFE_BROWSING_KEY`: quét link độc hại khi đăng bài — bỏ trống nếu không dùng
- `PATCTC_UPLOAD_ROOT`: để trống, hệ thống tự dùng thư mục `uploads/` trong project
- `SEED_DEFAULT_USERS`: để `true` để hệ thống tự tạo tài khoản mặc định lần đầu chạy

---

### 5.5. File .env hoàn chỉnh mẫu

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=Patctc@2024!XyzSecretKey_ThayBangChuoiRieng

SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

VITE_GEMINI_API_KEY=
GOOGLE_SAFE_BROWSING_KEY=

R2_ACCOUNT_ID=1234567890abcdef1234567890abcdef
R2_ACCESS_KEY_ID=abc123...
R2_SECRET_ACCESS_KEY=xyz789...
R2_BUCKET_NAME=patctc-media
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

PATCTC_UPLOAD_ROOT=
SEED_DEFAULT_USERS=true
```

---

## 6. Khởi tạo database

Project Supabase đã được transfer sang tài khoản của bạn — **dữ liệu có sẵn, không cần chạy lại schema**.

Nếu bạn tạo Supabase project **hoàn toàn mới** (không phải project được transfer), cần chạy schema:

- Vào **Supabase Dashboard → SQL Editor**
- Copy toàn bộ nội dung file `supabase/schema.sql` trong repo
- Paste vào SQL Editor → bấm **Run**

Sau đó bật Realtime:

```sql
ALTER PUBLICATION supabase_realtime
ADD TABLE posts, comments, likes, shares, notifications;
```

---

## 7. Chạy ứng dụng

```bash
npm run dev
```

Sau khi thấy thông báo server đang chạy, mở trình duyệt vào:

```
http://localhost:3000
```

---

## 8. Tài khoản đăng nhập lần đầu

Nếu `SEED_DEFAULT_USERS=true`, hệ thống tự tạo 2 tài khoản mặc định:

| Email | Quyền | Ghi chú |
|---|---|---|
| `admin@patctc.vn` | Admin — toàn quyền | Liên hệ bên bàn giao để lấy mật khẩu |
| `user@patctc.vn` | User thường | Liên hệ bên bàn giao để lấy mật khẩu |

> ⚠️ **Đổi mật khẩu ngay** sau khi đăng nhập lần đầu thành công.

---

## 9. Kiểm tra nhanh sau khi chạy

- [ ] Mở được trang đăng nhập tại `http://localhost:3000`
- [ ] Đăng nhập được bằng tài khoản admin
- [ ] Vào trang Admin — thấy danh sách người dùng
- [ ] Tạo được một tài liệu PATCTC mới
- [ ] Đăng được một bài viết có ảnh (nếu đã cấu hình R2)
- [ ] Thông báo realtime hoạt động (cần cấu hình đúng `VITE_SUPABASE_*`)

---

## 10. Build production (khi muốn deploy lên server)

```bash
npm run build
npm start
```

`npm run build` tạo ra thư mục `dist/` chứa frontend đã tối ưu.
`npm start` chạy server phục vụ cả frontend lẫn API từ `dist/`.

---

## 11. Lỗi thường gặp

### Lỗi kết nối Supabase

```
Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
```

Kiểm tra lại file `.env` — đảm bảo không có dấu cách thừa, không thiếu ký tự, URL đúng dạng `https://xxx.supabase.co`.

### Thông báo không realtime

Kiểm tra `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` đã điền đúng chưa.
Kiểm tra Supabase Dashboard → **Realtime** → đảm bảo các bảng đã được bật publication.

### Upload ảnh/video bài viết không được

Kiểm tra lại toàn bộ `R2_*` — đặc biệt `R2_PUBLIC_URL` phải là URL public của bucket, không phải URL API.
Kiểm tra CORS policy đã cấu hình cho bucket chưa.

### Upload landing image/video không được

Kiểm tra quyền ghi thư mục `uploads/` trong project.
Kiểm tra `PATCTC_UPLOAD_ROOT` nếu có cấu hình tùy chỉnh.

### Cổng 3000 đã bị chiếm

Đổi `PORT=3001` trong file `.env` rồi chạy lại, truy cập `http://localhost:3001`.
