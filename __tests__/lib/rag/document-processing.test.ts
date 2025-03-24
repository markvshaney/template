import {
  Document,
  DocumentChunk,
  chunkDocument,
  createDocument,
} from '../../../src/lib/rag/document-processing';

describe('Document Processing', () => {
  // Sample document for testing
  const testDocument: Document = {
    id: 'test-doc-1',
    content: `# Test Document

This is a test document that will be used for testing chunking algorithms.

## Section 1
This is the first section of the document. It contains several sentences
that will be used to test sentence-based chunking.

## Section 2
This is the second section of the document. It also contains multiple sentences
with varying lengths to test different chunking approaches.

### Subsection 2.1
This is a subsection with some code:

\`\`\`javascript
function testFunction() {
  console.log("Hello world");
  return true;
}
\`\`\`

## Section 3
- Item 1
- Item 2
- Item 3

> This is a blockquote that should be detected in semantic chunking.
`,
    metadata: {
      title: 'Test Document',
      documentType: 'markdown',
    },
  };

  describe('chunkDocument', () => {
    it('should chunk a document using the default fixed-size strategy', () => {
      const chunks = chunkDocument(testDocument);

      // Check if chunks were created
      expect(chunks.length).toBeGreaterThan(0);

      // Check chunk properties
      chunks.forEach((chunk) => {
        expect(chunk.id).toMatch(new RegExp(`^${testDocument.id}-chunk-\\d+$`));
        expect(chunk.documentId).toBe(testDocument.id);
        expect(typeof chunk.content).toBe('string');
        expect(chunk.content.length).toBeGreaterThan(0);
        expect(chunk.startPosition).toBeGreaterThanOrEqual(0);
        expect(chunk.endPosition).toBeGreaterThan(chunk.startPosition);

        // Check metadata
        expect(chunk.metadata).toHaveProperty('title', testDocument.metadata.title);
        expect(chunk.metadata).toHaveProperty('documentType', testDocument.metadata.documentType);
        expect(chunk.metadata).toHaveProperty('chunkIndex');

        // Check chunk linking based on position in sequence
        if (chunk.metadata.isFirst) {
          // First chunk should have no previous and should have next
          expect(chunk.metadata.previousChunkId).toBeUndefined();
          expect(chunk.metadata.nextChunkId).toBeDefined();
        } else if (chunk.metadata.isLast) {
          // Last chunk should have previous and no next
          expect(chunk.metadata.previousChunkId).toBeDefined();
          expect(chunk.metadata.nextChunkId).toBeUndefined();
        } else {
          // Middle chunks should have both previous and next
          expect(chunk.metadata.previousChunkId).toBeDefined();
          expect(chunk.metadata.nextChunkId).toBeDefined();
        }
      });

      // The content of all chunks combined should equal the original document
      // (accounting for possible overlap)
      const firstChunk = chunks[0];
      const lastChunk = chunks[chunks.length - 1];
      expect(firstChunk.startPosition).toBe(0);
      expect(lastChunk.endPosition).toBe(testDocument.content.length);
    });

    it('should respect the chunkSize option', () => {
      const chunkSize = 200;
      const chunks = chunkDocument(testDocument, { chunkSize, chunkOverlap: 0 });

      // Each chunk (except possibly the last) should be approximately chunkSize
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].content.length).toBeLessThanOrEqual(chunkSize);
        // Allow some flexibility due to chunking logic
        expect(chunks[i].content.length).toBeGreaterThan(chunkSize * 0.5);
      }
    });

    it('should properly implement chunk overlap', () => {
      const chunkSize = 200;
      const chunkOverlap = 50;
      const chunks = chunkDocument(testDocument, { chunkSize, chunkOverlap });

      // Check that adjacent chunks have overlapping content
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentChunkEnd = chunks[i].content.substring(
          chunks[i].content.length - chunkOverlap
        );
        const nextChunkStart = chunks[i + 1].content.substring(0, chunkOverlap);

        // There should be some overlap between chunks
        // Note: The exact match might not always work due to chunking strategies
        // but there should be significant similarity
        expect(currentChunkEnd).toEqual(expect.stringContaining(nextChunkStart.substring(0, 10)));
      }
    });

    it('should chunk by paragraph strategy', () => {
      const chunks = chunkDocument(testDocument, { strategy: 'paragraph' });

      // Ensure chunks were created
      expect(chunks.length).toBeGreaterThan(0);

      // Check that paragraphs are preserved
      const paragraphCount = testDocument.content.split('\n\n').length;

      // The number of chunks should be less than or equal to the number of paragraphs
      // (depending on chunkSize and paragraph sizes)
      expect(chunks.length).toBeLessThanOrEqual(paragraphCount);
    });

    it('should chunk by sentence strategy', () => {
      const chunks = chunkDocument(testDocument, { strategy: 'sentence' });

      // Ensure chunks were created
      expect(chunks.length).toBeGreaterThan(0);

      // Check for sentence metadata
      chunks.forEach((chunk) => {
        expect(chunk.metadata).toHaveProperty('sentences');
        expect(chunk.metadata.sentences).toBeGreaterThan(0);
      });
    });

    it('should chunk by semantic strategy', () => {
      const chunks = chunkDocument(testDocument, { strategy: 'semantic' });

      // Ensure chunks were created
      expect(chunks.length).toBeGreaterThan(0);

      // Check for section metadata
      chunks.forEach((chunk) => {
        expect(chunk.metadata).toHaveProperty('sections');
      });

      // Check that headings are preserved at the beginning of chunks
      // This is a simplification since we can't check all heading patterns
      const headingMatches = chunks.some(
        (chunk) => chunk.content.match(/^#+\s+/) || chunk.content.includes('\n#+\s+')
      );

      expect(headingMatches).toBe(true);
    });

    it('should handle empty documents', () => {
      const emptyDocument: Document = {
        id: 'empty-doc',
        content: '',
        metadata: {},
      };

      const chunks = chunkDocument(emptyDocument);
      expect(chunks).toEqual([]);
    });

    it('should handle documents with minimal content', () => {
      const smallDocument: Document = {
        id: 'small-doc',
        content: 'Just a small document',
        metadata: {},
      };

      const chunks = chunkDocument(smallDocument);
      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe(smallDocument.content);
    });
  });

  describe('createDocument', () => {
    it('should create a document with the given content and metadata', () => {
      const content = 'Test content';
      const metadata = { title: 'Test Title' };

      const document = createDocument(content, metadata);

      expect(document.id).toBeDefined();
      expect(document.content).toBe(content);
      expect(document.metadata).toEqual(metadata);
    });

    it('should generate a unique ID for each document', () => {
      const doc1 = createDocument('Content 1');
      const doc2 = createDocument('Content 2');

      expect(doc1.id).not.toBe(doc2.id);
    });

    it('should allow providing a custom ID', () => {
      const customId = 'custom-doc-id';
      const document = createDocument('Content', {}, customId);

      expect(document.id).toBe(customId);
    });
  });
});
