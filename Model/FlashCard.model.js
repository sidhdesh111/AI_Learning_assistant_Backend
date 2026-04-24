import mongoose from "mongoose";

const FlashCardSchema = new mongoose.Schema({
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
    cards: [
        {
            question: {
                type: String,
                required: [true, "Question is required"],
                trim: true
            },
            answer: {
                type: String,
                required: [true, "Answer is required"],
                trim: true
            },
            difficulty: {
                type: String,
                enum: ["easy", "medium", "hard"],
                default: "medium",
            },
            lastReviewed: {
                type: Date,
                default: null
            },
            reviewCount: {
                type: Number,
                default: 0
            },
            isStarred: {
                type: Boolean,
                default: false
            },
        }
    ]
}, {
    timestamps: true
});

const FlashCardModel = mongoose.model("FlashCard", FlashCardSchema);

export default FlashCardModel;
