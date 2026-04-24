import QuizModel from "../Model/Quiz.Model.js";

export const getQuizzes = async (req, res, next) => {
    try {
        const quizzes = await QuizModel.find({
            userId: req.user._id,
            documentId: req.params.documentId,
        })
            .populate("documentId", "title fileName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: quizzes,
            count: quizzes.length,
        });
    } catch (error) {
        next(error);
    }
};

export const submitQuiz = async (req, res, next) => {
    try {
        const { answers } = req.body;

        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of answers",
                statusCode: 400,
            });
        }

        const quiz = await QuizModel.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found",
                statusCode: 404,
            });
        }

        if (quiz.completedAt) {
            return res.status(400).json({
                success: false,
                message: "Quiz already completed",
                statusCode: 400,
            });
        }

        let correctCount = 0;
        const userAnswers = [];

        answers.forEach((answer) => {
            const { questionIndex, selectedOption } = answer;

            if (questionIndex >= 0 && questionIndex < quiz.questions.length) {
                const question = quiz.questions[questionIndex];
                const isCorrect = question.correctAnswer === selectedOption;

                if (isCorrect) correctCount++;

                userAnswers.push({
                    questionIndex,
                    selectedOption,
                    isCorrect,
                    answeredAt: new Date(),
                });
            }
        });

        const score = Math.round((correctCount / quiz.questions.length) * 100);

        quiz.userAnswers = userAnswers;
        quiz.score = score;
        quiz.completedAt = new Date();
        await quiz.save();

        res.status(200).json({
            success: true,
            data: {
                score,
                correctCount,
                totalQuestions: quiz.questions.length,
                quizId: quiz._id,
                percentage: score,
                userAnswers,
            },
            message: "Quiz submitted successfully.",
        });
    } catch (error) {
        next(error);
    }
};

export const getQuizById = async (req, res, next) => {
    try {
        const quiz = await QuizModel.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found",
                statusCode: 404,
            });
        }
        res.status(200).json({
            success: true,
            data: quiz,
            message: "Quiz retrieved successfully.",
            count: quiz.length,
        });
    } catch (error) {
        next(error);
    }
};

export const getQuizResults = async (req, res, next) => {
    try {
        const quiz = await QuizModel.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found",
                statusCode: 404,
            });
        }
        if (!quiz.completedAt) {
            return res.status(400).json({
                success: false,
                message: "Quiz not completed yet",
                statusCode: 400,
            });
        }

        const detailedResults = quiz.questions.map((question, index) => {
            const userAnswer = quiz.userAnswers.find(
                (a) => a.questionIndex === index,
            );

            return {
                questionIndex: index,
                question: question.question,
                options: question.options,
                correctAnswer: question.correctAnswer,
                selectedAnswer: userAnswer ? userAnswer.selectedAnswer : null,
                isCorrect: userAnswer ? userAnswer.isCorrect : false,
                explanation: question.explanation || null,
            };
        });

        res.status(200).json({
            success: true,
            data: {
                quiz: {
                    _id: quiz._id,
                    title: quiz.title,
                    documentId: quiz.documentId,
                    score: quiz.score,
                    totalQuestions: quiz.totalQuestions,
                    completedAt: quiz.completedAt,
                },
                detailedResults: detailedResults,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteQuiz = async (req, res, next) => {
    try {

        const quiz = await QuizModel.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found",
                statusCode: 404
            })
        }

        await quiz.deleteOne();

        res.status(200).json({
            success: true,
            message: "Quiz deleted successfully."
        });

    } catch (error) {
        next(error);
    }
};
