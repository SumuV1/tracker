# ---- etap 1: build frontendu ----
FROM registry.access.redhat.com/ubi9/nodejs-20 AS build
WORKDIR /opt/app-root/src
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build            # → /opt/app-root/src/dist

# ---- etap 2: serwer Node ----
FROM registry.access.redhat.com/ubi9/nodejs-20
WORKDIR /opt/app-root/src
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=build /opt/app-root/src/dist ./public
EXPOSE 3000
CMD ["node", "server.js"]
