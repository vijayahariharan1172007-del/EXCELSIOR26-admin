import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const USERS=[
  {username:'exc26admin01',display_name:'Vijayahariharan',role:'owner',passwordHash:'b1583e4be22b5644276acf9d1faf845db9baed646ace9de2523365f2c3ad8854'},
  {username:'exc26admin02',display_name:'Thangalakshmi',role:'admin',passwordHash:'b3034c0b45c6d9947c0bd4dbd849926249cfd196cbe38e7464e9a20939cc8638'},
  {username:'exc26admin03',display_name:'Prabhanjani',role:'admin',passwordHash:'58a7ed52595422ec94f9052794e99e7f913119a2e0e252ec83198ad4ba0da39d'},
  {username:'exc26admin04',display_name:'Arundhathi',role:'admin',passwordHash:'fe1440a2ea075cae75af051056e355123d7ef7406f409bd91202b45d5d468b9e'},
  {username:'exc26admin05',display_name:'Sujay',role:'admin',passwordHash:'0f49922874bd68acf7938da5d55b5883f6d30693641006b2bbf6f619c943061a'},
  {username:'exc26admin06',display_name:'Sriraam',role:'admin',passwordHash:'c69e4d7ee60301f5765344e2a3e220bd9dbc39b0520360d1f675ee1df44d84d9'},
  {username:'exc26admin07',display_name:'Thejeswini',role:'admin',passwordHash:'e469eb2b6b382d05a0be246aa0b39d09d0679ec25165c5af394c39cb4f519baa'},
  {username:'exc26admin08',display_name:'Dr. Rajukumaran — Faculty',role:'admin',passwordHash:'a0999eb6278f84d2b672e4e3c68dac837cae0531eebb39d7b5e927d5d144acb1'},
  {username:'exc26admin09',display_name:'Admin 09',role:'admin',passwordHash:'0ce9a1e0a9495c103a03faff6e51ce0415f34fdfb860724fafef0a333d454064'},
  {username:'exc26admin10',display_name:'Admin 10',role:'admin',passwordHash:'473fea8f945ed5912a23c393c3311ba3d18a7232fdc5730ea19a13321065bd29'}
];

const SESSION_COOKIE='exc26_admin_session';
const SESSION_TTL=8*60*60;
function secret(){return String(process.env.ADMIN_SESSION_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'EXCELSIOR26-admin-session-secret-change-me')}
function hashPassword(password){return crypto.createHash('sha256').update(String(password)).digest('hex')}
function sign(value){return crypto.createHmac('sha256',secret()).update(value).digest('base64url')}
function issueSession(user){const payload=Buffer.from(JSON.stringify({u:user.username,e:Math.floor(Date.now()/1000)+SESSION_TTL})).toString('base64url');return payload+'.'+sign(payload)}
function parseCookies(request){return Object.fromEntries(String(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
export function authenticateAdmin(username,password){const user=USERS.find(x=>x.username===String(username||'').trim());if(!user||!password)throw Object.assign(new Error('Invalid username or password.'),{status:401});const a=Buffer.from(hashPassword(password));const b=Buffer.from(user.passwordHash);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw Object.assign(new Error('Invalid username or password.'),{status:401});return user}
export function sessionCookie(username){const user=USERS.find(x=>x.username===username);return SESSION_COOKIE+'='+encodeURIComponent(issueSession(user))+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age='+SESSION_TTL}
export function clearSessionCookie(){return SESSION_COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}
export function client(url,key,operator=''){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:operator?{'x-operator':operator}:{}}});}
export function response(status,body,headers={}){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});}
function env(){
  const url=String(process.env.SUPABASE_URL||'https://rhglnkldrydvrfnrxirg.supabase.co').trim();
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_DwN_VcnzkBqiABMr_1Sr_A_jhvJbASB').trim();
  if(!url||!key)throw new Error('Supabase connection is not configured.');
  return{url,key};
}
export async function identifyAdmin(request,username){
  const cookies=parseCookies(request),token=cookies[SESSION_COOKIE];
  if(!token)throw Object.assign(new Error('Admin login required.'),{status:401});
  const [payload,sig]=String(token).split('.');
  if(!payload||!sig||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(sign(payload))))throw Object.assign(new Error('Invalid admin session.'),{status:401});
  let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch(_e){throw Object.assign(new Error('Invalid admin session.'),{status:401})}
  if(!data?.u||Number(data.e||0)<Math.floor(Date.now()/1000))throw Object.assign(new Error('Admin session expired. Please log in again.'),{status:401});
  const user=USERS.find(x=>x.username===data.u);
  if(!user)throw Object.assign(new Error('Invalid admin session.'),{status:401});
  if(username&&String(username).trim()!==user.username)throw Object.assign(new Error('Admin session/operator mismatch.'),{status:401});
  let s=null;try{const c=env();s=client(c.url,c.key,user.username);}catch(_e){}
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
