import crypto from 'node:crypto';
import { client, response, methodGuard } from './_admin.js';

function env(){
  const url=String(process.env.SUPABASE_URL||'').trim();
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();
  if(!url||!key) throw new Error('Server Supabase credentials are not configured.');
  return {url,key};
}
function hashToken(token){return crypto.createHash('sha256').update(token).digest('hex');}

export default async function handler(request){
  const bad=methodGuard(request); if(bad)return bad;
  try{
    const body=await request.json().catch(()=>({}));
    const action=String(body.action||'login');
    const c=env(), s=client(c.url,c.key);

    if(action==='login'){
      const email=String(body.email||'').trim().toLowerCase();
      const password=String(body.password||'');
      if(!email||!password)return response(400,{ok:false,error:'Email and password are required.'});
      const verified=await s.rpc('verify_admin_password',{p_email:email,p_password:password});
      if(verified.error)throw verified.error;
      if(!verified.data)return response(401,{ok:false,error:'Invalid email or password.'});
      const a=await s.from('admin_accounts').select('id,email,display_name,enabled,created_at')
        .eq('email',email).eq('enabled',true).maybeSingle();
      if(a.error)throw a.error;
      if(!a.data)return response(403,{ok:false,error:'This account is not enabled for the admin portal.'});
      const token=crypto.randomBytes(48).toString('base64url');
      const expires=new Date(Date.now()+8*60*60*1000).toISOString();
      const upd=await s.from('admin_login_credentials').update({
        session_token_hash:hashToken(token),session_expires_at:expires,updated_at:new Date().toISOString()
      }).eq('email',email);
      if(upd.error)throw upd.error;
      return response(200,{ok:true,token,admin:{...a.data,role:'owner'}});
    }

    if(action==='logout'){
      const token=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
      if(token) await s.from('admin_login_credentials').update({session_token_hash:null,session_expires_at:null,updated_at:new Date().toISOString()}).eq('session_token_hash',hashToken(token));
      return response(200,{ok:true});
    }
    return response(400,{ok:false,error:'Unknown login action'});
  }catch(e){return response(e.status||500,{ok:e.message||'Login failed'});}
}
