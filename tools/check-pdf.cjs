const fs = require("fs");
(async () => {
  const { PDFDocument } = require("pdf-lib");
  const bytes = fs.readFileSync("ref/downloads/pedinburgh-spells-11.pdf");
  const doc = await PDFDocument.load(bytes);
  console.log("pdf pages:", doc.getPageCount(), "size:", bytes.length);
})();
