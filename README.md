# IMAGERIE

IMAGERIE is an AI-assisted image management platform for people who want a private, searchable, and editable visual library. It combines gallery organization, metadata extraction, AI-generated descriptions, natural-language search, lightweight editing, and account management in one full-stack web application.

This project was originally built as a university full-stack software design project and has been packaged as a portfolio-ready selected project with reproducible local deployment, documented environment variables, and a concise open-source workflow.

## Product Preview

The product experience is designed around a focused workflow: upload visual assets, organize them with metadata and tags, retrieve them through search, and make lightweight edits without leaving the gallery.

### Gallery And Upload

<p>
  <img src="images/%E4%B8%BB%E9%A1%B5.png" alt="Home gallery" width="49%" />
  <img src="images/%E4%B8%8A%E4%BC%A0.png" alt="Upload flow" width="49%" />
</p>

### Search And Discovery

<p>
  <img src="images/AI%E6%90%9C%E7%B4%A2.png" alt="AI search" width="49%" />
  <img src="images/%E6%99%AE%E9%80%9A%E6%90%9C%E7%B4%A2.png" alt="Standard search" width="49%" />
</p>

### Metadata And Organization

<p>
  <img src="images/%E5%A4%A7%E5%9B%BE.png" alt="Image detail" width="49%" />
  <img src="images/%E6%A0%87%E7%AD%BE.png" alt="Tag management" width="49%" />
</p>

### Editing Workspace

<p>
  <img src="images/%E8%A3%81%E5%89%AA.png" alt="Crop editor" width="49%" />
  <img src="images/%E8%B0%83%E8%89%B2.png" alt="Color editor" width="49%" />
</p>

### Presentation And Settings

<p>
  <img src="images/%E8%BD%AE%E6%92%AD.png" alt="Carousel view" width="49%" />
  <img src="images/%E7%94%A8%E6%88%B7%E8%AE%BE%E7%BD%AE.png" alt="User settings" width="49%" />
</p>

## What It Does

- Stores personal images in a private authenticated gallery.
- Extracts core image metadata, including size, dimensions, EXIF data, and GPS-related information when available.
- Uses AI vision analysis to generate categories, tags, descriptions, objects, and scene summaries.
- Supports keyword search and AI-assisted natural-language search across the image collection.
- Provides custom tags, image detail views, deletion flows, and a carousel presentation mode.
- Includes browser-based crop and color adjustments for quick visual edits.
- Offers profile management, avatar upload, email update, password update, and JWT-based authentication.

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