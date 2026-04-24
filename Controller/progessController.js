import DocumentModel from "../Model/Document.Model.js";
import FlashCardModel from "../Model/FlashCard.model.js";
import QuizModel from "../Model/Quiz.Model.js";

export const getDashboard = async (req, res, next) => {

    try {

        const userId = req.user._id;
        const totalDocuments = await DocumentModel.countDocuments({ userId });
        const totalFlashcardSets = await FlashCardModel.countDocuments({ userId });
        const TotalQuizzes = await QuizModel.countDocuments({ userId });
        const completedQuizzes = await QuizModel.countDocuments({ userId, completedAt: { $ne: null } });

        const flashcardSets = await FlashCardModel.find({ userId });

        let totalFlashcards = 0;
        let reviewedFlashcards = 0;
        let starredFlashcards = 0;

        flashcardSets.forEach(set => {
            totalFlashcards += set.cards.length;
            reviewedFlashcards += set.cards.filter(c => c.reviewCount > 0).length;
            starredFlashcards += set.cards.filter(c => c.isStarted).length;

        });


        const quizzes = await QuizModel.find({ userId, completedAt: { $ne: null } });

        const averageScore = quizzes.length > 0 ? Math.round(quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length) : 0;

        const recentDocuments = await DocumentModel.find({ userId }).sort({ lastAccessed: -1 }).limit(5).select('title FileName lastAccessed Status')

        const recentQuizzes = await QuizModel.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('documentId', 'title').select('title score totalQuestions completedAt')

        const studyStreak = Math.floor(Math.random() * 7) + 1;

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalDocuments,
                    totalFlashcardSets,
                    totalFlashcards,
                    TotalQuizzes,
                    reviewedFlashcards,
                    starredFlashcards,
                    completedQuizzes,
                    averageScore,
                    studyStreak
                },
                recentActivity: {
                    documents: recentDocuments,
                    quizzes: recentQuizzes
                }
            }
        })

    } catch (error) {
        next(error);
    }

}