# Manim Math Video Web — V1.5.0 Stable

GitHub Pages frontend for Manim Math Video App V1.5.0.

## Kiến trúc

GitHub Pages
→ HTTPS existing ngrok URL
→ `/web-api`
→ AssistantLink proxy
→ Local Secure Web Gateway `127.0.0.1:8791`
→ Desktop App command queue
→ Solver / QA / Preview / Human Review / Full HD / Final

GPT Actions vẫn dùng:
`https://<ngrok-domain>/v1/...`

Web UI dùng:
`https://<ngrok-domain>/web-api/api/v1/...`

Không đổi GPT Action schema.

## Security

- Không hard-code API key/Bearer token trong GitHub Pages.
- Pairing Code 6 chữ số, mặc định có hiệu lực 10 phút.
- Session token mặc định 12 giờ và được lưu bằng `sessionStorage`.
- Session bị ràng buộc với exact browser Origin.
- CORS dùng exact allowlist.
- Upload kiểm tra extension, kích thước và magic signature.
- Preview/Final dùng media ticket ngắn hạn.

## Deploy

Upload toàn bộ thư mục này lên root GitHub repository.

GitHub:
Settings → Pages → Source → GitHub Actions.

Sau khi site online:

1. Trong Desktop App mở `Web Integration`.
2. Start Web Gateway.
3. Bảo đảm Local Bridge + ngrok đang chạy.
4. Chạy `CONFIGURE_GITHUB_ORIGIN_V1_5_0.bat` một lần với GitHub username.
5. Restart Web Gateway.
6. Copy `Public Web API URL`.
7. Trong website → Settings:
   - API Base URL = Public Web API URL.
   - Pairing Code = 6 chữ số từ Desktop App.
8. Pair.

## Lưu ý Custom GPT

Web UI có thể upload đề, xem trạng thái, duyệt Preview, Stop/Resume và bắt đầu Full HD sau Approval.

Custom GPT vẫn cần người dùng gửi Solver Prompt trong ChatGPT vì GitHub Pages không và không nên chứa GPT/API credential.
