// Penyimpanan hasil siswa untuk Isi Piringku (Netlify Functions + Netlify Blobs)
// Sandi admin: atur di Netlify > Site configuration > Environment variables > ADMIN_PASSWORD
import { getStore } from "@netlify/blobs";

const SANDI = process.env.ADMIN_PASSWORD || "bayulida123";
const KEYS = ["pokok", "lauk", "sayur", "buah", "minum"];
const STAT = ["kurang", "normal", "lebih"];
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const all = async (store) => {
  const { blobs } = await store.list();
  return (await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })))).filter(Boolean);
};

export default async (req) => {
  const store = getStore("hasil");

  // Siswa mengirim hasil (tanpa sandi)
  if (req.method === "POST") {
    const b = await req.json().catch(() => null);
    if (!b || !/^[a-z0-9]{6,32}$/.test(String(b.id))) return J({ error: "data tidak valid" }, 400);
    const lama = await store.get(b.id, { type: "json" });
    const rec = {
      id: b.id,
      nama: String(b.nama || "").slice(0, 20),
      waktu: lama ? lama.waktu : Date.now(),
      
      ok: Math.min(6, Math.max(0, b.ok | 0)),
      nilai: Math.min(100, Math.max(0, b.nilai | 0)),
      kkal: Math.min(5000, Math.max(0, b.kkal | 0)),
      se: STAT.includes(b.se) ? b.se : "kurang",
      s: {},
      p: {},
    };
    for (const k of KEYS) {
      rec.s[k] = STAT.includes(b.s?.[k]) ? b.s[k] : "kurang";
      rec.p[k] = (Array.isArray(b.p?.[k]) ? b.p[k] : []).slice(0, 3).map((x) => String(x).slice(0, 40));
    }
    await store.setJSON(rec.id, rec);
    return J({ ok: true });
  }

  // Selebihnya khusus admin
  if (req.headers.get("x-sandi") !== SANDI) return J({ error: "sandi salah" }, 401);

  if (req.method === "GET") return J(await all(store));

  if (req.method === "DELETE") {
    const b = await req.json().catch(() => ({}));
    for (const r of await all(store)) {
      if (b.all || String(r.nama).toLowerCase() === b.n) await store.delete(r.id);
    }
    return J({ ok: true });
  }
  return J({ error: "metode tidak didukung" }, 405);
};

export const config = { path: "/api/hasil" };
