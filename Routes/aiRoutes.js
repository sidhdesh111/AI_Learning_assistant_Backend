import express from "express";
import { chat, explainConcept, generateFlashcards, generateQuiz, generateSummary, getChatHistory } from "../Controller/aiController.js";
import { protectedMiddleware } from "../Middleware/auth.js";

const airouter = express.Router();

airouter.use(protectedMiddleware);

airouter.post("/generate-flashcards", generateFlashcards)
airouter.post("/generate-quiz", generateQuiz)
airouter.post("/generate-summary", generateSummary)
airouter.post("/chat", chat)
airouter.post("/explain-concept", explainConcept)
airouter.get("/chat-history/:documentId", getChatHistory)
export default airouter;