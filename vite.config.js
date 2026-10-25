import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import Sitemap from 'vite-plugin-sitemap';
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    Sitemap({
      hostname: 'https://ordochao.tech',
      // List out any extra pages/routes you have:
      dynamicRoutes: [
        '/',
        '/devops',
        '/deployment-guides/vite',
        '/deployment-guides/node',
        '/deployment-guides/go',
        '/deployment-guides/python',
        '/deployment-guides/laravel',
        '/deployment-guides/github-actions',
        '/deployment-guides/grafana',
        '/deployment-guides/vault',
        '/deployment-guides/uptime-kuma',
        '/deployment-guides/longhorn',
        '/deployment-guides/rabbitmq',
        '/deployment-guides/mailu',
        '/deployment-guides/redis',
        '/deployment-guides/minio',
        '/deployment-guides',
      ]
    })
  ],
})
