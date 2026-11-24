// Exam Builder screen, cover page screen, section instructions, My Papers, and admin user rendering.

function renderCoverPageSection(){
  const expanded=coverPageExpanded;
  return `<div class="exam-section cover-section${expanded?'':' cover-collapsed'}"><div class="exam-section-header" onclick="toggleCoverPage()"><div class="exam-section-title">Cover Page</div><button type="button" class="section-instr-toggle" onclick="event.stopPropagation();toggleCoverPage()" title="${expanded?'Hide':'Show'} cover page"><i class="ti ti-chevron-${expanded?'up':'down'}"></i></button></div><div class="cover-page-body"><div class="cover-page-grid">${coverEditorField('cover-approved-materials','approvedMaterials','Approved Materials','Approved materials...')}${coverEditorField('cover-materials-supplied','materialsSupplied','Materials Supplied','Materials supplied...')}${coverEditorField('cover-instructions','instructions','Instructions','Instructions...')}</div></div></div>`;
}
function autoSaveExamTextEdits(){
  const title=(document.getElementById('exam-title')?.value||'Untitled Exam').trim()||'Untitled Exam';
  const paper=savedPapers.find(item=>item.title===title);
  if(paper&&!paper._metadataOnly){paper.coverPage={...coverPage};paper.instrHTML={...instrHTML};paper.examDetails=getExamDetails();queueExamPaperSupabaseSave(paper);}
  if(typeof rememberCurrentExamTextDefaults==='function')rememberCurrentExamTextDefaults();
  saveState();
}
function syncInstrHTML(){document.querySelectorAll('[data-instr-key]').forEach(el=>{instrHTML[el.dataset.instrKey]=storedHtmlFrom(el);});autoSaveExamTextEdits();}
function examTypeMeta(type){return type==='mc'?{title:'Section A',label:'Multiple Choice Question',key:'mc'}:type==='tf'?{title:'Section B',label:'True or False',key:'tf'}:type==='sa'?{title:'Section C',label:'Short Answer',key:'sa'}:{title:'Section D',label:'Extended Response',key:'er'};}
function examQuestionPreview(q,index,startNumber=1){const multiple=q.type==='mc'&&q.template==='multiple',options=((q.type==='mc'&&!multiple)||q.type==='tf')?answerOptionsHtml(q):'',heading=multiple?'':`<div style="font-size:12px;font-weight:700;margin-bottom:5px;color:var(--color-text-primary)">Question ${startNumber} <span style="font-weight:400;color:var(--color-text-secondary)">(${q.marks} mark${q.marks!==1?'s':''})</span></div>`,body=(q.type==='sa'||q.type==='er')?examSaerFullHtml(q,startNumber):`${heading}${questionContentHtml(q,startNumber)}${options}`,key=`exam-${index}`;const collapsedActions=`<button class="icon-btn" type="button" onclick="event.stopPropagation();moveExamQuestion(${index},-1)" title="Move up"><i class="ti ti-arrow-up"></i></button><button class="icon-btn" type="button" onclick="event.stopPropagation();moveExamQuestion(${index},1)" title="Move down"><i class="ti ti-arrow-down"></i></button><button class="icon-btn" type="button" onclick="event.stopPropagation();removeFromExam(${index})" title="Remove" style="color:#A32D2D"><i class="ti ti-trash"></i></button>`;return`<div class="q-card${questionCardCollapsed(key)?' collapsed':''}">${collapseCardLine(q,key,startNumber,collapsedActions)}<div class="q-card-collapse-body" onclick="toggleQuestionCollapse('${key}')" style="cursor:pointer"><div class="q-card-top"><div style="flex:1">${body}<div class="q-meta"><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.mainArea||'Mathematics')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.topic||'')}</span><span style="font-size:11px;color:var(--color-text-secondary)">Year ${esc(formatYearRange(q))}</span></div></div><div class="q-actions">${collapseButton(key)}<button class="icon-btn" onclick="event.stopPropagation();moveExamQuestion(${index},-1)" title="Move up"><i class="ti ti-arrow-up"></i></button><button class="icon-btn" onclick="event.stopPropagation();moveExamQuestion(${index},1)" title="Move down"><i class="ti ti-arrow-down"></i></button><button class="icon-btn" onclick="event.stopPropagation();removeFromExam(${index})" title="Remove" style="color:#A32D2D"><i class="ti ti-trash"></i></button></div></div></div></div>`;}
function instructionHtmlForDisplay(key,letter){return (instrHTML[key]||DEFAULT_INSTR_HTML[key]||'').replace(/Instructions for Section [A-D]/,`Instructions for Section ${letter}`);}
function toggleSectionInstructions(key){if(expandedSectionInstructions.has(key))expandedSectionInstructions.delete(key);else expandedSectionInstructions.add(key);renderExam();}
function renderSectionInstructionToggle(key,expanded){return`<button type="button" class="section-instr-toggle" onclick="event.stopPropagation();toggleSectionInstructions('${key}')" title="${expanded?'Hide':'Show'} section instructions"><i class="ti ti-chevron-${expanded?'up':'down'}"></i></button>`;}
function renderInstructionEditor(key,letter){return`<div class="instr-block"><div class="instr-block-inner"><div class="instr-editor-wrap"><div id="instr-${key}" class="instr-editable editable-text" contenteditable="true" data-instr-key="${key}" onfocus="setActiveEditor('instr-${key}')" oninput="syncInstrHTML()" onblur="syncInstrHTML()" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${instructionHtmlForDisplay(key,letter)}</div></div></div></div>`;}
function logicalQuestionCount(q){return q.type==='mc'&&q.template==='multiple'&&q.subQuestions?.length?q.subQuestions.length:1;}
function examSectionMarks(type){return examQuestions.filter(question=>(question.type||'er')===type).reduce((sum,question)=>sum+(Number(question.marks)||0),0);}
function examSectionMarkLimit(type){
  if(typeof isAdminRole==='function'&&isAdminRole())return 0;
  return Math.max(0,Math.floor(Number(TEACHER_EXAM_SECTION_MARK_LIMITS?.[type])||0));
}
function canAddExamQuestionWithinSectionLimit(question,notify=false,pendingMarks=0){
  const type=question?.type||'er',limit=examSectionMarkLimit(type);
  if(!limit)return true;
  const added=Math.max(0,Number(question?.marks)||0),current=examSectionMarks(type)+Math.max(0,Number(pendingMarks)||0);
  if(current+added<=limit)return true;
  if(notify)showToast('This section has reached its question limit.',true);
  return false;
}
function setExamSectionMarkLimit(type,value,rerender=true){
  if(typeof isAdminRole==='function'&&!isAdminRole())return;
  const limit=Math.max(0,Math.floor(Number(value)||0));
  examSectionMarkLimits={...(examSectionMarkLimits||{})};
  if(limit)examSectionMarkLimits[type]=limit;else delete examSectionMarkLimits[type];
  if(typeof persistExamSectionMarkLimits==='function')persistExamSectionMarkLimits();
  if(typeof queueExamSectionMarkLimitsSupabaseSave==='function')queueExamSectionMarkLimitsSupabaseSave();
  autoSaveExamTextEdits();
  if(rerender)renderExam();
}
function renderExamSectionLimit(type,marks){
  return '';
}
function renderExamEditorView(){const el=document.getElementById('exam-sections');const summary=document.getElementById('exam-summary-line');const totalMarks=examQuestions.reduce((s,q)=>s+(Number(q.marks)||0),0),totalQuestions=examQuestions.reduce((s,q)=>s+logicalQuestionCount(q),0);if(summary)summary.textContent=`${totalQuestions} question${totalQuestions!==1?'s':''} - ${totalMarks} mark${totalMarks!==1?'s':''}`;if(!el)return;const coverHtml=renderCoverPageSection();if(!examQuestions.length){el.innerHTML=coverHtml+`<div class="empty-state"><i class="ti ti-clipboard-list"></i><div>No questions in this exam yet</div><div style="margin-top:6px;font-size:12px">Click Add Questions to build your paper</div></div>`;return;}const groups={mc:[],tf:[],sa:[],er:[]};examQuestions.forEach((q,index)=>{(groups[q.type]||groups.er).push({q,index});});const sectionHtml=['mc','tf','sa','er'].filter(k=>groups[k].length).map((k,sectionIndex)=>{const meta=examTypeMeta(k),letter=String.fromCharCode(65+sectionIndex),marks=groups[k].reduce((s,item)=>s+(Number(item.q.marks)||0),0);let nextNumber=1;const questionsHtml=groups[k].map(item=>{const start=nextNumber;nextNumber+=logicalQuestionCount(item.q);return examQuestionPreview(item.q,item.index,start);}).join('');const instrExpanded=expandedSectionInstructions.has(k);return`<div class="exam-section${instrExpanded?'':' instr-collapsed'}"><div class="exam-section-header" onclick="toggleSectionInstructions('${k}')"><div class="exam-section-title">SECTION ${letter} - ${meta.label} <span class="exam-section-marks">(${marks} mark${marks!==1?'s':''})</span></div>${renderExamSectionLimit(k,marks)}<div class="section-header-actions"><button type="button" class="section-instr-toggle section-clear-btn" onclick="event.stopPropagation();clearExamSection('${k}')" title="Clear all ${meta.label} questions"><i class="ti ti-trash"></i></button>${renderSectionInstructionToggle(k,instrExpanded)}</div></div>${renderInstructionEditor(k,letter)}<div style="padding:12px 13px">${questionsHtml}</div></div>`;}).join('');el.innerHTML=coverHtml+sectionHtml;renderAllTextBoxKatex(el);waitForExamEditorImages(el);}function clearExamSection(type){
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
async function confirmAddToExam(){
  syncInstrHTML();
  const selectedIds=[...document.querySelectorAll('#addq-list input[id^="qa-"]:checked')].map(cb=>parseInt(cb.id.replace('qa-',''),10)).filter(Number.isFinite);
  if(!selectedIds.length){showToast('Select at least one question',true);return;}
  const source=typeof addQuestionSource==='function'?addQuestionSource():questions;
  const selected=selectedIds.map(id=>source.find(item=>item.id===id)).filter(Boolean).filter(item=>!isTeacherRole()||(item.bank||'private')==='global');
  if(!selected.length){showToast('No permitted questions selected',true);return;}
  setAddQuestionsLoading(true,'Adding Selected Questions','Loading full question content and images...');
  try{
    const loaded=await loadFullAddQuestions(selected),blocked=[];
    loaded.forEach(question=>{
      if(examQuestions.some(item=>(question.supabaseId&&item.supabaseId===question.supabaseId)||item.id===question.id))return;
      const prepared=prepareQuestionForExam(question);
      if(!canAddExamQuestionWithinSectionLimit(prepared,false)){blocked.push(prepared);return;}
      examQuestions.push(prepared);
    });
    saveState();
    setAddQuestionsLoading(false);
    showView('builder');
    if(blocked.length)showToast(`${blocked.length} question${blocked.length===1?' was':'s were'} not added because a section limit was reached.`,true);
  }catch(error){
    console.error('Could not load selected questions:',error);
    setAddQuestionsLoading(false);
    renderAddQList();
    showToast('Could not load the selected questions',true);
  }
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
function examPaperId(value){return String(value??'');}
function findSavedPaper(id){const key=examPaperId(id);return savedPapers.find(item=>examPaperId(item.id)===key);}
function isSupabaseExamPaperId(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(examPaperId(value));}
function paperSavedTime(paper){const numeric=Number(paper?.savedAtMs);if(Number.isFinite(numeric)&&numeric>0)return numeric;const parsed=Date.parse(String(paper?.updatedAt||paper?.savedAt||''));return Number.isFinite(parsed)?parsed:(Number(paper?.id)||0);}
const EXAM_PAPER_LIST_FIELDS='id,user_id,title,total_marks,created_at,updated_at,question_count:exam_details->>__paperQuestionCount';
function examPaperQuestionCount(paper){
  const raw=paper?.questionCount??paper?.examDetails?.__paperQuestionCount;
  const stored=raw==null||raw===''?NaN:Number(raw);
  if(Number.isFinite(stored)&&stored>=0)return stored;
  return Array.isArray(paper?.questions)?paper.questions.length:null;
}
function examPaperFromSupabaseRow(row){
  const updatedAt=row.updated_at||row.created_at||new Date().toISOString(),savedAtMs=Date.parse(updatedAt)||Date.now();
  const questions=Array.isArray(row.questions)?row.questions:[];
  return{id:row.id,cloudId:row.id,userId:row.user_id,title:row.title||'Untitled paper',examDetails:row.exam_details||{},questions,questionCount:questions.length,coverPage:row.cover_page||{},instrHTML:row.section_instructions||{},pageBreaks:Array.isArray(row.page_breaks)?row.page_breaks:[],marks:Number(row.total_marks)||0,savedAtMs,updatedAt,savedAt:new Date(savedAtMs).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),_metadataOnly:false};
}
function examPaperMetadataFromSupabaseRow(row,cached){
  const updatedAt=row.updated_at||row.created_at||new Date().toISOString(),savedAtMs=Date.parse(updatedAt)||Date.now();
  const stored=row.question_count==null||row.question_count===''?NaN:Number(row.question_count),cachedCount=examPaperQuestionCount(cached);
  const questionCount=Number.isFinite(stored)&&stored>=0?stored:cachedCount;
  return{id:row.id,cloudId:row.id,userId:row.user_id,title:row.title||'Untitled paper',examDetails:{__paperQuestionCount:questionCount},questionCount,marks:Number(row.total_marks)||0,savedAtMs,updatedAt,savedAt:new Date(savedAtMs).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),_metadataOnly:true};
}
function examPaperSupabaseRow(paper){
  const questions=Array.isArray(paper.questions)?paper.questions:[],examDetails={...(paper.examDetails||{}),__paperQuestionCount:questions.length};
  return{user_id:currentUser.id,title:String(paper.title||'Untitled paper').trim()||'Untitled paper',exam_details:examDetails,questions,cover_page:paper.coverPage||{},section_instructions:paper.instrHTML||{},page_breaks:Array.isArray(paper.pageBreaks)?paper.pageBreaks:[],total_marks:Number(paper.marks)||0};
}
async function saveExamPaperToSupabase(paper,options={}){
  if(!supabaseClient||!currentUser?.id)throw new Error('Supabase sign-in is not available.');
  const localId=examPaperId(paper.id),row=examPaperSupabaseRow(paper),forceInsert=options.forceInsert===true||paper._forceInsert===true;
  let cloudId=forceInsert?'':(paper.cloudId||(isSupabaseExamPaperId(paper.id)?paper.id:''));
  if(!cloudId&&!forceInsert){
    const {data:existing,error:lookupError}=await supabaseClient.from('exam_papers').select('id,title').eq('user_id',currentUser.id);
    if(lookupError)throw lookupError;
    cloudId=(existing||[]).find(item=>String(item.title||'').trim().toLowerCase()===row.title.toLowerCase())?.id||'';
  }
  const result=cloudId
    ?await supabaseClient.from('exam_papers').update(row).eq('id',cloudId).eq('user_id',currentUser.id).select().single()
    :await supabaseClient.from('exam_papers').insert(row).select().single();
  if(result.error)throw result.error;
  const synced=examPaperFromSupabaseRow(result.data),index=savedPapers.findIndex(item=>examPaperId(item.id)===localId);
  if(index>=0)savedPapers[index]=synced;else savedPapers.push(synced);
  saveState();
  return synced;
}
let examPaperCloudSaveTimer=0;
let examPapersLoadingForKey='';
function examPapersForLocalStorage(){
  return savedPapers.map(paper=>{
    const cloudId=paper.cloudId||(isSupabaseExamPaperId(paper.id)?paper.id:'');
    if(!cloudId)return paper;
    const questionCount=examPaperQuestionCount(paper);
    return{id:paper.id,cloudId,userId:paper.userId,title:paper.title,examDetails:{__paperQuestionCount:questionCount},questionCount,marks:Number(paper.marks)||0,savedAtMs:paper.savedAtMs,updatedAt:paper.updatedAt,savedAt:paper.savedAt,_metadataOnly:true};
  });
}
async function ensureFullSavedPaper(id,message='Loading paper...'){
  const paper=findSavedPaper(id);if(!paper)return null;
  if(!paper._metadataOnly&&Array.isArray(paper.questions))return paper;
  const cloudId=paper.cloudId||(isSupabaseExamPaperId(paper.id)?paper.id:'');
  if(!cloudId||!supabaseClient||!currentUser?.id){showToast('This paper is not available on this device.',true);return null;}
  showToast(message);
  try{
    const {data,error}=await supabaseClient.from('exam_papers').select('*').eq('id',cloudId).eq('user_id',currentUser.id).single();
    if(error)throw error;
    const full=examPaperFromSupabaseRow(data),index=savedPapers.findIndex(item=>examPaperId(item.id)===examPaperId(id));
    if(index>=0)savedPapers[index]=full;
    return full;
  }catch(error){console.error('Could not load saved paper:',error);showToast('Could not load this paper.',true);return null;}
}
function queueExamPaperSupabaseSave(paper){
  if(!paper||paper._metadataOnly||!currentUser?.id||!supabaseClient)return;
  clearTimeout(examPaperCloudSaveTimer);
  examPaperCloudSaveTimer=setTimeout(()=>saveExamPaperToSupabase(paper).catch(error=>console.warn('Could not autosave exam paper to Supabase:',error)),1200);
}
async function loadExamPapersFromSupabase(options={}){
  if(!supabaseClient||!currentUser?.id){examPapersLoadingForKey='';renderPapers();return false;}
  const userId=currentUser.id,localCandidates=savedPapers.filter(p=>String(p.userId||'')===userId||(!p.userId&&!isSupabaseExamPaperId(p.id)));
  if(options.showLoading===true){examPapersLoadingForKey=userId;renderPapers();}
  savedPapers=localCandidates;
  try{
    const {data,error}=await supabaseClient.from('exam_papers').select(EXAM_PAPER_LIST_FIELDS).eq('user_id',userId).order('updated_at',{ascending:false});
    if(error)throw error;
    const cachedById=new Map(localCandidates.map(item=>[examPaperId(item.cloudId||item.id),item]));
    let cloudPapers=(data||[]).map(row=>examPaperMetadataFromSupabaseRow(row,cachedById.get(examPaperId(row.id))));
    if(options.migrate!==false){
      const pending=localCandidates.filter(p=>!p.cloudId&&!isSupabaseExamPaperId(p.id));
      for(const localPaper of pending){
        localPaper.userId=userId;
        if(localPaper._forceInsert===true){await saveExamPaperToSupabase(localPaper,{forceInsert:true});continue;}
        const cloudMatch=cloudPapers.find(item=>String(item.title||'').trim().toLowerCase()===String(localPaper.title||'').trim().toLowerCase());
        if(cloudMatch){
          if(paperSavedTime(localPaper)>paperSavedTime(cloudMatch)){localPaper.cloudId=cloudMatch.id;await saveExamPaperToSupabase(localPaper);}
        }else await saveExamPaperToSupabase(localPaper);
      }
      if(pending.length){
        const refreshed=await supabaseClient.from('exam_papers').select(EXAM_PAPER_LIST_FIELDS).eq('user_id',userId).order('updated_at',{ascending:false});
        if(refreshed.error)throw refreshed.error;
        const refreshedCache=new Map(savedPapers.map(item=>[examPaperId(item.cloudId||item.id),item]));
        cloudPapers=(refreshed.data||[]).map(row=>examPaperMetadataFromSupabaseRow(row,refreshedCache.get(examPaperId(row.id))));
      }
    }
    savedPapers=cloudPapers;
    saveState();
    return true;
  }catch(error){
    console.error('Could not load My Papers from Supabase:',error);
    savedPapers=localCandidates;
    if(options.silent!==true)showToast('Could not refresh My Papers. Showing the saved copy on this device.',true);
    return false;
  }finally{
    if(examPapersLoadingForKey===userId)examPapersLoadingForKey='';
    renderPapers();
  }
}
function refreshExamPapersView(){if(supabaseClient&&currentUser?.id)loadExamPapersFromSupabase({silent:true,showLoading:true});else renderPapers();}
let editingPaperId='';
function paperRenameInputId(id){return`paper-title-input-${examPaperId(id).replace(/[^a-zA-Z0-9_-]/g,'_')}`;}
function paperTitleEditor(paper,actionId){
  if(editingPaperId!==examPaperId(paper.id))return`<div class="paper-title">${esc(paper.title||'Untitled paper')}</div>`;
  const inputId=paperRenameInputId(paper.id);
  return`<div class="paper-title-editor"><input id="${esc(inputId)}" class="paper-title-input" type="text" value="${esc(paper.title||'Untitled paper')}" aria-label="Paper title" onkeydown='handlePaperRenameKey(event,${actionId})'><button type="button" class="paper-title-edit-action confirm" onclick='commitPaperRename(${actionId})' title="Save title"><i class="ti ti-check"></i></button><button type="button" class="paper-title-edit-action" onclick="cancelPaperRename()" title="Cancel"><i class="ti ti-x"></i></button></div>`;
}
function papersLoadingHtml(){return`<div class="papers-loading-status" role="status"><i class="ti ti-loader-2"></i><span>Loading saved papers...</span></div>${Array.from({length:3},()=>`<article class="paper-card paper-card-loading" aria-hidden="true"><div class="paper-loading-icon"></div><div class="paper-loading-copy"><span class="paper-loading-line title"></span><span class="paper-loading-line meta"></span></div><div class="paper-loading-actions"><span></span><span></span><span></span></div></article>`).join('')}`;}
const examActionButtonDefaults={
  'save-paper-btn':{icon:'ti-device-floppy',label:'Save'},
  'export-btn':{icon:'ti-download',label:'Export'},
  'export-answers-btn':{icon:'ti-file-check',label:'Answers'}
};
function setExamActionLoading(id,loading,loadingLabel='Loading...'){
  const button=document.getElementById(id),defaults=examActionButtonDefaults[id];
  if(!button||!defaults)return;
  button.disabled=loading;
  button.setAttribute('aria-busy',String(loading));
  button.innerHTML=loading?`<span class="exam-action-spinner" aria-hidden="true"></span><span>${esc(loadingLabel)}</span>`:`<i class="ti ${defaults.icon}"></i><span>${defaults.label}</span>`;
}
function uniqueSavedPaperTitle(value){
  const requested=String(value||'').trim()||'Untitled Exam';
  const used=new Set(savedPapers.map(paper=>String(paper.title||'').trim().toLocaleLowerCase()));
  if(!used.has(requested.toLocaleLowerCase()))return requested;
  const suffixMatch=requested.match(/^(.*?)\s*\((\d+)\)$/),base=(suffixMatch?.[1]||requested).trim()||'Untitled Exam';
  let number=1;
  while(used.has(`${base} (${number})`.toLocaleLowerCase()))number++;
  return `${base} (${number})`;
}
function renderPapers(){const el=document.getElementById('papers-list');if(!el)return;const isLoading=!!currentUser?.id&&examPapersLoadingForKey===currentUser.id,count=savedPapers.length,ordered=[...savedPapers].sort((a,b)=>paperSavedTime(b)-paperSavedTime(a));const body=isLoading?papersLoadingHtml():count?ordered.map(p=>{const questions=Array.isArray(p.questions)?p.questions:[],questionCount=examPaperQuestionCount(p),total=p.marks||questions.reduce((s,q)=>s+(Number(q.marks)||0),0),actionId=JSON.stringify(examPaperId(p.id)),editing=editingPaperId===examPaperId(p.id),questionMeta=questionCount==null?'Questions load on open':`${questionCount} question${questionCount!==1?'s':''}`;return`<article class="paper-card${editing?' paper-card-renaming':''}"><div class="paper-icon"><i class="ti ti-file-text"></i></div><div class="paper-info">${paperTitleEditor(p,actionId)}<div class="paper-meta"><span>${questionMeta}</span><span>${total} mark${total!==1?'s':''}</span>${p.savedAt?`<span>${esc(p.savedAt)}</span>`:''}</div></div><div class="paper-actions">${editing?'':`<button type="button" class="paper-action" onclick='renamePaper(${actionId})'><i class="ti ti-pencil"></i><span>Rename</span></button>`}<button type="button" class="paper-action" onclick='loadPaper(${actionId})'><i class="ti ti-folder-open"></i><span>Open</span></button><button type="button" class="paper-action" onclick='exportSavedPaperPdf(${actionId},false)'><i class="ti ti-download"></i><span>Export</span></button><button type="button" class="paper-action" onclick='exportSavedPaperPdf(${actionId},true)'><i class="ti ti-file-check"></i><span>Answers</span></button><button type="button" class="paper-action" onclick='printSavedPaper(${actionId})'><i class="ti ti-printer"></i><span>Print</span></button><button type="button" class="paper-action danger" onclick='deletePaper(${actionId})'><i class="ti ti-trash"></i><span>Delete</span></button></div></article>`;}).join(''):`<div class="papers-empty"><i class="ti ti-files"></i><h2>No saved papers yet</h2><p>Build an exam and click Save to keep it here.</p></div>`;const countHtml=isLoading?'<span class="papers-count papers-count-loading" aria-hidden="true"></span>':`<span class="papers-count">${count} ${count===1?'paper':'papers'}</span>`;el.innerHTML=`<div class="papers-root"><div class="papers-body"><main class="papers-wrap"><section class="papers-panel"><div class="papers-head"><h1>My Papers</h1>${countHtml}</div><div class="papers-list">${body}</div></section></main></div></div>`;}
async function savePaper(){
  if(!examQuestions.length){showToast('No questions to save',true);return;}
  if(!canUseTeacherQuestionSet(examQuestions))return;
  setExamActionLoading('save-paper-btn',true,'Saving...');
  try{
    syncInstrHTML();clearTimeout(examPaperCloudSaveTimer);
    const requestedTitle=document.getElementById('exam-title').value.trim()||'Untitled Exam',title=uniqueSavedPaperTitle(requestedTitle);
    const savedAtMs=Date.now();
    const paper={id:`local-${savedAtMs}`,cloudId:'',userId:currentUser?.id||'',title,examDetails:getExamDetails(),questions:[...examQuestions],coverPage:{...coverPage},instrHTML:{...instrHTML},pageBreaks:[...examPageBreaks],savedAtMs,savedAt:new Date(savedAtMs).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}),marks:examQuestions.reduce((s,q)=>s+(Number(q.marks)||0),0),_forceInsert:true};
    savedPapers.push(paper);
    saveState();
    try{await saveExamPaperToSupabase(paper,{forceInsert:true});showToast(title===requestedTitle?'Paper saved!':`Paper saved as "${title}"!`);}
    catch(error){console.error('Could not save paper to Supabase:',error);showToast('Paper saved on this device, but Supabase sync failed.',true);}
  }finally{setExamActionLoading('save-paper-btn',false);}
}
async function loadPaper(id){const p=await ensureFullSavedPaper(id);if(!p)return;examQuestions=[...p.questions].map(normalizeQuestion);examPageBreaks=Array.isArray(p.pageBreaks)?[...p.pageBreaks]:[];if(p.instrHTML)Object.assign(instrHTML,p.instrHTML);if(p.coverPage)coverPage={...coverPage,...p.coverPage};document.getElementById('exam-title').value=p.title;applyExamDetails(p.examDetails||{});rememberCurrentExamTextDefaults();saveState();showView('builder');showToast('Paper loaded');}
function renamePaper(id){const paper=findSavedPaper(id);if(!paper)return;editingPaperId=examPaperId(id);renderPapers();setTimeout(()=>{const input=document.getElementById(paperRenameInputId(id));input?.focus();input?.select();},0);}
function cancelPaperRename(){editingPaperId='';renderPapers();}
function handlePaperRenameKey(event,id){if(event.key==='Enter'){event.preventDefault();commitPaperRename(id);}else if(event.key==='Escape'){event.preventDefault();cancelPaperRename();}}
async function commitPaperRename(id){const paper=findSavedPaper(id);if(!paper)return;const input=document.getElementById(paperRenameInputId(id)),oldTitle=paper.title,title=String(input?.value||'').trim();if(!title){showToast('Enter a paper name',true);input?.focus();return;}if(title===oldTitle){cancelPaperRename();return;}if(savedPapers.some(item=>examPaperId(item.id)!==examPaperId(id)&&String(item.title||'').trim().toLowerCase()===title.toLowerCase())){showToast('A paper with that name already exists',true);input?.focus();input?.select();return;}paper.title=title;editingPaperId='';saveState();renderPapers();try{const cloudId=paper.cloudId||(isSupabaseExamPaperId(paper.id)?paper.id:'');if(cloudId&&supabaseClient&&currentUser?.id){const {error}=await supabaseClient.from('exam_papers').update({title}).eq('id',cloudId).eq('user_id',currentUser.id);if(error)throw error;}else await saveExamPaperToSupabase(paper);renderPapers();showToast('Paper renamed');}catch(error){paper.title=oldTitle;saveState();renderPapers();console.error('Could not rename paper in Supabase:',error);showToast('Could not rename the paper in Supabase.',true);}}
function examPdfFileName(title,answerMode=false){
  const base=String(title||'Exam').trim().replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,'_')||'Exam';
  return `${base}${answerMode?'_Answers':''}.pdf`;
}
async function downloadExamLayoutPdf(root,fileName){
  if(typeof html2canvas!=='function'||!window.jspdf?.jsPDF)throw new Error('PDF generator is still loading. Please try again.');
  const pages=[...root.querySelectorAll('.exam-paper-page')];
  if(!pages.length)throw new Error('No exam pages are available to export.');
  root.classList.add('exam-pdf-exporting');
  const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  try{
    for(let index=0;index<pages.length;index++){
      const page=pages[index];
      const canvas=await html2canvas(page,{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',logging:false,removeContainer:true,windowWidth:page.scrollWidth,windowHeight:page.scrollHeight});
      if(index)pdf.addPage('a4','portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',0,0,210,297,undefined,'FAST');
    }
    pdf.save(fileName);
  }finally{root.classList.remove('exam-pdf-exporting');}
}
async function printSavedPaper(id,answerMode=false,directDownload=false){
  const paper=await ensureFullSavedPaper(id,answerMode?'Loading answer layout PDF...':'Loading page layout PDF...');if(!paper)return false;
  if(!canUseTeacherQuestionSet(paper.questions||[]))return false;
  document.getElementById('saved-paper-print-root')?.remove();
  const original={questions:examQuestions,breaks:examPageBreaks,instructions:instrHTML,cover:coverPage,title:document.getElementById('exam-title')?.value||'',details:getExamDetails()};
  let root=null;
  try{
    examQuestions=(paper.questions||[]).map(normalizeQuestion);
    examPageBreaks=Array.isArray(paper.pageBreaks)?[...paper.pageBreaks]:[];
    instrHTML={...instrHTML,...(paper.instrHTML||{})};
    coverPage={...coverPage,...(paper.coverPage||{})};
    const title=document.getElementById('exam-title');if(title)title.value=paper.title||'Untitled paper';
    applyExamDetails(paper.examDetails||{});
    showToast(answerMode?'Preparing answer layout PDF...':'Preparing page layout PDF...');
    const units=examPaginationUnits(examQuestions,instrHTML,answerMode),layout=await calculateExamPageLayout(examQuestions,instrHTML,examPageBreaks,answerMode),byKey=new Map(units.map(unit=>[unit.key,unit]));
    const pages=layout.pages.map(keys=>keys.map(key=>byKey.get(key)).filter(Boolean));
    let html=examCoverPageHtml(layout.totalPages,layout);
    pages.forEach((page,pageIndex)=>{const pageNumber=pageIndex+2,sectionUnit=page.find(unit=>unit.sectionKey),letter=sectionUnit?.sectionLetter||'',sectionKey=sectionUnit?.sectionKey||'';html+=`<article class="exam-paper-page${sectionKey?` exam-section-${sectionKey}`:''}">${examPageHeaderHtml(pageNumber,layout.totalPages,letter)}<div class="exam-paper-body">${page.map((unit,index)=>examUnitHtml(unit,pageIndex,index===0)).join('')}</div></article>`;});
    root=document.createElement('div');root.id='saved-paper-print-root';root.className='saved-paper-print-root';root.innerHTML=`<div class="exam-pages-stage${answerMode?' exam-answer-layout':''}">${html}</div>`;document.body.appendChild(root);
    renderAllTextBoxKatex(root);await waitForExamPageAssets(root);
  }catch(error){console.error('Could not prepare saved paper for printing:',error);root?.remove();showToast('Could not prepare paper for printing',true);}
  finally{
    examQuestions=original.questions;examPageBreaks=original.breaks;instrHTML=original.instructions;coverPage=original.cover;
    const title=document.getElementById('exam-title');if(title)title.value=original.title;
    applyExamDetails(original.details);
  }
  if(!root)return false;
  if(directDownload){
    try{
      showToast(answerMode?'Downloading answer layout PDF...':'Downloading page layout PDF...');
      await downloadExamLayoutPdf(root,examPdfFileName(paper.title,answerMode));
      root.remove();
      return true;
    }catch(error){
      console.error('Could not download saved paper PDF:',error);
      root.remove();
      showToast('PDF download failed: '+error.message,true);
      return false;
    }
  }
  const originalDocumentTitle=document.title;
  document.title=`${paper.title||'Exam'}${answerMode?' - Answers':''}`;
  let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;document.body.classList.remove('printing-saved-paper');root.remove();document.title=originalDocumentTitle;};
  window.addEventListener('afterprint',cleanup,{once:true});
  document.body.classList.add('printing-saved-paper');
  requestAnimationFrame(()=>{window.print();setTimeout(cleanup,500);});
  return true;
}
async function exportSavedPaperPdf(id,answerMode=false){
  const kind=answerMode?'answers':'normal';
  if(!canUseTeacherMonthlyExport(kind))return;
  const started=await printSavedPaper(id,answerMode,true);
  if(started){recordTeacherMonthlyExport(kind);showToast(answerMode?'Answer PDF downloaded.':'PDF downloaded.');}
}
async function deletePaper(id){const paper=findSavedPaper(id);if(!paper)return;if(!confirm(`Delete "${paper.title||'this paper'}"?`))return;const cloudId=paper.cloudId||(isSupabaseExamPaperId(paper.id)?paper.id:'');try{if(cloudId&&supabaseClient&&currentUser?.id){const {error}=await supabaseClient.from('exam_papers').delete().eq('id',cloudId).eq('user_id',currentUser.id);if(error)throw error;}savedPapers=savedPapers.filter(p=>examPaperId(p.id)!==examPaperId(id));saveState();renderPapers();showToast('Paper deleted');}catch(error){console.error('Could not delete paper from Supabase:',error);showToast('Could not delete the paper from Supabase.',true);}}
function showToast(msg,err){const existing=document.querySelector('.toast');if(existing)existing.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;t.style.background=err?'#A32D2D':'#534AB7';document.body.appendChild(t);setTimeout(()=>t.remove(),2500);}

let examPaginationGeneration=0;
let draggedExamUnitKey='';

function ensureExamViewBar(){
  const toolbar=document.getElementById('builder-toolbar');
  if(!toolbar||document.getElementById('exam-view-bar'))return;
  const controls=document.createElement('div');
  controls.className='exam-sticky-controls';
  const bar=document.createElement('div');
  bar.className='exam-view-bar';
  bar.id='exam-view-bar';
  bar.innerHTML=`<div class="exam-view-tabs" role="tablist" aria-label="Exam Builder view"><button type="button" id="exam-edit-tab" role="tab" onclick="setExamBuilderMode('edit')"><i class="ti ti-list-details"></i>Edit Content</button><button type="button" id="exam-pages-tab" role="tab" onclick="setExamBuilderMode('pages')"><i class="ti ti-files"></i>Page Layout</button><button type="button" id="exam-answers-tab" role="tab" onclick="setExamBuilderMode('answers')"><i class="ti ti-circle-check"></i>Answer Layout</button></div><div class="exam-page-tools" id="exam-page-tools"><span id="exam-page-count">0 Questions - 0 Marks - 0 Pages</span><button type="button" class="icon-btn" onclick="changeExamPageZoom(-.08)" title="Zoom out"><i class="ti ti-minus"></i></button><span id="exam-page-zoom">100%</span><button type="button" class="icon-btn" onclick="changeExamPageZoom(.08)" title="Zoom in"><i class="ti ti-plus"></i></button><button type="button" class="btn btn-sm" onclick="resetExamPageBreaks()"><i class="ti ti-refresh"></i>Auto paginate</button></div>`;
  toolbar.before(controls);
  controls.append(bar,toolbar);
}

function syncExamBuilderViewUi(){
  ensureExamViewBar();
  const pages=examBuilderMode==='pages';
  const answers=examBuilderMode==='answers',layout=pages||answers;
  document.getElementById('exam-edit-tab')?.classList.toggle('active',!layout);
  document.getElementById('exam-pages-tab')?.classList.toggle('active',pages);
  document.getElementById('exam-answers-tab')?.classList.toggle('active',answers);
  document.getElementById('exam-edit-tab')?.setAttribute('aria-selected',String(!layout));
  document.getElementById('exam-pages-tab')?.setAttribute('aria-selected',String(pages));
  document.getElementById('exam-answers-tab')?.setAttribute('aria-selected',String(answers));
  document.getElementById('exam-view-bar')?.classList.toggle('page-layout-active',layout);
  document.getElementById('exam-view-bar')?.classList.toggle('answer-layout-active',answers);
  const tools=document.getElementById('exam-page-tools');if(tools)tools.style.display=layout?'flex':'none';
  const toolbar=document.getElementById('builder-toolbar');if(toolbar)toolbar.style.display=layout?'none':'';
  const zoom=document.getElementById('exam-page-zoom');if(zoom)zoom.textContent=Math.round(examPageZoom*100)+'%';
}

function setExamBuilderMode(mode){
  examBuilderMode=['pages','answers'].includes(mode)?mode:'edit';
  saveState();
  renderExam();
}

function changeExamPageZoom(delta){
  examPageZoom=Math.min(1,Math.max(.45,Math.round((examPageZoom+delta)*100)/100));
  const stage=document.getElementById('exam-pages-stage');if(stage)stage.style.setProperty('--exam-page-zoom',examPageZoom);
  const label=document.getElementById('exam-page-zoom');if(label)label.textContent=Math.round(examPageZoom*100)+'%';
  saveState();
}

function resetExamPageBreaks(){
  examPageBreaks=[];
  saveState();
  renderExam();
  showToast('Automatic pagination restored');
}

function examUnitKey(q,index,part){return`q-${String(q.supabaseId||q.id||index).replace(/[^a-zA-Z0-9_-]/g,'_')}-${part}`;}

function examInstructionBodyHtml(key,letter,instructions=instrHTML){
  const source=String(instructions?.[key]||DEFAULT_INSTR_HTML[key]||'').replace(/Instructions for Section [A-D]/g,`Instructions for Section ${letter}`).replace(/<([a-z0-9]+)[^>]*>\s*Instructions for Section [A-D]\s*<\/\1>/i,'').replace(/^\s*Instructions for Section [A-D]\s*/i,'');
  const wrapper=document.createElement('div');
  wrapper.innerHTML=source;
  const items=[];
  const addItem=html=>{if(String(html||'').replace(/<[^>]*>/g,'').trim())items.push(html);};
  [...wrapper.children].forEach(node=>{
    if(node.matches('ul,ol'))[...node.querySelectorAll('li')].forEach(li=>addItem(li.innerHTML));
    else if(node.matches('li'))addItem(node.innerHTML);
    else{
      const nested=[...node.querySelectorAll('li')];
      if(nested.length)nested.forEach(li=>addItem(li.innerHTML));
      else addItem(node.innerHTML);
    }
  });
  if(!items.length)wrapper.textContent.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).forEach(line=>items.push(esc(line)));
  return `<ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul>`;
}

function examAnswerResponsePercent(item){
  const raw=item?.responsePercent??item?.response;
  const hasResponse=raw!==undefined&&raw!==null&&String(raw).trim()!==''&&Number.isFinite(Number(raw));
  const attempts=Number(item?.attemptCount)||0,correct=Number(item?.correctCount)||0;
  if(hasResponse&&Number(raw)!==0)return Math.round(Math.max(0,Math.min(100,Number(raw))));
  if(attempts>0)return Math.round(Math.max(0,Math.min(100,(correct/attempts)*100)));
  return hasResponse?Math.round(Math.max(0,Math.min(100,Number(raw)))):0;
}

function examAnswerMetaText(item){
  const bits=[];
  if(item?.date)bits.push(String(item.date));
  if(item?.questionNumber)bits.push(`Q${item.questionNumber}(${examAnswerResponsePercent(item)}%)`);
  if(item?.author)bits.push(String(item.author));
  return bits.join(' ');
}

function examAnswerMetaHtml(item,answerMode){
  if(!answerMode)return'';
  const meta=examAnswerMetaText(item);
  return meta?`<span class="exam-answer-meta">${esc(meta)}</span>`:'';
}

function examPrintOptionsHtml(q,requestedIndexes=null,answerMode=false){
  if(q.type==='mc'&&q.optionTemplate==='table'&&q.optionTable?.rows){
    const table=q.optionTable,cols=table.cols||((table.headers||[]).length||2);
    return `<table class="mc-option-table-display exam-print-option-table"><thead><tr><th></th>${[...Array(cols)].map((_,column)=>`<th>${table.headerHtml?.[column]||esc((table.headers||[])[column]||'')}</th>`).join('')}</tr></thead><tbody>${[0,1,2,3].map(row=>`<tr class="${answerMode&&row===Number(q.correct)?'answer-correct':''}"><th class="option-letter">${String.fromCharCode(65+row)}.</th>${[...Array(cols)].map((_,column)=>{const cell=table.rows[row]?.[column]||{};return`<td>${cell.html||esc(cell.text||'')}</td>`;}).join('')}</tr>`).join('')}</tbody></table>`;
  }
  const indexes=[0,1,2,3].filter(index=>String((q.options||[])[index]||'').trim()||q.optionImages?.[index]?.data);
  const available=indexes.length?indexes:(q.type==='tf'?[0,1]:[0,1,2,3]);
  const visible=Array.isArray(requestedIndexes)?requestedIndexes.filter(index=>available.includes(index)):available;
  const className=q.optionTemplate==='diagram2'?'options-list option-image-large':(q.optionTemplate==='diagram'||q.optionTemplate==='diagram1'?'option-image-grid':'options-list');
  return `<div class="${className}">${visible.map(index=>`<div class="option-row${answerMode&&index===Number(q.correct)?' answer-correct':''}"><span class="option-letter">${String.fromCharCode(65+index)}.</span><span>${optionDisplayHtml(q,index)}</span></div>`).join('')}</div>`;
}

function examUsesVisualOptionPairs(q){
  return q?.type==='mc'&&['diagram','diagram1','diagram2'].includes(q.optionTemplate);
}

function examPageQuestionContent(q,startNumber=1){
  const wrapper=document.createElement('div');
  wrapper.innerHTML=questionContentHtml(q,startNumber);
  const sources=[q.source,q.source2].map(value=>String(value||'').trim()).filter(Boolean);
  wrapper.querySelectorAll('.q-text').forEach(el=>{
    const text=String(el.textContent||'').trim(),style=el.getAttribute('style')||'';
    if(sources.some(source=>text.endsWith(source))||/^(?:Data|Source)\s*:/i.test(text)||(style.includes('font-size:12px')&&style.includes('color:var(--color-text-secondary)'))){
      el.classList.add('exam-print-source');
      el.style.setProperty('margin','0 0 12pt','important');
      el.style.setProperty('font-family','Arial, sans-serif','important');
      el.style.setProperty('font-size','7pt','important');
      el.style.setProperty('font-weight','400','important');
      el.style.setProperty('line-height','1','important');
      el.style.setProperty('color','#000','important');
      el.style.setProperty('text-align','center','important');
      el.querySelectorAll('*').forEach(child=>{
        child.style.setProperty('font-family','Arial, sans-serif','important');
        child.style.setProperty('font-size','7pt','important');
        child.style.setProperty('font-weight','400','important');
        child.style.setProperty('line-height','1','important');
        child.style.setProperty('color','#000','important');
      });
    }
  });
  return wrapper;
}

function examMultipleContextHtml(q,startNumber){
  const wrapper=examPageQuestionContent(q,startNumber);
  wrapper.querySelector('.multiple-instruction')?.remove();
  wrapper.querySelectorAll(':scope > .options-list').forEach(list=>{if(list.querySelector('.subquestion-card'))list.remove();});
  const instruction=multipleInstructionRange(startNumber,q.subQuestions?.length||2);
  return `<div class="exam-print-multiple-instruction">${esc(instruction)}</div><div class="exam-print-question-content">${wrapper.innerHTML}</div>`;
}

function examDiagramPaginationParts(q,startNumber){
  if(q.type!=='mc'||q.template!=='diagram'||typeof mcContentBlocksFromQuestion!=='function')return null;
  const blocks=mcContentBlocksFromQuestion(q);
  let split=blocks.length;
  while(split>0){
    const block=blocks[split-1]||{},hasText=!!(block.afterTextHtml||block.afterText),hasMedia=!!(block.imageData||block.source);
    if(!hasText||hasMedia)break;
    split--;
  }
  if(split===blocks.length)return null;
  const stemQuestion={...q,extraBlocks:blocks.slice(0,split),imageData:'',imageName:'',source:'',afterText:'',afterTextHtml:'',imageData2:'',imageName2:'',source2:'',afterText2:'',afterText2Html:''};
  const optionLead=blocks.slice(split).map(block=>`<div class="q-text">${block.afterTextHtml||esc(block.afterText||'')}</div>`).join('');
  return{stemHtml:examPageQuestionContent(stemQuestion,startNumber).innerHTML,optionLeadHtml:`<div class="exam-print-option-lead">${optionLead}</div>`};
}

function examSaerExtraBlocksHtml(item,answerMode=false){
  const blocks=typeof saerBlocksFromQuestion==='function'?saerBlocksFromQuestion(item):[];
  return blocks.map(block=>{
    const imageData=answerMode&&block.diagramSolutionImageData?block.diagramSolutionImageData:block.imageData;
    const imageName=answerMode&&block.diagramSolutionImageData?block.diagramSolutionImageName:block.imageName;
    return `${imageData?`<img class="q-diagram" src="${imageData}" alt="${esc(imageName||'Question diagram')}">`:''}${block.source?`<div class="exam-print-source">${sourceTypeLabel(block.sourceType)}: ${esc(block.source)}</div>`:''}${block.afterTextHtml||block.afterText?`<div class="q-text">${block.afterTextHtml||esc(block.afterText||'')}</div>`:''}`;
  }).join('');
}

function examSaerPromptHtml(item,answerMode=false){
  const text=item?.textHtml||esc(item?.text||'');
  return `${text?`<div class="q-text">${text}</div>`:''}${examSaerExtraBlocksHtml(item,answerMode)}`;
}

function examSaerResponseImage(item,answerMode=false,kind='box'){
  const solution=kind==='table'?item?.tableAnswerSolutionImageData:item?.answerBoxSolutionImageData;
  const normal=kind==='table'?item?.tableAnswerImageData:item?.answerBoxImageData;
  const data=answerMode&&solution?solution:normal;
  const solutionName=kind==='table'?item?.tableAnswerSolutionImageName:item?.answerBoxSolutionImageName;
  const normalName=kind==='table'?item?.tableAnswerImageName:item?.answerBoxImageName;
  const name=answerMode&&solution?solutionName:normalName;
  return data?`<img class="exam-saer-answer-image exam-saer-answer-image-${kind}" src="${data}" alt="${esc(name||'Answer area')}">`:'';
}

function examSaerLinedResponse(item,answerMode=false,initialHtml=''){
  const count=Math.max(0,parseInt(item?.lines,10)||0),solutionHtml=answerMode?(item?.solutionHtml||esc(item?.solution||'')):'';
  const visibleLines=Math.max(solutionHtml||initialHtml?1:0,count);
  if(!visibleLines)return'';
  const rules=[...Array(visibleLines)].map(()=>'<i></i>').join('');
  return `<div class="exam-saer-response${solutionHtml?' exam-saer-solution':''}" style="--saer-line-count:${visibleLines}"><span class="exam-saer-response-rules" aria-hidden="true">${rules}</span><div class="exam-saer-response-content">${solutionHtml||initialHtml||''}</div></div>`;
}

function examSaerResponseHtml(item,answerMode=false){
  const template=typeof normaliseAnswerTemplate==='function'?normaliseAnswerTemplate(item?.answerTemplate):'normal-lines';
  if(template==='table-image')return examSaerResponseImage(item,answerMode,'table');
  if(template==='word-lines'){
    const blocks=typeof normaliseSaerWordBlocks==='function'?normaliseSaerWordBlocks(item?.wordLineBlocks):[];
    const list=blocks.length?blocks:[{initialWord:'',initialWordHtml:'',initialWordSolution:'',initialWordSolutionHtml:'',lines:item?.lines||1}];
    return list.map(block=>{
      const display={...item,lines:block.lines,solution:answerMode?block.initialWordSolution:'',solutionHtml:answerMode?block.initialWordSolutionHtml:''};
      const initial=block.initialWordHtml||esc(block.initialWord||'');
      return examSaerLinedResponse(display,answerMode,initial);
    }).join('');
  }
  return examSaerLinedResponse(item,answerMode)+examSaerResponseImage(item,answerMode,'box');
}

function examSaerMarkText(item){
  const marks=Math.max(0,Number(item?.marks)||0);
  return marks?`${marks} mark${marks===1?'':'s'}`:'';
}

function examSaerPartHtml(item,label,level='part',answerMode=false,includeResponse=true){
  const marks=includeResponse?examSaerMarkText(item):'';
  const labelParts=String(label||'').trim().split(/\s+/),labelHtml=level==='subpart-root'&&labelParts.length>1?`<span class="exam-saer-root-part-label">${esc(labelParts[0])}</span><span class="exam-saer-root-subpart-label">${esc(labelParts.slice(1).join(' '))}</span>`:esc(label);
  return `<section class="exam-saer-part exam-saer-${level}"><div class="exam-saer-part-row"><strong class="exam-saer-part-label">${labelHtml}</strong><div class="exam-saer-part-content">${examSaerPromptHtml(item,answerMode)}</div><span class="exam-saer-part-marks">${esc(marks)}</span></div>${includeResponse?`<div class="exam-saer-part-response">${examSaerResponseHtml(item,answerMode)}</div>`:''}</section>`;
}

function examSaerQuestionHeading(q,number,answerMode=false){
  const marks=examSaerMarkText(q);
  return `<div class="exam-print-question-heading"><span class="exam-question-title"><strong>Question ${number}</strong>${marks?` (${esc(marks)})`:''}</span>${examAnswerMetaHtml(q,answerMode)}</div>`;
}

function examSaerStemHtml(q,number,answerMode=false,includeResponse=false){
  const stem={...q,parts:[]};
  return `<article class="exam-print-question exam-saer-question">${examSaerQuestionHeading(q,number,answerMode)}<div class="exam-print-question-content">${examSaerPromptHtml(stem,answerMode)}</div>${includeResponse?`<div class="exam-saer-main-response">${examSaerResponseHtml(q,answerMode)}</div>`:''}</article>`;
}

function examSaerFullHtml(q,number,answerMode=false){
  const parts=typeof normaliseSaerParts==='function'?normaliseSaerParts(q.parts||[]):(q.parts||[]);
  const partsHtml=parts.map((part,partIndex)=>{
    const partLabel=`${String.fromCharCode(97+partIndex)}.`,subparts=part.subparts||[];
    if(!subparts.length)return examSaerPartHtml(part,partLabel,'part',answerMode,true);
    const hasPartPrompt=!!(String(part.textHtml||part.text||'').trim()||(typeof saerBlocksFromQuestion==='function'&&saerBlocksFromQuestion(part).length));
    const intro=hasPartPrompt?examSaerPartHtml(part,partLabel,'part-intro',answerMode,false):'';
    return intro+subparts.map((subpart,subIndex)=>{
      const roman=typeof romanNumeral==='function'?romanNumeral(subIndex+1):String(subIndex+1),startsUnlabelledPart=!hasPartPrompt&&subIndex===0;
      return examSaerPartHtml(subpart,startsUnlabelledPart?`${partLabel} ${roman}.`:`${roman}.`,startsUnlabelledPart?'subpart-root':'subpart',answerMode,true);
    }).join('');
  }).join('');
  return examSaerStemHtml(q,number,answerMode,!parts.length)+partsHtml;
}

function examPaginationUnits(questions=examQuestions,instructions=instrHTML,answerMode=false){
  const groups={mc:[],tf:[],sa:[],er:[]};
  questions.forEach((q,index)=>(groups[q.type]||groups.er).push({q,index}));
  const active=['mc','tf','sa','er'].filter(key=>groups[key].length);
  const units=[];
  active.forEach((key,sectionIndex)=>{
    let questionNumber=1;
    const letter=String.fromCharCode(65+sectionIndex),meta=examTypeMeta(key),items=groups[key];
    const marks=items.reduce((sum,item)=>sum+(Number(item.q.marks)||0),0);
    const sectionLabel=meta.label.replace(/ Question$/,' Questions').replace(/^Short Answer$/,'Short Answer Questions').replace(/^Extended Response$/,'Extended Response Questions');
    const heading=active.length>1?`<h2><strong>Section ${letter}</strong> - ${esc(sectionLabel)}</h2>`:'';
    units.push({key:`section-${key}`,kind:'section',sectionKey:key,sectionLetter:letter,html:`<section class="exam-print-section-heading">${heading}<h3>Instructions</h3><div class="exam-print-instructions">${examInstructionBodyHtml(key,letter,instructions)}</div></section>`});
    items.forEach(({q,index})=>{
      const start=questionNumber,logical=logicalQuestionCount(q),stemKey=examUnitKey(q,index,'stem');
      questionNumber+=logical;
      const marksLabel=q.type==='mc'?'':`<span>(${Number(q.marks)||0} mark${Number(q.marks)===1?'':'s'})</span>`;
      const multiple=q.type==='mc'&&q.template==='multiple';
      if(multiple&&q.subQuestions?.length){
        units.push({key:stemKey,kind:'context',sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,html:`<section class="exam-print-multiple-context">${examMultipleContextHtml(q,start)}</section>`});
        q.subQuestions.forEach((subQuestion,subIndex)=>{
          const subNumber=start+subIndex,subStemKey=examUnitKey(q,index,`sub-${subIndex}-stem`),subOptionsKey=examUnitKey(q,index,`sub-${subIndex}-options`);
          const subOptionQuestion={...subQuestion,type:'mc',date:subQuestion.date||q.date,questionNumber:(parseInt(q.questionNumber,10)||1)+subIndex,author:subQuestion.author||q.author,responsePercent:subQuestion.responsePercent??subQuestion.response??q.responsePercent??q.response,attemptCount:subQuestion.attemptCount??q.attemptCount,correctCount:subQuestion.correctCount??q.correctCount};
          units.push({key:subStemKey,kind:'stem',sectionKey:key,sectionLetter:letter,questionNumber:subNumber,questionIndex:index,html:`<article class="exam-print-question"><div class="exam-print-question-heading"><strong>Question ${subNumber}</strong>${examAnswerMetaHtml(subOptionQuestion,answerMode)}</div><div class="exam-print-question-content">${multipleSubQuestionBodyHtml(subQuestion)}</div></article>`});
          if(examUsesVisualOptionPairs(subOptionQuestion)){
            [[0,1],[2,3]].forEach((pair,pairIndex)=>units.push({key:`${subOptionsKey}-${pairIndex}`,kind:'options',sectionKey:key,sectionLetter:letter,questionNumber:subNumber,questionIndex:index,visualOptionPair:pairIndex===0?'first':'second',endsMcQuestion:pairIndex===1,html:`<div class="exam-print-options">${examPrintOptionsHtml(subOptionQuestion,pair,answerMode)}</div>`}));
          }else units.push({key:subOptionsKey,kind:'options',sectionKey:key,sectionLetter:letter,questionNumber:subNumber,questionIndex:index,endsMcQuestion:true,html:`<div class="exam-print-options">${examPrintOptionsHtml(subOptionQuestion,null,answerMode)}</div>`});
        });
        return;
      }
      if(q.type==='sa'||q.type==='er'){
        const parts=typeof normaliseSaerParts==='function'?normaliseSaerParts(q.parts||[]):(q.parts||[]);
        units.push({key:stemKey,kind:'saer-stem',startsSaerParts:parts.length>0,endsSaerQuestion:parts.length===0,sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,html:examSaerStemHtml(q,start,answerMode,!parts.length)});
        parts.forEach((part,partIndex)=>{
          const partLabel=`${String.fromCharCode(97+partIndex)}.`,subparts=part.subparts||[],partKey=examUnitKey(q,index,`part-${partIndex}`);
          if(!subparts.length){
            units.push({key:partKey,kind:'saer-part',endsSaerQuestion:partIndex===parts.length-1,sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,html:examSaerPartHtml(part,partLabel,'part',answerMode,true)});
            return;
          }
          const hasPartPrompt=!!(String(part.textHtml||part.text||'').trim()||(typeof saerBlocksFromQuestion==='function'&&saerBlocksFromQuestion(part).length));
          if(hasPartPrompt)units.push({key:partKey,kind:'saer-part-intro',sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,html:examSaerPartHtml(part,partLabel,'part-intro',answerMode,false)});
          subparts.forEach((subpart,subIndex)=>{
            const roman=typeof romanNumeral==='function'?romanNumeral(subIndex+1):String(subIndex+1);
            const startsUnlabelledPart=!hasPartPrompt&&subIndex===0;
            units.push({key:examUnitKey(q,index,`part-${partIndex}-sub-${subIndex}`),kind:'saer-subpart',endsSaerQuestion:partIndex===parts.length-1&&subIndex===subparts.length-1,sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,html:examSaerPartHtml(subpart,startsUnlabelledPart?`${partLabel} ${roman}.`:`${roman}.`,startsUnlabelledPart?'subpart-root':'subpart',answerMode,true)});
          });
        });
        return;
      }
      const diagramParts=examDiagramPaginationParts(q,start),stemContent=diagramParts?.stemHtml||examPageQuestionContent(q,start).innerHTML;
      units.push({key:stemKey,kind:'stem',sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,endsMcQuestion:multiple,html:`<article class="exam-print-question"><div class="exam-print-question-heading"><strong>Question ${start}</strong>${marksLabel}${examAnswerMetaHtml(q,answerMode)}</div><div class="exam-print-question-content">${stemContent}</div></article>`});
      if(((q.type==='mc'&&!multiple)||q.type==='tf')){
        if(examUsesVisualOptionPairs(q)){
          [[0,1],[2,3]].forEach((pair,pairIndex)=>units.push({key:examUnitKey(q,index,`options-${pairIndex}`),kind:'options',sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,visualOptionPair:pairIndex===0?'first':'second',endsMcQuestion:pairIndex===1,html:`${pairIndex===0?(diagramParts?.optionLeadHtml||''):''}<div class="exam-print-options">${examPrintOptionsHtml(q,pair,answerMode)}</div>`}));
        }else units.push({key:examUnitKey(q,index,'options'),kind:'options',sectionKey:key,sectionLetter:letter,questionNumber:start,questionIndex:index,endsMcQuestion:q.type==='mc',html:`${diagramParts?.optionLeadHtml||''}<div class="exam-print-options">${examPrintOptionsHtml(q,null,answerMode)}</div>`});
      }
    });
  });
  return units;
}

function examPageLayoutSummary(pages){
  const sections={};
  pages.forEach((page,index)=>{
    const pageNumber=index+2;
    new Set(page.map(unit=>unit.sectionKey).filter(Boolean)).forEach(key=>{
      if(!sections[key])sections[key]={start:pageNumber,end:pageNumber};
      else sections[key].end=pageNumber;
    });
  });
  return{totalPages:pages.length+1,sections,pages:pages.map(page=>page.map(unit=>unit.key))};
}

function examCoverRichBlock(title,html){
  const content=String(html||'').trim();
  if(!content||!content.replace(/<[^>]*>/g,'').trim())return'';
  return `<section class="exam-cover-block"><h2>${esc(title)}</h2><div>${content}</div></section>`;
}

function examCoverPageCountHtml(html,totalPages){
  const count=Math.max(1,Number(totalPages)||1);
  return String(html||'').replace(/\bxx\s+pages?\b/gi,`${count} page${count===1?'':'s'}`);
}

function examUsesGenericExamination(details={}){
  return String(details.examination||'').trim().toLowerCase()==='examination';
}

function examCoverBookTitle(details={}){
  const subject=String(details.subject||'').trim().toLowerCase();
  const examination=String(details.examination||'').trim().toLowerCase();
  return subject==='general mathematics'&&examination==='examination 1'
    ?'Multiple-Choice Question Book'
    :'Question and Answer Book';
}

function examCoverPageHtml(totalPages,pageLayout={}){
  const details=getExamDetails(),title=(document.getElementById('exam-title')?.value||'Untitled Exam').trim(),totalMarks=examQuestions.reduce((sum,q)=>sum+(Number(q.marks)||0),0);
  const logo=details.coverLogoData||coverPageLogoData||(typeof BF_EXAM_COVER_LOGO_DATA!=='undefined'?BF_EXAM_COVER_LOGO_DATA:'');
  const groups={mc:[],tf:[],sa:[],er:[]};examQuestions.forEach(q=>(groups[q.type]||groups.er).push(q));
  const activeSections=['mc','tf','sa','er'].filter(k=>groups[k].length),singleSection=activeSections.length===1;
  const rows=activeSections.map((k,index)=>{const list=groups[k],questions=list.reduce((sum,q)=>sum+logicalQuestionCount(q),0),marks=list.reduce((sum,q)=>sum+(Number(q.marks)||0),0),range=pageLayout.sections?.[k],pages=range?(range.start===range.end?String(range.start):`${range.start} - ${range.end}`):'',letter=String.fromCharCode(65+index),label=singleSection?`${questions} Question${questions===1?'':'s'} (${marks} mark${marks===1?'':'s'})`:`<strong>Section ${letter}</strong> (${questions} Question${questions===1?'':'s'}, ${marks} Mark${marks===1?'':'s'})`;return`<div class="exam-cover-contents-row"><span>${label}</span><i></i><b>${esc(pages)}</b></div>`;}).join('');
  const examDate=details.date?new Date(`${details.date}T00:00:00`):null,dateText=examDate&&!isNaN(examDate)?examDate.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'';
  const time=bfExamTimeSummary(details),approved=coverPage.approvedMaterialsHtml||coverPlainTextToHtml(coverPage.approvedMaterials||''),supplied=examCoverPageCountHtml(coverPage.materialsSuppliedHtml||coverPlainTextToHtml(coverPage.materialsSupplied||''),totalPages),instructions=coverPage.instructionsHtml||coverPlainTextToHtml(coverPage.instructions||''),genericExamination=examUsesGenericExamination(details),titleLines=genericExamination?`<div class="exam-cover-title-spacer" aria-hidden="true"></div><div class="exam-cover-subject">${esc(details.subject||'')}</div>`:`<div class="exam-cover-subject">${esc(details.subject||'')}</div><div class="exam-cover-examination">${esc(details.examination||'')}</div>`;
  return `<article class="exam-paper-page exam-cover-page"><div class="exam-cover-content exam-cover-word"><div class="exam-cover-top exam-cover-area-one">${logo?`<img class="exam-cover-logo" src="${logo}" alt="School logo">`:''}<div class="exam-cover-student"><div class="exam-cover-student-line"></div><span>Student Name</span></div></div><div class="exam-cover-area-gap" aria-hidden="true"></div><div class="exam-cover-area-two"><div class="exam-cover-identity">${titleLines}<div class="exam-cover-book">${esc(examCoverBookTitle(details))}</div><div class="exam-cover-school-line">${esc(details.schoolName||examSchoolName||'Quero Learning Tools')} Examination${dateText?` - ${esc(dateText)}`:''}</div></div><div class="exam-cover-rule"></div><div class="exam-cover-times"><p><span class="exam-cover-time-bullet" aria-hidden="true">&#8226;</span><span>${esc(time.readingPrefix)}<strong>${esc(time.readingDuration)}</strong>${esc(time.readingSuffix)}</span></p><p><span class="exam-cover-time-bullet" aria-hidden="true">&#8226;</span><span>${esc(time.writingPrefix)}<strong>${esc(time.writingDuration)}</strong>${esc(time.writingSuffix)}</span></p></div>${examCoverRichBlock('Approved Materials',approved)}${examCoverRichBlock('Materials Supplied',supplied)}${examCoverRichBlock('Instructions',instructions)}<div class="exam-cover-rule exam-cover-rule-lower"></div><section class="exam-cover-contents"><div class="exam-cover-contents-head"><h2>Contents</h2><span>Pages</span></div>${rows}</section></div></div>${examPageFooterHtml(details)}</article>`;
}

function examPageFooterHtml(details=getExamDetails()){
  const year=String(details.date||'').match(/^(\d{4})/)?.[1]||String(new Date().getFullYear()),school=details.schoolName||examSchoolName||'Quero Learning Tools',footer=details.coverFooterData||coverPageFooterData||(typeof BF_EXAM_COVER_FOOTER_DATA!=='undefined'?BF_EXAM_COVER_FOOTER_DATA:'');
  return `<footer class="exam-paper-footer"><span>&copy; ${esc(school)} ${esc(year)}</span>${footer?`<img src="${footer}" alt="School footer">`:''}</footer>`;
}

function examPageHeaderHtml(pageNumber,totalPages,sectionLetter){
  const details=getExamDetails(),title=(document.getElementById('exam-title')?.value||'Untitled Exam').trim(),year=String(details.date||'').match(/^(\d{4})/)?.[1]||String(new Date().getFullYear());
  const sectionCount=new Set(examQuestions.map(q=>q.type||'er')).size;
  const section=sectionLetter&&sectionCount>1?`<strong>Section ${esc(sectionLetter)}</strong>`:'';
  const specific=/\d/.test(details.examination||'')?details.examination:'';
  const school=String(details.schoolName||examSchoolName||'').trim();
  const examDetails=[year,school,details.subject,specific].filter(Boolean).map(esc).join(' ');
  const descriptor=[section,examDetails].filter(Boolean).join(' ');
  const titleHasSchool=school&&title.toLocaleLowerCase().includes(school.toLocaleLowerCase());
  const oddTitle=!school||titleHasSchool?title:(title.startsWith(`${year} `)?`${year} ${school} ${title.slice(year.length+1)}`:`${year} ${school} ${title}`);
  const page=`Page ${pageNumber} of ${totalPages}`;
  return pageNumber%2===0?`<header class="exam-paper-header"><span>${page}</span><span>${descriptor}</span></header>`:`<header class="exam-paper-header"><span>${esc(oddTitle)}${section?' '+section:''}</span><span>${page}</span></header>`;
}

function scaleExamPageContentImages(root){
  root.querySelectorAll('.exam-print-question-content img,.exam-print-options img,.exam-page-unit-saer img').forEach(img=>{
    const naturalWidth=img.naturalWidth||img.width||1;
    img.style.width=`${Math.max(1,naturalWidth*.30)}px`;
    img.style.height='auto';
  });
}

function scaleExamEditorImages(root){
  root.querySelectorAll('.q-card img.q-diagram,.q-card img.option-image-preview,.q-card img.exam-saer-answer-image').forEach(img=>{
    const naturalWidth=img.naturalWidth||img.width||1;
    img.style.width=`${Math.max(1,naturalWidth*.30)}px`;
    img.style.height='auto';
  });
}

function waitForExamEditorImages(root){
  const images=[...root.querySelectorAll('.q-card img')];
  Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{
    img.addEventListener('load',resolve,{once:true});
    img.addEventListener('error',resolve,{once:true});
    setTimeout(resolve,1500);
  }))).then(()=>scaleExamEditorImages(root));
}

function waitForExamPageAssets(root){
  const images=[...root.querySelectorAll('img')];
  return Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});setTimeout(resolve,1500);}))).then(()=>{
    scaleExamPageContentImages(root);
    return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
}

function examPageUnitClassName(unit){
  return `exam-page-unit${unit.kind==='section'?' exam-page-unit-section':''}${unit.kind==='stem'?' exam-page-unit-stem':''}${unit.kind==='context'?' exam-page-unit-context':''}${unit.kind.startsWith('saer-')?' exam-page-unit-saer':''}${unit.startsSaerParts?' exam-page-unit-saer-stem-parts':''}${unit.endsSaerQuestion?' exam-page-unit-saer-end':''}${unit.visualOptionPair==='first'?' exam-page-unit-visual-pair-first':''}${unit.endsMcQuestion?' exam-page-unit-mcq-end':''}`;
}

function examMeasuredUnitHeight(element){
  if(!element)return 0;
  const style=getComputedStyle(element);
  return element.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
}

function examPageCapacityForUnit(unit,baseCapacity){
  return ['sa','er'].includes(unit?.sectionKey)?baseCapacity+(8*96/25.4):baseCapacity;
}

function paginateExamUnits(units,heights,capacity,pageBreaks=examPageBreaks){
  const pages=[[]];
  let used=0;
  const breaks=new Set(pageBreaks);
  for(let i=0;i<units.length;i++){
    const unit=units[i],height=heights.get(unit.key)||0;
    let current=pages[pages.length-1];
    if((unit.kind==='section'||breaks.has(unit.key))&&current.length){pages.push([]);used=0;current=pages[pages.length-1];}
    const pageCapacity=examPageCapacityForUnit(unit,capacity);
    let keepHeight=height;
    const next=units[i+1];
    if(unit.kind==='context'&&next?.kind==='stem'&&!breaks.has(next.key)){
      keepHeight+=heights.get(next.key)||0;
      const following=units[i+2];
      if(following?.kind==='options'&&following.questionNumber===next.questionNumber&&!breaks.has(following.key))keepHeight+=heights.get(following.key)||0;
    }else if(next&&!breaks.has(next.key)){
      const keepWithNext=(unit.kind==='section'&&['stem','saer-stem'].includes(next.kind))
        ||(unit.kind==='stem'&&['options','answer'].includes(next.kind))
        ||(unit.kind==='saer-stem'&&['saer-part','saer-part-intro','saer-subpart'].includes(next.kind))
        ||(unit.kind==='saer-part-intro'&&next.kind==='saer-subpart');
      if(keepWithNext)keepHeight+=heights.get(next.key)||0;
    }
    if(current.length&&used+keepHeight>pageCapacity){pages.push([]);used=0;}
    pages[pages.length-1].push(unit);used+=height;
    if(used>pageCapacity&&pages[pages.length-1].length>1){const moved=pages[pages.length-1].pop();pages.push([moved]);used=height;}
  }
  return pages.filter(page=>page.length);
}

async function calculateExamPageLayout(questions=examQuestions,instructions=instrHTML,pageBreaks=examPageBreaks,answerMode=false){
  const units=examPaginationUnits(questions,instructions,answerMode);
  if(!units.length)return{totalPages:1,sections:{},pages:[]};
  const measure=document.createElement('div');
  measure.className='exam-page-measure';
  measure.innerHTML=units.map(unit=>`<div data-measure-key="${unit.key}" class="${examPageUnitClassName(unit)}">${unit.html}</div>`).join('');
  document.body.appendChild(measure);
  renderAllTextBoxKatex(measure);
  await waitForExamPageAssets(measure);
  const heights=new Map(units.map(unit=>[unit.key,examMeasuredUnitHeight(measure.querySelector(`[data-measure-key="${unit.key}"]`))]));
  measure.remove();
  const pages=paginateExamUnits(units,heights,991,pageBreaks);
  return examPageLayoutSummary(pages);
}

function examUnitHtml(unit,pageIndex,firstOnPage){
  const manual=examPageBreaks.includes(unit.key);
  return `<div class="${examPageUnitClassName(unit)}${manual?' manual-page-break':''}" draggable="true" data-unit-key="${unit.key}" data-page-index="${pageIndex}" ondragstart="startExamUnitDrag(event,'${unit.key}')" ondragend="endExamUnitDrag()"><button type="button" class="exam-unit-handle" title="Drag to another page"><i class="ti ti-grip-vertical"></i></button>${manual?`<div class="manual-break-label"><i class="ti ti-cut"></i>Manual page break</div>`:''}${unit.html}<div class="exam-unit-actions"><button type="button" onclick="moveExamUnitToPreviousPage('${unit.key}')" title="Allow this item on the previous page"><i class="ti ti-arrow-up"></i></button><button type="button" onclick="moveExamUnitToNextPage('${unit.key}')" title="Move this item to the next page"><i class="ti ti-arrow-down"></i></button></div></div>`;
}

async function buildExamPages(el,generation,answerMode=false){
  const units=examPaginationUnits(examQuestions,instrHTML,answerMode);
  if(!units.length){el.innerHTML=`<div class="empty-state"><i class="ti ti-files"></i><div>Add questions before arranging pages</div></div>`;return;}
  const measure=document.createElement('div');measure.className='exam-page-measure';measure.innerHTML=units.map(unit=>`<div data-measure-key="${unit.key}" class="${examPageUnitClassName(unit)}">${unit.html}</div>`).join('');document.body.appendChild(measure);
  renderAllTextBoxKatex(measure);await waitForExamPageAssets(measure);if(generation!==examPaginationGeneration){measure.remove();return;}
  const heights=new Map(units.map(unit=>[unit.key,examMeasuredUnitHeight(measure.querySelector(`[data-measure-key="${unit.key}"]`))]));
  const capacity=991;measure.remove();
  const contentPages=paginateExamUnits(units,heights,capacity),pageLayout=examPageLayoutSummary(contentPages),totalPages=pageLayout.totalPages,details=getExamDetails();
  let html=examCoverPageHtml(totalPages,pageLayout);
  contentPages.forEach((page,pageIndex)=>{const pageNumber=pageIndex+2,sectionUnit=page.find(unit=>unit.sectionKey),letter=sectionUnit?.sectionLetter||'',sectionKey=sectionUnit?.sectionKey||'';html+=`<article class="exam-paper-page${sectionKey?` exam-section-${sectionKey}`:''}" data-page-index="${pageIndex}" ondragover="allowExamPageDrop(event)" ondrop="dropExamUnitOnPage(event,${pageIndex})">${examPageHeaderHtml(pageNumber,totalPages,letter)}<div class="exam-paper-body">${page.map((unit,index)=>examUnitHtml(unit,pageIndex,index===0)).join('')}</div></article>`;});
  if(generation!==examPaginationGeneration)return;
  el.innerHTML=`<div class="exam-pages-help"><i class="ti ti-grip-vertical"></i>Drag a question or option group onto a later page. Question order stays fixed.</div><div class="exam-pages-stage${answerMode?' exam-answer-layout':''}" id="exam-pages-stage" style="--exam-page-zoom:${examPageZoom}">${html}</div>`;
  renderAllTextBoxKatex(el);await waitForExamPageAssets(el);
  const totalQuestions=examQuestions.reduce((sum,q)=>sum+logicalQuestionCount(q),0),totalMarks=examQuestions.reduce((sum,q)=>sum+(Number(q.marks)||0),0);
  const count=document.getElementById('exam-page-count');if(count)count.textContent=`${totalQuestions} Question${totalQuestions===1?'':'s'} - ${totalMarks} Mark${totalMarks===1?'':'s'} - ${totalPages} Page${totalPages===1?'':'s'}`;
}

function renderExamPages(answerMode=false){
  const el=document.getElementById('exam-sections');if(!el)return;
  const generation=++examPaginationGeneration;
  el.innerHTML=`<div class="exam-pages-loading"><i class="ti ti-loader-2"></i><span>Paginating A4 pages...</span></div>`;
  requestAnimationFrame(()=>buildExamPages(el,generation,answerMode));
}

function renderExam(){
  const totalMarks=examQuestions.reduce((sum,q)=>sum+(Number(q.marks)||0),0),totalQuestions=examQuestions.reduce((sum,q)=>sum+logicalQuestionCount(q),0),summary=document.getElementById('exam-summary-line');
  if(summary)summary.textContent=`${totalQuestions} question${totalQuestions===1?'':'s'} - ${totalMarks} mark${totalMarks===1?'':'s'}`;
  syncExamBuilderViewUi();
  if(examBuilderMode==='pages'||examBuilderMode==='answers')renderExamPages(examBuilderMode==='answers');else renderExamEditorView();
}

function clearExamUnitDragState(){document.querySelectorAll('.exam-paper-page.drag-target,.exam-page-unit.dragging').forEach(el=>el.classList.remove('drag-target','dragging'));draggedExamUnitKey='';}
function startExamUnitDrag(event,key){clearExamUnitDragState();draggedExamUnitKey=key;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',key);event.currentTarget.classList.add('dragging');}
function endExamUnitDrag(){clearExamUnitDragState();}
function allowExamPageDrop(event){event.preventDefault();event.dataTransfer.dropEffect='move';event.currentTarget.classList.add('drag-target');}
function dropExamUnitOnPage(event,targetPage){event.preventDefault();const key=event.dataTransfer.getData('text/plain')||draggedExamUnitKey,source=Number(document.querySelector(`[data-unit-key="${key}"]`)?.dataset.pageIndex||0);clearExamUnitDragState();if(!key)return;if(targetPage>source&&!examPageBreaks.includes(key))examPageBreaks.push(key);else if(targetPage<=source)examPageBreaks=examPageBreaks.filter(item=>item!==key);saveState();renderExam();}
function moveExamUnitToNextPage(key){if(!examPageBreaks.includes(key))examPageBreaks.push(key);saveState();renderExam();}
function moveExamUnitToPreviousPage(key){examPageBreaks=examPageBreaks.filter(item=>item!==key);saveState();renderExam();}

async function waitForExamPdfStage(answerMode=false){
  const targetMode=answerMode?'answers':'pages';
  if(examBuilderMode!==targetMode){examBuilderMode=targetMode;saveState();renderExam();}
  for(let attempt=0;attempt<100;attempt++){
    const stage=document.getElementById('exam-pages-stage');
    const assetsPending=stage&&[...stage.querySelectorAll('img')].some(image=>!image.complete);
    if(stage&&!document.querySelector('.exam-pages-loading')&&!assetsPending)return stage;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error('The page layout did not finish loading.');
}
async function exportExamPdf(answerMode=false){
  if(!examQuestions.length){showToast('No questions in exam',true);return;}
  if(!canUseTeacherQuestionSet(examQuestions))return;
  const kind=answerMode?'answers':'normal';
  if(!canUseTeacherMonthlyExport(kind))return;
  if(typeof syncInstrHTML==='function')syncInstrHTML();
  if(typeof syncCoverPage==='function')syncCoverPage();
  const buttonId=answerMode?'export-answers-btn':'export-btn';
  setExamActionLoading(buttonId,true,answerMode?'Building answers...':'Building PDF...');
  try{
    const stage=await waitForExamPdfStage(answerMode),title=(document.getElementById('exam-title')?.value||'Exam').trim();
    await downloadExamLayoutPdf(stage,examPdfFileName(title,answerMode));
    recordTeacherMonthlyExport(kind);
    showToast(answerMode?'Answer PDF downloaded.':'PDF downloaded.');
  }catch(error){console.error('Could not download exam PDF:',error);showToast('PDF download failed: '+error.message,true);}
  finally{setExamActionLoading(buttonId,false);}
}
function printExamPdf(){
  if(!examQuestions.length){showToast('No questions in exam',true);return;}
  if(examBuilderMode!=='pages'){examBuilderMode='pages';saveState();renderExam();setTimeout(printExamPdf,650);return;}
  const stage=document.getElementById('exam-pages-stage');
  const assetsPending=stage&&[...stage.querySelectorAll('img')].some(image=>!image.complete);
  if(!stage||document.querySelector('.exam-pages-loading')||assetsPending){setTimeout(printExamPdf,200);return;}
  const originalDocumentTitle=document.title,title=(document.getElementById('exam-title')?.value||'Exam').trim();
  document.title=title;
  document.body.classList.add('printing-exam');
  window.print();
  setTimeout(()=>{document.body.classList.remove('printing-exam');document.title=originalDocumentTitle;},500);
}
