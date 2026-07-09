import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const adminStaticFiles = [
  'admin.html',
  'login.html',
  'admin.js',
  'login.js',
  'admin-config.js',
  'styles.css',
  'README.md',
  'PROJECT_GUIDE.md',
  'data/posts.json',
  'data/admin-users.json',
]

function copyAdminStaticFiles() {
  return {
    name: 'copy-admin-static-files',
    closeBundle() {
      adminStaticFiles.forEach((file) => {
        const source = path.resolve(__dirname, file)
        const target = path.resolve(__dirname, 'dist', file)
        if (!fs.existsSync(source)) return
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.copyFileSync(source, target)
      })
      copyDirectory(path.resolve(__dirname, 'public-assets'), path.resolve(__dirname, 'dist', 'public-assets'))
    },
  }
}

function copyDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) return
  fs.mkdirSync(targetDir, { recursive: true })
  fs.readdirSync(sourceDir, { withFileTypes: true }).forEach((entry) => {
    const source = path.join(sourceDir, entry.name)
    const target = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      copyDirectory(source, target)
      return
    }
    if (entry.isFile()) {
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(source, target)
    }
  })
}

export default ({ command }) => ({
  plugins: [react(), copyAdminStaticFiles()],
  base: process.env.VITE_BASE || (command === 'build' ? '/ralphrong/' : '/'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-motion': ['framer-motion'],
          'pdfjs': ['pdfjs-dist'],
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
