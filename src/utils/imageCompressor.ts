/**
 * Utility to compress images and convert them to WebP format
 * to optimize memory, storage, and network payload for low-end mobile devices.
 */

export async function compressAndConvertToWebP(
  fileOrBase64: File | string,
  maxWidth = 1000,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculate responsive scaled dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
        return;
      }

      // Smooth rendering context
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP image
      try {
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        // Fallback if browser doesn't support WebP
        if (webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl);
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      } catch {
        resolve(canvas.toDataURL('image/jpeg', quality));
      }
    };

    img.onerror = () => {
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        reject(new Error('Gagal memuat gambar untuk dikompres'));
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    }
  });
}
