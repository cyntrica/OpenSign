import Config from 'parse-server/lib/Config.js';

// Branding logos uploaded as Parse files sit behind the signed-token /files/ guard,
// so server code reads their bytes through the files adapter instead of over HTTP.

export const isParseFileUrl = url => {
  try {
    return new URL(url).pathname.includes(`/files/${Parse.applicationId}/`);
  } catch {
    return false;
  }
};

export const parseFileName = url => {
  const { pathname } = new URL(url);
  return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
};

export async function readParseFileBytes(url) {
  const config = Config.get(Parse.applicationId);
  return Buffer.from(await config.filesController.getFileData(config, parseFileName(url)));
}

// MIME type from magic bytes; only the raster formats the branding uploader accepts.
export const imageMime = buf => {
  if (buf?.[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf?.[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf?.[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  return null;
};
