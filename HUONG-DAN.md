# Bản dựng lại MAKINO

Nguồn: https://github.com/lekhanhtrinh08042026-blip/QuanLyTool

Ứng dụng giữ nguyên giao diện, hình ảnh, chức năng và dữ liệu mẫu có trong mã nguồn gốc. Dữ liệu kho thực tế, tài khoản và lịch sử trên hệ thống gốc không có trong GitHub nên không được sao chép. Kho mới bắt đầu trống.

## Mở trên máy này

1. Nhấp đúp **MO-UNG-DUNG.cmd**. Giữ cửa sổ này mở khi dùng ứng dụng.
2. Mở http://127.0.0.1:8787 trong trình duyệt.
3. Chọn **Admin**. Mật khẩu riêng cho bản trên máy nằm trong **.sites-runtime/local/DANG-NHAP.txt**; tệp này được tạo ở lần mở đầu tiên.
4. Dùng **Thêm vật tư** để nhập kho. Trong **Cá nhân → Quản lý nhân viên**, tạo mã nhân viên, họ tên, mật khẩu ban đầu và email tùy chọn.
5. Đăng xuất rồi chọn **User**, nhập mã nhân viên và mật khẩu ban đầu, đổi mật khẩu lần đầu rồi thử mượn–trả.

Hỗ trợ kho, ảnh vật tư, phân loại, điều chỉnh số lượng, mượn–trả từng phần, tình trạng cần sửa, gia hạn, nhật ký, quyền truy cập và xuất Excel như bản gốc. Email tự động cần cấu hình Gmail riêng, xem GMAIL-SETUP.md. Bản trên máy không gửi email thật.

## Dữ liệu riêng

- Dữ liệu kho và ảnh: **.sites-runtime/local/state/**. Dừng ứng dụng trước khi sao chép cả thư mục **.sites-runtime/local/** để sao lưu.
- Đăng nhập và cấu hình riêng: **.sites-runtime/local/**. Không đưa thư mục này lên GitHub và không xóa nếu cần giữ dữ liệu.
- Các lần mở tiếp theo giữ lại dữ liệu đã nhập.
- Địa chỉ 127.0.0.1 chỉ mở được trên máy đang chạy ứng dụng. Để dùng chung trên điện thoại hoặc máy khác cần triển khai bản online.

## Cài trên máy khác

Cài Node.js >=22.13 và các thư viện theo package-lock.json bằng `npm ci`, sau đó chạy `npm run local`. Lần đầu sẽ tự build, tạo cơ sở dữ liệu và mật khẩu riêng. Muốn build lại sau khi sửa mã: `npm run local -- --build`.

## Đưa lên mạng

Xem README.md để tạo Cloudflare D1, R2 và bí mật đăng nhập riêng. wrangler.json của bản sao đã bỏ địa chỉ dịch vụ Gmail và ID database của kho gốc. Phải điền database_id của tài khoản mới trước khi deploy; không dùng thông tin kết nối của kho gốc.

Giữ cơ chế User nhập email không OTP như bản gốc. Bản này phù hợp thử nghiệm hoặc nhóm nhỏ tin cậy; trước khi đưa vào vận hành cần xác minh quyền đăng nhập, sao lưu và thử khôi phục.

Admin giữ mật khẩu riêng như trước và hiển thị tên **Admin**. Nhân viên đổi mật khẩu tại **Cá nhân**; quên mật khẩu thì liên hệ Admin. Khóa tài khoản không xóa lịch sử.
