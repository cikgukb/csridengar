# I Dengar — Laman Web CSR (Marhakim Group)

Laman web program tanggungjawab sosial korporat **I Dengar**: alat bantu pendengaran percuma untuk warga emas, kanak-kanak, OKU dan keluarga B40 di Malaysia.

## Struktur

```
public/            laman statik (HTML, CSS, JS, gambar)
src/worker.js      Cloudflare Worker: API borang permohonan (/api/mohon) + penyajian fail statik
wrangler.jsonc     konfigurasi Cloudflare Workers (assets + KV)
```

## Jalankan secara tempatan

```bash
npm install
npm run dev
```

Buka http://localhost:8787.

## Deploy ke Cloudflare

Perlukan `CLOUDFLARE_API_TOKEN` (kebenaran: Workers Scripts: Edit, Workers KV Storage: Edit) dan `CLOUDFLARE_ACCOUNT_ID`.

```bash
npm run deploy
```

Permohonan borang disimpan dalam KV namespace `idengar-permohonan` (binding `PERMOHONAN`).

### Lihat / muat turun permohonan

Tetapkan secret pentadbir sekali:

```bash
npx wrangler secret put ADMIN_KEY
```

Kemudian:

- JSON: `https://<domain>/api/senarai` dengan header `x-admin-key: <ADMIN_KEY>`
- CSV: `https://<domain>/api/senarai?format=csv&key=<ADMIN_KEY>`

## Perkara untuk dikemas kini

- Nombor WhatsApp dan e-mel (`public/index.html`, cari `60123456789` dan `idengar@marhakim.com.my`).
- Statistik hero (`data-count`) dan harga pakej tajaan.
- Gambar dalam `public/assets/img/` boleh digantikan dengan foto sebenar program (kekalkan nama fail).
