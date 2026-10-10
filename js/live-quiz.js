// Live Quiz: first version for filtered continuous multiple-choice practice.
(function(){
  const SESSION_KEY='quero_live_quiz_sessions_v1';
  const ANSWER_KEY='quero_live_quiz_answers_v1';
  const LIVE_QUIZ_DIAGRAM_IMAGE_SCALE=0.38;
  const liveQuizState={session:null,participant:null,currentQuestion:null,optionOrder:[],selected:null,checked:false,answeredIds:[],studentScore:0,lastFeedback:'',teacherAnswers:[],teacherParticipants:[],participantProfiles:{},loadingAnswers:false,loadingParticipants:false,questionsLoading:false,questionLoadError:'',questionLoadRequest:0,pollTimer:null,timerInterval:null,teacherTimerInterval:null,setupStep:'filters',draftFilters:null,gameMode:'classic',joinCodeDraft:'',joinError:''};

  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function dataArray(value,field=''){
    if(typeof splitCreatorMultiValue==='function')return splitCreatorMultiValue(value,field);
    if(Array.isArray(value))return [...new Set(value.map(v=>String(v).trim()).filter(Boolean))];
    const text=String(value||'').trim();
    if(!text)return [];
    const splitter=field==='skills'?/[;\n]+/:/[;,\n]+/;
    return [...new Set(text.split(splitter).map(v=>v.trim()).filter(Boolean))];
  }
  function allQs(){try{return Array.isArray(questions)?questions.map(q=>typeof normalizeQuestion==='function'?normalizeQuestion(q):q):[];}catch(e){return Array.isArray(window.questions)?window.questions:[];}}
  function qid(q){return String(q?.supabaseId||q?.id||'');}
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
    const centerStatus=isStudent()&&liveQuizState.participant&&liveQuizState.session?.status==='active'?`<div class="live-quiz-header-score"><span>Score</span><strong>${liveQuizState.studentScore}</strong></div>`:!isStudent()&&liveQuizState.session?.status==='active'?`<div class="live-quiz-header-active"><strong><i class="ti ti-clock"></i><span id="lq-teacher-time">${teacherTimeRemainingText()}</span></strong></div>`:'';
    const studentActive=isStudent()&&liveQuizState.participant&&liveQuizState.session?.status==='active';
    root.innerHTML=`<header class="live-quiz-brandbar"><div class="live-quiz-brand"><img src="assets/images/app-logo.png" alt=""><span>Quero Learning Tools</span></div>${centerStatus}${teacherCode||studentLeave}</header><div class="live-quiz-content${!isStudent()&&liveQuizState.session?' live-quiz-lobby-content':''}${studentActive?' live-quiz-student-active':''}">${isStudent()?studentScreen():teacherScreen()}</div>`;
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
    root?.querySelectorAll?.('.live-quiz-question-card img.q-diagram,.live-quiz-option img').forEach(img=>{
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
      if(typeof supabaseClient!=='undefined'&&supabaseClient&&typeof loadQuestionsFromSupabase==='function')await loadQuestionsFromSupabase();
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
  function teacherSetup(){
    const filters=liveQuizState.draftFilters||{quizTimeMinutes:10};
    return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-form-card live-quiz-setup-card"><h2>Create Live Quiz</h2>${renderFilters(filters)}<div class="live-quiz-form-actions"><button type="button" onclick="closeLiveQuiz()">Cancel</button><button type="button" class="primary" onclick="showLiveQuizGameMode()">Next <i class="ti ti-arrow-right"></i></button></div></section></div>`;
  }
  function gameModeLabel(mode){return mode==='speed'?'Speed round':mode==='team'?'Team battle':'Classic';}
  function gameModeHeading(mode){return mode==='speed'?'Speed Round Mode':mode==='team'?'Team Battle Mode':'Classic Mode';}
  function gameModeContext(filters){
    const details=[filters.subject,filters.questionType==='tf'?'True or False':filters.questionType==='mc'?'Multiple Choice':'Any question type'];
    const topicCount=dataArray(filters.topic,'topic').length;
    if(topicCount)details.push(`${topicCount} topic${topicCount===1?'':'s'} selected`);
    return details.filter(Boolean).join(' &middot; ');
  }
  function gameModeOption(mode,icon,title,description){
    const selected=liveQuizState.gameMode===mode;
    return `<label class="live-quiz-game-option${selected?' selected':''}"><input type="radio" name="lq-game-mode" value="${mode}"${selected?' checked':''} onchange="selectLiveQuizGameMode('${mode}',this)"><span class="live-quiz-game-icon"><i class="ti ti-${icon}"></i></span><span class="live-quiz-game-copy"><strong>${title}</strong><small>${description}</small></span></label>`;
  }
  function teacherGameMode(){
    const filters=liveQuizState.draftFilters||{quizTimeMinutes:10};
    return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-form-card live-quiz-game-card"><div class="live-quiz-game-head"><h2>Game Mode</h2><div class="live-quiz-game-time"><i class="ti ti-clock"></i>${esc(filters.quizTimeMinutes||10)} min</div></div><div class="live-quiz-game-context">${gameModeContext(filters)}</div><fieldset class="live-quiz-game-options"><legend>Choose game mode</legend>${gameModeOption('classic','list-check','Classic','Students answer independently at their own pace.')}${gameModeOption('speed','clock-bolt','Speed round','Students race through questions against the quiz timer.')}${gameModeOption('team','users-group','Team battle','Student scores contribute to a shared team total.')}</fieldset><div class="live-quiz-form-actions live-quiz-game-actions"><button type="button" onclick="backToLiveQuizSetup()"><i class="ti ti-arrow-left"></i> Back</button><button type="button" class="primary" onclick="createLiveQuizSession()"><i class="ti ti-player-play"></i> Create Quiz</button></div></section></div>`;
  }
  function teacherLobby(session){
    if(session.status==='active'&&(session.gameMode||session.filters?.gameMode||'classic')==='classic')return teacherClassicRanking(session);
    const participants=teacherParticipantsFor(session),started=session.status==='active';
    return `<div class="live-quiz-lobby"><div class="live-quiz-lobby-toolbar"><div class="live-quiz-lobby-count"><i class="ti ti-users"></i><strong>${participants.length}</strong></div><h1>${gameModeHeading(session.gameMode||session.filters?.gameMode)}</h1><button type="button" class="live-quiz-start-btn" onclick="startLiveQuizSession()"${started?' disabled':''}><i class="ti ti-player-play"></i>${started?'Started':'Start'}</button></div><div class="live-quiz-lobby-divider"></div><div class="live-quiz-lobby-students">${participants.length?participants.map(liveQuizParticipantTile).join(''):'<div class="live-quiz-lobby-empty"><i class="ti ti-users"></i><span>Waiting for students to join</span></div>'}</div>${participants.length?'<div class="live-quiz-lobby-waiting"><span></span>Waiting for students to join</div>':''}<div class="live-quiz-lobby-footer"><span>${esc(gameModeLabel(session.gameMode||session.filters?.gameMode||'classic'))} mode</span><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div></div>`;
  }
  function teacherClassicRanking(session){
    const participants=teacherParticipantsFor(session),answers=teacherAnswersFor(session);
    const ranking=participants.map(participant=>({participant,score:answers.filter(answer=>answer.correct&&((participant.userId&&String(answer.userId)===String(participant.userId))||String(answer.participantId)===String(participant.id))).length})).sort((a,b)=>b.score-a.score||String(a.participant.nickname||'').localeCompare(String(b.participant.nickname||'')));
    return `<div class="live-quiz-ranking"><div class="live-quiz-ranking-head"><div><h1>Student Ranking</h1><p>Classic mode &middot; ${participants.length} student${participants.length===1?'':'s'}</p></div><div class="live-quiz-ranking-live"><span></span>Live</div></div><div class="live-quiz-ranking-table"><div class="live-quiz-ranking-row header"><span>Rank</span><span>Student name</span><span>Score</span></div>${ranking.length?ranking.map((entry,index)=>`<div class="live-quiz-ranking-row"><strong class="rank-${index+1}">${index+1}</strong><div><span class="live-quiz-participant-avatar${String(liveQuizProfileFor(entry.participant).avatar_color||'')==='transparent'?' transparent':''}" style="background:${esc(liveQuizProfileFor(entry.participant).avatar_color||'#0b7ea4')}">${liveQuizParticipantAvatar(entry.participant)}</span><span>${esc(entry.participant.nickname||'Student')}</span></div><b>${entry.score}</b></div>`).join(''):'<div class="live-quiz-ranking-empty">Waiting for student scores</div>'}</div><div class="live-quiz-lobby-footer"><span>${questionPool(session.filters).length} questions rotating randomly</span><button type="button" onclick="endLiveQuizSession()"><i class="ti ti-square"></i>End Session</button></div></div>`;
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
    liveQuizState.teacherTimerInterval=setInterval(()=>{
      const display=document.getElementById('lq-teacher-time');
      if(display)display.textContent=teacherTimeRemainingText();
      if(teacherTimeRemainingMs()<=0)stopTeacherHeaderTimer();
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
    liveQuizState.timerInterval=setInterval(()=>{
      const display=document.getElementById('lq-time-remaining');
      if(display)display.textContent=timeRemainingText();
      if(timeRemainingMs()<=0){stopStudentTimer();renderLiveQuiz();}
    },1000);
  }
  function studentScreen(){
    const session=liveQuizState.session,participant=liveQuizState.participant;
    if(!session||!participant){
      const invalid=Boolean(liveQuizState.joinError);
      return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-form-card live-quiz-join-card"><h2>Join Live Quiz</h2><div class="live-quiz-grid"><label>Quiz code<input id="lq-join-code" class="${invalid?'invalid':''}" value="${esc(liveQuizState.joinCodeDraft)}" placeholder="Enter quiz code" maxlength="6" autocomplete="off" ${invalid?'aria-invalid="true" aria-describedby="lq-join-error"':''} oninput="updateLiveQuizJoinCode(this)" onkeydown="if(event.key==='Enter')joinLiveQuizSession()"></label>${invalid?`<div id="lq-join-error" class="live-quiz-join-error" role="alert"><i class="ti ti-alert-circle"></i><span>${esc(liveQuizState.joinError)}</span></div>`:''}</div><div class="live-quiz-form-actions"><button type="button" onclick="closeLiveQuiz()">Cancel</button><button type="button" class="primary" onclick="joinLiveQuizSession()">Join</button></div></section></div>`;
    }
    if(session.status==='waiting'){
      const profile=liveQuizProfileFor(participant),color=String(profile.avatar_color||'#0b7ea4');
      return `<div class="live-quiz-setup-wrap"><section class="live-quiz-card live-quiz-loading-card live-quiz-waiting-card" role="status"><span class="live-quiz-waiting-avatar${color==='transparent'?' transparent':''}" style="background:${esc(color)}">${liveQuizParticipantAvatar(participant)}</span><h2>You're in</h2><p>Waiting for your teacher to start Quero Live Quiz.</p><button type="button" onclick="leaveLiveQuizSession()">Leave</button></section></div>`;
    }
    if(session.status==='ended')return `<div class="live-quiz-empty"><i class="ti ti-flag-check"></i><h2>Quiz ended</h2><p>Your final score is ${liveQuizState.studentScore} point${liveQuizState.studentScore===1?'':'s'}.</p><button type="button" class="btn" onclick="leaveLiveQuizSession()">Leave Quiz</button></div>`;
    const classic=(session.gameMode||session.filters?.gameMode||'classic')==='classic';
    return `<div class="live-quiz-card live-quiz-panel live-quiz-student-panel${classic?' live-quiz-classic-panel':''}">${studentQuestionArea()}</div>`;
  }
  function studentQuestionArea(){
    if(timeRemainingMs()<=0)return `<div class="live-quiz-empty"><i class="ti ti-clock"></i><h2>Time's up</h2><p>You answered ${liveQuizState.answeredIds.length} question${liveQuizState.answeredIds.length===1?'':'s'}.</p></div>`;
    if(!liveQuizState.currentQuestion)pickNextQuestion();
    const q=liveQuizState.currentQuestion;
    if(!q)return `<div class="live-quiz-empty"><i class="ti ti-check"></i><h2>No more questions</h2><p>You have answered all matching questions in this session.</p></div>`;
    const classic=(liveQuizState.session?.gameMode||liveQuizState.session?.filters?.gameMode||'classic')==='classic';
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
    const checked=liveQuizState.checked,selected=liveQuizState.selected,correct=Number(q.correct)||0,classic=(liveQuizState.session?.gameMode||liveQuizState.session?.filters?.gameMode||'classic')==='classic';
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
  async function loadLiveQuizParticipants(session,rerender=true){
    if(!session||!supabaseClient)return;
    liveQuizState.loadingParticipants=true;
    try{
      const {data,error}=await supabaseClient.from('live_quiz_participants').select('*').eq('session_id',session.id).order('joined_at',{ascending:true});
      if(!error&&Array.isArray(data)){
        liveQuizState.teacherParticipants=data.map(row=>({id:row.id,sessionId:row.session_id,userId:row.user_id,nickname:row.nickname,joinedAt:row.joined_at}));
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

  async function refreshLiveQuizData(session=liveQuizState.session,rerender=true){
    if(!session||!supabaseClient){if(rerender)renderLiveQuiz();return;}
    await Promise.all([loadLiveQuizParticipants(session,false),loadLiveQuizAnswers(session,false)]);
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
    try{
      if(supabaseClient){
        const result=await supabaseClient.from('live_quiz_sessions').select('status,filters').eq('id',session.id).maybeSingle();
        if(!result.error&&result.data)next=result.data;
      }
    }catch(e){console.warn('Could not refresh Live Quiz status:',e);}
    if(!next){
      const local=localSessions().find(item=>String(item.id)===String(session.id));
      if(local)next={status:local.status,filters:local.filters};
    }
    if(!next||next.status===session.status)return;
    session.status=next.status;
    session.filters=next.filters||session.filters;
    if(session.status==='active'){
      const timerKey=studentTimerKey(session,liveQuizState.participant.userId),startedAt=Number(localStorage.getItem(timerKey))||Date.now();
      localStorage.setItem(timerKey,String(startedAt));
      liveQuizState.participant.startedAt=new Date(startedAt).toISOString();
      pickNextQuestion();
      startStudentTimer();
    }else if(session.status==='ended')stopStudentTimer();
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
    stopLiveQuizPolling();
    stopStudentTimer();
    stopTeacherHeaderTimer();
    if(!liveQuizState.session){liveQuizState.setupStep='filters';liveQuizState.draftFilters=null;liveQuizState.gameMode='classic';liveQuizState.joinCodeDraft='';liveQuizState.joinError='';}
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
  window.refreshLiveQuizAnswers=function(){if(liveQuizState.session)refreshLiveQuizData(liveQuizState.session,true);else renderLiveQuiz();};
  window.showLiveQuizGameMode=function(){
    const filters=collectFilters(),pool=questionPool(filters);
    if(!pool.length){showToast('No matching non-calculator questions found',true);return;}
    liveQuizState.draftFilters=filters;
    liveQuizState.setupStep='mode';
    renderLiveQuiz();
  };
  window.backToLiveQuizSetup=function(){liveQuizState.setupStep='filters';renderLiveQuiz();};
  window.selectLiveQuizGameMode=function(mode,input){
    liveQuizState.gameMode=['classic','speed','team'].includes(mode)?mode:'classic';
    const root=input?.closest('.live-quiz-game-options');
    root?.querySelectorAll('.live-quiz-game-option').forEach(option=>option.classList.toggle('selected',option.contains(input)));
  };
  window.createLiveQuizSession=async function(){
    const filters={...(liveQuizState.draftFilters||collectFilters()),gameMode:liveQuizState.gameMode||'classic'},pool=questionPool(filters);
    if(!pool.length){showToast('No matching non-calculator questions found',true);return;}
    const session={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),joinCode:newCode(),teacherId:currentUser?.id||'',teacherName:profileName(),filters,gameMode:filters.gameMode,status:'waiting',createdAt:new Date().toISOString()};
    try{if(supabaseClient){const {data,error}=await supabaseClient.from('live_quiz_sessions').insert({join_code:session.joinCode,teacher_id:session.teacherId,teacher_name:session.teacherName,filters,status:'waiting'}).select().single();if(!error&&data)session.id=data.id;else if(error)console.warn('Live Quiz Supabase session create failed:',error);}}catch(e){console.warn('Live Quiz Supabase session create failed:',e);}
    liveQuizState.session=session;liveQuizState.teacherAnswers=[];liveQuizState.teacherParticipants=[];liveQuizState.participantProfiles={};saveLocalSession(session);showToast('Live Quiz lobby created');renderLiveQuiz();refreshLiveQuizData(session,true);startLiveQuizPolling();
  };
  window.startLiveQuizSession=async function(){
    const session=liveQuizState.session;
    if(!session||session.status==='active')return;
    session.status='active';
    session.filters={...(session.filters||{}),startedAt:new Date().toISOString()};
    saveLocalSession(session);
    try{if(supabaseClient){const {error}=await supabaseClient.from('live_quiz_sessions').update({status:'active',filters:session.filters}).eq('id',session.id);if(error)throw error;}}catch(e){console.warn('Could not start Live Quiz:',e);showToast('Could not start Live Quiz',true);session.status='waiting';saveLocalSession(session);return;}
    showToast('Live Quiz started');
    renderLiveQuiz();
  };
  window.resetLiveQuizSetup=function(){stopLiveQuizPolling();liveQuizState.session=null;liveQuizState.teacherAnswers=[];liveQuizState.teacherParticipants=[];liveQuizState.participantProfiles={};liveQuizState.setupStep='filters';liveQuizState.draftFilters=null;liveQuizState.gameMode='classic';renderLiveQuiz();};
  window.endLiveQuizSession=async function(){
    const session=liveQuizState.session;if(!session)return;
    session.status='ended';session.endedAt=new Date().toISOString();saveLocalSession(session);
    try{if(supabaseClient)await supabaseClient.from('live_quiz_sessions').update({status:'ended',ended_at:session.endedAt}).eq('id',session.id);}catch(e){console.warn('Could not end Live Quiz session:',e);}
    stopLiveQuizPolling();liveQuizState.session=null;liveQuizState.teacherAnswers=[];liveQuizState.teacherParticipants=[];liveQuizState.participantProfiles={};renderLiveQuiz();
  };
  window.joinLiveQuizSession=async function(){
    const joinCode=val('lq-join-code').trim(),nickname=profileName();
    liveQuizState.joinCodeDraft=joinCode;
    if(!joinCode){showToast('Enter a quiz code',true);return;}
    let session=null;
    try{if(supabaseClient){const {data,error}=await supabaseClient.from('live_quiz_sessions').select('*').eq('join_code',joinCode).in('status',['waiting','active']).maybeSingle();if(!error&&data)session={id:data.id,joinCode:data.join_code,teacherId:data.teacher_id,teacherName:data.teacher_name,filters:data.filters||{},gameMode:data.filters?.gameMode||'classic',status:data.status,createdAt:data.created_at};}}catch(e){console.warn('Live Quiz Supabase join failed:',e);}
    if(!session)session=localSessions().find(s=>String(s.joinCode)===joinCode&&['waiting','active'].includes(s.status));
    if(!session){
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
          const result=await supabaseClient.from('live_quiz_participants').select('id,joined_at').eq('session_id',session.id).eq('user_id',participant.userId).order('joined_at',{ascending:true}).limit(1).maybeSingle();
          if(!result.error)existing=result.data;
        }
        const result=existing?{data:existing,error:null}:await supabaseClient.from('live_quiz_participants').insert({session_id:session.id,user_id:participant.userId,nickname}).select().single();
        if(!result.error&&result.data){
          participant.id=result.data.id;
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
    let restoredScore=localStudentAnswers.filter(answer=>answer.correct).length;
    try{
      if(supabaseClient){
        const {data,error}=await supabaseClient.from('live_quiz_answers').select('question_id,correct,score').eq('session_id',session.id).eq('participant_id',participant.id);
        if(!error){
          restoredScore=(data||[]).filter(row=>row.correct).length;
          (data||[]).forEach(row=>answered.add(String(row.question_id)));
        }
      }
    }catch(e){console.warn('Could not restore Live Quiz answers:',e);}
    if(participant.userId)liveQuizState.participantProfiles[String(participant.userId)]=await resolvedCurrentLiveQuizProfile();
    liveQuizState.session=session;liveQuizState.participant=participant;liveQuizState.answeredIds=[...answered];liveQuizState.studentScore=restoredScore;if(session.status==='active')pickNextQuestion();renderLiveQuiz();startStudentTimer();startLiveQuizPolling();
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
    liveQuizState.session=null;liveQuizState.participant=null;liveQuizState.currentQuestion=null;liveQuizState.answeredIds=[];liveQuizState.studentScore=0;renderLiveQuiz();
  };
  window.selectLiveQuizOption=function(index,event){
    event?.stopPropagation();
    if(liveQuizState.checked||timeRemainingMs()<=0)return;
    liveQuizState.selected=index;
    const classic=(liveQuizState.session?.gameMode||liveQuizState.session?.filters?.gameMode||'classic')==='classic';
    if(classic)window.checkLiveQuizAnswer();
    else renderLiveQuiz();
  };
  window.advanceClassicLiveQuiz=function(event){
    event?.stopPropagation();
    const classic=(liveQuizState.session?.gameMode||liveQuizState.session?.filters?.gameMode||'classic')==='classic';
    if(!classic||!liveQuizState.checked||timeRemainingMs()<=0)return;
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
    const classic=(liveQuizState.session?.gameMode||liveQuizState.session?.filters?.gameMode||'classic')==='classic';
    if(!classic||!updateClassicLiveQuizAnswerUi(correct))renderLiveQuiz();
    try{if(supabaseClient)await supabaseClient.from('live_quiz_answers').insert({session_id:answer.sessionId,participant_id:answer.participantId,user_id:answer.userId,nickname:answer.nickname,question_id:answer.questionId,selected_answer:answer.selectedAnswer,correct:answer.correct,score:answer.score});}catch(e){console.warn('Live Quiz Supabase answer save failed:',e);}
  };
})();











