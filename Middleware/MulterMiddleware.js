import multer from "multer";
import path from "path";
import fs from "fs";
import { getUploadBaseDir, ensureUploadBaseDir } from "../config/uploadPaths.js";

export const createUpload = (folderName = "") => {
    const baseUploadDir = ensureUploadBaseDir();
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
        const name = (file.originalname || "").toLowerCase();
        const type = (file.mimetype || "").toLowerCase();
        const isPdfName = name.endsWith(".pdf");
        const isPdfMime =
            type === "application/pdf" ||
            type === "application/x-pdf" ||
            type.includes("pdf");
        if (isPdfName || isPdfMime) {
            return cb(null, true);
        }
        cb(new Error("Only PDF files are allowed"));
    };

    return multer({ 
        storage,
        fileFilter,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
        }
    });
};