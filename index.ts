import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { JSONSchemaType } from "ajv";

import { logger } from "./src/logger.js";
import { convertToPdf, InputFormat } from "./src/converter.js";
import { uploadFile } from "./src/storage.js";
import { AppError, ValidationError } from "./src/errors.js";
import { validateBody } from "./src/middleware.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Automatic request/response logging
app.use(pinoHttp({ logger }));

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/", (_req, res) => {
  res.json({
    message:
      "Welcome to PDF Converter API. Use /convert to convert your Markdown or HTML to PDF.",
  });
});

/**
 * Interface for the POST request body.
 */
interface ConvertRequest {
  content: string;
  format: InputFormat;
  upload?: boolean; // Default to true, if false directly send the PDF
}

const convertSchema: JSONSchemaType<ConvertRequest> = {
  type: "object",
  properties: {
    content: { type: "string", minLength: 1 },
    format: { type: "string", enum: ["markdown", "html"] },
    upload: { type: "boolean", nullable: true },
  },
  required: ["content", "format"],
  additionalProperties: false,
};

/**
 * POST /convert
 * params: { content: string, format: 'markdown' | 'html' }
 * returns: { cdn_url: string }
 */
app.post(
  "/convert",
  validateBody(convertSchema),
  async (req: Request<{}, {}, ConvertRequest>, res: Response, next: any) => {
    try {
      const { content, format, upload = true } = req.body;

      logger.info({ format, upload }, "Starting conversion request");

      // 1. Convert to PDF using Pandoc + Typst.
      const pdfBuffer = await convertToPdf(content, format);

      if (upload === false) {
        logger.info("Direct response mode: sending buffer");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=converted.pdf");
        return res.send(pdfBuffer);
      }

      // 2. Upload generated buffer to storage provider.
      const cdnUrl = await uploadFile(pdfBuffer);

      logger.info({ cdnUrl }, "File uploaded successfully");

      // 3. Return the secure URL and other metadata.
      res.json({
        success: true,
        cdn_url: cdnUrl,
        format_used: format,
      });
    } catch (error: any) {
      next(error);
    }
  },
);

/**
 * Global Error Handling Middleware
 */
app.use((err: any, _req: Request, res: Response, _next: any) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  logger.error({ err }, "Global Error Handler Caught Error");

  res.status(statusCode).json({
    success: false,
    error: {
      name: err.name || "AppError",
      message: message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
