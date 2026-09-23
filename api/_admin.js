import { createClient } from '@supabase/supabase-js';

export function client(url,key){
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function response(status,body,headers={}){
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
}
function env(){
  const url=String(process.env.SUPABASE_URL||'').trim();
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();
  if(!url||!key) throw new Error('Server Supabase credentials are not configured.');
  return {url,key};
}
export async function requireAdmin(request,minimum='admin'){
  const token=String(request.headers.get('authorization')||'').replace(/^Bearer\\s+/i,'').trim();
  if(!token) throw Object.assign(new Error('Missing authorization token'),{status:401});
  const c=env();
  const auth=client(c.url,process.env.SUPABASE_PUBLISHABLE_KEY||c.key);
  const {data,error}=await auth.auth.getUser(token);
  if(error||!data.user) throw Object.assign(new Error('Invalid or expired session'),{status:401});
  const s=client(c.url,c.key);
  const {data:admin,error:ae}=await s.from('admin_accounts').select('id,email,display_name,enabled,created_at').eq('email',data.user.email).maybeSingle();
  if(ae) throw ae;
  if(!admin||!admin.enabled) throw Object.assign(new Error('Admin account is disabled or missing'),{status:403});
  const {data:first}=await s.from('admin_accounts').select('id').eq('enabled',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
  const isOwner=!!first&&first.id===admin.id;
  if(minimum==='owner'&&!isOwner) throw Object.assign(new Error('Owner authorization required'),{status:403});
  return {user:data.user,admin:{...admin,role:isOwner?'owner':'admin'},supabase:s,role:isOwner?'owner':'admin'};
}
export async function audit(ctx,action,meta={}){
  await ctx.supabase.from('admin_audit').insert({
    admin_phone:ctx.admin.phone||'',actor_name:ctx.admin.display_name||'',actor_email:ctx.admin.email||'',action,meta
  });
}
export function methodGuard(request,method='POST'){
  if(request.method!==method) return response(405,{ok:false,error:`${method} required`});
  return null;
}
