// 도감 기반 speciesId slug 규칙 — 입력(app 기록)과 표시(meta 페이지)가 반드시 동일해야 id가 일치한다.
// 비메타몬은 영문명 기반 slug로 저장되므로, 이름/스프라이트 해석 시 같은 규칙으로 역매핑.
export const monSlug = (en: string) => en.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
export const monSlugId = (en: string, shadow: boolean) => (shadow ? `${monSlug(en)}_shadow` : monSlug(en));
