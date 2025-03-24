import { NextRequest, NextResponse } from 'next/server';
import { webSearch } from '@/lib/search/web-search';
import { SearchOptions } from '@/lib/search/types';

export async function POST(request: NextRequest) {
  try {
    const { query, options } = await request.json();

    // Validate the request
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query. Query must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Validate provider if specified
    if (
      options?.provider &&
      !['google', 'brave', 'bing', 'duckduckgo'].includes(options.provider)
    ) {
      return NextResponse.json(
        { error: 'Invalid provider. Supported providers: google, brave, bing, duckduckgo' },
        { status: 400 }
      );
    }

    // Apply search options with defaults
    const searchOptions: Partial<SearchOptions> = {
      provider: 'google',
      maxResults: 10,
      ...options,
    };

    // Perform the search
    const results = await webSearch(query, searchOptions);

    // Return the results
    return NextResponse.json({
      results,
      query,
      provider: searchOptions.provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in search API:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Optional GET handler to allow for query parameter search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const provider = (searchParams.get('provider') as SearchOptions['provider']) || 'google';

    // Validate the request
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query. Query must be a non-empty string.' },
        { status: 400 }
      );
    }

    // Perform the search
    const results = await webSearch(query, { provider });

    // Return the results
    return NextResponse.json({
      results,
      query,
      provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in search API:', error);

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
