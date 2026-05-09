# Kế hoạch phát triển chức năng livestream trong Cộng đồng

## 1. Mục tiêu

Thêm chức năng livestream vào module Cộng đồng để user có thể gửi yêu cầu phát live, admin duyệt và vào phòng live, hai phía trao đổi video/audio realtime, kèm chat và điều khiển kết thúc live. Giai đoạn đầu chưa cần lưu replay trên website.

Hiện tại cách triển khai thực tế là P2P WebRTC trực tiếp giữa user và admin, có lớp signaling bằng API nội bộ để đồng bộ offer/answer/ICE candidates. Cách này giữ được phạm vi nhỏ, dễ test và phù hợp với MVP hơn so với việc đưa thêm provider livestream riêng ngay từ đầu.

## 2. Phạm vi đề xuất

Giai đoạn đầu đang hỗ trợ:

- User đã đăng nhập có thể gửi yêu cầu live.
- Admin thấy danh sách yêu cầu chờ duyệt và vào live từ đó.
- User và admin vào cùng một room sau khi duyệt.
- Người phát bắt buộc phải đặt tên phiên live trước khi gửi yêu cầu.
- Hai phía có video/audio realtime và chat trong phòng live.
- Có nút xác nhận trước khi kết thúc live.

Chưa làm trong giai đoạn hiện tại:

- Livestream nhiều khách mời.
- Phát màn hình.
- Donation/paid live.
- Replay công khai trên website.
- Lưu video dài hạn hoặc recording tạm để tải xuống.

## 3. Hướng kiến trúc

### Triển khai hiện tại

Livestream đang chạy theo mô hình P2P WebRTC trực tiếp giữa user và admin. API backend chỉ làm signaling, phân quyền, đồng bộ trạng thái và chat.

Các thành phần chính:

- Frontend room UI và video element trong `src/components/livestream`.
- Hook `useP2PLivestream` điều phối open camera, create offer/answer, poll candidates, heartbeat và reconnect.
- Express backend `src/api/livestreamRoutes.ts` cho môi trường local.
- Worker backend `src/worker/routes/livestream.ts` cho môi trường Cloudflare/Supabase.

### Luồng tổng thể

1. User nhập tên phiên live và gửi yêu cầu.
2. Frontend gọi `POST /api/livestreams`.
3. Backend tạo session với trạng thái `pending`.
4. Admin thấy session trong danh sách chờ duyệt và bấm duyệt.
5. Backend chuyển session sang `live` và gán admin vào phiên.
6. User tạo offer, admin trả answer, hai phía trao đổi ICE candidates.
7. Cả hai phía mở camera/microphone và hiển thị status kết nối.
8. Chat realtime chạy cùng phiên live.
9. Khi kết thúc, admin hoặc user có quyền bấm end live.
10. Backend chuyển session sang `ended`, frontend dọn room và quay về trạng thái idle.

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

Trong lúc live, video không lưu trong server Node hiện tại. Luồng media đi trực tiếp giữa user và admin qua WebRTC, còn backend chỉ làm signaling và đồng bộ trạng thái.

### Bản ghi sau live lưu ở đâu?

Giai đoạn hiện tại không lưu replay trên website. Không có `MediaRecorder` hay recording tạm ở server.

Nếu sau này cần xuất video tải xuống hoặc replay, mới cân nhắc một trong hai hướng:

- Ghi cục bộ trên trình duyệt bằng `MediaRecorder`.
- Recording tạm ở provider/server rồi xóa sau khi tải xong.

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

Lý do chưa làm storage recording ngay: bản P2P hiện tại ưu tiên signaling và trải nghiệm realtime trước; ghi/replay sẽ làm tăng độ phức tạp và chưa cần cho MVP.

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

## 6. API đang dùng

### Livestream

- `POST /api/livestreams`
  - Tạo live session ở trạng thái `pending`.
  - Chỉ user đã đăng nhập.
  - Bắt buộc có `title`.

- `GET /api/livestreams/live`
  - Danh sách session đang chờ duyệt hoặc đang live, theo quyền của user.

- `GET /api/livestreams/:id`
  - Chi tiết live.
  - Nếu requester là owner/admin thì trả thêm thông tin phiên.

- `POST /api/livestreams/:id/approve`
  - Admin duyệt và vào phiên live.

- `POST /api/livestreams/:id/heartbeat`
  - Cập nhật trạng thái còn online của host/admin.

- `POST /api/livestreams/:id/reconnect`
  - Yêu cầu đàm phán lại khi một phía vào lại phòng.

- `POST /api/livestreams/:id/offer`
  - Host gửi offer WebRTC.

- `GET /api/livestreams/:id/offer`
  - Admin lấy offer để trả lời.

- `POST /api/livestreams/:id/answer`
  - Admin gửi answer WebRTC.

- `GET /api/livestreams/:id/answer`
  - Host lấy answer WebRTC.

- `POST /api/livestreams/:id/end`
  - Kết thúc live.
  - Chỉ user trong phòng live hoặc admin.

- `GET /api/livestreams/:id/download`
  - Chỉ dùng nếu có recording tạm phía provider/server.
  - Trả link tải tạm cho user đang có quyền xem live.
  - Sau khi tải hoặc hết hạn, file tạm phải bị xóa khỏi dữ liệu website/provider.

- `DELETE /api/livestreams/:id`
  - Xóa metadata. Yêu cầu provider xóa recording chỉ cần khi giai đoạn sau bật recording.

### Chat

- `GET /api/livestreams/:id/messages`
- `POST /api/livestreams/:id/messages`

Realtime chat hiện chạy bằng polling API trong hook client.

### Provider callback

Chưa áp dụng ở giai đoạn hiện tại.

## 7. UI/UX trong Cộng đồng

### Tab Cộng đồng

Thêm một dải/live section phía trên feed:

- Danh sách yêu cầu live chờ duyệt cho admin.
- Danh sách phiên đang live cho user/admin.
- Card live gồm avatar, tên user, tiêu đề, trạng thái và nút duyệt/kết thúc tương ứng.

### Trạng thái hiện tại

- Phòng live P2P đã hoạt động trong UI.
- Test Playwright real-UX đã có và đang pass.
- Ghi replay/lưu video về máy chưa triển khai trong bản hiện tại.

### Màn tạo live

Form hiện tại tối thiểu:

- Tiêu đề live.
- Tiêu đề live là bắt buộc. Nếu bỏ trống thì disable nút gửi yêu cầu.
- Chưa có mô tả, quyền riêng tư hay tùy chọn lưu bản ghi.

### Màn phòng live

- Hai khung video: remote và local.
- Trạng thái kết nối WebRTC.
- Chat realtime.
- Nút đổi camera trước/sau trên mobile.
- Nút xác nhận trước khi kết thúc live.

### Màn xem live

- Hiện không có replay download dialog.
- Màn live chính là room dùng chung cho host và admin.
- Chat và trạng thái kết nối hiển thị ngay trong room.

### Tên file tải xuống

Phần đặt tên file tải xuống chỉ áp dụng nếu sau này bật recording hoặc MediaRecorder:

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

- `src/components/livestream/*`: room UI, modal xác nhận, session list, hook và API client.
- `src/api/livestreamRoutes.ts`: route backend local.
- `src/worker/routes/livestream.ts`: route backend cho Worker/Supabase.
- `src/worker/index.ts`: mount route `/api/livestreams`.
- `server.ts`: giữ rate limit phù hợp khi test.
- `tests/livestream.spec.ts`: kiểm tra luồng real-UX.

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

## 15. Kế hoạch MVP mới: WebRTC P2P 1 người phát - 1 người xem

Do yêu cầu hiện tại chỉ cần 1 người phát và 1 người xem, giai đoạn test thực tế sẽ chưa dùng LiveKit.

### Nguyên tắc không phá logic hiện có

- Không sửa luồng đăng bài, bình luận, tài liệu, xét duyệt tài liệu.
- Không thêm bảng database ở giai đoạn MVP P2P.
- Không thêm dependency WebSocket nếu chưa cần.
- Tạo route riêng `/api/livestreams` để signaling.
- Tạo component UI riêng trong Cộng đồng, chỉ nhúng vào `SocialPage`.
- Signaling lưu trong bộ nhớ server, tự mất khi restart server.
- Video không đi qua server website và không lưu vào database.

### Backend signaling

Thêm file `src/api/livestreamRoutes.ts`.

API tối thiểu:

- `POST /api/livestreams`: tạo phiên live, bắt buộc `title`.
- `GET /api/livestreams/live`: lấy phiên live đang mở.
- `GET /api/livestreams/:id`: lấy trạng thái phiên live.
- `POST /api/livestreams/:id/offer`: host gửi WebRTC offer.
- `GET /api/livestreams/:id/offer`: viewer lấy offer.
- `POST /api/livestreams/:id/answer`: viewer gửi answer.
- `GET /api/livestreams/:id/answer`: host lấy answer.
- `POST /api/livestreams/:id/candidates`: host/viewer gửi ICE candidate.
- `GET /api/livestreams/:id/candidates`: host/viewer lấy candidate phía còn lại.
- `POST /api/livestreams/:id/end`: host/admin kết thúc live.

Giới hạn MVP:

- Mỗi phiên chỉ có 1 viewer.
- Mỗi user chỉ có 1 phiên live đang chạy.
- Dùng STUN public để test.
- Nếu mạng NAT khó thì kết nối có thể thất bại; khi đó mới cần TURN/LiveKit.

### Frontend

Thêm component `src/components/livestream/P2PLivestreamPanel.tsx`.

Chức năng:

- Hiển thị danh sách `Đang live` trong tab Cộng đồng.
- Nút `Bắt đầu live`.
- Bắt buộc nhập tên phiên live.
- Host xem preview camera/mic và phát live.
- Viewer bấm `Xem live` để kết nối.
- Khi live kết thúc, hiện dialog hỏi có muốn lưu video về máy không.
- Nếu chọn `Lưu`, tải file `.webm` từ dữ liệu `MediaRecorder` cục bộ của trình duyệt.
- Tên file: `{ten-user-phat-live}_{ten-phien-live}_{yyyyMMdd-HHmm}.webm`.

### Test thực tế

- Chạy `npm run lint`.
- Chạy `npm run build`.
- Chạy dev server.
- Test 2 phiên trình duyệt:
  - Admin/user A đăng nhập và bắt đầu live.
  - User B đăng nhập, thấy phiên live và bấm xem.
  - Kiểm tra video remote hiển thị.
  - Kết thúc live.
  - Kiểm tra dialog lưu video và tên file tải xuống.
