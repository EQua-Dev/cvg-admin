/**
 * Centre-crops a photo to a square and shrinks it to [size]px JPEG before upload,
 * so a 5MB phone photo becomes ~80KB. Respects EXIF orientation where the browser does.
 */
export async function squarePhoto(file: File, size = 640): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() =>
    createImageBitmap(file),
  );
  const side = Math.min(bitmap.width, bitmap.height);
  // Bias the crop slightly upward: headshots usually have the face in the top half.
  const sx = (bitmap.width - side) / 2;
  const sy = Math.max(0, (bitmap.height - side) / 2 - (bitmap.height - side) * 0.15);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read photo"))), "image/jpeg", 0.85),
  );
}

/** Shrinks a photo so its longest side is at most [maxSide]px, keeping the whole image (for receipts). */
export async function shrinkPhoto(file: File, maxSide = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() =>
    createImageBitmap(file),
  );
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read photo"))), "image/jpeg", 0.82),
  );
}
