FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN python3 -m venv ml/.venv \
  && ml/.venv/bin/pip install --no-cache-dir -r ml/requirements.txt

ENV PORT=10000
EXPOSE 10000

CMD ["node", "scripts/start.mjs"]
