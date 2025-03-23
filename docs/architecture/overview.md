# System Architecture Overview

This document provides a high-level overview of the system architecture, including key components, data flow, and design decisions.

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Web Frontend   │────▶│   API Layer     │────▶│  Core Services  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vector Storage │◀───▶│  AI Models      │◀───▶│  Memory System  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        └───────────────────┬───────────────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │                 │
                  │   Database      │
                  │                 │
                  └─────────────────┘
```

## Key Components

### Web Frontend

- Next.js-based React application
- Server-side rendering for improved performance
- Client-side state management
- WebSocket integration for real-time updates

### API Layer

- FastAPI-based REST API
- Authentication and authorization
- Request validation and error handling
- WebSocket endpoints for real-time communication

### Core Services

- Business logic implementation
- Service orchestration
- Transaction management
- Event handling

### AI Models

- Mistral 7B base model with 8-bit quantization
- LoRA adapters for domain specialization
- Embedding generation for vector storage
- Inference optimization for consumer GPUs

### Memory System

- Dual-memory architecture (neocortical and hippocampal)
- Memory consolidation and prioritization
- Prediction error calculation
- Selective regularization

### Vector Storage

- Efficient storage and retrieval of embeddings
- Hybrid search (vector + keyword)
- Pinecone/FAISS/pgvector integration
- Similarity calculation and ranking

### Database

- PostgreSQL with pgvector extension
- Prisma ORM for type-safe database access
- Domain-specific schema organization
- Migration management

## Data Flow

1. User interacts with the Web Frontend
2. Frontend sends requests to the API Layer
3. API Layer validates requests and routes to appropriate Core Services
4. Core Services process requests, interacting with AI Models, Memory System, and Database as needed
5. AI Models generate responses, embeddings, or perform other ML tasks
6. Memory System manages information storage and retrieval
7. Vector Storage enables semantic search capabilities
8. Results flow back through the stack to the user

## Design Decisions

### Dual-Memory Architecture

The system implements a biologically-inspired dual-memory architecture:

- **Neocortical System**: Slow-learning system based on the Mistral 7B model, providing general knowledge and reasoning
- **Hippocampal System**: Fast-learning system using RAG (Retrieval-Augmented Generation) for quick adaptation to new information

### Domain Specialization

The system uses LoRA adapters to specialize in different domains:

- Factual knowledge (semantic memory)
- Procedural memory (skills and processes)
- Social interaction memory
- Episodic memory (temporal experiences)

### Memory Management

The system implements sophisticated memory management:

- Prediction error calculation to determine importance
- Priority queue for memory replay
- Consolidation scheduling
- Parameter importance tracking
- Selective regularization
- Conflict resolution

### Performance Optimization

Several optimizations are implemented for consumer hardware:

- 8-bit quantization
- GPU optimization
- Sparse activation
- Efficient vector operations

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: FastAPI, Pydantic
- **Database**: PostgreSQL, Prisma, pgvector
- **AI**: PyTorch, Transformers, ONNX Runtime
- **Vector Storage**: Pinecone, FAISS
- **Infrastructure**: Docker, GitHub Actions

## Future Considerations

- Distributed training capabilities
- Multi-modal support (image, audio)
- Federated learning
- Enhanced privacy features
- Expanded specialization domains
