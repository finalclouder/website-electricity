import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Only load VITE_-prefixed vars — this keeps JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY,
  // and SUPABASE_ANON_KEY out of Vite's env object entirely. Those secrets are
  // read exclusively via process.env in server.ts / API routes at runtime.
  const env = loadEnv(mode, '.', 'VITE_');
  const clientEnv = {
    VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
    VITE_SUPABASE_URL:
      env.VITE_SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://bkyxwqbkewvbibieumte.supabase.co',
    VITE_SUPABASE_ANON_KEY:
      env.VITE_SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreXh3cWJrZXd2YmliaWV1bXRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTQ1NDAsImV4cCI6MjA5MTczMDU0MH0.pVb2IN71nvyfKAXFRVZbT1qaIkpe9ZeegL9KaQV2p1Y',
  };
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // GEMINI_API_KEY is intentionally client-side (Gemini JS SDK in browser).
      // Renamed to VITE_GEMINI_API_KEY in .env to make the exposure explicit.
      'process.env.GEMINI_API_KEY': JSON.stringify(clientEnv.VITE_GEMINI_API_KEY),
      // Supabase Realtime — anon key + URL are intentionally client-side (WS subscriptions only).
      'process.env.VITE_SUPABASE_URL': JSON.stringify(clientEnv.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(clientEnv.VITE_SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
            lucide: ['lucide-react'],
            motion: ['motion/react'],
            export: ['jspdf', 'html2canvas'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
