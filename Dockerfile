FROM oven/bun:1.0

WORKDIR /app

COPY . .

RUN bun install
RUN bun build ./index.ts
RUN bun build ./mc-workers.ts

CMD ["bun", "run", "./index.ts"]
