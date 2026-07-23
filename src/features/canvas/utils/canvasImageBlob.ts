export const canvasImageBlobToDataUri = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read the Canvas image"));
    reader.readAsDataURL(blob);
  });

export const rasterizeCanvasImageToPng = (blob: Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    const release = () => URL.revokeObjectURL(objectUrl);
    image.onerror = () => {
      release();
      reject(new Error("The Canvas image could not be prepared for copying."));
    };
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        release();
        reject(new Error("Image copying is not supported by this browser."));
        return;
      }
      context.drawImage(image, 0, 0);
      canvas.toBlob((pngBlob) => {
        release();
        if (pngBlob) resolve(pngBlob);
        else reject(new Error("The Canvas image could not be copied."));
      }, "image/png");
    };
    image.src = objectUrl;
  });
