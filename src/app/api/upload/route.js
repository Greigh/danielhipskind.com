import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.csv',
]);
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
]);

export async function POST(req) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Access denied' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalName = path.basename(file.name || 'upload');
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    if (file.type && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'MIME type not allowed' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File too large (max 5MB)' },
        { status: 400 }
      );
    }

    const safeBase = originalName
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 64);
    const filename = `${Date.now()}-${safeBase || 'file'}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const dest = path.join(uploadDir, filename);
    // Ensure resolved path stays inside uploadDir
    if (!dest.startsWith(uploadDir + path.sep)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    await writeFile(dest, buffer);

    return NextResponse.json({
      filename,
      path: `/uploads/${filename}`,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
