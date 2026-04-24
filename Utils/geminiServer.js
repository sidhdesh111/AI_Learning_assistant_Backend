import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

if (!process.env.GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is not set in environment variables.");
    process.exit(1);
}

export const generatingFlashcards = async (text, count = 10) => {
    const prompt = `You are an expert educator. Generate exactly ${count} educational flashcards STRICTLY from the following document content.

**CRITICAL REQUIREMENTS - READ CAREFULLY:**
- ONLY create questions about ACTUAL KNOWLEDGE, CONCEPTS, AND FACTS from the text
- Questions must ask "What is", "How does", "Explain", "Define", "Describe" - focusing on CONCEPTS and INFORMATION
- DO NOT ask questions about LOCATION or STRUCTURE like "What chapter", "What section", "Where is", "In what chapter", "Which section"
- DO NOT ask "What is the main topic of Chapter X" or "What section discusses"
- DO NOT ask "What is in Chapter 100" or "What is in Section 323" or any chapter/section specific questions
- NEVER reference chapters, sections, articles, pages, or any document structure
- DO NOT ask meta-questions about the document (purpose, author, disclaimer, origins)
- ONLY ask about the ACTUAL CONTENT - the real knowledge, concepts, facts, and ideas taught in the text
- Every question must be answerable by extracting factual information from the provided text

**Example GOOD questions:** "What is a variable?", "How do closures work?", "Define a callback function", "What are the data types in JavaScript?"
**Example BAD questions:** "What chapter discusses variables?", "What section covers DOM API?", "What is the topic of Chapter 3?"

Format each flashcard as:
Q: [Question about actual concepts/knowledge from the text]
A: [Concise, accurate answer directly from the text]
D: [Difficulty level: Easy, Medium, Hard]

Separate each flashcard with "---"

**Document Content to learn from:**
${text.substring(0, 15000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ]
        });

        let generatedText = "";
        if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
            generatedText = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            generatedText = response.text;
        }

        const flashcards = [];
        const cards = generatedText.split("---").filter((c) => c.trim());

        for (const card of cards) {
            const lines = card.trim().split("\n");
            let question = "",
                answer = "",
                difficulty = "medium";

            for (const line of lines) {
                if (line.startsWith("Q:")) {
                    question = line.substring(2).trim();
                } else if (line.startsWith("A:")) {
                    answer = line.substring(2).trim();
                } else if (line.startsWith("D:")) {
                    const diff = line.substring(2).trim().toLowerCase();
                    if (["easy", "medium", "hard"].includes(diff)) {
                        difficulty = diff;
                    }
                }
            }

            if (question && answer) {
                flashcards.push({
                    question,
                    answer,
                    difficulty,
                });
            }
        }
        return flashcards;
    } catch (error) {
        console.error("Error generating flashcards:", error);
        throw error;
    }
};

export const generatingQuiz = async (text, numQuestions = 50) => {
    const prompt = `You are an expert educator creating a knowledge assessment quiz. Generate exactly ${numQuestions} multiple-choice questions STRICTLY from the following document content.

**CRITICAL REQUIREMENTS - READ CAREFULLY:**
- ONLY create questions about ACTUAL KNOWLEDGE, CONCEPTS, AND FACTS from the text
- Questions must ask "What is", "How does", "Explain", "Which", "Define" - focusing on CONCEPTS and INFORMATION
- DO NOT ask questions about LOCATION or STRUCTURE like "What chapter", "What section", "Where is", "In what chapter", "Which section"
- DO NOT ask "What is the main topic of Chapter X" or "What section discusses" or "What is in Chapter Y"
- DO NOT ask "What is in Chapter 100" or "What is in Section 323" or any chapter/section specific questions
- NEVER reference chapters, sections, articles, pages, or any document structure
- DO NOT ask meta-questions about the document (purpose, author, disclaimer, origins, topics)
- ONLY ask about the ACTUAL CONTENT - the real knowledge, concepts, facts, and ideas taught in the text
- Every question must be answerable by extracting factual information from the provided text
- Ensure all options are plausible and the correct answer is clearly determinable from the text

**Example GOOD questions:** "What is a closure?", "How do variables work?", "What are event listeners?", "Define a Promise in JavaScript"
**Example BAD questions:** "What chapter discusses closures?", "What section covers variables?", "What is the topic of Chapter 3?"

Format each question as:
Q: [Question about actual concepts/knowledge from the text]
A: [Option A]
B: [Option B]
C: [Option C]
D: [Option D]
Answer: [Correct Option: A, B, C, or D]

Separate each question with "---"

**Document Content to learn from:**
${text.substring(0, 15000)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ]
        });

        let generatedText = "";
        if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
            generatedText = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            generatedText = response.text;
        }

        const questions = [];

        const qBlocks = generatedText.split("---").filter((q) => q.trim());

        for (const block of qBlocks) {
            const lines = block.trim().split("\n");
            let question = "",
                optionsObj = {},
                correctAnswer = "";
            for (const line of lines) {
                if (line.startsWith("Q:")) {
                    question = line.substring(2).trim();
                } else if (line.startsWith("A:")) {
                    optionsObj.A = line.substring(2).trim();
                } else if (line.startsWith("B:")) {
                    optionsObj.B = line.substring(2).trim();
                } else if (line.startsWith("C:")) {
                    optionsObj.C = line.substring(2).trim();
                } else if (line.startsWith("D:")) {
                    optionsObj.D = line.substring(2).trim();
                } else if (line.startsWith("Answer:")) {
                    correctAnswer = line.substring(7).trim();
                }
            }

            if (question && Object.keys(optionsObj).length === 4 && correctAnswer) {
                // Convert options object to array: [A, B, C, D]
                const optionsArray = [optionsObj.A, optionsObj.B, optionsObj.C, optionsObj.D];
                
                questions.push({
                    question,
                    options: optionsArray,
                    correctAnswer: optionsObj[correctAnswer] || correctAnswer,
                });
            }
        }

        return questions;
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw error;
    }
};


export const generatingSummary = async (text) => {
    const prompt = `Create a comprehensive summary of the provided text with the following structure:

**Instructions:**
- Write a detailed summary (not just 1-2 sentences)
- Include the main ideas and key concepts
- Highlight important points and takeaways
- Use clear sections and bullet points for readability
- Use markdown formatting for better structure
- Aim for 5-7 detailed paragraphs or equivalent bullet points
- Include specific examples or details from the text
- End with a brief conclusion

**Text to summarize:**
${text.substring(0, 15000)}

**Detailed Summary:**`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ]
        });
        
        let summary = "";
        if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
            summary = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            summary = response.text;
        }
        
        return summary.trim();
    } catch (error) {
        console.error("Error generating summary:", error);
        throw error;
    }
};

export const chatWithContext = async (question, chunks) => {

    const context = chunks.map((c, i) => `[Chunk ${i + 1}]: ${c.content}`).join("\n");

    console.log("Context Length:", context.length);

    const prompt = `You are an expert educational assistant. Based on the provided context, answer the user's question with a detailed, comprehensive explanation.

**Instructions:**
- Provide a thorough and detailed answer with explanations
- Include examples where relevant
- Use markdown formatting for better readability (bold, code blocks, lists, etc.)
- Break down complex concepts into steps or sections
- If code examples are relevant, include them with proper syntax highlighting
- Provide at least 2-3 sentences of explanation for each key point
- If the answer requires multiple aspects, structure it with clear sections
- If the answer is not present in the context, say "I don't have enough information about this in the provided document."

**Context:**
${context}

**Question:** ${question}

**Detailed Answer:**`;

    try {
        console.log("Calling Gemini API with prompt length:", prompt.length);
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ]
        });
        
        console.log("Gemini Response Object:", JSON.stringify(response, null, 2));
        
        let answer = "";
        
        // Try different response formats
        if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
            answer = response.candidates[0].content.parts[0].text.trim();
        } else if (response.text) {
            answer = response.text.trim();
        } else if (response.content?.parts[0]?.text) {
            answer = response.content.parts[0].text.trim();
        }
        
        console.log("Final answer:", answer?.substring(0, 100) || "EMPTY");
        
        if (!answer) {
            console.warn("Warning: Empty answer from Gemini API");
        }
        
        return answer;
    } catch (error) {
        console.error("Error in chatWithContext:", error);
        throw error;
    }
}

export const explanationConcept = async (concept, context) => {

    const prompt = `You are an expert educator. Provide a comprehensive and detailed explanation of the following concept using the provided context.

**Instructions:**
- Give a thorough explanation with multiple aspects and perspectives
- Start with a clear definition
- Explain why this concept is important
- Provide practical examples or use cases
- Break down complex ideas into understandable parts
- Use markdown formatting (bold, bullet points, code blocks, etc.)
- Include at least 3-4 detailed paragraphs
- If relevant, show code examples with proper syntax highlighting
- Conclude with a summary of key takeaways

**Concept:** ${concept}

**Context from document:**
${context}

**Comprehensive Explanation:**`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ]
        });
        
        let explanation = "";
        if (response.candidates && response.candidates[0]?.content?.parts[0]?.text) {
            explanation = response.candidates[0].content.parts[0].text;
        } else if (response.text) {
            explanation = response.text;
        }
        
        return explanation.trim();
    } catch (error) {
        console.error("Error in explainConcept:", error);
        throw error;
    }

}