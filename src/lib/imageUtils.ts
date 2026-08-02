/**
 * Utility to compress and resize an image File or Base64 Data URL to fit well within
 * Firestore's 1MB document size limit (usually resulting in a 15-40KB string).
 */

export async function compressAndResizeImage(
  file: File,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) {
        reject(new Error('Empty image data.'));
        return;
      }
      resizeDataUrl(src, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(reject);
    };
    reader.readAsDataURL(file);
  });
}

export function resizeDataUrl(
  dataUrl: string,
  maxWidth = 256,
  maxHeight = 256,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width || 256;
      canvas.height = height || 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.src = dataUrl;
  });
}

/**
 * Ensures photoURL string is compressed if it's a large data URL.
 */
export async function sanitizePhotoURL(photoURL?: string): Promise<string> {
  if (!photoURL) return '';
  const trimmed = photoURL.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image/') && trimmed.length > 50000) {
    try {
      const compressed = await resizeDataUrl(trimmed, 256, 256, 0.75);
      return compressed;
    } catch {
      return trimmed.slice(0, 50000);
    }
  }

  return trimmed;
}
