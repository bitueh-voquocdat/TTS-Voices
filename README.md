# UK Voice Studio — triển khai trên Vercel

Web app chuyển văn bản tiếng Anh thành giọng đọc English (UK), nghe và tải một file MP3 ngay trong trình duyệt. Máy tính và điện thoại dùng cùng đường link sau khi triển khai.

## 1. Xuất bản bằng GitHub + Vercel

1. Giải nén `UK-Voice-Vercel.zip`.
2. Tạo một repository trên GitHub. Chọn **Add file → Upload files** rồi tải lên **nội dung bên trong thư mục `UK-Voice-Vercel`**, giữ nguyên các thư mục con. Ở gốc repository phải có `vercel.json`, `requirements.txt`, `api/tts.py` và `public/index.html`. Không chỉ tải riêng HTML; không chọn `public` làm gốc dự án.
3. Mở [Vercel](https://vercel.com/new), đăng nhập và chọn **Import** repository vừa tạo.
4. Kiểm tra cấu hình sau:

| Mục | Giá trị |
| --- | --- |
| Framework Preset | **Other** |
| Root Directory | Thư mục chứa `vercel.json`; thường để mặc định `./` |
| Build Command | Trống, dự án không có bước build frontend |
| Output Directory | `public` |
| Install Command | Mặc định, không đặt `npm install` |
| Environment Variables | Không cần API key hoặc biến môi trường |

`vercel.json` đã khai báo framework, thư mục đầu ra và thời gian API. Vercel cài dependency Python từ `requirements.txt` cho function trong `api`. Nếu bạn tải cả thư mục bao ngoài lên GitHub, đặt Root Directory là `UK-Voice-Vercel`.

5. Nhấn **Deploy**. Khi hoàn tất, mở đường link production do Vercel cấp. Nhập một câu ngắn, chọn Sonia → **Tạo giọng đọc** → nhấn **▶** hoặc **Tải MP3**.

Bạn không cần chạy BAT, mở cổng máy tính hoặc cài Python trên điện thoại. Hai thiết bị không cần cùng mạng Wi-Fi. Việc tổng hợp giọng đọc cần Internet.

## 2. Cách dùng

- Chọn **Sonia / Ryan / Libby / Thomas**. Sonia và Libby là nữ; Ryan và Thomas là nam.
- Nhập/dán văn bản hoặc **Nhập TXT** (UTF-8), tối đa **20.000 ký tự**.
- Tốc độ đọc: **−50% đến +50%**. Cao độ: **−50 đến +50 Hz**. Đây là thiết lập được ghi vào MP3 khi tạo.
- Nhấn **Tạo giọng đọc**. Văn bản dài tự chia theo câu/đoạn, gửi lần lượt rồi ghép các khung MP3 thành một file; có thể có ngắt giọng ngắn ở ranh giới đoạn.
- Dùng **phát/tạm dừng, phát lại từ đầu, lùi/tiến 10 giây, kéo thanh tua, phát lặp, âm lượng, tốc độ nghe**.
- **Tải MP3** tải file đã tạo xuống máy. Điều chỉnh tốc độ nghe và âm lượng không thay đổi file tải về.
- Nhấn **Hủy** để dừng yêu cầu trên trình duyệt. Function đang xử lý có thể tiếp tục đến khi hoàn thành hoặc hết thời gian; các đoạn tiếp theo không được gửi.
- Nếu một đoạn lỗi, app không đưa file mới thiếu đoạn vào mục tải. File đã tạo thành công trước đó vẫn giữ để nghe và tải.

Trên Android: mở link bằng Chrome hoặc Edge, nhấn **Tải MP3**, xem trong Downloads/Tệp đã tải xuống.

Trên iPhone/iPad: mở bằng Safari. Tùy phiên bản iOS, file được tải vào Files/Tệp hoặc mở ở trình phát; nếu mở trình phát, dùng **Chia sẻ → Lưu vào Tệp**. App không tự phát sau khi tạo để tránh chặn autoplay trên điện thoại. Một số thiết bị iOS chỉ cho điều chỉnh âm lượng bằng nút âm lượng của thiết bị.

Văn bản và thiết lập gần nhất được lưu cục bộ trong trình duyệt đó. App không tạo tài khoản hay đồng bộ bản nháp giữa thiết bị. MP3 nằm tạm trong bộ nhớ trang; hãy tải trước khi đóng hoặc tải lại trang. Văn bản được chuyển qua API Vercel đến dịch vụ Microsoft để tổng hợp; app không chủ động ghi văn bản/MP3 vào cơ sở dữ liệu hoặc logs.

## 3. Miễn phí và giới hạn thực tế

Ứng dụng không yêu cầu API key Microsoft và không thu phí. Thư viện `edge-tts` sử dụng dịch vụ đọc trực tuyến của Edge, không phải sản phẩm Azure Speech có SLA cho dự án này. Microsoft có thể đổi giao thức, chặn kết nối hoặc giới hạn truy cập; khi đó cần cập nhật dependency hoặc chờ dịch vụ phục hồi.

Vercel Hobby có mức sử dụng miễn phí trong hạn mức và điều kiện của gói, không có nghĩa là hosting miễn phí không giới hạn. Bản này phù hợp với nhu cầu học cá nhân. Nếu dịch vụ bị lỗi từ IP của Vercel, giao diện sẽ báo lỗi thật; app không đổi sang giọng máy hoặc giả lập MP3.

Mỗi request frontend tối đa 1.000 ký tự; API chấp nhận tối đa 1.200 ký tự, giới hạn âm thanh 3,8 MB và xử lý 50 giây trong function cấu hình 60 giây. Cách chia này giảm nguy cơ vượt giới hạn request/response hoặc thời gian chạy. Có một lần thử lại cho phản hồi 502/503/504.

## 4. Nếu gặp lỗi sau khi triển khai

| Triệu chứng | Kiểm tra |
| --- | --- |
| Trang 404 | Output Directory là `public`; `public/index.html` tồn tại trong Root Directory đã chọn. |
| API 404 | Có tải `api/tts.py` và `requirements.txt` lên cùng gốc `vercel.json` chưa? Không chọn preset chỉ xuất bản static. |
| Build báo không tìm thấy function | Root Directory phải chứa `api/tts.py`. Kiểm tra tên file/thư mục chữ thường. |
| API 502/503 | Xem Logs của Vercel: `TTS connection failed` hoặc `TTS failed`. Microsoft có thể lỗi hoặc từ chối kết nối. Thử câu ngắn và chờ rồi thử lại. |
| API 504 | Kiểm tra cấu hình `maxDuration: 60`, thử văn bản ngắn hơn và tốc độ đọc mặc định. |
| Không có tiếng | Nhấn phát sau khi tạo; kiểm tra âm lượng thiết bị. Có thể tải MP3 để mở bằng trình phát khác. |
| Mở HTML trực tiếp không tạo được | Hãy dùng đường link Vercel; HTML gọi API trên cùng domain. |

Mở `https://<domain-của-bạn>/api/tts` để kiểm tra function đã khởi động. JSON `ok: true` chỉ xác nhận API/dependency sẵn sàng, **không** xác nhận Microsoft đang trả giọng đọc. Muốn kiểm tra toàn bộ, tạo âm thanh từ giao diện và tải MP3.

Nếu Microsoft thay đổi giao thức, cập nhật phiên bản `edge-tts` trong `requirements.txt` sang bản mới đã kiểm chứng và Redeploy. Không tắt xác minh chứng chỉ TLS để xử lý lỗi kết nối.

## 5. Dành cho người phát triển

| Thành phần | Tệp |
| --- | --- |
| Giao diện | `public/index.html`, `public/style.css` |
| Tạo đoạn, phát, tải và lưu bản nháp | `public/app.js` |
| API trả MP3 | `api/tts.py` |
| Dependency | `requirements.txt` |
| Triển khai | `vercel.json`, `.python-version` |
| Kiểm thử API | `tests/test_api.py` |

Chạy cục bộ nếu cần sửa mã (tùy chọn, không phải cách sử dụng thông thường):

```sh
python -m pip install -r requirements.txt
python dev.py
```

Mở `http://127.0.0.1:8000`. Kiểm thử offline:

```sh
python -m unittest discover -s tests -v
```

## 6. Nguồn kỹ thuật

- [Vercel: Python functions trong thư mục api](https://vercel.com/docs/functions/runtimes/python/api-directory)
- [Vercel: Python runtime và dependency](https://vercel.com/docs/functions/runtimes/python)
- [Vercel: cấu hình vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
- [Vercel: giới hạn function và mức sử dụng](https://vercel.com/docs/functions/limitations)
- [Mã nguồn và hướng dẫn edge-tts](https://github.com/rany2/edge-tts)
