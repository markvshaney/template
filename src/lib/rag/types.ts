/**
 * RAG Types Module
 * Contains type definitions for the Retrieval Augmented Generation system
 */

import { Document, DocumentChunk, DocumentMetadata } from './document-processing';

/**
 * Supported document file types
 */
export enum DocumentFileType {
  TEXT = 'text',
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  CSV = 'csv',
  JSON = 'json',
  UNKNOWN = 'unknown',
}

/**
 * Content structure types that can be detected in documents
 */
export enum ContentStructureType {
  PARAGRAPH = 'paragraph',
  HEADING = 'heading',
  LIST = 'list',
  TABLE = 'table',
  CODE = 'code',
  QUOTE = 'quote',
  IMAGE = 'image',
  EQUATION = 'equation',
}

/**
 * Document section with structural information
 */
export interface DocumentSection {
  /** Content of the section */
  content: string;
  /** Type of the section */
  type: ContentStructureType;
  /** Heading level if this is a heading (1-6) */
  headingLevel?: number;
  /** Position in the document */
  position: {
    start: number;
    end: number;
  };
}

/**
 * Document structure analysis result
 */
export interface DocumentStructure {
  /** Sections found in the document */
  sections: DocumentSection[];
  /** Table of contents (if available) */
  tableOfContents?: {
    title: string;
    level: number;
    position: number;
  }[];
}

/**
 * Detected language with confidence score
 */
export interface DetectedLanguage {
  /** ISO language code */
  languageCode: string;
  /** Confidence score between 0 and 1 */
  confidence: number;
}

/**
 * Enhanced metadata with extracted information
 */
export interface EnhancedMetadata extends DocumentMetadata {
  /** Detected language information */
  language?: DetectedLanguage;
  /** Main topics or themes detected in the document */
  topics?: string[];
  /** Keywords extracted from the document */
  keywords?: string[];
  /** Document summary (if generated) */
  summary?: string;
  /** Reading time estimate in minutes */
  readingTime?: number;
  /** Content structure analysis (if performed) */
  contentStructure?: DocumentStructure;
  /** Complexity metrics */
  complexity?: {
    /** Flesch reading ease score (0-100) */
    readingEase?: number;
    /** Average words per sentence */
    wordsPerSentence?: number;
    /** Percentage of complex words */
    complexWordPercentage?: number;
  };
}

/**
 * Options for metadata extraction
 */
export interface MetadataExtractionOptions {
  /** Extract language information */
  extractLanguage?: boolean;
  /** Extract topics */
  extractTopics?: boolean;
  /** Extract keywords */
  extractKeywords?: boolean;
  /** Generate summary */
  generateSummary?: boolean;
  /** Calculate reading time */
  calculateReadingTime?: boolean;
  /** Analyze content structure */
  analyzeStructure?: boolean;
  /** Calculate complexity metrics */
  calculateComplexity?: boolean;
  /** Maximum number of keywords to extract */
  maxKeywords?: number;
  /** Maximum summary length in characters */
  maxSummaryLength?: number;
}

/**
 * Re-export document types for convenience
 */
export type { Document, DocumentChunk, DocumentMetadata };
