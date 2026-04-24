import mongoose from "mongoose";
import FlashCardModel from "../Model/FlashCard.model.js";

export const getFlashcards = async (req, res, next) => {
  try {
    const flashcards = await FlashCardModel.find({
      userId: req.user._id,
      documentId: req.params.documentId,
    })
      .populate("documentId", "title fileName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: flashcards,
    });
  } catch (error) {
    next(error);
  }
};



export const getFlashcardSetById = async (req, res, next) => {
  try {
    const flashcardSet = await FlashCardModel.findOne({
      _id: req.params.setId,
      userId: req.user._id,
    }).populate("documentId", "title fileName");

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        message: "Flashcard set not found",
        statusCode: 404,
      });
    }

    res.status(200).json({
      success: true,
      data: [flashcardSet],
    });
  } catch (error) {
    next(error);
  }
};

export const getAllFlashcardSets = async (req, res, next) => {
  try {
    const flashcardSets = await FlashCardModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "documents",
          localField: "documentId",
          foreignField: "_id",
          as: "documentId",
        },
      },
      {
        $unwind: {
          path: "$documentId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          documentId: {
            _id: "$documentId._id",
            title: "$documentId.title",
            fileName: "$documentId.fileName",
          },
          cards: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: flashcardSets.length,
      data: flashcardSets,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewFlashcard = async (req, res, next) => {
  try {
    const flashcardSet = await FlashCardModel.findOne({
      "cards._id": req.params.cardId,
      userId: req.user._id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        message: "Flashcard set not found",
        statusCode: 404,
      });
    }

    const cardIndex = flashcardSet.cards.findIndex(
      (card) => card._id.toString() === req.params.cardId,
    );

    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
        statusCode: 404,
      });
    }

    flashcardSet.cards[cardIndex].reviewed = new Date();
    flashcardSet.cards[cardIndex].reviewCount += 1;

    await flashcardSet.save();

    res.status(200).json({
      success: true,
      data: flashcardSet,
      message: "Flashcard reviewed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStarFlashcard = async (req, res, next) => {
  try {
    const flashcardSet = await FlashCardModel.findOne({
      "cards._id": req.params.cardId,
      userId: req.user._id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        message: "Flashcard set not Found",
        statusode: 404,
      });
    }

    const cardIndex = flashcardSet.cards.findIndex(
      (card) => card._id.toString() === req.params.cardId,
    );

    if (cardIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not Found",
        statusCode: 404,
      });
    }

    flashcardSet.cards[cardIndex].isStarred =
      !flashcardSet.cards[cardIndex].isStarred;
    await flashcardSet.save();
    res.status(200).json({
      success: true,
      data: flashcardSet,
      message: flashcardSet.cards[cardIndex].isStarred
        ? "Flashcard starred successfully"
        : "Flashcard unstarred successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFlashcardSet = async (req, res, next) => {
  try {
    const flashcardSet = await FlashCardModel.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        message: "Flashcard set not Found",
        statusCode: 404,
      });
    }

    await flashcardSet.deleteOne();

    res.status(200).json({
      success: true,
      message: "Flashcard set deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
