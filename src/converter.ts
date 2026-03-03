import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger.js";
import { ConversionError } from "./errors.js";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Supported input formats.
 */
export type InputFormat = "markdown" | "html";

/**
 * Convert HTML or Markdown content to a PDF buffer using Pandoc + Typst.
 * @param content - Input text string.
 * @param format - 'markdown' or 'html'.
 * @returns - A Buffer containing the PDF data.
 */
export async function convertToPdf(
  content: string,
  format: InputFormat,
): Promise<Buffer> {
  const tempDir = path.join(__dirname, "../temp");
  await fs.ensureDir(tempDir);

  const fileId = uuidv4();
  const inputExt = format === "markdown" ? "md" : "html";
  const inputFile = path.join(tempDir, `${fileId}.${inputExt}`);
  const outputFile = path.join(tempDir, `${fileId}.pdf`);

  logger.debug({ fileId, format }, "Preparing temporary files for conversion");

  try {
    // 1. Write the content to a temporary file.
    await fs.writeFile(inputFile, content);

    // 2. Execute Pandoc with Typst engine.
    const command = `pandoc "${inputFile}" --pdf-engine=typst -o "${outputFile}"`;

    logger.debug({ command }, "Executing pandoc command");
    const startTime = Date.now();
    await execAsync(command);
    const duration = Date.now() - startTime;

    logger.info(
      { fileId, durationMs: duration },
      "Pandoc conversion completed",
    );

    // 3. Read the generated PDF into memory as a Buffer.
    const pdfBuffer = await fs.readFile(outputFile);
    return pdfBuffer;
  } catch (error: any) {
    logger.error({ err: error, fileId }, "Pandoc conversion failed");
    throw new ConversionError(`PDF conversion failed: ${error.message}.`);
  } finally {
    // 4. Cleanup temporary files regardless of success or failure.
    logger.debug({ fileId }, "Cleaning up temporary files");
    await Promise.all([
      fs
        .remove(inputFile)
        .catch((err) =>
          logger.warn({ err, fileId }, "Cleanup warning (input)"),
        ),
      fs
        .remove(outputFile)
        .catch((err) =>
          logger.warn({ err, fileId }, "Cleanup warning (output)"),
        ),
    ]);
  }
}
