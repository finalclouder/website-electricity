# TÀI LIỆU CƠ SỞ DỮ LIỆU

## 1. Tổng quan

Hệ thống hiện vận hành trên **Supabase PostgreSQL**. Cấu trúc schema nguồn được lưu tại:

- [supabase/schema.sql](../supabase/schema.sql)

Ngoài ra dự án còn giữ script migrate từ SQLite cũ sang Supabase:

- [supabase/migrate-sqlite-to-supabase.mjs](../supabase/migrate-sqlite-to-supabase.mjs)

## 2. Danh sách bảng chính

### 2.1. `users`

Mục đích: lưu tài khoản người dùng hệ thống.

Các cột chính:

- `id`: khóa chính.
- `name`: họ tên.
- `email`: email duy nhất.
- `password`: mật khẩu đã băm.
- `avatar`: ảnh đại diện.
- `bio`: tiểu sử ngắn.
- `role`: `admin` hoặc `user`.
- `status`: `pending`, `approved`, `rejected`.
- `created_at`: thời điểm tạo.

### 2.2. `posts`

Mục đích: lưu bài đăng mạng xã hội nội bộ.

Các cột chính:

- `id`
- `author_id`
- `content`
- `images`
- `attachment_name`
- `category`
- `shares`
- `created_at`

### 2.3. `comments`

Mục đích: lưu bình luận và trả lời bình luận.

Các cột chính:

- `id`
- `post_id`
- `author_id`
- `content`
- `parent_id`
- `edited_at`
- `created_at`

### 2.4. `likes`

Mục đích: lưu lượt thích cho bài viết hoặc bình luận.

Các cột chính:

- `user_id`
- `target_type`
- `target_id`
- `created_at`

Khóa chính tổng hợp:

- `(user_id, target_type, target_id)`

### 2.5. `shares`

Mục đích: lưu lượt chia sẻ bài viết.

Các cột chính:

- `user_id`
- `post_id`
- `created_at`

### 2.6. `landing_config`

Mục đích: lưu cấu hình landing page.

Các cột chính:

- `id`
- `config_json`
- `updated_at`

Ghi chú:

- Bảng này đang được thiết kế như một singleton row với `id = 1`.

### 2.7. `documents`

Mục đích: lưu tài liệu PATCTC đã được người dùng tạo.

Các cột chính:

- `id`
- `title`
- `description`
- `author_id`
- `data_snapshot`
- `status`
- `tags`
- `created_at`
- `updated_at`

### 2.8. `user_follows`

Mục đích: lưu quan hệ theo dõi giữa người dùng.

Các cột chính:

- `follower_id`
- `following_id`
- `created_at`

### 2.9. `friend_requests`

Mục đích: lưu lời mời kết bạn.

Các cột chính:

- `id`
- `sender_id`
- `receiver_id`
- `status`
- `created_at`
- `updated_at`

### 2.10. `notifications`

Mục đích: lưu thông báo hệ thống.

Các cột chính:

- `id`
- `user_id`
- `actor_id`
- `type`
- `entity_type`
- `entity_id`
- `data_json`
- `is_read`
- `created_at`

### 2.11. `document_downloads`

Mục đích: lưu lịch sử tải tài liệu.

Các cột chính:

- `id`
- `document_id`
- `downloader_id`
- `owner_id`
- `created_at`

## 3. Quan hệ dữ liệu chính

```text
users 1 --- n posts
users 1 --- n comments
users 1 --- n documents
users 1 --- n notifications

posts 1 --- n comments
posts 1 --- n shares

documents 1 --- n document_downloads

users n --- n users
  qua user_follows

users n --- n users
  qua friend_requests
```

## 4. Chỉ mục hiện có

Schema hiện tại đã khai báo index cho các truy vấn thường xuyên, ví dụ:

- `idx_posts_author_id`
- `idx_posts_created_at`
- `idx_comments_post_id`
- `idx_documents_author_id`
- `idx_documents_updated_at`
- `idx_shares_post_id`
- `idx_notifications_user_created_at`
- `idx_document_downloads_document_id`
- `idx_friend_requests_accepted_lookup`

Điều này phục vụ các màn hình feed, tài liệu, thông báo và thống kê tải tài liệu.

## 5. Kiểu dữ liệu cần chú ý

- `images`, `tags`, `config_json`, `data_json` sử dụng `jsonb`.
- `data_snapshot` lưu snapshot tài liệu dưới dạng `text`.
- `email` sử dụng `citext` để hỗ trợ so sánh không phân biệt hoa thường.

## 6. Trạng thái nghiệp vụ

### 6.1. Trạng thái người dùng

- `pending`: chờ admin phê duyệt.
- `approved`: đã được phép sử dụng hệ thống.
- `rejected`: bị từ chối.

### 6.2. Trạng thái tài liệu

- `draft`
- `completed`
- `approved`

### 6.3. Trạng thái lời mời kết bạn

- `pending`
- `accepted`
- `rejected`
- `cancelled`

## 7. Seed dữ liệu mặc định

Theo code hiện tại, hệ thống sẽ seed 2 tài khoản mặc định khi:

- `SEED_DEFAULT_USERS=true` (kể cả trong production), hoặc
- `NODE_ENV` không phải `production` và `SEED_DEFAULT_USERS` không đặt thành `false`

Nói cách khác, trong môi trường development/local, seeding tự động bật trừ khi tắt rõ ràng. Trong production, seeding chỉ chạy khi bật `SEED_DEFAULT_USERS=true` — cần tránh cấu hình này trên production.

Tài khoản seed nằm trong `database.ts`:

- admin: `admin@patctc.vn`
- user: `user@patctc.vn`

Lưu ý:

- Đây là dữ liệu thuận tiện cho dựng local/dev.
- Khi bàn giao thực tế hoặc triển khai production cần đổi mật khẩu và rà soát lại quyền truy cập.

## 8. Khởi tạo cơ sở dữ liệu

### 8.1. Tạo schema mới trên Supabase

1. Tạo project Supabase.
2. Mở SQL Editor.
3. Chạy toàn bộ nội dung file `supabase/schema.sql`.

### 8.2. Bật Realtime

Nếu cần thông báo realtime, cần bật publication cho các bảng liên quan theo chính sách vận hành của dự án, ví dụ:

```sql
ALTER PUBLICATION supabase_realtime
ADD TABLE posts, comments, likes, shares, notifications;
```

### 8.3. Di trú từ SQLite

Nếu đang có dữ liệu cũ ở SQLite:

```bash
node supabase/migrate-sqlite-to-supabase.mjs
```

Có thể chỉ định đường dẫn DB:

```bash
node supabase/migrate-sqlite-to-supabase.mjs --db ./data/patctc.db
```