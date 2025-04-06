# Fullstack JavaScript Monorepo Derp AI (NestJS, Vite, React Native)

## Overview

This derp ai provides a solid foundation for derping

## Core Components

This monorepo includes the following primary services:

1.  **Web Application (`services/web`)**

    - **Framework:** [Vite](https://vitejs.dev/) - For lightning-fast HMR (Hot Module Replacement) and optimized builds.
    - **UI Library:** [React](https://react.dev/) (via Vite) with [Chakra UI](https://chakra-ui.com/) - A comprehensive component library for building accessible and visually appealing user interfaces quickly.
    - **Purpose:** Serves as the primary user-facing web interface.

2.  **Backend Server (`services/server`)**

    - **Framework:** [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient, reliable, and scalable server-side applications using TypeScript.
    - **Database ORM:** [TypeORM](https://typeorm.io/) - For seamless interaction with SQL databases (configured for PostgreSQL).
    - **Authentication:** Includes basic setup/placeholders for user authentication.
    - **Testing:** Comes with configurations for both Integration and Unit tests using NestJS's testing utilities.
    - **Caching (Planned):** [Redis](https://redis.io/) integration is planned for caching, session management, or other relevant use cases (to be added).
    - **Purpose:** Provides the API, handles business logic, manages data persistence, and authentication.

3.  **Mobile Application (`services/mobile`)**
    - **Status:** **Not Implemented Yet**
    - **Intended Framework:** [React Native](https://reactnative.dev/) - For building native mobile applications for iOS and Android using React.
    - **Purpose:** Placeholder for developing native mobile clients that interact with the backend server.

## Monorepo Management

This repository is structured as a **monorepo** managed by **`pnpm` workspaces**. This approach offers several advantages:

- **Single Source of Truth:** All code (frontend, backend, mobile) resides in one repository.
- **Simplified Dependency Management:** `pnpm` efficiently handles dependencies across different services, reducing duplication.
- **Code Sharing:** Easily create shared packages (e.g., for common types or utility functions) within a `packages/` directory (if needed) that can be used across services.
- **Consistent Tooling:** Run commands, linters, and formatters across the entire project easily.

## Getting Started

### Prerequisites

Ensure you have the following tools installed on your system:

- **Node.js:** `>= 22.14.0` (Check with `node -v`)
- **pnpm:** `>= 10.6.2` (Install via `npm install -g pnpm@10.6.2` or follow official pnpm installation instructions)
- **PostgreSQL:** `>= 17` (Or use the provided Docker setup)
- **Docker:** Latest stable version recommended (Required for the easy database setup)
- **Docker Compose:** `>= 2.31.0` (Usually included with Docker Desktop)
- **Git:** `>= 2.34.1` (Check with `git --version`)

## Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/petarzarkov/derp.ai derpai
    cd derpai
    ```

2.  **Install pnpm (if not already installed globally):**

    ```bash
    npm install -g pnpm@10.6.2
    ```

3.  **Install dependencies:**

    ```bash
    pnpm install
    ```

4.  **Set up Environment Variables (Optional):**
    `.env` provides default values, change them if you need to

## Development

### Prerequisites

- Ensure Docker and Docker Compose are running.
- Start the development database container:

  ```bash
  docker-compose up -d # Use -d to run in detached mode
  ```

  _(This uses the configuration from `.env` and `docker-compose.yml` to start all containers defined in the yml)_

- `pnpm build` - compiles all services
- `pnpm dev` - starts all services in watch mode in parallel, useful for a quick test but I'd recommend starting the services in their own consoles
- `pnpm test` - runs `test` script in all services

### Server

- more detailed dev steps [here](./services/server/README.md)
