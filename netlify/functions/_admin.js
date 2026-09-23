const {createClient}=require('@supabase/supabase-js');

function client(url,key){return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
function json(status,body){return{statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)}}
function env(){const url=String(process.env.SUPABASE_URL||'').trim();const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'').trim();if(!url||!key)throw new Error('Server Supabase credentials are not configured.');return{url,key}}
async function requireAdmin(event,minimum='admin'){
 const token=String((event.headers&& (event.headers.authorization||event.headers.Authorization))||'').replace(/^Bearer\s+/i,'').trim();
 if(!token)throw Object.assign(new Error('Missing authorization token'),{status:401});
 const c=env(),auth=client(c.url,process.env.SUPABASE_PUBLISHABLE_KEY||c.key);
 const {data,error}=await auth.auth.getUser(token);if(error||!data.user)throw Object.assign(new Error('Invalid or expired session'),{status:401});
 const s=client(c.url,c.key);
 const {data:admin,error:ae}=await s.from('admin_accounts').select('id,email,display_name,enabled,created_at').eq('email',data.user.email).maybeSingle();
 if(ae)throw ae;if(!admin||!admin.enabled)throw Object.assign(new Error('Admin account is disabled or missing'),{status:403});
 return{user:data.user,admin,supabase:s,role:minimum==='owner'?(admin.email===data.user.email&&data.user.email===process.env.ADMIN_OWNER_EMAIL?'owner':null):'admin'};
}
function actor(a){return{admin_phone:a.admin.phone||'',actor_name:a.admin.display_name||'',actor_email:a.admin.email||''}}
async function audit(ctx,action,meta={}){await ctx.supabase.from('admin_audit').insert({...actor(ctx),action,meta})}
module.exports={client,json,env,requireAdmin,audit};