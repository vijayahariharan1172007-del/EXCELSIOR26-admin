import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { requireAdmin,audit } from './_admin.js';

export default async function handler(request){
  if(request.method!=='GET') return new Response('GET required',{status:405});
  try{
    const ctx=await requireAdmin(request,'owner');
    const raw=String(process.env.ADMIN_CREDENTIALS_JSON||'');
    const users=JSON.parse(raw);
    if(!Array.isArray(users)||users.length!==10) throw new Error('ADMIN_CREDENTIALS_JSON must contain the 10 generated operator credentials.');
    const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
    let page=doc.addPage([595,842]),y=790;
    page.drawText("EXCELSIOR'26 Admin Credentials",{x:40,y,size:20,font:bold,color:rgb(.1,.15,.25)});
    page.drawText('Private operator credential register',{x:40,y:y-26,size:10,font});
    y-=65;
    ['#','Username','Password','Role'].forEach((h,i)=>page.drawText(h,{x:[35,80,210,380][i],y,size:10,font:bold}));
    y-=20;
    users.forEach((u,i)=>{
      if(y<65){page=doc.addPage([595,842]);y=790;}
      page.drawText(String(i+1),{x:35,y,size:9,font});
      page.drawText(String(u.username),{x:80,y,size:9,font});
      page.drawText(String(u.password),{x:210,y,size:9,font});
      page.drawText(String(u.role||'admin'),{x:380,y,size:9,font});
      y-=22;
    });
    page.drawText('Keep this document private and rotate credentials if exposed.',{x:40,y:35,size:8,font});
    await audit(ctx,'admin_credentials_pdf_download',{count:users.length});
    const bytes=await doc.save();
    return new Response(bytes,{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="EXCELSIOR26_Admin_Credentials.pdf"','Cache-Control':'no-store'}});
  }catch(e){return new Response(e.message||'PDF generation failed',{status:e.status||500});}
}