// Question Bank rendering, bank filters, Add Questions list helpers, and Recently Deleted.

function renderBank(){
  const search=(document.getElementById('search-input')?.value||'').toLowerCase();
  const tf=document.getElementById('type-filter')?.value||'';
  const bankQuestions=questions.filter(q=>(q.bank||'private')===activeBankFilter);
  const filters=syncBankMetadataFilters(bankQuestions);
  const filtered=bankQuestions.filter(q=>{
    if(tf&&q.type!==tf)return false;
    if(!bankFieldMatches(q,'subject',filters.subject))return false;
    if(!bankFieldMatches(q,'topic',filters.topic))return false;
    if(!bankFieldMatches(q,'subtopic',filters.subtopic))return false;
    if(!bankFieldMatches(q,'skills',filters.skills))return false;
    if(!bankFieldMatches(q,'year',filters.year))return false;
    if(!bankFieldMatches(q,'difficulty',filters.difficulty))return false;
    if(!bankFieldMatches(q,'calculator',filters.calculator))return false;
    if(!bankFieldMatches(q,'author',filters.author))return false;
    if(!bankFieldMatches(q,'date',filters.date))return false;
    if(!bankFieldMatches(q,'questionNumber',filters.questionNumber))return false;
    const haystack=[q.text,q.topic,q.topics,q.subtopic,q.subtopics,q.skills,q.subject,q.subjects,q.author,q.date,q.questionNumber].map(v=>Array.isArray(v)?v.join(' '):String(v||'')).join(' ').toLowerCase();
    if(search&&!haystack.includes(search))return false;
    return true;
  }).sort((a,b)=>(Number(a.questionNumber)||0)-(Number(b.questionNumber)||0)||(Number(a.date)||0)-(Number(b.date)||0)||String(a.text||'').localeCompare(String(b.text||'')));
  const countEl=document.getElementById('bank-result-count');
  if(countEl)countEl.textContent=`${filtered.length} question${filtered.length===1?'':'s'}`;
  const el=document.getElementById('bank-list');
  if(!filtered.length){el.innerHTML='<div class="empty-state"><i class="ti ti-inbox"></i><p>No questions found</p></div>';updateStats();return;}
  el.innerHTML=filtered.map(q=>{const options=((q.type==='mc'&&q.template!=='multiple')||q.type==='tf')?answerOptionsHtml(q):'';const meta=`<div class="q-meta"><span class="tag ${typeClass(q.type)}">${typeShort(q.type)}</span>${q.type==='mc'?`<span style="font-size:11px;color:var(--color-text-secondary)">${mcTemplateLabel(q.template)} - ${optionTemplateLabel(q.optionTemplate)}</span>`:''}<span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.subject||q.subjects||q.mainArea||'')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.topic||q.topics||'')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.subtopic||q.subtopics||'')}</span>${q.skills?`<span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.skills)}</span>`:''}<span style="font-size:11px;color:var(--color-text-secondary)">Year ${esc(formatYearRange(q))}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.difficulty||'Medium')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.calculator||'Calculator')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.author||'Original')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.date||'')}</span><span style="font-size:11px;color:var(--color-text-secondary)">Q${esc(q.questionNumber||1)}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.reviewStatus||'Draft')}</span>${q.comments?`<div class="q-meta-comments"><strong>Comments:</strong> ${esc(q.comments)}</div>`:''}${q.averageRating?`<span style="font-size:11px;color:var(--color-text-secondary)">Avg ${esc(q.averageRating)}</span>`:''}<span style="font-size:11px;color:var(--color-text-secondary)">Attempts ${esc(q.attemptCount||0)}</span><span style="font-size:11px;color:var(--color-text-secondary)">Correct ${esc(q.correctCount||0)}</span>${q.ratingCount?`<span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.ratingCount)} ratings</span>`:''}<span style="font-size:11px;color:var(--color-text-secondary)">${bankLabel(q.bank||'private')}</span><span class="marks-badge">${q.marks} mark${q.marks!==1?'s':''}</span></div>`,key=`bank-${q.id}`;return`<div class="q-card${questionCardCollapsed(key)?' collapsed':''}">${collapseCardLine(q,key)}<div class="q-card-collapse-body" onclick="toggleQuestionCollapse('${key}')" style="cursor:pointer"><div class="q-card-top"><div style="flex:1">${questionContentHtml(q)}${options}</div>${bankQuestionActions(q,key)}</div>${meta}${curriculumWarningHtml(q)}</div></div>`;}).join('');
  renderAllTextBoxKatex(el);
  updateStats();
}
function syncAddQMetadataFilters(bankQuestions){
  return{
    subject:syncBankFilterSelect('addq-subject-filter','All subjects',bankSubjectFilterValues(bankQuestions,true)),
    topic:syncBankFilterSelect('addq-topic-filter','All topics',bankTopicFilterValues()),
    subtopic:syncBankFilterSelect('addq-subtopic-filter','All subtopics',bankUniqueValues(bankQuestions,'subtopic')),
    skills:syncBankFilterSelect('addq-skill-filter','All skills',bankUniqueValues(bankQuestions,'skills')),
    year:syncBankFilterSelect('addq-year-filter','All year levels',bankUniqueValues(bankQuestions,'year')),
    difficulty:syncBankFilterSelect('addq-difficulty-filter','All difficulties',bankUniqueValues(bankQuestions,'difficulty')),
    calculator:syncBankFilterSelect('addq-calculator-filter','All calculator types',bankUniqueValues(bankQuestions,'calculator')),
    author:syncBankFilterSelect('addq-author-filter','All authors',bankUniqueValues(bankQuestions,'author')),
    date:syncBankFilterSelect('addq-date-filter','All years',bankUniqueValues(bankQuestions,'date')),
    questionNumber:syncBankFilterSelect('addq-question-number-filter','Question number: lowest to highest',bankUniqueValues(bankQuestions,'questionNumber'))
  };
}
function renderAddQList(){
  enforceTeacherAddQBank();
  const search=(document.getElementById('addq-search')||{value:''}).value.toLowerCase();
  const tf=document.getElementById('addq-type-filter')?.value||'';
  const bankQuestions=questions.filter(q=>(q.bank||'private')===activeAddQBankFilter);
  const filters=syncAddQMetadataFilters(bankQuestions);
  const available=bankQuestions.filter(q=>{
    if(examQuestions.find(e=>e.id===q.id))return false;
    if(tf&&q.type!==tf)return false;
    if(!bankFieldMatches(q,'subject',filters.subject))return false;
    if(!bankFieldMatches(q,'topic',filters.topic))return false;
    if(!bankFieldMatches(q,'subtopic',filters.subtopic))return false;
    if(!bankFieldMatches(q,'skills',filters.skills))return false;
    if(!bankFieldMatches(q,'year',filters.year))return false;
    if(!bankFieldMatches(q,'difficulty',filters.difficulty))return false;
    if(!bankFieldMatches(q,'calculator',filters.calculator))return false;
    if(!bankFieldMatches(q,'author',filters.author))return false;
    if(!bankFieldMatches(q,'date',filters.date))return false;
    if(!bankFieldMatches(q,'questionNumber',filters.questionNumber))return false;
    const haystack=[q.text,q.topic,q.topics,q.subtopic,q.subtopics,q.skills,q.subject,q.subjects,q.author,q.date,q.questionNumber].map(v=>Array.isArray(v)?v.join(' '):String(v||'')).join(' ').toLowerCase();
    return !search||haystack.includes(search);
  }).sort((a,b)=>(Number(a.questionNumber)||0)-(Number(b.questionNumber)||0)||(Number(a.date)||0)-(Number(b.date)||0)||String(a.text||'').localeCompare(String(b.text||'')));
  const el=document.getElementById('addq-list');
  if(!el)return;
  const count=document.getElementById('addq-result-count');
  if(count)count.textContent=`${available.length} question${available.length===1?'':'s'} available`;
  if(!available.length){
    el.innerHTML=`<div class="empty-state"><i class="ti ti-check"></i><div>${bankQuestions.length&&bankQuestions.length===bankQuestions.filter(q=>examQuestions.find(e=>e.id===q.id)).length?'All '+bankLabel(activeAddQBankFilter)+' questions already in exam':'No questions match in '+bankLabel(activeAddQBankFilter)}</div></div>`;
    return;
  }
  el.innerHTML=available.map(q=>{const marks=Number(q.marks)||1;return`<div class="addq-card"><input type="checkbox" id="qa-${q.id}" class="addq-checkbox"><label for="qa-${q.id}" class="addq-card-content"><div class="q-card-collapsed-text">${questionCollapsedSkillsPreview(q)||esc(questionCollapsedPreview(q))}</div><div class="addq-card-meta"><span class="tag ${typeClass(q.type)}">${typeShort(q.type)}</span><span>${esc(q.date||'')}</span><span>${esc(q.author||'Original')}</span><span>(${marks} mark${marks===1?'':'s'})</span></div></label></div>`;}).join('');
}function coverPlainTextToHtml(text){return plainTextPasteHtml(text||'');}
function coverFieldHtml(key){return coverPage[key+'Html']||coverPlainTextToHtml(coverPage[key]||'');}
function coverEditorField(id,key,label,placeholder){return `<div class="cover-page-field"><label>${label}</label><div class="cover-page-editor-wrap"><div id="${id}" class="cover-page-editor editable-text" contenteditable="true" data-placeholder="${placeholder}" onfocus="setActiveEditor('${id}')" oninput="syncCoverPage()" onblur="syncCoverPage()" onkeyup="syncCoverPage();updateQuestionToolbar()" onmouseup="updateQuestionToolbar()">${coverFieldHtml(key)}</div></div></div>`;}
function syncCoverPage(){
  const read=(id,key)=>{const el=document.getElementById(id),html=storedHtmlFrom(el);coverPage[key+'Html']=html;coverPage[key]=plainTextFromHtml(html)||'';};
  read('cover-approved-materials','approvedMaterials');
  read('cover-materials-supplied','materialsSupplied');
  read('cover-instructions','instructions');
  saveState();
}
function toggleCoverPage(){coverPageExpanded=!coverPageExpanded;renderExam();}


// Recently Deleted tool.

function renderDeletedQuestions(){
  cleanupDeletedQuestions();
  const el=document.getElementById('deleted-list');
  if(!el)return;
  if(!deletedQuestions.length){el.innerHTML='<div class="empty-state"><i class="ti ti-trash-off"></i><p>No recently deleted questions</p></div>';return;}
  const sorted=[...deletedQuestions].sort((a,b)=>Date.parse(b.deletedAt||0)-Date.parse(a.deletedAt||0));
  el.innerHTML=sorted.map(q=>{
    const days=deletedDaysLeft(q),deletedDate=q.deletedAt?new Date(q.deletedAt).toLocaleDateString('en-AU'):'';
    const options=((q.type==='mc'&&q.template!=='multiple')||q.type==='tf')?answerOptionsHtml(q):'';
    const meta=`<div class="q-meta"><span class="tag ${typeClass(q.type)}">${typeShort(q.type)}</span><span style="font-size:11px;color:var(--color-text-secondary)">${bankLabel(q.bank||'private')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.author||'Original')}</span><span style="font-size:11px;color:var(--color-text-secondary)">${esc(q.date||'')}</span><span class="marks-badge">${q.marks} mark${q.marks!==1?'s':''}</span></div>`;
    return `<div class="q-card"><div class="q-card-top"><div style="flex:1"><div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:8px">Deleted ${esc(deletedDate)} · permanently deletes in ${days} day${days===1?'':'s'}</div>${questionContentHtml(q)}${options}${meta}</div><div class="q-actions"><button class="btn secondary" onclick="restoreDeletedQuestion(${q.id})"><i class="ti ti-restore"></i>Restore</button><button class="btn danger" onclick="permanentDeleteQuestion(${q.id})"><i class="ti ti-trash-x"></i>Delete forever</button></div></div></div>`;
  }).join('');
  renderAllTextBoxKatex(el);
}
async function restoreDeletedQuestion(id){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  const q=deletedQuestions.find(x=>x.id===id);
  if(!q)return;
  let restored=safeNormalizeQuestion({...q});
  delete restored.deletedAt;delete restored.deletedSource;delete restored.deletedSupabaseId;delete restored.supabaseId;
  if(questions.some(x=>x.id===restored.id))restored.id=nextId++;
  let onlineSaved=true;
  try{restored=await saveQuestionToSupabase(restored);}catch(e){onlineSaved=false;console.error('Could not restore question to Supabase:',e);}
  questions.push(restored);
  deletedQuestions=deletedQuestions.filter(x=>x.id!==id);
  nextId=Math.max(nextId,(Number(restored.id)||0)+1);
  saveState();renderDeletedQuestions();renderBank();renderAddQList();updateStats();
  showToast(onlineSaved?'Question restored':'Question restored locally - Supabase restore failed',!onlineSaved);
}
async function permanentDeleteQuestion(id){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  const q=deletedQuestions.find(x=>x.id===id);
  if(!q)return;
  let onlineDeleted=true;
  try{await deleteQuestionFromSupabase(q);}catch(e){onlineDeleted=false;console.error('Could not permanently delete question from Supabase:',e);}
  deletedQuestions=deletedQuestions.filter(x=>x.id!==id);
  saveState();renderDeletedQuestions();updateStats();
  showToast(onlineDeleted?'Question permanently deleted':'Question permanently deleted locally - Supabase delete failed',!onlineDeleted);
}
async function deleteAllRecentlyDeleted(){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  cleanupDeletedQuestions();
  if(!deletedQuestions.length){showToast('No recently deleted questions to delete');return;}
  if(!confirm(`Delete all ${deletedQuestions.length} recently deleted question${deletedQuestions.length===1?'':'s'} forever? This cannot be undone.`))return;
  const doomed=[...deletedQuestions];
  let onlineFailed=0;
  for(const q of doomed){
    try{await deleteQuestionFromSupabase(q);}catch(e){onlineFailed++;console.error('Could not permanently delete question from Supabase:',e);}
  }
  deletedQuestions=[];
  saveState();renderDeletedQuestions();updateStats();
  showToast(onlineFailed?`Deleted all locally - ${onlineFailed} Supabase delete${onlineFailed===1?'':'s'} failed`:'All recently deleted questions permanently deleted',!!onlineFailed);
}
async function deleteQuestion(id){const q=questions.find(x=>x.id===id);if(!q)return;if(!canDeleteQuestionBankItem(q)){showToast('S.Teacher cannot delete questions',true);return;}let onlineDeleted=true;try{await deleteQuestionFromSupabase(q);}catch(e){onlineDeleted=false;console.error('Could not delete question from Supabase:',e);}const deletedCopy=safeNormalizeQuestion({...q,deletedAt:new Date().toISOString(),deletedSource:'question-bank',deletedSupabaseId:q.supabaseId||null});deletedQuestions=[deletedCopy,...deletedQuestions.filter(x=>x.id!==id)];questions=questions.filter(q=>q.id!==id);examQuestions=examQuestions.filter(q=>q.id!==id);saveState();renderBank();renderDeletedQuestions();renderAddQList();updateStats();showToast(onlineDeleted?'Question moved to Recently Deleted':'Question moved to Recently Deleted locally - Supabase delete failed',!onlineDeleted);}
