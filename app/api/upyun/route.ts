import { NextResponse } from 'next/server';
import upyun from 'upyun';

// Initialize Upyun client using credentials from environment variables
const service = new upyun.Service(
  process.env.UPYUN_SERVICE_NAME || '',
  process.env.UPYUN_OPERATOR_NAME || '',
  process.env.UPYUN_OPERATOR_PASSWORD || ''
);
const client = new upyun.Client(service);
const domain = process.env.NEXT_PUBLIC_UPYUN_DOMAIN || '';

/**
 * GET: Lists files in a specified Upyun directory.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dir = searchParams.get('dir') || '/';
  
  try {
    const result = await client.listDir(dir);
    // Upyun listDir returns { files: [ { name, type, size, time }, ... ] }
    // type: 'N' is file, 'F' is folder
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Upyun List Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Uploads a file to Upyun.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || '/';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    // Normalize path to avoid double slashes
    const basePath = directory === '/' ? '' : directory;
    const remotePath = `${basePath}/${file.name}`.replace(/\/\//g, '/');
    
    await client.putFile(remotePath, Buffer.from(buffer));
    
    return NextResponse.json({ 
      src: `${domain}${remotePath}`,
      filename: file.name
    });
  } catch (err: any) {
    console.error('Upyun Upload Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a file from Upyun.
 */
export async function DELETE(req: Request) {
  try {
    const { src } = await req.json();
    if (!src) {
      return NextResponse.json({ error: 'No source provided' }, { status: 400 });
    }

    // Extract the relative path from the full URL
    const remotePath = src.replace(domain, '');
    await client.deleteFile(remotePath);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Upyun Delete Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
