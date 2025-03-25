/**
 * Prompt Engineering Module
 * Provides templates and utilities for creating effective prompts for different scenarios
 */

import { ChatMessage } from './types';

/**
 * Retrieved context object with source information
 */
export interface RetrievedContext {
  text: string;
  documentId?: string;
  documentTitle?: string;
  chunkId?: string;
  score?: number;
  metadata?: Record<string, any>;
}

/**
 * Options for prompt templates
 */
export interface TemplateOptions {
  maxContextLength?: number;
  fewShotExamples?: string[];
  temperature?: number;
  modelName?: string;
  includeMetadata?: boolean;
  citationFormat?: 'inline' | 'footnote' | 'endnote';
  language?: string;
  toneStyle?: 'formal' | 'conversational' | 'technical';
}

/**
 * Default template options
 */
const DEFAULT_TEMPLATE_OPTIONS: TemplateOptions = {
  maxContextLength: 4000,
  includeMetadata: false,
  citationFormat: 'inline',
  language: 'english',
  toneStyle: 'conversational',
};

/**
 * Base interface for prompt templates
 */
export interface PromptTemplate {
  formatSystemMessage(options?: TemplateOptions): string;
  formatUserMessage(query: string, options?: TemplateOptions): string;
  formatContextMessages(context: RetrievedContext[]): ChatMessage[];
  getDefaultOptions(): TemplateOptions;
}

/**
 * Abstract base class for prompt templates
 */
abstract class BasePromptTemplate implements PromptTemplate {
  protected options: TemplateOptions;

  constructor(options: Partial<TemplateOptions> = {}) {
    this.options = {
      ...DEFAULT_TEMPLATE_OPTIONS,
      ...options,
    };
  }

  /**
   * Format system message for the prompt
   */
  abstract formatSystemMessage(options?: TemplateOptions): string;

  /**
   * Format user message for the prompt
   */
  abstract formatUserMessage(query: string, options?: TemplateOptions): string;

  /**
   * Format retrieved context into chat messages
   */
  formatContextMessages(context: RetrievedContext[]): ChatMessage[] {
    if (!context || context.length === 0) {
      return [];
    }

    // Return a single assistant message with all context
    return [
      {
        role: 'assistant',
        content: this.formatContextContent(context),
      },
    ];
  }

  /**
   * Format the retrieved context content
   */
  protected formatContextContent(context: RetrievedContext[]): string {
    const options = this.options;
    const includeMetadata = options.includeMetadata;

    let formattedContent = 'Here is some relevant information:\n\n';

    context.forEach((item, index) => {
      formattedContent += `[${index + 1}] ${item.text}\n`;

      if (includeMetadata && item.metadata) {
        formattedContent += `Source: ${item.documentTitle || 'Unknown'}\n`;
      }

      formattedContent += '\n';
    });

    return formattedContent;
  }

  /**
   * Get default options for this template
   */
  getDefaultOptions(): TemplateOptions {
    return this.options;
  }
}

/**
 * General QA prompt template
 * Optimized for question answering with context
 */
export class QAPromptTemplate extends BasePromptTemplate {
  formatSystemMessage(options?: TemplateOptions): string {
    const opts = { ...this.options, ...options };
    const toneStyle = opts.toneStyle || 'conversational';

    return `You are a helpful, knowledgeable assistant that answers questions accurately based on the information provided. 
    
Rules:
1. Use only the provided information to answer questions.
2. If the provided information isn't sufficient, state what's missing.
3. Keep answers ${toneStyle === 'conversational' ? 'conversational and easy to understand' : 'precise and technical'}.
4. If asked about something not in the provided information, say "I don't have information about that."
5. Never make up information.
6. Always cite your sources using [1], [2], etc. corresponding to the provided context.`;
  }

  formatUserMessage(query: string, options?: TemplateOptions): string {
    return `Please answer the following question based on the information provided:

Question: ${query}`;
  }
}

/**
 * Summarization prompt template
 * Optimized for summarizing content
 */
export class SummarizationPromptTemplate extends BasePromptTemplate {
  formatSystemMessage(options?: TemplateOptions): string {
    const opts = { ...this.options, ...options };
    const toneStyle = opts.toneStyle || 'formal';

    return `You are an expert at creating clear, concise summaries of complex information.

Rules:
1. Summarize the provided information in a ${toneStyle} style.
2. Include all key points and important details.
3. Omit unnecessary examples and redundant information.
4. Organize the summary in a logical structure.
5. Use clear, simple language while maintaining accuracy.`;
  }

  formatUserMessage(query: string): string {
    let prefix = 'Please summarize the following information:';

    if (query.trim().length > 0) {
      prefix = `Please summarize the provided information focusing on: ${query}`;
    }

    return prefix;
  }
}

/**
 * Code explanation prompt template
 * Optimized for explaining code snippets
 */
export class CodeExplanationPromptTemplate extends BasePromptTemplate {
  formatSystemMessage(options?: TemplateOptions): string {
    const opts = { ...this.options, ...options };
    const toneStyle = opts.toneStyle || 'technical';

    return `You are an expert programming tutor who explains code clearly and accurately.

Rules:
1. Explain the code line by line in a ${toneStyle} style.
2. Highlight key programming concepts and patterns.
3. Point out potential issues or optimizations.
4. Use correct technical terminology.
5. Provide examples to illustrate complex concepts when helpful.`;
  }

  formatUserMessage(query: string): string {
    return `Please explain the following code and address any specific questions:

${query}`;
  }
}

/**
 * Chat context template
 * Optimized for conversational interactions with context memory
 */
export class ChatContextTemplate extends BasePromptTemplate {
  formatSystemMessage(options?: TemplateOptions): string {
    const opts = { ...this.options, ...options };
    const toneStyle = opts.toneStyle || 'conversational';

    return `You are a helpful, knowledgeable assistant engaged in a conversation. 
    
Rules:
1. Maintain a ${toneStyle} tone throughout the conversation.
2. Use context from previous messages to maintain conversational flow.
3. Ask clarifying questions when needed.
4. Be concise but thorough in your responses.
5. Use the provided context when relevant to the current conversation.`;
  }

  formatUserMessage(query: string): string {
    return query;
  }

  formatContextMessages(context: RetrievedContext[]): ChatMessage[] {
    // For chat, we don't combine context into a single message
    // Instead, we keep the conversation flow
    if (!context || context.length === 0) {
      return [];
    }

    // Create individual messages for each context item to maintain conversation flow
    return context.map((item) => ({
      role: item.metadata?.role || 'assistant',
      content: item.text,
    }));
  }
}

/**
 * Template factory to create appropriate templates for different use cases
 */
export class PromptTemplateFactory {
  constructor() {
    // No parameters needed
  }

  /**
   * Create a template for the specified use case
   */
  createTemplate(
    type: 'qa' | 'summarization' | 'code' | 'chat',
    options?: Partial<TemplateOptions>
  ): PromptTemplate {
    switch (type) {
      case 'qa':
        return new QAPromptTemplate(options);
      case 'summarization':
        return new SummarizationPromptTemplate(options);
      case 'code':
        return new CodeExplanationPromptTemplate(options);
      case 'chat':
        return new ChatContextTemplate(options);
      default:
        return new QAPromptTemplate(options);
    }
  }
}
