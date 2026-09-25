import { response,identifyAdmin,audit } from './_admin.js';

export async function POST(request){
  if(request.method!=='POST') return response(405,{ok:false,error:'POST required'});
  try{
    const body=await request.json().catch(()=>({}));
    const username=String(body.username||'').trim();
    if(!username)return response(400,{ok:false,error:'Operator username is required.'});
    const ctx=await identifyAdmin(request,username);
    await audit(ctx,'admin_enter',{method:'operator-selection'});
    return response(200,{ok:true,admin:ctx.admin});
  }catch(e){
    return response(e.status||500,{ok:false,error:e.message||'Operator entry failed'});
  }
}
