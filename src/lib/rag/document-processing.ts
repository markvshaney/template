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
  [key: string]: unknown;
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
 * This is more accurate than fixed-size chunking for preserving semantic meaning
 */
function chunkBySentence(
  document: Document,
  options: { chunkSize: number; chunkOverlap: number }
): DocumentChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const { id, content } = document;
  const chunks: DocumentChunk[] = [];

  if (!content || content.length === 0) {
    return [];
  }

  // Simple sentence splitting using common sentence terminators
  // More advanced implementations might use NLP libraries
  const sentenceDelimiters = /(?<=[.!?])\s+(?=[A-Z])/g;
  const sentences = content.split(sentenceDelimiters).filter((s) => s.trim().length > 0);

  let currentChunk = '';
  let currentSentences: string[] = [];
  let chunkStart = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // If adding this sentence would exceed chunk size, create a new chunk
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      // Add the current chunk
      const chunkEnd = chunkStart + currentChunk.length;
      chunks.push({
        id: `${id}-chunk-${chunks.length}`,
        documentId: id,
        content: currentChunk,
        startPosition: chunkStart,
        endPosition: chunkEnd,
        metadata: {
          sentences: currentSentences.length,
        },
      });

      // Handle overlap
      const overlapContent = calculateSentenceOverlap(currentSentences, chunkOverlap);
      const overlapStart = chunkEnd - overlapContent.length;

      // Start a new chunk with overlap
      currentChunk = overlapContent + sentence;
      currentSentences = extractOverlapSentences(currentSentences, chunkOverlap);
      currentSentences.push(sentence);
      chunkStart = overlapStart;
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
      currentSentences.push(sentence);
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
      metadata: {
        sentences: currentSentences.length,
      },
    });
  }

  return chunks;
}

/**
 * Calculate the sentence overlap for the next chunk
 */
function calculateSentenceOverlap(sentences: string[], overlapSize: number): string {
  let overlap = '';
  let overlapLength = 0;

  // Start from the end of the sentences array
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];

    if (overlapLength + sentence.length > overlapSize) {
      // If this sentence would exceed the overlap size, stop
      break;
    }

    // Add this sentence to the overlap (at the beginning since we're going backwards)
    overlap = sentence + (overlap.length > 0 ? ' ' : '') + overlap;
    overlapLength += sentence.length + 1; // +1 for the space
  }

  return overlap;
}

/**
 * Extract sentences that should be included in the overlap for the next chunk
 */
function extractOverlapSentences(sentences: string[], overlapSize: number): string[] {
  const overlapSentences: string[] = [];
  let overlapLength = 0;

  // Start from the end of the sentences array
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i];

    if (overlapLength + sentence.length > overlapSize) {
      // If this sentence would exceed the overlap size, stop
      break;
    }

    // Add this sentence to the overlap sentences
    overlapSentences.unshift(sentence);
    overlapLength += sentence.length + 1; // +1 for the space
  }

  return overlapSentences;
}

/**
 * Chunk a document using semantic boundaries
 * This attempts to keep related content together based on semantic meaning
 */
function chunkBySemantic(
  document: Document,
  options: { chunkSize: number; chunkOverlap: number }
): DocumentChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const { id, content } = document;
  const chunks: DocumentChunk[] = [];

  if (!content || content.length === 0) {
    return [];
  }

  // Split by headers or semantic markers
  // Simplified approach: split by headers, sections, or multiple newlines
  const sectionDelimiters = /\n\s*#{1,6}\s+|\n\s*[-=]{3,}\s*\n|\n{3,}/g;
  const sections = content.split(sectionDelimiters).filter((s) => s.trim().length > 0);

  // Get the section markers themselves
  const markers: string[] = [];
  let match;
  const markerRegex = /\n\s*#{1,6}\s+|\n\s*[-=]{3,}\s*\n|\n{3,}/g;
  while ((match = markerRegex.exec(content)) !== null) {
    markers.push(match[0]);
  }

  let currentChunk = '';
  let chunkSections: string[] = [];
  let chunkStart = 0;

  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const marker = i > 0 && i - 1 < markers.length ? markers[i - 1] : '';
    const sectionWithMarker = marker + section;

    // If adding this section would exceed chunk size, create a new chunk
    if (currentChunk.length + sectionWithMarker.length > chunkSize && currentChunk.length > 0) {
      // Add the current chunk
      const chunkEnd = chunkStart + currentChunk.length;
      chunks.push({
        id: `${id}-chunk-${chunks.length}`,
        documentId: id,
        content: currentChunk,
        startPosition: chunkStart,
        endPosition: chunkEnd,
        metadata: {
          sections: chunkSections.length,
        },
      });

      // Calculate the amount of overlap we need to preserve
      // For semantic chunking, we usually want entire sections for context
      if (chunkOverlap > 0 && chunkSections.length > 0) {
        const overlapSections = calculateSectionOverlap(chunkSections, chunkOverlap);
        const overlapContent = overlapSections.join('');

        // Start a new chunk with the overlap
        currentChunk = overlapContent + sectionWithMarker;
        chunkSections = [
          ...overlapSections.map(
            (_, idx) => chunkSections[chunkSections.length - overlapSections.length + idx]
          ),
          section,
        ];

        // Adjust the start position based on the overlap
        chunkStart = chunkEnd - overlapContent.length;
      } else {
        // No overlap, start fresh
        currentChunk = sectionWithMarker;
        chunkSections = [section];
        chunkStart = chunkEnd;
      }
    } else {
      // Add section to current chunk
      currentChunk += sectionWithMarker;
      chunkSections.push(section);
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
      metadata: {
        sections: chunkSections.length,
      },
    });
  }

  return chunks;
}

/**
 * Calculate the sections to include in the overlap for the next chunk
 */
function calculateSectionOverlap(sections: string[], overlapSize: number): string[] {
  const overlapSections: string[] = [];
  let overlapLength = 0;

  // Start from the end of the sections array
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i];

    if (overlapLength + section.length > overlapSize) {
      // If this section would exceed the overlap size, stop
      break;
    }

    // Add this section to the overlap sections
    overlapSections.unshift(section);
    overlapLength += section.length;
  }

  return overlapSections;
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
