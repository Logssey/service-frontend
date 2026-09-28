# CI 에서 npm run build 로 만든 정적 파일을 nginx 로 서빙한다.
#
# Vite dev 서버는 개발용이다.
# 요청 시점에 TS·JSX 를 변환하고 소스맵과 HMR 을 제공하므로
# 프로덕션 트래픽에는 적합하지 않다.
#
# nginx 공식 이미지는 root 로 시작해 캐시 디렉터리 소유권을 바꾼 뒤
# 워커를 nginx 사용자로 떨어뜨린다. Pod 에서 capabilities 를 제거하면
# 그 chown 이 실패한다.
#
# unprivileged 이미지는 처음부터 비root(UID 101)로 동작하도록
# 디렉터리 권한과 설정 경로가 조정되어 있다.
# 특권 포트를 쓸 수 없으므로 80 대신 8080 을 연다.
FROM nginxinc/nginx-unprivileged:1.30-alpine

# 기본 설정을 지우고 SPA 용 설정으로 교체한다.
# 이미지가 비root 로 실행되므로 COPY 단계에서만 root 권한이 있다.
USER root
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]