// Live Quiz: first version for filtered continuous multiple-choice practice.
(function(){
  const SESSION_KEY='quero_live_quiz_sessions_v1';
  const ANSWER_KEY='quero_live_quiz_answers_v1';
  const LIVE_QUIZ_DIAGRAM_IMAGE_SCALE=0.38;
const liveQuizState={session:null,participant:null,currentQuestion:null,optionOrder:[],selected:null,checked:false,answeredIds:[],studentScore:0,lastFeedback:'',questionMetadata:[],sessionQuestions:[],sessionQuestionsLoadedFor:'',teacherAnswers:[],studentAnswers:[],teacherParticipants:[],participantProfiles:{},powerUpEvents:[],tugState:null,tugCelebrationSessionId:'',tugCelebrationUntil:0,tugCelebrationTimer:null,podiumEntries:[],podiumLoadedFor:'',loadingPodium:false,loadingAnswers:false,loadingParticipants:false,loadingPowerUpEvents:false,powerUpEventsUnavailable:false,tugStateUnavailable:false,questionsLoading:false,questionLoadError:'',questionLoadRequest:0,pollTimer:null,timerInterval:null,teacherTimerInterval:null,setupStep:'filters',draftFilters:null,gameMode:'classic',tugCorrectAnswers:3,tugWinningScore:10,tugSelectedParticipantIds:[],joinCodeDraft:'',joinError:'',joining:false,creatingQuiz:false,correctStreak:0,cardQuestPending:false,cardQuestCards:[],cardQuestSelected:null,cardQuestRevealed:false,cardQuestAnimate:false,cardQuestApplying:false,cardQuestApplied:false,cardQuestMessage:'',cardQuestTargetTimer:null,cardQuestTargetOpen:false,cardQuestTargetLoading:false,finalResultsView:'podium',teacherStatsTab:'questions',selectedStatsParticipantId:'',reviewQuestionId:'',reviewParticipantId:''};
  const CARD_QUEST_POWERUPS=[
    {id:'double',label:'Double Score',icon:'x'},
    {id:'increase-10',label:'10% Increase',icon:'trending-up'},
    {id:'increase-20',label:'20% Increase',icon:'trending-up'},
    {id:'increase-30',label:'30% Increase',icon:'trending-up'},
    {id:'increase-40',label:'40% Increase',icon:'trending-up'},
    {id:'steal-100',label:'100% Steal',icon:'switch-horizontal'},
    {id:'steal-50',label:'50% Steal',icon:'switch-horizontal'},
    {id:'steal-20',label:'20% Steal',icon:'switch-horizontal'},
    {id:'steal-10',label:'10% Steal',icon:'switch-horizontal'},
    {id:'half',label:'Half',icon:'divide'},
    {id:'plus-2',label:'Plus 2',icon:'plus'},
    {id:'plus-5',label:'Plus 5',icon:'plus'},
    {id:'plus-10',label:'Plus 10',icon:'plus'},
    {id:'minus-2',label:'Minus 2',icon:'minus'},
    {id:'minus-5',label:'Minus 5',icon:'minus'},
    {id:'minus-10',label:'Minus 10',icon:'minus'}
  ];
  function cardQuestPowerUpSymbol(id){
    if(id==='double')return '\u00d72';
    if(id==='half')return '\u00f72';
    if(id.startsWith('increase-'))return `+${id.split('-')[1]}%`;
    if(id.startsWith('steal-'))return `${id.split('-')[1]}%`;
    if(id.startsWith('plus-'))return `+${id.split('-')[1]}`;
    if(id.startsWith('minus-'))return `-${id.split('-')[1]}`;
    return '?';
  }
  function cardQuestPowerUpDescription(id){
    if(id==='double')return 'Double your current score.';
    if(id==='half')return 'Halve your current score.';
    if(id.startsWith('increase-'))return `Increase your score by ${id.split('-')[1]}%.`;
    if(id.startsWith('steal-'))return `Steal ${id.split('-')[1]}% of another student's score.`;
    if(id.startsWith('plus-'))return `Add ${id.split('-')[1]} points to your score.`;
    if(id.startsWith('minus-'))return `Remove ${id.split('-')[1]} points from your score.`;
    return 'Apply this power-up to your score.';
  }

  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function dataArray(value,field=''){
    if(typeof splitCreatorMultiValue==='function')return splitCreatorMultiValue(value,field);
    if(Array.isArray(value))return [...new Set(value.map(v=>String(v).trim()).filter(Boolean))];
    const text=String(value||'').trim();
    if(!text)return [];
    const splitter=field==='skills'?/[;\n]+/:/[;,\n]+/;
    return [...new Set(text.split(splitter).map(v=>v.trim()).filter(Boolean))];
  }
  function globalQuestions(){try{return Array.isArray(questions)?questions.map(q=>typeof normalizeQuestion==='function'?normalizeQuestion(q):q):[];}catch(e){return Array.isArray(window.questions)?window.questions:[];}}
  function allQs(){
    if(liveQuizState.session&&liveQuizState.sessionQuestions.length)return liveQuizState.sessionQuestions;
    if(!liveQuizState.session&&liveQuizState.questionMetadata.length)return liveQuizState.questionMetadata;
    return globalQuestions();
  }
  function qid(q){return String(q?.supabaseId||q?.id||'');}
  function liveQuizMetadataFromRow(row){return {supabaseId:row.id,id:row.old_id||row.id,type:row.type||'',template:row.template||'',subject:row.subject||'',subjects:row.subject||'',topic:row.topics||'',topics:row.topics||'',subtopic:row.subtopics||'',subtopics:row.subtopics||'',skills:row.skills||'',yearLevels:Array.isArray(row.year_levels)?row.year_levels:[],yearLevel:Array.isArray(row.year_levels)?row.year_levels:[],difficulty:row.difficulty||'',calculator:row.calculator||'',bank:row.bank||'private'};}
  function liveQuizQuestionFromRow(row){
    const question={...(row.data||{}),supabaseId:row.id};
    return typeof safeNormalizeQuestion==='function'?safeNormalizeQuestion(question):typeof normalizeQuestion==='function'?normalizeQuestion(question):question;
  }
  function profileName(){
    const email=String(currentUser?.email||'').trim().toLowerCase();
    const member=typeof schoolAccounts!=='undefined'&&Array.isArray(schoolAccounts)
      ?schoolAccounts.find(account=>(currentUser?.id&&String(account.userId||account.user_id||'')===String(currentUser.id))||(email&&String(account.email||'').trim().toLowerCase()===email))
      :null;
    let cached={};
    try{cached=JSON.parse(localStorage.getItem('queroProfileCache')||'{}')||{};}catch(e){}
    const cachedName=email&&String(cached.email||'').trim().toLowerCase()===email?cached.displayName:'';
    return String(member?.displayName||member?.display_name||cachedName||currentUser?.user_metadata?.display_name||currentUser?.user_metadata?.full_name||currentUser?.user_metadata?.username||currentUser?.email?.split('@')[0]||'User').trim();
  }
  function currentLiveQuizProfile(){
    let cached={};
    try{cached=JSON.parse(localStorage.getItem('queroProfileCache')||'{}')||{};}catch(e){}
    const profile=typeof currentProfile!=='undefined'&&currentProfile?currentProfile:{};
    const imagePath=profile.avatar_image_path??cached.avatarImagePath??'';
    let imageUrl='';
    if(imagePath&&typeof supabaseClient!=='undefined'&&supabaseClient?.storage)imageUrl=supabaseClient.storage.from('profile-avatars').getPublicUrl(imagePath).data?.publicUrl||'';
    return {id:currentUser?.id||'',display_name:profile.display_name||cached.displayName||profileName(),avatar_color:profile.avatar_color||cached.avatarColor||localStorage.getItem('queroProfileColor')||'#0b7ea4',avatar_icon:profile.avatar_icon||cached.avatarIcon||'initials',avatar_image_path:imagePath,imageUrl};
  }
  async function resolvedCurrentLiveQuizProfile(){
    const fallback=currentLiveQuizProfile();
    if(!currentUser?.id||typeof supabaseClient==='undefined'||!supabaseClient)return fallback;
    try{
      const {data,error}=await supabaseClient.from('profiles').select('id,display_name,avatar_color,avatar_icon,avatar_image_path').eq('id',currentUser.id).maybeSingle();
      if(error||!data)return fallback;
      let imageUrl='';
      if(data.avatar_image_path)imageUrl=supabaseClient.storage.from('profile-avatars').getPublicUrl(data.avatar_image_path).data?.publicUrl||'';
      return {...fallback,...data,imageUrl};
    }catch(e){console.warn('Could not load Live Quiz profile:',e);return fallback;}
  }
  function isStudent(){return currentRole==='student'||currentRole==='s_student'||(typeof isProtectedStudentRole==='function'&&isProtectedStudentRole());}
  function localSessions(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'[]');}catch(e){return [];}}
  function saveLocalSession(session){const list=localSessions().filter(s=>String(s.id)!==String(session.id)&&String(s.joinCode)!==String(session.joinCode));list.unshift(session);localStorage.setItem(SESSION_KEY,JSON.stringify(list.slice(0,40)));}
  function localAnswers(){try{return JSON.parse(localStorage.getItem(ANSWER_KEY)||'[]');}catch(e){return [];}}
  function saveLocalAnswer(answer){const list=localAnswers();list.unshift(answer);localStorage.setItem(ANSWER_KEY,JSON.stringify(list.slice(0,500)));}
  function currentGameMode(){return liveQuizState.session?.gameMode||liveQuizState.session?.filters?.gameMode||liveQuizState.gameMode||'classic';}
  function usesClassicQuestionFlow(){return ['classic','card-quest','tug-of-brain','team'].includes(currentGameMode());}
  function drawCardQuestCards(){return shuffle(CARD_QUEST_POWERUPS).slice(0,3).map(card=>({...card}));}
  function cardQuestStorageKey(){return `quero_card_quest_${liveQuizState.session?.id||''}_${liveQuizState.participant?.id||''}`;}
  function saveLocalCardQuest(){
    if(!liveQuizState.session||!liveQuizState.participant)return;
    localStorage.setItem(cardQuestStorageKey(),JSON.stringify({correctStreak:liveQuizState.correctStreak,pending:liveQuizState.cardQuestPending,cards:liveQuizState.cardQuestCards}));
  }
  function restoreLocalCardQuest(){
    try{
      const saved=JSON.parse(localStorage.getItem(cardQuestStorageKey())||'null');
      if(!saved)return;
      liveQuizState.correctStreak=Number(saved.correctStreak)||0;
      liveQuizState.cardQuestPending=Boolean(saved.pending);
      liveQuizState.cardQuestCards=Array.isArray(saved.cards)?saved.cards:[];
    }catch(e){}
  }
  function resetCardQuestTargetDialog(){
    if(liveQuizState.cardQuestTargetTimer)clearTimeout(liveQuizState.cardQuestTargetTimer);
    liveQuizState.cardQuestTargetTimer=null;
    liveQuizState.cardQuestTargetOpen=false;
    liveQuizState.cardQuestTargetLoading=false;
  }
  function resetCardQuestReveal(){resetCardQuestTargetDialog();liveQuizState.cardQuestSelected=null;liveQuizState.cardQuestRevealed=false;liveQuizState.cardQuestAnimate=false;liveQuizState.cardQuestApplying=false;liveQuizState.cardQuestApplied=false;liveQuizState.cardQuestMessage='';}
  function newCode(){return String(Math.floor(100000+Math.random()*900000));}
  function val(id){return document.getElementById(id)?.value||'';}
  function selectedMulti(field){return [...document.querySelectorAll(`#lq-${field}-picker input[type="checkbox"]:checked:not([data-all])`)].map(input=>input.value);}
  function collectFilters(){return{questionType:val('lq-type'),subject:val('lq-subject'),yearLevel:val('lq-year'),topic:selectedMulti('topic'),subtopic:selectedMulti('subtopic'),skills:selectedMulti('skills'),difficulty:val('lq-difficulty'),calculator:'Non-Calculator',quizTimeMinutes:Math.min(180,Math.max(1,parseInt(val('lq-time'),10)||10))};}
  function matchField(q,key,value){
    if(Array.isArray(value))return !value.length||value.some(item=>matchField(q,key,item));
    if(!value)return true;
    if(key==='topic'||key==='subtopic'||key==='skills'){
      const raw=key==='topic'?(q.topics||q.topic):key==='subtopic'?(q.subtopics||q.subtopic):q.skills;
      const items=key==='skills'&&typeof splitCreatorMultiValue==='function'?splitCreatorMultiValue(raw,'skills'):dataArray(raw,key);
      return items.includes(String(value));
    }
    if(typeof bankFieldMatches==='function')return bankFieldMatches(q,key,value);
    const raw=key==='subject'?(q.subject||q.subjects||q.mainArea):key==='topic'?(q.topic||q.topics):key==='subtopic'?(q.subtopic||q.subtopics):key==='year'?(q.yearLevels||q.yearLevel||q.yearFrom||q.year):q[key];
    if(key==='skills')return dataArray(raw,'skills').includes(value);
    if(Array.isArray(raw))return raw.map(String).includes(String(value));
    return String(raw||'')===String(value);
  }
  function eligibleQuestions(){
    return allQs().filter(q=>{
      if(q.type==='mc'&&q.template==='multiple')return false;
      return ['mc','tf'].includes(q.type)&&matchField(q,'calculator','Non-Calculator');
    });
  }
  function questionPool(filters){
    return eligibleQuestions().filter(q=>{
      if(filters.questionType&&q.type!==filters.questionType)return false;
      return matchField(q,'subject',filters.subject)&&matchField(q,'topic',filters.topic)&&matchField(q,'subtopic',filters.subtopic)&&matchField(q,'skills',filters.skills)&&matchField(q,'difficulty',filters.difficulty)&&matchField(q,'year',filters.yearLevel);
    });
  }
  function values(items,key){
    try{if(typeof bankUniqueValues==='function')return bankUniqueValues(items,key);}catch(e){}
    const vals=[];
    items.forEach(q=>{
      const raw=key==='subject'?(q.subject||q.subjects||q.mainArea):key==='topic'?(q.topic||q.topics):key==='subtopic'?(q.subtopic||q.subtopics):key==='year'?(q.yearLevels||q.yearLevel||q.yearFrom||q.year):q[key];
      (key==='skills'?dataArray(raw,'skills'):(Array.isArray(raw)?raw:[raw])).forEach(v=>{if(String(v||'').trim())vals.push(String(v).trim());});
    });
    return [...new Set(vals)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
  }
  function prioritizeHomeClassroomSubjects(items){
    const remaining=[...items],preferred=[];
    let subjects=[];
    try{subjects=window.getHomeClassroomSubjects?.()||[];}catch(e){}
    subjects.forEach(subject=>{
      const key=String(subject||'').trim().toLowerCase();
      const index=remaining.findIndex(value=>String(value).trim().toLowerCase()===key);
      if(index>=0)preferred.push(remaining.splice(index,1)[0]);
    });
    return preferred.concat(remaining);
  }
  function selectOptions(id,label,items,current=''){
    const choices=[{value:'',label:'Any'},...items.map(item=>typeof item==='object'?item:{value:item,label:item})];
    const selected=choices.find(item=>String(item.value)===String(current))||choices[0];
    return `<div class="live-quiz-filter-field"><span>${label}</span><input type="hidden" id="${id}" value="${esc(selected.value)}"><details class="live-quiz-multiselect" id="${id}-picker"><summary title="${esc(selected.label)}">${esc(selected.label)}</summary><div class="live-quiz-multi-menu">${choices.map(item=>`<button type="button" class="live-quiz-single-option${String(item.value)===String(selected.value)?' selected':''}" data-value="${esc(item.value)}" aria-pressed="${String(item.value)===String(selected.value)}" onclick="chooseLiveQuizSingle('${id}',this)">${esc(item.label)}</button>`).join('')}</div></details></div>`;
  }
  window.chooseLiveQuizSingle=function(id,option){
    const picker=document.getElementById(`${id}-picker`),input=document.getElementById(id);
    if(!picker||!input)return;
    input.value=option.dataset.value;
    const label=option.textContent.trim(),summary=picker.querySelector('summary');
    summary.textContent=label;
    summary.title=label;
    picker.querySelectorAll('.live-quiz-single-option').forEach(item=>{
      const selected=item===option;
      item.classList.toggle('selected',selected);
      item.setAttribute('aria-pressed',String(selected));
    });
    picker.open=false;
    if(id==='lq-subject')window.updateLiveQuizHierarchy('subject');
  };
  function hierarchyOptions(field,subject,topics=[],subtopics=[]){
    if(!subject||(field!=='topic'&&!topics.length)||(field==='skills'&&!subtopics.length))return [];
    const rows=eligibleQuestions().filter(q=>matchField(q,'subject',subject)
      &&(field==='topic'||matchField(q,'topic',topics))
      &&(field!=='skills'||matchField(q,'subtopic',subtopics)));
    const options=rows.flatMap(q=>{
      const raw=field==='topic'?(q.topics||q.topic):field==='subtopic'?(q.subtopics||q.subtopic):q.skills;
      return field==='skills'&&typeof splitCreatorMultiValue==='function'?splitCreatorMultiValue(raw,'skills'):dataArray(raw,field);
    });
    return [...new Set(options)].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
  }
  function multiOptionsHtml(field,options,selected){
    if(!options.length)return '<div class="live-quiz-multi-empty">No options available yet</div>';
    const allLabel=field==='topic'?'All topics':field==='subtopic'?'All subtopics':'All skills';
    const allSelected=options.every(value=>selected.includes(value));
    return `<label class="live-quiz-multi-option live-quiz-multi-all"><input type="checkbox" data-all${allSelected?' checked':''} onchange="toggleLiveQuizAll('${field}',this)"><span>${allLabel}</span></label>${options.map(value=>`<label class="live-quiz-multi-option"><input type="checkbox" value="${esc(value)}"${selected.includes(value)?' checked':''} onchange="updateLiveQuizHierarchy('${field}')"><span>${esc(value)}</span></label>`).join('')}`;
  }
  function multiSummary(field,selected){return selected.length===1?selected[0]:selected.length?`${selected.length} selected`:`Select ${field==='skills'?'skills':field+'s'}`;}
  function multiPicker(field,label,options,selected=[]){
    return `<div class="live-quiz-filter-field"><span>${label}</span><details class="live-quiz-multiselect" id="lq-${field}-picker"><summary title="${esc(selected.join(', '))}">${esc(multiSummary(field,selected))}</summary><div class="live-quiz-multi-menu">${multiOptionsHtml(field,options,selected)}</div></details></div>`;
  }
  function syncMultiPicker(field,options,selected){
    const picker=document.getElementById(`lq-${field}-picker`);
    if(!picker)return;
    picker.querySelector('summary').textContent=multiSummary(field,selected);
    picker.querySelector('summary').title=selected.join(', ');
    picker.querySelector('.live-quiz-multi-menu').innerHTML=multiOptionsHtml(field,options,selected);
  }
  window.toggleLiveQuizAll=function(field,checkbox){
    const picker=document.getElementById(`lq-${field}-picker`);
    if(!picker)return;
    picker.querySelectorAll('input[type="checkbox"]:not([data-all])').forEach(input=>{input.checked=checkbox.checked;});
    window.updateLiveQuizHierarchy(field);
  };
  window.updateLiveQuizHierarchy=function(changed){
    const subject=val('lq-subject');
    const topicOptions=hierarchyOptions('topic',subject);
    const topics=(changed==='subject'?[]:selectedMulti('topic')).filter(value=>topicOptions.includes(value));
    syncMultiPicker('topic',topicOptions,topics);
    const subtopicOptions=hierarchyOptions('subtopic',subject,topics);
    const subtopics=(changed==='subject'?[]:selectedMulti('subtopic')).filter(value=>subtopicOptions.includes(value));
    syncMultiPicker('subtopic',subtopicOptions,subtopics);
    const skillOptions=hierarchyOptions('skills',subject,topics,subtopics);
    const skills=(changed==='subject'?[]:selectedMulti('skills')).filter(value=>skillOptions.includes(value));
    syncMultiPicker('skills',skillOptions,skills);
  }
  function renderFilters(filters={}){
    const qs=eligibleQuestions();
    const topics=dataArray(filters.topic,'topic');
    const subtopics=dataArray(filters.subtopic,'subtopic');
    const skills=dataArray(filters.skills,'skills');
    return `<div class="live-quiz-grid">
      ${selectOptions('lq-type','Question Type',[{value:'mc',label:'Multiple Choice Question'},{value:'tf',label:'True or False'}],filters.questionType)}
      ${selectOptions('lq-subject','Subject',prioritizeHomeClassroomSubjects(values(qs,'subject')),filters.subject)}
      ${selectOptions('lq-year','Year Level',[...values(qs,'year')].reverse(),filters.yearLevel)}
      ${multiPicker('topic','Topic',hierarchyOptions('topic',filters.subject),topics)}
      ${multiPicker('subtopic','Subtopic',hierarchyOptions('subtopic',filters.subject,topics),subtopics)}
      ${multiPicker('skills','Skills',hierarchyOptions('skills',filters.subject,topics,subtopics),skills)}
      ${selectOptions('lq-difficulty','Difficulty',values(qs,'difficulty'),filters.difficulty)}
      <label>Quiz Time (minutes)<input id="lq-time" type="number" min="1" max="180" value="${esc(filters.quizTimeMinutes||10)}"></label>
    </div>`;
  }
  function liveQuizRoot(){
    const screen=document.getElementById('live-quiz-screen');
    if(screen?.classList.contains('open'))return screen.querySelector('[data-live-quiz-root]');
    return document.getElementById('live-quiz-root');
  }
  function renderLiveQuiz(){
    const root=liveQuizRoot();
    if(!root)return;
    const teacherCode=!isStudent()&&liveQuizState.session?`<div class="live-quiz-header-code"><span>Quiz Code</span><strong>${esc(liveQuizState.session.joinCode)}</strong></div>`:'';
    const studentLeave=isStudent()&&liveQuizState.participant?'<button type="button" class="live-quiz-leave" onclick="leaveLiveQuizSession()"><i class="ti ti-logout"></i>Leave</button>':'';
    const headerEnd=teacherCode||studentLeave;
    const centerStatus=isStudent()&&liveQuizState.participant&&liveQuizState.session?.status==='active'?`<div class="live-quiz-header-score"><span>Score</span><strong>${liveQuizState.studentScore}</strong></div>`:!isStudent()&&liveQuizState.session?.status==='active'?`<div class="live-quiz-header-active"><strong><i class="ti ti-clock"></i><span id="lq-teacher-time">${teacherTimeRemainingText()}</span></strong></div>`:'';
    const studentActive=isStudent()&&liveQuizState.participant&&liveQuizState.session?.status==='active';
    const targetFocus=document.activeElement?.closest('.card-quest-target-player')?.dataset.targetId;
    const targetScroll=root.querySelector('.card-quest-target-grid')?.scrollTop||0;
    const content=isStudent()?studentScreen():teacherScreen();
    const targetDialog=isStudent()&&liveQuizState.session?.status==='active'&&timeRemainingMs()>0?cardQuestTargetDialog():'';
root.innerHTML=`<header class="live-quiz-brandbar"${targetDialog?' inert aria-hidden="true"':''}><div class="live-quiz-brand"><img src="assets/images/app-logo.png" alt=""><span>Quero Learning Tools</span></div>${centerStatus}${headerEnd}</header><div class="live-quiz-content${!isStudent()&&liveQuizState.session?' live-quiz-lobby-content':''}${studentActive?' live-quiz-student-active':''}"${targetDialog?' inert aria-hidden="true"':''}>${content}</div>${targetDialog}`;
    if(liveQuizState.cardQuestTargetOpen){
      const players=[...root.querySelectorAll('.card-quest-target-player')];
      const focus=players.find(button=>button.dataset.targetId===targetFocus)||root.querySelector('.card-quest-target-dialog');
      focus?.focus({preventScroll:true});
      const grid=root.querySelector('.card-quest-target-grid');
      if(grid)grid.scrollTop=targetScroll;
    }
    root.querySelectorAll('.live-quiz-multiselect').forEach(picker=>picker.addEventListener('toggle',()=>{
      if(picker.open)closeLiveQuizMenus(picker);
    }));
    startTeacherHeaderTimer();
    setTimeout(()=>{
      if(typeof renderAllTextBoxKatex==='function')renderAllTextBoxKatex(root);
      applyLiveQuizImageScale(root);
    },0);
  }
  function applyLiveQuizImageScale(root){
    root?.querySelectorAll?.('.live-quiz-question-card img.q-diagram,.live-quiz-option img,.live-quiz-review-dialog img.q-diagram,.live-quiz-review-option img').forEach(img=>{
      const apply=()=>{
        if(!img.naturalWidth)return;
        img.style.width=`${Math.max(1,Math.round(img.naturalWidth*LIVE_QUIZ_DIAGRAM_IMAGE_SCALE))}px`;
        img.style.height='auto';
        img.style.maxWidth='100%';
      };
      if(img.complete)apply();
      else img.addEventListener('load',apply,{once:true});
    });
  }
  function updateClassicLiveQuizAnswerUi(correct){
    const root=liveQuizRoot(),content=root?.querySelector('.live-quiz-content'),panel=root?.querySelector('.live-quiz-student-panel'),card=root?.querySelector('.live-quiz-question-card.live-quiz-classic-layout');
    if(!root||!content||!panel||!card)return false;
    let selectedButton=null;
    card.querySelectorAll('.live-quiz-option').forEach(button=>{
      button.classList.remove('selected','correct','wrong');
      button.querySelector('.live-quiz-option-feedback')?.remove();
      if(Number(button.dataset.optionIndex)===Number(liveQuizState.selected))selectedButton=button;
      button.setAttribute('onclick',`selectLiveQuizOption(${button.dataset.optionIndex},event)`);
    });
    if(!selectedButton)return false;
    selectedButton.classList.add('selected',correct?'correct':'wrong');
    selectedButton.insertAdjacentHTML('beforeend',`<span class="live-quiz-option-feedback ${correct?'correct':'wrong'}"><i class="ti ${correct?'ti-check':'ti-x'}"></i></span>`);
    const score=root.querySelector('.live-quiz-header-score strong');
    if(score)score.textContent=String(liveQuizState.studentScore);
    const workspace=card.querySelector('.live-quiz-question-scroll');
    workspace.classList.add('ready-next');
    workspace.setAttribute('onclick','advanceClassicLiveQuiz(event)');
    if(!card.querySelector('.live-quiz-continue-hint')){
      const hint=document.createElement('div');
      hint.className='live-quiz-continue-hint';
      hint.innerHTML='<i class="ti ti-hand-click"></i>Press the question area to continue';
      card.querySelector('.live-quiz-question-scroll')?.appendChild(hint);
    }
    return true;
  }
  function closeLiveQuizMenus(except=null){
    liveQuizRoot()?.querySelectorAll('.live-quiz-multiselect[open]').forEach(picker=>{
      if(picker!==except)picker.open=false;
    });
  }
  function teacherScreen(){
    const session=liveQuizState.session;
    if(session)return teacherLobby(session);
    if(liveQuizState.questionsLoading)return teacherLoading();
    if(liveQuizState.questionLoadError)return teacherLoadError();
    return liveQuizState.setupStep==='mode'?teacherGameMode():teacherSetup();
  }
  function teacherLoading(){
    return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-loading-card" role="status" aria-live="polite"><span class="live-quiz-loading-spinner" aria-hidden="true"></span><h2>Preparing Live Quiz</h2><p>Loading available questions...</p><button type="button" onclick="closeLiveQuiz()">Cancel</button></section></div>`;
  }
  function teacherLoadError(){
    return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-loading-card" role="alert"><i class="ti ti-alert-circle live-quiz-load-icon" aria-hidden="true"></i><h2>Questions unavailable</h2><p>${esc(liveQuizState.questionLoadError)}</p><div class="live-quiz-form-actions"><button type="button" onclick="closeLiveQuiz()">Cancel</button><button type="button" class="primary" onclick="retryLiveQuizQuestions()">Retry</button></div></section></div>`;
  }
  async function loadLiveQuizQuestions(){
    const request=++liveQuizState.questionLoadRequest;
    let error='';
    try{
      if(typeof supabaseClient!=='undefined'&&supabaseClient){
        const rows=[];
        for(let from=0;;from+=1000){
          const {data,error:metadataError}=await supabaseClient.from('questions').select('id,old_id,bank,type,template,subject,topics,subtopics,skills,year_levels,difficulty,calculator').order('created_at',{ascending:false}).range(from,from+999);
          if(metadataError)throw metadataError;
          rows.push(...(data||[]));
          if(!data||data.length<1000)break;
        }
        liveQuizState.questionMetadata=rows.map(liveQuizMetadataFromRow);
      }
      if(!eligibleQuestions().length)error='No non-calculator multiple-choice or true/false questions are available yet.';
    }catch(err){
      console.warn('Could not prepare Live Quiz questions:',err);
      if(!eligibleQuestions().length)error='Could not load the question bank. Please try again.';
    }
    if(request!==liveQuizState.questionLoadRequest)return;
    liveQuizState.questionsLoading=false;
    liveQuizState.questionLoadError=error;
    if(document.getElementById('live-quiz-screen')?.classList.contains('open'))renderLiveQuiz();
  }
  async function loadLiveQuizSessionQuestions(session,force=false){
    if(!session)return [];
    if(!force&&String(liveQuizState.sessionQuestionsLoadedFor)===String(session.id)&&liveQuizState.sessionQuestions.length)return liveQuizState.sessionQuestions;
    let ids=Array.isArray(session.filters?.questionIds)?session.filters.questionIds.map(String).filter(Boolean).slice(0,100):[];
    try{
      if(supabaseClient&&!ids.length){
        const {data,error}=await supabaseClient.from('live_quiz_session_questions').select('question_id,position').eq('session_id',session.id).order('position',{ascending:true}).limit(100);
        if(error)throw error;
        ids=(data||[]).map(row=>String(row.question_id));
      }
      if(supabaseClient&&ids.length){
        const {data,error}=await supabaseClient.from('questions').select('*').in('id',ids);
        if(error)throw error;
        const byId=new Map((data||[]).map(row=>[String(row.id),liveQuizQuestionFromRow(row)]));
        liveQuizState.sessionQuestions=ids.map(id=>byId.get(String(id))).filter(Boolean);
      }
    }catch(e){console.warn('Could not load the saved Live Quiz question set:',e);}
    if(!liveQuizState.sessionQuestions.length){
      const fallback=globalQuestions().filter(question=>!ids.length||ids.includes(qid(question)));
      liveQuizState.sessionQuestions=(ids.length?fallback:shuffle(fallback.filter(question=>{
        const filters=session.filters||{};
        return (!filters.questionType||question.type===filters.questionType)&&matchField(question,'subject',filters.subject)&&matchField(question,'topic',filters.topic)&&matchField(question,'subtopic',filters.subtopic)&&matchField(question,'skills',filters.skills)&&matchField(question,'difficulty',filters.difficulty)&&matchField(question,'year',filters.yearLevel)&&matchField(question,'calculator','Non-Calculator');
      })).slice(0,100));
    }
    liveQuizState.sessionQuestionsLoadedFor=String(session.id);
    return liveQuizState.sessionQuestions;
  }
  async function saveLiveQuizSessionQuestions(session,questionsForSession){
    if(!supabaseClient||!session||!questionsForSession.length)return;
    const rows=questionsForSession.map((question,index)=>({session_id:session.id,question_id:qid(question),position:index+1})).filter(row=>row.question_id);
    if(!rows.length)return;
    const {error}=await supabaseClient.from('live_quiz_session_questions').insert(rows);
    if(error)throw error;
  }
  function teacherSetup(){
    const filters=liveQuizState.draftFilters||{quizTimeMinutes:10};
    return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-form-card live-quiz-setup-card"><h2>Create Live Quiz</h2>${renderFilters(filters)}<div class="live-quiz-form-actions"><button type="button" onclick="closeLiveQuiz()">Cancel</button><button type="button" class="primary" onclick="showLiveQuizGameMode()">Next <i class="ti ti-arrow-right"></i></button></div></section></div>`;
  }
  function gameModeLabel(mode){return mode==='tug-of-brain'||mode==='team'?'Tug of Brain':mode==='card-quest'?'Card Quest':'Classic';}
  function gameModeHeading(mode){return mode==='tug-of-brain'||mode==='team'?'Tug of Brain':mode==='card-quest'?'Card Quest':'Classic Mode';}
  function gameModeContext(filters){
    const details=[filters.subject,filters.questionType==='tf'?'True or False':filters.questionType==='mc'?'Multiple Choice':'Any question type'];
    const topicCount=dataArray(filters.topic,'topic').length;
    if(topicCount)details.push(`${topicCount} topic${topicCount===1?'':'s'} selected`);
    if(filters.questionCount)details.push(`${filters.questionCount} question${filters.questionCount===1?'':'s'}`);
    return details.filter(Boolean).join(' &middot; ');
  }
  function gameModeOption(mode,icon,title,description){
    const selected=liveQuizState.gameMode===mode;
    return `<label class="live-quiz-game-option${selected?' selected':''}"><input type="radio" name="lq-game-mode" value="${mode}"${selected?' checked':''} onchange="selectLiveQuizGameMode('${mode}',this)"><span class="live-quiz-game-icon"><i class="ti ti-${icon}"></i></span><span class="live-quiz-game-copy"><strong>${title}</strong><small>${description}</small></span></label>`;
  }
  function tugOfBrainModeOption(){
    const selected=liveQuizState.gameMode==='tug-of-brain';
    return `<div class="live-quiz-game-option tug-of-brain-option${selected?' selected':''}"><label><input type="radio" name="lq-game-mode" value="tug-of-brain"${selected?' checked':''} onchange="selectLiveQuizGameMode('tug-of-brain',this)"><span class="live-quiz-game-icon"><i class="ti ti-arrows-left-right"></i></span><span class="live-quiz-game-copy"><strong>Tug of Brain</strong><small>Build streaks to pull your team toward victory.</small></span></label>${selected?`<div class="tug-of-brain-settings"><div><span>Correct-answer streak</span><small>Answers needed for 1 team point</small></div><div class="tug-of-brain-stepper"><button type="button" onclick="adjustTugOfBrainSetting('streak',-1)" aria-label="Decrease correct-answer streak"><i class="ti ti-minus"></i></button><strong>${liveQuizState.tugCorrectAnswers}</strong><button type="button" onclick="adjustTugOfBrainSetting('streak',1)" aria-label="Increase correct-answer streak"><i class="ti ti-plus"></i></button></div><div><span>Winning lead</span><small>Net points needed to win</small></div><div class="tug-of-brain-stepper"><button type="button" onclick="adjustTugOfBrainSetting('score',-1)" aria-label="Decrease winning lead"><i class="ti ti-minus"></i></button><strong>${liveQuizState.tugWinningScore}</strong><button type="button" onclick="adjustTugOfBrainSetting('score',1)" aria-label="Increase winning lead"><i class="ti ti-plus"></i></button></div></div>`:''}</div>`;
  }
  function teacherGameMode(){
    const filters=liveQuizState.draftFilters||{quizTimeMinutes:10};
    return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-form-card live-quiz-game-card" aria-busy="${liveQuizState.creatingQuiz?'true':'false'}"><div class="live-quiz-game-head"><h2>Game Mode</h2><div class="live-quiz-game-time"><i class="ti ti-clock"></i>${esc(filters.quizTimeMinutes||10)} min</div></div><div class="live-quiz-game-context">${gameModeContext(filters)}</div><fieldset class="live-quiz-game-options"${liveQuizState.creatingQuiz?' disabled':''}><legend>Choose game mode</legend>${gameModeOption('classic','list-check','Classic','Students answer independently at their own pace.')}${gameModeOption('card-quest','cards','Card Quest','Three correct answers unlock a choice of mystery power-ups.')}${tugOfBrainModeOption()}</fieldset><div class="live-quiz-form-actions live-quiz-game-actions"><button type="button" onclick="backToLiveQuizSetup()"${liveQuizState.creatingQuiz?' disabled':''}><i class="ti ti-arrow-left"></i> Back</button><button type="button" class="primary live-quiz-create-submit" onclick="createLiveQuizSession()"${liveQuizState.creatingQuiz?' disabled':''}>${liveQuizState.creatingQuiz?'<span class="live-quiz-join-spinner" aria-hidden="true"></span><span role="status" aria-live="polite">Creating Quiz...</span>':'<i class="ti ti-player-play"></i> Create Quiz'}</button></div></section></div>`;
  }
  function teacherLobby(session){
    const mode=session.gameMode||session.filters?.gameMode||'classic';
    if(mode==='tug-of-brain'||mode==='team'){
      const winner=tugScores().winner;
      if(winner)return liveQuizPodium(session);
      if(session.status==='active')return teacherTugOfBrainLive(session);
      if(session.status==='ended')return liveQuizPodium(session);
      return teacherTugOfBrainLobby(session);
    }
    if(session.status==='active'&&['classic','card-quest'].includes(mode))return teacherClassicRanking(session);
    const participants=teacherParticipantsFor(session),started=session.status==='active';
    return `<div class="live-quiz-lobby"><div class="live-quiz-lobby-toolbar"><div class="live-quiz-lobby-count"><i class="ti ti-users"></i><strong>${participants.length}</strong></div><h1>${gameModeHeading(session.gameMode||session.filters?.gameMode)}</h1><button type="button" class="live-quiz-start-btn" onclick="startLiveQuizSession()"${started?' disabled':''}><i class="ti ti-player-play"></i>${started?'Started':'Start'}</button></div><div class="live-quiz-lobby-divider"></div><div class="live-quiz-lobby-students">${participants.length?participants.map(liveQuizParticipantTile).join(''):'<div class="live-quiz-lobby-empty"><i class="ti ti-users"></i><span>Waiting for students to join</span></div>'}</div>${participants.length?'<div class="live-quiz-lobby-waiting"><span></span>Waiting for students to join</div>':''}<div class="live-quiz-lobby-footer"><span>${esc(gameModeLabel(session.gameMode||session.filters?.gameMode||'classic'))} mode</span><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div></div>`;
  }
  function tugTeamParticipants(session,team){return teacherParticipantsFor(session).filter(participant=>Number(participant.teamNumber)===team);}
  function tugSelectedSourceTeam(session){
    if(!session)return 0;
    const selected=new Set(liveQuizState.tugSelectedParticipantIds.map(String));
    const teams=new Set(teacherParticipantsFor(session).filter(participant=>selected.has(String(participant.id))).map(participant=>Number(participant.teamNumber)).filter(team=>team===1||team===2));
    return teams.size===1?[...teams][0]:0;
  }
  function tugTeamPanel(session,team){
    const participants=tugTeamParticipants(session,team),selected=liveQuizState.tugSelectedParticipantIds;
    return `<section class="tug-team-panel team-${team}"><header><div><span>Team ${team}</span><strong>${participants.length} student${participants.length===1?'':'s'}</strong></div><i class="ti ti-users-group"></i></header><div class="tug-team-list ${participants.length>7?'two-columns':'one-column'}">${participants.length?participants.map(participant=>{const checked=selected.includes(String(participant.id));return `<label class="tug-team-student${checked?' selected':''}"><input type="checkbox" ${checked?'checked':''} onchange="toggleTugParticipantSelection('${esc(participant.id)}',${team},this.checked)"><span class="live-quiz-participant-avatar${String(liveQuizProfileFor(participant).avatar_color||'')==='transparent'?' transparent':''}" style="background:${esc(liveQuizProfileFor(participant).avatar_color||'#0b7ea4')}">${liveQuizParticipantAvatar(participant)}</span><span>${esc(participant.nickname||'Student')}</span><i class="ti ti-check"></i></label>`;}).join(''):'<div class="tug-team-empty">Waiting for a student</div>'}</div></section>`;
  }
  function teacherTugOfBrainLobby(session){
    const participants=teacherParticipantsFor(session),streak=Number(session.filters?.tugCorrectAnswers)||3,target=Number(session.filters?.tugWinningScore)||10,canStart=tugTeamParticipants(session,1).length>0&&tugTeamParticipants(session,2).length>0,selectedCount=liveQuizState.tugSelectedParticipantIds.length,sourceTeam=tugSelectedSourceTeam(session),destinationTeam=sourceTeam===1?2:sourceTeam===2?1:0;
    const moveLabel=destinationTeam?`Move ${selectedCount} selected student${selectedCount===1?'':'s'} to Team ${destinationTeam}`:'Select students to move';
    return `<div class="live-quiz-lobby tug-of-brain-lobby"><div class="live-quiz-lobby-toolbar"><div class="live-quiz-lobby-count"><i class="ti ti-users"></i><strong>${participants.length}</strong></div><div><h1>Tug of Brain</h1><p>${streak} correct answers = 1 team point &middot; First to a ${target}-point lead</p></div><button type="button" class="live-quiz-start-btn" onclick="startLiveQuizSession()"${canStart?'':' disabled'}><i class="ti ti-player-play"></i>Start</button></div><div class="tug-team-grid">${tugTeamPanel(session,1)}<div class="tug-lobby-divider"><button type="button" class="tug-exchange-button" onclick="moveSelectedTugParticipants()" aria-label="${moveLabel}" title="${moveLabel}"${destinationTeam?'':' disabled'}><i class="ti ti-arrows-exchange"></i>${selectedCount?`<span>${selectedCount}</span>`:''}</button></div>${tugTeamPanel(session,2)}</div><div class="live-quiz-lobby-footer"><span>${canStart?'Tug of Brain Mode':'At least one student is needed on each team'}</span><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div></div>`;
  }
  function tugScores(){
    const state=liveQuizState.tugState||{},one=Number(state.team1Total)||0,two=Number(state.team2Total)||0,lead=one-two;
    return {one,two,lead,team1:Math.max(lead,0),team2:Math.max(-lead,0),winner:Number(state.winnerTeam)||0};
  }
  function resetTugWinnerCelebration(){
    if(liveQuizState.tugCelebrationTimer)clearTimeout(liveQuizState.tugCelebrationTimer);
    liveQuizState.tugCelebrationTimer=null;
    liveQuizState.tugCelebrationSessionId='';
    liveQuizState.tugCelebrationUntil=0;
  }
  function teacherTugOfBrainLive(session,results=false,controls=''){
    const score=tugScores(),target=Math.max(1,Number(session.filters?.tugWinningScore)||10),offset=Math.max(-1,Math.min(1,-score.lead/target))*6,winner=score.winner||(results?(score.lead>0?1:score.lead<0?2:0):0),celebrating=results&&Boolean(winner);
    if(!results&&(winner||teacherTimeRemainingMs()<=0||session.status==='ended'))return liveQuizPodium(session);
    const status=celebrating?`<div class="tug-winner-badge team-${winner}"><i class="ti ti-trophy"></i>Team ${winner} wins!</div>`:results?'<div class="tug-winner-badge">It\'s a draw!</div>':'<div class="live-quiz-ranking-live"><span></span>Live</div>';
    const targetCopy=`First to a ${target}-point lead`;
    const arenaArt=celebrating?`<div class="tug-outcome-scene"><div class="tug-outcome-area"><div class="tug-outcome-frame team-1 ${winner===1?'winning':'losing'}"><img class="tug-outcome-team team-1 ${winner===1?'winning':'losing'}" src="assets/live-quiz/tug-team-blue-${winner===1?'winning':'losing'}.png" alt="Team 1 ${winner===1?'celebrating their win':'reacting to the result'}" draggable="false"></div></div><div class="tug-outcome-area"><div class="tug-outcome-frame team-2 ${winner===2?'winning':'losing'}"><img class="tug-outcome-team team-2 ${winner===2?'winning':'losing'}" src="assets/live-quiz/tug-team-red-${winner===2?'winning':'losing'}.png" alt="Team 2 ${winner===2?'celebrating their win':'reacting to the result'}" draggable="false"></div></div></div>`:`<img class="tug-scene-illustration" src="assets/live-quiz/tug-of-brain.png?v=20261018-5" alt="Two illustrated student teams playing tug of war" draggable="false">`;
    return `<div class="tug-live-screen${celebrating?` tug-winner-state team-${winner}-wins`:''}"><header class="tug-live-head"><div><h1>Tug of Brain</h1><p>Tug of Brain Mode &middot; ${teacherParticipantsFor(session).length} student${teacherParticipantsFor(session).length===1?'':'s'}</p></div>${results?controls:status}</header><section class="tug-scoreboard"><div class="tug-score team-1"><span>Team 1</span><strong>${score.team1}</strong></div><div class="tug-target">${results?status:`<span>${targetCopy}</span><strong>${score.one} total &middot; ${score.two} total</strong>`}</div><div class="tug-score team-2"><span>Team 2</span><strong>${score.team2}</strong></div></section><section class="tug-arena" style="--tug-offset:${offset}vw"><div class="tug-center-line"></div><div class="tug-confetti" aria-hidden="true">${'<i></i>'.repeat(12)}</div>${arenaArt}</section><div class="tug-live-rosters"><div><strong>Team 1</strong><span>${tugTeamParticipants(session,1).map(item=>esc(item.nickname||'Student')).join(', ')||'No students'}</span></div><div><strong>Team 2</strong><span>${tugTeamParticipants(session,2).map(item=>esc(item.nickname||'Student')).join(', ')||'No students'}</span></div></div>${results?'':`<div class="live-quiz-lobby-footer"><span>${Number(session.filters?.tugCorrectAnswers)||3} correct answers earns a point</span><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div>`}</div>`;
  }
  function liveQuizRanking(session){
    const participants=teacherParticipantsFor(session),answers=teacherAnswersFor(session);
    return participants.map(participant=>{
      const answerScore=answers.filter(answer=>(participant.userId&&String(answer.userId)===String(participant.userId))||String(answer.participantId)===String(participant.id)).reduce((sum,answer)=>sum+(Number(answer.score)||0),0);
      return {participant,score:Math.max(0,answerScore+(Number(participant.scoreAdjustment)||0))};
    }).sort((a,b)=>b.score-a.score||String(a.participant.nickname||'').localeCompare(String(b.participant.nickname||'')));
  }
  function liveQuizPodiumEntry(entry,place){
    const participant=entry?.participant||null,profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#dfe5ee');
    const avatar=participant?liveQuizParticipantAvatar(participant):'<i class="ti ti-user"></i>';
    const name=participant?.nickname||profile.display_name||'Open place',score=entry?Math.max(0,Number(entry.score)||0):0;
    return `<article class="live-quiz-podium-entry place-${place}${participant?'':' empty'}"><div class="live-quiz-podium-student"><span class="live-quiz-podium-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${avatar}</span><strong>${esc(name)}</strong><span>${score} point${score===1?'':'s'}</span></div><div class="live-quiz-podium-stage"><i></i><div><span class="live-quiz-podium-rank" aria-label="Rank ${place}"><i class="ti ti-award" aria-hidden="true"></i><strong>${place}</strong></span></div></div></article>`;
  }
  function liveQuizPodiumConfetti(){
    const colors=['red','blue','gold'];
    return `<div class="live-quiz-podium-confetti" aria-hidden="true">${Array.from({length:24},(_,index)=>`<i class="${colors[index%3]}" style="--confetti-x:${(index*37+5)%96}%;--confetti-delay:${(index%8)*.14}s;--confetti-turn:${270+(index%5)*90}deg"></i>`).join('')}</div>`;
  }
  function liveQuizQuestionFor(session,questionId){
    return questionPool(session?.filters||{}).find(question=>qid(question)===String(questionId))||allQs().find(question=>qid(question)===String(questionId))||null;
  }
  function liveQuizPlainText(value){
    const box=document.createElement('div');box.innerHTML=String(value||'');return String(box.textContent||'').replace(/\s+/g,' ').trim();
  }
  function liveQuizQuestionLabel(question){
    const label=liveQuizPlainText(question?.textHtml||question?.text||question?.questionHtml||question?.question||'');
    return label||`Question ${question?.questionNumber||''}`.trim()||'Question';
  }
  function studentAnswersFor(session,participant=liveQuizState.participant){
    const server=liveQuizState.studentAnswers.filter(answer=>String(answer.sessionId)===String(session?.id)&&(!participant||String(answer.participantId)===String(participant.id)));
    if(server.length)return server;
    return localAnswers().filter(answer=>String(answer.sessionId)===String(session?.id)&&(!participant||String(answer.participantId)===String(participant.id)||(participant.userId&&String(answer.userId)===String(participant.userId))));
  }
  function answersForParticipant(session,participant){
    if(isStudent())return studentAnswersFor(session,participant);
    return teacherAnswersFor(session).filter(answer=>(participant?.userId&&String(answer.userId)===String(participant.userId))||String(answer.participantId)===String(participant?.id));
  }
  function liveQuizQuestionStatistics(session,answers){
    const grouped=new Map();
    answers.forEach(answer=>{
      const key=String(answer.questionId||'');if(!key)return;
      if(!grouped.has(key))grouped.set(key,{questionId:key,attempted:0,correct:0,answers:[]});
      const row=grouped.get(key);row.attempted+=1;row.correct+=answer.correct?1:0;row.answers.push(answer);
    });
    return [...grouped.values()].map(row=>({...row,percentage:row.attempted?Math.round(row.correct*100/row.attempted):0,question:liveQuizQuestionFor(session,row.questionId)})).sort((a,b)=>b.percentage-a.percentage||b.attempted-a.attempted||liveQuizQuestionLabel(a.question).localeCompare(liveQuizQuestionLabel(b.question)));
  }
  function liveQuizSummary(answers){
    const attempted=answers.length,correct=answers.reduce((sum,answer)=>sum+(answer.correct?1:0),0);
    return {attempted,correct,percentage:attempted?Math.round(correct*100/attempted):0};
  }
  function liveQuizStatsCards(summary,firstLabel='Questions attempted'){
    return `<div class="live-quiz-statistics-summary"><div><span>${firstLabel}</span><strong>${summary.attempted}</strong></div><div><span>Correct answers</span><strong>${summary.correct}</strong></div><div class="accuracy"><span>Accuracy</span><strong>${summary.percentage}%</strong></div></div>`;
  }
  function liveQuizQuestionStatsTable(session,rows,participantId=''){
    if(!rows.length)return '<div class="live-quiz-statistics-empty"><i class="ti ti-chart-bar"></i><span>No attempted questions to show.</span></div>';
    return `<div class="live-quiz-statistics-table"><div class="live-quiz-statistics-row header"><span>Question</span><span>Correct/Attempted</span><span>Percentage</span><span></span></div>${rows.map(row=>{const question=row.question,label=liveQuizQuestionStatsLabel(question),meta=[question?.topic||question?.topics,question?.type==='tf'?'True or False':'Multiple choice'].filter(Boolean).join(' · ');return `<div class="live-quiz-statistics-row"><div class="question"><strong title="${esc(label)}">${esc(label)}</strong><small>${esc(meta)}</small></div><span>${row.correct} / ${row.attempted}</span><b>${row.percentage}%</b><button type="button" onclick="openLiveQuizQuestionReview('${esc(row.questionId)}','${esc(participantId)}')">Review</button></div>`;}).join('')}</div>`;
  }
  function liveQuizQuestionStatsLabel(question){
    const skills=dataArray(question?.skills,'skills');
    if(!skills.length)return liveQuizQuestionLabel(question);
    const order=new Map();
    if(typeof curriculumLinksForQuestion==='function'&&typeof curriculumLinkProgressionScore==='function'){
      curriculumLinksForQuestion(question).filter(link=>link.active!==false).forEach(link=>{
        const rank=curriculumLinkProgressionScore(link);
        order.set(link.skill,Math.max(order.get(link.skill)??-1,rank));
      });
    }
    return skills.map((skill,index)=>({skill,index})).sort((a,b)=>(order.get(b.skill)??-1)-(order.get(a.skill)??-1)||a.index-b.index).map(item=>item.skill).join(' · ');
  }
  function liveQuizStudentStatistics(session,participant=liveQuizState.participant,teacherDetail=false){
    const answers=answersForParticipant(session,participant),summary=liveQuizSummary(answers),rows=liveQuizQuestionStatistics(session,answers),profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#0b7ea4');
    const back=teacherDetail?'<button type="button" class="live-quiz-statistics-back" onclick="selectLiveQuizStatisticsStudent(\'\')"><i class="ti ti-arrow-left"></i>Students</button>':'';
return `<div class="live-quiz-statistics-student">${back}<div class="live-quiz-statistics-person"><span class="live-quiz-participant-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${liveQuizParticipantAvatar(participant)}</span><div><strong>${esc(participant?.nickname||profile.display_name||'Student')}</strong><span>${teacherDetail?'Individual statistics':'Your personal results'}</span></div></div>${liveQuizStatsCards(summary)}<div class="live-quiz-statistics-section-head"><h2>Question Statistics</h2><span>Highest percentage first</span></div>${liveQuizQuestionStatsTable(session,rows,participant?.id||'')}</div>`;
  }
  function liveQuizTeacherQuestionStatistics(session){
    const answers=teacherAnswersFor(session),rows=liveQuizQuestionStatistics(session,answers),summary=liveQuizSummary(answers),students=teacherParticipantsFor(session).length;
    const classSummary=`<div class="live-quiz-statistics-summary"><div><span>Students</span><strong>${students}</strong></div><div><span>Questions attempted</span><strong>${rows.length}</strong></div><div class="accuracy"><span>Class accuracy</span><strong>${summary.percentage}%</strong></div></div>`;
    return `<div>${classSummary}<div class="live-quiz-statistics-section-head"><h2>Question Statistics</h2><span>Highest percentage first</span></div>${liveQuizQuestionStatsTable(session,rows)}</div>`;
  }
  function liveQuizTeacherStudents(session){
    const participants=teacherParticipantsFor(session);
    if(liveQuizState.selectedStatsParticipantId){const participant=participants.find(item=>String(item.id)===String(liveQuizState.selectedStatsParticipantId));if(participant)return liveQuizStudentStatistics(session,participant,true);}
    if(!participants.length)return '<div class="live-quiz-statistics-empty"><i class="ti ti-users"></i><span>No student results to show.</span></div>';
    return `<div class="live-quiz-statistics-section-head"><h2>Students</h2><span>Select a student to view their attempted questions</span></div><div class="live-quiz-statistics-table students"><div class="live-quiz-statistics-row header"><span>Student</span><span>Attempted</span><span>Correct</span><span>Accuracy</span><span></span></div>${participants.map(participant=>{const profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#0b7ea4'),summary=liveQuizSummary(answersForParticipant(session,participant));return `<div class="live-quiz-statistics-row"><div class="student"><span class="live-quiz-participant-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${liveQuizParticipantAvatar(participant)}</span><strong>${esc(participant.nickname||profile.display_name||'Student')}</strong></div><span>${summary.attempted}</span><span>${summary.correct}</span><b>${summary.percentage}%</b><button type="button" onclick="selectLiveQuizStatisticsStudent('${esc(participant.id)}')">View stats</button></div>`;}).join('')}</div>`;
  }
  function liveQuizStatistics(session){
    if(isStudent())return liveQuizStudentStatistics(session);
    const tab=liveQuizState.teacherStatsTab==='students'?'students':'questions';
    return `<div class="live-quiz-statistics-teacher"><div class="live-quiz-statistics-subtabs"><button type="button" class="${tab==='questions'?'active':''}" onclick="setLiveQuizTeacherStatsTab('questions')">Question Statistics</button><button type="button" class="${tab==='students'?'active':''}" onclick="setLiveQuizTeacherStatsTab('students')">Students</button></div>${tab==='students'?liveQuizTeacherStudents(session):liveQuizTeacherQuestionStatistics(session)}</div>`;
  }
  function liveQuizQuestionReview(session){
    const questionId=liveQuizState.reviewQuestionId;if(!questionId)return '';
    const question=liveQuizQuestionFor(session,questionId);if(!question)return '';
    const participantId=liveQuizState.reviewParticipantId,participant=participantId?teacherParticipantsFor(session).find(item=>String(item.id)===String(participantId)):null;
    const answers=participant?answersForParticipant(session,participant):(isStudent()?studentAnswersFor(session):teacherAnswersFor(session)).filter(answer=>String(answer.questionId)===String(questionId));
    const relevant=participant?answers.filter(answer=>String(answer.questionId)===String(questionId)):answers;
    const correct=Number(question.correct)||0,count=question.type==='tf'?2:Math.max(4,question.options?.length||0),total=relevant.length;
    const options=Array.from({length:count},(_,index)=>{const selected=relevant.filter(answer=>Number(answer.selectedAnswer)===index).length,isCorrect=index===correct;return `<div class="live-quiz-review-option${isCorrect?' correct':''}${selected&&!isCorrect?' selected-wrong':''}"><strong>${String.fromCharCode(65+index)}.</strong><div>${optionHtml(question,index)}</div><span>${isCorrect?'Correct answer':selected?`${selected} of ${total} selected`:''}</span></div>`;}).join('');
    const solution=question.solutionHtml||question.answerExplanationHtml||question.workedSolutionHtml||(question.solution||question.answerExplanation||question.workedSolution?esc(question.solution||question.answerExplanation||question.workedSolution):'<span class="muted">No solution has been added to this question.</span>');
    return `<div class="live-quiz-review-overlay" role="dialog" aria-modal="true" aria-label="Question review" onclick="closeLiveQuizQuestionReview(event)"><article class="live-quiz-review-dialog" onclick="event.stopPropagation()"><header><div><h2>Question review</h2><span>${total} attempt${total===1?'':'s'} · ${relevant.filter(answer=>answer.correct).length} correct</span></div><button type="button" onclick="closeLiveQuizQuestionReview()" aria-label="Close"><i class="ti ti-x"></i></button></header><div class="live-quiz-review-body"><div class="live-quiz-review-question">${questionText(question)}</div><div class="live-quiz-review-options">${options}</div><section class="live-quiz-review-solution"><h3>Solution</h3><div>${solution}</div></section></div></article></div>`;
  }
  function tugResultTeam(session,team,winner){
    const score=tugScores(),members=tugTeamParticipants(session,team),display=team===1?score.team1:score.team2,total=team===1?score.one:score.two;
    return `<article class="tug-result-team team-${team}${winner===team?' winner':''}"><div class="tug-result-place">${winner===team?'<i class="ti ti-crown"></i>Winner':'Team'}</div><div class="tug-result-avatars">${members.slice(0,6).map(participant=>`<span class="live-quiz-participant-avatar${String(liveQuizProfileFor(participant).avatar_color||'')==='transparent'?' transparent':''}" style="background:${esc(liveQuizProfileFor(participant).avatar_color||'#0b7ea4')}" title="${esc(participant.nickname||'Student')}">${liveQuizParticipantAvatar(participant)}</span>`).join('')}</div><h2>Team ${team}</h2><strong>${display}</strong><span>net point${display===1?'':'s'} &middot; ${total} earned</span><div class="tug-result-members">${members.map(item=>`<span>${esc(item.nickname||'Student')}</span>`).join('')||'<span>No students</span>'}</div></article>`;
  }
  function tugOfBrainResults(session){
    const statistics=liveQuizState.finalResultsView==='statistics';
    const action=isStudent()?'':`<button type="button" class="live-quiz-podium-end" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button>`;
    const tabs=`<nav class="live-quiz-results-tabs" aria-label="Final results"><button type="button" class="${statistics?'':'active'}" aria-pressed="${!statistics}" onclick="setLiveQuizFinalResultsView('podium')">Teams</button><button type="button" class="${statistics?'active':''}" aria-pressed="${statistics}" onclick="setLiveQuizFinalResultsView('statistics')">Statistics</button></nav>`;
    return `<section class="live-quiz-results-screen${statistics?'':' tug-final-results'}">${statistics?tabs:''}${statistics?`<div class="live-quiz-statistics-screen"><div class="live-quiz-statistics-head"><h1>Quiz statistics</h1><p>${isStudent()?'Your personal results':'Class results'} &middot; Tug of Brain</p></div>${liveQuizStatistics(session)}</div>`:teacherTugOfBrainLive(session,true,tabs)}${action}${liveQuizQuestionReview(session)}</section>`;
  }
  function liveQuizPodium(session){
    if(['tug-of-brain','team'].includes(session.gameMode||session.filters?.gameMode))return tugOfBrainResults(session);
    const ranking=String(liveQuizState.podiumLoadedFor)===String(session?.id)&&liveQuizState.podiumEntries.length?liveQuizState.podiumEntries:liveQuizRanking(session).slice(0,3);
    const action=isStudent()?'':`<button type="button" class="live-quiz-podium-end" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button>`;
    const statistics=liveQuizState.finalResultsView==='statistics';
    return `<section class="live-quiz-results-screen"><nav class="live-quiz-results-tabs" aria-label="Final results"><button type="button" class="${statistics?'':'active'}" onclick="setLiveQuizFinalResultsView('podium')">Podium</button><button type="button" class="${statistics?'active':''}" onclick="setLiveQuizFinalResultsView('statistics')">Statistics</button></nav>${statistics?`<div class="live-quiz-statistics-screen"><div class="live-quiz-statistics-head"><h1>Quiz statistics</h1><p>${isStudent()?'Your personal results':'Class results'} · ${esc(gameModeLabel(session.gameMode||session.filters?.gameMode||'classic'))}</p></div>${liveQuizStatistics(session)}</div>`:`<div class="live-quiz-podium-screen">${liveQuizPodiumConfetti()}<h1>Congratulations to today’s top three players!</h1><div class="live-quiz-podium">${liveQuizPodiumEntry(ranking[1],2)}${liveQuizPodiumEntry(ranking[0],1)}${liveQuizPodiumEntry(ranking[2],3)}</div></div>`}${action}${liveQuizQuestionReview(session)}</section>`;
  }
  function teacherClassicRanking(session){
    if(teacherTimeRemainingMs()<=0)return liveQuizPodium(session);
    const participants=teacherParticipantsFor(session),ranking=liveQuizRanking(session);
    const mode=gameModeLabel(session.gameMode||session.filters?.gameMode||'classic');
    if((session.gameMode||session.filters?.gameMode)==='card-quest')return teacherCardQuestDashboard(session,participants,ranking);
    return `<div class="live-quiz-ranking"><div class="live-quiz-ranking-head"><div><h1>Student Ranking</h1><p>${esc(mode)} Mode &middot; ${participants.length} student${participants.length===1?'':'s'}</p></div><div class="live-quiz-ranking-live"><span></span>Live</div></div>${liveQuizRankingTable(ranking)}<div class="live-quiz-lobby-footer live-quiz-ranking-footer"><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div></div>`;
  }
  function liveQuizRankingTable(ranking){
    return `<div class="live-quiz-ranking-table"><div class="live-quiz-ranking-row header"><span>Rank</span><span>Student name</span><span>Score</span></div>${ranking.length?ranking.map((entry,index)=>`<div class="live-quiz-ranking-row"><strong class="rank-${index+1}">${index+1}</strong><div><span class="live-quiz-participant-avatar${String(liveQuizProfileFor(entry.participant).avatar_color||'')==='transparent'?' transparent':''}" style="background:${esc(liveQuizProfileFor(entry.participant).avatar_color||'#0b7ea4')}">${liveQuizParticipantAvatar(entry.participant)}</span><span>${esc(entry.participant.nickname||'Student')}</span></div><b>${entry.score}</b></div>`).join(''):'<div class="live-quiz-ranking-empty">Waiting for student scores</div>'}</div>`;
  }
  function cardQuestActivityDescription(event){
    if(String(event.powerupId||'').startsWith('steal-')){
      const target=event.targetNickname||'another student',amount=Math.max(0,Number(event.stolenAmount)||0);
      return amount?`Stole ${amount} point${amount===1?'':'s'} from ${target}`:`${event.powerupLabel||'Steal'} used with no available target`;
    }
    return event.powerupLabel||'Power-up used';
  }
  function cardQuestActivityTable(){
    const events=liveQuizState.powerUpEvents;
    return `<div class="live-quiz-ranking-table card-quest-activity-table"><div class="live-quiz-ranking-row header"><span>Power-up</span><span>Student activity</span><span>Points</span></div>${events.length?events.map(event=>{const delta=Number(event.pointsDelta)||0;return `<div class="live-quiz-ranking-row card-quest-activity-row"><strong>${esc(cardQuestPowerUpSymbol(event.powerupId||''))}</strong><div class="card-quest-activity-copy"><b>${esc(event.participantNickname||'Student')}</b><small>${esc(cardQuestActivityDescription(event))}</small></div><b class="${delta<0?'negative':''}">${delta>0?'+':''}${delta}</b></div>`;}).join(''):'<div class="live-quiz-ranking-empty">Power-up activity will appear here</div>'}</div>`;
  }
  function teacherCardQuestDashboard(session,participants,ranking){
    const eventCount=liveQuizState.powerUpEvents.length;
    const live='<div class="live-quiz-ranking-live"><span></span>Live</div>';
    return `<div class="card-quest-teacher-dashboard"><section class="live-quiz-ranking card-quest-teacher-panel"><div class="live-quiz-ranking-head"><div><h1>Student Ranking</h1><p>Card Quest Mode &middot; ${participants.length} student${participants.length===1?'':'s'}</p></div>${live}</div>${liveQuizRankingTable(ranking)}<div class="card-quest-teacher-footer"></div></section><section class="live-quiz-ranking card-quest-teacher-panel"><div class="live-quiz-ranking-head"><div><h1>Power-up Activity</h1><p>Card Quest Mode &middot; ${eventCount} event${eventCount===1?'':'s'}</p></div>${live}</div>${cardQuestActivityTable()}<div class="card-quest-teacher-footer"><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div></section></div>`;
  }
  function liveQuizInitials(name){return String(name||'Student').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'S';}
  function liveQuizProfileFor(participant){return liveQuizState.participantProfiles[String(participant?.userId||'')]||{};}
  function liveQuizParticipantAvatar(participant){
    const profile=liveQuizProfileFor(participant),name=participant?.nickname||profile.display_name||'Student';
    if(profile.imageUrl)return `<img src="${esc(profile.imageUrl)}" alt="">`;
    const icon=String(profile.avatar_icon||'');
    if(icon.startsWith('profile:'))return `<img src="assets/profiles/${encodeURIComponent(icon.slice(8))}" alt="">`;
    const iconMap={user:'user',book:'book-2',school:'school'};
    if(iconMap[icon])return `<i class="ti ti-${iconMap[icon]}"></i>`;
    return esc(liveQuizInitials(name));
  }
  function liveQuizParticipantTile(participant){
    const profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#0b7ea4');
    return `<div class="live-quiz-participant"><span class="live-quiz-participant-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${liveQuizParticipantAvatar(participant)}</span><span>${esc(participant.nickname||profile.display_name||'Student')}</span></div>`;
  }
  function participantFromRow(row){
    return {id:row.id,sessionId:row.session_id,userId:row.user_id,nickname:row.nickname,joinedAt:row.joined_at,scoreAdjustment:Number(row.score_adjustment)||0,correctStreak:Number(row.correct_streak)||0,cardQuestPending:Boolean(row.card_quest_pending),cardQuestCards:Array.isArray(row.card_quest_cards)?row.card_quest_cards:[],cardQuestSupported:Object.prototype.hasOwnProperty.call(row,'card_quest_pending'),teamNumber:Number(row.team_number)||0,tugCorrectStreak:Number(row.tug_correct_streak)||0};
  }
  function powerUpEventFromRow(row){
    return {id:row.id,sessionId:row.session_id,participantId:row.participant_id,targetParticipantId:row.target_participant_id,participantNickname:row.participant_nickname||'Student',targetNickname:row.target_nickname||'',powerupId:row.powerup_id||'',powerupLabel:row.powerup_label||'',pointsDelta:Number(row.points_delta)||0,stolenAmount:Number(row.stolen_amount)||0,createdAt:row.created_at||''};
  }
  function applyParticipantCardQuestState(participant){
    if(!participant)return;
    liveQuizState.participant={...liveQuizState.participant,...participant};
    liveQuizState.correctStreak=Number(participant.correctStreak)||0;
    liveQuizState.cardQuestPending=Boolean(participant.cardQuestPending);
    if(!liveQuizState.cardQuestRevealed)liveQuizState.cardQuestCards=Array.isArray(participant.cardQuestCards)?participant.cardQuestCards:[];
    if(liveQuizState.cardQuestPending&&!liveQuizState.cardQuestCards.length)liveQuizState.cardQuestCards=drawCardQuestCards();
    saveLocalCardQuest();
  }
  function teacherAnswersFor(session){
    const merged=[...liveQuizState.teacherAnswers,...localAnswers().filter(a=>String(a.sessionId)===String(session.id))];
    const seen=new Set();
    return merged.filter(a=>{const key=String(a.id||`${a.sessionId}-${a.participantId}-${a.questionId}-${a.createdAt}`);if(seen.has(key))return false;seen.add(key);return true;});
  }
  function teacherParticipantsFor(session){
    const byName=new Map();
    liveQuizState.teacherParticipants.filter(p=>String(p.sessionId)===String(session.id)).forEach(p=>byName.set(String(p.nickname||'Student'),p));
    teacherAnswersFor(session).forEach(a=>{const name=String(a.nickname||a.student_name||'Student');if(!byName.has(name))byName.set(name,{nickname:name,sessionId:session.id});});
    return [...byName.values()].sort((a,b)=>String(a.nickname||'').localeCompare(String(b.nickname||''),undefined,{numeric:true,sensitivity:'base'}));
  }
  function studentTimerKey(session,userId){return `quero_live_quiz_start_${session.id}_${userId||profileName()}`;}
  function quizTimeMs(session){return Math.max(1,Number(session?.filters?.quizTimeMinutes)||10)*60000;}
  function teacherTimeRemainingMs(){
    const session=liveQuizState.session,started=Date.parse(session?.filters?.startedAt||'');
    if(!session||session.status!=='active'||!Number.isFinite(started))return 0;
    return Math.max(0,started+quizTimeMs(session)-Date.now());
  }
  function teacherTimeRemainingText(){
    const seconds=Math.ceil(teacherTimeRemainingMs()/1000);
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
  function stopTeacherHeaderTimer(){if(liveQuizState.teacherTimerInterval){clearInterval(liveQuizState.teacherTimerInterval);liveQuizState.teacherTimerInterval=null;}}
  function startTeacherHeaderTimer(){
    stopTeacherHeaderTimer();
    if(isStudent()||liveQuizState.session?.status!=='active')return;
    if(teacherTimeRemainingMs()<=0)return;
    liveQuizState.teacherTimerInterval=setInterval(()=>{
      const display=document.getElementById('lq-teacher-time');
      if(display)display.textContent=teacherTimeRemainingText();
      if(teacherTimeRemainingMs()<=0){stopTeacherHeaderTimer();loadLiveQuizPodium(liveQuizState.session,true);}
    },1000);
  }
  function timeRemainingMs(){
    const started=Date.parse(liveQuizState.participant?.startedAt||liveQuizState.participant?.joinedAt||'');
    return Math.max(0,(Number.isFinite(started)?started:Date.now())+quizTimeMs(liveQuizState.session)-Date.now());
  }
  function timeRemainingText(){
    const seconds=Math.ceil(timeRemainingMs()/1000);
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
  function stopStudentTimer(){if(liveQuizState.timerInterval){clearInterval(liveQuizState.timerInterval);liveQuizState.timerInterval=null;}}
  function startStudentTimer(){
    stopStudentTimer();
    if(!isStudent()||!liveQuizState.participant||liveQuizState.session?.status!=='active')return;
    liveQuizState.timerInterval=setInterval(async()=>{
      const display=document.getElementById('lq-time-remaining');
      if(display)display.textContent=timeRemainingText();
      if(timeRemainingMs()<=0){stopStudentTimer();await loadLiveQuizPodium(liveQuizState.session,false);renderLiveQuiz();}
    },1000);
  }
  function cardQuestTargets(){
    const currentId=String(liveQuizState.participant?.id||'');
    return liveQuizState.teacherParticipants.filter(participant=>participant.id&&String(participant.sessionId)===String(liveQuizState.session?.id)&&String(participant.id)!==currentId);
  }
  function cardQuestTargetOptions(){
    const ids=new Set(cardQuestTargets().map(participant=>String(participant.id)));
    const targets=liveQuizRanking(liveQuizState.session).filter(entry=>ids.has(String(entry.participant.id)));
    if(!targets.length)return '<div class="card-quest-target-empty"><p>No other students are available to steal from.</p><button type="button" onclick="skipCardQuestNoTarget(event)"'+(liveQuizState.cardQuestApplying?' disabled':'')+'>Continue</button></div>';
    return `<div class="card-quest-target-grid">${targets.map(({participant,score})=>{const profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#0b7ea4');return `<button type="button" class="card-quest-target-player" data-target-id="${esc(participant.id)}" onclick="applyCardQuestPowerUp('${esc(participant.id)}')"${liveQuizState.cardQuestApplying?' disabled':''}><span class="live-quiz-participant-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${liveQuizParticipantAvatar(participant)}</span><span class="card-quest-target-name" title="${esc(participant.nickname||profile.display_name||'Student')}">${esc(participant.nickname||profile.display_name||'Student')}</span><strong title="${score}">${score}</strong></button>`;}).join('')}</div>`;
  }
  function cardQuestTargetDialog(){
    if(!liveQuizState.cardQuestTargetOpen)return '';
    const card=liveQuizState.cardQuestCards[liveQuizState.cardQuestSelected];
    if(!card?.id?.startsWith('steal-')||liveQuizState.cardQuestApplied)return '';
    return `<div class="card-quest-target-overlay" onclick="closeCardQuestTargets(event)"><section class="card-quest-target-dialog" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="card-quest-target-title" aria-busy="${liveQuizState.cardQuestTargetLoading||liveQuizState.cardQuestApplying}" onkeydown="handleCardQuestTargetKeydown(event)" onclick="event.stopPropagation()"><header><div><h2 id="card-quest-target-title">Choose a student</h2><p>${esc(card.label)} &middot; Highest score first</p></div></header>${liveQuizState.cardQuestTargetLoading?'<div class="card-quest-target-loading" role="status"><span class="live-quiz-loading-spinner" aria-hidden="true"></span>Loading players...</div>':cardQuestTargetOptions()}<div class="card-quest-target-status" role="status" aria-live="polite">${esc(liveQuizState.cardQuestApplying?'Applying power-up...':liveQuizState.cardQuestMessage.includes('could not')?liveQuizState.cardQuestMessage:'')}</div></section></div>`;
  }
  function cardQuestRewardScreen(){
    const cards=liveQuizState.cardQuestCards.length?liveQuizState.cardQuestCards:drawCardQuestCards();
    liveQuizState.cardQuestCards=cards;
    const selected=liveQuizState.cardQuestSelected;
    const chosen=selected==null?null:cards[selected];
    const needsTarget=Boolean(chosen?.id?.startsWith('steal-'))&&!liveQuizState.cardQuestApplied;
    const noStealTargets=needsTarget&&cardQuestTargets().length===0;
    const cardMarkup=cards.map((card,index)=>{
      const isSelected=index===selected,unchosen=liveQuizState.cardQuestRevealed&&!isSelected;
      return `<button type="button" class="card-quest-card${liveQuizState.cardQuestRevealed?' revealed':''}${liveQuizState.cardQuestAnimate?' animate-flip':''}${isSelected?' selected':''}${unchosen?' unchosen':''}" onclick="chooseCardQuestCard(${index})" ${liveQuizState.cardQuestRevealed?'disabled':''} aria-label="${liveQuizState.cardQuestRevealed?esc(card.label):`Mystery card ${index+1}`}" style="--card-delay:${index*90}ms"><span class="card-quest-card-inner"><span class="card-quest-card-face card-quest-card-back"><b>?</b><small>Card ${index+1}</small></span><span class="card-quest-card-face card-quest-card-front"><span class="card-quest-power-symbol">${cardQuestPowerUpSymbol(card.id)}</span><strong>${esc(card.label)}</strong><span class="card-quest-power-description">${esc(cardQuestPowerUpDescription(card.id))}</span></span></span></button>`;
    }).join('');
    const result=liveQuizState.cardQuestRevealed?`<div class="card-quest-result"><strong>${esc(chosen?.label||'Power-up revealed')}</strong>${needsTarget?`<span>${noStealTargets?'There is nobody available to steal from.':'Choose a student to use this power-up.'}</span>`:`<span>${esc(liveQuizState.cardQuestMessage||'Power-up revealed')}</span>`}</div>`:'';
    const targets=needsTarget&&!liveQuizState.cardQuestTargetTimer&&!liveQuizState.cardQuestTargetOpen?'<button type="button" class="card-quest-open-targets" onclick="openCardQuestTargets()">Choose a student</button>':'';
    const canContinue=liveQuizState.cardQuestApplied;
    const continueHint=canContinue?'<div class="card-quest-click-continue"><i class="ti ti-hand-click"></i>Click anywhere to continue</div>':'';
    const interaction=canContinue?' role="button" tabindex="0" onclick="continueCardQuest()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();continueCardQuest()}"':'';
    return `<section class="card-quest-reward${noStealTargets?' can-skip-steal':''}${canContinue?' can-continue':''}" aria-live="polite"${interaction}><div class="card-quest-heading"><h1>Pick one card to reveal a random power-up.</h1></div><div class="card-quest-cards">${cardMarkup}</div><div class="card-quest-feedback-slot">${result}${targets}${continueHint}</div></section>`;
  }
  function studentScreen(){
    const session=liveQuizState.session,participant=liveQuizState.participant;
    if(!session||!participant){
      const invalid=Boolean(liveQuizState.joinError);
      const joining=Boolean(liveQuizState.joining);
      return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-form-card live-quiz-join-card"><h2>Join Live Quiz</h2><div class="live-quiz-grid"><label>Quiz code<input id="lq-join-code" class="${invalid?'invalid':''}" value="${esc(liveQuizState.joinCodeDraft)}" placeholder="Enter quiz code" maxlength="6" autocomplete="off" ${joining?'disabled aria-busy="true"':invalid?'aria-invalid="true" aria-describedby="lq-join-error"':''} oninput="updateLiveQuizJoinCode(this)" onkeydown="if(event.key==='Enter')joinLiveQuizSession()"></label>${invalid?`<div id="lq-join-error" class="live-quiz-join-error" role="alert"><i class="ti ti-alert-circle"></i><span>${esc(liveQuizState.joinError)}</span></div>`:''}</div><div class="live-quiz-form-actions"><button type="button" onclick="closeLiveQuiz()">Cancel</button><button type="button" class="primary live-quiz-join-submit" onclick="joinLiveQuizSession()"${joining?' disabled aria-busy="true"':''}>${joining?'<span class="live-quiz-join-spinner" aria-hidden="true"></span>Joining...':'Join'}</button></div></section></div>`;
    }
    if(session.status==='waiting'){
      const profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#0b7ea4');
      const team=currentGameMode()==='tug-of-brain'&&participant.teamNumber?`<div class="tug-student-team team-${participant.teamNumber}">Team ${participant.teamNumber}</div>`:'';
      return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-loading-card live-quiz-waiting-card" role="status"><span class="live-quiz-waiting-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${liveQuizParticipantAvatar(participant)}</span><h2>You're in</h2>${team}<p>Waiting for your teacher to start Quero Live Quiz.</p><button type="button" onclick="leaveLiveQuizSession()">Leave</button></section></div>`;
    }
    if(session.status==='ended'||(session.status==='active'&&timeRemainingMs()<=0))return liveQuizPodium(session);
    if(currentGameMode()==='card-quest'&&(liveQuizState.cardQuestPending||liveQuizState.cardQuestRevealed))return `<div class="live-quiz-card live-quiz-panel live-quiz-student-panel live-quiz-classic-panel card-quest-panel"><div class="card-quest-question-underlay">${studentQuestionArea()}</div><div class="card-quest-overlay">${cardQuestRewardScreen()}</div></div>`;
    const classic=usesClassicQuestionFlow();
    return `<div class="live-quiz-card live-quiz-panel live-quiz-student-panel${classic?' live-quiz-classic-panel':''}">${studentQuestionArea()}</div>`;
  }
  function studentQuestionArea(){
    if(timeRemainingMs()<=0)return `<div class="live-quiz-empty"><i class="ti ti-clock"></i><h2>Time's up</h2><p>You answered ${liveQuizState.answeredIds.length} question${liveQuizState.answeredIds.length===1?'':'s'}.</p></div>`;
    if(!liveQuizState.currentQuestion)pickNextQuestion();
    const q=liveQuizState.currentQuestion;
    if(!q)return `<div class="live-quiz-empty"><i class="ti ti-check"></i><h2>No more questions</h2><p>You have answered all matching questions in this session.</p></div>`;
    const classic=usesClassicQuestionFlow();
    const timer=classic?'':`<div class="live-quiz-student-timer"><span>Time remaining</span><strong id="lq-time-remaining" role="timer">${timeRemainingText()}</strong></div>`;
    return `${timer}${renderQuestion(q)}`;
  }
  function questionText(q){
    if(typeof questionContentHtml==='function')return questionContentHtml({...q,options:[],optionsHtml:[],correct:-1},1);
    return esc(q.textHtml||q.text||'');
  }
  function optionHtml(q,originalIndex){
    if(q.optionsHtml&&q.optionsHtml[originalIndex])return q.optionsHtml[originalIndex];
    if(q.optionImages&&q.optionImages[originalIndex]?.data)return `<img src="${q.optionImages[originalIndex].data}" alt="${esc(q.optionImages[originalIndex].name||'Option image')}">`;
    return esc((q.options||[])[originalIndex]||'');
  }
  function renderQuestion(q){
    const checked=liveQuizState.checked,selected=liveQuizState.selected,correct=Number(q.correct)||0,classic=usesClassicQuestionFlow();
    const options=liveQuizState.optionOrder.map((originalIndex,displayIndex)=>{
      const isSel=selected===originalIndex,isCorrect=checked&&originalIndex===correct,isWrong=checked&&isSel&&originalIndex!==correct,action=`selectLiveQuizOption(${originalIndex},event)`;
      const resultClass=classic?(checked&&isSel?(isCorrect?'correct':'wrong'):''):`${isCorrect?'correct':''} ${isWrong?'wrong':''}`;
      const resultIcon=classic&&checked&&isSel?`<span class="live-quiz-option-feedback ${isCorrect?'correct':'wrong'}"><i class="ti ${isCorrect?'ti-check':'ti-x'}"></i></span>`:'';
      return `<button type="button" class="live-quiz-option ${isSel?'selected':''} ${resultClass}" data-option-index="${originalIndex}" onclick="${action}" ${checked&&!classic?'disabled':''}><strong>${String.fromCharCode(65+displayIndex)}.</strong><span>${optionHtml(q,originalIndex)}</span>${resultIcon}</button>`;
    }).join('');
    const meta=`${esc(q.date||q.year||'')} Q${esc(q.questionNumber||'')}${q.responsePercent||q.response?`(${esc(q.responsePercent??q.response)}%)`:''} ${esc(q.author||'')}`.trim();
    const feedback=liveQuizState.lastFeedback?`<div class="live-quiz-feedback ${liveQuizState.lastFeedback==='Correct'?'correct':'wrong'}">${esc(liveQuizState.lastFeedback)}${liveQuizState.lastFeedback==='Correct'?'<strong>+1 point</strong>':''}</div>`:'';
    const actions=classic?(checked?'<div class="live-quiz-continue-hint"><i class="ti ti-hand-click"></i>Press the question area to continue</div>':''):`<div class="live-quiz-actions" style="justify-content:flex-end;margin-top:18px"><button class="btn" onclick="nextLiveQuizQuestion()" ${checked?'':'disabled'}><i class="ti ti-arrow-right"></i>Next Question</button><button class="btn btn-primary" onclick="checkLiveQuizAnswer()" ${selected==null||checked?'disabled':''}><i class="ti ti-check"></i>Check</button></div>`;
    if(classic)return `<article class="live-quiz-question-card live-quiz-classic-layout"><div class="live-quiz-question-scroll${checked?' ready-next':''}"${checked?' onclick="advanceClassicLiveQuiz(event)"':''}><div class="live-quiz-question-head"><h2>Question</h2><div class="live-quiz-meta">${meta}</div></div><div class="live-quiz-question-text">${questionText(q)}</div>${actions}</div><div class="live-quiz-options live-quiz-options-docked">${options}</div></article>`;
    return `<article class="live-quiz-question-card"><div class="live-quiz-question-head"><h2>Question</h2><div class="live-quiz-meta">${meta}</div></div><div class="live-quiz-question-text">${questionText(q)}</div><div class="live-quiz-options">${options}</div>${feedback}${actions}</article>`;
  }
  function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function pickNextQuestion(){
    const all=questionPool(liveQuizState.session?.filters||{});
    let pool=all.filter(q=>!liveQuizState.answeredIds.includes(qid(q)));
    if(!pool.length&&all.length){
      liveQuizState.answeredIds=[];
      pool=all.length>1?all.filter(q=>qid(q)!==qid(liveQuizState.currentQuestion)):all;
    }
    liveQuizState.currentQuestion=pool[Math.floor(Math.random()*pool.length)]||null;
    liveQuizState.optionOrder=liveQuizState.currentQuestion?shuffle([0,1,2,3]):[];
    liveQuizState.selected=null;liveQuizState.checked=false;liveQuizState.lastFeedback='';
  }
  async function loadLiveQuizAnswers(session,rerender=true){
    if(!session||!supabaseClient)return;
    liveQuizState.loadingAnswers=true;
    try{
      const {data,error}=await supabaseClient.from('live_quiz_answers').select('*').eq('session_id',session.id).order('created_at',{ascending:false});
      if(!error&&Array.isArray(data))liveQuizState.teacherAnswers=data.map(row=>({id:row.id,sessionId:row.session_id,participantId:row.participant_id,userId:row.user_id,nickname:row.nickname,questionId:row.question_id,selectedAnswer:row.selected_answer,correct:row.correct,score:row.score,createdAt:row.created_at}));
    }catch(e){console.warn('Could not load Live Quiz answers:',e);}finally{liveQuizState.loadingAnswers=false;if(rerender)renderLiveQuiz();}
  }
  function liveQuizAnswerFromRow(row){return {id:row.id,sessionId:row.session_id,participantId:row.participant_id,userId:row.user_id,nickname:row.nickname,questionId:row.question_id,selectedAnswer:row.selected_answer,correct:row.correct,score:row.score,createdAt:row.created_at};}
  async function loadStudentLiveQuizAnswers(session=liveQuizState.session,participant=liveQuizState.participant){
    if(!session||!participant)return;
    const local=localAnswers().filter(answer=>String(answer.sessionId)===String(session.id)&&((participant.userId&&String(answer.userId)===String(participant.userId))||String(answer.participantId)===String(participant.id)));
    liveQuizState.studentAnswers=local;
    try{
      if(supabaseClient){
        const {data,error}=await supabaseClient.from('live_quiz_answers').select('*').eq('session_id',session.id).eq('participant_id',participant.id).order('created_at',{ascending:true});
        if(!error&&Array.isArray(data))liveQuizState.studentAnswers=data.map(liveQuizAnswerFromRow);
      }
    }catch(e){console.warn('Could not load student Live Quiz statistics:',e);}
  }
  async function loadLiveQuizParticipants(session,rerender=true){
    if(!session||!supabaseClient)return;
    liveQuizState.loadingParticipants=true;
    try{
      const {data,error}=await supabaseClient.from('live_quiz_participants').select('*').eq('session_id',session.id).order('joined_at',{ascending:true});
      if(!error&&Array.isArray(data)){
        liveQuizState.teacherParticipants=data.map(participantFromRow);
        const userIds=[...new Set(liveQuizState.teacherParticipants.map(item=>String(item.userId||'')).filter(Boolean))];
        if(userIds.length){
          const profiles=await supabaseClient.from('profiles').select('id,display_name,avatar_color,avatar_icon,avatar_image_path').in('id',userIds);
          if(!profiles.error)(profiles.data||[]).forEach(profile=>{
            let imageUrl='';
            if(profile.avatar_image_path)imageUrl=supabaseClient.storage.from('profile-avatars').getPublicUrl(profile.avatar_image_path).data?.publicUrl||'';
            liveQuizState.participantProfiles[String(profile.id)]={...profile,imageUrl};
          });
        }
      }
    }catch(e){console.warn('Could not load Live Quiz participants:',e);}finally{liveQuizState.loadingParticipants=false;if(rerender)renderLiveQuiz();}
  }
  async function loadLiveQuizPowerUpEvents(session,rerender=true){
    if(!session||!supabaseClient||(session.gameMode||session.filters?.gameMode)!=='card-quest'||liveQuizState.powerUpEventsUnavailable)return;
    liveQuizState.loadingPowerUpEvents=true;
    try{
      const {data,error}=await supabaseClient.from('live_quiz_powerup_events').select('*').eq('session_id',session.id).order('created_at',{ascending:false}).limit(100);
      if(error)throw error;
      liveQuizState.powerUpEvents=(data||[]).map(powerUpEventFromRow);
    }catch(e){
      liveQuizState.powerUpEventsUnavailable=true;
      console.warn('Could not load Card Quest power-up activity:',e);
    }finally{liveQuizState.loadingPowerUpEvents=false;if(rerender)renderLiveQuiz();}
  }
  async function loadTugOfBrainState(session,rerender=true){
    if(!session||!supabaseClient||!['tug-of-brain','team'].includes(session.gameMode||session.filters?.gameMode)||liveQuizState.tugStateUnavailable)return;
    try{
      const {data,error}=await supabaseClient.from('live_quiz_tug_state').select('*').eq('session_id',session.id).maybeSingle();
      if(error)throw error;
      const row=data||{};
      liveQuizState.tugState={sessionId:session.id,team1Total:Number(row.team_1_total)||0,team2Total:Number(row.team_2_total)||0,winnerTeam:Number(row.winner_team)||0};
    }catch(e){liveQuizState.tugStateUnavailable=true;console.warn('Could not load Tug of Brain state:',e);}
    if(rerender)renderLiveQuiz();
  }
  async function refreshTeacherLiveQuizSession(session){
    if(!session||!supabaseClient)return;
    try{
      const {data,error}=await supabaseClient.from('live_quiz_sessions').select('status,filters,ended_at').eq('id',session.id).maybeSingle();
      if(!error&&data){session.status=data.status||session.status;session.filters=data.filters||session.filters;session.endedAt=data.ended_at||session.endedAt;}
    }catch(e){console.warn('Could not refresh Live Quiz session:',e);}
  }

  async function refreshLiveQuizData(session=liveQuizState.session,rerender=true){
    if(!session||!supabaseClient){if(rerender)renderLiveQuiz();return;}
    await Promise.all([refreshTeacherLiveQuizSession(session),loadLiveQuizParticipants(session,false),loadLiveQuizAnswers(session,false),loadLiveQuizPowerUpEvents(session,false),loadTugOfBrainState(session,false)]);
    if(rerender)renderLiveQuiz();
  }
  async function loadLiveQuizPodium(session=liveQuizState.session,rerender=true){
    if(!session||liveQuizState.loadingPodium)return;
    liveQuizState.loadingPodium=true;
    let loaded=false;
    try{
      if(isStudent())await Promise.all([loadStudentLiveQuizAnswers(session,liveQuizState.participant),loadLiveQuizParticipants(session,false),loadTugOfBrainState(session,false)]);
      else await Promise.all([loadLiveQuizParticipants(session,false),loadLiveQuizAnswers(session,false),loadTugOfBrainState(session,false)]);
      if(supabaseClient){
        const {data,error}=await supabaseClient.rpc('get_live_quiz_podium',{p_session_id:session.id});
        if(error)throw error;
        if(Array.isArray(data)){
          liveQuizState.podiumEntries=data.map(row=>{
            const participant={id:row.participant_id,userId:row.user_id,nickname:row.display_name||row.nickname||'Student'};
            if(row.user_id)liveQuizState.participantProfiles[String(row.user_id)]={display_name:row.display_name,avatar_color:row.avatar_color,avatar_icon:row.avatar_icon,avatar_image_path:row.avatar_image_path,imageUrl:row.avatar_image_path?supabaseClient.storage.from('profile-avatars').getPublicUrl(row.avatar_image_path).data?.publicUrl||'':''};
            return {participant,score:Math.max(0,Number(row.score)||0)};
          });
          loaded=true;
        }
      }
    }catch(e){console.warn('Could not load Live Quiz podium:',e);}
    if(!loaded){
      await Promise.all([loadLiveQuizParticipants(session,false),loadLiveQuizAnswers(session,false)]);
      liveQuizState.podiumEntries=liveQuizRanking(session).slice(0,3);
    }
    liveQuizState.podiumLoadedFor=String(session.id);
    liveQuizState.loadingPodium=false;
    if(rerender)renderLiveQuiz();
  }
  function stopLiveQuizPolling(){
    if(liveQuizState.pollTimer){clearInterval(liveQuizState.pollTimer);liveQuizState.pollTimer=null;}
  }
  function startLiveQuizPolling(){
    stopLiveQuizPolling();
    if(!liveQuizState.session)return;
    if(isStudent()){
      liveQuizState.pollTimer=setInterval(refreshStudentLiveQuizSession,2000);
      return;
    }
    liveQuizState.pollTimer=setInterval(()=>{
      if(!liveQuizState.session){stopLiveQuizPolling();return;}
      refreshLiveQuizData(liveQuizState.session,true);
    },3000);
  }
  async function refreshStudentLiveQuizSession(){
    const session=liveQuizState.session;
    if(!session||!liveQuizState.participant){stopLiveQuizPolling();return;}
    let next=null;
    let participantChanged=false;
    try{
      if(supabaseClient){
        const result=await supabaseClient.from('live_quiz_sessions').select('status,filters').eq('id',session.id).maybeSingle();
        if(!result.error&&result.data)next=result.data;
        if(['card-quest','tug-of-brain'].includes(currentGameMode())){
          const participantResult=await supabaseClient.from('live_quiz_participants').select('*').eq('id',liveQuizState.participant.id).maybeSingle();
          if(!participantResult.error&&participantResult.data){
            const participant=participantFromRow(participantResult.data);
            const adjustmentDelta=participant.scoreAdjustment-Number(liveQuizState.participant.scoreAdjustment||0);
            if(adjustmentDelta)liveQuizState.studentScore=Math.max(0,liveQuizState.studentScore+adjustmentDelta);
            participantChanged=participant.teamNumber!==Number(liveQuizState.participant.teamNumber||0)||participant.tugCorrectStreak!==Number(liveQuizState.participant.tugCorrectStreak||0)||participant.cardQuestPending!==liveQuizState.cardQuestPending||participant.correctStreak!==liveQuizState.correctStreak||participant.scoreAdjustment!==Number(liveQuizState.participant.scoreAdjustment||0);
            if(currentGameMode()==='card-quest'&&participant.cardQuestSupported)applyParticipantCardQuestState(participant);
            else liveQuizState.participant={...liveQuizState.participant,...participant};
          }
          await loadLiveQuizParticipants(session,false);
          if(currentGameMode()==='tug-of-brain')await loadTugOfBrainState(session,false);
        }
      }
    }catch(e){console.warn('Could not refresh Live Quiz status:',e);}
    if(!next){
      const local=localSessions().find(item=>String(item.id)===String(session.id));
      if(local)next={status:local.status,filters:local.filters};
    }
    if(!next)return;
    if(next.status===session.status){if(participantChanged||currentGameMode()==='tug-of-brain')renderLiveQuiz();return;}
    session.status=next.status;
    session.filters=next.filters||session.filters;
    if(session.status==='active'){
      const timerKey=studentTimerKey(session,liveQuizState.participant.userId),startedAt=Number(localStorage.getItem(timerKey))||Date.now();
      localStorage.setItem(timerKey,String(startedAt));
      liveQuizState.participant.startedAt=new Date(startedAt).toISOString();
      pickNextQuestion();
      startStudentTimer();
    }else if(session.status==='ended'){stopStudentTimer();await loadLiveQuizPodium(session,false);}
    renderLiveQuiz();
  }
  function ensureLiveQuizScreen(){
    let screen=document.getElementById('live-quiz-screen');
    if(screen)return screen;
    screen=document.createElement('section');
    screen.id='live-quiz-screen';
    screen.className='live-quiz-screen';
    screen.hidden=true;
    screen.innerHTML='<div class="live-quiz-root" data-live-quiz-root></div>';
    document.body.appendChild(screen);
    return screen;
  }
  function hideLiveQuizScreen(){
    const screen=document.getElementById('live-quiz-screen');
    if(!screen)return;
    resetCardQuestTargetDialog();
    stopLiveQuizPolling();
    stopStudentTimer();
    stopTeacherHeaderTimer();
    if(!liveQuizState.session){liveQuizState.setupStep='filters';liveQuizState.draftFilters=null;liveQuizState.gameMode='classic';liveQuizState.joinCodeDraft='';liveQuizState.joinError='';liveQuizState.joining=false;}
    screen.classList.remove('open');
    screen.hidden=true;
    document.body.classList.remove('live-quiz-active');
  }
  window.openLiveQuiz=async function openLiveQuiz(){
    const screen=ensureLiveQuizScreen();
    const prepareQuestions=!isStudent()&&!liveQuizState.session;
    if(prepareQuestions){
      liveQuizState.questionsLoading=true;
      liveQuizState.questionLoadError='';
    }
    screen.hidden=false;
    screen.classList.add('open');
    document.body.classList.add('live-quiz-active');
    renderLiveQuiz();
    startLiveQuizPolling();
    startStudentTimer();
    const questionLoad=prepareQuestions?loadLiveQuizQuestions():null;
    if(screen.requestFullscreen&&document.fullscreenElement!==screen){
      try{await screen.requestFullscreen();}
      catch(err){console.warn('Could not enter Live Quiz fullscreen',err);}
    }
    if(questionLoad)await questionLoad;
  };
  window.retryLiveQuizQuestions=function retryLiveQuizQuestions(){
    liveQuizState.questionsLoading=true;
    liveQuizState.questionLoadError='';
    renderLiveQuiz();
    return loadLiveQuizQuestions();
  };
  window.closeLiveQuiz=async function closeLiveQuiz(){
    const screen=document.getElementById('live-quiz-screen');
    if(screen&&document.fullscreenElement===screen){try{await document.exitFullscreen();}catch(err){console.warn('Could not exit Live Quiz fullscreen',err);}}
    hideLiveQuizScreen();
  };
  if(!window.__queroLiveQuizListeners){
    window.__queroLiveQuizListeners=true;
    document.addEventListener('click',event=>{
      const screen=document.getElementById('live-quiz-screen');
      if(!screen?.classList.contains('open'))return;
      const clickedPicker=event.target.closest?.('#live-quiz-screen .live-quiz-multiselect');
      closeLiveQuizMenus(clickedPicker);
    });
    document.addEventListener('fullscreenchange',()=>{const screen=document.getElementById('live-quiz-screen');if(screen?.classList.contains('open')&&document.fullscreenElement!==screen)hideLiveQuizScreen();});
    document.addEventListener('keydown',event=>{const screen=document.getElementById('live-quiz-screen');if(event.key==='Escape'&&screen?.classList.contains('open')){event.preventDefault();window.closeLiveQuiz();}});
  }
  window.renderLiveQuiz=renderLiveQuiz;
  window.setLiveQuizFinalResultsView=function(view){liveQuizState.finalResultsView=view==='statistics'?'statistics':'podium';liveQuizState.reviewQuestionId='';renderLiveQuiz();};
  window.setLiveQuizTeacherStatsTab=function(tab){liveQuizState.teacherStatsTab=tab==='students'?'students':'questions';liveQuizState.selectedStatsParticipantId='';liveQuizState.reviewQuestionId='';renderLiveQuiz();};
  window.selectLiveQuizStatisticsStudent=function(participantId){liveQuizState.selectedStatsParticipantId=String(participantId||'');liveQuizState.reviewQuestionId='';renderLiveQuiz();};
  window.openLiveQuizQuestionReview=function(questionId,participantId=''){liveQuizState.reviewQuestionId=String(questionId||'');liveQuizState.reviewParticipantId=String(participantId||'');renderLiveQuiz();};
  window.closeLiveQuizQuestionReview=function(event){if(event&&event.target!==event.currentTarget)return;liveQuizState.reviewQuestionId='';liveQuizState.reviewParticipantId='';renderLiveQuiz();};
  window.refreshLiveQuizAnswers=function(){if(liveQuizState.session)refreshLiveQuizData(liveQuizState.session,true);else renderLiveQuiz();};
  window.showLiveQuizGameMode=function(){
    const filters=collectFilters(),pool=questionPool(filters);
    if(!pool.length){showToast('No matching non-calculator questions found',true);return;}
    filters.questionCount=Math.min(pool.length,100);
    liveQuizState.draftFilters=filters;
    liveQuizState.setupStep='mode';
    renderLiveQuiz();
  };
  window.backToLiveQuizSetup=function(){if(liveQuizState.creatingQuiz)return;liveQuizState.setupStep='filters';renderLiveQuiz();};
  window.selectLiveQuizGameMode=function(mode,input){
    if(liveQuizState.creatingQuiz)return;
    liveQuizState.gameMode=['classic','card-quest','tug-of-brain'].includes(mode)?mode:'classic';
    renderLiveQuiz();
  };
  window.adjustTugOfBrainSetting=function(field,delta){
    if(liveQuizState.creatingQuiz)return;
    if(field==='streak')liveQuizState.tugCorrectAnswers=Math.min(20,Math.max(1,liveQuizState.tugCorrectAnswers+Number(delta||0)));
    if(field==='score')liveQuizState.tugWinningScore=Math.min(100,Math.max(1,liveQuizState.tugWinningScore+Number(delta||0)));
    renderLiveQuiz();
  };
  window.toggleTugParticipantSelection=function(participantId,team,checked){
    const id=String(participantId),teamNumber=Number(team),participants=teacherParticipantsFor(liveQuizState.session),selected=new Set(liveQuizState.tugSelectedParticipantIds);
    if(checked){
      participants.filter(participant=>Number(participant.teamNumber)!==teamNumber).forEach(participant=>selected.delete(String(participant.id)));
      selected.add(id);
    }else selected.delete(id);
    liveQuizState.tugSelectedParticipantIds=[...selected];
    renderLiveQuiz();
  };
  window.moveSelectedTugParticipants=async function(){
    const session=liveQuizState.session,ids=[...liveQuizState.tugSelectedParticipantIds],sourceTeam=tugSelectedSourceTeam(session),team=sourceTeam===1?2:sourceTeam===2?1:0;
    if(!session||!ids.length||!team)return;
    try{
      if(!supabaseClient)throw new Error('Supabase is not available');
      const {error}=await supabaseClient.rpc('move_tug_of_brain_students',{p_session_id:session.id,p_participant_ids:ids,p_team_number:Number(team)});
      if(error)throw error;
      liveQuizState.tugSelectedParticipantIds=[];
      await loadLiveQuizParticipants(session,false);
      renderLiveQuiz();
    }catch(e){console.warn('Could not move Tug of Brain students:',e);showToast('Could not move the selected students',true);}
  };
  window.createLiveQuizSession=async function(){
    if(liveQuizState.creatingQuiz||liveQuizState.session)return;
    const filters={...(liveQuizState.draftFilters||collectFilters()),gameMode:liveQuizState.gameMode||'classic'},pool=questionPool(filters),selectedQuestions=shuffle(pool).slice(0,100);
    if(filters.gameMode==='tug-of-brain'){filters.tugCorrectAnswers=liveQuizState.tugCorrectAnswers;filters.tugWinningScore=liveQuizState.tugWinningScore;}
    if(!pool.length){showToast('No matching non-calculator questions found',true);return;}
    liveQuizState.creatingQuiz=true;
    try{
    renderLiveQuiz();
    filters.questionIds=selectedQuestions.map(qid).filter(Boolean);
    filters.questionCount=filters.questionIds.length;
    const session={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),joinCode:newCode(),teacherId:currentUser?.id||'',teacherName:profileName(),filters,gameMode:filters.gameMode,status:'waiting',createdAt:new Date().toISOString()};
    try{if(supabaseClient){const {data,error}=await supabaseClient.from('live_quiz_sessions').insert({join_code:session.joinCode,teacher_id:session.teacherId,teacher_name:session.teacherName,filters,status:'waiting'}).select().single();if(!error&&data)session.id=data.id;else if(error)console.warn('Live Quiz Supabase session create failed:',error);}}catch(e){console.warn('Live Quiz Supabase session create failed:',e);}
    try{await saveLiveQuizSessionQuestions(session,selectedQuestions);}catch(e){console.warn('Could not save the Live Quiz question set:',e);}
    resetTugWinnerCelebration();liveQuizState.session=session;liveQuizState.sessionQuestions=[];liveQuizState.sessionQuestionsLoadedFor='';await loadLiveQuizSessionQuestions(session,true);liveQuizState.teacherAnswers=[];liveQuizState.studentAnswers=[];liveQuizState.teacherParticipants=[];liveQuizState.participantProfiles={};liveQuizState.powerUpEvents=[];liveQuizState.powerUpEventsUnavailable=false;liveQuizState.tugState={sessionId:session.id,team1Total:0,team2Total:0,winnerTeam:0};liveQuizState.tugStateUnavailable=false;liveQuizState.tugSelectedParticipantIds=[];liveQuizState.finalResultsView='podium';liveQuizState.teacherStatsTab='questions';liveQuizState.selectedStatsParticipantId='';liveQuizState.reviewQuestionId='';saveLocalSession(session);showToast(`Live Quiz lobby created with ${liveQuizState.sessionQuestions.length||filters.questionCount} question${(liveQuizState.sessionQuestions.length||filters.questionCount)===1?'':'s'}`);renderLiveQuiz();refreshLiveQuizData(session,true);startLiveQuizPolling();
    }catch(e){
      console.warn('Could not create Live Quiz:',e);
      liveQuizState.session=null;
      showToast('Could not create the quiz. Please try again.',true);
    }finally{
      liveQuizState.creatingQuiz=false;
      renderLiveQuiz();
    }
  };
  window.startLiveQuizSession=async function(){
    const session=liveQuizState.session;
    if(!session||session.status==='active')return;
    if((session.gameMode||session.filters?.gameMode)==='tug-of-brain'&&(!tugTeamParticipants(session,1).length||!tugTeamParticipants(session,2).length)){showToast('Add at least one student to each team',true);return;}
    session.status='active';
    session.filters={...(session.filters||{}),startedAt:new Date().toISOString()};
    saveLocalSession(session);
    try{if(supabaseClient){const {error}=await supabaseClient.from('live_quiz_sessions').update({status:'active',filters:session.filters}).eq('id',session.id);if(error)throw error;}}catch(e){console.warn('Could not start Live Quiz:',e);showToast('Could not start Live Quiz',true);session.status='waiting';saveLocalSession(session);return;}
    showToast('Live Quiz started');
    renderLiveQuiz();
  };
  window.resetLiveQuizSetup=function(){stopLiveQuizPolling();liveQuizState.session=null;liveQuizState.teacherAnswers=[];liveQuizState.studentAnswers=[];liveQuizState.teacherParticipants=[];liveQuizState.participantProfiles={};liveQuizState.powerUpEvents=[];liveQuizState.powerUpEventsUnavailable=false;liveQuizState.setupStep='filters';liveQuizState.draftFilters=null;liveQuizState.gameMode='classic';liveQuizState.finalResultsView='podium';liveQuizState.reviewQuestionId='';renderLiveQuiz();};
  window.endLiveQuizSession=async function(){
    const session=liveQuizState.session;if(!session)return;
    session.status='ended';session.endedAt=new Date().toISOString();saveLocalSession(session);
    try{if(supabaseClient)await supabaseClient.from('live_quiz_sessions').update({status:'ended',ended_at:session.endedAt}).eq('id',session.id);}catch(e){console.warn('Could not end Live Quiz session:',e);}
    stopLiveQuizPolling();resetTugWinnerCelebration();liveQuizState.session=null;liveQuizState.teacherAnswers=[];liveQuizState.studentAnswers=[];liveQuizState.teacherParticipants=[];liveQuizState.participantProfiles={};liveQuizState.powerUpEvents=[];liveQuizState.powerUpEventsUnavailable=false;liveQuizState.finalResultsView='podium';liveQuizState.reviewQuestionId='';renderLiveQuiz();
  };
  window.joinLiveQuizSession=async function(){
    if(liveQuizState.joining)return;
    const joinCode=val('lq-join-code').trim(),nickname=profileName();
    liveQuizState.joinCodeDraft=joinCode;
    if(!joinCode){showToast('Enter a quiz code',true);return;}
    liveQuizState.joinError='';
    liveQuizState.joining=true;
    renderLiveQuiz();
    let session=null;
    try{if(supabaseClient){const {data,error}=await supabaseClient.from('live_quiz_sessions').select('*').eq('join_code',joinCode).in('status',['waiting','active']).maybeSingle();if(!error&&data)session={id:data.id,joinCode:data.join_code,teacherId:data.teacher_id,teacherName:data.teacher_name,filters:data.filters||{},gameMode:data.filters?.gameMode||'classic',status:data.status,createdAt:data.created_at};}}catch(e){console.warn('Live Quiz Supabase join failed:',e);}
    if(!session)session=localSessions().find(s=>String(s.joinCode)===joinCode&&['waiting','active'].includes(s.status));
    if(!session){
      liveQuizState.joining=false;
      liveQuizState.joinError='Incorrect code. Check the code and try again.';
      renderLiveQuiz();
      setTimeout(()=>{const input=document.getElementById('lq-join-code');input?.focus();input?.select();},0);
      return;
    }
    liveQuizState.joinError='';
    liveQuizState.joinCodeDraft='';
    const participant={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),sessionId:session.id,nickname,userId:currentUser?.id||''};
    const timerKey=studentTimerKey(session,participant.userId);
    let startedAt=Number(localStorage.getItem(timerKey))||Date.now();
    try{
      if(supabaseClient){
        let existing=null;
        if(participant.userId){
          const result=await supabaseClient.from('live_quiz_participants').select('*').eq('session_id',session.id).eq('user_id',participant.userId).order('joined_at',{ascending:true}).limit(1).maybeSingle();
          if(!result.error)existing=result.data;
        }
        const result=existing?{data:existing,error:null}:await supabaseClient.from('live_quiz_participants').insert({session_id:session.id,user_id:participant.userId,nickname}).select().single();
        if(!result.error&&result.data){
          Object.assign(participant,participantFromRow(result.data));
          const serverStart=Date.parse(result.data.joined_at||'');
          if(Number.isFinite(serverStart))startedAt=Math.min(startedAt,serverStart);
        }else if(result.error)console.warn('Live Quiz Supabase participant create failed:',result.error);
      }
    }catch(e){console.warn('Live Quiz Supabase participant join failed:',e);}
    participant.joinedAt=new Date(startedAt).toISOString();
    if(session.status==='active'){
      localStorage.setItem(timerKey,String(startedAt));
      participant.startedAt=new Date(startedAt).toISOString();
    }
    const localStudentAnswers=localAnswers().filter(a=>String(a.sessionId)===String(session.id)&&((participant.userId&&String(a.userId)===String(participant.userId))||String(a.participantId)===String(participant.id)));
    const answered=new Set(localStudentAnswers.map(a=>String(a.questionId)));
    let restoredScore=localStudentAnswers.reduce((sum,answer)=>sum+(Number(answer.score)||0),0)+(Number(participant.scoreAdjustment)||0);
    try{
      if(supabaseClient){
        const {data,error}=await supabaseClient.from('live_quiz_answers').select('*').eq('session_id',session.id).eq('participant_id',participant.id).order('created_at',{ascending:true});
        if(!error){
          restoredScore=(data||[]).reduce((sum,row)=>sum+(Number(row.score)||0),0)+(Number(participant.scoreAdjustment)||0);
          (data||[]).forEach(row=>answered.add(String(row.question_id)));
          liveQuizState.studentAnswers=(data||[]).map(liveQuizAnswerFromRow);
        }
      }
    }catch(e){console.warn('Could not restore Live Quiz answers:',e);}
    if(participant.userId)liveQuizState.participantProfiles[String(participant.userId)]=await resolvedCurrentLiveQuizProfile();
    liveQuizState.joining=false;liveQuizState.session=session;liveQuizState.sessionQuestions=[];liveQuizState.sessionQuestionsLoadedFor='';await loadLiveQuizSessionQuestions(session,true);liveQuizState.participant=participant;liveQuizState.answeredIds=[...answered];liveQuizState.studentScore=Math.max(0,restoredScore);resetCardQuestReveal();
    if(!liveQuizState.studentAnswers.length)liveQuizState.studentAnswers=localStudentAnswers;
    if(currentGameMode()==='card-quest'){
      if(participant.cardQuestSupported)applyParticipantCardQuestState(participant);
      else restoreLocalCardQuest();
      await loadLiveQuizParticipants(session,false);
    }
    if(currentGameMode()==='tug-of-brain'){
      await Promise.all([loadLiveQuizParticipants(session,false),loadTugOfBrainState(session,false)]);
      const assigned=liveQuizState.teacherParticipants.find(item=>String(item.id)===String(participant.id));
      if(assigned)liveQuizState.participant={...liveQuizState.participant,...assigned};
    }
    if(session.status==='active'&&!liveQuizState.cardQuestPending)pickNextQuestion();renderLiveQuiz();startStudentTimer();startLiveQuizPolling();
  };
  window.updateLiveQuizJoinCode=function(input){
    liveQuizState.joinCodeDraft=input?.value||'';
    if(!liveQuizState.joinError)return;
    liveQuizState.joinError='';
    input?.classList.remove('invalid');
    input?.removeAttribute('aria-invalid');
    input?.removeAttribute('aria-describedby');
    document.getElementById('lq-join-error')?.remove();
  };
  window.leaveLiveQuizSession=async function(){
    const session=liveQuizState.session,participant=liveQuizState.participant;
    stopStudentTimer();
    stopLiveQuizPolling();
    try{
      if(supabaseClient&&session&&participant){
        let query=supabaseClient.from('live_quiz_participants').delete().eq('session_id',session.id);
        query=participant.userId?query.eq('user_id',participant.userId):query.eq('id',participant.id);
        const {error}=await query;
        if(error)throw error;
      }
    }catch(e){console.warn('Could not remove Live Quiz participant:',e);showToast('You left the quiz, but the lobby may take a moment to update',true);}
    if(participant?.userId)delete liveQuizState.participantProfiles[String(participant.userId)];
    liveQuizState.session=null;liveQuizState.participant=null;liveQuizState.currentQuestion=null;liveQuizState.answeredIds=[];liveQuizState.studentAnswers=[];liveQuizState.powerUpEvents=[];liveQuizState.tugState=null;liveQuizState.studentScore=0;liveQuizState.correctStreak=0;liveQuizState.cardQuestPending=false;liveQuizState.cardQuestCards=[];liveQuizState.finalResultsView='podium';liveQuizState.reviewQuestionId='';resetCardQuestReveal();renderLiveQuiz();
  };
  async function syncCardQuestStreak(correct){
    if(currentGameMode()!=='card-quest')return;
    liveQuizState.correctStreak=correct?liveQuizState.correctStreak+1:0;
    if(liveQuizState.correctStreak>=3&&!liveQuizState.cardQuestPending){
      liveQuizState.correctStreak=0;
      liveQuizState.cardQuestPending=true;
      liveQuizState.cardQuestCards=drawCardQuestCards();
      resetCardQuestReveal();
    }
    saveLocalCardQuest();
    if(!supabaseClient||!liveQuizState.participant?.id)return;
    try{
      const {data,error}=await supabaseClient.rpc('advance_card_quest_streak',{p_participant_id:liveQuizState.participant.id,p_correct:Boolean(correct)});
      if(error)throw error;
      if(data&&typeof data==='object')applyParticipantCardQuestState({correctStreak:data.correct_streak,cardQuestPending:data.card_quest_pending,cardQuestCards:data.card_quest_cards,scoreAdjustment:data.score_adjustment});
    }catch(e){console.warn('Could not sync Card Quest streak:',e);}
  }
  async function syncTugOfBrainStreak(correct){
    if(currentGameMode()!=='tug-of-brain'||!supabaseClient||!liveQuizState.participant?.id)return;
    try{
      const {data,error}=await supabaseClient.rpc('advance_tug_of_brain_streak',{p_participant_id:liveQuizState.participant.id,p_correct:Boolean(correct)});
      if(error)throw error;
      if(data&&typeof data==='object'){
        liveQuizState.participant={...liveQuizState.participant,tugCorrectStreak:Number(data.correct_streak)||0};
        liveQuizState.tugState={sessionId:liveQuizState.session.id,team1Total:Number(data.team_1_total)||0,team2Total:Number(data.team_2_total)||0,winnerTeam:Number(data.winner_team)||0};
        if(data.winner_team){
          liveQuizState.session.status='ended';
          stopStudentTimer();
          await loadLiveQuizPodium(liveQuizState.session,false);
          renderLiveQuiz();
        }
      }
    }catch(e){console.warn('Could not sync Tug of Brain streak:',e);}
  }
  function localCardQuestScore(powerUp){
    const score=Math.max(0,Number(liveQuizState.studentScore)||0);
    if(powerUp.id==='double')return score*2;
    if(powerUp.id==='half')return Math.floor(score/2);
    if(powerUp.id.startsWith('increase-'))return score+Math.round(score*(Number(powerUp.id.split('-')[1])||0)/100);
    if(powerUp.id.startsWith('plus-'))return score+(Number(powerUp.id.split('-')[1])||0);
    if(powerUp.id.startsWith('minus-'))return Math.max(0,score-(Number(powerUp.id.split('-')[1])||0));
    return score;
  }
  window.openCardQuestTargets=async function(){
    const session=liveQuizState.session,participantId=liveQuizState.participant?.id,index=liveQuizState.cardQuestSelected,card=liveQuizState.cardQuestCards[index];
    if(!session||session.status!=='active'||timeRemainingMs()<=0||!card?.id?.startsWith('steal-')||!liveQuizState.cardQuestRevealed||liveQuizState.cardQuestApplied||liveQuizState.cardQuestApplying||liveQuizState.cardQuestTargetOpen)return;
    liveQuizState.cardQuestTargetTimer=null;
    liveQuizState.cardQuestTargetOpen=true;
    liveQuizState.cardQuestTargetLoading=true;
    renderLiveQuiz();
    document.querySelector('.card-quest-target-dialog')?.focus();
    await Promise.all([loadLiveQuizParticipants(session,false),loadLiveQuizAnswers(session,false)]);
    if(liveQuizState.session!==session||liveQuizState.participant?.id!==participantId||liveQuizState.cardQuestSelected!==index||!liveQuizState.cardQuestTargetOpen)return;
    if(session.status!=='active'||timeRemainingMs()<=0){resetCardQuestTargetDialog();renderLiveQuiz();return;}
    liveQuizState.cardQuestTargetLoading=false;
    renderLiveQuiz();
    (document.querySelector('.card-quest-target-player')||document.querySelector('.card-quest-target-empty button')||document.querySelector('.card-quest-target-dialog'))?.focus();
  };
  window.closeCardQuestTargets=function(event){
    if(event&&event.target!==event.currentTarget)return;
    if(liveQuizState.cardQuestApplying)return;
    resetCardQuestTargetDialog();
    renderLiveQuiz();
    document.querySelector('.card-quest-open-targets')?.focus();
  };
  window.handleCardQuestTargetKeydown=function(event){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();window.closeCardQuestTargets();return;}
    if(event.key!=='Tab')return;
    const buttons=[...event.currentTarget.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons[buttons.length-1];
    if(!first){event.preventDefault();event.currentTarget.focus();return;}
    if(document.activeElement===event.currentTarget){event.preventDefault();(event.shiftKey?last:first).focus();return;}
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  window.chooseCardQuestCard=async function(index){
    if(liveQuizState.cardQuestRevealed||liveQuizState.cardQuestApplying)return;
    const card=liveQuizState.cardQuestCards[index];
    if(!card)return;
    liveQuizState.cardQuestSelected=index;
    liveQuizState.cardQuestRevealed=true;
    liveQuizState.cardQuestAnimate=true;
    liveQuizState.cardQuestMessage=card.id.startsWith('steal-')?'Choose a student to steal from.':'Applying power-up...';
    if(card.id.startsWith('steal-')){
      const session=liveQuizState.session,participantId=liveQuizState.participant?.id;
      liveQuizState.cardQuestTargetTimer=setTimeout(()=>{
        liveQuizState.cardQuestTargetTimer=null;
        if(liveQuizState.session!==session||liveQuizState.participant?.id!==participantId||liveQuizState.cardQuestSelected!==index||!liveQuizState.cardQuestRevealed||liveQuizState.cardQuestApplied)return;
        liveQuizState.cardQuestAnimate=false;
        window.openCardQuestTargets();
      },2000);
    }
    renderLiveQuiz();
    if(!card.id.startsWith('steal-')){
      await new Promise(resolve=>setTimeout(resolve,1000));
      liveQuizState.cardQuestAnimate=false;
      await window.applyCardQuestPowerUp(null);
    }
  };
  window.applyCardQuestPowerUp=async function(targetParticipantId=null){
    const card=liveQuizState.cardQuestCards[liveQuizState.cardQuestSelected];
    if(!card||liveQuizState.cardQuestApplying||liveQuizState.cardQuestApplied)return false;
    if(card.id.startsWith('steal-')&&targetParticipantId&&!cardQuestTargets().some(participant=>String(participant.id)===String(targetParticipantId)))return false;
    const noStealTargets=card.id.startsWith('steal-')&&cardQuestTargets().length===0;
    if(card.id.startsWith('steal-')&&!targetParticipantId&&!noStealTargets)return false;
    liveQuizState.cardQuestApplying=true;
    liveQuizState.cardQuestMessage='Applying power-up...';
    renderLiveQuiz();
    let applied=false;
    try{
      if(supabaseClient&&liveQuizState.participant?.id){
        const {data,error}=await supabaseClient.rpc('apply_card_quest_powerup_with_activity',{p_participant_id:liveQuizState.participant.id,p_card_index:liveQuizState.cardQuestSelected,p_target_participant_id:targetParticipantId||null});
        if(error)throw error;
        if(data&&typeof data==='object'){
          liveQuizState.studentScore=Math.max(0,Number(data.score)||0);
          liveQuizState.participant.scoreAdjustment=Number(data.score_adjustment)||0;
          applied=true;
        }
      }
    }catch(e){console.warn('Could not apply Card Quest power-up:',e);}
    if(!applied&&!card.id.startsWith('steal-')){
      liveQuizState.studentScore=localCardQuestScore(card);
      applied=true;
    }
    if(!applied&&noStealTargets)applied=true;
    liveQuizState.cardQuestApplying=false;
    liveQuizState.cardQuestApplied=applied;
    liveQuizState.cardQuestMessage=applied?`${card.label} applied`:'This power-up could not be applied. Please try again.';
    if(applied){resetCardQuestTargetDialog();liveQuizState.cardQuestPending=false;liveQuizState.correctStreak=0;saveLocalCardQuest();}
    renderLiveQuiz();
    return applied;
  };
  window.skipCardQuestNoTarget=async function(event){
    event?.stopPropagation();
    const card=liveQuizState.cardQuestCards[liveQuizState.cardQuestSelected];
    if(!card?.id?.startsWith('steal-')||cardQuestTargets().length||liveQuizState.cardQuestApplying)return;
    const applied=await window.applyCardQuestPowerUp(null);
    if(applied)window.continueCardQuest();
  };
  window.continueCardQuest=function(){
    if(!liveQuizState.cardQuestApplied)return;
    liveQuizState.cardQuestCards=[];
    resetCardQuestReveal();
    saveLocalCardQuest();
    pickNextQuestion();
    renderLiveQuiz();
  };
  window.selectLiveQuizOption=function(index,event){
    event?.stopPropagation();
    if(liveQuizState.checked||timeRemainingMs()<=0)return;
    liveQuizState.selected=index;
    const classic=usesClassicQuestionFlow();
    if(classic)window.checkLiveQuizAnswer();
    else renderLiveQuiz();
  };
  window.advanceClassicLiveQuiz=function(event){
    event?.stopPropagation();
    const classic=usesClassicQuestionFlow();
    if(!classic||!liveQuizState.checked||timeRemainingMs()<=0)return;
    if(currentGameMode()==='card-quest'&&liveQuizState.cardQuestPending){renderLiveQuiz();return;}
    pickNextQuestion();
    renderLiveQuiz();
  };
  window.nextLiveQuizQuestion=function(){
    if(!liveQuizState.checked||timeRemainingMs()<=0)return;
    pickNextQuestion();
    renderLiveQuiz();
  };
  window.checkLiveQuizAnswer=async function(){
    const q=liveQuizState.currentQuestion;if(!q||liveQuizState.selected==null||liveQuizState.checked)return;
    if(timeRemainingMs()<=0){renderLiveQuiz();return;}
    const correct=Number(liveQuizState.selected)===Number(q.correct||0);
    liveQuizState.checked=true;liveQuizState.lastFeedback=correct?'Correct':'Incorrect';liveQuizState.answeredIds.push(qid(q));
    if(correct)liveQuizState.studentScore+=1;
    const answer={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),sessionId:liveQuizState.session.id,participantId:liveQuizState.participant.id,userId:currentUser?.id||'',nickname:liveQuizState.participant.nickname,questionId:qid(q),selectedAnswer:liveQuizState.selected,correct,score:correct?1:0,createdAt:new Date().toISOString()};
    saveLocalAnswer(answer);
    liveQuizState.studentAnswers.push(answer);
    const classic=usesClassicQuestionFlow();
    if(!classic||!updateClassicLiveQuizAnswerUi(correct))renderLiveQuiz();
    const cardQuestSync=syncCardQuestStreak(correct);
    try{if(supabaseClient)await supabaseClient.from('live_quiz_answers').insert({session_id:answer.sessionId,participant_id:answer.participantId,user_id:answer.userId,nickname:answer.nickname,question_id:answer.questionId,selected_answer:answer.selectedAnswer,correct:answer.correct,score:answer.score});}catch(e){console.warn('Live Quiz Supabase answer save failed:',e);}
    await cardQuestSync;
    await syncTugOfBrainStreak(correct);
  };
})();











