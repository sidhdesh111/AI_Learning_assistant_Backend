import express from "express";
import { deleteQuiz, getQuizById, getQuizResults, getQuizzes, submitQuiz } from "../Controller/quizController.js";
import { protectedMiddleware } from "../Middleware/auth.js";

const quizRouter = express.Router();


quizRouter.use(protectedMiddleware);

// More specific routes MUST come before general routes
quizRouter.get("/quiz/:id", getQuizById);

quizRouter.post("/:id/submit", submitQuiz);

quizRouter.get("/:id/results", getQuizResults);

quizRouter.delete("/:id", deleteQuiz);

// General route for getting quizzes by documentId
quizRouter.get("/:documentId", getQuizzes);

export default quizRouter;