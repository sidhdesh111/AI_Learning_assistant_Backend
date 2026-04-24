import express from "express";
import {
  deleteFlashcardSet,
  getAllFlashcardSets,
  getFlashcards,
  getFlashcardSetById,
  reviewFlashcard,
  toggleStarFlashcard,
} from "../Controller/flashcardController.js";
import { protectedMiddleware } from "../Middleware/auth.js";

const flashcardRouter = express.Router();

flashcardRouter.use(protectedMiddleware);

flashcardRouter.get("/", getAllFlashcardSets);
flashcardRouter.get("/set/:setId", getFlashcardSetById);
flashcardRouter.get("/:documentId", getFlashcards);
flashcardRouter.post("/:cardId/review", reviewFlashcard);
flashcardRouter.put("/:cardId/star", toggleStarFlashcard);
flashcardRouter.delete("/:id", deleteFlashcardSet);

export default flashcardRouter;
