import crypto from 'node:crypto';
import { response,authenticateAdmin,identifyAdmin,audit,sessionCookie,clearSessionCookie,client } from './_admin.js';
function hashPassword(password){return crypto.createHash('sha256').update(String(password)).digest('hex')}
function verifyPasswordHash(password,passwordHash){const a=Buffer.from(hashPassword(password)),b=Buffer.from(String(passwordHash||''));return a.length===b.length&&crypto.timingSafeEqual(a,b)}
function operatorMeta(username){const i=Number(String(username||'').replace('exc26admin',''));if(!i||i<1||i>10)return null;return{username:'exc26admin'+String(i).padStart(2,'0'),display_name:'EXCELSIOR Admin '+String(i).padStart(2,'0'),role:i===1?'owner':'admin',email:'exc26admin'+String(i).padStart(2,'0')+'@excelsior26.local',phone:'',id:null,enabled:true};}

export async function POST(request){
  if(request.method!=='POST') return response(405,{ok:false,error:'POST required'});
  try{
    const body=await request.json().catch(()=>({}));
    if(body.action==='session'){const ctx=await identifyAdmin(request,body.username);return response(200,{ok:true,admin:ctx.admin});}
    if(body.action==='change_password'){
      const ctx=await identifyAdmin(request,body.username);
      const current=String(body.currentPassword||'');
      const next=String(body.newPassword||'');
      if(next.length<8)return response(400,{ok:false,error:'New password must be at least 8 characters.'});
      if(next.length>128)return response(400,{ok:false,error:'New password is too long.'});
      if(!current)return response(400,{ok:false,error:'Current password is required.'});
      const q=await ctx.supabase.from('admin_credentials').select('password_hash').eq('username',ctx.admin.username).maybeSingle();
      if(q.error)throw Object.assign(new Error('Password store unavailable.'),{status:503});
      if(!q.data?.password_hash||!verifyPasswordHash(current,q.data.password_hash))throw Object.assign(new Error('Current password is incorrect.'),{status:401});
      if(verifyPasswordHash(next,q.data.password_hash))return response(400,{ok:false,error:'New password must be different from the current password.'});
      const u=await ctx.supabase.from('admin_credentials').update({password_hash:hashPassword(next),updated_at:new Date().toISOString()}).eq('username',ctx.admin.username);
      if(u.error)throw Object.assign(new Error('Password could not be changed.'),{status:500});
      await audit(ctx,'admin_password_changed',{});
      return response(200,{ok:true,message:'Password changed successfully.'});
    }
    if(body.action==='logout') return new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':clearSessionCookie()}});
    const username=String(body.username||'').trim();
    const password=String(body.password||'');
    if(!username||!password)return response(400,{ok:false,error:'Username and password are required.'});
    const meta=operatorMeta(username);
    if(!meta)return response(401,{ok:false,error:'Invalid username or password.'});
    const url=String(process.env.SUPABASE_URL||'https://rhglnkldrydvrfnrxirg.supabase.co').trim();
    const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_DwN_VcnzkBqiABMr_1Sr_A_jhvJbASB').trim();
    const store=client(url,key,username);
    const stored=await store.from('admin_credentials').select('password_hash').eq('username',username).maybeSingle();
    if(stored.error)throw Object.assign(new Error('Password store unavailable.'),{status:503});
    let user=meta;
    if(stored.data?.password_hash){
      if(!verifyPasswordHash(password,stored.data.password_hash))throw Object.assign(new Error('Invalid username or password.'),{status:401});
    }else{
      user=authenticateAdmin(username,password);
      const boot=await store.from('admin_credentials').insert({username,password_hash:hashPassword(password)});
      if(boot.error)throw Object.assign(new Error('Password store could not be initialized.'),{status:503});
    }
    const admin=user;
    try{
      const url=String(process.env.SUPABASE_URL||'https://rhglnkldrydvrfnrxirg.supabase.co').trim();
      const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_DwN_VcnzkBqiABMr_1Sr_A_jhvJbASB').trim();
      await audit({admin,supabase:client(url,key,user.username)},'admin_enter',{method:'password'});
    }catch(_e){}
    return new Response(JSON.stringify({ok:true,admin}),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':sessionCookie(user.username)}});
  }catch(e){return response(e.status||500,{ok:false,error:e.message||'Admin login failed'});}
}
