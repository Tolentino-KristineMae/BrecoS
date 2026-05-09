import Tesseract from "tesseract.js";

export async function extractReceiptText(imagePath: string): Promise<string> {
  const result = await Tesseract.recognize(imagePath, "eng", {
    logger: () => undefined,
  });
  return result.data.text || "";
}
