FROM public.ecr.aws/docker/library/node:22.15.0-slim AS base

ENV NODE_ENV=production
ENV CI=true
ENV APP_ENV=prod

RUN npm install -g pnpm@10.9.0
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

ENV GIT_COMMIT=${COMMIT_SHA}
ENV GIT_COMMIT_MESSAGE=${COMMIT_MESSAGE}
ENV GIT_COMMIT_AUTHOR=${COMMIT_AUTHOR}
ENV GIT_BRANCH=${BRANCH_NAME}
ENV GIT_REPOSITORY=${REPO_NAME}

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter derp-ai-server deploy --prod /app/deploy/server
COPY --from=build /app/services/server/build /app/deploy/server/build
COPY --from=build /app/services/web/dist /app/deploy/web/dist
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod

# Set final working directory for the deploy pkg
WORKDIR /app/deploy

# Expose the port the server will run on
ARG SERVICE_PORT
ENV SERVICE_PORT=${SERVICE_PORT}
EXPOSE ${SERVICE_PORT}

# Run the server directly with Node
CMD [ "node", "server/build/main.js" ]