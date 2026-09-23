import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { response,requireAdmin,audit } from './_admin.js';

const replaceAll=(text,values)=>String(text||'').replace(/\\{\\{(name|master_id|email)\\}\\}/g,(_,k)=>values[k]??'');

export default async function handler(request){
  if(request.method!=='POST') return response(405,{ok:false,error:'POST required'});
  try{
    const body=await request.json().catch(()=>({}));
    const ctx=await requireAdmin(request,'admin');
    const ids=Array.isArray(body.queue_ids)?body.queue_ids.map(String):[];
    if(!ids.length) return response(400,{ok:false,error:'No queue records selected'});
    const s=ctx.supabase;
    const settings=await s.from('system_settings').select('key,value_json').in('key',['gmail_sender','gmail_app_password']);
    if(settings.error) throw settings.error;
    const map=Object.fromEntries((settings.data||[]).map(x=>[x.key,x.value_json]));
    const sender=String(process.env.GMAIL_SENDER||map.gmail_sender?.email||map.gmail_sender||'').trim();
    const pass=String(process.env.GMAIL_APP_PASSWORD||map.gmail_app_password?.password||map.gmail_app_password||'').trim();
    if(!sender||!pass) throw new Error('Gmail sender credentials are not configured on the server.');
    const transporter=nodemailer.createTransport({service:'gmail',auth:{user:sender,pass}});
    const rows=await s.from('qr_gmail_queue').select('id,master_id,recipient_email,subject,body_html,qr_credential_id').in('id',ids);
    if(rows.error) throw rows.error;
    const results=[];
    for(const row of rows.data||[]){
      const person=await s.from('master_registrations').select('full_name,email').eq('master_id',row.master_id).maybeSingle();
      if(person.error) throw person.error;
      const name=person.data?.full_name||row.master_id,email=person.data?.email||row.recipient_email;
      const cred=await s.from('qr_credentials').select('token').eq('id',row.qr_credential_id).maybeSingle();
      if(cred.error) throw cred.error;
      const qr=await QRCode.toDataURL(JSON.stringify({master_id:row.master_id,token:cred.data?.token||''}),{width:320,margin:1});
      const html=replaceAll(row.body_html,{name,master_id:row.master_id,email});
      const cid=`excelsior-qr-${row.id}@excelsior26`;
      const mail=await transporter.sendMail({from:sender,to:email,subject:replaceAll(row.subject,{name,master_id:row.master_id,email}),html:`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${html}</div><p><img src="cid:${cid}" alt="Registration QR" width="320"></p>` ,attachments:[{filename:'excelsior26-qr.png',content:qr.split(',')[1],encoding:'base64',cid}]});
      await s.from('qr_gmail_queue').update({status:'sent',sent_at:new Date().toISOString(),error_message:null}).eq('id',row.id);
      await s.from('qr_credentials').update({last_sent_at:new Date().toISOString(),sent_count:(cred.data?.sent_count||0)+1}).eq('id',row.qr_credential_id);
      results.push({id:row.id,messageId:mail.messageId,status:'sent'});
    }
    await audit(ctx,'qr_email_sent',{count:results.length});
    return response(200,{ok:true,data:results});
  }catch(e){return response(e.status||500,{ok:false,error:e.message||'QR email failed'});}
}
