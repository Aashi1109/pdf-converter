import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
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
