// Study Mode: fullscreen student practice workspace.
(function(){
  const LETTERS=['A','B','C','D'];
  // Adjust this value to change Study Mode diagram/image size. 0.30 = 30% of the uploaded image's natural width.
  const STUDY_DIAGRAM_IMAGE_SCALE=0.35;
  const QUESTION_TYPE_ORDER={mc:0,tf:0,sa:1,er:2};
  const studyState={
    subject:'',
    topic:'',
    subtopic:'',
    skills:[],
    difficulty:'',
    calculator:'',
    yearLevel:'',
    questionLimit:0,
    questionType:'',
    skillsOpen:false,
    currentIndex:0,
    answerToken:Date.now(),
    selectedAnswers:{},
    checkedAnswers:{},
    filtersHidden:false,
    zoom:100,
  timerKey:'',
  timerStartedAt:0,
  timerElapsedMs:0,
  timerRunning:false,
  timerChecked:false,
  timerCollapsed:false,
  timerInterval:null,
  videoFullscreenActive:false,
  learningCollapsed:true,
  learningTab:''
};

  function htmlEscape(value){
    return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function jsEscape(value){return String(value??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');}
  function plainTextFromStudyHtml(html){
    if(typeof plainTextFromHtml==='function')return plainTextFromHtml(html||'');
    const div=document.createElement('div');div.innerHTML=html||'';return div.innerText.trim();
  }
  function richText(value){
    if(value==null)return '';
    const text=String(value);
    if(/<[^>]+>|data-latex|bf-equation/.test(text))return text;
    return htmlEscape(text).replace(/\n/g,'<br>');
  }
  function showTextHtml(html,text){return richText(html||text||'');}
  function dataArray(value,field=''){
    if(typeof splitCreatorMultiValue==='function')return splitCreatorMultiValue(value,field);
    if(Array.isArray(value))return [...new Set(value.map(v=>String(v).trim()).filter(Boolean))];
    const text=String(value||'').trim();
    if(!text)return [];
    const split=field==='skills'?text.split(/[;\n]+/):text.split(/[,;\n]+/);
    return [...new Set(split.map(v=>v.trim()).filter(Boolean))];
  }
  function allQuestions(){
    try{if(Array.isArray(questions))return questions.map(q=>typeof normalizeQuestion==='function'?normalizeQuestion(q):q);}catch(err){}
    return Array.isArray(window.questions)?window.questions:[];
  }
  function currentLearningArea(){
    try{return activeCurriculumLearningArea();}catch(err){return 'Mathematics';}
  }
  function unique(values){return [...new Set(values.map(v=>String(v||'').trim()).filter(Boolean))];}
  function sameStudyValue(a,b){return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();}
  function curriculumLinkSubjects(link){
    return dataArray(link?.subjects||link?.linkedSubjects||link?.subject,'subjects');
  }
  function curriculumLinkYearLevels(link){
    return dataArray(link?.yearLevels||link?.linkedYearLevels||link?.year_level||link?.yearLevel,'yearLevels');
  }
  function safeCurriculumSkills(topic,subtopic){
    try{return curriculumSkills(topic,subtopic,currentLearningArea())||[];}catch(err){return [];}
  }
  function curriculumLinkMatchesStudyScope(link){
    const subjects=curriculumLinkSubjects(link);
    if(studyState.subject&&(!subjects.length||!subjects.some(subject=>sameStudyValue(subject,studyState.subject))))return false;
    const yearLevels=curriculumLinkYearLevels(link);
    if(studyState.yearLevel&&yearLevels.length&&!yearLevels.some(level=>sameStudyValue(level,studyState.yearLevel)))return false;
    return true;
  }
  function curriculumSubtopicMatchesStudyScope(topic,subtopic){
    const links=safeCurriculumSkills(topic,subtopic);
    if(!studyState.subject&&!studyState.yearLevel)return links.length>0;
    return links.some(curriculumLinkMatchesStudyScope);
  }
  function curriculumTopicMatchesStudyScope(topic){
    let subtopics=[];
    try{subtopics=curriculumSubtopics(topic,currentLearningArea())||[];}catch(err){}
    return subtopics.some(subtopic=>curriculumSubtopicMatchesStudyScope(topic,subtopic));
  }
  function questionHasSelectedType(q){
    return !studyState.questionType||String(q.type||'')===studyState.questionType;
  }
  function subjectOptions(){
    let values=[];
    try{values=examSubjectValues(currentLearningArea());}catch(err){}
    values=values.concat(allQuestions().flatMap(q=>dataArray(q.subjects||q.subject||q.mainArea,'subjects')));
    values=unique(values).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
    let classroomSubjects=[];
    try{classroomSubjects=window.getHomeClassroomSubjects?.()||[];}catch(err){}
    const preferred=[];
    classroomSubjects.forEach(subject=>{
      const index=values.findIndex(value=>sameStudyValue(value,subject));
      if(index>=0)preferred.push(values.splice(index,1)[0]);
    });
    return preferred.concat(values);
  }
  function topicOptions(){
    let values=[];
    try{values=curriculumTopics(currentLearningArea()).filter(curriculumTopicMatchesStudyScope);}catch(err){}
    values=values.concat(allQuestions().filter(q=>questionMatchesOptionScope(q)).flatMap(q=>dataArray(q.topics||q.topic,'topics')));
    return unique(values);
  }
  function subtopicOptions(){
    let values=[];
    const topics=studyState.topic?[studyState.topic]:topicOptions();
    topics.forEach(topic=>{try{values=values.concat((curriculumSubtopics(topic,currentLearningArea())||[]).filter(subtopic=>curriculumSubtopicMatchesStudyScope(topic,subtopic)));}catch(err){}});
    values=values.concat(allQuestions().filter(q=>questionMatchesOptionScope(q,{topic:true})).flatMap(q=>dataArray(q.subtopics||q.subtopic,'subtopics')));
    return unique(values);
  }
  function skillOptions(){
    let values=[];
    const topics=studyState.topic?[studyState.topic]:topicOptions();
    const subs=studyState.subtopic?[studyState.subtopic]:subtopicOptions();
    topics.forEach(topic=>subs.forEach(subtopic=>{
      values=values.concat(safeCurriculumSkills(topic,subtopic).filter(curriculumLinkMatchesStudyScope).map(link=>link.skill));
    }));
    values=values.concat(allQuestions().filter(q=>questionMatchesOptionScope(q,{topic:true,subtopic:true})).flatMap(q=>dataArray(q.skills,'skills')));
    return unique(values);
  }
  function questionValues(q,fields,field=''){
    return unique(fields.flatMap(key=>dataArray(q[key],field)));
  }
  function questionYearLevels(q){
    return unique([
      ...questionValues(q,['yearLevels','yearLevel','year_levels','year_level'],'yearLevels'),
      ...questionValues(q?.data||{},['yearLevels','yearLevel','year_levels','year_level'],'yearLevels')
    ]);
  }
  function yearLevelOptions(){
    let values=[];
    try{if(typeof curriculumYearLevels==='function')values=values.concat(curriculumYearLevels(currentLearningArea()));}catch(err){}
    try{if(typeof yearLevelValues==='function')values=values.concat(yearLevelValues(currentLearningArea()));}catch(err){}
    values=values.concat(allQuestions().flatMap(questionYearLevels));
    const progression=['12 VCE','11 VCE','10A','10','9','8','7','6','5','4','3','2','F'];
    const found=unique(values.length?values:progression);
    const known=progression.filter(level=>found.includes(level));
    const custom=found.filter(level=>!progression.includes(level));
    return [...known,...custom];
  }
  function questionHasSelectedSubject(q){
    return !studyState.subject||questionValues(q,['subjects','subject','mainArea'],'subjects').some(subject=>sameStudyValue(subject,studyState.subject));
  }
  function questionHasSelectedYearLevel(q){
    return !studyState.yearLevel||questionYearLevels(q).some(level=>sameStudyValue(level,studyState.yearLevel));
  }
  function questionMatchesOptionScope(q,{topic=false,subtopic=false}={}){
    if(q.deletedAt)return false;
    if(!questionHasSelectedSubject(q)||!questionHasSelectedYearLevel(q)||!questionHasSelectedType(q))return false;
    if(topic&&studyState.topic&&!questionValues(q,['topics','topic'],'topics').some(value=>sameStudyValue(value,studyState.topic)))return false;
    if(subtopic&&studyState.subtopic&&!questionValues(q,['subtopics','subtopic'],'subtopics').some(value=>sameStudyValue(value,studyState.subtopic)))return false;
    return true;
  }
  function questionMatches(q){
    if(studyState.subject&&!questionHasSelectedSubject(q))return false;
    if(studyState.topic&&!questionValues(q,['topics','topic'],'topics').some(value=>sameStudyValue(value,studyState.topic)))return false;
    if(studyState.subtopic&&!questionValues(q,['subtopics','subtopic'],'subtopics').some(value=>sameStudyValue(value,studyState.subtopic)))return false;
    if(studyState.skills.length){
      const qSkills=questionValues(q,['skills'],'skills');
      if(!studyState.skills.some(skill=>qSkills.some(qSkill=>sameStudyValue(qSkill,skill))))return false;
    }
    if(studyState.difficulty&&String(q.difficulty||'').toLowerCase()!==studyState.difficulty.toLowerCase())return false;
    if(studyState.calculator&&String(q.calculator||'').toLowerCase()!==studyState.calculator.toLowerCase())return false;
    if(studyState.yearLevel&&!questionHasSelectedYearLevel(q))return false;
    if(!questionHasSelectedType(q))return false;
    return !q.deletedAt;
  }
  function filteredQuestions(){
    return allQuestions().filter(questionMatches).sort((a,b)=>{
      const order=(QUESTION_TYPE_ORDER[a.type]??9)-(QUESTION_TYPE_ORDER[b.type]??9);
      if(order)return order;
      return (Number(a.questionNumber)||0)-(Number(b.questionNumber)||0);
    });
  }
  function selectHtml(id,label,values,selected,allowAny=true,disabled=false){
    const options=values.map(item=>{
      const value=Array.isArray(item)?item[0]:item;
      const text=Array.isArray(item)?item[1]:item;
      return {value:String(value),text:String(text)};
    });
    if(allowAny)options.unshift({value:'',text:'Any'});
    const active=options.find(option=>option.value===String(selected||''))||options[0]||{value:'',text:'Any'};
    const rows=options.map(option=>`<button type="button" class="study-select-option ${option.value===active.value?'selected':''}" aria-pressed="${option.value===active.value}" onclick="studyModeSet('${id}','${htmlEscape(jsEscape(option.value))}')">${htmlEscape(option.text)}</button>`).join('');
    return `<label class="study-filter ${disabled?'locked':''}"><span>${htmlEscape(label)}</span><details class="study-select-control ${disabled?'disabled':''}" id="study-${id}-picker"${disabled?'':` ontoggle="studyModeDropdownToggle(this)"`}><summary title="${htmlEscape(active.text)}"><span>${htmlEscape(active.text)}</span></summary>${disabled?'':`<div class="study-select-menu">${rows||'<div class="study-empty-filter">No options available yet</div>'}</div>`}</details></label>`;
  }
  function skillSelectHtml(disabled=false){
    const values=skillOptions();
    const selected=studyState.skills[0]||'';
    const selectedLabel=disabled?'Any':selected||'Any';
    const optionRows=[
      `<button type="button" class="study-select-option ${!selected?'selected':''}" onclick="studyModeSelectSkill('')">Any</button>`,
      ...values.map(skill=>`<button type="button" class="study-select-option ${selected===skill?'selected':''}" onclick="studyModeSelectSkill('${htmlEscape(jsEscape(skill))}')">${htmlEscape(skill)}</button>`)
    ].join('');
    const menu=values.length?optionRows:'<div class="study-empty-filter">No skills available for this selection.</div>';
    return `<label class="study-filter study-skill-control ${disabled?'locked':''}"><span>Skills</span><details class="study-select-control study-skill-select ${disabled?'disabled':''}" id="study-skills-picker"${disabled?'':` ontoggle="studyModeDropdownToggle(this)"`}><summary title="${htmlEscape(selectedLabel)}"><span>${htmlEscape(selectedLabel)}</span></summary>${disabled?'':`<div class="study-select-menu">${menu}</div>`}</details></label>`;
  }
  function studyTimerNow(){
  return (typeof performance!=='undefined'&&performance.now)?performance.now():Date.now();
}
function currentStudyTimerKey(){
  const blocks=questionBlocks();
  if(!blocks.length)return '';
  if(studyState.currentIndex<0)studyState.currentIndex=0;
  if(studyState.currentIndex>=blocks.length)studyState.currentIndex=blocks.length-1;
  const block=blocks[studyState.currentIndex];
  if(!block||!block.q)return '';
  const q=block.q;
  const id=q.id||q.old_id||q.questionNumber||q.number||block.startNumber||'';
  return `${studyState.currentIndex||0}:${id}`;
}
function stopStudyTimerLoop(){
  if(studyState.timerInterval){
    clearInterval(studyState.timerInterval);
    studyState.timerInterval=null;
  }
}
function idleStudyTimer(){
  stopStudyTimerLoop();
  studyState.timerKey='';
  studyState.timerStartedAt=0;
  studyState.timerElapsedMs=0;
  studyState.timerRunning=false;
  studyState.timerChecked=false;
}
function resetStudyTimer(key=currentStudyTimerKey()){
  stopStudyTimerLoop();
  if(!key){
    idleStudyTimer();
    return;
  }
  studyState.timerKey=key;
  studyState.timerStartedAt=studyTimerNow();
  studyState.timerElapsedMs=0;
  studyState.timerRunning=true;
  studyState.timerChecked=false;
}
function currentStudyTimerMs(){
  if(studyState.timerRunning&&studyState.timerStartedAt){
    return studyState.timerElapsedMs+(studyTimerNow()-studyState.timerStartedAt);
  }
  return studyState.timerElapsedMs||0;
}
function formatStudyTimer(ms){
  const total=Math.max(0,Math.floor(ms));
  const minutes=Math.floor(total/60000);
  const seconds=Math.floor((total%60000)/1000);
  const hundredths=Math.floor((total%1000)/10);
  return {
    main:`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`,
    sub:String(hundredths).padStart(2,'0')
  };
}
function renderStudyTimer(){
  const parts=formatStudyTimer(currentStudyTimerMs());
  const collapsed=!!studyState.timerCollapsed;
  const label=collapsed?'Show timer':'Hide timer';
  return `<div class="study-timer-slot">
    <button type="button" class="study-timer-pill ${studyState.timerChecked&&!collapsed?'is-stopped':''} ${collapsed?'is-collapsed':''}" onclick="studyModeToggleTimer()" title="${label}" aria-label="${label}">
      <span class="study-timer-clock"><i class="ti ti-clock"></i></span>
      <span class="study-timer-main" data-study-timer-main>${parts.main}</span>
      <span class="study-timer-sub" data-study-timer-sub>${parts.sub}</span>
    </button>
  </div>`;
}
function updateStudyTimerDisplay(){
  const main=document.querySelector('[data-study-timer-main]');
  const sub=document.querySelector('[data-study-timer-sub]');
  if(!main||!sub)return;
  const parts=formatStudyTimer(currentStudyTimerMs());
  main.textContent=parts.main;
  sub.textContent=parts.sub;
}
function ensureStudyTimer(){
  const key=currentStudyTimerKey();
  if(!key){
    idleStudyTimer();
    studyState.visibleQuestionKey='';
    return;
  }
  if(studyState.visibleQuestionKey!==key){
    studyState.visibleQuestionKey=key;
  }
  if(studyState.timerKey!==key)resetStudyTimer(key);
  if(!studyState.timerRunning)return;
  if(!studyState.timerInterval){
    studyState.timerInterval=setInterval(updateStudyTimerDisplay,47);
  }
}
function stopStudyTimer(){
  if(studyState.timerRunning){
    studyState.timerElapsedMs=currentStudyTimerMs();
  }
  studyState.timerRunning=false;
  studyState.timerChecked=true;
  stopStudyTimerLoop();
}
function renderStudyHeader(){
    const zoom=Number(studyState.zoom)||100;
    return `<div class="study-mode-brand">
      <img class="study-mode-logo" src="assets/images/app-logo.png" alt="Quero Learning Tools logo">
      <h1>Quero Learning Tools</h1>
    </div>
    ${renderStudyTimer()}
    <div class="study-zoom-controls" aria-label="Study Mode zoom controls">
      <button type="button" onclick="studyModeZoom(-10)" title="Zoom out">-</button>
      <span>${zoom}%</span>
      <button type="button" onclick="studyModeZoom(10)" title="Zoom in">+</button>
    </div>`;
  }
  function renderFilters(){
    const subjects=subjectOptions();
    const topics=topicOptions();
    const subtopics=subtopicOptions();
    const yearLevels=yearLevelOptions();
    if(studyState.subject&&!subjects.includes(studyState.subject))studyState.subject='';
    if(studyState.topic&&!topics.includes(studyState.topic))studyState.topic='';
    if(studyState.subtopic&&!subtopics.includes(studyState.subtopic))studyState.subtopic='';
    if(studyState.yearLevel&&!yearLevels.includes(studyState.yearLevel))studyState.yearLevel='';
    studyState.skills=studyState.skills.filter(skill=>skillOptions().includes(skill));
    const subjectLocked=!studyState.questionType;
    const topicLocked=subjectLocked||!studyState.subject;
    const subtopicLocked=topicLocked||!studyState.topic;
    const skillsLocked=subtopicLocked||!studyState.subtopic;
    return `<div class="study-filterbar">
      <div class="study-filterbar-scroll">
        ${selectHtml('questionType','Question Type',[['mc','Multiple Choice Question'],['tf','True or False'],['sa','Short Answer'],['er','Extended Response']],studyState.questionType,true,false)}
        ${selectHtml('subject','Subject',subjects,studyState.subject,true,subjectLocked)}
        ${selectHtml('topic','Topic',topics,studyState.topic,true,topicLocked)}
        ${selectHtml('subtopic','Subtopic',subtopics,studyState.subtopic,true,subtopicLocked)}
        ${skillSelectHtml(skillsLocked)}
        ${selectHtml('difficulty','Difficulty',['Easy','Medium','Hard','Advance','Extension'],studyState.difficulty)}
        ${selectHtml('calculator','Calculator',['Calculator','Non-Calculator'],studyState.calculator)}
        ${selectHtml('yearLevel','Year Level',yearLevels,studyState.yearLevel)}
      </div>
      <div class="study-filterbar-actions">
        <button type="button" onclick="studyModeResetFilters()">Reset</button>

      </div>
    </div>`;
  }
  function questionText(q){return showTextHtml(q.textHtml||q.questionHtml||q.questionTextHtml,q.text||q.question||q.questionText||'');}
  function sourceLine(type,source){return source?`<div class="study-source">${htmlEscape((type==='data'?'Data':'Source')+': '+source)}</div>`:'';}
  function imageHtml(data,name,cls='study-diagram'){
    return data?`<img class="${cls}" src="${data}" alt="${htmlEscape(name||'Diagram')}">`:'';
  }
function studySolutionActive(){
  return !!studyState.timerChecked && studyState.learningTab==='solution';
}
function studyBlockImageHtml(block,cls='study-diagram'){
  if(!block)return '';
  const useSolution=studySolutionActive()&&block.diagramSolutionImageData;
  const data=useSolution?block.diagramSolutionImageData:block.imageData;
  const name=useSolution?(block.diagramSolutionImageName||block.imageName||'Diagram solution'):(block.imageName||'Diagram');
  return imageHtml(data,name,cls);
}
function studyLegacyBlock(item,slot=''){
  return slot==='2'
    ? {imageData:item.imageData2,imageName:item.imageName2,diagramSolutionImageData:item.diagramSolutionImageData2,diagramSolutionImageName:item.diagramSolutionImageName2}
    : {imageData:item.imageData,imageName:item.imageName,diagramSolutionImageData:item.diagramSolutionImageData,diagramSolutionImageName:item.diagramSolutionImageName};
}
function renderStudyVcaaReport(item){
  const report=item?.vcaaReport||{};
  const headerData=report.headerImageData||report.header_image_data||item?.vcaaReportHeaderImageData||item?.vcaaReportHeader||'';
  const headerName=report.headerImageName||report.header_image_name||'VCAA report header';
  const reportData=report.reportImageData||report.report_image_data||item?.vcaaReportReportImageData||item?.vcaaReportImageData||item?.vcaaReportImage||'';
  const reportName=report.reportImageName||report.report_image_name||'VCAA report';
  if(!headerData&&!reportData)return '';
  return `<section class="study-vcaa-report"><h3>VCAA Report</h3><div class="study-vcaa-report-panel"><div class="study-vcaa-report-row">${headerData?imageHtml(headerData,headerName,'study-vcaa-report-image'):''}</div><div class="study-vcaa-report-row">${reportData?imageHtml(reportData,reportName,'study-vcaa-report-image'):''}</div></div></section>`;
}
function studySolutionHtmlFor(item){
  if(!item)return '';
  const html=item.solutionHtml||item.markingGuideHtml||item.answerExplanationHtml||item.workedSolutionHtml||'';
  const text=item.solution||item.markingGuide||item.answerExplanation||item.workedSolution||'';
  return showTextHtml(html,text);
}
function youtubeEmbedUrl(url){
  let raw=String(url||'').trim();
  if(!raw)return '';
  const iframeSrc=raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if(iframeSrc)raw=iframeSrc[1];
  if(/^\/\//.test(raw))raw='https:'+raw;
  if(!/^https?:\/\//i.test(raw))raw='https://'+raw;
  try{
    const parsed=new URL(raw);
    const host=parsed.hostname.replace(/^www\./,'').toLowerCase();
    const parts=parsed.pathname.split('/').filter(Boolean);
    let id='';
    if(host==='youtu.be')id=parts[0]||'';
    else if(host.endsWith('youtube.com')||host.endsWith('youtube-nocookie.com')){
      if(['embed','shorts','live','v'].includes(parts[0]))id=parts[1]||'';
      else id=parsed.searchParams.get('v')||parts[0]||'';
    }
    id=String(id||'').replace(/[^a-zA-Z0-9_-]/g,'');
    return id?`https://www.youtube-nocookie.com/embed/${id}`:'';
  }catch(err){return '';}
}
function youtubeOpenUrl(url){
  const raw=String(url||'').trim();
  if(!raw)return '';
  const iframeSrc=raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const src=iframeSrc?iframeSrc[1]:raw;
  if(/^https?:\/\//i.test(src))return src;
  if(/^\/\//.test(src))return 'https:'+src;
  return 'https://'+src;
}
function studySkillScopesForQuestion(q,parent=null){
  if(!q)return [];
  let topics=questionValues(q,['topics','topic'],'topics');
  let subtopics=questionValues(q,['subtopics','subtopic'],'subtopics');
  let skills=questionValues(q,['skills','skill'],'skills');
  if(parent){
    if(!topics.length)topics=questionValues(parent,['topics','topic'],'topics');
    if(!subtopics.length)subtopics=questionValues(parent,['subtopics','subtopic'],'subtopics');
    if(!skills.length)skills=questionValues(parent,['skills','skill'],'skills');
  }
  if(!topics.length&&studyState.topic)topics=[studyState.topic];
  if(!subtopics.length&&studyState.subtopic)subtopics=[studyState.subtopic];
  if(!skills.length&&studyState.skills.length)skills=[...studyState.skills];
  const area=String(q.learningArea||q.learning_area||q.mainArea||parent?.learningArea||parent?.learning_area||parent?.mainArea||currentLearningArea()||'Mathematics');
  const scopes=[];
  topics.forEach(topic=>subtopics.forEach(subtopic=>skills.forEach(skill=>scopes.push({learningArea:area,topic,subtopic,skill}))));
  if(!scopes.length)skills.forEach(skill=>scopes.push({learningArea:area,topic:'',subtopic:'',skill}));
  return scopes;
}
function youtubeLinksForStudySkillScope(scope){
  if(!scope||!scope.skill)return [];
  let links=[];
  if(typeof youtubeLinksForCurriculumSkill==='function'&&scope.topic&&scope.subtopic)links=youtubeLinksForCurriculumSkill(scope);
  if(!links.length&&Array.isArray(youtubeLinks)){
    const skillKey=String(scope.skill||'').trim().toLowerCase();
    links=youtubeLinks.filter(link=>String(link.skill||'').trim().toLowerCase()===skillKey);
  }
  const seen=new Set();
  return links.sort((a,b)=>(Number(a.sortOrder)||0)-(Number(b.sortOrder)||0)||String(a.title||'').localeCompare(String(b.title||''))).map(link=>({...link,embedUrl:youtubeEmbedUrl(link.url),openUrl:youtubeOpenUrl(link.url)})).filter(link=>link.url).filter(link=>{
    const key=link.id||`${link.title}|${link.url}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function currentStudyLearnGroups(){
  const block=currentStudyBlock();
  if(!block||!block.q)return [];
  const q=block.q;
  const scopes=[];
  if(q.type==='mc'&&q.template==='multiple'&&Array.isArray(q.subQuestions)){
    scopes.push(...studySkillScopesForQuestion(q));
    q.subQuestions.forEach(sq=>scopes.push(...studySkillScopesForQuestion(sq,q)));
  }else{
    scopes.push(...studySkillScopesForQuestion(q));
  }
  const grouped=new Map();
  scopes.forEach(scope=>{
    const skill=String(scope.skill||'').trim();
    if(!skill)return;
    if(!grouped.has(skill))grouped.set(skill,{skill,links:[],seen:new Set()});
    const group=grouped.get(skill);
    youtubeLinksForStudySkillScope(scope).forEach(link=>{
      const key=link.id||`${link.title}|${link.url}`;
      if(group.seen.has(key))return;
      group.seen.add(key);
      group.links.push(link);
    });
  });
  return [...grouped.values()].map(group=>({skill:group.skill,links:group.links}));
}
function studyReportItemFor(source,label=''){
  const report=source?.vcaaReport||{};
  const headerData=report.headerImageData||report.header_image_data||source?.vcaaReportHeaderImageData||source?.vcaaReportHeader||'';
  const headerName=report.headerImageName||report.header_image_name||'VCAA report header';
  const reportData=report.reportImageData||report.report_image_data||source?.vcaaReportReportImageData||source?.vcaaReportImageData||source?.vcaaReportImage||'';
  const reportName=report.reportImageName||report.report_image_name||'VCAA report';
  return headerData||reportData?{label,headerData,headerName,reportData,reportName}:null;
}
function currentStudyReportItems(){
  const block=currentStudyBlock();
  if(!block||!block.q)return [];
  const q=block.q;
  const items=[];
  if(q.type==='mc'&&q.template==='multiple'&&Array.isArray(q.subQuestions)){
    const shared=studyReportItemFor(q,'Shared information');
    if(shared)items.push(shared);
    q.subQuestions.forEach((sq,si)=>{
      const item=studyReportItemFor(sq,`Question ${block.startNumber+si}`);
      if(item)items.push(item);
    });
  }else{
    const item=studyReportItemFor(q,`Question ${block.startNumber}`);
    if(item)items.push(item);
  }
  return items;
}
function renderStudyReportPanel(item){
  return `<section class="study-report-group">${item.label?`<h3>${htmlEscape(item.label)}</h3>`:''}<div class="study-vcaa-report-panel"><div class="study-vcaa-report-row">${item.headerData?imageHtml(item.headerData,item.headerName,'study-vcaa-report-image'):''}</div><div class="study-vcaa-report-row">${item.reportData?imageHtml(item.reportData,item.reportName,'study-vcaa-report-image'):''}</div></div></section>`;
}
function renderStudyReportScreen(blocks){
  const block=currentStudyBlock();
  const progress=block?`Question ${block.endNumber||block.startNumber} of ${studyTotalQuestionCount(blocks)}`:'Report';
  const items=currentStudyReportItems();
  return `<section class="study-learn-screen study-report-screen">
    <div class="study-learn-screen-head">
      <div><h2>VCAA Assessment Reports</h2><p>${htmlEscape(progress)}</p></div>
      <button type="button" onclick="studyModeOpenLearningTool('report')"><i class="ti ti-arrow-left"></i> Back to question</button>
    </div>
    ${items.length?`<div class="study-report-stack">${items.map(renderStudyReportPanel).join('')}</div>`:`<div class="study-empty-state"><i class="ti ti-file-analytics"></i><h2>No report yet</h2><p>No VCAA Report has been added for this question yet.</p></div>`}
  </section>`;
}
function renderStudyYoutubeCard(link){
  const title=htmlEscape(link.title||'YouTube video');
  const openUrl=htmlEscape(link.openUrl||link.url||'');
  const embed=link.embedUrl?`<iframe src="${htmlEscape(link.embedUrl)}" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>`:'';
  const fallback=openUrl?`<a class="study-youtube-open" href="${openUrl}" target="_blank" rel="noopener">Open in YouTube</a>`:'';
  return `<article class="study-youtube-card"><div class="study-youtube-title">${title}</div>${embed||'<div class="study-youtube-unavailable">This link cannot be embedded directly.</div>'}${fallback}</article>`;
}
function renderStudyLearnScreen(blocks){
  const block=currentStudyBlock();
  const progress=block?`Question ${block.endNumber||block.startNumber} of ${studyTotalQuestionCount(blocks)}`:'Learn';
  const groups=currentStudyLearnGroups();
  const hasVideos=groups.some(group=>group.links.length);
  const groupHtml=groups.map(group=>`<section class="study-learn-skill-group"><h3>${htmlEscape(group.skill)}</h3>${group.links.length?`<div class="study-youtube-list study-youtube-list-large">${group.links.map(renderStudyYoutubeCard).join('')}</div>`:`<p class="study-learning-muted">No YouTube links have been added for this skill yet.</p>`}</section>`).join('');
  return `<section class="study-learn-screen">
    <div class="study-learn-screen-head">
      <div><h2>Learn</h2><p>${htmlEscape(progress)}</p></div>
      <button type="button" onclick="studyModeOpenLearningTool('learn')"><i class="ti ti-arrow-left"></i> Back to question</button>
    </div>
    ${hasVideos?`<div class="study-learn-skill-stack">${groupHtml}</div>`:`<div class="study-empty-state"><i class="ti ti-player-play"></i><h2>No videos yet</h2><p>No YouTube links have been added for this question's skills yet.</p></div>`}
  </section>`;
}
function renderStudySolutionSection(item){
  if(!studySolutionActive())return '';
  const solution=studySolutionHtmlFor(item);
  if(!solution)return '';
  return `<section class="study-solution-section"><h3>Solution</h3><div class="study-solution-content" style="color:#d71920">${solution}</div></section>`;
}
function studyMultipleReportSource(q,subQuestions){
  if(q?.vcaaReport)return q;
  return (subQuestions||[]).find(sq=>sq&&sq.vcaaReport)||q;
}
  function contentBlocksHtml(item,label='question'){
    let html='';
    const blocks=Array.isArray(item.contentBlocks)?item.contentBlocks:Array.isArray(item.blocks)?item.blocks:[];
    if(blocks.length){
      blocks.forEach((block,i)=>{
        html+=studyBlockImageHtml(block,`study-diagram ${label}-diagram`);
        if(block.source)html+=sourceLine(block.sourceType,block.source);
        const after=showTextHtml(block.afterTextHtml,block.afterText);
        if(after)html+=`<div class="study-question-text">${after}</div>`;
      });
      return html;
    }
    html+=studyBlockImageHtml(studyLegacyBlock(item),`study-diagram ${label}-diagram`);
    if(item.source)html+=sourceLine(item.sourceType,item.source);
    const after=showTextHtml(item.afterTextHtml,item.afterText);
    if(after)html+=`<div class="study-question-text">${after}</div>`;
    html+=studyBlockImageHtml(studyLegacyBlock(item,'2'),`study-diagram ${label}-diagram`);
    if(item.source2)html+=sourceLine(item.sourceType2,item.source2);
    const after2=showTextHtml(item.afterText2Html,item.afterText2);
    if(after2)html+=`<div class="study-question-text">${after2}</div>`;
    return html;
  }
  function correctIndex(q){
    const raw=q.correctIndex??q.correct??q.answerIndex??q.answer;
    if(typeof raw==='number')return Math.max(0,Math.min(3,raw));
    const text=String(raw??'').trim().toUpperCase();
    if(/^[A-D]$/.test(text))return text.charCodeAt(0)-65;
    const n=parseInt(text,10);return Number.isFinite(n)?Math.max(0,Math.min(3,n-1)):null;
  }
  function optionData(q){
    const optionTemplate=q.optionTemplate||'standard';
    const texts=q.options||['','','',''];
    const htmls=q.optionsHtml||[];
    const images=q.optionImages||[];
    return [0,1,2,3].map(i=>({
      originalIndex:i,
      letter:LETTERS[i],
      html:htmls[i]||htmlEscape(texts[i]||''),
      text:texts[i]||'',
      image:images[i]||{},
      template:optionTemplate
    }));
  }
  function shuffledIndexOrder(key,count){
    const orderKey=`${key}:${count}`;
    const saved=studyState.optionOrders[orderKey];
    if(Array.isArray(saved)&&saved.length===count)return saved;
    const order=Array.from({length:count},(_,i)=>i);
    for(let i=order.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [order[i],order[j]]=[order[j],order[i]];
    }
    studyState.optionOrders[orderKey]=order;
    return order;
  }
  function orderedOptions(q,key){
    const data=optionData(q);
    return shuffledIndexOrder(key,data.length).map((originalIndex,displayIndex)=>({
      ...data[originalIndex],
      displayLetter:LETTERS[displayIndex]
    }));
  }
  function optionBody(opt){
    const image=opt.image&&opt.image.data?imageHtml(opt.image.data,opt.image.name,'study-option-image'):'';
    if(opt.template==='diagram2'||opt.template==='diagram')return image||`<span>${htmlEscape(opt.image?.name||opt.text||'')}</span>`;
    if(opt.template==='diagram1')return `<div class="study-option-hybrid">${opt.html?`<div>${opt.html}</div>`:''}${image}</div>`;
    return opt.html||'&nbsp;';
  }
  function renderOptionGrid(q,key){
    if(q.optionTemplate==='table'&&typeof optionTableHtml==='function')return `<div class="study-table-option">${optionTableHtml(q)}</div>`;
    const correct=correctIndex(q);
    const selected=studyState.selectedAnswers[key];
    const checked=!!studyState.checkedAnswers[key];
    return `<div class="study-options-grid">${orderedOptions(q,key).map(opt=>{
      const isSelected=selected===opt.originalIndex;
      const isCorrect=correct===opt.originalIndex;
      const cls=isSelected?` selected ${checked&&correct!=null?(isCorrect?'right':'wrong'):''}`:'';
      const feedback=(isSelected&&checked&&correct!=null)?`<span class="study-option-feedback ${isCorrect?'right':'wrong'}"><i class="ti ${isCorrect?'ti-check':'ti-x'}"></i></span>`:'';
      return `<button type="button" class="study-option${cls}" onclick="studyModeSelectAnswer('${jsEscape(key)}',${opt.originalIndex})"><span class="study-option-letter">${opt.displayLetter}.</span><span class="study-option-body">${optionBody(opt)}</span>${feedback}</button>`;
    }).join('')}</div>`;
  }
  function studyResponsePercent(q){
    const direct=q.responsePercent??q.response_percent??q.performancePercent??q.performance_percent??q.performance??q.response;
    const hasDirect=direct!==undefined&&direct!==null&&String(direct).trim()!=='';
    const attempts=Number(q.attemptCount??q.attempt_count??0);
    const correct=Number(q.correctCount??q.correct_count??0);
    if(hasDirect)return Math.round(Number(direct)||0);
    if(attempts>0)return Math.round((correct/attempts)*100);
    return 0;
  }

  function studyQuestionMeta(q,questionNumber,forceQuestionNumber=false){
    const year=q.date??q.year??'';
    const qn=forceQuestionNumber?questionNumber:(q.questionNumber??q.question_number??questionNumber);
    const response=studyResponsePercent(q);
    const author=q.author||'';
    return [year,`Q${qn}(${response}%)`,author].filter(Boolean).join(' ');
  }

  function studyMarkLabel(q){
    const marks=Number(q.marks)||1;
    return `${marks} mark${marks===1?'':'s'}`;
  }

  function renderMcq(q,index){
    const key=`q-${q.id||index}-${studyState.answerToken}`;
    return `<article class="study-question-card" data-study-card="${htmlEscape(key)}">
      <div class="study-card-head"><div><h2>Question ${index+1}</h2></div><span class="study-question-meta" style="font-weight:400">${studyQuestionMeta(q,index+1)}</span></div>
      <div class="study-question-text">${questionText(q)}</div>
      ${contentBlocksHtml(q,'main')}
      ${renderOptionGrid(q,key)}
      ${renderStudySolutionSection(q)}    </article>`;
  }
  function multipleInstruction(q,startNumber){
    const count=q.subQuestions?.length||1;
    if(typeof multipleInstructionRange==='function')return multipleInstructionRange(startNumber,count);
    return count===2?`Use the following information to answer Questions ${startNumber} and ${startNumber+1}.`:`Use the following information to answer Questions ${startNumber} - ${startNumber+count-1}.`;
  }
  function renderMultiple(q,index,startNumber){
    const subQuestions=(Array.isArray(q.subQuestions)&&q.subQuestions.length)?q.subQuestions:[];
    const instruction=multipleInstruction(q,startNumber);
    const sharedText=questionText(q);
    const reportSource=studyMultipleReportSource(q,subQuestions);
    const baseMetaQuestionNumber=Number(q.questionNumber??q.question_number??startNumber)||startNumber;
    const internalHtml=subQuestions.map((sq,si)=>{
      const questionNumber=startNumber+si;
      const key=`q-${q.id||index}-sub-${si}-${studyState.answerToken}`;
      const sqText=showTextHtml(sq.questionHtml||sq.textHtml,sq.question||sq.text||'');
      const metaSource={...q,...sq,author:sq.author??q.author,date:sq.date??q.date,year:sq.year??q.year,vcaaReport:sq.vcaaReport||q.vcaaReport};
      return `<section class="study-internal-question">
        <div class="study-internal-head"><h3>Question ${questionNumber}</h3><span class="study-question-meta" style="font-weight:400">${studyQuestionMeta(metaSource,baseMetaQuestionNumber+si,true)}</span></div>
        ${sqText?`<div class="study-question-text">${sqText}</div>`:''}
        ${contentBlocksHtml(sq,'sub')}
        ${renderOptionGrid(sq,key)}
        ${renderStudySolutionSection(sq)}      </section>`;
    }).join('');
    return `<article class="study-question-card study-multiple-set">
      <div class="study-multiple-instruction">${htmlEscape(instruction)}</div>
      ${sharedText?`<div class="study-question-text">${sharedText}</div>`:''}
      ${contentBlocksHtml(q,'shared')}
      <div class="study-internal-stack">${internalHtml}</div>    </article>`;
  }
  function renderWrittenParts(parts){
    if(!Array.isArray(parts)||!parts.length)return '';
    return `<div class="study-written-parts">${parts.map((part,pi)=>{
      const label=String.fromCharCode(97+pi)+'.';
      const partText=showTextHtml(part.textHtml,part.text);
      const subs=Array.isArray(part.subparts)?part.subparts:[];
      return `<section class="study-written-part"><div class="study-part-line"><strong>${label}</strong><span>${partText}</span></div>${contentBlocksHtml(part,'part')}${subs.map((sub,si)=>`<div class="study-subpart"><strong>${['i','ii','iii','iv','v','vi'][si]||si+1}.</strong><span>${showTextHtml(sub.textHtml,sub.text)}</span>${contentBlocksHtml(sub,'subpart')}<textarea placeholder="Type your working here..."></textarea></div>`).join('')}<textarea placeholder="Type your answer here..."></textarea></section>`;
    }).join('')}</div>`;
  }
  function renderWritten(q,index){
    return `<article class="study-question-card study-written-card">
      <div class="study-card-head"><div><h2>Question ${index+1} <span>(${studyMarkLabel(q)})</span></h2></div><span class="study-question-meta" style="font-weight:400">${studyQuestionMeta(q,index+1)}</span></div>
      <div class="study-question-text">${questionText(q)}</div>
      ${contentBlocksHtml(q,'main')}
      ${renderWrittenParts(q.parts)}
      ${(!q.parts||!q.parts.length)?'<textarea class="study-written-answer" placeholder="Type your working here..."></textarea>':''}
    </article>`;
  }
  function hasRequiredStudyFocus(){
    return !!studyState.subtopic||studyState.skills.length>0;
  }
  function questionBlocks(){
   if(!hasRequiredStudyFocus())return [];
   const limit=Math.max(0,Number(studyState.questionLimit)||0);
   const list=limit?filteredQuestions().slice(0,limit):filteredQuestions();
   let studyNumber=1;
    return list.map((q,i)=>{
      const startNumber=studyNumber;
      const questionCount=(q.type==='mc'&&q.template==='multiple')?Math.max(1,q.subQuestions?.length||1):1;
      const endNumber=startNumber+questionCount-1;
      studyNumber+=questionCount;
      return {q,i,startNumber,endNumber,questionCount};
    });
  }
  function studyTotalQuestionCount(blocks){
    return blocks.reduce((total,block)=>total+(Number(block.questionCount)||1),0);
  }
  function blockAnswerKeys(block){
    if(!block)return [];
    const q=block.q;
    if(q.type==='mc'&&q.template==='multiple'){
      return (q.subQuestions||[]).map((sq,si)=>`q-${q.id||block.i}-sub-${si}-${studyState.answerToken}`);
    }
    if(q.type==='mc'||q.type==='tf')return [`q-${q.id||block.startNumber-1}-${studyState.answerToken}`];
    return [];
  }
  function blockHasSelectedAnswer(block){
    return blockAnswerKeys(block).some(key=>studyState.selectedAnswers[key]!==undefined);
  }
  function renderResults(){
    const blocks=questionBlocks();
    if(!hasRequiredStudyFocus()){
      studyState.currentIndex=0;
      return `<section class="study-empty-state"><i class="ti ti-adjustments-horizontal"></i><h2>Select a Subtopic or Skill</h2><p>Choose a Subtopic or at least one Skill to start Study Mode questions.</p></section>`;
    }
    if(!blocks.length){
      studyState.currentIndex=0;
      return `<section class="study-empty-state"><i class="ti ti-search"></i><h2>No questions found</h2><p>Try selecting fewer filters, or add questions to the bank for this skill.</p></section>`;
    }
    if(studyState.currentIndex<0)studyState.currentIndex=0;
    if(studyState.currentIndex>=blocks.length)studyState.currentIndex=blocks.length-1;
    const block=blocks[studyState.currentIndex];
    if(studyState.timerChecked&&studyState.learningTab==='report')return renderStudyReportScreen(blocks);
    if(studyState.timerChecked&&studyState.learningTab==='learn')return renderStudyLearnScreen(blocks);
    const q=block.q;
    const html=(q.type==='mc'&&q.template==='multiple')?renderMultiple(q,block.i,block.startNumber):(q.type==='sa'||q.type==='er')?renderWritten(q,block.startNumber-1):renderMcq(q,block.startNumber-1);
    const zoom=Math.max(70,Math.min(150,Number(studyState.zoom)||100));
    return `<div class="study-question-scale" style="zoom:${zoom/100};">
      ${html}
    </div>
    <nav class="study-bottom-nav" aria-label="Study Mode question navigation">
      <button type="button" onclick="studyModePrevious()" ${studyState.currentIndex<=0?'disabled':''}><i class="ti ti-chevron-left"></i> Previous</button>
      <div class="study-progress-label">Question ${block.endNumber||block.startNumber} of ${studyTotalQuestionCount(blocks)}</div>
      <div class="study-nav-actions">
        <button type="button" onclick="studyModeCheckAnswer()" ${blockHasSelectedAnswer(block)?'':'disabled'}>Check</button>
        <button type="button" onclick="studyModeNext()" ${studyState.currentIndex>=blocks.length-1?'disabled':''}>Next <i class="ti ti-chevron-right"></i></button>
      </div>
    </nav>`;
  }
  function applyStudyImageScale(root){
    root.querySelectorAll('img.study-diagram,img.study-option-image').forEach(img=>{
      const apply=()=>{
        if(!img.naturalWidth)return;
        img.style.width=`${Math.max(1,Math.round(img.naturalWidth*STUDY_DIAGRAM_IMAGE_SCALE))}px`;
        img.style.height='auto';
        img.style.maxWidth='100%';
      };
      if(img.complete)apply();
      else img.addEventListener('load',apply,{once:true});
    });
  }
  function renderStudySidebar(){
    const expanded=!studyState.filtersHidden;
    return `<aside class="study-filter-shell ${expanded?'expanded':'collapsed'}" aria-label="Study Mode filters">
      <button type="button" class="study-filter-toggle ${expanded?'active':''}" onclick="studyModeToggleFilters()" title="${expanded?'Hide filters':'Show filters'}" aria-label="${expanded?'Hide filters':'Show filters'}">
        <i class="ti ti-adjustments-horizontal"></i><span>Filters</span>
      </button>
      ${expanded?`<div class="study-filter-panel">${renderFilters()}</div>`:''}
    </aside>`;
  }
  function currentStudyBlock(){
    const blocks=questionBlocks();
    return blocks[studyState.currentIndex]||null;
  }
  function collectStudyText(list,value){
    const text=String(value||'').trim();
    if(text&&!list.includes(text))list.push(text);
  }
  function collectStudyQuestionSolutions(q,list){
    if(!q)return;
    ['solutionHtml','solution','markingGuide','answerExplanation','workedSolution'].forEach(k=>collectStudyText(list,q[k]));
    if(Array.isArray(q.parts)){
      q.parts.forEach(part=>{
        ['solutionHtml','solution','markingGuide'].forEach(k=>collectStudyText(list,part&&part[k]));
        if(Array.isArray(part?.subparts)){
          part.subparts.forEach(sub=>['solutionHtml','solution','markingGuide'].forEach(k=>collectStudyText(list,sub&&sub[k])));
        }
      });
    }
  }
  function studyLearningSolutions(){
    const block=currentStudyBlock();
    const q=block&&block.q?block.q:null;
    const list=[];
    collectStudyQuestionSolutions(q,list);
    const internal=q&&(q.internalQuestions||q.multipleQuestions||q.questions||q.items);
    if(Array.isArray(internal))internal.forEach(item=>collectStudyQuestionSolutions(item,list));
    return list;
  }
  function studyLearningSkillList(){
    const block=currentStudyBlock();
    const q=block&&block.q?block.q:{};
    const raw=Array.isArray(q.skills)?q.skills.join(';'):String(q.skills||q.skill||studyState.skills.join(';')||'');
    return raw.split(';').map(s=>s.trim()).filter(Boolean);
  }
  function renderStudyLearningSidebar(){
    const locked=!studyState.timerChecked;
    const tab=['solution','report','learn'].includes(studyState.learningTab)?studyState.learningTab:'';
    return `<aside class="study-learning-shell collapsed ${locked?'locked':'unlocked'}" aria-label="Study help tools">
      <div class="study-learning-tools">
        <button type="button" class="study-learning-tool ${tab==='solution'?'active':''}" onclick="studyModeOpenLearningTool('solution')" ${locked?'disabled':''} title="${locked?'Check your answer to unlock':'Solution'}" aria-label="${locked?'Solution locked until answer is checked':'Solution'}">
          <i class="ti ${locked?'ti-lock':'ti-bulb'}"></i><span>Solution</span>
        </button>
        <button type="button" class="study-learning-tool ${tab==='report'?'active':''}" onclick="studyModeOpenLearningTool('report')" ${locked?'disabled':''} title="${locked?'Check your answer to unlock':'Report'}" aria-label="${locked?'Report locked until answer is checked':'Report'}">
          <i class="ti ${locked?'ti-lock':'ti-file-analytics'}"></i><span>Report</span>
        </button>
        <button type="button" class="study-learning-tool ${tab==='learn'?'active':''}" onclick="studyModeOpenLearningTool('learn')" ${locked?'disabled':''} title="${locked?'Check your answer to unlock':'Learn'}" aria-label="${locked?'Learn locked until answer is checked':'Learn'}">
          <i class="ti ${locked?'ti-lock':'ti-player-play'}"></i><span>Learn</span>
        </button>
      </div>
    </aside>`;
  }
  function renderStudyMode(){
    const screen=ensureStudyModeScreen();
    const body=screen.querySelector('.study-mode-body');
    if(!body)return;
    ensureStudyTimer();
    const topbar=screen.querySelector('.study-mode-topbar');
    if(topbar)topbar.innerHTML=renderStudyHeader();
    body.classList.toggle('filters-collapsed',!!studyState.filtersHidden);
    body.classList.toggle('filters-expanded',!studyState.filtersHidden);
    studyState.learningCollapsed=true;
    body.classList.add('learning-collapsed');
    body.classList.remove('learning-expanded');
    body.innerHTML=`${renderStudySidebar()}<main class="study-practice-area">${renderResults()}</main>${renderStudyLearningSidebar()}`;
    try{renderAllTextBoxKatex(body);}catch(err){try{renderKatexIn(body);}catch(e){}}
    applyStudyImageScale(body);
  }

  function studyModeScrollElement(){
    const screen=document.getElementById('study-mode-screen');
    return screen?.querySelector('.study-practice-area')||screen;
  }

  function renderStudyModePreserveScroll(){
    const scroller=studyModeScrollElement();
    const scrollTop=scroller?scroller.scrollTop:0;
    renderStudyMode();
    requestAnimationFrame(()=>{
      const nextScroller=studyModeScrollElement();
      if(nextScroller)nextScroller.scrollTop=scrollTop;
    });
  }

  function ensureStudyModeScreen(){
    let screen=document.getElementById('study-mode-screen');
    if(screen)return screen;
    screen=document.createElement('section');
    screen.id='study-mode-screen';
    screen.className='study-mode-screen';
    screen.hidden=true;
    screen.innerHTML=`<header class="study-mode-topbar"></header><div class="study-mode-body"></div>`;
    document.body.appendChild(screen);
    return screen;
  }
  function hideStudyModeScreen(){
    const screen=document.getElementById('study-mode-screen');
    if(!screen)return;
    stopStudyTimerLoop();
    screen.classList.remove('open');
    screen.hidden=true;
    document.body.classList.remove('study-mode-active');
  }


  window.openStudyModeWithFilters = async function openStudyModeWithFilters(filters={}){
   studyState.subject = filters.subject || '';
   studyState.yearLevel = filters.yearLevel || '';
   studyState.topic = filters.topic || '';
   studyState.subtopic = filters.subtopic || '';
   studyState.skills = Array.isArray(filters.skills) ? filters.skills.filter(Boolean) : (filters.skill ? [filters.skill] : []);
   studyState.questionLimit = Math.max(0,Number(filters.questionLimit)||0);
   if(typeof filters.filtersHidden === 'boolean') studyState.filtersHidden = filters.filtersHidden;
   studyState.currentIndex = 0;
    studyState.answerToken = Date.now();
    studyState.selectedAnswers = {};
    studyState.checkedAnswers = {};
    studyState.visibleQuestionKey = '';
    studyState.optionOrders = {};
    await window.openStudyMode();
  };
  window.openStudyMode=async function openStudyMode(){
    const screen=ensureStudyModeScreen();
    screen.hidden=false;
    screen.classList.add('open');
    document.body.classList.add('study-mode-active');
    renderStudyMode();
    if(screen.requestFullscreen&&document.fullscreenElement!==screen){
      try{await screen.requestFullscreen();}
      catch(err){console.warn('Could not enter Study Mode fullscreen',err);}
    }
  };
  window.studyModePrevious=function(){
    studyState.currentIndex=Math.max(0,studyState.currentIndex-1);
    studyState.timerChecked=false;
    studyState.learningCollapsed=true;studyState.learningTab='';
    renderStudyModePreserveScroll();
  };
  window.studyModeNext=function(){
    const max=Math.max(0,questionBlocks().length-1);
    studyState.currentIndex=Math.min(max,studyState.currentIndex+1);
    studyState.timerChecked=false;
    studyState.learningCollapsed=true;studyState.learningTab='';
    renderStudyModePreserveScroll();
  };
  window.studyModeSelectAnswer=function(key,index){
    studyState.selectedAnswers[key]=index;
    delete studyState.checkedAnswers[key];
    studyState.learningCollapsed=true;studyState.learningTab='';
    renderStudyModePreserveScroll();
  };
  window.studyModeCheckAnswer=function(){
    const block=questionBlocks()[studyState.currentIndex];
    blockAnswerKeys(block).forEach(key=>{
      if(studyState.selectedAnswers[key]!==undefined)studyState.checkedAnswers[key]=true;
    });
    stopStudyTimer();
    renderStudyModePreserveScroll();
  };
  window.studyModeZoom=function(delta){
    studyState.zoom=Math.max(70,Math.min(150,(Number(studyState.zoom)||100)+delta));
    renderStudyModePreserveScroll();
  };
  window.studyModeToggleTimer=function(){
    studyState.timerCollapsed=!studyState.timerCollapsed;
    renderStudyMode();
  };
  window.studyModeOpenLearningTool=function(tab){
    if(!studyState.timerChecked)return;
    const nextTab=tab==='learn'?'learn':(tab==='report'?'report':'solution');
    const opening=studyState.learningTab!==nextTab;
    studyState.learningTab=opening?nextTab:'';
    if(opening&&(nextTab==='learn'||nextTab==='report'))studyState.filtersHidden=true;
    studyState.learningCollapsed=true;
    renderStudyModePreserveScroll();
  };
  window.studyModeToggleLearning=function(){
    if(!studyState.timerChecked)return;
    studyState.learningCollapsed=true;
    studyState.learningTab=studyState.learningTab?'':'solution';
    renderStudyModePreserveScroll();
  };
  window.studyModeSetLearningTab=function(tab){
    window.studyModeOpenLearningTool(tab);
  };
  window.studyModeToggleFilters=function(){
    studyState.filtersHidden=!studyState.filtersHidden;
    renderStudyModePreserveScroll();
  };
  window.studyModeDropdownToggle=function(picker){
    if(!picker?.open)return;
    document.querySelectorAll('#study-mode-screen .study-select-control[open]').forEach(item=>{if(item!==picker)item.open=false;});
  };
  window.studyModeSet=function(id,value){
    if(id==='questionType'){
      studyState.questionType=value;
      studyState.subject='';studyState.topic='';studyState.subtopic='';studyState.skills=[];
    }
    if(id==='subject'){
      studyState.subject=value;
      studyState.topic='';studyState.subtopic='';studyState.skills=[];
    }
    if(id==='topic'){studyState.topic=value;studyState.subtopic='';studyState.skills=[];}
    if(id==='subtopic'){studyState.subtopic=value;studyState.skills=[];}
    if(id==='difficulty')studyState.difficulty=value;
    if(id==='calculator')studyState.calculator=value;
    if(id==='yearLevel')studyState.yearLevel=value;
    studyState.currentIndex=0;
    studyState.answerToken=Date.now();studyState.selectedAnswers={};studyState.checkedAnswers={};studyState.visibleQuestionKey='';studyState.optionOrders={};renderStudyMode();
  };
  window.studyModeSetSkillOpen=function(open){studyState.skillsOpen=!!open;};
window.studyModeSelectSkill=function(skill){
    studyState.skills=skill?[skill]:[];
    studyState.skillsOpen=false;
    studyState.currentIndex=0;studyState.answerToken=Date.now();studyState.selectedAnswers={};studyState.checkedAnswers={};studyState.visibleQuestionKey='';studyState.optionOrders={};renderStudyMode();
  };
  window.studyModeToggleSkill=function(skill,checked){
    studyModeSelectSkill(checked?skill:'');
  };
  window.studyModeResetFilters=function(){studyState.questionType='';studyState.subject='';studyState.topic='';studyState.subtopic='';studyState.skills=[];studyState.difficulty='';studyState.calculator='';studyState.yearLevel='';studyState.questionLimit=0;studyState.currentIndex=0;studyState.answerToken=Date.now();studyState.selectedAnswers={};studyState.checkedAnswers={};studyState.visibleQuestionKey='';studyState.optionOrders={};renderStudyMode();};
  window.closeStudyMode=async function closeStudyMode(){
    const screen=document.getElementById('study-mode-screen');
    if(screen&&document.fullscreenElement===screen){try{await document.exitFullscreen();}catch(err){console.warn('Could not exit Study Mode fullscreen',err);}}
    hideStudyModeScreen();
  };
  if(!window.__queroStudyModeListeners){
    window.__queroStudyModeListeners=true;
    document.addEventListener('click',event=>{
      if(event.target.closest?.('#study-mode-screen .study-select-control'))return;
      document.querySelectorAll('#study-mode-screen .study-select-control[open]').forEach(picker=>{picker.open=false;});
    });
    document.addEventListener('fullscreenchange',()=>{setTimeout(async()=>{const screen=document.getElementById('study-mode-screen');if(!screen?.classList.contains('open'))return;const fs=document.fullscreenElement;const videoFullscreen=!!(fs&&fs.tagName==='IFRAME'&&screen.contains(fs));if(videoFullscreen){studyState.videoFullscreenActive=true;return;}if(!fs&&studyState.videoFullscreenActive){studyState.videoFullscreenActive=false;if(screen.requestFullscreen){try{await screen.requestFullscreen();}catch(err){console.warn('Could not restore Study Mode fullscreen after video fullscreen',err);}}return;}if(!fs)hideStudyModeScreen();},120);});
    document.addEventListener('keydown',event=>{const screen=document.getElementById('study-mode-screen');if(event.key==='Escape'&&screen?.classList.contains('open')){const fs=document.fullscreenElement;if(fs&&fs!==screen)return;event.preventDefault();window.closeStudyMode();}});
  }
})();



















































































