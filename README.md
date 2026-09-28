# Re:Used Frontend

Re:Used 중고거래 서비스의 React SPA입니다. 목 API 또는 실제 백엔드·채팅 게이트웨이에 연결해 실행할 수 있습니다.

## 현재 구현 범위

- `AUTH-001` 로그인 (이메일·비밀번호, 카카오)
- `AUTH-002` 소셜 온보딩 (닉네임, 선택 이메일과 별도 선택 동의, 약관 2건 개별 동의)
- `AUTH-003` 비밀번호 재설정 (메일 코드, 10분·1회 사용)
- `AUTH-004` 이메일 회원가입과 이메일 소유 확인
- `HOME-001` 상품 목록
- `HOME-002` 검색·필터
- `PROD-001` 상품 상세
- `PROD-002` 상품 등록·수정
- `WISH-001` 찜 목록과 등록·해제
- `TRADE-001` 구매·판매 거래 내역
- `TRADE-002` 거래 상세와 역할별 상태 전이
- `CHAT-001` 채팅 목록과 미읽음 상태
- `CHAT-002` 채팅방, 메시지 전송·삭제·읽음 처리
- `COMM-001` 커뮤니티 게시글 목록·카테고리 필터
- `COMM-002` 게시글 상세·댓글 작성·삭제
- `COMM-003` 본인 게시글 작성·수정·삭제
- `REVIEW-001` 완료 거래 후기 작성
- `SELL-001` 내 판매 게시글과 받은 거래 요청
- `ME` 받은 후기 조회
- `ADM-004` 관리자 게시글 조회·숨김·복구·논리 삭제
- `ADM-006` 관리자 거래 내역 조회
- 관리자 대시보드·회원·신고·공지·감사 로그·연동 설정 상태와 챗봇 운영 스위치
- 상품·커뮤니티·채팅 신고, 사용자 차단, 알림·공지·판매자 프로필, 내 계정 설정·로그아웃
- Socket.IO 실시간 채팅(REST 저장·30초 재조회 보완)과 추천 질문 챗봇
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

인증 화면은 `/login`, `/signup/email`, `/verify-email`, `/password/reset`, 카카오 콜백 `/oauth/callback`, 온보딩 `/onboarding`이다. API 계약은 `service-design-docs/05-api/endpoints/auth`를 따른다 — 소셜 로그인은 `POST /auth/oauth/{provider}`, 약관은 `termsOfServiceAgreed`·`privacyPolicyAgreed` 2개 필드, 이메일 중복확인 API는 없고 가입 요청의 409로만 알린다. 인증·재설정 코드는 메일로만 전달되며 목 모드에서는 브라우저 콘솔에 `[mock mail]`로 찍힌다.

카카오에는 이메일을 요청하지 않는다. 소셜 온보딩에서 이메일을 선택 입력할 수 있고, 입력하면 `[선택] 이메일 수집·이용 동의`(`emailCollectionAgreed`)가 함께 필요하며 가입 뒤 `/verify-email`에서 소유를 확인한다(ADR-016). 소셜 계정의 이메일은 연락 수단이라 로그인·비밀번호 재설정에 쓰이지 않는다. 인증 화면은 `GET /users/me`의 `email`과 `emailVerified`를 사용한다.

주요 사용자 화면은 `/`, `/wishes`, `/trades`, `/chat`, `/community`, `/me`, `/me/settings`, `/notifications`, `/notices`, `/users/:userId`, `/chatbot`이다. 커뮤니티 글은 `/community/new`에서 작성하고 `/community/:postId`에서 조회하며, 본인 글은 `/community/:postId/edit`에서 수정한다. 관리자 화면은 `/admin` 아래에 있으며 `GET /users/me`의 현재 역할과 서버 ADMIN 권한 검증을 사용한다. 관리자 계정은 이메일 로그인 후 대시보드로 이동한다.

## 검증

```powershell
npm run test
npm run lint
npm run build
```

시드된 로컬 DB와 실제 API·채팅 게이트웨이·S3 대역을 띄운 뒤에는 브라우저 스모크도 실행할 수 있다. 계정과 비밀번호는 환경변수로만 전달하며 저장소에 기록하지 않는다.

```powershell
$env:SMOKE_BASE_URL='http://127.0.0.1:5173'
$env:SMOKE_BUYER_EMAIL='demo-buyer@reused.invalid'
$env:SMOKE_SELLER_EMAIL='demo-seller@reused.invalid'
$env:SMOKE_ADMIN_EMAIL='demo-admin@reused.invalid'
$env:SMOKE_PASSWORD='<로컬 데모 시드 비밀번호>'
npm run smoke:local
```

로컬 Chrome 기본 설치 경로가 다르면 `SMOKE_CHROME_PATH`를 지정한다. 이 검증은 데모 구매자 프로필 이미지를 업로드한다.

## API 모드

기본값은 목 API입니다. `.env.example`을 참고하여 실제 API를 연결할 수 있습니다.

```text
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCKS=true
```

`VITE_USE_MOCKS=false`로 전환하면 Vite 개발 서버가 `/api` 요청을 `VITE_API_PROXY_TARGET`(기본 `http://localhost:8080`)으로, `/socket.io` 요청을 `VITE_CHAT_PROXY_TARGET`(기본 `http://localhost:3001`)으로 프록시한다. 운영 프록시에도 두 경로 모두 필요하며 WebSocket 업그레이드를 전달해야 한다.

CI 프로덕션 빌드는 GitHub Variables의 `VITE_KAKAO_CLIENT_ID`, `VITE_KAKAO_REDIRECT_URI`, `VITE_CHAT_REALTIME`, `VITE_CHAT_SOCKET_URL`을 번들에 반영한다. 이 값은 공개 클라이언트 설정이며 비밀 키가 아니다. 실시간 채팅을 켜려면 `VITE_CHAT_REALTIME=true`로 설정하고 같은 Origin의 `/socket.io`를 채팅 게이트웨이로 라우팅하거나 `VITE_CHAT_SOCKET_URL`에 별도 게이트웨이 주소를 지정한다.

실제 API 계약에는 채팅방 단건 조회가 없다. `/chat/:chatRoomId` 직접 진입은 현재 API 어댑터가 채팅방 목록을 순회해 복구한다. 메시지 저장·조회는 HTTP API를 쓰고, 실시간 이벤트는 Socket.IO로 받은 뒤 HTTP에서 다시 읽는다. Vite 개발 서버는 `/socket.io`를 `VITE_CHAT_PROXY_TARGET`으로 프록시하며 게이트웨이에 브라우저 Origin을 허용해야 한다. 실시간이 꺼지면 채팅 목록과 메시지는 30초마다 갱신된다. 추천 질문 챗봇만 제공하며 자유입력은 개인정보 전송 정책에 따라 비활성이다.
