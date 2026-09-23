const {json,requireAdmin,audit}=require('./_admin');
exports.handler=async(event)=>{
 try{
  if(event.httpMethod!=='POST')return json(405,{ok:false,error:'POST required'});
  const body=event.body?JSON.parse(event.body):{};const action=String(body.action||'');
  const ownerActions=new Set(['admin_create','admin_toggle']);
  const ctx=await requireAdmin(event,ownerActions.has(action)?'owner':'admin');
  if(ownerActions.has(action)&&!ctx.role)return json(403,{ok:false,error:'Owner authorization required'});
  const s=ctx.supabase;
  if(action==='overview'){
   const names=['master_registrations','event_registrations','abstract_submissions','qr_verifications'];
   const counts=await Promise.all(names.map(t=>s.from(t).select('*',{count:'exact',head:true})));
   const events=await s.from('event_registrations').select('event,event_key,status,payment_status').limit(1000);
   return json(200,{ok:true,counts:counts.map(x=>x.count||0),events:events.data||[]});
  }
  const reads={
   master_list:'master_registrations',
   event_list:'event_registrations',
   abstract_list:'abstract_submissions',
   profiles:'master_registrations',
   admins:'admin_accounts',
   site_content:'site_content',
   event_config:'registration_portals',
   team_members:'event_team_members',
   qr_queue:'qr_gmail_queue',
   qr_logs:'qr_verifications'
  };
  if(reads[action]){
   const table=reads[action];let q=s.from(table).select('*').limit(1000);
   if(table!=='admin_accounts')q=q.order('created_at',{ascending:false});
   const r=await q;if(r.error)throw r.error;return json(200,{ok:true,data:r.data||[]});
  }
  if(action==='master_review'){
   const id=String(body.id),status=String(body.status);if(!['approved','rejected','pending'].includes(status))return json(400,{ok:false,error:'Invalid registration status'});
   const patch={pre_registration_status:status,pre_approved_at:new Date().toISOString(),pre_approved_by:ctx.admin.email};
   if(status==='pending')patch.pre_approved_at=null,patch.pre_approved_by=null;
   const r=await s.from('master_registrations').update(patch).eq('id',id).select('id,master_id,pre_registration_status').maybeSingle();if(r.error)throw r.error;
   await audit(ctx,'master_review',{id,status});return json(200,{ok:true,data:r.data});
  }
  if(action==='event_review'){
   const id=String(body.id),status=String(body.status);if(!['approved','rejected','pending'].includes(status))return json(400,{ok:false,error:'Invalid event status'});
   const patch={status,admin_reviewed_at:new Date().toISOString(),admin_reviewed_by:ctx.admin.email};
   if(status==='pending')patch.admin_reviewed_at=null,patch.admin_reviewed_by=null;
   const r=await s.from('event_registrations').update(patch).eq('id',id).select('id,status,event_key,master_id').maybeSingle();if(r.error)throw r.error;
   await audit(ctx,'event_review',{id,status});return json(200,{ok:true,data:r.data});
  }
  if(action==='payment_review'){
   const id=String(body.id),status=String(body.status);if(!['approved','rejected','pending'].includes(status))return json(400,{ok:false,error:'Invalid payment status'});
   const r=await s.from('event_registrations').update({payment_status:status,admin_reviewed_at:new Date().toISOString(),admin_reviewed_by:ctx.admin.email}).eq('id',id).select('id,payment_status').maybeSingle();if(r.error)throw r.error;
   await audit(ctx,'event_payment_review',{id,status});return json(200,{ok:true,data:r.data});
  }
  if(action==='abstract_review'){
   const id=String(body.id),status=String(body.status);if(!['submitted','under_review','approved','rejected','resubmission_required'].includes(status))return json(400,{ok:false,error:'Invalid abstract status'});
   const r=await s.from('abstract_submissions').update({status,reviewed_at:new Date().toISOString(),reviewed_by:ctx.admin.email,rejection_reason:body.reason||null,updated_at:new Date().toISOString()}).eq('id',id).select('id,status').maybeSingle();if(r.error)throw r.error;
   await audit(ctx,'abstract_review',{id,status,reason:body.reason||null});return json(200,{ok:true,data:r.data});
  }
  if(action==='content_update'){
   const key=String(body.key);const r=await s.from('site_content').update({title:String(body.title||''),content:String(body.content||''),updated_at:new Date().toISOString()}).eq('key',key).select('*').maybeSingle();if(r.error)throw r.error;await audit(ctx,'site_content_update',{key});return json(200,{ok:true,data:r.data});
  }
  if(action==='event_config_update'){
   const key=String(body.key);const patch={title:body.title,subtitle:body.subtitle,fee:body.fee,qr:body.qr,note:body.note,description:body.description,fields:body.fields,team:body.team,enabled:body.enabled,requires_abstract:body.requires_abstract,updated_at:new Date().toISOString()};
   const r=await s.from('registration_portals').update(patch).eq('key',key).select('*').maybeSingle();if(r.error)throw r.error;await audit(ctx,'event_config_update',{key});return json(200,{ok:true,data:r.data});
  }
  if(action==='admin_toggle'){
   const id=String(body.id);const r=await s.from('admin_accounts').update({enabled:!!body.enabled,updated_at:new Date().toISOString()}).eq('id',id).select('id,email,enabled').maybeSingle();if(r.error)throw r.error;await audit(ctx,'admin_toggle',{id,enabled:!!body.enabled});return json(200,{ok:true,data:r.data});
  }
  if(action==='admin_create'){
   const email=String(body.email||'').trim().toLowerCase(),display=String(body.display_name||'').trim();if(!/^\\S+@\\S+\\.\\S+$/.test(email)||!display)return json(400,{ok:false,error:'Valid email and display name are required'});
   const enabled=await s.from('admin_accounts').select('id',{count:'exact',head:true}).eq('enabled',true);if((enabled.count||0)>=10)return json(409,{ok:false,error:'Maximum of 10 enabled admins reached'});
   const inv=await s.auth.admin.inviteUserByEmail(email,{data:{display_name:display},redirectTo:process.env.ADMIN_INVITE_REDIRECT_URL||undefined});if(inv.error)throw inv.error;
   const ins=await s.from('admin_accounts').insert({email,display_name:display,enabled:true,created_by:ctx.admin.email}).select('id,email,display_name,enabled').single();if(ins.error)throw ins.error;
   await audit(ctx,'admin_create',{email,display_name:display});return json(200,{ok:true,data:ins.data});
  }
  if(action==='brochure_upload'){
   const dataUrl=String(body.data_url||'');const name=String(body.name||'brochure.pdf');
   if(!/^data:application\\/pdf;base64,/.test(dataUrl))return json(400,{ok:false,error:'Only PDF files are accepted'});
   const raw=Buffer.from(dataUrl.split(',')[1],'base64');if(raw.length>50*1024*1024)return json(413,{ok:false,error:'Brochure exceeds the 50 MB limit'});
   const path='brochure/excelsior26-brochure.pdf';const r=await s.storage.from('excelsior-brochure').upload(path,raw,{contentType:'application/pdf',upsert:true,cacheControl:'3600'});if(r.error)throw r.error;
   const pub=s.storage.from('excelsior-brochure').getPublicUrl(path);await audit(ctx,'brochure_replaced',{name,path,size:raw.length,url:pub.data.publicUrl});return json(200,{ok:true,url:pub.data.publicUrl});
  }
  if(action==='qr_prepare'){
   const ids=Array.isArray(body.master_ids)?body.master_ids.map(String):[];if(!ids.length)return json(400,{ok:false,error:'No recipients selected'});
   const people=await s.from('master_registrations').select('master_id,full_name,email').in('id',ids);if(people.error)throw people.error;
   const out=[];for(const p of people.data||[]){let q=await s.from('qr_credentials').select('id,token,qr_status').eq('master_id',p.master_id).maybeSingle();if(q.error)throw q.error;if(!q.data){q=await s.from('qr_credentials').insert({master_id:p.master_id}).select('id,token,qr_status').single();if(q.error)throw q.error}out.push({...p,qr:q.data})}
   return json(200,{ok:true,data:out});
  }
  if(action==='qr_queue'){
   const recipients=Array.isArray(body.recipients)?body.recipients:[];if(!recipients.length)return json(400,{ok:false,error:'No recipients'});
   const rows=recipients.map(x=>({qr_credential_id:x.qr_credential_id||null,master_id:String(x.master_id),recipient_email:String(x.email),subject:String(body.subject||''),body_html:String(body.body_html||''),status:'approved',approved_at:new Date().toISOString(),approved_by:ctx.admin.email}));
   const r=await s.from('qr_gmail_queue').insert(rows).select('id,master_id,recipient_email,status');if(r.error)throw r.error;await audit(ctx,'qr_queue_created',{count:rows.length});return json(200,{ok:true,data:r.data});
  }
  if(action==='qr_validate'){
   const token=String(body.token||'').trim();if(!token)return json(400,{ok:false,error:'Token required'});
   const q=await s.from('qr_credentials').select('id,master_id,qr_status').eq('token',token).maybeSingle();if(q.error)throw q.error;
   let result='invalid',reason='QR credential not found';
   if(q.data&&q.data.qr_status==='active'){const used=await s.from('qr_verifications').select('id').eq('verification_id',token).maybeSingle();if(used.data){result='already-used';reason='This QR has already been verified.'}else{result='valid';reason='QR credential is valid.'}}
   const log=await s.from('qr_verifications').insert({verification_id:token,event_code:body.event_code||null,result,reason,verified_by:ctx.admin.email,verified_role:'admin',metadata:{master_id:q.data?.master_id||null}});if(log.error)throw log.error;
   await audit(ctx,'qr_validate',{result,master_id:q.data?.master_id||null});return json(200,{ok:true,result,reason,master_id:q.data?.master_id||null});
  }
  return json(400,{ok:false,error:'Unknown admin action'});
 }catch(e){return json(e.status||500,{ok:false,error:e.message||'Admin request failed'})}
};