import mongoose from "mongoose";
import crypto from "crypto";

const ContentCacheSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true
    },
    contentType: {
        type: String,
        enum: ["flashcard", "quiz", "summary"],
        required: true
    },
    contentHash: {
        type: String,
        required: true,
        index: true
    },
    originalContent: {
        type: String,
        required: true
    },
    similarity: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    isDuplicate: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for quick lookups by document and content type
ContentCacheSchema.index({ documentId: 1, contentType: 1 });
ContentCacheSchema.index({ userId: 1, documentId: 1 });

const ContentCacheModel = mongoose.model("ContentCache", ContentCacheSchema);

export default ContentCacheModel;
