// Exam Builder screen, cover page screen, section instructions, My Papers, and admin user rendering.

function renderCoverPageSection(){
  const expanded=coverPageExpanded;
  return `<div class="exam-section cover-section${expanded?'':' cover-collapsed'}"><div class="exam-section-header" onclick="toggleCoverPage()"><div class="exam-section-title">Cover Page</div><button type="button" class="section-instr-toggle" onclick="event.stopPropagation();toggleCoverPage()" title="${expanded?'Hide':'Show'} cover page"><i class="ti ti-chevron-${expanded?'up':'down'}"></i></button></div><div class="cover-page-body"><div class="cover-page-grid">${coverEditorField('cover-approved-materials','approvedMaterials','Approved Materials','Approved materials...')}${coverEditorField('cover-materials-supplied','materialsSupplied','Materials Supplied','Materials supplied...')}${coverEditorField('cover-instructions','instructions','Instructions','Instructions...')}</div></div></div>`;
}
function syncInstrHTML(){document.querySelectorAll('[data-instr-key]').forEach(el=>{instrHTML[el.dataset.instrKey]=storedHtmlFrom(el)||DEFAULT_INSTR_HTML[el.dataset.instrKey]||'';});saveState();}
function examTypeMeta(type){return type==='mc'?{title:'Section A',label:'Multiple Choice Question',key:'mc'}:type==='tf'?{title:'Section B',label:'True or False',key:'tf'}:type==='sa'?{title:'Section C',label:'Short Answer',key:'sa'}:{title:'Section D',label:'Extended Response',key:'er'};}
function examQuestionPreview(q,index,startNumber=1){const multiple=q.type==='mc'&&q.template==='multiple',options=((q.type==='mc'&&!multiple)||q.type==='tf')?answerOptionsHtml(q):'',heading=multiple?'':`<div style="font-size:12px;font-weight:700;margin-bottom:5px;color:var(--color-text-primary)">Question ${startNumber} <span style="font-weight:400;color:var(--color-text-secondary)">(${q.marks} mark${q.marks!==1?'s':''})</span></div>`,key=`exam-${index}`;const collapsedActions=`<button class="icon-btn" type="button" onclick="event.stopPropagation();moveExamQuestion(${index},-1)" title="Move up"><i class="ti ti-arrow-up"></i></button><button class="icon-btn" type="button" onclick="event.stopPropagation();moveExamQuestion(${index},1)" title="Move down"><i class="ti ti-arrow-down"></i></button><button class="icon-btn" type="button" onclick="event.stopPropagation();removeFromExam(${index})" title="Remove" style="color:#A32D2D"><i class="ti ti-trash"></i></button>`;return`<div class="q-card${questionCardCollapsed(key)?' collapsed':''}">${collapseCardLine(q,key,startNumber,collapsedActions)}<div class="q-card-collapse-body" onclick="toggleQuestionCollapse('${key}')" style="cursor:pointer"><div class="q-card-top"><div style="flex:1">${heading}${questionContentHtml(q,startNumber)}${options}<div class="q-meta"><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.mainArea||'Mathematics')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.topic||'')}</span><span style="font-size:11px;color:var(--color-text-secondary)">Year ${esc(formatYearRange(q))}</span></div></div><div class="q-actions">${collapseButton(key)}<button class="icon-btn" onclick="event.stopPropagation();moveExamQuestion(${index},-1)" title="Move up"><i class="ti ti-arrow-up"></i></button><button class="icon-btn" onclick="event.stopPropagation();moveExamQuestion(${index},1)" title="Move down"><i class="ti ti-arrow-down"></i></button><button class="icon-btn" onclick="event.stopPropagation();removeFromExam(${index})" title="Remove" style="color:#A32D2D"><i class="ti ti-trash"></i></button></div></div></div></div>`;}
function instructionHtmlForDisplay(key,letter){return (instrHTML[key]||DEFAULT_INSTR_HTML[key]||'').replace(/Instructions for Section [A-D]/,`Instructions for Section ${letter}`);}
function toggleSectionInstructions(key){if(expandedSectionInstructions.has(key))expandedSectionInstructions.delete(key);else expandedSectionInstructions.add(key);renderExam();}
function renderSectionInstructionToggle(key,expanded){return`<button type="button" class="section-instr-toggle" onclick="event.stopPropagation();toggleSectionInstructions('${key}')" title="${expanded?'Hide':'Show'} section instructions"><i class="ti ti-chevron-${expanded?'up':'down'}"></i></button>`;}
function renderInstructionEditor(key,letter){return`<div class="instr-block"><div class="instr-block-inner"><div class="instr-editor-wrap"><div id="instr-${key}" class="instr-editable editable-text" contenteditable="true" data-instr-key="${key}" onfocus="setActiveEditor('instr-${key}')" onkeyup="syncInstrHTML();updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${instructionHtmlForDisplay(key,letter)}</div></div></div></div>`;}
function logicalQuestionCount(q){return q.type==='mc'&&q.template==='multiple'&&q.subQuestions?.length?q.subQuestions.length:1;}
function renderExam(){const el=document.getElementById('exam-sections');const summary=document.getElementById('exam-summary-line');const totalMarks=examQuestions.reduce((s,q)=>s+(Number(q.marks)||0),0),totalQuestions=examQuestions.reduce((s,q)=>s+logicalQuestionCount(q),0);if(summary)summary.textContent=`${totalQuestions} question${totalQuestions!==1?'s':''} - ${totalMarks} mark${totalMarks!==1?'s':''}`;if(!el)return;const coverHtml=renderCoverPageSection();if(!examQuestions.length){el.innerHTML=coverHtml+`<div class="empty-state"><i class="ti ti-clipboard-list"></i><div>No questions in this exam yet</div><div style="margin-top:6px;font-size:12px">Click Add Questions to build your paper</div></div>`;return;}const groups={mc:[],tf:[],sa:[],er:[]};examQuestions.forEach((q,index)=>{(groups[q.type]||groups.er).push({q,index});});const sectionHtml=['mc','tf','sa','er'].filter(k=>groups[k].length).map((k,sectionIndex)=>{const meta=examTypeMeta(k),letter=String.fromCharCode(65+sectionIndex),marks=groups[k].reduce((s,item)=>s+(Number(item.q.marks)||0),0);let nextNumber=1;const questionsHtml=groups[k].map(item=>{const start=nextNumber;nextNumber+=logicalQuestionCount(item.q);return examQuestionPreview(item.q,item.index,start);}).join('');const instrExpanded=expandedSectionInstructions.has(k);return`<div class="exam-section${instrExpanded?'':' instr-collapsed'}"><div class="exam-section-header" onclick="toggleSectionInstructions('${k}')"><div class="exam-section-title">SECTION ${letter} - ${meta.label} <span class="exam-section-marks">(${marks} mark${marks!==1?'s':''})</span></div><div class="section-header-actions"><button type="button" class="section-instr-toggle section-clear-btn" onclick="event.stopPropagation();clearExamSection('${k}')" title="Clear all ${meta.label} questions"><i class="ti ti-trash"></i></button>${renderSectionInstructionToggle(k,instrExpanded)}</div></div>${renderInstructionEditor(k,letter)}<div style="padding:12px 13px">${questionsHtml}</div></div>`;}).join('');el.innerHTML=coverHtml+sectionHtml;renderAllTextBoxKatex(el);}function clearExamSection(type){
  const labels={mc:'Multiple Choice',tf:'True or False',sa:'Short Answer',er:'Extended Response'};
  const before=examQuestions.length;
  examQuestions=examQuestions.filter(q=>q.type!==type);
  const removed=before-examQuestions.length;
  if(!removed){showToast('No '+(labels[type]||'section')+' questions to clear',true);return;}
  saveState();renderExam();showToast('Cleared '+removed+' '+(labels[type]||'section')+' question'+(removed===1?'':'s'));
}
function removeFromExam(index){examQuestions.splice(index,1);saveState();renderExam();showToast('Question removed');}
function moveExamQuestion(index,delta){const next=index+delta;if(next<0||next>=examQuestions.length)return;const item=examQuestions.splice(index,1)[0];examQuestions.splice(next,0,item);saveState();renderExam();}
function shuffledIndexes(count){const indexes=[...Array(count)].map((_,i)=>i);for(let i=indexes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indexes[i],indexes[j]]=[indexes[j],indexes[i]];}if(count>1&&indexes.every((value,index)=>value===index))indexes.push(indexes.shift());return indexes;}
function shuffleQuestionOptions(item,forceMc=false){if(!item)return item;const q=JSON.parse(JSON.stringify(item));if(!forceMc&&q.type!=='mc')return q;if(q.template==='multiple'&&q.subQuestions?.length){q.subQuestions=q.subQuestions.map(sq=>shuffleQuestionOptions(sq,true));return q;}const count=4,order=shuffledIndexes(count),oldCorrect=Number.isInteger(q.correct)?q.correct:0;q.options=order.map(i=>(q.options||[])[i]||'');q.optionsHtml=order.map(i=>(q.optionsHtml||[])[i]||'');if(q.optionImages)q.optionImages=order.map(i=>q.optionImages[i]||{data:'',name:''});if(q.optionTable?.rows)q.optionTable.rows=order.map(i=>q.optionTable.rows[i]||[]);q.correct=Math.max(0,order.indexOf(oldCorrect));if(q.optionTable)q.optionTable.correct=q.correct;return q;}
function shuffleExamOptions(){if(!examQuestions.some(q=>q.type==='mc')){showToast('No multiple-choice questions to shuffle',true);return;}examQuestions=examQuestions.map(shuffleQuestionOptions);saveState();renderExam();showToast('Multiple-choice options shuffled');}
function selectAllAddQQuestions(){
  const boxes=[...document.querySelectorAll('#addq-list input[id^="qa-"]')];
  if(!boxes.length){showToast('No questions to select',true);return;}
  boxes.forEach(cb=>cb.checked=true);
  showToast('Selected '+boxes.length+' question'+(boxes.length!==1?'s':''));
}
function confirmAddToExam(){
  syncInstrHTML();
  document.querySelectorAll('[id^="qa-"]').forEach(cb=>{
    if(cb.checked){
      const id=parseInt(cb.id.replace('qa-',''));
      const q=questions.find(x=>x.id===id);
      if(q&&!examQuestions.find(x=>x.id===id)){if(isTeacherRole()&&(q.bank||'private')!=='global')return;examQuestions.push(prepareQuestionForExam(q));}
    }
  });
  saveState();
  showView('builder');
}
function adminRoleOptions(selected){return ['admin','s_teacher','s_student','teacher','student','banned'].map(role=>`<option value="${role}"${role===selected?' selected':''}>${appRoleLabel(role)}</option>`).join('');}
async function loadAdminUsers(){
  const list=document.getElementById('admin-users-list');
  if(!list)return;
  if(currentRole!=='admin'){list.innerHTML=`<div class="empty-state"><i class="ti ti-lock"></i><div>Admin access only</div></div>`;return;}
  list.innerHTML=`<div class="empty-state"><i class="ti ti-loader"></i><div>Loading users...</div></div>`;
  try{
    const {data,error}=await supabaseClient.from('profiles').select('id,email,username,role').order('email',{ascending:true});
    if(error)throw error;
    adminUsers=data||[];
    renderAdminUsers();
  }catch(e){console.error('Could not load admin users:',e);list.innerHTML=`<div class="empty-state"><i class="ti ti-alert-circle"></i><div>Could not load users</div><div style="margin-top:6px;font-size:12px">Check the Supabase profiles policy for Admin access.</div></div>`;}
}
function renderAdminUsers(){
  const list=document.getElementById('admin-users-list');
  if(!list)return;
  if(!adminUsers.length){list.innerHTML=`<div class="empty-state"><i class="ti ti-users"></i><div>No profiles found</div></div>`;return;}
  list.innerHTML=adminUsers.map(u=>`<div class="paper-card"><div class="paper-icon"><i class="ti ti-user"></i></div><div class="paper-info"><div class="paper-title">${esc(u.email||'No email')}</div><div class="paper-meta">${u.username?esc(u.username)+' - ':''}${esc(u.id||'')}</div></div><div class="paper-actions"><select onchange="updateUserRole('${esc(u.id)}',this.value)" style="height:32px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:0 8px;background:#fff;font-size:12px;font-family:Arial,sans-serif">${adminRoleOptions(u.role||'teacher')}</select><button class="btn btn-sm" onclick="banAdminUser('${esc(u.id)}')" style="color:#A32D2D;border-color:#E7B4B4"><i class="ti ti-user-off"></i>Ban</button><button class="icon-btn" onclick="deleteAdminUserProfile('${esc(u.id)}')" title="Delete profile" style="color:#A32D2D"><i class="ti ti-trash"></i></button></div></div>`).join('');
}
async function updateUserRole(id,role){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  try{
    const {error}=await supabaseClient.from('profiles').update({role}).eq('id',id);
    if(error)throw error;
    adminUsers=adminUsers.map(u=>u.id===id?{...u,role}:u);
    showToast('User role updated');
  }catch(e){console.error('Could not update role:',e);showToast('Could not update user role',true);loadAdminUsers();}
}
async function banAdminUser(id){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  if(currentUser?.id===id){showToast('You cannot ban your own admin account',true);return;}
  if(!confirm('Ban this user from Brain Forge?'))return;
  try{
    const {error}=await supabaseClient.from('profiles').update({role:'banned'}).eq('id',id);
    if(error)throw error;
    adminUsers=adminUsers.map(u=>u.id===id?{...u,role:'banned'}:u);
    renderAdminUsers();
    showToast('User banned');
  }catch(e){console.error('Could not ban user:',e);showToast('Could not ban user',true);loadAdminUsers();}
}
async function deleteAdminUserProfile(id){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  if(currentUser?.id===id){showToast('You cannot delete your own admin profile',true);return;}
  if(!confirm('Delete this user profile from Brain Forge? This does not delete the Supabase Authentication account.'))return;
  try{
    const {error}=await supabaseClient.from('profiles').delete().eq('id',id);
    if(error)throw error;
    adminUsers=adminUsers.filter(u=>u.id!==id);
    renderAdminUsers();
    showToast('User profile deleted');
  }catch(e){console.error('Could not delete user profile:',e);showToast('Could not delete user profile',true);loadAdminUsers();}
}
function renderPapers(){const el=document.getElementById('papers-list');if(!el)return;const count=savedPapers.length;const body=count?savedPapers.map(p=>{const questions=Array.isArray(p.questions)?p.questions:[],questionCount=questions.length,total=p.marks||questions.reduce((s,q)=>s+(Number(q.marks)||0),0);return`<article class="paper-card"><div class="paper-icon"><i class="ti ti-file-text"></i></div><div class="paper-info"><div class="paper-title">${esc(p.title||'Untitled paper')}</div><div class="paper-meta"><span>${questionCount} question${questionCount!==1?'s':''}</span><span>${total} mark${total!==1?'s':''}</span>${p.savedAt?`<span>${esc(p.savedAt)}</span>`:''}</div></div><div class="paper-actions"><button type="button" class="paper-action" onclick="loadPaper(${p.id})"><i class="ti ti-edit"></i><span>Open</span></button><button type="button" class="paper-action" onclick="exportPaper(${p.id})"><i class="ti ti-download"></i><span>Export</span></button><button type="button" class="paper-action" onclick="exportPaperAnswers(${p.id})"><i class="ti ti-file-check"></i><span>Answers</span></button><button type="button" class="paper-action danger" onclick="deletePaper(${p.id})"><i class="ti ti-trash"></i><span>Delete</span></button></div></article>`;}).join(''):`<div class="papers-empty"><i class="ti ti-files"></i><h2>No saved papers yet</h2><p>Build an exam and click Save to keep it here.</p></div>`;el.innerHTML=`<div class="papers-root"><div class="papers-body"><main class="papers-wrap"><section class="papers-panel"><div class="papers-head"><h1>My Papers</h1><span class="papers-count">${count} ${count===1?'paper':'papers'}</span></div><div class="papers-list">${body}</div></section></main></div></div>`;}
function savePaper(){if(!examQuestions.length){showToast('No questions to save',true);return;}if(!canUseTeacherQuestionSet(examQuestions))return;syncInstrHTML();const title=document.getElementById('exam-title').value.trim()||'Untitled Exam';const existing=savedPapers.findIndex(p=>p.title===title);const paper={id:existing>=0?savedPapers[existing].id:Date.now(),title,examDetails:getExamDetails(),questions:[...examQuestions],coverPage:{...coverPage},instrHTML:{...instrHTML},savedAt:new Date().toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),marks:examQuestions.reduce((s,q)=>s+q.marks,0)};if(existing>=0)savedPapers[existing]=paper;else savedPapers.push(paper);saveState();showToast(existing>=0?'Paper updated!':'Paper saved!');}
function loadPaper(id){const p=savedPapers.find(x=>x.id===id);if(!p)return;examQuestions=[...p.questions].map(normalizeQuestion);if(p.instrHTML)Object.assign(instrHTML,p.instrHTML);if(p.coverPage)coverPage={...coverPage,...p.coverPage};document.getElementById('exam-title').value=p.title;applyExamDetails(p.examDetails||{});saveState();showView('builder');showToast('Paper loaded');}
function deletePaper(id){savedPapers=savedPapers.filter(p=>p.id!==id);saveState();renderPapers();showToast('Paper deleted');}
function showToast(msg,err){const existing=document.querySelector('.toast');if(existing)existing.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;t.style.background=err?'#A32D2D':'#534AB7';document.body.appendChild(t);setTimeout(()=>t.remove(),2500);}
