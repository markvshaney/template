/**
 * Search Result Processor
 * Utilities for processing, filtering, and enhancing search results
 */

import { SearchResult } from './types';

/**
 * Filter options for search results
 */
export interface ResultFilterOptions {
  /** Minimum relevance score (0-1) */
  minRelevance?: number;
  /** Domains to include (if provided, only these domains will be included) */
  includeDomains?: string[];
  /** Domains to exclude */
  excludeDomains?: string[];
  /** Filter results by content type (e.g., 'article', 'video', 'image') */
  contentTypes?: string[];
  /** Maximum age of content in days */
  maxAgeDays?: number;
  /** Only include results with these terms in the title or snippet */
  mustIncludeTerms?: string[];
  /** Exclude results with these terms in the title or snippet */
  excludeTerms?: string[];
}

/**
 * Score result relevance based on query terms presence
 *
 * @param result Search result to score
 * @param query Original search query
 * @returns Score between 0 and 1
 */
export function scoreResultRelevance(result: SearchResult, query: string): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);
  if (queryTerms.length === 0) return 0.5; // Default score for empty or short queries

  const title = result.title.toLowerCase();
  const snippet = result.snippet.toLowerCase();

  // Score based on terms found in title (weighted higher) and snippet
  let titleMatches = 0;
  let snippetMatches = 0;

  for (const term of queryTerms) {
    if (title.includes(term)) titleMatches++;
    if (snippet.includes(term)) snippetMatches++;
  }

  // Calculate weighted score
  const titleScore = (titleMatches / queryTerms.length) * 0.7;
  const snippetScore = (snippetMatches / queryTerms.length) * 0.3;

  // Position boost - earlier results get higher scores
  const positionBoost = Math.max(0, 1 - (result.position - 1) / 10);

  return Math.min(1, titleScore + snippetScore + positionBoost * 0.2);
}

/**
 * Filter search results based on filter options
 *
 * @param results Array of search results to filter
 * @param options Filter options
 * @param query Original search query for relevance scoring
 * @returns Filtered results array
 */
export function filterResults(
  results: SearchResult[],
  options: ResultFilterOptions,
  query?: string
): SearchResult[] {
  return results.filter((result) => {
    // Apply relevance filter if query is provided
    if (query && options.minRelevance) {
      const relevance = scoreResultRelevance(result, query);
      if (relevance < options.minRelevance) return false;
    }

    // Domain filtering
    if (options.includeDomains && options.includeDomains.length > 0) {
      const domain = extractDomain(result.url);
      if (!options.includeDomains.some((d) => domain.includes(d))) return false;
    }

    if (options.excludeDomains && options.excludeDomains.length > 0) {
      const domain = extractDomain(result.url);
      if (options.excludeDomains.some((d) => domain.includes(d))) return false;
    }

    // Term filtering
    if (options.mustIncludeTerms && options.mustIncludeTerms.length > 0) {
      const content = `${result.title} ${result.snippet}`.toLowerCase();
      if (!options.mustIncludeTerms.every((term) => content.includes(term.toLowerCase()))) {
        return false;
      }
    }

    if (options.excludeTerms && options.excludeTerms.length > 0) {
      const content = `${result.title} ${result.snippet}`.toLowerCase();
      if (options.excludeTerms.some((term) => content.includes(term.toLowerCase()))) {
        return false;
      }
    }

    // Content type filtering based on metadata
    if (options.contentTypes && options.contentTypes.length > 0) {
      const contentType = result.metadata?.contentType as string | undefined;
      if (!contentType || !options.contentTypes.includes(contentType)) {
        return false;
      }
    }

    // Age filtering (if timestamp metadata is available)
    if (options.maxAgeDays && result.metadata?.publishedAt) {
      const publishDate = new Date(result.metadata.publishedAt as string);
      const ageDays = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > options.maxAgeDays) return false;
    }

    return true;
  });
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // If URL parsing fails, attempt basic extraction
    const match = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/i);
    return match ? match[1] : url;
  }
}

/**
 * Group results by domain
 *
 * @param results Search results to group
 * @param maxPerDomain Maximum results to include per domain
 * @returns Grouped results with at most maxPerDomain results per domain
 */
export function groupResultsByDomain(
  results: SearchResult[],
  maxPerDomain: number = 2
): SearchResult[] {
  const domainGroups: Record<string, SearchResult[]> = {};

  // Group results by domain
  for (const result of results) {
    const domain = extractDomain(result.url);
    if (!domainGroups[domain]) {
      domainGroups[domain] = [];
    }
    domainGroups[domain].push(result);
  }

  // Take at most maxPerDomain results from each domain
  const groupedResults: SearchResult[] = [];
  for (const domain in domainGroups) {
    // Sort each domain's results by position
    const domainResults = domainGroups[domain].sort((a, b) => a.position - b.position);
    groupedResults.push(...domainResults.slice(0, maxPerDomain));
  }

  // Sort the final results by original position
  return groupedResults.sort((a, b) => a.position - b.position);
}

/**
 * Enrich search results with additional metadata
 *
 * @param results Search results to enrich
 * @returns Enriched results with additional metadata
 */
export function enrichResults(results: SearchResult[]): SearchResult[] {
  return results.map((result) => {
    const domain = extractDomain(result.url);
    const enriched = { ...result };

    // Add domain to metadata
    enriched.metadata = {
      ...enriched.metadata,
      domain,
    };

    // Attempt to determine content type based on URL or metadata
    if (!enriched.metadata.contentType) {
      enriched.metadata.contentType = determineContentType(result.url);
    }

    return enriched;
  });
}

/**
 * Determine content type based on URL
 */
function determineContentType(url: string): string {
  const urlLower = url.toLowerCase();

  if (urlLower.includes('youtube.com/watch') || urlLower.includes('vimeo.com/')) {
    return 'video';
  }

  if (urlLower.includes('wikipedia.org/')) {
    return 'reference';
  }

  if (urlLower.match(/\.(jpg|jpeg|png|gif|svg|webp)(\?.*)?$/)) {
    return 'image';
  }

  if (urlLower.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)(\?.*)?$/)) {
    return 'document';
  }

  if (urlLower.includes('github.com/') || urlLower.includes('gitlab.com/')) {
    return 'code';
  }

  // Default to article for most web pages
  return 'article';
}

/**
 * Merge results from multiple sources
 *
 * @param resultSets Array of result sets to merge
 * @param removeDuplicates Whether to remove duplicate results
 * @returns Merged and deduplicated results
 */
export function mergeResults(
  resultSets: SearchResult[][],
  removeDuplicates: boolean = true
): SearchResult[] {
  // Flatten all result sets
  const allResults = resultSets.flat();

  if (!removeDuplicates) {
    return allResults;
  }

  // Remove duplicates by URL
  const uniqueUrls = new Set<string>();
  return allResults.filter((result) => {
    if (uniqueUrls.has(result.url)) {
      return false;
    }
    uniqueUrls.add(result.url);
    return true;
  });
}

/**
 * Process search results with a chain of operations
 *
 * @param results Initial search results
 * @param options Processing options
 * @returns Processed results
 */
export function processResults(
  results: SearchResult[],
  options: {
    query?: string;
    filter?: ResultFilterOptions;
    maxPerDomain?: number;
    enrich?: boolean;
  } = {}
): SearchResult[] {
  let processed = [...results];

  // Apply filtering if options provided
  if (options.filter) {
    processed = filterResults(processed, options.filter, options.query);
  }

  // Group results by domain if maxPerDomain specified
  if (options.maxPerDomain) {
    processed = groupResultsByDomain(processed, options.maxPerDomain);
  }

  // Enrich results with additional metadata if requested
  if (options.enrich) {
    processed = enrichResults(processed);
  }

  return processed;
}
