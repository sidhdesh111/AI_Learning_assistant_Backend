import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

export const createUpload = (folderName = "") => {
    const isServerless = !!process.env.VERCEL;
    const baseUploadDir = isServerless
        ? path.join(os.tmpdir(), "uploads")
        : path.join(process.cwd(), "uploads");
    const uploadPath = path.join(baseUploadDir, folderName);

    const ensureUploadDir = () => {
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
    };

    // Ensure directory exists at startup (safe in local and serverless temp dir).
    ensureUploadDir();

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            try {
                ensureUploadDir();
            } catch (error) {
                return cb(error);
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix =
                Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(
                null,
                file.fieldname +
                    "-" +
                    uniqueSuffix +
                    path.extname(file.originalname)
            );
        },
    });

    const fileFilter = (req, file, cb) => {
        // Only allow PDF files
        if (file.mimetype !== "application/pdf") {
            cb(new Error("Only PDF files are allowed"));
        } else {
            cb(null, true);
        }
    };

    return multer({ 
        storage,
        fileFilter,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
        }
    });
};