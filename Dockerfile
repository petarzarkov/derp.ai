FROM public.ecr.aws/docker/library/node:22 AS base
ENV NODE_ENV=production
ENV CI=true
ENV APP_ENV=prod
RUN npm install -g pnpm@10.4.0
COPY . /app
WORKDIR /app

FROM base AS build
WORKDIR /app
# Copy the entire monorepo source code
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Stage 4: Prepare production image
FROM base AS release
WORKDIR /app

ENV GIT_COMMIT_SHA=${KOYEB_GIT_SHA:-unknown}
ENV GIT_COMMIT_MESSAGE=${KOYEB_GIT_COMMIT_MESSAGE:-unknown}
ENV GIT_COMMIT_AUTHOR=${KOYEB_GIT_COMMIT_AUTHOR:-unknown}
ENV GIT_BRANCH=${KOYEB_GIT_BRANCH:-unknown}
ENV GIT_REPOSITORY=${KOYEB_GIT_REPOSITORY:-unknown}

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter derp-ai-server deploy --prod /app/deploy/server
COPY --from=build /app/services/server/build /app/deploy/server/build
COPY --from=build /app/services/web/dist /app/deploy/web/dist

# Set final working directory for the deploy pkg
WORKDIR /app/deploy

# Expose the port the server will run on
ARG SERVICE_PORT
ENV SERVICE_PORT=${SERVICE_PORT}
EXPOSE ${SERVICE_PORT}

# Run the server directly with Node
CMD [ "node", "server/build/main.js" ]