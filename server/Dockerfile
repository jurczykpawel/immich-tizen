FROM node:22-alpine
WORKDIR /app
COPY server/ ./server/
COPY dist-phone/ ./phone/
USER node
EXPOSE 8443
CMD ["node", "server/main.mjs"]
