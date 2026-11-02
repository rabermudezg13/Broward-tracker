(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Tracker=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const fields=[
 {key:'sanctions',label:'Sanctions',aliases:['Sanctions']},
 {key:'dnu',label:'DNU list',aliases:['SF/DNU list','SF/DNU','DNU list']},
 {key:'classsmart',label:'Kelly ClassSmart',aliases:['Kelly ClassSmart','Kelly ClassSmarts']},
 {key:'dt',label:'D & T',aliases:['D & T','D&T']},
 {key:'references',label:'References',aliases:['References']},
 {key:'i9',label:'I-9',aliases:['I-9']},
 {key:'education',label:'Education',aliases:['Education Requirement','Education']},
 {key:'fpcleared',label:'FP Cleared',aliases:['FP Cleared']},
 {key:'background',label:'Background',aliases:['Background Check','Background']},
 {key:'fpscreening',label:'FP Screening',aliases:['FP Screening']},
 {key:'orientation',label:'Orientation',aliases:['Orientation']},
 {key:'expiration',label:'FP Expiration from CH',aliases:['FP Expiration from CH','FP Expiration from ClearingHouse','FP Expiration']}
];
const meta={name:['Applicant Name','Talent Name','Name'],ksn:['KSN ID'],bullhorn:['Bullhorn ID'],phone:['Talent Phone','Phone'],email:['Talent Email','Email'],stage:['Current Onboarding Stage'],job:['Job Title'],notes:['Notes (All calls/email must be logged in KSN/BH)','Notes']};
function dateValue(v){
 if(v instanceof Date&&!isNaN(v))return new Date(Date.UTC(v.getFullYear(),v.getMonth(),v.getDate()));
 if(typeof v==='number'&&v>=20000&&v<=100000)return new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000);
 if(typeof v!=='string')return null;
 const s=v.trim();let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/),y,mo,d;
 if(m){y=+m[1];mo=+m[2];d=+m[3];}else{m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);if(!m)return null;mo=+m[1];d=+m[2];y=+m[3];if(y<100)y+=2000;}
 const dt=new Date(Date.UTC(y,mo-1,d));return y>=1950&&y<=2200&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?dt:null;
}
function display(v){const dt=dateValue(v);return dt?`${String(dt.getUTCMonth()+1).padStart(2,'0')}/${String(dt.getUTCDate()).padStart(2,'0')}/${dt.getUTCFullYear()}`:String(v??'').trim();}
function status(v,key,available=true,now=new Date()){
 if(!available)return{type:'unavailable',label:'No column'};
 const text=String(v??'').trim(),n=norm(text),dt=dateValue(v);
 if(key==='expiration'){
  if(!dt)return{type:'missing',label:text||'Missing date'};
  const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
  return{type:dt.getTime()<today?'expired':'complete',label:display(v)};
 }
 if(!text)return{type:'missing',label:'Blank'};
 if(['na','notapplicable'].includes(n))return{type:'complete',label:text};
 if(['complete','completed','approved','cleared','verified','done','yes'].includes(n))return{type:'complete',label:text};
 if(dt)return{type:key==='orientation'?'scheduled':'review',label:display(v)};
 if(['need','needed','missing','no','notcomplete','incomplete'].includes(n))return{type:'missing',label:text};
 if(['pending','requested','sent','scheduled','inprogress'].includes(n))return{type:'pending',label:text};
 return{type:'review',label:text};
}
function parseWorkbook(wb,XLSX){
 const sheets=[],ignored=[];
 for(const name of wb.SheetNames){
  if(['landingpage','dropdown','template'].includes(norm(name))){ignored.push(name);continue;}
  const ws=wb.Sheets[name];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true,blankrows:true});
  const hi=rows.slice(0,15).findIndex(r=>r.some(v=>norm(v)==='applicantname'));
  if(hi<0){ignored.push(name);continue;}
  const headers=rows[hi].map(norm),map={};
  for(const [key,aliases]of Object.entries(meta))map[key]=headers.findIndex(h=>aliases.some(a=>norm(a)===h));
  for(const f of fields)map[f.key]=headers.findIndex(h=>f.aliases.some(a=>norm(a)===h));
  const data=[];
  for(let i=hi+1;i<rows.length;i++){
   const row=rows[i],person=String(row[map.name]??'').trim();
   if(!person||['applicantname','total','totals'].includes(norm(person)))continue;
   const rec={id:`${name}:${i+1}`,sheet:name,row:i+1,values:{},available:{},sourceHeaders:{}};
   for(const key of Object.keys(meta))rec[key]=display(row[map[key]]);
   for(const f of fields){rec.values[f.key]=row[map[f.key]]??'';rec.available[f.key]=map[f.key]>=0;rec.sourceHeaders[f.key]=map[f.key]>=0?String(rows[hi][map[f.key]]):'';}
   data.push(rec);
  }
  sheets.push({name,records:data,missing:fields.filter(f=>map[f.key]<0).map(f=>f.label)});
 }
 return{sheets,ignored};
}
function select(records,{search='',stage='',requirement='all',mode='all'}={}){
 const q=search.trim().toLowerCase();return records.filter(r=>{
  if(q&&![r.name,r.ksn,r.bullhorn,r.phone,r.email].some(v=>String(v??'').toLowerCase().includes(q)))return false;
  if(stage&&r.stage!==stage)return false;
  if(requirement==='all')return true;
  const s=status(r.values[requirement],requirement,r.available[requirement]);
  if(mode==='all')return true;
  if(mode==='open')return!['complete','unavailable'].includes(s.type);
  return s.type===mode;
 });
}
function csv(records){
 const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
 const rows=[['Applicant Name','Sheet','Excel Row','KSN ID','Bullhorn ID','Phone','Email','Onboarding Stage',...fields.map(f=>f.label)],...records.map(r=>[r.name,r.sheet,r.row,r.ksn,r.bullhorn,r.phone,r.email,r.stage,...fields.map(f=>r.available[f.key]?display(r.values[f.key]):'[No column]')])];
 return'\uFEFF'+rows.map(r=>r.map(safe).join(',')).join('\r\n');
}
return{norm,fields,dateValue,display,status,parseWorkbook,select,csv};
});
