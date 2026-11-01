// Reads the text out of a PDF page by page, inside the browser. The PDF reader is large,
// so it is only downloaded when someone actually uploads a PDF.
export async function readPdf(file, onPage) {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.js?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // a new line wherever the text moves down the page
    let out = "", lastY = null;
    for (const it of content.items) {
      const y = it.transform ? it.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) out += "\n";
      out += it.str + (it.hasEOL ? "\n" : " ");
      lastY = y;
    }
    pages.push(out.trim());
    if (onPage) onPage(i, doc.numPages);
  }
  return pages;
}
