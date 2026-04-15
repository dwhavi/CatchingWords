import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function proxyPlugin() {
  return {
    name: 'url-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const targetUrl = url.searchParams.get('url')
          if (!targetUrl) {
            res.statusCode = 400
            res.end('Missing url parameter')
            return
          }
          const parsed = new URL(targetUrl)
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            res.statusCode = 400
            res.end('Only http/https URLs allowed')
            return
          }
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,*/*',
              'Referer': targetUrl,
            },
          })
          const text = await response.text()
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(text)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          res.statusCode = 500
          res.end(message)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), proxyPlugin()],
  server: {
    host: '0.0.0.0',
  },
})
