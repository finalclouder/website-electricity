# TÀI LIỆU KỸ THUẬT TỔNG HỢP — LIVELINE PCBN

> Tài liệu này bổ sung chi tiết kỹ thuật mà các tài liệu bàn giao khác chưa đề cập đầy đủ.

---

## 1. Thông tin chung

- **Tên dự án:** Liveline PCBN — PATCTC Generator
- **Ngôn ngữ:** TypeScript (full-stack)
- **Mô hình:** Monorepo — 1 tiến trình Node.js chạy đồng thời Express backend và React/Vite frontend

---

## 2. Tech Stack chi tiết

### 2.1. Runtime / Build

| Package | Version | Vai trò |
|---|---|---|
| Node.js | >= 18 | Runtime |
| TypeScript | ~5.8.2 | Ngôn ngữ |
| Vite | ^6.2.0 | Frontend build + dev HMR |
| tsx | ^4.21.0 | Chạy TypeScript server trực tiếp |

### 2.2. Frontend

| Package | Version | Vai trò |
|---|---|---|
| react | ^19.0.0 | UI framework |
| react-dom | ^19.0.0 | DOM renderer |
| react-router-dom | ^7.14.0 | Routing (hạn chế — điều hướng chính bằng store) |
| zustand | ^5.0.12 | State management |
| tailwindcss | ^4.1.14 | CSS framework (devDependency) |
| @tailwindcss/vite | ^4.1.14 | Vite plugin cho Tailwind |
| @vitejs/plugin-react | ^5.0.4 | Vite plugin cho React |
| lucide-react | ^0.546.0 | Icon library |
| motion | ^12.23.24 | Animations |
| sonner | ^2.0.7 | Toast notifications |
| clsx | ^2.1.1 | Class name utility |
| tailwind-merge | ^3.5.0 | Tailwind class merge |
| react-markdown | ^10.1.0 | Markdown rendering |
| html2canvas | ^1.4.1 | Screenshot cho client-side PDF |
| jspdf | ^4.2.0 | Client-side PDF export |
| file-saver | ^2.0.5 | Browser file download |
| pdfjs-dist | ^5.6.205 | PDF parsing |

### 2.3. Backend

| Package | Version | Vai trò |
|---|---|---|
| express | ^4.21.2 | HTTP server |
| helmet | ^8.1.0 | Security headers (CSP, HSTS...) |
| express-rate-limit | ^8.3.2 | IP-based rate limiting |
| jsonwebtoken | ^9.0.3 | JWT signing/verification |
| bcryptjs | ^3.0.3 | Password hashing |
| multer | ^2.1.1 | Multipart file upload |
| dotenv | ^17.4.2 | Environment variable loading |
| @supabase/supabase-js | ^2.57.4 | Supabase client (DB + Storage + Realtime) |
| @aws-sdk/client-s3 | ^3.1030.0 | Cloudflare R2 (S3-compatible) |
| @aws-sdk/s3-request-presigner | ^3.1030.0 | R2 presigned URLs |
| @google/genai | ^1.29.0 | Google Gemini AI SDK |

### 2.4. Export Libraries

| Package | Version | Vai trò |
|---|---|---|
| docx | ^9.6.0 | Server-side DOCX generation |
| pdfkit-table | ^0.1.99 | Server-side PDF generation |
| pizzip | ^3.2.0 | ZIP handling cho DOCX |
| docxtemplater | ^3.68.3 | DOCX templating |
| jszip | ^3.10.1 | ZIP utilities |

### 2.5. Dev/Test

| Package | Version | Vai trò |
|---|---|---|
| @playwright/test | ^1.59.1 | E2E testing |
| autoprefixer | ^10.4.21 | CSS post-processing |

---

## 3. Cấu trúc thư mục

```
├── server.ts                 # Express server entry point (~1785 dòng)
│                               - Đăng ký tất cả API routes
│                               - Chứa toàn bộ logic xuất DOCX/PDF
│                               - Phục vụ static dist/ trong production
│                               - Vite dev middleware trong development
├── database.ts               # Tất cả DB operations + Supabase Storage
│                               - userDb, postDb, docDb, followDb,
│                                 friendRequestDb, notificationDb,
│                                 documentDownloadDb, landingDb
├── vite.config.ts            # Vite config; chunk splitting vendor/lucide/motion/export
├── package.json
├── tsconfig.json
├── playwright.config.ts      # E2E test config
├── .env / .env.example       # Biến môi trường
│
├── src/
│   ├── App.tsx               # Root: realtime subscription, page routing
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles
│   ├── types.ts              # Tất cả TypeScript types (PATCTCData, v.v.)
│   ├── constants.ts          # WORK_TYPES, PERSONNEL_MASTER, TOOLS_MASTER,
│   │                           JOB_ITEM_TEMPLATES
│   ├── api/                  # Express route handlers
│   │   ├── authRoutes.ts
│   │   ├── authMiddleware.ts
│   │   ├── socialRoutes.ts
│   │   ├── socialGraphRoutes.ts
│   │   ├── documentRoutes.ts
│   │   ├── landingRoutes.ts
│   │   └── urlSafety.ts
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── PATCTCEditorPage.tsx
│   │   ├── SocialPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── DocumentsPage.tsx
│   │   └── AdminPage.tsx
│   ├── components/
│   │   ├── forms/            # 10 form sections của PATCTC editor
│   │   ├── preview/          # Live document preview components
│   │   ├── layout/MainLayout.tsx
│   │   ├── Preview.tsx       # WYSIWYG preview renderer
│   │   ├── DocumentPreviewModal.tsx
│   │   ├── SiteSurveySection.tsx
│   │   └── UI.tsx
│   ├── store/
│   │   ├── useStore.ts       # PATCTC editor state
│   │   ├── useAuthStore.ts   # Auth + user list
│   │   ├── useSocialStore.ts # Posts, comments, docs, social graph, notifications
│   │   ├── useNavigationStore.ts
│   │   └── useLandingStore.ts
│   └── utils/
│       ├── api.ts            # Fetch wrapper với Bearer token
│       ├── date.ts           # Date formatting helpers
│       ├── patctcFormat.ts   # PATCTC-specific string formatters
│       ├── exportPatctcPdf.tsx # Client-side PDF qua html2canvas + jsPDF
│       ├── mediaUpload.ts    # Image/video compression
│       ├── r2.ts             # Cloudflare R2 presigned URL generation
│       └── supabaseClient.ts # Frontend Supabase client (Realtime only)
│
├── supabase/
│   ├── schema.sql            # Full database schema
│   ├── fix-doc-cascade.sql   # Migration fix
│   ├── fix-social-graph.sql  # Migration fix
│   └── migrate-sqlite-to-supabase.mjs
├── uploads/                  # Local disk uploads (landing page media)
│   └── landing/
│       ├── videos/
│       └── images/
├── dist/                     # Vite production build output
├── tests/                    # Playwright E2E tests
└── docs/                     # Tài liệu dự án
```

---

## 4. Cơ sở dữ liệu (Supabase PostgreSQL)

Schema file: `supabase/schema.sql`

### 4.1. Bảng `users`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| name | text NOT NULL | |
| email | citext NOT NULL UNIQUE | Không phân biệt hoa thường |
| password | text NOT NULL | bcrypt hash |
| avatar | text | Base64 hoặc URL, default '' |
| bio | text | default '' |
| role | text | CHECK('admin','user'), default 'user' |
| status | text | CHECK('pending','approved','rejected'), default 'pending' |
| created_at | timestamptz | default now() |

### 4.2. Bảng `posts`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| author_id | text FK->users(id) CASCADE | |
| content | text NOT NULL | |
| images | jsonb | Array of URLs, default '[]' |
| attachment_name | text | default '' |
| category | text | CHECK('general','technical','safety','announcement') |
| shares | integer | default 0 |
| created_at | timestamptz | |

### 4.3. Bảng `comments`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| post_id | text FK->posts(id) CASCADE | |
| author_id | text FK->users(id) CASCADE | |
| content | text NOT NULL | |
| parent_id | text FK->comments(id) CASCADE | Self-ref cho threading |
| edited_at | timestamptz | nullable |
| created_at | timestamptz | |

### 4.4. Bảng `likes`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| user_id | text FK->users CASCADE | |
| target_type | text | CHECK('post','comment') |
| target_id | text | |
| created_at | timestamptz | |
| PRIMARY KEY | (user_id, target_type, target_id) | |

### 4.5. Bảng `shares`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| user_id | text FK->users CASCADE | |
| post_id | text FK->posts CASCADE | |
| created_at | timestamptz | |
| PRIMARY KEY | (user_id, post_id) | |

### 4.6. Bảng `documents`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| title | text NOT NULL | |
| description | text | default '' |
| author_id | text FK->users CASCADE | |
| data_snapshot | text NOT NULL | JSON-serialized PATCTCData |
| status | text | CHECK('draft','completed','approved') |
| tags | jsonb | Array of strings |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 4.7. Bảng `user_follows`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| follower_id | text FK->users CASCADE | |
| following_id | text FK->users CASCADE | |
| created_at | timestamptz | |
| PRIMARY KEY | (follower_id, following_id) | |
| CONSTRAINT | follower_id <> following_id | Không tự follow |

### 4.8. Bảng `friend_requests`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| sender_id | text FK->users CASCADE | |
| receiver_id | text FK->users CASCADE | |
| status | text | CHECK('pending','accepted','rejected','cancelled') |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| CONSTRAINT | sender_id <> receiver_id | |

### 4.9. Bảng `notifications`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| user_id | text FK->users CASCADE | Người nhận |
| actor_id | text FK->users SET NULL | Người thực hiện |
| type | text | follow / friend_request / friend_accept / document_download / post_like / post_comment / post_share / comment_like / admin_post |
| entity_type | text | user / friend_request / document / post / comment |
| entity_id | text | |
| data_json | jsonb | Context bổ sung |
| is_read | boolean | default false |
| created_at | timestamptz | |

### 4.10. Bảng `document_downloads`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | text PK | |
| document_id | text FK->documents CASCADE | |
| downloader_id | text FK->users CASCADE | |
| owner_id | text FK->users CASCADE | |
| created_at | timestamptz | |

### 4.11. Bảng `landing_config`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | integer PK | CHECK(id=1) — singleton row |
| config_json | jsonb NOT NULL | Full LandingConfig object |
| updated_at | timestamptz | |

### 4.12. Indexes

- `idx_posts_author_id`, `idx_posts_created_at`
- `idx_comments_post_id`, `idx_comments_parent_id`, `idx_comments_author_id`
- `idx_likes_target`
- `idx_shares_post_id`
- `idx_documents_author_id`, `idx_documents_updated_at`
- `idx_user_follows_following_id`
- `idx_friend_requests_receiver_status`, `idx_friend_requests_sender_status`, `idx_friend_requests_accepted_lookup`
- `idx_notifications_user_created_at`, `idx_notifications_user_is_read`
- `idx_document_downloads_document_id`, `idx_document_downloads_owner_id`

### 4.13. Bật Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE posts, comments, likes, shares, notifications;
```

---

## 5. Xác thực (Authentication)

**Cơ chế:** JWT (JSON Web Tokens) qua thư viện `jsonwebtoken`

**Luồng:**

1. User POST credentials tới `POST /api/auth/login`
2. Server tra user theo email (case-insensitive qua `citext`), xác thực bcrypt hash
3. Kiểm tra `user.status` — chặn `pending` (403) và `rejected` (403)
4. Ký JWT với payload `{ userId, email, role }`, hết hạn **7 ngày**
5. Trả về `{ token, user }` — frontend lưu token vào `localStorage`

**Middleware** (`src/api/authMiddleware.ts`):

- `authMiddleware`: Bắt buộc auth — lấy Bearer token, xác thực JWT, kiểm tra lại DB cho status/role hiện tại
- `optionalAuth`: Không chặn — set `req.user` nếu token hợp lệ
- `adminOnly`: Dùng sau `authMiddleware`; kiểm tra `user.role === 'admin'`

**JWT Secret:** `process.env.JWT_SECRET` — bắt buộc cấu hình riêng cho production

**Đăng ký:** Users tạo với `status: 'pending'` — admin phải approve qua `PUT /api/auth/users/:id/status`

**Tài khoản seed mặc định:**

Trong môi trường development/local, hệ thống tự động tạo tài khoản mẫu nếu chưa tồn tại. Mật khẩu nằm trong `database.ts` — cần đổi trước khi dùng cho production.

- Admin: `admin@patctc.vn`
- User: `user@patctc.vn` (status: pending, cần admin approve)

---

## 6. API Routes chi tiết

Tất cả routes prefix với `/api`. Route files nằm trong `src/api/`.

Hệ thống có rate limiting cho API chung, auth mutations và export endpoints.

### 6.1. Health

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | /api/health | Không | Trả về `{ status: "ok" }` |

### 6.2. Auth (`/api/auth`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | /api/auth/register | Không | Tạo tài khoản (status=pending) |
| POST | /api/auth/login | Không | Đăng nhập; trả JWT + user object |
| GET | /api/auth/me | JWT | Lấy profile hiện tại |
| PUT | /api/auth/profile | JWT | Cập nhật name/email/bio/avatar; phát hành token mới |
| PUT | /api/auth/password | JWT | Đổi mật khẩu (cần mật khẩu cũ) |
| GET | /api/auth/users | JWT+Admin | Lấy danh sách tất cả users |
| GET | /api/auth/users/:id | JWT | Lấy profile user |
| DELETE | /api/auth/users/:id | JWT+Admin | Xóa user (cascade) |
| PUT | /api/auth/users/:id/status | JWT+Admin | Approve/reject user |
| PUT | /api/auth/users/:id/role | JWT+Admin | Toggle admin/user role |
| PUT | /api/auth/users/:id/password | JWT+Admin | Admin reset mật khẩu user |

### 6.3. Posts/Social (`/api/posts`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | /api/posts/presign | JWT | Lấy R2 presigned PUT URLs cho media files |
| GET | /api/posts | JWT | Lấy paginated posts (`?page=&limit=`, max 50) |
| POST | /api/posts | JWT | Tạo post (JSON với mediaUrls hoặc multipart với files) |
| DELETE | /api/posts/:id | JWT | Xóa post (owner hoặc admin) |
| POST | /api/posts/:id/like | JWT | Toggle like trên post |
| POST | /api/posts/:id/share | JWT | Share post |
| POST | /api/posts/:id/comments | JWT | Thêm comment (hỗ trợ parentId cho threading) |
| PUT | /api/posts/:postId/comments/:commentId | JWT | Sửa comment (owner only) |
| DELETE | /api/posts/:postId/comments/:commentId | JWT | Xóa comment (owner hoặc admin) |
| POST | /api/posts/:postId/comments/:commentId/like | JWT | Toggle like trên comment |

### 6.4. Social Graph (`/api/social`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | /api/social/relationships/:userId | JWT | Lấy follow/friend status tổng hợp |
| GET | /api/social/users/:userId/followers | JWT | Lấy followers của user |
| GET | /api/social/users/:userId/following | JWT | Lấy following list của user |
| POST | /api/social/users/:userId/follow | JWT | Follow user |
| DELETE | /api/social/users/:userId/follow | JWT | Unfollow user |
| GET | /api/social/friends | JWT | Lấy danh sách bạn bè |
| GET | /api/social/friend-requests | JWT | Lấy incoming + outgoing friend requests |
| POST | /api/social/friend-requests/:userId | JWT | Gửi lời mời kết bạn |
| POST | /api/social/friend-requests/:requestId/accept | JWT | Chấp nhận lời mời |
| POST | /api/social/friend-requests/:requestId/reject | JWT | Từ chối lời mời |
| DELETE | /api/social/friend-requests/:requestId | JWT | Hủy lời mời đã gửi |
| GET | /api/social/notifications | JWT | Lấy tất cả notifications cho user hiện tại |
| GET | /api/social/notifications/unread-count | JWT | Lấy số lượng notification chưa đọc |
| POST | /api/social/notifications/read-all | JWT | Đánh dấu tất cả đã đọc |
| POST | /api/social/notifications/:id/read | JWT | Đánh dấu 1 notification đã đọc |

### 6.5. Documents (`/api/documents`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | /api/documents | JWT | Lấy paginated public documents (status=completed hoặc approved) |
| GET | /api/documents/my | JWT | Lấy tài liệu của user hiện tại |
| GET | /api/documents/user/:userId | JWT | Lấy tài liệu theo user |
| POST | /api/documents | JWT | Lưu tài liệu PATCTC mới |
| PUT | /api/documents/:id | JWT | Cập nhật tài liệu (owner hoặc admin) |
| DELETE | /api/documents/:id | JWT | Xóa tài liệu (owner hoặc admin) |
| POST | /api/documents/:id/download | JWT | Theo dõi lượt tải + thông báo owner |
| GET | /api/documents/:id/downloads | JWT | Lấy download records (owner hoặc admin) |

### 6.6. Landing Page (`/api/landing`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| GET | /api/landing | Không | Lấy landing page config |
| POST | /api/landing | JWT+Admin | Lưu landing page config |
| POST | /api/landing/image | JWT+Admin | Upload ảnh (10MB max, JPEG/PNG/GIF/WebP) |
| POST | /api/landing/media | JWT+Admin | Upload video (80MB max, MP4 only) |

### 6.7. Export (trong `server.ts`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | /api/export/pdf | JWT | Tạo server-side PDF bằng PDFKit |
| POST | /api/export/docx | JWT | Tạo server-side DOCX bằng thư viện docx |

### 6.8. Static Files

| Path | Mô tả |
|---|---|
| /uploads/* | Phục vụ local disk uploads (landing media) |

---

## 7. Frontend Pages và điều hướng

### 7.1. Pages

| Tab Key | Component | Mô tả |
|---|---|---|
| (pre-auth) | `LandingPage.tsx` | Landing page công khai với hero slider, features, gallery, videos, contact |
| (pre-auth) | `LoginPage.tsx` | Form đăng nhập và đăng ký |
| `patctc` | `PATCTCEditorPage.tsx` | Editor PATCTC chính với 10 form sections + live preview + export |
| `social` | `SocialPage.tsx` | Social feed — posts, comments, likes, shares, categories |
| `documents` | `DocumentsPage.tsx` | Duyệt và quản lý tài liệu đã lưu |
| `profile` | `ProfilePage.tsx` | Profile cá nhân: sửa thông tin, đổi mật khẩu, tài liệu cá nhân |
| `user-profile` | (inline trong App) | Xem profile công khai của user khác |
| `admin` | `AdminPage.tsx` | Admin dashboard: quản lý user + editor landing page |

### 7.2. Cơ chế điều hướng

- Điều hướng bằng tab, không sử dụng react-router-dom declarative cho luồng chính
- Quản lý bởi `useNavigationStore`
- URL routing qua query parameter `?tab=<tabname>` và `?uid=<userId>` cho user-profile
- History API pushState/replaceState được sử dụng

---

## 8. State Management (Zustand Stores)

### 8.1. `useStore.ts` — PATCTC Editor State

- Quản lý toàn bộ `PATCTCData` form object (40+ fields)
- `updateData(changes)`: Merge changes và chạy auto-repair (tự động derive risk locations, personnel list, sequences khi job items/pole/line thay đổi)
- Active section tracking, zoom level, validation errors, export state
- Persist vào `localStorage['patctc-storage']`
- Chứa logic phức tạp: `buildDefaultRisk()`, `syncRisksFromWorkType()`, `cloneSequence()`

### 8.2. `useAuthStore.ts` — Authentication + User Cache

- `user`, `token`, `isAuthenticated`, `isLoading`
- `cachedUsers[]` — local cache tất cả user profiles
- Actions: `login()`, `register()`, `logout()`, `updateProfile()`, `changePassword()`
- Admin actions: `deleteUser()`, `toggleUserRole()`, `updateUserStatus()`, `resetUserPassword()`
- Persist vào `localStorage['patctc-auth']` (chỉ user, token, isAuthenticated)

### 8.3. `useSocialStore.ts` — Social State

- Posts với pagination
- `savedDocuments[]` — tài liệu của user hiện tại
- Relationship maps: `relationshipsByUserId`, `followersByUserId`, `followingByUserId`
- Friend requests, friends list, notifications, unread count
- **Realtime subscriptions:**
  - `subscribeToNotifications(userId)` — lắng nghe `INSERT` trên bảng `notifications` lọc theo `user_id`
  - `subscribeToPosts()` — lắng nghe tất cả events trên `posts`, `comments`, `likes`, `shares`; debounce 400ms
- Không persist (tất cả dữ liệu re-fetch khi login)

### 8.4. `useNavigationStore.ts` — Tab Navigation

- `activeTab`, `viewingUserId`, `previousTab`, `showLanding`, `pendingTab`, `scrollToPostId`
- URL sync: pushState/replaceState mỗi khi navigation action
- Persist vào `localStorage['patctc-navigation']`

### 8.5. `useLandingStore.ts` — Landing Page Config

- Toàn bộ `LandingConfig` object (hero slides, quick actions, stats, features, about, contact, gallery, videos, customer care banner, footer)
- `fetchConfigFromServer()` / `syncConfigToServer()` — đọc/ghi `/api/landing`
- Có `hasUnsavedChanges` flag, `isSaving` flag
- Persist vào `localStorage['patctc-landing']`

---

## 9. PATCTC Editor — Chi tiết

### 9.1. 10 Form Sections

1. `CoverPageForm` — Số văn bản, ngày tháng, hạng mục công việc, thông tin nhân sự
2. `LegalBasisForm` — Căn cứ pháp lý (căn cứ 1–10)
3. `ConstructionDetailsForm` — Chi tiết cột/tuyến, giao thông, vị trí công tác
4. `RiskIdentificationForm` — Bảng rủi ro: vị trí, mối nguy, hậu quả, biện pháp
5. `ConstructionSequenceForm` — Quy trình thi công từng bước (bọc cách điện, điều khiển gàu...)
6. `PersonnelForm` — Danh sách nhân sự với bậc AT và bậc nghề
7. `ToolsForm` — Danh mục dụng cụ/thiết bị
8. `MaterialsForm` — Danh mục vật tư
9. `ImageUploadForm` — Ảnh hiện trường
10. `WorkZoneDiagramForm` — Sơ đồ vùng thi công

### 9.2. Live Preview

`Preview.tsx` render preview WYSIWYG khổ A4 theo thời gian thực.

### 9.3. Export

- **Client-side PDF:** `exportPatctcPdf.tsx` dùng html2canvas chụp Preview component, rồi jsPDF ghép trang
- **Server-side PDF:** `POST /api/export/pdf` dùng PDFKit (pdfkit-table) với Vietnamese fonts
- **Server-side DOCX:** `POST /api/export/docx` dùng thư viện `docx` tạo Word document đa section

### 9.4. Document Save/Load

`dataSnapshot` là `JSON.stringify` của toàn bộ `PATCTCData` object, lưu trong `documents.data_snapshot`.

---

## 10. Tính năng xuất file chi tiết

### 10.1. Server-side DOCX (`POST /api/export/docx`)

- **Thư viện:** `docx` ^9.6.0
- **Font:** Times New Roman, 13pt (26 half-points) cho nội dung chính, 12pt (24 half-points) riêng cho header trang bìa. Line spacing 1.3 (312 twips)
- **Margins:** 2cm tất cả các cạnh
- **Cấu trúc (đa trang):**
  - Trang 1: Bìa (bảng header với thông tin tổ chức, tiêu đề tài liệu, ngày tháng, người ký)
  - Trang 2: Căn cứ pháp lý (10 căn cứ bắt buộc)
  - Trang 3: Đặc điểm công trình (đặc điểm, giao thông, hạng mục công việc)
  - Trang 4: Bảng nhận diện rủi ro (hỗ trợ đa hạng mục)
  - Trang 5: Trình tự thi công (khối bọc cách điện, điều khiển gàu, tháo bọc)
  - Trang 6: Bảng nhân sự (Phụ lục 1)
  - Trang 7: Bảng dụng cụ/thiết bị (Phụ lục 2)
  - Trang 8: Biên bản khảo sát hiện trường — khối chữ ký
- Footer: số trang căn giữa
- Response: `Content-Disposition: attachment; filename=PATCTC_{soVb}.docx`

**Lưu ý kỹ thuật DOCX:**
- Dùng `BorderStyle.NIL` (không phải `BorderStyle.NONE`) để ẩn đường viền trong Word/WPS
- Cột header bìa: 45/55 split, font 12pt — nhỏ hơn body 13pt để tránh xuống dòng
- Bold logic cho trình tự thi công: khớp pattern với Preview.tsx

### 10.2. Server-side PDF (`POST /api/export/pdf`)

- **Thư viện:** `pdfkit-table` ^0.1.99
- **Font detection:** Thử LiberationSerif, DejaVuSerif, FreeSerif (Linux fonts) — fallback Times-Roman
- **Page size:** A4, 2cm margins
- **Cấu trúc (6 trang):**
  - Trang 1: Bìa
  - Trang 2: Căn cứ pháp lý
  - Trang 3: Đặc điểm công trình
  - Trang 4: Bảng rủi ro
  - Trang 5: Bảng nhân sự (Phụ lục 1)
  - Trang 6: Bảng dụng cụ (Phụ lục 2)

### 10.3. Client-side PDF (`exportPatctcPdf.tsx`)

- **Thư viện:** `html2canvas` + `jspdf`
- Render Preview component vào hidden DOM node, chụp từng trang rồi ghép vào jsPDF
- Dùng làm fallback hoặc lựa chọn xuất thay thế từ `PATCTCEditorPage.tsx`

---

## 11. Tính năng xã hội (Social Features)

- Tạo bài đăng với categories: `general`, `technical`, `safety`, `announcement`
- Media đính kèm qua R2 presigned URLs (ảnh: JPEG/PNG/GIF/WebP; video: MP4/WebM)
- Bình luận phân cấp (parentId support)
- Toggle like trên posts và comments
- Share posts (duy nhất mỗi user, tăng counter)
- URL safety scanning qua Google Safe Browsing API khi tạo post

---

## 12. WebSocket / Real-time

**Công nghệ:** Supabase Realtime (PostgreSQL `postgres_changes` events qua WebSocket)

**Client:** `src/utils/supabaseClient.ts`
- Dùng `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

**2 channels** (quản lý trong `useSocialStore.ts`):

**`notifications:{userId}` channel:**
- Subscribe `INSERT` events trên bảng `notifications`, lọc theo `user_id`
- Khi có notification mới: thêm vào đầu danh sách, tăng `unreadNotificationCount`, hiện toast
- Bật khi login, dọn dẹp khi logout

**`social-feed` channel:**
- Subscribe tất cả events trên `posts`, `comments`, `likes`, `shares`
- Debounce: gom burst updates thành 1 cuộc gọi `fetchPosts(1)`
- Bật khi login, dọn dẹp khi logout

**Không có custom WebSocket server** — Supabase Realtime xử lý toàn bộ hạ tầng real-time.

---

## 13. Upload Files — 3 hệ thống

### 13.1. Cloudflare R2 (chính — media bài viết)

- File: `src/utils/r2.ts`
- Client upload trực tiếp lên R2 qua presigned PUT URLs (bypass server RAM)
- Luồng: `POST /api/posts/presign` -> lấy presigned URLs -> client PUT lên R2 -> POST /api/posts với `mediaUrls[]`
- Hỗ trợ: JPEG/PNG/GIF/WebP, MP4/WebM/MOV
- URL pattern: `{R2_PUBLIC_URL}/{folder}/{uuid}.{ext}`
- Env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

### 13.2. Supabase Storage (legacy — fallback cho posts)

- File: `database.ts: uploadFileToStorage()`
- Bucket: `uploads`, folder: `posts/`
- Dùng khi multipart form-data được submit (không phải JSON)

### 13.3. Local Disk (chỉ landing page media)

- File: `src/api/landingRoutes.ts`
- Videos: `uploads/landing/videos/` — max 80MB, chỉ MP4
- Images: `uploads/landing/images/` — max 10MB, JPEG/PNG/GIF/WebP
- Root config qua `PATCTC_UPLOAD_ROOT` env var, default `{cwd}/uploads`
- Phục vụ static tại `/uploads/*`

---

## 14. Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `PORT` | Không | Port server, mặc định 3000 |
| `NODE_ENV` | Không | `development` hoặc `production` |
| `SUPABASE_URL` | Có | Supabase project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Có | Service role key cho server-side DB access |
| `SUPABASE_ANON_KEY` | Tùy chọn | Fallback nếu không có service role key |
| `VITE_SUPABASE_URL` | Có | Cùng URL — expose cho frontend cho Realtime WS |
| `VITE_SUPABASE_ANON_KEY` | Có | Anon key — expose cho frontend cho Realtime WS |
| `VITE_GEMINI_API_KEY` | Không | Google Gemini API key — bundled vào frontend |
| `JWT_SECRET` | Có (prod) | JWT signing secret |
| `GOOGLE_SAFE_BROWSING_KEY` | Không | Google Safe Browsing API v4 key |
| `R2_ACCOUNT_ID` | Không | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Không | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Không | R2 API secret key |
| `R2_BUCKET_NAME` | Không | R2 bucket name, default `patctc-media` |
| `R2_PUBLIC_URL` | Không | Public URL cho R2 objects |
| `PATCTC_UPLOAD_ROOT` | Không | Override thư mục uploads cục bộ |
| `SEED_DEFAULT_USERS` | Không | Xem mục Tài khoản seed |

---

## 15. Dịch vụ tích hợp

### 15.1. Supabase

- **PostgreSQL database** — tất cả dữ liệu ứng dụng
- **Supabase Storage** — lưu trữ file (bucket: `uploads`)
- **Supabase Realtime** — WebSocket push notifications và live post feed updates

### 15.2. Cloudflare R2

- Object storage cho media bài viết (ảnh và video)
- Client upload trực tiếp qua presigned PUT URLs
- S3-compatible API truy cập qua `@aws-sdk/client-s3`

### 15.3. Google Gemini API

- Client-side AI, key expose qua `VITE_GEMINI_API_KEY`
- Dùng trong browser (không phải server-side)

### 15.4. Google Safe Browsing API v4

- Server-side URL scanning trong `src/api/urlSafety.ts`
- Gọi mỗi khi tạo post nếu nội dung chứa URLs
- Fails open (cho qua) nếu API key thiếu hoặc API không tới được

---

## 16. Triển khai (Deployment)

### 16.1. Development

```bash
npm run dev        # tsx server.ts với Vite dev middleware
# App: http://localhost:3000
```

### 16.2. Production Build

```bash
npm run build      # Vite build -> dist/
npm run start      # tsx server.ts (phục vụ dist/ static)
```

### 16.3. PM2 (production process manager)

```bash
pm2 start server.ts --interpreter tsx --name patctc -- --port <PORT>
pm2 save
```

### 16.4. Hạ tầng

- Node.js server chạy trên port do biến `PORT` quy định (mặc định 3000)
- Có thể đặt sau reverse proxy (Nginx hoặc Cloudflare Tunnel)
- Cấu hình `trust proxy` trong code hỗ trợ multi-hop proxy

---

## 17. Bảo mật hiện có

- JWT cho xác thực
- `bcryptjs` để băm mật khẩu
- `helmet` cho security headers
- `express-rate-limit` cho auth và API mutation
- Kiểm tra loại file upload bằng MIME và magic bytes
- Quét link độc hại bằng Google Safe Browsing
- Kiểm tra trạng thái tài khoản trước khi cho truy cập chức năng
- Phân quyền `admin` và `user`

---

## 18. Hằng số quan trọng (`src/constants.ts`)

### 18.1. `WORK_TYPES`

Record keyed theo work type ID. Hiện tại có 2 work types đã implement:
- `LAP_DAY_NOI_DAT` — Lắp dây nối đất
- `THAY_CSV` — Thay chống sét van

WorkType enum trong `src/types.ts` định nghĩa 5 giá trị (`LAP_DAY_NOI_DAT`, `THAY_CSV`, `DAU_LEO`, `THAO_LEO`, `THAY_SU_DO_LEO`) nhưng 3 loại `DAU_LEO`, `THAO_LEO`, `THAY_SU_DO_LEO` chưa có dữ liệu mẫu.

Mỗi entry có: `label`, `risks[]` (với hazard/consequence/measure điền sẵn), `steps[]`, `tools[]`
- Dùng để tự động điền dữ liệu khi chọn loại công việc

### 18.2. `PERSONNEL_MASTER`

13 nhân sự mặc định (p1–p13):
- Fields: id, name, gender, birthYear, role, job, grade, safetyGrade
- Gồm: Đội phó, NV (Nhân viên), CHTT-GSAT (Chỉ huy trưởng thi công - Giám sát an toàn điện)

### 18.3. `TOOLS_MASTER`

25 dụng cụ/thiết bị mặc định (t1–t25):
- Fields: id, name, spec, origin, unit, quantity, purpose
- Gồm: Xe hotline TEREX, găng tay cách điện 24kV, thảm cao su cách điện, v.v.

### 18.4. `JOB_ITEM_TEMPLATES`

Mảng 33 chuỗi hạng mục công việc định sẵn:
- Ví dụ: "Thay FCO", "Thay sứ đỡ lèo", "Thay CSV (chống sét van)", "Đấu lèo", "Tháo lèo", v.v.

---

## 19. Testing

### 19.1. Playwright E2E

- Config: `playwright.config.ts`
- Thư mục: `./tests/`
- Browser: Trên Windows dùng Google Chrome; trên Linux/macOS dùng Chromium mặc định
- Chạy tuần tự (`workers: 1`, `fullyParallel: false`)
- Base URL: `http://localhost:{PORT}` (default 3000)
- Web server: tự động khởi động `npm run start` trước tests

### 19.2. Test files

- `tests/auth.spec.ts` — Luồng login, register, profile
- `tests/landing-admin.spec.ts` — Landing page admin editing
- `tests/landing-admin-full.spec.ts` — Full landing page admin workflow
- `tests/navigation-persistence.spec.ts` — Tab navigation và URL persistence

---

## 20. File quan trọng — Tham chiếu nhanh

| File | Mục đích |
|---|---|
| `server.ts` | Server entry, route registration, DOCX/PDF export |
| `database.ts` | Tất cả DB operations, Supabase Storage helper |
| `src/api/authRoutes.ts` | Auth endpoints |
| `src/api/authMiddleware.ts` | JWT middleware, `generateToken()` |
| `src/api/socialRoutes.ts` | Posts/comments/likes endpoints |
| `src/api/socialGraphRoutes.ts` | Follow/friend/notification endpoints |
| `src/api/documentRoutes.ts` | Document CRUD endpoints |
| `src/api/landingRoutes.ts` | Landing config + media upload |
| `src/api/urlSafety.ts` | Google Safe Browsing integration |
| `src/store/useStore.ts` | PATCTC editor state machine |
| `src/store/useAuthStore.ts` | Auth + user cache |
| `src/store/useSocialStore.ts` | Social + realtime subscriptions |
| `src/store/useNavigationStore.ts` | Tab navigation + URL sync |
| `src/store/useLandingStore.ts` | Landing page config |
| `src/constants.ts` | Work types, personnel, tools, job templates |
| `src/types.ts` | Tất cả TypeScript type definitions |
| `src/utils/r2.ts` | Cloudflare R2 presigned URLs |
| `src/utils/supabaseClient.ts` | Frontend Supabase (Realtime only) |
| `src/utils/api.ts` | Fetch wrapper với auth headers |
| `src/utils/exportPatctcPdf.tsx` | Client-side PDF export |
| `supabase/schema.sql` | Full DB schema |
| `.env.example` | Environment variable template |
| `playwright.config.ts` | E2E test configuration |

---

## 21. Cron Jobs / Background Tasks

**Không có.** Hệ thống không có scheduled cron jobs, `setInterval` tasks, hay background workers.

---

## 22. Lưu ý khi tiếp nhận

1. **Supabase là bắt buộc** — nếu thiếu `SUPABASE_URL` và key phù hợp thì backend không thể hoạt động
2. **Media landing page dùng lưu trữ đĩa cục bộ** — khi đổi server cần sao chép cả thư mục `uploads/`
3. **JWT Secret** — phải cấu hình riêng cho production
4. **R2** — nếu không cấu hình R2, luồng upload media trực tiếp sẽ không hoạt động (vẫn có fallback Supabase Storage)
