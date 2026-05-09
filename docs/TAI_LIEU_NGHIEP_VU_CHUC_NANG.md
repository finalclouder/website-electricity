# Tài liệu nghiệp vụ và chức năng hệ thống PATCTC

## 1. Mục đích tài liệu

Tài liệu này mô tả toàn bộ luồng nghiệp vụ, chức năng, panel giao diện, label dữ liệu, nút bấm và tương tác giữa các module của dự án `website-electricity`.

Phạm vi quét gồm frontend React, các store Zustand, API client, Cloudflare Worker backend, route legacy Express, cấu hình triển khai và các tài liệu/sơ đồ dữ liệu hiện có trong project.

## 2. Tổng quan hệ thống

Hệ thống PATCTC Generator phục vụ lập, lưu trữ, chia sẻ và xuất tài liệu phương án tổ chức thi công, biện pháp an toàn sửa chữa lưới điện đang mang điện.

Các nhóm nghiệp vụ chính:

- Trang giới thiệu công khai: hiển thị thông tin hệ thống, tin tức, thư viện, video, liên hệ và điều hướng người dùng vào ứng dụng.
- Xác thực và phê duyệt tài khoản: đăng ký, đăng nhập, chờ duyệt, từ chối, quản trị người dùng.
- Lập phương án PATCTC: nhập dữ liệu theo các phần của biểu mẫu, xem preview, lưu bản nháp, xuất PDF và Word.
- Cộng đồng: đăng bài, ảnh/video, phân loại nội dung, like, comment, reply, share, thông báo.
- Tài liệu đã lưu: tìm kiếm, lọc, xem trước, mở lại, sao chép, duyệt/công khai, tải PDF/Word.
- Hồ sơ người dùng: cập nhật thông tin cá nhân, avatar, mật khẩu, xem hoạt động/tài liệu/bài viết.
- Quản trị hệ thống: quản lý user, phân quyền, trạng thái tài khoản, cấu hình nội dung landing page.
- Backend Worker: API cho auth, landing, post/social, document, export Word, media upload qua R2.

## 3. Framework và công nghệ

### 3.1. Frontend

- React 19: xây dựng UI component.
- TypeScript: định nghĩa kiểu dữ liệu nghiệp vụ và an toàn biên dịch.
- Vite 6: build frontend và dev workflow.
- Tailwind CSS 4: styling.
- Zustand 5: quản lý state ứng dụng, có persist cho một số store.
- Lucide React: hệ icon cho nút, tab, menu, trạng thái.
- Sonner: toast/notification ngắn trên giao diện.
- html2canvas + jsPDF: xuất PDF phía client.
- docx: xuất Word phía Cloudflare Worker.
- Supabase JS: realtime notification/post và tương tác Supabase.

### 3.2. Backend production

- Cloudflare Worker: entrypoint `src/worker/index.ts`.
- Cloudflare Workers Assets: phục vụ `dist/` và fallback SPA.
- Supabase PostgreSQL: lưu user, document, social post, comment, notification, landing config.
- Cloudflare R2: lưu media upload cho cộng đồng và landing page.
- JWT tự ký: xác thực request API.

### 3.3. Backend local/legacy

- Express trong `server.ts`.
- Route legacy trong `src/api/*`.
- Các route này vẫn có giá trị khi chạy local kiểu Node/Express, nhưng production hiện ưu tiên Worker qua `wrangler.jsonc`.

### 3.4. Cấu hình triển khai

File `wrangler.jsonc` định nghĩa:

- Worker name: `website-electricity`.
- Worker main: `src/worker/index.ts`.
- Assets directory: `./dist`.
- `run_worker_first: ["/api/*"]` để mọi API đi qua Worker trước.
- Biến R2 không nhạy cảm: account id, bucket name, public URL.
- Secret nhạy cảm được cấu hình trong Cloudflare dashboard/secret, không nên ghi trực tiếp vào tài liệu hay public repo.

## 4. Kiến trúc runtime

```text
Người dùng
  |
  v
Trình duyệt
  |
  v
React App + Zustand stores
  |
  +--> Xuất PDF client-side
  |
  v
/api/* qua src/utils/api.ts hoặc fetch trực tiếp
  |
  v
Cloudflare Worker src/worker/index.ts
  |
  +--> Auth routes
  +--> Landing routes
  +--> Posts routes
  +--> Documents routes
  +--> Social graph routes
  +--> Export DOCX route
  |
  +--> Supabase PostgreSQL
  +--> Cloudflare R2
  |
  v
Response JSON / file DOCX / media URL
```

## 5. Điều hướng tổng thể

### 5.1. Trạng thái điều hướng

Điều hướng chính được quản lý bởi `useNavigationStore`, không dựa nặng vào route declarative.

Các tab chính:

- `patctc`: Lập phương án.
- `social`: Cộng đồng.
- `documents`: Tài liệu đã lưu.
- `profile`: Hồ sơ cá nhân.
- `user-profile`: Hồ sơ người dùng khác.
- `admin`: Quản trị hệ thống.

URL query được đồng bộ bằng `?tab=...` và `uid=...` khi xem hồ sơ người dùng khác.

### 5.2. Luồng vào ứng dụng

1. Người dùng chưa đăng nhập thấy `LandingPage`.
2. Bấm `Đăng nhập`, `Đăng ký`, hero CTA, quick action hoặc link footer sẽ gọi `onEnter`.
3. Nếu cần đăng nhập, hệ thống lưu `pendingTab` để sau khi đăng nhập chuyển đúng tab mong muốn.
4. `LoginPage` xử lý đăng nhập/đăng ký.
5. Khi đăng nhập thành công, `App.tsx` gọi:
   - `/api/auth/me`
   - `fetchPosts`
   - `fetchDocuments`
   - `fetchFriendRequests`
   - `fetchNotifications`
   - `fetchUnreadNotificationCount`
   - subscribe realtime notification/posts.
6. Nếu user logout, navigation reset về trạng thái ban đầu.

### 5.3. Back/Forward trình duyệt

`App.tsx` lắng nghe `popstate`, đọc lại query URL và cập nhật `useNavigationStore`. Cách này giúp người dùng dùng nút Back/Forward mà không mất context tab.

## 6. Trang công khai LandingPage

File chính: `src/pages/LandingPage.tsx`.

### 6.1. Vai trò nghiệp vụ

Landing page là cửa vào công khai, vừa giới thiệu hệ thống vừa lấy dữ liệu động từ:

- `useLandingStore.config`: cấu hình nội dung do admin chỉnh.
- `useSocialStore.posts`: tạo mục tin tức động.
- `useSocialStore.savedDocuments`: tạo chỉ số thống kê.
- `useAuthStore.getAllUsers`: tạo chỉ số thành viên.

### 6.2. Các vùng nội dung

- Top banner: câu khẩu hiệu cấu hình bởi admin.
- Utility bar: hotline, email, English, Tìm kiếm.
- Navbar: Trang chủ, Giới thiệu, Thư viện, Tin tức, Mẫu phương án TCTCBPAT, Liên hệ.
- Hero banner: slide ảnh/video, badge, tiêu đề, mô tả, CTA.
- Quick actions: các lối tắt vào lập phương án, đăng tin, mẫu phương án, cộng đồng, tài liệu, hỗ trợ.
- Statistics: bộ đếm số phương án, thành viên, tỷ lệ an toàn, hỗ trợ 24/7.
- About/features/gallery/videos/news/contact/footer.
- Floating hotline.
- Back to top.
- Search modal.
- Image lightbox và video player modal.

### 6.3. Tương tác nút bấm

| Nút/label | Vị trí | Hành động | Kết quả |
|---|---|---|---|
| Logo | Navbar | Scroll lên đầu trang | Về section `trang-chu` |
| Trang chủ/Giới thiệu/Thư viện/Tin tức/Mẫu phương án/Liên hệ | Navbar | `scrollTo(sectionId)` | Cuộn tới section tương ứng, active section đổi theo scroll spy |
| Tìm kiếm | Utility/mobile | Mở search modal | Focus input, hỗ trợ Ctrl+K và ESC |
| English | Utility | UI hover, chưa có xử lý đổi ngôn ngữ thực tế | Không đổi dữ liệu |
| Đăng nhập | Navbar/CTA/footer | `onEnter()` | Vào login hoặc app nếu đã đăng nhập |
| Đăng ký | Navbar/CTA | `onEnter({ register: true })` | Mở login page ở chế độ đăng ký |
| Xem chi tiết | Hero | `onEnter()` | Vào luồng đăng nhập/app |
| Đăng ký ngay | Hero | `onEnter({ register: true })` | Vào form đăng ký |
| Mũi tên trái/phải hero | Hero | đổi `currentSlide` | Chuyển slide |
| Dot slide | Hero | set slide theo index | Hiển thị slide được chọn |
| Quick action | Quick actions | `onEnter({ tab })` | Sau đăng nhập vào tab đích |
| Gallery category | Thư viện | đổi category local | Lọc ảnh gallery |
| Ảnh gallery | Thư viện | set lightbox image | Mở ảnh phóng to |
| Video card/play | Video | set playing video | Mở modal video |
| Bài tin tức | Tin tức | `onEnter({ tab: 'social' })` | Vào tab cộng đồng |
| Gửi tin nhắn | Liên hệ | validate form local | Hiện trạng thái gửi thành công và reset form |
| Floating hotline | Toàn trang | `tel:` link | Gọi số hotline |
| Back to top | Toàn trang | `window.scrollTo` | Cuộn lên đầu |
| Search result | Search modal | nếu là section thì scroll, nếu là chức năng thì vào app | Đóng modal và điều hướng |

## 7. Xác thực và tài khoản

### 7.1. Store và API

- Store: `src/store/useAuthStore.ts`.
- API Worker: `src/worker/routes/auth.ts`.
- JWT helper: `src/worker/jwt.ts`.
- Auth middleware Worker: `src/worker/auth.ts`.

### 7.2. Luồng đăng ký

1. Người dùng nhập họ tên, email, mật khẩu.
2. Frontend gửi `POST /api/auth/register`.
3. Backend tạo user trong Supabase.
4. Tài khoản mới có thể cần chờ admin duyệt tùy trạng thái trả về.
5. UI hiển thị thông báo đăng ký thành công hoặc lỗi.

### 7.3. Luồng đăng nhập

1. Người dùng nhập email/mật khẩu.
2. Frontend gửi `POST /api/auth/login`.
3. Worker kiểm tra user, password hash và trạng thái.
4. Nếu hợp lệ, Worker trả user + JWT.
5. `useAuthStore` lưu token/user vào localStorage key `patctc-auth`.
6. `App.tsx` bootstrap dữ liệu nghiệp vụ.

### 7.4. Trạng thái tài khoản

- `pending`: đăng ký xong nhưng chờ duyệt.
- `approved`: được phép đăng nhập/sử dụng.
- `rejected`: bị từ chối, cần admin duyệt lại nếu muốn dùng.

### 7.5. Quyền

- `user`: lập phương án, đăng bài, lưu tài liệu, xem tài liệu công khai, quản lý nội dung của mình.
- `admin`: có thêm quyền quản trị user, duyệt tài liệu, xóa bài/tài liệu của người khác, cấu hình landing page.

## 8. MainLayout sau đăng nhập

File: `src/components/layout/MainLayout.tsx`.

### 8.1. Các panel chính

- Header trái: logo, tên `PATCTC`, subtitle `Generator`.
- Tab center: Lập phương án, Cộng đồng, Tài liệu đã lưu.
- Header phải: thông báo, avatar/user menu.
- Body: render page theo `activeTab`.

### 8.2. Tab navigation

| Nút tab | Icon | Hành động | Kết quả |
|---|---|---|---|
| Lập phương án | FileText | `onTabChange('patctc')` | Hiển thị PATCTC editor |
| Cộng đồng | Users | `onTabChange('social')` | Hiển thị feed cộng đồng |
| Tài liệu đã lưu | FolderOpen | `onTabChange('documents')` | Hiển thị thư viện tài liệu |

### 8.3. Notification panel

Nút chuông mở dropdown thông báo. Khi mở:

- Gọi `fetchNotifications`.
- Gọi `fetchUnreadNotificationCount`.
- Hiển thị tối đa 8 thông báo gần nhất.

Tương tác:

- `Đánh dấu tất cả`: gọi `markAllNotificationsRead`.
- Click row notification:
  - `follow`, `friend_accept`, `friend_request`: mở profile người gửi.
  - `post_like`, `post_comment`, `post_share`, `comment_like`, `admin_post`: chuyển sang social và scroll tới bài.
  - `document_download`: chuyển sang documents.
- Với friend request pending:
  - `Chấp nhận`: gọi `acceptFriendRequest`.
  - `Từ chối`: gọi `rejectFriendRequest`.

### 8.4. User menu

| Nút | Điều kiện | Hành động |
|---|---|---|
| Hồ sơ cá nhân | mọi user | mở tab `profile` |
| Quản trị hệ thống | user role admin | mở tab `admin` |
| Đăng xuất | mọi user | gọi `logout`, reset app |

## 9. Lập phương án PATCTC

File page: `src/pages/PATCTCEditorPage.tsx`.

Store dữ liệu biểu mẫu: `src/store/useStore.ts`.

Kiểu dữ liệu chính: `PATCTCData` trong `src/types.ts`.

### 9.1. Bố cục màn hình

Màn hình chia 2 vùng:

- Sidebar trái: panel tài liệu đã lưu, các accordion form, footer lưu/xuất.
- Preview phải: render tài liệu theo dữ liệu hiện tại.

### 9.2. Panel tài liệu đã lưu trong editor

Nút `Tài liệu đã lưu` mở/đóng panel.

Panel chia:

- `Phương án của tôi`: tài liệu có `authorId === user.id`.
- `Phương án người khác`: tài liệu còn lại.

Tương tác:

| Nút | Áp dụng | Hành động |
|---|---|---|
| Xem trước | mọi tài liệu | parse `dataSnapshot`, mở `DocumentPreviewModal` |
| Mở | tài liệu của tôi | parse snapshot, `setData`, đóng panel |
| Tải về & Mở | tài liệu người khác | parse snapshot, `setData`, đóng panel |
| Sao chép về của tôi | tài liệu người khác | set data vào editor, tạo document mới với prefix `[Sao chép]` |
| Xóa | tài liệu của tôi | confirm rồi gọi `deleteDocument` |

### 9.3. Auto-save

Nếu user đang đăng nhập, editor theo dõi `data`. Sau 3 giây không đổi:

1. Tạo title theo `PA {soVb} - ĐZ {dz} cột {cot}`.
2. Tìm document cùng author và title.
3. Nếu có, cập nhật description, snapshot, tags.
4. Nếu đang manual save thì bỏ qua lượt autosave.

Auto-save hiện chỉ cập nhật tài liệu đã tồn tại, không tự tạo tài liệu mới.

### 9.4. Footer editor

| Nút | Hành động | Điều kiện/lưu ý |
|---|---|---|
| Lưu PA | tạo hoặc cập nhật document hiện tại | chặn re-entry khi đang lưu |
| Mới | confirm rồi `resetData` | dữ liệu chưa lưu có thể mất |
| XUẤT PDF | `validateData`, gọi `exportPatctcPdf(data)` | xuất phía client |
| XUẤT WORD | `validateData`, POST `/api/export/docx` | Worker trả blob DOCX |

Nếu `validateData` trả lỗi, danh sách lỗi hiển thị trong footer.

## 10. Các panel form của PATCTC

Mỗi panel là một accordion. Khi focus input, hệ thống gọi `scrollPreviewToSection` để preview phải cuộn tới phần tương ứng.

### 10.1. Trang bìa

File: `src/components/forms/CoverPageForm.tsx`.

Accordion title: `Trang bìa`.

Label dữ liệu:

- Số văn bản.
- Địa danh.
- Hạng mục công việc.
- Số cột.
- ĐZ (đường dây).
- Ngày lập.
- Người lập.
- Người kiểm tra.
- Đội trưởng.

Tương tác:

| Nút/label | Hành động |
|---|---|
| Thêm hạng mục | thêm job item, tối đa 2 |
| Tìm hạng mục | lọc `JOB_ITEM_TEMPLATES` theo từ khóa không dấu |
| Click template | copy text vào clipboard, điền vào job item trống hoặc thêm job item mới |
| Sao chép job | copy nội dung job đang chọn sang job mới |
| Xóa job | xóa job nếu có hơn 1 job |
| Số cột | gọi `updateCot`, đồng bộ các field phụ thuộc |
| ĐZ | gọi `updateDz`, đồng bộ các field phụ thuộc |

### 10.2. I. Căn cứ

File: `src/components/forms/LegalBasisForm.tsx`.

Accordion title: `I. Căn cứ`.

Label dữ liệu:

- Đội quản lý khu vực.
- Số văn bản.
- Ngày văn bản.
- Ngày/Tháng/Năm của căn cứ 10.
- Căn cứ bổ sung.

Tương tác:

| Nút | Hành động |
|---|---|
| Thêm căn cứ | thêm item vào `canCuBoSung` |
| Xóa căn cứ | xóa item khỏi `canCuBoSung` |

### 10.3. II. Đặc điểm công trình

File: `src/components/forms/ConstructionDetailsForm.tsx`.

Accordion title: `II. Đặc điểm công trình`.

Label dữ liệu chính:

- ĐZ (đường dây).
- Số cột.
- Loại mạch.
- Đi chung cột với.
- Máy cắt (MC).
- DCL.
- FCO.
- Loại cột.
- Chiều cao cột.
- Loại xà.
- Loại sứ.
- Loại dây.
- Phương thức ngày làm việc.
- Hiện trạng.
- Địa bàn.
- ĐZ nguồn.
- Phạm vi cấp điện.
- Đường rộng.
- Cột cách đường.

Tương tác:

| Nút/field | Hành động |
|---|---|
| Loại mạch | chọn `Mạch đơn` hoặc `Mạch kép` |
| Xóa dòng phương thức | xóa một item trong `phuongThucNgayLamViec` |
| Thêm phương thức | thêm dòng phương thức ngày làm việc |
| ĐZ/Số cột | dùng updater đồng bộ giống trang bìa |

### 10.4. III. Hình ảnh vị trí thi công

File: `src/components/forms/ImageUploadForm.tsx`.

Accordion title: `III. Hình ảnh vị trí thi công`.

Tương tác:

| Nút | Hành động |
|---|---|
| Chọn/tải ảnh | mở file picker, đọc ảnh vào `data.images` |
| Xóa ảnh | xóa ảnh khỏi danh sách |
| Scale % | điều chỉnh `scalePercent` khi render preview/export |

### 10.5. IV.1 Nhận diện rủi ro

File: `src/components/forms/RiskIdentificationForm.tsx`.

Accordion title: `IV.1 Nhận diện rủi ro`.

Nhóm dữ liệu:

- Thời gian thi công: giờ, số ngày, tháng, năm.
- Loại công việc.
- Bảng rủi ro cho hạng mục 1 và hạng mục 2.
- Biện pháp an toàn hotline.
- Khóa F79, cắt DCL, mã DCL, cắt FCO, mã FCO.
- Hotline safety measures theo từng hạng mục.

Tương tác:

| Nút/label | Hành động |
|---|---|
| Thêm dòng rủi ro | thêm `RiskItem` vào bảng theo job |
| Xóa dòng rủi ro | xóa `RiskItem` |
| Thêm mối nguy/biện pháp | thêm `RiskDetail` trong một dòng |
| Xóa detail | xóa hazard/measure |
| Khóa chức năng TĐL (F79) | bật/tắt `khoaF79` |
| Cắt DCL | bật/tắt `catDcl`, hiển thị mã DCL |
| Cắt FCO | bật/tắt `catFco`, hiển thị mã FCO |
| Tab hạng mục hotline | chuyển cấu hình biện pháp an toàn theo job |
| Thêm yêu cầu cắt thiết bị | thêm dòng extra measure |

### 10.6. IV.2 Trình tự thi công

File: `src/components/forms/ConstructionSequenceForm.tsx`.

Accordion title: `IV.2 Trình tự thi công`.

Nhóm dữ liệu:

- Tab hạng mục công việc.
- Nội dung kiểm tra bằng mắt.
- Dùng gương kiểm tra.
- Block bọc cách điện.
- Block điều khiển gầu.
- Block tháo bọc cách điện.

Tương tác:

| Nút/label | Hành động |
|---|---|
| Tab hạng mục | chuyển `activeJobIdx` |
| Bật/tắt kiểm tra bằng mắt | thêm hoặc bỏ `eyeCheckText` |
| Nội dung kiểm tra | cập nhật text kiểm tra |
| Dùng gương kiểm tra | cập nhật vị trí/dụng cụ dùng gương |
| Thêm bọc cách điện | thêm block `BocCachDienBlock` |
| Xóa bọc cách điện | xóa block theo id |
| Thêm điều khiển gầu | thêm block `DieuKhienGauBlock` |
| Xóa điều khiển gầu | xóa block theo id |
| Thêm tháo bọc cách điện | thêm block `ThaoBocCachDienBlock` |
| Xóa tháo bọc cách điện | xóa block theo id |

### 10.7. Phụ lục 1: Nhân sự

File: `src/components/forms/PersonnelForm.tsx`.

Accordion title: `Phụ lục 1: Nhân sự`.

Label dữ liệu:

- Họ tên.
- Giới tính.
- Năm sinh.
- Vai trò.
- Nghề nghiệp.
- Bậc nghề.
- Bậc ATĐ.

Tương tác:

| Nút/label | Hành động |
|---|---|
| Click row nhân sự | expand/collapse chi tiết |
| Checkbox/selection CHTT-GSAT | cập nhật trạng thái chọn người chỉ huy/giám sát |
| Xóa nhân sự | xóa khỏi `personnel` |
| Thêm nhân sự | thêm nhân sự mới |

### 10.8. Phụ lục 2: Dụng cụ

File: `src/components/forms/ToolsForm.tsx`.

Accordion title: `Phụ lục 2: Dụng cụ`.

Label dữ liệu:

- Tên dụng cụ.
- Mã hiệu/Quy cách.
- Nước sản xuất.
- Đơn vị.
- Số lượng.
- Mục đích sử dụng.
- Selected.

Tương tác:

| Nút/label | Hành động |
|---|---|
| Checkbox selected | chọn/bỏ chọn dụng cụ dùng trong phương án |
| Click row | expand/collapse chi tiết |
| Xóa dụng cụ | xóa tool |
| Thêm dụng cụ | thêm tool mới |

### 10.9. Phụ lục 3: Vật tư thi công

File: `src/components/forms/MaterialsForm.tsx`.

Accordion title: `Phụ lục 3: Vật tư thi công`.

Label dữ liệu:

- Bên cấp vật tư.
- Tên vật tư.
- Nước SX.
- Đơn vị.
- Số lượng.
- Mục đích.

Tương tác:

| Nút | Hành động |
|---|---|
| Click row vật tư | expand/collapse |
| Xóa vật tư | xóa item |
| Thêm vật tư | thêm item mới |

### 10.10. V. Biên bản khảo sát hiện trường

File: `src/components/SiteSurveySection.tsx`.

Accordion title: `V. Biên bản khảo sát hiện trường`.

Label dữ liệu:

- Giờ (0-23).
- Phút (0-59).
- Người lập phương án khảo sát.
- Thành phần Hotline.
- Họ tên đại diện QLVH.
- Chức vụ.
- Có đơn vị liên quan.
- Thành phần điều độ.
- Dữ liệu nguồn/cắt điện/máy phát khách hàng.
- Những nội dung khác.
- Yêu cầu cắt điện bổ sung.

Tương tác:

| Nút/label | Hành động |
|---|---|
| Chọn người lập khảo sát | set `ks_lapPAId` từ personnel |
| Cập nhật từ Phụ lục 1 | lấy thành phần Hotline từ danh sách nhân sự |
| Có đơn vị liên quan | bật/tắt `ks_coDieuDo` |
| Thêm điều độ | thêm người vào `ks_thanhPhanDieuDo` |
| Xóa điều độ | xóa người khỏi danh sách |
| Thêm ghi chú phương thức thay đổi | bật/tắt ghi chú mục 8 |
| Có công việc cần cắt điện | bật/tắt phần cắt điện |
| Có máy phát điện khách hàng phát lên lưới | bật/tắt cảnh báo máy phát |
| Thêm yêu cầu bổ sung | thêm item trong `dvqlvhCutRequests` |
| Xóa yêu cầu bổ sung | xóa item tương ứng |

### 10.11. VI. Sơ đồ vùng làm việc

File: `src/components/forms/WorkZoneDiagramForm.tsx`.

Accordion title: `VI. Sơ đồ vùng làm việc`.

Tương tác:

| Nút | Hành động |
|---|---|
| Chọn/tải sơ đồ | mở file picker, lưu ảnh/sơ đồ vào `workZoneDiagrams` |
| Xóa sơ đồ | xóa diagram theo id |
| Số trang | cập nhật `pageNumber` |

## 11. Preview tài liệu

Files:

- `src/components/Preview.tsx`
- `src/components/preview/PreviewPage.tsx`
- `src/components/preview/PreviewToolbar.tsx`

Vai trò:

- Render bản xem trước theo `PATCTCData`.
- Đồng bộ `activeSection` từ sidebar.
- Hỗ trợ zoom qua `zoom`, `setZoom`.
- Là nguồn DOM cho xuất PDF client-side.

Luồng tương tác:

1. User sửa input ở sidebar.
2. `useStore.updateData` cập nhật state.
3. Preview nhận prop `data`.
4. React render lại trang tương ứng.
5. Khi focus vào field thuộc section, preview scroll tới section đó.

## 12. DocumentPreviewModal

File: `src/components/DocumentPreviewModal.tsx`.

Vai trò:

- Hiển thị tóm tắt document đã lưu.
- Dùng chung ở editor, documents page và profile.

Panel hiển thị:

- Header: title, author, thời gian cập nhật, nút đóng.
- Card thông tin PA.
- Card vị trí/đặc điểm công trình.
- Hạng mục công việc.
- Thời gian.
- Nhân sự.
- Bảng nhân sự nếu `showPersonnelTable`.
- Dụng cụ nếu `showToolsSection`.
- Tags nếu `showTags`.
- Footer status và các nút action.

Tương tác:

| Nút | Điều kiện | Hành động |
|---|---|---|
| Đóng | luôn có | đóng modal |
| PDF | khi truyền `onExportPdf` | xuất PDF document |
| Word | khi truyền `onExportWord` | gọi export Word |
| Sao chép | khi truyền `onClone` | clone document rồi đóng |
| Mở/Tải về & Mở | luôn có | gọi `onOpen`, set data vào editor |

## 13. Cộng đồng

File: `src/pages/SocialPage.tsx`.

Store: `src/store/useSocialStore.ts`.

API: `src/worker/routes/posts.ts`, `src/worker/routes/social.ts`.

### 13.1. Vai trò nghiệp vụ

Cộng đồng cho phép thành viên chia sẻ kinh nghiệm, thông báo, kỹ thuật, an toàn; đồng thời tạo tương tác xã hội và notification realtime.

### 13.2. Danh mục bài viết

| Value | Label | Ý nghĩa |
|---|---|---|
| `general` | Chung | nội dung chung |
| `technical` | Kỹ thuật | nội dung kỹ thuật |
| `safety` | An toàn | cảnh báo/quy trình an toàn |
| `announcement` | Thông báo | thông báo hệ thống/đội |

### 13.3. Composer đăng bài

Label/field:

- Textarea: `Chia sẻ kinh nghiệm, thông báo...`
- Category buttons: Chung, Kỹ thuật, An toàn, Thông báo.
- Nút ảnh.
- Nút video.
- Preview media.
- Nút `Đăng bài`.

Tương tác:

| Nút | Hành động | Ràng buộc |
|---|---|---|
| Category | đổi `newCategory` | chỉ chọn 1 |
| Ảnh | mở file input ảnh | ảnh tối đa 75MB/file |
| Video | mở file input video | video tối đa 500MB và 5 phút |
| X trên preview media | remove file và revoke object URL | giải phóng bộ nhớ |
| Đăng bài | gọi `addPost` | cần có content hoặc media |

Upload media social:

1. Frontend giữ `File` trong `mediaFiles`.
2. `addPost` gọi Worker để presign/upload R2 hoặc gửi multipart theo flow store.
3. Worker lưu media lên R2.
4. Bài viết lưu URL media công khai.

### 13.4. Feed filter/sort

Nút filter:

- Tất cả.
- Chung.
- Kỹ thuật.
- An toàn.
- Thông báo.

Nút sort:

- Mới đây: sort theo `createdAt` giảm dần.
- Đề xuất: sort theo likes + comments + shares.
- Cũ nhất: sort theo `createdAt` tăng dần.

Nút `Tải thêm bài viết` chỉ hiện khi:

- còn page tiếp theo,
- filter là `all`,
- sort là `newest`.

### 13.5. Post card

Panel bài viết gồm:

- Avatar/tên tác giả.
- Badge admin nếu tác giả là admin.
- Thời gian.
- Category.
- Menu ba chấm nếu là chủ bài hoặc admin.
- Nội dung.
- Media gallery.
- Stats likes/comments/shares.
- Action row: Thích, Bình luận, Chia sẻ.
- Comments panel.

Tương tác:

| Nút | Hành động |
|---|---|
| Avatar/tên tác giả | mở profile tác giả |
| Menu ba chấm | mở menu bài viết |
| Xóa bài | gọi `deletePost` |
| Media | mở lightbox ảnh/video |
| Like count | mở popup danh sách người thích |
| Share count | mở popup danh sách người chia sẻ |
| Thích | gọi `toggleLike(post.id, user.id)` |
| Bình luận | mở/đóng comments panel |
| Chia sẻ | gọi `sharePost`, copy text tóm tắt vào clipboard |

### 13.6. Comments

Tương tác comment:

| Nút/field | Hành động |
|---|---|
| Input bình luận | nhập comment/reply |
| Enter hoặc Send | gọi `addComment` |
| Trả lời | set `replyTo`, focus input |
| X trên reply indicator | bỏ trạng thái reply |
| Thích comment | gọi `toggleCommentLike` |
| Sửa | chuyển comment sang edit mode |
| Lưu | gọi `editComment` |
| Hủy | thoát edit mode |
| Xóa | gọi `deleteComment` |
| Tên/Avatar commenter | mở profile |

## 14. Tài liệu đã lưu

File: `src/pages/DocumentsPage.tsx`.

Store/API: `useSocialStore`, `/api/documents/*`, `/api/export/docx`.

### 14.1. Vai trò nghiệp vụ

Quản lý các bản phương án đã lưu, bao gồm bản nháp, hoàn thành, đã duyệt/công khai.

### 14.2. Header và filter

| Nút/field | Hành động |
|---|---|
| Lưu PA hiện tại | lấy `useStore.data`, gọi `saveDocument` |
| Tìm kiếm tài liệu | lọc theo title, description, tags |
| Tất cả | filter all |
| Bản nháp | filter `draft` |
| Hoàn thành | filter `completed` |
| Đã duyệt | filter `approved` |

### 14.3. Card tài liệu

Hiển thị:

- Title.
- Status badge.
- Description.
- Updated time.
- Download count.
- Author name.
- Tags.

Tương tác:

| Nút | Hành động |
|---|---|
| Author | mở profile tác giả |
| Xem | parse snapshot, mở `DocumentPreviewModal` |
| PDF | nếu tài liệu người khác thì track download, sau đó xuất PDF |
| Word | nếu tài liệu người khác thì track download, POST `/api/export/docx` |
| Mở | nếu tài liệu người khác thì track download, set data vào editor, chuyển tab PATCTC |
| Chép | với tài liệu người khác, clone thành draft của mình |
| Công khai | chủ tài liệu user thường đổi status sang `approved` |
| Duyệt | admin đổi status sang `approved` |
| Xóa | chủ tài liệu hoặc admin confirm rồi xóa |

## 15. Hồ sơ người dùng

File: `src/pages/ProfilePage.tsx`.

Vai trò:

- Xem và cập nhật hồ sơ cá nhân.
- Xem hồ sơ người khác.
- Theo dõi/kết bạn.
- Xem bài viết, tài liệu, lịch sử tải/xuất liên quan tới user.

Luồng chính:

- `profile`: chính user hiện tại.
- `user-profile`: user khác theo `viewingUserId`.

Tương tác thường gặp:

| Nút/panel | Điều kiện | Hành động |
|---|---|---|
| Quay lại | khi xem user khác | gọi `backFromUserProfile` |
| Sửa hồ sơ | user hiện tại | bật form edit profile |
| Lưu hồ sơ | user hiện tại | cập nhật name/avatar/bio/email tùy field |
| Đổi mật khẩu | user hiện tại | gọi API đổi mật khẩu |
| Theo dõi/Bỏ theo dõi | user khác | gọi follow/unfollow |
| Kết bạn | user khác | gửi friend request |
| Chấp nhận/Từ chối | request đến | gọi accept/reject |
| Mở tài liệu | document trong profile | set data vào editor |
| Clone tài liệu | tài liệu người khác | lưu bản sao vào tài khoản hiện tại |
| PDF/Word | document trong profile | export và track download khi cần |

## 16. Quản trị hệ thống

File: `src/pages/AdminPage.tsx`.

Điều kiện truy cập: `user.role === 'admin'`. `App.tsx` tự đưa user không phải admin về tab `patctc` nếu cố mở tab admin.

### 16.1. Admin tabs

| Tab | Ý nghĩa |
|---|---|
| Quản lý người dùng | duyệt user, đổi quyền, reset mật khẩu, xóa user |
| Quản lý trang chủ | chỉnh cấu hình landing page |

### 16.2. Quản lý người dùng

Panel gồm:

- Stats grid: tổng user, admin, user thường, hoạt động.
- Search user.
- Bảng user desktop/mobile.
- Recent activity.

Tương tác:

| Nút | Điều kiện | Hành động |
|---|---|---|
| Duyệt | user pending | cập nhật status approved |
| Từ chối | user pending | cập nhật status rejected |
| Duyệt lại | user rejected | cập nhật status approved |
| Shield | user khác | toggle role admin/user |
| Key | user khác | mở panel reset password |
| Đặt lại | reset panel | gọi API reset password |
| Hủy | reset/delete panel | đóng panel |
| Trash | user khác | mở confirm delete |
| Xóa | confirm delete | xóa tài khoản |

### 16.3. Landing editor

Store: `useLandingStore`.

API: `/api/landing`.

Các section editor:

- Tổng quan.
- Hero Banner.
- Quick Actions.
- Tính năng.
- Giới thiệu.
- Thư viện ảnh.
- Video.
- Banner CSKH.
- Liên hệ.
- Footer.

Nút global:

| Nút | Hành động |
|---|---|
| Xem trước | bật/tắt live preview landing trong admin |
| Đóng xem trước | tắt preview |
| Đồng bộ & Lưu Web | gọi `syncConfigToServer` |
| Khôi phục mặc định | mở xác nhận reset config |
| Xác nhận | gọi `resetToDefault` |
| Hủy | bỏ reset |

Các tương tác theo section:

| Section | Tương tác chính |
|---|---|
| Tổng quan | chỉnh banner text, logo title/subtitle, hotline, email |
| Hero Banner | thêm/xóa slide, chỉnh badge, màu badge, title, subtitle, overlay, ảnh/video |
| Quick Actions | chỉnh label, icon, màu, tab đích |
| Tính năng | chỉnh title, description, icon/color |
| Giới thiệu | chỉnh text, checklist, thêm/xóa checklist |
| Thư viện ảnh | thêm/xóa ảnh, upload ảnh, category, caption |
| Video | thêm/xóa video, upload video mp4, thumbnail |
| Banner CSKH | chỉnh text, hotline, ảnh/banner |
| Liên hệ | chỉnh địa chỉ, hotline, email, giờ làm việc |
| Footer | chỉnh copyright, developer text |

Upload landing:

- Ảnh hero/gallery/banner/thumbnail được nén client-side rồi upload.
- Video landing dùng `uploadLandingVideo`, giới hạn theo `MAX_LANDING_VIDEO_SIZE_MB`.
- Backend lưu media lên R2 qua route landing.

## 17. State management

### 17.1. `useStore`

Quản lý toàn bộ dữ liệu `PATCTCData`.

Nhiệm vụ:

- Khởi tạo dữ liệu mặc định.
- Cập nhật field.
- Đồng bộ field phụ thuộc khi đổi cột/đường dây.
- Validate dữ liệu trước khi export.
- Quản lý zoom, active section, trạng thái export.
- Thêm/xóa/copy job item.
- Thêm/xóa nhân sự, dụng cụ, vật tư, sơ đồ, ảnh, rủi ro, sequence block.

### 17.2. `useAuthStore`

Quản lý:

- Token.
- User hiện tại.
- Danh sách user.
- Login/register/logout.
- Fetch users.
- Update profile/password.
- Admin user status/role/reset/delete.

Persist key: `patctc-auth`.

### 17.3. `useNavigationStore`

Quản lý:

- `activeTab`.
- `viewingUserId`.
- `previousTab`.
- `showLanding`.
- `pendingTab`.
- `initialRegister`.
- `scrollToPostId`.

Persist key: `patctc-navigation`.

### 17.4. `useSocialStore`

Quản lý:

- Posts.
- Saved documents.
- Relationships.
- Friend requests.
- Notifications.
- Pagination posts.
- Realtime subscriptions.

Các nhóm action:

- Posts: fetch, add, delete, like, share.
- Comments: add, edit, delete, like.
- Documents: fetch, save, update, status, delete, track download.
- Social graph: follow/unfollow, friend request, accept/reject.
- Notifications: fetch, mark read, mark all read, unread count.
- Realtime: subscribe/unsubscribe notifications/posts.

### 17.5. `useLandingStore`

Quản lý:

- Landing config.
- Dirty state `hasUnsavedChanges`.
- Saving state/error.
- Fetch config từ server.
- Sync config lên server.
- Update từng section landing.
- Reset default.

Persist key: `patctc-landing`.

## 18. Backend Worker API

Entrypoint: `src/worker/index.ts`.

### 18.1. Dispatch rule

| Path | Handler |
|---|---|
| `/api/health` | trả `{ status: 'ok', runtime: 'cloudflare-worker' }` |
| `/api/auth/*` | `handleAuth` |
| `/api/landing*` | `handleLanding` |
| `/api/posts*` | `handlePosts` |
| `/api/documents*` | `handleDocuments` |
| `/api/export*` | `handleExport` |
| `/api/social*` | `handleSocial` |
| `/api/*` không khớp | trả 501 |
| path khác | `env.ASSETS.fetch(request)` |

### 18.2. Auth routes

Nhóm route:

- Register.
- Login.
- Me.
- Profile update.
- Password update.
- Admin list/update/delete users.

Nghiệp vụ:

- Hash/check password.
- Sinh JWT.
- Kiểm tra Bearer token.
- Chặn quyền admin cho route quản trị.
- Chuẩn hóa user trả về frontend.

### 18.3. Landing routes

Nhóm route:

- Lấy landing config.
- Lưu landing config.
- Upload image.
- Upload media/video.

Nghiệp vụ:

- Config lưu trong Supabase.
- Media lưu R2.
- Trả public URL để frontend render ngay.

### 18.4. Posts routes

Nhóm route:

- List posts, phân trang.
- Create post.
- Delete post.
- Like/unlike.
- Share.
- Comment add/edit/delete.
- Comment like/unlike.
- Presign/upload media R2.

Nghiệp vụ:

- User phải đăng nhập cho mutation.
- Admin hoặc chủ bài được xóa bài.
- Notification tạo khi có tương tác phù hợp.
- Media URL lưu kèm post.

### 18.5. Documents routes

Nhóm route:

- List documents.
- My documents/user documents.
- Create document.
- Update document.
- Delete document.
- Update status.
- Track download.
- Download history.

Nghiệp vụ:

- Snapshot PATCTC lưu dạng JSON string.
- Chủ tài liệu và admin có quyền sửa/xóa.
- User khác mở/xuất tài liệu sẽ tăng download count và có thể tạo notification.
- Status `approved` dùng cho tài liệu công khai/đã duyệt.

### 18.6. Social routes

Nhóm route:

- Follow/unfollow.
- Followers/following.
- Friend requests.
- Accept/reject friend request.
- Friends list.
- Notifications.
- Mark notification read/all read.
- Unread notification count.

Nghiệp vụ:

- Follow là quan hệ một chiều.
- Friend request là quan hệ chờ xác nhận.
- Friend accept tạo quan hệ bạn bè và notification.

### 18.7. Export routes

Route chính: `POST /api/export/docx`.

Luồng:

1. Frontend validate dữ liệu.
2. Gửi `PATCTCData` JSON lên Worker.
3. Worker gọi module export DOCX.
4. Tạo file `.docx` bằng thư viện `docx`.
5. Trả response binary với header tải file.

PDF không đi qua Worker, được xuất client-side bằng `exportPatctcPdf`.

## 19. Dữ liệu chính

### 19.1. PATCTCData

Các nhóm field lớn:

- Trang bìa.
- I. Căn cứ.
- II. Đặc điểm công trình/giao thông.
- III. Hình ảnh vị trí thi công.
- IV.1 Nhận diện rủi ro.
- IV.2 Trình tự thi công.
- Phụ lục 1 nhân sự.
- Phụ lục 2 dụng cụ.
- Phụ lục 3 vật tư.
- V. Biên bản khảo sát hiện trường.
- VI. Sơ đồ vùng làm việc.

### 19.2. SocialPost

Gồm:

- Author info.
- Content.
- Category.
- Images/media URLs.
- Likes.
- Comments/replies.
- Shares/sharedBy.
- Created/updated timestamps.

### 19.3. SavedDocument

Gồm:

- Title.
- Description.
- Author.
- `dataSnapshot`.
- Status.
- Tags.
- Download count.
- Created/updated timestamps.

### 19.4. Landing config

Gồm:

- Banner text.
- Logo title/subtitle.
- Utility hotline/email.
- Hero slides.
- Quick actions.
- Features.
- About/checklist.
- Gallery.
- Videos.
- Customer care banner.
- Contact.
- Footer.

## 20. Tương tác chéo giữa các chức năng

### 20.1. Landing -> Auth -> App

Landing không trực tiếp mở chức năng nội bộ nếu user chưa đăng nhập. Nó truyền tab mong muốn qua `onEnter({ tab })`, sau đó `useNavigationStore` giữ `pendingTab`. Sau login thành công, app chuyển tới tab đó.

### 20.2. PATCTC -> Documents

Editor tạo dữ liệu phương án. Khi bấm `Lưu PA`, dữ liệu được serialize vào `dataSnapshot` và lưu thành document. Documents page đọc snapshot để mở lại, clone hoặc export.

### 20.3. Documents -> PATCTC

Nút `Mở` hoặc modal `Tải về & Mở` parse snapshot, gọi `useStore.setData`, sau đó chuyển sang tab `patctc`.

### 20.4. Documents -> Notifications

Khi user tải/mở/xuất tài liệu của người khác, `trackDocumentDownload` tăng lượt tải và có thể tạo notification `document_download`.

### 20.5. Social -> Profile

Click avatar/tên tác giả hoặc danh sách người like/share sẽ mở `user-profile` theo user id. Profile dùng cùng dữ liệu posts/documents để hiển thị hoạt động của user.

### 20.6. Social -> Notifications -> Navigation

Like/comment/share/friend/follow tạo notification. Click notification sẽ điều hướng về bài viết, profile hoặc tab tài liệu tùy type.

### 20.7. Admin -> Auth

Admin cập nhật status/role/password/delete user qua API auth. Kết quả ảnh hưởng trực tiếp khả năng login và quyền truy cập admin.

### 20.8. Admin -> Landing

Admin chỉnh landing config, lưu lên server. Landing page đọc config từ `useLandingStore.fetchConfigFromServer`, vì vậy thay đổi áp dụng cho khách truy cập sau khi sync.

### 20.9. Media upload -> R2 -> UI

Ảnh/video được upload lên R2. Backend trả URL public. URL được lưu trong post hoặc landing config. UI render trực tiếp từ public URL.

## 21. Bảo mật và phân quyền

### 21.1. Token

- Token lấy từ localStorage qua `getAuthToken`.
- `getAuthHeaders` tự gắn `Authorization: Bearer ...`.
- API không có token sẽ bị chặn ở các route yêu cầu đăng nhập.

### 21.2. Admin guard

- Frontend: `App.tsx` không cho user thường ở tab admin.
- Backend: route admin vẫn phải kiểm tra quyền bằng token, không tin frontend.

### 21.3. Quyền nội dung

- Bài viết: chủ bài hoặc admin được xóa.
- Comment: chủ comment hoặc admin được xóa; chủ comment được sửa.
- Document: chủ tài liệu hoặc admin được xóa/sửa/duyệt tùy route.
- User management: chỉ admin.

### 21.4. Secret

Các giá trị sau không nên commit/public:

- JWT secret.
- Supabase service role key.
- R2 access key/secret key.
- Gemini API key.
- Google Safe Browsing key.

`wrangler.jsonc` chỉ nên chứa biến không nhạy cảm. Secret nên thêm trong Cloudflare dashboard hoặc dùng `wrangler secret put`.

## 22. Lưu trữ local và realtime

### 22.1. LocalStorage

Các key đáng chú ý:

- `patctc-auth`: token và user.
- `patctc-navigation`: tab hiện tại, landing/pending state.
- `patctc-landing`: landing config cache.
- PATCTC data store có thể persist tùy cấu hình store.

### 22.2. Supabase realtime

Khi đã đăng nhập:

- Subscribe notification theo `user.id`.
- Subscribe posts để feed cập nhật.
- Unsubscribe khi logout hoặc unmount.

Nếu thiếu `VITE_SUPABASE_URL` hoặc `VITE_SUPABASE_ANON_KEY`, realtime bị tắt, nhưng API chính vẫn có thể hoạt động qua Worker nếu Worker secret đầy đủ.

## 23. Ma trận nút bấm chính

| Màn hình | Nút | API/store liên quan | Kết quả nghiệp vụ |
|---|---|---|---|
| Landing | Đăng nhập | `enterFromLanding` | mở login |
| Landing | Đăng ký | `enterFromLanding(register)` | mở register |
| Landing | Quick Action | `pendingTab` | vào đúng tab sau login |
| Login | Đăng nhập | `/api/auth/login` | lưu token, vào app |
| Login | Tạo tài khoản | `/api/auth/register` | tạo user chờ duyệt/approved |
| MainLayout | Chuông | notifications actions | xem/thao tác thông báo |
| MainLayout | Hồ sơ cá nhân | navigation | mở profile |
| MainLayout | Quản trị hệ thống | navigation | mở admin |
| MainLayout | Đăng xuất | auth store | clear auth/navigation |
| PATCTC | Tài liệu đã lưu | local state | mở panel documents |
| PATCTC | Lưu PA | documents API | lưu snapshot |
| PATCTC | Mới | `resetData` | reset form |
| PATCTC | XUẤT PDF | `exportPatctcPdf` | tải PDF |
| PATCTC | XUẤT WORD | `/api/export/docx` | tải Word |
| Social | Đăng bài | posts API/R2 | tạo post |
| Social | Thích | posts API | like/unlike |
| Social | Bình luận | comments API | thêm comment |
| Social | Chia sẻ | posts API | share post |
| Documents | Lưu PA hiện tại | documents API | tạo draft |
| Documents | Xem | modal local | xem snapshot |
| Documents | PDF | PDF util + track download | tải PDF |
| Documents | Word | export API + track download | tải DOCX |
| Documents | Mở | `setData` + navigation | mở vào editor |
| Documents | Chép | documents API | clone draft |
| Documents | Công khai/Duyệt | documents API | status approved |
| Documents | Xóa | documents API | xóa document |
| Profile | Lưu hồ sơ | auth API | cập nhật profile |
| Profile | Đổi mật khẩu | auth API | đổi password |
| Profile | Theo dõi | social API | follow/unfollow |
| Profile | Kết bạn | social API | friend request |
| Admin | Duyệt user | auth admin API | approved |
| Admin | Từ chối user | auth admin API | rejected |
| Admin | Shield role | auth admin API | toggle role |
| Admin | Key reset | auth admin API | reset password |
| Admin | Trash user | auth admin API | delete user |
| Admin Landing | Đồng bộ & Lưu Web | landing API | lưu config |
| Admin Landing | Xem trước | local state | preview landing |
| Admin Landing | Upload ảnh/video | landing API/R2 | lưu media |

## 24. Route/API checklist

| Nhóm | Frontend gọi | Worker handler |
|---|---|---|
| Health | `/api/health` | `index.ts` |
| Auth | `/api/auth/*` | `routes/auth.ts` |
| Landing | `/api/landing*` | `routes/landing.ts` |
| Posts | `/api/posts*` | `routes/posts.ts` |
| Documents | `/api/documents*` | `routes/documents.ts` |
| Export Word | `/api/export/docx` | `routes/export.ts` |
| Social graph/notifications | `/api/social*` | `routes/social.ts` |

Nếu frontend gọi một `/api/*` khác chưa migrate, Worker trả 501 với thông báo endpoint chưa được migrate sang Cloudflare Worker.

## 25. Ghi chú vận hành

- Production cần build frontend bằng `npm run build`, sau đó Worker assets phục vụ thư mục `dist`.
- Deploy command dùng Cloudflare Worker: `npx wrangler deploy`.
- Các biến frontend dạng `VITE_*` cần được inject ở build time nếu code client cần dùng trực tiếp.
- Các secret backend phải đặt trong Cloudflare Worker environment.
- R2 public URL cần truy cập được từ browser để media hiển thị.
- Nếu Word export lỗi, kiểm tra `/api/export/docx`, token, dữ liệu `PATCTCData` và Worker logs.
- Nếu social media upload lỗi, kiểm tra R2 bucket, access key, secret key, CORS/public URL.
- Nếu realtime không chạy, kiểm tra `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

## 26. Các file tham chiếu chính

| Nhóm | File |
|---|---|
| App shell | `src/App.tsx` |
| Layout | `src/components/layout/MainLayout.tsx` |
| Landing | `src/pages/LandingPage.tsx` |
| Auth UI | `src/pages/LoginPage.tsx` |
| Editor | `src/pages/PATCTCEditorPage.tsx` |
| Social | `src/pages/SocialPage.tsx` |
| Documents | `src/pages/DocumentsPage.tsx` |
| Profile | `src/pages/ProfilePage.tsx` |
| Admin | `src/pages/AdminPage.tsx` |
| PATCTC store | `src/store/useStore.ts` |
| Auth store | `src/store/useAuthStore.ts` |
| Social store | `src/store/useSocialStore.ts` |
| Landing store | `src/store/useLandingStore.ts` |
| Navigation store | `src/store/useNavigationStore.ts` |
| API client | `src/utils/api.ts` |
| PDF export | `src/utils/exportPatctcPdf.tsx` |
| Worker entry | `src/worker/index.ts` |
| Worker routes | `src/worker/routes/*.ts` |
| Worker DOCX | `src/worker/exportDocx.ts` |
| Worker R2 | `src/worker/r2.ts` |
| Data types | `src/types.ts`, `src/worker/types.ts` |
| Cloudflare config | `wrangler.jsonc` |
| Supabase schema | `supabase/schema.sql` |

## 27. Kết luận nghiệp vụ

Hệ thống hiện là một ứng dụng vận hành theo tab, trong đó dữ liệu PATCTC là trung tâm. Các module xung quanh phục vụ vòng đời của phương án:

1. Người dùng được admin duyệt tài khoản.
2. Người dùng lập phương án trong editor.
3. Phương án được lưu thành document.
4. Document có thể mở lại, clone, công khai, tải PDF/Word.
5. Người dùng trao đổi kinh nghiệm qua cộng đồng.
6. Tương tác xã hội tạo notification và điều hướng ngược về nội dung liên quan.
7. Admin quản lý người dùng và nội dung landing.

Backend Worker đang đóng vai trò API production chính. Legacy Express vẫn tồn tại cho local/dev hoặc tham chiếu, nhưng mọi route production quan trọng cần tiếp tục được ưu tiên duy trì trong `src/worker/routes`.
