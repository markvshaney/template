import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Document, DocumentMetadata } from '@/lib/rag/document-processing';

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Supported file types and their MIME types
const SUPPORTED_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Maximum size is 10MB.` },
          { status: 400 }
        );
      }

      // Check file type
      if (
        !Object.keys(SUPPORTED_TYPES).includes(file.type) &&
        !Object.values(SUPPORTED_TYPES).some((ext) => file.name.endsWith(ext))
      ) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.type}. Supported types: PDF, TXT, MD, DOCX.` },
          { status: 400 }
        );
      }
    }

    // Process files
    const documents: Document[] = await Promise.all(
      files.map(async (file) => {
        const id = uuidv4();
        const content = await file.text();
        const fileType = Object.keys(SUPPORTED_TYPES).includes(file.type)
          ? SUPPORTED_TYPES[file.type as keyof typeof SUPPORTED_TYPES]
          : file.name.split('.').pop();

        const metadata: DocumentMetadata = {
          title: file.name,
          documentType: fileType,
          createdAt: new Date(),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };

        return {
          id,
          content,
          metadata,
        };
      })
    );

    // Return processed documents
    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in document upload API:', error);

    return NextResponse.json(
      {
        error: 'Document upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Configure route handler to accept large files
export const config = {
  api: {
    bodyParser: false,
  },
};
