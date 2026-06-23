import * as pdfjsLib from 'pdfjs-dist'

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise

  let fullText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item) => item.str).join(' ')
    fullText += text + '\n'
  }

  return fullText
}

export async function extractPdfMetadata(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise

  // Get first page for preview
  const firstPage = await pdf.getPage(1)
  const textContent = await firstPage.getTextContent()
  const firstPageText = textContent.items.map((item) => item.str).join(' ')

  // Extract title from first line
  const lines = firstPageText.split('\n').filter((l) => l.trim())
  const title = lines[0]?.substring(0, 100) || 'Untitled'

  // Extract summary from first few lines
  const summary = lines.slice(0, 3).join(' ').substring(0, 200)

  return {
    title,
    summary,
    fileName: file.name,
    totalPages: pdf.numPages,
  }
}
