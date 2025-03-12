# Python-JavaScript Bridge Guidelines

This document outlines best practices for integrating Python (PyTorch) and JavaScript/TypeScript components in the project.

## Architecture Overview

The project uses a hybrid architecture with:
- **Frontend**: Next.js with TypeScript
- **AI Components**: Python with PyTorch
- **Bridge**: FastAPI for Python services with JavaScript clients

```
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│  Next.js App    │◄────►│  FastAPI Server │
│  (TypeScript)   │      │  (Python)       │
│                 │      │                 │
└─────────────────┘      └─────────────────┘
                                 ▲
                                 │
                                 ▼
                         ┌─────────────────┐
                         │                 │
                         │  PyTorch Models │
                         │                 │
                         └─────────────────┘
```

## Directory Structure

```
/
├── app/                  # Next.js application
├── python/               # Python components
│   ├── api/              # FastAPI server
│   ├── models/           # PyTorch model definitions
│   ├── training/         # Training scripts
│   ├── utils/            # Python utilities
│   └── tests/            # Python tests (pytest)
├── lib/                  # Shared TypeScript libraries
│   └── python-client/    # TypeScript client for Python API
└── scripts/              # Build and utility scripts
```

## API Design Principles

1. **Clean Boundaries**: Keep Python and JavaScript code completely separate
2. **Typed Interfaces**: Use Pydantic in Python and TypeScript interfaces for type safety
3. **Stateless Communication**: Design APIs to be stateless where possible
4. **Error Handling**: Consistent error formats across language boundaries

## Python API Implementation

```python
# python/api/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch

app = FastAPI()

class GenerationRequest(BaseModel):
    prompt: str
    max_length: int = 100
    temperature: float = 0.7

class GenerationResponse(BaseModel):
    text: str
    tokens_generated: int
    generation_time: float

@app.post("/generate", response_model=GenerationResponse)
async def generate_text(request: GenerationRequest):
    try:
        # Model inference code
        start_time = time.time()
        output = model.generate(
            request.prompt, 
            max_length=request.max_length,
            temperature=request.temperature
        )
        generation_time = time.time() - start_time
        
        return GenerationResponse(
            text=output,
            tokens_generated=len(output.split()),
            generation_time=generation_time
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## TypeScript Client Implementation

```typescript
// lib/python-client/index.ts
export interface GenerationRequest {
  prompt: string;
  max_length?: number;
  temperature?: number;
}

export interface GenerationResponse {
  text: string;
  tokens_generated: number;
  generation_time: number;
}

export class PythonClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }
  
  async generateText(request: GenerationRequest): Promise<GenerationResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${error.detail}`);
    }
    
    return response.json();
  }
}
```

## Development Workflow

1. **Local Development**:
   - Run FastAPI server: `cd python && uvicorn api.main:app --reload`
   - Run Next.js app: `npm run dev`
   - Both can be started together with `npm run dev:all`

2. **Testing**:
   - Test Python components: `cd python && pytest`
   - Test TypeScript client: `npm test lib/python-client`
   - Integration tests: `npm test integration`

3. **Deployment**:
   - Python API is containerized with Docker
   - Next.js app deployed to Vercel
   - API URL configured via environment variables

## Performance Considerations

1. **Batch Processing**: Use batch APIs where possible to reduce HTTP overhead
2. **Caching**: Implement caching for expensive model operations
3. **Streaming**: Use streaming responses for long-running generations
4. **Monitoring**: Track API latency and error rates

## Common Pitfalls

1. **Memory Management**: Ensure PyTorch models release GPU memory
2. **Error Propagation**: Handle and translate Python exceptions properly
3. **Type Mismatches**: Ensure types match between Python and TypeScript
4. **Environment Differences**: Be aware of differences between dev and production

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyTorch Serving Best Practices](https://pytorch.org/tutorials/intermediate/flask_rest_api_tutorial.html)
- [TypeScript Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) 