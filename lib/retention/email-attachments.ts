export type RetentionEmailAttachmentPayload = {
  filename: string;
  contentType?: string;
  data: string;
};

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to encode file"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function filesToEmailAttachments(
  files: File[]
): Promise<RetentionEmailAttachmentPayload[]> {
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      contentType: file.type || undefined,
      data: await fileToBase64(file),
    }))
  );
}
