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
