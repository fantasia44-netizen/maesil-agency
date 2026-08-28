"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, getUser, hasToken } from "../../../../lib/api";
import { isLocale, defaultLocale, localizePath, type Locale } from "../../../../lib/i18n";
import { getGallery } from "./dict";

type Post = {
  id: string; mine?: boolean; display_name: string | null;
  image_url: string; caption: string | null; created_at: string;
};

const fmt = (s: string) => {
  const d = new Date(s);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function GalleryPage() {
  const params = useParams();
  const lang: Locale = isLocale(params?.lang as string) ? (params!.lang as Locale) : defaultLocale;
  const t = getGallery(lang);
  const L = (p: string) => localizePath(lang, p);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<{ id: string | null | undefined; role: string } | null>(null);
  const [view, setView] = useState<Post | null>(null);
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setPosts(await apiFetch<Post[]>("/api/gbl/gallery?limit=80", {}, 20000)); }
    catch { /* noop */ } finally { setLoading(false); }
  };
  useEffect(() => {
    setReady(true);
    if (!hasToken()) return; // 비회원 = 게이트 표시(콘텐츠 미로드)
    const u = getUser();
    setMe(u ? { id: u.id, role: u.role } : null);
    load();
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600); };

  const onPick = () => {
    if (!me) { flash(t.needLogin); return; }
    fileRef.current?.click();
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { flash(t.badType); return; }
    if (f.size > 4 * 1024 * 1024) { flash(t.tooBig); return; }
    const caption = window.prompt(t.captionPrompt, "");
    if (caption === null) return; // 취소
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f);
      });
      const post = await apiFetch<Post>("/api/gbl/gallery", { method: "POST", body: JSON.stringify({ image: dataUrl, caption }) }, 30000);
      setPosts((p) => [post, ...p]);
      flash(t.uploadDone);
    } catch (err) {
      flash(t.uploadFail + (err instanceof Error ? err.message : t.errWord));
    } finally { setBusy(false); }
  };

  const del = async (p: Post) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await apiFetch(`/api/gbl/gallery/${p.id}`, { method: "DELETE" }, 15000);
      setPosts((x) => x.filter((y) => y.id !== p.id));
      setView(null);
    } catch (err) { flash(t.deleteFail + (err instanceof Error ? err.message : t.errWord)); }
  };
  const canDelete = (p: Post) => !!me && (!!p.mine || me.role === "super_admin");

  if (!ready) return null;
  // ── 비회원 게이트 (회원 전용 갤러리) ──
  if (!hasToken()) {
    return (
      <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 5rem" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <h1 style={{ margin: "0.4rem 0 1rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
          <div style={{ background: "#fff", border: "1px solid #e3e8f2", borderRadius: 14, textAlign: "center", padding: "2rem 1.2rem" }}>
            <div style={{ fontSize: "2rem" }}>🔒</div>
            <p style={{ margin: "0.6rem 0 0.2rem", fontWeight: 800, color: "#0f172a" }}>{t.gateTitle}</p>
            <p style={{ margin: "0 0 1.2rem", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.7 }}>
              {t.gateDescPre}<b>{t.gateDescBold}</b>{t.gateDescPost}<br />{t.gateDesc2}
            </p>
            <Link href={L("/gbl/login")} style={{ display: "inline-block", textDecoration: "none", padding: "10px 22px", borderRadius: 10, background: "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.9rem" }}>{t.gateBtn}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 5rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>{t.navRaid}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 0.9rem", fontSize: "0.88rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro}
        </p>

        {msg && <div style={{ background: "#eef2ff", color: "#3b5bdb", border: "1px solid #c3d2f5", borderRadius: 10, padding: "0.6rem 0.9rem", marginBottom: 12, fontSize: "0.84rem", fontWeight: 600 }}>{msg}</div>}

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem" }}>{t.loading}</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{t.empty}</div>
        ) : (
          <div style={{ columnWidth: 210, columnGap: 12 }}>
            {posts.map((p) => (
              <div key={p.id} onClick={() => setView(p)}
                style={{ breakInside: "avoid", marginBottom: 12, background: "#fff", border: "1px solid #e3e8f2", borderRadius: 12, overflow: "hidden", cursor: "pointer" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.caption || t.altBrag} style={{ width: "100%", display: "block" }} loading="lazy" />
                <div style={{ padding: "8px 10px" }}>
                  {p.caption && <div style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{p.caption}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8" }}>
                    <span>🧑 {p.display_name || t.anon}</span><span>{fmt(p.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 자랑 올리기 FAB */}
      <button onClick={onPick} disabled={busy}
        style={{ position: "fixed", right: 18, bottom: 22, zIndex: 50, padding: "13px 20px", borderRadius: 26, border: "none",
          cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.95rem", color: "#fff",
          background: busy ? "#cbd5e1" : "linear-gradient(90deg,#ea580c,#db2777)", boxShadow: "0 8px 24px rgba(219,39,119,.35)" }}>
        {busy ? t.fabBusy : t.fab}
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} style={{ display: "none" }} />

      {/* 크게 보기 모달 */}
      {view && (
        <div onClick={() => setView(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.8)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={view.image_url} alt={view.caption || ""} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "76vh", borderRadius: 12 }} />
          <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", color: "#e2e8f0" }}>
            {view.caption && <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 4 }}>{view.caption}</div>}
            <div style={{ fontSize: "0.76rem", color: "#cbd5e1" }}>🧑 {view.display_name || t.anon} · {fmt(view.created_at)}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 10 }}>
              {canDelete(view) && <button onClick={() => del(view)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.84rem" }}>{t.del}</button>}
              <button onClick={() => setView(null)} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: "rgba(255,255,255,.15)", color: "#e2e8f0", cursor: "pointer", fontSize: "0.84rem" }}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
