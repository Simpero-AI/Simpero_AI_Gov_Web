import { Buffer } from "node:buffer";

/** Tiny valid PDF (no extractable text). Prefer `textSamplePdf.ts` for E2E so async jobs parse without "no text" errors. */
export const MINIMAL_PDF_BYTES = Buffer.from(
  `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000053 00000 n
0000000102 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF
`,
  "utf8"
);
