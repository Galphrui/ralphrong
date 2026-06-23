import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { extractPdfText, extractPdfMetadata } from '../utils/pdfParser'

export default function PdfUploader({ onPdfExtracted }) {
  const inputRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.includes('pdf')) {
      setError('请选择 PDF 文件')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Extract metadata
      const metadata = await extractPdfMetadata(file)

      // Extract full text
      const fullText = await extractPdfText(file)

      setPreview({
        ...metadata,
        text: fullText,
      })

      // Callback
      if (onPdfExtracted) {
        onPdfExtracted({
          title: metadata.title,
          summary: metadata.summary,
          content: fullText,
        })
      }
    } catch (err) {
      setError('PDF 处理失败，请检查文件')
      console.error('PDF processing error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload input */}
      <motion.div
        className="relative border-2 border-dashed border-primary-300 rounded-lg p-8 text-center bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer"
        whileHover={{ scale: 1.02 }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isLoading ? (
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
              <span>正在处理 PDF...</span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-gray-900 mb-1">
              上传 PDF 文件
            </p>
            <p className="text-sm text-gray-600">
              拖拽或点击选择 PDF 文件
            </p>
          </div>
        )}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="mt-6 p-6 bg-white border border-gray-200 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">
                {preview.fileName} · {preview.totalPages} 页
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2 line-clamp-2">
                {preview.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {preview.summary}
              </p>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                重新上传
              </motion.button>
              <motion.button
                className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                继续编辑
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
