# Kết quả kiểm chứng — 09/10/2026

- API: 6 kiểm thử integration offline đạt, gồm kiểm tra dữ liệu sai, giới hạn body, 4 ID giọng, dữ liệu tải đúng từng byte, timeout, lỗi upstream và readiness. Đây là kiểm thử với upstream thay thế, không tự chứng minh tổng hợp giọng thật.
- Microsoft thực tế: `edge-tts==7.2.8` đã trả MP3 cho cả Sonia, Ryan, Libby và Thomas với cùng câu kiểm tra. Bộ giải mã ffprobe xác nhận MP3 24 kHz / 48 kbps; thời lượng lần lượt 5,376 / 5,904 / 6,624 / 5,832 giây. Chứng chỉ tin cậy của môi trường kiểm thử được bổ sung chỉ trong script kiểm thử; không tắt TLS và không sửa mã production để bỏ xác minh chứng chỉ.
- Giao diện: Chromium headless, viewport rộng 1.280 px và 390 px. Dùng MP3 thật đã tạo từ Microsoft làm fixture phản hồi API để kiểm tra trình phát và download; đây không phải kiểm tra trực tiếp thiết bị iPhone/Android.
- Giao diện đã đạt: chọn giọng/thiết lập gửi lên, tự chia 3 đoạn, tải đúng byte, thời lượng 5,376 giây và 16,128 giây cho file ghép, phát/tạm dừng, tua, ±10 giây, phát lại, lặp, âm lượng, tốc độ nghe, nhập TXT, lưu bản nháp, hủy và API 404. Không có lỗi JavaScript hoặc tràn ngang tại hai kích thước đã kiểm tra. CSP của cấu hình Vercel được áp dụng trong kiểm thử.
- JavaScript/Python: kiểm tra cú pháp đạt. `vercel.json` được đối chiếu schema chính thức của Vercel.
- **Chưa triển khai lên tài khoản Vercel của người dùng.** Kết nối Microsoft từ IP Vercel, thời gian cold start và tải trên thiết bị thật cần kiểm tra sau khi Deploy. Kết quả ở môi trường này không bảo đảm dịch vụ Microsoft sẽ luôn khả dụng.

Các ảnh trong `docs/` là ảnh kiểm thử giao diện với fixture âm thanh, dùng để xem bố cục.
