import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * La configuration recoit `isSsrBuild` : le build de pre-rendu ne doit pas
 * partager le decoupage en chunks du build navigateur. En SSR les dependances
 * sont externes, et Rollup refuse de les placer dans un chunk manuel.
 */
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],

  build: {
    rollupOptions: {
      output: isSsrBuild
        ? {}
        : {
            /**
             * Les dependances stables sont isolees du code applicatif : elles gardent
             * leur empreinte d'un deploiement a l'autre, donc le cache du navigateur.
             * Les ecrans de module sont deja decoupes par React.lazy (voir App.jsx).
             */
            manualChunks: {
              react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
              donnees: ['@tanstack/react-query', 'axios'],
              formulaires: ['react-hook-form', '@hookform/resolvers', 'zod'],
              icones: ['lucide-react'],
            },
          },
    },
  },

  server: {
    port: 5173,
    // Proxy vers l'API : le front appelle /api/... sans se soucier du port du serveur.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));
