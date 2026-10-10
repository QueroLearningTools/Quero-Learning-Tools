// Curriculum Manager learning areas, topics, subtopics, skills, subjects, year levels, authors, and hierarchy storage.
let curriculumYoutubeEditingKey='';
let curriculumYoutubeSelectedKey='';

function renderCurriculumLearningTabs(){
  const el=document.getElementById('curriculum-learning-tabs');if(!el)return;
  const active=activeCurriculumLearningArea();
  el.innerHTML=curriculumLearningAreas().map(area=>`<button type="button" class="curriculum-learning-tab ${area===active?'active':''}" onclick="selectCurriculumLearningArea('${escJs(area)}')">${esc(area)}</button>`).join('')+`<button type="button" class="curriculum-learning-tab add" onclick="addCurriculumLearningArea()"><i class="ti ti-plus"></i> Learning Area</button><button type="button" class="curriculum-learning-tab add" onclick="renameCurriculumLearningArea()"><i class="ti ti-pencil"></i> Edit Heading</button><button type="button" class="curriculum-learning-tab danger" onclick="deleteCurriculumLearningArea()"><i class="ti ti-trash"></i> Delete</button>`;
}
function selectCurriculumLearningArea(area){curriculumManagerState.learningArea=normalizeLearningAreaName(area);curriculumManagerState.topic='';curriculumManagerState.subtopic='';curriculumManagerState.skill='';saveState();renderCurriculumManager();}
function addCurriculumLearningArea(){
  const name=normalizeLearningAreaName(prompt('Learning area name'));
  if(!name)return;
  if(curriculumLearningAreas().includes(name)){showToast('That learning area already exists',true);return;}
  deletedLearningAreas=(deletedLearningAreas||[]).filter(area=>normalizeLearningAreaName(area)!==name);
  customLearningAreas=[...new Set([...customLearningAreas,name])];
  setLearningAreaSubjectList(name,[]);
  setLearningAreaYearLevelList(name,[...ensureLearningAreaYearLevelRecord('Mathematics')]);
  selectCurriculumLearningArea(name);
  showToast('Learning area added');
}
function renameCurriculumLearningArea(){
  const old=activeCurriculumLearningArea();
  if(!old)return;
  const next=normalizeLearningAreaName(prompt('Rename learning area',old));
  if(!next||next===old)return;
  if(curriculumLearningAreas().filter(area=>area!==old).includes(next)){showToast('That learning area already exists',true);return;}
  customLearningAreas=[...new Set((customLearningAreas.length?customLearningAreas:[old]).map(area=>normalizeLearningAreaName(area)===old?next:area))];
  if(!customLearningAreas.includes(next))customLearningAreas.push(next);
  CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===old)link.learningArea=next;});
  if(learningAreaSubjects[old]){learningAreaSubjects[next]=learningAreaSubjects[old];delete learningAreaSubjects[old];}
  if(learningAreaYearLevels[old]){learningAreaYearLevels[next]=learningAreaYearLevels[old];delete learningAreaYearLevels[old];}
  curriculumManagerState={...curriculumManagerState,learningArea:next,topic:'',subtopic:'',skill:''};
  refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();showToast('Learning area heading updated');
}
function learningAreaDeleteBlockers(area){
  const key=normalizeLearningAreaName(area);
  const blockers=[];
  if(curriculumLinksForArea(key).length)blockers.push('topics/subtopics/skills');
  if(ensureLearningAreaSubjectRecord(key).length)blockers.push('subjects');
  return blockers;
}
function deleteCurriculumLearningArea(){
  const area=activeCurriculumLearningArea();
  if(!area){showToast('Select a learning area first',true);return;}
  const areas=curriculumLearningAreas();
  if(areas.length<=1){showToast('Keep at least one learning area',true);return;}
  const blockers=learningAreaDeleteBlockers(area);
  if(blockers.length){showToast(`Clear ${blockers.join(' and ')} before deleting this learning area.`,true);return;}
  if(!confirm(`Delete learning area "${area}"?`))return;
  deletedLearningAreas=[...new Set([...(deletedLearningAreas||[]),area])];
  customLearningAreas=customLearningAreas.filter(item=>normalizeLearningAreaName(item)!==area);
  delete learningAreaSubjects[area];
  delete learningAreaYearLevels[area];
  const next=curriculumLearningAreas()[0]||'Mathematics';
  curriculumManagerState={...curriculumManagerState,learningArea:next,topic:'',subtopic:'',skill:'',subject:'',yearLevel:''};
  refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();renderExam();showToast('Learning area deleted');
}function curriculumTopics(area=null){
  const source=area?curriculumLinksForArea(area):CURRICULUM_SKILL_LINKS;
  const firstSeen=new Map();
  source.filter(l=>l.topic).forEach((l,i)=>{
    const order=Number(l.topicOrder)||i+1;
    if(!firstSeen.has(l.topic)||order<firstSeen.get(l.topic).order)firstSeen.set(l.topic,{name:l.topic,order});
  });
  const values=[...firstSeen.values()].sort(progressionSort).map(x=>x.name);
  if(area&&curriculumManagerState.topic&&!values.includes(curriculumManagerState.topic))values.unshift(curriculumManagerState.topic);
  return values;
}
function progressionSort(a,b){return (Number(a.order)||0)-(Number(b.order)||0)||String(a.name).localeCompare(String(b.name),undefined,{numeric:true,sensitivity:'base'});}
function curriculumSubtopics(topic,area=activeCurriculumLearningArea()){
  const firstSeen=new Map();
  curriculumLinksForArea(area).filter(l=>l.topic===topic&&l.subtopic).forEach((l,i)=>{
    const order=Number(l.subtopicOrder)||i+1;
    if(!firstSeen.has(l.subtopic)||order<firstSeen.get(l.subtopic).order)firstSeen.set(l.subtopic,{name:l.subtopic,order});
  });
  const values=[...firstSeen.values()].sort(progressionSort).map(x=>x.name);
  if(curriculumManagerState.topic===topic&&curriculumManagerState.subtopic&&!values.includes(curriculumManagerState.subtopic))values.unshift(curriculumManagerState.subtopic);
  return values;
}
function curriculumSkills(topic,subtopic,area=activeCurriculumLearningArea()){return curriculumLinksForArea(area).filter(l=>l.topic===topic&&l.subtopic===subtopic&&l.skill).map((l,i)=>({...l,__fallbackOrder:i+1})).sort((a,b)=>(Number(a.skillOrder)||a.__fallbackOrder)-(Number(b.skillOrder)||b.__fallbackOrder)||String(a.skill).localeCompare(String(b.skill),undefined,{numeric:true,sensitivity:'base'}));}
function selectedCurriculumSkill(){const area=activeCurriculumLearningArea();return CURRICULUM_SKILL_LINKS.find(l=>normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===curriculumManagerState.topic&&l.subtopic===curriculumManagerState.subtopic&&l.skill&&l.skill===curriculumManagerState.skill)||null;}
function findCurriculumPlaceholder(topic,subtopic=''){const area=activeCurriculumLearningArea();return CURRICULUM_SKILL_LINKS.find(l=>normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===topic&&l.subtopic===subtopic&&!l.skill)||null;}
function ensureCurriculumPlaceholder(topic,subtopic='',orders={}){const area=activeCurriculumLearningArea();let link=findCurriculumPlaceholder(topic,subtopic);if(link)return link;link={learningArea:area,topic,subtopic,skill:'',subjects:[],yearLevels:[],topicOrder:Number(orders.topicOrder)||0,subtopicOrder:Number(orders.subtopicOrder)||0,skillOrder:0,active:true};CURRICULUM_SKILL_LINKS.push(link);return link;}
function ensureCurriculumSelection(){
  const area=activeCurriculumLearningArea();
  curriculumManagerState.learningArea=area;
  const topics=curriculumTopics(area);
  if(!curriculumManagerState.topic||!topics.includes(curriculumManagerState.topic))curriculumManagerState.topic=topics[0]||'';
  const subtopics=curriculumSubtopics(curriculumManagerState.topic,area);
  if(!curriculumManagerState.subtopic||!subtopics.includes(curriculumManagerState.subtopic))curriculumManagerState.subtopic=subtopics[0]||'';
  const skills=curriculumSkills(curriculumManagerState.topic,curriculumManagerState.subtopic,area);
  if(!curriculumManagerState.skill||!skills.some(l=>l.skill===curriculumManagerState.skill))curriculumManagerState.skill=skills[0]?.skill||'';
  const subjects=examSubjectValues(area);
  if(!curriculumManagerState.subject||!subjects.includes(curriculumManagerState.subject))curriculumManagerState.subject=subjects[0]||'';
  const authors=authorValues(false);
  if(!curriculumManagerState.author||!authors.includes(curriculumManagerState.author))curriculumManagerState.author=authors[0]||'';
  const years=curriculumYearLevelValues();
  if(!curriculumManagerState.yearLevel||!years.includes(curriculumManagerState.yearLevel))curriculumManagerState.yearLevel=years[0]||'';
}
function selectCurriculumTopic(topic){curriculumManagerState.topic=topic;curriculumManagerState.subtopic='';curriculumManagerState.skill='';renderCurriculumManager();}
function selectCurriculumSubtopic(subtopic){curriculumManagerState.subtopic=subtopic;curriculumManagerState.skill='';renderCurriculumManager();}
function selectCurriculumSkill(skill){curriculumManagerState.skill=skill;renderCurriculumManager();}
function renderCurriculumList(elId,items,active,onSelect,emptyText,showProgress=false){
  const el=document.getElementById(elId);if(!el)return;
  el.innerHTML=items.length?items.map((item,index)=>`<button type="button" class="curriculum-item ${item===active?'active':''}" onclick="${onSelect}('${escJs(item)}')">${showProgress?`${index+1}. `:''}${esc(item)}</button>`).join(''):`<div class="curriculum-item empty">${esc(emptyText)}</div>`;
}
function normalizeSubjectName(value){return String(value||'').replace(/\s+/g,' ').trim();}
function normalizeYearLevelName(value){return String(value||'').replace(/\s+/g,' ').trim();}function normalizeAuthorName(value){return String(value||'').replace(/\s+/g,' ').trim();}
function authorValues(includeQuestionAuthors=true){
  const hidden=new Set((deletedAuthors||[]).map(normalizeAuthorName).filter(Boolean));
  const values=[...DEFAULT_AUTHOR_OPTIONS.filter(author=>!hidden.has(normalizeAuthorName(author))),...customAuthors];
  if(includeQuestionAuthors)questions.forEach(q=>{if(q.author)values.push(q.author);});
  return [...new Set(values.map(normalizeAuthorName).filter(Boolean).filter(author=>!hidden.has(author)))];
}
function isDefaultAuthor(author){return DEFAULT_AUTHOR_OPTIONS.map(normalizeAuthorName).includes(normalizeAuthorName(author));}
function replaceAuthorOnQuestions(oldName,newName){
  questions.forEach(q=>{if(q.author===oldName)q.author=newName;if(Array.isArray(q.subQuestions))q.subQuestions.forEach(sq=>{if(sq.author===oldName)sq.author=newName;});});
  examQuestions.forEach(q=>{if(q.author===oldName)q.author=newName;if(Array.isArray(q.subQuestions))q.subQuestions.forEach(sq=>{if(sq.author===oldName)sq.author=newName;});});
}
function syncAuthorSelectOptions(id,selected){
  const el=document.getElementById(id);if(!el)return;
  const current=normalizeAuthorName(selected||el.value||'Original');
  const values=authorValues(true);
  el.innerHTML=values.map(author=>`<option value="${esc(author)}">${esc(author)}</option>`).join('');
  el.value=values.includes(current)?current:(values[0]||'Original');
}
function syncAuthorDropdowns(){
  syncAuthorSelectOptions('f-author');
  syncAuthorSelectOptions('extractor-global-author');
}
function renderCurriculumSubjects(){renderCurriculumLinkList('subject');}
function renderCurriculumAuthors(){
  const el=document.getElementById('curriculum-author-list');if(!el)return;
  const values=authorValues(false);
  el.innerHTML=values.length?values.map(author=>`<button type="button" class="curriculum-item ${author===curriculumManagerState.author?'active':''}" onclick="selectCurriculumAuthor('${escJs(author)}')">${esc(author)}</button>`).join(''):'<div class="curriculum-item empty">No authors yet</div>';
}
function selectCurriculumAuthor(author){curriculumManagerState.author=normalizeAuthorName(author);renderCurriculumAuthors();}
function addCurriculumAuthor(){
  const name=normalizeAuthorName(prompt('Author name'));
  if(!name)return;
  if(authorValues(false).includes(name)){showToast('That author already exists',true);return;}
  customAuthors=[...new Set([...customAuthors,name])];
  curriculumManagerState.author=name;
  syncAuthorDropdowns();refreshCurriculumConsumers();saveState();renderCurriculumManager();showToast('Author added');
}
function renameSelectedCurriculumAuthor(){renameCurriculumAuthor(curriculumManagerState.author);}
function renameCurriculumAuthor(oldName){
  oldName=normalizeAuthorName(oldName);
  if(!oldName){showToast('Select an author first',true);return;}
  const name=normalizeAuthorName(prompt('Rename author',oldName));
  if(!name||name===oldName)return;
  if(authorValues(false).filter(a=>a!==oldName).includes(name)){showToast('That author already exists',true);return;}
  if(isDefaultAuthor(oldName))deletedAuthors=[...new Set([...(deletedAuthors||[]),oldName])];
  customAuthors=[...new Set([...customAuthors.filter(author=>author!==oldName),name].map(normalizeAuthorName).filter(Boolean).filter(author=>!(deletedAuthors||[]).includes(author)))];
  replaceAuthorOnQuestions(oldName,name);
  curriculumManagerState.author=name;
  syncAuthorDropdowns();refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();renderExam();showToast('Author renamed and questions updated');
}
function deleteSelectedCurriculumAuthor(){deleteCurriculumAuthor(curriculumManagerState.author);}
function deleteCurriculumAuthor(name){
  name=normalizeAuthorName(name);
  if(!name){showToast('Select an author first',true);return;}
  const remaining=authorValues(false).filter(author=>author!==name);
  if(!remaining.length){showToast('Keep at least one author in the curriculum manager',true);return;}
  const used=questions.some(q=>q.author===name||q.subQuestions?.some(sq=>sq.author===name))||examQuestions.some(q=>q.author===name||q.subQuestions?.some(sq=>sq.author===name));
  if(used){showToast('This author is used by questions. Rename it instead so existing questions stay consistent.',true);return;}
  if(!confirm(`Delete author "${name}" from the curriculum manager?`))return;
  if(isDefaultAuthor(name))deletedAuthors=[...new Set([...(deletedAuthors||[]),name])];
  customAuthors=customAuthors.filter(author=>author!==name);
  curriculumManagerState.author=remaining[0]||'';
  syncAuthorDropdowns();refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();renderExam();showToast('Author deleted');
}
function renderCurriculumLinkList(kind){
  const link=selectedCurriculumSkill();
  const isSubject=kind==='subject';
  const el=document.getElementById(isSubject?'curriculum-subject-link-list':'curriculum-year-link-list');if(!el)return;
  const values=isSubject?examSubjectValues(activeCurriculumLearningArea()):curriculumManagerYearLevelValues();
  const linked=link?(isSubject?(link.subjects||[]):(link.yearLevels||[])):[];
  const active=isSubject?curriculumManagerState.subject:curriculumManagerState.yearLevel;
  if(!values.length){el.innerHTML='<div class="curriculum-item empty">No items yet</div>';return;}
  el.innerHTML=values.map(value=>`<label class="curriculum-link-item ${linked.includes(value)?'checked':''} ${active===value?'active':''}" onclick="selectCurriculumLink('${kind}','${escJs(value)}')"><input type="checkbox" ${linked.includes(value)?'checked':''} onchange="toggleCurriculumLink('${kind}','${escJs(value)}',this.checked)" ${link?'':'disabled'}> <span>${esc(value)}</span></label>`).join('');
}
function toggleCurriculumLink(kind,value,checked){
  const link=selectedCurriculumSkill();if(!link)return;
  const key=kind==='subject'?'subjects':'yearLevels';
  const values=[...(link[key]||[])].filter(Boolean);
  link[key]=checked?[...new Set([...values,value])]:values.filter(v=>v!==value);
  if(kind==='subject')curriculumManagerState.subject=value;else curriculumManagerState.yearLevel=value;
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange();saveState();renderCurriculumManager();renderBank();
}
function selectCurriculumLink(kind,value){if(kind==='subject')curriculumManagerState.subject=value;else curriculumManagerState.yearLevel=value;}
function saveCurriculumQuietly(){
  saveState();
  if(supabaseClient)saveCurriculumToSupabase(true).catch(e=>console.warn('Could not sync curriculum quietly:',e));
}function addCurriculumSubject(){
  const area=activeCurriculumLearningArea();
  const name=normalizeSubjectName(prompt('Subject name'));
  if(!name)return;
  const subjects=ensureLearningAreaSubjectRecord(area);
  if(subjects.includes(name)){showToast('That subject already exists in this learning area',true);return;}
  setLearningAreaSubjectList(area,[...subjects,name]);
  customSubjects=subjectRowsFromLearningAreas(false).map(row=>row.name);
  curriculumManagerState.subject=name;
  refreshCurriculumConsumers();saveCurriculumQuietly();renderCurriculumManager();showToast('Subject added');
}
function renameSelectedCurriculumSubject(){renameCurriculumSubject(curriculumManagerState.subject);}
function renameCurriculumSubject(oldName){
  if(!oldName){showToast('Select a subject first',true);return;}
  const area=activeCurriculumLearningArea();
  const name=normalizeSubjectName(prompt('Rename subject',oldName));
  if(!name||name===oldName)return;
  const subjects=ensureLearningAreaSubjectRecord(area);
  if(subjects.filter(s=>s!==oldName).includes(name)){showToast('That subject already exists in this learning area',true);return;}
  setLearningAreaSubjectList(area,subjects.map(s=>s===oldName?name:s));
  CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===area)link.subjects=(link.subjects||[]).map(s=>s===oldName?name:s);});
  customSubjects=subjectRowsFromLearningAreas(false).map(row=>row.name);
  curriculumManagerState.subject=name;
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange({silent:true});saveCurriculumQuietly();renderCurriculumManager();renderBank();showToast('Subject renamed and linked questions updated');
}
function deleteSelectedCurriculumSubject(){deleteCurriculumSubject(curriculumManagerState.subject);}
function deleteCurriculumSubject(name){
  if(!name){showToast('Select a subject first',true);return;}
  const area=activeCurriculumLearningArea();
  if(!confirm(`Delete subject "${name}" from ${area} and untick it from skills in this learning area?`))return;
  setLearningAreaSubjectList(area,ensureLearningAreaSubjectRecord(area).filter(s=>s!==name));
  CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===area)link.subjects=(link.subjects||[]).filter(s=>s!==name);});
  customSubjects=subjectRowsFromLearningAreas(false).map(row=>row.name);
  curriculumManagerState.subject='';
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange({silent:true});saveCurriculumQuietly();renderCurriculumManager();renderBank();showToast('Subject deleted and linked questions updated');
}
function addCurriculumYearLevel(){
  const area=activeCurriculumLearningArea();
  const name=normalizeYearLevelName(prompt('Year level name'));
  if(!name)return;
  if(curriculumYearLevelValues(area).includes(name)){showToast('That year level already exists in this learning area',true);return;}
  setLearningAreaYearLevelList(area,[...ensureLearningAreaYearLevelRecord(area),name]);
  curriculumManagerState.yearLevel=name;
  refreshCurriculumConsumers();saveState();renderCurriculumManager();showToast('Year level added');
}
function renameSelectedCurriculumYearLevel(){renameCurriculumYearLevel(curriculumManagerState.yearLevel);}
function renameCurriculumYearLevel(oldName){
  if(!oldName){showToast('Select a year level first',true);return;}
  const area=activeCurriculumLearningArea();
  const name=normalizeYearLevelName(prompt('Rename year level',oldName));
  if(!name||name===oldName)return;
  if(curriculumYearLevelValues(area).filter(y=>y!==oldName).includes(name)){showToast('That year level already exists in this learning area',true);return;}
  setLearningAreaYearLevelList(area,ensureLearningAreaYearLevelRecord(area).map(y=>y===oldName?name:y));
  CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===area)link.yearLevels=(link.yearLevels||[]).map(y=>y===oldName?name:y);});
  curriculumManagerState.yearLevel=name;
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange({silent:true});saveState();renderCurriculumManager();renderBank();showToast('Year level renamed and linked questions updated');
}
function deleteSelectedCurriculumYearLevel(){deleteCurriculumYearLevel(curriculumManagerState.yearLevel);}
function deleteCurriculumYearLevel(name){
  if(!name){showToast('Select a year level first',true);return;}
  const area=activeCurriculumLearningArea();
  if(!confirm(`Delete year level "${name}" from this learning area and untick it from its skills?`))return;
  setLearningAreaYearLevelList(area,ensureLearningAreaYearLevelRecord(area).filter(y=>y!==name));
  CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===area)link.yearLevels=(link.yearLevels||[]).filter(y=>y!==name);});
  curriculumManagerState.yearLevel='';
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange({silent:true});saveState();renderCurriculumManager();renderBank();showToast('Year level deleted and linked questions updated');
}
function curriculumYoutubeKey(item,index){return item?.id?`id:${item.id}`:`local:${index}`;}
function selectedCurriculumYoutubeItems(){
  const link=selectedCurriculumSkill();
  return link?youtubeLinksForCurriculumSkill(link).map(item=>syncYoutubeLinkSkillFields(item,link)):[];
}
function renderCurriculumYoutubeForm(item=null,key='new'){
  const title=item?.title||'';
  const url=item?.url||'';
  return `<div class="curriculum-youtube-form">
    <label>Title<input id="curriculum-youtube-title" type="text" value="${esc(title)}" placeholder="e.g. Minimum cut explained"></label>
    <label>URL<input id="curriculum-youtube-url" type="url" value="${esc(url)}" placeholder="https://www.youtube.com/watch?v=..."></label>
    <div class="curriculum-youtube-form-actions">
      <button type="button" class="btn btn-primary btn-sm" onclick="saveCurriculumYoutubeLink('${escJs(key)}')"><i class="ti ti-device-floppy"></i>Save</button>
      <button type="button" class="btn btn-sm" onclick="cancelCurriculumYoutubeLinkEdit()">Cancel</button>
    </div>
  </div>`;
}
function renderCurriculumYoutubeLinks(){
  const el=document.getElementById('curriculum-youtube-link-list');if(!el)return;
  const link=selectedCurriculumSkill();
  if(!link){curriculumYoutubeEditingKey='';curriculumYoutubeSelectedKey='';el.innerHTML='<div class="curriculum-item empty">Select a skill first</div>';return;}
  const items=selectedCurriculumYoutubeItems();
  if(curriculumYoutubeSelectedKey&&!items.some((item,index)=>curriculumYoutubeKey(item,index)===curriculumYoutubeSelectedKey))curriculumYoutubeSelectedKey='';
  const editingItem=curriculumYoutubeEditingKey&&curriculumYoutubeEditingKey!=='new'?findCurriculumYoutubeLink(curriculumYoutubeEditingKey):null;
  const form=curriculumYoutubeEditingKey?renderCurriculumYoutubeForm(editingItem,curriculumYoutubeEditingKey):'';
  const list=items.length?items.map((item,index)=>{
    const key=curriculumYoutubeKey(item,index);
    const active=key===curriculumYoutubeSelectedKey?' active':'';
    return `<button type="button" class="curriculum-youtube-item curriculum-item${active}" onclick="selectCurriculumYoutubeLink('${escJs(key)}')"><span class="curriculum-youtube-title">${esc(item.title)}</span></button>`;
  }).join(''):'<div class="curriculum-item empty">No YouTube links for this skill</div>';
  el.innerHTML=form+list;
}
function selectCurriculumYoutubeLink(key){
  curriculumYoutubeSelectedKey=key;
  curriculumYoutubeEditingKey='';
  renderCurriculumYoutubeLinks();
}
function selectedCurriculumYoutubeKey(){
  const items=selectedCurriculumYoutubeItems();
  if(curriculumYoutubeSelectedKey&&items.some((item,index)=>curriculumYoutubeKey(item,index)===curriculumYoutubeSelectedKey))return curriculumYoutubeSelectedKey;
  return '';
}
function editSelectedCurriculumYoutubeLink(){
  const key=selectedCurriculumYoutubeKey();
  if(!key){showToast('Select a YouTube link first',true);return;}
  editCurriculumYoutubeLink(key);
}
function moveSelectedCurriculumYoutubeLink(direction){
  const key=selectedCurriculumYoutubeKey();
  if(!key){showToast('Select a YouTube link first',true);return;}
  moveCurriculumYoutubeLink(key,direction);
}
function deleteSelectedCurriculumYoutubeLink(){
  const key=selectedCurriculumYoutubeKey();
  if(!key){showToast('Select a YouTube link first',true);return;}
  deleteCurriculumYoutubeLink(key);
}
function findCurriculumYoutubeLink(key){
  const items=selectedCurriculumYoutubeItems();
  if(String(key||'').startsWith('id:'))return items.find(item=>item.id===key.slice(3))||null;
  if(String(key||'').startsWith('local:'))return items[Number(key.slice(6))]||null;
  return items.find(item=>(item.id||item.title)===key)||null;
}
function renumberCurriculumYoutubeLinks(){
  const link=selectedCurriculumSkill();
  if(!link)return;
  selectedCurriculumYoutubeItems().forEach((item,index)=>{item.sortOrder=index+1;syncYoutubeLinkSkillFields(item,link);});
}
function moveCurriculumYoutubeLink(key,direction){
  const items=selectedCurriculumYoutubeItems();
  const index=items.findIndex((item,itemIndex)=>curriculumYoutubeKey(item,itemIndex)===key);
  const next=index+Number(direction||0);
  if(index<0||next<0||next>=items.length)return;
  renumberCurriculumYoutubeLinks();
  const current=items[index];
  const target=items[next];
  const currentOrder=current.sortOrder;
  current.sortOrder=target.sortOrder;
  target.sortOrder=currentOrder;
  curriculumYoutubeEditingKey='';
  saveCurriculumQuietly();
  renderCurriculumYoutubeLinks();
}
function addCurriculumYoutubeLink(){
  if(!selectedCurriculumSkill()){showToast('Select a skill first',true);return;}
  curriculumYoutubeEditingKey='new';
  renderCurriculumYoutubeLinks();
  setTimeout(()=>document.getElementById('curriculum-youtube-title')?.focus(),0);
}
function editCurriculumYoutubeLink(key){
  if(!findCurriculumYoutubeLink(key))return;
  curriculumYoutubeEditingKey=key;
  curriculumYoutubeSelectedKey=key;
  renderCurriculumYoutubeLinks();
  setTimeout(()=>document.getElementById('curriculum-youtube-title')?.focus(),0);
}
function cancelCurriculumYoutubeLinkEdit(){
  curriculumYoutubeEditingKey='';
  renderCurriculumYoutubeLinks();
}
function saveCurriculumYoutubeLink(key){
  const link=selectedCurriculumSkill();if(!link){showToast('Select a skill first',true);return;}
  const title=(document.getElementById('curriculum-youtube-title')?.value||'').trim();
  const url=(document.getElementById('curriculum-youtube-url')?.value||'').trim();
  if(!title){showToast('YouTube title is required',true);return;}
  if(!url){showToast('YouTube URL is required',true);return;}
  if(!/^https?:\/\//i.test(url)){showToast('Enter a full YouTube URL starting with http or https',true);return;}
  if(key&&key!=='new'){
    const item=findCurriculumYoutubeLink(key);if(!item)return;
    item.title=title;item.url=url;syncYoutubeLinkSkillFields(item,link);
    showToast('YouTube link updated');
  }else{
    const sortOrder=selectedCurriculumYoutubeItems().length+1;
    youtubeLinks.push(syncYoutubeLinkSkillFields({title,url,sortOrder},link));
    showToast('YouTube link added');
  }
  curriculumYoutubeEditingKey='';
  saveCurriculumQuietly();
  renderCurriculumYoutubeLinks();
}
function deleteCurriculumYoutubeLink(key){
  const item=findCurriculumYoutubeLink(key);if(!item||!confirm(`Delete YouTube link "${item.title}"?`))return;
  if(item.id)youtubeLinkDeletedIds.push(item.id);
  youtubeLinks=youtubeLinks.filter(link=>link!==item);
  curriculumYoutubeEditingKey='';
  renumberCurriculumYoutubeLinks();
  saveCurriculumQuietly();
  renderCurriculumYoutubeLinks();
  showToast('YouTube link deleted');
}
function renderCurriculumSkillEditor(){
  const el=document.getElementById('curriculum-skill-editor');if(!el)return;
  el.innerHTML='';
}
function renderCurriculumManager(){
  ensureCurriculumSelection();
  const area=activeCurriculumLearningArea();
  renderCurriculumLearningTabs();
  renderCurriculumSubjects();
  renderCurriculumAuthors();
  renderCurriculumList('curriculum-topic-list',curriculumTopics(area),curriculumManagerState.topic,'selectCurriculumTopic','No topics yet',true);
  renderCurriculumList('curriculum-subtopic-list',curriculumSubtopics(curriculumManagerState.topic,area),curriculumManagerState.subtopic,'selectCurriculumSubtopic','No subtopics yet',true);
  const skillNames=curriculumSkills(curriculumManagerState.topic,curriculumManagerState.subtopic,area).map(l=>l.skill);
  renderCurriculumList('curriculum-skill-list',skillNames,curriculumManagerState.skill,'selectCurriculumSkill','No skills yet',true);
  renderCurriculumSkillEditor();
  renderCurriculumLinkList('year');
  renderCurriculumYoutubeLinks();
}
function addCurriculumTopic(){const name=prompt('Topic name');const topic=name?.trim();if(!topic)return;const area=activeCurriculumLearningArea();const topics=curriculumTopics(area);if(topics.includes(topic)){showToast('That topic already exists',true);curriculumManagerState={...curriculumManagerState,topic,subtopic:'',skill:''};renderCurriculumManager();return;}ensureCurriculumPlaceholder(topic,'',{topicOrder:topics.length+1});curriculumManagerState={...curriculumManagerState,topic,subtopic:'',skill:''};refreshCurriculumConsumers();saveCurriculumQuietly();renderCurriculumManager();showToast('Topic added');}
function renameCurriculumTopic(){const area=activeCurriculumLearningArea(),old=curriculumManagerState.topic;if(!old)return;const name=prompt('Rename topic',old);const next=name?.trim();if(!next||next===old)return;CURRICULUM_SKILL_LINKS.forEach(l=>{if(normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===old)l.topic=next;});curriculumManagerState.topic=next;syncQuestionsAfterCurriculumRename('topic',old,next);refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();}
function removeCurriculumLinks(predicate){for(let i=CURRICULUM_SKILL_LINKS.length-1;i>=0;i--){const link=CURRICULUM_SKILL_LINKS[i];if(predicate(link)){if(link.id)curriculumDeletedIds.push(link.id);CURRICULUM_SKILL_LINKS.splice(i,1);}}}
function deleteCurriculumTopic(){const area=activeCurriculumLearningArea(),topic=curriculumManagerState.topic;if(!topic||!confirm(`Delete topic "${topic}" and all of its subtopics and skills?`))return;removeCurriculumLinks(l=>normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===topic);curriculumManagerState={...curriculumManagerState,topic:'',subtopic:'',skill:''};refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();}
function setTopicOrder(orderedTopics){
  const area=activeCurriculumLearningArea();
  orderedTopics.forEach((topic,index)=>CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===area&&link.topic===topic)link.topicOrder=index+1;}));
}
function moveCurriculumTopic(direction){
  const topic=curriculumManagerState.topic;
  if(!topic)return;
  const items=curriculumTopics(activeCurriculumLearningArea());
  const index=items.indexOf(topic),next=index+direction;
  if(index<0||next<0||next>=items.length)return;
  [items[index],items[next]]=[items[next],items[index]];
  setTopicOrder(items);
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange();saveState();renderCurriculumManager();renderBank();
}
function addCurriculumSubtopic(){if(!curriculumManagerState.topic){showToast('Add or select a topic first',true);return;}const name=prompt('Subtopic name');const subtopic=name?.trim();if(!subtopic)return;const area=activeCurriculumLearningArea(),topic=curriculumManagerState.topic;const subtopics=curriculumSubtopics(topic,area);if(subtopics.includes(subtopic)){showToast('That subtopic already exists',true);curriculumManagerState.subtopic=subtopic;curriculumManagerState.skill='';renderCurriculumManager();return;}const topics=curriculumTopics(area);ensureCurriculumPlaceholder(topic,subtopic,{topicOrder:Math.max(1,topics.indexOf(topic)+1),subtopicOrder:subtopics.length+1});curriculumManagerState.subtopic=subtopic;curriculumManagerState.skill='';refreshCurriculumConsumers();saveCurriculumQuietly();renderCurriculumManager();showToast('Subtopic added');}
function renameCurriculumSubtopic(){const area=activeCurriculumLearningArea(),topic=curriculumManagerState.topic,old=curriculumManagerState.subtopic;if(!topic||!old)return;const name=prompt('Rename subtopic',old);const next=name?.trim();if(!next||next===old)return;CURRICULUM_SKILL_LINKS.forEach(l=>{if(normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===topic&&l.subtopic===old)l.subtopic=next;});curriculumManagerState.subtopic=next;syncQuestionsAfterCurriculumRename('subtopic',old,next,{topic});refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();}
function deleteCurriculumSubtopic(){const area=activeCurriculumLearningArea(),topic=curriculumManagerState.topic,subtopic=curriculumManagerState.subtopic;if(!topic||!subtopic||!confirm(`Delete subtopic "${subtopic}" and all of its skills?`))return;removeCurriculumLinks(l=>normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===topic&&l.subtopic===subtopic);curriculumManagerState.subtopic='';curriculumManagerState.skill='';refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();}
function setSubtopicOrder(topic,orderedSubtopics){
  const area=activeCurriculumLearningArea();
  orderedSubtopics.forEach((subtopic,index)=>CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===area&&link.topic===topic&&link.subtopic===subtopic)link.subtopicOrder=index+1;}));
}
function moveCurriculumSubtopic(direction){
  const topic=curriculumManagerState.topic,subtopic=curriculumManagerState.subtopic;
  if(!topic||!subtopic)return;
  const items=curriculumSubtopics(topic);
  const index=items.indexOf(subtopic),next=index+direction;
  if(index<0||next<0||next>=items.length)return;
  [items[index],items[next]]=[items[next],items[index]];
  setSubtopicOrder(topic,items);
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange();saveState();renderCurriculumManager();renderBank();
}
function setSkillOrder(topic,subtopic,orderedSkills){
  const area=activeCurriculumLearningArea();
  orderedSkills.forEach((skill,index)=>{const link=CURRICULUM_SKILL_LINKS.find(l=>normalizeLearningAreaName(l.learningArea||'Mathematics')===area&&l.topic===topic&&l.subtopic===subtopic&&l.skill===skill);if(link)link.skillOrder=index+1;});
}
function moveCurriculumSkill(direction){
  const topic=curriculumManagerState.topic,subtopic=curriculumManagerState.subtopic,skill=curriculumManagerState.skill;
  if(!topic||!subtopic||!skill)return;
  const items=curriculumSkills(topic,subtopic).map(l=>l.skill);
  const index=items.indexOf(skill),next=index+direction;
  if(index<0||next<0||next>=items.length)return;
  [items[index],items[next]]=[items[next],items[index]];
  setSkillOrder(topic,subtopic,items);
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange();saveState();renderCurriculumManager();renderBank();
}
function addCurriculumSkill(){const area=activeCurriculumLearningArea(),topic=curriculumManagerState.topic,subtopic=curriculumManagerState.subtopic;if(!topic||!subtopic){showToast('Add or select a topic and subtopic first',true);return;}const skill=prompt('Skill name');const skillName=skill?.trim();if(!skillName)return;const topics=curriculumTopics(area);const topicOrder=Math.max(1,topics.includes(topic)?topics.indexOf(topic)+1:topics.length+1);const subtopics=curriculumSubtopics(topic,area);const subtopicOrder=Math.max(1,subtopics.includes(subtopic)?subtopics.indexOf(subtopic)+1:subtopics.length+1);const skillOrder=curriculumSkills(topic,subtopic,area).length+1;const placeholder=findCurriculumPlaceholder(topic,subtopic);if(placeholder){placeholder.skill=skillName;placeholder.skillOrder=skillOrder;}else{CURRICULUM_SKILL_LINKS.push({learningArea:area,topic,subtopic,skill:skillName,subjects:[],yearLevels:[],topicOrder,subtopicOrder,skillOrder,active:true});}curriculumManagerState.skill=skillName;refreshCurriculumConsumers();saveState();renderCurriculumManager();}
function renameCurriculumSkill(){const link=selectedCurriculumSkill();if(!link)return;const old=link.skill;const name=prompt('Rename skill',old);const next=name?.trim();if(!next||next===old)return;link.skill=next;curriculumManagerState.skill=next;syncQuestionsAfterCurriculumRename('skill',old,next,{topic:link.topic,subtopic:link.subtopic});refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();}
function saveCurriculumSkill(){
  const link=selectedCurriculumSkill();if(!link)return;
  const name=(document.getElementById('curriculum-skill-name')?.value||'').trim();
  if(!name){showToast('Skill name is required',true);return;}
  link.skill=name;
  const subjectChecks=[...document.querySelectorAll('.curriculum-subject-check:checked')];
  const yearChecks=[...document.querySelectorAll('.curriculum-year-check:checked')];
  if(subjectChecks.length)link.subjects=subjectChecks.map(cb=>cb.value);
  if(yearChecks.length)link.yearLevels=yearChecks.map(cb=>cb.value);
  curriculumManagerState.skill=name;
  refreshCurriculumConsumers();syncQuestionsAfterCurriculumLinkChange({silent:true});saveState();renderCurriculumManager();renderBank();showToast('Skill updated and linked questions updated');
}
function deleteCurriculumSkill(){const link=selectedCurriculumSkill();if(!link||!confirm(`Delete skill "${link.skill}"?`))return;if(link.id)curriculumDeletedIds.push(link.id);const i=CURRICULUM_SKILL_LINKS.indexOf(link);if(i>-1)CURRICULUM_SKILL_LINKS.splice(i,1);curriculumManagerState.skill='';refreshCurriculumConsumers();saveState();renderCurriculumManager();renderBank();}
function listOverlapsStrict(a,b){const aa=Array.isArray(a)?a:splitCreatorMultiValue(a);const bb=Array.isArray(b)?b:splitCreatorMultiValue(b);return !aa.length||!bb.length||aa.some(v=>bb.includes(v));}
function questionCurriculumWarnings(q){
  const skills=splitCreatorMultiValue(q.skills,'skills'),topics=splitCreatorMultiValue(q.topic||q.topics,'topics'),subtopics=splitCreatorMultiValue(q.subtopic||q.subtopics,'subtopics'),subjects=splitCreatorMultiValue(q.subject||q.subjects,'subjects'),years=normalizeCurriculumYearLevels(q.yearLevels||q.yearLevel||q.yearFrom||'');
  if(!skills.length)return [];
  return skills.filter(skill=>{
    const matches=CURRICULUM_SKILL_LINKS.filter(l=>l.skill===skill);
    if(!matches.length)return true;
    return !matches.some(l=>(!topics.length||topics.includes(l.topic))&&(!subtopics.length||subtopics.includes(l.subtopic))&&listOverlapsStrict(subjects,l.subjects||[])&&listOverlapsStrict(years,l.yearLevels||[]));
  });
}
function curriculumWarningHtml(q){const bad=questionCurriculumWarnings(q);return bad.length?`<div class="curriculum-warning"><i class="ti ti-alert-triangle"></i>Old/invalid curriculum skill link: ${esc(bad.join(', '))}</div>`:'';}
function addToExamDirect(id){const q=questions.find(x=>x.id===id);if(!q||examQuestions.find(x=>x.id===id))return;if(isTeacherRole()&&(q.bank||'private')!=='global'){showToast('Teacher role can only add questions from Live Quiz Bank',true);return;}examQuestions.push(prepareQuestionForExam(q));saveState();renderExam();showToast('Added to exam');}








