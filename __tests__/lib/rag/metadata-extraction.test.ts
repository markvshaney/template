import { extractMetadata, createEnhancedDocument } from '../../../src/lib/rag/metadata-extraction';
import {
  Document,
  DocumentFileType,
  ContentStructureType,
  MetadataExtractionOptions,
} from '../../../src/lib/rag/types';

describe('Metadata Extraction', () => {
  // Sample document for testing
  const markdownDocument: Document = {
    id: 'test-doc-1',
    content: `# Test Document

This is a test document that will be used for testing metadata extraction.

## Section 1
This is the first section of the document. It contains several sentences
that will be used to test language detection and complexity metrics.

## Section 2
This is the second section of the document. It also contains multiple sentences
with varying lengths to test different extraction features.

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

> This is a blockquote that should be detected in structure analysis.
`,
    metadata: {
      url: 'https://example.com/test-document.md',
    },
  };

  const htmlDocument: Document = {
    id: 'test-doc-2',
    content: `<html>
<head>
  <title>HTML Test Document</title>
</head>
<body>
  <h1>HTML Test Document</h1>
  <p>This is a test HTML document for metadata extraction.</p>
  
  <h2>Section 1</h2>
  <p>This is the first section with some <b>formatted</b> text.</p>
  
  <h2>Section 2</h2>
  <ul>
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
  
  <pre><code>
  const test = "code block";
  console.log(test);
  </code></pre>
</body>
</html>`,
    metadata: {
      url: 'https://example.com/test-document.html',
    },
  };

  describe('extractMetadata', () => {
    it('should extract basic metadata from a document', async () => {
      const metadata = await extractMetadata(markdownDocument);

      // Title should be extracted from heading
      expect(metadata.title).toBe('Test Document');

      // Document type should be inferred
      expect(metadata.documentType).toBe(DocumentFileType.MARKDOWN);

      // Reading time should be calculated
      expect(metadata.readingTime).toBeGreaterThan(0);

      // Language should be detected
      expect(metadata.language).toBeDefined();
      expect(metadata.language?.languageCode).toBe('en');
      expect(metadata.language?.confidence).toBeGreaterThan(0);

      // Keywords should be extracted
      expect(metadata.keywords).toBeDefined();
      expect(metadata.keywords?.length).toBeGreaterThan(0);
    });

    it('should respect options for extraction', async () => {
      // Test with minimal options
      const minimalOptions: MetadataExtractionOptions = {
        extractLanguage: false,
        extractKeywords: false,
        calculateReadingTime: true,
        analyzeStructure: false,
      };

      const minimalMetadata = await extractMetadata(markdownDocument, minimalOptions);

      // Title should still be extracted (always performed)
      expect(minimalMetadata.title).toBe('Test Document');

      // Reading time should be calculated
      expect(minimalMetadata.readingTime).toBeGreaterThan(0);

      // These should be undefined because they were disabled
      expect(minimalMetadata.language).toBeUndefined();
      expect(minimalMetadata.keywords).toBeUndefined();
      expect(minimalMetadata.contentStructure).toBeUndefined();
    });

    it('should analyze document structure', async () => {
      const options: MetadataExtractionOptions = {
        analyzeStructure: true,
      };

      const metadata = await extractMetadata(markdownDocument, options);

      // Content structure should be analyzed
      expect(metadata.contentStructure).toBeDefined();

      if (metadata.contentStructure) {
        // Should find sections
        expect(metadata.contentStructure.sections.length).toBeGreaterThan(0);

        // Should detect headings
        const headings = metadata.contentStructure.sections.filter(
          (section) => section.type === ContentStructureType.HEADING
        );
        expect(headings.length).toBeGreaterThan(0);

        // Should detect code blocks
        const codeBlocks = metadata.contentStructure.sections.filter(
          (section) => section.type === ContentStructureType.CODE
        );
        expect(codeBlocks.length).toBeGreaterThan(0);

        // Should detect lists
        const lists = metadata.contentStructure.sections.filter(
          (section) => section.type === ContentStructureType.LIST
        );
        expect(lists.length).toBeGreaterThan(0);

        // Should detect quotes
        const quotes = metadata.contentStructure.sections.filter(
          (section) => section.type === ContentStructureType.QUOTE
        );
        expect(quotes.length).toBeGreaterThan(0);

        // Should generate table of contents
        expect(metadata.contentStructure.tableOfContents).toBeDefined();
        expect(metadata.contentStructure.tableOfContents?.length).toBeGreaterThan(0);
      }
    });

    it('should extract title from content when not provided', async () => {
      const noTitleDoc: Document = {
        id: 'no-title',
        content: 'This is a document without an explicit title.',
        metadata: {},
      };

      const metadata = await extractMetadata(noTitleDoc);

      // Should extract title from first sentence
      expect(metadata.title).toBe('This is a document without an explicit title.');
    });

    it('should extract title from URL when available', async () => {
      const urlTitleDoc: Document = {
        id: 'url-title',
        content: 'Some content without a clear title.',
        metadata: {
          url: 'https://example.com/my-awesome-document.pdf',
        },
      };

      const metadata = await extractMetadata(urlTitleDoc);

      // Should extract title from URL filename
      expect(metadata.title).toBe('My awesome document');
    });

    it('should determine document type from content', async () => {
      // Test HTML detection
      const htmlMetadata = await extractMetadata(htmlDocument);
      expect(htmlMetadata.documentType).toBe(DocumentFileType.HTML);

      // Test JSON detection
      const jsonDoc: Document = {
        id: 'json-doc',
        content: '{"key": "value", "array": [1, 2, 3]}',
        metadata: {},
      };
      const jsonMetadata = await extractMetadata(jsonDoc);
      expect(jsonMetadata.documentType).toBe(DocumentFileType.JSON);
    });
  });

  describe('createEnhancedDocument', () => {
    it('should create an enhanced document with extracted metadata', async () => {
      const enhancedDoc = await createEnhancedDocument(markdownDocument);

      // Should preserve original document properties
      expect(enhancedDoc.id).toBe(markdownDocument.id);
      expect(enhancedDoc.content).toBe(markdownDocument.content);

      // Should enhance metadata
      expect(enhancedDoc.metadata.title).toBe('Test Document');
      expect(enhancedDoc.metadata.documentType).toBe(DocumentFileType.MARKDOWN);
      expect(enhancedDoc.metadata.readingTime).toBeGreaterThan(0);
    });

    it('should respect metadata extraction options', async () => {
      const options: MetadataExtractionOptions = {
        extractLanguage: true,
        extractKeywords: true,
        generateSummary: true,
        maxSummaryLength: 100,
      };

      const enhancedDoc = await createEnhancedDocument(markdownDocument, options);

      // Should have the requested metadata
      expect(enhancedDoc.metadata.language).toBeDefined();
      expect(enhancedDoc.metadata.keywords).toBeDefined();
      expect(enhancedDoc.metadata.summary).toBeDefined();

      // Summary should respect max length
      if (enhancedDoc.metadata.summary) {
        expect(enhancedDoc.metadata.summary.length).toBeLessThanOrEqual(100);
      }
    });
  });
});
