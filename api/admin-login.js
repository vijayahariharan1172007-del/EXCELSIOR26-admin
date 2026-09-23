import { response,findAdminUser,makeSession,client } from './_admin.js';
export default async function handler(request){
  if(request.method!=='POST')return response(405,{ok:false,error:'POST required'});
  try{
    const body=await request.json().catch(()=>({}));const user=findAdminUser(body.username,body.password);
    if(!user)return response(401,{ok:false,error:'Invalid admin username or password.'});
    const token=makeSession(user);
    try{const url=String(process.env.SUPABASE_URL||'').trim(),key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();if(url&&key){const s=client(url,key);await s.from('admin_audit').insert({admin_phone:'',actor_name:user.display_name,actor_email:user.username+'@excelsior26.local',action:'admin_login',meta:{username:user.username,role:user.role}});}}catch{}
    return response(200,{ok:true,token,admin:{username:user.username,display_name:user.display_name,email:user.username+'@excelsior26.local',role:user.role}});
  }catch(e){return response(500,{ok:false,error:e.message||'Login failed'});}
}