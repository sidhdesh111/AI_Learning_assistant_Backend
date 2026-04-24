import multer from "multer";
import path from "path";
import fs from "fs";

export const createUpload = (folderName = "") => {
    const uploadPath = path.join("uploads", folderName);

    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
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