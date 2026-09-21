# Re:Used Frontend

Re:Used 중고거래 서비스의 React SPA입니다. 현재는 개발자 A의 1단계 범위인 카테고리·이미지·게시글 화면을 목 API로 실행할 수 있습니다.

## 현재 구현 범위

- `HOME-001` 상품 목록
- `HOME-002` 검색·필터
- `PROD-001` 상품 상세
- `PROD-002` 상품 등록·수정
- 문서 DTO와 동일한 목 repository
- Presigned URL 기반 이미지 업로드 어댑터
- 모바일 우선 반응형 레이아웃과 데스크톱 대응

기술 선택은 ADR-015의 확정 조건을 따릅니다.

- React + TypeScript + Vite
- React Router
- TanStack Query
- Zustand

## 실행

```powershell
npm install
npm run dev
```

기본 주소는 `http://localhost:5173`입니다.

## 검증

```powershell
npm run test
npm run lint
npm run build
```

## API 모드

기본값은 목 API입니다. `.env.example`을 참고하여 실제 API를 연결할 수 있습니다.

```text
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCKS=true
```

`VITE_USE_MOCKS=false`로 전환하면 Vite 개발 서버가 `/api` 요청을 `http://localhost:8080`으로 프록시합니다.
