# Kế hoạch phát triển chức năng livestream trong Cộng đồng

## 1. Mục tiêu

Thêm chức năng livestream vào module Cộng đồng để người dùng có thể phát trực tiếp video, các role khác vào xem live và tương tác bằng chat/bình luận realtime. Giai đoạn đầu chưa cần lưu bản ghi/replay trên website sau khi live kết thúc.

Chức năng này nên ưu tiên ổn định, dễ kiểm soát quyền truy cập và không làm nặng server hiện tại. Server `website-electricity` không nên tự xử lý luồng video thời gian thực vì livestream cần hạ tầng media riêng như ingest, WebRTC/HLS và phân phối tới người xem. Recording/replay để ở giai đoạn sau.

## 2. Phạm vi đề xuất

Giai đoạn đầu nên hỗ trợ:

- User đã đăng nhập có thể tạo phiên live.
- Admin có thể bật/tắt quyền livestream cho user hoặc tắt live vi phạm.
- Người xem thấy danh sách live đang diễn ra trong tab Cộng đồng.
- Người xem có thể mở live, xem số người đang xem, chat/bình luận realtime.
- Người phát bắt buộc phải đặt tên phiên live trước khi được phát.
- Sau khi user tắt live, website không giữ video/replay. Nếu có file ghi tạm để tải xuống thì phải xóa khỏi dữ liệu website sau khi người dùng chọn tải hoặc hết thời gian chờ.
- Hiển thị thông báo cho người đang xem live có muốn lưu video về máy cá nhân/điện thoại hay không.
- Nếu người dùng chọn `Lưu`, trình duyệt tải file video xuống máy cá nhân với tên file lấy từ tên user phát live và tên phiên live.
- Nếu người dùng không chọn lưu, video không được giữ lại trên dữ liệu website.

Chưa nên làm ngay ở giai đoạn đầu:

- Livestream nhiều khách mời.
- Phát màn hình.
- Donation/paid live.
- Moderation AI video realtime.
- Replay công khai trên website.
- Storage video dài hạn hoặc retention 30 ngày.

## 3. Hướng kiến trúc

### Khuyến nghị

Dùng `LiveKit self-host` trước để giảm chi phí provider và phù hợp giai đoạn đầu chưa cần recording. Backend vẫn nên bọc qua abstraction `livestreamProvider` để sau này đổi provider nếu cần.

Các lựa chọn provider:

- LiveKit self-host
- Cloudflare Stream Live
- Mux Live Streaming
- AWS IVS

Trong bối cảnh yêu cầu hiện tại là ưu tiên miễn phí và chưa cần storage recording 30 ngày, lựa chọn thực tế nhất là LiveKit self-host. App hiện tại chỉ cần lưu metadata trong Supabase/Postgres và gọi service provider từ backend.

### Luồng tổng thể

1. User bấm `Bắt đầu live` trong Cộng đồng.
2. Frontend gọi backend: `POST /api/livestreams`.
3. Backend kiểm tra quyền user, tạo live input/session với provider.
4. Backend lưu metadata phiên live vào bảng `livestreams` với trạng thái `scheduled/live`.
5. Frontend nhận `streamKey`, `ingestUrl`, `playbackUrl`.
6. User phát video bằng WebRTC/RTMP tùy provider và client implementation.
7. Người xem mở `playbackUrl` để xem.
8. Chat realtime dùng Supabase Realtime hoặc route hiện có của social.
9. Khi user tắt live, frontend/backend gọi `POST /api/livestreams/:id/end`.
10. Backend cập nhật trạng thái `ended` và lưu thời gian kết thúc.
11. Frontend hiển thị thông báo `Bạn có muốn lưu video live này về máy không?` cho người đang xem live.
12. Nếu chọn `Lưu`, trình duyệt tải video xuống máy cá nhân/điện thoại. Tên file dùng format `ten-user-phat-live_ten-phien-live_yyyyMMdd-HHmm.webm`.
13. Nếu có recording tạm phía provider/server để phục vụ tải xuống, backend phải xóa file tạm ngay sau khi tải xong hoặc sau thời gian chờ ngắn.

## 4. Lưu trữ sau khi tắt live

### Metadata lưu ở đâu?

Metadata nên lưu trong Supabase/Postgres, bảng mới `livestreams`.

Nội dung lưu:

- `id`
- `author_id`
- `title`
- `description`
- `status`: `scheduled`, `live`, `ended`, `failed`, `deleted`
- `provider`: `livekit_self_host`, `cloudflare_stream` hoặc `mux`
- `provider_live_input_id`
- `provider_asset_id`: chỉ dùng khi provider có recording/asset
- `playback_url`
- `recording_url`: để trống nếu không dùng recording tạm; nếu có recording tạm thì chỉ dùng nội bộ, không public replay
- `temporary_recording_url`: URL tạm để tải xuống nếu provider/client tạo được recording tạm
- `temporary_recording_expires_at`: thời điểm hết hạn file tạm
- `downloaded_at`: thời điểm user đã tải file xuống, nếu có
- `thumbnail_url`
- `started_at`
- `ended_at`
- `created_at`
- `updated_at`
- `visibility`: giai đoạn đầu chỉ dùng `public`
- `recording_retention_days`: không dùng ở giai đoạn đầu
- `chat_enabled`
- `viewer_count_peak`

### Video live đang phát lưu ở đâu?

Trong lúc live, video không lưu trong server Node hiện tại. Luồng video đi trực tiếp tới provider livestream. Provider chịu trách nhiệm ingest, transcode và phân phối tới người xem.

### Bản ghi sau live lưu ở đâu?

Giai đoạn đầu không lưu replay trên website. Có 2 hướng xử lý phần `Lưu video về máy`:

Phương án khuyến nghị cho MVP: ghi cục bộ trên trình duyệt bằng `MediaRecorder`.

- Website không lưu video trên server.
- Người xem/người phát chỉ tải được phần video mà trình duyệt của họ đã nhận và ghi lại trong phiên đang xem.
- Nếu người xem vào muộn, file tải xuống chỉ có đoạn từ lúc họ bắt đầu xem, không phải toàn bộ buổi live.
- Phù hợp nhất với yêu cầu không lưu video trên dữ liệu website.

Phương án nếu bắt buộc tải toàn bộ buổi live: tạo recording tạm ở provider/server.

- Website/provider phải giữ file tạm trong thời gian rất ngắn sau khi live kết thúc.
- Khi người dùng chọn `Lưu`, backend trả link tải tạm.
- Sau khi tải xong hoặc hết thời gian chờ, backend xóa file tạm vĩnh viễn.
- Phương án này đúng nhu cầu tải đủ buổi live hơn, nhưng vẫn là một dạng lưu tạm nên phức tạp và có chi phí hơn.

Phần dưới là phương án để dành khi sau này cần replay/xem lại live trên website.

Có 2 phương án:

Phương án A, dùng khi bật recording sau này: lưu recording ở provider livestream.

- Cloudflare Stream/Mux lưu asset recording.
- App chỉ lưu `recording_url`, `provider_asset_id`, `thumbnail_url`.
- Ít phức tạp, ổn định hơn, có CDN và adaptive streaming.

Phương án B: export recording về Cloudflare R2.

- Dùng nếu muốn tự kiểm soát lưu trữ dài hạn.
- Sau khi provider tạo recording, backend hoặc job nền tải/copy video sang R2.
- App lưu `r2_key`, `public_url` hoặc signed URL.
- Phức tạp hơn vì cần job nền, retry, lifecycle cleanup.

### Lưu trong bao lâu?

Đề xuất chính sách mặc định khi bật recording sau này:

- Live metadata: lưu vĩnh viễn trừ khi user/admin xóa.
- Chat/bình luận live: giai đoạn đầu chỉ cần realtime trong phiên live. Khi bật replay, có thể lưu 90 ngày hoặc gắn vào replay.
- Recording video: chưa lưu ở giai đoạn đầu. Khi bật sau này, lưu 30 ngày mặc định.
- Recording của admin/thông báo quan trọng: cho phép đặt `keep_forever`.
- User có thể xóa recording của chính mình.
- Admin có thể xóa bất kỳ recording nào.

Lý do chưa làm storage recording ngay: LiveKit self-host giai đoạn đầu nên tập trung vào phát realtime trước để giảm chi phí và độ phức tạp. Khi cần xem lại, mốc 30 ngày là cấu hình hợp lý vì video tốn dung lượng và chi phí cao hơn text/image.

Có thể cấu hình qua env:

```env
LIVESTREAM_MAX_DURATION_MINUTES=120
LIVESTREAM_PROVIDER=livekit_self_host
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

## 5. Database đề xuất

### Bảng `livestreams`

```sql
create table livestreams (
  id uuid primary key,
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text default '',
  status text not null check (status in ('scheduled', 'live', 'ended', 'failed', 'deleted')),
  provider text not null,
  provider_live_input_id text,
  provider_asset_id text,
  ingest_url text,
  stream_key text,
  playback_url text,
  recording_url text,
  temporary_recording_url text,
  temporary_recording_expires_at timestamptz,
  downloaded_at timestamptz,
  thumbnail_url text,
  visibility text not null default 'public',
  chat_enabled boolean not null default true,
  viewer_count_peak integer not null default 0,
  recording_retention_days integer,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Lưu ý bảo mật: `stream_key` là bí mật. Không trả `stream_key` cho người xem. Chỉ trả cho chủ live trong endpoint tạo/live detail của chính họ.

### Bảng `livestream_messages`

```sql
create table livestream_messages (
  id uuid primary key,
  livestream_id uuid not null references livestreams(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

Có thể tái sử dụng hệ thống comment hiện tại, nhưng bảng riêng giúp dễ cleanup và realtime theo phòng live.

## 6. API đề xuất

### Livestream

- `POST /api/livestreams`
  - Tạo live session.
  - Chỉ user đã đăng nhập.
  - Bắt buộc có `title`; không cho bắt đầu live nếu title rỗng.
  - Trả về `id`, `ingestUrl`, `streamKey`, `playbackUrl`.

- `GET /api/livestreams/live`
  - Danh sách livestream đang live.

- `GET /api/livestreams/:id`
  - Chi tiết live. Replay chỉ trả khi giai đoạn sau bật recording.
  - Nếu requester là owner/admin thì trả thêm thông tin quản trị.

- `POST /api/livestreams/:id/start`
  - Cập nhật trạng thái live nếu provider callback không có.

- `POST /api/livestreams/:id/end`
  - Kết thúc live.
  - Chỉ owner/admin.
  - Trả về trạng thái có thể tải video hay không, tùy phương án recording cục bộ hoặc recording tạm.

- `GET /api/livestreams/:id/download`
  - Chỉ dùng nếu có recording tạm phía provider/server.
  - Trả link tải tạm cho user đang có quyền xem live.
  - Sau khi tải hoặc hết hạn, file tạm phải bị xóa khỏi dữ liệu website/provider.

- `DELETE /api/livestreams/:id`
  - Xóa metadata. Yêu cầu provider xóa recording chỉ cần khi giai đoạn sau bật recording.

### Chat

- `GET /api/livestreams/:id/messages`
- `POST /api/livestreams/:id/messages`
- `DELETE /api/livestreams/:id/messages/:messageId`

Realtime có thể dùng Supabase Realtime trên bảng `livestream_messages`.

### Provider callback

- `POST /api/livestreams/provider/webhook`
  - Nhận event từ provider: stream started, stream ended, error. Event `recording ready` chỉ cần khi bật recording sau này.
  - Cần verify signature.

## 7. UI/UX trong Cộng đồng

### Tab Cộng đồng

Thêm một dải/live section phía trên feed:

- `Đang live`
- Card live gồm avatar, tên user, tiêu đề, số người xem, thời lượng.
- Nút `Bắt đầu live` cạnh `Đăng bài`.

### Màn tạo live

Form tối thiểu:

- Tiêu đề live.
- Tiêu đề live là bắt buộc. Nếu bỏ trống thì disable nút `Bắt đầu live`.
- Mô tả.
- Quyền xem: công khai trong Cộng đồng.
- Bật/tắt chat.
- Chưa cần tùy chọn lưu bản ghi ở giai đoạn đầu.

### Màn live studio

- Preview camera/micro.
- Nút bắt đầu/kết thúc.
- Trạng thái kết nối.
- Chat realtime bên phải.
- Số người xem.

### Màn xem live

- Player video.
- Chat realtime.
- Thông tin người phát.
- Nút báo cáo vi phạm.
- Khi live kết thúc, hiển thị dialog hỏi `Bạn có muốn lưu video live này về máy không?`.
- Nút `Lưu` tải file về máy cá nhân/điện thoại nếu trình duyệt hoặc recording tạm hỗ trợ.
- Nút `Không lưu` đóng dialog và không giữ video trên dữ liệu website.

### Tên file tải xuống

Tên file lấy từ tên user phát live và tên phiên live đã đặt trước đó:

```text
{ten-user-phat-live}_{ten-phien-live}_{yyyyMMdd-HHmm}.webm
```

Ví dụ:

```text
nguyen-van-a_hop-giao-ban-dau-tuan_20260510-0830.webm
```

Tên file cần được chuẩn hóa:

- Chuyển tiếng Việt có dấu sang không dấu nếu cần.
- Đổi khoảng trắng thành dấu `-`.
- Loại bỏ ký tự không hợp lệ với Windows/Android/iOS.
- Giới hạn độ dài để tránh lỗi tải file.

### Replay, để sau

Sau khi live kết thúc, giai đoạn đầu chưa cần hiển thị replay. Khi bật recording sau này:

- Nếu có recording, tạo một card trong feed hoặc mục `Live đã kết thúc`.
- Hiển thị thumbnail, thời lượng, người phát, ngày phát.
- Nếu recording hết hạn thì card vẫn có metadata nhưng không còn nút xem lại.

## 8. Quyền và kiểm duyệt

Đề xuất quyền:

- User thường: live nếu tài khoản `approved` và không bị khóa quyền live.
- Admin: được live, dừng live của người khác, xóa chat. Xóa recording chỉ cần khi bật recording sau này.
- User bị report nhiều lần: admin có thể tạm khóa live.

Thêm field vào users hoặc bảng riêng:

- `can_livestream boolean default true`
- `livestream_banned_until timestamptz`

Moderation giai đoạn đầu:

- Report live.
- Admin force stop.
- Xóa message chat.
- Rate limit gửi chat.

## 9. Bảo mật

Yêu cầu bắt buộc:

- Không expose API key provider ở frontend.
- `streamKey` chỉ trả cho chủ live.
- Webhook provider phải verify signature.
- Endpoint tạo live phải rate limit.
- Endpoint chat phải giới hạn độ dài message.
- Giai đoạn đầu live mặc định công khai trong Cộng đồng, chưa cần quyền private/friends.
- Khi sau này bật recording/private playback, recording private phải dùng signed URL hoặc token playback nếu provider hỗ trợ.

## 10. Tác động kỹ thuật tới repo hiện tại

Các file/khu vực sẽ cần thêm hoặc sửa:

- `src/pages/SocialPage.tsx`: thêm UI live section, nút bắt đầu live, card live đang diễn ra.
- `src/store/useSocialStore.ts`: thêm state/actions cho livestream.
- `src/api/livestreamRoutes.ts`: route backend mới.
- `database.ts`: thêm `livestreamDb`, `livestreamMessageDb`.
- `server.ts`: mount route `/api/livestreams`.
- `src/utils/api.ts`: dùng lại client hiện có.
- `docs/TAI_LIEU_CSDL.md`: cập nhật schema sau khi triển khai.

Nếu dùng LiveKit self-host giai đoạn đầu:

- Thêm service backend: `src/services/livestreamProvider.ts`.
- Thêm env provider:

```env
LIVESTREAM_PROVIDER=livekit_self_host
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

Nếu sau này dùng Cloudflare Stream/Mux thì service `livestreamProvider` sẽ đổi implementation, không đổi UI/API chính.

## 11. Kế hoạch triển khai theo giai đoạn

### Giai đoạn 1: Nền tảng dữ liệu và API

- Thêm bảng `livestreams`, `livestream_messages`.
- Thêm backend routes.
- Tích hợp provider tạo live input/session.
- Validate bắt buộc `title` khi tạo phiên live.
- Thêm xử lý trạng thái live. Webhook recording chỉ cần khi bật replay ở giai đoạn sau.
- Nếu chọn phương án recording tạm, thêm endpoint tải file tạm và job xóa file sau khi tải/hết hạn.
- Viết kiểm tra quyền owner/admin.

Kết quả: có thể tạo/kết thúc live qua API.

### Giai đoạn 2: UI Cộng đồng

- Thêm section `Đang live`.
- Thêm modal `Bắt đầu live`.
- Thêm màn xem live.
- Thêm chat realtime.
- Thêm dialog hỏi lưu video khi live kết thúc.
- Thêm xử lý tải file về máy cá nhân/điện thoại và đặt tên file theo user + tên phiên live.
- Thêm trạng thái loading/error/ended.

Kết quả: user có thể live và người khác xem trong app.

### Giai đoạn 3: Recording và replay, để sau

- Lưu recording URL khi provider báo ready.
- Hiển thị replay trong Cộng đồng.
- Thêm chính sách retention 30 ngày.
- Thêm xóa recording owner/admin.

Kết quả: chỉ triển khai khi có nhu cầu xem lại live sau khi tắt. Giai đoạn đầu chưa cần phần này.

### Giai đoạn 4: Admin/moderation

- Admin xem danh sách live đang chạy.
- Admin force stop live.
- Report live.
- Khóa quyền livestream user.
- Xóa chat vi phạm.

Kết quả: vận hành an toàn hơn.

### Giai đoạn 5: Tối ưu và quan sát hệ thống

- Log lỗi provider.
- Theo dõi số live đang chạy, thời lượng, viewer peak.
- Theo dõi chi phí hạ tầng LiveKit/VPS/băng thông.
- Cleanup job xóa recording hết hạn chỉ cần khi bật recording sau này.

## 12. Câu hỏi cần chốt trước khi làm

- Livestream chỉ admin được phát hay mọi user approved đều được phát?
  - Đã chốt: mọi role đều được sử dụng tính năng livestream, miễn là tài khoản đã được duyệt và không bị admin khóa quyền live.

- Có cần lưu bản ghi bắt buộc không, hay user được chọn?
  - Đã điều chỉnh: giai đoạn đầu không lưu replay trên website. Khi live kết thúc, hỏi người đang xem có muốn lưu video về máy cá nhân/điện thoại không. Nếu không lưu hoặc tải xong thì video không được giữ lại trên dữ liệu website.

- Thời hạn lưu recording mặc định có phải 30 ngày không?
  - Chưa triển khai ở giai đoạn đầu. Khi bật recording sau này, thời hạn mặc định đề xuất là 30 ngày.

- Live có cần chế độ riêng tư/bạn bè không?
  - Đã chốt: không cần chế độ riêng tư hoặc bạn bè ở giai đoạn này. Live mặc định là công khai trong Cộng đồng.

- Chấp nhận dùng provider trả phí như Cloudflare Stream/Mux/AWS IVS không?
  - Chưa chốt hoàn toàn. Yêu cầu hiện tại là ưu tiên phương án miễn phí nếu vẫn đáp ứng đủ nhu cầu.
  - Kết luận kỹ thuật: provider livestream miễn phí hoàn toàn và vẫn đáp ứng ổn định cho nhiều user là rất khó. Các dịch vụ managed như Cloudflare Stream, Mux, AWS IVS thường tính phí theo phút phát, phút xem, lưu trữ hoặc credit. Phương án miễn phí thật sự thường là tự host bằng open-source như LiveKit, nhưng vẫn tốn VPS/băng thông/vận hành.

- Có cần chat realtime lưu lại cùng replay không?
  - Đã chốt: có cần chat realtime khi đang live. Vì giai đoạn đầu chưa cần recording/replay, chat chỉ cần phục vụ phiên live hiện tại; việc lưu chat cùng replay để ở giai đoạn sau.

- Người phát có bắt buộc đặt tên phiên live trước không?
  - Đã chốt: bắt buộc đặt tên phiên live. Không có tên thì không được bắt đầu live.

## 13. Đề xuất quyết định ban đầu

Để triển khai nhanh và ít rủi ro:

- Provider: ưu tiên khảo sát phương án miễn phí/tự host trước. Nếu cần ổn định production và ít vận hành, dùng Cloudflare Stream Live hoặc Mux.
- Recording: chưa bật ở giai đoạn đầu.
- Thời hạn lưu recording: chưa áp dụng ở giai đoạn đầu; khi bật recording sau này thì dùng mặc định 30 ngày.
- Metadata: lưu trong Supabase/Postgres để quản lý phiên live, có thể xóa theo chính sách sau.
- Video recording: không lưu làm replay trên website. Nếu cần tải file sau live thì ưu tiên ghi cục bộ bằng trình duyệt; nếu bắt buộc tải toàn bộ buổi live thì dùng recording tạm và xóa vĩnh viễn sau khi tải/hết hạn.
- Chat: giai đoạn đầu ưu tiên chat realtime trong phiên live; lưu lịch sử chat chỉ làm khi bật replay/recording.
- Quyền phát live: mọi role đã được duyệt đều có thể phát live, nhưng admin có thể khóa quyền live từng user.

## 14. Báo cáo chốt yêu cầu sau trao đổi

Các quyết định đã chốt:

- Mọi role đều được sử dụng livestream.
- Tài khoản vẫn phải ở trạng thái được duyệt.
- Người phát bắt buộc đặt tên phiên live trước khi bắt đầu.
- Giai đoạn đầu không lưu replay trên website sau khi user tắt live.
- Khi live kết thúc, hỏi người đang xem có muốn lưu video về máy không.
- Nếu chọn lưu, tải file về máy cá nhân/điện thoại với tên file theo user phát live + tên phiên live.
- Nếu không lưu hoặc sau khi tải xong, video phải bị xóa khỏi dữ liệu website/provider nếu có file tạm.
- Recording/retention 30 ngày để ở giai đoạn sau, chưa cần storage ngay.
- Không cần chế độ riêng tư/bạn bè.
- Cần chat realtime.
- Chat realtime cần có trong lúc live; lưu chat cùng replay để ở giai đoạn sau khi bật recording.
- Ưu tiên tìm phương án miễn phí trước khi chọn provider trả phí.

Đánh giá provider miễn phí:

- Không có lựa chọn managed livestream miễn phí hoàn toàn mà vẫn phù hợp production lâu dài cho nhu cầu nhiều user và nhiều người xem. Vì giai đoạn đầu chưa cần recording, chi phí/storage có thể giảm đáng kể.
- Mux có gói Free nhưng theo trang pricing của Mux, Free chủ yếu cho on-demand video và có giới hạn; live video nằm ở nhóm pay-as-you-go/credit.
- AWS IVS là pay-as-you-go; AWS có credit/free tier cho tài khoản mới, nhưng không phải miễn phí lâu dài.
- LiveKit có bản open-source self-host, miễn phí license, phù hợp nếu muốn tránh phí provider theo phút. Vì giai đoạn đầu chưa cần recording, chưa cần chuẩn bị storage video 30 ngày; vẫn cần server/VPS, TURN, băng thông upload/download và monitoring.

Khuyến nghị theo yêu cầu hiện tại:

- Nếu muốn miễn phí tối đa: thử nghiệm LiveKit self-host trước, chỉ làm live realtime và chat realtime.
- Nếu sau này muốn ổn định, ít vận hành, có recording và CDN tốt: dùng Cloudflare Stream Live hoặc Mux dù có phí.
- Với hệ thống hiện tại, nên thiết kế abstraction `livestreamProvider` để sau này có thể đổi giữa `livekit_self_host`, `cloudflare_stream`, `mux` mà không phải viết lại UI/API.
