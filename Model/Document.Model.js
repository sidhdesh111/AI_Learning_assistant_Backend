import mongoose from "mongoose";


const DocumentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    title: {
        type: String,
        required: [true, "Document title is required"],
        trim: true
    },
    fileName: {
        type: String,
        required: [true, "File name is required"],
        trim: true
    },
    filePath: {
        type: String,
        required: [true, "File path is required"],
        trim: true
    },
    cloudinaryUrl: {
        type: String,
        default: null,
        trim: true
    },
    fileSize: {
        type: Number,
        required: [true, "File size is required"]
    },
    extractedText: {
        type: String,
        default: ""
    },
    chunks: [
        {
            content: {
                type: String,
                required: [true, "Chunk content is required"],
                trim: true
            },
            pageNumber: {
                type: Number,
                required: [true, "Page number is required"]
            },
            chunkIndex: {
                type: Number,
                required: [true, "Chunk index is required"]
            }
        }
    ],
    uploadDate: {
        type: Date,
        default: Date.now
    },
    lastAccessed: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["processing", "ready", "failed"],
        default: "processing"
    }
}, {
    timestamps: true
});

const DocumentModel = mongoose.model("Document", DocumentSchema);

export default DocumentModel;