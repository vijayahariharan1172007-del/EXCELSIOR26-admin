import { response,authenticateAdmin,identifyAdmin,audit,sessionCookie,clearSessionCookie,client,verifyPasswordHash,hashPassword } from './_admin.js';

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
    const user=authenticateAdmin(username,password);
    const admin={username:user.username,display_name:user.display_name,role:user.role,email:user.username+'@excelsior26.local',phone:'',id:null,enabled:true};
    try{
      const url=String(process.env.SUPABASE_URL||'https://rhglnkldrydvrfnrxirg.supabase.co').trim();
      const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_DwN_VcnzkBqiABMr_1Sr_A_jhvJbASB').trim();
      await audit({admin,supabase:client(url,key,user.username)},'admin_enter',{method:'password'});
    }catch(_e){}
    return new Response(JSON.stringify({ok:true,admin}),{status:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':sessionCookie(user.username)}});
  }catch(e){return response(e.status||500,{ok:false,error:e.message||'Admin login failed'});}
}
