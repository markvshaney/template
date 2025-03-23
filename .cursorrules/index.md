# AI Development Guidelines

This directory contains guidelines and context for AI-assisted development. These files help provide structure and consistency for the project.

## Table of Contents

- [TypeScript Guidelines](./typescript.md)
- [Testing Guidelines](./testing.md)
- [Architecture Overview](./architecture.md)
- [Development Workflow](./workflow.md)
- [Code Quality Standards](./code_quality.md)
- [AI Integration Guidelines](./ai_integration.md)
- [Database Guidelines](./database.md)
- [Python Integration](./python_js_bridge.md)
- [Python Testing](./python_testing.md)
- [Python Code Quality](./python_code_quality.md)

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```
project/
├── app/                  # Next.js application routes
│   ├── api/             # API routes
│   └── (routes)/        # Page routes
├── components/          # React components
│   ├── chat/           # Chat interface components
│   ├── layout/         # Layout components
│   ├── model/          # Model management components
│   ├── status/         # System status components
│   └── visualizations/ # Memory visualization components
├── lib/                 # Core libraries and utilities
│   ├── ai/             # AI model handling and integration
│   │   ├── model.ts    # Model loading and management
│   │   ├── embeddings.ts # Vector embedding generation
│   │   └── lora.ts     # LoRA adapter management
│   ├── memory/         # Memory system components
│   │   ├── neocortical.ts # Slow-learning system
│   │   ├── hippocampal.ts # Fast-learning system
│   │   └── integration.ts # Memory integration
│   ├── db/             # Database utilities
│   └── services/       # External service integrations
├── prisma/             # Database schema and migrations
├── public/             # Static assets
├── styles/             # Global styles
├── tests/              # Test files
│   ├── e2e/           # End-to-end tests
│   ├── integration/   # Integration tests
│   └── unit/          # Unit tests
└── .cursorrules/       # AI development guidelines
```

## Development Process

1. Follow the project checklist in `checklist.md`
2. Use the workflow described in `workflow.md`
3. Document implementation details in step-specific summary files
4. Ensure all code follows the guidelines in this directory

## Tech Stack Overview

This project uses a modern tech stack including:

### Frontend

- Next.js 14 with App Router
- TypeScript for type safety
- shadcn/ui for component library
- Tailwind CSS for styling
- WebSocket for real-time updates

### Backend

- Prisma ORM with PostgreSQL
- Supabase for vector storage
- WebSocket server for real-time communication

### AI/ML

- Mistral 7B base model
- TensorFlow.js/ONNX/transformers.js for model handling
- LoRA adapters for domain specializations
- Vector embeddings with Pinecone
- RAG for fast-learning system

### Testing

- Jest for unit testing
- React Testing Library for component testing
- Cypress for E2E testing
- MSW for API mocking

### Development Tools

- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks
- commitlint for commit message validation

For complete tech stack details, see the `tech_stack.json` file.

## Memory Architecture

The system implements a dual-memory architecture:

1. **Neocortical System (Slow Learning)**

   - Based on Mistral 7B
   - Handles long-term knowledge
   - Uses sparse activation and 8-bit quantization

2. **Hippocampal System (Fast Learning)**
   - Uses RAG for rapid learning
   - Handles recent experiences
   - Integrates with vector storage

## Specialization Framework

The system supports multiple memory specializations:

- Factual Knowledge
- Procedural Memory
- Social Interaction Memory
- Episodic Memory

Each specialization uses LoRA adapters for efficient domain-specific learning.
