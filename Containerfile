# ---- etap 1: build frontendu ----
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src
COPY --chown=1001:0 frontend/package*.json ./
RUN npm install
COPY --chown=1001:0 frontend/ ./
# Kod wspólny frontendu i serwera (walidacja planów) — importowany jako ../shared
COPY --chown=1001:0 shared/ ../shared/
RUN npm run build            # → /opt/app-root/src/dist

# ---- etap 2: serwer Node ----
FROM registry.access.redhat.com/ubi9/nodejs-20
WORKDIR /opt/app-root/src
COPY --chown=1001:0 server/package*.json ./
RUN npm install --omit=dev
COPY --chown=1001:0 server/ ./
COPY --chown=1001:0 shared/ ../shared/
COPY --from=build --chown=1001:0 /opt/app-root/src/dist ./public
EXPOSE 3000
CMD ["node", "server.js"]
