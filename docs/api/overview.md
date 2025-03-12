# API Documentation

This document provides an overview of the API endpoints, request/response formats, and authentication mechanisms.

## Base URL

```
http://localhost:8000/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_token>
```

To obtain a token, use the `/auth/token` endpoint.

## Endpoints

### Authentication

#### POST /auth/token

Obtain a JWT token for authentication.

**Request:**
```json
{
  "username": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Model Interaction

#### POST /model/query

Send a query to the AI model.

**Request:**
```json
{
  "query": "What is the capital of France?",
  "context": "We're discussing European geography.",
  "specialization": "factual",
  "options": {
    "temperature": 0.7,
    "max_tokens": 100
  }
}
```

**Response:**
```json
{
  "response": "The capital of France is Paris.",
  "model_used": "mistral-7b-instruct-v0.2",
  "specialization": "factual",
  "processing_time": 0.45,
  "tokens_used": 12
}
```

#### GET /model/status

Get the current status of the AI model.

**Response:**
```json
{
  "status": "ready",
  "model_loaded": "mistral-7b-instruct-v0.2",
  "quantization": "8bit",
  "gpu_usage": 1.2,
  "memory_usage": 4.5,
  "uptime": 3600,
  "requests_processed": 150
}
```

#### POST /model/specialization

Change the active specialization.

**Request:**
```json
{
  "specialization": "social"
}
```

**Response:**
```json
{
  "status": "success",
  "previous_specialization": "factual",
  "current_specialization": "social",
  "transition_time": 0.35
}
```

### Memory Management

#### POST /memory/store

Store information in memory.

**Request:**
```json
{
  "content": "Paris is the capital of France.",
  "metadata": {
    "source": "user_input",
    "timestamp": "2023-05-01T12:00:00Z",
    "importance": 0.8
  }
}
```

**Response:**
```json
{
  "status": "success",
  "memory_id": "mem_123456",
  "vector_id": "vec_789012",
  "importance_score": 0.85
}
```

#### GET /memory/retrieve

Retrieve information from memory.

**Request:**
```json
{
  "query": "capital of France",
  "limit": 5,
  "min_similarity": 0.7
}
```

**Response:**
```json
{
  "results": [
    {
      "content": "Paris is the capital of France.",
      "similarity": 0.92,
      "memory_id": "mem_123456",
      "metadata": {
        "source": "user_input",
        "timestamp": "2023-05-01T12:00:00Z"
      }
    },
    {
      "content": "France's capital city is Paris, located on the Seine River.",
      "similarity": 0.85,
      "memory_id": "mem_123457",
      "metadata": {
        "source": "system_knowledge",
        "timestamp": "2023-04-15T09:30:00Z"
      }
    }
  ],
  "total_matches": 2,
  "processing_time": 0.12
}
```

#### POST /memory/importance

Calculate importance score for a memory.

**Request:**
```json
{
  "memory_id": "mem_123456",
  "context": "Current conversation about European geography"
}
```

**Response:**
```json
{
  "memory_id": "mem_123456",
  "importance_score": 0.85,
  "prediction_error": 0.15,
  "recency_factor": 0.9,
  "relevance_score": 0.8
}
```

### WebSocket API

Connect to `/ws` for real-time communication.

#### Events

**Client to Server:**
```json
{
  "type": "query",
  "data": {
    "query": "What is the capital of France?",
    "options": {
      "stream": true
    }
  }
}
```

**Server to Client (streaming response):**
```json
{
  "type": "response_chunk",
  "data": {
    "chunk": "The capital",
    "chunk_id": 1
  }
}
```

```json
{
  "type": "response_chunk",
  "data": {
    "chunk": " of France",
    "chunk_id": 2
  }
}
```

```json
{
  "type": "response_chunk",
  "data": {
    "chunk": " is Paris.",
    "chunk_id": 3,
    "is_final": true
  }
}
```

## Error Handling

The API uses standard HTTP status codes and returns error details in the response body:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid request parameters",
    "details": "Parameter 'temperature' must be between 0 and 1"
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. The current limits are:

- 60 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

Rate limit information is included in the response headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1620000000
```

## Versioning

The API is versioned using URL path versioning. The current version is v1:

```
http://localhost:8000/api/v1/model/query
```

## SDK

A Python SDK is available for easier integration:

```python
from myproject_sdk import Client

client = Client(api_key="your_api_key")
response = client.model.query("What is the capital of France?")
print(response.text)  # "The capital of France is Paris."
``` 