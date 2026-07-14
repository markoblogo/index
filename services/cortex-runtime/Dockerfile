FROM node:22-alpine

WORKDIR /app
COPY services/cortex-runtime/server.mjs ./server.mjs

ENV NODE_ENV=production
ENV CORTEX_RUNTIME_DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "server.mjs"]
