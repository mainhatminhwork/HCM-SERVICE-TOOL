# HCM SERVICE TOOL · Quản lý kho vật tư

Ứng dụng web tiếng Việt để quản lý dụng cụ, thiết bị và việc mượn–trả nội bộ, tối ưu cho điện thoại. Bản này dựng lại từ [QuanLyTool](https://github.com/lekhanhtrinh08042026-blip/QuanLyTool), giữ giao diện MAKINO và chức năng của bản gốc.

## Chức năng

- Quản lý vật tư, phân loại, vị trí, số lượng, tình trạng và ảnh.
- Mượn trực tiếp, trả toàn bộ hoặc một phần; theo dõi số lượng cần sửa.
- Theo dõi hạn trả, yêu cầu và duyệt gia hạn, lịch sử và nhật ký kho.
- Hai tab User/Admin: User dùng mã nhân viên và mật khẩu; Admin giữ mật khẩu quản trị riêng.
- Xuất tồn kho và lịch sử email ra Excel.
- Có mã gửi Gmail và nhắc quá hạn, cần cấu hình dịch vụ riêng.

## Chạy trên máy

Yêu cầu Node.js >=22.13 và npm đi kèm Node.js:

```sh
npm ci
npm run local
```

Trên Windows, sau khi cài thư viện có thể nhấp đúp **MO-UNG-DUNG.cmd**.

Mở **http://127.0.0.1:8787**, chọn **Admin**. Mật khẩu được tạo riêng ở lần chạy đầu và lưu trong **.sites-runtime/local/DANG-NHAP.txt**. Sau khi sửa mã, dùng `npm run local -- --build`.

Kho bắt đầu trống. Thêm vật tư rồi vào **Cá nhân → Quản lý nhân viên** để tạo mã nhân viên, họ tên, mật khẩu ban đầu và email nhận thông báo (tùy chọn). Dữ liệu và ảnh nằm trong **.sites-runtime/local/state/**, được giữ khi khởi động lại. Dừng ứng dụng trước khi sao lưu cả thư mục **.sites-runtime/local/**. Không đưa thư mục này lên GitHub.

Xem [hướng dẫn sử dụng](HUONG-DAN.md).

## Triển khai để dùng chung

Cần Cloudflare Workers, D1 và R2. GitHub lưu mã nguồn; GitHub Pages không chạy đầy đủ phần máy chủ của ứng dụng này.

1. Kết nối kho này với Cloudflare Workers: nhánh `main`, build `npm run build`, deploy `npm run deploy`.
2. Tạo database D1 mới. Điền tên và `database_id` thật vào binding `DB` trong **wrangler.json**. ID toàn số 0 là giá trị giữ chỗ.
3. Áp dụng các migration trong **drizzle/** theo thứ tự `0000`, `0001`, `0002` cho database mới. Bảng nhân viên cũng được khởi tạo tự động, không xóa hay nạp lại dữ liệu kho.
4. Tạo bucket R2 riêng, điền tên vào binding `BUCKET`.
5. Chạy `npm run auth:setup` để tạo mật khẩu Admin và hai giá trị cấu hình. Lưu **SESSION_SECRET** và **ADMIN_PASSWORD_HASH** dưới dạng Secret runtime trên Cloudflare, sau đó deploy lại. Không đưa chúng lên GitHub.
6. Nếu cần email, cấu hình Apps Script và **MAIL_WEBHOOK_URL**, **MAIL_SECRET** riêng theo [GMAIL-SETUP.md](GMAIL-SETUP.md). Đổi đường dẫn mở ứng dụng trong **lib/mail.ts** sang địa chỉ bản triển khai của bạn trước khi bật email.

Bản sao không dùng ID database, mật khẩu hay kết nối Gmail của kho gốc. GitHub không chứa dữ liệu kho thực tế của hệ thống gốc.

User phải được Admin tạo tài khoản trước và bắt buộc đổi mật khẩu khi đăng nhập lần đầu hoặc sau khi Admin đặt lại. Khóa tài khoản/đặt lại mật khẩu sẽ thu hồi phiên cũ; mở khóa không khôi phục các phiên đã bị thu hồi. Nhân viên có thể tự đổi mật khẩu ở Cá nhân. Mật khẩu được lưu bằng PBKDF2 với salt riêng; API không trả mật khẩu hoặc hash. Trước khi vận hành chính thức cần sao lưu và thử khôi phục D1/R2. Bản này dành cho nhóm nhỏ; dữ liệu kho đang lưu theo snapshot có giới hạn dung lượng.

## Kiểm tra

```sh
npm test
npx tsc --noEmit
npm run build
node tests/integration.mjs
```

Kiểm tra tích hợp dùng database riêng trên máy, không thay đổi dữ liệu online.

## Nguồn

Mã nguồn và ảnh gốc: **lekhanhtrinh08042026-blip/QuanLyTool**, commit **d5e3ddc054df206593a044265524dd3292096006**. Bản sao bổ sung cách chạy trên máy, lưu dữ liệu riêng, hướng dẫn và cập nhật kiểm tra đăng nhập có họ tên.

## Chuyển tài khoản Gmail cũ

Sau khi cập nhật, đăng nhập User chỉ chấp nhận mã nhân viên và mật khẩu; các phiên User theo Gmail cũ không còn hiệu lực. Mật khẩu Admin được giữ nguyên và tài khoản hiển thị là **Admin**.

Vào **Cá nhân → Quản lý nhân viên → Tài khoản Gmail cũ**, chọn **Cấp mã nhân viên** để gắn tài khoản mới với lịch sử cũ. Không tạo tài khoản độc lập nếu cần giữ liên kết lịch sử. Email nhận thông báo có thể để trống hoặc đổi sau; đổi mã/email không thay đổi quyền sở hữu đơn đã mượn. Không có thao tác xóa nhân viên; dùng khóa để giữ lịch sử.
