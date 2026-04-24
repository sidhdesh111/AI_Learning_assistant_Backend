import express from "express";
import { createUpload } from "../Middleware/MulterMiddleware.js";
import { protectedMiddleware } from "../Middleware/auth.js";
import { deleteDocument, getAllDocuments, getSingleDocuments, uploadDocument } from "../Controller/documentController.js";

const documentRouter = express.Router();


const upload = createUpload("documents");

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
      statusCode: 400,
    });
  }
  next();
};

documentRouter.post('/upload', protectedMiddleware, (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, uploadDocument);

documentRouter.get('/', protectedMiddleware, getAllDocuments);
documentRouter.get('/:id', protectedMiddleware, getSingleDocuments);
documentRouter.delete('/:id', protectedMiddleware, deleteDocument);

export default documentRouter;