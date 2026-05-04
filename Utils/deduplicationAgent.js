import crypto from "crypto";
import ContentCacheModel from "../Model/ContentCache.Model.js";

/**
 * Calculate SHA256 hash of content
 */
export const calculateContentHash = (content) => {
    return crypto.createHash("sha256").update(content).digest("hex");
};

/**
 * Calculate similarity score between two strings using Levenshtein distance
 * Returns a percentage (0-100) where 100 is identical
 */
export const calculateSimilarity = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // Create matrix
    for (let i = 0; i <= len2; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return Math.round(similarity * 100) / 100;
};

/**
 * Check if flashcard already exists in cache with similarity check
 */
export const checkFlashcardDuplicate = async (userId, documentId, question, answer) => {
    try {
        const cached = await ContentCacheModel.find({
            userId,
            documentId,
            contentType: "flashcard"
        });

        if (cached.length === 0) {
            return { isDuplicate: false, similarity: 0 };
        }

        // Parse cached flashcards
        let maxSimilarity = 0;
        let isDuplicate = false;

        for (const cache of cached) {
            try {
                const cachedData = JSON.parse(cache.originalContent);
                const questionSimilarity = calculateSimilarity(
                    question.toLowerCase(),
                    cachedData.question.toLowerCase()
                );
                const answerSimilarity = calculateSimilarity(
                    answer.toLowerCase(),
                    cachedData.answer.toLowerCase()
                );

                const avgSimilarity = (questionSimilarity + answerSimilarity) / 2;
                maxSimilarity = Math.max(maxSimilarity, avgSimilarity);

                // If both question and answer are > 85% similar, consider it a duplicate
                if (questionSimilarity > 85 && answerSimilarity > 85) {
                    isDuplicate = true;
                    break;
                }
            } catch (e) {
                console.log("Error parsing cached flashcard:", e);
            }
        }

        return { isDuplicate, similarity: maxSimilarity };
    } catch (error) {
        console.error("Error checking flashcard duplicate:", error);
        return { isDuplicate: false, similarity: 0 };
    }
};

/**
 * Check if quiz question already exists in cache with similarity check
 */
export const checkQuizDuplicate = async (userId, documentId, question, options) => {
    try {
        const cached = await ContentCacheModel.find({
            userId,
            documentId,
            contentType: "quiz"
        });

        if (cached.length === 0) {
            return { isDuplicate: false, similarity: 0 };
        }

        let maxSimilarity = 0;
        let isDuplicate = false;

        for (const cache of cached) {
            try {
                const cachedData = JSON.parse(cache.originalContent);
                const questionSimilarity = calculateSimilarity(
                    question.toLowerCase(),
                    cachedData.question.toLowerCase()
                );

                // Check options similarity (at least 3 out of 4 should match)
                let matchingOptions = 0;
                for (const option of options) {
                    for (const cachedOption of cachedData.options) {
                        if (calculateSimilarity(option.toLowerCase(), cachedOption.toLowerCase()) > 80) {
                            matchingOptions++;
                            break;
                        }
                    }
                }

                const optionsSimilarity = (matchingOptions / 4) * 100;
                const avgSimilarity = (questionSimilarity + optionsSimilarity) / 2;
                maxSimilarity = Math.max(maxSimilarity, avgSimilarity);

                // If question similarity > 80% and at least 3 options match, consider it duplicate
                if (questionSimilarity > 80 && matchingOptions >= 3) {
                    isDuplicate = true;
                    break;
                }
            } catch (e) {
                console.log("Error parsing cached quiz:", e);
            }
        }

        return { isDuplicate, similarity: maxSimilarity };
    } catch (error) {
        console.error("Error checking quiz duplicate:", error);
        return { isDuplicate: false, similarity: 0 };
    }
};

/**
 * Filter flashcards to remove duplicates
 */
export const filterDuplicateFlashcards = async (userId, documentId, flashcards) => {
    try {
        const filteredFlashcards = [];

        for (const flashcard of flashcards) {
            const { isDuplicate, similarity } = await checkFlashcardDuplicate(
                userId,
                documentId,
                flashcard.question,
                flashcard.answer
            );

            if (!isDuplicate) {
                filteredFlashcards.push(flashcard);
            } else {
                console.log(`Filtered duplicate flashcard (${similarity}% similar): ${flashcard.question}`);
            }
        }

        return filteredFlashcards;
    } catch (error) {
        console.error("Error filtering duplicate flashcards:", error);
        return flashcards;
    }
};

/**
 * Filter quiz questions to remove duplicates
 */
export const filterDuplicateQuestions = async (userId, documentId, questions) => {
    try {
        const filteredQuestions = [];

        for (const question of questions) {
            const { isDuplicate, similarity } = await checkQuizDuplicate(
                userId,
                documentId,
                question.question,
                question.options
            );

            if (!isDuplicate) {
                filteredQuestions.push(question);
            } else {
                console.log(`Filtered duplicate question (${similarity}% similar): ${question.question}`);
            }
        }

        return filteredQuestions;
    } catch (error) {
        console.error("Error filtering duplicate questions:", error);
        return questions;
    }
};

/**
 * Cache flashcard content
 */
export const cacheFlashcard = async (userId, documentId, question, answer, difficulty) => {
    try {
        const contentData = { question, answer, difficulty };
        const contentHash = calculateContentHash(JSON.stringify(contentData));

        // Check if exact hash already exists
        const existing = await ContentCacheModel.findOne({
            userId,
            documentId,
            contentType: "flashcard",
            contentHash
        });

        if (existing) {
            return existing;
        }

        const cache = await ContentCacheModel.create({
            userId,
            documentId,
            contentType: "flashcard",
            contentHash,
            originalContent: JSON.stringify(contentData),
            isDuplicate: false
        });

        return cache;
    } catch (error) {
        console.error("Error caching flashcard:", error);
        return null;
    }
};

/**
 * Cache quiz question
 */
export const cacheQuizQuestion = async (userId, documentId, question, options, correctAnswer, difficulty) => {
    try {
        const contentData = { question, options, correctAnswer, difficulty };
        const contentHash = calculateContentHash(JSON.stringify(contentData));

        // Check if exact hash already exists
        const existing = await ContentCacheModel.findOne({
            userId,
            documentId,
            contentType: "quiz",
            contentHash
        });

        if (existing) {
            return existing;
        }

        const cache = await ContentCacheModel.create({
            userId,
            documentId,
            contentType: "quiz",
            contentHash,
            originalContent: JSON.stringify(contentData),
            isDuplicate: false
        });

        return cache;
    } catch (error) {
        console.error("Error caching quiz question:", error);
        return null;
    }
};

/**
 * Get cache statistics for a document
 */
export const getCacheStats = async (userId, documentId) => {
    try {
        const stats = await ContentCacheModel.aggregate([
            {
                $match: { userId, documentId }
            },
            {
                $group: {
                    _id: "$contentType",
                    count: { $sum: 1 },
                    duplicateCount: {
                        $sum: { $cond: ["$isDuplicate", 1, 0] }
                    }
                }
            }
        ]);

        return stats;
    } catch (error) {
        console.error("Error getting cache stats:", error);
        return [];
    }
};

/**
 * Clear cache for a document (e.g., if document is updated)
 */
export const clearDocumentCache = async (userId, documentId) => {
    try {
        const result = await ContentCacheModel.deleteMany({
            userId,
            documentId
        });

        return result;
    } catch (error) {
        console.error("Error clearing document cache:", error);
        throw error;
    }
};
