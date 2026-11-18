import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  // O pacote shared e TypeScript puro (main: src/index.ts): precisa entrar no bundle.
  noExternal: ['@cifrai/shared'],
  sourcemap: true,
});
