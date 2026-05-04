import DocumentModel from "../Model/Document.Model.js";
import { extractTextFromPDF } from "../Utils/pdfParser.js"
import { chunkText } from "../Utils/textChunker.js";
import fs from "fs/promises";

export const processPDF = async (documentId, filePath) => {
    try {

        const { text } = await extractTextFromPDF(filePath);

        const chunks = await chunkText(text, 500, 50);

        await DocumentModel.findByIdAndUpdate(documentId, {
            extractedText: text,
            chunks: chunks,
            status: 'ready',
            localFilePath: null
        });

        console.log(`Document ${documentId} processed successfully.`);


    } catch (error) {
        console.log(`Error processing document ${documentId}`, error.message);
        await DocumentModel.findByIdAndUpdate(documentId, {
            status: 'failed'
        })
    } finally {
        if (filePath) {
            await fs.unlink(filePath).catch(() => {});
        }
    }
} 