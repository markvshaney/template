# AI-Enhanced Search and RAG System

A Next.js application that combines web search, retrieval augmented generation, and local AI with Ollama for enhanced information retrieval and generation.

## Project Overview

This project provides a modern web application with AI capabilities:

- Web search integration for retrieving current information
- Retrieval Augmented Generation (RAG) for context-enhanced AI responses
- Local AI model integration via Ollama for privacy and cost efficiency
- Modern UI with React and TypeScript

## Features

- **Web Search**: Real-time search capabilities with result filtering and ranking
- **Document Processing**: Upload, chunk, and vectorize documents for retrieval
- **Vector Storage**: Simple storage solution for document embeddings
- **Retrieval**: Find relevant documents based on semantic similarity
- **Local AI**: Interact with Ollama models for text generation and embeddings
- **Responsive UI**: Modern interface for search and AI interaction

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Ollama installed locally
  - [Install Ollama](https://ollama.ai/download)
  - Pull necessary models: `ollama pull llama3 nomic-embed-text`

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your specific configuration
```

4. **Initialize the database**

```bash
# Automated setup (creates database, runs migrations)
npm run setup-db

# Or manual setup
npm run prisma:generate
npm run prisma:push
```

5. **Run development server**

```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Usage

### Web Search

Use the search interface to query the web for current information. Results are processed and presented in a clean, readable format.

### Document Management

Upload documents to the system to make their content available for retrieval:

1. Navigate to the document upload page
2. Select or drag files to upload
3. The system will automatically process and chunk the documents
4. Documents are now available for retrieval in RAG queries

### Chat Interface

Interact with the AI system through the chat interface:

1. Enter your query in the chat input
2. The system retrieves relevant context from your documents and web search
3. The local Ollama model generates a response enhanced by the retrieved context
4. The response is displayed in the chat interface

## Architecture

The application is built with a clean, modular architecture:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Search**: Serper.dev API integration
- **RAG**: Custom implementation with local vector storage
- **AI**: Ollama API client for local AI models

## Development

### Scripts

- `npm run dev`: Start development server
- `npm run build`: Build production version
- `npm run start`: Run production server
- `npm run setup-db`: Set up the database with document storage schema
- `npm run lint`: Run ESLint
- `npm run test`: Run Jest tests
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:push`: Push schema to database
- `npm run prisma:studio`: Open Prisma Studio

### Testing

The project uses Jest and React Testing Library for testing:

- Unit tests for individual components
- Integration tests for API endpoints
- End-to-end tests for complete workflows

Run tests with:

```bash
npm test
```

## Project Structure

```
├── .github/                # GitHub workflows
├── .storybook/             # Storybook configuration
├── docs/                   # Documentation
│   └── checklist_step_summaries/ # Implementation summaries
├── prisma/                 # Prisma schema and migrations
├── public/                 # Static assets
├── src/                    # Source code
│   ├── app/                # Next.js app router
│   │   ├── api/            # API routes
│   │   │   ├── search/     # Search API
│   │   │   └── rag/        # RAG API
│   │   └── (routes)        # Page routes
│   ├── components/         # React components
│   │   ├── search/         # Search components
│   │   ├── rag/            # RAG components
│   │   └── ui/             # UI components
│   └── lib/                # Library code
│       ├── ai/             # AI utilities
│       ├── rag/            # RAG utilities
│       └── search/         # Search utilities
├── __tests__/              # Test files
├── __mocks__/              # Mock files for testing
└── .env.local.example      # Example environment variables
```

## Contributing

Please see our contributing guidelines for details on how to contribute to this project.

## License

[MIT License](LICENSE)
