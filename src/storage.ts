import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
// @ts-ignore
import { PixelbinConfig, PixelbinClient } from "@pixelbin/admin";
import { v4 as uuidv4 } from "uuid";
import { logger } from "./logger.js";
import { StorageError } from "./errors.js";

/**
 * Configure Cloudinary with environment variables
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Configure PixelBin with environment variables
 */
const pixelbinConfig = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  apiSecret: process.env.PIXELBIN_API_SECRET || "",
});
const pixelbin = new PixelbinClient(pixelbinConfig);

/**
 * Upload a PDF buffer to Cloudinary
 * @param buffer - PDF file buffer
 * @returns - The secure URL of the uploaded file
 */
export async function uploadToCloudinary(buffer: Buffer): Promise<string> {
  const publicId = `pdf-export-${uuidv4()}`;
  const publicIdWithExt = `${publicId}.pdf`;
  logger.info(
    { publicId: publicIdWithExt },
    "Uploading PDF to Cloudinary as raw",
  );

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // Using 'raw' as requested
        public_id: publicIdWithExt,
        access_mode: "public",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      },
      (error: any, result?: UploadApiResponse) => {
        if (error) {
          logger.error(
            { err: error, publicId: publicIdWithExt },
            "Cloudinary upload failed",
          );
          return reject(error);
        }
        if (!result) {
          logger.error(
            { publicId: publicIdWithExt },
            "Cloudinary upload returned no result",
          );
          return reject(
            new StorageError("Cloudinary upload returned no result."),
          );
        }

        logger.info(
          { publicId: publicIdWithExt, url: result.secure_url },
          "Cloudinary upload successful",
        );
        resolve(result.secure_url);
      },
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a PDF buffer to PixelBin
 * @param buffer - PDF file buffer
 * @returns - The secure URL of the uploaded file
 */
export async function uploadToPixelBin(buffer: Buffer): Promise<string> {
  const fileName = `pdf-export-${uuidv4()}`; // No extension here
  const path = process.env.PIXELBIN_ZONE || "default";

  logger.info(
    { fileName, path },
    "Uploading PDF to PixelBin using uploader.upload",
  );

  try {
    // PixelBin appends the 'format' to the 'name'.
    // If we provide 'fileName.pdf' and format 'pdf', we get '.pdf.pdf'
    const result = await pixelbin.uploader.upload({
      file: buffer,
      path: path,
      name: fileName,
      format: "pdf", // This will append .pdf to the name
      overwrite: true,
    });

    // The SDK's upload method returns the axios response from the completion call
    const asset = result;

    if (!asset || !asset.url) {
      logger.error(
        { result: result.data },
        "PixelBin upload returned no URL in data",
      );
      throw new StorageError("PixelBin upload returned no result.");
    }

    logger.info({ fileName, url: asset.url }, "PixelBin upload successful");
    return asset.url;
  } catch (error: any) {
    logger.error({ err: error, fileName }, "PixelBin upload failed");
    throw new StorageError(`PixelBin upload failed: ${error.message}`);
  }
}

/**
 * Generic upload function that selects provider based on environment variable
 * @param buffer - PDF file buffer
 * @returns - The secure URL of the uploaded file
 */
export async function uploadFile(buffer: Buffer): Promise<string> {
  const provider = process.env.STORAGE_PROVIDER || "pixelbin";

  if (provider === "cloudinary") {
    return uploadToCloudinary(buffer);
  } else if (provider === "pixelbin") {
    return uploadToPixelBin(buffer);
  } else {
    throw new StorageError(`Unsupported storage provider: ${provider}`);
  }
}
