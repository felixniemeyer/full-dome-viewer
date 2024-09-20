import glsl from 'vite-plugin-glsl';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', 
  plugins: [
    glsl(), 
  ], 
  build: {
    target: ['es6'], 
    outDir: 'dist',
    // assetsInlineLimit: 1024 ** 3, 
  }
});

