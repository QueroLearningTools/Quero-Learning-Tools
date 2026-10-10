// Create Question editor, metadata, answer templates, and question save/edit logic.

function renderBankTabs(){const tabs=document.getElementById('bank-tabs');if(tabs){tabs.innerHTML=allQuestionBanks().map(b=>`<button class="bank-tab${b.id===activeBankFilter?' active':''}" onclick="setBankFilter('${esc(b.id)}')" data-bank-tab="${esc(b.id)}"><i class="ti ${esc(b.icon||'ti-folder')}"></i>${esc(b.name)}</button>`).join('')+(isAdminRole()?`<button class="bank-tab" type="button" onclick="toggleBankManager()"><i class="ti ti-plus"></i>Create Bank</button>`:'');}renderBankManagerList();}
function renderAddQBankTabs(){const tabs=document.getElementById('addq-bank-tabs');if(!tabs)return;tabs.innerHTML=allQuestionBanks().map(b=>`<button class="bank-tab${b.id===activeAddQBankFilter?' active':''}" onclick="setAddQBankFilter('${esc(b.id)}')" data-addq-bank-tab="${esc(b.id)}"><i class="ti ${esc(b.icon||'ti-folder')}"></i>${esc(b.name)}</button>`).join('');}
function syncBankTabs(){if(!bankExists(activeBankFilter))activeBankFilter='private';if(!bankExists(activeAddQBankFilter))activeAddQBankFilter=activeBankFilter;renderBankTabs();renderAddQBankTabs();syncBankSelectOptions('f-bank',document.getElementById('f-bank')?.value);syncBankSelectOptions('extractor-global-bank',document.getElementById('extractor-global-bank')?.value);}
function toggleBankManager(){const panel=document.getElementById('bank-manager-panel');if(panel)panel.classList.toggle('open');renderBankManagerList();}
function renderBankManagerList(){const list=document.getElementById('bank-manager-list');if(!list)return;const rows=normaliseCustomBanks(customBanks);list.innerHTML=rows.length?rows.map(b=>{const count=questions.filter(q=>(q.bank||'private')===b.id).length;return `<div class="bank-manager-row"><div><strong>${esc(b.name)}</strong><span style="color:var(--color-text-secondary)"> - ${esc(b.visibility)} - ${count} question${count===1?'':'s'}</span></div><div class="bank-manager-row-actions"><button class="btn btn-sm" type="button" onclick="renameCustomBank('${esc(b.id)}')"><i class="ti ti-pencil"></i>Rename</button><button class="icon-btn" type="button" onclick="removeCustomBank('${esc(b.id)}')" title="Remove bank" style="color:#A32D2D"><i class="ti ti-trash"></i></button></div></div>`;}).join(''):'<div class="bank-manager-note">No custom banks yet.</div>';}
function createCustomBank(){if(!isAdminRole()){showToast('Admin access only',true);return;}const name=(document.getElementById('new-bank-name')?.value||'').trim(),visibility=document.getElementById('new-bank-visibility')?.value||'private';if(!name){showToast('Bank name is required',true);return;}if(allQuestionBanks().some(b=>b.name.toLowerCase()===name.toLowerCase())){showToast('A bank with that name already exists',true);return;}let id=`custom-${bankSlug(name)}`,base=id,n=2;while(bankExists(id))id=`${base}-${n++}`;customBanks=normaliseCustomBanks([...customBanks,{id,name,visibility,createdAt:new Date().toISOString()}]);document.getElementById('new-bank-name').value='';activeBankFilter=id;syncBankTabs();saveState();renderBank();renderAddQList();updateStats();showToast('Bank created');}
function renameCustomBank(id){if(!isAdminRole())return;const bank=normaliseCustomBanks(customBanks).find(b=>b.id===id);if(!bank)return;const name=prompt('Bank name',bank.name);if(name===null)return;const clean=name.trim();if(!clean){showToast('Bank name is required',true);return;}if(allQuestionBanks().some(b=>b.id!==id&&b.name.toLowerCase()===clean.toLowerCase())){showToast('A bank with that name already exists',true);return;}customBanks=normaliseCustomBanks(customBanks).map(b=>b.id===id?{...b,name:clean}:b);syncBankTabs();saveState();renderBank();renderAddQList();updateStats();showToast('Bank renamed');}
function removeCustomBank(id){if(!isAdminRole())return;const count=questions.filter(q=>(q.bank||'private')===id).length;if(count){showToast('Move questions out of this bank before removing it',true);return;}customBanks=normaliseCustomBanks(customBanks).filter(b=>b.id!==id);if(activeBankFilter===id)activeBankFilter='private';if(activeAddQBankFilter===id)activeAddQBankFilter='private';syncBankTabs();saveState();renderBank();renderAddQList();updateStats();showToast('Bank removed');}
function isTeacherRole(){return currentRole==='teacher';}
function isSTeacherRole(){return currentRole==='s_teacher';}
function isProtectedTeacherRole(){return isSTeacherRole()||isTeacherRole();}
function isStudentRole(){return currentRole==='student';}
function isSStudentRole(){return currentRole==='s_student';}
function isProtectedStudentRole(){return isSStudentRole()||isStudentRole();}
function enforceTeacherAddQBank(){if(isTeacherRole())activeAddQBankFilter='global';}
function setBankFilter(bank){activeBankFilter=bankExists(bank)?bank:'private';syncBankTabs();saveState();renderBank();}
function setAddQBankFilter(bank){if(isTeacherRole()&&bank!=='global'){activeAddQBankFilter='global';showToast('Teacher role can only add questions from Live Quiz Bank',true);}else activeAddQBankFilter=bankExists(bank)?bank:'private';syncBankTabs();saveState();renderAddQList();}function normaliseAppRole(role){const map={moderator:'s_teacher',sstudent:'s_student'};const value=map[String(role||'').toLowerCase()]||String(role||'').toLowerCase();return ['admin','s_teacher','s_student','teacher','student'].includes(value)?value:'admin';}
function canEditQuestionBankItem(q){const bank=q?.bank||'private';if(isTeacherRole())return false;return !isSTeacherRole()||bank==='private';}
function canDeleteQuestionBankItem(q){return !isProtectedTeacherRole();}
function teacherMonthlyExportUser(){return String(currentUser?.id||currentUser?.email||'local').replace(/[^a-z0-9_.-]/gi,'_');}
function teacherMonthlyExportKey(kind){const d=new Date(),month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;return `brainforge_teacher_export_${kind}_${teacherMonthlyExportUser()}_${month}`;}
function teacherMonthlyExportCount(kind){return Number(localStorage.getItem(teacherMonthlyExportKey(kind))||0);}
function canUseTeacherMonthlyExport(kind){if(!isTeacherRole())return true;const count=teacherMonthlyExportCount(kind),label=kind==='answers'?'answer':'normal';if(count>=5){showToast(`Teacher monthly ${label} export limit reached: 5 of 5`,true);return false;}return true;}
function recordTeacherMonthlyExport(kind){if(!isTeacherRole())return;const key=teacherMonthlyExportKey(kind);localStorage.setItem(key,String(teacherMonthlyExportCount(kind)+1));}
function prepareQuestionForExam(q){return JSON.parse(JSON.stringify(q));}
function canUseTeacherQuestionSet(items){if(!isTeacherRole())return true;const blocked=(items||[]).some(q=>(q.bank||'private')!=='global');if(blocked){showToast('Teacher role can only use Live Quiz Bank questions in Exam Builder',true);return false;}return true;}
function setAppRole(role,rerender=true){
  currentRole=normaliseAppRole(role);
  enforceTeacherAddQBank();
  const app=document.getElementById('app'),sel=document.getElementById('app-role'),note=document.getElementById('role-note');
  if(app){
    app.classList.toggle('role-s-teacher',currentRole==='s_teacher');
    app.classList.toggle('role-teacher',currentRole==='teacher');
    app.classList.toggle('role-student',currentRole==='student'||currentRole==='s_student');
  }
  if(sel)sel.value=currentRole;
  const notes={admin:'Full access',s_teacher:'S.Teacher: Home, Exam Builder, My Papers, Study Mode, and Live Quiz',s_student:'S.Student: Home, Study Mode, and Live Quiz',teacher:'Teacher: Home, Exam Builder, My Papers, Study Mode, and Live Quiz',student:'Student: Home, Study Mode, and Live Quiz'};
  if(note)note.textContent=notes[currentRole]||notes.admin;
  updateSignedInLabel();
  const protectedTeacher=isProtectedTeacherRole();
  const protectedStudent=isProtectedStudentRole();
  const allNavIds=['nav-home','nav-classroom-archive','nav-bank','nav-deleted','nav-extractor','nav-curriculum','nav-schools','nav-create','nav-builder','nav-papers','nav-admin-users'];
  const teacherNavIds=new Set(['nav-home','nav-classroom-archive','nav-builder','nav-papers']);
  const studentNavIds=new Set(['nav-home']);
  const setNavVisibility=(allowedIds=null)=>{
    allNavIds.forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      const visible=!allowedIds||allowedIds.has(id);
      el.hidden=!visible;
      el.style.display=visible?'flex':'none';
    });
  };
  if(protectedStudent){
    setNavVisibility(studentNavIds);
    const restrictedOpen=['view-classroom-archive','view-bank','view-create','view-builder','view-addq','view-papers','view-deleted','view-extractor','view-curriculum','view-schools','view-admin-users'].some(id=>{const el=document.getElementById(id);return el&&el.style.display!=='none';});
    if(restrictedOpen)setTimeout(()=>showView('home'),0);
  }else if(protectedTeacher){
    setNavVisibility(teacherNavIds);
    const restrictedOpen=['view-bank','view-create','view-deleted','view-extractor','view-curriculum','view-schools','view-admin-users'].some(id=>{const el=document.getElementById(id);return el&&el.style.display!=='none';});
    if(restrictedOpen)setTimeout(()=>showView('home'),0);
  }else{
    setNavVisibility(currentRole==='admin'?null:new Set(['nav-home','nav-classroom-archive','nav-bank','nav-create','nav-builder','nav-papers']));
  }
  if(protectedTeacher&&editingId){const q=questions.find(x=>x.id===editingId);if(q&&!canEditQuestionBankItem(q)){editingId=null;showView('home');}}
  if(rerender){syncBankTabs();renderSchoolManager();renderBank();renderExam();renderPapers();renderAddQList();updateStats();saveState();}
}function bankQuestionActions(q,key){
const editLocked=!canEditQuestionBankItem(q),deleteLocked=!canDeleteQuestionBankItem(q),editBtn=editLocked?'':`<button class="icon-btn" onclick="editQuestion(${q.id})" title="Edit"><i class="ti ti-edit"></i></button>`,deleteBtn=deleteLocked?'':`<button class="icon-btn" onclick="deleteQuestion(${q.id})" title="Delete"><i class="ti ti-trash"></i></button>`,editDelete=editBtn+deleteBtn;
  const note=editLocked?`<span title="S.Teacher read-only for Brain Forge, VCAA, and Global banks" style="font-size:11px;color:var(--color-text-tertiary);padding:4px 5px">Read-only</span>`:(deleteLocked?`<span title="S.Teacher cannot delete questions" style="font-size:11px;color:var(--color-text-tertiary);padding:4px 5px">No delete</span>`:'');
  return `<div class="q-actions">${collapseButton(key)}${editDelete}${note}<button class="icon-btn" onclick="addToExamDirect(${q.id})" title="Add to exam"><i class="ti ti-clipboard-plus"></i></button></div>`;
}
function mcTemplateLabel(t){return t==='diagram'?'Diagram':t==='multiple'?'Multiple':'Standard';}
function questionTextHtml(q){return q.textHtml||esc(q.text||'');}
function multipleInstructionRange(startNumber,count){const start=Math.max(1,startNumber||1),end=start+Math.max(2,count||2)-1;return end===start+1?`Use the following information to answer Questions ${start} and ${end}.`:`Use the following information to answer Questions ${start} - ${end}.`;}
function multipleSubQuestionBodyHtml(sq){let html=`<div class="q-text">${sq.questionHtml||esc(sq.question||'')}</div>`;html+=mcContentBlocksHtml(sq);return html;}function questionContentHtml(q,startNumber=1){const template=q.template||'standard';let html=`<div class="q-text">${questionTextHtml(q)}</div>`;if(q.type==='mc'&&template==='multiple'&&q.subQuestions?.length){html=`<div class="q-text multiple-instruction" style="font-weight:700">${esc(multipleInstructionRange(startNumber,q.subQuestions.length))}</div>`+html;}else if(q.type==='mc'&&template==='multiple'&&q.multiInstruction){html=`<div class="q-text multiple-instruction" style="font-weight:700">${esc(q.multiInstruction)}</div>`+html;}if((q.type==='mc'||q.type==='tf'||q.type==='sa'||q.type==='er')&&q.imageData){html+=`<img class="q-diagram" src="${q.imageData}" alt="${esc(q.imageName||'Question diagram')}">`;}if((q.type==='mc'||q.type==='tf'||q.type==='sa'||q.type==='er')&&q.source){html+=`<div class="q-text" style="font-size:12px;color:var(--color-text-secondary)">${sourceTypeLabel(q.sourceType)}: ${esc(q.source)}</div>`;}if((q.type==='mc'||q.type==='tf'||q.type==='sa'||q.type==='er')&&q.afterText){html+=`<div class="q-text">${q.afterTextHtml||esc(q.afterText)}</div>`;}if(q.type==='mc'&&template==='diagram'&&q.imageData2){html+=`<img class="q-diagram" src="${q.imageData2}" alt="${esc(q.imageName2||'Question diagram')}">`;}if(q.type==='mc'&&template==='diagram'&&q.source2){html+=`<div class="q-text" style="font-size:12px;color:var(--color-text-secondary)">${sourceTypeLabel(q.sourceType2)}: ${esc(q.source2)}</div>`;}if(q.type==='mc'&&template==='diagram'&&q.afterText2){html+=`<div class="q-text">${q.afterText2Html||esc(q.afterText2)}</div>`;}if((q.type==='sa'||q.type==='er')&&q.parts&&q.parts.length){html+=saerPartsHtml(q.parts);}if(q.type==='mc'&&template==='multiple'&&q.subQuestions&&q.subQuestions.length){html+=`<div class="options-list">${q.subQuestions.map((sq,si)=>`<div class="subquestion-card"><div class="subquestion-title">Question ${startNumber+si}</div>${multipleSubQuestionBodyHtml(sq)}${multipleSubQuestionOptionsHtml(sq)}</div>`).join('')}</div>`;}return html;}
function optionDisplayHtml(q,i){const html=q.optionsHtml&&q.optionsHtml[i]?q.optionsHtml[i]:esc((q.options||[])[i]||'');const im=q.optionImages&&q.optionImages[i]?q.optionImages[i]:{};if(q.optionTemplate==='diagram1'){return `<div class="diagram1-option-display">${html?`<div class="q-text">${html}</div>`:''}${im.data?`<img class="option-image-preview" src="${im.data}" alt="${esc(im.name||'Option image')}">`:''}</div>`;}if((q.optionTemplate==='diagram'||q.optionTemplate==='diagram2')&&im.data)return`<img class="option-image-preview" src="${im.data}" alt="${esc(im.name||'Option image')}">`;return html;}
function optionTableHtmlFromState(t,correct){if(!t||!t.rows)return'';const cols=t.cols||((t.headers||[]).length||2);return`<table class="mc-option-table-display"><thead><tr>${[...Array(cols)].map((_,c)=>`<th>${t.headerHtml&&t.headerHtml[c]?t.headerHtml[c]:esc((t.headers||[])[c]||'')}</th>`).join('')}</tr></thead><tbody>${[0,1,2,3].map(r=>`<tr class="${r===correct?'correct':''}">${[...Array(cols)].map((_,c)=>{const cell=t.rows[r]&&t.rows[r][c]?t.rows[r][c]:{};return`<td>${cell.html||esc(cell.text||'')}</td>`;}).join('')}</tr>`).join('')}</tbody></table>`;}
function optionTableHtml(q){return optionTableHtmlFromState(q.optionTable,q.correct);}
function answerOptionsHtml(q){if(q.type==='mc'&&q.optionTemplate==='table')return optionTableHtml(q);if(q.type==='mc'&&(q.optionTemplate==='diagram1'||q.optionTemplate==='diagram2'||q.optionTemplate==='diagram'))return`<div class="${q.optionTemplate==='diagram2'?'options-list option-image-large':'option-image-grid'}">${[0,1,2,3].map(i=>`<div class="option-row${i===q.correct?' correct':''}"><i class="ti ti-${i===q.correct?'check':'circle'}" style="font-size:12px"></i><span>${optionDisplayHtml(q,i)}</span></div>`).join('')}</div>`;if((q.type==='mc'||q.type==='tf')&&q.options)return`<div class="options-list">${(q.options||[]).map((o,i)=>`<div class="option-row${i===q.correct?' correct':''}"><i class="ti ti-${i===q.correct?'check':'circle'}" style="font-size:12px"></i><span>${optionDisplayHtml(q,i)}</span></div>`).join('')}</div>`;return'';}
function multipleSubQuestionOptionsHtml(sq){const template=sq.optionTemplate||'standard';if(template==='table')return optionTableHtmlFromState(sq.optionTable,sq.correct||0);if((template==='diagram1'||template==='diagram2'||template==='diagram')&&sq.optionImages)return`<div class="${template==='diagram2'?'options-list option-image-large':'option-image-grid'}">${[0,1,2,3].map(i=>{const im=sq.optionImages&&sq.optionImages[i]?sq.optionImages[i]:{},html=sq.optionsHtml&&sq.optionsHtml[i]?sq.optionsHtml[i]:esc((sq.options||[])[i]||'');const body=template==='diagram1'?`<div class="diagram1-option-display">${html?`<div class="q-text">${html}</div>`:''}${im.data?`<img class="option-image-preview" src="${im.data}" alt="${esc(im.name||'Option image')}">`:''}</div>`:(im.data?`<img class="option-image-preview" src="${im.data}" alt="${esc(im.name||'Option image')}">`:esc(im.name||''));return`<div class="option-row${i===(sq.correct||0)?' correct':''}"><i class="ti ti-${i===(sq.correct||0)?'check':'circle'}" style="font-size:12px"></i><span>${body}</span></div>`;}).join('')}</div>`;return`<div class="options-list">${(sq.options||[]).map((o,i)=>`<div class="option-row${i===(sq.correct||0)?' correct':''}"><i class="ti ti-${i===(sq.correct||0)?'check':'circle'}" style="font-size:12px"></i><span>${sq.optionsHtml&&sq.optionsHtml[i]?sq.optionsHtml[i]:esc(o||'')}</span></div>`).join('')}</div>`;}
function plainTextFromHtml(html){const div=document.createElement('div');div.innerHTML=html||'';return div.innerText.trim();}function hasRichContent(html,text){return !!((plainTextFromHtml(html)||String(text||'').trim())||/<img\b|bf-equation|data-latex/i.test(String(html||'')));}
const SIMILARITY_STOPWORDS=new Set('a an and are as at be by for from has have in into is it its of on or that the their them then there this to use using was were when where which with your you question answer following'.split(' '));
let similarityTimer=null;
function similarityTokens(text){return String(text||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!SIMILARITY_STOPWORDS.has(w));}
function similarityBigrams(tokens){const out=[];for(let i=0;i<tokens.length-1;i++)out.push(tokens[i]+' '+tokens[i+1]);return out;}
function jaccardScore(a,b){const A=new Set(a),B=new Set(b);if(!A.size||!B.size)return 0;let hit=0;A.forEach(x=>{if(B.has(x))hit++;});return hit/(A.size+B.size-hit);}
function similarityScore(aText,bText){const a=similarityTokens(aText),b=similarityTokens(bText);if(a.length<3||b.length<3)return 0;const tokenScore=jaccardScore(a,b),phraseScore=jaccardScore(similarityBigrams(a),similarityBigrams(b));return Math.round((tokenScore*.72+phraseScore*.28)*100);}
function questionSearchText(q){let parts=[plainTextFromHtml(q.textHtml)||q.text||'',q.source||'',q.topic||'',q.subtopic||''];if(q.afterTextHtml||q.afterText)parts.push(plainTextFromHtml(q.afterTextHtml)||q.afterText);if(q.optionsHtml)parts=parts.concat(q.optionsHtml.map(plainTextFromHtml));else if(q.options)parts=parts.concat(q.options);if(q.subQuestions)q.subQuestions.forEach(sq=>{parts.push(plainTextFromHtml(sq.questionHtml)||sq.question||'');if(sq.optionsHtml)parts=parts.concat(sq.optionsHtml.map(plainTextFromHtml));else if(sq.options)parts=parts.concat(sq.options);});return parts.filter(Boolean).join(' ');}
function questionCollapsedPreview(q,startNumber=1){if(q.type==='mc'&&q.template==='multiple'&&q.subQuestions?.length){const statement=plainTextFromHtml(q.textHtml)||q.text||'';return [multipleInstructionRange(startNumber,q.subQuestions.length),statement].filter(Boolean).join(' ');}return plainTextFromHtml(q.textHtml)||q.text||'Untitled question';}
function questionCollapsedSkillsPreview(q){const skills=Array.isArray(q?.skills)?q.skills.join(', '):String(q?.skills||'').trim();return skills?esc(skills):'';}
function questionCardCollapsed(key){return !collapsedQuestionCards.has(key);}
function collapseCardLine(q,key,startNumber=1,actionsHtml=''){const marks=Number(q.marks)||0,skillHtml=questionCollapsedSkillsPreview(q),previewHtml=skillHtml||esc(questionCollapsedPreview(q,startNumber));return`<div class="q-card-collapsed-line" onclick="toggleQuestionCollapse('${key}')"><button class="icon-btn" type="button" onclick="event.stopPropagation();toggleQuestionCollapse('${key}')" title="Expand question"><i class="ti ti-chevron-down"></i></button><div class="q-card-collapsed-text">${previewHtml}</div><div class="q-card-collapsed-meta"><span>${esc(q.date||'')}</span><span>${esc(q.author||'Original')}</span><span>(${marks} mark${marks===1?'':'s'})</span></div>${actionsHtml?`<div class="q-card-collapsed-actions">${actionsHtml}</div>`:''}</div>`;}
function collapseButton(key){const collapsed=questionCardCollapsed(key);return`<button class="icon-btn" type="button" onclick="event.stopPropagation();toggleQuestionCollapse('${key}')" title="${collapsed?'Expand':'Collapse'} question"><i class="ti ti-${collapsed?'chevron-down':'chevron-up'}"></i></button>`;}
function toggleQuestionCollapse(key){if(collapsedQuestionCards.has(key))collapsedQuestionCards.delete(key);else collapsedQuestionCards.add(key);if(key.startsWith('bank-'))renderBank();else renderExam();}
const questionContentHtmlOriginal=questionContentHtml;
questionContentHtml=function(q,startNumber=1){
  if(q&&(q.type==='sa'||q.type==='er')){
    let html=`<div class="q-text">${questionTextHtml(q)}</div>`;
    html+=saerExtraBlocksHtml(q);
    if(q.parts&&q.parts.length)html+=saerPartsHtml(q.parts);
    return html;
  }
  if(q&&q.type==='mc'&&(q.template||'standard')==='diagram'){
    let html=`<div class="q-text">${questionTextHtml(q)}</div>`;
    html+=mcContentBlocksHtml(q);
    return html;
  }
  if(q&&q.type==='mc'&&(q.template||'standard')==='multiple'){
    const count=q.subQuestions?.length||2;
    let html=`<div class="q-text multiple-instruction" style="font-weight:700">${esc(multipleInstructionRange(startNumber,count))}</div>`;
    if(hasRichContent(q.textHtml,q.text))html+=`<div class="q-text">${questionTextHtml(q)}</div>`;
    html+=mcContentBlocksHtml(q);
    if(q.subQuestions&&q.subQuestions.length)html+=`<div class="options-list">${q.subQuestions.map((sq,si)=>`<div class="subquestion-card"><div class="subquestion-title">Question ${startNumber+si}</div>${multipleSubQuestionBodyHtml(sq)}${multipleSubQuestionOptionsHtml(sq)}</div>`).join('')}</div>`;
    return html;
  }
  return questionContentHtmlOriginal(q,startNumber);
};function currentCreateSearchText(){const root=document.getElementById('view-create');if(!root)return'';const ids=['f-text','f-multi-question','f-after-text'];let parts=ids.map(id=>plainTextFromHtml(storedHtmlFrom(document.getElementById(id))));root.querySelectorAll('[id^="opt-"],[id^="multi-q-"],[id^="opt-table-"],[id^="multi-opt-table-"]').forEach(el=>{if(el.isContentEditable)parts.push(plainTextFromHtml(storedHtmlFrom(el)));});return parts.filter(Boolean).join(' ');}
function scheduleSimilarityCheck(){clearTimeout(similarityTimer);similarityTimer=setTimeout(renderSimilarityChecker,180);}
function renderSimilarityChecker(){const panel=document.getElementById('similarity-panel');if(!panel)return;const text=currentCreateSearchText(),tokens=similarityTokens(text);if(tokens.length<4){panel.innerHTML=`<div class="similarity-head"><span><i class="ti ti-copy-check"></i> Similarity check</span><span class="similarity-status">Ready</span></div><div class="similarity-empty">Start typing to compare this question with the question bank.</div>`;return;}const matches=questions.filter(q=>q.id!==editingId).map(q=>({q,score:similarityScore(text,questionSearchText(q))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);const top=matches[0]?.score||0,status=top>=75?'high':top>=45?'medium':'low',label=top>=75?'High similarity':top>=45?'Possible overlap':'Low similarity';if(!matches.length){panel.innerHTML=`<div class="similarity-head"><span><i class="ti ti-copy-check"></i> Similarity check</span><span class="similarity-status">Low similarity</span></div><div class="similarity-empty">No close matches found in the question bank.</div>`;return;}panel.innerHTML=`<div class="similarity-head"><span><i class="ti ti-copy-check"></i> Similarity check</span><span class="similarity-status ${status}">${label}: ${top}%</span></div><div class="similarity-list">${matches.map(({q,score})=>`<div class="similarity-match"><div class="similarity-match-top"><span>${score}% similar - ${bankLabel(q.bank||'private')}</span><span>${typeShort(q.type)}</span></div><div class="similarity-preview">${esc(questionSearchText(q).slice(0,260))}</div></div>`).join('')}</div>`;}
function cleanEmptyEditor(el){if(!el||!el.isContentEditable)return;const hasMedia=!!el.querySelector('img,table,.bf-equation');if(!hasMedia&&plainTextFromHtml(el.innerHTML)==='')el.innerHTML='';}
function scrubCreateEditorFont(el){if(!el||!el.closest?.('#view-create')||el.classList.contains('paste-zone'))return;el.querySelectorAll?.('*').forEach(node=>{if(node.closest('.bf-equation'))return;if(node.style){node.style.fontFamily='';node.style.fontSize='';node.style.lineHeight='';node.style.fontStretch='';node.style.fontVariant='';if(!node.getAttribute('style')?.trim())node.removeAttribute('style');}if(node.tagName==='FONT'){node.removeAttribute('face');node.removeAttribute('size');if(!node.attributes.length){while(node.firstChild)node.parentNode.insertBefore(node.firstChild,node);node.remove();}}});}
function normalizeParagraphBlocks(el){if(!el||!el.isContentEditable||!el.closest('#view-create'))return;const blockTags=new Set(['DIV','P','UL','OL','TABLE']);const hasBlock=[...el.childNodes].some(n=>n.nodeType===1&&blockTags.has(n.tagName));if(!hasBlock)return;while(el.firstChild&&(el.firstChild.nodeType===3||(el.firstChild.nodeType===1&&!blockTags.has(el.firstChild.tagName)&&el.firstChild.tagName!=='BR'))){let wrap=el.firstChild&&el.firstChild.tagName==='DIV'?el.firstChild:document.createElement('div');if(wrap.parentNode!==el)el.insertBefore(wrap,el.firstChild);while(wrap.nextSibling&&(wrap.nextSibling.nodeType===3||(wrap.nextSibling.nodeType===1&&!blockTags.has(wrap.nextSibling.tagName)&&wrap.nextSibling.tagName!=='BR')))wrap.appendChild(wrap.nextSibling);if(wrap.textContent.trim()==='')break;}}
function plainTextPasteHtml(text){const lines=String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');return lines.length>1?lines.map(line=>`<div>${esc(line)||'<br>'}</div>`).join(''):esc(lines[0]||'');}
function sanitizedPasteHtml(data){return plainTextPasteHtml(data.getData('text/plain')||'');}
function clipboardImageFile(data){const items=data&&data.items;if(!items)return null;for(const item of items){if(item.type&&/^image\/(png|jpeg|jpg)$/.test(item.type))return item.getAsFile();}return null;}
function insertInlineImageFile(file,target){if(!file)return;const reader=new FileReader();reader.onload=()=>{target.focus();document.execCommand('insertHTML',false,`<img class="inline-paste-image" src="${reader.result}" alt="Pasted image">&nbsp;`);rememberCreateSelection();normalizeParagraphBlocks(target);cleanEmptyEditor(target);};reader.readAsDataURL(file);}
function handleCreateEditorPaste(e){const target=e.target;if(!target||!target.isContentEditable||!target.closest('#view-create')||target.classList.contains('paste-zone'))return;e.preventDefault();document.execCommand('insertHTML',false,sanitizedPasteHtml(e.clipboardData));setTimeout(()=>{scrubCreateEditorFont(target);normalizeParagraphBlocks(target);cleanEmptyEditor(target);renderKatexIn(target);scheduleSimilarityCheck();},0);}
function stripEditorArtifacts(html){return String(html||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/&#8203;|&#8204;|&#8205;|&#8288;|&#65279;/gi,'');}
function storedHtmlFrom(el){if(!el)return'';scrubCreateEditorFont(el);const clone=el.cloneNode(true);clone.querySelectorAll?.('.bf-equation').forEach(eq=>{const latex=eq.dataset.latex||eq.textContent||'';eq.innerHTML=esc(latex);});return stripEditorArtifacts(clone.innerHTML).trim();}
function getQuestionHtml(){return storedHtmlFrom(document.getElementById('f-text'));}
function getQuestionText(){return plainTextFromHtml(getQuestionHtml());}
function getSolutionHtml(){return storedHtmlFrom(document.getElementById('f-solution'));}
function getSolutionText(){return plainTextFromHtml(getSolutionHtml());}
function setSolutionHtml(html){const el=document.getElementById('f-solution');if(!el)return;el.innerHTML=html||'';renderKatexIn(el);}
function setQuestionHtml(html){const el=document.getElementById('f-text');el.innerHTML=html||'';renderKatexIn(el);scheduleSimilarityCheck();}
function getMultipleQuestionHtml(){return storedHtmlFrom(document.getElementById('f-multi-question'));}
function getMultipleQuestionText(){return plainTextFromHtml(getMultipleQuestionHtml());}
function getAfterTextHtml(){return storedHtmlFrom(document.getElementById('f-after-text'));}
function getAfterTextText(){return plainTextFromHtml(getAfterTextHtml());}
let savedCreateRange=null;
let editingEquationEl=null;
function renderKatexIn(root=document){if(typeof katex==='undefined')return;const items=[];if(root.classList?.contains('bf-equation'))items.push(root);root.querySelectorAll?.('.bf-equation').forEach(el=>items.push(el));items.forEach(el=>{const latex=el.dataset.latex||'';if(!latex)return;try{katex.render(latex,el,{throwOnError:false,output:'html'});}catch(e){el.textContent=latex;}});}
function renderAllTextBoxKatex(root=document){root.querySelectorAll?.('[contenteditable="true"],.q-text,.option-row,.option-table-cell,.instr-editable').forEach(el=>renderKatexIn(el));}
function latexEquationHtml(latex){return `<span class="bf-equation" contenteditable="false" data-latex="${esc(latex)}">${esc(latex)}</span>&nbsp;`;}
function clearEquationSelection(){editingEquationEl?.classList.remove('editing');editingEquationEl=null;}
function insertLatexFromToolbar(){const input=document.getElementById('latex-inline-input'),latex=(input?.value||'').trim();if(!latex)return;const ed=getActiveEditor();if(editingEquationEl){const owner=editingEquationEl.closest('[contenteditable="true"]')||ed;editingEquationEl.dataset.latex=latex;renderKatexIn(editingEquationEl);clearEquationSelection();if(input)input.value='';owner.focus();rememberCreateSelection();updateQuestionToolbar();return;}restoreCreateSelection();document.execCommand('insertHTML',false,latexEquationHtml(latex));renderKatexIn(ed);if(input)input.value='';ed.focus();rememberCreateSelection();updateQuestionToolbar();}
function handleLatexInputKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();insertLatexFromToolbar();}}
function ensureLatexTextarea(){
  const wrap=document.querySelector('#question-toolbar .latex-inline-wrap'),input=document.getElementById('latex-inline-input');
  if(!wrap||!input||document.getElementById('latex-popover'))return;
  input.style.display='none';
  const btn=document.createElement('button');
  btn.type='button';btn.className='latex-open-btn';btn.title='Open LaTeX editor';btn.innerHTML='<i class="ti ti-math-function"></i>LaTeX';
  wrap.insertBefore(btn,input);
  const pop=document.createElement('span');
  pop.id='latex-popover';pop.className='latex-popover';
  pop.innerHTML='<textarea id="latex-popover-input" placeholder="Type LaTeX here. Enter inserts, Shift+Enter adds a new line."></textarea><span class="latex-popover-actions"><button type="button" class="btn secondary" id="latex-popover-close">Close</button><button type="button" class="btn" id="latex-popover-insert">Insert</button></span>';
  wrap.appendChild(pop);
  const big=pop.querySelector('textarea');
  const place=()=>{const r=btn.getBoundingClientRect(),view=document.getElementById('view-create')?.getBoundingClientRect()||{left:16,right:window.innerWidth-16},workLeft=view.left+24,workRight=view.right-24,workWidth=Math.max(280,workRight-workLeft);let width=Math.min(720,Math.max(320,workWidth*.64));width=Math.min(width,workWidth);const left=Math.max(workLeft,workRight-width);pop.style.width=width+'px';pop.style.left=left+'px';pop.style.right='auto';pop.style.top=(r.bottom+8)+'px';};
  const open=()=>{pop.classList.add('open');big.value=input.value||'';place();setTimeout(()=>{place();big.focus();big.select();},0);};
  window.__openLatexPopover=open;
  btn.addEventListener('mousedown',e=>{e.preventDefault();rememberCreateSelection();open();});
  window.addEventListener('resize',()=>{if(pop.classList.contains('open'))place();});
  input.addEventListener('focus',open);
  input.addEventListener('click',open);
  big.addEventListener('input',()=>{input.value=big.value;});
  big.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();input.value=big.value;insertLatexFromToolbar();pop.classList.remove('open');}});
  pop.querySelector('#latex-popover-insert').addEventListener('mousedown',e=>{e.preventDefault();input.value=big.value;insertLatexFromToolbar();pop.classList.remove('open');});
  pop.querySelector('#latex-popover-close').addEventListener('mousedown',e=>{e.preventDefault();pop.classList.remove('open');});
}
function editLatexEquation(el){clearEquationSelection();editingEquationEl=el;editingEquationEl.classList.add('editing');const owner=el.closest('[contenteditable="true"]');if(owner?.id)activeEditorId=owner.id;const r=document.createRange(),s=window.getSelection();r.setStartAfter(el);r.collapse(true);s.removeAllRanges();s.addRange(r);savedCreateRange=r.cloneRange();const input=document.getElementById('latex-inline-input');if(input){input.value=el.dataset.latex||el.textContent||'';setTimeout(()=>{if(window.__openLatexPopover)window.__openLatexPopover();else input.focus();},0);}}
function rememberCreateSelection(){const s=window.getSelection();if(!s||!s.rangeCount)return;const node=s.anchorNode,el=node&&node.nodeType===1?node:node?.parentElement;if(el&&el.closest&&el.closest('#view-create')&&el.closest('[contenteditable="true"]'))savedCreateRange=s.getRangeAt(0).cloneRange();}
function restoreCreateSelection(){const ed=getActiveEditor();ed.focus();const s=window.getSelection();if(savedCreateRange&&ed.contains(savedCreateRange.commonAncestorContainer)){s.removeAllRanges();s.addRange(savedCreateRange);return true;}return false;}
function setActiveEditor(id){activeEditorId=id;try{document.execCommand('defaultParagraphSeparator',false,'div');}catch(e){}setTimeout(rememberCreateSelection,0);updateQuestionToolbar();}
function getActiveEditor(){return document.getElementById(activeEditorId)||document.getElementById('f-text');}
function ensureVisibleEditorTarget(){const builder=document.getElementById('view-builder');if(builder&&builder.style.display!=='none'){const ed=getActiveEditor();if(!ed||!ed.closest('#view-builder')){const first=builder.querySelector('[data-instr-key]');if(first){setActiveEditor(first.id);first.focus();placeCaretIn(first);savedCreateRange=null;}}}}
function syncActiveBuilderEditor(){const ed=getActiveEditor();if(ed?.closest?.('.cover-page-body'))syncCoverPage();else if(ed?.dataset?.instrKey)syncInstrHTML();}function formatQuestionText(cmd){ensureVisibleEditorTarget();restoreCreateSelection();document.execCommand(cmd,false,null);rememberCreateSelection();syncActiveBuilderEditor();updateQuestionToolbar();}
function applyEditorFont(font){if(!font)return;ensureVisibleEditorTarget();restoreCreateSelection();document.execCommand('fontName',false,font);rememberCreateSelection();syncActiveBuilderEditor();updateQuestionToolbar();}
function toggleNumberingMenu(force,id='numbering-menu'){if(force===false&&!id){document.querySelectorAll('.toolbar-menu').forEach(m=>m.classList.remove('open'));return;}const menu=document.getElementById(id);if(!menu)return;document.querySelectorAll('.toolbar-menu').forEach(m=>{if(m!==menu)m.classList.remove('open');});menu.classList.toggle('open',typeof force==='boolean'?force:!menu.classList.contains('open'));}
function closestList(node,root){while(node&&node!==root){if(node.nodeType===1&&(node.tagName==='OL'||node.tagName==='UL'))return node;node=node.parentNode;}return null;}
function placeCaretIn(node){const r=document.createRange(),s=window.getSelection();r.setStart(node,0);r.collapse(true);s.removeAllRanges();s.addRange(r);}
function editorIsEmpty(ed){return !ed.querySelector('img,table,math,.bf-equation')&&plainTextFromHtml(ed.innerHTML)==='';}
function applyNumberedList(style){if(!style)return;toggleNumberingMenu(false);const ed=getActiveEditor();restoreCreateSelection();if(editorIsEmpty(ed)){ed.innerHTML=`<ol style="list-style-type:${style};"><li><br></li></ol>`;placeCaretIn(ed.querySelector('li'));rememberCreateSelection();syncActiveBuilderEditor();updateQuestionToolbar();return;}const before=[...ed.querySelectorAll('ol')];document.execCommand('insertOrderedList',false,null);let list=closestList(window.getSelection()?.anchorNode,ed);if(!list){const after=[...ed.querySelectorAll('ol')];list=after.find(x=>!before.includes(x))||after[after.length-1];}if(list){list.style.listStyleType=style;list.querySelectorAll('ol').forEach(ol=>ol.style.listStyleType=style);}rememberCreateSelection();syncActiveBuilderEditor();updateQuestionToolbar();}
function updateQuestionToolbar(){const tb=document.getElementById('question-toolbar');if(!tb)return;tb.querySelector('[data-q-cmd="bold"]')?.classList.toggle('active',document.queryCommandState('bold'));tb.querySelector('[data-q-cmd="italic"]')?.classList.toggle('active',document.queryCommandState('italic'));tb.querySelector('[data-q-cmd="underline"]')?.classList.toggle('active',document.queryCommandState('underline'));tb.querySelector('[data-q-cmd="subscript"]')?.classList.toggle('active',document.queryCommandState('subscript'));tb.querySelector('[data-q-cmd="superscript"]')?.classList.toggle('active',document.queryCommandState('superscript'));tb.querySelector('[data-q-cmd="insertUnorderedList"]')?.classList.toggle('active',document.queryCommandState('insertUnorderedList'));scheduleSimilarityCheck();}
function resetQuestionToolbarPin(){const tb=document.getElementById('question-toolbar'),ph=document.getElementById('question-toolbar-placeholder');if(tb){tb.classList.remove('toolbar-fixed');tb.style.top='';tb.style.left='';tb.style.width='';}if(ph)ph.style.height='0px';}
function syncQuestionToolbarPin(){const view=document.getElementById('view-create'),tb=document.getElementById('question-toolbar');if(!view||!tb||view.style.display==='none'){resetQuestionToolbarPin();return;}let ph=document.getElementById('question-toolbar-placeholder');if(!ph){ph=document.createElement('div');ph.id='question-toolbar-placeholder';ph.style.height='0px';tb.parentNode.insertBefore(ph,tb);}if(!tb.classList.contains('toolbar-fixed'))tb.dataset.pinTop=String(tb.offsetTop);const threshold=parseFloat(tb.dataset.pinTop||tb.offsetTop||0);const pin=view.scrollTop>threshold;if(pin){const r=view.getBoundingClientRect();ph.style.height=tb.offsetHeight+'px';tb.classList.add('toolbar-fixed');tb.style.top=r.top+'px';tb.style.left=(r.left+16)+'px';tb.style.width=(r.width-32)+'px';}else resetQuestionToolbarPin();}
function resetBuilderInstructionToolbarPin(){}
function syncBuilderInstructionToolbarPin(){}
function refreshQuestionToolbarPin(){const tb=document.getElementById('question-toolbar');if(tb)delete tb.dataset.pinTop;resetQuestionToolbarPin();syncQuestionToolbarPin();}
function optionHtmlAt(i){const el=document.getElementById('opt-'+i);if(!el)return'';if('value'in el)return esc(el.value||'');return storedHtmlFrom(el);}
function optionTextAt(i){return plainTextFromHtml(optionHtmlAt(i));}
function optionTemplateLabel(t){return t==='diagram'||t==='diagram1'?'Hybrid options':t==='diagram2'?'Images options':t==='table'?'Table options':'Text options';}
function renderOptionTemplatePicker(template){if(template==='diagram')template='diagram1';return`<div class="option-template-wrap"><label>Multiple choice option type</label><div class="template-choices option-template-choices"><button type="button" class="template-choice${template==='standard'?' active':''}" data-option-template="standard" onclick="setOptionTemplate('standard')"><span class="template-choice-title">STANDARD</span><span class="template-choice-sub">Text options</span></button><button type="button" class="template-choice${template==='diagram1'?' active':''}" data-option-template="diagram1" onclick="setOptionTemplate('diagram1')"><span class="template-choice-title">HYBRID</span><span class="template-choice-sub">Text and images</span></button><button type="button" class="template-choice${template==='diagram2'?' active':''}" data-option-template="diagram2" onclick="setOptionTemplate('diagram2')"><span class="template-choice-title">IMAGES</span><span class="template-choice-sub">Large images</span></button><button type="button" class="template-choice${template==='table'?' active':''}" data-option-template="table" onclick="setOptionTemplate('table')"><span class="template-choice-title">TABLE</span><span class="template-choice-sub">Columns</span></button></div><input type="hidden" id="f-option-template" value="${template}"></div>`;}
function setOptionTemplate(template){const current=collectOptionState();window.__optionTemplateState=window.__optionTemplateState||{};window.__optionTemplateState[current.optionTemplate]=current;const next={...(window.__optionTemplateState[template]||{}),optionTemplate:template,correct:current.correct};renderMcOptions(next);}
function collectOptionImages(){return [0,1,2,3].map(i=>({data:(document.getElementById(`opt-img-data-${i}`)||{}).value||'',name:(document.getElementById(`opt-img-name-${i}`)||{}).value||''}));}
function editorHtmlById(id){const el=document.getElementById(id);if(!el)return'';return 'value'in el?esc(el.value||''):storedHtmlFrom(el);}
function editorTextById(id){return plainTextFromHtml(editorHtmlById(id));}
function renderTableCellEditor(id,placeholder,html){return`<div id="${id}" class="option-table-cell editable-text" contenteditable="true" data-placeholder="${esc(placeholder)}" onfocus="setActiveEditor('${id}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()" onpaste="handleTableCellPaste('${id}',event)">${html||''}</div><div class="table-cell-image-tools"><input type="file" accept="image/png,image/jpeg" onchange="handleTableCellUpload('${id}',event)"><button type="button" class="icon-btn" onclick="clearTableCellImages('${id}')" title="Remove images"><i class="ti ti-x"></i></button></div>`;}
function readTableCellImageFile(id,file){const el=document.getElementById(id);if(!el||!file)return;if(!/^image\/(png|jpeg|jpg)$/i.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);return;}insertInlineImageFile(file,el);setTimeout(()=>{scheduleSimilarityCheck();},0);}
function handleTableCellUpload(id,event){const file=event&&event.target&&event.target.files&&event.target.files[0];if(file)readTableCellImageFile(id,file);if(event&&event.target)event.target.value='';}
function handleTableCellPaste(id,event){const file=clipboardImageFile(event.clipboardData);if(!file)return;event.preventDefault();readTableCellImageFile(id,file);}
function clearTableCellImages(id){const el=document.getElementById(id);if(!el)return;el.querySelectorAll('img').forEach(img=>img.remove());cleanEmptyEditor(el);scheduleSimilarityCheck();}
function optionTableCellHtml(r,c){return storedHtmlFrom(document.getElementById(`opt-table-${r}-${c}`));}
function collectOptionTable(){const cols=Math.max(2,parseInt((document.getElementById('f-option-table-cols')||{}).value)||2);return{cols,headers:[...Array(cols)].map((_,c)=>editorTextById(`opt-table-head-${c}`)),headerHtml:[...Array(cols)].map((_,c)=>editorHtmlById(`opt-table-head-${c}`)),rows:[0,1,2,3].map(r=>[...Array(cols)].map((_,c)=>({text:plainTextFromHtml(optionTableCellHtml(r,c)),html:optionTableCellHtml(r,c)})))};}
function collectOptionState(){let template=document.getElementById('f-option-template')?.value||'standard';if(template==='diagram')template='diagram1';const r=document.querySelector('input[name=correct]:checked');const state={optionTemplate:template,correct:r?parseInt(r.value):0,options:[0,1,2,3].map(i=>optionTextAt(i)),optionsHtml:[0,1,2,3].map(i=>optionHtmlAt(i))};if(template==='diagram1'||template==='diagram2')state.optionImages=collectOptionImages();if(template==='table')state.optionTable=collectOptionTable();return state;}
function setOptionImage(i,data,name){document.getElementById(`opt-img-data-${i}`).value=data;document.getElementById(`opt-img-name-${i}`).value=name;document.getElementById(`opt-img-preview-${i}`).innerHTML=`<img class="option-image-preview" src="${data}" alt="${esc(name)}">`;}
function clearOptionImage(i){document.getElementById(`opt-img-data-${i}`).value='';document.getElementById(`opt-img-name-${i}`).value='';const input=document.querySelector(`input[data-option-file="${i}"]`);if(input)input.value='';document.getElementById(`opt-img-preview-${i}`).innerHTML='';}
function readOptionImageFile(i,file){if(!file)return;if(!/^image\/(png|jpeg)$/.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);return;}const reader=new FileReader();reader.onload=()=>setOptionImage(i,reader.result,file.name||'Pasted image');reader.readAsDataURL(file);}
function handleOptionUpload(i,event){const file=event.target.files&&event.target.files[0];if(file)readOptionImageFile(i,file);}
function handleOptionPaste(i,event){const items=event.clipboardData&&event.clipboardData.items;if(!items)return;for(const item of items){if(item.type&&/^image\/(png|jpeg)$/.test(item.type)){event.preventDefault();readOptionImageFile(i,item.getAsFile());return;}}showToast('Paste a PNG, JPG, or JPEG image',true);}
function changeOptionTableColumns(delta){const state=collectOptionState();const table=state.optionTable||{cols:2,headers:[],rows:[]};table.cols=Math.max(2,(table.cols||2)+delta);state.optionTemplate='table';state.optionTable=table;renderMcOptions(state);}
function renderOptionTableFields(table){const cols=Math.max(2,table&&table.cols?table.cols:2);const headers=table&&table.headers?table.headers:[];const headerHtml=table&&table.headerHtml?table.headerHtml:[];const rows=table&&table.rows?table.rows:[];return`<div class="form-group"><label>Columns</label><div style="display:flex;align-items:center;gap:8px"><button type="button" class="icon-btn" onclick="changeOptionTableColumns(-1)" title="Remove column"><i class="ti ti-minus"></i></button><input type="number" id="f-option-table-cols" min="2" value="${cols}" onchange="const s=collectOptionState();s.optionTable.cols=Math.max(2,parseInt(this.value)||2);renderMcOptions(s)" style="width:78px;text-align:center"><button type="button" class="icon-btn" onclick="changeOptionTableColumns(1)" title="Add column"><i class="ti ti-plus"></i></button></div></div><div class="option-table-wrap"><table class="option-table"><thead><tr><th></th>${[...Array(cols)].map((_,c)=>`<th><div id="opt-table-head-${c}" class="option-table-cell editable-text" contenteditable="true" data-placeholder="Heading ${c+1}" onfocus="setActiveEditor('opt-table-head-${c}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${headerHtml[c]||esc(headers[c]||'')}</div></th>`).join('')}</tr></thead><tbody>${[0,1,2,3].map(r=>`<tr><td class="option-table-letter"><input type="radio" name="correct" value="${r}"${r===(table&&table.correct||0)?' checked':''}></td>${[...Array(cols)].map((_,c)=>`<td>${renderTableCellEditor(`opt-table-${r}-${c}`,`Option ${String.fromCharCode(65+r)}, column ${c+1}`,rows[r]&&rows[r][c]?rows[r][c].html||esc(rows[r][c].text||''):'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function renderStandardOptions(opts,optHtml,corr){return`<label>Options <span style="font-size:11px;font-weight:400;color:var(--color-text-secondary)">(select correct answer)</span></label>${[0,1,2,3].map(i=>`<div class="option-input-row standard-option-row"><input type="radio" name="correct" value="${i}"${i===corr?' checked':''}><div class="rich-editor-wrap standard-option-editor-wrap"><div id="opt-${i}" class="rich-editor standard-option-editor editable-text" contenteditable="true" data-placeholder="Option ${String.fromCharCode(65+i)}" onfocus="setActiveEditor('opt-${i}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${optHtml[i]||esc(opts[i]||'')}</div></div></div>`).join('')}`;}
function renderDiagramOptions(template,imgs,corr,opts=[],optHtml=[]){const gridClass=template==='diagram1'?'option-image-grid':'options-list option-image-large';return`<label>Options <span style="font-size:11px;font-weight:400;color:var(--color-text-secondary)">(select correct answer)</span></label><div class="${gridClass}">${[0,1,2,3].map(i=>{const im=imgs[i]||{};const textEditor=template==='diagram1'?`<div class="rich-editor-wrap standard-option-editor-wrap" style="margin-bottom:6px"><div id="opt-${i}" class="rich-editor standard-option-editor editable-text" contenteditable="true" data-placeholder="Option ${String.fromCharCode(65+i)} text" onfocus="setActiveEditor('opt-${i}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${optHtml[i]||esc(opts[i]||'')}</div></div>`:'';return`<div class="option-input-row"><input type="radio" name="correct" value="${i}"${i===corr?' checked':''}><div class="option-image-card">${textEditor}<div style="display:flex;gap:6px;align-items:center"><input type="file" data-option-file="${i}" accept="image/png,image/jpeg" onchange="handleOptionUpload(${i},event)"><button type="button" class="btn btn-sm" onclick="clearOptionImage(${i})"><i class="ti ti-x"></i>Remove</button></div><div class="paste-zone" tabindex="0" onpaste="handleOptionPaste(${i},event)">Paste option image here, or choose a PNG/JPG/JPEG file.</div><input type="hidden" id="opt-img-data-${i}" value="${esc(im.data||'')}"><input type="hidden" id="opt-img-name-${i}" value="${esc(im.name||'')}"><div id="opt-img-preview-${i}">${im.data?`<img class="option-image-preview" src="${im.data}" alt="${esc(im.name||'Option image')}">`:''}</div></div></div>`;}).join('')}</div>`;}
function renderMcOptions(existing){let template=existing&&existing.optionTemplate?existing.optionTemplate:'standard';if(template==='diagram')template='diagram1';const opts=existing&&existing.options?existing.options:['','','',''],optHtml=existing&&existing.optionsHtml?existing.optionsHtml:[],corr=existing&&typeof existing.correct==='number'?existing.correct:0,imgs=existing&&existing.optionImages?existing.optionImages:[];const el=document.getElementById('mc-main-options');if(!el)return;let html=renderOptionTemplatePicker(template);if(template==='standard'){html+=renderStandardOptions(opts,optHtml,corr);}else if(template==='diagram1'||template==='diagram2'){html+=renderDiagramOptions(template,imgs,corr,opts,optHtml);}else{const table=existing&&existing.optionTable?{...existing.optionTable,correct:corr}:{cols:2,headers:['',''],rows:[],correct:corr};html+=renderOptionTableFields(table);}el.innerHTML=html;renderKatexIn(el);}function subQuestionHtmlAt(qi){return storedHtmlFrom(document.getElementById(`multi-q-${qi}`));}
function subQuestionTextAt(qi){return plainTextFromHtml(subQuestionHtmlAt(qi));}
function subQuestionAfterHtmlAt(qi){return storedHtmlFrom(document.getElementById(`multi-q-after-${qi}`));}
function subQuestionAfterTextAt(qi){return plainTextFromHtml(subQuestionAfterHtmlAt(qi));}
function subQuestionDiagramState(qi){return{imageData:(document.getElementById(`multi-q-img-data-${qi}`)||{}).value||'',imageName:(document.getElementById(`multi-q-img-name-${qi}`)||{}).value||'',source:(document.getElementById(`multi-q-source-${qi}`)||{}).value||'',sourceType:(document.getElementById(`multi-q-source-type-${qi}`)||{}).value||'source'};}
function subSolutionHtmlAt(qi){return storedHtmlFrom(document.getElementById(`multi-solution-${qi}`));}
function subSolutionTextAt(qi){return plainTextFromHtml(subSolutionHtmlAt(qi));}
function subOptionHtmlAt(qi,oi){return storedHtmlFrom(document.getElementById(`multi-q-${qi}-opt-${oi}`));}
function subOptionTextAt(qi,oi){return plainTextFromHtml(subOptionHtmlAt(qi));}
function subOptionImageState(qi){return [0,1,2,3].map(i=>({data:(document.getElementById(`multi-opt-img-data-${qi}-${i}`)||{}).value||'',name:(document.getElementById(`multi-opt-img-name-${qi}-${i}`)||{}).value||''}));}
function subOptionTableCellHtml(qi,r,c){return storedHtmlFrom(document.getElementById(`multi-opt-table-${qi}-${r}-${c}`));}
function collectSubOptionTable(qi){const cols=Math.max(2,parseInt((document.getElementById(`multi-option-table-cols-${qi}`)||{}).value)||2);return{cols,headers:[...Array(cols)].map((_,c)=>editorTextById(`multi-opt-table-head-${qi}-${c}`)),headerHtml:[...Array(cols)].map((_,c)=>editorHtmlById(`multi-opt-table-head-${qi}-${c}`)),rows:[0,1,2,3].map(r=>[...Array(cols)].map((_,c)=>({text:plainTextFromHtml(subOptionTableCellHtml(qi,r,c)),html:subOptionTableCellHtml(qi,r,c)})))};}
function collectMultipleOptionState(qi){let template=document.getElementById(`multi-option-template-${qi}`)?.value||'standard';if(template==='diagram')template='diagram1';const r=document.querySelector(`input[name="multi-correct-${qi}"]:checked`);const state={optionTemplate:template,correct:r?parseInt(r.value,10):0,options:[0,1,2,3].map(oi=>subOptionTextAt(qi,oi)),optionsHtml:[0,1,2,3].map(oi=>subOptionHtmlAt(qi,oi))};if(template==='diagram1'||template==='diagram2')state.optionImages=subOptionImageState(qi);if(template==='table')state.optionTable=collectSubOptionTable(qi);return state;}
function multipleQuestionPerformanceState(qi){const responseRaw=(document.getElementById(`multi-response-${qi}`)?.value||'').trim(),attemptCount=parseInt(document.getElementById(`multi-attempt-count-${qi}`)?.value,10)||0,correctCount=parseInt(document.getElementById(`multi-correct-count-${qi}`)?.value,10)||0,autoPercent=calculatedResponsePercent(responseRaw,correctCount,attemptCount),responsePercent=autoPercent===null?(responseRaw===''?0:clampResponsePercent(responseRaw)):Math.round(autoPercent*10)/10,difficulty=autoPercent===null?'Medium':difficultyFromResponsePercent(responsePercent);return{responsePercent,response:responsePercent,attemptCount,correctCount,difficulty};}function updateMultiplePerformanceDifficulty(qi){const perf=multipleQuestionPerformanceState(qi),el=document.getElementById(`multi-difficulty-${qi}`);if(el)el.value=perf.difficulty;}function collectMultipleSubQuestions(){return [...document.querySelectorAll('[data-subquestion-index]')].map(card=>{const qi=parseInt(card.dataset.subquestionIndex,10);const optionState=collectMultipleOptionState(qi);const blocks=collectMcContentBlocks('multi-sub-'+qi,true);const sq=assignMcLegacyFields({question:subQuestionTextAt(qi),questionHtml:subQuestionHtmlAt(qi),solution:subSolutionTextAt(qi),solutionHtml:subSolutionHtmlAt(qi),...multipleQuestionPerformanceState(qi),...optionState},blocks);if(sq.optionTemplate==='diagram2'||sq.optionTemplate==='diagram'){sq.options=[0,1,2,3].map(oi=>sq.optionImages&&sq.optionImages[oi]&&sq.optionImages[oi].name?sq.optionImages[oi].name:'');sq.optionsHtml=sq.options.map(esc);}if(sq.optionTemplate==='table'&&sq.optionTable){sq.options=sq.optionTable.rows.map(row=>row.map(cell=>cell.text).filter(Boolean).join(' | '));sq.optionsHtml=sq.options.map(esc);}return sq;});}
function renderMultipleOptionTemplatePicker(qi,template){if(template==='diagram')template='diagram1';return`<div class="option-template-wrap"><label>Multiple choice option type</label><div class="template-choices option-template-choices"><button type="button" class="template-choice${template==='standard'?' active':''}" onclick="setMultipleOptionTemplate(${qi},'standard')"><span class="template-choice-title">STANDARD</span><span class="template-choice-sub">Text options</span></button><button type="button" class="template-choice${template==='diagram1'?' active':''}" onclick="setMultipleOptionTemplate(${qi},'diagram1')"><span class="template-choice-title">HYBRID</span><span class="template-choice-sub">Text and images</span></button><button type="button" class="template-choice${template==='diagram2'?' active':''}" onclick="setMultipleOptionTemplate(${qi},'diagram2')"><span class="template-choice-title">IMAGES</span><span class="template-choice-sub">Large images</span></button><button type="button" class="template-choice${template==='table'?' active':''}" onclick="setMultipleOptionTemplate(${qi},'table')"><span class="template-choice-title">TABLE</span><span class="template-choice-sub">Columns</span></button></div><input type="hidden" id="multi-option-template-${qi}" value="${template}"></div>`;}
function renderMultipleStandardOptions(qi,q){const opts=q.options||['','','',''],optHtml=q.optionsHtml||[],corr=typeof q.correct==='number'?q.correct:0;return`<label>Options <span style="font-size:11px;font-weight:400;color:var(--color-text-secondary)">(select correct answer)</span></label>${[0,1,2,3].map(oi=>`<div class="option-input-row standard-option-row"><input type="radio" name="multi-correct-${qi}" value="${oi}"${oi===corr?' checked':''}><div class="rich-editor-wrap standard-option-editor-wrap"><div id="multi-q-${qi}-opt-${oi}" class="rich-editor standard-option-editor editable-text" contenteditable="true" data-placeholder="Option ${String.fromCharCode(65+oi)}" onfocus="setActiveEditor('multi-q-${qi}-opt-${oi}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${optHtml[oi]||esc(opts[oi]||'')}</div></div></div>`).join('')}`;}
function setMultipleOptionImage(qi,i,data,name){document.getElementById(`multi-opt-img-data-${qi}-${i}`).value=data;document.getElementById(`multi-opt-img-name-${qi}-${i}`).value=name;document.getElementById(`multi-opt-img-preview-${qi}-${i}`).innerHTML=`<img class="option-image-preview" src="${data}" alt="${esc(name)}">`;}
function clearMultipleOptionImage(qi,i){document.getElementById(`multi-opt-img-data-${qi}-${i}`).value='';document.getElementById(`multi-opt-img-name-${qi}-${i}`).value='';const input=document.querySelector(`input[data-multi-option-file="${qi}-${i}"]`);if(input)input.value='';document.getElementById(`multi-opt-img-preview-${qi}-${i}`).innerHTML='';}
function readMultipleOptionImageFile(qi,i,file){if(!file)return;if(!/^image\/(png|jpeg)$/.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);return;}const reader=new FileReader();reader.onload=()=>setMultipleOptionImage(qi,i,reader.result,file.name||'Pasted image');reader.readAsDataURL(file);}
function handleMultipleOptionUpload(qi,i,event){const file=event.target.files&&event.target.files[0];if(file)readMultipleOptionImageFile(qi,i,file);}
function handleMultipleOptionPaste(qi,i,event){const items=event.clipboardData&&event.clipboardData.items;if(!items)return;for(const item of items){if(item.type&&/^image\/(png|jpeg)$/.test(item.type)){event.preventDefault();readMultipleOptionImageFile(qi,i,item.getAsFile());return;}}showToast('Paste a PNG, JPG, or JPEG image',true);}
function renderMultipleDiagramOptions(qi,template,q){const imgs=q.optionImages||[],corr=typeof q.correct==='number'?q.correct:0,opts=q.options||['','','',''],optHtml=q.optionsHtml||[],gridClass=template==='diagram1'?'option-image-grid':'options-list option-image-large';return`<label>Options <span style="font-size:11px;font-weight:400;color:var(--color-text-secondary)">(select correct answer)</span></label><div class="${gridClass}">${[0,1,2,3].map(i=>{const im=imgs[i]||{};const textEditor=template==='diagram1'?`<div class="rich-editor-wrap standard-option-editor-wrap" style="margin-bottom:6px"><div id="multi-q-${qi}-opt-${i}" class="rich-editor standard-option-editor editable-text" contenteditable="true" data-placeholder="Option ${String.fromCharCode(65+i)} text" onfocus="setActiveEditor('multi-q-${qi}-opt-${i}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${optHtml[i]||esc(opts[i]||'')}</div></div>`:'';return`<div class="option-input-row"><input type="radio" name="multi-correct-${qi}" value="${i}"${i===corr?' checked':''}><div class="option-image-card">${textEditor}<div style="display:flex;gap:6px;align-items:center"><input type="file" data-multi-option-file="${qi}-${i}" accept="image/png,image/jpeg" onchange="handleMultipleOptionUpload(${qi},${i},event)"><button type="button" class="btn btn-sm" onclick="clearMultipleOptionImage(${qi},${i})"><i class="ti ti-x"></i>Remove</button></div><div class="paste-zone" tabindex="0" onpaste="handleMultipleOptionPaste(${qi},${i},event)">Paste option image here, or choose a PNG/JPG/JPEG file.</div><input type="hidden" id="multi-opt-img-data-${qi}-${i}" value="${esc(im.data||'')}"><input type="hidden" id="multi-opt-img-name-${qi}-${i}" value="${esc(im.name||'')}"><div id="multi-opt-img-preview-${qi}-${i}">${im.data?`<img class="option-image-preview" src="${im.data}" alt="${esc(im.name||'Option image')}">`:''}</div></div></div>`;}).join('')}</div>`;}
function renderMultipleOptionTableFields(qi,table){const cols=Math.max(2,table&&table.cols?table.cols:2);const headers=table&&table.headers?table.headers:[];const headerHtml=table&&table.headerHtml?table.headerHtml:[];const rows=table&&table.rows?table.rows:[];const corr=typeof table.correct==='number'?table.correct:0;return`<div class="form-group"><label>Columns</label><div style="display:flex;align-items:center;gap:8px"><button type="button" class="icon-btn" onclick="changeMultipleOptionTableColumns(${qi},-1)" title="Remove column"><i class="ti ti-minus"></i></button><input type="number" id="multi-option-table-cols-${qi}" min="2" value="${cols}" onchange="setMultipleOptionTableColumns(${qi},parseInt(this.value)||2)" style="width:78px;text-align:center"><button type="button" class="icon-btn" onclick="changeMultipleOptionTableColumns(${qi},1)" title="Add column"><i class="ti ti-plus"></i></button></div></div><div class="option-table-wrap"><table class="option-table"><thead><tr><th></th>${[...Array(cols)].map((_,c)=>`<th><div id="multi-opt-table-head-${qi}-${c}" class="option-table-cell editable-text" contenteditable="true" data-placeholder="Heading ${c+1}" onfocus="setActiveEditor('multi-opt-table-head-${qi}-${c}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${headerHtml[c]||esc(headers[c]||'')}</div></th>`).join('')}</tr></thead><tbody>${[0,1,2,3].map(r=>`<tr><td class="option-table-letter"><input type="radio" name="multi-correct-${qi}" value="${r}"${r===corr?' checked':''}></td>${[...Array(cols)].map((_,c)=>`<td>${renderTableCellEditor(`multi-opt-table-${qi}-${r}-${c}`,`Option ${String.fromCharCode(65+r)}, column ${c+1}`,rows[r]&&rows[r][c]?rows[r][c].html||esc(rows[r][c].text||''):'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function renderMultipleOptionFields(qi,q){let template=q.optionTemplate||'standard';if(template==='diagram')template='diagram1';let html=renderMultipleOptionTemplatePicker(qi,template);if(template==='standard')html+=renderMultipleStandardOptions(qi,q);else if(template==='diagram1'||template==='diagram2')html+=renderMultipleDiagramOptions(qi,template,q);else html+=renderMultipleOptionTableFields(qi,{...(q.optionTable||{cols:2,headers:['',''],rows:[]}),correct:typeof q.correct==='number'?q.correct:0});return html;}
function multiQuestionDiagramPanelHtml(index,q){const data=q.imageData||'',name=q.imageName||'',source=q.source||'',sourceType=q.sourceType==='data'?'data':'source',afterHtml=q.afterTextHtml||esc(q.afterText||'');return`<div class="form-group"><label>Diagram</label><div style="display:flex;gap:6px;align-items:center"><input type="file" id="multi-q-diagram-${index}" accept="image/png,image/jpeg" onchange="handleSubQuestionDiagramUpload(event,${index})"><button type="button" class="btn btn-sm" onclick="clearSubQuestionDiagram(${index})"><i class="ti ti-x"></i>Remove</button></div><div class="paste-zone" tabindex="0" onpaste="handleSubQuestionDiagramPaste(event,${index})">Paste image here, or choose a PNG/JPG/JPEG file.</div><input type="hidden" id="multi-q-img-data-${index}" value="${esc(data)}"><input type="hidden" id="multi-q-img-name-${index}" value="${esc(name)}"><div id="multi-q-diagram-preview-${index}">${data?`<img class="diagram-preview" src="${data}" alt="${esc(name||'Diagram preview')}">`:''}</div></div><div class="form-group"><label>Source type</label><div style="display:grid;grid-template-columns:180px 1fr;gap:8px"><select id="multi-q-source-type-${index}"><option value="source"${sourceType==='source'?' selected':''}>Source</option><option value="data"${sourceType==='data'?' selected':''}>Data</option></select><input id="multi-q-source-${index}" value="${esc(source)}" placeholder="${sourceType==='data'?'Paste data link here...':'Enter source here...'}"></div></div><div class="form-group"><label>Question text 2</label><div class="rich-editor-wrap"><div id="multi-q-after-${index}" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter question text 2..." onfocus="setActiveEditor('multi-q-after-${index}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${afterHtml}</div></div></div>`;}
function setSubQuestionDiagramImage(index,data,name){const dataEl=document.getElementById(`multi-q-img-data-${index}`),nameEl=document.getElementById(`multi-q-img-name-${index}`),preview=document.getElementById(`multi-q-diagram-preview-${index}`);if(dataEl)dataEl.value=data;if(nameEl)nameEl.value=name;if(preview)preview.innerHTML=`<img class="diagram-preview" src="${data}" alt="${esc(name)}">`;}
function clearSubQuestionDiagram(index){const dataEl=document.getElementById(`multi-q-img-data-${index}`),nameEl=document.getElementById(`multi-q-img-name-${index}`),input=document.getElementById(`multi-q-diagram-${index}`),preview=document.getElementById(`multi-q-diagram-preview-${index}`);if(dataEl)dataEl.value='';if(nameEl)nameEl.value='';if(input)input.value='';if(preview)preview.innerHTML='';}
function readSubQuestionDiagramFile(index,file){if(!file)return;if(!/^image\/(png|jpeg)$/.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);return;}const reader=new FileReader();reader.onload=()=>setSubQuestionDiagramImage(index,reader.result,file.name||'Pasted image');reader.readAsDataURL(file);}
function handleSubQuestionDiagramUpload(event,index){const file=event.target.files&&event.target.files[0];if(!file)return;readSubQuestionDiagramFile(index,file);}
function handleSubQuestionDiagramPaste(event,index){const items=event.clipboardData&&event.clipboardData.items;if(!items)return;for(const item of items){if(item.type&&/^image\/(png|jpeg)$/.test(item.type)){event.preventDefault();readSubQuestionDiagramFile(index,item.getAsFile());return;}}showToast('Paste a PNG, JPG, or JPEG image',true);}
function renderMultiplePerformanceFields(index,q){const response=q.responsePercent??q.response??'',attempt=q.attemptCount??0,correct=q.correctCount??0,difficulty=q.difficulty||difficultyFromResponsePercent(response||0);return`<div class="form-group"><label>Performance</label><div class="metadata-grid" style="grid-template-columns:repeat(4,minmax(110px,1fr));gap:8px"><div><label style="font-size:11px">Response (%)</label><input id="multi-response-${index}" type="number" min="0" max="100" step="1" value="${esc(response)}" oninput="updateMultiplePerformanceDifficulty(${index})"></div><div><label style="font-size:11px">Attempt Count</label><input id="multi-attempt-count-${index}" type="number" min="0" step="1" value="${esc(attempt)}" oninput="updateMultiplePerformanceDifficulty(${index})"></div><div><label style="font-size:11px">Correct Count</label><input id="multi-correct-count-${index}" type="number" min="0" step="1" value="${esc(correct)}" oninput="updateMultiplePerformanceDifficulty(${index})"></div><div><label style="font-size:11px">Difficulty</label><input id="multi-difficulty-${index}" value="${esc(difficulty)}" readonly></div></div></div>`;}function renderMultipleQuestionBlock(item,index){const q=item||defaultMultipleQuestion();return`<div class="subquestion-card" data-subquestion-index="${index}"><div class="subquestion-header"><div class="subquestion-title">Question ${index+1}</div>${index>0?`<button type="button" class="icon-btn" onclick="removeMultipleQuestion(${index})" title="Remove"><i class="ti ti-trash"></i></button>`:''}</div><div class="form-group"><label>Question text 1</label><div class="rich-editor-wrap"><div id="multi-q-${index}" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter question text 1..." onfocus="setActiveEditor('multi-q-${index}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${q.questionHtml||esc(q.question||'')}</div></div></div>${renderMcContentBlocksBuilder(mcContentBlocksFromQuestion(q),'multi-sub-'+index,'Question text')}<div class="form-group">${renderMultipleOptionFields(index,q)}</div><div class="form-group"><label>Solution</label><div class="rich-editor-wrap"><div id="multi-solution-${index}" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter solution here..." onfocus="setActiveEditor('multi-solution-${index}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${q.solutionHtml||esc(q.solution||'')}</div></div></div>${renderMultiplePerformanceFields(index,q)}</div>`;}function multipleInstructionText(count){const n=Math.max(2,count||2);return n===2?'Use the following information to answer Question 1 and 2.':`Use the following information to answer Question 1 - ${n}.`;}
function currentMultipleQuestionCount(){return document.querySelectorAll('[data-subquestion-index]').length||parseInt((document.getElementById('multi-question-count')||{}).value)||2;}
function updateMcqMarks(){const marks=document.getElementById('f-marks'),type=document.getElementById('f-type')?.value,template=document.getElementById('f-mcq-template')?.value||'standard';if(!marks)return;if(type==='mc'){marks.readOnly=true;marks.value=template==='multiple'?Math.max(2,currentMultipleQuestionCount()):1;}else{marks.readOnly=false;}}
function updateMultipleInstructionText(){const count=currentMultipleQuestionCount();const ed=document.getElementById('f-text');if(ed&&document.getElementById('f-mcq-template')?.value==='multiple')ed.innerHTML=esc(multipleInstructionText(count));updateMcqMarks();}
function defaultMultipleQuestion(){return{question:'',questionHtml:'',imageData:'',imageName:'',source:'',sourceType:'source',afterText:'',afterTextHtml:'',solution:'',solutionHtml:'',responsePercent:'',response:'',attemptCount:0,correctCount:0,difficulty:'Medium',optionTemplate:'standard',options:['','','',''],optionsHtml:[],correct:0};}
function setMultipleOptionTemplate(index,template){const items=collectMultipleSubQuestions();const current=items[index]||defaultMultipleQuestion();window.__multiOptionTemplateState=window.__multiOptionTemplateState||{};window.__multiOptionTemplateState[index]=window.__multiOptionTemplateState[index]||{};window.__multiOptionTemplateState[index][current.optionTemplate||'standard']=current;items[index]={...current,...(window.__multiOptionTemplateState[index][template]||{}),question:current.question,questionHtml:current.questionHtml,imageData:current.imageData,imageName:current.imageName,source:current.source,sourceType:current.sourceType,afterText:current.afterText,afterTextHtml:current.afterTextHtml,solution:current.solution,solutionHtml:current.solutionHtml,optionTemplate:template,correct:current.correct};const stack=document.getElementById('multi-question-stack');stack.innerHTML=items.map((item,i)=>renderMultipleQuestionBlock(item,i)).join('');renderKatexIn(stack);}
function setMultipleOptionTableColumns(qi,count){const items=collectMultipleSubQuestions();const item=items[qi]||defaultMultipleQuestion();item.optionTemplate='table';item.optionTable=item.optionTable||{cols:2,headers:[],rows:[]};item.optionTable.cols=Math.max(2,count);items[qi]=item;const stack=document.getElementById('multi-question-stack');stack.innerHTML=items.map((it,i)=>renderMultipleQuestionBlock(it,i)).join('');renderKatexIn(stack);}
function changeMultipleOptionTableColumns(qi,delta){const current=parseInt((document.getElementById(`multi-option-table-cols-${qi}`)||{}).value)||2;setMultipleOptionTableColumns(qi,current+delta);}
function renderMultipleQuestionStepper(count){return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><button type="button" class="icon-btn" onclick="changeMultipleQuestionCount(-1)" title="Remove question"><i class="ti ti-minus"></i></button><input type="number" id="multi-question-count" min="2" value="${Math.max(2,count)}" onchange="setMultipleQuestionCount(parseInt(this.value)||2)" style="width:78px;text-align:center"><button type="button" class="icon-btn" onclick="changeMultipleQuestionCount(1)" title="Add question"><i class="ti ti-plus"></i></button></div>`;}
function renderMultipleQuestionStack(items){const list=items&&items.length?items:[defaultMultipleQuestion(),defaultMultipleQuestion()];while(list.length<2)list.push(defaultMultipleQuestion());return`<div class="form-group"><label>Questions</label>${renderMultipleQuestionStepper(list.length)}<div id="multi-question-stack">${list.map((item,index)=>renderMultipleQuestionBlock(item,index)).join('')}</div></div>`;}
function addMultipleQuestion(){const stack=document.getElementById('multi-question-stack');if(!stack)return;const items=collectMultipleSubQuestions();items.push(defaultMultipleQuestion());stack.innerHTML=items.map((item,index)=>renderMultipleQuestionBlock(item,index)).join('');renderKatexIn(stack);const input=document.getElementById('multi-question-count');if(input)input.value=items.length;updateMultipleInstructionText();}
function removeMultipleQuestion(index){const stack=document.getElementById('multi-question-stack');if(!stack)return;const items=collectMultipleSubQuestions().filter((_,i)=>i!==index);const list=items.length?items:[defaultMultipleQuestion(),defaultMultipleQuestion()];while(list.length<2)list.push(defaultMultipleQuestion());stack.innerHTML=list.map((item,i)=>renderMultipleQuestionBlock(item,i)).join('');renderKatexIn(stack);const input=document.getElementById('multi-question-count');if(input)input.value=list.length;updateMultipleInstructionText();}
function setMultipleQuestionCount(count){const stack=document.getElementById('multi-question-stack');if(!stack)return;const target=Math.max(2,count);const items=collectMultipleSubQuestions();while(items.length<target)items.push(defaultMultipleQuestion());while(items.length>target)items.pop();stack.innerHTML=items.map((item,index)=>renderMultipleQuestionBlock(item,index)).join('');renderKatexIn(stack);const input=document.getElementById('multi-question-count');if(input)input.value=items.length;updateMultipleInstructionText();}
function changeMultipleQuestionCount(delta){const current=collectMultipleSubQuestions().length;setMultipleQuestionCount(current+delta);}
function setMcTemplate(template){const hidden=document.getElementById('f-mcq-template');const previous=hidden?.value||'standard';if(previous!=='multiple'&&template==='multiple'&&!window.__editingQuestion){window.__pendingMultipleQuestionHtml=getQuestionHtml();setQuestionHtml(multipleInstructionText(2));}if(previous==='multiple'&&template!=='multiple'&&!window.__editingQuestion){const moved=getMultipleQuestionHtml();setQuestionHtml(moved||window.__pendingMultipleQuestionHtml||'');}if(hidden)hidden.value=template;document.querySelectorAll('[data-mcq-template]').forEach(btn=>btn.classList.toggle('active',btn.dataset.mcqTemplate===template));updateMcTemplateFields(window.__editingQuestion);updateMcqMarks();}
function renderMcTemplatePicker(template){const picker=document.getElementById('mc-template-picker');if(!picker)return;picker.innerHTML=`<div class="template-choices"><button type="button" class="template-choice${template==='standard'?' active':''}" data-mcq-template="standard" onclick="setMcTemplate('standard')"><span class="template-choice-title">STANDARD</span><span class="template-choice-sub">Text only</span></button><button type="button" class="template-choice${template==='diagram'?' active':''}" data-mcq-template="diagram" onclick="setMcTemplate('diagram')"><span class="template-choice-title">DIAGRAM</span><span class="template-choice-sub">Text + diagram + text</span></button><button type="button" class="template-choice${template==='multiple'?' active':''}" data-mcq-template="multiple" onclick="setMcTemplate('multiple')"><span class="template-choice-title">MULTIPLE</span><span class="template-choice-sub">Shared prompt</span></button></div><input type="hidden" id="f-mcq-template" value="${template}">`;}
function mcDiagramPanelHtml(suffix='',imageData='',imageName=''){
  return `<div class="form-group"><label>Diagram</label><div style="display:flex;gap:6px;align-items:center"><input type="file" id="f-diagram${suffix}" accept="image/png,image/jpeg" onchange="handleDiagramUploadAt(event,'${suffix}')"><button type="button" class="btn btn-sm" onclick="clearDiagramImageAt('${suffix}')"><i class="ti ti-x"></i>Remove</button></div><div class="paste-zone" tabindex="0" onpaste="handleDiagramPasteAt(event,'${suffix}')">Paste image here, or choose a PNG/JPG/JPEG file.</div><input type="hidden" id="f-image-data${suffix}" value="${esc(imageData)}"><input type="hidden" id="f-image-name${suffix}" value="${esc(imageName)}"><div id="diagram-preview-wrap${suffix}">${imageData?`<img class="diagram-preview" src="${imageData}" alt="${esc(imageName||'Diagram preview')}">`:''}</div></div>`;
}
function mcSourcePanelHtml(suffix='',source='',sourceType='source'){
  return `<div class="form-group"><label>Source type</label><div style="display:grid;grid-template-columns:180px 1fr;gap:8px"><select id="f-source-type${suffix}"><option value="source"${sourceType==='source'?' selected':''}>Source</option><option value="data"${sourceType==='data'?' selected':''}>Data</option></select><input id="f-source${suffix}" value="${esc(source)}" placeholder="${sourceType==='data'?'Paste data link here...':'Enter source here...'}"></div></div>`;
}
function mcRichTextPanelHtml(id,label,placeholder,html){
  return `<div class="form-group"><label>${label}</label><div class="rich-editor-wrap"><div id="${id}" class="rich-editor editable-text" contenteditable="true" data-placeholder="${esc(placeholder)}" onfocus="setActiveEditor('${id}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${html}</div></div></div>`;
}
function updateMcTemplateFields(existing){
  const template=document.getElementById('f-mcq-template')?.value||'standard',wrap=document.getElementById('mc-template-fields');if(!wrap)return;
  const isSame=existing&&existing.template===template;
  const imageData=isSame?existing.imageData||'':'';
  const imageName=isSame?existing.imageName||'':'';
  const source=isSame?existing.source||'':'';
  const sourceType=isSame&&existing.sourceType==='data'?'data':'source';
  const afterText=isSame?existing.afterText||'':'';
  const afterTextHtml=isSame&&existing.afterTextHtml?existing.afterTextHtml:esc(afterText);
  const imageData2=isSame?existing.imageData2||'':'';
  const imageName2=isSame?existing.imageName2||'':'';
  const source2=isSame?existing.source2||'':'';
  const sourceType2=isSame&&existing.sourceType2==='data'?'data':'source';
  const afterText2=isSame?existing.afterText2||'':'';
  const afterText2Html=isSame&&existing.afterText2Html?existing.afterText2Html:esc(afterText2);
  const multipleQuestionHtml=existing&&existing.template==='multiple'?existing.textHtml||esc(existing.text||''):window.__pendingMultipleQuestionHtml||'';
  const multipleQuestions=existing&&existing.template==='multiple'?existing.subQuestions||[]:[];
  const mainLabel=document.getElementById('main-text-label');if(mainLabel)mainLabel.textContent=template==='multiple'?'Instruction text':(template==='diagram'?'Question text 1':'Question text');
  const mainOptions=document.getElementById('mc-main-options');if(mainOptions)mainOptions.style.display=template==='multiple'?'none':'';
  const solutionField=document.getElementById('solution-field');if(solutionField)solutionField.style.display=template==='multiple'?'none':'';
  if(template==='multiple'){
    document.getElementById('f-text').setAttribute('contenteditable','false');document.getElementById('f-text').classList.add('compact');setQuestionHtml(esc(multipleInstructionText((multipleQuestions&&multipleQuestions.length)||2)));
  }else{
    document.getElementById('f-text').setAttribute('contenteditable','true');document.getElementById('f-text').classList.remove('compact');
  }
  let html='';
  if(template==='diagram'){
    html=renderMcContentBlocksBuilder(isSame?mcContentBlocksFromQuestion(existing):[],'mc-diagram','Question text');
  }else if(template==='multiple'){
    html=`<div class="form-group"><label>Statement text 1</label><div class="rich-editor-wrap"><div id="f-multi-question" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter statement text 1..." onfocus="setActiveEditor('f-multi-question')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${multipleQuestionHtml}</div></div></div>${renderMcContentBlocksBuilder(isSame?mcContentBlocksFromQuestion(existing):[],'mc-multiple-shared','Statement text')}${renderMultipleQuestionStack(multipleQuestions)}`;
  }  wrap.innerHTML=html;updateMcqMarks();renderKatexIn(wrap);setTimeout(refreshQuestionToolbarPin,0);
}function diagramFieldIds(suffix=''){return{input:`f-diagram${suffix}`,data:`f-image-data${suffix}`,name:`f-image-name${suffix}`,preview:`diagram-preview-wrap${suffix}`};}
function setDiagramImageAt(suffix,data,name){const ids=diagramFieldIds(suffix),dataEl=document.getElementById(ids.data),nameEl=document.getElementById(ids.name),preview=document.getElementById(ids.preview);if(dataEl)dataEl.value=data;if(nameEl)nameEl.value=name;if(preview)preview.innerHTML=`<img class="diagram-preview" src="${data}" alt="${esc(name)}">`;}
function clearDiagramImageAt(suffix=''){const ids=diagramFieldIds(suffix),dataEl=document.getElementById(ids.data),nameEl=document.getElementById(ids.name),input=document.getElementById(ids.input),preview=document.getElementById(ids.preview);if(dataEl)dataEl.value='';if(nameEl)nameEl.value='';if(input)input.value='';if(preview)preview.innerHTML='';}
function readDiagramFileAt(suffix,file){if(!file)return;if(!/^image\/(png|jpeg)$/.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);return;}const reader=new FileReader();reader.onload=()=>setDiagramImageAt(suffix,reader.result,file.name||'Pasted image');reader.readAsDataURL(file);}
function handleDiagramUploadAt(event,suffix=''){const file=event.target.files&&event.target.files[0];if(!file)return;readDiagramFileAt(suffix,file);}
function handleDiagramPasteAt(event,suffix=''){const items=event.clipboardData&&event.clipboardData.items;if(!items)return;for(const item of items){if(item.type&&/^image\/(png|jpeg)$/.test(item.type)){event.preventDefault();readDiagramFileAt(suffix,item.getAsFile());return;}}showToast('Paste a PNG, JPG, or JPEG image',true);}
function setDiagramImage(data,name){setDiagramImageAt('',data,name);}function clearDiagramImage(){clearDiagramImageAt('');}function readDiagramFile(file){readDiagramFileAt('',file);}function handleDiagramUpload(event){handleDiagramUploadAt(event,'');}function handleDiagramPaste(event){handleDiagramPasteAt(event,'');}

function defaultSaerExtraBlock(){return{imageData:'',imageName:'',diagramSolutionImageData:'',diagramSolutionImageName:'',source:'',sourceType:'source',afterText:'',afterTextHtml:''};}
function normaliseSaerExtraBlocks(blocks){return Array.isArray(blocks)?blocks.map(b=>({imageData:b.imageData||'',imageName:b.imageName||'',diagramSolutionImageData:b.diagramSolutionImageData||'',diagramSolutionImageName:b.diagramSolutionImageName||'',source:b.source||'',sourceType:b.sourceType==='data'?'data':'source',afterText:b.afterText||'',afterTextHtml:b.afterTextHtml||''})):[];
}
function saerBlocksFromQuestion(q){
  const blocks=normaliseSaerExtraBlocks(q?.extraBlocks);
  if(blocks.length)return blocks;
  if(q&&(q.imageData||q.source||q.afterTextHtml||q.afterText))return[{imageData:q.imageData||'',imageName:q.imageName||'',diagramSolutionImageData:q.diagramSolutionImageData||'',diagramSolutionImageName:q.diagramSolutionImageName||'',source:q.source||'',sourceType:q.sourceType==='data'?'data':'source',afterText:q.afterText||'',afterTextHtml:q.afterTextHtml||''}];
  return[];
}
function saerBlockOwnerKey(owner='main'){return String(owner||'main').replace(/[^a-zA-Z0-9_-]/g,'-');}
function renderSaerExtraBlock(block,index,owner='main'){
  const key=saerBlockOwnerKey(owner),b={...defaultSaerExtraBlock(),...(block||{})},suffix=`-${key}-saer-${index}`,label=`Question text ${index+2}`;
  return `<div class="saer-part-card" data-saer-extra-owner="${key}" data-saer-extra-index="${index}"><div class="saer-part-header"><div class="saer-part-title">Diagram / source block ${index+1}</div><button type="button" class="icon-btn saer-trash-btn" onclick="removeSaerExtraBlock('${key}',${index})" title="Remove block"><i class="ti ti-trash"></i></button></div>${mcDiagramPanelHtml(suffix,b.imageData,b.imageName)}${mcDiagramPanelHtml(`${suffix}-solution`,b.diagramSolutionImageData,b.diagramSolutionImageName).replace('<label>Diagram</label>','<label>Diagram Solution</label>')}${mcSourcePanelHtml(suffix,b.source,b.sourceType)}${mcRichTextPanelHtml(`${key}-saer-extra-text-${index}`,label,`Enter ${label.toLowerCase()}...`,b.afterTextHtml||esc(b.afterText||''))}</div>`;
}
function renderSaerExtraBlocksBuilder(existing,type,owner='main',providedBlocks=null){
  const key=saerBlockOwnerKey(owner),blocks=providedBlocks?normaliseSaerExtraBlocks(providedBlocks):(existing&&existing.type===type?saerBlocksFromQuestion(existing):[]);
  return `<div class="form-group saer-parts-builder"><label>Diagram / source / question text blocks</label><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button type="button" class="btn btn-sm" onclick="addSaerExtraBlock('${key}')"><i class="ti ti-plus"></i>Add diagram/source block</button><span style="font-size:11px;color:var(--color-text-secondary)">Adds Diagram, Source/Data, then the next question text.</span></div><div id="${key}-saer-extra-blocks-stack">${blocks.map((b,i)=>renderSaerExtraBlock(b,i,key)).join('')}</div></div>`;
}
function collectSaerExtraBlocks(owner='main'){const key=saerBlockOwnerKey(owner);return[...document.querySelectorAll(`[data-saer-extra-owner="${key}"]`)].map((card,i)=>{const suffix=`-${key}-saer-${i}`,afterTextHtml=storedHtmlFrom(document.getElementById(`${key}-saer-extra-text-${i}`));return{imageData:document.getElementById(`f-image-data${suffix}`)?.value||'',imageName:document.getElementById(`f-image-name${suffix}`)?.value||'',diagramSolutionImageData:document.getElementById(`f-image-data${suffix}-solution`)?.value||'',diagramSolutionImageName:document.getElementById(`f-image-name${suffix}-solution`)?.value||'',source:document.getElementById(`f-source${suffix}`)?.value||'',sourceType:document.getElementById(`f-source-type${suffix}`)?.value||'source',afterText:plainTextFromHtml(afterTextHtml),afterTextHtml};});}
function setSaerExtraBlocks(blocks,owner='main'){const key=saerBlockOwnerKey(owner),stack=document.getElementById(`${key}-saer-extra-blocks-stack`);if(!stack)return;stack.innerHTML=normaliseSaerExtraBlocks(blocks).map((b,i)=>renderSaerExtraBlock(b,i,key)).join('');renderKatexIn(stack);}
function addSaerExtraBlock(owner='main'){const blocks=collectSaerExtraBlocks(owner);blocks.push(defaultSaerExtraBlock());setSaerExtraBlocks(blocks,owner);}
function removeSaerExtraBlock(owner,index){setSaerExtraBlocks(collectSaerExtraBlocks(owner).filter((_,i)=>i!==index),owner);}
function saerExtraBlocksHtml(q){return saerBlocksFromQuestion(q).map((b,i)=>`${b.imageData?`<img class="q-diagram" src="${b.imageData}" alt="${esc(b.imageName||'Question diagram')}">`:''}${b.source?`<div class="q-text" style="font-size:12px;color:var(--color-text-secondary)">${sourceTypeLabel(b.sourceType)}: ${esc(b.source)}</div>`:''}${b.afterTextHtml||b.afterText?`<div class="q-text">${b.afterTextHtml||esc(b.afterText||'')}</div>`:''}`).join('');}function defaultMcContentBlock(){return{imageData:'',imageName:'',diagramSolutionImageData:'',diagramSolutionImageName:'',source:'',sourceType:'source',afterText:'',afterTextHtml:''};}
function normaliseMcContentBlocks(blocks){return Array.isArray(blocks)?blocks.map(b=>({imageData:b.imageData||'',imageName:b.imageName||'',diagramSolutionImageData:b.diagramSolutionImageData||'',diagramSolutionImageName:b.diagramSolutionImageName||'',source:b.source||'',sourceType:b.sourceType==='data'?'data':'source',afterText:b.afterText||'',afterTextHtml:b.afterTextHtml||''})):[];}
function mcContentBlockHas(b){return !!(b&&(b.imageData||b.imageName||b.diagramSolutionImageData||b.diagramSolutionImageName||b.source||b.afterTextHtml||b.afterText));}
function mcContentBlocksFromQuestion(q){
  const blocks=normaliseMcContentBlocks(q?.extraBlocks).filter(mcContentBlockHas);
  if(blocks.length)return blocks;
  const legacy=[];
  if(q&&(q.imageData||q.diagramSolutionImageData||q.source||q.afterTextHtml||q.afterText))legacy.push({imageData:q.imageData||'',imageName:q.imageName||'',diagramSolutionImageData:q.diagramSolutionImageData||'',diagramSolutionImageName:q.diagramSolutionImageName||'',source:q.source||'',sourceType:q.sourceType==='data'?'data':'source',afterText:q.afterText||'',afterTextHtml:q.afterTextHtml||''});
  if(q&&(q.imageData2||q.diagramSolutionImageData2||q.source2||q.afterText2Html||q.afterText2))legacy.push({imageData:q.imageData2||'',imageName:q.imageName2||'',diagramSolutionImageData:q.diagramSolutionImageData2||'',diagramSolutionImageName:q.diagramSolutionImageName2||'',source:q.source2||'',sourceType:q.sourceType2==='data'?'data':'source',afterText:q.afterText2||'',afterTextHtml:q.afterText2Html||''});
  return legacy;
}
function renderMcContentBlock(block,index,scope,labelPrefix){
  const b={...defaultMcContentBlock(),...(block||{})},suffix=`-${scope}-${index}`,label=`${labelPrefix} ${index+2}`;
  return `<div class="saer-part-card" data-mc-content-index="${index}" data-mc-content-scope="${esc(scope)}"><div class="saer-part-header"><div class="saer-part-title">Diagram / source block ${index+1}</div><button type="button" class="icon-btn saer-trash-btn" onclick="removeMcContentBlock('${scope}',${index},'${labelPrefix}')" title="Remove block"><i class="ti ti-trash"></i></button></div>${mcDiagramPanelHtml(suffix,b.imageData,b.imageName)}${mcDiagramPanelHtml(`${suffix}-solution`,b.diagramSolutionImageData,b.diagramSolutionImageName).replace('<label>Diagram</label>','<label>Diagram Solution</label>')}${mcSourcePanelHtml(suffix,b.source,b.sourceType)}${mcRichTextPanelHtml(`${scope}-block-text-${index}`,label,`Enter ${label.toLowerCase()}...`,b.afterTextHtml||esc(b.afterText||''))}</div>`;
}
function renderMcContentBlocksBuilder(blocks,scope,labelPrefix){
  const list=normaliseMcContentBlocks(blocks);
  return `<div class="form-group saer-parts-builder"><label>Diagram / source / ${labelPrefix.toLowerCase()} blocks</label><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button type="button" class="btn btn-sm" onclick="addMcContentBlock('${scope}','${labelPrefix}')"><i class="ti ti-plus"></i>Add diagram/source block</button><span style="font-size:11px;color:var(--color-text-secondary)">Adds Diagram -> Source/Data -> ${labelPrefix} 2, then ${labelPrefix} 3, and so on.</span></div><div id="${scope}-blocks-stack">${list.map((b,i)=>renderMcContentBlock(b,i,scope,labelPrefix)).join('')}</div></div>`;
}
function collectMcContentBlocks(scope,includeEmpty=false){const blocks=[...document.querySelectorAll(`[data-mc-content-scope="${scope}"]`)].map((card,i)=>{const suffix=`-${scope}-${i}`,afterTextHtml=storedHtmlFrom(document.getElementById(`${scope}-block-text-${i}`));return{imageData:document.getElementById(`f-image-data${suffix}`)?.value||'',imageName:document.getElementById(`f-image-name${suffix}`)?.value||'',diagramSolutionImageData:document.getElementById(`f-image-data${suffix}-solution`)?.value||'',diagramSolutionImageName:document.getElementById(`f-image-name${suffix}-solution`)?.value||'',source:document.getElementById(`f-source${suffix}`)?.value||'',sourceType:document.getElementById(`f-source-type${suffix}`)?.value||'source',afterText:plainTextFromHtml(afterTextHtml),afterTextHtml};});return includeEmpty?blocks:blocks.filter(mcContentBlockHas);}
function setMcContentBlocks(scope,blocks,labelPrefix){const stack=document.getElementById(`${scope}-blocks-stack`);if(!stack)return;stack.innerHTML=normaliseMcContentBlocks(blocks).map((b,i)=>renderMcContentBlock(b,i,scope,labelPrefix)).join('');renderKatexIn(stack);}
function addMcContentBlock(scope,labelPrefix){const blocks=collectMcContentBlocks(scope,true);blocks.push(defaultMcContentBlock());setMcContentBlocks(scope,blocks,labelPrefix);}
function removeMcContentBlock(scope,index,labelPrefix){setMcContentBlocks(scope,collectMcContentBlocks(scope,true).filter((_,i)=>i!==index),labelPrefix);}
function assignMcLegacyFields(target,blocks){
  const list=normaliseMcContentBlocks(blocks).filter(mcContentBlockHas),first=list[0]||{},second=list[1]||{};
  target.extraBlocks=list;target.imageData=first.imageData||'';target.imageName=first.imageName||'';target.diagramSolutionImageData=first.diagramSolutionImageData||'';target.diagramSolutionImageName=first.diagramSolutionImageName||'';target.source=first.source||'';target.sourceType=first.sourceType||'source';target.afterText=first.afterText||'';target.afterTextHtml=first.afterTextHtml||'';
  target.imageData2=second.imageData||'';target.imageName2=second.imageName||'';target.diagramSolutionImageData2=second.diagramSolutionImageData||'';target.diagramSolutionImageName2=second.diagramSolutionImageName||'';target.source2=second.source||'';target.sourceType2=second.sourceType||'source';target.afterText2=second.afterText||'';target.afterText2Html=second.afterTextHtml||'';
  return target;
}
function mcContentBlocksHtml(q){return mcContentBlocksFromQuestion(q).map(b=>`${b.imageData?`<img class="q-diagram" src="${b.imageData}" alt="${esc(b.imageName||'Question diagram')}">`:''}${b.source?`<div class="q-text" style="font-size:12px;color:var(--color-text-secondary)">${sourceTypeLabel(b.sourceType)}: ${esc(b.source)}</div>`:''}${b.afterTextHtml||b.afterText?`<div class="q-text">${b.afterTextHtml||esc(b.afterText||'')}</div>`:''}`).join('');}
const ANSWER_TEMPLATE_OPTIONS=[['normal-lines','NORMAL LINES'],['word-lines','WORD WITH LINES'],['table-image','TABLE OR IMAGE']];
function normaliseAnswerTemplate(value){return ANSWER_TEMPLATE_OPTIONS.some(([v])=>v===value)?value:'normal-lines';}
function nonNegativeInt(value,fallback=1){const n=parseInt(value,10);return Number.isFinite(n)?Math.max(0,n):fallback;}
function defaultSaerWordBlock(){return{initialWord:'',initialWordHtml:'',initialWordSolution:'',initialWordSolutionHtml:'',lines:1};}
function normaliseSaerWordBlocks(blocks){return Array.isArray(blocks)?blocks.map(b=>({initialWord:b.initialWord||'',initialWordHtml:b.initialWordHtml||'',initialWordSolution:b.initialWordSolution||'',initialWordSolutionHtml:b.initialWordSolutionHtml||'',lines:nonNegativeInt(b.lines,1)})):[];}
function renderSaerWordBlock(prefix,block,index,isMain=false){
  const b=block||defaultSaerWordBlock(),cls=isMain?' main-word-block':'';
  return `<div class="saer-word-block${cls}" data-saer-word-prefix="${prefix}" data-saer-word-index="${index}"><div class="saer-word-block-header"><div class="saer-part-title">Word with lines ${index+1}</div><button type="button" class="icon-btn saer-trash-btn" onclick="removeSaerWordBlock('${prefix}',${index})" title="Remove block"><i class="ti ti-trash"></i></button></div><div class="saer-word-block-grid"><div><div class="form-group"><label>Initial Word</label><div class="rich-editor-wrap"><div id="${prefix}-word-${index}" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter initial word..." onfocus="setActiveEditor('${prefix}-word-${index}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${b.initialWordHtml||esc(b.initialWord||'')}</div></div></div><div class="form-group"><label>Initial Word Solution</label><div class="rich-editor-wrap"><div id="${prefix}-word-solution-${index}" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter initial word solution..." onfocus="setActiveEditor('${prefix}-word-solution-${index}')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${b.initialWordSolutionHtml||esc(b.initialWordSolution||'')}</div></div></div></div><div class="form-group"><label>No.Lines</label><input class="saer-lines-input" id="${prefix}-word-lines-${index}" type="number" min="0" value="${esc(b.lines)}"></div></div></div>`;
}
function renderSaerWordPanel(prefix,item,isMain=false){
  const template=normaliseAnswerTemplate(item?.answerTemplate);let blocks=normaliseSaerWordBlocks(item?.wordLineBlocks);if(template==='word-lines'&&!blocks.length)blocks=[defaultSaerWordBlock()];
  return `<div id="${prefix}-answer-template-word-panel" class="saer-word-panel" style="${template==='word-lines'?'':'display:none'}"><div class="saer-word-actions"><button type="button" class="btn btn-sm" onclick="addSaerWordBlock('${prefix}')"><i class="ti ti-plus"></i>Add word line block</button><span style="font-size:11px;color:var(--color-text-secondary)">Adds Initial Word, Initial Word Solution, and No.Lines.</span></div><div id="${prefix}-word-blocks-stack">${blocks.map((b,i)=>renderSaerWordBlock(prefix,b,i,isMain)).join('')}</div></div>`;
}
function collectSaerWordBlocks(prefix){return[...document.querySelectorAll(`[data-saer-word-prefix="${prefix}"]`)].map((card,i)=>{const initialWordHtml=storedHtmlFrom(document.getElementById(`${prefix}-word-${i}`)),initialWordSolutionHtml=storedHtmlFrom(document.getElementById(`${prefix}-word-solution-${i}`));return{initialWord:plainTextFromHtml(initialWordHtml),initialWordHtml,initialWordSolution:plainTextFromHtml(initialWordSolutionHtml),initialWordSolutionHtml,lines:parseInt(document.getElementById(`${prefix}-word-lines-${i}`)?.value,10)||0};});}
function setSaerWordBlocks(prefix,blocks,isMain=false){const stack=document.getElementById(`${prefix}-word-blocks-stack`);if(!stack)return;stack.innerHTML=normaliseSaerWordBlocks(blocks).map((b,i)=>renderSaerWordBlock(prefix,b,i,isMain)).join('');renderKatexIn(stack);}
function addSaerWordBlock(prefix){const blocks=collectSaerWordBlocks(prefix);blocks.push(defaultSaerWordBlock());setSaerWordBlocks(prefix,blocks,prefix==='f');}
function removeSaerWordBlock(prefix,index){setSaerWordBlocks(prefix,collectSaerWordBlocks(prefix).filter((_,i)=>i!==index),prefix==='f');}
function renderAnswerTemplatePicker(id,value){
  const current=normaliseAnswerTemplate(value);
  return `<div class="answer-template-wrap"><label>Answer Template</label><div class="template-choices answer-template-choices">${ANSWER_TEMPLATE_OPTIONS.map(([val,label])=>`<button type="button" class="template-choice${current===val?' active':''}" onclick="setAnswerTemplate('${id}','${val}')"><span class="template-choice-title">${label}</span></button>`).join('')}</div><input type="hidden" id="${id}" value="${current}"></div>`;
}
function refreshAnswerTemplatePanels(id){
  if(id!=='f-answer-template')return;
  const type=document.getElementById('f-type')?.value||'mc';
  const value=normaliseAnswerTemplate(document.getElementById(id)?.value);
  const panel=document.getElementById('main-normal-lines-panel');
  if(panel)panel.style.display=(type==='sa'||type==='er')?(value==='normal-lines'?'':'none'):'';
  const showAnswerBox=(type==='sa'||type==='er')&&value==='normal-lines';
  const tablePanel=document.getElementById('main-table-image-panel');
  if(tablePanel)tablePanel.style.display=(type==='sa'||type==='er')&&value==='table-image'?'':'none';
  let wordPanel=document.getElementById('f-answer-template-word-panel');
  const solutionField=document.getElementById('solution-field');
  if(!wordPanel&&solutionField){solutionField.insertAdjacentHTML('beforeend',renderSaerWordPanel('f',{answerTemplate:value,wordLineBlocks:[]},true));wordPanel=document.getElementById('f-answer-template-word-panel');}
  if(wordPanel)wordPanel.style.display=(type==='sa'||type==='er')&&value==='word-lines'?'':'none';
  ['answer-box-upload-field','answer-box-solution-upload-field'].forEach(fieldId=>{const field=document.getElementById(fieldId);if(field)field.style.display=showAnswerBox?'':'none';});
}
function answerBoxImageIds(kind){const prefix=kind==='solution'?'f-answer-box-solution':kind==='table'?'f-answer-table':kind==='tableSolution'?'f-answer-table-solution':'f-answer-box';return{file:prefix+'-file',data:prefix+'-data',name:prefix+'-name',display:prefix+'-display',remove:prefix+'-remove'};}
function setAnswerBoxImage(kind,data='',name=''){
  const ids=answerBoxImageIds(kind),dataEl=document.getElementById(ids.data),nameEl=document.getElementById(ids.name),display=document.getElementById(ids.display),fileEl=document.getElementById(ids.file),removeBtn=document.getElementById(ids.remove);
  if(dataEl)dataEl.value=data||'';if(nameEl)nameEl.value=name||'';if(display)display.textContent=data?(name||'Image selected'):'';if(removeBtn)removeBtn.style.display=data?'inline-flex':'none';if(fileEl&&!data)fileEl.value='';
}
function clearAnswerBoxImage(kind){setAnswerBoxImage(kind,'','');}
function handleAnswerBoxImageUpload(event,kind){const file=event&&event.target&&event.target.files&&event.target.files[0];if(!file)return;if(!/^image\/(png|jpeg)$/i.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);event.target.value='';return;}const reader=new FileReader();reader.onload=()=>setAnswerBoxImage(kind,reader.result,file.name||'Answer box image');reader.readAsDataURL(file);}
function saerAnswerBoxIds(prefix,kind){const suffix=kind==='solution'?'-answer-box-solution':kind==='table'?'-answer-table':kind==='tableSolution'?'-answer-table-solution':'-answer-box';const base=prefix+suffix;return{file:base+'-file',data:base+'-data',name:base+'-name',display:base+'-display',remove:base+'-remove'};}
function setSaerAnswerBoxImage(prefix,kind,data='',name=''){
  const ids=saerAnswerBoxIds(prefix,kind),dataEl=document.getElementById(ids.data),nameEl=document.getElementById(ids.name),display=document.getElementById(ids.display),fileEl=document.getElementById(ids.file),removeBtn=document.getElementById(ids.remove);
  if(dataEl)dataEl.value=data||'';if(nameEl)nameEl.value=name||'';if(display)display.textContent=data?(name||'Image selected'):'';if(removeBtn)removeBtn.style.display=data?'inline-flex':'none';if(fileEl&&!data)fileEl.value='';
}
function clearSaerAnswerBoxImage(prefix,kind){setSaerAnswerBoxImage(prefix,kind,'','');}
function handleSaerAnswerBoxImageUpload(event,prefix,kind){const file=event&&event.target&&event.target.files&&event.target.files[0];if(!file)return;if(!/^image\/(png|jpeg)$/i.test(file.type)){showToast('Use a PNG, JPG, or JPEG image',true);event.target.value='';return;}const reader=new FileReader();reader.onload=()=>setSaerAnswerBoxImage(prefix,kind,reader.result,file.name||'Answer box image');reader.readAsDataURL(file);}
function renderSaerPerformanceControls(prefix,item={}){const response=item.responsePercent??item.response??'',attempt=parseInt(item.attemptCount,10)||0,correct=parseInt(item.correctCount,10)||0,difficulty=item.difficulty||'Medium';return`<div class="saer-performance-panel"><label>Performance</label><div class="saer-performance-grid"><div class="form-group"><label>Response (%)</label><input id="${prefix}-response" type="number" min="0" max="100" step="0.1" value="${esc(response)}" oninput="updateSaerPerformanceDifficulty('${prefix}')"></div><div class="form-group"><label>Attempt Count</label><input id="${prefix}-attempt-count" type="number" min="0" value="${esc(attempt)}" oninput="updateSaerPerformanceDifficulty('${prefix}')"></div><div class="form-group"><label>Correct Count</label><input id="${prefix}-correct-count" type="number" min="0" value="${esc(correct)}" oninput="updateSaerPerformanceDifficulty('${prefix}')"></div><div class="form-group"><label>Difficulty</label><select id="${prefix}-difficulty">${['Easy','Medium','Hard','Advance','Extension'].map(v=>`<option${v===difficulty?' selected':''}>${v}</option>`).join('')}</select></div></div></div>`;}
function updateSaerPerformanceDifficulty(prefix){const response=document.getElementById(prefix+'-response')?.value??'',attempt=parseInt(document.getElementById(prefix+'-attempt-count')?.value,10)||0,correct=parseInt(document.getElementById(prefix+'-correct-count')?.value,10)||0,select=document.getElementById(prefix+'-difficulty'),pct=calculatedResponsePercent(response,correct,attempt);if(select&&pct!==null)select.value=difficultyFromResponsePercent(pct);}
function collectSaerPerformance(prefix){const responseRaw=(document.getElementById(prefix+'-response')?.value||'').trim(),attemptCount=parseInt(document.getElementById(prefix+'-attempt-count')?.value,10)||0,correctCount=parseInt(document.getElementById(prefix+'-correct-count')?.value,10)||0,autoPercent=calculatedResponsePercent(responseRaw,correctCount,attemptCount),responsePercent=autoPercent===null?(responseRaw===''?0:clampResponsePercent(responseRaw)):Math.round(autoPercent*10)/10,difficulty=autoPercent===null?(document.getElementById(prefix+'-difficulty')?.value||'Medium'):difficultyFromResponsePercent(responsePercent);return{responsePercent,response:responsePercent,attemptCount,correctCount,difficulty};}function renderSaerAnswerBoxControls(prefix,item){const template=normaliseAnswerTemplate(item?.answerTemplate),normal=template==='normal-lines',table=template==='table-image',lines=nonNegativeInt(item?.lines,1),boxData=item?.answerBoxImageData||'',boxName=item?.answerBoxImageName||'',solutionData=item?.answerBoxSolutionImageData||'',solutionName=item?.answerBoxSolutionImageName||'',tableData=item?.tableAnswerImageData||'',tableName=item?.tableAnswerImageName||'',tableSolutionData=item?.tableAnswerSolutionImageData||'',tableSolutionName=item?.tableAnswerSolutionImageName||'',solutionHtml=item?.solutionHtml||esc(item?.solution||'');return`<div id="${prefix}-answer-template-normal-panel" class="saer-answer-normal-panel" style="${normal?'':'display:none'}"><div class="form-group"><label>Solution / marking guide</label><div class="rich-editor-wrap"><div id="${prefix}-solution" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter solution or marking notes..." onfocus="setActiveEditor('${prefix}-solution')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${solutionHtml}</div></div></div><div class="solution-controls-row"><div class="form-group saer-inline-lines"><label>No.Lines</label><input class="saer-lines-input" id="${prefix}-lines" type="number" min="0" value="${esc(lines)}"></div><div class="answer-box-upload"><label>Answer Box</label><div class="answer-box-upload-actions"><button type="button" class="btn btn-sm" onclick="document.getElementById('${prefix}-answer-box-file').click()"><i class="ti ti-photo-plus"></i>Answer Box</button><button type="button" id="${prefix}-answer-box-remove" class="btn btn-sm answer-box-remove" onclick="clearSaerAnswerBoxImage('${prefix}','box')" style="${boxData?'display:inline-flex':'display:none'}"><i class="ti ti-x"></i></button></div><input type="file" id="${prefix}-answer-box-file" accept="image/png,image/jpeg" style="display:none" onchange="handleSaerAnswerBoxImageUpload(event,'${prefix}','box')"><input type="hidden" id="${prefix}-answer-box-data" value="${esc(boxData)}"><input type="hidden" id="${prefix}-answer-box-name" value="${esc(boxName)}"><div id="${prefix}-answer-box-display" class="answer-box-name">${boxData?esc(boxName||'Image selected'):''}</div></div><div class="answer-box-upload"><label>Answer Box Solution</label><div class="answer-box-upload-actions"><button type="button" class="btn btn-sm" onclick="document.getElementById('${prefix}-answer-box-solution-file').click()"><i class="ti ti-photo-plus"></i>Answer Box Solution</button><button type="button" id="${prefix}-answer-box-solution-remove" class="btn btn-sm answer-box-remove" onclick="clearSaerAnswerBoxImage('${prefix}','solution')" style="${solutionData?'display:inline-flex':'display:none'}"><i class="ti ti-x"></i></button></div><input type="file" id="${prefix}-answer-box-solution-file" accept="image/png,image/jpeg" style="display:none" onchange="handleSaerAnswerBoxImageUpload(event,'${prefix}','solution')"><input type="hidden" id="${prefix}-answer-box-solution-data" value="${esc(solutionData)}"><input type="hidden" id="${prefix}-answer-box-solution-name" value="${esc(solutionName)}"><div id="${prefix}-answer-box-solution-display" class="answer-box-name">${solutionData?esc(solutionName||'Image selected'):''}</div></div></div></div>${renderSaerWordPanel(prefix,item,false)}<div id="${prefix}-answer-template-table-panel" class="saer-answer-table-panel" style="${table?'':'display:none'}"><div class="solution-controls-row"><div class="answer-box-upload"><label>Answer Table/Image</label><div class="answer-box-upload-actions"><button type="button" class="btn btn-sm" onclick="document.getElementById('${prefix}-answer-table-file').click()"><i class="ti ti-photo-plus"></i>Answer Table/Image</button><button type="button" id="${prefix}-answer-table-remove" class="btn btn-sm answer-box-remove" onclick="clearSaerAnswerBoxImage('${prefix}','table')" style="${tableData?'display:inline-flex':'display:none'}"><i class="ti ti-x"></i></button></div><input type="file" id="${prefix}-answer-table-file" accept="image/png,image/jpeg" style="display:none" onchange="handleSaerAnswerBoxImageUpload(event,'${prefix}','table')"><input type="hidden" id="${prefix}-answer-table-data" value="${esc(tableData)}"><input type="hidden" id="${prefix}-answer-table-name" value="${esc(tableName)}"><div id="${prefix}-answer-table-display" class="answer-box-name">${tableData?esc(tableName||'Image selected'):''}</div></div><div class="answer-box-upload"><label>Answer Table/Image Solution</label><div class="answer-box-upload-actions"><button type="button" class="btn btn-sm" onclick="document.getElementById('${prefix}-answer-table-solution-file').click()"><i class="ti ti-photo-plus"></i>Answer Table/Image Solution</button><button type="button" id="${prefix}-answer-table-solution-remove" class="btn btn-sm answer-box-remove" onclick="clearSaerAnswerBoxImage('${prefix}','tableSolution')" style="${tableSolutionData?'display:inline-flex':'display:none'}"><i class="ti ti-x"></i></button></div><input type="file" id="${prefix}-answer-table-solution-file" accept="image/png,image/jpeg" style="display:none" onchange="handleSaerAnswerBoxImageUpload(event,'${prefix}','tableSolution')"><input type="hidden" id="${prefix}-answer-table-solution-data" value="${esc(tableSolutionData)}"><input type="hidden" id="${prefix}-answer-table-solution-name" value="${esc(tableSolutionName)}"><div id="${prefix}-answer-table-solution-display" class="answer-box-name">${tableSolutionData?esc(tableSolutionName||'Image selected'):''}</div></div></div></div>`;}function setAnswerTemplate(id,value){
  const input=document.getElementById(id);if(input)input.value=normaliseAnswerTemplate(value);
  const wrap=input?.closest('.answer-template-wrap');if(!wrap)return;
  wrap.querySelectorAll('.template-choice').forEach(btn=>btn.classList.remove('active'));
  const index=ANSWER_TEMPLATE_OPTIONS.findIndex(([v])=>v===normaliseAnswerTemplate(value));
  const btn=wrap.querySelectorAll('.template-choice')[index];if(btn)btn.classList.add('active');
  refreshAnswerTemplatePanels(id);const selected=normaliseAnswerTemplate(value),normalPanel=document.getElementById(id+'-normal-panel'),wordPanel=document.getElementById(id+'-word-panel'),tablePanel=document.getElementById(id+'-table-panel');if(normalPanel)normalPanel.style.display=selected==='normal-lines'?'':'none';if(wordPanel)wordPanel.style.display=selected==='word-lines'?'':'none';if(tablePanel)tablePanel.style.display=selected==='table-image'?'':'none';
}function romanNumeral(n){const vals=[[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];let out='',num=Math.max(1,n||1);for(const [v,s] of vals){while(num>=v){out+=s;num-=v;}}return out;}
function defaultSaerPart(){return{text:'',textHtml:'',extraBlocks:[],lines:1,marks:1,answerTemplate:'normal-lines',wordLineBlocks:[],answerBoxImageData:'',answerBoxImageName:'',answerBoxSolutionImageData:'',answerBoxSolutionImageName:'',tableAnswerImageData:'',tableAnswerImageName:'',tableAnswerSolutionImageData:'',tableAnswerSolutionImageName:'',solution:'',solutionHtml:'',responsePercent:0,response:0,attemptCount:0,correctCount:0,difficulty:'Easy',subparts:[]};}
function defaultSaerSubpart(){return{text:'',textHtml:'',extraBlocks:[],lines:1,marks:1,answerTemplate:'normal-lines',wordLineBlocks:[],answerBoxImageData:'',answerBoxImageName:'',answerBoxSolutionImageData:'',answerBoxSolutionImageName:'',tableAnswerImageData:'',tableAnswerImageName:'',tableAnswerSolutionImageData:'',tableAnswerSolutionImageName:'',solution:'',solutionHtml:'',responsePercent:0,response:0,attemptCount:0,correctCount:0,difficulty:'Easy'};}
function normaliseSaerParts(parts){return Array.isArray(parts)?parts.map(p=>({text:p.text||'',textHtml:p.textHtml||'',extraBlocks:normaliseSaerExtraBlocks(p.extraBlocks),lines:nonNegativeInt(p.lines,1),marks:Math.max(0,parseInt(p.marks,10)||0),answerTemplate:normaliseAnswerTemplate(p.answerTemplate),wordLineBlocks:normaliseSaerWordBlocks(p.wordLineBlocks),answerBoxImageData:p.answerBoxImageData||'',answerBoxImageName:p.answerBoxImageName||'',answerBoxSolutionImageData:p.answerBoxSolutionImageData||'',answerBoxSolutionImageName:p.answerBoxSolutionImageName||'',tableAnswerImageData:p.tableAnswerImageData||'',tableAnswerImageName:p.tableAnswerImageName||'',tableAnswerSolutionImageData:p.tableAnswerSolutionImageData||'',tableAnswerSolutionImageName:p.tableAnswerSolutionImageName||'',solution:p.solution||'',solutionHtml:p.solutionHtml||'',responsePercent:clampResponsePercent(p.responsePercent??p.response??0),response:clampResponsePercent(p.responsePercent??p.response??0),attemptCount:Math.max(0,parseInt(p.attemptCount,10)||0),correctCount:Math.max(0,parseInt(p.correctCount,10)||0),difficulty:p.difficulty||'Medium',subparts:Array.isArray(p.subparts)?p.subparts.map(s=>({text:s.text||'',textHtml:s.textHtml||'',extraBlocks:normaliseSaerExtraBlocks(s.extraBlocks),lines:nonNegativeInt(s.lines,1),marks:Math.max(0,parseInt(s.marks,10)||0),answerTemplate:normaliseAnswerTemplate(s.answerTemplate),wordLineBlocks:normaliseSaerWordBlocks(s.wordLineBlocks),answerBoxImageData:s.answerBoxImageData||'',answerBoxImageName:s.answerBoxImageName||'',answerBoxSolutionImageData:s.answerBoxSolutionImageData||'',answerBoxSolutionImageName:s.answerBoxSolutionImageName||'',tableAnswerImageData:s.tableAnswerImageData||'',tableAnswerImageName:s.tableAnswerImageName||'',tableAnswerSolutionImageData:s.tableAnswerSolutionImageData||'',tableAnswerSolutionImageName:s.tableAnswerSolutionImageName||'',solution:s.solution||'',solutionHtml:s.solutionHtml||'',responsePercent:clampResponsePercent(s.responsePercent??s.response??0),response:clampResponsePercent(s.responsePercent??s.response??0),attemptCount:Math.max(0,parseInt(s.attemptCount,10)||0),correctCount:Math.max(0,parseInt(s.correctCount,10)||0),difficulty:s.difficulty||'Medium'})):[]})):[];}
function renderSaerSubpart(sub,pi,si){const s=sub||defaultSaerSubpart(),label=romanNumeral(si+1);return`<div class="saer-subpart-card" data-saer-subpart-index="${si}"><div class="saer-subpart-header"><div class="saer-subpart-title">${label}.</div><button type="button" class="icon-btn saer-trash-btn" onclick="removeSaerSubpart(${pi},${si})" title="Remove subpart"><i class="ti ti-trash"></i></button></div><div class="saer-part-grid"><div class="form-group"><label>Subpart ${label} text</label><div class="rich-editor-wrap"><div id="saer-part-${pi}-sub-${si}-text" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter subpart text..." onfocus="setActiveEditor('saer-part-${pi}-sub-${si}-text')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${s.textHtml||esc(s.text||'')}</div></div>${renderSaerExtraBlocksBuilder(null,null,`saer-part-${pi}-sub-${si}`,s.extraBlocks||[])}${renderAnswerTemplatePicker(`saer-part-${pi}-sub-${si}-answer-template`,s.answerTemplate)}${renderSaerAnswerBoxControls(`saer-part-${pi}-sub-${si}`,s)}${renderSaerPerformanceControls(`saer-part-${pi}-sub-${si}`,s)}</div><div class="saer-side-controls"><div class="form-group"><label>Marks</label><input class="saer-mark-input" id="saer-part-${pi}-sub-${si}-marks" type="number" min="0" value="${esc(s.marks||1)}" oninput="updateSaerMarksFromParts()"></div></div></div></div>`;}
function renderSaerPart(part,index){const p=part||defaultSaerPart(),label=String.fromCharCode(97+index),subs=p.subparts||[];return`<div class="saer-part-card" data-saer-part-index="${index}"><div class="saer-part-header"><div class="saer-part-title">Part ${label}.</div><div class="saer-part-actions"><button type="button" class="btn btn-sm" onclick="addSaerSubpart(${index})"><i class="ti ti-plus"></i>Subpart</button><button type="button" class="icon-btn saer-trash-btn" onclick="removeSaerPart(${index})" title="Remove part"><i class="ti ti-trash"></i></button></div></div><div class="saer-part-grid"><div class="form-group"><label>Part ${label} text</label><div class="rich-editor-wrap"><div id="saer-part-${index}-text" class="rich-editor editable-text" contenteditable="true" data-placeholder="Enter part text..." onfocus="setActiveEditor('saer-part-${index}-text')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${p.textHtml||esc(p.text||'')}</div></div>${renderSaerExtraBlocksBuilder(null,null,`saer-part-${index}`,p.extraBlocks||[])}${renderAnswerTemplatePicker(`saer-part-${index}-answer-template`,p.answerTemplate)}${renderSaerAnswerBoxControls(`saer-part-${index}`,p)}${renderSaerPerformanceControls(`saer-part-${index}`,p)}</div><div class="saer-side-controls"><div class="form-group"><label>Marks</label><input class="saer-mark-input" id="saer-part-${index}-marks" type="number" min="0" value="${esc(p.marks||1)}" oninput="updateSaerMarksFromParts()"></div></div></div><div class="saer-subparts" id="saer-part-${index}-subparts">${subs.map((s,si)=>renderSaerSubpart(s,index,si)).join('')}</div></div>`;}
function renderSaerPartsBuilder(parts){const list=normaliseSaerParts(parts);return`<div class="form-group saer-parts-builder"><label>Parts</label><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><button type="button" class="btn btn-sm" onclick="addSaerPart()"><i class="ti ti-plus"></i>Add part</button><span style="font-size:11px;color:var(--color-text-secondary)">Use parts for a, b, c and subparts for i, ii, iii.</span></div><div id="saer-parts-stack">${list.map((p,i)=>renderSaerPart(p,i)).join('')}</div></div>`;}
function collectSaerParts(){return[...document.querySelectorAll('[data-saer-part-index]')].map((card,pi)=>{const textHtml=storedHtmlFrom(document.getElementById(`saer-part-${pi}-text`)),solutionHtml=storedHtmlFrom(document.getElementById(`saer-part-${pi}-solution`));return{text:plainTextFromHtml(textHtml),textHtml,extraBlocks:collectSaerExtraBlocks(`saer-part-${pi}`),lines:parseInt(document.getElementById(`saer-part-${pi}-lines`)?.value,10)||0,marks:parseInt(document.getElementById(`saer-part-${pi}-marks`)?.value,10)||0,answerTemplate:normaliseAnswerTemplate(document.getElementById(`saer-part-${pi}-answer-template`)?.value),wordLineBlocks:collectSaerWordBlocks(`saer-part-${pi}`),answerBoxImageData:document.getElementById(`saer-part-${pi}-answer-box-data`)?.value||'',answerBoxImageName:document.getElementById(`saer-part-${pi}-answer-box-name`)?.value||'',answerBoxSolutionImageData:document.getElementById(`saer-part-${pi}-answer-box-solution-data`)?.value||'',answerBoxSolutionImageName:document.getElementById(`saer-part-${pi}-answer-box-solution-name`)?.value||'',tableAnswerImageData:document.getElementById(`saer-part-${pi}-answer-table-data`)?.value||'',tableAnswerImageName:document.getElementById(`saer-part-${pi}-answer-table-name`)?.value||'',tableAnswerSolutionImageData:document.getElementById(`saer-part-${pi}-answer-table-solution-data`)?.value||'',tableAnswerSolutionImageName:document.getElementById(`saer-part-${pi}-answer-table-solution-name`)?.value||'',solution:plainTextFromHtml(solutionHtml),solutionHtml,...collectSaerPerformance(`saer-part-${pi}`),subparts:[...card.querySelectorAll('[data-saer-subpart-index]')].map((sub,si)=>{const sTextHtml=storedHtmlFrom(document.getElementById(`saer-part-${pi}-sub-${si}-text`)),sSolutionHtml=storedHtmlFrom(document.getElementById(`saer-part-${pi}-sub-${si}-solution`));return{text:plainTextFromHtml(sTextHtml),textHtml:sTextHtml,extraBlocks:collectSaerExtraBlocks(`saer-part-${pi}-sub-${si}`),lines:parseInt(document.getElementById(`saer-part-${pi}-sub-${si}-lines`)?.value,10)||0,marks:parseInt(document.getElementById(`saer-part-${pi}-sub-${si}-marks`)?.value,10)||0,answerTemplate:normaliseAnswerTemplate(document.getElementById(`saer-part-${pi}-sub-${si}-answer-template`)?.value),wordLineBlocks:collectSaerWordBlocks(`saer-part-${pi}-sub-${si}`),answerBoxImageData:document.getElementById(`saer-part-${pi}-sub-${si}-answer-box-data`)?.value||'',answerBoxImageName:document.getElementById(`saer-part-${pi}-sub-${si}-answer-box-name`)?.value||'',answerBoxSolutionImageData:document.getElementById(`saer-part-${pi}-sub-${si}-answer-box-solution-data`)?.value||'',answerBoxSolutionImageName:document.getElementById(`saer-part-${pi}-sub-${si}-answer-box-solution-name`)?.value||'',tableAnswerImageData:document.getElementById(`saer-part-${pi}-sub-${si}-answer-table-data`)?.value||'',tableAnswerImageName:document.getElementById(`saer-part-${pi}-sub-${si}-answer-table-name`)?.value||'',tableAnswerSolutionImageData:document.getElementById(`saer-part-${pi}-sub-${si}-answer-table-solution-data`)?.value||'',tableAnswerSolutionImageName:document.getElementById(`saer-part-${pi}-sub-${si}-answer-table-solution-name`)?.value||'',solution:plainTextFromHtml(sSolutionHtml),solutionHtml:sSolutionHtml,...collectSaerPerformance(`saer-part-${pi}-sub-${si}`)};})};});}
function setSaerParts(parts){const stack=document.getElementById('saer-parts-stack');if(!stack)return;stack.innerHTML=normaliseSaerParts(parts).map((p,i)=>renderSaerPart(p,i)).join('');renderKatexIn(stack);updateSaerMarksFromParts();}
function addSaerPart(){const parts=collectSaerParts();parts.push(defaultSaerPart());setSaerParts(parts);}
function removeSaerPart(index){setSaerParts(collectSaerParts().filter((_,i)=>i!==index));}
function addSaerSubpart(index){const parts=collectSaerParts();parts[index]=parts[index]||defaultSaerPart();parts[index].subparts=parts[index].subparts||[];parts[index].subparts.push(defaultSaerSubpart());setSaerParts(parts);}
function removeSaerSubpart(pi,si){const parts=collectSaerParts();if(parts[pi])parts[pi].subparts=(parts[pi].subparts||[]).filter((_,i)=>i!==si);setSaerParts(parts);}
function saerPartsMarks(parts){return normaliseSaerParts(parts).reduce((sum,p)=>sum+((p.subparts&&p.subparts.length)?p.subparts.reduce((a,s)=>a+(Number(s.marks)||0),0):(Number(p.marks)||0)),0);}
function updateSaerMarksFromParts(){const marks=document.getElementById('f-marks'),parts=collectSaerParts(),total=saerPartsMarks(parts);if(marks&&parts.length)marks.value=total;}
function saerPartsHtml(parts){const list=normaliseSaerParts(parts);if(!list.length)return'';return`<div class="saer-parts-display">${list.map((p,pi)=>{const label=String.fromCharCode(97+pi);const subs=p.subparts||[];return`<div class="q-text"><strong>${label}.</strong> ${p.textHtml||esc(p.text||'')} ${p.marks&&!subs.length?`<span class="marks-badge">${p.marks} mark${p.marks!==1?'s':''}</span>`:''}</div>${saerExtraBlocksHtml(p)}${subs.map((s,si)=>`<div class="q-text" style="margin-left:24px"><strong>${romanNumeral(si+1)}.</strong> ${s.textHtml||esc(s.text||'')} ${s.marks?`<span class="marks-badge">${s.marks} mark${s.marks!==1?'s':''}</span>`:''}</div>${saerExtraBlocksHtml(s)}`).join('')}`;}).join('')}</div>`;}function renderSupplementalQuestionFields(existing,type){
  const parts=existing&&existing.type===type?existing.parts||[]:[];
  return `${renderSaerExtraBlocksBuilder(existing,type)}${renderSaerPartsBuilder(parts)}`;
}function syncQuestionTypeButtons(){
  const current=document.getElementById('f-type')?.value||'mc';
  document.querySelectorAll('#question-type-picker .template-choice').forEach(btn=>btn.classList.toggle('active',btn.dataset.questionType===current));
}
function setQuestionType(type){
  const input=document.getElementById('f-type');
  if(input)input.value=['mc','tf','sa','er'].includes(type)?type:'mc';
  syncQuestionTypeButtons();
  updateTypeFields();
}
function updateTypeFields(existing=null){
  syncQuestionTypeButtons();
  const type=document.getElementById('f-type')?.value||'mc',picker=document.getElementById('mc-template-picker'),fields=document.getElementById('type-fields');
  if(!fields)return;
  window.__editingQuestion=existing||null;
  if(type==='mc'){
    if(picker)picker.style.display='block';
    const template=(existing&&existing.type==='mc'&&existing.template)||'standard';
    renderMcTemplatePicker(template);
    fields.innerHTML=`<div id="mc-template-fields"></div><div class="form-group" id="mc-main-options"></div>`;
    renderMcOptions(existing||{optionTemplate:'standard',options:['','','',''],optionsHtml:[],correct:0});
    updateMcTemplateFields(existing);
  }else{
    if(picker){picker.innerHTML='';picker.style.display='none';}
    const text=document.getElementById('f-text');
    if(text){text.setAttribute('contenteditable','true');text.classList.remove('compact');}
    const label=document.getElementById('main-text-label');if(label)label.textContent='Question text';const solutionField=document.getElementById('solution-field');if(solutionField)solutionField.style.display='';const answerTemplateField=document.getElementById('answer-template-field');if(answerTemplateField){if(type==='sa'||type==='er'){answerTemplateField.style.display='';answerTemplateField.innerHTML=renderAnswerTemplatePicker('f-answer-template',existing&&existing.type===type?existing.answerTemplate:'normal-lines');}else{answerTemplateField.style.display='none';answerTemplateField.innerHTML='';}}const solutionLinesField=document.getElementById('solution-lines-field');if(solutionLinesField)solutionLinesField.style.display=(type==='sa'||type==='er')?'':'none';setAnswerBoxImage('box',existing&&existing.type===type?existing.answerBoxImageData||'':'',existing&&existing.type===type?existing.answerBoxImageName||'':'');setAnswerBoxImage('solution',existing&&existing.type===type?existing.answerBoxSolutionImageData||'':'',existing&&existing.type===type?existing.answerBoxSolutionImageName||'':'');setAnswerBoxImage('table',existing&&existing.type===type?existing.tableAnswerImageData||'':'',existing&&existing.type===type?existing.tableAnswerImageName||'':'');setAnswerBoxImage('tableSolution',existing&&existing.type===type?existing.tableAnswerSolutionImageData||'':'',existing&&existing.type===type?existing.tableAnswerSolutionImageName||'':'');
    const marks=document.getElementById('f-marks');if(marks){marks.readOnly=false;if(type==='tf')marks.value=1;}
    if(type==='tf'){
      const imageData=existing&&existing.type==='tf'?existing.imageData||'':'',imageName=existing&&existing.type==='tf'?existing.imageName||'':'',source=existing&&existing.type==='tf'?existing.source||'':'',sourceType=existing&&existing.type==='tf'&&existing.sourceType==='data'?'data':'source',afterText=existing&&existing.type==='tf'?existing.afterText||'':'',afterTextHtml=existing&&existing.type==='tf'&&existing.afterTextHtml?existing.afterTextHtml:esc(afterText),correct=existing&&existing.type==='tf'&&Number.isInteger(Number(existing.correct))?Number(existing.correct):0;
      const diagramPanel=`<div class="form-group"><label>Diagram</label><div style="display:flex;gap:6px;align-items:center"><input type="file" id="f-diagram" accept="image/png,image/jpeg" onchange="handleDiagramUpload(event)"><button type="button" class="btn btn-sm" onclick="clearDiagramImage()"><i class="ti ti-x"></i>Remove</button></div><div class="paste-zone" tabindex="0" onpaste="handleDiagramPaste(event)">Paste image here, or choose a PNG/JPG/JPEG file.</div><input type="hidden" id="f-image-data" value="${esc(imageData)}"><input type="hidden" id="f-image-name" value="${esc(imageName)}"><div id="diagram-preview-wrap">${imageData?`<img class="diagram-preview" src="${imageData}" alt="${esc(imageName||'Diagram preview')}">`:''}</div></div>`;
      const sourcePanel=`<div class="form-group"><label>Source type</label><div style="display:grid;grid-template-columns:180px 1fr;gap:8px"><select id="f-source-type"><option value="source"${sourceType==='source'?' selected':''}>Source</option><option value="data"${sourceType==='data'?' selected':''}>Data</option></select><input id="f-source" value="${esc(source)}" placeholder="${sourceType==='data'?'Paste data link here...':'Enter source here...'}"></div></div>`;
      const afterTextPanel=`<div class="form-group"><label>Question text <span style="font-weight:400;color:var(--color-text-secondary)">(optional)</span></label><div class="rich-editor-wrap"><div id="f-after-text" class="rich-editor editable-text" contenteditable="true" data-placeholder="Optional question text..." onfocus="setActiveEditor('f-after-text')" onkeyup="updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${afterTextHtml}</div></div></div>`;
      const tfOptions=`<div class="form-group"><label>Options <span style="font-size:11px;font-weight:400;color:var(--color-text-secondary)">(select correct answer)</span></label>${['True','False'].map((label,i)=>`<div class="option-input-row standard-option-row"><input type="radio" name="tf-correct" value="${i}"${correct===i?' checked':''}><input class="tf-readonly-option" type="text" value="${label}" readonly tabindex="-1"></div>`).join('')}</div>`;
      fields.innerHTML=`${diagramPanel}${sourcePanel}${afterTextPanel}${tfOptions}`;renderKatexIn(fields);setTimeout(refreshQuestionToolbarPin,0);
    }else if(type==='sa'||type==='er'){
      fields.innerHTML=renderSupplementalQuestionFields(existing,type);renderKatexIn(fields);setTimeout(refreshQuestionToolbarPin,0);
    }else fields.innerHTML='';
  }
  refreshAnswerTemplatePanels('f-answer-template');if(type==='sa'||type==='er')setSaerWordBlocks('f',existing&&existing.type===type?existing.wordLineBlocks||[]:[],true);
}
function clampResponsePercent(value){
  const num=Number(value);
  if(!Number.isFinite(num))return 0;
  return Math.max(0,Math.min(100,num));
}
function difficultyFromResponsePercent(percent){
  const p=clampResponsePercent(percent);
  if(p>=80)return 'Easy';
  if(p>=60)return 'Medium';
  if(p>=40)return 'Hard';
  if(p>=20)return 'Advance';
  return 'Extension';
}
function calculatedResponsePercent(responseValue,correctCount,attemptCount){
  const raw=String(responseValue??'').trim();
  const hasResponse=raw!==''&&Number.isFinite(Number(raw));
  const responsePercent=hasResponse?clampResponsePercent(raw):null;
  const attempts=Number(attemptCount)||0;
  const correct=Number(correctCount)||0;
  const attemptPercent=attempts>0?clampResponsePercent((correct/attempts)*100):null;
  if(responsePercent!==null&&attemptPercent!==null)return (responsePercent+attemptPercent)/2;
  if(responsePercent!==null)return responsePercent;
  if(attemptPercent!==null)return attemptPercent;
  return null;
}
function normaliseVcaaReport(report={}){
  return {
    headerImageData:report.headerImageData||report.header_image_data||'',
    headerImageName:report.headerImageName||report.header_image_name||'',
    reportImageData:report.reportImageData||report.report_image_data||'',
    reportImageName:report.reportImageName||report.report_image_name||''
  };
}
function vcaaReportFieldIds(kind){
  return {
    input:`f-vcaa-report-${kind}`,
    data:`f-vcaa-report-${kind}-data`,
    name:`f-vcaa-report-${kind}-name`,
    preview:`vcaa-report-${kind}-preview`,
    remove:`f-vcaa-report-${kind}-remove`
  };
}
function setVcaaReportImage(kind,data,name){
  const ids=vcaaReportFieldIds(kind);
  const dataEl=document.getElementById(ids.data);
  const nameEl=document.getElementById(ids.name);
  const preview=document.getElementById(ids.preview);
  const remove=document.getElementById(ids.remove);
  if(dataEl)dataEl.value=data||'';
  if(nameEl)nameEl.value=name||'';
  if(remove)remove.style.display=data?'inline-flex':'none';
  if(preview){
    preview.innerHTML=data?`<img src="${data}" alt="${esc(name||kind)}"><span>${esc(name||'image')}</span>`:'';
  }
}
function clearVcaaReportImage(kind){
  setVcaaReportImage(kind,'','');
  const input=document.getElementById(vcaaReportFieldIds(kind).input);
  if(input)input.value='';
}
function readVcaaReportFile(kind,file){
  if(!file)return;
  if(!/image\/(png|jpe?g)/i.test(file.type||'')){showToast('Please choose a PNG, JPG, or JPEG image.',true);return;}
  const reader=new FileReader();
  reader.onload=()=>setVcaaReportImage(kind,reader.result,file.name||'image');
  reader.readAsDataURL(file);
}
function handleVcaaReportUpload(event,kind){readVcaaReportFile(kind,event.target.files&&event.target.files[0]);}
function handleVcaaReportPaste(event,kind){
  const item=Array.from(event.clipboardData?.items||[]).find(i=>/^image\//i.test(i.type));
  if(item){event.preventDefault();readVcaaReportFile(kind,item.getAsFile());}
}
function collectVcaaReport(){
  const field=(kind,key)=>document.getElementById(vcaaReportFieldIds(kind)[key])?.value||'';
  return {
    headerImageData:field('header','data'),
    headerImageName:field('header','name'),
    reportImageData:field('report','data'),
    reportImageName:field('report','name')
  };
}
function setVcaaReport(report={}){
  const r=normaliseVcaaReport(report);
  setVcaaReportImage('header',r.headerImageData,r.headerImageName);
  setVcaaReportImage('report',r.reportImageData,r.reportImageName);
}
function resetVcaaReport(){setVcaaReport({});}
function metadataState(){
  const subject=getCreatorMultiValues('subjects').join(', ')||'Mathematics';
  const topic=getCreatorMultiValues('topics').join(', ');
  const subtopic=getCreatorMultiValues('subtopics').join(', ');
  const skills=getCreatorMultiValues('skills').join('; ');
  const yearLevels=getCreatorYearLevels();
  const yearLevel=yearLevels[0]||'7';
  const selectedDifficulty=document.getElementById('f-difficulty')?.value||'Medium';
  const calculator=document.getElementById('f-calculator')?.value||'Calculator';
  const author=document.getElementById('f-author')?.value||'Original';
  const date=parseInt(document.getElementById('f-date')?.value,10)||new Date().getFullYear();
  const questionNumber=Math.max(1,parseInt(document.getElementById('f-question-number')?.value,10)||1);
  const responseRaw=(document.getElementById('f-response')?.value||'').trim();
  const lines=nonNegativeInt(document.getElementById('f-lines')?.value,1);
  const teacherRating=parseFloat(document.getElementById('f-teacher-rating')?.value)||0;
  const studentRating=parseFloat(document.getElementById('f-student-rating')?.value)||0;
  const teacherRatingCount=parseInt(document.getElementById('f-teacher-rating-count')?.value,10)||0;
  const studentRatingCount=parseInt(document.getElementById('f-student-rating-count')?.value,10)||0;
  const teacherRatingTotal=parseFloat(document.getElementById('f-teacher-rating-total')?.value)||0;
  const studentRatingTotal=parseFloat(document.getElementById('f-student-rating-total')?.value)||0;
  const ratingCount=teacherRatingCount+studentRatingCount;
  const averageRating=ratingCount?Math.round(((teacherRatingTotal+studentRatingTotal)/ratingCount)*10)/10:0;
  const attemptCount=parseInt(document.getElementById('f-attempt-count')?.value,10)||0;
  const correctCount=parseInt(document.getElementById('f-correct-count')?.value,10)||0;
  const autoPercent=calculatedResponsePercent(responseRaw,correctCount,attemptCount);
  const responsePercent=autoPercent===null?(responseRaw===''?0:clampResponsePercent(responseRaw)):Math.round(autoPercent*10)/10;
  const difficulty=autoPercent===null?selectedDifficulty:difficultyFromResponsePercent(responsePercent);
  const reviewedBy=document.getElementById('f-reviewed-by')?.value||'';
  return{subject,subjects:subject,topic,topics:topic,subtopic,subtopics:subtopic,skills,yearLevels,yearLevel:yearLevels,yearFrom:yearLevel,yearTo:yearLevels[yearLevels.length-1]||yearLevel,year:yearLevels.join(', '),mainArea:subject,curriculum:'',strand:topic,difficulty,calculator,author,date,questionNumber,responsePercent,response:responsePercent,lines,bank:isSTeacherRole()?'private':(document.getElementById('f-bank')?.value||'private'),marks:parseInt(document.getElementById('f-marks')?.value,10)||1,teacherRating,studentRating,teacherRatingCount,studentRatingCount,teacherRatingTotal,studentRatingTotal,ratingCount,averageRating,attemptCount,correctCount,comments:document.getElementById('f-comments')?.value||'',reviewStatus:document.getElementById('f-review-status')?.value||'Draft',reviewedBy,reviewedby:reviewedBy};
}function supabaseQuestionRow(question){
  const q={...question};
  delete q.supabaseId;
  return {
    old_id:String(q.id??''),
    bank:q.bank??'private',
    type:q.type??'',
    template:q.template??'',
    option_template:q.optionTemplate??'',
    subject:q.subjects??q.subject??'',
    topics:q.topics??q.topic??'',
    subtopics:q.subtopics??q.subtopic??'',
    skills:q.skills??'',
    year_levels:Array.isArray(q.yearLevels)?q.yearLevels:(q.yearLevels?[q.yearLevels]:[]),
    difficulty:q.difficulty??'',
    calculator:q.calculator??'',
    author:q.author??'',
    year:Number(q.date??q.year??new Date().getFullYear()),
    question_number:Number(q.questionNumber??1),
    response_percent:Number(q.responsePercent??q.response??0),
    attempt_count:Number(q.attemptCount??0),
    correct_count:Number(q.correctCount??0),
    data:q
  };
}
async function saveQuestionToSupabase(question){
  if(!supabaseClient)return question;
  const row=supabaseQuestionRow(question);
  if(question.supabaseId){
    const {data,error}=await supabaseClient.from('questions').update(row).eq('id',question.supabaseId).select('id').single();
    if(error)throw error;
    return {...question,supabaseId:data?.id||question.supabaseId};
  }
  const {data,error}=await supabaseClient.from('questions').insert(row).select('id').single();
  if(error)throw error;
  return {...question,supabaseId:data?.id};
}
async function deleteQuestionFromSupabase(question){
  if(!supabaseClient||!question)return true;
  const query=supabaseClient.from('questions').delete();
  const {error}=question.supabaseId?await query.eq('id',question.supabaseId):await query.eq('old_id',String(question.id??''));
  if(error)throw error;
  return true;
}async function saveQuestion(){
  if(isTeacherRole()||isSTeacherRole()){showToast(isSTeacherRole()?'S.Teacher role cannot create or edit questions':'Teacher role cannot create or edit questions',true);return;}
  const type=document.getElementById('f-type')?.value||'mc',meta=metadataState();
  let q={id:editingId||nextId++,type,text:getQuestionText(),textHtml:getQuestionHtml(),solution:getSolutionText(),solutionHtml:getSolutionHtml(),lines:nonNegativeInt(document.getElementById('f-lines')?.value,1),vcaaReport:collectVcaaReport(),...meta};
  if(type==='mc'){
    const template=document.getElementById('f-mcq-template')?.value||'standard';
    q.template=template;
    if(template==='multiple'){
      const subs=collectMultipleSubQuestions();
      q.text=getMultipleQuestionText();q.textHtml=getMultipleQuestionHtml();q.multiInstruction=multipleInstructionText(subs.length);q.subQuestions=subs;assignMcLegacyFields(q,collectMcContentBlocks('mc-multiple-shared'));q.marks=subs.length;
    }else{
      Object.assign(q,collectOptionState());
      if(template==='diagram'){assignMcLegacyFields(q,collectMcContentBlocks('mc-diagram'));}
      q.marks=1;
    }
  }else if(type==='tf'){
    const selected=document.querySelector('input[name=tf-correct]:checked');
    q.options=['True','False'];q.optionsHtml=['True','False'];q.correct=selected?parseInt(selected.value,10):0;
    q.imageData=document.getElementById('f-image-data')?.value||'';q.imageName=document.getElementById('f-image-name')?.value||'';q.source=document.getElementById('f-source')?.value||'';q.sourceType=document.getElementById('f-source-type')?.value||'source';q.afterTextHtml=storedHtmlFrom(document.getElementById('f-after-text'));q.afterText=plainTextFromHtml(q.afterTextHtml);q.marks=1;
  }else if(type==='sa'||type==='er'){
    q.answerTemplate=normaliseAnswerTemplate(document.getElementById('f-answer-template')?.value);q.wordLineBlocks=collectSaerWordBlocks('f');q.answerBoxImageData=document.getElementById('f-answer-box-data')?.value||'';q.answerBoxImageName=document.getElementById('f-answer-box-name')?.value||'';q.answerBoxSolutionImageData=document.getElementById('f-answer-box-solution-data')?.value||'';q.answerBoxSolutionImageName=document.getElementById('f-answer-box-solution-name')?.value||'';q.tableAnswerImageData=document.getElementById('f-answer-table-data')?.value||'';q.tableAnswerImageName=document.getElementById('f-answer-table-name')?.value||'';q.tableAnswerSolutionImageData=document.getElementById('f-answer-table-solution-data')?.value||'';q.tableAnswerSolutionImageName=document.getElementById('f-answer-table-solution-name')?.value||'';q.extraBlocks=collectSaerExtraBlocks();const firstExtra=q.extraBlocks[0]||{};q.imageData=firstExtra.imageData||'';q.imageName=firstExtra.imageName||'';q.source=firstExtra.source||'';q.sourceType=firstExtra.sourceType||'source';q.afterText=firstExtra.afterText||'';q.afterTextHtml=firstExtra.afterTextHtml||'';q.parts=collectSaerParts();const partMarks=saerPartsMarks(q.parts);if(q.parts.length)q.marks=partMarks;
  }
  if(!q.text&&!(q.type==='mc'&&q.template==='multiple')){showToast('Add question text first',true);return;}
  let clean=normalizeQuestion(q),index=questions.findIndex(x=>x.id===clean.id);
  const previous=index>=0?questions[index]:null;
  if(previous?.supabaseId)clean.supabaseId=previous.supabaseId;
  let onlineSaved=true;
  try{clean=await saveQuestionToSupabase(clean);}catch(e){onlineSaved=false;console.error('Could not save question to Supabase:',e);}
  index=questions.findIndex(x=>x.id===clean.id);
  if(index>=0)questions[index]=clean;else questions.push(clean);
  editingId=null;window.__editingQuestion=null;saveState();resetForm();renderBank();showView('bank');showToast(onlineSaved?(index>=0?'Question updated':'Question added'):(index>=0?'Question updated locally - Supabase save failed':'Question added locally - Supabase save failed'),!onlineSaved);
}
function setFieldValue(id,value){const el=document.getElementById(id);if(el)el.value=value??'';}
function activeLearningAreaName(){return normalizeLearningAreaName(curriculumManagerState?.learningArea||'Mathematics');}
function examSubjectValues(area=null){
  if(area){
    const activeArea=normalizeLearningAreaName(area);
    return [...new Set(ensureLearningAreaSubjectRecord(activeArea).map(normalizeSubjectName).filter(Boolean))];
  }
  const values=[];
  curriculumLearningAreas().forEach(areaName=>ensureLearningAreaSubjectRecord(areaName).forEach(subject=>values.push(subject)));
  return [...new Set(values.map(normalizeSubjectName).filter(Boolean))];
}
function curriculumYearLevelValues(area=null){
  const linkedYears=[];
  const targetArea=area?normalizeLearningAreaName(area):'';
  CURRICULUM_SKILL_LINKS.forEach(link=>{if(!targetArea||normalizeLearningAreaName(link.learningArea||'Mathematics')===targetArea)(link.yearLevels||[]).forEach(year=>{if(year)linkedYears.push(year);});});
  const areaYears=targetArea?ensureLearningAreaYearLevelRecord(targetArea):curriculumLearningAreas().flatMap(a=>ensureLearningAreaYearLevelRecord(a));
  return [...new Set([...areaYears,...customYearLevels,...linkedYears].map(s=>String(s||'').trim()).filter(Boolean))];
}
function curriculumManagerYearLevelValues(){
  const values=curriculumYearLevelValues(activeCurriculumLearningArea());
  const base=[...YEAR_LEVEL_OPTIONS].reverse();
  const extras=values.filter(v=>!YEAR_LEVEL_OPTIONS.includes(v)).sort((a,b)=>String(b).localeCompare(String(a),undefined,{numeric:true,sensitivity:'base'}));
  return [...new Set([...base,...extras].filter(v=>values.includes(v)))];
}
function currentExamSubject(){return getExamDetails().subject||'Foundation Mathematics';}
function syncExamSubjectOptions(selected){
  const el=document.getElementById('exam-subject');
  if(!el)return;
  const current=normalizeSubjectName(selected||el.value||'Foundation Mathematics');
  const allValues=examSubjectValues();
  const values=typeof window.orderSubjectsByHomeClassrooms==='function'?window.orderSubjectsByHomeClassrooms(allValues):allValues;
  el.innerHTML=values.map(subject=>`<option value="${esc(subject)}">${esc(subject)}</option>`).join('');
  el.value=values.includes(current)?current:(values[0]||'');
}
function syncCreatorSubjectOptions(selected){
  syncCreatorMultiOptions('subjects',splitCreatorMultiValue(selected||currentExamSubject(),'subjects'));
}
function getCreatorYearLevels(){
  const selected=getCreatorMultiValues('year-level');
  return selected.length?selected:['7'];
}
function updateYearLevelButton(){
  updateCreatorMultiButton('year-level');
}
function syncCreatorYearLevelOptions(selected){
  syncCreatorMultiOptions('year-level',normalizeYearLevels(selected));
}
function curriculumSkillNames(){
  return [...new Set(CURRICULUM_SKILL_LINKS.map(link=>String(link.skill||'').trim()).filter(Boolean))];
}
function splitCreatorMultiValue(value,field=''){
  if(Array.isArray(value))return [...new Set(value.map(v=>String(v).trim()).filter(Boolean))];
  const text=String(value||'').trim();
  if(!text)return [];
  if(field==='skills'){
    const known=curriculumSkillNames();
    if(known.includes(text))return [text];
    const semicolonParts=text.split(/[;\n]+/).map(v=>v.trim()).filter(Boolean);
    if(semicolonParts.length>1)return [...new Set(semicolonParts)];
    const commaParts=text.split(',').map(v=>v.trim()).filter(Boolean);
    if(commaParts.length>1&&commaParts.every(v=>known.includes(v)))return [...new Set(commaParts)];
    return [text];
  }
  const raw=text.split(/[,;]+/);
  return [...new Set(raw.map(v=>String(v).trim()).filter(Boolean))];
}
function writeCreatorMultiValue(target,field,values){
  if(!target)return false;
  const clean=[...new Set((values||[]).map(v=>String(v).trim()).filter(Boolean))];
  target[field]=Array.isArray(target[field])?clean:clean.join(field==='skills'?'; ':', ');
  return true;
}
function questionMetaValues(question,fields){
  return [...new Set(fields.flatMap(field=>splitCreatorMultiValue(question?.[field],field)))];
}
function replaceQuestionMetaValue(question,fields,oldValue,newValue){
  if(!question||!oldValue||!newValue)return false;
  let changed=false;
  fields.forEach(field=>{
    if(question[field]===undefined||question[field]===null)return;
    const values=splitCreatorMultiValue(question[field],field);
    if(!values.includes(oldValue))return;
    writeCreatorMultiValue(question,field,values.map(value=>value===oldValue?newValue:value));
    changed=true;
  });
  return changed;
}
function updateNestedQuestionRefs(collection,mutator,changed){
  (collection||[]).forEach(item=>{
    if(!item)return;
    if(mutator(item))changed.add(item);
    ['questions','examQuestions','sectionA','sectionB','sectionC'].forEach(key=>{
      if(Array.isArray(item[key]))updateNestedQuestionRefs(item[key],mutator,changed);
    });
  });
}
async function syncQuestionsToSupabase(changed){
  if(!supabaseClient||!changed?.size)return;
  let failed=0;
  for(const question of changed){
    if(!questions.includes(question))continue;
    try{
      const saved=await saveQuestionToSupabase(question);
      if(saved?.supabaseId)question.supabaseId=saved.supabaseId;
    }catch(e){
      failed++;
      console.error('Could not sync curriculum rename to Supabase:',e);
    }
  }
  if(failed)showToast(`${failed} renamed question link${failed===1?'':'s'} could not sync to Supabase`,true);
}
function curriculumLinksForQuestion(q){
  const skills=splitCreatorMultiValue(q?.skills,'skills'),topics=splitCreatorMultiValue(q?.topic||q?.topics,'topics'),subtopics=splitCreatorMultiValue(q?.subtopic||q?.subtopics,'subtopics');
  if(!skills.length)return [];
  return CURRICULUM_SKILL_LINKS.filter(link=>{
    if(!skills.includes(link.skill))return false;
    if(topics.length&&!topics.includes(link.topic))return false;
    if(subtopics.length&&!subtopics.includes(link.subtopic))return false;
    return true;
  });
}
function curriculumLinkProgressionScore(link){
  return (Number(link?.topicOrder)||0)*1000000+(Number(link?.subtopicOrder)||0)*1000+(Number(link?.skillOrder)||0);
}
function highestCurriculumSkillLinks(links){
  const active=(links||[]).filter(link=>link&&link.active!==false&&link.skill);
  if(!active.length)return [];
  const top=active.reduce((best,link)=>curriculumLinkProgressionScore(link)>curriculumLinkProgressionScore(best)?link:best,active[0]);
  const area=normalizeLearningAreaName(top.learningArea||'Mathematics');
  return active.filter(link=>normalizeLearningAreaName(link.learningArea||'Mathematics')===area&&link.topic===top.topic&&link.subtopic===top.subtopic&&link.skill===top.skill);
}
function curriculumHighestSkillLinks({skills=[],topics=[],subtopics=[]}={}){
  const selectedSkills=splitCreatorMultiValue(skills,'skills'),selectedTopics=splitCreatorMultiValue(topics,'topics'),selectedSubtopics=splitCreatorMultiValue(subtopics,'subtopics');
  if(!selectedSkills.length)return [];
  return highestCurriculumSkillLinks(CURRICULUM_SKILL_LINKS.filter(link=>{
    if(link.active===false||!selectedSkills.includes(link.skill))return false;
    if(selectedTopics.length&&!selectedTopics.includes(link.topic))return false;
    if(selectedSubtopics.length&&!selectedSubtopics.includes(link.subtopic))return false;
    return true;
  }));
}
function curriculumLinkedValuesFromHighestSkill(field,{skills=[],topics=[],subtopics=[]}={}){
  const links=curriculumHighestSkillLinks({skills,topics,subtopics});
  const values=field==='subjects'?links.flatMap(link=>link.subjects||[]):field==='year-level'?links.flatMap(link=>link.yearLevels||[]):[];
  return [...new Set(values.map(value=>field==='subjects'?normalizeSubjectName(value):normalizeYearLevelName(value)).filter(Boolean))];
}
function applyCurriculumLinkedMeta(q){
  const links=highestCurriculumSkillLinks(curriculumLinksForQuestion(q));
  if(!links.length)return false;
  const subjects=[...new Set(links.flatMap(link=>link.subjects||[]).map(normalizeSubjectName).filter(Boolean))];
  const years=[...new Set(links.flatMap(link=>link.yearLevels||[]).map(normalizeYearLevelName).filter(Boolean))];
  let changed=false;
  if(subjects.length){
    const subjectText=subjects.join(', ');
    if(String(q.subjects||q.subject||'')!==subjectText){q.subjects=subjectText;q.subject=subjectText;q.mainArea=subjectText;changed=true;}
  }
  if(years.length){
    const current=normalizeYearLevels(q.yearLevels||q.yearLevel||q.yearFrom||q.year||'');
    if(current.join('|')!==years.join('|')){
      q.yearLevels=years;q.yearLevel=years;q.yearFrom=years[0];q.yearTo=years[years.length-1]||years[0];q.year=years.join(', ');changed=true;
    }
  }
  return changed;
}
function syncQuestionsAfterCurriculumLinkChange({silent=false}={}){
  const changed=new Set();
  const mutator=q=>applyCurriculumLinkedMeta(q);
  updateNestedQuestionRefs(questions,mutator,changed);
  updateNestedQuestionRefs(examQuestions,mutator,changed);
  updateNestedQuestionRefs(savedPapers,mutator,changed);
  if(changed.size){
    saveState();
    syncQuestionsToSupabase(changed);
    if(!silent)showToast(`Updated ${changed.size} question${changed.size===1?'':'s'} from Curriculum Manager links`);
  }
  return changed.size;
}
function syncQuestionsAfterCurriculumRename(kind,oldValue,newValue,{topic='',subtopic=''}={}){
  const fieldMap={topic:['topic','topics'],subtopic:['subtopic','subtopics'],skill:['skills']};
  const fields=fieldMap[kind]||[];
  const changed=new Set();
  const topicMatches=q=>{
    const topics=questionMetaValues(q,['topic','topics']);
    return !topic||!topics.length||topics.includes(topic);
  };
  const subtopicMatches=q=>{
    const subtopics=questionMetaValues(q,['subtopic','subtopics']);
    return !subtopic||!subtopics.length||subtopics.includes(subtopic);
  };
  const mutator=q=>{
    if(kind==='subtopic'&&!topicMatches(q))return false;
    if(kind==='skill'&&(!topicMatches(q)||!subtopicMatches(q)))return false;
    return replaceQuestionMetaValue(q,fields,oldValue,newValue);
  };
  updateNestedQuestionRefs(questions,mutator,changed);
  updateNestedQuestionRefs(examQuestions,mutator,changed);
  updateNestedQuestionRefs(savedPapers,mutator,changed);
  if(changed.size){
    saveState();
    syncQuestionsToSupabase(changed);
    showToast(`Updated ${changed.size} question curriculum link${changed.size===1?'':'s'}`);
  }
  return changed.size;
}
function listOverlaps(a=[],b=[]){
  if(!a.length||!b.length)return true;
  return a.some(x=>b.includes(x));
}
function curriculumSkillMatches(link,{subjects=[],yearLevels=[],topics=[],subtopics=[]}={}){
  if(topics.length&&!topics.includes(link.topic))return false;
  if(subtopics.length&&!subtopics.includes(link.subtopic))return false;
  if(!listOverlaps(subjects,link.subjects||[]))return false;
  if(!listOverlaps(yearLevels,link.yearLevels||[]))return false;
  return true;
}
function curriculumOptionValues(field,{subjects=[],yearLevels=[],topics=[],subtopics=[]}={}){
  const values=[];
  const selectedTopics=splitCreatorMultiValue(topics,'topics');
  const selectedSubtopics=splitCreatorMultiValue(subtopics,'subtopics');
  const selectedSkills=splitCreatorMultiValue(subjects,'skills');
  if(field==='subtopics'&&!selectedTopics.length)return values;
  if(field==='skills'&&(!selectedTopics.length||!selectedSubtopics.length))return values;
  CURRICULUM_SKILL_LINKS.forEach(link=>{
    if(link.active===false)return;
    if(field==='subtopics'){
      if(!selectedTopics.includes(link.topic))return;
    }else if(field==='skills'){
      if(!selectedTopics.includes(link.topic))return;
      if(!selectedSubtopics.includes(link.subtopic))return;
    }else if(field==='subjects'){
      if(selectedTopics.length&&!selectedTopics.includes(link.topic))return;
      if(selectedSubtopics.length&&!selectedSubtopics.includes(link.subtopic))return;
      if(selectedSkills.length&&!selectedSkills.includes(link.skill))return;
    }else if(field==='year-level'){
      if(selectedTopics.length&&!selectedTopics.includes(link.topic))return;
      if(selectedSubtopics.length&&!selectedSubtopics.includes(link.subtopic))return;
      if(selectedSkills.length&&!selectedSkills.includes(link.skill))return;
    }
    const rawValues=field==='topics'?[link.topic]:field==='subtopics'?[link.subtopic]:field==='skills'?[link.skill]:field==='subjects'?(link.subjects||[]):field==='year-level'?(link.yearLevels||[]):[];
    rawValues.forEach(value=>{if(value&&!values.includes(value))values.push(value);});
  });
  return values;
}
function getCreatorMultiValues(field){
  const checked=[...document.querySelectorAll(`#f-${field}-menu input[type=checkbox]:checked`)].map(cb=>cb.value);
  return checked;
}
let suppressCreatorHierarchyRefresh=false;
function creatorMetadataOptionValues(field,current=[]){
  if(field==='subjects'){
    return examSubjectValues();
  }
  if(field==='year-level'){
    const values=curriculumYearLevelValues();
    current.forEach(v=>{if(v&&!values.includes(v))values.unshift(v);});
    return values;
  }
  const topics=field==='topics'?current:getCreatorMultiValues('topics');
  const subtopics=field==='subtopics'?current:getCreatorMultiValues('subtopics');
  const values=curriculumOptionValues(field,{subjects:[],yearLevels:[],topics,subtopics});
  const add=v=>splitCreatorMultiValue(v,field).forEach(item=>{if(item&&!values.includes(item))values.push(item);});
  if(field==='topics'){
    current.forEach(add);
    questions.forEach(q=>['topics','topic','strand'].forEach(k=>add(q[k])));
  }
  if(field==='topics'||field==='subtopics')return values.filter(v=>!['integers','real numbers'].includes(String(v).trim().toLowerCase()));
  return values;
}
function creatorMultiId(field){return `f-${field}`;}
function creatorFieldFromWrap(wrapOrField){
  if(typeof wrapOrField==='string')return wrapOrField;
  const id=wrapOrField?.id||'';
  return id.replace(/^f-/,'').replace(/-wrap$/,'');
}
function updateCreatorMultiButton(wrapOrField){
  const field=creatorFieldFromWrap(wrapOrField);
  const wrap=document.getElementById(`f-${field}-wrap`);
  const btn=document.getElementById(`f-${field}-button`),selected=getCreatorMultiValues(field);
  const labels={subjects:'Select subjects',topics:'Select topics',subtopics:'Select subtopics',skills:'Select skills','year-level':'7'};
  const label=selected.length?selected.join(', '):(labels[field]||'Select');
  if(btn){btn.textContent=label;btn.title=label;}
  if(!suppressCreatorHierarchyRefresh&&['subjects','year-level','topics','subtopics','skills'].includes(field))refreshCreatorHierarchyMenus(field);
  if(wrap)positionCreatorMultiMenu(field);
}
function refreshCreatorHierarchyMenus(changedField){
  const fields=changedField==='topics'?['subtopics','skills','subjects','year-level']:changedField==='subtopics'?['skills','subjects','year-level']:changedField==='skills'?['subjects','year-level']:[];
  fields.forEach(field=>{
    const selectedSkills=getCreatorMultiValues('skills');
    const current=getCreatorMultiValues(field);
    const linked=selectedSkills.length&&(field==='subjects'||field==='year-level')?curriculumLinkedValuesFromHighestSkill(field,{skills:selectedSkills,topics:getCreatorMultiValues('topics'),subtopics:getCreatorMultiValues('subtopics')}):[];
    const selected=changedField==='skills'&&(field==='subjects'||field==='year-level')?[...linked]:[...new Set([...current,...linked])];
    syncCreatorMultiOptions(field,selected);
  });
}
function syncCreatorMultiOptions(field,selected){
  const menu=document.getElementById(`f-${field}-menu`);
  if(!menu)return;
  const current=splitCreatorMultiValue(selected,field),values=creatorMetadataOptionValues(field,current);
  const checkedCurrent=['subjects','year-level'].includes(field)?current:current.filter(value=>values.includes(value));
  menu.innerHTML=values.length?values.map(v=>{const label=String(v??'').trim();return `<label class="multi-select-option"><input type="checkbox" value="${esc(label)}" ${checkedCurrent.includes(label)?'checked':''} onchange="updateCreatorMultiButton(this.closest('.metadata-multiselect'))"> <span title="${esc(label)}">${esc(label)}</span></label>`;}).join(''):`<div class="multi-select-option" style="cursor:default;color:var(--color-text-tertiary)">No options yet</div>`;
  suppressCreatorHierarchyRefresh=true;
  updateCreatorMultiButton(field);
  suppressCreatorHierarchyRefresh=false;
}
function positionCreatorMultiMenu(field){
  const id=creatorMultiId(field);
  const wrap=document.getElementById(`${id}-wrap`),menu=document.getElementById(`${id}-menu`);
  if(!wrap||!menu)return;
  wrap.classList.remove('open-up');
  const rect=wrap.getBoundingClientRect();
  const below=window.innerHeight-rect.bottom;
  const above=rect.top;
  const menuHeight=Math.min(menu.scrollHeight||260,260);
  if(below<menuHeight+8&&above>below)wrap.classList.add('open-up');
}
function toggleCreatorMultiMenu(field,event){
  event?.stopPropagation?.();
  const id=creatorMultiId(field);
  document.querySelectorAll('.metadata-multiselect.open').forEach(wrap=>{if(wrap.id!==`${id}-wrap`)wrap.classList.remove('open','open-up');});
  document.querySelectorAll('.extractor-multiselect.open').forEach(wrap=>wrap.classList.remove('open','open-up'));
  const wrap=document.getElementById(`${id}-wrap`);
  if(!wrap)return;
  wrap.classList.toggle('open');
  if(wrap.classList.contains('open'))positionCreatorMultiMenu(field);else wrap.classList.remove('open-up');
}function setCreatorMetadataForm(q={}){
  const subject=q.subject||q.subjects||q.mainArea||currentExamSubject(),topic=q.topic||q.topics||q.strand||'',subtopic=q.subtopic||q.subtopics||'',yearLevel=q.yearLevels||q.yearLevel||q.yearFrom||q.year||'7';
  syncCreatorSubjectOptions(subject);syncCreatorYearLevelOptions(yearLevel);syncCreatorMultiOptions('topics',topic);syncCreatorMultiOptions('subtopics',subtopic);syncCreatorMultiOptions('skills',q.skills||'');setFieldValue('f-difficulty',q.difficulty||'Medium');setFieldValue('f-calculator',q.calculator||'Calculator');setFieldValue('f-author',q.author||'Original');setFieldValue('f-date',q.date||new Date().getFullYear());setFieldValue('f-question-number',q.questionNumber||1);setFieldValue('f-response',q.responsePercent??q.response??'');
}function editQuestion(id){
  const q=questions.find(x=>x.id===id);if(!q)return;if(!canEditQuestionBankItem(q)){showToast('S.Teacher access is read-only for this bank',true);return;}editingId=id;window.__editingQuestion=q;showView('create');
  document.getElementById('create-title').textContent='Edit Question';document.getElementById('create-subtitle').textContent='Update this question';document.getElementById('save-btn-label').textContent='Save changes';document.getElementById('cancel-edit-btn').style.display='inline-flex';document.getElementById('cancel-edit-btn2').style.display='inline-flex';
  document.getElementById('f-type').value=q.type||'mc';setCreatorMetadataForm(q);const linesInput=document.getElementById('f-lines');if(linesInput)linesInput.value=nonNegativeInt(q.lines,1);document.getElementById('f-bank').value=q.bank||'private';document.getElementById('f-marks').value=q.marks||1;document.getElementById('f-teacher-rating').value=q.teacherRating||'';document.getElementById('f-student-rating').value=q.studentRating||'';document.getElementById('f-teacher-rating-count').value=q.teacherRatingCount||q.ratingCount||0;document.getElementById('f-student-rating-count').value=q.studentRatingCount||0;document.getElementById('f-teacher-rating-total').value=q.teacherRatingTotal||0;document.getElementById('f-student-rating-total').value=q.studentRatingTotal||0;document.getElementById('f-attempt-count').value=q.attemptCount||0;document.getElementById('f-correct-count').value=q.correctCount||0;document.getElementById('f-comments').value=q.comments||'';document.getElementById('f-review-status').value=q.reviewStatus||'Draft';document.getElementById('f-reviewed-by').value=q.reviewedBy||q.reviewedby||'';setQuestionHtml(q.textHtml||esc(q.text||''));setSolutionHtml(q.solutionHtml||esc(q.solution||''));updateTypeFields(q);setVcaaReport(q.vcaaReport||{});
}
function resetForm(){
  editingId=null;window.__editingQuestion=null;document.getElementById('create-title').textContent='Create Question';document.getElementById('create-subtitle').textContent='Add a new question to the bank';document.getElementById('save-btn-label').textContent='Add to bank';document.getElementById('cancel-edit-btn').style.display='none';document.getElementById('cancel-edit-btn2').style.display='none';
  document.getElementById('f-type').value='mc';setQuestionHtml('');setSolutionHtml('');setCreatorMetadataForm({subject:currentExamSubject(),topic:'',subtopic:'',skills:'',yearLevels:['7'],yearLevel:'7',author:'Original',difficulty:'Easy',calculator:'Calculator',date:new Date().getFullYear(),questionNumber:1,responsePercent:''});const linesInput=document.getElementById('f-lines');if(linesInput)linesInput.value=1;document.getElementById('f-bank').value='private';document.getElementById('f-marks').value=1;document.getElementById('f-teacher-rating').value='';document.getElementById('f-student-rating').value='';document.getElementById('f-teacher-rating-count').value=0;document.getElementById('f-student-rating-count').value=0;document.getElementById('f-teacher-rating-total').value=0;document.getElementById('f-student-rating-total').value=0;document.getElementById('f-attempt-count').value=0;document.getElementById('f-correct-count').value=0;document.getElementById('f-comments').value='';document.getElementById('f-review-status').value='Draft';document.getElementById('f-reviewed-by').value='';updateTypeFields(null);resetVcaaReport();
}
function cancelEdit(){editingId=null;window.__editingQuestion=null;showView('bank');}

