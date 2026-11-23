import { defineConfig } from 'vite';
import { homedir } from 'node:os';
import { resolve, relative, isAbsolute } from 'node:path';
import { readFile } from 'node:fs/promises';
const outputDir=resolve(process.env.DPR_WEB_OUTPUT_DIR || resolve(homedir(), 'workspace/runs/daily-paper-reader/web-build'));
const sourceRelative=relative(outputDir,resolve('.'));
if(!sourceRelative || (!sourceRelative.startsWith('..')&&!isAbsolute(sourceRelative)))throw new Error('Build output must not contain the source repository');
export default defineConfig({
  base: './', publicDir: false,
  plugins: [{name:'reader-entry', transformIndexHtml: {order:'pre', async handler(html, context) {
    return context.filename === resolve('index.html') ? readFile(resolve('reader/index.html'),'utf-8') : html;
  }}}, {name:'reader-data', configureServer(server) {
    server.middlewares.use(async (req,res,next)=>{
      const path = (req.url || '').split('?')[0];
      if (!/^\/docs\/data\/(catalog\.json|daily\/\d{8}(?:-\d{8})?\.json|topics\/\d{8}-[a-f0-9]{12}\.json|previews\/[a-f0-9]{24}\.webp)$/.test(path)) return next();
      try {
        const root = process.env.DPR_READER_DATA_DIR || resolve(homedir(),'workspace/runs/daily-paper-reader/reader-data');
        const data = await readFile(resolve(root,path.slice('/docs/data/'.length)));
        res.setHeader('Content-Type',path.endsWith('.webp')?'image/webp':'application/json');res.end(data);
      } catch {res.statusCode=404;res.end('Reader data missing');}
    });
  }}],
  cacheDir: process.env.DPR_VITE_CACHE || resolve(homedir(), 'workspace/.cache/dpr-vite'),
  build: { assetsDir:'app/reader-assets', outDir: outputDir, emptyOutDir: true },
});
