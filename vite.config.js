import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/proxy': {
        target: '',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = new URL(req.url, 'http://localhost')
            const targetUrl = url.searchParams.get('url')
            if (targetUrl) {
              const parsed = new URL(targetUrl)
              proxyReq.setHeader('host', parsed.host)
              proxyReq.path = parsed.pathname + parsed.search
              proxyReq.setHeader('referer', targetUrl)
            }
          })
        },
        router: (req) => {
          const url = new URL(req.url, 'http://localhost')
          const targetUrl = url.searchParams.get('url')
          if (targetUrl) {
            const parsed = new URL(targetUrl)
            return {
              host: parsed.hostname,
              port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
              protocol: parsed.protocol === 'https:' ? 'https:' : 'http:',
            }
          }
        },
      },
    },
  },
})
