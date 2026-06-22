"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Profile = {
  id: string; company_name: string; brand_name: string | null;
  product_categories: string[]; description: string | null;
  target_countries: string[]; is_active: boolean; created_at: string;
};

type DiscoveryResult = {
  id: string; company_name: string; company_name_ko: string | null;
  country: string; language: string;
  contact_email: string | null; product_interest: string | null;
  product_interest_ko: string | null; source: string; status: string;
  saved_to_buyers: boolean;
};

const ALL_COUNTRIES = [
  "Japan","China","Vietnam","Thailand","Indonesia","Malaysia","Philippines",
  "USA","UK","Australia","Canada","Singapore",
  "Germany","France","Spain","Italy","Netherlands","Poland",
  "UAE","Saudi Arabia","Turkey","India","Brazil","Mexico","Russia",
];

const LANG_FLAG: Record<string, string> = {
  ja:"🇯🇵", zh:"🇨🇳", vi:"🇻🇳", th:"🇹🇭", id:"🇮🇩", ms:"🇲🇾", fil:"🇵🇭",
  en:"🇺🇸", de:"🇩🇪", fr:"🇫🇷", es:"🇪🇸", it:"🇮🇹", nl:"🇳🇱", pl:"🇵🇱",
  ar:"🇦🇪", tr:"🇹🇷", hi:"🇮🇳", pt:"🇧🇷", ru:"🇷🇺",
};

export default function BrandPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [results, setResults] = useState<DiscoveryResult[]>([]);
  const [byCountry, setByCountry] = useState<Record<string, number>>({});
  const [filterCountry, setFilterCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [discoverMsg, setDiscoverMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: "", brand_name: "", product_categories: "",
    description: "", target_countries: [] as string[],
  });

  useEffect(() => {
    apiFetch("/api/brand/profiles").then(d => {
      setProfiles(Array.isArray(d) ? d : []);
    }).finally(() => setLoading(false));
  }, []);

  async function selectProfile(p: Profile) {
    setSelected(p);
    setFilterCountry("");
    setDiscoverMsg("");
    const d = await apiFetch(`/api/brand/profiles/${p.id}/results?limit=200`);
    setResults(d.rows || []);
    setByCountry(d.by_country || {});
  }

  async function createProfile() {
    if (!form.company_name) return;
    const cats = form.product_categories.split(",").map(s => s.trim()).filter(Boolean);
    const d = await apiFetch("/api/brand/profiles", {
      method: "POST",
      body: JSON.stringify({ ...form, product_categories: cats }),
    });
    setProfiles(prev => [d, ...prev]);
    setShowForm(false);
    setForm({ company_name: "", brand_name: "", product_categories: "", description: "", target_countries: [] });
  }

  async function runDiscover() {
    if (!selected) return;
    setDiscovering(true);
    setDiscoverMsg("🔍 현지어 키워드 번역 + 바이어 발굴 중… (최대 5분)");
    const d = await apiFetch(`/api/brand/profiles/${selected.id}/discover`, { method: "POST" });
    if (d.error) {
      setDiscoverMsg(`❌ 오류: ${d.error}`);
    } else if (d.total_saved !== undefined) {
      setDiscoverMsg(`✅ 완료: ${d.total_found}건 발굴 → ${d.total_saved}건 저장 (${(d.countries || []).join(", ")})`);
      const r = await apiFetch(`/api/brand/profiles/${selected.id}/results?limit=200`);
      setResults(r.rows || []);
      setByCountry(r.by_country || {});
    } else {
      setDiscoverMsg("⏳ 백그라운드 발굴 중…");
    }
    setDiscovering(false);
  }

  async function saveTobuyers(resultId: string) {
    await apiFetch(`/api/brand/results/${resultId}/save-to-buyers`, { method: "POST" });
    setResults(prev => prev.map(r => r.id === resultId ? { ...r, saved_to_buyers: true } : r));
  }

  async function saveAll() {
    if (!selected) return;
    const params = filterCountry ? `?country=${filterCountry}` : "";
    const d = await apiFetch(`/api/brand/profiles/${selected.id}/results/save-all${params}`, { method: "POST" });
    alert(`${d.saved}건 바이어발굴 탭으로 저장됨`);
    const r = await apiFetch(`/api/brand/profiles/${selected.id}/results?limit=200`);
    setResults(r.rows || []);
  }

  const filteredResults = filterCountry ? results.filter(r => r.country === filterCountry) : results;

  return (
    <div style={{ padding: "2rem", maxWidth: 1300, display: "flex", gap: "1.5rem" }}>
      {/* 왼쪽: 브랜드 목록 */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>브랜드 프로필</h2>
          <button onClick={() => setShowForm(v => !v)} style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: 6, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer" }}>+ 추가</button>
        </div>

        {showForm && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
            {[
              { key: "company_name", label: "회사명 *", ph: "주식회사 매실" },
              { key: "brand_name", label: "브랜드명", ph: "MAESIL" },
              { key: "product_categories", label: "제품 카테고리 (쉼표)", ph: "한국식품, 소스류, 김치" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: "0.6rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 3 }}>{f.label}</div>
                <input value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.ph} style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.8rem", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: "0.6rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 3 }}>회사 설명</div>
              <textarea value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))}
                rows={3} placeholder="제품, 타겟 시장, 특징 등 자유 기술"
                style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.8rem", boxSizing: "border-box", resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 4 }}>타겟 국가</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {ALL_COUNTRIES.slice(0, 12).map(c => (
                  <button key={c} onClick={() => setForm(v => ({ ...v, target_countries: v.target_countries.includes(c) ? v.target_countries.filter(x => x !== c) : [...v.target_countries, c] }))}
                    style={{ padding: "2px 7px", borderRadius: 99, fontSize: "0.7rem", cursor: "pointer", border: "1px solid",
                      borderColor: form.target_countries.includes(c) ? "#2563eb" : "#e2e8f0",
                      background: form.target_countries.includes(c) ? "#2563eb" : "#fff",
                      color: form.target_countries.includes(c) ? "#fff" : "#374151" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={createProfile} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>저장</button>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "5px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>취소</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ color: "#94a3b8", fontSize: "0.875rem" }}>로딩…</div> :
          profiles.map(p => (
            <div key={p.id} onClick={() => selectProfile(p)} style={{
              padding: "0.85rem 1rem", borderRadius: 10, cursor: "pointer", marginBottom: 6,
              border: "1px solid", borderColor: selected?.id === p.id ? "#2563eb" : "#e2e8f0",
              background: selected?.id === p.id ? "#eff6ff" : "#fff",
            }}>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.brand_name || p.company_name}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{p.company_name}</div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>
                {(p.product_categories || []).slice(0, 3).join(" · ")}
              </div>
              {p.target_countries?.length > 0 && (
                <div style={{ fontSize: "0.7rem", color: "#2563eb", marginTop: 3 }}>
                  🌏 {p.target_countries.slice(0, 4).join(", ")}{p.target_countries.length > 4 ? ` +${p.target_countries.length - 4}` : ""}
                </div>
              )}
            </div>
          ))
        }
        {!loading && profiles.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>브랜드 없음</div>
        )}
      </div>

      {/* 오른쪽: 발굴 결과 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selected ? (
          <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 12, padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🏢</div>
            <div>왼쪽에서 브랜드를 선택하거나 새로 추가하세요</div>
          </div>
        ) : (
          <>
            {/* 브랜드 헤더 */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h1 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {selected.brand_name || selected.company_name}
                  </h1>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "0.5rem" }}>
                    {(selected.product_categories || []).join(" · ")}
                  </div>
                  {selected.description && (
                    <div style={{ fontSize: "0.8rem", color: "#374151", maxWidth: 600 }}>{selected.description}</div>
                  )}
                </div>
                <button onClick={runDiscover} disabled={discovering} style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: discovering ? "#93c5fd" : "#2563eb",
                  color: "#fff", cursor: discovering ? "default" : "pointer",
                  fontSize: "0.875rem", fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  {discovering ? "발굴 중…" : "🌏 현지어 바이어 발굴"}
                </button>
              </div>
              {discoverMsg && (
                <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", fontWeight: 500,
                  color: discoverMsg.startsWith("✅") ? "#16a34a" : discoverMsg.startsWith("❌") ? "#dc2626" : "#2563eb",
                  background: "#f8fafc", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                  {discoverMsg}
                </div>
              )}
            </div>

            {/* 국가별 탭 */}
            {Object.keys(byCountry).length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1rem" }}>
                <button onClick={() => setFilterCountry("")} style={{
                  padding: "4px 12px", borderRadius: 99, fontSize: "0.8rem", cursor: "pointer", border: "1px solid",
                  borderColor: !filterCountry ? "#0f172a" : "#e2e8f0",
                  background: !filterCountry ? "#0f172a" : "#fff",
                  color: !filterCountry ? "#fff" : "#374151", fontWeight: !filterCountry ? 600 : 400,
                }}>전체 {results.length}</button>
                {Object.entries(byCountry).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                  <button key={c} onClick={() => setFilterCountry(c)} style={{
                    padding: "4px 12px", borderRadius: 99, fontSize: "0.8rem", cursor: "pointer", border: "1px solid",
                    borderColor: filterCountry === c ? "#2563eb" : "#e2e8f0",
                    background: filterCountry === c ? "#2563eb" : "#fff",
                    color: filterCountry === c ? "#fff" : "#374151",
                    fontWeight: filterCountry === c ? 600 : 400,
                  }}>{c} {n}</button>
                ))}
              </div>
            )}

            {/* 결과 테이블 */}
            {filteredResults.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                <button onClick={saveAll} style={{ fontSize: "0.8rem", padding: "5px 14px", borderRadius: 8, border: "1px solid #16a34a", color: "#16a34a", background: "#f0fdf4", cursor: "pointer" }}>
                  {filterCountry ? `${filterCountry} 전체` : "전체"} → 바이어발굴 저장
                </button>
              </div>
            )}

            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              {filteredResults.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                  {results.length === 0
                    ? "「🌏 현지어 바이어 발굴」 버튼을 눌러 시작하세요"
                    : "해당 국가 결과 없음"}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                      {["국가/언어", "회사명 (현지어)", "회사명 (한글)", "관심 제품 (현지어)", "관심 제품 (한글)", "이메일", "저장"].map(h => (
                        <th key={h} style={{ padding: "0.65rem 0.85rem", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map(r => (
                      <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9", opacity: r.saved_to_buyers ? 0.6 : 1 }}>
                        <td style={{ padding: "0.65rem 0.85rem", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{r.country}</span>
                          <span style={{ marginLeft: 6, fontSize: "1rem" }}>{LANG_FLAG[r.language] || ""}</span>
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", fontStyle: "italic", color: "#374151" }}>{r.company_name}</td>
                        <td style={{ padding: "0.65rem 0.85rem", fontWeight: 600 }}>{r.company_name_ko || "—"}</td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_interest || "—"}</td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "#374151", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product_interest_ko || "—"}</td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "#2563eb", fontSize: "0.78rem" }}>{r.contact_email || "—"}</td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          {r.saved_to_buyers ? (
                            <span style={{ fontSize: "0.72rem", color: "#16a34a" }}>✅ 저장됨</span>
                          ) : (
                            <button onClick={() => saveTobuyers(r.id)} style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>저장</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
