import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const USERS=[
  {username:'exc26admin01',hash:'a287138ab8fd09bcff9810544339124e94a51e32d720420dc5c2d4a294c21ce5',display_name:'EXCELSIOR Admin 01',role:'owner'},
  {username:'exc26admin02',hash:'29102f9b435ef342b10228fb2e7978f834706918616c895f270d1edbe81066c7',display_name:'EXCELSIOR Admin 02',role:'admin'},
  {username:'exc26admin03',hash:'ac50c4a79071c431130cedb8f067a0c0d2ef223229b2266b7d0d1ea30aec2fed',display_name:'EXCELSIOR Admin 03',role:'admin'},
  {username:'exc26admin04',hash:'2153be43cfda8cdeaa61b6da445cb66a175af1d61971916faeb866e7d13d2717',display_name:'EXCELSIOR Admin 04',role:'admin'},
  {username:'exc26admin05',hash:'538cfcbad98661af7820706a6e1d3e9e98fda9f815e9f9de806c1a88c2276737',display_name:'EXCELSIOR Admin 05',role:'admin'},
  {username:'exc26admin06',hash:'ac353ec2bc5b9f5feb043738ff79f800a86b94a35c1189646db23e891a1ce55f',display_name:'EXCELSIOR Admin 06',role:'admin'},
  {username:'exc26admin07',hash:'70aa121feded6b6abe96dc39115563c066643b1e932226ac4baa00ba5fea1dad',display_name:'EXCELSIOR Admin 07',role:'admin'},
  {username:'exc26admin08',hash:'f902cd404572ae2726b3b07685838f55e4cd6a5ab88395fa0491684885ea140f',display_name:'EXCELSIOR Admin 08',role:'admin'},
  {username:'exc26admin09',hash:'d709e36544589300ab24f3fa4f9a74f2e420ec7235cf163b80fb6a38b128d111',display_name:'EXCELSIOR Admin 09',role:'admin'},
  {username:'exc26admin10',hash:'234d5cff437a3ecc266c24eea2facc34d096de5e0c13c05e83c31c59fbb9779b',display_name:'EXCELSIOR Admin 10',role:'admin'}
];

export function client(url,key){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export function response(status,body,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});}
function env(){const url=String(process.env.SUPABASE_URL||'').trim();const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();if(!url||!key)throw new Error('Server Supabase credentials are not configured.');return{url,key};}
function sessionSecret(){return String(process.env.ADMIN_SESSION_SECRET||'EXCELSIOR26_INTERNAL_SESSION_2026_9f7c2b4a6d8e1f3c').trim();}
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
  const admin={username:user.username,display_name:user.display_name,role:user.role,email:user.username+'@excelsior26.local',phone:first?.phone||'',id:first?.id||null,enabled:true};return{admin,supabase:s,role:user.role};
}
export async function audit(ctx,action,meta={}){await ctx.supabase.from('admin_audit').insert({admin_phone:ctx.admin.phone||'',actor_name:ctx.admin.display_name||'',actor_email:ctx.admin.email||'',action,meta:{...meta,username:ctx.admin.username||null}});}
export function methodGuard(request,method='POST'){if(request.method!==method)return response(405,{ok:false,error:method+' required'});return null;}
