/**
 * I Dengar — Cloudflare Worker
 * - Menyaji fail statik dari ./public (binding ASSETS)
 * - POST /api/mohon  : simpan permohonan ke KV (binding PERMOHONAN)
 * - GET  /api/health : semakan ringkas
 * - GET  /api/senarai: senarai permohonan (perlu header x-admin-key = secret ADMIN_KEY)
 */

const NEGERI = new Set([
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis',
  'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'
]);
const KATEGORI = new Set(['Warga emas', 'Kanak-kanak', 'OKU', 'B40']);

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });

const bersih = (v, max) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);

function rujukanBaru() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ID-${ymd}-${rand}`;
}

async function hadKadar(env, ip) {
  // Had ringkas: maksimum 5 permohonan sejam bagi setiap IP.
  if (!env.PERMOHONAN || !ip) return true;
  const key = `rl:${ip}`;
  const n = parseInt((await env.PERMOHONAN.get(key)) || '0', 10);
  if (n >= 5) return false;
  await env.PERMOHONAN.put(key, String(n + 1), { expirationTtl: 3600 });
  return true;
}

async function mohon(request, env) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, mesej: 'Format data tidak sah.' }, 400); }

  // Honeypot untuk bot
  if (bersih(data.laman, 10)) return json({ ok: true, rujukan: rujukanBaru() });

  const nama = bersih(data.nama, 120);
  const telefon = bersih(data.telefon, 20);
  const negeri = bersih(data.negeri, 40);
  const kategori = bersih(data.kategori, 20);
  const catatan = bersih(data.catatan, 600);

  const ralat = [];
  if (nama.length < 3) ralat.push('nama');
  if (!/^\+?[0-9\s\-]{9,20}$/.test(telefon)) ralat.push('telefon');
  if (!NEGERI.has(negeri)) ralat.push('negeri');
  if (!KATEGORI.has(kategori)) ralat.push('kategori');
  if (data.setuju !== 'on' && data.setuju !== true && data.setuju !== 'true') ralat.push('setuju');
  if (ralat.length) return json({ ok: false, mesej: 'Sila semak ruangan: ' + ralat.join(', ') + '.' }, 422);

  const ip = request.headers.get('cf-connecting-ip') || '';
  if (!(await hadKadar(env, ip))) {
    return json({ ok: false, mesej: 'Terlalu banyak permohonan dari sambungan ini. Sila cuba sebentar lagi.' }, 429);
  }

  const rujukan = rujukanBaru();
  const rekod = {
    rujukan, nama, telefon, negeri, kategori, catatan,
    dihantar_pada: new Date().toISOString(),
    negara_ip: request.cf?.country || null,
    ua: bersih(request.headers.get('user-agent'), 200)
  };

  if (!env.PERMOHONAN) return json({ ok: false, mesej: 'Storan belum dikonfigurasi.' }, 500);
  await env.PERMOHONAN.put(`mohon:${rekod.dihantar_pada}:${rujukan}`, JSON.stringify(rekod), {
    metadata: { nama, negeri, kategori, telefon }
  });

  return json({ ok: true, rujukan });
}

async function senarai(request, env) {
  const kunci = request.headers.get('x-admin-key') || new URL(request.url).searchParams.get('key');
  if (!env.ADMIN_KEY || kunci !== env.ADMIN_KEY) return json({ ok: false, mesej: 'Tidak dibenarkan.' }, 401);
  const list = await env.PERMOHONAN.list({ prefix: 'mohon:', limit: 1000 });
  const rows = await Promise.all(list.keys.map(async (k) => JSON.parse(await env.PERMOHONAN.get(k.name))));
  rows.sort((a, b) => (a.dihantar_pada < b.dihantar_pada ? 1 : -1));
  const url = new URL(request.url);
  if (url.searchParams.get('format') === 'csv') {
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const head = ['rujukan', 'dihantar_pada', 'nama', 'telefon', 'negeri', 'kategori', 'catatan'];
    const csv = [head.join(',')].concat(rows.map(r => head.map(h => esc(r[h])).join(','))).join('\r\n');
    return new Response('﻿' + csv, {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="idengar-permohonan.csv"' }
    });
  }
  return json({ ok: true, jumlah: rows.length, permohonan: rows });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/health') return json({ ok: true, program: 'I Dengar', masa: new Date().toISOString() });
      if (url.pathname === '/api/mohon') {
        if (request.method !== 'POST') return json({ ok: false, mesej: 'Gunakan POST.' }, 405, { allow: 'POST' });
        // Hanya terima dari laman sendiri
        const origin = request.headers.get('origin');
        if (origin && new URL(origin).host !== url.host) return json({ ok: false, mesej: 'Asal tidak dibenarkan.' }, 403);
        return mohon(request, env);
      }
      if (url.pathname === '/api/senarai') return senarai(request, env);
      return json({ ok: false, mesej: 'Tidak dijumpai.' }, 404);
    }
    return env.ASSETS.fetch(request);
  }
};
