import type { Media, MediaList, MediaListOptions, MediaStore, MediaUploadOptions } from 'tinacms';

export class UpyunMediaStore implements MediaStore {
  accept = 'image/*';

  async persist(files: MediaUploadOptions[]): Promise<Media[]> {
    const uploaded: Media[] = [];

    for (const { file, directory } of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('directory', directory);

      const res = await fetch('/api/upyun', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.error('Upload failed', await res.text());
        continue;
      }

      const data = await res.json();
      
      uploaded.push({
        id: data.src,
        type: 'file',
        directory,
        filename: data.filename,
        src: data.src,
      });
    }

    return uploaded;
  }

  async delete(media: Media): Promise<void> {
    await fetch('/api/upyun', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src: media.id }),
    });
  }

  async list(options?: MediaListOptions): Promise<MediaList> {
    const directory = options?.directory || '/';
    const res = await fetch(`/api/upyun?dir=${encodeURIComponent(directory)}`);
    
    if (!res.ok) {
      return { items: [], totalCount: 0, nextOffset: undefined };
    }

    const data = await res.json();
    const domain = process.env.NEXT_PUBLIC_UPYUN_DOMAIN || '';

    const items: Media[] = (data.files || []).map((file: any) => {
      const basePath = directory === '/' ? '' : directory;
      const remotePath = `${basePath}/${file.name}`.replace(/\/\//g, '/');
      const isFile = file.type === 'N';

      return {
        id: isFile ? `${domain}${remotePath}` : remotePath,
        type: isFile ? 'file' : 'dir',
        directory,
        filename: file.name,
        src: isFile ? `${domain}${remotePath}` : undefined,
      };
    });

    return {
      items,
      totalCount: items.length,
      nextOffset: undefined,
    };
  }

  previewSrc(src: string) {
    return Promise.resolve(src);
  }
}
