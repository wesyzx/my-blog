// @ts-nocheck
import { NextResponse } from 'next/server';
import upyun from 'upyun';

// Initialize Upyun client using credentials from environment variables
const serviceName = process.env.UPYUN_SERVICE_NAME || '';
const operatorName = process.env.UPYUN_OPERATOR_NAME || '';
const operatorPassword = process.env.UPYUN_OPERATOR_PASSWORD || '';
const domain = process.env.NEXT_PUBLIC_UPYUN_DOMAIN || '';

function getClient() {
  if (!serviceName || !operatorName || !operatorPassword) {
    throw new Error('Missing Upyun configuration. Please check UPYUN_SERVICE_NAME, UPYUN_OPERATOR_NAME, and UPYUN_OPERATOR_PASSWORD environment variables.');
  }
  const service = new upyun.Service(serviceName, operatorName, operatorPassword);
  return new upyun.Client(service);
}

/**
 * GET: Lists files in a specified Upyun directory.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dir = searchParams.get('dir') || '/';
  
  try {
    const client = getClient();
    const result = await client.listDir(dir);
    // Upyun listDir returns { files: [ { name, type, size, time }, ... ] }
    // type: 'N' is file, 'F' is folder
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Upyun List Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to list directory' }, { status: 500 });
  }
}

/**
 * POST: Uploads a file to Upyun.
 */
export async function POST(req: Request) {
  try {
    const client = getClient();
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
    return NextResponse.json({ error: err.message || 'Failed to upload file' }, { status: 500 });
  }
}

/**
 * DELETE: Deletes a file from Upyun.
 */
export async function DELETE(req: Request) {
  try {
    const client = getClient();
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
    return NextResponse.json({ error: err.message || 'Failed to delete file' }, { status: 500 });
  }
}
