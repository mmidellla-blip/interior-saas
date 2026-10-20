# 집공방 — 인테리어 업체용 SaaS (MVP)

소규모 인테리어 업체가 플랫폼 수수료 없이 내 고객을 직접 받고, 계약하고, 관리하는 도구.
기획 문서: `../인테리어 업체용 SaaS 방향성.md`

## 실행

```bash
npm install
npm run dev        # http://localhost:3000 (포트가 사용 중이면 npm run dev -- -p 3100)
```

| 주소 | 내용 |
| --- | --- |
| `/` | 서비스 소개(랜딩) |
| `/c/haneul` | 데모 업체 페이지 + 포트폴리오 |
| `/c/haneul/estimate` | 견적 계산기 |
| `/c/haneul/room` | 미니룸 꾸미기 (실시간 견적) |
| `/s/demo-yangju-q8m4w2zt` | 고객용 현장 공유 페이지 (로그인 없음) |
| `/embed/haneul`, `/widget.js` | 블로그용 견적 위젯 |
| `/admin` | 관리자 (개발용 비밀번호 `demo1234`) |

## 환경변수 (운영 시 필수)

```
ADMIN_PASSWORD=...     # 관리자 비밀번호
SESSION_SECRET=...     # 세션 쿠키 서명 키 (긴 무작위 문자열)
```

## 구조

- `src/lib/types.ts` — 데이터 모델. 모든 레코드에 `companyId`.
- `src/lib/db.ts` — MVP용 JSON 파일 저장소(`data/db.json`, 사진은 `data/uploads/`). 처음 실행 시 데모 데이터 생성.
  Supabase(Postgres + RLS)로 옮길 때 이 파일과 `queries.ts`만 바꾸면 됩니다.
- `src/lib/estimate.ts` — 견적 계산(클라이언트·서버 공용). 문의 접수 시 서버에서 다시 계산.
- `src/lib/room.ts` — 미니룸 선택지(카테고리·추가 항목)와 견적 연결 방식.
- `src/lib/room-model.ts` — 미니룸 장면(상자·구 목록). 2D `RoomScene.tsx`(SVG 아이소메트릭)와 3D `Room3D.tsx`(three.js)가 같은 모델을 그린다.
  가구·소품을 추가할 때는 이 파일만 고치면 두 화면에 함께 반영된다.
- `src/lib/public-actions.ts`, `src/lib/admin-actions.ts` — 서버 액션. 관리자 액션은 모두 `requireAdmin()`으로 확인.

## 기획 문서의 "처음부터 지킬 것" 반영

- 모든 조회·수정이 `companyId`로 필터링됨
- 공유 링크는 128비트 무작위 토큰, 만료일(180일) + 재발급
- 공개 페이지에는 동 단위 지역만, 고객 이름·연락처·상세 주소는 내보내지 않음 (`toPublicProject`)
- 사진은 브라우저에서 긴 변 1600px JPEG로 다시 그려 업로드 → EXIF(GPS) 제거

## 아직 안 한 것 (MVP 범위 밖)

알림톡 자동 발송, 멀티 업체 가입·결제, 정식 견적서 PDF, 포트폴리오 필터·SEO, 서브도메인.
데모 사진은 `scripts/generate-seed-images.mjs`로 만든 일러스트입니다.
