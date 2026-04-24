import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema({
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
    title: {
        type: String,
        required: [true, "Quiz title is required"],
        trim: true
    },
    questions: [
        {
            question: {
                type: String,
                required: [true, "Question is required"],
                trim: true
            },
            options: {
                type: [String],
                required: [true, "Options are required"],
                validate: [array => array.length === 4, "Exactly 4 options are required"]
            },
            correctAnswer: {
                type: String,
                required: [true, "Correct answer is required"],
                trim: true
            },
            explanation: {
                type: String,
                trim: true
            },
            difficulty: {
                type: String,
                enum: ["easy", "medium", "hard"],
                default: "medium",
            }


        }],

    userAnswers: [
        {
            questionIndex: {
                type: Number,
                required: true
            },
            selectedOption: {
                type: String,
                required: true,
                trim: true
            },
            isCorrect: {
                type: Boolean,
                required: true
            },
            answeredAt: {
                type: Date,
                default: Date.now
            }

        }
    ],
    score: {
        type: Number,
        default: 0
    },
    totalQuestions: {
        type: Number,
        default: 0
    }, completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const QuizModel = mongoose.model("Quiz", QuizSchema);

export default QuizModel;