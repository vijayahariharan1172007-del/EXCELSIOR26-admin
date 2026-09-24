import { createClient } from '@supabase/supabase-js';

const USERS=[
  {username:'exc26admin01',display_name:'EXCELSIOR Admin 01',role:'owner'},
  {username:'exc26admin02',display_name:'EXCELSIOR Admin 02',role:'admin'},
  {username:'exc26admin03',display_name:'EXCELSIOR Admin 03',role:'admin'},
  {username:'exc26admin04',display_name:'EXCELSIOR Admin 04',role:'admin'},
  {username:'exc26admin05',display_name:'EXCELSIOR Admin 05',role:'admin'},
  {username:'exc26admin06',display_name:'EXCELSIOR Admin 06',role:'admin'},
  {username:'exc26admin07',display_name:'EXCELSIOR Admin 07',role:'admin'},
  {username:'exc26admin08',display_name:'EXCELSIOR Admin 08',role:'admin'},
  {username:'exc26admin09',display_name:'EXCELSIOR Admin 09',role:'admin'},
  {username:'exc26admin10',display_name:'EXCELSIOR Admin 10',role:'admin'}
];

export function client(url,key){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export function response(status,body,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});}
function env(){
  const url=String(process.env.SUPABASE_URL||'https://rhglnkldrydvrfnrxirg.supabase.co').trim();
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_DwN_VcnzkBqiABMr_1Sr_A_jhvJbASB').trim();
  if(!url||!key)throw new Error('Supabase connection is not configured.');
  return{url,key};
}
export async function identifyAdmin(request,username){
  const name=String(username||'').trim();
  const user=USERS.find(x=>x.username===name);
  if(!user)throw Object.assign(new Error('Select a valid operator account.'),{status:400});
  // Operator entry is intentionally independent of Supabase. The console must
  // transition immediately; Supabase is used only for optional activity logging.
  let s=null;
  try{const c=env();s=client(c.url,c.key,name);}catch(_e){}
  const admin={username:user.username,display_name:user.display_name,role:user.role,email:user.username+'@excelsior26.local',phone:'',id:null,enabled:true};
  return{admin,supabase:s,role:user.role};
}

export async function audit(ctx,action,meta={}){
  if(!ctx?.supabase)return;
  try{
    const write=ctx.supabase.from('admin_audit').insert({admin_phone:ctx.admin.phone||'',actor_name:ctx.admin.display_name||'',actor_email:ctx.admin.email||'',action,meta:{...meta,username:ctx.admin.username||null}});
    await Promise.race([write,new Promise(resolve=>setTimeout(resolve,1500))]).catch(()=>{});
  }catch(_e){}
}
export function methodGuard(request,method='POST'){if(request.method!==method)return response(405,{ok:false,error:method+' required'});return null;}
