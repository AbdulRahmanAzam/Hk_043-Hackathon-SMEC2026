# QR Connect Platform

A simple app to instantly connect with friends by scanning and sharing QR codes. Includes a privacy-aware QR generator, camera-based scanner, connection list with search/remove/export, local persistence, and online/offline status.

## Quick Start

- `npm install`
- `npm start`
- Open `https://localhost:3000` (HTTPS is enabled for camera access).

## Environment Setup

Create `.env` with production-safe defaults:

```
REACT_APP_BASE_URL=
REACT_APP_ENCRYPTION_KEY=
```

Create `.env.development.local` for local dev:

```
HOST=0.0.0.0
HTTPS=true
WDS_SOCKET_PORT=3000
REACT_APP_BASE_URL=https://localhost:3000
REACT_APP_ENCRYPTION_KEY=dev-secret-key-please-change
```

- `HOST=0.0.0.0`: exposes dev server on your LAN for mobile testing.
- `HTTPS=true`: required for mobile camera access.
- `WDS_SOCKET_PORT=3000`: fixes hot reload when accessed via IP.
- `REACT_APP_ENCRYPTION_KEY`: set any string to enable AES encryption of QR payloads.

## Mobile Testing over LAN

You have two reliable options:

- Secure Tunnel (recommended):
  - Cloudflare Tunnel: `cloudflared tunnel --url https://localhost:3000` → use the generated `https://*.trycloudflare.com` URL on mobile.
  - Ngrok: `ngrok http https://localhost:3000` → use the `https://` URL on mobile.
  - Benefits: Trusted HTTPS, no cert installation, works anywhere.

- Locally Trusted Certificate (advanced):
  - Install `mkcert` and create a cert for your LAN IP, e.g. `mkcert 192.168.x.x`.
  - Trust the mkcert root CA on your phone (open `rootCA.pem` and follow device steps).
  - Configure CRA to use the cert: place `server.key` and `server.crt` under a folder and set `SSL_CRT_FILE` and `SSL_KEY_FILE` envs (or use `react-app-rewired` with `devServer` config).
  - Use `https://<LAN-IP>:3000` on mobile once trusted.

If you see a “connection not secure” error on mobile, the certificate is untrusted. Use the secure tunnel approach or fully trust the local CA on the device.

## Features

- Privacy-aware QR generator: toggles to share/hide name and username.
- QR scanner: `react-zxing` camera, cancel button, and error toasts.
- Connection list: search, remove, CSV export, details modal.
- Persistence: `localStorage` via `utils/storage`.
- Online/offline indicator with toast notifications.

## Testing

- Unit tests for QR helpers: `npm test -- --watch=false`.
- App test checks for title and network label.

## Tips

- When encryption key is set, QR value is an AES-wrapped JSON string; receivers must use the same key to parse.
- Without a key, QR value is plain JSON including `userId`, optional `username`/`name`, and `baseUrl`.
- For sharing QR as an image, use the “Save Image” button in My QR.

## Production Build

- `npm run build` to create an optimized bundle.
- Host behind a trusted HTTPS domain to ensure camera access on phones.
