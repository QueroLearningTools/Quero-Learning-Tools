// Classroom: card display and open-classroom tab shell.
(function(){
  let classroomEditingAnnouncement = null;
  let classroomEditingStudent = null;
  let classroomCompassImport = null;
  const classroomAnnouncementFiles = new Map();
  let classroomTrackerTerm = null;
  let classroomVassSection = 'unit3';
  let classroomVassRankTeacherFilter = 'all';
  let classroomTrackerPercentageDrag = null;
  let classroomPracticeMenuPositioner = null;
  let classroomPracticeOutsideClickHandler = null;
  const classroomExpandedResources = new Set();
  const CLASSROOM_DETAILED_PRACTICE_ATTEMPT_LIMIT = 3;

  function renderClassGrid(deps){
    const { classes, homeClassSettingsOpen, homeEsc, resolveHomeClassColor, resolveHomeClassBanner, homeClassDisplayCode, homeUnreadClassActivity } = deps;
    const studentMode = isStudentClassroomRole();
    return `<div class="home-class-grid">${classes.map((cls, index)=>{
      const classIndex = Number.isInteger(cls.__homeClassIndex) ? cls.__homeClassIndex : index;
      const unread = homeUnreadClassActivity ? homeUnreadClassActivity(cls) : 0;
      return `
      <article class="home-class-card" style="--home-class-color:${homeEsc(resolveHomeClassColor(cls.color))}" onclick="openHomeClassroom(${classIndex})">
        <div class="home-class-cover ${String(cls.color || '').toLowerCase() === 'dark' ? 'dark' : ''}" style="background:${homeEsc(resolveHomeClassColor(cls.color))}">
          <div class="home-class-cover-shape"></div>
          <div class="home-class-cover-icon"><i class="ti ${homeEsc(resolveHomeClassBanner(cls.banner || cls.subject || cls.name).icon)}"></i></div>
        </div>
        ${unread ? `<button type="button" class="home-class-notification" onclick="event.stopPropagation();openHomeClassroom(${classIndex})" title="${unread} new post${unread === 1 ? ' or comment' : 's or comments'}" aria-label="Open ${unread} new classroom update${unread === 1 ? '' : 's'}"><i class="ti ti-bell"></i><span class="home-class-notification-count">${unread > 9 ? '9+' : unread}</span></button>` : ''}
        <div class="home-class-settings-wrap">
          <button type="button" class="home-class-settings" onclick="toggleHomeClassSettings(${classIndex}, event)" title="Class settings"><i class="ti ti-settings"></i></button>
          ${homeClassSettingsOpen === classIndex ? `<div class="home-class-settings-menu">
            ${studentMode
              ? `<button type="button" onclick="leaveHomeClass(${classIndex}, event)"><i class="ti ti-logout-2"></i><span>Leave</span></button>`
              : `<button type="button" onclick="openEditHomeClassModal(${classIndex}, event)"><i class="ti ti-pencil"></i><span>Edit</span></button>
                <button type="button" onclick="archiveHomeClass(${classIndex}, event)"><i class="ti ti-archive"></i><span>Archive</span></button>
                <button type="button" onclick="deleteHomeClass(${classIndex}, event)"><i class="ti ti-trash"></i><span>Delete</span></button>`}
          </div>` : ''}
        </div>
        <div class="home-class-space">
          <div class="home-class-title">${homeEsc(cls.name || 'Untitled class')}</div>
          ${cls.yearLevel ? `<div class="home-class-year-level">Year ${homeEsc(cls.yearLevel)}</div>` : ''}
          <button type="button" class="home-class-code" onclick="openHomeClassCodeModal(${classIndex}, event)">${homeEsc(homeClassDisplayCode(cls,classIndex))}</button>
        </div>
      </article>
    `; }).join('')}</div>`;
  }

  function classroomHexToRgb(hex){
    const value = String(hex || '').replace('#','').trim();
    if(value.length !== 6) return { r:216, g:27, b:96 };
    return { r:parseInt(value.slice(0,2),16), g:parseInt(value.slice(2,4),16), b:parseInt(value.slice(4,6),16) };
  }

  function classroomRgbToHex(rgb){
    return `#${Math.max(0,Math.min(255,Math.round(rgb.r))).toString(16).padStart(2,'0')}${Math.max(0,Math.min(255,Math.round(rgb.g))).toString(16).padStart(2,'0')}${Math.max(0,Math.min(255,Math.round(rgb.b))).toString(16).padStart(2,'0')}`;
  }

  function classroomMixHex(color,target,amount){
    const base = classroomHexToRgb(color);
    const to = classroomHexToRgb(target);
    return classroomRgbToHex({
      r:base.r + (to.r - base.r) * amount,
      g:base.g + (to.g - base.g) * amount,
      b:base.b + (to.b - base.b) * amount
    });
  }

  function classroomHeadingColourStyle(color){
    const base = color || '#d81b60';
    const soft = classroomMixHex(base,'#ffffff',0.94);
    const text = classroomMixHex(base,'#000000',0.42);
    return `--classroom-heading-bg:${soft};--classroom-heading-text:${text};--classroom-heading-group-bg:${soft};--classroom-heading-group-text:${text};`;
  }

  function renderClassroomView(deps){
    const { cls, index, homeClassTab, homeEsc, resolveHomeClassColor, resolveHomeClassBanner, homeClassDisplayCode, renderHomeClassTabContent } = deps;
    const code = homeClassDisplayCode(cls,index);
    const classColor = resolveHomeClassColor(cls.color);
    const headingStyle = classroomHeadingColourStyle(classColor);
    const vassAllowed = classroomAllowsVass(cls);
    const tabs = [['home','Home'],['students','Students'],['tracker','Tracker'], ...(vassAllowed ? [['vass','VASS']] : []), ['resources','Resources']];
    const activeTab = vassAllowed && (homeClassTab === 'unit3' || homeClassTab === 'unit4') ? 'vass' : vassAllowed ? homeClassTab : (homeClassTab === 'vass' || homeClassTab === 'unit3' || homeClassTab === 'unit4' ? 'home' : homeClassTab);
    return `
      <div class="home-root home-classroom-view-root">
        <div class="home-body">
          <main class="home-classroom-wrap" style="${homeEsc(headingStyle)}">
            <button type="button" class="home-classroom-back" onclick="closeHomeClassroom()"><i class="ti ti-chevron-left"></i><span>Back to classrooms</span></button>
            <section class="home-open-class-hero" style="background:${homeEsc(classColor)}">
              <div class="home-class-cover-shape"></div>
              <div class="home-open-class-icon"><i class="ti ${homeEsc(resolveHomeClassBanner(cls.banner || cls.subject || cls.name).icon)}"></i></div>
              <div class="home-open-class-title">
                <h1>${homeEsc(cls.name || 'Untitled class')}</h1>
                <p>${cls.yearLevel ? `Year ${homeEsc(cls.yearLevel)}` : ''}</p>
              </div>
              <button type="button" class="home-open-class-code" onclick="openHomeClassCodeModal(${index}, event)"><span>Classroom Code</span><strong>${homeEsc(code)}</strong></button>
            </section>
            <section class="home-class-tabs-panel">
              <div class="home-class-tabs" role="tablist">
                ${tabs.map(([key,label])=>`<button type="button" class="home-class-tab ${activeTab === key ? 'active' : ''}" onclick="setHomeClassTab('${key}', event)">${homeEsc(label)}</button>`).join('')}
              </div>
              <div class="home-class-tab-content">${renderHomeClassTabContent(cls,index)}</div>
            </section>
          </main>
        </div>
      </div>`;
  }

  function classroomClasses(){
    try { return JSON.parse(localStorage.getItem('queroClasses') || '[]') || []; }
    catch { return []; }
  }

  function saveClassroomClasses(classes){
    localStorage.setItem('queroClasses', JSON.stringify(classes || []));
  }

  function classroomProfile(){
    const profile = typeof currentProfile !== 'undefined' ? currentProfile : null;
    const user = typeof currentUser !== 'undefined' ? currentUser : null;
    const email = user?.email || profile?.email || '';
    const name = profile?.displayName || profile?.username || user?.user_metadata?.displayName || email?.split('@')[0] || 'User';
    return { name, email, userId:user?.id || '' };
  }

  function classroomProfileName(){
    return classroomProfile().name;
  }

  function classroomCurrentStudent(cls){
    const profile = classroomProfile();
    const email = String(profile.email || '').trim().toLowerCase();
    const userId = profile.userId || '';
    return classroomStudents(cls).find(student=>{
      return (userId && student.userId === userId) || (email && String(student.email || '').trim().toLowerCase() === email);
    }) || { key:userId || email || profile.name, name:profile.name, email:profile.email, userId:profile.userId };
  }

  function classroomSync(){
    return window.QueroClassroomSupabase || null;
  }

  function classroomInitial(name){
    return String(name || 'Q').trim().charAt(0).toUpperCase() || 'Q';
  }

  function isStudentClassroomRole(){
    return (typeof isProtectedStudentRole === 'function' && isProtectedStudentRole()) || (typeof currentRole !== 'undefined' && (currentRole === 'student' || currentRole === 's_student'));
  }

  function classroomAllowsVass(cls){
    if(isStudentClassroomRole()) return false;
    const year = String(cls?.yearLevel || cls?.year_level || '').toLowerCase();
    return year.includes('12') && year.includes('vce');
  }

  function classroomStudentKey(student,index){
    return String(student?.id || student?.userId || student?.user_id || student?.email || student?.name || `student-${index}`);
  }

  function classroomStudentSortName(student){
    const parts = classroomStudentNameParts(student);
    return `${parts.surname} ${parts.given}`.trim().toLowerCase();
  }

  function classroomStudentNameParts(student){
    const givenName = String(student?.givenName || student?.given_name || student?.firstName || student?.first_name || student?.first || '').trim();
    const surname = String(student?.surname || student?.lastName || student?.last_name || student?.last || '').trim();
    if(givenName || surname){
      const duplicateSuffix = surname && givenName.toLowerCase().endsWith(` ${surname.toLowerCase()}`);
      return { given:duplicateSuffix ? givenName.slice(0,-surname.length).trim() : givenName || String(student?.name || '').trim(), surname };
    }
    const name = String(student?.name || '').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if(parts.length <= 1) return { given:name, surname:'' };
    return { given:parts.slice(0,-1).join(' '), surname:parts[parts.length - 1] };
  }

  function classroomStudents(cls){
    const raw = Array.isArray(cls?.students) ? cls.students : Array.isArray(cls?.members) ? cls.members : [];
    return raw
      .filter(student => typeof student === 'string' || !student?.role || student.role === 'student')
      .map((student,index)=>{
        if(typeof student === 'string'){
          return { id:'', key:`student-${index}`, sourceIndex:index, name:student, email:'', status:'Active', joinedAt:'' };
        }
        const givenName = String(student?.givenName || student?.given_name || student?.firstName || student?.first_name || student?.first || '').trim();
        const surname = String(student?.surname || student?.lastName || student?.last_name || student?.last || '').trim();
        const name = student?.displayName || student?.display_name || [givenName,surname].filter(Boolean).join(' ') || student?.name || `${student?.firstName || student?.first || ''} ${student?.lastName || student?.last || ''}`.trim() || student?.email || `Student ${index + 1}`;
        const nameParts = classroomStudentNameParts({ ...student, name, givenName, surname });
        const normalised = {
          id: student?.id || '',
          key: classroomStudentKey(student,index),
          sourceIndex:index,
          schoolMemberId: student?.schoolMemberId || student?.school_member_id || '',
          userId: student?.userId || student?.user_id || '',
          givenName: nameParts.given,
          surname: nameParts.surname,
          needsNameBackfill: !!student?.needsNameBackfill || !givenName || !surname || (surname && givenName.toLowerCase().endsWith(` ${surname.toLowerCase()}`)),
          name,
          email: student?.email || '',
          status: student?.status === 'Inactive' ? 'Inactive' : 'Active',
          joinedAt: student?.joinedAt || student?.joined_at || student?.createdAt || student?.created_at || ''
        };
        return normalised;
      })
      .sort((a,b)=>classroomStudentSortName(a).localeCompare(classroomStudentSortName(b), undefined, {sensitivity:'base'}));
  }

  function classroomFindStudentIndex(cls,key){
    const raw = Array.isArray(cls?.students) ? cls.students : [];
    return raw.findIndex((student,index)=>{
      if(typeof student === 'string') return classroomStudentKey({ name:student }, index) === key || `student-${index}` === key;
      return classroomStudentKey(student,index) === key;
    });
  }

  function classroomStudentDate(value){
    const date = value ? new Date(value) : null;
    if(!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function classroomActiveStudents(cls){
    return classroomStudents(cls)
      .filter(student => student.status !== 'Inactive')
      .map(student => {
        const parts = classroomStudentNameParts(student);
        const first = String(parts.given || student.name || '').trim().split(/\s+/).filter(Boolean)[0] || student.name || 'Student';
        return { ...student, firstName:first };
      });
  }

  function classroomTrackerTerms(){
    return [['term1','Term 1'],['term2','Term 2'],['term3','Term 3'],['term4','Term 4']];
  }

  function classroomTracker(cls){
    cls.tracker = cls.tracker && typeof cls.tracker === 'object' ? cls.tracker : {};
    classroomTrackerTerms().forEach(([key])=>{
      cls.tracker[key] = cls.tracker[key] && typeof cls.tracker[key] === 'object' ? cls.tracker[key] : {};
      cls.tracker[key].tasks = Array.isArray(cls.tracker[key].tasks) ? cls.tracker[key].tasks : [];
      cls.tracker[key].results = cls.tracker[key].results && typeof cls.tracker[key].results === 'object' ? cls.tracker[key].results : {};
      cls.tracker[key].attempts = cls.tracker[key].attempts && typeof cls.tracker[key].attempts === 'object' ? cls.tracker[key].attempts : {};
    });
    cls.tracker.percentageLegend = classroomTrackerPercentageLegend(cls.tracker.percentageLegend);
    cls.tracker.percentageLegendEnabled = cls.tracker.percentageLegendEnabled !== false;
    cls.tracker.percentageLegendOpen = cls.tracker.percentageLegendOpen === true;
    cls.tracker.activeTerm = cls.tracker.activeTerm || 'term1';
    return cls.tracker;
  }

  function classroomActiveTrackerTerm(cls){
    const tracker = classroomTracker(cls);
    return classroomTrackerTerm || tracker.activeTerm || 'term1';
  }

  function classroomTaskTypes(){
    return [
      { value:'score', label:'Score', icon:'ti-percentage' },
      { value:'completion', label:'Task Completion', icon:'ti-clipboard-check' },
      { value:'progress', label:'Progress', icon:'ti-alert-circle' },
      { value:'practice', label:'Quero Practice', icon:'ti-flame' }
    ];
  }

  function classroomTaskType(type){
    return classroomTaskTypes().find(item => item.value === type) || classroomTaskTypes()[0];
  }

  function classroomDefaultTaskOptions(type){
    if(type === 'progress') return ['At-Risk','Provisional N','Confirm N'];
    if(type === 'completion') return ['Done','Partial','Missing','Late'];
    return [];
  }

  function classroomTrackerOptionColours(){
    return [
      { value:'green', label:'Green' },
      { value:'amber', label:'Amber' },
      { value:'yellow', label:'Yellow' },
      { value:'orange', label:'Orange' },
      { value:'red', label:'Red' },
      { value:'purple', label:'Purple' },
      { value:'blue', label:'Blue' },
      { value:'grey', label:'Grey' }
    ];
  }

  function classroomTrackerDefaultPercentageLegend(){
    return [
      { threshold:20, color:'red' },
      { threshold:40, color:'red' },
      { threshold:60, color:'amber' },
      { threshold:80, color:'green' },
      { threshold:100, color:'green' }
    ];
  }

  function classroomTrackerPercentageLegend(value){
    const colours = classroomTrackerOptionColours().map(item=>item.value);
    const source = Array.isArray(value) && value.length ? value : classroomTrackerDefaultPercentageLegend();
    const steps = source.slice(0,5).map((step,index)=>{
      const fallback = classroomTrackerDefaultPercentageLegend()[index] || { threshold:100, color:'green' };
      const threshold = Math.max(0, Math.min(100, Number(step?.threshold ?? step?.value ?? fallback.threshold) || fallback.threshold));
      const color = colours.includes(String(step?.color || step?.colour || '').toLowerCase()) ? String(step.color || step.colour).toLowerCase() : fallback.color;
      return { threshold, color };
    });
    while(steps.length < 5) steps.push(classroomTrackerDefaultPercentageLegend()[steps.length]);
    return steps.sort((a,b)=>a.threshold-b.threshold);
  }

  function classroomTrackerPercentageColour(cls,value){
    if(classroomTracker(cls).percentageLegendEnabled === false) return '';
    const score = Number(String(value ?? '').replace('%','').trim());
    if(!Number.isFinite(score)) return '';
    const legend = classroomTrackerPercentageLegend(classroomTracker(cls).percentageLegend);
    const step = legend.find(item=>score <= Number(item.threshold)) || legend[legend.length - 1];
    return step?.color || '';
  }

  function classroomTrackerPercentageColourVar(color){
    const clean = String(color || 'green').toLowerCase();
    return `var(--home-tracker-percent-${clean}, #dff6e5)`;
  }

  function classroomTrackerPercentageGradient(legend){
    const steps = classroomTrackerPercentageLegend(legend);
    let start = 0;
    const parts = [];
    steps.forEach(step=>{
      const end = Math.max(start, Math.min(100, Number(step.threshold) || 0));
      parts.push(`${classroomTrackerPercentageColourVar(step.color)} ${start}% ${end}%`);
      start = end;
    });
    if(start < 100){
      const last = steps[steps.length - 1] || { color:'green' };
      parts.push(`${classroomTrackerPercentageColourVar(last.color)} ${start}% 100%`);
    }
    return `linear-gradient(90deg, ${parts.join(', ')})`;
  }

  function classroomTrackerPercentageSnap(value){
    const number = Number(value);
    if(!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number / 5) * 5));
  }

  function classroomTrackerOptionLabel(option){
    if(option && typeof option === 'object') return String(option.label || option.value || '').trim();
    return String(option || '').trim();
  }

  function classroomTrackerDefaultOptionColour(label,type,index=0){
    const clean = String(label || '').trim().toLowerCase();
    const map = {
      done:'green',
      partial:'amber',
      missing:'red',
      late:'orange',
      'at-risk':'red',
      'provisional n':'amber',
      'confirm n':'green'
    };
    if(map[clean]) return map[clean];
    const colours = classroomTrackerOptionColours().map(item=>item.value);
    return colours[index % colours.length] || 'blue';
  }

  function classroomTrackerOptionColour(option,type,index=0){
    const colours = classroomTrackerOptionColours().map(item=>item.value);
    const value = option && typeof option === 'object' ? String(option.color || option.colour || '').trim().toLowerCase() : '';
    if(colours.includes(value)) return value;
    return classroomTrackerDefaultOptionColour(classroomTrackerOptionLabel(option), type, index);
  }

  function classroomTrackerOptionObjects(options,type){
    const source = Array.isArray(options) && options.length ? options : classroomDefaultTaskOptions(type);
    return source.map((option,index)=>({
      label: classroomTrackerOptionLabel(option),
      color: classroomTrackerOptionColour(option,type,index)
    })).filter(option=>option.label);
  }

  function classroomTrackerOptionForValue(options,value){
    const clean = String(value || '').trim();
    return options.find(option=>option.label === clean) || options[0] || { label:'', color:'blue' };
  }

  function classroomPracticeScoreDisplayOptions(){
    return [
      { value:'first', label:'First attempt' },
      { value:'average', label:'Average score' },
      { value:'highest', label:'Highest score' }
    ];
  }

  function classroomPracticeScoreDisplay(value){
    return classroomPracticeScoreDisplayOptions().some(option=>option.value === value) ? value : 'first';
  }

  function classroomSundayDate(){
    const date = new Date();
    const day = date.getDay();
    const add = day === 0 ? 0 : 7 - day;
    date.setDate(date.getDate() + add);
    return date.toISOString().slice(0,10);
  }

  function classroomDateInputValue(value){
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return value;
    return classroomSundayDate();
  }

  function classroomDateFromInput(value){
    const parts = String(value || '').split('-').map(Number);
    if(parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function classroomWeekStart(date){
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  }

  function classroomWeekKey(value){
    return classroomWeekStart(classroomDateFromInput(classroomDateInputValue(value))).toISOString().slice(0,10);
  }

  function classroomShortDate(date){
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth() + 1).padStart(2,'0')}`;
  }

  function classroomWeekLabel(key,index){
    const start = classroomDateFromInput(key);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `Week ${index + 1} (${classroomShortDate(start)}-${classroomShortDate(end)})`;
  }

  function classroomGroupedTasks(tasks){
    const groups = new Map();
    (tasks || []).forEach(task=>{
      const key = classroomWeekKey(task.dueDate || task.createdAt);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(task);
    });
    return [...groups.entries()]
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([key,items])=>({ key, tasks:items.sort((a,b)=>String(a.createdAt || '').localeCompare(String(b.createdAt || ''))) }));
  }

  function classroomTrackerResult(termData,taskId,studentKey){
    termData.results[taskId] = termData.results[taskId] && typeof termData.results[taskId] === 'object' ? termData.results[taskId] : {};
    return termData.results[taskId][studentKey] ?? '';
  }

  function classroomTrackerAttempts(termData,taskId,studentKey){
    termData.attempts = termData.attempts && typeof termData.attempts === 'object' ? termData.attempts : {};
    termData.attempts[taskId] = termData.attempts[taskId] && typeof termData.attempts[taskId] === 'object' ? termData.attempts[taskId] : {};
    termData.attempts[taskId][studentKey] = Array.isArray(termData.attempts[taskId][studentKey]) ? termData.attempts[taskId][studentKey] : [];
    return termData.attempts[taskId][studentKey];
  }

  function classroomPracticeAttemptRecordType(attempt){
    return String(attempt?.recordType || attempt?.data?.recordType || '').trim();
  }

  function classroomPracticeHistoryAttempts(attempts){
    return (attempts || [])
      .filter(attempt=>classroomPracticeAttemptRecordType(attempt) !== 'best')
      .sort((a,b)=>(Number(a.attemptNumber) || 0) - (Number(b.attemptNumber) || 0) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
      .slice(0, CLASSROOM_DETAILED_PRACTICE_ATTEMPT_LIMIT);
  }

  function classroomPracticeAttemptNumber(attempt,index=0){
    return Number(attempt?.attemptNumber || attempt?.data?.attemptNumber) || index + 1;
  }

  function classroomPracticeCanReview(attempt){
    const answers = attempt?.answers || attempt?.data?.answers;
    const questions = attempt?.questions || attempt?.data?.questions;
    return answers && typeof answers === 'object' && Array.isArray(questions) && questions.length > 0;
  }

  function classroomTrackerAttemptSummary(termData,taskId,studentKey){
    termData.practiceAttemptSummaries = termData.practiceAttemptSummaries && typeof termData.practiceAttemptSummaries === 'object' ? termData.practiceAttemptSummaries : {};
    termData.practiceAttemptSummaries[taskId] = termData.practiceAttemptSummaries[taskId] && typeof termData.practiceAttemptSummaries[taskId] === 'object' ? termData.practiceAttemptSummaries[taskId] : {};
    termData.practiceAttemptSummaries[taskId][studentKey] = termData.practiceAttemptSummaries[taskId][studentKey] && typeof termData.practiceAttemptSummaries[taskId][studentKey] === 'object'
      ? termData.practiceAttemptSummaries[taskId][studentKey]
      : { totalAttempts:0, firstScore:null, highestScore:null, scoreSum:0, latestScore:null, latestCorrect:null, latestTotal:null, latestDurationMs:0, bestScore:null, bestCorrect:null, bestTotal:null, bestDurationMs:0, bestAttemptNumber:null, updatedAt:'' };
    return termData.practiceAttemptSummaries[taskId][studentKey];
  }

  function classroomUpdatePracticeAttemptSummary(summary,result){
    const score = Number(result?.percent) || 0;
    summary.totalAttempts = (Number(summary.totalAttempts) || 0) + 1;
    const attemptNumber = Number(summary.totalAttempts) || 1;
    if(summary.firstScore === null || summary.firstScore === undefined || summary.firstScore === '') summary.firstScore = score;
    const previousHigh = Number(summary.highestScore);
    summary.highestScore = Number.isFinite(previousHigh) ? Math.max(previousHigh, score) : score;
    summary.scoreSum = (Number(summary.scoreSum) || 0) + score;
    summary.latestScore = score;
    summary.latestCorrect = Number(result?.correct) || 0;
    summary.latestTotal = Number(result?.total) || 0;
    summary.latestDurationMs = Number(result?.durationMs) || 0;
    const bestScore = Number(summary.bestScore);
    const bestDuration = Number(summary.bestDurationMs) || 0;
    const duration = Number(result?.durationMs) || 0;
    const isBetterScore = !Number.isFinite(bestScore) || score > bestScore;
    const isFasterTie = score === bestScore && duration && (!bestDuration || duration < bestDuration);
    if(isBetterScore || isFasterTie){
      summary.bestScore = score;
      summary.bestCorrect = Number(result?.correct) || 0;
      summary.bestTotal = Number(result?.total) || 0;
      summary.bestDurationMs = duration;
      summary.bestAttemptNumber = attemptNumber;
    }
    summary.updatedAt = new Date().toISOString();
    return isBetterScore || isFasterTie;
  }

  function classroomSeedPracticeAttemptSummary(summary,attempts){
    const savedAttempts = Array.isArray(attempts) ? attempts : [];
    if((Number(summary.totalAttempts) || 0) >= savedAttempts.length) return;
    Object.assign(summary, { totalAttempts:0, firstScore:null, highestScore:null, scoreSum:0, latestScore:null, latestCorrect:null, latestTotal:null, latestDurationMs:0, bestScore:null, bestCorrect:null, bestTotal:null, bestDurationMs:0, bestAttemptNumber:null, updatedAt:'' });
    savedAttempts.forEach(attempt=>{
      const stats = classroomPracticeAttemptStats(attempt);
      const score = classroomPracticeScoreNumber(attempt);
      classroomUpdatePracticeAttemptSummary(summary, {
        percent: Number.isFinite(score) ? score : 0,
        correct: Number(stats?.correct) || Number(attempt?.correctCount) || 0,
        total: Number(stats?.total) || Number(attempt?.totalCount) || 0,
        durationMs: classroomAttemptDurationMs(attempt)
      });
      const attemptNumber = Number(attempt?.attemptNumber || attempt?.data?.attemptNumber);
      if(Number.isFinite(attemptNumber) && attemptNumber > 0) summary.totalAttempts = Math.max(Number(summary.totalAttempts) || 0, attemptNumber);
    });
  }

  function classroomPracticeDisplayScore(task,attempts,fallback='',summary=null){
    const method = classroomPracticeScoreDisplay(task?.scoreDisplay);
    const summaryCount = Number(summary?.totalAttempts) || 0;
    if(summaryCount > 0){
      const firstScore = Number(summary.firstScore);
      const highestScore = Number(summary.highestScore);
      const scoreSum = Number(summary.scoreSum);
      if(method === 'first' && Number.isFinite(firstScore)) return `${Math.round(firstScore)}%`;
      if(method === 'average' && Number.isFinite(scoreSum)) return `${Math.round(scoreSum / summaryCount)}%`;
      if(method === 'highest' && Number.isFinite(highestScore)) return `${Math.round(highestScore)}%`;
    }
    const scores = (attempts || [])
      .map(attempt=>Number(attempt?.scorePercent ?? attempt?.percent ?? attempt?.score))
      .filter(score=>Number.isFinite(score));
    if(!scores.length) return fallback || '';
    if(method === 'first') return `${Math.round(scores[0])}%`;
    if(method === 'average') return `${Math.round(scores.reduce((sum,score)=>sum + score,0) / scores.length)}%`;
    return `${Math.round(Math.max(...scores))}%`;
  }

  function classroomAttemptDurationMs(attempt){
    const raw = attempt?.durationMs ?? attempt?.timeMs ?? attempt?.elapsedMs ?? attempt?.data?.durationMs ?? attempt?.data?.timeMs ?? attempt?.data?.elapsedMs;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function classroomPracticeTimeLabel(attempt){
    const ms = classroomAttemptDurationMs(attempt);
    if(!ms) return '-';
    const minutes = Math.max(1, Math.round(ms / 60000));
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  }

  function classroomPracticeAttemptStats(attempt){
    const questions = Array.isArray(attempt?.questions) ? attempt.questions : Array.isArray(attempt?.data?.questions) ? attempt.data.questions : [];
    const attempted = questions.filter(item=>item && item.selectedIndex !== undefined && item.selectedIndex !== null);
    if(attempted.length){
      return {
        correct: attempted.filter(item=>Number(item.selectedIndex) === Number(item.correctIndex)).length,
        total: attempted.length
      };
    }
    const correct = Number(attempt?.correctCount ?? attempt?.correct ?? attempt?.data?.correctCount);
    const total = Number(attempt?.totalCount ?? attempt?.total ?? attempt?.data?.totalCount);
    if(Number.isFinite(correct) && Number.isFinite(total) && total > 0) return { correct, total };
    return null;
  }

  function classroomPracticeCorrectLabel(attempt){
    const stats = classroomPracticeAttemptStats(attempt);
    if(stats) return `${stats.correct}/${stats.total}`;
    return '-';
  }

  function classroomPracticeScoreLabel(attempt){
    const stats = classroomPracticeAttemptStats(attempt);
    if(stats?.total) return `${Math.round((stats.correct / stats.total) * 100)}%`;
    const score = Number(attempt?.scorePercent ?? attempt?.percent ?? attempt?.score ?? attempt?.data?.scorePercent);
    return Number.isFinite(score) ? `${Math.round(score)}%` : '-';
  }

  function classroomPracticeScoreNumber(attempt){
    const stats = classroomPracticeAttemptStats(attempt);
    if(stats?.total) return Math.round((stats.correct / stats.total) * 100);
    const score = Number(attempt?.scorePercent ?? attempt?.percent ?? attempt?.score ?? attempt?.data?.scorePercent);
    return Number.isFinite(score) ? score : null;
  }

  function classroomBestPracticeAttempt(attempts,summary=null){
    const candidates = (attempts || []).map((attempt,index)=>({ ...attempt, attemptNumber:classroomPracticeAttemptNumber(attempt,index) }));
    const summaryScore = Number(summary?.bestScore);
      if(Number.isFinite(summaryScore)){
      candidates.push({
        attemptNumber: Number(summary.bestAttemptNumber) || Number(summary.totalAttempts) || candidates.length + 1,
        scorePercent: summaryScore,
        correctCount: Number(summary.bestCorrect) || 0,
        totalCount: Number(summary.bestTotal) || 0,
        durationMs: Number(summary.bestDurationMs) || 0,
        createdAt: summary.updatedAt || ''
      });
    }
    return candidates.reduce((best,attempt)=>{
      const score = classroomPracticeScoreNumber(attempt);
      if(score === null) return best;
      if(!best) return attempt;
      const bestScore = classroomPracticeScoreNumber(best);
      if(score > bestScore) return attempt;
      if(score < bestScore) return best;
      const time = classroomAttemptDurationMs(attempt);
      const bestTime = classroomAttemptDurationMs(best);
      if(time && (!bestTime || time < bestTime)) return attempt;
      return best;
    }, null);
  }

  function classroomPracticeFallbackAttempt(value){
    const score = Number(String(value || '').replace('%','').trim());
    if(!Number.isFinite(score)) return [];
    return [{ scorePercent:score, durationMs:0, createdAt:'' }];
  }

  function classroomTrackerCell(classIndex,termKey,task,termData,student,homeEsc){
    const value = classroomTrackerResult(termData, task.id, student.key);
    if(task.type === 'completion' || task.type === 'progress'){
      const options = classroomTrackerOptionObjects(task.options, task.type);
      const selected = classroomTrackerOptionForValue(options, value || options[0]?.label);
      return `<select class="home-tracker-cell-select home-tracker-status-color-${homeEsc(selected.color)}" onchange="updateHomeTrackerCellSelectColour(this);saveHomeTrackerResult(${classIndex},'${homeEsc(termKey)}','${homeEsc(task.id)}','${homeEsc(student.key)}',this.value)">${options.map(option=>`<option value="${homeEsc(option.label)}" data-color="${homeEsc(option.color)}" ${selected.label === option.label ? 'selected' : ''}>${homeEsc(option.label)}</option>`).join('')}</select>`;
    }
    if(task.type === 'practice'){
      const attempts = classroomTrackerAttempts(termData, task.id, student.key);
      const summary = classroomTrackerAttemptSummary(termData, task.id, student.key);
      const display = classroomPracticeDisplayScore(task, attempts, value, summary) || '-';
      const colour = classroomTrackerPercentageColour(classroomClasses()[classIndex], display);
      return `<button type="button" class="home-tracker-practice-result ${colour ? `home-tracker-status-color-${homeEsc(colour)}` : ''}" onclick="openHomePracticeAttemptModal(${classIndex},'${homeEsc(termKey)}','${homeEsc(task.id)}','${homeEsc(student.key)}')">${homeEsc(display)}</button>`;
    }
    const colour = classroomTrackerPercentageColour(classroomClasses()[classIndex], value);
    return `<input class="home-tracker-cell-input ${colour ? `home-tracker-status-color-${homeEsc(colour)}` : ''}" type="number" min="0" max="100" inputmode="decimal" placeholder="%" value="${homeEsc(value)}" oninput="updateHomeTrackerPercentageInputColour(${classIndex},this)" onchange="saveHomeTrackerResult(${classIndex},'${homeEsc(termKey)}','${homeEsc(task.id)}','${homeEsc(student.key)}',this.value)">`;
  }

  function classroomStudentNameColumnWidth(students){
    const longest = Math.max(7, ...students.map(student => String(student.firstName || student.name || '').length));
    return Math.min(220, Math.max(118, longest * 9 + 42));
  }

  function classroomAttr(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function classroomJsString(value){
    return String(value == null ? '' : value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }

  function classroomCurriculumOptions(fnName,fallback=[]){
    try{
      const fn = window[fnName];
      if(typeof fn === 'function') return [...new Set((fn() || []).map(item=>String(item || '').trim()).filter(Boolean))];
    }catch(err){ console.warn(`Could not load ${fnName}`, err); }
    return fallback;
  }

  function classroomDataArray(value){
    if(Array.isArray(value)) return value.map(item=>String(item || '').trim()).filter(Boolean);
    return String(value || '').split(/[,;]/).map(item=>item.trim()).filter(Boolean);
  }

  function classroomTaskValues(value){
    if(Array.isArray(value)) return value.map(item=>String(item || '').trim()).filter(Boolean);
    const text = String(value || '').trim();
    if(!text) return [];
    if(text.startsWith('[')){
      try{
        const parsed = JSON.parse(text);
        if(Array.isArray(parsed)) return parsed.map(item=>String(item || '').trim()).filter(Boolean);
      }catch(err){}
    }
    return [text];
  }

  function classroomSameValue(a,b){
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function classroomPracticeLinks(cls,{topic=[],subtopic=[]}={}){
    let links = [];
    try{
      if(typeof CURRICULUM_SKILL_LINKS !== 'undefined' && Array.isArray(CURRICULUM_SKILL_LINKS)) links = CURRICULUM_SKILL_LINKS;
    }catch(err){ links = []; }
    const subject = String(cls?.subject || '').trim();
    const yearLevel = String(cls?.yearLevel || '').trim();
    const topics = classroomTaskValues(topic);
    const subtopics = classroomTaskValues(subtopic);
    return links.filter(link=>{
      if(!link || link.active === false) return false;
      if(topics.length && !topics.some(item=>classroomSameValue(link.topic, item))) return false;
      if(subtopics.length && !subtopics.some(item=>classroomSameValue(link.subtopic, item))) return false;
      const subjects = classroomDataArray(link.subjects || link.linkedSubjects || link.subject);
      if(subject && (!subjects.length || !subjects.some(item=>classroomSameValue(item, subject)))) return false;
      const years = classroomDataArray(link.yearLevels || link.linkedYearLevels || link.year_level || link.yearLevel);
      if(yearLevel && years.length && !years.some(item=>classroomSameValue(item, yearLevel))) return false;
      return true;
    });
  }

  function classroomPracticeUnique(links,key,orderKey){
    const firstSeen = new Map();
    links.forEach((link,index)=>{
      const name = String(link?.[key] || '').trim();
      if(!name) return;
      const order = Number(link?.[orderKey]) || index + 1;
      if(!firstSeen.has(name) || order < firstSeen.get(name).order) firstSeen.set(name,{name,order});
    });
    return [...firstSeen.values()].sort((a,b)=>a.order-b.order || a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})).map(item=>item.name);
  }

  function classroomPracticeTopics(cls){
    return classroomPracticeUnique(classroomPracticeLinks(cls),'topic','topicOrder');
  }

  function classroomPracticeSubtopics(cls,topic){
    if(!classroomTaskValues(topic).length) return [];
    return classroomPracticeUnique(classroomPracticeLinks(cls,{topic}),'subtopic','subtopicOrder');
  }

  function classroomPracticeSkills(cls,topic,subtopic){
    if(!classroomTaskValues(topic).length || !classroomTaskValues(subtopic).length) return [];
    return classroomPracticeUnique(classroomPracticeLinks(cls,{topic,subtopic}),'skill','skillOrder');
  }

  function trackerOptionHtml(values,selected='',emptyText='No options'){
    const clean = [...new Set((values || []).map(value=>String(value || '').trim()).filter(Boolean))];
    if(!clean.length) return `<option value="">${emptyText}</option>`;
    return clean.map(value=>`<option value="${classroomAttr(value)}" ${value === selected ? 'selected' : ''}>${classroomAttr(value)}</option>`).join('');
  }

  function trackerPracticeSelected(field){
    return [...document.querySelectorAll(`#home-tracker-task-${field} input[type="checkbox"]:checked`)].map(input=>input.value);
  }

  function trackerPracticeOptionsHtml(field,options,selected,classIndex,emptyText){
    if(!options.length) return `<div class="home-tracker-practice-empty">${emptyText}</div>`;
    return options.map(value=>`<label class="home-tracker-practice-option"><input type="checkbox" value="${classroomAttr(value)}" ${selected.includes(value) ? 'checked' : ''} onchange="updateHomeTrackerPracticeOptions(${classIndex},'${field}')"><span>${classroomAttr(value)}</span></label>`).join('');
  }

  function trackerPracticeSummary(field,selected,emptyText){
    return selected.length === 1 ? selected[0] : selected.length ? `${selected.length} selected` : emptyText || `Select ${field === 'skill' ? 'skills' : field + 's'}`;
  }

  function trackerPracticePicker(field,label,options,selected,classIndex,emptyText=''){
    const allOptions = [...new Set([...options,...selected])];
    return `<div class="home-tracker-practice-field"><span>${label}</span><details id="home-tracker-task-${field}" class="home-tracker-practice-picker"><summary title="${classroomAttr(selected.join(', '))}">${classroomAttr(trackerPracticeSummary(field,selected,emptyText))}</summary><div class="home-tracker-practice-menu">${trackerPracticeOptionsHtml(field,allOptions,selected,classIndex,emptyText || 'No options')}</div></details></div>`;
  }

  function syncTrackerPracticePicker(field,options,selected,classIndex,emptyText=''){
    const picker = document.getElementById(`home-tracker-task-${field}`);
    if(!picker) return;
    const summary = picker.querySelector('summary');
    summary.textContent = trackerPracticeSummary(field,selected,emptyText);
    summary.title = selected.join(', ');
    picker.querySelector('.home-tracker-practice-menu').innerHTML = trackerPracticeOptionsHtml(field,options,selected,classIndex,emptyText || 'No options');
  }

  function positionTrackerPracticeMenu(picker){
    const summary = picker.querySelector('summary');
    const menu = picker.querySelector('.home-tracker-practice-menu');
    if(!picker.open || !summary || !menu) return;
    const rect = summary.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const openAbove = below < 180 && above > below;
    const space = openAbove ? above : below;
    const maxHeight = Math.min(180,Math.max(40,space));
    menu.style.left = `${Math.max(8,rect.left)}px`;
    menu.style.width = `${Math.min(rect.width,window.innerWidth - 16)}px`;
    menu.style.maxHeight = `${maxHeight}px`;
    menu.style.top = `${openAbove ? rect.top - Math.min(menu.scrollHeight,maxHeight) - 4 : rect.bottom + 4}px`;
  }

  function closeTrackerPracticeMenus(shell,except=null){
    shell?.querySelectorAll('.home-tracker-practice-picker[open]').forEach(picker=>{
      if(picker !== except) picker.open = false;
    });
  }

  function trackerTaskFormOptions(task){
    return classroomTrackerOptionObjects(task?.options, task?.type || 'completion').map(option=>option.label).join(', ');
  }

  function renderTrackerOptionEditor(type,task){
    const options = classroomTrackerOptionObjects(task?.options, type);
    return `<div class="home-tracker-option-editor" id="home-tracker-option-editor">
      ${options.map((option,index)=>renderTrackerOptionRow(option,index)).join('')}
      <button type="button" class="home-tracker-add-option" onclick="addHomeTrackerOption()"><i class="ti ti-plus"></i><span>Add option</span></button>
    </div>`;
  }

  function renderTrackerOptionRow(option,index){
    const label = classroomTrackerOptionLabel(option);
    const color = classroomTrackerOptionColour(option, document.getElementById('home-tracker-task-type')?.value || 'completion', index);
    const colour = classroomTrackerOptionColours().find(item=>item.value === color) || classroomTrackerOptionColours()[0];
    return `<div class="home-tracker-option-row" data-option-color="${classroomAttr(colour.value)}">
      <input class="home-tracker-option-input" type="text" value="${classroomAttr(label)}" placeholder="Option ${index + 1}">
      <div class="home-tracker-option-colour">
        <button type="button" class="home-tracker-option-colour-button" onclick="toggleHomeTrackerOptionColour(this)" aria-expanded="false">
          <span><span class="home-tracker-option-colour-dot home-tracker-status-color-${classroomAttr(colour.value)}"></span>${classroomAttr(colour.label)}</span>
          <i class="ti ti-chevron-down"></i>
        </button>
        <div class="home-tracker-option-palette">
          ${classroomTrackerOptionColours().map(item=>`<button type="button" class="home-tracker-option-swatch home-tracker-status-color-${classroomAttr(item.value)} ${item.value === colour.value ? 'active' : ''}" onclick="selectHomeTrackerOptionColour(this,'${classroomAttr(item.value)}','${classroomAttr(item.label)}')" title="${classroomAttr(item.label)}" aria-label="${classroomAttr(item.label)}"></button>`).join('')}
        </div>
      </div>
      <button type="button" class="home-tracker-option-delete" onclick="removeHomeTrackerOption(this)" title="Delete option"><i class="ti ti-trash"></i></button>
    </div>`;
  }

  function trackerFindTask(cls,termKey,taskId){
    const tracker = classroomTracker(cls);
    return (tracker[termKey]?.tasks || []).find(task => task.id === taskId) || null;
  }

  function classroomDateLabel(value){
    const date = value ? new Date(value) : new Date();
    if(Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, { day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit' });
  }

  function classroomShortTimeLabel(value){
    const date = value ? new Date(value) : new Date();
    if(Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
  }

  function classroomAnnouncements(cls){
    return (Array.isArray(cls?.announcements) ? cls.announcements : [])
      .filter(item => item && String(item.text || '').trim())
      .sort((a,b)=>String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function classroomAnnouncementComments(item){
    return (Array.isArray(item?.comments) ? item.comments : [])
      .filter(comment => comment && String(comment.text || '').trim())
      .sort((a,b)=>String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  }

  function renderStudentTable(cls,index,homeEsc){
    const students = classroomStudents(cls);
    const studentMode = isStudentClassroomRole();
    if(!students.length) return `<div class="home-class-placeholder compact"><p>No students have joined this classroom yet.</p></div>`;
    return `<div class="home-student-table-wrap"><table class="home-student-table home-student-manage-table${studentMode ? ' home-student-readonly-table' : ''}">
      <thead><tr><th>Name</th><th>Surname</th><th>Email</th><th>Status</th>${studentMode ? '' : '<th class="home-student-actions-col">Actions</th>'}</tr></thead>
      <tbody>${students.map(student=>{
        const nameParts = classroomStudentNameParts(student);
        return `<tr>
          <td>${studentMode ? `<span class="home-student-readonly-name">${homeEsc(nameParts.given)}</span>` : `<input class="home-student-inline-input" type="text" value="${homeEsc(nameParts.given)}" placeholder="Name" onchange="saveHomeClassStudentIdentity(${index},'${homeEsc(student.key)}','name',this.value)">`}</td>
          <td>${studentMode ? `<span class="home-student-readonly-name">${homeEsc(nameParts.surname)}</span>` : `<input class="home-student-inline-input" type="text" value="${homeEsc(nameParts.surname)}" placeholder="Surname" onchange="saveHomeClassStudentIdentity(${index},'${homeEsc(student.key)}','surname',this.value)">`}</td>
          <td>${homeEsc(student.email)}</td>
          <td><label class="home-student-status-check"><input type="checkbox" ${student.status === 'Inactive' ? '' : 'checked'} ${studentMode ? 'disabled' : `onchange="saveHomeClassStudentStatus(${index},'${homeEsc(student.key)}',this.checked)"`}><span>${student.status === 'Inactive' ? 'Inactive' : 'Active'}</span></label></td>
          ${studentMode ? '' : `<td class="home-student-actions">
            <div class="home-student-actions-inner"><button type="button" onclick="deleteHomeClassStudent(${index},'${homeEsc(student.key)}')" title="Delete student"><i class="ti ti-trash"></i></button></div>
          </td>`}
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function renderCompassImportDialog(classIndex,homeEsc){
    const state = classroomCompassImport;
    if(!state || state.classIndex !== classIndex) return '';
    const preview = state.changes || [];
    return `<div class="home-compass-overlay" onclick="if(event.target===this)closeHomeClassCompassImport()">
      <section class="home-modal home-compass-dialog" role="dialog" aria-modal="true" aria-labelledby="home-compass-title">
        <h2 class="home-modal-title" id="home-compass-title">Import Compass class list</h2>
        <p class="home-compass-subtitle">Update names for students already in this classroom.</p>
        <label class="home-compass-file-field">Compass CSV file
          <input type="file" accept=".csv,text/csv" onchange="loadHomeClassCompassFile(${classIndex},this)"></label>
        <p class="home-compass-columns">First name: column 2 · Surname: column 3 · Email: column 7</p>
        ${state.fileName ? `<div class="home-compass-results"><strong>${homeEsc(state.fileName)}</strong><span>${preview.length} ${preview.length === 1 ? 'name' : 'names'} to update · ${state.unchanged} unchanged · ${state.unmatched} unmatched${state.invalid ? ` · ${state.invalid} invalid or duplicate` : ''}</span></div>` : ''}
        ${preview.length ? `<div class="home-compass-preview"><table><thead><tr><th>Email</th><th>Current name</th><th>New name</th></tr></thead><tbody>${preview.slice(0,8).map(row=>`<tr><td>${homeEsc(row.email)}</td><td>${homeEsc(row.currentName)}</td><td>${homeEsc([row.given,row.surname].filter(Boolean).join(' '))}</td></tr>`).join('')}</tbody></table>${preview.length > 8 ? `<p>Showing 8 of ${preview.length} matching students.</p>` : ''}</div>` : ''}
        <p class="home-compass-note">Only matching email addresses update. The CSV is not saved and is cleared on reload.</p>
        <div class="home-modal-actions home-compass-actions"><button type="button" onclick="closeHomeClassCompassImport()">Cancel</button><button type="button" class="primary" ${preview.length && !state.saving ? '' : 'disabled'} onclick="applyHomeClassCompassImport()">${state.saving ? 'Updating...' : 'Update names'}</button></div>
      </section></div>`;
  }

  function renderAnnouncementComments(item,index,homeEsc){
    const comments = classroomAnnouncementComments(item);
    return `<section class="home-announcement-comments" aria-label="Comments">
      ${comments.map(comment=>{
        const author = comment.author || 'User';
        return `<div class="home-announcement-comment">
          <div class="home-announcement-comment-avatar">${homeEsc(classroomInitial(author))}</div>
          <div class="home-announcement-comment-body">
            <div class="home-announcement-comment-meta">
              <strong>${homeEsc(author)}</strong>
              <span>${homeEsc(classroomShortTimeLabel(comment.createdAt))}</span>
            </div>
            <p>${homeEsc(comment.text)}</p>
          </div>
        </div>`;
      }).join('')}
      <div class="home-announcement-comment-input">
        <input id="home-announcement-comment-${homeEsc(item.id)}" type="text" placeholder="Add a comment..." onkeydown="handleHomeAnnouncementCommentKey(event,${index},'${homeEsc(item.id)}')">
        <button type="button" onclick="postHomeAnnouncementComment(${index},'${homeEsc(item.id)}')"><i class="ti ti-message-circle"></i><span>Comment</span></button>
      </div>
    </section>`;
  }

  function renderAnnouncementAttachments(item,index,homeEsc){
    const attachments = Array.isArray(item?.attachments) && item.attachments.length
      ? item.attachments
      : item?.attachment ? [item.attachment] : [];
    if(!attachments.length) return '';
    return `<div class="home-announcement-attachments">${attachments.map((attachment,attachmentIndex)=>{
      const size = classroomResourceSize(attachment.fileSize);
      return `<button type="button" class="home-announcement-attachment" onclick="downloadHomeAnnouncementAttachment(${index},'${homeEsc(item.id)}',${attachmentIndex})" title="Download ${homeEsc(attachment.fileName || 'attachment')}">
        <i class="ti ${homeEsc(classroomResourceIcon(attachment))}"></i>
        <span><strong>${homeEsc(attachment.fileName || 'Attachment')}</strong>${size ? `<small>${homeEsc(size)}</small>` : ''}</span>
        <i class="ti ti-download"></i>
      </button>`;
    }).join('')}</div>`;
  }

  function renderAnnouncementCard(item,index,studentMode,homeEsc){
    const author = item.author || 'Teacher';
    const isEditing = classroomEditingAnnouncement === item.id;
    return `<article class="home-announcement-card ${isEditing ? 'editing' : ''}">
      <div class="home-announcement-card-head">
        <div class="home-announcement-author">
          <div class="home-announcement-avatar">${homeEsc(classroomInitial(author))}</div>
          <div>
            <div class="home-announcement-name">${homeEsc(author)}</div>
            <div class="home-announcement-time">${homeEsc(classroomDateLabel(item.updatedAt || item.createdAt))}</div>
          </div>
        </div>
        ${studentMode ? '' : `<div class="home-announcement-card-actions">
          ${isEditing ? `<button type="button" onclick="saveHomeClassAnnouncementEdit(${index},'${homeEsc(item.id)}')" title="Save announcement"><i class="ti ti-check"></i></button>
            <button type="button" onclick="cancelHomeClassAnnouncementEdit()" title="Cancel edit"><i class="ti ti-x"></i></button>` : `<button type="button" onclick="startHomeClassAnnouncementEdit(${index},'${homeEsc(item.id)}')" title="Edit announcement"><i class="ti ti-pencil"></i></button>
            <button type="button" onclick="deleteHomeClassAnnouncement(${index},'${homeEsc(item.id)}')" title="Delete announcement"><i class="ti ti-trash"></i></button>`}
        </div>`}
      </div>
      ${isEditing ? `<textarea id="home-announcement-edit-${homeEsc(item.id)}" class="home-announcement-edit-textarea" rows="3" oninput="autoGrowHomeAnnouncement(this)" onfocus="autoGrowHomeAnnouncement(this)">${homeEsc(item.text)}</textarea>` : `<p>${homeEsc(item.text)}</p>`}
      ${renderAnnouncementAttachments(item,index,homeEsc)}
      ${renderAnnouncementComments(item,index,homeEsc)}
    </article>`;
  }

  function renderClassroomHome(cls,index,homeEsc){
    const announcements = classroomAnnouncements(cls);
    const studentMode = isStudentClassroomRole();
    const pendingFiles = classroomAnnouncementFiles.get(index) || [];
    return `<div class="home-class-tab-head home-announcement-head"><h2>Announcements</h2></div>
      ${studentMode ? '' : `<section class="home-announcement-composer">
        <textarea id="home-announcement-text-${index}" placeholder="Write an announcement for this classroom..." rows="3" oninput="autoGrowHomeAnnouncement(this)" onfocus="autoGrowHomeAnnouncement(this)"></textarea>
        <input id="home-announcement-file-input-${index}" class="home-announcement-file-input" type="file" multiple onchange="selectHomeAnnouncementFiles(${index},this)">
        <div class="home-announcement-toolbar">
          <button type="button" class="home-announcement-attach" onclick="document.getElementById('home-announcement-file-input-${index}')?.click()" title="Attach file" aria-label="Attach file"><i class="ti ti-paperclip"></i></button>
          <div id="home-announcement-files-${index}" class="home-announcement-selected-files" ${pendingFiles.length ? '' : 'hidden'}>${pendingFiles.map((file,fileIndex)=>`<div class="home-announcement-selected-file"><i class="ti ti-file"></i><span>${homeEsc(file.name || '')}</span><button type="button" onclick="removeHomeAnnouncementFile(${index},${fileIndex})" title="Remove attachment" aria-label="Remove attachment"><i class="ti ti-x"></i></button></div>`).join('')}</div>
          <span class="home-announcement-helper">Students in this classroom will see this.</span>
          <button id="home-announcement-post-${index}" type="button" class="home-announcement-post" onclick="postHomeClassAnnouncement(${index})"><i class="ti ti-send"></i><span>Post</span></button>
        </div>
      </section>`}
      ${announcements.length ? `<div class="home-announcement-feed">${announcements.map(item=>renderAnnouncementCard(item,index,studentMode,homeEsc)).join('')}</div>` : `<div class="home-class-placeholder compact"><p>No announcements posted yet.</p></div>`}
    `;
  }

  function classroomResources(cls){
    cls.resources = Array.isArray(cls.resources) ? cls.resources : [];
    return cls.resources.sort((a,b)=>String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  function classroomResourceIcon(resource){
    const name = String(resource?.fileName || resource?.title || '').toLowerCase();
    const type = String(resource?.fileType || '').toLowerCase();
    if(type.includes('pdf') || name.endsWith('.pdf')) return 'ti-notes';
    if(type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'ti-presentation';
    if(type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'ti-file-text';
    if(type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'ti-table';
    if(type.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(name)) return 'ti-photo';
    return 'ti-file';
  }

  function classroomResourceIconClass(resource){
    const name = String(resource?.fileName || resource?.title || '').toLowerCase();
    const type = String(resource?.fileType || '').toLowerCase();
    if(type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    if(type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) return 'powerpoint';
    if(type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'document';
    if(type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'spreadsheet';
    return 'default';
  }

  function classroomResourceIsPdf(resource){
    const name = String(resource?.fileName || resource?.title || '').toLowerCase();
    const type = String(resource?.fileType || '').toLowerCase();
    return type.includes('pdf') || name.endsWith('.pdf');
  }

  function classroomResourceIsImage(resource){
    const name = String(resource?.fileName || resource?.title || '').toLowerCase();
    const type = String(resource?.fileType || '').toLowerCase();
    return type.includes('image') || /\.(png|jpe?g|gif|webp)$/i.test(name);
  }

  function classroomResourceHasPdfPreview(resource){
    return classroomResourceIsPdf(resource) || !!(resource?.previewFilePath || resource?.previewFileUrl);
  }

  function classroomResourceSize(size){
    const bytes = Number(size) || 0;
    if(!bytes) return '';
    if(bytes < 1024) return `${bytes} B`;
    if(bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  function classroomResourceGroups(resources){
    const groups = new Map();
    (resources || []).forEach(resource=>{
      const title = String(resource.title || 'Resources').trim() || 'Resources';
      const key = title;
      if(!groups.has(key)) groups.set(key, { title, description:'', resources:[], createdAt:resource.createdAt || '', updatedAt:resource.updatedAt || '' });
      const group = groups.get(key);
      group.resources.push(resource);
      if(String(resource.createdAt || '') > String(group.createdAt || '')) group.createdAt = resource.createdAt || '';
      if(String(resource.updatedAt || '') > String(group.updatedAt || '')) group.updatedAt = resource.updatedAt || '';
    });
    groups.forEach(group=>{
      group.resources.sort((a,b)=>String(a.fileName || a.title || '').localeCompare(String(b.fileName || b.title || ''), undefined, { numeric:true, sensitivity:'base' }));
    });
    return [...groups.values()].sort((a,b)=>String(b.createdAt || b.updatedAt || '').localeCompare(String(a.createdAt || a.updatedAt || '')));
  }

  function renderClassroomResourceFile(resource,index,homeEsc){
    const canPreview = classroomResourceIsImage(resource) || classroomResourceHasPdfPreview(resource);
    return `<div class="home-resource-file-card">
      <div class="home-resource-file-meta">
        <i class="ti ${homeEsc(classroomResourceIcon(resource))} home-resource-file-icon-${homeEsc(classroomResourceIconClass(resource))}"></i>
        <div>
          <span>${homeEsc(resource.fileName || resource.fileUrl || resource.title || 'Resource file')}</span>
          ${classroomResourceSize(resource.fileSize) ? `<small>${homeEsc(classroomResourceSize(resource.fileSize))}</small>` : ''}
        </div>
      </div>
      <div class="home-resource-actions">
        ${canPreview ? `<button type="button" onclick="viewHomeClassResource(${index},'${homeEsc(resource.id)}')" title="View resource"><i class="ti ti-eye"></i><span>View</span></button>` : ''}
        <button type="button" onclick="downloadHomeClassResource(${index},'${homeEsc(resource.id)}')" title="Download resource"><i class="ti ti-download"></i><span>Download</span></button>
      </div>
    </div>`;
  }

  function renderClassroomResources(cls,index,homeEsc){
    const studentMode = isStudentClassroomRole();
    const resources = classroomResources(cls);
    const groups = classroomResourceGroups(resources);
    return `<div class="home-class-tab-head">
      <h2>Resources</h2>
      ${studentMode ? `<span class="home-class-tab-count">${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}</span>` : `<button type="button" onclick="openHomeClassResourceModal(${index})"><i class="ti ti-plus"></i><span>Add resource</span></button>`}
    </div>
    ${groups.length ? `<div class="home-resource-list">
      ${groups.map(group=>{
        const collapseKey = `${cls.id || cls.supabaseId || index}::${group.title}`;
        const collapsed = !classroomExpandedResources.has(collapseKey);
        return `<article class="home-resource-group ${studentMode ? 'student-view' : ''} ${collapsed ? 'collapsed' : ''}">
        <button type="button" class="home-resource-group-head" onclick="toggleHomeClassResourceGroup('${homeEsc(encodeURIComponent(collapseKey))}')" aria-expanded="${collapsed ? 'false' : 'true'}">
          <div class="home-resource-icon"><i class="ti ti-folder"></i></div>
          <div class="home-resource-main">
            <h3>${homeEsc(group.title)}</h3>
          ${group.description ? `<p>${homeEsc(group.description)}</p>` : ''}
          </div>
          <div class="home-resource-head-actions">
            <span class="home-resource-file-count">${group.resources.length} ${group.resources.length === 1 ? 'file' : 'files'}</span>
            <span class="home-resource-collapse-button"><i class="ti ti-chevron-down home-resource-collapse-icon"></i></span>
          </div>
        </button>
        ${studentMode ? '' : `<button type="button" class="home-resource-group-edit" onclick="openHomeClassResourceGroupModal(${index},decodeURIComponent('${homeEsc(encodeURIComponent(group.title))}'), event)" title="Edit resource"><i class="ti ti-pencil"></i><span>Edit</span></button>`}
        <div class="home-resource-file-grid" ${collapsed ? 'hidden' : ''}>
          ${group.resources.map(resource=>renderClassroomResourceFile(resource,index,homeEsc)).join('')}
        </div>
      </article>`;
      }).join('')}
    </div>` : `<div class="home-class-placeholder compact"><p>${studentMode ? 'No resources have been added yet.' : 'Add Word documents, PDFs, PowerPoint slides, links, and other classroom resources for students.'}</p></div>`}`;
  }

  function renderTrackerTermNav(index,activeTerm,homeEsc){
    return `<div class="home-tracker-term-tabs" role="tablist">
      ${classroomTrackerTerms().map(([key,label])=>`<button type="button" class="home-tracker-term-tab ${activeTerm === key ? 'active' : ''}" onclick="setHomeTrackerTerm(${index},'${homeEsc(key)}')">${homeEsc(label)}</button>`).join('')}
    </div>`;
  }

  function renderTrackerPercentageColourPicker(color,stepIndex,homeEsc,threshold=''){
    const colour = classroomTrackerOptionColours().find(item=>item.value === color) || classroomTrackerOptionColours()[0];
    return `<div class="home-tracker-percent-colour">
      <button type="button" class="home-tracker-percent-colour-button" onclick="toggleHomeTrackerPercentageColour(this)" aria-expanded="false">
        <span class="home-tracker-option-colour-dot home-tracker-status-color-${homeEsc(colour.value)}"></span>
        <i class="ti ti-chevron-down"></i>
      </button>
      <span class="home-tracker-percent-value">${homeEsc(threshold)}</span>
      <div class="home-tracker-percent-palette">
        ${classroomTrackerOptionColours().map(item=>`<button type="button" class="home-tracker-option-swatch home-tracker-status-color-${homeEsc(item.value)} ${item.value === colour.value ? 'active' : ''}" onclick="selectHomeTrackerPercentageColour(this,${stepIndex},'${homeEsc(item.value)}','${homeEsc(item.label)}')" title="${homeEsc(item.label)}" aria-label="${homeEsc(item.label)}"></button>`).join('')}
      </div>
    </div>`;
  }

  function renderTrackerPercentageLegendToggle(cls,index,homeEsc){
    if(isStudentClassroomRole()) return '';
    const tracker = classroomTracker(cls);
    return `<button type="button" class="home-tracker-percentage-toggle" onclick="toggleHomeTrackerPercentageLegend(${index})" aria-expanded="${tracker.percentageLegendOpen ? 'true' : 'false'}">
        <i class="ti ti-color-picker"></i><span>Percentage</span><i class="ti ${tracker.percentageLegendOpen ? 'ti-chevron-up' : 'ti-chevron-down'}"></i>
      </button>`;
  }

  function renderTrackerPercentageLegendPanel(cls,index,homeEsc){
    if(isStudentClassroomRole()) return '';
    const tracker = classroomTracker(cls);
    if(!tracker.percentageLegendOpen) return '';
    const legend = classroomTrackerPercentageLegend(tracker.percentageLegend);
    const gradient = classroomTrackerPercentageGradient(legend);
    return `<section class="home-tracker-percentage-legend open" data-class-index="${index}">
      <div class="home-tracker-percentage-panel">
        <div class="home-tracker-percentage-panel-top">
          <div class="home-tracker-percentage-scope">
            <span>Score</span>
            <span>Quero Practice</span>
          </div>
          <label class="home-tracker-percentage-switch">
            <span>Colour cells</span>
            <input type="checkbox" ${tracker.percentageLegendEnabled === false ? '' : 'checked'} onchange="toggleHomeTrackerPercentageLegendEnabled(${index},this.checked)">
            <span class="home-tracker-percentage-switch-track"><span></span></span>
          </label>
        </div>
        <div class="home-tracker-percentage-row">
          <div class="home-tracker-percentage-number-line" data-class-index="${index}">
            <div class="home-tracker-percentage-line" style="background:${homeEsc(gradient)}" aria-hidden="true"></div>
            ${legend.map((step,stepIndex)=>`<div class="home-tracker-percentage-step" data-step="${stepIndex}" data-color="${homeEsc(step.color)}" style="left:${Math.max(0, Math.min(100, Number(step.threshold) || 0))}%" onpointerdown="startHomeTrackerPercentageDrag(event,${index},${stepIndex})">
              <input type="number" min="0" max="100" step="5" value="${homeEsc(step.threshold)}" aria-label="Percentage threshold ${stepIndex + 1}" oninput="updateHomeTrackerPercentageLegend(${index})" onchange="updateHomeTrackerPercentageLegend(${index},true)">
              ${renderTrackerPercentageColourPicker(step.color,stepIndex,homeEsc,step.threshold)}
            </div>`).join('')}
            <div class="home-tracker-percentage-axis" aria-hidden="true">
              ${[0,20,40,60,80,100].map(value=>`<span style="left:${value}%"><i></i><b>${value}${value === 0 || value === 100 ? '%' : ''}</b></span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  function renderTrackerEmpty(students){
    if(!students.length) return `<div class="home-class-placeholder compact"><p>No active students yet. Students marked Active in the Students tab will appear here.</p></div>`;
    return `<div class="home-class-placeholder compact"><p>No tasks added yet. Add a task to start tracking this term.</p></div>`;
  }

  function renderTrackerTable(cls,index,termKey,homeEsc){
    const tracker = classroomTracker(cls);
    const termData = tracker[termKey];
    const students = classroomActiveStudents(cls);
    const groups = classroomGroupedTasks(termData.tasks);
    if(!students.length || !groups.length) return renderTrackerEmpty(students);
    const nameWidth = classroomStudentNameColumnWidth(students);
    const studentMode = isStudentClassroomRole();
    return `<div class="home-tracker-table-wrap">
      <table class="home-tracker-table" style="--student-name-width:${nameWidth}px">
        <thead>
          <tr>
            <th class="home-tracker-student-heading" rowspan="2">Name</th>
            ${groups.map((group,groupIndex)=>`<th class="home-tracker-week-heading" colspan="${group.tasks.length}">${homeEsc(classroomWeekLabel(group.key,groupIndex))}</th>`).join('')}
          </tr>
          <tr>
            ${groups.map(group=>group.tasks.map(task=>{
              const type = classroomTaskType(task.type);
              return `<th class="home-tracker-task-heading">
                ${studentMode
                  ? `<span class="home-tracker-task-heading-button home-tracker-task-heading-label"><i class="ti ${homeEsc(type.icon)}"></i><span>${homeEsc(task.title || type.label)}</span></span>`
                  : `<button type="button" class="home-tracker-task-heading-button" onclick="openHomeTrackerTaskModal(${index},'${homeEsc(termKey)}','${homeEsc(task.id)}')" title="Edit task"><i class="ti ${homeEsc(type.icon)}"></i><span>${homeEsc(task.title || type.label)}</span></button>`}
              </th>`;
            }).join('')).join('')}
          </tr>
        </thead>
        <tbody>
          ${students.map(student=>`<tr>
            <th class="home-tracker-student-name">${homeEsc(student.firstName || student.name)}</th>
            ${groups.map(group=>group.tasks.map(task=>`<td>${classroomTrackerCell(index,termKey,task,termData,student,homeEsc)}</td>`).join('')).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function renderTracker(cls,index,homeEsc){
    const activeTerm = classroomActiveTrackerTerm(cls);
    const studentMode = isStudentClassroomRole();
    return `<div class="home-class-tab-head home-tracker-head">
      <h2>Tracker</h2>
      ${studentMode ? '' : `<div class="home-tracker-head-actions">
        ${renderTrackerPercentageLegendToggle(cls,index,homeEsc)}
        <button type="button" onclick="openHomeTrackerTaskModal(${index},'${homeEsc(activeTerm)}')"><i class="ti ti-plus"></i><span>Add task</span></button>
      </div>`}
    </div>
    ${renderTrackerPercentageLegendPanel(cls,index,homeEsc)}
    ${renderTrackerTermNav(index,activeTerm,homeEsc)}
    ${renderTrackerTable(cls,index,activeTerm,homeEsc)}`;
  }

  function classroomVass(cls){
    cls.vass = cls.vass && typeof cls.vass === 'object' ? cls.vass : {};
    ['unit3','unit4'].forEach(unitKey=>{
      cls.vass[unitKey] = cls.vass[unitKey] && typeof cls.vass[unitKey] === 'object' ? cls.vass[unitKey] : {};
      cls.vass[unitKey].areas = Array.isArray(cls.vass[unitKey].areas) ? cls.vass[unitKey].areas : [];
      cls.vass[unitKey].scores = cls.vass[unitKey].scores && typeof cls.vass[unitKey].scores === 'object' ? cls.vass[unitKey].scores : {};
      cls.vass[unitKey].areas = cls.vass[unitKey].areas.map((area,areaIndex)=>{
        const partSource = Array.isArray(area?.parts) && area.parts.length ? area.parts : [{ title:'Outcomes', outcomes:[] }];
        const parts = partSource.map((part,partIndex)=>{
          const outcomeSource = Array.isArray(part?.outcomes) && part.outcomes.length ? part.outcomes : [{ name:'OC1', score:10 }];
          return {
            title: String(part?.title || (partSource.length > 1 ? `Part ${partIndex + 1}` : 'Outcomes')).trim(),
            outcomes: outcomeSource.map((outcome,outcomeIndex)=>({
              name: String(outcome?.name || `OC${outcomeIndex + 1}`).trim(),
              score: Number(outcome?.score) || 10
            }))
          };
        });
        return {
          id: String(area?.id || `aos-${Date.now()}-${areaIndex}-${Math.random().toString(16).slice(2)}`),
          title: String(area?.title || 'Area of Study').trim(),
          parts
        };
      });
    });
    cls.vass.reportScale = cls.vass.reportScale && typeof cls.vass.reportScale === 'object' ? cls.vass.reportScale : {};
    ['unit3','unit4'].forEach(unitKey=>{
      cls.vass.reportScale[unitKey] = cls.vass.reportScale[unitKey] && typeof cls.vass.reportScale[unitKey] === 'object' ? cls.vass.reportScale[unitKey] : {};
    });
    cls.vass.reportRounding = [0,1,2].includes(Number(cls.vass.reportRounding)) ? Number(cls.vass.reportRounding) : 0;
    return cls.vass;
  }

  function classroomVassUnit(cls,unitKey){
    return classroomVass(cls)[unitKey === 'unit4' ? 'unit4' : 'unit3'];
  }

  function classroomVassAreaColumnCount(area){
    const outcomeCount = (area.parts || []).reduce((sum,part)=>sum + (part.outcomes || []).length, 0);
    return outcomeCount + 2;
  }

  function classroomVassScoreKey(areaId,partIndex,outcomeIndex){
    return `${areaId}::${partIndex}::${outcomeIndex}`;
  }

  function classroomVassScore(unit,areaId,partIndex,outcomeIndex,studentKey){
    const key = classroomVassScoreKey(areaId,partIndex,outcomeIndex);
    unit.scores[key] = unit.scores[key] && typeof unit.scores[key] === 'object' ? unit.scores[key] : {};
    return unit.scores[key][studentKey] ?? '';
  }

  function classroomVassStudentPercent(unit,area,student){
    let total = 0;
    let earned = 0;
    let hasScore = false;
    (area.parts || []).forEach((part,partIndex)=>{
      (part.outcomes || []).forEach((outcome,outcomeIndex)=>{
        const max = Number(outcome.score) || 0;
        if(max <= 0) return;
        total += max;
        const value = classroomVassScore(unit, area.id, partIndex, outcomeIndex, student.key);
        const score = Number(value);
        if(Number.isFinite(score) && String(value).trim() !== ''){
          earned += Math.max(0, Math.min(max, score));
          hasScore = true;
        }
      });
    });
    if(!hasScore || total <= 0) return null;
    return Math.round((earned / total) * 100);
  }

  function classroomVassAreaRanks(unit,area,students){
    const entries = students
      .map(student=>({ key:student.key, percent:classroomVassStudentPercent(unit,area,student) }))
      .filter(item=>item.percent !== null)
      .sort((a,b)=>b.percent - a.percent);
    const ranks = {};
    let previous = null;
    let rank = 0;
    entries.forEach((item,index)=>{
      if(item.percent !== previous) rank = index + 1;
      ranks[item.key] = rank;
      previous = item.percent;
    });
    return ranks;
  }

  function classroomVassPercentClass(percent){
    if(percent === null) return '';
    if(percent >= 80) return 'high';
    if(percent >= 50) return 'mid';
    return 'low';
  }

  function classroomVassPercentColourClass(cls,percent){
    if(percent === null) return '';
    const colour = classroomTrackerPercentageColour(cls, `${percent}%`);
    return colour ? `home-tracker-status-color-${colour}` : '';
  }

  function classroomVassOverallPercent(cls,student){
    const vass = classroomVass(cls);
    let total = 0;
    let earned = 0;
    let hasScore = false;
    ['unit3','unit4'].forEach(unitKey=>{
      const unit = vass[unitKey];
      (unit.areas || []).forEach(area=>{
        (area.parts || []).forEach((part,partIndex)=>{
          (part.outcomes || []).forEach((outcome,outcomeIndex)=>{
            const max = Number(outcome.score) || 0;
            if(max <= 0) return;
            total += max;
            const value = classroomVassScore(unit,area.id,partIndex,outcomeIndex,student.key);
            const score = Number(value);
            if(Number.isFinite(score) && String(value).trim() !== ''){
              earned += Math.max(0, Math.min(max, score));
              hasScore = true;
            }
          });
        });
      });
    });
    if(!hasScore || total <= 0) return null;
    return Math.round((earned / total) * 100);
  }

  function classroomVassOutcomePercent(unit,area,student,outcomeIndex){
    let total = 0;
    let earned = 0;
    let hasScore = false;
    (area.parts || []).forEach((part,partIndex)=>{
      const outcome = part.outcomes?.[outcomeIndex];
      if(!outcome) return;
      const max = Number(outcome.score) || 0;
      if(max <= 0) return;
      total += max;
      const value = classroomVassScore(unit,area.id,partIndex,outcomeIndex,student.key);
      const score = Number(value);
      if(Number.isFinite(score) && String(value).trim() !== ''){
        earned += Math.max(0, Math.min(max, score));
        hasScore = true;
      }
    });
    if(!hasScore || total <= 0) return null;
    return Math.round((earned / total) * 100);
  }

  function classroomVassReportColumns(cls){
    const vass = classroomVass(cls);
    return ['unit3','unit4'].map(unitKey=>{
      const unit = vass[unitKey];
      const maxOutcomes = Math.max(0, ...(unit.areas || []).map(area=>Math.max(0, ...(area.parts || []).map(part=>(part.outcomes || []).length))));
      const groups = Array.from({ length:maxOutcomes }).map((_,outcomeIndex)=>{
        const columns = (unit.areas || [])
          .map((area,areaIndex)=>({ unitKey, area, areaIndex, outcomeIndex }))
          .filter(column=>(column.area.parts || []).some(part=>part.outcomes?.[outcomeIndex]));
        return { outcomeIndex, columns };
      }).filter(group=>group.columns.length);
      return { unitKey, label:unitKey === 'unit4' ? 'Unit 4' : 'Unit 3', unit, groups, columnCount:groups.reduce((sum,group)=>sum + group.columns.length, 0) };
    }).filter(unit=>unit.columnCount > 0);
  }

  function classroomVassDefaultOutcomeScores(unitKey,areaIndex){
    if(unitKey === 'unit3' && areaIndex === 0) return [10,20,10];
    if(unitKey === 'unit3' && areaIndex === 1) return [5,10,5];
    if(unitKey === 'unit4' && areaIndex <= 1) return [5,10,5];
    return [5,10,5];
  }

  function classroomVassReportTarget(cls,unitKey,area,areaIndex,outcomeIndex){
    const scale = classroomVass(cls).reportScale?.[unitKey]?.[area.id];
    const saved = scale && Object.prototype.hasOwnProperty.call(scale, outcomeIndex) ? Number(scale[outcomeIndex]) : NaN;
    if(Number.isFinite(saved) && saved >= 0) return saved;
    const defaults = classroomVassDefaultOutcomeScores(unitKey,areaIndex);
    return Number(defaults[outcomeIndex]) || 0;
  }

  function classroomVassReportOutcomeScore(unit,area,student,outcomeIndex,target){
    let rawTotal = 0;
    let rawEarned = 0;
    let hasScore = false;
    (area.parts || []).forEach((part,partIndex)=>{
      const outcome = part.outcomes?.[outcomeIndex];
      if(!outcome) return;
      const max = Number(outcome.score) || 0;
      if(max <= 0) return;
      rawTotal += max;
      const value = classroomVassScore(unit,area.id,partIndex,outcomeIndex,student.key);
      const score = Number(value);
      if(Number.isFinite(score) && String(value).trim() !== ''){
        rawEarned += Math.max(0, Math.min(max, score));
        hasScore = true;
      }
    });
    if(!hasScore || rawTotal <= 0 || target <= 0) return null;
    return (rawEarned / rawTotal) * target;
  }

  function classroomVassReportStudentTotal(cls,student){
    const units = classroomVassReportColumns(cls);
    let total = 0;
    let hasScore = false;
    units.forEach(unit=>{
      unit.groups.forEach(group=>{
        group.columns.forEach(column=>{
          const target = classroomVassReportTarget(cls,unit.unitKey,column.area,column.areaIndex,column.outcomeIndex);
          const score = classroomVassReportOutcomeScore(unit.unit,column.area,student,column.outcomeIndex,target);
          if(score !== null){
            total += score;
            hasScore = true;
          }
        });
      });
    });
    return hasScore ? total : null;
  }

  function classroomVassReportUnitTargetTotal(cls,unit){
    let total = 0;
    unit.groups.forEach(group=>{
      group.columns.forEach(column=>{
        total += classroomVassReportTarget(cls,unit.unitKey,column.area,column.areaIndex,column.outcomeIndex);
      });
    });
    return total;
  }

  function classroomVassReportUnitStudentTotal(cls,unit,student){
    let total = 0;
    let hasScore = false;
    unit.groups.forEach(group=>{
      group.columns.forEach(column=>{
        const target = classroomVassReportTarget(cls,unit.unitKey,column.area,column.areaIndex,column.outcomeIndex);
        const score = classroomVassReportOutcomeScore(unit.unit,column.area,student,column.outcomeIndex,target);
        if(score !== null){
          total += score;
          hasScore = true;
        }
      });
    });
    return hasScore ? total : null;
  }

  function classroomVassReportStudentTotalForUnits(cls,units,student){
    let total = 0;
    let hasScore = false;
    units.forEach(unit=>{
      const unitTotal = classroomVassReportUnitStudentTotal(cls,unit,student);
      if(unitTotal !== null){
        total += unitTotal;
        hasScore = true;
      }
    });
    return hasScore ? total : null;
  }

  function classroomVassReportFormatValue(cls,value){
    if(value === null || value === undefined || value === '') return '';
    const number = Number(value);
    if(!Number.isFinite(number)) return '';
    const places = classroomVass(cls).reportRounding;
    return places === 0 ? String(Math.round(number)) : number.toFixed(places);
  }

  function classroomTeacherName(cls){
    const teacher = (cls?.members || []).find(member=>String(member?.role || '').toLowerCase() === 'teacher');
    return teacher?.displayName || teacher?.name || cls?.teacherName || cls?.teacher || 'Teacher';
  }

  function classroomSameRankCohort(source,candidate){
    const sourceSchool = String(source?.schoolId || '').trim();
    const candidateSchool = String(candidate?.schoolId || '').trim();
    if(sourceSchool && candidateSchool && sourceSchool !== candidateSchool) return false;
    return classroomSameValue(source?.subject || '', candidate?.subject || '') && classroomSameValue(source?.yearLevel || '', candidate?.yearLevel || '');
  }

  function classroomVassRankRows(cls){
    const classes = classroomClasses();
    const cohort = classes.filter(item=>!item?.archived && classroomSameRankCohort(cls,item));
    const rows = [];
    cohort.forEach(item=>{
      const units = classroomVassReportColumns(item);
      const unit3Report = units.find(unit=>unit.unitKey === 'unit3');
      const unit4Report = units.find(unit=>unit.unitKey === 'unit4');
      const teacher = classroomTeacherName(item);
      classroomActiveStudents(item).forEach(student=>{
        const total = unit3Report && unit4Report ? classroomVassReportStudentTotalForUnits(item,[unit3Report,unit4Report],student) : null;
        rows.push({
          teacher,
          student: student.firstName || student.name || 'Student',
          total,
          display: total === null ? '-' : classroomVassReportFormatValue(item,total)
        });
      });
    });
    rows.sort((a,b)=>{
      if(a.total === null && b.total === null) return String(a.student).localeCompare(String(b.student), undefined, { sensitivity:'base' });
      if(a.total === null) return 1;
      if(b.total === null) return -1;
      if(b.total !== a.total) return b.total - a.total;
      return String(a.student).localeCompare(String(b.student), undefined, { sensitivity:'base' });
    });
    let previous = null;
    let rank = 0;
    rows.forEach((row,index)=>{
      if(row.total === null){
        row.rank = '-';
        return;
      }
      if(previous === null || row.total !== previous) rank = index + 1;
      row.rank = rank;
      previous = row.total;
    });
    return rows;
  }

  function classroomVassReportRoundingLabel(value){
    const places = [0,1,2].includes(Number(value)) ? Number(value) : 0;
    if(places === 1) return '1 decimal place';
    if(places === 2) return '2 decimal places';
    return 'Whole number';
  }

  function renderClassroomVassRoundingButton(cls,index){
    const places = classroomVass(cls).reportRounding;
    const label = places === 2 ? '0.00' : places === 1 ? '0.0' : '0';
    return `<button type="button" class="home-vass-rounding-button" onclick="cycleHomeVassReportRounding(${index})">Rounding: ${label}</button>`;
  }

  function renderClassroomVassExportButton(index){
    return `<button type="button" class="home-vass-export-button" onclick="exportHomeVassReportPdf(${index})" title="Print or save as PDF" aria-label="Print or save VASS Report as PDF"><i class="ti ti-printer"></i></button>`;
  }

  function classroomVassTableColgroup(nameWidth,areas){
    const columns = [`<col class="home-vass-name-col" style="width:${nameWidth}px">`];
    (areas || []).forEach(area=>{
      (area.parts || []).forEach(part=>{
        (part.outcomes || []).forEach(()=>columns.push('<col class="home-vass-outcome-col">'));
      });
      columns.push('<col class="home-vass-summary-col">','<col class="home-vass-summary-col">');
    });
    return `<colgroup>${columns.join('')}</colgroup>`;
  }

  function classroomVassTableWidth(nameWidth,areas){
    const dataColumns = (areas || []).reduce((sum,area)=>sum + classroomVassAreaColumnCount(area), 0);
    return nameWidth + (dataColumns * 54);
  }

  function classroomVassReportColgroup(nameWidth,units){
    const columns = [
      `<col class="home-vass-name-col" style="width:${nameWidth}px">`,
      '<col class="home-vass-summary-col">',
      '<col class="home-vass-summary-col">'
    ];
    (units || []).forEach(unit=>{
      unit.groups.forEach(group=>{
        group.columns.forEach(()=>columns.push('<col class="home-vass-outcome-col">'));
      });
    });
    return `<colgroup>${columns.join('')}</colgroup>`;
  }

  function classroomVassReportTableWidth(nameWidth,units){
    const dataColumns = 2 + (units || []).reduce((sum,unit)=>sum + unit.columnCount, 0);
    return nameWidth + (dataColumns * 54);
  }

  function renderVassTable(cls,index,unitKey,homeEsc){
    const unit = classroomVassUnit(cls,unitKey);
    const areas = unit.areas;
    const students = classroomActiveStudents(cls);
    const studentMode = isStudentClassroomRole();
    if(!students.length) return `<div class="home-class-placeholder compact"><p>No active students are in this classroom yet.</p></div>`;
    if(!areas.length) return `<div class="home-class-placeholder compact"><p>Add an Area of Study to start recording outcomes for active students.</p></div>`;
    const nameWidth = classroomStudentNameColumnWidth(students);
    const tableWidth = classroomVassTableWidth(nameWidth,areas);
    const ranksByArea = {};
    areas.forEach(area=>ranksByArea[area.id] = classroomVassAreaRanks(unit,area,students));
    return `<div class="home-unit-table-wrap"><table class="home-unit-table" style="--student-name-width:${nameWidth}px;--vass-table-width:${tableWidth}px">
      ${classroomVassTableColgroup(nameWidth,areas)}
      <thead>
        <tr>
          <th class="name-head sticky-name" rowspan="3">Name</th>
          ${areas.map((area,areaIndex)=>`<th class="area-head area-tone-${areaIndex % 6} area-group-start" colspan="${classroomVassAreaColumnCount(area)}">
            <div class="home-unit-area-head-content">
              ${studentMode
                ? `<span>${homeEsc(area.title)}</span>`
                : `<button type="button" class="home-unit-area-title-button" onclick="openHomeUnitAreaModal(${index},'${homeEsc(unitKey)}','${homeEsc(area.id)}')" title="Edit Area of Study">${homeEsc(area.title)}</button>`}
            </div>
          </th>`).join('')}
        </tr>
        <tr>
          ${areas.map((area,areaIndex)=>{
            const multiPart = (area.parts || []).length > 1;
            const partHeads = (area.parts || []).map((part,partIndex)=>`<th class="part-head area-tone-${areaIndex % 6} ${partIndex === 0 ? 'area-group-start' : ''}" colspan="${(part.outcomes || []).length}">${homeEsc(multiPart ? (part.title || `Part ${partIndex + 1}`) : 'Outcomes')}</th>`).join('');
            return `${partHeads}<th class="summary-head summary-start" rowspan="2">%</th><th class="summary-head" rowspan="2">Rank</th>`;
          }).join('')}
        </tr>
        <tr>
          ${areas.map(area=>(area.parts || []).map((part,partIndex)=>(part.outcomes || []).map((outcome,outcomeIndex)=>`<th class="outcome-head ${partIndex === 0 && outcomeIndex === 0 ? 'area-group-start' : ''}">${homeEsc(outcome.name)}<span>${homeEsc(outcome.score)}</span></th>`).join('')).join('')).join('')}
        </tr>
      </thead>
      <tbody>
        ${students.map(student=>`<tr>
          <th class="student-first sticky-name">${homeEsc(student.firstName || student.name || 'Student')}</th>
          ${areas.map(area=>{
            const percent = classroomVassStudentPercent(unit,area,student);
            const percentClass = classroomVassPercentColourClass(cls,percent);
            const rank = ranksByArea[area.id]?.[student.key] || '';
            const scoreCells = (area.parts || []).map((part,partIndex)=>(part.outcomes || []).map((outcome,outcomeIndex)=>{
              const value = classroomVassScore(unit,area.id,partIndex,outcomeIndex,student.key);
              return `<td class="score-cell ${partIndex === 0 && outcomeIndex === 0 ? 'area-group-start' : ''}">
                <input type="text" inputmode="decimal" value="${homeEsc(value)}" ${studentMode ? 'readonly' : `onchange="saveHomeUnitScore(${index},'${homeEsc(unitKey)}','${homeEsc(area.id)}',${partIndex},${outcomeIndex},'${homeEsc(student.key)}',this.value)"`}>
              </td>`;
            }).join('')).join('');
            return `${scoreCells}<td class="percent-cell summary-start ${percentClass}" data-vass-percent="${homeEsc(area.id)}::${homeEsc(student.key)}">${percent === null ? '-' : `${percent}%`}</td><td class="rank-cell" data-vass-rank="${homeEsc(area.id)}::${homeEsc(student.key)}">${rank || '-'}</td>`;
          }).join('')}
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  }

  function renderVassRankSummary(cls,homeEsc){
    let rows = classroomVassRankRows(cls);
    const teachers = [...new Set(rows.map(row=>row.teacher).filter(Boolean))];
    if(classroomVassRankTeacherFilter !== 'all' && !teachers.includes(classroomVassRankTeacherFilter)) classroomVassRankTeacherFilter = 'all';
    if(classroomVassRankTeacherFilter !== 'all') rows = rows.filter(row=>row.teacher === classroomVassRankTeacherFilter);
    return `<span class="home-vass-rank-count">${rows.length} ${rows.length === 1 ? 'student' : 'students'}</span>`;
  }

  function renderVassSectionNav(activeSection,homeEsc,rankSummary=''){
    const sections = [['unit3','Unit 3'],['unit4','Unit 4'],['report','VASS Report'],['rank','Ranking']];
    return `<div class="home-vass-section-tabs-row">
      <div class="home-vass-section-tabs" role="tablist">
        ${sections.map(([key,label])=>`<button type="button" class="home-vass-section-tab ${activeSection === key ? 'active' : ''}" onclick="setHomeVassSection('${key}', event)">${homeEsc(label)}</button>`).join('')}
      </div>
      ${activeSection === 'rank' ? rankSummary : ''}
    </div>`;
  }

  function renderVassReport(cls,index,homeEsc){
    const students = classroomActiveStudents(cls);
    const units = classroomVassReportColumns(cls);
    const studentMode = isStudentClassroomRole();
    if(!students.length) return `<div class="home-class-placeholder compact"><p>No active students are in this classroom yet.</p></div>`;
    if(!units.length) return `<div class="home-class-placeholder compact"><p>Add Unit 3 or Unit 4 Areas of Study to build the VASS report.</p></div>`;
    const nameWidth = classroomStudentNameColumnWidth(students);
    const unit3Report = units.find(unit=>unit.unitKey === 'unit3');
    const unit4Report = units.find(unit=>unit.unitKey === 'unit4');
    const unit3Target = unit3Report ? classroomVassReportUnitTargetTotal(cls,unit3Report) : null;
    const combinedTarget = unit3Report && unit4Report ? classroomVassReportUnitTargetTotal(cls,unit3Report) + classroomVassReportUnitTargetTotal(cls,unit4Report) : null;
    const tableWidth = classroomVassReportTableWidth(nameWidth,units);
    return `<div class="home-unit-table-wrap home-vass-report-wrap"><table class="home-unit-table home-vass-report-table" style="--student-name-width:${nameWidth}px;--vass-table-width:${tableWidth}px">
      ${classroomVassReportColgroup(nameWidth,units)}
      <thead>
        <tr>
          <th class="name-head sticky-name" rowspan="3">Name</th>
          <th class="summary-head report-total-head" rowspan="3">${combinedTarget === null ? '' : homeEsc(classroomVassReportFormatValue(cls,combinedTarget))}</th>
          <th class="summary-head report-total-head" rowspan="3">${unit3Target === null ? '' : homeEsc(classroomVassReportFormatValue(cls,unit3Target))}</th>
          ${units.map(unit=>`<th class="area-head report-unit-start" colspan="${unit.columnCount}">
            ${studentMode ? homeEsc(unit.label) : `<button type="button" class="home-vass-report-unit-button" onclick="openHomeVassReportScaleModal(${index},'${homeEsc(unit.unitKey)}')" title="Edit VASS Report calculation values">${homeEsc(unit.label)}</button>`}
          </th>`).join('')}
        </tr>
        <tr>
          ${units.map(unit=>unit.groups.map(group=>`<th class="part-head" colspan="${group.columns.length}">OC${group.outcomeIndex + 1}</th>`).join('')).join('')}
        </tr>
        <tr>
          ${units.map(unit=>unit.groups.map(group=>group.columns.map(column=>`<th class="outcome-head">AOS${column.areaIndex + 1}</th>`).join('')).join('')).join('')}
        </tr>
      </thead>
      <tbody>
        ${students.map(student=>{
          const overall = unit3Report && unit4Report ? classroomVassReportStudentTotalForUnits(cls,[unit3Report,unit4Report],student) : null;
          const unit3Total = unit3Report ? classroomVassReportUnitStudentTotal(cls,unit3Report,student) : null;
          return `<tr>
            <th class="student-first sticky-name">${homeEsc(student.firstName || student.name || 'Student')}</th>
            <td class="percent-cell">${overall === null ? '' : homeEsc(classroomVassReportFormatValue(cls,overall))}</td>
            <td class="percent-cell">${unit3Total === null ? '-' : homeEsc(classroomVassReportFormatValue(cls,unit3Total))}</td>
            ${units.map(unit=>unit.groups.map(group=>group.columns.map(column=>{
              const target = classroomVassReportTarget(cls,unit.unitKey,column.area,column.areaIndex,column.outcomeIndex);
              const score = classroomVassReportOutcomeScore(unit.unit,column.area,student,column.outcomeIndex,target);
              return `<td class="percent-cell">${score === null ? '-' : homeEsc(classroomVassReportFormatValue(cls,score))}</td>`;
            }).join('')).join('')).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }

  function renderVassRank(cls,index,homeEsc){
    let rows = classroomVassRankRows(cls);
    const teachers = [...new Set(rows.map(row=>row.teacher).filter(Boolean))].sort((a,b)=>a.localeCompare(b, undefined, { sensitivity:'base' }));
    if(classroomVassRankTeacherFilter !== 'all' && !teachers.includes(classroomVassRankTeacherFilter)) classroomVassRankTeacherFilter = 'all';
    if(classroomVassRankTeacherFilter !== 'all') rows = rows.filter(row=>row.teacher === classroomVassRankTeacherFilter);
    return `${rows.length ? `<div class="home-student-table-wrap home-vass-rank-wrap"><table class="home-student-table home-vass-rank-table">
      <thead><tr><th>Teacher</th><th>Students</th><th>VASS (100)</th><th>Rank</th></tr></thead>
      <tbody>
        ${rows.map(row=>`<tr>
          <td>${homeEsc(row.teacher)}</td>
          <td>${homeEsc(row.student)}</td>
          <td>${homeEsc(row.display)}</td>
          <td>${homeEsc(row.rank)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>` : `<div class="home-class-placeholder compact"><p>No ranked VASS Report totals are available yet for this subject and year level.</p></div>`}`;
  }

  function renderVassRankFilter(cls,homeEsc){
    let rows = classroomVassRankRows(cls);
    const teachers = [...new Set(rows.map(row=>row.teacher).filter(Boolean))].sort((a,b)=>a.localeCompare(b, undefined, { sensitivity:'base' }));
    if(classroomVassRankTeacherFilter !== 'all' && !teachers.includes(classroomVassRankTeacherFilter)) classroomVassRankTeacherFilter = 'all';
    if(classroomVassRankTeacherFilter !== 'all') rows = rows.filter(row=>row.teacher === classroomVassRankTeacherFilter);
    return `<div class="home-vass-rank-tools">
      <label>
        <select class="home-vass-rank-filter" onchange="setHomeVassRankTeacherFilter(this.value)">
          <option value="all">All teachers</option>
          ${teachers.map(teacher=>`<option value="${homeEsc(teacher)}" ${teacher === classroomVassRankTeacherFilter ? 'selected' : ''}>${homeEsc(teacher)}</option>`).join('')}
        </select>
      </label>
    </div>`;
  }

  function renderVassUnit(cls,index,section,homeEsc){
    if(section === 'rank') return renderVassRank(cls,index,homeEsc);
    if(section === 'report') return renderVassReport(cls,index,homeEsc);
    return renderVassTable(cls,index,section,homeEsc);
  }

  function renderVass(cls,index,homeEsc,preferredSection=''){
    const activeSection = ['unit3','unit4','report','rank'].includes(preferredSection) ? preferredSection : classroomVassSection;
    classroomVassSection = ['unit3','unit4','report','rank'].includes(activeSection) ? activeSection : 'unit3';
    const studentMode = isStudentClassroomRole();
    const reportMode = classroomVassSection === 'report';
    const rankMode = classroomVassSection === 'rank';
    return `<div class="home-class-tab-head home-vass-head">
      <h2>VASS</h2>
      ${rankMode
        ? renderVassRankFilter(cls,homeEsc)
        : reportMode
        ? `<div class="home-tracker-head-actions">${studentMode ? '' : renderClassroomVassRoundingButton(cls,index)}${renderClassroomVassExportButton(index)}</div>`
        : studentMode ? '' : `<div class="home-unit-actions"><button type="button" onclick="openHomeUnitAreaModal(${index},'${homeEsc(classroomVassSection)}')"><i class="ti ti-plus"></i><span>Add Area of Study</span></button></div>`}
    </div>
    ${renderVassSectionNav(classroomVassSection,homeEsc,rankMode ? renderVassRankSummary(cls,homeEsc) : '')}
    ${renderVassUnit(cls,index,classroomVassSection,homeEsc)}`;
  }

  function renderClassTabContent(deps){
    const { cls, index, homeClassTab, homeEsc, homeClassJoinedStudents } = deps;
    const tab = homeClassTab || 'home';
    const vassAllowed = classroomAllowsVass(cls);
    if(!vassAllowed && (tab === 'vass' || tab === 'unit3' || tab === 'unit4')) return renderClassroomHome(cls,index,homeEsc);
    if(tab === 'home') return renderClassroomHome(cls,index,homeEsc);
    if(tab === 'students'){
      const students = classroomStudents(cls);
      return `<div class="home-class-tab-head"><h2>Students</h2><div class="home-compass-head-actions"><span class="home-class-tab-count">${students.length} ${students.length === 1 ? 'student' : 'students'}</span>${isStudentClassroomRole() ? '' : `<button type="button" onclick="openHomeClassCompassImport(${index})"><i class="ti ti-upload"></i><span>Compass Class List (CSV)</span></button>`}</div></div>${renderStudentTable(cls,index,homeEsc)}${isStudentClassroomRole() ? '' : renderCompassImportDialog(index,homeEsc)}`;
    }
    if(tab === 'resources') return renderClassroomResources(cls,index,homeEsc);
    if(tab === 'tracker') return renderTracker(cls,index,homeEsc);
    if(vassAllowed && (tab === 'unit3' || tab === 'unit4')) return renderVass(cls,index,homeEsc,tab);
    if(vassAllowed && tab === 'vass') return renderVass(cls,index,homeEsc);
    return renderClassroomHome(cls,index,homeEsc);
  }

  window.setHomeVassSection = function setHomeVassSection(section,event){
    event?.preventDefault?.();
    classroomVassSection = ['unit3','unit4','report','rank'].includes(section) ? section : 'unit3';
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(event?.currentTarget || event?.target || document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.setHomeVassRankTeacherFilter = function setHomeVassRankTeacherFilter(value){
    classroomVassRankTeacherFilter = value || 'all';
    classroomVassSection = 'rank';
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.cycleHomeVassReportRounding = async function cycleHomeVassReportRounding(classIndex){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const vass = classroomVass(cls);
    vass.reportRounding = (Number(vass.reportRounding) + 1) % 3;
    classroomVassSection = 'report';
    saveClassroomClasses(classes);
    await persistHomeVassData(cls);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.exportHomeVassReportPdf = function exportHomeVassReportPdf(classIndex){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    const table = document.querySelector('.home-vass-report-table');
    if(!cls || !table){
      if(typeof showToast === 'function') showToast('Open the VASS Report before exporting.', true);
      return;
    }

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));

    const exportTable = table.cloneNode(true);
    exportTable.removeAttribute('style');
    exportTable.querySelectorAll('button').forEach(button=>{
      const span = document.createElement('span');
      span.textContent = button.textContent || '';
      button.replaceWith(span);
    });
    exportTable.querySelectorAll('[style]').forEach(node=>node.removeAttribute('style'));
    exportTable.querySelectorAll('.sticky-name').forEach(node=>node.classList.remove('sticky-name'));
    const longestNameWord = Array.from(exportTable.querySelectorAll('tbody th:first-child'))
      .flatMap(cell=>String(cell.textContent || '').trim().split(/\s+/))
      .reduce((longest, word)=>Math.max(longest, word.length), 4);
    const exportNameColumnWidth = Math.min(180, Math.max(90, (longestNameWord * 8) + 24));

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if(!printWindow){
      if(typeof showToast === 'function') showToast('Allow pop-ups to export the VASS Report PDF.', true);
      return;
    }

    const teacherName = classroomProfileName() || 'Teacher';
    const title = `${teacherName} - VASS Report`;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page{size:A4 landscape;margin:1.27cm}
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,sans-serif}
    body{width:100%}
    .pdf-page{width:100%;min-height:calc(21cm - 2.54cm);padding-right:2px}
    .pdf-page.fit-one-page{height:calc(21cm - 2.54cm);overflow:hidden}
    .pdf-page.multi-page{height:auto;overflow:visible}
    .pdf-title{margin:0 0 8px;font-size:14px;line-height:1.2;font-weight:600;color:#000}
    .pdf-table-scale{width:100%;transform-origin:top left}
    table{border-collapse:collapse;border-spacing:0;width:100%;table-layout:fixed;background:#fff;color:#000;font-size:12px;line-height:1.15;border:1px solid #000}
    col{width:auto!important}
    col.home-vass-name-col{width:${exportNameColumnWidth}px!important}
    th,td{border:1px solid #000;padding:3px 4px;text-align:center;vertical-align:middle;white-space:normal;overflow:hidden}
    th{background:#f8fbff;font-weight:500;color:#000}
    thead tr:first-child th:not(:first-child){background:#eaf8fc;color:#000}
    th:first-child,td:first-child{min-width:${exportNameColumnWidth}px}
    thead tr:first-child th:first-child,tbody th:first-child{text-align:left}
    thead{display:table-header-group}
    tfoot{display:table-footer-group}
    tr{break-inside:avoid;page-break-inside:avoid}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .pdf-page.fit-one-page{page-break-after:avoid}
      .pdf-page.multi-page{height:auto;overflow:visible}
    }
  </style>
</head>
<body>
  <div class="pdf-page">
    <h1 class="pdf-title">${escapeHtml(title)}</h1>
    <div class="pdf-table-scale">${exportTable.outerHTML}</div>
  </div>
  <script>
    window.addEventListener('load', function(){
      var page = document.querySelector('.pdf-page');
      var title = document.querySelector('.pdf-title');
      var scaleWrap = document.querySelector('.pdf-table-scale');
      var table = scaleWrap.querySelector('table');
      var availableHeight = page.clientHeight - title.offsetHeight - 12;
      var tableHeight = table.getBoundingClientRect().height || table.scrollHeight || table.offsetHeight;
      var onePageScale = availableHeight / tableHeight;
      if(onePageScale >= 0.82){
        page.classList.add('fit-one-page');
        var scale = Math.min(1, onePageScale);
        if(isFinite(scale) && scale > 0 && scale < 1){
          scaleWrap.style.transform = 'scale(' + scale + ')';
          scaleWrap.style.width = (100 / scale) + '%';
        }
      }else{
        page.classList.add('multi-page');
      }
      setTimeout(function(){
        window.focus();
        window.print();
      }, 300);
    });
    window.addEventListener('afterprint', function(){
      window.close();
    });
  <\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  function homeUnitDefaultArea(unitKey){
    return {
      id:'',
      title:'',
      parts:[{
        title:'Outcomes',
        outcomes:[
          { name:'OC1', score:10 },
          { name:'OC2', score:10 },
          { name:'OC3', score:10 }
        ]
      }]
    };
  }

  function readHomeUnitAreaDraft(){
    const title = document.getElementById('home-unit-area-title')?.value?.trim() || '';
    const partCount = Math.max(1, Math.min(8, Number(document.getElementById('home-unit-area-parts')?.value) || 1));
    const outcomeCount = Math.max(1, Math.min(12, Number(document.getElementById('home-unit-area-outcomes')?.value) || 1));
    const parts = [];
    for(let partIndex=0; partIndex<partCount; partIndex++){
      const rawTitle = document.getElementById(`home-unit-part-title-${partIndex}`)?.value?.trim() || '';
      const titleValue = partCount > 1 && partIndex === 0 && rawTitle === 'Outcomes' ? 'Part 1' : (rawTitle || (partCount > 1 ? `Part ${partIndex + 1}` : 'Outcomes'));
      const outcomes = [];
      for(let outcomeIndex=0; outcomeIndex<outcomeCount; outcomeIndex++){
        outcomes.push({
          name: document.getElementById(`home-unit-outcome-name-${partIndex}-${outcomeIndex}`)?.value?.trim() || `OC${outcomeIndex + 1}`,
          score: Number(document.getElementById(`home-unit-outcome-score-${partIndex}-${outcomeIndex}`)?.value) || 10
        });
      }
      parts.push({ title:titleValue, outcomes });
    }
    return { title, partCount, outcomeCount, parts };
  }

  function renderHomeUnitOutcomeParts(area,partCount,outcomeCount){
    const parts = Array.isArray(area?.parts) ? area.parts : [];
    return `<div class="home-unit-outcome-scores">
      <div class="home-unit-outcome-parts">
        ${Array.from({ length:partCount }).map((_,partIndex)=>{
          const sourcePart = parts[partIndex] || {};
          const savedTitle = String(sourcePart.title || '').trim();
          const partTitle = partCount > 1 && (!savedTitle || (partIndex === 0 && savedTitle === 'Outcomes')) ? `Part ${partIndex + 1}` : (savedTitle || (partCount > 1 ? `Part ${partIndex + 1}` : 'Outcomes'));
          return `<section class="home-unit-part-score-group">
            <div class="home-unit-part-score-head">
              <input id="home-unit-part-title-${partIndex}" class="home-unit-part-title" type="text" value="${classroomAttr(partCount > 1 ? partTitle : 'Outcomes')}" ${partCount > 1 ? '' : 'readonly'}>
            </div>
            <div class="home-unit-outcome-score-list">
              ${Array.from({ length:outcomeCount }).map((__,outcomeIndex)=>{
                const outcome = sourcePart.outcomes?.[outcomeIndex] || {};
                return `<div class="home-unit-outcome-editor">
                  <label>Outcome<input id="home-unit-outcome-name-${partIndex}-${outcomeIndex}" class="home-unit-outcome-name" type="text" value="${classroomAttr(outcome.name || `OC${outcomeIndex + 1}`)}"></label>
                  <label>Score<input id="home-unit-outcome-score-${partIndex}-${outcomeIndex}" class="home-unit-outcome-score" type="number" min="1" value="${Number(outcome.score) || 10}"></label>
                </div>`;
              }).join('')}
            </div>
          </section>`;
        }).join('')}
      </div>
    </div>`;
  }

  window.refreshHomeUnitAreaParts = function refreshHomeUnitAreaParts(){
    const target = document.getElementById('home-unit-area-parts-root');
    if(!target) return;
    const draft = readHomeUnitAreaDraft();
    target.innerHTML = renderHomeUnitOutcomeParts({ parts:draft.parts }, draft.partCount, draft.outcomeCount);
  };

  window.openHomeUnitAreaModal = function openHomeUnitAreaModal(classIndex,unitKey,areaId=''){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const unit = classroomVassUnit(cls,unitKey);
    const existing = unit.areas.find(area=>area.id === areaId);
    const area = existing || homeUnitDefaultArea(unitKey);
    const partCount = Math.max(1, area.parts?.length || 1);
    const outcomeCount = Math.max(1, area.parts?.[0]?.outcomes?.length || 3);
    document.getElementById('home-unit-area-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-unit-area-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeUnitAreaModal()" aria-label="Close Area of Study form"></button>
      <div class="home-modal home-unit-area-modal">
        <button type="button" class="home-unit-area-close" onclick="closeHomeUnitAreaModal()" aria-label="Close Area of Study form"><i class="ti ti-x"></i></button>
        <h2 class="home-modal-title">${existing ? 'Edit Area of Study' : 'Add Area of Study'}</h2>
        <input id="home-unit-area-id" type="hidden" value="${classroomAttr(existing?.id || '')}">
        <input id="home-unit-area-unit" type="hidden" value="${classroomAttr(unitKey)}">
        <div class="home-unit-area-form">
          <label>Area of Study title<input id="home-unit-area-title" type="text" placeholder="Write area of study title here.." value="${classroomAttr(area.title)}"></label>
          <label>Number of parts<input id="home-unit-area-parts" type="number" min="1" max="8" value="${partCount}" onchange="refreshHomeUnitAreaParts()"></label>
          <label>Outcomes per part<input id="home-unit-area-outcomes" type="number" min="1" max="12" value="${outcomeCount}" onchange="refreshHomeUnitAreaParts()"></label>
        </div>
        <div id="home-unit-area-parts-root">${renderHomeUnitOutcomeParts(area,partCount,outcomeCount)}</div>
        <div class="home-modal-actions">
          ${existing ? `<button type="button" class="danger" onclick="deleteHomeUnitArea(${classIndex},'${classroomJsString(unitKey)}','${classroomJsString(existing.id)}')">Delete</button>` : '<span></span>'}
          <button type="button" onclick="closeHomeUnitAreaModal()">Cancel</button>
          <button type="button" class="primary" onclick="saveHomeUnitArea(${classIndex})">Save</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    setTimeout(()=>document.getElementById('home-unit-area-title')?.focus(), 0);
  };

  window.closeHomeUnitAreaModal = function closeHomeUnitAreaModal(){
    document.getElementById('home-unit-area-modal-root')?.remove();
  };

  async function persistHomeVassData(cls){
    const sync = classroomSync();
    if(sync?.saveVassData && (cls.id || cls.supabaseId)){
      try{
        await sync.saveVassData(cls, classroomVass(cls));
      }catch(err){
        console.warn('Could not save VASS data to Supabase', err);
        if(typeof showToast === 'function') showToast('VASS saved locally, but Supabase did not save it yet.', true);
      }
    }
  }

  window.saveHomeUnitArea = async function saveHomeUnitArea(classIndex){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const unitKey = document.getElementById('home-unit-area-unit')?.value === 'unit4' ? 'unit4' : 'unit3';
    const areaId = document.getElementById('home-unit-area-id')?.value || '';
    const draft = readHomeUnitAreaDraft();
    if(!draft.title){
      if(typeof showToast === 'function') showToast('Area of Study title is required.', true);
      return;
    }
    const unit = classroomVassUnit(cls,unitKey);
    const payload = {
      id: areaId || `aos-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: draft.title,
      parts: draft.parts
    };
    const existingIndex = unit.areas.findIndex(area=>area.id === payload.id);
    if(existingIndex >= 0) unit.areas[existingIndex] = payload;
    else unit.areas.push(payload);
    classroomVassSection = unitKey;
    saveClassroomClasses(classes);
    await persistHomeVassData(cls);
    closeHomeUnitAreaModal();
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.deleteHomeUnitArea = async function deleteHomeUnitArea(classIndex,unitKey,areaId){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const unit = classroomVassUnit(cls,unitKey);
    unit.areas = unit.areas.filter(area=>area.id !== areaId);
    Object.keys(unit.scores || {}).forEach(key=>{
      if(String(key).startsWith(`${areaId}::`)) delete unit.scores[key];
    });
    classroomVassSection = unitKey === 'unit4' ? 'unit4' : 'unit3';
    saveClassroomClasses(classes);
    await persistHomeVassData(cls);
    closeHomeUnitAreaModal();
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.openHomeVassReportScaleModal = function openHomeVassReportScaleModal(classIndex,unitKey){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls || isStudentClassroomRole()) return;
    const cleanUnitKey = unitKey === 'unit4' ? 'unit4' : 'unit3';
    const unit = classroomVassUnit(cls,cleanUnitKey);
    document.getElementById('home-vass-report-scale-modal-root')?.remove();
    const unitLabel = cleanUnitKey === 'unit4' ? 'Unit 4' : 'Unit 3';
    const shell = document.createElement('div');
    shell.id = 'home-vass-report-scale-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeVassReportScaleModal()" aria-label="Close VASS Report calculation form"></button>
      <div class="home-modal home-vass-report-scale-modal">
        <button type="button" class="home-unit-area-close" onclick="closeHomeVassReportScaleModal()" aria-label="Close VASS Report calculation form"><i class="ti ti-x"></i></button>
        <h2 class="home-modal-title">Recalculate ${classroomAttr(unitLabel)}</h2>
        <p class="home-vass-report-scale-help">${classroomAttr(unitLabel)} scores stay unchanged. These values only scale the VASS Report display.</p>
        <input id="home-vass-report-scale-unit" type="hidden" value="${classroomAttr(cleanUnitKey)}">
        <div class="home-vass-report-scale-grid">
          ${(unit.areas || []).map((area,areaIndex)=>{
            const maxOutcomes = Math.max(0, ...(area.parts || []).map(part=>(part.outcomes || []).length));
            return `<section class="home-vass-report-scale-card">
              <div class="home-vass-report-scale-card-head"><span>AOS${areaIndex + 1}</span><strong>${classroomAttr(area.title || `Area of Study ${areaIndex + 1}`)}</strong></div>
              <div class="home-vass-report-scale-rows">
                ${Array.from({ length:maxOutcomes }).map((__,outcomeIndex)=>`<label>OC${outcomeIndex + 1}<input id="home-vass-report-scale-${areaIndex}-${outcomeIndex}" data-area-id="${classroomAttr(area.id)}" data-outcome-index="${outcomeIndex}" type="number" min="0" step="1" value="${classroomAttr(classroomVassReportTarget(cls,cleanUnitKey,area,areaIndex,outcomeIndex))}"></label>`).join('')}
              </div>
            </section>`;
          }).join('')}
        </div>
        <div class="home-modal-actions">
          <button type="button" onclick="closeHomeVassReportScaleModal()">Cancel</button>
          <button type="button" class="primary" onclick="saveHomeVassReportScale(${classIndex})">Save</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    setTimeout(()=>shell.querySelector('input[type="number"]')?.focus(), 0);
  };

  window.closeHomeVassReportScaleModal = function closeHomeVassReportScaleModal(){
    document.getElementById('home-vass-report-scale-modal-root')?.remove();
  };

  window.saveHomeVassReportScale = async function saveHomeVassReportScale(classIndex){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const cleanUnitKey = document.getElementById('home-vass-report-scale-unit')?.value === 'unit4' ? 'unit4' : 'unit3';
    const vass = classroomVass(cls);
    vass.reportScale[cleanUnitKey] = {};
    document.querySelectorAll('#home-vass-report-scale-modal-root input[data-area-id]').forEach(input=>{
      const areaId = input.dataset.areaId || '';
      const outcomeIndex = Number(input.dataset.outcomeIndex) || 0;
      const value = Math.max(0, Number(input.value) || 0);
      vass.reportScale[cleanUnitKey][areaId] = vass.reportScale[cleanUnitKey][areaId] && typeof vass.reportScale[cleanUnitKey][areaId] === 'object' ? vass.reportScale[cleanUnitKey][areaId] : {};
      vass.reportScale[cleanUnitKey][areaId][outcomeIndex] = value;
    });
    classroomVassSection = 'report';
    saveClassroomClasses(classes);
    await persistHomeVassData(cls);
    closeHomeVassReportScaleModal();
    if(typeof showToast === 'function') showToast(`${cleanUnitKey === 'unit4' ? 'Unit 4' : 'Unit 3'} VASS Report values updated.`);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  function updateHomeUnitAreaSummaryCells(cls,unitKey,areaId){
    const unit = classroomVassUnit(cls,unitKey);
    const area = unit.areas.find(item=>item.id === areaId);
    if(!area) return;
    const students = classroomActiveStudents(cls);
    const ranks = classroomVassAreaRanks(unit,area,students);
    students.forEach(student=>{
      const summaryKey = `${areaId}::${student.key}`;
      const percent = classroomVassStudentPercent(unit,area,student);
      const percentCell = [...document.querySelectorAll('[data-vass-percent]')].find(cell=>cell.dataset.vassPercent === summaryKey);
      if(percentCell){
        percentCell.textContent = percent === null ? '-' : `${percent}%`;
        percentCell.classList.remove('high','mid','low');
        classroomTrackerOptionColours().forEach(item=>percentCell.classList.remove(`home-tracker-status-color-${item.value}`));
        const percentClass = classroomVassPercentColourClass(cls,percent);
        if(percentClass) percentCell.classList.add(percentClass);
      }
      const rankCell = [...document.querySelectorAll('[data-vass-rank]')].find(cell=>cell.dataset.vassRank === summaryKey);
      if(rankCell) rankCell.textContent = ranks[student.key] || '-';
    });
  }

  window.saveHomeUnitScore = async function saveHomeUnitScore(classIndex,unitKey,areaId,partIndex,outcomeIndex,studentKey,value){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const unit = classroomVassUnit(cls,unitKey);
    const key = classroomVassScoreKey(areaId,Number(partIndex) || 0,Number(outcomeIndex) || 0);
    unit.scores[key] = unit.scores[key] && typeof unit.scores[key] === 'object' ? unit.scores[key] : {};
    const clean = String(value ?? '').trim();
    if(clean === '') delete unit.scores[key][studentKey];
    else unit.scores[key][studentKey] = clean;
    classroomVassSection = unitKey === 'unit4' ? 'unit4' : 'unit3';
    saveClassroomClasses(classes);
    updateHomeUnitAreaSummaryCells(cls,unitKey,areaId);
    await persistHomeVassData(cls);
  };

  window.autoGrowHomeAnnouncement = function autoGrowHomeAnnouncement(textarea){
    if(!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 220) + 'px';
  };

  function refreshHomeAnnouncementFiles(index){
    const container = document.getElementById(`home-announcement-files-${index}`);
    if(!container) return;
    const files = classroomAnnouncementFiles.get(index) || [];
    container.replaceChildren(...files.map((file,fileIndex)=>{
      const chip = document.createElement('div');
      chip.className = 'home-announcement-selected-file';
      const icon = document.createElement('i');
      icon.className = 'ti ti-file';
      const name = document.createElement('span');
      name.textContent = file.name || 'Attachment';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.title = 'Remove attachment';
      remove.setAttribute('aria-label','Remove attachment');
      remove.innerHTML = '<i class="ti ti-x"></i>';
      remove.onclick = ()=>removeHomeAnnouncementFile(index,fileIndex);
      chip.append(icon,name,remove);
      return chip;
    }));
    container.hidden = !files.length;
  }

  window.selectHomeAnnouncementFiles = function selectHomeAnnouncementFiles(index,input){
    const incoming = Array.from(input?.files || []);
    if(!incoming.length) return;
    const current = classroomAnnouncementFiles.get(index) || [];
    const files = [...current];
    incoming.forEach(file=>{
      const duplicate = files.some(item=>item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
      if(!duplicate) files.push(file);
    });
    classroomAnnouncementFiles.set(index,files);
    if(input) input.value = '';
    refreshHomeAnnouncementFiles(index);
  };

  window.removeHomeAnnouncementFile = function removeHomeAnnouncementFile(index,fileIndex){
    const files = [...(classroomAnnouncementFiles.get(index) || [])];
    files.splice(fileIndex,1);
    if(files.length) classroomAnnouncementFiles.set(index,files);
    else classroomAnnouncementFiles.delete(index);
    refreshHomeAnnouncementFiles(index);
  };

  window.postHomeClassAnnouncement = async function postHomeClassAnnouncement(index){
    const textarea = document.getElementById(`home-announcement-text-${index}`);
    const text = textarea?.value?.trim();
    if(!text){
      if(typeof showToast === 'function') showToast('Write an announcement first.', true);
      return;
    }
    const classes = classroomClasses();
    if(!classes[index]) return;
    const sync = classroomSync();
    const files = classroomAnnouncementFiles.get(index) || [];
    if(files.length && !(sync?.createAnnouncement && classes[index].id)){
      if(typeof showToast === 'function') showToast('File attachments require an online classroom.', true);
      return;
    }
    const postButton = document.getElementById(`home-announcement-post-${index}`);
    if(postButton) postButton.disabled = true;
    if(sync?.createAnnouncement && classes[index].id){
      try{
        const saved = await sync.createAnnouncement(classes[index], text, files);
        classes[index].announcements = Array.isArray(classes[index].announcements) ? classes[index].announcements : [];
        classes[index].announcements.unshift(saved);
        classroomAnnouncementFiles.delete(index);
        saveClassroomClasses(classes);
        classroomEditingAnnouncement = null;
        if(typeof renderHomePage === 'function') renderHomePage();
        return;
      }catch(err){
        console.warn('Could not save announcement to Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not post announcement.', true);
        if(postButton) postButton.disabled = false;
        return;
      }
    }
    classes[index].announcements = Array.isArray(classes[index].announcements) ? classes[index].announcements : [];
    classes[index].announcements.unshift({
      id: `announcement-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      author: classroomProfileName(),
      createdAt: new Date().toISOString(),
      comments: []
    });
    classroomEditingAnnouncement = null;
    classroomAnnouncementFiles.delete(index);
    saveClassroomClasses(classes);
    if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.downloadHomeAnnouncementAttachment = async function downloadHomeAnnouncementAttachment(classIndex,announcementId,attachmentIndex=0){
    const classes = classroomClasses();
    const announcement = classes[classIndex] ? classroomAnnouncements(classes[classIndex]).find(item=>item.id === announcementId) : null;
    const attachments = Array.isArray(announcement?.attachments) && announcement.attachments.length
      ? announcement.attachments
      : announcement?.attachment ? [announcement.attachment] : [];
    const attachment = attachments[attachmentIndex];
    if(!attachment) return;
    const sync = classroomSync();
    let url = attachment.fileUrl || '';
    if(sync?.getClassroomResourceDownloadUrl){
      try{
        url = await sync.getClassroomResourceDownloadUrl(attachment);
      }catch(err){
        console.warn('Could not create announcement attachment link:', err);
      }
    }
    if(!url){
      if(typeof showToast === 'function') showToast('This attachment is not available for download.', true);
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    if(attachment.fileName) link.download = attachment.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  window.startHomeClassAnnouncementEdit = function startHomeClassAnnouncementEdit(index,id){
    classroomEditingAnnouncement = id;
    if(typeof renderHomePage === 'function') renderHomePage();
    setTimeout(()=>{
      const textarea = document.getElementById(`home-announcement-edit-${id}`);
      if(textarea){
        textarea.focus();
        autoGrowHomeAnnouncement(textarea);
      }
    }, 0);
  };

  window.cancelHomeClassAnnouncementEdit = function cancelHomeClassAnnouncementEdit(){
    classroomEditingAnnouncement = null;
    if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.startHomeClassStudentEdit = function startHomeClassStudentEdit(key){
    classroomEditingStudent = key;
    if(typeof renderHomePage === 'function') renderHomePage();
    setTimeout(()=>document.getElementById(`home-student-name-${key}`)?.focus(), 0);
  };

  window.cancelHomeClassStudentEdit = function cancelHomeClassStudentEdit(){
    classroomEditingStudent = null;
    if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.setHomeTrackerTerm = function setHomeTrackerTerm(classIndex,termKey){
    const classes = classroomClasses();
    classroomTrackerTerm = termKey || 'term1';
    if(classes[classIndex]){
      classroomTracker(classes[classIndex]).activeTerm = classroomTrackerTerm;
      saveClassroomClasses(classes);
    }
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.openHomeTrackerTaskModal = function openHomeTrackerTaskModal(classIndex,termKey,taskId=''){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    const task = taskId ? trackerFindTask(cls,termKey,taskId) : null;
    const type = task?.type || 'score';
    const taskTypes = classroomTaskTypes();
    const topics = classroomPracticeTopics(cls);
    const selectedTopics = classroomTaskValues(task?.topic);
    const subtopics = classroomPracticeSubtopics(cls, selectedTopics);
    const selectedSubtopics = classroomTaskValues(task?.subtopic);
    const skills = classroomPracticeSkills(cls, selectedTopics, selectedSubtopics);
    const selectedSkills = classroomTaskValues(task?.skill);
    window.closeHomeTrackerTaskModal();
    const shell = document.createElement('div');
    shell.id = 'home-tracker-task-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeTrackerTaskModal()" aria-label="Close task form"></button>
      <div class="home-modal home-tracker-task-modal">
        <h2 class="home-modal-title">${task ? 'Edit Task' : 'Add Task'}</h2>
        <div class="home-tracker-task-type-grid">
          ${taskTypes.map(item=>`<button type="button" class="home-tracker-type-card ${type === item.value ? 'active' : ''}" data-type="${item.value}" onclick="selectHomeTrackerTaskType('${item.value}')"><i class="ti ${item.icon}"></i><span>${item.label}</span></button>`).join('')}
        </div>
        <input id="home-tracker-task-id" type="hidden" value="${task?.id || ''}">
        <input id="home-tracker-task-type" type="hidden" value="${type}">
        <div class="home-form-grid home-tracker-form-grid">
          <label>Title<input id="home-tracker-task-title" type="text" placeholder="Write task title here..." value="${classroomAttr(task?.title)}"></label>
          <label>Due date<input id="home-tracker-task-due" type="date" value="${classroomDateInputValue(task?.dueDate)}"></label>
          <div class="home-tracker-type-section home-tracker-type-options ${type === 'completion' || type === 'progress' ? '' : 'hidden'}">
            <div class="home-tracker-options-label">Options</div>
            ${renderTrackerOptionEditor(type,task || {type})}
          </div>
          <div class="home-tracker-type-section home-tracker-type-practice ${type === 'practice' ? '' : 'hidden'}">
            ${trackerPracticePicker('topic','Topic',topics,selectedTopics,classIndex,topics.length ? '' : 'No topics')}
            ${trackerPracticePicker('subtopic','Subtopic',subtopics,selectedSubtopics,classIndex,selectedTopics.length ? '' : 'Select topic first')}
            ${trackerPracticePicker('skill','Skills',skills,selectedSkills,classIndex,selectedSubtopics.length ? '' : 'Select subtopic first')}
            <label>Questions<input id="home-tracker-task-question-count" type="number" min="1" value="${Number(task?.questionCount) || 10}"></label>
            <label>Attempts<input id="home-tracker-task-attempts" type="number" min="1" value="${Number(task?.attempts) || 1}" oninput="toggleHomeTrackerScoreDisplay()"></label>
            <label class="home-tracker-score-display-field ${(Number(task?.attempts) || 1) > 1 ? '' : 'hidden'}">Score display<select id="home-tracker-task-score-display">${classroomPracticeScoreDisplayOptions().map(option=>`<option value="${option.value}" ${classroomPracticeScoreDisplay(task?.scoreDisplay) === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label>
          </div>
        </div>
        <div class="home-modal-actions">
          ${task ? `<button type="button" class="danger" onclick="deleteHomeTrackerTask(${classIndex},'${termKey}','${task.id}')">Delete</button>` : '<span></span>'}
          <button type="button" onclick="closeHomeTrackerTaskModal()">Cancel</button>
          <button type="button" class="primary" onclick="saveHomeTrackerTask(${classIndex},'${termKey}')">Save</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    shell.querySelectorAll('.home-tracker-practice-picker').forEach(picker=>picker.addEventListener('toggle',()=>{
      if(!picker.open) return;
      closeTrackerPracticeMenus(shell,picker);
      positionTrackerPracticeMenu(picker);
    }));
    classroomPracticeMenuPositioner = ()=>shell.querySelectorAll('.home-tracker-practice-picker[open]').forEach(positionTrackerPracticeMenu);
    classroomPracticeOutsideClickHandler = event=>{
      const clickedPicker = event.target.closest?.('.home-tracker-practice-picker');
      closeTrackerPracticeMenus(shell,shell.contains(clickedPicker) ? clickedPicker : null);
    };
    shell.addEventListener('scroll',classroomPracticeMenuPositioner,true);
    window.addEventListener('resize',classroomPracticeMenuPositioner);
    document.addEventListener('click',classroomPracticeOutsideClickHandler);
    setTimeout(()=>document.getElementById('home-tracker-task-title')?.focus(), 0);
  };

  window.closeHomeTrackerTaskModal = function closeHomeTrackerTaskModal(){
    if(classroomPracticeMenuPositioner){
      window.removeEventListener('resize',classroomPracticeMenuPositioner);
      classroomPracticeMenuPositioner = null;
    }
    if(classroomPracticeOutsideClickHandler){
      document.removeEventListener('click',classroomPracticeOutsideClickHandler);
      classroomPracticeOutsideClickHandler = null;
    }
    document.getElementById('home-tracker-task-modal-root')?.remove();
  };

  window.openHomePracticeAttemptModal = function openHomePracticeAttemptModal(classIndex,termKey,taskId,studentKey){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    const termData = tracker[termKey];
    if(!termData) return;
    const task = termData.tasks.find(item=>item.id === taskId);
    const student = classroomStudents(cls).find(item=>item.key === studentKey);
    const currentStudent = classroomCurrentStudent(cls);
    const canStartPractice = isStudentClassroomRole() && task?.type === 'practice' && String(currentStudent?.key || '') === String(studentKey || '');
    const attempts = [...classroomTrackerAttempts(termData, taskId, studentKey)].sort((a,b)=>String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    const summary = classroomTrackerAttemptSummary(termData, taskId, studentKey);
    classroomSeedPracticeAttemptSummary(summary, attempts);
    const historyAttempts = classroomPracticeHistoryAttempts(attempts);
    const bestAttempt = classroomBestPracticeAttempt(attempts, summary);
    const displayAttempts = historyAttempts.length ? historyAttempts : classroomPracticeFallbackAttempt(classroomTrackerResult(termData, taskId, studentKey));
    document.getElementById('home-practice-attempt-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-practice-attempt-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomePracticeAttemptModal()" aria-label="Close practice attempts"></button>
      <div class="home-modal home-practice-attempt-modal">
        <div class="home-practice-attempt-head">
          <div>
            <h2 class="home-modal-title">${classroomAttr(task?.title || 'Quero Practice')} attempts</h2>
            <p>${classroomAttr(student?.name || student?.displayName || student?.firstName || 'Student')}</p>
          </div>
          <button type="button" class="home-practice-attempt-close" onclick="closeHomePracticeAttemptModal()" aria-label="Close practice attempts"><i class="ti ti-x"></i></button>
        </div>
        ${displayAttempts.length ? `<div class="home-practice-attempt-table-wrap">
          <table class="home-practice-attempt-table">
            <thead>
              <tr>
                <th>Attempt</th>
                <th>Correct</th>
                <th>Time</th>
                <th>Score</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              ${displayAttempts.map((attempt,index)=>`<tr>
                <td>${classroomAttr(classroomPracticeAttemptNumber(attempt,index))}</td>
                <td>${classroomAttr(classroomPracticeCorrectLabel(attempt))}</td>
                <td>${classroomAttr(classroomPracticeTimeLabel(attempt))}</td>
                <td class="home-practice-attempt-score">${classroomAttr(classroomPracticeScoreLabel(attempt))}</td>
                <td>${classroomPracticeCanReview(attempt) ? `<button type="button" class="home-practice-review-button" onclick="openHomePracticeAttemptReview(${classIndex},'${classroomJsString(termKey)}','${classroomJsString(taskId)}','${classroomJsString(studentKey)}',${classroomPracticeAttemptNumber(attempt,index)},'${classroomJsString(classroomPracticeAttemptRecordType(attempt) || 'detail')}')">Review</button>` : '-'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${bestAttempt ? `<h3 class="home-practice-best-attempt-title">Best Attempt</h3>
        <div class="home-practice-best-attempt-table-wrap">
          <table class="home-practice-attempt-table home-practice-best-attempt-table">
            <thead>
              <tr>
                <th>Attempt</th>
                <th>Correct</th>
                <th>Time</th>
                <th>Score</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${classroomAttr(bestAttempt.attemptNumber || '-')}</td>
                <td>${classroomAttr(classroomPracticeCorrectLabel(bestAttempt))}</td>
                <td>${classroomAttr(classroomPracticeTimeLabel(bestAttempt))}</td>
                <td class="home-practice-attempt-score">${classroomAttr(classroomPracticeScoreLabel(bestAttempt))}</td>
                <td>${classroomPracticeCanReview(bestAttempt) ? `<button type="button" class="home-practice-review-button" onclick="openHomePracticeAttemptReview(${classIndex},'${classroomJsString(termKey)}','${classroomJsString(taskId)}','${classroomJsString(studentKey)}',${Number(bestAttempt.attemptNumber) || 0},'${classroomJsString(classroomPracticeAttemptRecordType(bestAttempt) || 'detail')}')">Review</button>` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>` : ''}` : `<div class="home-class-placeholder compact"><p>No attempts submitted yet.</p></div>`}
        ${canStartPractice ? `<div class="home-practice-attempt-actions">
          <button type="button" class="home-practice-attempt-start" onclick="startHomePracticeFromAttemptModal(${classIndex},'${classroomJsString(termKey)}','${classroomJsString(taskId)}',event)"><i class="ti ti-player-play"></i><span>Start</span></button>
        </div>` : ''}
      </div>`;
    document.body.appendChild(shell);
  };

  window.closeHomePracticeAttemptModal = function closeHomePracticeAttemptModal(){
    document.getElementById('home-practice-attempt-modal-root')?.remove();
  };

  window.startHomePracticeFromAttemptModal = async function startHomePracticeFromAttemptModal(classIndex,termKey,taskId,event){
    closeHomePracticeAttemptModal();
    if(typeof window.startHomeStudentPractice === 'function') await window.startHomeStudentPractice(classIndex,termKey,taskId,event);
  };

  window.openHomePracticeAttemptReview = function openHomePracticeAttemptReview(classIndex,termKey,taskId,studentKey,attemptNumber,recordType=''){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    const termData = tracker[termKey];
    const task = termData?.tasks?.find(item=>item.id === taskId);
    const student = classroomStudents(cls).find(item=>item.key === studentKey);
    const attempts = classroomTrackerAttempts(termData || {}, taskId, studentKey);
    const type = String(recordType || '').trim();
    const attempt = attempts.find(item=>classroomPracticeAttemptNumber(item) === Number(attemptNumber) && (!type || classroomPracticeAttemptRecordType(item) === type))
      || attempts.find(item=>classroomPracticeAttemptNumber(item) === Number(attemptNumber))
      || null;
    if(!task || !attempt || !classroomPracticeCanReview(attempt)){
      if(typeof showToast === 'function') showToast('This attempt does not have review data saved.', true);
      return;
    }
    if(typeof openQueroPracticeReview !== 'function'){
      if(typeof showToast === 'function') showToast('Quero Practice review is not available yet.', true);
      return;
    }
    closeHomePracticeAttemptModal();
    openQueroPracticeReview({
      classIndex,
      termKey,
      taskId,
      cls,
      task,
      studentKey,
      studentName: student?.name || student?.displayName || student?.firstName || '',
      attempt
    });
  };

  window.selectHomeTrackerTaskType = function selectHomeTrackerTaskType(type){
    document.getElementById('home-tracker-task-type').value = type;
    document.querySelectorAll('.home-tracker-type-card').forEach(card=>card.classList.toggle('active', card.dataset.type === type));
    document.querySelectorAll('.home-tracker-type-options').forEach(section=>section.classList.toggle('hidden', !(type === 'completion' || type === 'progress')));
    document.querySelectorAll('.home-tracker-type-practice').forEach(section=>section.classList.toggle('hidden', type !== 'practice'));
    toggleHomeTrackerScoreDisplay();
    const editor = document.getElementById('home-tracker-option-editor');
    if(editor && (type === 'completion' || type === 'progress')){
      editor.innerHTML = classroomTrackerOptionObjects(classroomDefaultTaskOptions(type), type).map((option,index)=>renderTrackerOptionRow(option,index)).join('')
        + `<button type="button" class="home-tracker-add-option" onclick="addHomeTrackerOption()"><i class="ti ti-plus"></i><span>Add option</span></button>`;
    }
  };

  window.toggleHomeTrackerOptionColour = function toggleHomeTrackerOptionColour(button){
    const row = button?.closest('.home-tracker-option-row');
    const palette = row?.querySelector('.home-tracker-option-palette');
    if(!row || !palette) return;
    const isOpen = palette.classList.contains('open');
    document.querySelectorAll('.home-tracker-option-palette.open').forEach(item=>item.classList.remove('open'));
    document.querySelectorAll('.home-tracker-option-colour-button[aria-expanded="true"]').forEach(item=>{
      item.setAttribute('aria-expanded','false');
      const icon = item.querySelector('i');
      if(icon) icon.className = 'ti ti-chevron-down';
    });
    if(!isOpen){
      palette.classList.add('open');
      button.setAttribute('aria-expanded','true');
      const icon = button.querySelector('i');
      if(icon) icon.className = 'ti ti-chevron-up';
    }
  };

  window.selectHomeTrackerOptionColour = function selectHomeTrackerOptionColour(button,color,label){
    const row = button?.closest('.home-tracker-option-row');
    if(!row) return;
    row.dataset.optionColor = color || 'blue';
    row.querySelectorAll('.home-tracker-option-swatch').forEach(item=>item.classList.toggle('active', item === button));
    const colourButton = row.querySelector('.home-tracker-option-colour-button');
    if(colourButton){
      colourButton.innerHTML = `<span><span class="home-tracker-option-colour-dot home-tracker-status-color-${classroomAttr(color || 'blue')}"></span>${classroomAttr(label || color || 'Blue')}</span><i class="ti ti-chevron-down"></i>`;
      colourButton.setAttribute('aria-expanded','false');
    }
    row.querySelector('.home-tracker-option-palette')?.classList.remove('open');
  };

  window.updateHomeTrackerCellSelectColour = function updateHomeTrackerCellSelectColour(select){
    if(!select) return;
    classroomTrackerOptionColours().forEach(item=>select.classList.remove(`home-tracker-status-color-${item.value}`));
    const option = select.options[select.selectedIndex];
    const color = option?.dataset?.color || 'blue';
    select.classList.add(`home-tracker-status-color-${color}`);
  };

  function readHomeTrackerPercentageLegend(){
    const rows = [...document.querySelectorAll('.home-tracker-percentage-step')];
    const fallback = classroomTrackerDefaultPercentageLegend();
    const colours = classroomTrackerOptionColours().map(item=>item.value);
    const legend = rows.map((row,index)=>{
      const threshold = classroomTrackerPercentageSnap(Number(row.querySelector('input')?.value) || fallback[index]?.threshold || 100);
      const color = colours.includes(String(row.dataset.color || '').toLowerCase()) ? String(row.dataset.color).toLowerCase() : fallback[index]?.color || 'green';
      return { threshold, color };
    });
    return classroomTrackerPercentageLegend(legend);
  }

  function refreshHomeTrackerPercentageNumberLine(){
    const legendRoot = document.querySelector('.home-tracker-percentage-legend');
    const line = legendRoot?.querySelector('.home-tracker-percentage-line');
    if(!legendRoot || !line) return;
    const legend = readHomeTrackerPercentageLegend();
    line.style.background = classroomTrackerPercentageGradient(legend);
    legendRoot.querySelectorAll('.home-tracker-percentage-step').forEach((step,index)=>{
      const threshold = classroomTrackerPercentageSnap(Number(step.querySelector('input')?.value) || 0);
      step.style.left = `${threshold}%`;
      const valueText = step.querySelector('.home-tracker-percent-value');
      if(valueText) valueText.textContent = String(threshold);
      const current = legend[index];
      if(current?.color) step.dataset.color = current.color;
    });
  }

  function updateVisiblePercentageColours(cls){
    document.querySelectorAll('.home-tracker-cell-input,.home-tracker-practice-result,.percent-cell[data-vass-percent]').forEach(el=>{
      classroomTrackerOptionColours().forEach(item=>el.classList.remove(`home-tracker-status-color-${item.value}`));
      const value = el.tagName === 'INPUT' ? el.value : el.textContent;
      const color = classroomTrackerPercentageColour(cls, value);
      if(color) el.classList.add(`home-tracker-status-color-${color}`);
    });
  }

  async function persistHomeTrackerPercentageLegend(cls){
    const sync = classroomSync();
    if(sync?.saveTrackerSettings && (cls.id || cls.supabaseId)){
      try{
        const tracker = classroomTracker(cls);
        await sync.saveTrackerSettings(cls, {
          percentageLegend:tracker.percentageLegend,
          percentageLegendEnabled:tracker.percentageLegendEnabled !== false
        });
      }catch(err){
        console.warn('Could not save tracker percentage legend to Supabase', err);
        if(typeof showToast === 'function') showToast('Legend saved locally, but Supabase did not save it yet.', true);
      }
    }
  }

  window.toggleHomeTrackerPercentageLegend = function toggleHomeTrackerPercentageLegend(classIndex){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    tracker.percentageLegendOpen = !tracker.percentageLegendOpen;
    saveClassroomClasses(classes);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.toggleHomeTrackerPercentageLegendEnabled = async function toggleHomeTrackerPercentageLegendEnabled(classIndex,enabled){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    tracker.percentageLegendEnabled = enabled !== false;
    tracker.percentageLegendOpen = true;
    saveClassroomClasses(classes);
    updateVisiblePercentageColours(cls);
    await persistHomeTrackerPercentageLegend(cls);
  };

  window.updateHomeTrackerPercentageLegend = async function updateHomeTrackerPercentageLegend(classIndex,persist=false){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    refreshHomeTrackerPercentageNumberLine();
    tracker.percentageLegend = readHomeTrackerPercentageLegend();
    tracker.percentageLegendOpen = true;
    saveClassroomClasses(classes);
    updateVisiblePercentageColours(cls);
    if(persist) await persistHomeTrackerPercentageLegend(cls);
  };

  window.startHomeTrackerPercentageDrag = function startHomeTrackerPercentageDrag(event,classIndex,stepIndex){
    if(event.button !== undefined && event.button !== 0) return;
    if(event.target?.closest?.('.home-tracker-percent-palette')) return;
    if(event.target?.closest?.('.home-tracker-percent-colour-button')) return;
    const step = event.currentTarget;
    const line = step?.closest('.home-tracker-percentage-number-line');
    const input = step?.querySelector('input');
    if(!step || !line || !input) return;
    classroomTrackerPercentageDrag = {
      classIndex,
      stepIndex,
      step,
      line,
      input,
      startX:event.clientX,
      moved:false
    };
    step.dataset.dragged = 'false';
    step.setPointerCapture?.(event.pointerId);
  };

  window.addEventListener('pointermove', event=>{
    const drag = classroomTrackerPercentageDrag;
    if(!drag) return;
    const rect = drag.line.getBoundingClientRect();
    if(!rect.width) return;
    const movement = Math.abs(event.clientX - drag.startX);
    if(movement > 2) drag.moved = true;
    const steps = [...drag.line.querySelectorAll('.home-tracker-percentage-step')];
    const previousInput = steps[drag.stepIndex - 1]?.querySelector('input');
    const nextInput = steps[drag.stepIndex + 1]?.querySelector('input');
    const min = previousInput ? Math.min(95, classroomTrackerPercentageSnap(previousInput.value) + 5) : 0;
    const max = nextInput ? Math.max(min, classroomTrackerPercentageSnap(nextInput.value) - 5) : 100;
    const raw = classroomTrackerPercentageSnap(((event.clientX - rect.left) / rect.width) * 100);
    const value = Math.max(min, Math.min(max, raw));
    drag.input.value = value;
    drag.step.style.left = `${value}%`;
    refreshHomeTrackerPercentageNumberLine();
    const classes = classroomClasses();
    const cls = classes[drag.classIndex];
    if(cls){
      const tracker = classroomTracker(cls);
      tracker.percentageLegend = readHomeTrackerPercentageLegend();
      tracker.percentageLegendOpen = true;
      saveClassroomClasses(classes);
      updateVisiblePercentageColours(cls);
    }
  });

  window.addEventListener('pointerup', async ()=>{
    const drag = classroomTrackerPercentageDrag;
    if(!drag) return;
    drag.step.dataset.dragged = drag.moved ? 'true' : 'false';
    const classIndex = drag.classIndex;
    classroomTrackerPercentageDrag = null;
    if(drag.moved) await window.updateHomeTrackerPercentageLegend(classIndex,true);
    setTimeout(()=>{ if(drag.step?.dataset) drag.step.dataset.dragged = 'false'; }, 0);
  });

  window.addEventListener('pointercancel', ()=>{
    classroomTrackerPercentageDrag = null;
  });

  window.toggleHomeTrackerPercentageColour = function toggleHomeTrackerPercentageColour(button){
    const picker = button?.closest('.home-tracker-percent-colour');
    const step = button?.closest('.home-tracker-percentage-step');
    if(step?.dataset?.dragged === 'true'){
      step.dataset.dragged = 'false';
      return;
    }
    const palette = picker?.querySelector('.home-tracker-percent-palette');
    if(!picker || !palette) return;
    const isOpen = palette.classList.contains('open');
    document.querySelectorAll('.home-tracker-percent-palette.open').forEach(item=>item.classList.remove('open'));
    document.querySelectorAll('.home-tracker-percent-colour-button[aria-expanded="true"]').forEach(item=>{
      item.setAttribute('aria-expanded','false');
      const icon = item.querySelector('i');
      if(icon) icon.className = 'ti ti-chevron-down';
    });
    if(!isOpen){
      palette.classList.add('open');
      button.setAttribute('aria-expanded','true');
      const icon = button.querySelector('i');
      if(icon) icon.className = 'ti ti-chevron-up';
    }
  };

  window.selectHomeTrackerPercentageColour = async function selectHomeTrackerPercentageColour(button,stepIndex,color,label){
    const step = button?.closest('.home-tracker-percentage-step');
    if(!step) return;
    step.dataset.color = color || 'green';
    step.querySelectorAll('.home-tracker-option-swatch').forEach(item=>item.classList.toggle('active', item === button));
    const colourButton = step.querySelector('.home-tracker-percent-colour-button');
    if(colourButton){
      colourButton.innerHTML = `<span class="home-tracker-option-colour-dot home-tracker-status-color-${classroomAttr(color || 'green')}"></span><i class="ti ti-chevron-down"></i>`;
      colourButton.setAttribute('aria-expanded','false');
    }
    step.querySelector('.home-tracker-percent-palette')?.classList.remove('open');
    const classIndex = Number(document.querySelector('.home-tracker-percentage-legend')?.dataset?.classIndex ?? -1);
    if(classIndex >= 0) await updateHomeTrackerPercentageLegend(classIndex,true);
  };

  window.updateHomeTrackerPercentageInputColour = function updateHomeTrackerPercentageInputColour(classIndex,input){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls || !input) return;
    classroomTrackerOptionColours().forEach(item=>input.classList.remove(`home-tracker-status-color-${item.value}`));
    const color = classroomTrackerPercentageColour(cls, input.value);
    if(color) input.classList.add(`home-tracker-status-color-${color}`);
  };

  window.toggleHomeTrackerScoreDisplay = function toggleHomeTrackerScoreDisplay(){
    const type = document.getElementById('home-tracker-task-type')?.value || 'score';
    const attempts = Number(document.getElementById('home-tracker-task-attempts')?.value) || 1;
    document.querySelectorAll('.home-tracker-score-display-field').forEach(field=>field.classList.toggle('hidden', !(type === 'practice' && attempts > 1)));
  };

  window.updateHomeTrackerPracticeOptions = function updateHomeTrackerPracticeOptions(classIndex,changed){
    const cls = classroomClasses()[classIndex];
    if(!cls) return;
    const topics = trackerPracticeSelected('topic');
    const subtopicOptions = classroomPracticeSubtopics(cls,topics);
    const subtopics = trackerPracticeSelected('subtopic').filter(value=>subtopicOptions.includes(value));
    const skillOptions = classroomPracticeSkills(cls,topics,subtopics);
    const skills = trackerPracticeSelected('skill').filter(value=>skillOptions.includes(value));
    const topicPicker = document.getElementById('home-tracker-task-topic');
    if(topicPicker){
      const summary = topicPicker.querySelector('summary');
      summary.textContent = trackerPracticeSummary('topic',topics);
      summary.title = topics.join(', ');
    }
    if(changed === 'topic') syncTrackerPracticePicker('subtopic',subtopicOptions,subtopics,classIndex,topics.length ? '' : 'Select topic first');
    if(changed !== 'skill') syncTrackerPracticePicker('skill',skillOptions,skills,classIndex,subtopics.length ? '' : 'Select subtopic first');
    else{
      const summary = document.querySelector('#home-tracker-task-skill summary');
      if(summary){summary.textContent = trackerPracticeSummary('skill',skills);summary.title = skills.join(', ');}
    }
    if(changed === 'subtopic'){
      const summary = document.querySelector('#home-tracker-task-subtopic summary');
      if(summary){summary.textContent = trackerPracticeSummary('subtopic',subtopics);summary.title = subtopics.join(', ');}
    }
  };

  window.addHomeTrackerOption = function addHomeTrackerOption(){
    const editor = document.getElementById('home-tracker-option-editor');
    if(!editor) return;
    const button = editor.querySelector('.home-tracker-add-option');
    const count = editor.querySelectorAll('.home-tracker-option-row').length;
    const row = document.createElement('div');
    row.innerHTML = renderTrackerOptionRow({ label:'', color:classroomTrackerDefaultOptionColour('', document.getElementById('home-tracker-task-type')?.value || 'completion', count) }, count);
    const node = row.firstElementChild;
    editor.insertBefore(node, button);
    node.querySelector('input')?.focus();
  };

  window.removeHomeTrackerOption = function removeHomeTrackerOption(button){
    const rows = [...document.querySelectorAll('#home-tracker-option-editor .home-tracker-option-row')];
    if(rows.length <= 1){
      const input = rows[0]?.querySelector('input');
      if(input) input.value = '';
      return;
    }
    button?.closest('.home-tracker-option-row')?.remove();
  };

  window.saveHomeTrackerTask = async function saveHomeTrackerTask(classIndex,termKey){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const tracker = classroomTracker(cls);
    const termData = tracker[termKey];
    const taskId = document.getElementById('home-tracker-task-id')?.value || '';
    const type = document.getElementById('home-tracker-task-type')?.value || 'score';
    const title = document.getElementById('home-tracker-task-title')?.value?.trim();
    if(!title){
      if(typeof showToast === 'function') showToast('Task title is required.', true);
      return;
    }
    const seenOptions = new Set();
    const options = [...document.querySelectorAll('#home-tracker-option-editor .home-tracker-option-row')]
      .map((row,index)=>{
        const label = row.querySelector('.home-tracker-option-input')?.value?.trim() || '';
        if(!label) return null;
        const key = label.toLowerCase();
        if(seenOptions.has(key)) return null;
        seenOptions.add(key);
        return {
          label,
          color: classroomTrackerOptionColour({ label, color:row.dataset.optionColor }, type, index)
        };
      })
      .filter(Boolean);
    const payload = {
      id: taskId || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      title,
      dueDate: document.getElementById('home-tracker-task-due')?.value || classroomSundayDate(),
      updatedAt: new Date().toISOString(),
      createdAt: taskId ? (trackerFindTask(cls,termKey,taskId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };
    if(type === 'completion' || type === 'progress') payload.options = options.length ? options : classroomTrackerOptionObjects(classroomDefaultTaskOptions(type), type);
    if(type === 'practice'){
      payload.topic = JSON.stringify(trackerPracticeSelected('topic'));
      payload.subtopic = JSON.stringify(trackerPracticeSelected('subtopic'));
      payload.skill = JSON.stringify(trackerPracticeSelected('skill'));
      payload.questionCount = Number(document.getElementById('home-tracker-task-question-count')?.value) || 10;
      payload.attempts = Number(document.getElementById('home-tracker-task-attempts')?.value) || 1;
      payload.scoreDisplay = payload.attempts > 1 ? classroomPracticeScoreDisplay(document.getElementById('home-tracker-task-score-display')?.value) : 'first';
    }
    const sync = classroomSync();
    if(sync?.saveTrackerTask && (cls.id || cls.supabaseId)){
      try{
        const savedTask = await sync.saveTrackerTask(cls,termKey,payload);
        if(savedTask) Object.assign(payload, savedTask);
      }catch(err){
        console.warn('Could not save tracker task to Supabase', err);
        if(typeof showToast === 'function') showToast('Task saved locally, but Supabase did not save it yet.', true);
      }
    }
    const existingIndex = termData.tasks.findIndex(task => task.id === payload.id);
    if(existingIndex >= 0) termData.tasks[existingIndex] = { ...termData.tasks[existingIndex], ...payload };
    else termData.tasks.push(payload);
    tracker.activeTerm = termKey;
    classroomTrackerTerm = termKey;
    saveClassroomClasses(classes);
    closeHomeTrackerTaskModal();
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.deleteHomeTrackerTask = async function deleteHomeTrackerTask(classIndex,termKey,taskId){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const sync = classroomSync();
    if(sync?.deleteTrackerTask && (cls.id || cls.supabaseId)){
      try{
        await sync.deleteTrackerTask(taskId);
      }catch(err){
        console.warn('Could not delete tracker task from Supabase', err);
        if(typeof showToast === 'function') showToast('Task removed locally, but Supabase did not delete it yet.', true);
      }
    }
    const tracker = classroomTracker(cls);
    tracker[termKey].tasks = tracker[termKey].tasks.filter(task => task.id !== taskId);
    delete tracker[termKey].results[taskId];
    saveClassroomClasses(classes);
    closeHomeTrackerTaskModal();
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.startHomeStudentPractice = async function startHomeStudentPractice(classIndex,termKey,taskId,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const classes = classroomClasses();
    const cls = classes[classIndex];
    const task = cls ? trackerFindTask(cls,termKey,taskId) : null;
    if(!cls || !task || task.type !== 'practice'){
      if(typeof showToast === 'function') showToast('Quero Practice task not found.', true);
      return;
    }
    if(typeof window.openQueroPracticeAssignment !== 'function'){
      if(typeof showToast === 'function') showToast('Quero Practice is not available yet.', true);
      return;
    }
    const student = classroomCurrentStudent(cls);
    await window.openQueroPracticeAssignment({
      classIndex,
      termKey,
      taskId,
      cls,
      task,
      studentKey: student.key,
      studentName: student.name
    });
  };

  window.saveHomeTrackerResult = async function saveHomeTrackerResult(classIndex,termKey,taskId,studentKey,value){
    const classes = classroomClasses();
    if(!classes[classIndex]) return;
    const cls = classes[classIndex];
    const tracker = classroomTracker(cls);
    const termData = tracker[termKey];
    termData.results[taskId] = termData.results[taskId] && typeof termData.results[taskId] === 'object' ? termData.results[taskId] : {};
    const task = termData.tasks.find(item => item.id === taskId);
    if(task?.type === 'score'){
      const number = String(value || '').trim();
      termData.results[taskId][studentKey] = number === '' ? '' : Math.max(0, Math.min(100, Number(number) || 0));
    }else{
      termData.results[taskId][studentKey] = value;
    }
    saveClassroomClasses(classes);
    const sync = classroomSync();
    if(sync?.saveTrackerResult && (cls.id || cls.supabaseId)){
      try{
        await sync.saveTrackerResult(cls,taskId,studentKey,termData.results[taskId][studentKey]);
      }catch(err){
        console.warn('Could not save tracker result to Supabase', err);
        if(typeof showToast === 'function') showToast('Result saved locally, but Supabase did not save it yet.', true);
      }
    }
  };

  window.saveHomePracticeAttemptResult = async function saveHomePracticeAttemptResult(classIndex,termKey,taskId,studentKey,result){
    const classes = classroomClasses();
    if(!classes[classIndex]) return { saveDetailed:false };
    const cls = classes[classIndex];
    const tracker = classroomTracker(cls);
    const termData = tracker[termKey];
    if(!termData) return { saveDetailed:false };
    const task = termData.tasks.find(item => item.id === taskId);
    if(!task || task.type !== 'practice') return { saveDetailed:false };
    const attempts = classroomTrackerAttempts(termData, taskId, studentKey);
    const summary = classroomTrackerAttemptSummary(termData, taskId, studentKey);
    classroomSeedPracticeAttemptSummary(summary, attempts);
    const historyAttempts = classroomPracticeHistoryAttempts(attempts);
    const attemptNumber = (Number(summary.totalAttempts) || attempts.length || 0) + 1;
    const saveBaseAttempt = historyAttempts.length < CLASSROOM_DETAILED_PRACTICE_ATTEMPT_LIMIT;
    const isNewBest = classroomUpdatePracticeAttemptSummary(summary, result);
    const saveDetailed = saveBaseAttempt || isNewBest;
    const recordType = saveBaseAttempt ? 'detail' : 'best';
    if(saveDetailed){
      if(recordType === 'best'){
        for(let i=attempts.length - 1; i>=0; i--){
          if(classroomPracticeAttemptRecordType(attempts[i]) === 'best') attempts.splice(i,1);
        }
      }
      attempts.push({
        attemptNumber,
        recordType,
        scorePercent: Number(result?.percent) || 0,
        correctCount: Number(result?.correct) || 0,
        totalCount: Number(result?.total) || 0,
        durationMs: Number(result?.durationMs) || 0,
        answers: result?.answers || {},
        questions: Array.isArray(result?.questions) ? result.questions : [],
        optionOrders: result?.optionOrders || {},
        createdAt: new Date().toISOString()
      });
    }
    const display = classroomPracticeDisplayScore(task, attempts, '', summary);
    termData.results[taskId] = termData.results[taskId] && typeof termData.results[taskId] === 'object' ? termData.results[taskId] : {};
    termData.results[taskId][studentKey] = display;
    saveClassroomClasses(classes);
    const sync = classroomSync();
    if(sync?.saveTrackerResult && (cls.id || cls.supabaseId)){
      try{
        await sync.saveTrackerResult(cls,taskId,studentKey,display);
      }catch(err){
        console.warn('Could not save practice display score to Supabase', err);
        if(typeof showToast === 'function') showToast('Practice score saved locally, but Supabase did not save it yet.', true);
      }
    }
    return { saveDetailed, attemptNumber, recordType };
  };

  window.saveHomeClassStudentEdit = async function saveHomeClassStudentEdit(classIndex,key){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const studentIndex = classroomFindStudentIndex(cls,key);
    if(studentIndex < 0) return;
    const name = document.getElementById(`home-student-name-${key}`)?.value?.trim();
    const email = document.getElementById(`home-student-email-${key}`)?.value?.trim().toLowerCase();
    const status = document.getElementById(`home-student-status-${key}`)?.value === 'Inactive' ? 'Inactive' : 'Active';
    if(!name){
      if(typeof showToast === 'function') showToast('Student name is required.', true);
      return;
    }
    const original = cls.students[studentIndex];
    const memberId = typeof original === 'object' ? original.id : '';
    const sync = classroomSync();
    if(sync?.updateMember && memberId){
      try{
        const saved = await sync.updateMember(memberId, { name, email, status });
        cls.students[studentIndex] = { ...original, ...saved, name:saved.name, displayName:saved.displayName, email:saved.email, status:saved.status };
      }catch(err){
        console.warn('Could not update student in Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not update student.', true);
        return;
      }
    }else if(typeof original === 'string'){
      cls.students[studentIndex] = { name, displayName:name, email, status, joinedAt:new Date().toISOString() };
    }else{
      cls.students[studentIndex] = { ...original, name, displayName:name, email, status };
    }
    classroomEditingStudent = null;
    saveClassroomClasses(classes);
    if(typeof renderHomePage === 'function') renderHomePage();
    if(typeof showToast === 'function') showToast('Student updated.');
  };

  function parseCompassCsv(text){
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    const input = String(text || '').replace(/^\uFEFF/,'');
    for(let i=0;i<input.length;i++){
      const char = input[i];
      if(char === '"'){
        if(quoted && input[i + 1] === '"'){ field += '"'; i++; }
        else if(!field || quoted) quoted = !quoted;
        else field += char;
      }else if(char === ',' && !quoted){
        row.push(field); field = '';
      }else if((char === '\n' || char === '\r') && !quoted){
        if(char === '\r' && input[i + 1] === '\n') i++;
        row.push(field); field = '';
        if(row.some(value=>value.trim())) rows.push(row);
        row = [];
      }else field += char;
    }
    if(quoted) throw new Error('The CSV has an unclosed quoted value.');
    row.push(field);
    if(row.some(value=>value.trim())) rows.push(row);
    return rows;
  }

  function renderCompassImportState(){
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  }

  window.openHomeClassCompassImport = function openHomeClassCompassImport(classIndex){
    if(isStudentClassroomRole()) return;
    classroomCompassImport = { classIndex, fileName:'', changes:[], unchanged:0, unmatched:0, invalid:0, saving:false };
    renderCompassImportState();
  };

  window.closeHomeClassCompassImport = function closeHomeClassCompassImport(){
    if(classroomCompassImport?.saving) return;
    classroomCompassImport = null;
    renderCompassImportState();
  };

  window.loadHomeClassCompassFile = async function loadHomeClassCompassFile(classIndex,input){
    const file = input.files?.[0];
    input.value = '';
    if(!file || !classroomCompassImport || classroomCompassImport.classIndex !== classIndex) return;
    const pendingImport = classroomCompassImport;
    if(file.size > 5 * 1024 * 1024){
      if(typeof showToast === 'function') showToast('Choose a CSV smaller than 5 MB.', true);
      return;
    }
    try{
      const rows = parseCompassCsv(await file.text());
      const cls = classroomClasses()[classIndex];
      if(!cls) throw new Error('Classroom not found.');
      const studentsByEmail = new Map(classroomStudents(cls)
        .filter(student=>student.email)
        .map(student=>[String(student.email).trim().toLowerCase(),student]));
      const seen = new Set();
      const changes = [];
      let unchanged = 0;
      let unmatched = 0;
      let invalid = 0;
      for(const [rowIndex,row] of rows.entries()){
        const given = String(row[1] || '').trim();
        const surname = String(row[2] || '').trim();
        const email = String(row[6] || '').trim().toLowerCase();
        if(rowIndex === 0 && (email === 'email' || email === 'email address')) continue;
        if(!email.includes('@') || !given || !surname || seen.has(email)){ invalid++; continue; }
        seen.add(email);
        const student = studentsByEmail.get(email);
        if(!student){ unmatched++; continue; }
        const current = classroomStudentNameParts(student);
        if(current.given === given && current.surname === surname && !student.needsNameBackfill){ unchanged++; continue; }
        changes.push({ email, given, surname, currentName:[current.given,current.surname].filter(Boolean).join(' ') });
      }
      if(classroomCompassImport !== pendingImport) return;
      classroomCompassImport = { classIndex, fileName:file.name, changes, unchanged, unmatched, invalid, saving:false };
      renderCompassImportState();
    }catch(err){
      if(typeof showToast === 'function') showToast(err?.message || 'Could not read the CSV.', true);
    }
  };

  window.applyHomeClassCompassImport = async function applyHomeClassCompassImport(){
    const state = classroomCompassImport;
    if(!state || state.saving || !state.changes.length || isStudentClassroomRole()) return;
    state.saving = true;
    renderCompassImportState();
    const classes = classroomClasses();
    const cls = classes[state.classIndex];
    if(!cls){ classroomCompassImport = null; return; }
    const sync = classroomSync();
    let updated = 0;
    let failed = 0;
    for(const change of state.changes){
      const student = classroomStudents(cls).find(item=>String(item.email).trim().toLowerCase() === change.email);
      if(!student){ failed++; continue; }
      const original = cls.students[student.sourceIndex];
      const memberId = typeof original === 'object' ? original.id : '';
      const fullName = [change.given,change.surname].join(' ');
      try{
        let saved = null;
        if(sync?.updateSchoolMemberIdentity && memberId){
          saved = await sync.updateSchoolMemberIdentity(memberId,{ name:change.given, surname:change.surname });
        }else if(sync?.updateMember && memberId){
          saved = await sync.updateMember(memberId,{ name:fullName });
        }else if(cls.supabaseId || cls.id) throw new Error('Student cannot be updated without a member record.');
        cls.students[student.sourceIndex] = {
          ...original, ...saved, givenName:change.given, surname:change.surname,
          name:fullName, displayName:fullName
        };
        updated++;
      }catch(err){ console.warn('Could not import Compass student name:', err); failed++; }
    }
    if(updated) saveClassroomClasses(classes);
    classroomCompassImport = null;
    renderCompassImportState();
    if(typeof showToast === 'function') showToast(`${updated} ${updated === 1 ? 'student' : 'students'} updated${failed ? `; ${failed} could not be updated` : ''}.`, !!failed);
  };

  window.saveHomeClassStudentIdentity = async function saveHomeClassStudentIdentity(classIndex,key,field,value){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const studentIndex = classroomFindStudentIndex(cls,key);
    if(studentIndex < 0) return;
    const original = cls.students[studentIndex];
    const current = typeof original === 'string' ? { name:original } : { ...original };
    const currentParts = classroomStudentNameParts(current);
    const nextParts = {
      given: field === 'name' ? String(value || '').trim() : currentParts.given,
      surname: field === 'surname' ? String(value || '').trim() : currentParts.surname
    };
    if(!nextParts.given){
      if(typeof showToast === 'function') showToast('Student name is required.', true);
      if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
      else if(typeof renderHomePage === 'function') renderHomePage();
      return;
    }
    const fullName = [nextParts.given,nextParts.surname].filter(Boolean).join(' ');
    const memberId = typeof original === 'object' ? original.id : '';
    const sync = classroomSync();
    if(sync?.updateSchoolMemberIdentity && memberId){
      try{
        const saved = await sync.updateSchoolMemberIdentity(memberId, {
          name: nextParts.given,
          surname: nextParts.surname
        });
        cls.students[studentIndex] = {
          ...current,
          ...saved,
          givenName: saved?.givenName || nextParts.given,
          surname: saved?.surname || nextParts.surname,
          name: saved?.name || fullName,
          displayName: saved?.displayName || fullName
        };
      }catch(err){
        console.warn('Could not update student name in Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not update student name.', true);
        if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
        else if(typeof renderHomePage === 'function') renderHomePage();
        return;
      }
    }else if(sync?.updateMember && memberId){
      try{
        const saved = await sync.updateMember(memberId, { name:fullName });
        cls.students[studentIndex] = { ...current, ...saved, givenName:nextParts.given, surname:nextParts.surname, name:fullName, displayName:fullName };
      }catch(err){
        console.warn('Could not update student name in Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not update student name.', true);
        if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
        else if(typeof renderHomePage === 'function') renderHomePage();
        return;
      }
    }else if(typeof original === 'string'){
      cls.students[studentIndex] = { name:fullName, displayName:fullName, givenName:nextParts.given, surname:nextParts.surname, email:'', status:'Active', joinedAt:new Date().toISOString() };
    }else{
      cls.students[studentIndex] = { ...current, name:fullName, displayName:fullName, givenName:nextParts.given, surname:nextParts.surname };
    }
    saveClassroomClasses(classes);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.saveHomeClassStudentStatus = async function saveHomeClassStudentStatus(classIndex,key,checked){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const studentIndex = classroomFindStudentIndex(cls,key);
    if(studentIndex < 0) return;
    const status = checked ? 'Active' : 'Inactive';
    const original = cls.students[studentIndex];
    const memberId = typeof original === 'object' ? original.id : '';
    const sync = classroomSync();
    if(sync?.updateMember && memberId){
      try{
        const saved = await sync.updateMember(memberId, { status });
        cls.students[studentIndex] = { ...original, ...saved, status:saved.status || status };
      }catch(err){
        console.warn('Could not update student status in Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not update student status.', true);
        if(typeof renderHomePage === 'function') renderHomePage();
        return;
      }
    }else if(typeof original === 'string'){
      cls.students[studentIndex] = { name:original, displayName:original, email:'', status, joinedAt:new Date().toISOString() };
    }else{
      cls.students[studentIndex] = { ...original, status };
    }
    saveClassroomClasses(classes);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.deleteHomeClassStudent = async function deleteHomeClassStudent(classIndex,key){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const studentIndex = classroomFindStudentIndex(cls,key);
    if(studentIndex < 0) return;
    const original = cls.students[studentIndex];
    const memberId = typeof original === 'object' ? original.id : '';
    const sync = classroomSync();
    if(sync?.deleteMember && memberId){
      try{
        await sync.deleteMember(memberId);
      }catch(err){
        console.warn('Could not delete student from Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not delete student.', true);
        return;
      }
    }
    cls.students.splice(studentIndex, 1);
    if(classroomEditingStudent === key) classroomEditingStudent = null;
    saveClassroomClasses(classes);
    if(typeof renderHomePage === 'function') renderHomePage();
    if(typeof showToast === 'function') showToast('Student removed.');
  };

  window.saveHomeClassAnnouncementEdit = async function saveHomeClassAnnouncementEdit(index,id){
    const textarea = document.getElementById(`home-announcement-edit-${id}`);
    const text = textarea?.value?.trim();
    if(!text){
      if(typeof showToast === 'function') showToast('Announcement cannot be empty.', true);
      return;
    }
    const classes = classroomClasses();
    if(!classes[index]) return;
    const sync = classroomSync();
    if(sync?.updateAnnouncement && classes[index].id && id && !String(id).startsWith('announcement-')){
      try{
        const saved = await sync.updateAnnouncement(id, text);
        classes[index].announcements = (classes[index].announcements || []).map(item => item.id === id ? saved : item);
        classroomEditingAnnouncement = null;
        saveClassroomClasses(classes);
        if(typeof renderHomePage === 'function') renderHomePage();
        return;
      }catch(err){
        console.warn('Could not update announcement in Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not update announcement.', true);
        return;
      }
    }
    classes[index].announcements = (classes[index].announcements || []).map(item => item.id === id ? {
      ...item,
      text,
      updatedAt: new Date().toISOString()
    } : item);
    classroomEditingAnnouncement = null;
    saveClassroomClasses(classes);
    if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.deleteHomeClassAnnouncement = async function deleteHomeClassAnnouncement(index,id){
    const classes = classroomClasses();
    if(!classes[index]) return;
    const sync = classroomSync();
    if(sync?.deleteAnnouncement && classes[index].id && id && !String(id).startsWith('announcement-')){
      try{
        await sync.deleteAnnouncement(id);
      }catch(err){
        console.warn('Could not delete announcement from Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not delete announcement.', true);
        return;
      }
    }
    classes[index].announcements = (classes[index].announcements || []).filter(item => item.id !== id);
    if(classroomEditingAnnouncement === id) classroomEditingAnnouncement = null;
    saveClassroomClasses(classes);
    if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.openHomeClassResourceModal = function openHomeClassResourceModal(classIndex,resourceId=''){
    if(isStudentClassroomRole()) return;
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const resources = classroomResources(cls);
    const resource = resources.find(item=>item.id === resourceId) || {};
    const editTitle = String(resource.title || '').trim();
    const groupResources = editTitle ? resources.filter(item=>String(item.title || '').trim() === editTitle) : [];
    document.getElementById('home-class-resource-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-class-resource-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeClassResourceModal()" aria-label="Close resource form"></button>
      <div class="home-unit-area-modal home-resource-modal" role="dialog" aria-modal="true" aria-labelledby="home-resource-modal-title">
        <button type="button" class="home-unit-area-close" onclick="closeHomeClassResourceModal()" aria-label="Close resource form"><i class="ti ti-x"></i></button>
        <h3 class="home-modal-title" id="home-resource-modal-title">${groupResources.length ? 'Edit Resource' : 'Add Resource'}</h3>
        <div class="home-resource-form">
          <input id="home-resource-edit-title" type="hidden" value="${classroomAttr(editTitle)}">
          <label>Title
            <input id="home-resource-title" type="text" value="${classroomAttr(resource.title || '')}" placeholder="Resource title">
          </label>
          ${groupResources.length ? `<div class="home-resource-existing-files">
            ${groupResources.map(item=>`<div class="home-resource-existing-file" data-resource-id="${classroomAttr(item.id)}">
              <div>
                <i class="ti ${classroomAttr(classroomResourceIcon(item))} home-resource-file-icon-${classroomAttr(classroomResourceIconClass(item))}"></i>
                <span>${classroomAttr(item.fileName || item.fileUrl || item.title || 'Resource file')}</span>
                ${classroomResourceSize(item.fileSize) ? `<small>${classroomAttr(classroomResourceSize(item.fileSize))}</small>` : ''}
              </div>
              <button type="button" onclick="removeHomeClassExistingResourceFile('${classroomJsString(item.id)}')" title="Remove file" aria-label="Remove ${classroomAttr(item.fileName || item.title || 'resource file')}"><i class="ti ti-x"></i></button>
            </div>`).join('')}
          </div>` : ''}
          <label>Files
            <input id="home-resource-file" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.webp,.txt" onchange="refreshHomeClassResourceFiles()">
          </label>
          <div id="home-resource-selected-files" class="home-resource-selected-files" aria-live="polite"></div>
        </div>
        <div class="home-modal-actions">
          ${groupResources.length ? `<button type="button" class="danger" onclick="deleteHomeClassResourceGroup(${classIndex},'${classroomJsString(editTitle)}')">Delete</button>` : '<span></span>'}
          <button type="button" onclick="closeHomeClassResourceModal()">Cancel</button>
          <button type="button" class="primary" onclick="saveHomeClassResource(${classIndex},'${classroomJsString(resource.id || '')}')">Save</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    setTimeout(()=>document.getElementById('home-resource-title')?.focus(), 0);
  };

  window.toggleHomeClassResourceGroup = function toggleHomeClassResourceGroup(encodedKey){
    const key = decodeURIComponent(String(encodedKey || ''));
    if(!key) return;
    if(classroomExpandedResources.has(key)) classroomExpandedResources.delete(key);
    else classroomExpandedResources.add(key);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.openHomeClassResourceGroupModal = function openHomeClassResourceGroupModal(classIndex,title='',event=null){
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if(isStudentClassroomRole()) return;
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const resource = classroomResources(cls).find(item=>String(item.title || '').trim() === String(title || '').trim());
    openHomeClassResourceModal(classIndex, resource?.id || '');
  };

  window.closeHomeClassResourceModal = function closeHomeClassResourceModal(){
    document.getElementById('home-class-resource-modal-root')?.remove();
  };

  window.refreshHomeClassResourceFiles = function refreshHomeClassResourceFiles(){
    const input = document.getElementById('home-resource-file');
    const target = document.getElementById('home-resource-selected-files');
    if(!input || !target) return;
    const files = Array.from(input.files || []);
    target.innerHTML = files.length ? files.map((file,fileIndex)=>`
      <div class="home-resource-selected-file">
        <div>
          <i class="ti ${classroomAttr(classroomResourceIcon({ fileName:file.name, fileType:file.type }))} home-resource-file-icon-${classroomAttr(classroomResourceIconClass({ fileName:file.name, fileType:file.type }))}"></i>
          <span>${classroomAttr(file.name)}</span>
          ${classroomResourceSize(file.size) ? `<small>${classroomAttr(classroomResourceSize(file.size))}</small>` : ''}
        </div>
        <button type="button" onclick="removeHomeClassResourceFile(${fileIndex})" title="Remove file" aria-label="Remove ${classroomAttr(file.name)}"><i class="ti ti-x"></i></button>
      </div>`).join('') : '';
  };

  window.removeHomeClassResourceFile = function removeHomeClassResourceFile(fileIndex){
    const input = document.getElementById('home-resource-file');
    if(!input) return;
    const files = Array.from(input.files || []);
    if(fileIndex < 0 || fileIndex >= files.length) return;
    const transfer = new DataTransfer();
    files.forEach((file,index)=>{
      if(index !== fileIndex) transfer.items.add(file);
    });
    input.files = transfer.files;
    refreshHomeClassResourceFiles();
  };

  window.removeHomeClassExistingResourceFile = function removeHomeClassExistingResourceFile(resourceId){
    document.querySelector(`.home-resource-existing-file[data-resource-id="${CSS.escape(String(resourceId || ''))}"]`)?.remove();
  };

  window.saveHomeClassResource = async function saveHomeClassResource(classIndex,resourceId=''){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls || isStudentClassroomRole()) return;
    const titleInput = document.getElementById('home-resource-title');
    const editTitle = String(document.getElementById('home-resource-edit-title')?.value || '').trim();
    const fileInput = document.getElementById('home-resource-file');
    const files = Array.from(fileInput?.files || []);
    const file = files[0] || null;
    const resources = classroomResources(cls);
    const existing = resources.find(item=>item.id === resourceId) || {};
    const existingGroup = editTitle ? resources.filter(item=>String(item.title || '').trim() === editTitle) : (existing.id ? [existing] : []);
    const keptIds = new Set([...document.querySelectorAll('.home-resource-existing-file[data-resource-id]')].map(item=>item.getAttribute('data-resource-id')).filter(Boolean));
    const keptExisting = existingGroup.filter(item=>keptIds.has(item.id));
    const removedExisting = existingGroup.filter(item=>!keptIds.has(item.id));
    const titleText = String(titleInput?.value || '').trim();
    const title = String(titleText || file?.name || existing.title || '').trim();
    const description = '';
    const fileUrl = '';
    if(files.length > 1 && !titleText){
      if(typeof showToast === 'function') showToast('Add a title when uploading multiple files.', true);
      return;
    }
    if(!title){
      if(typeof showToast === 'function') showToast('Resource title is required.', true);
      return;
    }
    if(!files.length && !keptExisting.length){
      if(typeof showToast === 'function') showToast('Add a file for this resource.', true);
      return;
    }
    const sync = classroomSync();
    if(files.length && !sync?.saveClassroomResource){
      if(typeof showToast === 'function') showToast('File upload needs Supabase. Set up classroom resources in Supabase first.', true);
      return;
    }
    const now = new Date().toISOString();
    const savedItems = [];
    for(const removed of removedExisting){
      if(sync?.deleteClassroomResource && cls.id && !String(removed.id).startsWith('resource-')){
        try{
          await sync.deleteClassroomResource(removed);
        }catch(err){
          console.warn('Could not delete removed resource from Supabase:', err);
          if(typeof showToast === 'function') showToast(err?.message || 'Could not remove resource file.', true);
          return;
        }
      }
    }
    for(const kept of keptExisting){
      const payload = {
        ...kept,
        title,
        description,
        updatedAt:now
      };
      let saved = payload;
      if(sync?.updateClassroomResourceMetadata && cls.id && !String(kept.id).startsWith('resource-')){
        try{
          saved = await sync.updateClassroomResourceMetadata(payload);
        }catch(err){
          console.warn('Could not update resource in Supabase:', err);
          if(typeof showToast === 'function') showToast(err?.message || 'Could not update resource.', true);
          return;
        }
      }
      savedItems.push(saved);
    }
    for(const currentFile of files){
      const id = crypto?.randomUUID?.() || `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const payload = {
        id,
        title,
        description,
        fileName:currentFile.name || '',
        fileType:currentFile.type || '',
        fileSize:Number(currentFile.size) || 0,
        filePath:'',
        fileUrl,
        updatedAt:now,
        createdAt:now
      };
      let saved = payload;
      if(sync?.saveClassroomResource && cls.id){
        try{
          saved = await sync.saveClassroomResource(cls,payload,currentFile);
        }catch(err){
          console.warn('Could not save resource to Supabase:', err);
          if(typeof showToast === 'function') showToast(err?.message || 'Could not save resource.', true);
          return;
        }
      }
      savedItems.push(saved);
    }
    const groupIds = new Set(existingGroup.map(item=>item.id));
    const nextResources = resources.filter(item=>!groupIds.has(item.id)).concat(savedItems);
    cls.resources = nextResources.sort((a,b)=>String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    saveClassroomClasses(classes);
    closeHomeClassResourceModal();
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
    if(typeof showToast === 'function') showToast(savedItems.length > 1 ? `${savedItems.length} resources saved.` : 'Resource saved.');
  };

  window.deleteHomeClassResource = async function deleteHomeClassResource(classIndex,resourceId){
    if(isStudentClassroomRole()) return;
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const resource = classroomResources(cls).find(item=>item.id === resourceId);
    if(!resource) return;
    const sync = classroomSync();
    if(sync?.deleteClassroomResource && cls.id && !String(resourceId).startsWith('resource-')){
      try{
        await sync.deleteClassroomResource(resource);
      }catch(err){
        console.warn('Could not delete resource from Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not delete resource.', true);
        return;
      }
    }
    cls.resources = classroomResources(cls).filter(item=>item.id !== resourceId);
    saveClassroomClasses(classes);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
    if(typeof showToast === 'function') showToast('Resource deleted.');
  };

  window.deleteHomeClassResourceGroup = async function deleteHomeClassResourceGroup(classIndex,title){
    if(isStudentClassroomRole()) return;
    const classes = classroomClasses();
    const cls = classes[classIndex];
    if(!cls) return;
    const resources = classroomResources(cls);
    const groupResources = resources.filter(item=>String(item.title || '').trim() === String(title || '').trim());
    if(!groupResources.length) return;
    const sync = classroomSync();
    for(const resource of groupResources){
      if(sync?.deleteClassroomResource && cls.id && !String(resource.id).startsWith('resource-')){
        try{
          await sync.deleteClassroomResource(resource);
        }catch(err){
          console.warn('Could not delete resource group file from Supabase:', err);
          if(typeof showToast === 'function') showToast(err?.message || 'Could not delete resource.', true);
          return;
        }
      }
    }
    cls.resources = resources.filter(item=>String(item.title || '').trim() !== String(title || '').trim());
    saveClassroomClasses(classes);
    closeHomeClassResourceModal();
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(document.querySelector('.home-classroom-wrap'));
    else if(typeof renderHomePage === 'function') renderHomePage();
    if(typeof showToast === 'function') showToast('Resource deleted.');
  };

  window.downloadHomeClassResource = async function downloadHomeClassResource(classIndex,resourceId){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    const resource = cls ? classroomResources(cls).find(item=>item.id === resourceId) : null;
    if(!resource) return;
    const sync = classroomSync();
    let url = resource.fileUrl || '';
    if(sync?.getClassroomResourceDownloadUrl){
      try{
        url = await sync.getClassroomResourceDownloadUrl(resource);
      }catch(err){
        console.warn('Could not create resource download link:', err);
      }
    }
    if(!url){
      if(typeof showToast === 'function') showToast('This resource does not have a downloadable file yet.', true);
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    if(resource.fileName) link.download = resource.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  window.viewHomeClassResource = async function viewHomeClassResource(classIndex,resourceId){
    const classes = classroomClasses();
    const cls = classes[classIndex];
    const resource = cls ? classroomResources(cls).find(item=>item.id === resourceId) : null;
    if(!resource) return;
    const sync = classroomSync();
    let url = resource.fileUrl || '';
    if(sync?.getClassroomResourceViewUrl){
      try{
        url = await sync.getClassroomResourceViewUrl(resource);
      }catch(err){
        console.warn('Could not create resource view link:', err);
      }
    }else if(sync?.getClassroomResourceDownloadUrl){
      try{
        url = await sync.getClassroomResourceDownloadUrl(resource);
      }catch(err){
        console.warn('Could not create resource link:', err);
      }
    }
    if(!url){
      if(typeof showToast === 'function') showToast('This resource does not have a viewable file yet.', true);
      return;
    }
    if(classroomResourceIsImage(resource)){
      openHomeClassImagePreview(resource, url);
      return;
    }
    if(classroomResourceHasPdfPreview(resource)){
      openHomeClassPdfPreview(resource, url);
      return;
    }
    if(typeof showToast === 'function') showToast('Preview is available for PDFs. Word and PowerPoint previews need a generated PDF preview first.', true);
    window.open(url, '_blank', 'noopener');
  };

  window.openHomeClassPdfPreview = function openHomeClassPdfPreview(resource,url){
    document.getElementById('home-resource-pdf-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-resource-pdf-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeClassPdfPreview()" aria-label="Close PDF preview"></button>
      <div class="home-resource-pdf-modal" role="dialog" aria-modal="true" aria-labelledby="home-resource-pdf-title">
        <div class="home-resource-pdf-head">
          <div>
            <h3 id="home-resource-pdf-title">${classroomAttr(resource?.fileName || resource?.title || 'PDF preview')}</h3>
          </div>
          <div class="home-resource-pdf-actions">
            <a href="${classroomAttr(url)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i><span>Open</span></a>
            <a href="${classroomAttr(url)}" download="${classroomAttr(resource?.fileName || '')}"><i class="ti ti-download"></i><span>Download</span></a>
            <button type="button" onclick="closeHomeClassPdfPreview()" aria-label="Close PDF preview"><i class="ti ti-x"></i></button>
          </div>
        </div>
        <iframe class="home-resource-pdf-frame" src="${classroomAttr(url)}#toolbar=1&navpanes=0" title="${classroomAttr(resource?.fileName || resource?.title || 'PDF preview')}"></iframe>
      </div>`;
    document.body.appendChild(shell);
  };

  window.openHomeClassImagePreview = function openHomeClassImagePreview(resource,url){
    document.getElementById('home-resource-pdf-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-resource-pdf-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeClassPdfPreview()" aria-label="Close image preview"></button>
      <div class="home-resource-pdf-modal home-resource-image-modal" role="dialog" aria-modal="true" aria-labelledby="home-resource-image-title">
        <div class="home-resource-pdf-head">
          <div>
            <h3 id="home-resource-image-title">${classroomAttr(resource?.fileName || resource?.title || 'Image preview')}</h3>
          </div>
          <div class="home-resource-pdf-actions">
            <a href="${classroomAttr(url)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i><span>Open</span></a>
            <a href="${classroomAttr(url)}" download="${classroomAttr(resource?.fileName || '')}"><i class="ti ti-download"></i><span>Download</span></a>
            <button type="button" onclick="closeHomeClassPdfPreview()" aria-label="Close image preview"><i class="ti ti-x"></i></button>
          </div>
        </div>
        <div class="home-resource-image-preview">
          <img src="${classroomAttr(url)}" alt="${classroomAttr(resource?.fileName || resource?.title || 'Resource image')}">
        </div>
      </div>`;
    document.body.appendChild(shell);
  };

  window.closeHomeClassPdfPreview = function closeHomeClassPdfPreview(){
    document.getElementById('home-resource-pdf-modal-root')?.remove();
  };

  window.handleHomeAnnouncementCommentKey = function handleHomeAnnouncementCommentKey(event,index,announcementId){
    if(event.key === 'Enter'){
      event.preventDefault();
      postHomeAnnouncementComment(index,announcementId);
    }
  };

  window.postHomeAnnouncementComment = async function postHomeAnnouncementComment(index,announcementId){
    const input = document.getElementById(`home-announcement-comment-${announcementId}`);
    const text = input?.value?.trim();
    if(!text){
      if(typeof showToast === 'function') showToast('Write a comment first.', true);
      return;
    }
    const classes = classroomClasses();
    if(!classes[index]) return;
    const sync = classroomSync();
    if(sync?.createComment && classes[index].id && announcementId && !String(announcementId).startsWith('announcement-')){
      try{
        const saved = await sync.createComment(classes[index], announcementId, text);
        classes[index].announcements = (classes[index].announcements || []).map(item => {
          if(item.id !== announcementId) return item;
          const comments = Array.isArray(item.comments) ? item.comments : [];
          return { ...item, comments: comments.concat([saved]) };
        });
        saveClassroomClasses(classes);
        if(typeof renderHomePage === 'function') renderHomePage();
        return;
      }catch(err){
        console.warn('Could not save comment to Supabase:', err);
        if(typeof showToast === 'function') showToast(err?.message || 'Could not post comment.', true);
        return;
      }
    }
    const profile = classroomProfile();
    classes[index].announcements = (classes[index].announcements || []).map(item => {
      if(item.id !== announcementId) return item;
      const comments = Array.isArray(item.comments) ? item.comments : [];
      return {
        ...item,
        comments: comments.concat([{
          id: `comment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text,
          author: profile.name,
          email: profile.email,
          userId: profile.userId,
          createdAt: new Date().toISOString()
        }])
      };
    });
    saveClassroomClasses(classes);
    if(typeof renderHomePage === 'function') renderHomePage();
  };

  window.QueroClassroom = {
    renderClassGrid,
    renderClassroomView,
    renderClassTabContent
  };
})();





