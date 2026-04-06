import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // generates a self-signed cert so camera works on LAN
  ],
  server: {
    host: true,   // expose on LAN (0.0.0.0)
    port: 5173,
    https: true,  // required for getUserMedia on non-localhost
  },
});