# GBS Publication Platform

Backend-first foundation for the book publication platform described in the 2026 blueprint.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Clerk-ready authentication boundary
- S3-compatible storage boundary, with Cloudflare R2 support and MinIO for local development
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

The API starts on `http://localhost:3000/api`.
Swagger docs run at `http://localhost:3000/api/docs`.

## Storage

The file upload layer uses the AWS S3 SDK with a configurable endpoint, so it works with MinIO locally and Cloudflare R2 for hosted storage.

For local MinIO, keep the default `S3_*` values from `.env.example`.

For Cloudflare R2, create a bucket and an R2 S3 API token in Cloudflare, then set:

```env
S3_ENDPOINT=https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=<R2_BUCKET_NAME>
S3_ACCESS_KEY=<R2_ACCESS_KEY_ID>
S3_SECRET_KEY=<R2_SECRET_ACCESS_KEY>
S3_FORCE_PATH_STYLE=false
```

Cloudflare documents R2 as S3-compatible. Its S3 API endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, and the R2 bucket region is `auto`.

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
