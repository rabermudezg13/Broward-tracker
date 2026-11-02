'use strict';
const $=id=>document.getElementById(id),T=Tracker;
const state={sheets:[],selected:new Set(),page:1,filtered:[],filename:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge=(value,key,available)=>{const s=T.status(value,key,available);return`<span class="badge ${s.type}" title="${esc(T.display(value)||s.label)}">${esc(s.label)}</span>`;};
function records(){return state.sheets.filter(s=>state.selected.has(s.name)).flatMap(s=>s.records);}
function filters(){return{search:$('search').value,stage:$('stage').value,requirement:$('requirement').value,mode:$('mode').value};}
function setFilter(requirement,mode){$('requirement').value=requirement;$('mode').value=mode;state.page=1;render();$('list-title').scrollIntoView({behavior:'smooth',block:'start'});}
function reset(){for(const id of ['search','stage'])$(id).value='';$('requirement').value='all';$('mode').value='all';state.page=1;render();}
function load(parsed,filename){
 if(!parsed.sheets.length)throw Error('No applicant worksheets found. The workbook must contain an Applicant Name header within the first 15 rows.');
 state.sheets=parsed.sheets;state.filename=filename;
 const defaults=parsed.sheets.filter(s=>['kim','casey','pamela'].includes(s.name.toLowerCase()));
 state.selected=new Set((defaults.length?defaults:parsed.sheets.filter(s=>s.records.length)).map(s=>s.name));
 $('filename').textContent=filename;$('source-info').textContent=`${parsed.sheets.length} applicant worksheets detected`;
 $('sheets').replaceChildren();
 for(const s of parsed.sheets){const label=document.createElement('label');label.className='sheet-item';const cb=document.createElement('input');cb.type='checkbox';cb.checked=state.selected.has(s.name);cb.addEventListener('change',()=>{if(cb.checked)state.selected.add(s.name);else state.selected.delete(s.name);refreshStages();state.page=1;render();});label.append(cb,document.createTextNode(s.name+' '));const small=document.createElement('small');small.textContent=s.records.length;label.append(small);$('sheets').append(label);}
 $('workspace').hidden=false;$('welcome').hidden=true;$('upload-label').textContent='Replace Excel';$('message').textContent='';refreshStages();reset();
}
function refreshStages(){const value=$('stage').value;$('stage').replaceChildren(new Option('All stages',''));for(const s of [...new Set(records().map(r=>r.stage).filter(Boolean))].sort())$('stage').add(new Option(s,s));if([...$('stage').options].some(o=>o.value===value))$('stage').value=value;}
function render(){
 const all=records(),f=filters();state.filtered=T.select(all,f);const missing=all.filter(r=>T.status(r.values.expiration,'expiration',r.available.expiration).type==='missing').length;
 $('total').textContent=all.length;$('missing-total').textContent=missing;$('expired-total').textContent=all.filter(r=>T.status(r.values.expiration,'expiration',r.available.expiration).type==='expired').length;$('orientation-total').textContent=all.filter(r=>T.status(r.values.orientation,'orientation',r.available.orientation).type==='complete').length;
 const schema=state.sheets.filter(s=>state.selected.has(s.name)&&s.missing.length).map(s=>`${s.name}: ${s.missing.join(', ')}`);
 $('schema-note').textContent=schema.length?'Columns not available — '+schema.join(' · '):'All requested columns detected. FP Expiration aliases are included; exact headers appear in applicant details.';
 $('cards').innerHTML=T.fields.map(field=>{const ss=all.map(r=>T.status(r.values[field.key],field.key,r.available[field.key]));const available=ss.filter(s=>s.type!=='unavailable').length,done=ss.filter(s=>s.type==='complete').length,open=ss.filter(s=>!['complete','unavailable'].includes(s.type)).length;return`<button class="requirement-card ${f.requirement===field.key?'active':''}" data-key="${field.key}" aria-pressed="${f.requirement===field.key}"><strong>${esc(field.label)}</strong><span class="number">${open}</span><small>${field.key==='expiration'?'missing or expired':'outstanding'} · ${done}/${available} satisfied</small><div class="bar"><span style="width:${available?done/available*100:0}%"></span></div></button>`;}).join('');
 for(const b of $('cards').querySelectorAll('button'))b.addEventListener('click',()=>setFilter(b.dataset.key,'open'));
 const field=T.fields.find(x=>x.key===f.requirement),modeText=$('mode').selectedOptions[0].textContent;
 $('list-title').textContent=field?`${field.label} · ${modeText}`:'All applicants';$('mode').disabled=!field;
 $('count').textContent=`${state.filtered.length} of ${all.length} records · ${state.selected.size} worksheets`;
 const columns=field?[field]:T.fields;
 $('thead').innerHTML='<tr><th>Applicant</th><th>Worksheet</th><th>Onboarding stage</th>'+columns.map(x=>`<th>${esc(x.label)}</th>`).join('')+'</tr>';
 const pages=Math.max(1,Math.ceil(state.filtered.length/40));state.page=Math.min(state.page,pages);const pageRows=state.filtered.slice((state.page-1)*40,state.page*40);
 $('tbody').innerHTML=pageRows.length?pageRows.map(r=>`<tr><td><button class="person" data-id="${esc(r.id)}">${esc(r.name)}</button><small>${esc(r.ksn?'KSN '+r.ksn:r.bullhorn?'BH '+r.bullhorn:'Row '+r.row)}</small></td><td>${esc(r.sheet)}<small>Excel row ${r.row}</small></td><td>${esc(r.stage||'—')}</td>${columns.map(x=>`<td>${badge(r.values[x.key],x.key,r.available[x.key])}</td>`).join('')}</tr>`).join(''):`<tr><td class="empty" colspan="${columns.length+3}">${all.length?'No applicants match these filters.':'Select a worksheet to view applicants.'}</td></tr>`;
 for(const b of $('tbody').querySelectorAll('button'))b.addEventListener('click',()=>openDetail(all.find(r=>r.id===b.dataset.id)));
 $('page').textContent=`Page ${state.page} of ${pages}`;$('prev').disabled=state.page===1;$('next').disabled=state.page===pages;$('export').disabled=!state.filtered.length;
}
function openDetail(r){
 $('detail-name').textContent=r.name;$('detail-source').textContent=`${r.sheet} / Excel row ${r.row}`;
 $('detail-content').innerHTML='<div class="detail-meta">'+[['KSN ID',r.ksn],['Bullhorn ID',r.bullhorn],['Phone',r.phone],['Email',r.email],['Stage',r.stage],['Job title',r.job]].map(([k,v])=>`<p><small>${k}</small>${esc(v||'—')}</p>`).join('')+'</div>'+T.fields.map(f=>`<div class="detail-row"><div>${esc(f.label)}<small>Excel column: ${esc(r.sourceHeaders[f.key]||'not available')}</small></div><div>${badge(r.values[f.key],f.key,r.available[f.key])}</div></div>`).join('')+'<h3>Source notes</h3><p class="note">'+esc(r.notes||'No notes')+'</p>';
 $('detail').showModal();
}
async function importFile(file){if(!file)return;try{
 if(!/\.xlsx?$/i.test(file.name))throw Error('Choose an .xlsx or .xls workbook.');
 if(file.size>40*1024*1024)throw Error('This file is larger than 40 MB. Please use a smaller tracker workbook.');
 if(typeof XLSX==='undefined')throw Error('The Excel reader could not load. Refresh the page and try again.');
 $('message').textContent='Reading workbook…';await new Promise(r=>setTimeout(r,30));
 const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});load(T.parseWorkbook(wb,XLSX),file.name);
 }catch(e){$('message').textContent=e.message||'The workbook could not be opened.';}finally{$('file').value='';}}
$('file').addEventListener('change',e=>importFile(e.target.files[0]));
const drop=$('drop');for(const event of ['dragover','dragenter'])drop.addEventListener(event,e=>{e.preventDefault();drop.classList.add('drag');});drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag');importFile(e.dataTransfer.files[0]);});
for(const f of T.fields)$('requirement').add(new Option(f.label,f.key));
for(const id of ['search','stage','requirement','mode'])$(id).addEventListener(id==='search'?'input':'change',()=>{if(id==='requirement')$('mode').value=$('requirement').value==='all'?'all':'open';state.page=1;render();});
$('stat-all').onclick=reset;$('stat-missing').onclick=()=>setFilter('expiration','missing');$('stat-expired').onclick=()=>setFilter('expiration','expired');$('reset').onclick=reset;
$('prev').onclick=()=>{state.page--;render();};$('next').onclick=()=>{state.page++;render();};$('close-detail').onclick=()=>$('detail').close();
$('clear').onclick=()=>{state.sheets=[];state.selected.clear();state.filtered=[];$('workspace').hidden=true;$('welcome').hidden=false;$('upload-label').textContent='Open tracker Excel';$('filename').textContent='';$('sheets').replaceChildren();$('cards').replaceChildren();$('tbody').replaceChildren();$('detail-content').replaceChildren();$('detail-name').textContent='';$('detail-source').textContent='';$('message').textContent='';};
$('export').onclick=()=>{const blob=new Blob([T.csv(state.filtered)],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Broward_Tracker_'+(filters().requirement==='all'?'applicants':filters().requirement)+'_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('demo').onclick=()=>{
 const headers=['Applicant Name','KSN ID','Current Onboarding Stage',...T.fields.map(f=>f.aliases[0])];
 const rows=[headers,...Array.from({length:18},(_,i)=>[`Sample Applicant ${String(i+1).padStart(2,'0')}`,'DEMO-'+(i+1),['Collecting Documents','Ready for Orientation','Background Pending'][i%3],...T.fields.map((f,j)=>f.key==='expiration'?(i%3===0?'':i%3===1?'12/31/2028':'Not in ch'):f.key==='orientation'?(i%4===0?'Complete':i%4===1?'12/15/2026':'Requested'):(i+j)%5===0?'Need':(i+j)%4===0?'Requested':'Complete')])];
 const workbook={SheetNames:['Sample Team'],Sheets:{'Sample Team':XLSX.utils.aoa_to_sheet(rows)}};
 load(T.parseWorkbook(workbook,XLSX),'Sample data — fictional applicants');$('message').textContent='Sample data only. Open your Excel file to work with real applicant records.';
};
