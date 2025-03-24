# Project Overview: AI-Powered Search and RAG System

## Project Goals

This project aims to create a web application that leverages AI capabilities through:

1. **Web Search Integration** - Enable users to search the web for current information
2. **Retrieval Augmented Generation (RAG)** - Enhance AI responses with relevant context from documents
3. **Local AI Model Integration** - Use Ollama to run AI models locally for privacy and cost efficiency

## Architecture

### Core Components

1. **Web Search Module**

   - Integrates with search APIs to retrieve current information
   - Processes and filters search results for relevance
   - Provides context for the RAG system

2. **RAG System**

   - Document Processing: Chunks documents into manageable pieces
   - Vector Storage: Maintains embeddings for efficient retrieval
   - Retrieval Engine: Finds relevant context based on queries
   - Context Integration: Combines retrieved documents with prompts

3. **Ollama Integration**

   - Local AI Model API: Communicates with locally running Ollama models
   - Embedding Generation: Creates text embeddings for vector search
   - Text Generation: Produces AI responses enhanced by RAG

4. **User Interface**
   - Search Interface: Allows users to perform web searches
   - Document Management: Enables uploading and managing documents for RAG
   - Chat Interface: Facilitates interaction with the AI system

### Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL with vector extensions
- **AI**: Ollama for local AI models
- **Testing**: Jest, React Testing Library
- **CI/CD**: GitHub Actions

## Development Approach

The project follows a component-based development approach with the following principles:

1. **Separation of Concerns**: Each module (search, RAG, AI) is developed independently
2. **Type Safety**: Comprehensive TypeScript types throughout the codebase
3. **Testing**: Robust test coverage for all components
4. **Documentation**: Clear documentation of APIs and components
5. **Progressive Enhancement**: Basic functionality works without JavaScript

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Ollama installed locally

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (copy `.env.local.example` to `.env.local`)
4. Initialize the database: `npm run prisma:push`
5. Start the development server: `npm run dev`

## Key Features

1. **Web Search**

   - Real-time web search capabilities
   - Result filtering and ranking
   - Integration with RAG system

2. **Document Management**

   - Document upload and processing
   - Automatic chunking and embedding
   - Document retrieval based on relevance

3. **AI Interaction**

   - Chat interface with local AI models
   - Context-enhanced responses using RAG
   - Persistent conversation history

4. **User Experience**
   - Responsive design for all devices
   - Accessibility compliance
   - Performance optimization

## Future Enhancements

- Multi-model support with different Ollama models
- Advanced document processing (PDF, images)
- Memory system for persistent context
- Fine-tuning capabilities for domain-specific knowledge
