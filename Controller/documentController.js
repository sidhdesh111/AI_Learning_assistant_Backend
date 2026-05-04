import DocumentModel from "../Model/Document.Model.js";
import FlashCardModel from "../Model/FlashCard.model.js";
import QuizModel from "../Model/Quiz.Model.js";
import { extractTextFromPDF } from "../Utils/pdfParser.js";
import { chunkText } from "../Utils/textChunker.js";
import fs from "fs/promises";
import mongoose from "mongoose";
import { processPDF } from "../config/PDFprocess.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../Middleware/Claudinary.js";

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a PDF file",
        statusCode: 400,
      });
    }

    const { title } = req.body;

    if (!title) {
      await fs.unlink(req.file.path);

      return res.status(400).json({
        success: false,
        error: "Please provide a document title",
        statusCode: 400,
      });
    }

    // Local file URL
    const baseURL = `${process.env.BASE_URL}`;
    const fileURL = `${baseURL}/uploads/documents/${req.file.filename}`;

    // Upload to Cloudinary as well
    let cloudinaryURL = null;
    try {
      cloudinaryURL = await uploadToCloudinary(req.file.path);
      console.log("File uploaded to Cloudinary:", cloudinaryURL);
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      // Continue with local storage even if Cloudinary upload fails
    }

    const document = await DocumentModel.create({
      userId: req.user._id,
      title,
      fileName: req.file.originalname,
      filePath: fileURL,
      localFilePath: req.file.path,
      cloudinaryUrl: cloudinaryURL,
      fileSize: req.file.size,
      status: "processing",
    });

    processPDF(document._id, req.file.path).catch((err) => {
      console.error("PDF processing ERROR", err);
    });

    res.status(201).json({
      success: true,
      data: document,
      message:
        "Document uploaded Successfully to both local and cloud storage. Processing in progress...",
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
};

export const getAllDocuments = async (req, res, next) => {
  try {
    const documents = await DocumentModel.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "flashcards",
          localField: "_id",
          foreignField: "documentId",
          as: "flashcardSets",
        },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "_id",
          foreignField: "documentId",
          as: "quizzes",
        },
      },
      {
        $addFields: {
          flashcardCount: { $size: "$flashcardSets" },
          quizCount: { $size: "$quizzes" },
        },
      },
      {
        $project: {
          extractedText: 0,
          chunks: 0,
          flashcardSets: 0,
          quizzes: 0,
        },
      },
      {
        $sort: { uploadDate: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.log(`Error is Getting Document ${error.message}`);

    next(error);
  }
};

export const getSingleDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await DocumentModel.findOne({
      _id: id,
      userId: req.user._id,
    }).select("-extractedText -chunks");

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    const FashcardCount = await FlashCardModel.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });
    const QuizCount = await QuizModel.countDocuments({
      documentId: document._id,
      userId: req.user._id,
    });

    document.lastAccessed = new Date();
    await document.save();
    const documentData = document.toObject();
    documentData.flashcardCount = FashcardCount;
    documentData.quizCount = QuizCount;

    res.status(200).json({
      success: true,
      data: documentData,
    });
  } catch (error) {
    console.log(`Error is Getting Document ${error.message}`);
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const document = await DocumentModel.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    if (document.localFilePath) {
      await fs.unlink(document.localFilePath).catch(() => {});
    }
    if (document.cloudinaryUrl) {
      try {
        await deleteFromCloudinary(document.cloudinaryUrl);
      } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
      }
    }
    await DocumentModel.deleteOne({ _id: req.params.id });
    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateDocuments = async (req, res, next) => {};
