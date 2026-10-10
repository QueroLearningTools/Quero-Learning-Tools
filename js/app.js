// Main view navigation and startup wiring.

function showView(v){
  const protectedTeacher=isTeacherRole()||isSTeacherRole();
  const protectedStudent=currentRole==='student'||currentRole==='s_student';
  const teacherAllowedViews=new Set(['home','classroom-archive','builder','addq','papers']);
  const studentAllowedViews=new Set(['home']);
  if(protectedStudent&&!studentAllowedViews.has(v)){
    showToast('This area is not available for your role',true);
    v='home';
  }else if(protectedTeacher&&!teacherAllowedViews.has(v)){
    showToast('This area is not available for your role',true);
    v='home';
  }else if((v==='admin-users'||v==='deleted'||v==='extractor'||v==='curriculum'||v==='schools')&&currentRole!=='admin'){
    showToast('Admin access only',true);
    v='bank';
  }
  ['home','classroom-archive','bank','deleted','extractor','curriculum','schools','create','builder','addq','papers','admin-users'].forEach(x=>{const el=document.getElementById('view-'+x);if(el)el.style.display='none';});
  const a=document.getElementById('view-'+v);if(a)a.style.display='flex';
  const appShell=document.getElementById('app');
  appShell?.classList.toggle('home-shell',v==='home'||v==='classroom-archive');
  renderGlobalTopbar();
  ['home','classroom-archive','bank','deleted','extractor','curriculum','schools','create','builder','papers','admin-users'].forEach(x=>{const n=document.getElementById('nav-'+x);if(n)n.classList.toggle('active',x===v);});
  if(v==='home'){
    renderHomePage();
    if(typeof window.loadHomeClassroomsFromSupabase === 'function'){
      setTimeout(()=>window.loadHomeClassroomsFromSupabase({ preserveScroll:true }), 0);
    }
  }
  if(v==='classroom-archive')renderClassroomArchivePage();if(v==='builder')renderExam();if(v==='papers')renderPapers();if(v==='admin-users')loadAdminUsers();if(v==='schools')renderSchoolManager();if(v==='deleted')renderDeletedQuestions();if(v==='extractor')renderExtractorPreview();if(v==='curriculum')renderCurriculumManager();
  if(v==='addq'){enforceTeacherAddQBank();renderAddQList();document.getElementById('nav-builder').classList.add('active');}
  if(v==='create'&&!editingId)resetForm();
  if(v==='create')setTimeout(renderSimilarityChecker,0);
  if(a)setTimeout(()=>renderAllTextBoxKatex(a),0);
  setTimeout(refreshQuestionToolbarPin,0);
}

function bankMetaValue(q,key){
  if(key==='subject')return q.subject||q.subjects||q.mainArea||'';
  if(key==='topic')return q.topic||q.topics||q.strand||'';
  if(key==='subtopic')return q.subtopic||q.subtopics||'';
  if(key==='skills')return q.skills||'';
  if(key==='year')return normalizeYearLevels(q.yearLevels||q.yearLevel||q.yearFrom||q.year||'');
  if(key==='difficulty')return q.difficulty||'';
  if(key==='calculator')return q.calculator||'';
  if(key==='author')return q.author||'';
  if(key==='date')return q.date?String(q.date):'';
  if(key==='questionNumber')return q.questionNumber?String(q.questionNumber):'';
  return '';
}
const LEGACY_BANK_SUBTOPIC_FILTERS=new Set(['integers','real numbers']);
function isLegacyBankSubtopicFilter(value){
  return LEGACY_BANK_SUBTOPIC_FILTERS.has(String(value||'').trim().toLowerCase());
}
function bankUniqueValues(items,key){
  const values=[];
  items.forEach(q=>{
    const raw=bankMetaValue(q,key),list=key==='skills'?splitCreatorMultiValue(raw,'skills'):(Array.isArray(raw)?raw:String(raw||'').split((key==='subject'||key==='topic') ? /,|;/ : /\\u0000/));
    list.map(v=>String(v||'').trim()).filter(Boolean).forEach(v=>{
      if(key==='subtopic'&&isLegacyBankSubtopicFilter(v))return;
      values.push(v);
    });
  });
  const unique=[...new Set(values)];
  if(key==='questionNumber'||key==='date')return unique.sort((a,b)=>(Number(a)||0)-(Number(b)||0));
  if(key==='year'){const order=['F','2','3','4','5','6','7','8','9','10','10A','11 VCE','12 VCE'];return unique.sort((a,b)=>order.indexOf(a)-order.indexOf(b));}
  return unique.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
function bankSubjectFilterValues(items,prioritizeClassrooms=false){
  const values=[...new Set(examSubjectValues().map(normalizeSubjectName).filter(Boolean))];
  const sorted=values.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
  return prioritizeClassrooms&&typeof window.orderSubjectsByHomeClassrooms==='function'?window.orderSubjectsByHomeClassrooms(sorted):sorted;
}
function bankTopicFilterValues(){
  return curriculumTopics().filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
function syncBankFilterSelect(id,label,values){
  const el=document.getElementById(id);if(!el)return '';
  const current=el.value;
  el.innerHTML=`<option value="">${esc(label)}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  if(values.includes(current))el.value=current;
  return el.value;
}
function bankFieldMatches(q,key,value){
  if(!value)return true;
  const raw=bankMetaValue(q,key);
  if(Array.isArray(raw))return raw.map(String).includes(String(value));
  if(key==='skills')return splitCreatorMultiValue(raw,'skills').includes(String(value));
  if(key==='subject'||key==='topic')return String(raw||'').split(/,|;/).map(v=>v.trim()).includes(String(value));
  return String(raw||'')===String(value);
}
function syncBankMetadataFilters(bankQuestions){
  return{
    subject:syncBankFilterSelect('bank-subject-filter','All subjects',bankSubjectFilterValues(bankQuestions)),
    topic:syncBankFilterSelect('bank-topic-filter','All topics',bankTopicFilterValues()),
    subtopic:syncBankFilterSelect('bank-subtopic-filter','All subtopics',bankUniqueValues(bankQuestions,'subtopic')),
    skills:syncBankFilterSelect('bank-skill-filter','All skills',bankUniqueValues(bankQuestions,'skills')),
    year:syncBankFilterSelect('bank-year-filter','All year levels',bankUniqueValues(bankQuestions,'year')),
    difficulty:syncBankFilterSelect('bank-difficulty-filter','All difficulties',bankUniqueValues(bankQuestions,'difficulty')),
    calculator:syncBankFilterSelect('bank-calculator-filter','All calculator types',bankUniqueValues(bankQuestions,'calculator')),
    author:syncBankFilterSelect('bank-author-filter','All authors',bankUniqueValues(bankQuestions,'author')),
    date:syncBankFilterSelect('bank-date-filter','All years',bankUniqueValues(bankQuestions,'date')),
    questionNumber:syncBankFilterSelect('bank-question-number-filter','Question number: lowest to highest',bankUniqueValues(bankQuestions,'questionNumber'))
  };
}


// Fullscreen helpers, startup listeners, app boot sequence.

async function toggleFullscreen(){const app=document.getElementById('app');try{if(!document.fullscreenElement){if(app.requestFullscreen)await app.requestFullscreen();else app.classList.add('is-fullscreen');}else await document.exitFullscreen();}catch(e){app.classList.toggle('is-fullscreen');}updateFullscreenButton();refreshQuestionToolbarPin();}
function updateFullscreenButton(){const app=document.getElementById('app'),btn=document.getElementById('fullscreen-btn');if(!btn)return;const full=!!document.fullscreenElement||app.classList.contains('is-fullscreen');btn.innerHTML=`<i class="ti ti-${full?'minimize':'maximize'}"></i>`;btn.title=full?'Exit fullscreen':'Fullscreen';}

ensureLatexTextarea();
loadState();
const rememberedLogin=localStorage.getItem('bf-login-identifier');
if(rememberedLogin){const loginIdEl=document.getElementById('login-email'),rememberEl=document.getElementById('login-remember');if(loginIdEl)loginIdEl.value=rememberedLogin;if(rememberEl)rememberEl.checked=true;}
setAppRole(currentRole,false);
initAuth();
document.getElementById('exam-title').addEventListener('input',saveState);
document.querySelectorAll('#exam-setup-panel input,#exam-setup-panel select').forEach(el=>{const handler=()=>{updateExamTitleFromMetadata();if(el.id==='exam-subject'){syncCreatorSubjectOptions(getExamDetails().subject);}if(el.id==='exam-subject'||el.id==='exam-number'){applyCoverDefaultsForCurrentExam(false);renderExam();}if(el.id==='exam-school-name'){applySchoolExamAssetsForExam(false);renderExam();}saveState();};el.addEventListener('input',handler);el.addEventListener('change',handler);});
document.addEventListener('paste',handleCreateEditorPaste);
document.addEventListener('click',e=>{document.querySelectorAll('.year-multiselect.open,.metadata-multiselect.open').forEach(wrap=>{if(!wrap.contains(e.target))wrap.classList.remove('open','open-up');});});
function repositionOpenCreatorMenus(){['subjects','topics','subtopics','skills','year-level'].forEach(field=>{const wrap=document.getElementById(`f-${field}-wrap`);if(wrap?.classList.contains('open'))positionCreatorMultiMenu(field);});}
window.addEventListener('resize',repositionOpenCreatorMenus);
document.addEventListener('scroll',repositionOpenCreatorMenus,true);
document.addEventListener('input',e=>{if(e.target&&e.target.isContentEditable){scrubCreateEditorFont(e.target);cleanEmptyEditor(e.target);}});
document.addEventListener('selectionchange',rememberCreateSelection);
document.addEventListener('mouseup',rememberCreateSelection);
document.addEventListener('keyup',rememberCreateSelection);
document.addEventListener('mousedown',e=>{if(!e.target.closest?.('.toolbar-menu-wrap'))toggleNumberingMenu(false,null);if(!e.target.closest?.('.bf-equation,.latex-inline-wrap')){clearEquationSelection();document.getElementById('latex-popover')?.classList.remove('open');}});
document.addEventListener('click',e=>{const eq=e.target.closest?.('.bf-equation');if(eq&&eq.closest('#view-create')){e.preventDefault();editLatexEquation(eq);}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.isContentEditable)setTimeout(()=>normalizeParagraphBlocks(e.target),0);});
document.addEventListener('blur',e=>{if(e.target&&e.target.isContentEditable){normalizeParagraphBlocks(e.target);cleanEmptyEditor(e.target);renderKatexIn(e.target);}},true);
document.getElementById('view-create').addEventListener('scroll',syncQuestionToolbarPin);
window.addEventListener('resize',refreshQuestionToolbarPin);
document.addEventListener('fullscreenchange',()=>{const app=document.getElementById('app');app?.classList.toggle('is-fullscreen',document.fullscreenElement===app);updateFullscreenButton();refreshQuestionToolbarPin();});
window.addEventListener('load',()=>renderAllTextBoxKatex(document));
syncBankTabs();syncExamSchoolOptions();syncAuthorDropdowns();syncCreatorSubjectOptions(currentExamSubject());syncCreatorYearLevelOptions(['7']);syncCreatorMultiOptions('topics','');syncCreatorMultiOptions('subtopics','');syncCreatorMultiOptions('skills','');syncExtractorMultiOptions('extractor-global-subject','subject','General Mathematics');syncExtractorMultiOptions('extractor-global-year-level','yearLevels',['7']);syncExtractorMultiOptions('extractor-global-topic','topic','');syncExtractorMultiOptions('extractor-global-subtopic','subtopic','');syncExtractorMultiOptions('extractor-global-skills','skills','');updateTypeFields(null);renderSimilarityChecker();cleanupDeletedQuestions();renderDeletedQuestions();renderSchoolManager();renderCurriculumManager();showView('home');renderBank();updateStats();




