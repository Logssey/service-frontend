import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // 8080이 다른 프로세스에 점유된 환경도 있어 프록시 대상을 환경변수로 뺀다. 기본값은 그대로 8080.
  const env = loadEnv(mode, currentDirectory, '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(currentDirectory, 'src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // WSL에서 실행하고 Windows 브라우저로 접속하는 구성이라 127.0.0.1만 열면 닿지 않는다.
      host: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      // .env는 테스트 모드에도 로드된다. 개발자가 실연동을 켜둔 상태로 테스트를 돌리면
      // 목이 아니라 실제 fetch가 나가므로, 테스트는 목 모드로 못 박는다.
      env: {
        VITE_USE_MOCKS: 'true',
        VITE_USE_MOCKS_AUTH: 'true',
      },
    },
  }
})
