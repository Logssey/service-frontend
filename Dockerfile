# CI 에서 npm run build 로 만든 정적 파일을 nginx 로 서빙한다.
#
# Vite dev 서버는 개발용이다.
# 요청 시점에 TS·JSX 를 변환하고 소스맵과 HMR 을 제공하므로
# 프로덕션 트래픽에는 적합하지 않다.
#
# stable 라인을 쓴다. mainline(1.31)은 새 기능이 들어가며,
# 정적 파일 서빙에는 필요하지 않다.
FROM nginx:1.30-alpine

# 기본 설정을 지우고 SPA 용 설정으로 교체한다.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]