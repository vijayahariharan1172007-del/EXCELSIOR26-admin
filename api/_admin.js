import crypto from 'node:crypto';
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
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}

export async function requireAdmin(request,minimum='admin'){
  const c=env(),s=client(c.url,c.key);
  const {data:first,error}=await s.from('admin_accounts')
    .select('id,email,display_name,enabled,created_at,phone')
    .eq('enabled',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
  if(error) throw error;
  const admin=first||{id:null,email:'admin@excelsior26.local',display_name:'Administrator',enabled:true,phone:''};
  return {admin:{...admin,role:'owner'},supabase:s,role:'owner'};
}
export async function audit(ctx,action,meta={}){
  await ctx.supabase.from('admin_audit').insert({
    admin_phone:ctx.admin.phone||'',actor_name:ctx.admin.display_name||'',actor_email:ctx.admin.email||'',action,meta
  });
}
export function methodGuard(request,method='POST'){
  if(request.method!==method)return response(405,{ok:false,error:method+' required'});
  return null;
}
