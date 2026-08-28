// 구조화 데이터(JSON-LD) 렌더 — 검색엔진 관련성/리치결과용. 값은 서버 데이터에서만 옴(사용자 입력 아님).
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify로 안전 직렬화. </script> 이스케이프로 태그 조기종료 방지.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
