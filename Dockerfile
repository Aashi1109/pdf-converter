# --- Build Stage ---
FROM node:24-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy config files
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Install ALL dependencies (including devDeps for tsc)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN pnpm build

# --- Production Stage ---
FROM node:24-slim AS runner

# Install system dependencies for Pandoc & Typst
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    xz-utils \
    fontconfig \
    fonts-noto-color-emoji \
    fonts-noto-core \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm for production install
RUN npm install -g pnpm

# Install Pandoc 3.9
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then DEB_ARCH="amd64"; else DEB_ARCH="arm64"; fi && \
    wget https://github.com/jgm/pandoc/releases/download/3.9/pandoc-3.9-1-${DEB_ARCH}.deb \
    && dpkg -i pandoc-3.9-1-${DEB_ARCH}.deb \
    && rm pandoc-3.9-1-${DEB_ARCH}.deb

# Install Typst 0.14.2
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then TYPST_ARCH="x86_64-unknown-linux-musl"; else TYPST_ARCH="aarch64-unknown-linux-musl"; fi && \
    wget https://github.com/typst/typst/releases/download/v0.14.2/typst-${TYPST_ARCH}.tar.xz \
    && tar -xvf typst-${TYPST_ARCH}.tar.xz \
    && mv typst-${TYPST_ARCH}/typst /usr/local/bin/ \
    && rm -rf typst-${TYPST_ARCH}*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Start using the compiled JavaScript
CMD [ "pnpm", "serve" ]
