# Liveline PCBN — PATCTC Generator

**Phần mềm tạo Phương Án Thi Công Trên Cao Thế (PATCTC)** cho ngành điện lực Việt Nam.

Ứng dụng web full-stack giúp kỹ sư điện lực tạo, quản lý và xuất phương án thi công theo chuẩn ngành — tích hợp mạng xã hội nội bộ, quản lý tài liệu, và AI hỗ trợ.

> **Production:** [https://livelinepcbn.com](https://livelinepcbn.com)

---

## Tính Năng Chính

### Tạo Phương Án TCTC (PATCTC Editor)
- Form nhập liệu đầy đủ: trang bìa, cơ sở pháp lý, chi tiết thi công, nhân sự, dụng cụ, vật tư
- Nhận diện rủi ro & trình tự thi công
- Sơ đồ vùng làm việc với upload ảnh
- Khảo sát hiện trường (Site Survey)
- Xem trước (Preview) và xuất file DOCX/PDF
- Lưu & quản lý nhiều phương án, clone tài liệu
- AI hỗ trợ (Google Gemini) tạo nội dung tự động

### Mạng Xã Hội Nội Bộ (Social Feed)
- Đăng bài viết với ảnh/video đính kèm
- Like, comment, share bài viết
- Realtime feed — tự cập nhật khi có bài mới, comment, like
- Thông báo realtime qua WebSocket (Supabase Realtime)
- Toast notification (sonner) khi có tương tác mới

### Đồ Thị Xã Hội (Social Graph)
- Gửi/nhận lời mời kết bạn
- Theo dõi (follow) người dùng
- Chấp nhận/từ chối kết bạn từ thông báo
- Badge "Đang theo dõi bạn" trên trang hồ sơ
- Trang hồ sơ cá nhân với hoạt động & tài liệu

### Quản Lý Tài Liệu
- Upload, lưu trữ, phê duyệt tài liệu
- Hệ thống trạng thái: pending → approved / rejected
- Phân quyền admin quản lý tài liệu toàn hệ thống

### Trang Quản Trị (Admin)
- Quản lý người dùng (xem, tìm kiếm, phân quyền)
- Phê duyệt/từ chối tài liệu
- Chỉnh sửa Landing Page (hero slides, features, about, contact)
- Thống kê hoạt động hệ thống
- Upload media (ảnh, video) cho landing page

### Landing Page
- Trang giới thiệu công khai với scroll spy navigation
- Hero carousel, tính năng nổi bật, thư viện ảnh
- Tin tức, mẫu phương án, thông tin liên hệ
- Responsive design, animation

---

## Tech Stack

### Frontend
| Công nghệ | Mục đích |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS 4** | Styling |
| **Zustand 5** | State management (persisted) |
| **React Router 7** | Client-side routing |
| **Lucide React** | Icon library |
| **Motion** | Animations |
| **Sonner** | Toast notifications |
| **html2canvas + jsPDF** | Client-side PDF export |
| **Supabase JS** | Realtime WebSocket subscriptions |

### Backend
| Công nghệ | Mục đích |
|---|---|
| **Express 4** | API server |
| **tsx** | TypeScript runtime |
| **Supabase** | PostgreSQL database + Storage + Realtime |
| **JWT (jsonwebtoken)** | Authentication |
| **bcryptjs** | Password hashing |
| **Multer** | File upload handling |
| **Helmet** | Security headers (CSP, HSTS, etc.) |
| **express-rate-limit** | API rate limiting |
| **docx** | DOCX document generation |
| **PDFKit** | PDF document generation |
| **Google Gemini API** | AI content generation |
| **Google Safe Browsing API** | URL threat scanning |

### Infrastructure
| Công nghệ | Mục đích |
|---|---|
| **Supabase (PostgreSQL)** | Primary database |
| **Supabase Storage** | File/media storage |
| **Supabase Realtime** | WebSocket push notifications |
| **Cloudflare** | CDN, WAF, DDoS protection |
| **PM2** | Process manager (production) |
| **UFW** | Firewall (Cloudflare-only) |

---

## Cấu Trúc Dự Án

```
├── server.ts                 # Express server + DOCX/PDF export endpoints
├── database.ts               # Supabase database operations & file storage
├── vite.config.ts            # Vite build configuration
├── package.json
├── .env.example              # Environment variable template
│
├── src/
│   ├── App.tsx               # Root component, routing, realtime subscriptions
│   ├── types.ts              # TypeScript type definitions
│   │
│   ├── api/                  # Express API routes
│   │   ├── authRoutes.ts     # Login, register, profile, JWT
│   │   ├── authMiddleware.ts # JWT verification middleware
│   │   ├── socialRoutes.ts   # Posts, comments, likes, shares, file upload
│   │   ├── socialGraphRoutes.ts # Friends, followers, relationships
│   │   ├── documentRoutes.ts # Document CRUD & approval
│   │   ├── landingRoutes.ts  # Landing page config & media
│   │   └── urlSafety.ts      # Google Safe Browsing URL scanner
│   │
│   ├── pages/                # Page components
│   │   ├── LandingPage.tsx   # Public landing page
│   │   ├── LoginPage.tsx     # Authentication page
│   │   ├── PATCTCEditorPage.tsx # PATCTC form editor
│   │   ├── SocialPage.tsx    # Social feed
│   │   ├── ProfilePage.tsx   # User profile
│   │   ├── DocumentsPage.tsx # Document management
│   │   └── AdminPage.tsx     # Admin dashboard
│   │
│   ├── components/
│   │   ├── layout/MainLayout.tsx  # Navigation bar, notification dropdown
│   │   ├── forms/            # PATCTC form sections (10 forms)
│   │   ├── preview/          # Document preview components
│   │   ├── Preview.tsx       # PATCTC live preview
│   │   ├── DocumentPreviewModal.tsx
│   │   ├── SiteSurveySection.tsx
│   │   └── UI.tsx            # Reusable UI components
│   │
│   ├── store/                # Zustand state stores
│   │   ├── useStore.ts       # PATCTC editor state
│   │   ├── useAuthStore.ts   # Authentication state
│   │   ├── useSocialStore.ts # Social feed, notifications, documents
│   │   ├── useNavigationStore.ts # Tab navigation, scroll-to-post
│   │   └── useLandingStore.ts    # Landing page configuration
│   │
│   └── utils/
│       ├── api.ts            # API client with auth headers
│       ├── date.ts           # Date formatting utilities
│       ├── patctcFormat.ts   # PATCTC-specific formatting
│       ├── mediaUpload.ts    # Image/video compression & upload
│       └── supabaseClient.ts # Frontend Supabase client (Realtime only)
│
├── dast_*.py / .html / .sh   # DAST security test scripts (7 files)
└── dist/                     # Production build output
```

---

## Cài Đặt & Chạy

### Yêu Cầu
- **Node.js** >= 18
- **npm** >= 9
- **Supabase** project (database + storage + realtime)

### 1. Clone & cài đặt

```bash
git clone https://github.com/DungDT293/website-electricity.git
cd website-electricity
npm install
```

### 2. Cấu hình environment

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với các giá trị thực:

```env
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Frontend Supabase (Realtime WebSocket)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Security
GOOGLE_SAFE_BROWSING_KEY=your-safe-browsing-api-key
```

### 3. Supabase Setup

Trong Supabase Dashboard → SQL Editor, chạy:

```sql
-- Bật Realtime cho các bảng cần thiết
ALTER PUBLICATION supabase_realtime ADD TABLE posts, comments, likes, shares, notifications;
```

Đảm bảo RLS (Row Level Security) được bật trên tất cả các bảng.

### 4. Chạy development

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### 5. Build production

```bash
npm run build
```

Output nằm trong `dist/`.

---

## Deploy Production

### Server (Debian / Alpine Linux)

```bash
# Build
npm run build

# Chạy với PM2
pm2 start server.ts --interpreter tsx --name patctc -- --port 6666
pm2 save
```

### Cloudflare Firewall (khuyến nghị)

Khóa server chỉ cho phép Cloudflare IP truy cập ports 80, 443, 6666:

```bash
sudo bash dast_7_cloudflare_firewall.sh
```

---

## Bảo Mật

Hệ thống được hardening với nhiều lớp bảo vệ:

| Lớp | Chi tiết |
|---|---|
| **Authentication** | JWT với bcrypt password hashing, token expiry |
| **Authorization** | Role-based (user/admin), Supabase RLS policies |
| **Rate Limiting** | Global 60 req/min, Auth 20 req/min, Export 8 req/min |
| **Security Headers** | Helmet.js (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) |
| **File Upload** | Multer MIME whitelist → Magic bytes validation → UUID filename + extension sanitization |
| **URL Scanning** | Google Safe Browsing API kiểm tra link trước khi đăng bài |
| **Proxy Trust** | `trust proxy = 2` cho Cloudflare chain, tránh rate limit bypass |
| **Firewall** | UFW Cloudflare-only whitelist (origin IP protection) |
| **Input Validation** | Mass assignment prevention, SQL injection protection, prototype pollution protection |

### DAST Test Suite

7 script kiểm thử bảo mật tự động:

| Script | Mô tả |
|---|---|
| `dast_1_ratelimit_cannon.py` | 100 requests với spoofed IP headers |
| `dast_2_jwt_tampering.py` | 6-phase JWT tampering (alg:none, wrong sig, etc.) |
| `dast_3_file_smuggling.py` | 9 file upload attack vectors |
| `dast_4_race_condition.py` | 100 concurrent like requests (TOCTOU) |
| `dast_5_ws_hijack.html` | Cross-Site WebSocket Hijacking test |
| `dast_6_mass_assignment.py` | 10 privilege escalation payloads |
| `dast_7_cloudflare_firewall.sh` | UFW Cloudflare-only firewall setup |

Chạy DAST tests:
```bash
python dast_1_ratelimit_cannon.py
python dast_2_jwt_tampering.py
# ... etc
```

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |
| PUT | `/api/auth/profile` | Cập nhật hồ sơ |

### Social Feed (`/api/posts`)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/posts` | Lấy danh sách bài viết (paginated) |
| POST | `/api/posts` | Tạo bài viết (với media upload) |
| DELETE | `/api/posts/:id` | Xóa bài viết |
| POST | `/api/posts/:id/like` | Like/unlike bài viết |
| POST | `/api/posts/:id/comments` | Thêm comment |
| POST | `/api/posts/:id/share` | Share bài viết |

### Social Graph (`/api/social`)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/social/relationship/:userId` | Lấy quan hệ với user |
| POST | `/api/social/friend-request` | Gửi lời mời kết bạn |
| POST | `/api/social/friend-request/:id/accept` | Chấp nhận kết bạn |
| POST | `/api/social/friend-request/:id/reject` | Từ chối kết bạn |
| POST | `/api/social/follow/:userId` | Follow/unfollow |

### Documents (`/api/documents`)
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/documents` | Lấy tài liệu của user |
| POST | `/api/documents` | Lưu tài liệu |
| PUT | `/api/documents/:id` | Cập nhật tài liệu |
| DELETE | `/api/documents/:id` | Xóa tài liệu |

### Export
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/export/docx` | Xuất PATCTC ra file DOCX |
| POST | `/export/pdf` | Xuất PATCTC ra file PDF |

---

## Scripts

```bash
npm run dev      # Chạy development server (tsx + vite HMR)
npm run build    # Build production (vite build)
npm run preview  # Preview production build
npm run lint     # TypeScript type checking
npm run clean    # Xóa thư mục dist/
npm start        # Chạy production server
```

---

## License

Private — All rights reserved.
