import pino from "pino";

/**
 * Configure Pino logger
 * - In production: Output structured JSON (ideal for Google Cloud Logging)
 * - In development: Use pino-pretty for readable logs if available (optional)
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
