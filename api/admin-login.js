import { response,findAdminUser,makeSession } from './_admin.js';

export default async function handler(request){
  if(request.method!=='POST') return response(405,{ok:false,error:'POST required'});
  try{
    const body=await request.json().catch(()=>({}));
    const username=String(body.username||'').trim();
    const password=String(body.password||'');
    if(!username||!password) return response(400,{ok:false,error:'Username and password are required.'});

    const user=findAdminUser(username,password);
    if(!user) return response(401,{ok:false,error:'Invalid admin username or password.'});

    // Login must not depend on Supabase. This prevents the audit/database
    // connection from leaving the browser stuck on "Verifying…".
    const token=makeSession(user);

    return response(200,{
      ok:true,
      token,
      admin:{
        username:user.username,
        display_name:user.display_name,
        email:user.username+'@excelsior26.local',
        role:user.role
      }
    });
  }catch(e){
    return response(500,{ok:false,error:e.message||'Login failed'});
  }
}
