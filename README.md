# Derp AI — AI Model Comparison Chat App

[![logo](./services/web/public/png/derp_ai_icon_32x32.png)](./services/web/public/png/derp_ai_icon_32x32.png)
[![build](https://github.com/petarzarkov/derp.ai/actions/workflows/build.yml/badge.svg?branch=main)](https://github.com/petarzarkov/derp.ai/actions)
[![license](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Derp AI is a real-time chat platform that **streams responses from multiple AI models at once**, enabling **side-by-side model comparison**. It runs on a **full-stack TypeScript monorepo** using NestJS for the backend and Vite + React for the frontend and pnpm for repo and package management.

🌐 **Deployed here**: [https://derp.ai.petarzarkov.com/](https://derp.ai.petarzarkov.com/)

## 🔑 Key Features

- **Simultaneous AI Responses** – Sends each prompt to 4 AI models in parallel and streams all responses back in real-time.
- **Deployed on Google Cloud Run** – Scalable, serverless backend powered by NestJS - websockets, passport session, express session store + cookies, helmet (cqrs), cors
  - Session store module - [services/server/app/modules/session/session.store.ts](./services/server/app/modules/session/session.store.ts), basically https://www.npmjs.com/package/connect-pg-simple but the NestJS way
  - Redis used for caching your latest 10 prompts and answers
- **Fast Frontend** – Built with Vite, React, and Chakra UI.
- **Secure Auth** – OAuth logins via Google, LinkedIn, and more.
- **Extendable AI Support** – Easily plug in more models.
- **CI/CD** - versioning, docker, slack notifications, cloud logs

## 🧠 Current Models (can be extended)

- `gemini-2.0-flash`
- `gemini-2.5-pro-exp-03-25`
- `llama-3.3-70b-versatile`
- `deepseek/deepseek-chat-v3-0324:free`

## 📦 Monorepo Structure

- `services/common` – Shared types
- `services/server` – NestJS backend (WebSockets + AI orchestration)
- `services/web` – Vite + React frontend
- `services/mobile` – React Native placeholder (not yet implemented) [branch for it here](https://github.com/petarzarkov/derp.ai/tree/add-mobile-support)
- `services/desktop` – Electron placeholder (not yet implemented) [branch for it here](https://github.com/petarzarkov/derp.ai/tree/attempt-to-add-electron)

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 22
- pnpm ≥ 10
- Docker + Docker Compose
- PostgreSQL (or use Docker)
- Git

### Setup

```bash
git clone https://github.com/petarzarkov/derp.ai.git
cd derp.ai
pnpm install
cp .env .env.dev  # Then fill in keys for Gemini, Groq, OpenRouter, etc.
```

### Development

- Start redis + DB with Docker

```bash
docker-compose up -d

# Run both frontend and backend in watch mode
pnpm dev
```

Or separately:

```bash
pnpm --filter server dev
pnpm --filter web dev
```

## 🐳 Docker Deployment

To build and run the backend manually via Docker:

```bash
docker build -t derpai-server .
docker run -p 3033:3033 --env-file .env derpai-server
```
