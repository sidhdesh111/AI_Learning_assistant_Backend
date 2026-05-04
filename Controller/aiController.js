import ChatHistoryModel from "../Model/ChatHistroy.Model.js";
import DocumentModel from "../Model/Document.Model.js";
import FlashCardModel from "../Model/FlashCard.model.js";
import QuizModel from "../Model/Quiz.Model.js";
import { chatWithContext, explanationConcept, generatingFlashcards, generatingQuiz, generatingSummary } from "../Utils/geminiServer.js";
import { findReleventChunks } from "../Utils/textChunker.js";

export const generateFlashcards = async (req, res, next) => {
  try {

    const { documentId, count = 30 } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400
      })
    }

    const document = await DocumentModel.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready"
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not Found or not ready",
        statusCode: 404
      })
    }

    const cards = await generatingFlashcards(document.extractedText, parseInt(count), req.user._id, document._id);

    const flashcardSet = await FlashCardModel.create({
      userId: req.user._id,
      documentId: document._id,
      cards: cards.map(card => ({
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        reviewCount: 0,
        isStarted: false,
      }))
    });


    res.status(200).json({
      success: true,
      data: flashcardSet,
      message: "Flashcards generated successfully."
    });


  } catch (error) {
    next(error);
  }
};

export const generateQuiz = async (req, res, next) => {
  try {

    const { documentId, numQuestions = 50 } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400
      })
    }

    const document = await DocumentModel.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready"
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not Found or not ready",
        statusCode: 404
      })
    }


    const questions = await generatingQuiz(document.extractedText, parseInt(numQuestions), req.user._id, document._id);

    const quiz = await QuizModel.create({
      userId: req.user._id,
      documentId: document._id,
      title: `Quiz for ${document.title}`,
      questions: questions,
      totalQuestions: questions.length,
      userAnswers: [],
      score: 0
    })

    res.status(201).json({
      success: true,
      data: quiz,
      message: "Quiz generated successfully."
    });
  } catch (error) {
    next(error);
  }
};

export const generateSummary = async (req, res, next) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400
      })
    }
    const document = await DocumentModel.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready"
    });


    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not Found or not ready",
        statusCode: 404
      })
    }

    const summary = await generatingSummary(document.extractedText);

    res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        title: document.title,
        summary
      },
      message: "Summary generated successfully."
    });


  } catch (error) {
    next(error);
  }
};

export const chat = async (req, res, next) => {
  try {

    const { documentId, question } = req.body;
    if (!documentId || !question) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and question",
        statusCode: 400
      })
    }
    const document = await DocumentModel.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready"
    });


    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not Found or not ready",
        statusCode: 404
      })
    }

    console.log("Document chunks available:", document.chunks?.length || 0);

    const relevantChunks = findReleventChunks(document.chunks, question, 5);

    console.log("Relevant chunks found:", relevantChunks.length);

    const chunksIndices = relevantChunks.map(c => c.chunkIndex);

    let chatHistory = await ChatHistoryModel.findOne({
      userId: req.user._id,
      documentId: document._id
    });

    if (!chatHistory) {
      chatHistory = await ChatHistoryModel.create({
        userId: req.user._id,
        documentId: document._id,
        messages: []
      })
    }


    const answer = await chatWithContext(question, relevantChunks);

    console.log("Answer received:", answer?.length || 0, "characters");

    if (!answer) {
      return res.status(500).json({
        success: false,
        error: "Failed to generate answer from AI",
        statusCode: 500
      })
    }

    chatHistory.messages.push(
      {
        role: "user",
        content: question,
        timestamp: new Date(),
        relevantChunks: []
      },
      {
        role: "assistant",
        content: answer,
        timestamp: new Date(),
        relevantChunks: chunksIndices
      }
    );


    await chatHistory.save();

    res.status(200).json({
      success: true,
      data: {
        question,
        answer,
        relevantChunks: chunksIndices,
        chatHistoryId: chatHistory._id
      },
      message: "Chat response generated successfully."
    });



  } catch (error) {
    next(error);
  }
};

export const explainConcept = async (req, res, next) => {
  try {

    const { documentId, concept } = req.body;
    if (!documentId || !concept) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId and concept",
        statusCode: 400
      })
    }
    const document = await DocumentModel.findOne({
      _id: documentId,
      userId: req.user._id,
      status: "ready"
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not Found or not ready",
        statusCode: 404
      })
    }

    const relevantChunks = findReleventChunks(document.chunks, concept, 5);

    const context = relevantChunks.map(c => c.content).join("\n");

    const explanation = await explanationConcept(concept, context);


    res.status(200).json({
      success: true,
      data: {
        concept,
        explanation,
        relevantChunks: relevantChunks.map(c => c.chunkIndex)
      },
      message: "Concept explained successfully."
    });

  } catch (error) {
    next(error);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: "Please provide documentId",
        statusCode: 400
      })
    }

    const chatHistory = await ChatHistoryModel.findOne({
      userId: req.user._id,
      documentId: documentId
    }).select("messages");

    if (!chatHistory) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No chat history found for this document."
      })
    }

    res.status(200).json({
      success: true,
      data: {
        documentId,
        chatHistory: chatHistory.messages
      },
      message: "Chat history retrieved successfully."
    });


  } catch (error) {
    next(error);
  }
};
