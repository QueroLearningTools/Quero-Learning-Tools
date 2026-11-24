// Global state, auth flow, Supabase-backed state loading, shared constants, and shared helpers.

// Quero Learning Tools app logic.
// Split from the original BrainForge.html on 2026-08-02.

window.MathJax=window.MathJax||{startup:{typeset:false},svg:{fontCache:'none'}};
function mkP(text,center,bold,sz){const align=center?"text-align:center;":"";const weight=bold?"font-weight:bold;":"";return `<p style="${align}font-family:'Times New Roman',serif;font-size:${sz}px;${weight}">${text}</p>`;}
const LEGACY_DEFAULT_INSTR_HTML={
  mc:[mkP('Instructions for Section A',true,true,14),mkP('Answer all questions in pencil on your Multiple-Choice Answer Sheet.',false,false,12),mkP('Choose the response that is correct for the question.',false,false,12),mkP('A correct answer scores 1; an incorrect answer scores 0.',false,false,12),mkP('Marks will not be deducted for incorrect answers.',false,false,12),mkP('No marks will be given if more than one answer is completed for any question.',false,false,12),mkP('Unless otherwise indicated, the diagrams in this book are not drawn to scale.',false,false,12)].join(''),
  tf:[mkP('Instructions for Section B',true,true,14),mkP('For each statement, select True or False.',false,false,12),mkP('A correct answer scores 1; an incorrect answer scores 0.',false,false,12),mkP('Marks will not be deducted for incorrect answers.',false,false,12)].join(''),
  sa:[mkP('Instructions for Section C',true,true,14),mkP('Answer all questions in the spaces provided.',false,false,12),mkP('Write your responses in English.',false,false,12),mkP('In all questions where a numerical answer is required, you should only round your answer when instructed to do so.',false,false,12),mkP('Unless otherwise indicated, the diagrams in this book are not drawn to scale.',false,false,12)].join(''),
  er:[mkP('Instructions for Section D',true,true,14),mkP('Answer all questions in the spaces provided.',false,false,12),mkP('Write your responses in English.',false,false,12),mkP('In all questions where a numerical answer is required, you should only round your answer when instructed to do so.',false,false,12),mkP('Unless otherwise indicated, the diagrams in this book are not drawn to scale.',false,false,12)].join(''),
};
const DEFAULT_INSTR_HTML={
  mc:[mkP('Instructions for Section A',true,true,14),mkP('Answer <strong>all</strong> questions in pencil on your Multiple-Choice Answer Sheet.',false,false,12),mkP('Choose the response that is <strong>correct</strong> for the question.',false,false,12),mkP('A correct answer scores 1; an incorrect answer scores 0.',false,false,12),mkP('Marks will <strong>not</strong> be deducted for incorrect answers.',false,false,12),mkP('No marks will be given if more than one answer is completed for any question.',false,false,12),mkP('Unless otherwise indicated, the diagrams in this book are <strong>not</strong> drawn to scale.',false,false,12)].join(''),
  tf:[mkP('Instructions for Section B',true,true,14),mkP('For each statement, select True or False.',false,false,12),mkP('A correct answer scores 1; an incorrect answer scores 0.',false,false,12),mkP('Marks will <strong>not</strong> be deducted for incorrect answers.',false,false,12)].join(''),
  sa:[mkP('Instructions for Section C',true,true,14),mkP('Answer <strong>all</strong> questions in the spaces provided.',false,false,12),mkP('Write your responses in English.',false,false,12),mkP('In all questions where a numerical answer is required, you should only round your answer when instructed to do so.',false,false,12),mkP('Unless otherwise indicated, the diagrams in this book are <strong>not</strong> drawn to scale.',false,false,12)].join(''),
  er:[mkP('Instructions for Section D',true,true,14),mkP('Answer <strong>all</strong> questions in the spaces provided.',false,false,12),mkP('Write your responses in English.',false,false,12),mkP('In all questions where a numerical answer is required, you should only round your answer when instructed to do so.',false,false,12),mkP('Unless otherwise indicated, the diagrams in this book are <strong>not</strong> drawn to scale.',false,false,12)].join(''),
};
function upgradeDefaultInstructionHtml(value={}){const upgraded={...value};Object.keys(DEFAULT_INSTR_HTML).forEach(key=>{if(!upgraded[key]||upgraded[key]===LEGACY_DEFAULT_INSTR_HTML[key])upgraded[key]=DEFAULT_INSTR_HTML[key];});return upgraded;}
let instrHTML={mc:DEFAULT_INSTR_HTML.mc,tf:DEFAULT_INSTR_HTML.tf,sa:DEFAULT_INSTR_HTML.sa,er:DEFAULT_INSTR_HTML.er};
const EXAM_TEXT_DEFAULTS_STORAGE_KEY='quero_exam_text_defaults_v1';
const EXAM_TEXT_ACTIVE_DRAFT_STORAGE_KEY='quero_exam_text_active_draft_v1';
const EXAM_SECTION_MARK_LIMITS_STORAGE_KEY='quero_exam_section_mark_limits_v1';
const EXAM_BUILDER_SETTINGS_ID='global';
const TEACHER_EXAM_SECTION_MARK_LIMITS=Object.freeze({mc:40,tf:40,sa:100,er:100});
const EXAM_INSTRUCTION_HTML_STORAGE_KEY='quero_exam_instruction_html_v2';
const EXAM_DRAFT_DB_NAME='quero_exam_drafts_v1';
const EXAM_DRAFT_DB_STORE='section_instructions';
function openExamDraftDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error('IndexedDB is unavailable'));return;}
    const request=indexedDB.open(EXAM_DRAFT_DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(EXAM_DRAFT_DB_STORE))db.createObjectStore(EXAM_DRAFT_DB_STORE,{keyPath:'key'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Could not open exam draft storage'));
  });
}
async function writeExamInstructionsToDb(key,html){
  const db=await openExamDraftDb();
  try{
    await new Promise((resolve,reject)=>{const tx=db.transaction(EXAM_DRAFT_DB_STORE,'readwrite');tx.objectStore(EXAM_DRAFT_DB_STORE).put({key,instrHTML:{...html},savedAt:new Date().toISOString()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Instruction save was aborted'));});
    return true;
  }finally{db.close();}
}
async function readExamInstructionsFromDb(key){
  const db=await openExamDraftDb();
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(EXAM_DRAFT_DB_STORE,'readonly'),request=tx.objectStore(EXAM_DRAFT_DB_STORE).get(key);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}
  finally{db.close();}
}
function loadStoredExamTextDefaults(){try{const value=JSON.parse(localStorage.getItem(EXAM_TEXT_DEFAULTS_STORAGE_KEY)||'{}');if(!value||typeof value!=='object')return{};Object.values(value).forEach(saved=>{if(saved?.instrHTML)saved.instrHTML=upgradeDefaultInstructionHtml(saved.instrHTML);});return value;}catch(e){console.warn('Could not load exam text defaults',e);return{};}}
function persistExamTextDefaults(){try{localStorage.setItem(EXAM_TEXT_DEFAULTS_STORAGE_KEY,JSON.stringify(examTextDefaults));return true;}catch(e){console.warn('Could not save exam text defaults',e);return false;}}
function loadActiveExamTextDraft(){try{const value=JSON.parse(localStorage.getItem(EXAM_TEXT_ACTIVE_DRAFT_STORAGE_KEY)||'null');if(!value||typeof value!=='object')return null;if(value.instrHTML)value.instrHTML=upgradeDefaultInstructionHtml(value.instrHTML);return value;}catch(e){console.warn('Could not load active exam text draft',e);return null;}}
function persistActiveExamTextDraft(details){try{localStorage.setItem(EXAM_TEXT_ACTIVE_DRAFT_STORAGE_KEY,JSON.stringify({details:{subject:details.subject||'',examination:details.examination||'Examination'},coverPage:{...coverPage},instrHTML:{...instrHTML},savedAt:new Date().toISOString()}));return true;}catch(e){console.warn('Could not save active exam text draft',e);return false;}}
function loadStoredExamInstructions(){try{const value=JSON.parse(localStorage.getItem(EXAM_INSTRUCTION_HTML_STORAGE_KEY)||'{}');if(!value||typeof value!=='object')return{};Object.values(value).forEach(saved=>{if(saved?.instrHTML)saved.instrHTML=upgradeDefaultInstructionHtml(saved.instrHTML);});return value;}catch(e){console.warn('Could not load exam instructions',e);return{};}}
function persistCurrentExamInstructions(details=getExamDetails()){
  const key=examTextDefaultsKey(details),snapshot={...instrHTML};
  if(!key.startsWith('|'))writeExamInstructionsToDb(key,snapshot).catch(e=>console.warn('Could not save exam instructions to IndexedDB',e));
  try{
    if(key.startsWith('|'))return false;
    const saved=loadStoredExamInstructions();
    saved[key]={instrHTML:snapshot,savedAt:new Date().toISOString()};
    localStorage.setItem(EXAM_INSTRUCTION_HTML_STORAGE_KEY,JSON.stringify(saved));
    return true;
  }catch(e){console.warn('Could not save exam instructions',e);return false;}
}
function applyStoredExamInstructions(details=getExamDetails()){
  const saved=loadStoredExamInstructions()[examTextDefaultsKey(details)];
  if(!saved?.instrHTML)return false;
  instrHTML={...instrHTML,...saved.instrHTML};
  return true;
}
async function restoreExamInstructionsFromDb(){
  try{
    const key=examTextDefaultsKey(getExamDetails());
    if(key.startsWith('|'))return false;
    const saved=await readExamInstructionsFromDb(key);
    if(!saved?.instrHTML)return false;
    instrHTML={...instrHTML,...upgradeDefaultInstructionHtml(saved.instrHTML)};
    examTextDefaults[key]={coverPage:{...coverPage},instrHTML:{...instrHTML}};
    if(typeof renderExam==='function')renderExam();
    return true;
  }catch(e){console.warn('Could not restore exam instructions from IndexedDB',e);return false;}
}
let examTextDefaults=loadStoredExamTextDefaults();
const STANDARD_COVER_PAGE_PRESET={
  approvedMaterials:"One bound reference that may be annotated\nOne approved CAS calculator or CAS software, and one scientific calculator",
  materialsSupplied:"Question and Answer Book of xx pages\nFormula Sheet\nMultiple-Choice Answer Sheet",
  instructions:"Follow the instructions on your Multiple-Choice Answer Sheet.\nYou may keep this Multiple-Choice Question Book.\nStudents are not permitted to bring mobile phones and/or any unauthorised electronic devices into the examination room.",
  approvedMaterialsHtml:"<ul><li>One bound reference that may be annotated</li><li>One approved CAS calculator or CAS software, and one scientific calculator</li></ul>",
  materialsSuppliedHtml:"<ul><li>Question and Answer Book of xx pages</li><li>Formula Sheet</li><li>Multiple-Choice Answer Sheet</li></ul>",
  instructionsHtml:"<ul><li>Follow the instructions on your Multiple-Choice Answer Sheet.</li><li>You may keep this Multiple-Choice Question Book.</li></ul><p>Students are <strong>not</strong> permitted to bring mobile phones and/or any unauthorised electronic devices into the examination room.</p>"
};
const COVER_PAGE_DEFAULTS={
  "Foundation Mathematics|Examination":{
    ...STANDARD_COVER_PAGE_PRESET
  },
  "General Mathematics|Examination 1":{
    ...STANDARD_COVER_PAGE_PRESET
  }
};function coverDefaultsForDetails(details={}){const subject=details.subject||"Foundation Mathematics",exam=details.examination||"Examination";return COVER_PAGE_DEFAULTS[`${subject}|${exam}`]||COVER_PAGE_DEFAULTS["Foundation Mathematics|Examination"];}
function coverPageHasContent(cp={}){return ['approvedMaterialsHtml','materialsSuppliedHtml','instructionsHtml','approvedMaterials','materialsSupplied','instructions'].some(key=>String(cp[key]||'').trim());}
function coverPageLooksLikeOldDefault(cp={}){const joined=['approvedMaterialsHtml','materialsSuppliedHtml','instructionsHtml','approvedMaterials','materialsSupplied','instructions'].map(k=>String(cp[k]||'')).join(' ').toLowerCase();return joined.includes('multiple-choice answer sheet')||joined.includes('one bound reference that may be annotated')||joined.includes('one approved cas calculator')||joined.includes('students are <b>not</b> permitted')||joined.includes('students are not permitted to bring mobile phones');}
function coverPageMatchesPreset(){const current=['approvedMaterialsHtml','materialsSuppliedHtml','instructionsHtml'].map(k=>String(coverPage[k]||'').trim()).join('|');if(!current.replace(/\|/g,''))return true;return Object.values(COVER_PAGE_DEFAULTS).some(preset=>['approvedMaterialsHtml','materialsSuppliedHtml','instructionsHtml'].map(k=>String(preset[k]||'').trim()).join('|')===current);}
function examTextDefaultsKey(details={}){return `${String(details.subject||'').trim()}|${String(details.examination||'Examination').trim()}`;}
function rememberCurrentExamTextDefaults(){const details=getExamDetails(),key=examTextDefaultsKey(details);if(key.startsWith('|'))return false;examTextDefaults[key]={coverPage:{...coverPage},instrHTML:{...instrHTML}};const defaultsSaved=persistExamTextDefaults(),draftSaved=persistActiveExamTextDraft(details),instructionsSaved=persistCurrentExamInstructions(details);return defaultsSaved&&draftSaved&&instructionsSaved;}
function applyExamTextDefaultsForCurrentExam(){const saved=examTextDefaults[examTextDefaultsKey(getExamDetails())];if(!saved)return applyStoredExamInstructions();if(saved.coverPage)coverPage=coverPageHasContent(saved.coverPage)?{...coverPage,...saved.coverPage}:{...coverDefaultsForDetails(getExamDetails())};if(saved.instrHTML)instrHTML={...instrHTML,...saved.instrHTML};applyStoredExamInstructions();return true;}
function applyActiveExamTextDraft(){const draft=loadActiveExamTextDraft();if(!draft)return false;const details=draft.details||{};if(details.subject||details.examination)applyExamDetails({...getExamDetails(),...details});if(draft.coverPage)coverPage={...coverPage,...draft.coverPage};if(draft.instrHTML)instrHTML={...instrHTML,...draft.instrHTML};return true;}
function updateCoverDefaultEditors(){const ids={approvedMaterialsHtml:'cover-approved-materials',materialsSuppliedHtml:'cover-materials-supplied',instructionsHtml:'cover-instructions'};Object.entries(ids).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.innerHTML=coverPage[key]||'';});}
function applyCoverDefaultsForCurrentExam(force=false){if(!force&&applyExamTextDefaultsForCurrentExam()){updateCoverDefaultEditors();return;}const preset=coverDefaultsForDetails(getExamDetails());if(!force&&!coverPageMatchesPreset())return;coverPage={...preset};instrHTML={...DEFAULT_INSTR_HTML};updateCoverDefaultEditors();}
const DEFAULT_COVER_PAGE=coverDefaultsForDetails();
const DEFAULT_COVER_PAGE_HTML=DEFAULT_COVER_PAGE;
let coverPage={...DEFAULT_COVER_PAGE};
let examSchoolName='Quero Learning Tools',coverPageLogoData='',coverPageLogoName='',coverPageFooterData='',coverPageFooterName='';
let coverPageExpanded=false;
let questions=[],deletedQuestions=[],extractorCandidates=[],nextId=1,examQuestions=[],savedPapers=[],editingId=null;
let examBuilderMode='edit',examPageBreaks=[],examPageZoom=1,examSectionMarkLimits=loadStoredExamSectionMarkLimits(),examSectionMarkLimitsLoadedFromCloud=false,examSectionMarkLimitsSaveTimer=null,examBuilderSettingsChannel=null;
const collapsedQuestionCards=new Set();
let activeBankFilter='private',activeAddQBankFilter='private',customBanks=[],questionBankAvailability={};
let curriculumManagerState={learningArea:'',topic:'',subtopic:'',skill:'',subject:'',yearLevel:'',author:''},curriculumDeletedIds=[],youtubeLinks=[],youtubeLinkDeletedIds=[],customSubjects=[],customYearLevels=[],customAuthors=[],deletedAuthors=[],customLearningAreas=[],deletedLearningAreas=[],learningAreaSubjects={},learningAreaYearLevels={};
const PRIVATE_SCHOOL_ID='quero-learning-tools';
const DEFAULT_SCHOOLS=[
  {id:PRIVATE_SCHOOL_ID,name:'Quero Learning Tools',emailDomain:'',studentJoinCode:'QUERO-STUDENT',teacherJoinCode:'QUERO-TEACHER',teacherRequiresApproval:false,active:true,createdAt:new Date().toISOString()},
  {id:'tarneit-senior-college',name:'Tarneit Senior College',emailDomain:'tarneitsc.vic.edu.au',studentJoinCode:'TSC-STUDENT',teacherJoinCode:'TSC-TEACHER',teacherRequiresApproval:true,active:true,createdAt:new Date().toISOString()}
];
let schools=[...DEFAULT_SCHOOLS],schoolAccounts=[],selectedSchoolId=PRIVATE_SCHOOL_ID,homeClasses=[];
let currentRole='admin';
let activeEditorId='f-text';
const expandedSectionInstructions=new Set();
const STORAGE_KEY='brainforge_exam_builder_state_v1';
const CURRICULUM_CACHE_KEY='quero_curriculum_map_cache_v1';
const CURRICULUM_CACHE_RESET_KEY='quero_curriculum_cache_reset_20261024_1';
function resetCurriculumLocalCacheOnce(){
  try{
    if(localStorage.getItem(CURRICULUM_CACHE_RESET_KEY)==='done')return false;
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){
      const state=JSON.parse(raw);
      ['curriculumLinks','youtubeLinks','customSubjects','customYearLevels','customAuthors','deletedAuthors','customLearningAreas','learningAreaSubjects','learningAreaYearLevels','curriculumManagerState'].forEach(key=>delete state[key]);
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    }
    localStorage.setItem(CURRICULUM_CACHE_RESET_KEY,'done');
    return true;
  }catch(e){console.warn('Could not reset the Curriculum Manager cache:',e);return false;}
}
function saveCurriculumCache(){
  try{
    localStorage.setItem(CURRICULUM_CACHE_KEY,JSON.stringify({
      curriculumLinks:CURRICULUM_SKILL_LINKS,
      youtubeLinks,
      customSubjects,
      customYearLevels,
      customAuthors,
      deletedAuthors,
      customLearningAreas,
      deletedLearningAreas,
      learningAreaSubjects,
      learningAreaYearLevels,
      curriculumManagerState
    }));
    return true;
  }catch(e){console.warn('Could not save the Curriculum Manager cache:',e);return false;}
}
function loadCurriculumCache(){
  try{
    const raw=localStorage.getItem(CURRICULUM_CACHE_KEY);
    if(!raw)return false;
    const state=JSON.parse(raw),hidden=new Set((Array.isArray(state.deletedLearningAreas)?state.deletedLearningAreas:[]).map(normalizeLearningAreaName).filter(Boolean));
    deletedLearningAreas=[...hidden];
    customLearningAreas=Array.isArray(state.customLearningAreas)?[...new Set(state.customLearningAreas.map(normalizeLearningAreaName).filter(area=>area&&!hidden.has(area)))]:[];
    const allowed=new Set(customLearningAreas);
    learningAreaSubjects=normalizeLearningAreaSubjects(state.learningAreaSubjects);
    learningAreaYearLevels=normalizeLearningAreaYearLevels(state.learningAreaYearLevels);
    Object.keys(learningAreaSubjects).forEach(area=>{if(!allowed.has(normalizeLearningAreaName(area)))delete learningAreaSubjects[area];});
    Object.keys(learningAreaYearLevels).forEach(area=>{if(!allowed.has(normalizeLearningAreaName(area)))delete learningAreaYearLevels[area];});
    customSubjects=Array.isArray(state.customSubjects)?[...new Set(state.customSubjects.map(normalizeSubjectName).filter(Boolean))]:[];
    customYearLevels=Array.isArray(state.customYearLevels)?[...new Set(state.customYearLevels.map(normalizeYearLevelName).filter(Boolean))]:[];
    customAuthors=Array.isArray(state.customAuthors)?[...new Set(state.customAuthors.map(normalizeAuthorName).filter(Boolean))]:[];
    deletedAuthors=Array.isArray(state.deletedAuthors)?[...new Set(state.deletedAuthors.map(normalizeAuthorName).filter(Boolean))]:[];
    if(state.curriculumManagerState)curriculumManagerState={...curriculumManagerState,...state.curriculumManagerState,learningArea:normalizeLearningAreaName(state.curriculumManagerState.learningArea)};
    const links=Array.isArray(state.curriculumLinks)?state.curriculumLinks.filter(link=>allowed.has(normalizeLearningAreaName(link.learningArea||link.learning_area))):[];
    setRuntimeCurriculumLinks(links,{silent:true});
    youtubeLinks=Array.isArray(state.youtubeLinks)?state.youtubeLinks.map(normalizeYoutubeLink).filter(link=>link.title&&link.url&&allowed.has(normalizeLearningAreaName(link.learningArea))):[];
    return true;
  }catch(e){console.warn('Could not load the Curriculum Manager cache:',e);return false;}
}
// Supabase constants and client are defined in supabase-client.js.
let currentUser=null,currentProfile=null,currentProfileRole=null,adminUsers=[];
const PROFILE_CACHE_KEY='quero_cached_profile_v1';
function cachedProfile(){
  try{return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)||'null')||null;}catch{return null;}
}
function cachedProfileForCurrentUser(){
  const cached=cachedProfile();
  if(!cached)return null;
  if(currentUser?.id&&cached.id&&cached.id!==currentUser.id)return null;
  if(currentUser?.email&&cached.email&&String(cached.email).toLowerCase()!==String(currentUser.email).toLowerCase())return null;
  return cached;
}
function sessionHasCachedProfileRole(session){
  const user=session?.user,cached=cachedProfile();
  if(!user||!cached?.role)return false;
  if(user.id&&cached.id&&cached.id!==user.id)return false;
  if(user.email&&cached.email&&String(cached.email).toLowerCase()!==String(user.email).toLowerCase())return false;
  return true;
}
function saveProfileCache(profile={}){
  const payload={
    id:profile.id||currentUser?.id||'',
    username:profile.username||currentUser?.user_metadata?.username||'',
    email:profile.email||currentUser?.email||'',
    role:profile.role||currentProfileRole||currentRole||''
  };
  if(payload.id||payload.username||payload.email)localStorage.setItem(PROFILE_CACHE_KEY,JSON.stringify(payload));
}
function clearProfileCache(){
  localStorage.removeItem(PROFILE_CACHE_KEY);
}
function profileRoleToAppRole(role){
  const key=String(role||'').trim().toLowerCase().replace(/[\s.-]+/g,'_');
  const map={s_teacher:'s_teacher',moderator:'s_teacher',s_student:'s_student',sstudent:'s_student',teacher:'teacher',student:'student',admin:'admin',banned:'banned'};
  return map[key]||'teacher';
}
function schoolRegisterRole(){
  const role=String(document.getElementById('register-role')?.value||'student').trim().toLowerCase();
  return role==='teacher'?'teacher':'student';
}
function schoolRoleToProfileRole(role){
  return String(role||'student').trim().toLowerCase()==='teacher'?'s_teacher':'s_student';
}
function profileRoleToSchoolRole(role){
  return profileRoleToAppRole(role)==='s_teacher'?'teacher':'student';
}
function appRoleLabel(role){
  return {admin:'Admin',s_teacher:'S.Teacher',s_student:'S.Student',teacher:'Teacher',student:'Student',banned:'Banned'}[role]||'Teacher';
}
function updateSignedInLabel(){
  const email=document.getElementById('user-email');
  if(email)email.textContent=currentUser?`${currentUser.email||''} - ${appRoleLabel(currentRole)}`:'';
}
function setRoleTabVisibility(hidden){
  const roleSection=document.getElementById('role-section'),roleSwitch=document.getElementById('role-switch');
  if(roleSection)roleSection.style.display=hidden?'none':'';
  if(roleSwitch)roleSwitch.style.display=hidden?'none':'';
}
async function schoolMembershipRoleForCurrentUser(){
  if(!currentUser||!supabaseClient)return '';
  try{
    const email=String(currentUser.email||'').trim().toLowerCase();
    const ownRows=[];
    const byUser=await supabaseClient.from('school_membership').select('role,status,user_id,email,school_id').eq('user_id',currentUser.id).eq('status','active');
    if(!byUser.error&&Array.isArray(byUser.data))ownRows.push(...byUser.data);
    if(email){
      const byEmail=await supabaseClient.from('school_membership').select('role,status,user_id,email,school_id').ilike('email',email).eq('status','active');
      if(!byEmail.error&&Array.isArray(byEmail.data))ownRows.push(...byEmail.data);
    }
    const rows=ownRows.filter(row=>{
      const rowEmail=String(row.email||'').trim().toLowerCase();
      return String(row.school_id||'')!==PRIVATE_SCHOOL_ID&&String(row.status||'').toLowerCase()==='active'&&(String(row.user_id||'')===currentUser.id||(email&&rowEmail===email));
    });
    if(rows.some(row=>String(row.role||'').trim().toLowerCase()==='teacher'))return 's_teacher';
    if(rows.some(row=>String(row.role||'').trim().toLowerCase()==='student'))return 's_student';
  }catch(e){console.warn('Could not check school membership role:',e);}
  return '';
}
async function syncRoleFromSchoolMembership(profile){
  const existing=profileRoleToAppRole(profile?.role||currentProfileRole||'');
  if(existing==='admin'||existing==='banned')return profile;
  const schoolRole=await schoolMembershipRoleForCurrentUser();
  if(!schoolRole)return profile;
  if(existing===schoolRole)return {...(profile||{}),role:schoolRole};
  try{
    const payload={id:currentUser.id,email:profile?.email||currentUser.email||'',username:profile?.username||currentUser.user_metadata?.username||'',role:schoolRole};
    const {error}=await supabaseClient.from('profiles').upsert(payload,{onConflict:'id'});
    if(error)throw error;
    currentProfileRole=schoolRole;
    return {...(profile||{}),...payload};
  }catch(e){
    console.warn('Could not update profile role from school membership:',e);
    currentProfileRole=schoolRole;
    return {...(profile||{}),role:schoolRole};
  }
}
async function applyProfileRole(){
  if(!currentUser||!supabaseClient){setRoleTabVisibility(false);return;}
  let data=null,error=null;
  const byId=await supabaseClient.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
  data=byId.data;error=byId.error;
  if(!data&&!error&&currentUser.email){
    const byEmail=await supabaseClient.from('profiles').select('*').ilike('email',currentUser.email).maybeSingle();
    data=byEmail.data;error=byEmail.error;
  }
  if(error){console.warn('Could not load user role:',error);showToast('Could not load user role',true);setAppRole('teacher',false);}
  else{
    data=await syncRoleFromSchoolMembership(data);
    currentProfile=data||null;
    currentProfileRole=data?.role||'teacher';
    if(profileRoleToAppRole(currentProfileRole)==='banned'){showToast('This account has been banned',true);await supabaseClient.auth.signOut();setAuthUi(null);const err=document.getElementById('login-error');if(err)err.textContent='This account has been banned.';return;}
    saveProfileCache(currentProfile);
    setAppRole(profileRoleToAppRole(currentProfileRole),false);
    if(typeof renderGlobalTopbar==='function')renderGlobalTopbar();
  }
  await completePendingSchoolJoin(data);
  updateSignedInLabel();
  setRoleTabVisibility(true);
}
function setAuthUi(session,options={}){
  currentUser=session?.user||null;
  const resolving=Boolean(currentUser&&options?.resolving);
  const showLoading=resolving&&options?.showLoading!==false;
  if(!currentUser){currentProfileRole=null;currentProfile=null;resetSignInInitialization();clearProfileCache();}
  else{
    const cached=cachedProfileForCurrentUser();
    let appliedCachedRole=false;
    if(cached&&!currentProfile){
      currentProfile={...cached};
      currentProfileRole=cached.role||currentProfileRole;
      if(cached.role&&typeof setAppRole==='function'){setAppRole(profileRoleToAppRole(cached.role),false);appliedCachedRole=true;}
    }
    if(appliedCachedRole&&typeof showView==='function')setTimeout(()=>showView('home'),0);
  }
  const loading=document.getElementById('auth-loading-screen'),login=document.getElementById('login-screen'),app=document.getElementById('app'),email=document.getElementById('user-email'),strip=document.getElementById('user-strip');
  if(loading)loading.style.display=showLoading?'flex':'none';
  if(login)login.style.display=resolving?'none':(currentUser?'none':'flex');
  if(app)app.style.display=currentUser&&!resolving?'flex':'none';
  if(strip)strip.style.display=currentUser&&!resolving?'block':'none';
  if(email)email.textContent=currentUser?.email||'';
  if(!currentUser)setRoleTabVisibility(false);
  if(typeof renderGlobalTopbar==='function')renderGlobalTopbar();
}
function setAuthForm(mode){
  const forms={login:'login-form',register:'register-form',reset:'reset-form'};
  Object.entries(forms).forEach(([key,id])=>{const el=document.getElementById(id);if(el)el.style.display=key===mode?'block':'none';});
  ['login-error','register-error','reset-error'].forEach(id=>{const el=document.getElementById(id);if(el){el.textContent='';el.style.color='';}});
}
function showLoginForm(){setAuthForm('login');}
function showRegisterForm(){setAuthForm('register');}
function showResetForm(message='Enter a new password for your account'){
  const login=document.getElementById('login-screen'),app=document.getElementById('app'),resetError=document.getElementById('reset-error');
  if(login)login.style.display='flex';
  if(app)app.style.display='none';
  setAuthForm('reset');
  if(resetError)resetError.textContent=message;
}
function looksLikeEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||'').trim());}
async function resolveLoginEmail(identifier){
  const value=String(identifier||'').trim();
  if(looksLikeEmail(value))return value;
  if(!value)throw new Error('Enter username or email.');
  const {data,error}=await supabaseClient.from('profiles').select('email,username').ilike('username',value).maybeSingle();
  if(error)throw new Error('Username login needs a username column in the profiles table.');
  if(!data?.email)throw new Error('Username not found. Try your email instead.');
  return data.email;
}
async function sendPasswordReset(){
  const identifier=document.getElementById('login-email')?.value.trim(),err=document.getElementById('login-error');
  if(err){err.textContent='';err.style.color='';}
  if(!identifier){if(err)err.textContent='Enter your username or email first, then click Forgot Password.';return;}
  try{
    const email=await resolveLoginEmail(identifier);
    const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.href.split('#')[0]});
    if(error)throw error;
    if(err){err.style.color='#D9FFE6';err.textContent='Password reset email sent. Open the link in your email.';setTimeout(()=>{err.style.color='';},3000);}
  }catch(e){if(err)err.textContent=e.message||'Could not send password reset email.';}
}
async function resetPassword(){
  const password=document.getElementById('reset-password')?.value||'',confirm=document.getElementById('reset-password-confirm')?.value||'',err=document.getElementById('reset-error'),btn=document.getElementById('reset-btn');
  if(err)err.textContent='';
  if(password.length<6){if(err)err.textContent='Password must be at least 6 characters.';return;}
  if(password!==confirm){if(err)err.textContent='Passwords do not match.';return;}
  if(btn){btn.disabled=true;btn.textContent='Updating...';}
  try{
    const {error}=await supabaseClient.auth.updateUser({password});
    if(error)throw error;
    showToast('Password updated');
    showLoginForm();
    await supabaseClient.auth.signOut();
    setAuthUi(null);
  }catch(e){if(err)err.textContent=e.message||'Could not update password.';}
  finally{if(btn){btn.disabled=false;btn.textContent='Update password';}}
}
function isPasswordRecoveryUrl(){
  const raw=(window.location.hash||'')+'&'+(window.location.search||'');
  return /(?:type|event)=password_recovery/i.test(raw)||/(?:type|event)=recovery/i.test(raw)||/PASSWORD_RECOVERY/i.test(raw);
}
function clearPasswordRecoveryUrl(){
  if(isPasswordRecoveryUrl()&&window.history?.replaceState)window.history.replaceState({},document.title,window.location.pathname+window.location.search.replace(/[?&](type|event)=(password_)?recovery/i,''));
}
function showStudentHomeAfterAuth(){
  if((currentRole==='student'||currentRole==='s_student')&&typeof showView==='function'){
    setTimeout(()=>showView('home'),0);
  }
}
function isStudentQuestionLazyLoadRole(){return currentRole==='student'||currentRole==='s_student';}
function prepareStudentQuestionLazyLoad(){if(isStudentQuestionLazyLoadRole())questions=[];}
async function loadQuestionsForSignedInRole(){
  if(isStudentQuestionLazyLoadRole()){
    questions=[];
    return true;
  }
  return loadQuestionsFromSupabase();
}
let signInInitializationPromise=null;
let signInInitializationUserId='';
let completedSignInInitializationUserId='';
let signInInitializationGeneration=0;
let acceptedAuthSessionToken='';
function acceptAuthSession(session){acceptedAuthSessionToken=String(session?.access_token||'');}
function clearAcceptedAuthSession(){acceptedAuthSessionToken='';}
function authSessionIsAccepted(session){
  const token=String(session?.access_token||'');
  return Boolean(token&&token===acceptedAuthSessionToken);
}
function resetSignInInitialization(){
  signInInitializationGeneration+=1;
  signInInitializationPromise=null;
  signInInitializationUserId='';
  completedSignInInitializationUserId='';
}
function signInInitializationIsCurrent(userId,generation,session){
  return generation===signInInitializationGeneration&&String(currentUser?.id||'')===userId&&authSessionIsAccepted(session);
}
async function initializeSignedInSession(session){
  const userId=String(session?.user?.id||'');
  if(!userId||!authSessionIsAccepted(session))return false;
  if(completedSignInInitializationUserId===userId)return true;
  if(signInInitializationPromise&&signInInitializationUserId===userId)return signInInitializationPromise;
  signInInitializationUserId=userId;
  const generation=signInInitializationGeneration;
  const initialization=(async()=>{
    setAuthUi(session,{resolving:true});
    await applyProfileRole();
    if(!signInInitializationIsCurrent(userId,generation,session))return false;
    setAuthUi(session);
    prepareStudentQuestionLazyLoad();
    showStudentHomeAfterAuth();
    await loadSchoolsFromSupabase();
    if(!signInInitializationIsCurrent(userId,generation,session))return false;
    await loadCurriculumFromSupabase();
    if(!signInInitializationIsCurrent(userId,generation,session))return false;
    await loadQuestionBanksFromSupabase();
    if(!signInInitializationIsCurrent(userId,generation,session))return false;
    await loadQuestionsForSignedInRole();
    if(!signInInitializationIsCurrent(userId,generation,session))return false;
    if(typeof loadExamPapersFromSupabase==='function')await loadExamPapersFromSupabase({silent:true});
    if(!signInInitializationIsCurrent(userId,generation,session))return false;
    completedSignInInitializationUserId=userId;
    return true;
  })();
  signInInitializationPromise=initialization;
  try{return await initialization;}
  finally{
    if(signInInitializationPromise===initialization){signInInitializationPromise=null;signInInitializationUserId='';}
  }
}
async function initAuth(){
  if(!supabaseClient){setAuthUi(null);return;}
  const recovery=isPasswordRecoveryUrl();
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session)acceptAuthSession(session);else clearAcceptedAuthSession();
  if(recovery&&session){setAuthUi(session);showResetForm();clearPasswordRecoveryUrl();return;}
  if(session){setAuthUi(session,{resolving:!sessionHasCachedProfileRole(session),showLoading:false});await applyProfileRole();if(!currentUser||!authSessionIsAccepted(session))return;setAuthUi(session);prepareStudentQuestionLazyLoad();showStudentHomeAfterAuth();await loadSchoolsFromSupabase();await loadCurriculumFromSupabase();await loadQuestionBanksFromSupabase();await loadQuestionsForSignedInRole();if(typeof loadExamPapersFromSupabase==='function')await loadExamPapersFromSupabase({silent:true});}
  else setAuthUi(null);
  supabaseClient.auth.onAuthStateChange(async(event,session)=>{
    if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED')return;
    if(event==='PASSWORD_RECOVERY'||(isPasswordRecoveryUrl()&&session)){acceptAuthSession(session);setAuthUi(session);showResetForm();clearPasswordRecoveryUrl();return;}
    if(!session){clearAcceptedAuthSession();setAuthUi(null);return;}
    if(!authSessionIsAccepted(session))return;
    await initializeSignedInSession(session);
  });
}
async function registerWithEmail(){
  const username=document.getElementById('register-username')?.value.trim()||'',email=document.getElementById('register-email')?.value.trim()||'',registerRole=schoolRegisterRole(),schoolJoinCode=normalizeSchoolJoinCode(document.getElementById('register-school-code')?.value||''),password=document.getElementById('register-password')?.value||'',terms=document.getElementById('register-terms')?.checked,err=document.getElementById('register-error'),btn=document.getElementById('register-btn');
  if(err){err.textContent='';err.style.color='';}
  if(!username||!email||!password){if(err)err.textContent='Enter username, email, and password.';return;}
  if(!looksLikeEmail(email)){if(err)err.textContent='Enter a valid email address.';return;}
  if(password.length<6){if(err)err.textContent='Password must be at least 6 characters.';return;}
  if(!terms){if(err)err.textContent='Please agree with the terms & conditions.';return;}
  if(btn){btn.disabled=true;btn.textContent='Registering...';}
  try{
    const existing=await supabaseClient.from('profiles').select('id').ilike('username',username).maybeSingle();
    if(existing.data?.id)throw new Error('Username is already taken.');
    const privateSignup=!schoolJoinCode;
    const joinedSchool=privateSignup?await privateSchoolForRegistration():await schoolForRegistration(email,schoolJoinCode,registerRole);
    if(!joinedSchool)throw new Error(privateSignup?'Quero Learning Tools school is not ready. Ask an admin to sync or add it in Supabase.':'School email domain or join code was not found.');
    const teacherPending=!privateSignup&&registerRole==='teacher'&&joinedSchool.teacherRequiresApproval!==false;
    const profileRole=privateSignup?registerRole:(teacherPending?'teacher':schoolRoleToProfileRole(registerRole));
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{username,school_join_code:schoolJoinCode,account_role:registerRole,private_school_signup:privateSignup},emailRedirectTo:window.location.href.split('#')[0]}});
    if(error)throw error;
    if(data.user){
      const profile={id:data.user.id,email,username,role:profileRole,pending_school_join_code:privateSignup?null:schoolJoinCode};
      const {error:profileError}=await supabaseClient.from('profiles').upsert(profile,{onConflict:'id'});
      if(profileError)console.warn('Could not save username profile:',profileError);
      saveProfileCache(profile);
      if(data.session){
        const membershipOk=await createSchoolMembershipForUser(data.user,joinedSchool,{username,email,displayName:username},registerRole,true,teacherPending?'pending':'active');
        if(!membershipOk)throw new Error('Account created, but school membership could not be saved. Run the latest School Manager SQL in Supabase, then try logging in again.');
      }
    }
    if(err){err.style.color='#D9FFE6';err.textContent=teacherPending?'Registration created. Teacher access is pending admin approval after email confirmation.':'Registration created. Check your email if confirmation is required, then log in.';}
    document.getElementById('login-email').value=username;
    setTimeout(showLoginForm,1200);
  }catch(e){if(err)err.textContent=e.message||'Could not register.';}
  finally{if(btn){btn.disabled=false;btn.textContent='Register';}}
}
async function loginWithEmail(){
  const identifier=document.getElementById('login-email')?.value.trim();
  const password=document.getElementById('login-password')?.value;
  const err=document.getElementById('login-error'),btn=document.getElementById('login-btn');
  if(err){err.textContent='';err.style.color='';}
  if(!identifier||!password){if(err)err.textContent='Enter username/email and password.';return;}
  if(btn){btn.disabled=true;btn.textContent='Logging in...';}
  try{
    const email=await resolveLoginEmail(identifier);
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    acceptAuthSession(data.session);
    if(document.getElementById('login-remember')?.checked)localStorage.setItem('bf-login-identifier',identifier);else localStorage.removeItem('bf-login-identifier');
    if(await initializeSignedInSession(data.session))showToast('Signed in');
  }catch(e){if(err)err.textContent=e.message||'Could not sign in.';}
  finally{if(btn){btn.disabled=false;btn.textContent='Login';}}
}
async function logoutUser(){
  clearAcceptedAuthSession();
  resetSignInInitialization();
  clearProfileCache();
  setAuthUi(null);
  showLoginForm();
  const password=document.getElementById('login-password');
  if(password)password.value='';
  setAppRole('admin',false);
  questions=[];examQuestions=[];savedPapers=[];
  renderBank();renderExam();renderPapers();renderAddQList();updateStats();
  if(supabaseClient){
    try{await supabaseClient.auth.signOut();}
    catch(error){console.warn('Remote sign out did not complete:',error);}
  }
  showToast('Signed out');
}
const DIFFICULTY_LEVELS=['Easy','Medium','Hard','Advance','Extension'];
const MAIN_AREAS=['Mathematics','Science','English','Humanities','Computing','Business / Economics','Health','Languages','Arts'];
const DEFAULT_AREA_LEVELS=['7','8','9','10','VCE11','VCE12'];

function normalizeQuestion(q){const mainArea=normalizeLearningAreaName(q.mainArea||q.subject||q.subjects||'Mathematics'),curriculumChoices=curriculumOptionsForArea(mainArea),curriculum=curriculumChoices.includes(q.curriculum)?q.curriculum:curriculumChoices[0],data=dataForMainArea(mainArea,curriculum),levels=Object.keys(data).filter(y=>data[y]),yr=splitYearRange(q),level=data[yr.from]?yr.from:levels[0],levelData=data[level]||{},strands=Object.keys(levelData),strand=strands.includes(q.strand)?q.strand:strands[0],subtopics=levelData[strand]||[];const reviewedBy=q.reviewedBy||q.reviewedby||'',author=['Original','VCAA','VCAA: NHT','AI-Generated'].includes(q.author)?q.author:'Original',date=Number(q.date)||new Date().getFullYear(),questionNumber=Math.max(1,parseInt(q.questionNumber,10)||1),parsedLines=parseInt(q.lines,10),lines=Number.isFinite(parsedLines)?Math.max(0,parsedLines):1,sourceType=['source','data'].includes(q.sourceType)?q.sourceType:'source';const normalized={...q,mainArea,curriculum,bank:q.bank||'private',yearFrom:level,yearTo:level,year:level,topic:q.topic||subtopics[0]||strand||mainArea,calculator:q.calculator||'Calculator',strand,author,date,questionNumber,lines,subtopic:q.subtopic||subtopics[0]||'',difficulty:q.difficulty||'Medium',solution:q.solution||'',solutionHtml:q.solutionHtml||'',answerBoxImageData:q.answerBoxImageData||'',answerBoxImageName:q.answerBoxImageName||'',answerBoxSolutionImageData:q.answerBoxSolutionImageData||'',answerBoxSolutionImageName:q.answerBoxSolutionImageName||'',tableAnswerImageData:q.tableAnswerImageData||'',tableAnswerImageName:q.tableAnswerImageName||'',tableAnswerSolutionImageData:q.tableAnswerSolutionImageData||'',tableAnswerSolutionImageName:q.tableAnswerSolutionImageName||'',source:q.source||'',sourceType,source2:q.source2||'',sourceType2:['source','data'].includes(q.sourceType2)?q.sourceType2:'source',afterText2:q.afterText2||'',afterText2Html:q.afterText2Html||'',teacherRating:Number(q.teacherRating)||0,studentRating:Number(q.studentRating)||0,teacherRatingCount:Number(q.teacherRatingCount)||Number(q.ratingCount)||0,studentRatingCount:Number(q.studentRatingCount)||0,teacherRatingTotal:Number(q.teacherRatingTotal)||0,studentRatingTotal:Number(q.studentRatingTotal)||0,ratingCount:Number(q.ratingCount)||0,averageRating:Number(q.averageRating)||0,attemptCount:Number(q.attemptCount)||0,correctCount:Number(q.correctCount)||0,comments:q.comments||'',reviewStatus:['Draft','Needs review','Approved','Retire'].includes(q.reviewStatus)?q.reviewStatus:'Draft',reviewedBy,reviewedby:reviewedBy};const creatorYears=normalizeYearLevels(q.yearLevels||q.yearLevel||q.yearFrom||q.year||normalized.yearFrom),creatorYear=creatorYears[0];normalized.subject=q.subject||q.subjects||normalized.mainArea;normalized.subjects=normalized.subject;normalized.topics=q.topics||q.topic||normalized.topic;normalized.topic=normalized.topics;normalized.subtopics=q.subtopics||q.subtopic||normalized.subtopic;normalized.subtopic=normalized.subtopics;normalized.skills=q.skills||'';normalized.yearLevels=creatorYears;normalized.yearLevel=creatorYears;normalized.yearFrom=creatorYear;normalized.yearTo=creatorYears[creatorYears.length-1]||creatorYear;normalized.year=creatorYears.join(', ');normalized.responsePercent=Number(q.responsePercent??q.response)||0;normalized.response=normalized.responsePercent;normalized.strand=normalized.topic;normalized.mainArea=normalized.subject;normalized.curriculum='';if(normalized.type==='mc'&&!normalized.template)normalized.template='standard';if(normalized.type==='tf'){normalized.options=['True','False'];normalized.optionsHtml=['True','False'];normalized.correct=Number.isInteger(Number(normalized.correct))?Math.max(0,Math.min(1,Number(normalized.correct))):0;}if(normalized.type==='mc'&&!normalized.optionTemplate)normalized.optionTemplate='standard';if(normalized.optionTemplate==='diagram')normalized.optionTemplate='diagram1';if(normalized.type==='mc'&&normalized.template==='multiple'){normalized.subQuestions=Array.isArray(normalized.subQuestions)?normalized.subQuestions.map(sq=>({...sq,solution:sq.solution||'',solutionHtml:sq.solutionHtml||''})):[];}if(normalized.type==='sa'||normalized.type==='er'){normalized.answerTemplate=normaliseAnswerTemplate(normalized.answerTemplate);normalized.wordLineBlocks=normaliseSaerWordBlocks(normalized.wordLineBlocks);normalized.parts=normaliseSaerParts(normalized.parts);}return normalized;}

function readingTimeMinutes(value){
  const text=String(value||'').toLowerCase();
  const hourMatch=text.match(/(\d+)\s*(hours?|hrs?|h)\b/);
  const minMatch=text.match(/(\d+)\s*(minutes?|mins?|m)\b/);
  if(hourMatch||minMatch)return (hourMatch?Number(hourMatch[1])*60:0)+(minMatch?Number(minMatch[1]):0);
  const n=parseInt(text,10);
  return Number.isFinite(n)?n:15;
}
function bfDurationMinutes(value,fallback=0){
  const text=String(value||'').toLowerCase();
  const hourMatch=text.match(/(d+(?:.d+)?)s*(hours?|hrs?|h)/);
  const minMatch=text.match(/(d+)s*(minutes?|mins?|m)/);
  if(hourMatch||minMatch)return Math.round((hourMatch?Number(hourMatch[1])*60:0)+(minMatch?Number(minMatch[1]):0));
  const n=parseInt(text,10);
  return Number.isFinite(n)?n:fallback;
}
function bfDurationLabel(minutes){
  minutes=Math.max(0,Math.round(Number(minutes)||0));
  const h=Math.floor(minutes/60),m=minutes%60;
  if(h&&m)return h+' hour'+(h===1?'':'s')+' '+m+' minute'+(m===1?'':'s');
  if(h)return h+' hour'+(h===1?'':'s');
  return minutes+' minute'+(minutes===1?'':'s');
}
function bfParseClockMinutes(value){
  const text=String(value||'').trim().toLowerCase();
  if(!text)return null;
  const m=text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);
  if(!m)return null;
  let h=Number(m[1]),min=Number(m[2]||0),ampm=m[3]||'';
  if(min>59||h>23)return null;
  if(ampm){if(h<1||h>12)return null;if(ampm==='pm'&&h!==12)h+=12;if(ampm==='am'&&h===12)h=0;}
  return h*60+min;
}
function bfClockLabel(totalMinutes){
  totalMinutes=((Math.round(Number(totalMinutes)||0)%1440)+1440)%1440;
  const h24=Math.floor(totalMinutes/60),min=totalMinutes%60,ampm=h24>=12?'pm':'am';
  let h=h24%12;if(h===0)h=12;
  return h+':'+String(min).padStart(2,'0')+' '+ampm;
}
function bfExamTimeSummary(details){
  const readingMinutes=bfDurationMinutes(details.readingTime,15),writingMinutes=bfDurationMinutes(details.writingTime,90),start=bfParseClockMinutes(details.time)||bfParseClockMinutes('14:00');
  const readingDuration=bfDurationLabel(readingMinutes),writingDuration=bfDurationLabel(writingMinutes);
  if(start===null)return {readingPrefix:'Reading time is ',readingDuration,readingSuffix:'',writingPrefix:'Writing time is ',writingDuration,writingSuffix:''};
  const writingStart=start+readingMinutes,writingEnd=writingStart+writingMinutes;
  return {readingPrefix:'Reading time is ',readingDuration,readingSuffix:': '+bfClockLabel(start)+' to '+bfClockLabel(writingStart),writingPrefix:'Writing time is ',writingDuration,writingSuffix:': '+bfClockLabel(writingStart)+' to '+bfClockLabel(writingEnd)};
}
function bfDocxTimeParagraph(prefix,duration,suffix,before=0,after=120){
  return '<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="'+before+'" w:after="'+after+'" w:line="240" w:lineRule="auto"/></w:pPr>'+RUN(prefix,'Arial',false,false,false,22,'000000')+RUN(duration,'Arial',true,false,false,22,'000000')+RUN(suffix,'Arial',false,false,false,22,'000000')+'</w:p>';
}
function adjustReadingTime(delta){
  adjustDurationField('exam-reading-time',delta,15);
}
function adjustWritingTime(delta){
  adjustDurationField('exam-writing-time',delta,90);
}
function adjustDurationField(id,delta,fallback){
  const el=document.getElementById(id);if(!el)return;
  const minutes=Math.max(0,readingTimeMinutes(el.value||fallback)+delta);
  el.value=`${minutes} min${minutes===1?'':'s'}`;
  el.dispatchEvent(new Event('input',{bubbles:true}));
}
function schoolForExamName(name){
  const selected=String(name||'').trim();
  if(!selected)return null;
  return normaliseSchools(schools).find(s=>s.name===selected)||null;
}
function schoolMembershipForCurrentUser(){
  if(!currentUser||!Array.isArray(schoolAccounts))return null;
  const userId=String(currentUser.id||'');
  const email=String(currentUser.email||currentProfile?.email||'').trim().toLowerCase();
  const preferredRole=profileRoleToSchoolRole(currentProfileRole||currentRole||'');
  const accounts=normaliseSchoolAccounts(schoolAccounts,normaliseSchools(schools).map(s=>s.id)).filter(account=>{
    const accountUserId=String(account.userId||'');
    const accountEmail=String(account.email||'').trim().toLowerCase();
    const status=String(account.status||'active').toLowerCase();
    return status==='active'&&account.schoolId&&account.schoolId!==PRIVATE_SCHOOL_ID&&((userId&&accountUserId===userId)||(email&&accountEmail===email));
  });
  return accounts.find(account=>account.role===preferredRole)||accounts.find(account=>account.role==='teacher')||accounts[0]||null;
}
function schoolForCurrentUser(){
  const membership=schoolMembershipForCurrentUser();
  if(!membership)return null;
  return normaliseSchools(schools).find(s=>s.id===membership.schoolId&&s.active)||null;
}
function syncExamSchoolFromCurrentUser(save=false){
  const school=schoolForCurrentUser();
  const el=document.getElementById('exam-school-name');
  if(!school)return false;
  examSchoolName=school.name;
  if(typeof syncExamSchoolOptions==='function')syncExamSchoolOptions(school.name);
  if(el)el.value=school.name;
  applySchoolExamAssetsForExam(false);
  if(typeof updateExamTitleFromMetadata==='function')updateExamTitleFromMetadata();
  if(typeof renderExam==='function')renderExam();
  if(save)saveState();
  return true;
}
function applySchoolExamAssetsForExam(save=false){
  const school=schoolForExamName((document.getElementById('exam-school-name')||{}).value||examSchoolName);
  if(!school)return false;
  examSchoolName=school.name;
  coverPageLogoData=school.coverLogoData||'';
  coverPageLogoName=school.coverLogoName||'';
  coverPageFooterData=school.coverFooterData||'';
  coverPageFooterName=school.coverFooterName||'';
  updateCoverAssetPreview('logo');
  updateCoverAssetPreview('footer');
  if(save)saveState();
  return true;
}
function normaliseExamSectionMarkLimits(value){
  const source=value&&typeof value==='object'?value:{};
  return ['mc','tf','sa','er'].reduce((result,key)=>{
    const limit=Math.max(0,Math.floor(Number(source[key])||0));
    if(limit)result[key]=limit;
    return result;
  },{});
}
function loadStoredExamSectionMarkLimits(){
  try{return normaliseExamSectionMarkLimits(JSON.parse(localStorage.getItem(EXAM_SECTION_MARK_LIMITS_STORAGE_KEY)||'{}'));}
  catch(error){console.warn('Could not load section mark limits',error);return {};}
}
function persistExamSectionMarkLimits(){
  try{localStorage.setItem(EXAM_SECTION_MARK_LIMITS_STORAGE_KEY,JSON.stringify(normaliseExamSectionMarkLimits(examSectionMarkLimits)));return true;}
  catch(error){console.warn('Could not save section mark limits',error);return false;}
}
function subscribeExamBuilderSettings(){
  if(!supabaseClient||examBuilderSettingsChannel)return;
  examBuilderSettingsChannel=supabaseClient.channel('exam-builder-settings-global')
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'exam_builder_settings',filter:`id=eq.${EXAM_BUILDER_SETTINGS_ID}`},payload=>{
      examSectionMarkLimits=normaliseExamSectionMarkLimits(payload.new?.section_mark_limits);
      examSectionMarkLimitsLoadedFromCloud=true;
      persistExamSectionMarkLimits();
      if(typeof renderExam==='function'&&document.getElementById('view-builder')?.style.display!=='none')renderExam();
    })
    .subscribe();
}
async function loadExamSectionMarkLimitsFromSupabase(){
  if(!supabaseClient||!currentUser?.id)return false;
  try{
    const {data,error}=await supabaseClient.from('exam_builder_settings').select('section_mark_limits').eq('id',EXAM_BUILDER_SETTINGS_ID).maybeSingle();
    if(error)throw error;
    if(!data)return false;
    examSectionMarkLimits=normaliseExamSectionMarkLimits(data.section_mark_limits);
    examSectionMarkLimitsLoadedFromCloud=true;
    persistExamSectionMarkLimits();
    subscribeExamBuilderSettings();
    if(typeof renderExam==='function'&&document.getElementById('view-builder')?.style.display!=='none')renderExam();
    return true;
  }catch(error){
    console.warn('Could not load shared exam section mark limits',error);
    return false;
  }
}
async function saveExamSectionMarkLimitsToSupabase(){
  if(!supabaseClient||!currentUser?.id||!isAdminRole())return false;
  const row={id:EXAM_BUILDER_SETTINGS_ID,section_mark_limits:normaliseExamSectionMarkLimits(examSectionMarkLimits),updated_by:currentUser.id,updated_at:new Date().toISOString()};
  const {error}=await supabaseClient.from('exam_builder_settings').upsert(row,{onConflict:'id'});
  if(error)throw error;
  examSectionMarkLimitsLoadedFromCloud=true;
  return true;
}
function queueExamSectionMarkLimitsSupabaseSave(){
  clearTimeout(examSectionMarkLimitsSaveTimer);
  examSectionMarkLimitsSaveTimer=setTimeout(async()=>{
    try{await saveExamSectionMarkLimitsToSupabase();}
    catch(error){console.error('Could not save shared exam section mark limits',error);showToast('Maximum Marks saved on this device, but could not sync to Supabase.',true);}
  },400);
}
function getExamDetails(){
  return {
    subject:(document.getElementById('exam-subject')||{}).value||'',
    examination:(document.getElementById('exam-number')||{}).value||'Examination',
    date:(document.getElementById('exam-date')||{}).value||'',
    time:(document.getElementById('exam-time')||{}).value||'14:00',
    readingTime:(document.getElementById('exam-reading-time')||{}).value||'15 mins',
    writingTime:(document.getElementById('exam-writing-time')||{}).value||'90 mins',
    schoolName:(document.getElementById('exam-school-name')||{}).value||examSchoolName||'Quero Learning Tools',
    coverLogoData:coverPageLogoData||'',
    coverLogoName:coverPageLogoName||'',
    coverFooterData:coverPageFooterData||'',
    coverFooterName:coverPageFooterName||'',
    sectionMarkLimits:{...normaliseExamSectionMarkLimits(examSectionMarkLimits)}
  };
}
function bfExportExamDetails(overrides={}){
  let current={};
  try{current=getExamDetails();}catch(e){current={};}
  const defaults={subject:preferredExamSubjectFromHomeClassrooms(),examination:'Examination',date:'',time:'14:00',readingTime:'15 mins',writingTime:'90 mins',schoolName:'Quero Learning Tools',coverLogoData:'',coverLogoName:'',coverFooterData:'',coverFooterName:''};
  const merged={...defaults,...current,...(overrides||{})};
  merged.coverLogoData=merged.coverLogoData||coverPageLogoData||'';
  merged.coverLogoName=merged.coverLogoName||coverPageLogoName||'';
  merged.coverFooterData=merged.coverFooterData||coverPageFooterData||'';
  merged.coverFooterName=merged.coverFooterName||coverPageFooterName||'';
  return merged;
}
async function bfDocxRegisterFooterImage(ctx,data,name,maxWidth=265,maxHeight=95){
  const before=ctx.rels.length;
  const image=await docxRegisterImage(ctx,data,name,maxWidth,maxHeight);
  if(image&&ctx.rels.length>before){
    ctx.footerRels=ctx.footerRels||[];
    ctx.footerRels.push(ctx.rels.pop());
  }
  return image;
}
async function bfDocxFooterXml(ctx,details={}){
  ctx.footerRels=ctx.footerRels||[];
  const school=details.schoolName||'Quero Learning Tools';
  const dateYear=String(details.date||'').match(/^(\d{4})/)?.[1]||String(new Date().getFullYear());
  const footerData=details.coverFooterData||coverPageFooterData||(typeof BF_EXAM_COVER_FOOTER_DATA!=='undefined'?BF_EXAM_COVER_FOOTER_DATA:'');
  const img=footerData?await bfDocxRegisterFooterImage(ctx,footerData,'Cover footer logo',265,95):null;
  const left='<w:tc><w:tcPr><w:tcW w:w="5245" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'+RUN(String.fromCharCode(169)+' '+school+' '+dateYear,'Arial',false,false,false,24,'000000')+'</w:p></w:tc>';
  const right='<w:tc><w:tcPr><w:tcW w:w="5245" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'+(img?docxImageRun(img,false,'right','inline'):'')+'</w:p></w:tc>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:tbl><w:tblPr><w:tblW w:w="10490" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5245"/><w:gridCol w:w="5245"/></w:tblGrid><w:tr>'+left+right+'</w:tr></w:tbl></w:ftr>';
}
function examTitleFromDetails(details=getExamDetails()){
  const yearMatch=String(details.date||'').match(/^(\d{4})/);
  const year=yearMatch?yearMatch[1]:String(new Date().getFullYear());
  const subject=(details.subject||preferredExamSubjectFromHomeClassrooms()||'Untitled Subject').trim();
  const examination=(details.examination||'Examination 1').trim();
  return `${year} ${subject} ${examination}`;
}
function updateExamTitleFromMetadata(){
  const el=document.getElementById('exam-title');
  if(el)el.value=examTitleFromDetails();
}
function applyExamDetails(details={}){
  const defaults={subject:preferredExamSubjectFromHomeClassrooms(),examination:'Examination',date:'',time:'14:00',readingTime:'15 mins',writingTime:'90 mins',schoolName:'Quero Learning Tools',coverLogoData:'',coverLogoName:'',coverFooterData:'',coverFooterName:''};
  const data={...defaults,...details};
  const hasStoredLimits=localStorage.getItem(EXAM_SECTION_MARK_LIMITS_STORAGE_KEY)!==null;
  if(!examSectionMarkLimitsLoadedFromCloud)examSectionMarkLimits=hasStoredLimits?loadStoredExamSectionMarkLimits():normaliseExamSectionMarkLimits(data.sectionMarkLimits);
  if(!hasStoredLimits&&Object.keys(examSectionMarkLimits).length)persistExamSectionMarkLimits();
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value;};
  syncExamSubjectOptions(data.subject);
  set('exam-subject',data.subject||currentExamSubject());
  set('exam-number',data.examination);
  set('exam-date',data.date);
  set('exam-time',data.time);
  set('exam-reading-time',data.readingTime);
  set('exam-writing-time',data.writingTime);
  if(typeof syncExamSchoolOptions==='function')syncExamSchoolOptions(data.schoolName||'Quero Learning Tools');
  set('exam-school-name',data.schoolName||'Quero Learning Tools');
  examSchoolName=data.schoolName||'Quero Learning Tools';
  const assetSchool=schoolForExamName(data.schoolName||'Quero Learning Tools');
  coverPageLogoData=data.coverLogoData||assetSchool?.coverLogoData||'';
  coverPageLogoName=data.coverLogoName||assetSchool?.coverLogoName||'';
  coverPageFooterData=data.coverFooterData||assetSchool?.coverFooterData||'';
  coverPageFooterName=data.coverFooterName||assetSchool?.coverFooterName||'';
  updateCoverAssetPreview('logo');
  updateCoverAssetPreview('footer');
  syncCreatorSubjectOptions(data.subject);
  updateExamTitleFromMetadata();
}
function coverAssetName(kind){return kind==='logo'?coverPageLogoName:coverPageFooterName;}
function coverAssetData(kind){return kind==='logo'?coverPageLogoData:coverPageFooterData;}
function setCoverAsset(kind,data,name){if(kind==='logo'){coverPageLogoData=data||'';coverPageLogoName=name||'';}else{coverPageFooterData=data||'';coverPageFooterName=name||'';}updateCoverAssetPreview(kind);saveState();}
function clearCoverAsset(kind){setCoverAsset(kind,'','');const input=document.getElementById(kind==='logo'?'exam-cover-logo':'exam-cover-footer');if(input)input.value='';}
function updateCoverAssetPreview(kind){const el=document.getElementById(kind==='logo'?'cover-logo-name':'cover-footer-name'),btn=document.getElementById(kind==='logo'?'cover-logo-clear':'cover-footer-clear'),name=coverAssetName(kind),has=!!coverAssetData(kind);if(el)el.textContent=has?(name||'Custom image selected'):`Using default Brain Forge ${kind==='logo'?'logo':'footer'}`;if(btn)btn.style.display=has?'inline-flex':'none';}
function handleCoverAssetUpload(kind,event){const file=event&&event.target&&event.target.files&&event.target.files[0];if(!file)return;if(!/^image\/(png|jpe?g)$/i.test(file.type)){alert('Please choose a PNG, JPG, or JPEG image.');event.target.value='';return;}const reader=new FileReader();reader.onload=()=>setCoverAsset(kind,reader.result,file.name);reader.readAsDataURL(file);}
function safeNormalizeQuestion(q){
  try{return normalizeQuestion(q);}catch(err){
    console.warn('Could not update saved question metadata',err,q);
    const years=normalizeYearLevels(q?.yearLevels||q?.yearLevel||q?.yearFrom||q?.year||'7');
    return {...(q||{}),bank:q?.bank||'private',type:q?.type||'mc',marks:Number(q?.marks)||1,topic:q?.topic||q?.topics||'',yearLevels:years,yearLevel:years,yearFrom:years[0],yearTo:years[years.length-1]||years[0],year:years.join(', ')};
  }
}
function recoverQuestionsFromState(state){
  const pool=[];
  if(Array.isArray(state.examQuestions))pool.push(...state.examQuestions);
  if(Array.isArray(state.savedPapers))state.savedPapers.forEach(p=>{if(Array.isArray(p.questions))pool.push(...p.questions);});
  const seen=new Set(),recovered=[];
  pool.forEach(item=>{
    if(!item)return;
    const key=item.id?`id:${item.id}`:`text:${plainTextFromHtml(item.textHtml||item.text||'').slice(0,160)}:${item.type||'mc'}`;
    if(seen.has(key))return;
    seen.add(key);
    const q=safeNormalizeQuestion({...item,bank:item.bank||'private'});
    if(!q.id)q.id=Date.now()+recovered.length;
    recovered.push(q);
  });
  return recovered;
}
const RECENTLY_DELETED_DAYS=30,RECENTLY_DELETED_MS=RECENTLY_DELETED_DAYS*24*60*60*1000;
function cleanupDeletedQuestions(){
  const now=Date.now();
  deletedQuestions=(Array.isArray(deletedQuestions)?deletedQuestions:[]).filter(q=>{
    const deletedAt=Date.parse(q.deletedAt||'');
    return deletedAt&&now-deletedAt<RECENTLY_DELETED_MS;
  });
}
function deletedDaysLeft(q){
  const deletedAt=Date.parse(q.deletedAt||'');
  if(!deletedAt)return 0;
  return Math.max(0,Math.ceil((RECENTLY_DELETED_MS-(Date.now()-deletedAt))/(24*60*60*1000)));
}
function schoolSlug(name){
  return String(name||'school').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'school';
}
function normaliseSchools(value){
  const source=Array.isArray(value)&&value.length?value:DEFAULT_SCHOOLS;
  const seen=new Set();
  const normalised=source.map((s,i)=>{
    const name=String(s?.name||'').trim();
    if(!name)return null;
    let id=String(s?.id||schoolSlug(name)).trim()||`school-${i+1}`;
    if(id==='brain-forge'||name.toLowerCase()==='brain forge')return null;
    const base=id;
    let n=2;
    while(seen.has(id))id=`${base}-${n++}`;
    seen.add(id);
    const defaultSchool=DEFAULT_SCHOOLS.find(d=>d.id===id||d.name.toLowerCase()===name.toLowerCase());
    const baseCode=normalizeSchoolJoinCode(name);
    const studentJoinCode=normalizeSchoolJoinCode(s?.studentJoinCode||s?.student_join_code||defaultSchool?.studentJoinCode||`${baseCode}STUDENT`);
    const teacherJoinCode=normalizeSchoolJoinCode(s?.teacherJoinCode||s?.teacher_join_code||defaultSchool?.teacherJoinCode||`${baseCode}TEACHER`);
    const emailDomain=String(s?.emailDomain||s?.email_domain||defaultSchool?.emailDomain||'').trim().toLowerCase();
    return {
      id,
      name,
      emailDomain,
      studentJoinCode,
      teacherJoinCode,
      teacherRequiresApproval:s?.teacherRequiresApproval??s?.teacher_requires_approval??defaultSchool?.teacherRequiresApproval??true,
      active:s?.active!==false,
      coverLogoData:s?.coverLogoData||s?.cover_logo_data||defaultSchool?.coverLogoData||'',
      coverLogoName:s?.coverLogoName||s?.cover_logo_name||defaultSchool?.coverLogoName||'',
      coverFooterData:s?.coverFooterData||s?.cover_footer_data||defaultSchool?.coverFooterData||'',
      coverFooterName:s?.coverFooterName||s?.cover_footer_name||defaultSchool?.coverFooterName||'',
      createdAt:s?.createdAt||new Date().toISOString(),
      updatedAt:s?.updatedAt||''
    };
  }).filter(Boolean);
  DEFAULT_SCHOOLS.forEach(defaultSchool=>{
    if(!normalised.some(s=>s.id===defaultSchool.id))normalised.push({...defaultSchool});
  });
  return normalised;
}
function normaliseSchoolAccounts(value,validSchoolIds=[]){
  const valid=new Set(validSchoolIds);
  return (Array.isArray(value)?value:[]).map((a,i)=>{
    const schoolId=String(a?.schoolId||'');
    if(valid.size&&!valid.has(schoolId))return null;
    const role=String(a?.role||'teacher').toLowerCase()==='student'?'student':'teacher';
    return {
      id:String(a?.id||`school-account-${Date.now()}-${i}`),
      schoolId,
      userId:String(a?.userId||a?.user_id||''),
      role,
      displayName:String(a?.displayName||'').trim(),
      username:String(a?.username||'').trim(),
      email:String(a?.email||'').trim(),
      status:['active','pending','suspended','archived'].includes(String(a?.status||'active'))?String(a.status):'active',
      passwordStatus:String(a?.passwordStatus||'Not set'),
      passwordUpdatedAt:a?.passwordUpdatedAt||'',
      createdAt:a?.createdAt||new Date().toISOString(),
      updatedAt:a?.updatedAt||''
    };
  }).filter(Boolean);
}
function normalizeSchoolJoinCode(value){
  return String(value||'').trim().toUpperCase().replace(/\s+/g,'');
}
function schoolEmailDomain(email){
  return String(email||'').trim().toLowerCase().split('@').pop()||'';
}
function schoolRegistrationCode(school,role){
  const key=String(role||'student').trim().toLowerCase()==='teacher'?'teacherJoinCode':'studentJoinCode';
  return normalizeSchoolJoinCode(school?.[key]||'');
}
async function schoolForRegistration(email,code,role='student'){
  const normalized=normalizeSchoolJoinCode(code);
  const domain=schoolEmailDomain(email);
  const schoolRole=String(role||'student').trim().toLowerCase()==='teacher'?'teacher':'student';
  if(!normalized||!domain)return null;
  if(supabaseClient){
    try{
      const {data,error}=await supabaseClient.rpc('find_school_for_registration',{input_email:email,input_join_code:normalized,input_role:schoolRole});
      if(!error){
        const row=Array.isArray(data)?data[0]:data;
        if(row)return schoolFromSupabaseRow(row);
      }
    }catch(e){console.warn('Could not use school registration lookup:',e);}
  }
  schools=normaliseSchools(schools);
  return schools.find(s=>{
    const domainOk=!s.emailDomain||schoolEmailDomain(email)===String(s.emailDomain).toLowerCase();
    const codeOk=schoolRegistrationCode(s,schoolRole)===normalized;
    return s.active&&domainOk&&codeOk;
  })||null;
}
async function privateSchoolForRegistration(){
  schools=normaliseSchools(schools);
  const local=schools.find(s=>s.id===PRIVATE_SCHOOL_ID)||DEFAULT_SCHOOLS.find(s=>s.id===PRIVATE_SCHOOL_ID);
  if(supabaseClient){
    try{
      const {data,error}=await supabaseClient.from('schools').select('*').eq('id',PRIVATE_SCHOOL_ID).eq('active',true).maybeSingle();
      if(!error&&data)return schoolFromSupabaseRow(data);
    }catch(e){console.warn('Could not load private Quero school:',e);}
  }
  return local||null;
}
async function schoolByJoinCode(code){
  const normalized=normalizeSchoolJoinCode(code);
  if(!normalized)return null;
  schools=normaliseSchools(schools);
  const local=schools.find(s=>s.active&&[s.studentJoinCode,s.teacherJoinCode].some(v=>normalizeSchoolJoinCode(v)===normalized));
  if(local)return local;
  if(!supabaseClient)return null;
  try{
    const {data,error}=await supabaseClient.from('schools').select('*').eq('active',true).or(`student_join_code.eq.${normalized},teacher_join_code.eq.${normalized}`).maybeSingle();
    if(error)throw error;
    return data?schoolFromSupabaseRow(data):null;
  }catch(e){
    console.warn('Could not check school join code:',e);
    return null;
  }
}
async function createSchoolMembershipForUser(user,school,profile={},role='student',silent=false,status='active'){
  if(!user||!school||!supabaseClient)return false;
  const schoolRole=String(role||'student').trim().toLowerCase()==='teacher'?'teacher':'student';
  const email=profile.email||user.email||'';
  const username=profile.username||user.user_metadata?.username||'';
  const displayName=profile.displayName||username||email;
  const account={
    id:`${schoolRole}-${user.id}-${school.id}`.replace(/[^a-zA-Z0-9_-]/g,'-'),
    schoolId:school.id,
    userId:user.id,
    role:schoolRole,
    displayName,
    username,
    email,
    status:['active','pending'].includes(status)?status:'active',
    passwordStatus:'Supabase Auth',
    passwordUpdatedAt:'',
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
  const ok=await saveSchoolMembershipToSupabase(account,true);
  if(ok){
    schoolAccounts=normaliseSchoolAccounts([...schoolAccounts.filter(a=>a.id!==account.id),account],schools.map(s=>s.id));
    saveState();
    if(!silent)showToast(`Joined ${school.name}`);
  }
  return ok;
}
async function createStudentMembershipForUser(user,school,profile={},silent=false){
  return createSchoolMembershipForUser(user,school,profile,'student',silent);
}
async function completePendingSchoolJoin(profile){
  const code=normalizeSchoolJoinCode(profile?.pending_school_join_code||currentUser?.user_metadata?.school_join_code||'');
  if(!code||!currentUser||!supabaseClient)return false;
  const schoolRole=String(currentUser?.user_metadata?.account_role||profileRoleToSchoolRole(profile?.role||currentProfileRole||'s_student')).trim().toLowerCase()==='teacher'?'teacher':'student';
  const school=await schoolForRegistration(profile?.email||currentUser.email||'',code,schoolRole);
  if(!school)return false;
  const teacherPending=schoolRole==='teacher'&&school.teacherRequiresApproval!==false;
  const profileRole=teacherPending?'teacher':schoolRoleToProfileRole(schoolRole);
  const ok=await createSchoolMembershipForUser(currentUser,school,{username:profile?.username,email:profile?.email||currentUser.email,displayName:profile?.username||currentUser.email},schoolRole,true,teacherPending?'pending':'active');
  if(ok){
    try{
      await supabaseClient.from('profiles').upsert({
        id:currentUser.id,
        email:profile?.email||currentUser.email||'',
        username:profile?.username||currentUser.user_metadata?.username||'',
        role:profileRole,
        pending_school_join_code:null
      },{onConflict:'id'});
      currentProfileRole=profileRole;
      setAppRole(profileRole,false);
      updateSignedInLabel();
    }
    catch(e){console.warn('Could not clear pending school join code:',e);}
    await loadSchoolsFromSupabase(true);
  }
  return ok;
}
function activeSchoolNames(){
  return normaliseSchools(schools).filter(s=>s.active).map(s=>s.name);
}
function saveState(){
  try{
    cleanupDeletedQuestions();
    const storedSavedPapers=typeof examPapersForLocalStorage==='function'?examPapersForLocalStorage():savedPapers;
    localStorage.setItem(STORAGE_KEY,JSON.stringify({questions,deletedQuestions,nextId,savedPapers:storedSavedPapers,instrHTML,coverPage,examTextDefaults,examPageZoom,customBanks,questionBankAvailability,schools,schoolAccounts,selectedSchoolId,homeClasses,activeBankFilter,activeAddQBankFilter,currentRole,examTitle:(document.getElementById('exam-title')||{}).value||'Untitled Exam',examDetails:getExamDetails()}));
  }catch(e){console.warn('Could not save exam builder state',e);}
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw){applyActiveExamTextDraft();return;}
    const state=JSON.parse(raw);
    questions=Array.isArray(state.questions)?state.questions.map(safeNormalizeQuestion):[];
    deletedQuestions=Array.isArray(state.deletedQuestions)?state.deletedQuestions.map(q=>safeNormalizeQuestion(q)).map((q,i)=>({...q,deletedAt:state.deletedQuestions[i]?.deletedAt||new Date().toISOString(),deletedSource:state.deletedQuestions[i]?.deletedSource||'question-bank'})):[];
    cleanupDeletedQuestions();
    nextId=state.nextId||((questions.concat(deletedQuestions).reduce((m,q)=>Math.max(m,q.id||0),0))+1);
    examQuestions=[];
    savedPapers=Array.isArray(state.savedPapers)?state.savedPapers:[];
    examBuilderMode='edit';
    examPageBreaks=[];
    const savedExamPageZoom=Number(state.examPageZoom);
    examPageZoom=!savedExamPageZoom||Math.abs(savedExamPageZoom-.72)<.001?1:Math.min(1,Math.max(.45,savedExamPageZoom));
    if(!questions.length){const recovered=recoverQuestionsFromState(state);if(recovered.length){questions=recovered;nextId=Math.max(nextId,questions.reduce((m,q)=>Math.max(m,q.id||0),0)+1);console.warn('Recovered Question Bank from saved papers/exam questions');}}
    customBanks=normaliseCustomBanks(state.customBanks);
    questionBankAvailability=normaliseQuestionBankAvailability(state.questionBankAvailability);
    activeBankFilter=state.activeBankFilter||'private';
    if(questions.length&&!questions.some(q=>(q.bank||'private')===activeBankFilter))activeBankFilter=questions[0].bank||'private';
    activeAddQBankFilter=state.activeAddQBankFilter||activeBankFilter;
    currentRole=state.currentRole||'admin';
    schools=normaliseSchools(state.schools);
    selectedSchoolId=schools.some(s=>s.id===state.selectedSchoolId)?state.selectedSchoolId:(schools[0]?.id||'');
    schoolAccounts=normaliseSchoolAccounts(state.schoolAccounts,schools.map(s=>s.id));
    homeClasses=typeof normaliseHomeClasses==='function'?normaliseHomeClasses(state.homeClasses):(Array.isArray(state.homeClasses)?state.homeClasses:[]);
    examTextDefaults={...(state.examTextDefaults&&typeof state.examTextDefaults==='object'?state.examTextDefaults:{}),...loadStoredExamTextDefaults()};
    instrHTML={...instrHTML,...upgradeDefaultInstructionHtml(state.instrHTML||{})};
    coverPage={...DEFAULT_COVER_PAGE,...DEFAULT_COVER_PAGE_HTML,...(state.coverPage||{})};if(!coverPage.approvedMaterials&&!coverPage.materialsSupplied&&!coverPage.instructions&&!coverPage.approvedMaterialsHtml&&!coverPage.materialsSuppliedHtml&&!coverPage.instructionsHtml)coverPage={...DEFAULT_COVER_PAGE,...DEFAULT_COVER_PAGE_HTML};
    if(state.examTitle)document.getElementById('exam-title').value=state.examTitle;
    applyExamDetails(state.examDetails||{});
    const defaultKey=examTextDefaultsKey(getExamDetails());
    const activeDraft=loadActiveExamTextDraft();
    const activeDraftKey=activeDraft?examTextDefaultsKey(activeDraft.details||{}):'';
    if(activeDraft&&activeDraftKey===defaultKey){
      if(activeDraft.coverPage)coverPage={...coverPage,...activeDraft.coverPage};
      if(activeDraft.instrHTML)instrHTML={...instrHTML,...activeDraft.instrHTML};
    }else if(examTextDefaults[defaultKey]){
      applyExamTextDefaultsForCurrentExam();
    }
    applyStoredExamInstructions();
    if(!coverPageHasContent(coverPage))coverPage={...coverDefaultsForDetails(getExamDetails())};
    if(state.coverPage||state.instrHTML||activeDraftKey===defaultKey||examTextDefaults[defaultKey]){
      examTextDefaults[defaultKey]={coverPage:{...coverPage},instrHTML:{...instrHTML}};
      persistExamTextDefaults();
      persistActiveExamTextDraft(getExamDetails());
      persistCurrentExamInstructions();
    }
  }catch(e){console.warn('Could not load exam builder state',e);}
}

async function loadQuestionsFromSupabase(){
  if(!supabaseClient)return false;
  try{
    const {data,error}=await supabaseClient.from('questions').select('*').order('created_at',{ascending:false});
    if(error){console.error('Could not load questions from Supabase:',error);showToast('Could not load Supabase question bank',true);return false;}
    const onlineQuestions=(data||[]).map(row=>({...(row.data||{}),supabaseId:row.id})).map(safeNormalizeQuestion);
    if(!onlineQuestions.length)return false;
    questions=onlineQuestions;
    nextId=questions.concat(deletedQuestions).reduce((max,q)=>Math.max(max,Number(q.id)||0),0)+1;
    if(questions.length&&!questions.some(q=>(q.bank||'private')===activeBankFilter))activeBankFilter=questions[0].bank||'private';
    if(questions.length&&!questions.some(q=>(q.bank||'private')===activeAddQBankFilter))activeAddQBankFilter=activeBankFilter;
    syncBankTabs();
    renderBank();
    renderExam();
    renderAddQList();
    updateStats();
    saveState();
    return true;
  }catch(e){console.error('Could not load questions from Supabase:',e);showToast('Could not load Supabase question bank',true);return false;}
}
async function loadQuestionBanksFromSupabase(){
  if(!supabaseClient)return false;
  try{
    const {data,error}=await supabaseClient.from('question_banks').select('id,name,visibility,icon,enabled,is_builtin,created_at').order('is_builtin',{ascending:false}).order('name',{ascending:true});
    if(error)throw error;
    if(!Array.isArray(data)||!data.length)return false;
    questionBankAvailability=normaliseQuestionBankAvailability(Object.fromEntries(data.map(row=>[row.id,row.enabled!==false])));
    customBanks=normaliseCustomBanks(data.filter(row=>!row.is_builtin&&!BUILT_IN_BANKS.some(bank=>bank.id===row.id)).map(row=>({id:row.id,name:row.name,visibility:row.visibility,icon:row.icon||'ti-folder',createdAt:row.created_at})));
    saveState();
    syncBankTabs();
    return true;
  }catch(e){
    console.warn('Could not load question bank availability from Supabase. Using the local cache.',e);
    return false;
  }
}
async function saveQuestionBankToSupabase(bank){
  if(!supabaseClient||!bank)return false;
  try{
    const row={id:bank.id,name:bank.name,visibility:bank.visibility||'private',icon:bank.icon||'ti-folder',enabled:isQuestionBankEnabled(bank.id),is_builtin:BUILT_IN_BANKS.some(item=>item.id===bank.id),updated_at:new Date().toISOString()};
    const {error}=await supabaseClient.from('question_banks').upsert(row,{onConflict:'id'});
    if(error)throw error;
    return true;
  }catch(e){console.warn('Could not save question bank availability to Supabase:',e);return false;}
}
async function deleteQuestionBankFromSupabase(id){
  if(!supabaseClient)return false;
  try{const {error}=await supabaseClient.from('question_banks').delete().eq('id',id);if(error)throw error;return true;}
  catch(e){console.warn('Could not remove question bank from Supabase:',e);return false;}
}
function schoolSupabaseRow(s){
  return {
    id:String(s.id||schoolSlug(s.name)),
    name:String(s.name||'').trim(),
    email_domain:String(s.emailDomain||'').trim().toLowerCase(),
    student_join_code:String(s.studentJoinCode||'').trim().toUpperCase(),
    teacher_join_code:String(s.teacherJoinCode||'').trim().toUpperCase(),
    teacher_requires_approval:s.teacherRequiresApproval!==false,
    active:s.active!==false,
    created_at:s.createdAt||new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}
function schoolAssetSupabaseFields(s){
  return {
    cover_logo_data:s.coverLogoData||'',
    cover_logo_name:s.coverLogoName||'',
    cover_footer_data:s.coverFooterData||'',
    cover_footer_name:s.coverFooterName||''
  };
}
function schoolFromSupabaseRow(row){
  return {
    id:String(row.id||schoolSlug(row.name)),
    name:String(row.name||'').trim(),
    emailDomain:String(row.email_domain||'').trim().toLowerCase(),
    studentJoinCode:String(row.student_join_code||'').trim().toUpperCase(),
    teacherJoinCode:String(row.teacher_join_code||'').trim().toUpperCase(),
    teacherRequiresApproval:row.teacher_requires_approval!==false,
    active:row.active!==false,
    coverLogoData:String(row.cover_logo_data||''),
    coverLogoName:String(row.cover_logo_name||''),
    coverFooterData:String(row.cover_footer_data||''),
    coverFooterName:String(row.cover_footer_name||''),
    createdAt:row.created_at||new Date().toISOString(),
    updatedAt:row.updated_at||''
  };
}
function schoolMembershipSupabaseRow(a){
  return {
    id:String(a.id||`school-account-${Date.now()}`),
    school_id:String(a.schoolId||''),
    user_id:a.userId||null,
    role:String(a.role||'teacher').toLowerCase()==='student'?'student':'teacher',
    name:String(a.name||'').trim(),
    surname:String(a.surname||'').trim(),
    display_name:String(a.displayName||'').trim(),
    username:String(a.username||'').trim(),
    email:String(a.email||'').trim(),
    status:['active','pending','suspended','archived'].includes(String(a.status||'active'))?String(a.status):'active',
    password_status:String(a.passwordStatus||'Not set'),
    password_updated_at:a.passwordUpdatedAt||null,
    created_at:a.createdAt||new Date().toISOString(),
    updated_at:new Date().toISOString()
  };
}
function schoolMembershipFromSupabaseRow(row){
  return {
    id:String(row.id||`school-account-${Date.now()}`),
    schoolId:String(row.school_id||''),
    userId:String(row.user_id||''),
    role:String(row.role||'teacher').toLowerCase()==='student'?'student':'teacher',
    name:String(row.name||'').trim(),
    surname:String(row.surname||'').trim(),
    displayName:String(row.display_name||'').trim(),
    username:String(row.username||'').trim(),
    email:String(row.email||'').trim(),
    status:['active','pending','suspended','archived'].includes(String(row.status||'active'))?String(row.status):'active',
    passwordStatus:String(row.password_status||'Not set'),
    passwordUpdatedAt:row.password_updated_at||'',
    createdAt:row.created_at||new Date().toISOString(),
    updatedAt:row.updated_at||''
  };
}
async function loadSchoolsFromSupabase(silent=true){
  if(!supabaseClient)return false;
  try{
    const schoolResult=await supabaseClient.from('schools').select('*').order('name',{ascending:true});
    if(schoolResult.error)throw schoolResult.error;
    const membershipResult=await supabaseClient.from('school_membership').select('*').order('role',{ascending:true}).order('display_name',{ascending:true});
    if(membershipResult.error)throw membershipResult.error;
    const localAssets=new Map(normaliseSchools(schools).map(s=>[s.id,{coverLogoData:s.coverLogoData||'',coverLogoName:s.coverLogoName||'',coverFooterData:s.coverFooterData||'',coverFooterName:s.coverFooterName||''}]));
    const loadedSchools=normaliseSchools((schoolResult.data||[]).map(schoolFromSupabaseRow)).map(s=>({...s,...Object.fromEntries(Object.entries(localAssets.get(s.id)||{}).filter(([,value])=>!!value))}));
    if(loadedSchools.length)schools=loadedSchools;
    selectedSchoolId=schools.some(s=>s.id===selectedSchoolId)?selectedSchoolId:(schools[0]?.id||'');
    schoolAccounts=normaliseSchoolAccounts((membershipResult.data||[]).map(schoolMembershipFromSupabaseRow),schools.map(s=>s.id));
    syncExamSchoolOptions();
    syncExamSchoolFromCurrentUser(false);
    renderSchoolManager();
    saveState();
    return true;
  }catch(e){
    console.warn('Could not load schools from Supabase:',e);
    if(!silent)showToast('Could not load schools from Supabase. Using local school list.',true);
    return false;
  }
}
async function saveSchoolToSupabase(school,silent=true){
  saveState();
  if(!supabaseClient||!school)return false;
  try{
    const baseRow=schoolSupabaseRow(school);
    let {error}=await supabaseClient.from('schools').upsert({...baseRow,...schoolAssetSupabaseFields(school)}).select();
    if(error&&/cover_(logo|footer)_(data|name)/i.test(String(error.message||''))){
      ({error}=await supabaseClient.from('schools').upsert(baseRow).select());
    }
    if(error)throw error;
    return true;
  }catch(e){
    console.warn('Could not save school to Supabase:',e);
    if(!silent)showToast('School saved locally, but not to Supabase.',true);
    return false;
  }
}
async function deleteSchoolFromSupabase(id,silent=true){
  saveState();
  if(!supabaseClient||!id)return false;
  try{
    const {error}=await supabaseClient.from('schools').delete().eq('id',id);
    if(error)throw error;
    return true;
  }catch(e){
    console.warn('Could not delete school from Supabase:',e);
    if(!silent)showToast('School deleted locally, but not from Supabase.',true);
    return false;
  }
}
async function saveSchoolMembershipToSupabase(account,silent=true){
  saveState();
  if(!supabaseClient||!account)return false;
  try{
    const {error}=await supabaseClient.from('school_membership').upsert(schoolMembershipSupabaseRow(account)).select();
    if(error)throw error;
    return true;
  }catch(e){
    console.warn('Could not save school membership to Supabase:',e);
    if(!silent)showToast('Account saved locally, but not to Supabase.',true);
    return false;
  }
}
async function deleteSchoolMembershipFromSupabase(id,silent=true){
  saveState();
  if(!supabaseClient||!id)return false;
  try{
    const {error}=await supabaseClient.from('school_membership').delete().eq('id',id);
    if(error)throw error;
    return true;
  }catch(e){
    console.warn('Could not delete school membership from Supabase:',e);
    if(!silent)showToast('Account removed locally, but not from Supabase.',true);
    return false;
  }
}
async function deleteSchoolAccountDetailsFromSupabase(account,silent=true){
  saveState();
  if(!supabaseClient||!account)return false;
  try{
    const membershipId=account.id||'';
    const userId=account.userId||account.user_id||'';
    const email=String(account.email||'').trim();
    if(membershipId){
      const rpcResult=await supabaseClient.rpc('delete_school_account_details',{input_membership_id:membershipId});
      if(!rpcResult.error)return true;
      if(!/function|schema cache|not found/i.test(String(rpcResult.error.message||'')))throw rpcResult.error;
    }
    if(membershipId){
      const {error}=await supabaseClient.from('school_membership').delete().eq('id',membershipId);
      if(error)throw error;
    }
    if(userId){
      const remaining=await supabaseClient.from('school_membership').select('id').eq('user_id',userId).limit(1);
      if(remaining.error)throw remaining.error;
      if(!remaining.data?.length){
        const {error}=await supabaseClient.from('profiles').delete().eq('id',userId);
        if(error)throw error;
      }
    }else if(email){
      const remaining=await supabaseClient.from('school_membership').select('id').ilike('email',email).limit(1);
      if(remaining.error)throw remaining.error;
      if(!remaining.data?.length){
        const {error}=await supabaseClient.from('profiles').delete().ilike('email',email);
        if(error)throw error;
      }
    }
    return true;
  }catch(e){
    console.warn('Could not delete school account details from Supabase:',e);
    if(!silent)showToast('Account removed locally, but Supabase app records could not be fully removed.',true);
    return false;
  }
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function typeClass(t){return t==='mc'?'tag-mc':t==='tf'?'tag-mc':t==='sa'?'tag-sa':'tag-er';}
function typeShort(t){return t==='mc'?'MCQ':t==='tf'?'T/F':t==='sa'?'SA':'ER';}
const BUILT_IN_BANKS=[
  {id:'private',name:'Private Bank',visibility:'private',icon:'ti-lock'},
  {id:'permitted',name:'Permitted Bank',visibility:'shared',icon:'ti-shield-check'},
  {id:'brainforge',name:'Quero Bank',visibility:'shared',icon:'ti-flame'},
  {id:'vcaa',name:'VCAA Bank',visibility:'shared',icon:'ti-certificate'},
  {id:'global',name:'Live Quiz Bank',visibility:'public',icon:'ti-world'}
];
function bankSlug(name){let slug=String(name||'').trim().toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');return slug||'bank';}
function normaliseCustomBanks(value){const seen=new Set(BUILT_IN_BANKS.map(b=>b.id)),rows=[];(Array.isArray(value)?value:[]).forEach((b,i)=>{const name=String(b?.name||'').trim();if(!name)return;let id=String(b?.id||'').trim()||`custom-${bankSlug(name)}`;if(BUILT_IN_BANKS.some(x=>x.id===id))id=`custom-${id}`;let base=id,n=2;while(seen.has(id)){id=`${base}-${n++}`;}seen.add(id);rows.push({id,name,visibility:['private','school','shared','public'].includes(b?.visibility)?b.visibility:'private',icon:b?.icon||'ti-folder',createdAt:b?.createdAt||new Date().toISOString()});});return rows;}
function normaliseQuestionBankAvailability(value){const result={};if(value&&typeof value==='object')Object.entries(value).forEach(([id,enabled])=>{const key=String(id||'').trim();if(key)result[key]=enabled!==false;});return result;}
function isQuestionBankEnabled(id){return questionBankAvailability[String(id||'private')]!==false;}
function questionCanBeUsed(q){return isQuestionBankEnabled(q?.bank||'private');}
function usableQuestions(source){return (Array.isArray(source)?source:questions).filter(questionCanBeUsed);}
function allQuestionBanks(){const base=[...BUILT_IN_BANKS,...normaliseCustomBanks(customBanks)],seen=new Set(base.map(b=>b.id));questions.forEach(q=>{const id=q.bank||'private';if(id&&!seen.has(id)){seen.add(id);base.push({id,name:id.replace(/^custom-/i,'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),visibility:'imported',icon:'ti-folder'});}});return base.map(bank=>({...bank,enabled:isQuestionBankEnabled(bank.id)}));}
function availableQuestionBanks(includeDisabledForAdmin=false){return allQuestionBanks().filter(bank=>bank.enabled||(includeDisabledForAdmin&&isAdminRole()));}
function bankExists(id){return allQuestionBanks().some(b=>b.id===id);}
function bankLabel(b){return allQuestionBanks().find(x=>x.id===b)?.name||'Private Bank';}
function bankIcon(b){return allQuestionBanks().find(x=>x.id===b)?.icon||'ti-folder';}
function isAdminRole(){return currentRole==='admin';}
function sourceTypeLabel(type){return type==='data'?'Data':'Source';}
const BASE_SUBJECT_OPTIONS=['F-6 Mathematics','F-6 Science','7-10A Mathematics','7-10A Science','Foundation Mathematics','General Mathematics','Mathematical Methods','Specialist Mathematics','Physics','Chemistry','Biology','Psychology'];
const DEFAULT_LEARNING_AREA_SUBJECTS={};
const YEAR_LEVEL_OPTIONS=[];
const DEFAULT_AUTHOR_OPTIONS=[];
const CURRICULUM_SKILL_LINKS=[];
function normalizeYearLevelValue(v){const map={VCE11:'11 VCE',VCE12:'12 VCE'};return map[v]||v;}
function normalizeYearLevels(value){
  const raw=Array.isArray(value)?value:String(value||'').split(/,|\s+-\s+/);
  const values=raw.map(v=>normalizeYearLevelValue(String(v).trim())).filter(Boolean);
  return [...new Set(values.length?values:['7'])];
}
function normalizeCurriculumYearLevels(value){
  const raw=Array.isArray(value)?value:String(value||'').split(/,|;/);
  return [...new Set(raw.map(v=>normalizeYearLevelValue(String(v).trim())).filter(Boolean))];
}
function normalizeCurriculumLink(link){
  const subjects=splitCreatorMultiValue(link.subjects||link.linkedSubjects||link.linked_subjects||[]);
  const yearLevels=normalizeCurriculumYearLevels(link.yearLevels||link.year_levels||link.linkedYearLevels||[]);
  return{id:link.id||link.supabaseId||'',learningArea:normalizeLearningAreaName(link.learningArea||link.learning_area||link.area),topic:String(link.topic||'').trim(),subtopic:String(link.subtopic||'').trim(),skill:String(link.skill||'').trim(),subjects,yearLevels,topicOrder:Number(link.topicOrder??link.topic_order??0)||0,subtopicOrder:Number(link.subtopicOrder??link.subtopic_order??0)||0,skillOrder:Number(link.skillOrder??link.skill_order??0)||0,active:link.active!==false};
}
function normalizeYoutubeLink(link){
  return{
    id:link.id||link.supabaseId||'',
    curriculumSkillId:link.curriculumSkillId||link.curriculum_skill_id||'',
    learningArea:normalizeLearningAreaName(link.learningArea||link.learning_area),
    topic:String(link.topic||'').trim(),
    subtopic:String(link.subtopic||'').trim(),
    skill:String(link.skill||'').trim(),
    title:String(link.title||'').trim(),
    url:String(link.url||'').trim(),
    sortOrder:Number(link.sortOrder??link.sort_order??0)||0,
    active:link.active!==false
  };
}
function curriculumLinkKeyParts(link){
  return{learningArea:normalizeLearningAreaName(link?.learningArea||link?.learning_area||link?.area),topic:String(link?.topic||'').trim(),subtopic:String(link?.subtopic||'').trim(),skill:String(link?.skill||'').trim()};
}
function syncYoutubeLinkSkillFields(item,link){
  const parts=curriculumLinkKeyParts(link);
  item.curriculumSkillId=link?.id||link?.curriculum_skill_id||item.curriculumSkillId||'';
  item.learningArea=parts.learningArea;
  item.topic=parts.topic;
  item.subtopic=parts.subtopic;
  item.skill=parts.skill;
  return item;
}
function reconcileYoutubeLinksWithCurriculumMap(){
  let changed=0;
  (Array.isArray(youtubeLinks)?youtubeLinks:[]).forEach(item=>{
    const skillId=String(item.curriculumSkillId||item.curriculum_skill_id||'').trim();
    if(!skillId)return;
    const link=CURRICULUM_SKILL_LINKS.find(candidate=>String(candidate.id||'').trim()===skillId);
    if(!link)return;
    const before=curriculumLinkKeyParts(item),after=curriculumLinkKeyParts(link);
    if(before.learningArea===after.learningArea&&before.topic===after.topic&&before.subtopic===after.subtopic&&before.skill===after.skill)return;
    syncYoutubeLinkSkillFields(item,link);
    changed++;
  });
  return changed;
}
function youtubeLinksForCurriculumSkill(link){
  const parts=curriculumLinkKeyParts(link);
  if(!parts.skill)return [];
  return (Array.isArray(youtubeLinks)?youtubeLinks:[]).map(normalizeYoutubeLink).filter(item=>{
    if(item.active===false||!item.title||!item.url)return false;
    return normalizeLearningAreaName(item.learningArea)===parts.learningArea&&item.topic===parts.topic&&item.subtopic===parts.subtopic&&item.skill===parts.skill;
  }).sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0)||String(a.title).localeCompare(String(b.title),undefined,{numeric:true,sensitivity:'base'}));
}
function refreshCurriculumConsumers(){
  try{
    syncExamSubjectOptions(currentExamSubject());
    syncCreatorMultiOptions('subjects',getCreatorMultiValues('subjects'));
    syncCreatorMultiOptions('topics',getCreatorMultiValues('topics'));
    syncCreatorMultiOptions('subtopics',getCreatorMultiValues('subtopics'));
    syncCreatorMultiOptions('skills',getCreatorMultiValues('skills'));
    syncExtractorMultiOptions('extractor-global-subject','subject',extractorMultiValues('extractor-global-subject'));
    syncExtractorMultiOptions('extractor-global-topic','topic',extractorMultiValues('extractor-global-topic'));
    syncExtractorMultiOptions('extractor-global-subtopic','subtopic',extractorMultiValues('extractor-global-subtopic'));
    syncExtractorMultiOptions('extractor-global-skills','skills',extractorMultiValues('extractor-global-skills'));
    if(document.getElementById('view-extractor')?.style.display!=='none')renderExtractorPreview();
  }catch(e){console.warn('Could not refresh curriculum dropdowns',e);}
}
function setRuntimeCurriculumLinks(links,{silent=false}={}){
  CURRICULUM_SKILL_LINKS.length=0;
  (links||[]).map(normalizeCurriculumLink).filter(l=>l.learningArea&&l.topic&&l.active!==false).forEach(l=>CURRICULUM_SKILL_LINKS.push(l));
  ensureCurriculumProgressionOrders();
  refreshCurriculumConsumers();
  syncQuestionsAfterCurriculumLinkChange({silent:true});
  if(!silent){renderCurriculumManager();renderBank();renderAddQList();}
}
function ensureCurriculumProgressionOrders(){
  const topicsByArea=new Map(),subtopicsByTopic=new Map(),skillsBySubtopic=new Map();
  CURRICULUM_SKILL_LINKS.forEach((link,index)=>{
    const area=normalizeLearningAreaName(link.learningArea),topicName=link.topic||'',topic=area+'||'+topicName,subtopic=area+'||'+topicName+'||'+(link.subtopic||''),skill=link.skill||'';
    if(!area||!topicName)return;
    if(!topicsByArea.has(area))topicsByArea.set(area,new Map());
    const topicMap=topicsByArea.get(area);
    if(!topicMap.has(topicName))topicMap.set(topicName,Number(link.topicOrder)||topicMap.size+1);
    if(!Number(link.topicOrder))link.topicOrder=topicMap.get(topicName);
    if(!subtopicsByTopic.has(topic))subtopicsByTopic.set(topic,new Map());
    const subtopicMap=subtopicsByTopic.get(topic);
    if(!subtopicMap.has(subtopic))subtopicMap.set(subtopic,Number(link.subtopicOrder)||subtopicMap.size+1);
    if(!Number(link.subtopicOrder))link.subtopicOrder=subtopicMap.get(subtopic);
    const skillGroupKey=topic+'||'+subtopic;
    if(!skillsBySubtopic.has(skillGroupKey))skillsBySubtopic.set(skillGroupKey,new Map());
    const skillMap=skillsBySubtopic.get(skillGroupKey);
    if(!skillMap.has(skill))skillMap.set(skill,Number(link.skillOrder)||skillMap.size+1);
    if(!Number(link.skillOrder))link.skillOrder=skillMap.get(skill);
  });
}
function curriculumMapRows(){
  ensureCurriculumProgressionOrders();
  return curriculumLearningAreas().map((area,areaIndex)=>{
    const topicMap=new Map();
    curriculumLinksForArea(area).forEach(raw=>{
      const link=normalizeCurriculumLink(raw);
      if(!link.topic)return;
      if(!topicMap.has(link.topic))topicMap.set(link.topic,{name:link.topic,order:Number(link.topicOrder)||topicMap.size+1,subtopics:new Map()});
      const topic=topicMap.get(link.topic);
      if(!link.subtopic)return;
      if(!topic.subtopics.has(link.subtopic))topic.subtopics.set(link.subtopic,{name:link.subtopic,order:Number(link.subtopicOrder)||topic.subtopics.size+1,skills:[]});
      if(link.skill)topic.subtopics.get(link.subtopic).skills.push({id:link.id||'',name:link.skill,subjects:[...(link.subjects||[])],yearLevels:[...(link.yearLevels||[])],order:Number(link.skillOrder)||topic.subtopics.get(link.subtopic).skills.length+1,active:link.active!==false});
    });
    const topics=[...topicMap.values()].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})).map(topic=>({
      name:topic.name,
      order:topic.order,
      subtopics:[...topic.subtopics.values()].sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})).map(subtopic=>({name:subtopic.name,order:subtopic.order,skills:subtopic.skills.sort((a,b)=>a.order-b.order||a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'}))}))
    }));
    return{learning_area:area,display_order:areaIndex+1,topics,subjects:[...ensureLearningAreaSubjectRecord(area)],year_levels:[...ensureLearningAreaYearLevelRecord(area)],updated_by:currentUser?.id||null};
  });
}
function applyCurriculumMapRows(rows){
  const links=[],areas=[];
  learningAreaSubjects={};
  learningAreaYearLevels={};
  (rows||[]).forEach(row=>{
    const area=normalizeLearningAreaName(row.learning_area||row.learningArea);
    if(!area)return;
    areas.push(area);
    setLearningAreaSubjectList(area,row.subjects||[]);
    setLearningAreaYearLevelList(area,row.year_levels||row.yearLevels||[]);
    const topics=Array.isArray(row.topics)?row.topics:[];
    topics.forEach((topic,topicIndex)=>{
      const topicName=String(topic?.name||topic?.topic||'').trim();
      if(!topicName)return;
      const topicOrder=Number(topic?.order??topic?.topicOrder??topicIndex+1)||topicIndex+1;
      const subtopics=Array.isArray(topic?.subtopics)?topic.subtopics:[];
      if(!subtopics.length){links.push({learningArea:area,topic:topicName,subtopic:'',skill:'',subjects:[],yearLevels:[],topicOrder,subtopicOrder:0,skillOrder:0,active:true});return;}
      subtopics.forEach((subtopic,subtopicIndex)=>{
        const subtopicName=String(subtopic?.name||subtopic?.subtopic||'').trim();
        if(!subtopicName)return;
        const subtopicOrder=Number(subtopic?.order??subtopic?.subtopicOrder??subtopicIndex+1)||subtopicIndex+1;
        const skills=Array.isArray(subtopic?.skills)?subtopic.skills:[];
        if(!skills.length){links.push({learningArea:area,topic:topicName,subtopic:subtopicName,skill:'',subjects:[],yearLevels:[],topicOrder,subtopicOrder,skillOrder:0,active:true});return;}
        skills.forEach((skill,skillIndex)=>{
          const item=typeof skill==='string'?{name:skill}:skill||{};
          const skillName=String(item.name||item.skill||'').trim();
          if(!skillName)return;
          links.push({id:item.id||'',learningArea:area,topic:topicName,subtopic:subtopicName,skill:skillName,subjects:item.subjects||[],yearLevels:item.yearLevels||item.year_levels||[],topicOrder,subtopicOrder,skillOrder:Number(item.order??item.skillOrder??skillIndex+1)||skillIndex+1,active:item.active!==false});
        });
      });
    });
  });
  customLearningAreas=[...new Set(areas)];
  deletedLearningAreas=[];
  setRuntimeCurriculumLinks(links,{silent:true});
  customSubjects=subjectRowsFromLearningAreas(false).map(row=>row.name);
  customYearLevels=[...new Set(yearRowsFromLearningAreas(false).map(row=>row.name))];
}
async function loadCurriculumFromSupabase(){
  if(!supabaseClient)return false;
  try{
    const {data,error}=await supabaseClient.from('curriculum_map').select('*').order('display_order',{ascending:true}).order('learning_area',{ascending:true});
    if(error)throw error;
    applyCurriculumMapRows(Array.isArray(data)?data:[]);
    await loadCurriculumYoutubeLinksFromSupabase();
    const repairedYoutubeLinks=reconcileYoutubeLinksWithCurriculumMap();
    if(repairedYoutubeLinks&&!await saveCurriculumYoutubeLinksToSupabase())console.warn('Could not persist repaired curriculum YouTube link paths.');
    await loadCurriculumAuthorsFromSupabase();
    if(typeof renderCurriculumManager==='function')renderCurriculumManager();
    if(typeof renderCurriculumYoutubeLinks==='function')renderCurriculumYoutubeLinks();
    if(typeof renderBank==='function')renderBank();
    if(typeof renderAddQList==='function')renderAddQList();
    if(typeof setCurriculumSaveStatus==='function')setCurriculumSaveStatus('saved');
    saveCurriculumCache();
    saveState();
    return true;
  }catch(e){console.warn('Could not load curriculum map from Supabase:',e);if(typeof setCurriculumSaveStatus==='function')setCurriculumSaveStatus('error');return false;}
}
function curriculumYoutubeRow(link){
  const item=normalizeYoutubeLink(link);
  return{id:item.id||undefined,curriculum_skill_id:item.curriculumSkillId||undefined,learning_area:item.learningArea,topic:item.topic,subtopic:item.subtopic,skill:item.skill,title:item.title,url:item.url,sort_order:Number(item.sortOrder)||0};
}
async function loadCurriculumYoutubeLinksFromSupabase(){
  if(!supabaseClient)return false;
  try{
    let result=await supabaseClient.from('youtube_links').select('*').order('learning_area',{ascending:true}).order('topic',{ascending:true}).order('subtopic',{ascending:true}).order('skill',{ascending:true}).order('sort_order',{ascending:true});
    if(result.error&&/(learning_area|sort_order|column)/i.test(String(result.error.message||''))){
      result=await supabaseClient.from('youtube_links').select('*').order('topic',{ascending:true}).order('subtopic',{ascending:true}).order('skill',{ascending:true});
    }
    const {data,error}=result;
    if(error){console.warn('Could not load curriculum YouTube links:',error);return false;}
    youtubeLinks=Array.isArray(data)?data.map(normalizeYoutubeLink).filter(link=>link.title&&link.url&&link.active!==false):[];
    return true;
  }catch(e){console.warn('Could not load curriculum YouTube links:',e);return false;}
}
async function loadCurriculumAuthorsFromSupabase(){
  if(!supabaseClient)return false;
  try{
    const {data,error}=await supabaseClient.from('curriculum_authors').select('name').order('name');
    if(error)throw error;
    customAuthors=[...new Set((data||[]).map(row=>normalizeAuthorName(row.name)).filter(Boolean))];
    deletedAuthors=[];
    if(typeof syncAuthorDropdowns==='function')syncAuthorDropdowns();
    return true;
  }catch(e){console.warn('Could not load curriculum authors:',e);return false;}
}
async function saveCurriculumYoutubeLinksToSupabase(){
  if(!supabaseClient)return false;
  try{
    if(youtubeLinkDeletedIds.length){
      const {error}=await supabaseClient.from('youtube_links').delete().in('id',youtubeLinkDeletedIds);
      if(error)throw error;
      youtubeLinkDeletedIds=[];
    }
    const rows=(Array.isArray(youtubeLinks)?youtubeLinks:[]).map(normalizeYoutubeLink).filter(link=>link.title&&link.url&&link.skill);
    const existing=rows.filter(row=>row.id).map(curriculumYoutubeRow);
    const fresh=rows.filter(row=>!row.id).map(row=>{const out=curriculumYoutubeRow(row);delete out.id;return out;});
    if(existing.length){
      const {error}=await supabaseClient.from('youtube_links').upsert(existing).select();
      if(error)throw error;
    }
    if(fresh.length){
      const {data,error}=await supabaseClient.from('youtube_links').insert(fresh).select();
      if(error)throw error;
      (data||[]).forEach(row=>{
        const area=normalizeLearningAreaName(row.learning_area);
        const link=youtubeLinks.find(item=>!item.id&&normalizeLearningAreaName(item.learningArea)===area&&item.topic===row.topic&&item.subtopic===row.subtopic&&item.skill===row.skill&&item.title===row.title&&item.url===row.url);
        if(link)link.id=row.id;
      });
    }
    return true;
  }catch(e){console.warn('Could not save curriculum YouTube links:',e);return false;}
}
async function saveCurriculumToSupabase(silent=false){
  ensureCurriculumProgressionOrders();
  if(!supabaseClient){if(!silent)showToast('Curriculum could not be saved because Supabase is not connected.',true);return false;}
  try{
    const rows=curriculumMapRows();
    const currentAreas=rows.map(row=>row.learning_area);
    const {data:stored,error:readError}=await supabaseClient.from('curriculum_map').select('learning_area');
    if(readError)throw readError;
    const stale=(stored||[]).map(row=>normalizeLearningAreaName(row.learning_area)).filter(area=>!currentAreas.includes(area));
    if(stale.length){
      const {error:deleteError}=await supabaseClient.from('curriculum_map').delete().in('learning_area',stale);
      if(deleteError)throw deleteError;
    }
    if(rows.length){
      const {error:mapError}=await supabaseClient.from('curriculum_map').upsert(rows,{onConflict:'learning_area'}).select('learning_area');
      if(mapError)throw mapError;
    }
    curriculumDeletedIds=[];
    const youtubeSaved=await saveCurriculumYoutubeLinksToSupabase();
    if(!youtubeSaved)throw new Error('Curriculum hierarchy saved, but its YouTube links could not be updated.');
    try{const {error:authorDeleteError}=await supabaseClient.from('curriculum_authors').delete().neq('name','');if(authorDeleteError)throw authorDeleteError;if(customAuthors.length){const {error:authorError}=await supabaseClient.from('curriculum_authors').insert(customAuthors.map(name=>({name})));if(authorError)throw authorError;}}catch(authorSaveError){console.warn('Could not save curriculum authors:',authorSaveError);}
    saveCurriculumCache();
    saveState();
    if(!silent)showToast('Curriculum map saved');
    return true;
  }catch(e){console.error('Curriculum map save failed:',e);showToast(e?.message||'Curriculum map could not be saved. Check the Supabase curriculum_map table and policies.',true);return false;}
}
function splitYearRange(q){const years=normalizeYearLevels(q.yearLevels||q.yearLevel||q.yearFrom||q.year||'7');return{from:years[0],to:years[years.length-1],years};}
function formatYearRange(q){return splitYearRange(q).years.join(', ');}
function optionList(values,selected){return values.map(v=>`<option${v===selected?' selected':''}>${esc(v)}</option>`).join('');}
function syncYearLevel(){const from=document.getElementById('f-year-from'),to=document.getElementById('f-year-to');if(from&&to)to.value=from.value;}
function dataForMainArea(area,curriculum){
  const activeArea=normalizeLearningAreaName(area||(typeof activeCurriculumLearningArea==='function'?activeCurriculumLearningArea():''));
  const years=typeof curriculumYearLevelValues==='function'?curriculumYearLevelValues(activeArea):[];
  const topics=typeof curriculumTopics==='function'?curriculumTopics(activeArea):[];
  const out={};
  years.forEach(year=>{
    out[year]={};
    topics.forEach(topic=>{
      const subtopics=typeof curriculumSubtopics==='function'?curriculumSubtopics(topic,activeArea):[];
      out[year][topic]=subtopics;
    });
  });
  return out;
}
function curriculumOptionsForArea(area){
  return typeof curriculumLearningAreas==='function'?curriculumLearningAreas():[];
}
function setupCurriculumHierarchy(selected={}){
  if(typeof syncCreatorSubjectOptions==='function')syncCreatorSubjectOptions(selected.subjects||selected.subject||(typeof currentExamSubject==='function'?currentExamSubject():''));
  if(typeof syncCreatorYearLevelOptions==='function')syncCreatorYearLevelOptions(selected.yearLevels||selected.yearLevel||selected.yearFrom||['7']);
  if(typeof syncCreatorMultiOptions==='function'){
    syncCreatorMultiOptions('topics',selected.topics||selected.topic||selected.strand||'');
    syncCreatorMultiOptions('subtopics',selected.subtopics||selected.subtopic||'');
    syncCreatorMultiOptions('skills',selected.skills||'');
  }
  const areaSel=document.getElementById('f-main-area'),curriculumSel=document.getElementById('f-curriculum'),yearSel=document.getElementById('f-year-from'),yearTo=document.getElementById('f-year-to'),strandSel=document.getElementById('f-strand'),subtopicSel=document.getElementById('f-subtopic'),diffSel=document.getElementById('f-difficulty');
  if(!yearSel||!strandSel||!subtopicSel)return;
  const mainArea=normalizeLearningAreaName(selected.mainArea||areaSel?.value||(typeof activeCurriculumLearningArea==='function'?activeCurriculumLearningArea():''));
  if(areaSel)areaSel.value=mainArea;
  const curriculumChoices=curriculumOptionsForArea(mainArea);
  const curriculum=curriculumChoices.includes(selected.curriculum)?selected.curriculum:(curriculumChoices.includes(curriculumSel?.value)?curriculumSel.value:curriculumChoices[0]);
  if(curriculumSel)curriculumSel.innerHTML=optionList(curriculumChoices,curriculum);
  const data=dataForMainArea(mainArea,curriculum),levels=Object.keys(data).filter(y=>data[y]);
  const year=data[selected.yearFrom]?selected.yearFrom:levels[0];
  yearSel.innerHTML=optionList(levels,year);
  if(yearTo){yearTo.innerHTML=optionList(levels,year);yearTo.value=year;}
  const strands=Object.keys(data[year]||{}),strand=strands.includes(selected.strand)?selected.strand:strands[0];
  strandSel.innerHTML=optionList(strands,strand);
  const subtopics=(data[year]&&data[year][strand])||[],subtopic=subtopics.includes(selected.subtopic)?selected.subtopic:subtopics[0]||'';
  subtopicSel.innerHTML=optionList(subtopics,subtopic);
  if(diffSel)diffSel.innerHTML=optionList(DIFFICULTY_LEVELS,DIFFICULTY_LEVELS.includes(selected.difficulty)?selected.difficulty:'Medium');
}
function updateMainArea(){setupCurriculumHierarchy({mainArea:document.getElementById('f-main-area')?.value||'',difficulty:document.getElementById('f-difficulty')?.value||'Medium'});syncYearLevel();}
function updateCurriculumHierarchy(){const mainArea=document.getElementById('f-main-area')?.value||(typeof activeCurriculumLearningArea==='function'?activeCurriculumLearningArea():''),curriculum=document.getElementById('f-curriculum')?.value||mainArea,year=document.getElementById('f-year-from')?.value||'',strand=document.getElementById('f-strand')?.value||'',subtopic=document.getElementById('f-subtopic')?.value||'',difficulty=document.getElementById('f-difficulty')?.value||'Medium';setupCurriculumHierarchy({mainArea,curriculum,yearFrom:year,strand,subtopic,difficulty});syncYearLevel();}function updateStats(){const stat=document.querySelector('.sidebar-stat');if(!stat)return;stat.innerHTML=availableQuestionBanks(true).map(b=>`<div class="sidebar-stat-row"><span>${esc(b.name)}${b.enabled?'':' (Off)'}</span><span>${questions.filter(q=>(q.bank||'private')===b.id).length}</span></div>`).join('');}

function syncBankSelectOptions(id,selected){const el=document.getElementById(id);if(!el)return;const current=selected||el.value||'private',banks=availableQuestionBanks(true);el.innerHTML=banks.map(b=>`<option value="${esc(b.id)}">${esc(b.name)}${b.enabled?'':' (Off)'}</option>`).join('');el.value=banks.some(bank=>bank.id===current)?current:(banks[0]?.id||'');}
