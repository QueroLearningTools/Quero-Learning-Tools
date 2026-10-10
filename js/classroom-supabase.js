(function(){
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CLASSROOM_SELECT_BASE = '*, classroom_members(*), classroom_announcements(*, classroom_announcement_comments(*)), classroom_resources(*), classroom_tracker_tasks(*), classroom_tracker_results(*), classroom_quero_practice_attempts(*)';
  const CLASSROOM_SELECT_WITH_TODOS = `${CLASSROOM_SELECT_BASE}, classroom_todo_dismissals(*)`;

  function hasClient(){
    return typeof supabaseClient !== 'undefined' && !!supabaseClient;
  }

  function nowIso(){
    return new Date().toISOString();
  }

  function currentUserId(){
    return (typeof currentUser !== 'undefined' && currentUser?.id) || '';
  }

  async function currentAuthUserId(){
    if(hasClient() && supabaseClient.auth?.getUser){
      try{
        const { data } = await supabaseClient.auth.getUser();
        if(data?.user?.id) return data.user.id;
      }catch(err){
        console.warn('Could not read Supabase auth user:', err);
      }
    }
    return currentUserId();
  }

  function currentUserEmail(){
    return String((typeof currentUser !== 'undefined' && currentUser?.email) || (typeof currentProfile !== 'undefined' && currentProfile?.email) || '').trim().toLowerCase();
  }

  function currentDisplayName(){
    const profile = typeof currentProfile !== 'undefined' ? currentProfile : null;
    const email = currentUserEmail();
    return profile?.displayName || profile?.username || email.split('@')[0] || 'User';
  }

  function supabaseReady(){
    return hasClient() && currentUserId();
  }

  function currentSchoolId(){
    if(typeof selectedSchoolId !== 'undefined' && selectedSchoolId) return selectedSchoolId;
    const member = (typeof schoolAccounts !== 'undefined' && Array.isArray(schoolAccounts))
      ? schoolAccounts.find(account => {
        const userId = account.userId || account.user_id || '';
        const email = String(account.email || '').trim().toLowerCase();
        return (currentUserId() && userId === currentUserId()) || (currentUserEmail() && email === currentUserEmail());
      })
      : null;
    return member?.schoolId || member?.school_id || null;
  }

  async function schoolIdForNewClassroom(){
    if(typeof currentRole !== 'undefined' && currentRole === 'admin') return 'quero-learning-tools';
    const userId = await currentAuthUserId();
    if(!userId) throw new Error('Sign in to create a classroom.');
    const byUser = await supabaseClient.from('school_membership')
      .select('school_id,user_id,email,role,status')
      .eq('user_id', userId).eq('role', 'teacher').eq('status', 'active');
    if(byUser.error) throw byUser.error;
    const email = currentUserEmail();
    let memberships = byUser.data || [];
    if(email){
      const byEmail = await supabaseClient.from('school_membership')
        .select('school_id,user_id,email,role,status')
        .is('user_id', null).ilike('email', email).eq('role', 'teacher').eq('status', 'active');
      if(byEmail.error) throw byEmail.error;
      memberships = memberships.concat(byEmail.data || []);
    }
    const privateSchool = memberships.find(row => row.school_id && row.school_id !== 'quero-learning-tools');
    if(privateSchool) return privateSchool.school_id;
    const queroSchool = memberships.find(row => row.school_id === 'quero-learning-tools');
    if(queroSchool) return queroSchool.school_id;
    throw new Error('Your active school membership could not be found. Please refresh and try again.');
  }

  function randomCode(length=6){
    let code = '';
    if(window.crypto?.getRandomValues){
      const values = new Uint32Array(length);
      window.crypto.getRandomValues(values);
      values.forEach(value => code += CODE_CHARS[value % CODE_CHARS.length]);
      return code;
    }
    for(let i=0;i<length;i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return code;
  }

  async function generateClassroomCode(){
    if(!hasClient()) return randomCode();
    for(let attempt=0; attempt<20; attempt++){
      const code = randomCode();
      const { data, error } = await supabaseClient
        .from('classrooms')
        .select('id')
        .eq('class_code', code)
        .maybeSingle();
      if(error && error.code !== 'PGRST116') throw error;
      if(!data) return code;
    }
    return `${randomCode(6)}${randomCode(2)}`;
  }

  function memberFromRow(row){
    return {
      id: row.id,
      classroomId: row.classroom_id,
      userId: row.user_id || '',
      email: row.email || '',
      name: row.display_name || row.email || 'Student',
      givenName: row.given_name || row.first_name || '',
      surname: row.surname || row.last_name || '',
      needsNameBackfill: !(row.given_name || row.first_name) || !(row.surname || row.last_name),
      schoolMemberId: row.school_member_id || '',
      displayName: row.display_name || row.email || 'Student',
      role: row.role || 'student',
      status: row.status || 'Active',
      joinedAt: row.joined_at || row.created_at || ''
    };
  }

  function schoolMembershipKey(row){
    const userId = String(row?.user_id || row?.userId || '').trim();
    const email = String(row?.email || '').trim().toLowerCase();
    return userId || email;
  }

  function schoolMembershipName(row){
    const rawGiven = String(row?.name || row?.given_name || row?.first_name || '').trim();
    const surname = String(row?.surname || row?.last_name || '').trim();
    const display = String(row?.display_name || row?.displayName || '').trim();
    if(surname){
      const duplicateSuffix = rawGiven.toLowerCase().endsWith(` ${surname.toLowerCase()}`);
      const given = duplicateSuffix ? rawGiven.slice(0,-surname.length).trim() : rawGiven;
      return { given, surname, full:[given,surname].filter(Boolean).join(' ') };
    }
    const full = display || rawGiven;
    const parts = full.split(/\s+/).filter(Boolean);
    if(parts.length <= 1) return { given:rawGiven || full, surname:'', full };
    return { given:parts.slice(0,-1).join(' '), surname:parts[parts.length - 1], full };
  }

  async function hydrateSchoolMemberships(classes){
    if(!Array.isArray(classes) || !classes.length) return classes;
    const memberships = new Map();
    const addMembership = row => {
      const key = schoolMembershipKey(row);
      if(key) memberships.set(key, row);
    };
    if(typeof schoolAccounts !== 'undefined' && Array.isArray(schoolAccounts)){
      schoolAccounts.forEach(account => addMembership({
        id: account.id,
        school_id: account.schoolId || account.school_id,
        user_id: account.userId || account.user_id,
        email: account.email,
        name: account.name,
        surname: account.surname,
        display_name: account.displayName || account.display_name
      }));
    }
    if(hasClient()){
      const schoolIds = [...new Set(classes.map(cls=>cls.schoolId || cls.school_id || '').filter(Boolean))];
      for(const schoolId of schoolIds){
        try{
          const { data, error } = await supabaseClient
            .from('school_membership')
            .select('*')
            .eq('school_id', schoolId);
          if(error) throw error;
          (data || []).forEach(addMembership);
        }catch(err){
          console.warn('Could not load school membership names:', err);
        }
      }
    }
    classes.forEach(cls=>{
      const merge = member => {
        const match = memberships.get(String(member.userId || '').trim()) || memberships.get(String(member.email || '').trim().toLowerCase());
        if(!match) return member;
        const parts = schoolMembershipName(match);
        const full = parts.full || member.displayName || member.name || member.email || 'Student';
        return {
          ...member,
          schoolMemberId: match.id || member.schoolMemberId || '',
          givenName: parts.given || member.givenName || '',
          surname: parts.surname || member.surname || '',
          needsNameBackfill: !String(match.name || '').trim() || !String(match.surname || '').trim() || String(match.name || '').trim().toLowerCase().endsWith(` ${String(match.surname || '').trim().toLowerCase()}`),
          name: full,
          displayName: full
        };
      };
      cls.members = (cls.members || []).map(merge);
      cls.students = (cls.students || []).map(merge);
    });
    return classes;
  }

  function commentFromRow(row){
    return {
      id: row.id,
      announcementId: row.announcement_id,
      classroomId: row.classroom_id,
      userId: row.author_id || '',
      author: row.author_name || row.author_email || 'User',
      email: row.author_email || '',
      text: row.body || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function announcementFromRow(row){
    const legacyAttachment = row.attachment_path || row.attachment_url || row.attachment_name ? {
      fileName: row.attachment_name || 'Attachment',
      fileType: row.attachment_type || '',
      fileSize: Number(row.attachment_size) || 0,
      filePath: row.attachment_path || '',
      fileUrl: row.attachment_url || ''
    } : null;
    const attachments = Array.isArray(row.attachments)
      ? row.attachments.map(item=>({
          fileName: item?.fileName || item?.file_name || 'Attachment',
          fileType: item?.fileType || item?.file_type || '',
          fileSize: Number(item?.fileSize ?? item?.file_size) || 0,
          filePath: item?.filePath || item?.file_path || '',
          fileUrl: item?.fileUrl || item?.file_url || ''
        })).filter(item=>item.filePath || item.fileUrl || item.fileName)
      : [];
    if(!attachments.length && legacyAttachment) attachments.push(legacyAttachment);
    return {
      id: row.id,
      classroomId: row.classroom_id,
      userId: row.author_id || '',
      author: row.author_name || row.author_email || 'Teacher',
      email: row.author_email || '',
      text: row.body || '',
      attachments,
      attachment: attachments[0] || null,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      comments: (row.classroom_announcement_comments || []).map(commentFromRow)
    };
  }

  function trackerTaskFromRow(row){
    return {
      id: row.id,
      classroomId: row.classroom_id,
      termKey: row.term_key || 'term1',
      type: row.task_type || 'score',
      title: row.title || '',
      dueDate: row.due_date || '',
      weekStart: row.week_start || '',
      options: Array.isArray(row.options) ? row.options : [],
      topic: row.topic || '',
      subtopic: row.subtopic || '',
      skill: row.skill || '',
      questionCount: Number(row.question_count) || 10,
      attempts: Number(row.attempts_allowed) || 1,
      scoreDisplay: row.score_display || 'first',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function trackerResultFromRow(row){
    return {
      id: row.id,
      classroomId: row.classroom_id,
      taskId: row.task_id,
      studentKey: row.student_key || '',
      value: row.value == null ? '' : row.value,
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function practiceAttemptFromRow(row){
    return {
      id: row.id,
      classroomId: row.classroom_id,
      taskId: row.task_id,
      studentKey: row.student_key || '',
      studentName: row.student_name || '',
      termKey: row.term_key || 'term1',
      scorePercent: Number(row.score_percent) || 0,
      correctCount: Number(row.correct_count) || 0,
      totalCount: Number(row.total_count) || 0,
      attemptNumber: Number(row.attempt_data?.attemptNumber) || 0,
      recordType: row.attempt_data?.recordType || '',
      durationMs: Number(row.attempt_data?.durationMs) || 0,
      answers: row.attempt_data?.answers || {},
      questions: Array.isArray(row.attempt_data?.questions) ? row.attempt_data.questions : [],
      optionOrders: row.attempt_data?.optionOrders || {},
      data: row.attempt_data || {},
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function todoDismissalFromRow(row){
    return {
      id: row.id,
      classroomId: row.classroom_id || '',
      taskId: row.task_id || '',
      studentKey: row.student_key || '',
      termKey: row.term_key || 'term1',
      reason: row.reason || 'done',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function resourceFromRow(row){
    return {
      id: row.id,
      classroomId: row.classroom_id || '',
      title: row.title || '',
      description: row.description || '',
      fileName: row.file_name || '',
      fileType: row.file_type || '',
      fileSize: Number(row.file_size) || 0,
      filePath: row.file_path || '',
      fileUrl: row.file_url || '',
      previewFilePath: row.preview_file_path || '',
      previewFileUrl: row.preview_file_url || '',
      previewStatus: row.preview_status || '',
      uploadedBy: row.uploaded_by || '',
      uploadedByName: row.uploaded_by_name || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || ''
    };
  }

  function trackerFromRows(taskRows=[],resultRows=[],attemptRows=[]){
    const tracker = { activeTerm:'term1' };
    ['term1','term2','term3','term4'].forEach(term=>{
      tracker[term] = { tasks:[], results:{}, attempts:{} };
    });
    (taskRows || []).map(trackerTaskFromRow).forEach(task=>{
      const termKey = tracker[task.termKey] ? task.termKey : 'term1';
      tracker[termKey].tasks.push(task);
    });
    Object.keys(tracker).forEach(termKey=>{
      if(termKey === 'activeTerm') return;
      tracker[termKey].tasks.sort((a,b)=>{
        const week = String(a.weekStart || '').localeCompare(String(b.weekStart || ''));
        if(week) return week;
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      });
    });
    (resultRows || []).map(trackerResultFromRow).forEach(result=>{
      const task = (taskRows || []).find(row=>row.id === result.taskId);
      const termKey = task?.term_key && tracker[task.term_key] ? task.term_key : 'term1';
      tracker[termKey].results[result.taskId] = tracker[termKey].results[result.taskId] || {};
      tracker[termKey].results[result.taskId][result.studentKey] = result.value;
    });
    (attemptRows || []).map(practiceAttemptFromRow).forEach(attempt=>{
      const task = (taskRows || []).find(row=>row.id === attempt.taskId);
      const termKey = attempt.termKey && tracker[attempt.termKey] ? attempt.termKey : task?.term_key && tracker[task.term_key] ? task.term_key : 'term1';
      tracker[termKey].attempts[attempt.taskId] = tracker[termKey].attempts[attempt.taskId] || {};
      tracker[termKey].attempts[attempt.taskId][attempt.studentKey] = tracker[termKey].attempts[attempt.taskId][attempt.studentKey] || [];
      tracker[termKey].attempts[attempt.taskId][attempt.studentKey].push(attempt);
    });
    return tracker;
  }

  function classFromRow(row){
    const members = (row.classroom_members || []).map(memberFromRow);
    const tracker = trackerFromRows(row.classroom_tracker_tasks || [], row.classroom_tracker_results || [], row.classroom_quero_practice_attempts || []);
    const trackerSettings = row.tracker_settings && typeof row.tracker_settings === 'object' ? row.tracker_settings : {};
    if(Array.isArray(trackerSettings.percentageLegend)) tracker.percentageLegend = trackerSettings.percentageLegend;
    if(typeof trackerSettings.percentageLegendEnabled === 'boolean') tracker.percentageLegendEnabled = trackerSettings.percentageLegendEnabled;
    const vassData = row.vass_data && typeof row.vass_data === 'object' ? row.vass_data : {};
    return {
      id: row.id,
      supabaseId: row.id,
      schoolId: row.school_id || '',
      teacherId: row.teacher_id || '',
      name: row.name || 'Untitled class',
      subject: row.subject || '',
      yearLevel: row.year_level || '',
      banner: row.banner || row.subject || '',
      color: row.color || '',
      classCode: row.class_code || '',
      code: row.class_code || '',
      archived: !!row.archived,
      archivedAt: row.archived_at || '',
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
      students: members.filter(member => member.role === 'student'),
      members,
      announcements: (row.classroom_announcements || []).map(announcementFromRow),
      resources: (row.classroom_resources || []).map(resourceFromRow).sort((a,b)=>String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
      tracker,
      vass: vassData,
      todoDismissals: (row.classroom_todo_dismissals || []).map(todoDismissalFromRow)
    };
  }

  function classRow(cls, classCode){
    return {
      school_id: cls.schoolId || currentSchoolId(),
      teacher_id: cls.teacherId || currentUserId() || null,
      name: String(cls.name || '').trim(),
      subject: String(cls.subject || '').trim(),
      year_level: String(cls.yearLevel || '').trim(),
      banner: String(cls.banner || '').trim(),
      color: String(cls.color || '').trim(),
      class_code: String(classCode || cls.classCode || cls.code || '').trim().toUpperCase(),
      archived: cls.archived === true,
      updated_at: nowIso()
    };
  }

  function practiceAttemptRowType(row){
    return String(row?.attempt_data?.recordType || '').trim();
  }

  function practiceAttemptRowNumber(row,index=0){
    const n = Number(row?.attempt_data?.attemptNumber);
    return Number.isFinite(n) && n > 0 ? n : index + 1;
  }

  function practiceAttemptRowScore(row){
    const score = Number(row?.score_percent ?? row?.attempt_data?.scorePercent);
    if(Number.isFinite(score)) return score;
    const correct = Number(row?.correct_count ?? row?.attempt_data?.correctCount);
    const total = Number(row?.total_count ?? row?.attempt_data?.totalCount);
    return Number.isFinite(correct) && Number.isFinite(total) && total > 0 ? Math.round((correct / total) * 100) : null;
  }

  function practiceAttemptRowDuration(row){
    const duration = Number(row?.attempt_data?.durationMs);
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
  }

  function sortPracticeAttemptRows(rows){
    return [...(rows || [])].sort((a,b)=>{
      const aNum = practiceAttemptRowNumber(a,0);
      const bNum = practiceAttemptRowNumber(b,0);
      if(aNum && bNum && aNum !== bNum) return aNum - bNum;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });
  }

  function bestPracticeAttemptRow(rows){
    return (rows || []).reduce((best,row)=>{
      const score = practiceAttemptRowScore(row);
      if(score === null) return best;
      if(!best) return row;
      const bestScore = practiceAttemptRowScore(best);
      if(score > bestScore) return row;
      if(score < bestScore) return best;
      const duration = practiceAttemptRowDuration(row);
      const bestDuration = practiceAttemptRowDuration(best);
      if(duration && (!bestDuration || duration < bestDuration)) return row;
      return best;
    }, null);
  }

  function keptPracticeAttemptRows(rows){
    const sorted = sortPracticeAttemptRows(rows || []);
    const firstThree = sorted.filter(row=>practiceAttemptRowType(row) !== 'best').slice(0,3);
    const best = bestPracticeAttemptRow(sorted);
    const keepIds = new Set(firstThree.map(row=>row.id).filter(Boolean));
    if(best?.id) keepIds.add(best.id);
    return sorted.filter(row=>row.id && keepIds.has(row.id));
  }

  async function cleanupPracticeAttemptRows(classroomId,taskId,studentKey,rows=null){
    if(!hasClient() || !classroomId || !taskId || !studentKey) return [];
    let sourceRows = rows;
    if(!Array.isArray(sourceRows)){
      const { data, error } = await supabaseClient
        .from('classroom_quero_practice_attempts')
        .select('*')
        .eq('classroom_id', classroomId)
        .eq('task_id', taskId)
        .eq('student_key', studentKey)
        .order('created_at', { ascending:true });
      if(error) throw error;
      sourceRows = data || [];
    }
    const keepRows = keptPracticeAttemptRows(sourceRows);
    const keepIds = new Set(keepRows.map(row=>row.id).filter(Boolean));
    const deleteIds = (sourceRows || []).map(row=>row.id).filter(id=>id && !keepIds.has(id));
    if(deleteIds.length){
      const { error: deleteError } = await supabaseClient
        .from('classroom_quero_practice_attempts')
        .delete()
        .in('id', deleteIds);
      if(deleteError) throw deleteError;
    }
    return keepRows;
  }

  async function cleanupLoadedPracticeAttempts(classRows){
    const groups = new Map();
    (classRows || []).forEach(row=>{
      (row.classroom_quero_practice_attempts || []).forEach(attempt=>{
        const key = `${attempt.classroom_id || row.id}::${attempt.task_id}::${attempt.student_key || ''}`;
        if(!groups.has(key)) groups.set(key, { classroomId:attempt.classroom_id || row.id, taskId:attempt.task_id, studentKey:attempt.student_key || '', rows:[] });
        groups.get(key).rows.push(attempt);
      });
    });
    for(const group of groups.values()){
      if(group.rows.length <= 4) continue;
      try{
        const keepRows = await cleanupPracticeAttemptRows(group.classroomId, group.taskId, group.studentKey, group.rows);
        const keepIds = new Set(keepRows.map(row=>row.id));
        (classRows || []).forEach(row=>{
          row.classroom_quero_practice_attempts = (row.classroom_quero_practice_attempts || []).filter(attempt=>{
            const sameGroup = (attempt.classroom_id || row.id) === group.classroomId && attempt.task_id === group.taskId && (attempt.student_key || '') === group.studentKey;
            return !sameGroup || keepIds.has(attempt.id);
          });
        });
      }catch(err){
        console.warn('Could not clean up loaded practice attempts', err);
      }
    }
  }

  async function loadClassrooms(){
    if(!supabaseReady()) return null;
    await deleteExpiredArchivedClassrooms();
    let { data, error } = await supabaseClient
      .from('classrooms')
      .select(CLASSROOM_SELECT_WITH_TODOS)
      .eq('archived', false)
      .order('created_at', { ascending:false })
      .order('created_at', { referencedTable:'classroom_announcements', ascending:false })
      .order('created_at', { referencedTable:'classroom_announcements.classroom_announcement_comments', ascending:true })
      .order('week_start', { referencedTable:'classroom_tracker_tasks', ascending:true })
      .order('created_at', { referencedTable:'classroom_tracker_tasks', ascending:true });
    if(error && /classroom_todo_dismissals|relationship/i.test(`${error.message || ''} ${error.details || ''}`)){
      ({ data, error } = await supabaseClient
        .from('classrooms')
        .select(CLASSROOM_SELECT_BASE)
        .eq('archived', false)
        .order('created_at', { ascending:false })
        .order('created_at', { referencedTable:'classroom_announcements', ascending:false })
        .order('created_at', { referencedTable:'classroom_announcements.classroom_announcement_comments', ascending:true })
        .order('week_start', { referencedTable:'classroom_tracker_tasks', ascending:true })
        .order('created_at', { referencedTable:'classroom_tracker_tasks', ascending:true }));
    }
    if(error) throw error;
    await cleanupLoadedPracticeAttempts(data || []);
    return hydrateSchoolMemberships((data || []).map(classFromRow));
  }

  async function loadArchivedClassrooms(){
    if(!supabaseReady()) return null;
    await deleteExpiredArchivedClassrooms();
    let { data, error } = await supabaseClient
      .from('classrooms')
      .select(CLASSROOM_SELECT_WITH_TODOS)
      .eq('archived', true)
      .order('archived_at', { ascending:false, nullsFirst:false })
      .order('updated_at', { ascending:false });
    if(error && /classroom_todo_dismissals|relationship/i.test(`${error.message || ''} ${error.details || ''}`)){
      ({ data, error } = await supabaseClient
        .from('classrooms')
        .select(CLASSROOM_SELECT_BASE)
        .eq('archived', true)
        .order('archived_at', { ascending:false, nullsFirst:false })
        .order('updated_at', { ascending:false }));
    }
    if(error && /archived_at/i.test(`${error.message || ''} ${error.details || ''}`)){
      ({ data, error } = await supabaseClient
        .from('classrooms')
        .select(CLASSROOM_SELECT_BASE)
        .eq('archived', true)
        .order('updated_at', { ascending:false }));
    }
    if(error) throw error;
    await cleanupLoadedPracticeAttempts(data || []);
    return hydrateSchoolMemberships((data || []).map(classFromRow));
  }

  async function deleteExpiredArchivedClassrooms(){
    if(!hasClient()) return false;
    const { error } = await supabaseClient.rpc('delete_expired_archived_classrooms');
    if(error && !/delete_expired_archived_classrooms/i.test(`${error.message || ''} ${error.details || ''}`)){
      console.warn('Could not clean expired archived classrooms:', error);
    }
    return !error;
  }

  async function saveClassroom(cls){
    if(!supabaseReady()) return null;
    if(cls.id || cls.supabaseId){
      const id = cls.id || cls.supabaseId;
      const row = classRow(cls, cls.classCode || cls.code);
      delete row.class_code;
      const { data, error } = await supabaseClient.from('classrooms').update(row).eq('id', id).select(CLASSROOM_SELECT_BASE).single();
      if(error) throw error;
      return classFromRow(data);
    }
    const schoolId = await schoolIdForNewClassroom();
    for(let attempt=0; attempt<8; attempt++){
      const code = await generateClassroomCode();
      const authUserId = await currentAuthUserId();
      const row = { ...classRow(cls, code), school_id: schoolId, created_at: nowIso() };
      row.teacher_id = authUserId || row.teacher_id || null;
      try{
        const { data: createdId, error: rpcError } = await supabaseClient.rpc('create_classroom_for_current_user', {
          input_school_id: row.school_id || null,
          input_name: row.name,
          input_subject: row.subject,
          input_year_level: row.year_level,
          input_banner: row.banner,
          input_color: row.color,
          input_class_code: row.class_code
        });
        if(!rpcError && createdId){
          const loaded = await loadClassrooms();
          return (loaded || []).find(item => item.id === createdId) || null;
        }
        if(rpcError && !/create_classroom_for_current_user/i.test(`${rpcError.message || ''} ${rpcError.details || ''}`)) throw rpcError;
      }catch(err){
        if(!/create_classroom_for_current_user/i.test(`${err?.message || ''} ${err?.details || ''}`)) throw err;
      }
      const { data, error } = await supabaseClient.from('classrooms').insert(row).select(CLASSROOM_SELECT_BASE).single();
      if(error && error.code === '23505') continue;
      if(error) throw error;
      await supabaseClient.from('classroom_members').insert({
        classroom_id: data.id,
        user_id: authUserId || currentUserId() || null,
        display_name: currentDisplayName(),
        email: currentUserEmail(),
        role: 'teacher',
        status: 'Active'
      });
      const loaded = await loadClassrooms();
      return (loaded || []).find(item => item.id === data.id) || classFromRow(data);
    }
    throw new Error('Could not generate a unique classroom code. Please try again.');
  }

  async function deleteClassroom(cls){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return false;
    const id = cls.id || cls.supabaseId;
    const { error } = await supabaseClient.from('classrooms').delete().eq('id', id);
    if(error) throw error;
    return true;
  }

  async function archiveClassroom(cls){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return false;
    const id = cls.id || cls.supabaseId;
    const archiveTime = nowIso();
    let { error } = await supabaseClient.from('classrooms').update({ archived:true, archived_at:archiveTime, updated_at:archiveTime }).eq('id', id);
    if(error && /archived_at/i.test(`${error.message || ''} ${error.details || ''}`)){
      ({ error } = await supabaseClient.from('classrooms').update({ archived:true, updated_at:archiveTime }).eq('id', id));
    }
    if(error) throw error;
    return true;
  }

  async function restoreClassroom(cls){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return false;
    const id = cls.id || cls.supabaseId;
    let { error } = await supabaseClient.from('classrooms').update({ archived:false, archived_at:null, updated_at:nowIso() }).eq('id', id);
    if(error && /archived_at/i.test(`${error.message || ''} ${error.details || ''}`)){
      ({ error } = await supabaseClient.from('classrooms').update({ archived:false, updated_at:nowIso() }).eq('id', id));
    }
    if(error) throw error;
    return true;
  }

  async function saveTrackerSettings(cls, settings){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return false;
    const id = cls.id || cls.supabaseId;
    const { error } = await supabaseClient
      .from('classrooms')
      .update({ tracker_settings:settings || {}, updated_at:nowIso() })
      .eq('id', id);
    if(error) throw error;
    return true;
  }

  async function saveVassData(cls, vassData){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return false;
    const id = cls.id || cls.supabaseId;
    const { error } = await supabaseClient
      .from('classrooms')
      .update({ vass_data:vassData || {}, updated_at:nowIso() })
      .eq('id', id);
    if(error) throw error;
    return true;
  }

  async function joinClassByCode(code){
    if(!hasClient()) throw new Error('Sign in to join a classroom.');
    const { data, error } = await supabaseClient.rpc('join_classroom_by_code', {
      input_class_code: String(code || '').trim().toUpperCase(),
      input_display_name: currentDisplayName()
    });
    if(error) throw error;
    if(!data || (Array.isArray(data) && !data.length)) throw new Error('Could not join classroom. Please try again.');
    await loadClassrooms();
    return data?.[0] || data || null;
  }

  async function createAnnouncement(cls, text, files=[]){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return null;
    const id = crypto?.randomUUID?.() || `announcement-${Date.now()}`;
    const selectedFiles = Array.from(files || []).filter(Boolean);
    const attachments = [];
    try{
      for(let index=0;index<selectedFiles.length;index++){
        const file = selectedFiles[index];
        const fileInfo = await uploadClassroomResourceFile(cls, file, `announcement-${id}-${index + 1}`);
        attachments.push({
          fileName:file.name || 'Attachment',
          fileType:file.type || '',
          fileSize:Number(file.size) || 0,
          filePath:fileInfo.path,
          fileUrl:fileInfo.url
        });
      }
    }catch(error){
      const paths = attachments.map(item=>item.filePath).filter(Boolean);
      if(paths.length) await supabaseClient.storage.from('classroom-resources').remove(paths);
      throw error;
    }
    const { data, error } = await supabaseClient.from('classroom_announcements').insert({
      id,
      classroom_id: cls.id || cls.supabaseId,
      author_id: currentUserId() || null,
      author_name: currentDisplayName(),
      author_email: currentUserEmail(),
      body: String(text || '').trim(),
      attachments
    }).select('*, classroom_announcement_comments(*)').single();
    if(error){
      const paths = attachments.map(item=>item.filePath).filter(Boolean);
      if(paths.length) await supabaseClient.storage.from('classroom-resources').remove(paths);
      throw error;
    }
    return announcementFromRow(data);
  }

  async function updateAnnouncement(announcementId, text){
    if(!hasClient()) return null;
    const { data, error } = await supabaseClient.from('classroom_announcements').update({
      body: String(text || '').trim(),
      updated_at: nowIso()
    }).eq('id', announcementId).select('*, classroom_announcement_comments(*)').single();
    if(error) throw error;
    return announcementFromRow(data);
  }

  async function deleteAnnouncement(announcementId){
    if(!hasClient()) return false;
    const { data:announcement } = await supabaseClient
      .from('classroom_announcements')
      .select('attachments,attachment_path')
      .eq('id', announcementId)
      .maybeSingle();
    const { error } = await supabaseClient.from('classroom_announcements').delete().eq('id', announcementId);
    if(error) throw error;
    const paths = [
      ...(Array.isArray(announcement?.attachments) ? announcement.attachments.map(item=>item?.filePath || item?.file_path) : []),
      announcement?.attachment_path || ''
    ].filter(Boolean);
    if(paths.length){
      const { error:storageError } = await supabaseClient.storage.from('classroom-resources').remove([...new Set(paths)]);
      if(storageError) console.warn('Could not delete announcement attachment:', storageError);
    }
    return true;
  }

  async function uploadClassroomResourceFile(cls,file,resourceId){
    if(!hasClient() || !(cls?.id || cls?.supabaseId) || !file) return null;
    const classroomId = cls.id || cls.supabaseId;
    const cleanName = String(file.name || 'resource').replace(/[^\w.\-]+/g, '_');
    const path = `${classroomId}/${resourceId || crypto?.randomUUID?.() || Date.now()}-${cleanName}`;
    const { error } = await supabaseClient.storage
      .from('classroom-resources')
      .upload(path, file, { upsert:true, contentType:file.type || undefined });
    if(error) throw error;
    const { data } = supabaseClient.storage.from('classroom-resources').getPublicUrl(path);
    return { path, url:data?.publicUrl || '' };
  }

  function classroomResourceCanGeneratePreview(resource){
    const name = String(resource?.fileName || '').toLowerCase();
    const type = String(resource?.fileType || '').toLowerCase();
    return type.includes('word') || type.includes('presentation') || /\.(docx?|pptx?)$/i.test(name);
  }

  async function requestClassroomResourcePreview(resource){
    if(!hasClient() || !resource?.id || !classroomResourceCanGeneratePreview(resource)) return resource;
    const { data, error } = await supabaseClient.functions.invoke('convert-classroom-resource-preview', {
      body: { resourceId: resource.id }
    });
    if(error) throw error;
    return data?.resource ? resourceFromRow(data.resource) : resource;
  }

  async function getClassroomResourceDownloadUrl(resource){
    if(!hasClient()) return resource?.fileUrl || '';
    if(!resource?.filePath) return resource?.fileUrl || '';
    const { data, error } = await supabaseClient.storage
      .from('classroom-resources')
      .createSignedUrl(resource.filePath, 60 * 10, { download:resource.fileName || true });
    if(error) return resource.fileUrl || '';
    return data?.signedUrl || resource.fileUrl || '';
  }

  async function getClassroomResourceViewUrl(resource){
    if(!hasClient()) return resource?.previewFileUrl || resource?.fileUrl || '';
    const path = resource?.previewFilePath || resource?.filePath || '';
    if(!path) return resource?.previewFileUrl || resource?.fileUrl || '';
    const { data, error } = await supabaseClient.storage
      .from('classroom-resources')
      .createSignedUrl(path, 60 * 10);
    if(error) return resource.previewFileUrl || resource.fileUrl || '';
    return data?.signedUrl || resource.previewFileUrl || resource.fileUrl || '';
  }

  async function saveClassroomResource(cls,resource,file=null){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return null;
    const classroomId = cls.id || cls.supabaseId;
    const id = String(resource?.id || crypto?.randomUUID?.() || `resource-${Date.now()}`).trim();
    let fileInfo = { path:resource?.filePath || '', url:resource?.fileUrl || '' };
    if(file) fileInfo = await uploadClassroomResourceFile(cls,file,id);
    const isPdf = String(file?.type || resource?.fileType || '').toLowerCase().includes('pdf') || String(file?.name || resource?.fileName || '').toLowerCase().endsWith('.pdf');
    const previewFilePath = isPdf ? fileInfo.path : resource?.previewFilePath || '';
    const previewFileUrl = isPdf ? fileInfo.url : resource?.previewFileUrl || '';
    const row = {
      id,
      classroom_id: classroomId,
      title: String(resource?.title || file?.name || '').trim(),
      description: String(resource?.description || '').trim(),
      file_name: file?.name || resource?.fileName || '',
      file_type: file?.type || resource?.fileType || '',
      file_size: Number(file?.size || resource?.fileSize) || 0,
      file_path: fileInfo.path || '',
      file_url: fileInfo.url || '',
      preview_file_path: previewFilePath,
      preview_file_url: previewFileUrl,
      preview_status: isPdf ? 'ready' : resource?.previewStatus || 'pending',
      uploaded_by: currentUserId() || null,
      uploaded_by_name: currentDisplayName(),
      updated_at: nowIso()
    };
    const { data, error } = await supabaseClient
      .from('classroom_resources')
      .upsert(row, { onConflict:'id' })
      .select('*')
      .single();
    if(error) throw error;
    const saved = resourceFromRow(data);
    if(file && classroomResourceCanGeneratePreview(saved)){
      try{
        return await requestClassroomResourcePreview(saved);
      }catch(err){
        console.warn('Could not generate classroom resource preview:', err);
      }
    }
    return saved;
  }

  async function updateClassroomResourceMetadata(resource){
    if(!hasClient() || !resource?.id) return null;
    const row = {
      title: String(resource?.title || '').trim(),
      description: String(resource?.description || '').trim(),
      updated_at: nowIso()
    };
    const { data, error } = await supabaseClient
      .from('classroom_resources')
      .update(row)
      .eq('id', resource.id)
      .select('*')
      .single();
    if(error) throw error;
    return resourceFromRow(data);
  }

  async function deleteClassroomResource(resource){
    if(!hasClient() || !resource?.id) return false;
    const { error } = await supabaseClient.from('classroom_resources').delete().eq('id', resource.id);
    if(error) throw error;
    if(resource.filePath){
      const { error: storageError } = await supabaseClient.storage.from('classroom-resources').remove([resource.filePath]);
      if(storageError) console.warn('Could not delete resource file from storage:', storageError);
    }
    return true;
  }

  async function createComment(cls, announcementId, text){
    if(!hasClient() || !(cls?.id || cls?.supabaseId)) return null;
    const { data, error } = await supabaseClient.from('classroom_announcement_comments').insert({
      classroom_id: cls.id || cls.supabaseId,
      announcement_id: announcementId,
      author_id: currentUserId() || null,
      author_name: currentDisplayName(),
      author_email: currentUserEmail(),
      body: String(text || '').trim()
    }).select('*').single();
    if(error) throw error;
    return commentFromRow(data);
  }

  async function updateMember(memberId, changes){
    if(!hasClient() || !memberId) return null;
    const row = {};
    if(Object.prototype.hasOwnProperty.call(changes || {}, 'displayName')) row.display_name = String(changes.displayName || '').trim();
    if(Object.prototype.hasOwnProperty.call(changes || {}, 'name')) row.display_name = String(changes.name || '').trim();
    if(Object.prototype.hasOwnProperty.call(changes || {}, 'email')) row.email = String(changes.email || '').trim().toLowerCase();
    if(Object.prototype.hasOwnProperty.call(changes || {}, 'status')) row.status = changes.status === 'Inactive' ? 'Inactive' : 'Active';
    row.updated_at = nowIso();
    const { data, error } = await supabaseClient
      .from('classroom_members')
      .update(row)
      .eq('id', memberId)
      .select('*')
      .single();
    if(error) throw error;
    return memberFromRow(data);
  }

  async function updateSchoolMemberIdentity(classMemberId, changes){
    if(!hasClient() || !classMemberId) return null;
    const name = String(changes?.name || '').trim();
    const surname = String(changes?.surname || '').trim();
    let { data, error } = await supabaseClient.rpc('update_classroom_school_member_name', {
      input_classroom_member_id: classMemberId,
      input_name: name,
      input_surname: surname
    });
    if(error && /update_classroom_school_member_name/i.test(`${error.message || ''} ${error.details || ''}`)){
      const fullName = [name,surname].filter(Boolean).join(' ');
      const savedMember = await updateMember(classMemberId, { name:fullName });
      return { ...savedMember, givenName:name, surname, name:fullName || savedMember.name, displayName:fullName || savedMember.displayName };
    }
    if(error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    const parts = schoolMembershipName(row || {});
    return {
      schoolMemberId: row?.id || '',
      givenName: parts.given || name,
      surname: parts.surname || surname,
      name: parts.full || [name,surname].filter(Boolean).join(' '),
      displayName: parts.full || [name,surname].filter(Boolean).join(' ')
    };
  }

  async function deleteMember(memberId){
    if(!hasClient() || !memberId) return false;
    const { data, error } = await supabaseClient.from('classroom_members').delete().eq('id', memberId).select('id');
    if(error) throw error;
    return !!data?.length;
  }

  async function leaveClassroom(classroomId){
    if(!hasClient() || !classroomId) throw new Error('Could not identify the classroom to leave.');
    const { data, error } = await supabaseClient.rpc('leave_classroom_for_current_user', {
      input_classroom_id: classroomId
    });
    if(error) throw error;
    if(data !== true) throw new Error('Your classroom membership was not removed. Please refresh and try again.');
    return true;
  }

  function trackerTaskRow(cls,termKey,task){
    return {
      id: String(task.id || '').trim(),
      classroom_id: cls.id || cls.supabaseId,
      term_key: termKey || 'term1',
      task_type: task.type || 'score',
      title: String(task.title || '').trim(),
      due_date: task.dueDate || null,
      week_start: task.weekStart || task.dueDate || null,
      options: Array.isArray(task.options) ? task.options : [],
      topic: task.topic || '',
      subtopic: task.subtopic || '',
      skill: task.skill || '',
      question_count: Number(task.questionCount) || 10,
      attempts_allowed: Number(task.attempts) || 1,
      score_display: task.scoreDisplay || 'first',
      updated_at: nowIso()
    };
  }

  async function saveTrackerTask(cls,termKey,task){
    if(!hasClient() || !(cls?.id || cls?.supabaseId) || !task?.id) return null;
    const row = trackerTaskRow(cls,termKey,task);
    let { data, error } = await supabaseClient
      .from('classroom_tracker_tasks')
      .upsert(row, { onConflict:'id' })
      .select('*')
      .single();
    if(error && /score_display/i.test(`${error.message || ''} ${error.details || ''}`)){
      delete row.score_display;
      ({ data, error } = await supabaseClient
        .from('classroom_tracker_tasks')
        .upsert(row, { onConflict:'id' })
        .select('*')
        .single());
    }
    if(error) throw error;
    const mapped = trackerTaskFromRow(data);
    if(data && !Object.prototype.hasOwnProperty.call(data,'score_display')) mapped.scoreDisplay = task.scoreDisplay || 'first';
    return mapped;
  }

  async function deleteTrackerTask(taskId){
    if(!hasClient() || !taskId) return false;
    const { error } = await supabaseClient.from('classroom_tracker_tasks').delete().eq('id', taskId);
    if(error) throw error;
    return true;
  }

  async function saveTrackerResult(cls,taskId,studentKey,value){
    if(!hasClient() || !(cls?.id || cls?.supabaseId) || !taskId || !studentKey) return null;
    const { data, error } = await supabaseClient
      .from('classroom_tracker_results')
      .upsert({
        classroom_id: cls.id || cls.supabaseId,
        task_id: taskId,
        student_key: studentKey,
        value: value == null ? '' : String(value),
        updated_at: nowIso()
      }, { onConflict:'task_id,student_key' })
      .select('*')
      .single();
    if(error) throw error;
    return trackerResultFromRow(data);
  }

  async function cleanupPracticeAttempts(cls,taskId,studentKey){
    if(!hasClient() || !(cls?.id || cls?.supabaseId) || !taskId || !studentKey) return false;
    await cleanupPracticeAttemptRows(cls.id || cls.supabaseId, taskId, studentKey);
    return true;
  }

  async function savePracticeAttempt(cls,taskId,studentKey,attempt){
    if(!hasClient() || !(cls?.id || cls?.supabaseId) || !taskId || !studentKey) return null;
    const classroomId = cls.id || cls.supabaseId;
    if(attempt?.recordType === 'best'){
      const { error: deleteError } = await supabaseClient
        .from('classroom_quero_practice_attempts')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('task_id', taskId)
        .eq('student_key', studentKey)
        .filter('attempt_data->>recordType', 'eq', 'best');
      if(deleteError) throw deleteError;
    }
    const { data, error } = await supabaseClient
      .from('classroom_quero_practice_attempts')
      .insert({
        classroom_id: classroomId,
        task_id: taskId,
        student_key: studentKey,
        student_name: attempt?.studentName || currentDisplayName(),
        term_key: attempt?.termKey || 'term1',
        score_percent: Number(attempt?.scorePercent) || 0,
        correct_count: Number(attempt?.correctCount) || 0,
        total_count: Number(attempt?.totalCount) || 0,
        attempt_data: attempt || {}
      })
      .select('*')
      .single();
    if(error) throw error;
    await cleanupPracticeAttempts(cls,taskId,studentKey);
    return data;
  }

  async function saveTodoDismissal(cls,taskId,studentKey,termKey='term1',reason='done'){
    if(!hasClient() || !(cls?.id || cls?.supabaseId) || !taskId || !studentKey) return null;
    const { data, error } = await supabaseClient
      .from('classroom_todo_dismissals')
      .upsert({
        classroom_id: cls.id || cls.supabaseId,
        task_id: taskId,
        student_key: studentKey,
        term_key: termKey || 'term1',
        reason: reason || 'done',
        updated_at: nowIso()
      }, { onConflict:'task_id,student_key' })
      .select('*')
      .single();
    if(error) throw error;
    return todoDismissalFromRow(data);
  }

  window.QueroClassroomSupabase = {
    generateClassroomCode,
    loadClassrooms,
    loadArchivedClassrooms,
    saveClassroom,
    deleteClassroom,
    archiveClassroom,
    restoreClassroom,
    saveTrackerSettings,
    saveVassData,
    deleteExpiredArchivedClassrooms,
    joinClassByCode,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    saveClassroomResource,
    updateClassroomResourceMetadata,
    deleteClassroomResource,
    getClassroomResourceDownloadUrl,
    getClassroomResourceViewUrl,
    createComment,
    updateMember,
    updateSchoolMemberIdentity,
    deleteMember,
    leaveClassroom,
    saveTrackerTask,
    deleteTrackerTask,
    saveTrackerResult,
    cleanupPracticeAttempts,
    savePracticeAttempt,
    saveTodoDismissal
  };
})();
