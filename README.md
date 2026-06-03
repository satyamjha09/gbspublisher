# GBS Publication Platform

Backend-first foundation for the book publication platform described in the 2026 blueprint.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Clerk-ready authentication boundary
- S3-compatible storage boundary, with MinIO for local development
- Docker Compose for local infrastructure

## First Run

```bash
npm install
copy .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
```

The API starts on `http://localhost:4000/api`.
Swagger docs run at `http://localhost:4000/api/docs`.

## Sprint 1 Features

- Clerk middleware and authenticated `GET /api/users/me`
- `POST /api/users/become-author`
- Protected author project CRUD under `/api/projects`
- Edition CRUD under `/api/projects/:projectId/editions`
- Signed upload creation with `POST /api/files/uploads`
- Upload completion with `POST /api/files/:id/complete`
- Redis/BullMQ file-processing jobs handled by `npm run dev:worker`
- Admin review/publish flow under `/api/admin/projects`
- Public published-book catalog under `/api/catalog/books`
- Dev checkout, reader library, and royalty ledger under `/api/orders`
- Reader open/progress/bookmark/highlight APIs under `/api/reader`
- Public reviews and rating stats under `/api/reviews`
- Admin review moderation under `/api/admin/reviews`
