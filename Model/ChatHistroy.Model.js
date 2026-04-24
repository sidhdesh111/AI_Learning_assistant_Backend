import mongoose from "mongoose";

const ChatHistorySchema = new mongoose.Schema({
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
    messages: [{
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

 ChatHistorySchema.index({ userId: 1, documentId: 1 });


const ChatHistoryModel = mongoose.model("ChatHistory", ChatHistorySchema);

export default ChatHistoryModel;


