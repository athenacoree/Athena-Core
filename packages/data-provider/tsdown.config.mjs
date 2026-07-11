import path from 'node:path';
import { createRequire } from 'node:module';
import replace from '@rollup/plugin-replace';
import { defineConfig } from 'tsdown';

const require = createRequire(import.meta.url);
const rootPkg = require('../../package.json');

export default defineConfig({
  entry: ['src/index.ts', 'src/react-query/index.ts'],
  format: ['cjs', 'esm'],
  platform: 'neutral',
  dts: false,
  outDir: 'dist',
  sourcemap: true,
  deps: {
    neverBundle: (id) => !id.startsWith('.') && !path.isAbsolute(id) && !id.startsWith('src/'),
    onlyBundle: false,
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __IS_DEV__: process.env.NODE_ENV === 'development',
        __LIBRECHAT_VERSION__: rootPkg.version,
      },
    }),
  ],
});
