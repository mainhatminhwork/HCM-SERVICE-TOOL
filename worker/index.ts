import handler from 'vinext/server/fetch-handler';
import { mailCycle } from '../lib/mail';
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  // Buffer API bodies before routing so early authorization responses do not
  // leave a transferred HTTP stream open in the local Workers runtime.
  if(request.body&&new URL(request.url).pathname.startsWith('/api/')){
   const limit=6*1024*1024,reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
   while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;
    if(size>limit){await reader.cancel();return Response.json({error:'Yêu cầu quá lớn.'},{status:413});}chunks.push(part.value);}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   request=new Request(request,{body:bytes});
  }
  const response=await handler.fetch(request,env,ctx);
  if(request.method==='POST'&&new URL(request.url).pathname==='/api/warehouse'&&response.ok)ctx.waitUntil(mailCycle(env).catch(()=>console.error('Mail background job failed')));
  return response;
 },
 scheduled(_controller:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(mailCycle(env,true).catch(()=>console.error('Mail scheduled job failed')));}
};
