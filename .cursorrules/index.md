# AI Development Guidelines

This directory contains guidelines and context for AI-assisted development. These files help provide structure and consistency for the project.

## Table of Contents

- [TypeScript Guidelines](./.cursorrules/typescript.md)
- [Testing Guidelines](./.cursorrules/testing.md)
- [Architecture Overview](./.cursorrules/architecture.md)
- [Development Workflow](./.cursorrules/workflow.md)
- [Code Quality Standards](./.cursorrules/code_quality.md)
- [AI Integration Guidelines](./.cursorrules/ai_integration.md)
- [Database Guidelines](./.cursorrules/database.md)
- [Component Guidelines](./.cursorrules/components.md)

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```
project/
├── app/                  # Next.js application routes
├── components/           # React components
├── lib/                  # Core libraries and utilities
│   ├── ai/               # AI model handling and integration
│   ├── db/               # Database utilities
│   └── services/         # External service integrations
├── public/               # Static assets
├── styles/               # Global styles
├── tests/                # Test files
└── .cursorrules/         # AI development guidelines
```

## Development Process

1. Follow the project checklist in `project_checklist.md`
2. Use the workflow described in `WORKFLOW.md`
3. Document implementation details in step-specific summary files
4. Ensure all code follows the guidelines in this directory

## Tech Stack Overview

This project uses a modern tech stack including:

- Next.js with TypeScript
- Prisma ORM with PostgreSQL
- AI model integration with TensorFlow.js/ONNX/transformers.js
- Vector embeddings with Pinecone
- UI components with shadcn/ui and Tailwind CSS
- Testing with Jest, React Testing Library, and Cypress

For complete tech stack details, see the `tech_stack.json` file. 