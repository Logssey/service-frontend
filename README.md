# Re:Used Frontend

Re:Used 중고거래 서비스의 React SPA입니다. 개발자 A의 카테고리·이미지·게시글부터 찜·거래·채팅·관리자 조회까지 목 API로 실행할 수 있습니다.

## 현재 구현 범위

- `HOME-001` 상품 목록
- `HOME-002` 검색·필터
- `PROD-001` 상품 상세
- `PROD-002` 상품 등록·수정
- `WISH-001` 찜 목록과 등록·해제
- `TRADE-001` 구매·판매 거래 내역
- `TRADE-002` 거래 상세와 역할별 상태 전이
- `CHAT-001` 채팅 목록과 미읽음 상태
- `CHAT-002` 채팅방, 메시지 전송·삭제·읽음 처리
- `COMMUNITY-001` 커뮤니티 게시글 목록·카테고리 필터·상세 조회
- `COMMUNITY-002` 본인 게시글 작성·수정·삭제와 댓글 작성·삭제
- `REVIEW-001` 완료 거래 후기 작성
- `SELL-001` 내 판매 게시글과 받은 거래 요청
- `ME` 받은 후기 조회
- `ADM-004` 관리자 게시글 조회·숨김·복구·논리 삭제
- `ADM-006` 관리자 거래 내역 조회
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

주요 사용자 화면은 `/`, `/wishes`, `/trades`, `/chat`, `/community`, `/me`에서 확인할 수 있습니다. 커뮤니티 글은 `/community/new`에서 작성하고 `/community/:postId`에서 조회하며, 본인 글은 `/community/:postId/edit`에서 수정할 수 있습니다. 관리자 화면은 `/admin/listings`, `/admin/trades`에서 확인할 수 있으며 현재 ADMIN 권한은 인증 연동 전 목 경계를 사용합니다.

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

실제 API 계약에는 채팅방 단건 조회가 아직 없습니다. `/chat/:chatRoomId` 직접 진입은 현재 API 어댑터가 채팅방 목록을 순회해 복구하며, 백엔드 구현 전에 단건 조회 응답 계약을 확정해야 합니다. Socket.IO 실시간 수신은 인증·채팅 서버가 준비된 뒤 연결하고, 메시지 저장은 문서대로 HTTP API를 사용합니다.
