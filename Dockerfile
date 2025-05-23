FROM public.ecr.aws/docker/library/node:22.15.0-slim AS base

ARG GIT_COMMIT
ARG GIT_COMMIT_MESSAGE
ARG GIT_COMMIT_AUTHOR
ARG GIT_BRANCH
ARG GIT_REPOSITORY
ARG REGION

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
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter derp-ai-server deploy --prod /app/deploy/server

# Stage 4: Prepare production image
FROM base AS release
WORKDIR /app

ENV GIT_COMMIT=$GIT_COMMIT
ENV GIT_COMMIT_MESSAGE=$GIT_COMMIT_MESSAGE
ENV GIT_COMMIT_AUTHOR=$GIT_COMMIT_AUTHOR
ENV GIT_BRANCH=$GIT_BRANCH
ENV GIT_REPOSITORY=$GIT_REPOSITORY
ENV REGION=$REGION

COPY --from=build /app/deploy/server /app/deploy/server
COPY --from=build /app/services/web/dist /app/deploy/web/dist

# Set final working directory for the deploy pkg
WORKDIR /app/deploy

# Expose the port the server will run on
ARG SERVICE_PORT
ENV SERVICE_PORT=${SERVICE_PORT}
EXPOSE ${SERVICE_PORT}

# Run the server directly with Node
CMD [ "node", "--max-old-space-size=1024", "server/build/main.js" ]