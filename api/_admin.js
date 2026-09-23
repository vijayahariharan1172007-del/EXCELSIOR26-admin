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
  const token=String(request.headers.get('authorization')||'').replace(/^Bearer\\s+/i,'').trim();
  if(!token) throw Object.assign(new Error('Missing authorization token'),{status:401});
  const c=env(),s=client(c.url,c.key);
  const {data:cred,error:ce}=await s.from('admin_login_credentials')
    .select('email,display_name,enabled,session_expires_at')
    .eq('session_token_hash',tokenHash(token)).eq('enabled',true).maybeSingle();
  if(ce)throw ce;
  if(!cred||!cred.session_expires_at||new Date(cred.session_expires_at).getTime()<Date.now())
    throw Object.assign(new Error('Invalid or expired admin session'),{status:401});
  const {data:admin,error:ae}=await s.from('admin_accounts')
    .select('id,email,display_name,enabled,created_at,phone')
    .eq('email',cred.email).maybeSingle();
  if(ae)throw ae;
  if(!admin||!admin.enabled)throw Object.assign(new Error('Admin account is disabled or missing'),{status:403});
  const {data:first}=await s.from('admin_accounts').select('id').eq('enabled',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
  const isOwner=!!first&&first.id===admin.id;
  if(minimum==='owner'&&!isOwner)throw Object.assign(new Error('Owner authorization required'),{status:403});
  return {admin:{...admin,role:isOwner?'owner':'admin'},supabase:s,role:isOwner?'owner':'admin'};
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
