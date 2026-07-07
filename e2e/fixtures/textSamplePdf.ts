import { Buffer } from "node:buffer";

/**
 * Single-page PDF with Helvetica text so pdfjs yields chunks (>30 chars) and the
 * full pipeline can run during E2E without "no text" parse failures on the async path.
 */
export const TEXT_SAMPLE_PDF_BYTES: Buffer = (() => {
  const body =
    "This is synthetic body text for Simpero E2E. Revenue was ten million dollars.";
  const esc = body.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT\n/F1 24 Tf\n72 720 Td\n(${esc}) Tj\nET\n`;
  const streamLen = Buffer.byteLength(stream, "utf8");

  const chunks: string[] = [];
  chunks.push("%PDF-1.4\n");
  const offsets = new Array(6).fill(0);

  const append = (objNum: number, part: string) => {
    offsets[objNum] = Buffer.byteLength(chunks.join(""), "utf8");
    chunks.push(part);
  };

  append(1, "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n");
  append(2, "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n");
  append(
    3,
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
  );
  append(4, `4 0 obj<</Length ${streamLen}>>stream\n${stream}endstream\nendobj\n`);
  append(5, "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n");

  const bodyStr = chunks.join("");
  const xrefPos = Buffer.byteLength(bodyStr, "utf8");
  let xref = "xref\n0 6\n";
  xref += "0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += "trailer<</Size 6/Root 1 0 R>>\n";
  xref += `startxref\n${xrefPos}\n`;
  xref += "%%EOF";
  return Buffer.from(bodyStr + xref, "utf8");
})();
