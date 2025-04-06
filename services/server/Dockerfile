FROM public.ecr.aws/docker/library/node:22 AS base
ENV NODE_ENV=production
ENV CI=true
ENV APP_ENV=prod
RUN npm install -g pnpm@10.6.2
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
ARG SERVICE_PORT
ENV SERVICE_PORT=$SERVICE_PORT

COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
EXPOSE $SERVICE_PORT
CMD [ "pnpm", "start" ]