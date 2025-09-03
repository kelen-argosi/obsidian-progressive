import typescript from '@rollup/plugin-typescript';

export default {
  input: 'main.ts',          // your plugin's main file
  output: {
    file: 'main.js',         // output file
    format: 'cjs',           // CommonJS, required by Obsidian
    sourcemap: true
  },
  external: ['obsidian'],    // do not bundle Obsidian API
  plugins: [
    typescript({
      sourceMap: true,
      inlineSources: true
    })
  ]
};

