/**
 * Document Processing Module
 * Utilities for processing documents into chunks for RAG applications
 */

/**
 * Represents a document for RAG processing
 */
export interface Document {
  /** Unique identifier for the document */
  id: string;
  /** Document content */
  content: string;
  /** Document metadata */
  metadata: DocumentMetadata;
}

/**
 * Metadata for a document
 */
export interface DocumentMetadata {
  /** Document title */
  title?: string;
  /** Document source URL */
  url?: string;
  /** Document author */
  author?: string;
  /** Document creation date */
  createdAt?: Date;
  /** Document type */
  documentType?: string;
  /** Additional metadata fields */
  [key: string]: any;
}

/**
 * Represents a chunk of a document
 */
export interface DocumentChunk {
  /** Unique identifier for the chunk */
  id: string;
  /** Document ID this chunk belongs to */
  documentId: string;
  /** Content of the chunk */
  content: string;
  /** Starting position of the chunk in the document */
  startPosition: number;
  /** Ending position of the chunk in the document */
  endPosition: number;
  /** Metadata from the parent document plus chunk-specific metadata */
  metadata: DocumentMetadata & {
    chunkIndex?: number;
    isFirst?: boolean;
    isLast?: boolean;
    previousChunkId?: string;
    nextChunkId?: string;
  };
}

/**
 * Options for document chunking
 */
export interface ChunkingOptions {
  /** Maximum size of each chunk in characters */
  chunkSize?: number;
  /** Overlap between chunks in characters */
  chunkOverlap?: number;
  /** Chunking strategy to use */
  strategy?: 'fixed' | 'paragraph' | 'semantic' | 'sentence';
  /** Separator for chunking (if applicable) */
  separator?: string;
  /** Whether to keep original document metadata in chunks */
  includeMetadata?: boolean;
}

/**
 * Default chunking options
 */
const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  strategy: 'fixed',
  includeMetadata: true,
};

/**
 * Split a document into chunks based on specified options
 */
export function chunkDocument(
  document: Document,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): DocumentChunk[] {
  const {
    chunkSize = DEFAULT_CHUNKING_OPTIONS.chunkSize!,
    chunkOverlap = DEFAULT_CHUNKING_OPTIONS.chunkOverlap!,
    strategy = DEFAULT_CHUNKING_OPTIONS.strategy!,
    separator,
    includeMetadata = DEFAULT_CHUNKING_OPTIONS.includeMetadata!,
  } = options;

  // Select chunking strategy
  let chunks: DocumentChunk[];
  switch (strategy) {
    case 'paragraph':
      chunks = chunkByParagraph(document, {
        chunkSize,
        chunkOverlap,
        separator: separator || '\n\n',
      });
      break;
    case 'sentence':
      chunks = chunkBySentence(document, { chunkSize, chunkOverlap });
      break;
    case 'semantic':
      chunks = chunkBySemantic(document, { chunkSize, chunkOverlap });
      break;
    case 'fixed':
    default:
      chunks = chunkByFixedSize(document, { chunkSize, chunkOverlap });
      break;
  }

  // Add document metadata to chunks if requested
  if (includeMetadata) {
    chunks = chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...document.metadata,
        ...chunk.metadata,
      },
    }));
  }

  // Set previous and next chunk IDs
  for (let i = 0; i < chunks.length; i++) {
    chunks[i].metadata.chunkIndex = i;
    chunks[i].metadata.isFirst = i === 0;
    chunks[i].metadata.isLast = i === chunks.length - 1;

    if (i > 0) {
      chunks[i].metadata.previousChunkId = chunks[i - 1].id;
    }

    if (i < chunks.length - 1) {
      chunks[i].metadata.nextChunkId = chunks[i + 1].id;
    }
  }

  return chunks;
}

/**
 * Chunk a document using fixed-size chunks
 */
function chunkByFixedSize(
  document: Document,
  options: { chunkSize: number; chunkOverlap: number }
): DocumentChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const { id, content } = document;
  const chunks: DocumentChunk[] = [];

  if (!content || content.length === 0) {
    return [];
  }

  // Calculate the step size (how much to move forward after each chunk)
  const stepSize = chunkSize - chunkOverlap;

  // Generate chunks
  for (let i = 0; i < content.length; i += stepSize) {
    // Ensure we don't go beyond the content length
    const end = Math.min(i + chunkSize, content.length);
    const chunkContent = content.slice(i, end);

    // Only create a chunk if it has content
    if (chunkContent.trim().length > 0) {
      chunks.push({
        id: `${id}-chunk-${chunks.length}`,
        documentId: id,
        content: chunkContent,
        startPosition: i,
        endPosition: end,
        metadata: {
          chunkIndex: chunks.length,
        },
      });
    }

    // If we've reached the end, break
    if (end === content.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Chunk a document by paragraphs
 */
function chunkByParagraph(
  document: Document,
  options: { chunkSize: number; chunkOverlap: number; separator: string }
): DocumentChunk[] {
  const { chunkSize, chunkOverlap, separator } = options;
  const { id, content } = document;
  const chunks: DocumentChunk[] = [];

  if (!content || content.length === 0) {
    return [];
  }

  // Split content by separator
  const paragraphs = content.split(separator).filter((p) => p.trim().length > 0);

  let currentChunk = '';
  let chunkStart = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    // If adding this paragraph would exceed chunk size, create a new chunk
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      // Add the current chunk
      const chunkEnd = chunkStart + currentChunk.length;
      chunks.push({
        id: `${id}-chunk-${chunks.length}`,
        documentId: id,
        content: currentChunk,
        startPosition: chunkStart,
        endPosition: chunkEnd,
        metadata: {},
      });

      // Start a new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
      currentChunk = currentChunk.substring(overlapStart) + paragraph + separator;
      chunkStart += overlapStart;
    } else {
      // Add paragraph to current chunk
      currentChunk += paragraph + separator;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${id}-chunk-${chunks.length}`,
      documentId: id,
      content: currentChunk,
      startPosition: chunkStart,
      endPosition: chunkStart + currentChunk.length,
      metadata: {},
    });
  }

  return chunks;
}

/**
 * Chunk a document by sentences
 */
function chunkBySentence(
  document: Document,
  options: { chunkSize: number; chunkOverlap: number }
): DocumentChunk[] {
  const { id, content } = document;

  // Simple sentence detection
  const sentences = content
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .filter((s) => s.trim().length > 0);

  // Use paragraph chunking with sentences as the unit
  return chunkByParagraph(document, {
    ...options,
    separator: '|',
  });
}

/**
 * Chunk a document semantically (placeholder implementation)
 * This would ideally use an ML model to find semantic boundaries
 */
function chunkBySemantic(
  document: Document,
  options: { chunkSize: number; chunkOverlap: number }
): DocumentChunk[] {
  // For now, fall back to paragraph chunking
  // In a real implementation, this would use semantic analysis
  return chunkByParagraph(document, {
    ...options,
    separator: '\n\n',
  });
}

/**
 * Create a document object from raw content
 */
export function createDocument(
  content: string,
  metadata: Partial<DocumentMetadata> = {},
  id?: string
): Document {
  return {
    id: id || generateDocumentId(),
    content,
    metadata: {
      title: extractTitle(content),
      createdAt: new Date(),
      ...metadata,
    },
  };
}

/**
 * Generate a random document ID
 */
function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Extract a title from document content
 */
function extractTitle(content: string): string {
  // Try to find a title from the first lines
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return 'Untitled Document';
  }

  // Check for Markdown headers
  const headerMatch = lines[0].match(/^#+\s+(.+)$/);
  if (headerMatch) {
    return headerMatch[1];
  }

  // Use first line if it's reasonably short
  if (lines[0].length <= 100) {
    return lines[0];
  }

  // Default title
  return 'Untitled Document';
}
