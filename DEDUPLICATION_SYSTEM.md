# Deduplication & Content Caching System

## Overview

This document describes the new **Deduplication & Content Caching System** implemented to prevent duplicate content generation when users create flashcards and quizzes from uploaded documents.

### Problem Solved
Previously, when users would generate flashcards or quizzes from the same document multiple times, the system would often generate similar or identical content, leading to:
- Duplicate flashcard questions
- Repeated quiz questions with same/similar options
- Redundant learning material
- Degraded user experience

### Solution Implemented
A comprehensive AI-powered deduplication agent that:
1. Detects similar/duplicate content before storing it
2. Caches previously generated content
3. Prevents regeneration of similar questions
4. Maintains content diversity and uniqueness

---

## Architecture

### New Components

#### 1. **ContentCache Model** (`Model/ContentCache.Model.js`)
Stores metadata about generated content for deduplication purposes.

**Schema Fields:**
- `userId`: Reference to user who generated the content
- `documentId`: Reference to document from which content was generated
- `contentType`: Type of content ("flashcard", "quiz", or "summary")
- `contentHash`: SHA256 hash of the content for quick lookups
- `originalContent`: JSON string of the actual content
- `similarity`: Similarity score (0-100) compared to existing content
- `isDuplicate`: Boolean flag indicating if this is a duplicate
- `generatedAt`: Timestamp of generation
- `createdAt` / `updatedAt`: Automatic timestamps

**Indexes:**
- `{ documentId: 1, contentType: 1 }` - Fast queries by document and type
- `{ userId: 1, documentId: 1 }` - Fast queries by user and document
- `{ contentHash: 1 }` - Exact match detection

---

#### 2. **Deduplication Agent** (`Utils/deduplicationAgent.js`)
Core utility providing AI-powered content deduplication.

**Key Functions:**

##### `calculateContentHash(content: string): string`
Generates SHA256 hash of content for exact match detection.

```javascript
const hash = calculateContentHash(JSON.stringify(flashcard));
```

##### `calculateSimilarity(str1: string, str2: string): number`
Calculates Levenshtein distance to determine content similarity (0-100%).
Useful for detecting near-duplicates even with minor text variations.

```javascript
const similarity = calculateSimilarity("What is a variable?", "What is a variable in JavaScript?");
// Returns: 85.5 (85.5% similar)
```

##### `checkFlashcardDuplicate(userId, documentId, question, answer)`
Checks if a flashcard Q&A pair already exists in cache.
- Returns `{ isDuplicate: boolean, similarity: number }`
- Considers both question and answer similarity
- Flags as duplicate if both > 85% similar

```javascript
const { isDuplicate, similarity } = await checkFlashcardDuplicate(
  userId,
  documentId,
  "What is React?",
  "React is a JavaScript library..."
);
```

##### `checkQuizDuplicate(userId, documentId, question, options)`
Checks if a quiz question already exists with similar options.
- Detects if question similarity > 80% AND at least 3 out of 4 options match
- Returns `{ isDuplicate: boolean, similarity: number }`

##### `filterDuplicateFlashcards(userId, documentId, flashcards)`
Filters an array of flashcards to remove duplicates.
- Checks each flashcard against cache
- Returns only unique flashcards
- Logs filtered duplicates for debugging

##### `filterDuplicateQuestions(userId, documentId, questions)`
Filters an array of quiz questions to remove duplicates.
- Similar to `filterDuplicateFlashcards` but for quizzes

##### `cacheFlashcard(userId, documentId, question, answer, difficulty)`
Stores a flashcard in the cache for future comparison.

##### `cacheQuizQuestion(userId, documentId, question, options, correctAnswer, difficulty)`
Stores a quiz question in the cache for future comparison.

##### `getCacheStats(userId, documentId)`
Returns statistics about cached content for a document.

```javascript
const stats = await getCacheStats(userId, documentId);
// Returns:
// [
//   { _id: "flashcard", count: 45, duplicateCount: 3 },
//   { _id: "quiz", count: 120, duplicateCount: 8 }
// ]
```

##### `clearDocumentCache(userId, documentId)`
Clears all cached content for a document (useful when document is updated).

---

### Updated Components

#### 1. **geminiServer.js**
Enhanced AI generation functions now include deduplication:

**`generatingFlashcards(text, count, userId, documentId)`**
- Added optional `userId` and `documentId` parameters
- Generates flashcards as before
- If user/doc IDs provided, filters duplicates and caches results
- Logs deduplication statistics

**`generatingQuiz(text, numQuestions, userId, documentId)`**
- Added optional `userId` and `documentId` parameters
- Generates quiz questions as before
- If user/doc IDs provided, filters duplicates and caches results
- Logs deduplication statistics

#### 2. **aiController.js**
Updated to pass user and document IDs:

```javascript
// Flashcard generation
const cards = await generatingFlashcards(
  document.extractedText,
  parseInt(count),
  req.user._id,      // NEW
  document._id        // NEW
);

// Quiz generation
const questions = await generatingQuiz(
  document.extractedText,
  parseInt(numQuestions),
  req.user._id,       // NEW
  document._id        // NEW
);
```

---

## How It Works

### Deduplication Flow

```
User Requests Flashcards/Quiz
         ↓
Generate Content with AI
         ↓
For Each Generated Item:
  ├─ Calculate Similarity with Cache
  ├─ If > Threshold → Filter Out & Log
  └─ If Unique → Cache & Include
         ↓
Return Unique Content
```

### Similarity Thresholds

| Content Type | Question Match | Answer/Options Match | Duplicate If |
|---|---|---|---|
| **Flashcard** | > 85% | > 85% | Both thresholds met |
| **Quiz** | > 80% | > 3/4 options match | Both conditions met |

### Example Flow

```javascript
// User requests 30 flashcards from a document
POST /api/flashcards
{
  "documentId": "60d5ec49c1234",
  "count": 30
}

// System generates 30 flashcards from AI
// Then checks each against cache
// Found 5 duplicates:
//   - "What is JavaScript?" (94% similar to cached version)
//   - "What is DOM?" (88% similar)
//   - etc.

// Returns 25 unique flashcards
// Logs: "Checking for duplicate flashcards... (Found 30 initial cards)"
//       "After deduplication: 25 unique cards (Filtered 5 duplicates)"

// All 25 are cached for future comparisons
```

---

## Benefits

1. **Content Diversity** - Users get unique, non-repetitive learning material
2. **Efficiency** - Caching reduces redundant AI API calls when re-generating
3. **Better UX** - No more duplicate study materials
4. **Analytics** - Cache statistics help identify document quality
5. **Smart Filtering** - Detects near-duplicates, not just exact matches
6. **Scalability** - Efficient database indexing for large-scale usage

---

## Usage Examples

### Generating Unique Flashcards
```javascript
// Automatically deduplicates via updated aiController
const response = await fetch('/api/flashcards', {
  method: 'POST',
  body: JSON.stringify({
    documentId: 'doc123',
    count: 50
  })
});
// Returns 50 unique flashcards (deduplicated automatically)
```

### Checking Cache Statistics
```javascript
import { getCacheStats } from './Utils/deduplicationAgent.js';

const stats = await getCacheStats(userId, documentId);
console.log(stats);
// Output:
// [
//   { _id: 'flashcard', count: 120, duplicateCount: 5 },
//   { _id: 'quiz', count: 180, duplicateCount: 12 }
// ]
```

### Clearing Cache (When Document Updates)
```javascript
import { clearDocumentCache } from './Utils/deduplicationAgent.js';

// When user updates document
await clearDocumentCache(userId, documentId);
// All cached content for this document is cleared
```

---

## Configuration

### Adjusting Similarity Thresholds

Edit `deduplicationAgent.js` to modify thresholds:

```javascript
// For flashcards - line ~60
if (questionSimilarity > 85 && answerSimilarity > 85) {
    isDuplicate = true; // Adjust 85 as needed
}

// For quiz questions - line ~110
if (questionSimilarity > 80 && matchingOptions >= 3) {
    isDuplicate = true; // Adjust 80 and 3 as needed
}
```

### Tweaking for Different Content Types
- **Stricter**: Increase thresholds (e.g., 90%, 95%)
- **Lenient**: Decrease thresholds (e.g., 70%, 75%)

---

## Database Impact

### New Collections
- `contentcaches` - Stores content metadata for deduplication

### Indexes Created
```javascript
// Automatic from Mongoose schema
db.contentcaches.createIndex({ documentId: 1, contentType: 1 })
db.contentcaches.createIndex({ userId: 1, documentId: 1 })
db.contentcaches.createIndex({ contentHash: 1 })
```

### Storage Estimate
- Per flashcard cached: ~500 bytes
- Per quiz question cached: ~800 bytes
- For 100 documents with 150 items each: ~100-120 MB

---

## Monitoring & Debugging

### Console Logs
The system provides detailed logging:

```
Checking for duplicate flashcards... (Found 30 initial cards)
Filtered duplicate flashcard (94% similar): What is JavaScript?
Filtered duplicate flashcard (88% similar): What is DOM?
After deduplication: 25 unique cards (Filtered 5 duplicates)
```

### Database Queries
Monitor cache efficiency:

```javascript
// Check duplicate rate
db.contentcaches.aggregate([
  { $match: { contentType: "flashcard" } },
  { $group: {
      _id: null,
      total: { $sum: 1 },
      duplicates: { $sum: { $cond: ["$isDuplicate", 1, 0] } }
    }
  }
]);
```

---

## Troubleshooting

### Issue: Duplicates Still Appearing
**Solution**: Increase similarity thresholds in `deduplicationAgent.js`

### Issue: Too Many Unique Items Being Filtered
**Solution**: Decrease similarity thresholds

### Issue: Cache Growing Too Large
**Solution**: Implement cache cleanup:
```javascript
// Remove cache older than 30 days
await ContentCacheModel.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
});
```

---

## Future Enhancements

1. **ML-Based Similarity** - Use embeddings instead of Levenshtein distance
2. **Batch API Calls** - Cache results from Gemini API for better efficiency
3. **User Preferences** - Allow users to control dedup sensitivity
4. **Analytics Dashboard** - Visualize cache hit rates and stats
5. **Distributed Caching** - Use Redis for multi-server deployments
6. **Auto-Refresh** - Periodically generate new content for stale cache
7. **Topic-Based Filtering** - Organize cache by learning topics

---

## API Reference

### Endpoint Changes
No changes to existing API endpoints. Deduplication happens automatically.

### Response Changes
Same as before, but with guaranteed unique content and detailed console logs.

---

## Notes for Developers

- The deduplication runs **automatically** - no changes needed to routes
- Old projects without deduplication will start using it immediately upon deployment
- Cache is **per document**, so different documents have independent caches
- For best results, regenerate content multiple times from same document to see deduplication in action

---

## Support

For issues or questions about the deduplication system:
1. Check console logs for deduplication statistics
2. Query `ContentCacheModel` to verify cache is populating
3. Test similarity calculation with known text pairs
4. Review similarity thresholds based on use case

---

Generated: May 4, 2026
