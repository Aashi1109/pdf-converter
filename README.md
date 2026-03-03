# PDF Converter (TypeScript + pnpm + Node 24)

A high-performance, browser-less PDF converter designed for Google Cloud Run. It converts **Markdown** or **HTML** to professional-grade PDFs using the **Typst** engine (via **Pandoc**) and stores the result in **Cloudinary**.

## Why this project?

- **TypeScript Native**: Full type safety and modern ESM support.
- **Node.js 24**: Leverages the latest LTS performance and features.
- **pnpm**: Fast, disk-efficient package management.
- **No Chrome**: Avoids the heavy resource usage (2GB+) and cold-start delays of headless browsers.
- **Typst Engine**: Written in Rust, generating beautiful PDFs in milliseconds.

## Prerequisites

- A **Cloudinary** account (Cloud Name, API Key, API Secret, and an **Upload Preset**).
- (Optional) Local installation of [Pandoc (3.0+)](https://pandoc.org/installing.html) and [Typst (0.10+)](https://github.com/typst/typst/releases) only for local testing.

## Local Setup

1. **Clone/Create project**.
2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure environment**:
   Copy `.env.example` to `.env` and fill in your Cloudinary credentials.
4. **Run the server (dev mode)**:

   ```bash
   pnpm dev
   ```

## API Usage

### Convert Content

**Endpoint**: `POST /convert`

**Body**:

```json
{
  "content": "# Hello World\nThis is a markdown sample.",
  "format": "markdown",
  "upload": false 
}
```

*Note: `format` is required (must be 'markdown' or 'html'). `upload` is optional (default `true`). If set to `false`, the API directly returns the binary PDF file instead of a JSON response with a URL.*

**Response**:

```json
{
  "success": true,
  "cdn_url": "https://res.cloudinary.com/your_cloud/pdf-export-uuid.pdf",
  "format_used": "markdown"
}
```

## Deployment to Google Cloud Run

1. **Build and Tag Image**:

   ```bash
   gcloud builds submit --tag gcr.io/[PROJECT-ID]/pdf-converter
   ```

2. **Deploy to Cloud Run**:

   ```bash
   gcloud run deploy pdf-converter \
     --image gcr.io/[PROJECT-ID]/pdf-converter \
     --platform managed \
     --set-env-vars CLOUDINARY_CLOUD_NAME=xxx,CLOUDINARY_API_KEY=xxx,CLOUDINARY_API_SECRET=xxx,CLOUDINARY_UPLOAD_PRESET=xxx
   ```

## Project Structure

- `index.ts`: TypeScript Express server with ESM.
- `src/converter.ts`: Logic for invoking the Pandoc/Typst CLI safely.
- `src/storage.ts`: TypeScript interface for Cloudinary.
- `Dockerfile`: Optimized for Node 24 + pnpm, includes self-installing multi-arch binaries for Pandoc 3.9 and Typst 0.14.2.
