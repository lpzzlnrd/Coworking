import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/auth': {
        target: process.env.AUTH_API_TARGET || (
          process.env.API_TARGET && !process.env.API_TARGET.includes('localhost') && !process.env.API_TARGET.includes('127.0.0.1')
            ? 'http://role-manage:8000'
            : 'http://localhost:8001'
        ),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, '/auth'),
      },
      '/api/users': {
        target: process.env.AUTH_API_TARGET || (
          process.env.API_TARGET && !process.env.API_TARGET.includes('localhost') && !process.env.API_TARGET.includes('127.0.0.1')
            ? 'http://role-manage:8000'
            : 'http://localhost:8001'
        ),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/users/, '/users'),
      },
      '/api/billing': {
        target: process.env.BILLING_API_TARGET || (
          process.env.API_TARGET && !process.env.API_TARGET.includes('localhost') && !process.env.API_TARGET.includes('127.0.0.1')
            ? 'http://billing-service:8002'
            : 'http://localhost:8002'
        ),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/billing/, ''),
      },
      '/api/checking': {
        target: process.env.CHECKING_API_TARGET || (
          process.env.API_TARGET && !process.env.API_TARGET.includes('localhost') && !process.env.API_TARGET.includes('127.0.0.1')
            ? 'http://checking-service:3000'
            : 'http://localhost:8080'
        ),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/checking/, ''),
      },
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  define: {
    'import.meta.env.VITE_SERVICE_TYPE': JSON.stringify(process.env.SERVICE_TYPE || 'role-manage'),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
