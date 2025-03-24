/**
 * Metadata Extraction Module
 * Utilities for extracting and enhancing document metadata
 */

import {
  Document,
  DocumentFileType,
  ContentStructureType,
  DocumentSection,
  DocumentStructure,
  DetectedLanguage,
  EnhancedMetadata,
  MetadataExtractionOptions,
} from './types';

/**
 * Default options for metadata extraction
 */
const DEFAULT_METADATA_OPTIONS: MetadataExtractionOptions = {
  extractLanguage: true,
  extractKeywords: true,
  calculateReadingTime: true,
  analyzeStructure: true,
  calculateComplexity: false,
  extractTopics: false,
  generateSummary: false,
  maxKeywords: 10,
  maxSummaryLength: 200,
};

/**
 * Extract enhanced metadata from a document
 */
export async function extractMetadata(
  document: Document,
  options: MetadataExtractionOptions = DEFAULT_METADATA_OPTIONS
): Promise<EnhancedMetadata> {
  const mergedOptions = { ...DEFAULT_METADATA_OPTIONS, ...options };

  // Start with the existing metadata
  const enhancedMetadata: EnhancedMetadata = { ...document.metadata };

  // Basic extraction tasks that are always performed
  enhancedMetadata.title = enhancedMetadata.title || extractTitle(document);

  if (!enhancedMetadata.documentType) {
    enhancedMetadata.documentType = determineDocumentType(document);
  }

  // Optional extraction tasks based on options
  if (mergedOptions.calculateReadingTime) {
    enhancedMetadata.readingTime = calculateReadingTime(document.content);
  }

  if (mergedOptions.extractLanguage) {
    enhancedMetadata.language = detectLanguage(document.content);
  }

  if (mergedOptions.extractKeywords) {
    enhancedMetadata.keywords = extractKeywords(document.content, mergedOptions.maxKeywords);
  }

  if (mergedOptions.analyzeStructure) {
    const structure = analyzeDocumentStructure(document.content);
    enhancedMetadata.contentStructure = structure;
  }

  if (mergedOptions.calculateComplexity) {
    enhancedMetadata.complexity = calculateTextComplexity(document.content);
  }

  if (mergedOptions.extractTopics) {
    enhancedMetadata.topics = extractTopics(document.content);
  }

  if (mergedOptions.generateSummary) {
    enhancedMetadata.summary = generateSummary(document.content, mergedOptions.maxSummaryLength);
  }

  return enhancedMetadata;
}

/**
 * Extract title from document content or filename
 */
function extractTitle(document: Document): string {
  const { content, metadata } = document;

  // Try to extract from filename if available
  if (metadata.url) {
    const urlParts = metadata.url.split('/');
    const filename = urlParts[urlParts.length - 1];

    // Remove file extension and replace dashes/underscores with spaces
    const filenameWithoutExtension = filename.split('.')[0];
    const cleanedFilename = filenameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Handle camelCase

    if (cleanedFilename.length > 0) {
      return cleanedFilename.charAt(0).toUpperCase() + cleanedFilename.slice(1);
    }
  }

  // Try to extract from content
  // Look for markdown or HTML headings
  const headingMatch = content.match(/^#\s+(.+)$|<h1[^>]*>(.+?)<\/h1>/im);
  if (headingMatch) {
    return (headingMatch[1] || headingMatch[2]).trim();
  }

  // If no heading, use the first sentence if it's reasonably short
  const firstSentenceMatch = content.match(/^([^.!?]+[.!?])/);
  if (firstSentenceMatch && firstSentenceMatch[1].length < 100) {
    return firstSentenceMatch[1].trim();
  }

  // Fallback to generic title
  return 'Untitled Document';
}

/**
 * Determine document type from content and metadata
 */
function determineDocumentType(document: Document): string {
  const { content, metadata } = document;

  // Check if type is already specified in metadata
  if (metadata.documentType) {
    return metadata.documentType;
  }

  // Check URL for file extension
  if (metadata.url) {
    const url = metadata.url.toLowerCase();
    if (url.endsWith('.md') || url.endsWith('.markdown')) {
      return DocumentFileType.MARKDOWN;
    } else if (url.endsWith('.html') || url.endsWith('.htm')) {
      return DocumentFileType.HTML;
    } else if (url.endsWith('.pdf')) {
      return DocumentFileType.PDF;
    } else if (url.endsWith('.docx')) {
      return DocumentFileType.DOCX;
    } else if (url.endsWith('.doc')) {
      return DocumentFileType.DOC;
    } else if (url.endsWith('.txt')) {
      return DocumentFileType.TEXT;
    } else if (url.endsWith('.csv')) {
      return DocumentFileType.CSV;
    } else if (url.endsWith('.json')) {
      return DocumentFileType.JSON;
    }
  }

  // Analyze content patterns
  if (content.match(/^#\s+|\n#\s+/)) {
    return DocumentFileType.MARKDOWN;
  } else if (content.match(/<\/?[a-z][\s\S]*>/i)) {
    return DocumentFileType.HTML;
  } else if (content.match(/^\s*[\[\{\"]/) && content.match(/[\]\}\"]$/)) {
    return DocumentFileType.JSON;
  } else if (content.match(/[^,\n]+,[^,\n]+,/)) {
    return DocumentFileType.CSV;
  }

  // Default to plain text
  return DocumentFileType.TEXT;
}

/**
 * Calculate estimated reading time in minutes
 */
function calculateReadingTime(text: string): number {
  // Average reading speed: 200 words per minute
  const wordCount = text.trim().split(/\s+/).length;
  const readingTimeMinutes = wordCount / 200;

  // Round to nearest half minute, with minimum of 1 minute
  return Math.max(1, Math.round(readingTimeMinutes * 2) / 2);
}

/**
 * Detect the primary language of the text
 * This is a simplified implementation - in production, use a language detection library
 */
function detectLanguage(text: string): DetectedLanguage {
  // Common English words frequency
  const englishWords = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it'];
  const spanishWords = ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se'];
  const frenchWords = ['le', 'la', 'de', 'et', 'à', 'un', 'être', 'que', 'en', 'il'];
  const germanWords = ['der', 'die', 'das', 'und', 'zu', 'in', 'den', 'von', 'für', 'ist'];

  const wordCounts: Record<string, number> = {
    en: 0, // English
    es: 0, // Spanish
    fr: 0, // French
    de: 0, // German
  };

  // Simple word counting for common words
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const totalWords = words.length;

  if (totalWords === 0) {
    return { languageCode: 'en', confidence: 1 }; // Default to English
  }

  for (const word of words) {
    if (englishWords.includes(word)) wordCounts['en']++;
    if (spanishWords.includes(word)) wordCounts['es']++;
    if (frenchWords.includes(word)) wordCounts['fr']++;
    if (germanWords.includes(word)) wordCounts['de']++;
  }

  // Find language with highest count
  let maxCount = 0;
  let detectedLanguage = 'en'; // Default to English

  for (const [lang, count] of Object.entries(wordCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedLanguage = lang;
    }
  }

  // Calculate confidence - ratio of detected language words to total word count, normalized
  const confidence = Math.min(1, maxCount / (totalWords * 0.2)); // Assume 20% of words could be common words

  return {
    languageCode: detectedLanguage,
    confidence,
  };
}

/**
 * Extract keywords from text
 * This is a simplified implementation - in production, use NLP libraries
 */
function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'and',
    'or',
    'but',
    'if',
    'then',
    'else',
    'when',
    'at',
    'from',
    'by',
    'for',
    'with',
    'about',
    'against',
    'between',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'to',
    'of',
    'in',
    'on',
    'off',
    'over',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'any',
    'both',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    's',
    't',
    'can',
    'will',
    'just',
    'don',
    'should',
    'now',
    'im',
    'its',
    'it',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'having',
    'do',
    'does',
    'did',
    'doing',
  ]);

  // Extract all words and count frequency
  const words = text.toLowerCase().match(/\b[a-z][a-z-]{2,}\b/g) || [];
  const wordFrequency: Record<string, number> = {};

  for (const word of words) {
    if (!stopWords.has(word)) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  }

  // Sort by frequency and take top keywords
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Analyze the structure of a document
 */
function analyzeDocumentStructure(text: string): DocumentStructure {
  const sections: DocumentSection[] = [];
  const tableOfContents: { title: string; level: number; position: number }[] = [];

  // Detect headings - simplified for markdown and basic HTML
  const headingRegex = /(?:^|\n)(#{1,6})\s+(.+)(?:\n|$)|<h([1-6])[^>]*>(.+?)<\/h\3>/g;
  let match;

  while ((match = headingRegex.exec(text)) !== null) {
    const headingText = match[2] || match[4];
    const headingLevel = match[1] ? match[1].length : parseInt(match[3], 10);
    const position = match.index;

    sections.push({
      content: headingText,
      type: ContentStructureType.HEADING,
      headingLevel,
      position: {
        start: position,
        end: position + match[0].length,
      },
    });

    tableOfContents.push({
      title: headingText,
      level: headingLevel,
      position,
    });
  }

  // Detect code blocks in markdown
  const codeBlockRegex = /```[a-z]*\n[\s\S]*?\n```|`[^`]+`/g;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    sections.push({
      content: match[0],
      type: ContentStructureType.CODE,
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }

  // Detect lists
  const listRegex = /(?:^|\n)(?:\s*[-*+]\s+.+(?:\n|$)|\s*\d+\.\s+.+(?:\n|$))+/g;
  while ((match = listRegex.exec(text)) !== null) {
    sections.push({
      content: match[0],
      type: ContentStructureType.LIST,
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }

  // Detect blockquotes
  const quoteRegex = /(?:^|\n)>\s+[^\n]+(?:\n>\s+[^\n]+)*/g;
  while ((match = quoteRegex.exec(text)) !== null) {
    sections.push({
      content: match[0],
      type: ContentStructureType.QUOTE,
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });
  }

  // Return the structure analysis
  return {
    sections,
    tableOfContents,
  };
}

/**
 * Calculate text complexity metrics
 */
function calculateTextComplexity(text: string): EnhancedMetadata['complexity'] {
  // Split into sentences and words
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.match(/\b\w+\b/g) || [];

  if (sentences.length === 0 || words.length === 0) {
    return {
      readingEase: 100, // Perfect readability for empty text
      wordsPerSentence: 0,
      complexWordPercentage: 0,
    };
  }

  // Count syllables (simplified)
  let totalSyllables = 0;
  let complexWords = 0;

  for (const word of words) {
    const syllableCount = countSyllables(word);
    totalSyllables += syllableCount;

    if (syllableCount >= 3) {
      complexWords++;
    }
  }

  // Calculate metrics
  const wordsPerSentence = words.length / sentences.length;
  const complexWordPercentage = (complexWords / words.length) * 100;

  // Flesch Reading Ease
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const readingEase = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * wordsPerSentence - 84.6 * (totalSyllables / words.length))
  );

  return {
    readingEase,
    wordsPerSentence,
    complexWordPercentage,
  };
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();

  // Remove es, ed at the end
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');

  // Count vowel groups
  const syllables = word.match(/[aeiouy]{1,2}/g);

  return syllables ? syllables.length : 1; // Minimum 1 syllable
}

/**
 * Extract main topics from the text
 * This is a placeholder implementation - in production, use NLP libraries
 */
function extractTopics(text: string): string[] {
  // In a complete implementation, this would use topic modeling or clustering
  // For now, just return the top keywords as topics
  return extractKeywords(text, 5);
}

/**
 * Generate a short summary of the text
 * This is a simple placeholder implementation
 */
function generateSummary(text: string, maxLength: number = 200): string {
  // In a complete implementation, this would use extractive or abstractive summarization
  // For now, just return the first few sentences
  const sentences = text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0);

  let summary = '';
  for (const sentence of sentences) {
    if (summary.length + sentence.length + 2 <= maxLength) {
      summary += (summary ? '. ' : '') + sentence.trim();
    } else {
      break;
    }
  }

  return summary + (summary.endsWith('.') ? '' : '.');
}

/**
 * Create enhanced document with extracted metadata
 */
export async function createEnhancedDocument(
  document: Document,
  options?: MetadataExtractionOptions
): Promise<Document> {
  const enhancedMetadata = await extractMetadata(document, options);

  return {
    ...document,
    metadata: enhancedMetadata,
  };
}
