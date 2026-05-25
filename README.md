# IMAGERIE

IMAGERIE is an AI-assisted image management platform for building a private, searchable, and editable visual library. It helps users preserve image collections with structured metadata, AI-generated descriptions, natural-language retrieval, lightweight editing, and account-level privacy.

This project was originally built as a university full-stack software design project and has been packaged as a portfolio-ready selected project with reproducible local deployment, documented environment variables, and a concise open-source workflow.

## Product Overview

The product is designed around a simple workflow: collect images, understand what they contain, find them again through search, and make quick edits without leaving the gallery.

<p align="center">
  <img src="images/%E4%B8%BB%E9%A1%B5.png" alt="IMAGERIE home gallery" width="60%" />
</p>

Unlike a folder-based image archive, IMAGERIE treats each image as a searchable asset. Every upload can carry technical metadata, visual context, custom tags, and AI-derived descriptions, making the gallery useful for both browsing and retrieval.

<p align="center">
  <img src="images/AI%E6%90%9C%E7%B4%A2.png" alt="AI search" width="48%" />
  <img src="images/%E5%A4%A7%E5%9B%BE.png" alt="Image detail" width="48%" />
</p>

The interface supports keyword search for known labels and AI-assisted natural-language search for exploratory queries. Detail pages combine the original image, EXIF information, location context when available, AI summaries, and editable user tags.

For quick post-processing, the built-in editor covers common crop and color adjustments so users can refine an image before returning it to the collection.

<p align="center">
  <img src="images/%E8%B0%83%E8%89%B2.png" alt="Color editor" width="60%" />
</p>

## Key Capabilities

- Private authenticated gallery with JWT-based account sessions.
- Image upload, thumbnail generation, deletion, carousel viewing, and profile management.
- EXIF extraction for dimensions, camera metadata, timestamps, and GPS-related data when available.
- AI vision analysis for categories, tags, scene summaries, objects, and natural-language search.
- Custom tags and detail pages for user-controlled organization.
- Browser-based crop and color adjustment for lightweight editing.

## Tech Stack

- Frontend: React, TypeScript, Vite, Zustand, Tailwind CSS, Framer Motion
- Backend: Node.js, Express, TypeScript, Prisma, JWT, Multer, Sharp, Exifr
- Database: MySQL 8
- AI and metadata: OpenRouter-compatible vision model, EXIF extraction, optional reverse geocoding
- Deployment: Docker Compose with separate frontend, backend, and MySQL services

## Architecture

```text
frontend/   React + Vite single-page application served by Nginx in Docker
backend/    Express API, authentication, uploads, metadata processing, AI search
database/   MySQL initialization script
images/     Product screenshots used by this README
```

## Quick Start With Docker

Docker Compose is the recommended way to review the project because it provisions the frontend, backend, and MySQL database together.

```bash
git clone https://github.com/arriettych/ZJU-25-BS.git
cd ZJU-25-BS
npm install
npm run docker:up
```

Open `http://localhost:8080` in your browser.

The API is exposed at `http://localhost:3001`, and MySQL is mapped to local port `3307` to avoid conflicts with a local MySQL installation.

To stop the services:

```bash
npm run docker:down
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- MySQL 8+
- Docker and Docker Compose, if using containerized deployment

### Environment

Create a backend environment file:

```bash
cp backend/.env.example backend/.env
```

Update `backend/.env` with your local database URL and optional third-party API keys. Do not commit real secrets.

Common backend variables:

```env
DATABASE_URL="mysql://root:password@localhost:3306/image_manager"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
OPENROUTER_API_KEY=""
OPENROUTER_MODEL="gpt-4o-mini"
AMAP_API_KEY=""
```

### Install And Run

```bash
npm install
npm run dev
```

Frontend runs on the Vite development server. Backend runs on `http://localhost:3001`.

### Database

For local development with an existing MySQL instance:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

For Docker deployment, database initialization and Prisma migration are handled by `docker-compose.yml`.

## Available Scripts

```bash
npm run dev             # Start frontend and backend in development mode
npm run build           # Build backend and frontend
npm run docker:up       # Start the Docker Compose stack
npm run docker:down     # Stop the Docker Compose stack
npm run docker:logs     # Follow Docker Compose logs
```

## Code Quality

- TypeScript is used across the frontend and backend.
- Prisma owns database schema changes and migration generation.
- Environment variables are documented in `backend/.env.example`.
- Runtime uploads, build outputs, dependencies, logs, and local environment files are ignored by Git.
- Public documentation and user-facing copy are written in English for portfolio and open-source review.

## Security Notes

- Replace `JWT_SECRET` before any non-local deployment.
- Do not commit `.env` files or real API keys.
- Uploaded images are stored under the backend upload directory and should be backed by persistent storage in production.
- The Docker Compose configuration is intended for local review and portfolio demonstration, not as a hardened production deployment.

## License

This project is intended for educational and portfolio use.