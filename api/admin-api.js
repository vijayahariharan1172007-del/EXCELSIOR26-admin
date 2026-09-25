import { response,identifyAdmin,audit,methodGuard } from './_admin.js';

export async function POST(request){
  const bad=methodGuard(request); if(bad) return bad;
  try{
    const body=await request.json().catch(()=>({}));
    const action=String(body.action||'');
    const ctx=await identifyAdmin(request,body.username);
    const s=ctx.supabase;
    if(action==='page_view'){
      await audit(ctx,'page_view',{page:body.page||null});
      return response(200,{ok:true,admin:ctx.admin});
    }
    if(!s) return response(503,{ok:false,error:'Supabase server connection is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Vercel project environment, then redeploy.'});
    await audit(ctx,'api_action',{action});

    if(action==='overview'){
      
      const names=['master_registrations','event_registrations','abstract_submissions','qr_verifications'];
      const counts=await Promise.all(names.map(t=>s.from(t).select('*',{count:'exact',head:true})));
      const events=await s.from('event_registrations').select('event,event_key,status,payment_status').limit(1000);
      return response(200,{ok:true,counts:counts.map(x=>x.count||0),events:events.data||[],admin:ctx.admin});
    }

    const reads={audit_logs:'admin_audit',admin_credentials:'admin_accounts',brochure_info:'site_content',master_list:'master_registrations',event_list:'event_registrations',abstract_list:'abstract_submissions',profiles:'master_registrations',admins:'admin_accounts',site_content:'site_content',event_config:'registration_portals',team_members:'event_team_members',qr_queue:'qr_gmail_queue',qr_logs:'qr_verifications'};
    if(action==='admin_credentials'){ return response(200,{ok:true,data:[{username:'exc26admin01',display_name:'Vijayahariharan',role:'owner'},{username:'exc26admin02',display_name:'Thangalakshmi',role:'admin'},{username:'exc26admin03',display_name:'Prabhanjani',role:'admin'},{username:'exc26admin04',display_name:'Arundhathi',role:'admin'},{username:'exc26admin05',display_name:'Sujay',role:'admin'},{username:'exc26admin06',display_name:'Sriraam',role:'admin'},{username:'exc26admin07',display_name:'Thejeswini',role:'admin'},{username:'exc26admin08',display_name:'Dr. Rajukumaran — Faculty',role:'admin'},{username:'exc26admin09',display_name:'Admin 09',role:'admin'},{username:'exc26admin10',display_name:'Admin 10',role:'admin'}]}); }
    if(action==='brochure_info'){ const url=s.storage.from('excelsior-brochure').getPublicUrl('brochure/excelsior26-brochure.pdf'); return response(200,{ok:true,url:url.data.publicUrl}); }
if(action==='payment_settings'){
      try{
        const r=await s.from('site_content').select('key,title,content,enabled,updated_at').eq('key','payment_settings').limit(1);
        if(r.error) throw r.error;
        return response(200,{ok:true,data:r.data?.[0]||{key:'payment_settings',title:'Payment Settings',content:JSON.stringify({upi_id:'',qr:''}),enabled:true}});
      }catch(e){
        console.error('payment_settings read failed:',e);
        return response(200,{ok:true,data:{key:'payment_settings',title:'Payment Settings',content:JSON.stringify({upi_id:'',qr:''}),enabled:true}});
      }
    }
    if(action==='payment_settings_update'){
      const upi=String(body.upi_id||'').trim();
      const qr=String(body.qr||'').trim();
      if(!/^[^\\s@]+@[^\\s@]+$/.test(upi)) return response(400,{ok:false,error:'Enter a valid UPI ID.'});
      if(!/^((https?:\\/\\/)|data:image\\/(png|jpeg|webp);base64,)/i.test(qr)) return response(400,{ok:false,error:'Payment QR must be an image URL or PNG/JPG/WebP image.'});
      if(qr.startsWith('data:')&&qr.length>1400000) return response(413,{ok:false,error:'QR image is too large. Keep it under 1 MB.'});
      const content=JSON.stringify({upi_id:upi,qr});
      const r=await s.from('site_content').upsert({
        key:'payment_settings',
        title:'Payment Settings',
        content,
        enabled:true,
        updated_at:new Date().toISOString()
      },{onConflict:'key'}).select('key,title,content,enabled,updated_at').single();
      if(r.error) throw r.error;
      await audit(ctx,'payment_settings_update',{upi_id:upi,qr_updated:true});
      return response(200,{ok:true,data:r.data});
    }
    if(reads[action]){
      const table=reads[action];
      let q=s.from(table).select('*').limit(1000);
      if(table!=='admin_accounts') q=q.order('created_at',{ascending:false});
      const r=await q; if(r.error) throw r.error;
      return response(200,{ok:true,data:r.data||[]});
    }

    if(action==='master_review'){
      const id=String(body.id),status=String(body.status);
      if(!['approved','rejected','pending'].includes(status)) return response(400,{ok:false,error:'Invalid registration status'});
      const patch={pre_registration_status:status,pre_approved_at:status==='pending'?null:new Date().toISOString(),pre_approved_by:status==='pending'?null:ctx.admin.email};
      const r=await s.from('master_registrations').update(patch).eq('id',id).select('id,master_id,pre_registration_status').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'master_review',{id,status,master_id:r.data?.master_id||null}); return response(200,{ok:true,data:r.data});
    }

    if(action==='event_review'){
      const id=String(body.id),status=String(body.status);
      if(!['approved','rejected','pending'].includes(status)) return response(400,{ok:false,error:'Invalid event status'});
      const patch={status,admin_reviewed_at:status==='pending'?null:new Date().toISOString(),admin_reviewed_by:status==='pending'?null:ctx.admin.email};
      const r=await s.from('event_registrations').update(patch).eq('id',id).select('id,status,event_key,master_id,event,team_id').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'event_review',{id,status,master_id:r.data?.master_id||null,event_key:r.data?.event_key||null,event:r.data?.event||null,team_id:r.data?.team_id||null}); return response(200,{ok:true,data:r.data});
    }

    if(action==='payment_review'){
      const id=String(body.id),status=String(body.status);
      if(!['approved','rejected','pending'].includes(status)) return response(400,{ok:false,error:'Invalid payment status'});
      const r=await s.from('event_registrations').update({payment_status:status,admin_reviewed_at:new Date().toISOString(),admin_reviewed_by:ctx.admin.email}).eq('id',id).select('id,payment_status,master_id,event_key,event,team_id').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'event_payment_review',{id,status,master_id:r.data?.master_id||null,event_key:r.data?.event_key||null,event:r.data?.event||null,team_id:r.data?.team_id||null}); return response(200,{ok:true,data:r.data});
    }

    if(action==='abstract_review'){
      const id=String(body.id),status=String(body.status);
      if(!['submitted','under_review','approved','rejected','resubmission_required'].includes(status)) return response(400,{ok:false,error:'Invalid abstract status'});
      const r=await s.from('abstract_submissions').update({status,reviewed_at:new Date().toISOString(),reviewed_by:ctx.admin.email,rejection_reason:body.reason||null,updated_at:new Date().toISOString()}).eq('id',id).select('id,status,master_id,event_key,event_title,title,team_id').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'abstract_review',{id,status,reason:body.reason||null,master_id:r.data?.master_id||null,event_key:r.data?.event_key||null,event_title:r.data?.event_title||null,title:r.data?.title||null,team_id:r.data?.team_id||null}); return response(200,{ok:true,data:r.data});
    }

    if(action==='abstract_download'){
      const id=String(body.id);
      if(!id) return response(400,{ok:false,error:'Abstract id required'});
      const row=await s.from('abstract_submissions').select('id,file_path,file_name,file_type,master_id,event_key').eq('id',id).maybeSingle();
      if(row.error) throw row.error;
      if(!row.data?.file_path) return response(404,{ok:false,error:'No abstract file is attached to this submission'});
      const bucket='abstract-submissions';
      const signed=await s.storage.from(bucket).createSignedUrl(row.data.file_path,300);
      if(signed.error) throw signed.error;
      await audit(ctx,'abstract_download',{id,file_name:row.data.file_name||null,master_id:row.data.master_id||null,event_key:row.data.event_key||null});
      return response(200,{ok:true,url:signed.data.signedUrl,file_name:row.data.file_name||'abstract'});
    }

    if(action==='content_update'){
      const key=String(body.key);
      const r=await s.from('site_content').update({title:String(body.title||''),content:String(body.content||''),updated_at:new Date().toISOString()}).eq('key',key).select('*').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'site_content_update',{key}); return response(200,{ok:true,data:r.data});
    }

    if(action==='event_config_update'){
      const key=String(body.key);
      const patch={title:body.title,subtitle:body.subtitle,fee:body.fee,qr:body.qr,note:body.note,description:body.description,fields:body.fields,team:body.team,enabled:body.enabled,requires_abstract:body.requires_abstract,updated_at:new Date().toISOString()};
      const r=await s.from('registration_portals').update(patch).eq('key',key).select('*').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'event_config_update',{key}); return response(200,{ok:true,data:r.data});
    }

    if(action==='admin_toggle'){
      const id=String(body.id);
      const r=await s.from('admin_accounts').update({enabled:!!body.enabled,updated_at:new Date().toISOString()}).eq('id',id).select('id,email,enabled').maybeSingle();
      if(r.error) throw r.error; await audit(ctx,'admin_toggle',{id,enabled:!!body.enabled}); return response(200,{ok:true,data:r.data});
    }

    if(action==='admin_create'){
      const email=String(body.email||'').trim().toLowerCase(),display=String(body.display_name||'').trim();
      if(!email.includes('@')||!email.includes('.')||!display) return response(400,{ok:false,error:'Valid email and display name are required'});
      const enabled=await s.from('admin_accounts').select('id',{count:'exact',head:true}).eq('enabled',true);
      if((enabled.count||0)>=10) return response(409,{ok:false,error:'Maximum of 10 enabled admins reached'});
      const ins=await s.from('admin_accounts').insert({email,display_name:display,enabled:true,created_by:ctx.admin.email}).select('id,email,display_name,enabled').single();
      if(ins.error) throw ins.error;
      await audit(ctx,'admin_create',{email,display_name:display}); return response(200,{ok:true,data:ins.data});
    }

    if(action==='brochure_upload'){
      const dataUrl=String(body.data_url||''); const name=String(body.name||'brochure.pdf');
      if(!dataUrl.startsWith('data:application/pdf;base64,')) return response(400,{ok:false,error:'Only PDF files are accepted'});
      const raw=Buffer.from(dataUrl.split(',')[1],'base64'); if(raw.length>50*1024*1024) return response(413,{ok:false,error:'Brochure exceeds the 50 MB limit'});
      const path='brochure/excelsior26-brochure.pdf';
      const r=await s.storage.from('excelsior-brochure').upload(path,raw,{contentType:'application/pdf',upsert:true,cacheControl:'3600'});
      if(r.error) throw r.error;
      const pub=s.storage.from('excelsior-brochure').getPublicUrl(path);
      await audit(ctx,'brochure_replaced',{name,path,size:raw.length,url:pub.data.publicUrl});
      return response(200,{ok:true,url:pub.data.publicUrl});
    }

    if(action==='qr_prepare'){
      const ids=Array.isArray(body.master_ids)?body.master_ids.map(String):[];
      if(!ids.length) return response(400,{ok:false,error:'No recipients selected'});
      const people=await s.from('master_registrations').select('id,master_id,full_name,email,pre_registration_status,pre_payment_status').in('id',ids);
      if(people.error) throw people.error;
      const out=[];
      for(const p of people.data||[]){
        let q=await s.from('qr_credentials').select('id,token,qr_status').eq('master_id',p.master_id).maybeSingle();
        if(q.error) throw q.error;
        if(!q.data){q=await s.from('qr_credentials').insert({master_id:p.master_id}).select('id,token,qr_status').single(); if(q.error) throw q.error;}
        out.push({...p,qr:q.data});
      }
      return response(200,{ok:true,data:out});
    }

    if(action==='qr_queue'){
      const recipients=Array.isArray(body.recipients)?body.recipients:[]; if(!recipients.length) return response(400,{ok:false,error:'No recipients'});
      const rows=recipients.map(x=>({qr_credential_id:x.qr_credential_id||null,master_id:String(x.master_id),recipient_email:String(x.email),subject:String(body.subject||''),body_html:String(body.body_html||''),status:'approved',approved_at:new Date().toISOString(),approved_by:ctx.admin.email}));
      const r=await s.from('qr_gmail_queue').insert(rows).select('id,master_id,recipient_email,status'); if(r.error) throw r.error;
      await audit(ctx,'qr_queue_created',{count:rows.length}); return response(200,{ok:true,data:r.data});
    }

    if(action==='qr_validate'){
      const token=String(body.token||'').trim(); if(!token) return response(400,{ok:false,error:'Token required'});
      const q=await s.from('qr_credentials').select('id,master_id,qr_status').eq('token',token).maybeSingle();
      if(q.error) throw q.error;
      let result='invalid',reason='QR credential not found';
      if(q.data&&q.data.qr_status==='active'){
        const used=await s.from('qr_verifications').select('id').eq('verification_id',token).maybeSingle();
        if(used.data){result='already-used';reason='This QR has already been verified.'}else{result='valid';reason='QR credential is valid.'}
      }
      const log=await s.from('qr_verifications').insert({verification_id:token,event_code:body.event_code||null,result,reason,verified_by:ctx.admin.email,verified_role:'admin',metadata:{master_id:q.data?.master_id||null}});
      if(log.error) throw log.error;
      await audit(ctx,'qr_validate',{result,master_id:q.data?.master_id||null});
      return response(200,{ok:true,result,reason,master_id:q.data?.master_id||null});
    }

    return response(400,{ok:false,error:'Unknown admin action'});
  }catch(e){
    return response(e.status||500,{ok:false,error:e.message||'Admin request failed'});
  }
}
