// Serve the production bundle under a Pages-like subpath. External operations
// are mocked by each browser suite; this command never dispatches paid work.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {homedir} from 'node:os';
import {spawn} from 'node:child_process';
const root=resolve(process.env.DPR_WEB_OUTPUT_DIR||resolve(homedir(),'workspace/runs/daily-paper-reader/web-build'));
await stat(resolve(root,'index.html'));
const prefix='/reader-preview/';
const papers=[1,2].map(n=>({paper_key:`arxiv:1706.03762v${n}`,original_id:`1706.03762v${n}`,canonical_id:'arxiv:1706.03762',version:n,source:'arxiv',title:`Browser fixture paper ${n}`,title_zh:null,authors:['Test Author'],published:'2017-06-12',abstract:'Synthetic browser fixture abstract.',url:`https://arxiv.org/abs/1706.03762v${n}`,pdf_url:`https://arxiv.org/pdf/1706.03762v${n}`,score:9-n,reason:'Fixture only',tldr:'Fixture only',tags:['test'],breakdown:{problem:null,method:null,results:null},thumbnail:null,code_url:null,content_status:'incomplete',fulltext_path:`./docs/20261124/fixture-${n}.txt`}));
const catalog={schema_version:1,runs:[{run_id:'20261124',path:'daily/20261124.json',count:papers.length}]};
const fixtures=new Map([
 ['docs/data/catalog.json',JSON.stringify(catalog)],
 ['docs/data/daily/20261124.json',JSON.stringify({schema_version:1,run_id:'20261124',papers})],
 ...papers.map((_,i)=>[`docs/20261124/fixture-${i+1}.txt`,'Synthetic complete text for browser transport tests. '.repeat(120)+'\nReferences\nTest reference.'])
]);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const relative=pathname.slice(prefix.length)||'index.html',path=resolve(root,relative);
  if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  const content=fixtures.has(relative)?fixtures.get(relative):await readFile(path);
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'}).end(content);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const address=server.address();
try{
 for(const suite of ['conferences','notes','management','topics','chat','deep','citation']){
  console.log(`Browser suite: ${suite} (production bundle, subpath, synthetic data)`);
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[`reader/tests/browser-${suite}.mjs`],{stdio:'inherit',env:{...process.env,DPR_TEST_URL:`http://127.0.0.1:${address.port}${prefix}`}});
   const timer=setTimeout(()=>child.kill('SIGTERM'),90000);
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('exit',(code,signal)=>{clearTimeout(timer);code===0?resolve():reject(new Error(`${suite} failed: ${signal||code}`));});
  });
 }
}finally{await new Promise(resolve=>server.close(resolve));}
