import {
  scoreResultRelevance,
  filterResults,
  groupResultsByDomain,
  enrichResults,
  mergeResults,
  processResults,
  ResultFilterOptions,
} from '../../../src/lib/search/result-processor';
import { SearchResult } from '../../../src/lib/search/types';

describe('Search Result Processor', () => {
  // Sample test data
  const sampleResults: SearchResult[] = [
    {
      title: 'JavaScript Promises Explained',
      url: 'https://example.com/javascript-promises',
      snippet: 'Learn how JavaScript promises work and how to use them effectively in your code.',
      position: 1,
      metadata: {},
    },
    {
      title: 'Using async/await in JavaScript',
      url: 'https://example.com/async-await',
      snippet:
        'A comprehensive guide to using async/await syntax in JavaScript for asynchronous programming.',
      position: 2,
      metadata: {},
    },
    {
      title: 'Mastering JavaScript Promises',
      url: 'https://another-site.com/js-promises',
      snippet: 'Advanced techniques for working with JavaScript promises in complex applications.',
      position: 3,
      metadata: {},
    },
    {
      title: 'Introduction to Web Development',
      url: 'https://webdev.org/intro',
      snippet: 'Get started with web development using HTML, CSS, and JavaScript.',
      position: 4,
      metadata: {},
    },
    {
      title: 'JavaScript Event Loop Explained',
      url: 'https://techblog.com/event-loop',
      snippet:
        'Understanding the JavaScript event loop and how it relates to promises and async programming.',
      position: 5,
      metadata: {
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      },
    },
  ];

  describe('scoreResultRelevance', () => {
    it('should score results based on query terms presence', () => {
      const result = sampleResults[0];
      const score = scoreResultRelevance(result, 'javascript promises');

      // Both terms are in title and one in snippet, so score should be high
      expect(score).toBeGreaterThan(0.7);
    });

    it('should give higher scores to results with terms in title', () => {
      const titleResult = sampleResults[0]; // Has terms in title
      const snippetResult = {
        ...sampleResults[0],
        title: 'Programming Guide',
        position: 1,
      };

      const titleScore = scoreResultRelevance(titleResult, 'javascript promises');
      const snippetScore = scoreResultRelevance(snippetResult, 'javascript promises');

      expect(titleScore).toBeGreaterThan(snippetScore);
    });

    it('should boost scores for results with better position', () => {
      const topResult = { ...sampleResults[0], position: 1 };
      const lowerResult = { ...sampleResults[0], position: 10 };

      const topScore = scoreResultRelevance(topResult, 'javascript');
      const lowerScore = scoreResultRelevance(lowerResult, 'javascript');

      expect(topScore).toBeGreaterThan(lowerScore);
    });
  });

  describe('filterResults', () => {
    it('should filter results by minimum relevance', () => {
      const options: ResultFilterOptions = {
        minRelevance: 0.8,
      };

      const filtered = filterResults(sampleResults, options, 'javascript promises');

      // Only highly relevant results should remain
      expect(filtered.length).toBeLessThan(sampleResults.length);
      filtered.forEach((result) => {
        const score = scoreResultRelevance(result, 'javascript promises');
        expect(score).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should filter results by included domains', () => {
      const options: ResultFilterOptions = {
        includeDomains: ['example.com'],
      };

      const filtered = filterResults(sampleResults, options);

      expect(filtered.length).toBe(2);
      filtered.forEach((result) => {
        expect(result.url).toContain('example.com');
      });
    });

    it('should filter results by excluded domains', () => {
      const options: ResultFilterOptions = {
        excludeDomains: ['example.com'],
      };

      const filtered = filterResults(sampleResults, options);

      expect(filtered.length).toBe(3);
      filtered.forEach((result) => {
        expect(result.url).not.toContain('example.com');
      });
    });

    it('should filter results by required terms', () => {
      const options: ResultFilterOptions = {
        mustIncludeTerms: ['promises'],
      };

      const filtered = filterResults(sampleResults, options);

      expect(filtered.length).toBe(3);
      filtered.forEach((result) => {
        const content = `${result.title} ${result.snippet}`.toLowerCase();
        expect(content).toContain('promises');
      });
    });

    it('should filter results by excluded terms', () => {
      const options: ResultFilterOptions = {
        excludeTerms: ['async'],
      };

      const filtered = filterResults(sampleResults, options);

      expect(filtered.length).toBe(3);
      filtered.forEach((result) => {
        const content = `${result.title} ${result.snippet}`.toLowerCase();
        expect(content).not.toContain('async');
      });
    });

    it('should filter results by maximum age', () => {
      const recentResult = {
        ...sampleResults[0],
        metadata: {
          publishedAt: new Date().toISOString(), // Today
        },
      };

      const oldResult = {
        ...sampleResults[1],
        metadata: {
          publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        },
      };

      const options: ResultFilterOptions = {
        maxAgeDays: 45,
      };

      const filtered = filterResults([recentResult, oldResult], options);

      expect(filtered.length).toBe(1);
      expect(filtered[0].url).toBe(recentResult.url);
    });
  });

  describe('groupResultsByDomain', () => {
    it('should group results with no more than the specified number per domain', () => {
      // Add another result from example.com
      const extendedResults = [
        ...sampleResults,
        {
          title: 'JavaScript Best Practices',
          url: 'https://example.com/js-best-practices',
          snippet: 'Learn the best practices for writing clean and maintainable JavaScript code.',
          position: 6,
          metadata: {},
        },
      ];

      // We should have 3 results from example.com now
      const exampleComResults = extendedResults.filter((r) => r.url.includes('example.com'));
      expect(exampleComResults.length).toBe(3);

      // Group with max 2 per domain
      const grouped = groupResultsByDomain(extendedResults, 2);

      // Count results from example.com
      const groupedExampleComResults = grouped.filter((r) => r.url.includes('example.com'));
      expect(groupedExampleComResults.length).toBe(2);

      // Verify the results are sorted by position
      expect(grouped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ position: 1 }),
          expect.objectContaining({ position: 2 }),
        ])
      );
    });

    it('should maintain sort order by position', () => {
      const grouped = groupResultsByDomain(sampleResults);

      // Verify that results are still sorted by position
      for (let i = 1; i < grouped.length; i++) {
        expect(grouped[i].position).toBeGreaterThanOrEqual(grouped[i - 1].position);
      }
    });
  });

  describe('enrichResults', () => {
    it('should add domain to metadata', () => {
      const enriched = enrichResults(sampleResults);

      enriched.forEach((result) => {
        expect(result.metadata).toHaveProperty('domain');
        expect(typeof result.metadata?.domain).toBe('string');
      });
    });

    it('should determine content type based on URL', () => {
      const results = [
        {
          title: 'YouTube Video',
          url: 'https://youtube.com/watch?v=12345',
          snippet: 'Video about JavaScript',
          position: 1,
          metadata: {},
        },
        {
          title: 'Wikipedia Article',
          url: 'https://en.wikipedia.org/wiki/JavaScript',
          snippet: 'JavaScript info',
          position: 2,
          metadata: {},
        },
        {
          title: 'PDF Document',
          url: 'https://example.com/document.pdf',
          snippet: 'PDF about JavaScript',
          position: 3,
          metadata: {},
        },
        {
          title: 'GitHub Repository',
          url: 'https://github.com/user/repo',
          snippet: 'JavaScript repository',
          position: 4,
          metadata: {},
        },
      ];

      const enriched = enrichResults(results);

      expect(enriched[0].metadata?.contentType).toBe('video');
      expect(enriched[1].metadata?.contentType).toBe('reference');
      expect(enriched[2].metadata?.contentType).toBe('document');
      expect(enriched[3].metadata?.contentType).toBe('code');
    });
  });

  describe('mergeResults', () => {
    it('should merge multiple result sets', () => {
      const set1 = sampleResults.slice(0, 2);
      const set2 = sampleResults.slice(2, 4);

      const merged = mergeResults([set1, set2]);

      expect(merged.length).toBe(4);
    });

    it('should remove duplicates when specified', () => {
      const set1 = sampleResults.slice(0, 3);
      const set2 = [
        sampleResults[1], // Duplicate from set1
        sampleResults[4], // Unique
      ];

      const mergedWithDuplicates = mergeResults([set1, set2], false);
      const mergedWithoutDuplicates = mergeResults([set1, set2], true);

      expect(mergedWithDuplicates.length).toBe(5);
      expect(mergedWithoutDuplicates.length).toBe(4);
    });
  });

  describe('processResults', () => {
    it('should apply multiple processing steps in the correct order', () => {
      // Create a test case with multiple domains and varying relevance
      const testResults = [
        ...sampleResults,
        {
          title: 'More JavaScript on Example.com',
          url: 'https://example.com/more-js',
          snippet: 'More JavaScript content',
          position: 6,
          metadata: {},
        },
        {
          title: 'Yet Another JavaScript Article',
          url: 'https://example.com/yet-another',
          snippet: 'Another article about JavaScript',
          position: 7,
          metadata: {},
        },
      ];

      // Configure processing with filtering, grouping, and enrichment
      const processed = processResults(testResults, {
        query: 'javascript promises',
        filter: {
          mustIncludeTerms: ['javascript'],
          excludeDomains: ['webdev.org'],
        },
        maxPerDomain: 2,
        enrich: true,
      });

      // Verify filtering worked - webdev.org should be removed
      expect(processed.some((r) => r.url.includes('webdev.org'))).toBe(false);

      // Verify domain grouping worked - no more than 2 from example.com
      const exampleResults = processed.filter((r) => r.url.includes('example.com'));
      expect(exampleResults.length).toBeLessThanOrEqual(2);

      // Verify enrichment worked - all results should have domain metadata
      processed.forEach((result) => {
        expect(result.metadata).toHaveProperty('domain');
      });
    });
  });
});
