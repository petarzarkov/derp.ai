## NestJS Server

### Running the App

1.  **Start the development server (with hot-reloading):**

    ```bash
    pnpm dev
    ```

    The API will be available at `http://localhost:<SERVICE_PORT>` (default: `http://localhost:3033`).

2.  **Access Swagger UI:**
    Open `http://localhost:<SERVICE_PORT>/api` in your browser (default: `http://localhost:3033/api`).

### Running Tests

- **Unit Tests:**
  ```bash
  pnpm test:unit
  ```
- **Integration Tests:** (Requires running database)
  ```bash
  pnpm test:integration
  ```
- **Run a Specific Test File/Suite:** (Uses Jest pattern matching)

  ```bash
  # Example: Run all tests in my-test.service.spec.ts
  pnpm test:unit -- my-test.service

  # Example: Run all tests in the auth directory
  pnpm test:unit -- auth/
  ```

- **Run All Tests with Coverage:**
  ```bash
  pnpm test
  ```
  _(Coverage reports are generated in the `coverage/` directory)_

### Build for Production

```bash
pnpm build
```

_(This compiles TypeScript to JavaScript in the `build` folder)_

## Docker

1.  **Build the Docker image:**

    ```bash
    # You can override the default port during build if needed
    docker build --build-arg SERVICE_PORT=3033 -t js-template-server .
    ```

2.  **Run the container:**
    - **Ensure PostgreSQL is accessible:** The container needs access to a PostgreSQL database. You can run the DB via `docker-compose up -d` first, or connect to an external one.
    - **Using Docker Network (if using `docker-compose` for DB):**
      ```bash
      # docker-compose created a network named 'template' (check with 'docker network ls')
      # and the DB container is named 'pgdb-template'
      docker run --rm -it --name js-template-server \
        -p 3033:3033 \
        --network template \
        -e SERVICE_PORT=3033 \
        -e DB_HOST=pgdb-template \
        -e DB_PORT=6571 \
        -e DB_USER=postgres \
        -e DB_PASS=postgres \
        -e DB_NAME=postgres \
        js-template-server
      ```
    - **Connecting to DB on Host Machine (Example):**
      Use `host.docker.internal` as `DB_HOST` on Docker Desktop (Windows/Mac). On Linux, use `--network host` or the host's IP address on the Docker bridge network.
      ```bash
      # Example for Docker Desktop (adjust DB params as needed)
      docker run --rm -it --name js-template-server \
        -p 3033:3033 \
        -e SERVICE_PORT=3033 \
        -e DB_HOST=host.docker.internal \
        -e DB_PORT=6571 \
        js-template-server
      ```
