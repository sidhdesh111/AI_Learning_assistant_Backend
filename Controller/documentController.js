import DocumentModel from "../Model/Document.Model.js";
import FlashCardModel from "../Model/FlashCard.model.js";
import QuizModel from "../Model/Quiz.Model.js";
import { extractTextFromPDF } from "../Utils/pdfParser.js";
import { chunkText } from "../Utils/textChunker.js";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { processPDF } from "../config/PDFprocess.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../Middleware/Claudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Relative file URL (frontend will use its own base URL)
    const fileURL = `/uploads/documents/${req.file.filename}`;

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

/**
 * Stream or redirect to the PDF so the SPA can load it with Authorization (blob)
 * without relying on public /uploads on the API host (often blocked or wrong origin in prod).
 */
export const streamDocumentFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document id",
        statusCode: 400,
      });
    }

    const document = await DocumentModel.findOne({
      _id: id,
      userId: req.user._id,
    }).select("cloudinaryUrl localFilePath filePath fileName");

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Document not found",
        statusCode: 404,
      });
    }

    if (document.cloudinaryUrl) {
      return res.redirect(302, document.cloudinaryUrl);
    }

    const fromFilePath = document.filePath
      ? path.join(
          __dirname,
          "..",
          document.filePath.replace(/^\//, ""),
        )
      : null;

    const candidates = [];
    if (document.localFilePath) {
      candidates.push(document.localFilePath);
    }
    if (fromFilePath) {
      candidates.push(fromFilePath);
    }

    let absolutePath = null;
    for (const p of candidates) {
      if (!p) {
        continue;
      }
      try {
        await fs.access(p);
        absolutePath = p;
        break;
      } catch {
        // try next (e.g. localFilePath from another machine/OS, or disk wiped after deploy)
      }
    }

    if (!absolutePath) {
      return res.status(404).json({
        success: false,
        message:
          "PDF file is not on this server. Most hosts clear disk on redeploy—re-upload the document, or set Cloudinary env vars so new uploads are stored in the cloud.",
        statusCode: 404,
      });
    }

    const downloadName = document.fileName || "document.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(downloadName)}"`,
    );

    const stream = createReadStream(absolutePath);
    stream.on("error", (err) => next(err));
    stream.pipe(res);
  } catch (error) {
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
