# Fullstack JavaScript Monorepo Derp AI (NestJS, Vite, React Native)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This repository contains the code for **Derp AI**, a full-stack application built within a JavaScript/TypeScript monorepo. The core purpose of the backend is to synthesize answers by querying multiple AI APIs (such as Google Gemini and models from Hugging Face), providing results via API and WebSockets.

**Check out the live demo:** [https://derp.ai.petarzarkov.com/](https://derp.ai.petarzarkov.com/)

## Key Features

- **Backend:** Robust API built with [NestJS](https://nestjs.com/), using [TypeORM](https://typeorm.io/) for PostgreSQL database interactions.
- **Frontend:** Fast and modern web interface using [Vite](https://vitejs.dev/), [React](https://react.dev/), and [Chakra UI](https://chakra-ui.com/).
- **Real-time:** WebSocket integration using [Socket.io](https://socket.io/) for instant communication.
- **AI Integration:** Connects to multiple AI services (e.g., Google Gemini, Hugging Face) to process and synthesize information.
- **Monorepo:** Managed with `pnpm` workspaces for efficient dependency handling and code sharing.
- **Database:** Configured for [PostgreSQL](https://www.postgresql.org/).
- **Authentication:** Basic setup included.
- **Testing:** Unit and Integration test configurations available for the backend.
- **Containerization:** Docker support for running the backend service.

## Core Components

This monorepo includes the following primary services:

1.  **Web Application (`services/web`)**

    - **Framework:** [Vite](https://vitejs.dev/)
    - **UI Library:** [React](https://react.dev/) with [Chakra UI](https://chakra-ui.com/)
    - **Purpose:** User-facing web interface for interacting with the Derp AI service.

2.  **Backend Server (`services/server`)**

    - **Framework:** [NestJS](https://nestjs.com/) (TypeScript)
    - **Database:** [PostgreSQL](https://www.postgresql.org/) via [TypeORM](https://typeorm.io/)
    - **Real-time:** [Socket.io](https://socket.io/) for WebSocket communication.
    - **AI:** Integrates with external AI APIs (Gemini, Hugging Face, etc.).
    - **Features:** Handles API requests, business logic, data persistence, authentication, WebSocket events, and AI orchestration.
    - **Testing:** Includes Unit & Integration test setup.

3.  **Mobile Application (`services/mobile`)**
    - **Status:** **Not Implemented Yet**
    - **Intended Framework:** [React Native](https://reactnative.dev/)
    - **Purpose:** Placeholder for future native mobile clients.

## Monorepo Management

This repository uses **`pnpm` workspaces** for managing multiple packages within a single repository. Benefits include:

- **Single Source of Truth:** All code resides in one place.
- **Simplified Dependencies:** Efficient handling of shared and service-specific dependencies.
- **Code Sharing:** Potential to easily create shared libraries (`packages/`).
- **Consistent Tooling:** Streamlined commands, linting, and formatting across the project.

## Getting Started

### Prerequisites

Ensure you have the following installed. The specified versions are recommended based on project testing:

- **Node.js:** `>= 22.14.0` (`node -v`)
- **pnpm:** `>= 10.6.2` (`pnpm -v`, install via `npm install -g pnpm@10.6.2`)
- **PostgreSQL:** `>= 17` (Or use the provided Docker setup)
- **Docker:** Latest stable version
- **Docker Compose:** `>= 2.31.0` (Usually included with Docker Desktop)
- **Git:** `>= 2.34.1` (`git --version`)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/petarzarkov/derp.ai](https://github.com/petarzarkov/derp.ai) derpai
    cd derpai
    ```

2.  **Install dependencies:** (This installs for all services)

    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**
    - A default `.env` file is provided with base values.
    - Copy or rename `.env.example` to `.env` if necessary and customize variables (like database credentials and API keys) as needed. Key variables include:
      - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
      - `JWT_SECRET`
      - `GOOGLE_GEMINI_API_KEY`
      - _(Add other relevant AI keys or service URLs here)_

## Development

### Running the Database

1.  Ensure Docker and Docker Compose are running.
2.  Start the development database container (and any other services defined in `docker-compose.yml`):
    ```bash
    # Uses configuration from .env and docker-compose.yml
    # Runs containers in the background
    docker-compose up -d
    ```

### Running Services

You can run services individually or all at once:

- **Run all services concurrently (Web & Server) in watch mode:**

  ```bash
  pnpm dev
  ```

  _(Useful for quick checks, but output can be interleaved. Running separately is often clearer.)_

- **Run only the Backend Server (watch mode):**

  ```bash
  pnpm --filter server dev
  # Or navigate to services/server and run: pnpm run dev
  ```

  - See the [Server README](./services/server/README.md) for more details (migrations, seeding, etc.).

- **Run only the Web Application (watch mode):**
  ```bash
  pnpm --filter web dev
  # Or navigate to services/web and run: pnpm run dev
  ```

### Other Common Commands

- **Build all services:**
  ```bash
  pnpm build
  ```
- **Run tests for all services:**
  ```bash
  pnpm test
  ```

## Running the Backend with Docker

This section focuses on building and running the **backend server** as a Docker container.

1.  **Build the Docker image for the server:**

    ```bash
    # Ensure you are in the root directory
    # You can override the default port (3000) during build if needed
    docker build --build-arg SERVICE_PORT=3033 -t derpai-server -f services/server/Dockerfile .
    ```

    _(Note: Adjust Dockerfile path if needed. This example assumes a Dockerfile exists at `services/server/Dockerfile` and the build context is the root)_

2.  **Run the container:**

    - Ensure a PostgreSQL database is accessible to the container (e.g., running via `docker-compose up -d` on the same Docker network, or an external DB).
    - Provide necessary environment variables.

    ```bash
    docker run --rm -it --name derpai-server \
      -p 3033:3033 \
      --network your_docker_network \ # e.g., the network created by docker-compose
      -e SERVICE_PORT=3033 \
      -e APP_ENV=production \
      -e DB_HOST=your_db_host_accessible_from_docker \ # e.g., pgdb-template if using default docker-compose
      -e DB_PORT=6570 \
      -e DB_USER=postgres \
      -e DB_PASS=postgres \
      -e DB_NAME=postgres \
      -e JWT_SECRET=your_production_secret \
      -e GOOGLE_GEMINI_API_KEY=<your_api_key> \
      # Add other required environment variables
      derpai-server
    ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
