import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const USERS=[
  {username:'exc26admin01',hash:'d6524f41c9d907d65e1a9341a15cbd60e426ec95bfb06ff0791db61513210e62',display_name:'EXCELSIOR Admin 01',role:'owner'},
  {username:'exc26admin02',hash:'37f802419153f8c70ef3394f7ee8f2f1a23070cc64975384c4c4e5916e2c9525',display_name:'EXCELSIOR Admin 02',role:'admin'},
  {username:'exc26admin03',hash:'ce6aed8668476eb9646c294addf52fd2806a1acd79fbceff98374c2116d02d37',display_name:'EXCELSIOR Admin 03',role:'admin'},
  {username:'exc26admin04',hash:'97c9ae7003caa4786e0c032be512ba7972b9d831c14f05667736506d9aa07537',display_name:'EXCELSIOR Admin 04',role:'admin'},
  {username:'exc26admin05',hash:'5b8d6e4804fc9892f21ee755358f105f8b316b7b582452a849686c6034c4d042',display_name:'EXCELSIOR Admin 05',role:'admin'},
  {username:'exc26admin06',hash:'748610c0a85b8149154fede8de679965b68408aed7bbb7387194f52a17abd0de',display_name:'EXCELSIOR Admin 06',role:'admin'},
  {username:'exc26admin07',hash:'144d70e431ff4d5d3e8445990c0a4a674b097c7574777e0b2aeb33135afd4d5b',display_name:'EXCELSIOR Admin 07',role:'admin'},
  {username:'exc26admin08',hash:'de9812f9491e986bfa1f3ac509daea95835d59e3e948891ba7e911c13f213e0f',display_name:'EXCELSIOR Admin 08',role:'admin'},
  {username:'exc26admin09',hash:'571024835ea240a655be9dfca7f199e7905ce89cc08956f8efd4c3ad66e89fdc',display_name:'EXCELSIOR Admin 09',role:'admin'},
  {username:'exc26admin10',hash:'234d5cff437a3ecc266c24eea2facc34d096de5e0c13c05e83c31c59fbb9779b',display_name:'EXCELSIOR Admin 10',role:'admin'}
];

export function client(url,key){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export function response(status,body,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});}
function env(){const url=String(process.env.SUPABASE_URL||'').trim();const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();if(!url||!key)throw new Error('Server Supabase credentials are not configured.');return{url,key};}
function sessionSecret(){const s=String(process.env.ADMIN_SESSION_SECRET||'').trim();if(!s)throw new Error('ADMIN_SESSION_SECRET is not configured.');return s;}
function b64(v){return Buffer.from(v).toString('base64url')}
function unb64(v){return Buffer.from(v,'base64url').toString('utf8')}
function sign(data){return crypto.createHmac('sha256',sessionSecret()).update(data).digest('base64url')}
export function makeSession(user){const payload={u:user.username,name:user.display_name,role:user.role,iat:Date.now(),exp:Date.now()+8*60*60*1000};const body=b64(JSON.stringify(payload));return body+'.'+sign(body);}
export function verifySession(token){if(!token)return null;const[body,sig]=String(token).split('.');if(!body||!sig)return null;const expected=sign(body);if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;let p;try{p=JSON.parse(unb64(body))}catch{return null}if(!p?.u||!p?.exp||p.exp<Date.now())return null;const user=USERS.find(x=>x.username===p.u);return user?{...user,session_expires_at:p.exp}:null;}
export function findAdminUser(username,password){const u=USERS.find(x=>x.username===String(username||'').trim());if(!u)return null;const hash=crypto.createHash('sha256').update(String(password||'')).digest('hex');return crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(u.hash))?u:null;}
export function credentialList(){return USERS.map(({username,display_name,role})=>({username,display_name,role}));}

export async function requireAdmin(request,minimum='admin'){
  const auth=String(request.headers.get('authorization')||'');const token=auth.startsWith('Bearer ')?auth.slice(7):'';const user=verifySession(token);
  if(!user)throw Object.assign(new Error('Admin session required.'),{status:401});
  if(minimum==='owner'&&user.role!=='owner')throw Object.assign(new Error('Owner authorization is required.'),{status:403});
  const c=env(),s=client(c.url,c.key);const{data:first,error}=await s.from('admin_accounts').select('id,email,display_name,enabled,created_at,phone').eq('enabled',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
  if(error)throw error;
  const admin={username:user.username,display_name:user.display_name,role:user.role,email:first?.email||user.username+'@excelsior26.local',phone:first?.phone||'',id:first?.id||null,enabled:true};return{admin,supabase:s,role:user.role};
}
export async function audit(ctx,action,meta={}){await ctx.supabase.from('admin_audit').insert({admin_phone:ctx.admin.phone||'',actor_name:ctx.admin.display_name||'',actor_email:ctx.admin.email||'',action,meta:{...meta,username:ctx.admin.username||null}});}
export function methodGuard(request,method='POST'){if(request.method!==method)return response(405,{ok:false,error:method+' required'});return null;}
