import { http, HttpResponse } from 'msw';
import { generateUser, generatePost, generateComment } from './test-data';

/**
 * Mock service worker handlers for API testing
 * These handlers intercept API requests during tests and return mock responses
 */
export const handlers = [
  // GET user
  http.get('/api/user', () => {
    return HttpResponse.json(generateUser());
  }),

  // GET user by ID
  http.get('/api/user/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      ...generateUser(),
      id,
    });
  }),

  // GET posts
  http.get('/api/posts', ({ request }) => {
    const url = new URL(request.url);
    const count = Number(url.searchParams.get('count') || '5');
    return HttpResponse.json(Array.from({ length: count }, generatePost));
  }),

  // GET post by ID
  http.get('/api/post/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      ...generatePost(),
      id,
    });
  }),

  // POST new comment
  http.post('/api/comment', async ({ request }) => {
    interface CommentData {
      postId: string;
      content: string;
    }

    const { postId, content } = (await request.json()) as CommentData;
    if (!postId || !content) {
      return new HttpResponse(JSON.stringify({ error: 'postId and content are required' }), {
        status: 400,
      });
    }

    return HttpResponse.json(
      {
        ...generateComment(),
        postId,
        content,
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  }),

  // Fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.error(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { error: 'Please add request handler for this endpoint' },
      { status: 500 }
    );
  }),
];
