FROM bilinote-frontend-base:latest AS builder
COPY ./BillNote_frontend/ ./
RUN pnpm run build

FROM nginx:1.25-alpine
RUN rm -rf /etc/nginx/conf.d/default.conf
COPY ./BillNote_frontend/deploy/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
