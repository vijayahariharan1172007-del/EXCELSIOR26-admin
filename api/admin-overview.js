const USERS=new Set(Array.from({length:10},(_,i)=>'exc26admin'+String(i+1).padStart(2,'0')));

function json(status,body){
  return new Response(JSON.stringify(body),{
    status,
    headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
  });
}

function config(){
  const url=String(process.env.SUPABASE_URL||'https://rhglnkldrydvrfnrxirg.supabase.co').trim().replace(/\\/$/,'');
  const key=String(
    process.env.SUPABASE_SERVICE_ROLE_KEY||
    process.env.SUPABASE_SECRET_KEY||
    process.env.SUPABASE_PUBLISHABLE_KEY||
    'sb_publishable_DwN_VcnzkBqiABMr_1Sr_A_jhvJbASB'
  ).trim();
  if(!url||!key) throw new Error('Supabase connection is not configured.');
  return {url,key};
}

async function rest(url,key,operator,path,options={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try{
    const headers={
      apikey:key,
      Authorization:'Bearer '+key,
      'x-operator':operator,
      Accept:'application/json',
      ...(options.headers||{})
    };
    const r=await fetch(url+'/rest/v1/'+path,{...options,headers,signal:controller.signal});
    const text=await r.text();
    let data=null;
    try{data=text?JSON.parse(text):null}catch(_e){data=text}
    if(!r.ok){
      const message=data?.message||data?.error_description||data?.hint||text||('Supabase HTTP '+r.status);
      throw Object.assign(new Error(message),{status:r.status,code:data?.code||null});
    }
    return {response:r,data};
  }finally{clearTimeout(timer)}
}

function countFrom(response){
  const range=response.headers.get('content-range')||'';
  const total=range.split('/')[1];
  const n=Number(total);
  return Number.isFinite(n)?n:0;
}

export default async function handler(request){
  if(request.method!=='POST') return json(405,{ok:false,error:'POST required'});
  try{
    const body=await request.json().catch(()=>({}));
    const operator=String(body.username||'').trim();
    const action=String(body.action||'');
    if(!USERS.has(operator)) return json(400,{ok:false,error:'Select a valid operator account.'});
    if(action!=='overview') return json(400,{ok:false,error:'Unknown overview action'});

    const {url,key}=config();
    const names=['master_registrations','event_registrations','abstract_submissions','qr_verifications'];
    const counts=[];
    for(const table of names){
      const r=await rest(url,key,operator,table+'?select=id&limit=1',{
        method:'GET',
        headers:{Prefer:'count=exact'}
      });
      counts.push(countFrom(r.response));
    }

    const events=await rest(
      url,key,operator,
      'event_registrations?select=event,event_key,status,payment_status&limit=1000',
      {method:'GET'}
    );

    return json(200,{
      ok:true,
      counts,
      events:Array.isArray(events.data)?events.data:[],
      admin:{
        username:operator,
        display_name:'EXCELSIOR Admin '+operator.slice(-2),
        role:operator==='exc26admin01'?'owner':'admin',
        email:operator+'@excelsior26.local',
        phone:'',
        id:null,
        enabled:true
      }
    });
  }catch(e){
    console.error('ADMIN_OVERVIEW_FAILED',e?.stack||e);
    return json(e.status||500,{ok:false,error:e.message||'Admin overview failed',code:e.code||null});
  }
}
