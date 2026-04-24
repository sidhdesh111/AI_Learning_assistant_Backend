import {v2 as cloudinary} from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: "AI_Learning_Assistant/",
            use_filename: true,
            unique_filename: false
        });
        return result.secure_url;
    } catch (error) {
        throw error;
    }
}

export const deleteFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) return;
        
        // Extract public_id from the Cloudinary URL
        // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234/folder/filename.jpg
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const publicId = `${folder}/${fileName}`;
        
        await cloudinary.uploader.destroy(publicId);
        console.log(`Image deleted successfully: ${publicId}`);
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        throw error;
    }
}
