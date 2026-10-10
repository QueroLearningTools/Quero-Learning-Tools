(function(){
  const HOME_PROFILE_COLORS = [
    {name:'Pink', value:'#d81b60'},
    {name:'Slate', value:'#31454f'},
    {name:'Teal', value:'#0b7ea4'},
    {name:'Green', value:'#2e7d32'},
    {name:'Purple', value:'#6f42c1'},
    {name:'Orange', value:'#f4511e'},
    {name:'Gold', value:'#d99a12'},
    {name:'Aqua', value:'#00897b'},
    {name:'Indigo', value:'#3f51b5'},
    {name:'Rose', value:'#c2185b'},
    {name:'Transparent', value:'transparent'}
  ];
  const HOME_CLASS_BANNERS = [
    {name:'English', icon:'ti-message-star'},
    {name:'Mathematics', icon:'ti-math-function'},
    {name:'Biology', icon:'ti-virus'},
    {name:'Chemistry', icon:'ti-flask'},
    {name:'Physics', icon:'ti-atom'},
    {name:'Psychology', icon:'ti-brain'},
    {name:'Science', icon:'ti-microscope'},
    {name:'History', icon:'ti-building-monument'},
    {name:'Geography', icon:'ti-map-2'},
    {name:'Civics and Economics', icon:'ti-scale'},
    {name:'Arts', icon:'ti-palette'},
    {name:'Physical Education', icon:'ti-run'},
    {name:'Technologies', icon:'ti-robot'}
  ];
  const HOME_CLASS_COLORS = HOME_PROFILE_COLORS.filter(color=>color.value !== 'transparent');
  const HOME_PROFILE_IMAGES = [
    {name:'Wombat', file:'wombat.png'},
    {name:'Platypus', file:'platypus.png'},
    {name:'Koala', file:'koala.png'},
    {name:'Kangaroo', file:'kangaroo.png'},
    {name:'Corgi', file:'corgi.png'},
    {name:'Cat', file:'Cat.png'},
    {name:'Australian Shepherd', file:'Australian Shepperd.png'}
  ];
  let homeProfileOpen = false;
  let homeColorOpen = false;
  let homeNameEditing = false;
  let homeProfileDraft = null;
  let homeProfileMode = 'initials';
  let homeProfileImageFile = null;
  let homeProfilePreviewUrl = '';
  let homeProfileSaving = false;
  let homeClassSettingsOpen = null;
  let homeOpenClassIndex = null;
  let homeClassTab = 'home';
  let homeClassroomScrollTop = 0;
  let homeClassroomsLoadedForKey = '';
  let homeClassroomsLoadingForKey = '';
  let homeClassroomsLoadAttemptedForKey = '';
  let homeArchivedClassroomsLoadedForKey = '';
  let homeArchivedClassroomsLoadingForKey = '';
  let homeTodoRealtimeKey = '';
  let homeTodoRealtimeChannels = [];
  let homeTodoRealtimeRefreshTimer = null;

  function homeEsc(value){
    const text = value == null ? '' : String(value);
    if(typeof esc === 'function') return esc(text);
    return text.replace(/[&<>"']/g, ch=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function homeJsString(value){
    return String(value == null ? '' : value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }

  function homeToast(message, isError){
    if(typeof showToast === 'function') showToast(message, isError);
    else if(isError) alert(message);
    else console.log(message);
  }

  function readHomeCachedProfile(){
    try { return JSON.parse(localStorage.getItem('queroProfileCache') || '{}') || {}; }
    catch { return {}; }
  }

  function cacheHomeProfile(profile){
    localStorage.setItem('queroProfileCache', JSON.stringify({
      username: profile.username || '',
      displayName: profile.displayName || profile.username || '',
      email: profile.email || '',
      avatarColor: profile.color || profile.avatar_color || '',
      avatarIcon: profile.icon ?? profile.avatar_icon ?? 'initials',
      avatarImagePath: profile.imagePath ?? profile.avatar_image_path ?? ''
    }));
  }

  function findHomeSchoolMember(user,email){
    if(typeof schoolAccounts === 'undefined' || !Array.isArray(schoolAccounts)) return null;
    const userId = user?.id || '';
    const emailKey = String(email || user?.email || '').trim().toLowerCase();
    return schoolAccounts.find(account => {
      const accountUserId = account.userId || account.user_id || '';
      const accountEmail = String(account.email || '').trim().toLowerCase();
      return (userId && accountUserId === userId) || (emailKey && accountEmail === emailKey);
    }) || null;
  }

  function getHomeProfile(){
    const user = typeof currentUser !== 'undefined' ? currentUser : null;
    const profile = typeof currentProfile !== 'undefined' ? currentProfile : null;
    const cached = readHomeCachedProfile();
    const email = user?.email || profile?.email || cached.email || localStorage.getItem('queroLastEmail') || '';
    const schoolMember = findHomeSchoolMember(user,email);
    const username = profile?.username || user?.user_metadata?.username || cached.username || localStorage.getItem('queroProfileUsername') || (email ? email.split('@')[0] : 'User');
    const displayName = schoolMember?.displayName || profile?.display_name || cached.displayName || username || (email ? email.split('@')[0] : 'User');
    const color = profile?.avatar_color || cached.avatarColor || localStorage.getItem('queroProfileColor') || HOME_PROFILE_COLORS[0].value;
    const icon = profile?.avatar_icon || cached.avatarIcon || 'initials';
    const imagePath = profile?.avatar_image_path ?? cached.avatarImagePath ?? '';
    let imageUrl = '';
    if(imagePath && typeof supabaseClient !== 'undefined' && supabaseClient?.storage){
      imageUrl = supabaseClient.storage.from('profile-avatars').getPublicUrl(imagePath).data?.publicUrl || '';
    }
    return { user, profile, schoolMember, username, displayName, email, color, icon, imagePath, imageUrl };
  }

  function homeInitial(profile){
    const base = profile.displayName || profile.username || profile.email || 'Q';
    return base.trim().charAt(0).toUpperCase() || 'Q';
  }

  function homeAvatarMarkup(profile){
    if(profile.imageUrl) return `<img src="${homeEsc(profile.imageUrl)}" alt="">`;
    const profileImage = HOME_PROFILE_IMAGES.find(image=>profile.icon === `profile:${image.file}`);
    if(profileImage) return `<img src="assets/profiles/${encodeURIComponent(profileImage.file)}" alt="">`;
    const icons={user:'ti-user',book:'ti-book',school:'ti-school'};
    return icons[profile.icon] ? `<i class="ti ${icons[profile.icon]}"></i>` : homeEsc(homeInitial(profile));
  }

  function homeIsStudentRole(){
    return (typeof isProtectedStudentRole === 'function' && isProtectedStudentRole()) || (typeof currentRole !== 'undefined' && (currentRole === 'student' || currentRole === 's_student'));
  }

  function homeClassroomHeading(){
    const profile = getHomeProfile();
    const name = profile.displayName || profile.username || 'Your';
    return homeIsStudentRole() ? `Hello ${name}, here's what to do next` : `${name}'s Classroom`;
  }

  function getHomeClasses(){
    try { return JSON.parse(localStorage.getItem('queroClasses') || '[]') || []; }
    catch { return []; }
  }

  function saveHomeClasses(classes){
    localStorage.setItem('queroClasses', JSON.stringify(classes || []));
  }

  function homeScrollSnapshots(){
    const targets = [
      { key: 'document', el: document.scrollingElement || document.documentElement || document.body },
      { key: 'documentElement', el: document.documentElement },
      { key: 'body', el: document.body },
      { key: '.view.active', el: document.querySelector('.view.active') },
      { key: '#view-home', el: document.getElementById('view-home') },
      { key: '.home-classroom-wrap', el: document.querySelector('.home-classroom-wrap') },
      { key: '.home-tracker-table-wrap', el: document.querySelector('.home-tracker-table-wrap') },
      { key: '.home-tracker-term-tabs', el: document.querySelector('.home-tracker-term-tabs') }
    ];
    return targets
      .filter(({ el }, index, list)=>el && list.findIndex(item=>item.el === el) === index)
      .map(({ key, el })=>({ key, left: el.scrollLeft || 0, top: el.scrollTop || 0 }));
  }

  function homeScrollableAncestors(node){
    const list = [];
    let el = node instanceof Element ? node : null;
    while(el){
      const style = getComputedStyle(el);
      const canScrollY = /(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`);
      if(canScrollY && el.scrollHeight > el.clientHeight) list.push(el);
      el = el.parentElement;
    }
    return list;
  }

  function homeClassroomScroller(fromNode){
    const candidates = [
      ...homeScrollableAncestors(fromNode),
      document.querySelector('.home-classroom-wrap'),
      document.getElementById('view-home'),
      document.querySelector('.view.active'),
      document.scrollingElement || document.documentElement || document.body
    ].filter(Boolean);
    return candidates.find(el=>el.scrollHeight > el.clientHeight) || candidates[0] || null;
  }

  function rememberHomeClassroomScroll(fromNode){
    const scroller = homeClassroomScroller(fromNode);
    homeClassroomScrollTop = scroller ? scroller.scrollTop || 0 : 0;
    return homeClassroomScrollTop;
  }

  function restoreHomeClassroomScroll(top = homeClassroomScrollTop){
    const restore = ()=>{
      const scroller = homeClassroomScroller(document.querySelector('.home-classroom-wrap'));
      if(scroller) scroller.scrollTop = top || 0;
    };
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 0);
    setTimeout(restore, 60);
  }

  function restoreHomeScrollSnapshots(snapshots){
    (snapshots || []).forEach(({ key, left, top })=>{
      let el = null;
      if(key === 'document') el = document.scrollingElement || document.documentElement || document.body;
      else if(key === 'documentElement') el = document.documentElement;
      else if(key === 'body') el = document.body;
      else el = document.querySelector(key);
      if(!el) return;
      el.scrollLeft = left;
      el.scrollTop = top;
    });
  }

  window.renderHomePagePreservingScroll = function renderHomePagePreservingScroll(){
    const windowPos = { x: window.scrollX || 0, y: window.scrollY || 0 };
    const active = document.activeElement;
    const snapshots = homeScrollSnapshots();
    renderHomePage();
    const restore = ()=>{
      restoreHomeScrollSnapshots(snapshots);
      window.scrollTo(windowPos.x, windowPos.y);
      if(active && typeof active.blur === 'function') active.blur();
    };
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore, 0);
    setTimeout(restore, 80);
    setTimeout(restore, 180);
  };

  function homeClassroomSync(){
    return window.QueroClassroomSupabase || null;
  }

  function homeClassroomUserKey(){
    const profile = getHomeProfile();
    return String(profile.user?.id || profile.email || profile.username || (typeof currentRole !== 'undefined' ? currentRole : '') || 'guest').trim().toLowerCase();
  }

  function homeClassroomMatchKey(cls,index){
    return String(cls?.id || cls?.supabaseId || cls?.classCode || cls?.code || `local-${index}`).trim().toLowerCase();
  }

  function homeClassActivityKey(cls){
    return `queroClassActivitySeen:${homeClassroomUserKey()}:${homeClassroomMatchKey(cls,0)}`;
  }

  function homeClassActivityItems(cls){
    return (Array.isArray(cls?.announcements) ? cls.announcements : []).flatMap(post=>[post,...(Array.isArray(post.comments) ? post.comments : [])]);
  }

  function homeClassActivityStart(cls){
    const profile = getHomeProfile();
    const member = (cls?.members || []).find(item=>item.role === 'student' && (
      (profile.user?.id && item.userId === profile.user.id) ||
      (profile.email && String(item.email || '').trim().toLowerCase() === String(profile.email).trim().toLowerCase())
    ));
    const date = member?.joinedAt || cls?.createdAt;
    return Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : new Date().toISOString();
  }

  function homeUnreadClassActivity(cls){
    const profile = getHomeProfile();
    if(!profile.user?.id) return 0;
    if(homeClassroomSupabaseId(cls) && homeClassroomsLoadedForKey !== homeClassroomUserKey()) return 0;
    const key = homeClassActivityKey(cls);
    let seen = localStorage.getItem(key);
    if(!seen){
      seen = homeClassActivityStart(cls);
      localStorage.setItem(key,seen);
    }
    const userId = String(profile.user?.id || '');
    const email = String(profile.email || '').trim().toLowerCase();
    const name = String(profile.displayName || '').trim().toLowerCase();
    const seenTime = Date.parse(seen) || 0;
    return homeClassActivityItems(cls).filter(item=>{
      const time = Date.parse(item.createdAt || item.created_at || '');
      if(!Number.isFinite(time) || time <= seenTime) return false;
      const authorId = String(item.userId || item.author_id || '');
      const authorEmail = String(item.email || item.author_email || '').trim().toLowerCase();
      if(userId && authorId === userId) return false;
      if(email && authorEmail === email) return false;
      return !(name && !authorId && !authorEmail && String(item.author || '').trim().toLowerCase() === name);
    }).length;
  }

  function markHomeClassActivityRead(cls){
    const latest = homeClassActivityItems(cls).reduce((max,item)=>Math.max(max,Date.parse(item.createdAt || item.created_at || '') || 0),Date.now());
    localStorage.setItem(homeClassActivityKey(cls),new Date(latest).toISOString());
  }

  function homeClassroomSupabaseId(cls){
    return String(cls?.id || cls?.supabaseId || '').trim();
  }

  function clearHomeTodoRealtime(){
    if(typeof supabaseClient !== 'undefined' && supabaseClient?.removeChannel){
      homeTodoRealtimeChannels.forEach(channel=>{
        try{ supabaseClient.removeChannel(channel); }catch(err){ console.warn('Could not remove classroom realtime channel:', err); }
      });
    }
    homeTodoRealtimeChannels = [];
    homeTodoRealtimeKey = '';
    if(homeTodoRealtimeRefreshTimer){
      clearTimeout(homeTodoRealtimeRefreshTimer);
      homeTodoRealtimeRefreshTimer = null;
    }
  }

  function queueHomeTodoRealtimeRefresh(){
    if(homeTodoRealtimeRefreshTimer) clearTimeout(homeTodoRealtimeRefreshTimer);
    homeTodoRealtimeRefreshTimer = setTimeout(async ()=>{
      homeTodoRealtimeRefreshTimer = null;
      if(typeof window.loadHomeClassroomsFromSupabase === 'function'){
        await window.loadHomeClassroomsFromSupabase({ preserveScroll:true });
      }
    }, 500);
  }

  function syncHomeTodoRealtime(classes){
    if(typeof supabaseClient === 'undefined' || !supabaseClient?.channel){
      clearHomeTodoRealtime();
      return;
    }
    const classroomIds = [...new Set((classes || []).map(homeClassroomSupabaseId).filter(Boolean))].sort();
    const key = `${homeClassroomUserKey()}::${classroomIds.join('|')}`;
    if(homeTodoRealtimeKey === key) return;
    clearHomeTodoRealtime();
    homeTodoRealtimeKey = key;
    classroomIds.forEach(classroomId=>{
      let channel = supabaseClient
        .channel(`classroom-activity-${classroomId}`)
        .on('postgres_changes', {
          event:'*', schema:'public', table:'classroom_announcements',
          filter:`classroom_id=eq.${classroomId}`
        }, queueHomeTodoRealtimeRefresh)
        .on('postgres_changes', {
          event:'*', schema:'public', table:'classroom_announcement_comments',
          filter:`classroom_id=eq.${classroomId}`
        }, queueHomeTodoRealtimeRefresh);
      if(homeIsStudentRole()) channel = channel.on('postgres_changes', {
          event:'*',
          schema:'public',
          table:'classroom_tracker_tasks',
          filter:`classroom_id=eq.${classroomId}`
        }, queueHomeTodoRealtimeRefresh);
      channel = channel.subscribe();
      homeTodoRealtimeChannels.push(channel);
    });
  }

  window.loadHomeClassroomsFromSupabase = async function loadHomeClassroomsFromSupabase(options={}){
    const sync = homeClassroomSync();
    if(!sync?.loadClassrooms) return false;
    const key = homeClassroomUserKey();
    try{
      const previousClasses = getHomeClasses();
      const previousOpenClass = Number.isInteger(homeOpenClassIndex) ? previousClasses[homeOpenClassIndex] : null;
      const previousOpenKey = previousOpenClass ? homeClassroomMatchKey(previousOpenClass,homeOpenClassIndex) : '';
      const classes = await sync.loadClassrooms();
      if(!Array.isArray(classes)) return false;
      saveHomeClasses(classes);
      syncHomeTodoRealtime(homeVisibleClasses(classes));
      homeClassroomsLoadedForKey = key;
      homeClassroomsLoadAttemptedForKey = key;
      if(homeClassroomsLoadingForKey === key) homeClassroomsLoadingForKey = '';
      if(previousOpenKey){
        const nextIndex = classes.findIndex((cls,index)=>homeClassroomMatchKey(cls,index) === previousOpenKey);
        homeOpenClassIndex = nextIndex >= 0 ? nextIndex : null;
        if(nextIndex >= 0 && homeClassTab === 'home') markHomeClassActivityRead(classes[nextIndex]);
      }else if(Number.isInteger(homeOpenClassIndex) && !classes[homeOpenClassIndex]){
        homeOpenClassIndex = null;
      }
      if(options.preserveScroll !== false && typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
      else if(typeof renderHomePage === 'function') renderHomePage();
      return true;
    }catch(err){
      console.warn('Could not load classrooms from Supabase:', err);
      homeClassroomsLoadAttemptedForKey = key;
      if(homeClassroomsLoadingForKey === key) homeClassroomsLoadingForKey = '';
      if(options.showError && typeof homeToast === 'function') homeToast(err?.message || 'Could not load classrooms from Supabase.', true);
      return false;
    }
  };

  window.ensureHomeClassroomsLoadedFromSupabase = async function ensureHomeClassroomsLoadedFromSupabase(force=false){
    const sync = homeClassroomSync();
    if(!sync?.loadClassrooms) return false;
    const key = homeClassroomUserKey();
    if(!force && (homeClassroomsLoadedForKey === key || homeClassroomsLoadingForKey === key)) return false;
    homeClassroomsLoadingForKey = key;
    const loaded = await window.loadHomeClassroomsFromSupabase();
    if(homeClassroomsLoadingForKey === key) homeClassroomsLoadingForKey = '';
    homeClassroomsLoadAttemptedForKey = key;
    if(!loaded && typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    return loaded;
  };

  window.loadArchivedHomeClassroomsFromSupabase = async function loadArchivedHomeClassroomsFromSupabase(){
    const sync = homeClassroomSync();
    if(!sync?.loadArchivedClassrooms) return false;
    const key = homeClassroomUserKey();
    if(homeArchivedClassroomsLoadedForKey === key || homeArchivedClassroomsLoadingForKey === key) return false;
    homeArchivedClassroomsLoadingForKey = key;
    try{
      const archived = await sync.loadArchivedClassrooms();
      if(!Array.isArray(archived)) return false;
      const activeClasses = getHomeClasses().filter(cls=>!cls?.archived);
      saveHomeClasses(activeClasses.concat(archived.map(cls=>({ ...cls, archived:true }))));
      homeArchivedClassroomsLoadedForKey = key;
      if(typeof renderClassroomArchivePage === 'function') renderClassroomArchivePage();
      return true;
    }catch(err){
      console.warn('Could not load archived classrooms from Supabase:', err);
      homeToast(err?.message || 'Could not load archived classrooms.', true);
      return false;
    }finally{
      if(homeArchivedClassroomsLoadingForKey === key) homeArchivedClassroomsLoadingForKey = '';
    }
  };

  function homeGenerateLocalClassCode(classes){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const existing = new Set((classes || []).map((cls,index)=>homeClassDisplayCode(cls,index).toUpperCase()));
    for(let attempt=0; attempt<40; attempt++){
      let code = '';
      for(let i=0;i<6;i++) code += chars[Math.floor(Math.random() * chars.length)];
      if(!existing.has(code)) return code;
    }
    return `CLASS${String(Date.now()).slice(-4)}`;
  }

  function homeClassDisplayCode(cls,index){
    const existing = cls?.classCode || cls?.code || cls?.class_code;
    if(existing) return String(existing).trim();
    const seed = `${cls?.name || 'CLASS'}-${cls?.yearLevel || ''}-${index + 1}`.toUpperCase();
    const letters = seed.replace(/[^A-Z0-9]/g,'').slice(0,4).padEnd(4,'X');
    return `${letters}${String(index + 1).padStart(2,'0')}`;
  }

  function resolveHomeClassColor(color){
    if(color === 'dark') return '#31454f';
    if(color === 'pink') return '#d81b60';
    const found = HOME_CLASS_COLORS.find(c => c.value === color || c.name.toLowerCase() === String(color || '').toLowerCase());
    return found?.value || color || HOME_CLASS_COLORS[0].value;
  }

  function resolveHomeClassBanner(value){
    const key = String(value || '').toLowerCase();
    return HOME_CLASS_BANNERS.find(banner=>String(banner.name).toLowerCase() === key)
      || HOME_CLASS_BANNERS.find(banner=>key.includes(String(banner.name).toLowerCase()) || String(banner.name).toLowerCase().includes(key))
      || HOME_CLASS_BANNERS[0];
  }

  function homeYearLevelOptions(){
    try{
      if(typeof curriculumYearLevelValues === 'function') return curriculumYearLevelValues().filter(Boolean);
      if(typeof curriculumYearLevels === 'function') return curriculumYearLevels().filter(Boolean);
      if(typeof yearLevelValues === 'function') return yearLevelValues().filter(Boolean);
    }catch(err){ console.warn('Could not load curriculum year levels', err); }
    return [];
  }

  function homeSubjectOptions(){
    try{
      if(typeof examSubjectValues === 'function') return examSubjectValues().filter(Boolean);
      if(typeof subjectValues === 'function') return subjectValues().filter(Boolean);
    }catch(err){ console.warn('Could not load curriculum subjects', err); }
    return [];
  }

  function homeOptionsHtml(values,selected='',emptyText='No options yet'){
    const clean = [...new Set((values || []).map(value=>String(value || '').trim()).filter(Boolean))];
    if(!clean.length) return `<option value="">${homeEsc(emptyText)}</option>`;
    return clean.map(value=>`<option value="${homeEsc(value)}" ${value === selected ? 'selected' : ''}>${homeEsc(value)}</option>`).join('');
  }

  function homeBannerOptions(selectedIndex=0){
    return HOME_CLASS_BANNERS.map((banner,index)=>`<option value="${index}" ${index === selectedIndex ? 'selected' : ''}>${homeEsc(banner.name)}</option>`).join('');
  }

  function homeHexToRgb(hex){
    const value = String(hex || '').replace('#','').trim();
    if(value.length !== 6) return {r:216,g:27,b:96};
    return { r:parseInt(value.slice(0,2),16), g:parseInt(value.slice(2,4),16), b:parseInt(value.slice(4,6),16) };
  }

  function homeRgbToHex(rgb){
    return `#${Math.max(0,Math.min(255,Math.round(rgb.r))).toString(16).padStart(2,'0')}${Math.max(0,Math.min(255,Math.round(rgb.g))).toString(16).padStart(2,'0')}${Math.max(0,Math.min(255,Math.round(rgb.b))).toString(16).padStart(2,'0')}`;
  }

  function homeMixColor(color,target,amount){
    const base = homeHexToRgb(resolveHomeClassColor(color));
    const to = homeHexToRgb(target);
    return homeRgbToHex({
      r:base.r + (to.r - base.r) * amount,
      g:base.g + (to.g - base.g) * amount,
      b:base.b + (to.b - base.b) * amount
    });
  }

  function renderHomeBannerPreview(banner=HOME_CLASS_BANNERS[0]){
    const icon = banner?.icon || 'ti-book-2';
    const name = banner?.name || 'Subject';
    return `<div class="home-banner-card-glow"></div>
      <div class="home-banner-card-shape"></div>
      <div class="home-banner-label">${homeEsc(name)}</div>
      <div class="home-banner-icon-ring"><i class="ti ${homeEsc(icon)}"></i></div>`;
  }

  function applyHomeClassBannerColor(color){
    const preview = document.getElementById('home-class-banner-preview');
    if(!preview) return;
    const base = resolveHomeClassColor(color);
    preview.style.setProperty('--home-banner-base', base);
    preview.style.setProperty('--home-banner-soft', homeMixColor(base,'#ffffff',0.32));
    preview.style.setProperty('--home-banner-deep', homeMixColor(base,'#000000',0.28));
    preview.style.background = base;
  }

  function renderHomeClassColorChoices(active=HOME_CLASS_COLORS[0].value){
    return `<div class="home-class-color-row">${HOME_CLASS_COLORS.map(c=>`
      <button type="button" class="home-class-color-choice ${c.value === active ? 'active' : ''}" data-color="${homeEsc(c.value)}" style="background:${homeEsc(c.value)}" title="${homeEsc(c.name)}" onclick="selectHomeClassColor('${homeEsc(c.value)}', event)"></button>
    `).join('')}<input id="home-class-color" type="hidden" value="${homeEsc(active)}"></div>`;
  }

  function homeClassJoinedStudents(cls){
    const raw = Array.isArray(cls?.students) ? cls.students : Array.isArray(cls?.members) ? cls.members : [];
    return raw.map((student,index)=>{
      if(typeof student === 'string') return {name:student,email:'',status:'Active',joinedAt:''};
      const name = student?.displayName || student?.display_name || student?.name || `${student?.firstName || student?.first || ''} ${student?.lastName || student?.last || ''}`.trim() || student?.email || `Student ${index + 1}`;
      return {name,email:student?.email || '',status:student?.status || 'Active',joinedAt:student?.joinedAt || student?.joined_at || student?.createdAt || student?.created_at || ''};
    });
  }

  function homeStudentIdentity(){
    const profile = getHomeProfile();
    const userId = profile.user?.id || profile.schoolMember?.userId || profile.schoolMember?.user_id || '';
    const email = String(profile.email || '').trim().toLowerCase();
    const name = profile.displayName || profile.username || email || 'Student';
    return { userId, email, name };
  }

  function homeIsCurrentStudentInClass(cls){
    if(!homeIsStudentRole()) return true;
    const student = homeStudentIdentity();
    const students = Array.isArray(cls?.students) ? cls.students : Array.isArray(cls?.members) ? cls.members : [];
    return students.some(member => {
      if(typeof member === 'string') return member.trim().toLowerCase() === student.name.trim().toLowerCase();
      const memberUserId = member?.userId || member?.user_id || '';
      const memberEmail = String(member?.email || '').trim().toLowerCase();
      const memberName = String(member?.displayName || member?.display_name || member?.name || '').trim().toLowerCase();
      return (student.userId && memberUserId === student.userId) || (student.email && memberEmail === student.email) || (!!memberName && memberName === student.name.trim().toLowerCase());
    });
  }

  function homeCanSeeClass(cls){
    if(homeIsStudentRole()) return homeIsCurrentStudentInClass(cls);
    const creatorId = String(cls?.teacherId || cls?.teacher_id || '');
    const profile = getHomeProfile();
    if(creatorId) return creatorId === String(profile.user?.id || '');
    const creatorEmail = String(cls?.creatorEmail || '').trim().toLowerCase();
    return !creatorEmail || creatorEmail === String(profile.email || '').trim().toLowerCase();
  }

  function homeVisibleClasses(classes){
    const active = (classes || []).map((cls,index)=>({ ...cls, __homeClassIndex:index })).filter(cls=>!cls?.archived);
    return active.filter(homeCanSeeClass);
  }

  window.renderGlobalTopbar = function renderGlobalTopbar(){
    const host = document.getElementById('global-topbar');
    if(!host) return;
    const profile = getHomeProfile();
    cacheHomeProfile(profile);
    const protectedTeacher = typeof isProtectedTeacherRole === 'function' && isProtectedTeacherRole();
    const protectedStudent = homeIsStudentRole();
    const limitedActionRole = protectedTeacher || protectedStudent;
    const liveQuizLabel = protectedStudent ? 'Join Quiz' : 'Live Quiz';
    const classroomAction = protectedStudent
      ? `<button type="button" class="home-action-btn" onclick="openJoinClassModal()"><i class="ti ti-login-2"></i><span>Join Class</span></button>`
      : `<button type="button" class="home-action-btn" onclick="openAddClassModal()"><i class="ti ti-users-plus"></i><span>Add Class</span></button>`;
    host.innerHTML = `
      <div class="home-topbar">
        <button type="button" class="home-menu-btn" onclick="toggleHomeSidebar()" title="Tools"><i class="ti ti-menu-2"></i></button>
        <button type="button" class="home-brand" onclick="showView('home')" title="Home">
          <img src="assets/images/app-logo.png" alt="Quero Learning Tools">
          <span class="home-brand-title">Quero Learning Tools</span>
        </button>
        <div class="home-actions">
          ${limitedActionRole?'':`<button type="button" class="home-action-btn" onclick="homeUpgrade()"><i class="ti ti-circle-arrow-up"></i><span>Upgrade</span></button>`}
          <button type="button" class="home-action-btn" onclick="openStudyMode()"><i class="ti ti-tools"></i><span>Study Mode</span></button>
          ${limitedActionRole?'':`<button type="button" class="home-action-btn" onclick="homeComingSoon('Live Lesson')"><i class="ti ti-device-desktop-analytics"></i><span>Live Lesson</span></button>`}
          <button type="button" class="home-action-btn" onclick="openLiveQuiz()"><i class="ti ti-player-play"></i><span>${liveQuizLabel}</span></button>
          ${classroomAction}
          <div class="home-profile-wrap">
            <button type="button" class="home-profile-btn ${profile.color === 'transparent' ? 'is-transparent' : ''}" style="background:${homeEsc(profile.color)}" onclick="toggleHomeProfile()" aria-label="Open profile">${homeAvatarMarkup(profile)}</button>
            ${homeProfileOpen ? renderHomeProfileMenu(profile) : ''}
          </div>
        </div>
      </div>`;
  };

  function renderHomeProfileMenu(profile){
    const protectedTeacher = typeof isProtectedTeacherRole === 'function' && isProtectedTeacherRole();
    const protectedStudent = homeIsStudentRole();
    const limitedActionRole = protectedTeacher || protectedStudent;
    return `
      <button type="button" class="home-profile-scrim" onclick="toggleHomeProfile(false)" aria-label="Close profile menu"></button>
      <div class="home-profile-menu">
        <div class="home-profile-head">
          <div class="home-profile-avatar-wrap">
            <button type="button" class="home-profile-avatar ${profile.color === 'transparent' ? 'is-transparent' : ''}" style="background:${homeEsc(profile.color)}" onclick="openHomeProfileForm(event)" title="Edit profile" aria-label="Edit profile">${homeAvatarMarkup(profile)}</button>
          </div>
          <div class="home-profile-details">
            <div class="home-profile-username">${homeEsc(profile.displayName)}</div>
            <div class="home-profile-email">${homeEsc(profile.email)}</div>
          </div>
        </div>
        <div class="home-profile-divider"></div>
        ${limitedActionRole?'':`<button type="button" class="home-profile-row" onclick="homeUpgrade()"><i class="ti ti-circle-arrow-up"></i><span>Upgrade</span><span></span></button>`}
        <button type="button" class="home-profile-row" onclick="homeComingSoon('Add Account')"><i class="ti ti-user-plus"></i><span>Add Account</span><i class="ti ti-chevron-right home-profile-row-end"></i></button>
        <button type="button" class="home-profile-row" onclick="homeSignOut()"><i class="ti ti-logout"></i><span>Sign out</span><span></span></button>
      </div>`;
  }

  function renderHomeColorPicker(active){
    return `<div class="home-profile-colors">${HOME_PROFILE_COLORS.map(c=>`
      <button type="button" class="${c.value === active ? 'active' : ''} ${c.value === 'transparent' ? 'is-transparent' : ''}" style="background:${homeEsc(c.value)}" title="${homeEsc(c.name)}" onclick="setHomeProfileColor('${homeEsc(c.value)}', event)"></button>
    `).join('')}</div>`;
  }

  function renderHomeProfilePicturePanel(){
    if(homeProfileMode === 'profiles') return `<div class="home-profile-form-gallery" aria-label="Choose a profile picture">${HOME_PROFILE_IMAGES.map(image=>`<button type="button" class="${homeProfileDraft.icon === `profile:${image.file}` ? 'selected' : ''}" onclick="selectHomeProfileImage('${homeJsString(image.file)}')" title="${homeEsc(image.name)}" aria-label="${homeEsc(image.name)}"><img src="assets/profiles/${encodeURIComponent(image.file)}" alt=""></button>`).join('')}</div>`;
    if(homeProfileMode === 'upload') return `<div class="home-profile-form-upload-area"><button type="button" class="home-profile-form-upload" onclick="document.getElementById('home-profile-form-file').click()"><i class="ti ti-upload"></i> Choose image</button><span>${homeEsc(homeProfileImageFile?.name || (homeProfileDraft.imageUrl ? 'Current image' : 'No image chosen'))}</span><button type="button" class="home-profile-form-remove ${homeProfileDraft.imageUrl ? '' : 'hidden'}" onclick="removeHomeProfileImage()">Remove image</button><input id="home-profile-form-file" type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="previewHomeProfileImage(this)"></div>`;
    return `<div class="home-profile-form-colors"><span>Colour</span>${HOME_PROFILE_COLORS.map(c=>`<button type="button" class="${c.value === homeProfileDraft.color ? 'selected' : ''} ${c.value === 'transparent' ? 'is-transparent' : ''}" style="background:${homeEsc(c.value)}" data-color="${homeEsc(c.value)}" title="${homeEsc(c.name)}" aria-label="${homeEsc(c.name)}" onclick="selectHomeProfileColor(this)"></button>`).join('')}</div>`;
  }

  function renderHomeProfileForm(){
    const profile = homeProfileDraft;
    return `<button type="button" class="home-modal-scrim" onclick="closeHomeProfileForm()" aria-label="Close profile form"></button>
      <section class="home-modal home-profile-form-modal" role="dialog" aria-modal="true" aria-labelledby="home-profile-form-title">
        <div class="home-profile-form-heading"><h2 id="home-profile-form-title">Profile</h2><button type="button" class="home-profile-form-close" onclick="closeHomeProfileForm()" title="Close" aria-label="Close"><i class="ti ti-x"></i></button></div>
        <div class="home-profile-form-identity">
          <div id="home-profile-form-avatar" class="home-profile-form-avatar ${profile.color === 'transparent' ? 'is-transparent' : ''}" style="background:${homeEsc(profile.color)}">${homeAvatarMarkup(profile)}</div>
          <div class="home-profile-form-identity-text"><strong>${homeEsc(profile.displayName)}</strong><span>${homeEsc(profile.email)}</span></div>
        </div>
        <div class="home-profile-form-picture-label">Profile picture</div>
        <div class="home-profile-form-modes" role="group" aria-label="Profile picture source">${[['initials','Initials'],['profiles','Profiles'],['upload','Upload image']].map(([mode,label])=>`<button type="button" data-mode="${mode}" class="${homeProfileMode === mode ? 'selected' : ''}" aria-pressed="${homeProfileMode === mode}" onclick="selectHomeProfileMode('${mode}')">${label}</button>`).join('')}</div>
        <div id="home-profile-form-picture-panel">${renderHomeProfilePicturePanel()}</div>
        <div class="home-profile-form-fields"><label>Display name<input id="home-profile-form-name" type="text" maxlength="80" value="${homeEsc(profile.displayName)}" oninput="updateHomeProfileDraftName(this.value)"></label><label>Email<input type="email" value="${homeEsc(profile.email)}" readonly></label></div>
        <section class="home-profile-form-stats"><h3>Classroom statistics</h3><div class="home-profile-form-stats-space" aria-hidden="true"></div></section>
        <div class="home-modal-actions home-profile-form-actions"><button type="button" onclick="closeHomeProfileForm()">Cancel</button><button type="button" class="primary" id="home-profile-form-save" onclick="saveHomeProfileForm()"><i class="ti ti-device-floppy"></i> Save</button></div>
      </section>`;
  }

  function refreshHomeProfileFormAvatar(){
    const avatar = document.getElementById('home-profile-form-avatar');
    if(!avatar || !homeProfileDraft) return;
    avatar.style.background = homeProfileDraft.color;
    avatar.classList.toggle('is-transparent',homeProfileDraft.color === 'transparent');
    avatar.innerHTML = homeAvatarMarkup(homeProfileDraft);
    const name = document.querySelector('.home-profile-form-identity-text strong');
    if(name) name.textContent = homeProfileDraft.displayName;
  }

  function refreshHomeProfilePicturePanel(){
    document.querySelectorAll('.home-profile-form-modes button').forEach(button=>{
      const selected = button.dataset.mode === homeProfileMode;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const panel = document.getElementById('home-profile-form-picture-panel');
    if(panel) panel.innerHTML = renderHomeProfilePicturePanel();
    refreshHomeProfileFormAvatar();
  }

  function renderHomeDisplayNameEditor(profile){
    return `<div class="home-profile-name-edit-row">
      <input id="home-profile-display-name-input" type="text" value="${homeEsc(profile.displayName)}" onkeydown="handleHomeDisplayNameKey(event)" onclick="event.stopPropagation()">
      <button type="button" class="home-profile-name-save" onclick="saveHomeDisplayName(event)" title="Save display name"><i class="ti ti-check"></i></button>
      <button type="button" class="home-profile-name-cancel" onclick="cancelHomeDisplayNameEdit(event)" title="Cancel"><i class="ti ti-x"></i></button>
    </div>`;
  }

  window.toggleHomeSidebar = function toggleHomeSidebar(){
    const app = document.getElementById('app');
    if(app) app.classList.toggle('tools-expanded');
  };

  window.toggleHomeProfile = function toggleHomeProfile(force){
    homeProfileOpen = typeof force === 'boolean' ? force : !homeProfileOpen;
    if(!homeProfileOpen){ homeColorOpen = false; homeNameEditing = false; }
    renderGlobalTopbar();
  };

  window.openHomeProfileForm = function openHomeProfileForm(event){
    if(event) event.stopPropagation();
    if(homeProfileSaving) return;
    const profile = getHomeProfile();
    window.closeHomeProfileForm();
    homeProfileOpen = false;
    renderGlobalTopbar();
    homeProfileDraft = {...profile};
    homeProfileMode = profile.imageUrl ? 'upload' : HOME_PROFILE_IMAGES.some(image=>profile.icon === `profile:${image.file}`) ? 'profiles' : 'initials';
    if(homeProfileMode === 'initials') homeProfileDraft.icon = 'initials';
    const root = document.createElement('div');
    root.id = 'home-profile-form-root';
    root.innerHTML = renderHomeProfileForm();
    root.addEventListener('keydown',keyEvent=>{
      if(keyEvent.key === 'Escape'){keyEvent.preventDefault();window.closeHomeProfileForm();}
    });
    document.body.appendChild(root);
    document.getElementById('home-profile-form-name')?.focus();
  };

  window.closeHomeProfileForm = function closeHomeProfileForm(){
    if(homeProfileSaving) return;
    document.getElementById('home-profile-form-root')?.remove();
    if(homeProfilePreviewUrl) URL.revokeObjectURL(homeProfilePreviewUrl);
    homeProfilePreviewUrl = '';
    homeProfileImageFile = null;
    homeProfileDraft = null;
    homeProfileMode = 'initials';
  };

  window.updateHomeProfileDraftName = function updateHomeProfileDraftName(name){
    if(homeProfileDraft){homeProfileDraft.displayName = name;refreshHomeProfileFormAvatar();}
  };

  function clearHomeProfileImage(){
    if(homeProfilePreviewUrl) URL.revokeObjectURL(homeProfilePreviewUrl);
    homeProfilePreviewUrl = '';
    homeProfileImageFile = null;
    homeProfileDraft.imagePath = '';
    homeProfileDraft.imageUrl = '';
  }

  window.selectHomeProfileMode = function selectHomeProfileMode(mode){
    if(!homeProfileDraft || !['initials','profiles','upload'].includes(mode) || mode === homeProfileMode) return;
    clearHomeProfileImage();
    homeProfileMode = mode;
    homeProfileDraft.icon = mode === 'profiles' ? `profile:${HOME_PROFILE_IMAGES[0].file}` : 'initials';
    refreshHomeProfilePicturePanel();
  };

  window.selectHomeProfileImage = function selectHomeProfileImage(file){
    if(!homeProfileDraft || homeProfileMode !== 'profiles' || !HOME_PROFILE_IMAGES.some(image=>image.file === file)) return;
    homeProfileDraft.icon = `profile:${file}`;
    refreshHomeProfilePicturePanel();
  };

  window.selectHomeProfileColor = function selectHomeProfileColor(button){
    const color = button?.dataset.color;
    if(!homeProfileDraft || !HOME_PROFILE_COLORS.some(item=>item.value === color)) return;
    homeProfileDraft.color = color;
    document.querySelectorAll('.home-profile-form-colors button').forEach(item=>item.classList.toggle('selected',item === button));
    refreshHomeProfileFormAvatar();
  };

  window.previewHomeProfileImage = function previewHomeProfileImage(input){
    const file = input?.files?.[0];
    if(!file || !homeProfileDraft) return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024){
      input.value = '';
      homeToast('Choose a PNG, JPEG or WebP image under 2 MB.', true);
      return;
    }
    if(homeProfilePreviewUrl) URL.revokeObjectURL(homeProfilePreviewUrl);
    homeProfileMode = 'upload';
    homeProfileImageFile = file;
    homeProfilePreviewUrl = URL.createObjectURL(file);
    homeProfileDraft.imagePath = '';
    homeProfileDraft.imageUrl = homeProfilePreviewUrl;
    refreshHomeProfilePicturePanel();
  };

  window.removeHomeProfileImage = function removeHomeProfileImage(){
    if(!homeProfileDraft) return;
    clearHomeProfileImage();
    refreshHomeProfilePicturePanel();
  };

  window.saveHomeProfileForm = async function saveHomeProfileForm(){
    if(!homeProfileDraft || homeProfileSaving) return;
    const name = (document.getElementById('home-profile-form-name')?.value || '').trim();
    if(!name){homeToast('Display name is required.', true);return;}
    if(homeProfileMode === 'upload' && !homeProfileDraft.imageUrl){homeToast('Choose an image to upload.', true);return;}
    const profile = getHomeProfile();
    if(!profile.user?.id || typeof supabaseClient === 'undefined' || !supabaseClient?.from){
      homeToast('Sign in to save your profile.', true);
      return;
    }
    const saveButton = document.getElementById('home-profile-form-save');
    homeProfileSaving = true;
    if(saveButton){saveButton.disabled = true;saveButton.textContent = 'Saving...';}
    let uploadedPath = '';
    try{
      if(profile.schoolMember && name !== profile.displayName){
        const result = await supabaseClient.rpc('update_my_school_display_name',{input_display_name:name});
        if(result.error) throw result.error;
        profile.schoolMember.displayName = name;
      }
      let imagePath = homeProfileDraft.imagePath;
      if(homeProfileImageFile){
        const extension = { 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' }[homeProfileImageFile.type];
        uploadedPath = `${profile.user.id}/${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}.${extension}`;
        const upload = await supabaseClient.storage.from('profile-avatars').upload(uploadedPath,homeProfileImageFile,{contentType:homeProfileImageFile.type,cacheControl:'3600'});
        if(upload.error) throw upload.error;
        imagePath = uploadedPath;
      }
      const updates = {display_name:name,avatar_color:homeProfileDraft.color,avatar_icon:homeProfileDraft.icon,avatar_image_path:imagePath};
      const {error} = await supabaseClient.from('profiles').update(updates).eq('id',profile.user.id);
      if(error) throw error;
      if(typeof currentProfile !== 'undefined') currentProfile = {...(currentProfile || {}),...updates};
      localStorage.setItem('queroProfileColor',updates.avatar_color);
      cacheHomeProfile({...profile,displayName:name,color:updates.avatar_color,icon:updates.avatar_icon,imagePath});
      if(profile.imagePath && profile.imagePath !== imagePath && profile.imagePath.startsWith(`${profile.user.id}/`)){
        supabaseClient.storage.from('profile-avatars').remove([profile.imagePath]).catch(err=>console.warn('Could not remove old profile image',err));
      }
      homeProfileSaving = false;
      window.closeHomeProfileForm();
      renderGlobalTopbar();
      if(typeof renderHomePage === 'function') renderHomePage();
      homeToast('Profile updated.');
    }catch(err){
      if(uploadedPath){
        try{await supabaseClient.storage.from('profile-avatars').remove([uploadedPath]);}
        catch(cleanupError){console.warn('Could not remove unsaved profile image',cleanupError);}
      }
      console.warn('Could not save profile',err);
      homeToast('Could not save profile. Check the Profile SQL setup and try again.', true);
    }finally{
      homeProfileSaving = false;
      if(saveButton){saveButton.disabled = false;saveButton.innerHTML = '<i class="ti ti-device-floppy"></i> Save';}
    }
  };

  window.toggleHomeProfileColors = function toggleHomeProfileColors(event){
    if(event) event.stopPropagation();
    homeColorOpen = !homeColorOpen;
    renderGlobalTopbar();
  };

  window.setHomeProfileColor = async function setHomeProfileColor(color,event){
    if(event) event.stopPropagation();
    localStorage.setItem('queroProfileColor', color);
    const profile = getHomeProfile();
    cacheHomeProfile({...profile, color});
    try{
      if(profile.user?.id && typeof supabaseClient !== 'undefined' && supabaseClient?.from){
        await supabaseClient.from('profiles').update({ avatar_color: color }).eq('id', profile.user.id);
      }
    }catch(err){ console.warn('Could not save avatar colour', err); }
    homeColorOpen = false;
    renderGlobalTopbar();
  };

  window.startHomeDisplayNameEdit = function startHomeDisplayNameEdit(event){
    if(event) event.stopPropagation();
    const profile = getHomeProfile();
    if(!profile.schoolMember){ homeToast('No school member record found for this account.', true); return; }
    homeNameEditing = true;
    renderGlobalTopbar();
    setTimeout(()=>{
      const input = document.getElementById('home-profile-display-name-input');
      if(input){ input.focus(); input.select(); }
    },0);
  };

  window.cancelHomeDisplayNameEdit = function cancelHomeDisplayNameEdit(event){
    if(event) event.stopPropagation();
    homeNameEditing = false;
    renderGlobalTopbar();
  };

  window.handleHomeDisplayNameKey = function handleHomeDisplayNameKey(event){
    if(event.key === 'Enter') saveHomeDisplayName(event);
    if(event.key === 'Escape') cancelHomeDisplayNameEdit(event);
  };

  window.saveHomeDisplayName = async function saveHomeDisplayName(event){
    if(event) event.stopPropagation();
    const profile = getHomeProfile();
    const account = profile.schoolMember;
    if(!account){ homeToast('No school member record found for this account.', true); return; }
    const cleaned = (document.getElementById('home-profile-display-name-input')?.value || '').trim();
    if(!cleaned){ homeToast('Display name is required.', true); return; }
    account.displayName = cleaned;
    cacheHomeProfile({...profile, displayName:cleaned});
    try{
      if(typeof supabaseClient !== 'undefined' && supabaseClient?.rpc){
        const result = await supabaseClient.rpc('update_my_school_display_name', { input_display_name:cleaned });
        if(result.error) throw result.error;
      }else if(typeof saveSchoolMembershipToSupabase === 'function'){
        const saved = await saveSchoolMembershipToSupabase(account,false);
        if(saved === false) throw new Error('Display name was not saved to Supabase.');
      }else if(typeof saveState === 'function'){
        saveState();
      }
      homeToast('Display name updated.');
    }catch(err){
      console.warn('Could not save display name', err);
      homeToast('Display name saved locally, but not to Supabase. Run the latest School Manager SQL.', true);
    }
    homeNameEditing = false;
    renderGlobalTopbar();
  };

  window.homeUpgrade = function homeUpgrade(){ homeToast('Upgrade options are coming soon.'); };
  window.homeComingSoon = function homeComingSoon(label){ homeToast(`${label} is coming soon.`); };

  window.homeSignOut = async function homeSignOut(){
    try{
      homeProfileOpen = false;
      homeColorOpen = false;
      localStorage.removeItem('quero_cached_profile_v1');
      localStorage.removeItem('queroProfileCache');
      localStorage.removeItem('queroProfileColor');
      if(typeof clearProfileCache === 'function') clearProfileCache();
      if(typeof logoutUser === 'function'){ await logoutUser(); return; }
      if(typeof supabaseClient !== 'undefined' && supabaseClient?.auth) await supabaseClient.auth.signOut();
      location.reload();
    }catch(err){
      console.warn('Sign out failed', err);
      homeToast('Sign out failed. Please try again.', true);
    }
  };

  window.renderHomePage = function renderHomePage(){
    const root = document.getElementById('home-root');
    if(!root) return;
    const classes = getHomeClasses();
    const visibleClasses = homeVisibleClasses(classes);
    syncHomeTodoRealtime(visibleClasses);
    const selectedClass = Number.isInteger(homeOpenClassIndex) ? classes[homeOpenClassIndex] : null;
    const openClass = selectedClass && !selectedClass.archived && homeCanSeeClass(selectedClass) ? selectedClass : null;
    if(selectedClass && !openClass) homeOpenClassIndex = null;
    root.innerHTML = openClass ? renderHomeClassroomView(openClass, homeOpenClassIndex) : `
      <div class="home-root">
        <div class="home-body">
          <main class="home-classroom-wrap">
            <section class="home-classroom-panel">
              <div class="home-classroom-head">
                <h1>${homeEsc(homeClassroomHeading())}</h1>
                <span class="home-class-count">${visibleClasses.length} ${visibleClasses.length === 1 ? 'class' : 'classes'}</span>
              </div>
              ${renderHomeStudentTodoList(visibleClasses)}
              ${visibleClasses.length ? renderHomeClassGrid(visibleClasses) : renderHomeEmpty()}
            </section>
          </main>
        </div>
      </div>`;
    renderGlobalTopbar();
    setTimeout(()=>window.ensureHomeClassroomsLoadedFromSupabase?.(), 0);
  };

  function homeFormatDate(value){
    const date = value ? new Date(value) : null;
    if(!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function homeArchiveDeleteDate(cls){
    const archived = cls?.archivedAt || cls?.archived_at || cls?.updatedAt || cls?.updated_at || cls?.createdAt || cls?.created_at;
    const date = archived ? new Date(archived) : null;
    if(!date || Number.isNaN(date.getTime())) return null;
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  function homeArchiveCountdown(cls){
    const deleteDate = homeArchiveDeleteDate(cls);
    if(!deleteDate) return 'Deletes after 1 year';
    const today = homeDateStart(new Date());
    const target = homeDateStart(deleteDate);
    const days = Math.max(0, Math.ceil((target - today) / 86400000));
    if(days <= 0) return 'Ready for automatic deletion';
    if(days === 1) return 'Deletes in 1 day';
    return `Deletes in ${days} days`;
  }

  function renderClassroomArchiveCard(cls,index){
    const color = resolveHomeClassColor(cls.color);
    const banner = resolveHomeClassBanner(cls.banner || cls.subject || cls.name);
    const archivedDate = homeFormatDate(cls.archivedAt || cls.archived_at || cls.updatedAt || cls.updated_at);
    return `<article class="home-archive-class-card">
      <div class="home-class-cover ${String(cls.color || '').toLowerCase() === 'dark' ? 'dark' : ''}" style="background:${homeEsc(color)}">
        <div class="home-class-cover-shape"></div>
        <div class="home-class-cover-icon"><i class="ti ${homeEsc(banner.icon)}"></i></div>
      </div>
      <div class="home-archive-class-space">
        <div class="home-archive-class-main">
          <h2>${homeEsc(cls.name || 'Untitled class')}</h2>
          ${cls.yearLevel ? `<p>Year ${homeEsc(cls.yearLevel)}</p>` : ''}
          ${archivedDate ? `<p>Archived ${homeEsc(archivedDate)}</p>` : '<p>Archived classroom</p>'}
          <span>${homeEsc(homeArchiveCountdown(cls))}</span>
        </div>
        <div class="home-archive-actions">
          <button type="button" onclick="restoreArchivedHomeClass(${index})"><i class="ti ti-restore"></i><span>Restore</span></button>
          <button type="button" class="danger" onclick="deleteArchivedHomeClass(${index})"><i class="ti ti-trash"></i><span>Delete</span></button>
        </div>
      </div>
    </article>`;
  }

  window.renderClassroomArchivePage = function renderClassroomArchivePage(){
    const root = document.getElementById('classroom-archive-root');
    if(!root) return;
    const classes = getHomeClasses();
    const archivedClasses = classes.map((cls,index)=>({ ...cls, __homeClassIndex:index })).filter(cls=>cls?.archived && homeCanSeeClass(cls));
    root.innerHTML = `<div class="home-root">
      <div class="home-body">
        <main class="home-classroom-wrap">
          <section class="home-classroom-panel">
            <div class="home-classroom-head">
              <h1>Classroom Archive</h1>
              <span class="home-class-count">${archivedClasses.length} ${archivedClasses.length === 1 ? 'archived class' : 'archived classes'}</span>
            </div>
            <div class="home-archive-note">
              Archived classrooms stay here for 1 year, then are automatically deleted with their related classroom data.
            </div>
            ${archivedClasses.length ? `<div class="home-archive-class-grid">${archivedClasses.map(cls=>renderClassroomArchiveCard(cls,cls.__homeClassIndex)).join('')}</div>` : `<div class="home-empty">
              <i class="ti ti-archive"></i>
              <h2>No archived classrooms</h2>
              <p>Archived classrooms will appear here.</p>
            </div>`}
          </section>
        </main>
      </div>
    </div>`;
    renderGlobalTopbar();
    const syncKey = homeClassroomUserKey();
    if(homeArchivedClassroomsLoadedForKey !== syncKey && homeArchivedClassroomsLoadingForKey !== syncKey){
      setTimeout(()=>window.loadArchivedHomeClassroomsFromSupabase?.(), 0);
    }
  };

  function renderHomeEmpty(){
    return `
      <div class="home-empty">
        <i class="ti ti-chalkboard"></i>
        <h2>No classes yet</h2>
        <p>Create your first class to start organising lessons, quizzes, and question-bank activities.</p>
      </div>`;
  }

  function homeStudentKey(student,index){
    return String(student?.id || student?.userId || student?.user_id || student?.email || student?.name || `student-${index}`);
  }

  function homeClassStudents(cls){
    const raw = Array.isArray(cls?.students) ? cls.students : Array.isArray(cls?.members) ? cls.members : [];
    return raw
      .filter(student => typeof student === 'string' || !student?.role || student.role === 'student')
      .map((student,index)=>{
        if(typeof student === 'string') return { key:`student-${index}`, name:student, email:'', userId:'' };
        const name = student?.displayName || student?.display_name || student?.name || `${student?.firstName || student?.first || ''} ${student?.lastName || student?.last || ''}`.trim() || student?.email || `Student ${index + 1}`;
        return {
          key: homeStudentKey(student,index),
          name,
          email: student?.email || '',
          userId: student?.userId || student?.user_id || ''
        };
      });
  }

  function homeCurrentStudent(cls){
    const profile = getHomeProfile();
    const email = String(profile.email || '').trim().toLowerCase();
    const userId = profile.user?.id || '';
    return homeClassStudents(cls).find(student=>{
      return (userId && student.userId === userId) || (email && String(student.email || '').trim().toLowerCase() === email);
    }) || { key:userId || email || profile.displayName || profile.username, name:profile.displayName || profile.username || 'Student', email:profile.email || '', userId };
  }

  function homePracticeAttemptRecordType(attempt){
    return String(attempt?.recordType || attempt?.record_type || attempt?.type || attempt?.data?.recordType || '').trim().toLowerCase();
  }

  function homeTodoDoneStorageKey(){
    const profile = getHomeProfile();
    const userKey = profile.user?.id || profile.email || profile.displayName || profile.username || 'student';
    return `queroStudentTodoDone:${userKey}`;
  }

  function homeDoneTodoItems(){
    try { return JSON.parse(localStorage.getItem(homeTodoDoneStorageKey()) || '[]') || []; }
    catch { return []; }
  }

  function saveHomeDoneTodoItems(items){
    localStorage.setItem(homeTodoDoneStorageKey(), JSON.stringify(Array.isArray(items) ? items : []));
  }

  function homeTodoItemKey(cls,term,task,studentKey){
    return [cls?.id || cls?.supabaseId || cls?.code || cls?.name || 'class', term || '', task?.id || task?.title || '', studentKey || 'student'].join('|');
  }

  function homeTodoDismissedInClass(cls,taskId,studentKey){
    return (Array.isArray(cls?.todoDismissals) ? cls.todoDismissals : []).some(item=>{
      return String(item?.taskId || item?.task_id || '') === String(taskId || '')
        && String(item?.studentKey || item?.student_key || '') === String(studentKey || '');
    });
  }

  function homePracticeAttemptScore(attempt){
    const questions = Array.isArray(attempt?.questions) ? attempt.questions : Array.isArray(attempt?.data?.questions) ? attempt.data.questions : [];
    const attempted = questions.filter(item=>item && item.selectedIndex !== undefined && item.selectedIndex !== null);
    if(attempted.length){
      const correct = attempted.filter(item=>Number(item.selectedIndex) === Number(item.correctIndex)).length;
      return Math.round((correct / attempted.length) * 100);
    }
    const score = Number(attempt?.scorePercent ?? attempt?.percent ?? attempt?.score ?? attempt?.data?.scorePercent);
    return Number.isFinite(score) ? score : null;
  }

  function homeDateStart(date){
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function homeParseDueDate(value){
    const text = String(value || '').trim();
    if(!text) return null;
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const au = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(au) return new Date(Number(au[3]), Number(au[2]) - 1, Number(au[1]));
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function homeDueState(task){
    const due = homeParseDueDate(task?.dueDate);
    if(!due) return { className:'', label:'' };
    const today = homeDateStart(new Date());
    const dueStart = homeDateStart(due);
    const days = Math.round((dueStart - today) / 86400000);
    if(days <= -7) return { className:'overdue-hidden', label:'', removeAsNotAttempted:true };
    if(days < 0) return { className:'overdue', label:'Overdue' };
    if(days === 0) return { className:'due-soon', label:'Due today' };
    if(days === 1) return { className:'due-soon', label:'Due tomorrow' };
    if(days <= 2) return { className:'due-soon', label:`Due in ${days} days` };
    return { className:'', label:'' };
  }

  function homePracticeAttemptState(cls,term,task){
    const allowed = Math.max(1, Number(task?.attempts) || 1);
    const studentKey = homeCurrentStudent(cls).key;
    const termData = cls?.tracker?.[term] || {};
    const summary = termData?.practiceAttemptSummaries?.[task?.id]?.[studentKey] || {};
    const summaryCount = Number(summary.totalAttempts);
    const attempts = Array.isArray(termData?.attempts?.[task?.id]?.[studentKey]) ? termData.attempts[task.id][studentKey] : [];
    const savedCount = attempts.filter(attempt=>homePracticeAttemptRecordType(attempt) !== 'best').length;
    const used = Number.isFinite(summaryCount) && summaryCount > 0 ? summaryCount : savedCount;
    const currentResult = termData?.results?.[task?.id]?.[studentKey];
    const scores = attempts
      .filter(attempt=>homePracticeAttemptRecordType(attempt) !== 'best')
      .map(homePracticeAttemptScore)
      .filter(score=>Number.isFinite(score));
    const highScore = Number(summary.highestScore ?? summary.bestScore);
    const hasPerfect = (Number.isFinite(highScore) && highScore >= 100) || scores.some(score=>score >= 100);
    const cappedUsed = Math.min(used, allowed);
    return {
      used: cappedUsed,
      allowed,
      label: `${cappedUsed}/${allowed}`,
      hasPerfect,
      maxReached: cappedUsed >= allowed,
      doneKey: homeTodoItemKey(cls,term,task,studentKey),
      rawUsed: used,
      result: currentResult
    };
  }

  function queueHomePracticeNotAttempted(classIndex,term,taskId,studentKey){
    setTimeout(async ()=>{
      const classes = getHomeClasses();
      const cls = classes[classIndex];
      const termData = cls?.tracker?.[term];
      if(!cls || !termData || !taskId || !studentKey) return;
      termData.results = termData.results && typeof termData.results === 'object' ? termData.results : {};
      termData.results[taskId] = termData.results[taskId] && typeof termData.results[taskId] === 'object' ? termData.results[taskId] : {};
      if(termData.results[taskId][studentKey]) return;
      termData.results[taskId][studentKey] = 'NA';
      saveHomeClasses(classes);
      const sync = homeClassroomSync();
      if(sync?.saveTrackerResult && (cls.id || cls.supabaseId)){
        try{
          await sync.saveTrackerResult(cls,taskId,studentKey,'NA');
        }catch(err){
          console.warn('Could not save overdue Quero Practice NA result to Supabase', err);
        }
      }
    }, 0);
  }

  function renderHomeStudentTodoList(classes){
    if(!homeIsStudentRole()) return '';
    const sync = homeClassroomSync();
    const syncKey = homeClassroomUserKey();
    if(sync?.loadClassrooms && homeClassroomsLoadedForKey !== syncKey){
      const failed = homeClassroomsLoadAttemptedForKey === syncKey && homeClassroomsLoadingForKey !== syncKey;
      return `<section class="home-student-todo-section" aria-label="Student to do list">
        ${failed
          ? `<div class="home-class-placeholder compact"><p>Could not load assigned practice. Try reloading.</p></div>`
          : `<div class="home-student-todo-loading">
              <div class="home-student-todo-loading-row">
                <span>Loading assigned practice...</span>
                <span>Syncing</span>
              </div>
              <div class="home-student-todo-loading-bar" role="progressbar" aria-label="Loading assigned practice" aria-valuemin="0" aria-valuemax="100" aria-valuenow="88">
                <span></span>
              </div>
            </div>`}
      </section>`;
    }
    const items = [];
    const doneItems = new Set(homeDoneTodoItems());
    (classes || []).forEach((cls,classIndex)=>{
      const sourceClassIndex = Number.isInteger(cls?.__homeClassIndex) ? cls.__homeClassIndex : classIndex;
      ['term1','term2','term3','term4'].forEach(term=>{
        (cls?.tracker?.[term]?.tasks || []).forEach(task=>{
          if(task?.type === 'practice'){
            const state = homePracticeAttemptState(cls,term,task);
            const due = homeDueState(task);
            if(due.removeAsNotAttempted){
              if(!state.rawUsed && !state.result) queueHomePracticeNotAttempted(sourceClassIndex,term,task.id,homeCurrentStudent(cls).key);
              return;
            }
            if(!doneItems.has(state.doneKey) && !homeTodoDismissedInClass(cls,task.id,homeCurrentStudent(cls).key)) items.push({ cls, classIndex:sourceClassIndex, term, task, state, due });
          }
        });
      });
    });
    const todos = items.slice(0,6);
    return `<section class="home-student-todo-section" aria-label="Student to do list">
      ${todos.length ? `<div class="home-student-todo-list">${todos.map(item=>{
        const task = item.task;
        const focusLabel = [task.skill,task.subtopic,task.topic].map(value=>{
          if(typeof value === 'string' && value.startsWith('[')){
            try{const selected = JSON.parse(value);if(Array.isArray(selected)) return selected.join(', ');}catch(err){}
          }
          return value || '';
        }).find(Boolean) || '';
        const details = [item.cls?.name || 'Classroom', focusLabel, `${Number(task.questionCount) || 10} questions`, task.dueDate ? `Due ${task.dueDate}` : 'No due date'].filter(Boolean);
        const state = item.state || homePracticeAttemptState(item.cls,item.term,task);
        const due = item.due || homeDueState(task);
        return `<article class="home-student-todo-card ${homeEsc(due.className)}">
          <div class="home-student-todo-icon"><i class="ti ti-flame"></i></div>
          <div class="home-student-todo-main">
            <div class="home-student-todo-title-row"><h3>${homeEsc(task.title || 'Quero Practice')}</h3>${due.label ? `<span class="home-student-todo-due ${homeEsc(due.className)}"><i class="ti ${due.className === 'overdue' ? 'ti-alert-circle' : 'ti-clock'}"></i>${homeEsc(due.label)}</span>` : ''}</div>
            <p>${details.map(homeEsc).join(' &middot; ')}</p>
          </div>
          <div class="home-student-todo-actions">
            ${state.hasPerfect && !state.maxReached ? `<button type="button" class="home-student-todo-done" onclick="dismissHomeStudentTodo('${homeEsc(homeJsString(state.doneKey))}',${item.classIndex},'${homeEsc(homeJsString(item.term))}','${homeEsc(homeJsString(task.id))}',event)"><i class="ti ti-check"></i><span>Done</span></button>` : ''}
            ${state.maxReached
              ? `<button type="button" class="home-student-todo-done" onclick="dismissHomeStudentTodo('${homeEsc(homeJsString(state.doneKey))}',${item.classIndex},'${homeEsc(homeJsString(item.term))}','${homeEsc(homeJsString(task.id))}',event)"><i class="ti ti-check"></i><span>Done</span><span class="home-student-todo-attempts done">${homeEsc(state.label)}</span></button>`
              : `<button type="button" class="home-student-todo-start" onclick="startHomeStudentPractice?.(${item.classIndex},'${homeEsc(item.term)}','${homeEsc(task.id)}',event)"><i class="ti ti-player-play"></i><span>Start</span><span class="home-student-todo-attempts">${homeEsc(state.label)}</span></button>`}
          </div>
        </article>`;
      }).join('')}</div>` : `<div class="home-class-placeholder compact"><p>No assigned Quero Practice yet.</p></div>`}
    </section>`;
  }

  window.dismissHomeStudentTodo = function dismissHomeStudentTodo(key,classIndex,term,taskId,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const items = new Set(homeDoneTodoItems());
    items.add(String(key || ''));
    saveHomeDoneTodoItems([...items].filter(Boolean));
    setTimeout(async ()=>{
      const classes = getHomeClasses();
      const cls = classes[classIndex];
      if(!cls || !taskId) return;
      const student = homeCurrentStudent(cls);
      cls.todoDismissals = Array.isArray(cls.todoDismissals) ? cls.todoDismissals : [];
      if(!homeTodoDismissedInClass(cls,taskId,student.key)){
        cls.todoDismissals.push({ taskId, studentKey:student.key, termKey:term || 'term1', reason:'done', createdAt:new Date().toISOString() });
        saveHomeClasses(classes);
      }
      const sync = homeClassroomSync();
      if(sync?.saveTodoDismissal && (cls.id || cls.supabaseId)){
        try{
          await sync.saveTodoDismissal(cls,taskId,student.key,term || 'term1','done');
        }catch(err){
          console.warn('Could not save dismissed to-do to Supabase', err);
        }
      }
    }, 0);
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll(event?.currentTarget || event?.target || document.querySelector('.home-wrap'));
    else renderHomePage();
  };

  function renderHomeClassGrid(classes){
    return window.QueroClassroom?.renderClassGrid ? window.QueroClassroom.renderClassGrid({
      classes,
      homeClassSettingsOpen,
      homeEsc,
      resolveHomeClassColor,
      resolveHomeClassBanner,
      homeClassDisplayCode,
      homeUnreadClassActivity
    }) : '';
  }

  function renderHomeClassroomView(cls,index){
    return window.QueroClassroom?.renderClassroomView ? window.QueroClassroom.renderClassroomView({
      cls,
      index,
      homeClassTab,
      homeEsc,
      resolveHomeClassColor,
      resolveHomeClassBanner,
      homeClassDisplayCode,
      renderHomeClassTabContent
    }) : '';
  }

  function renderHomeClassTabContent(cls,index){
    return window.QueroClassroom?.renderClassTabContent ? window.QueroClassroom.renderClassTabContent({
      cls,
      index,
      homeClassTab,
      homeEsc,
      homeClassJoinedStudents
    }) : '';
  }

  window.openHomeClassroom = function openHomeClassroom(index){
    const cls = getHomeClasses()[index];
    if(cls) markHomeClassActivityRead(cls);
    homeOpenClassIndex = index;
    homeClassSettingsOpen = null;
    homeClassTab = 'home';
    renderHomePage();
  };

  window.getActiveHomeClassroom = function getActiveHomeClassroom(){
    if(!Number.isInteger(homeOpenClassIndex)) return null;
    const cls = getHomeClasses()[homeOpenClassIndex];
    return cls && !cls.archived && homeCanSeeClass(cls) ? cls : null;
  };

  window.getHomeClassroomSubjects = function getHomeClassroomSubjects(){
    const seen = new Set();
    return getHomeClasses().filter(cls=>!cls?.archived && homeCanSeeClass(cls)).map(cls=>String(cls?.subject||'').trim()).filter(subject=>{
      const key = subject.toLowerCase();
      if(!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  window.orderSubjectsByHomeClassrooms = function orderSubjectsByHomeClassrooms(items){
    const remaining = Array.isArray(items) ? [...items] : [];
    const preferred = [];
    window.getHomeClassroomSubjects().forEach(subject=>{
      const key = String(subject).trim().toLowerCase();
      const index = remaining.findIndex(value=>String(value||'').trim().toLowerCase() === key);
      if(index >= 0) preferred.push(remaining.splice(index,1)[0]);
    });
    return preferred.concat(remaining);
  };

  window.closeHomeClassroom = function closeHomeClassroom(){
    homeOpenClassIndex = null;
    homeClassSettingsOpen = null;
    renderHomePage();
  };

  window.setHomeClassTab = function setHomeClassTab(tab,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const scrollTop = rememberHomeClassroomScroll(event?.currentTarget || event?.target || document.querySelector('.home-classroom-wrap'));
    homeClassTab = tab || 'home';
    if(homeClassTab === 'home' && Number.isInteger(homeOpenClassIndex)){
      const cls = getHomeClasses()[homeOpenClassIndex];
      if(cls) markHomeClassActivityRead(cls);
    }
    renderHomePagePreservingScroll();
    restoreHomeClassroomScroll(scrollTop);
  };

  window.toggleHomeClassSettings = function toggleHomeClassSettings(index,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    homeClassSettingsOpen = homeClassSettingsOpen === index ? null : index;
    renderHomePage();
  };

  window.openEditHomeClassModal = function openEditHomeClassModal(index,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    homeClassSettingsOpen = null;
    renderHomePage();
    openAddClassModal(index);
  };

  window.openHomeClassCodeModal = function openHomeClassCodeModal(index,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const classes = getHomeClasses();
    const cls = classes[index];
    if(!cls) return;
    const code = homeClassDisplayCode(cls,index);
    document.getElementById('home-code-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-code-modal-root';
    shell.innerHTML = `<button type="button" class="home-modal-scrim" onclick="closeHomeClassCodeModal()" aria-label="Close classroom code"></button>
      <div class="home-code-modal">
        <div class="home-code-modal-head"><h2>Classroom Code</h2><button type="button" class="home-code-close" onclick="closeHomeClassCodeModal()" aria-label="Close classroom code"><i class="ti ti-x"></i></button></div>
        <div class="home-code-class-name">${homeEsc(cls.name || 'Classroom')}</div>
        <div class="home-code-large">${homeEsc(code)}</div>
        <button type="button" class="home-code-copy" onclick="copyHomeClassCode('${homeEsc(code)}', event)"><i class="ti ti-copy"></i><span>Copy Code</span></button>
      </div>`;
    document.body.appendChild(shell);
  };

  window.closeHomeClassCodeModal = function closeHomeClassCodeModal(){
    document.getElementById('home-code-modal-root')?.remove();
  };

  window.copyHomeClassCode = async function copyHomeClassCode(code,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    try{
      await navigator.clipboard.writeText(code);
      homeToast('Classroom code copied.');
    }catch(err){
      homeToast('Could not copy code. Please copy it manually.', true);
    }
  };

  window.archiveHomeClass = async function archiveHomeClass(index,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const classes = getHomeClasses();
    const cls = classes[index];
    if(!cls) return;
    const sync = homeClassroomSync();
    const archivedAt = new Date().toISOString();
    if(sync?.archiveClassroom && cls?.id){
      try{
        await sync.archiveClassroom(cls);
      }catch(err){
        console.warn('Could not archive classroom in Supabase:', err);
        homeToast(err?.message || 'Could not archive classroom.', true);
        return;
      }
    }
    classes[index] = { ...cls, archived:true, archivedAt };
    saveHomeClasses(classes);
    homeClassSettingsOpen = null;
    homeArchivedClassroomsLoadedForKey = '';
    if(homeOpenClassIndex === index) homeOpenClassIndex = null;
    renderHomePage();
    homeToast('Classroom archived.');
  };

  window.openJoinClassModal = function openJoinClassModal(){
    homeProfileOpen = false;
    homeColorOpen = false;
    renderGlobalTopbar();
    document.getElementById('home-modal-root')?.remove();
    const shell = document.createElement('div');
    shell.id = 'home-modal-root';
    shell.innerHTML = `
      <button type="button" class="home-modal-scrim" onclick="closeHomeModal()" aria-label="Close join class"></button>
      <div class="home-modal home-join-modal">
        <h2 class="home-modal-title">Join Class</h2>
        <div class="home-form-grid home-join-form">
          <label>Classroom code<input id="home-join-class-code" type="text" placeholder="Enter classroom code"></label>
        </div>
        <div class="home-modal-actions">
          <button type="button" onclick="closeHomeModal()">Cancel</button>
          <button type="button" class="primary" onclick="joinHomeClassByCode()">Join</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    setTimeout(()=>document.getElementById('home-join-class-code')?.focus(), 0);
  };

  window.joinHomeClassByCode = async function joinHomeClassByCode(){
    const code = document.getElementById('home-join-class-code')?.value?.trim().toUpperCase();
    if(!code){ homeToast('Enter a classroom code first.', true); return; }
    const sync = homeClassroomSync();
    if(sync?.joinClassByCode){
      try{
        const joined = await sync.joinClassByCode(code);
        if(!joined) throw new Error('Could not join classroom. Please try again.');
        await window.loadHomeClassroomsFromSupabase?.();
        const classes = getHomeClasses();
        const classIndex = classes.findIndex((cls,index)=>homeClassDisplayCode(cls,index).toUpperCase() === code);
        closeHomeModal();
        if(classIndex >= 0){
          homeOpenClassIndex = classIndex;
          homeClassTab = 'home';
        }
        renderHomePage();
        homeToast('Joined classroom.');
        return;
      }catch(err){
        console.warn('Could not join classroom from Supabase:', err);
        homeToast(err?.message || 'Could not join classroom.', true);
        return;
      }
    }
    const classes = getHomeClasses();
    const classIndex = classes.findIndex((cls,index)=>homeClassDisplayCode(cls,index).toUpperCase() === code);
    if(classIndex < 0){ homeToast('Classroom code not found.', true); return; }
    const student = homeStudentIdentity();
    const existing = Array.isArray(classes[classIndex].students) ? classes[classIndex].students : [];
    const alreadyJoined = existing.some(member => {
      if(typeof member === 'string') return member.trim().toLowerCase() === student.name.trim().toLowerCase();
      const memberUserId = member?.userId || member?.user_id || '';
      const memberEmail = String(member?.email || '').trim().toLowerCase();
      return (student.userId && memberUserId === student.userId) || (student.email && memberEmail === student.email);
    });
    if(!alreadyJoined){
      classes[classIndex].students = existing.concat([{ userId:student.userId, email:student.email, name:student.name, displayName:student.name, status:'Active', joinedAt:new Date().toISOString() }]);
      saveHomeClasses(classes);
    }
    closeHomeModal();
    homeOpenClassIndex = classIndex;
    homeClassTab = 'home';
    renderHomePage();
    homeToast(alreadyJoined ? 'You are already in this classroom.' : 'Joined classroom.');
  };

  window.openAddClassModal = function openAddClassModal(editIndex=null){
    homeProfileOpen = false;
    homeColorOpen = false;
    renderGlobalTopbar();
    document.getElementById('home-modal-root')?.remove();
    const classes = getHomeClasses();
    const editingClass = Number.isInteger(editIndex) ? classes[editIndex] : null;
    const selectedYearLevel = editingClass?.yearLevel || '';
    const selectedSubject = editingClass?.subject || '';
    const selectedColor = resolveHomeClassColor(editingClass?.color || HOME_CLASS_COLORS[0].value);
    const selectedBannerIndex = Math.max(0, HOME_CLASS_BANNERS.findIndex(banner => banner.name === (editingClass?.banner || editingClass?.subject)));
    const selectedBanner = HOME_CLASS_BANNERS[selectedBannerIndex] || HOME_CLASS_BANNERS[0];
    const shell = document.createElement('div');
    shell.id = 'home-modal-root';
    shell.innerHTML = `
      <button type="button" class="home-modal-scrim" onclick="closeHomeModal()" aria-label="Close class form"></button>
      <div class="home-modal">
        <h2 class="home-modal-title">${editingClass ? 'Edit Classroom' : 'Create Classroom'}</h2>
        <div class="home-form-grid">
          <label>Classroom name<input id="home-class-name" type="text" placeholder="Write classroom name here..." value="${homeEsc(editingClass?.name || '')}"></label>
          <label>Year level<select id="home-class-year-level">${homeOptionsHtml([...homeYearLevelOptions()].reverse(), selectedYearLevel, 'Add year levels in Curriculum Manager')}</select></label>
          <label>Subject<select id="home-class-subject">${homeOptionsHtml(homeSubjectOptions(), selectedSubject, 'Add subjects in Curriculum Manager')}</select></label>
          <label>Banner<select id="home-class-banner" onchange="updateHomeClassBannerPreview()">${homeBannerOptions(selectedBannerIndex)}</select></label>
          <label class="home-class-banner-field">Preview
            <div class="home-class-banner-preview" id="home-class-banner-preview">${renderHomeBannerPreview(selectedBanner)}</div>
          </label>
          <label class="home-class-color-field">Colour${renderHomeClassColorChoices(selectedColor)}</label>
        </div>
        <div class="home-modal-actions">
          <button type="button" onclick="closeHomeModal()">Cancel</button>
          <button type="button" class="primary" onclick="saveHomeClass(${Number.isInteger(editIndex) ? editIndex : 'null'})">Save</button>
        </div>
      </div>`;
    document.body.appendChild(shell);
    applyHomeClassBannerColor(selectedColor);
    setTimeout(()=>document.getElementById('home-class-name')?.focus(), 0);
  };

  window.updateHomeClassBannerPreview = function updateHomeClassBannerPreview(){
    const select = document.getElementById('home-class-banner');
    const preview = document.getElementById('home-class-banner-preview');
    const banner = HOME_CLASS_BANNERS[Number(select?.value) || 0] || HOME_CLASS_BANNERS[0];
    if(preview) preview.innerHTML = renderHomeBannerPreview(banner);
    const color = document.getElementById('home-class-color')?.value || HOME_CLASS_COLORS[0].value;
    applyHomeClassBannerColor(color);
  };

  window.selectHomeClassColor = function selectHomeClassColor(color,event){
    if(event) event.preventDefault();
    const input = document.getElementById('home-class-color');
    if(input) input.value = color;
    document.querySelectorAll('.home-class-color-choice').forEach(button=>button.classList.toggle('active', button.dataset.color === color));
    applyHomeClassBannerColor(color);
  };

  window.closeHomeModal = function closeHomeModal(){
    document.getElementById('home-modal-root')?.remove();
  };

  window.saveHomeClass = async function saveHomeClass(editIndex=null){
    const name = document.getElementById('home-class-name')?.value?.trim();
    const yearLevel = document.getElementById('home-class-year-level')?.value?.trim();
    const subject = document.getElementById('home-class-subject')?.value?.trim();
    const bannerIndex = Number(document.getElementById('home-class-banner')?.value) || 0;
    const banner = HOME_CLASS_BANNERS[bannerIndex] || HOME_CLASS_BANNERS[0];
    const color = document.getElementById('home-class-color')?.value || HOME_CLASS_COLORS[0].value;
    if(!name){ homeToast('Classroom name is required.', true); return; }
    if(!yearLevel){ homeToast('Choose a year level from Curriculum Manager first.', true); return; }
    if(!subject){ homeToast('Choose a subject from Curriculum Manager first.', true); return; }
    const classes = getHomeClasses();
    const existingClass = Number.isInteger(editIndex) ? classes[editIndex] : null;
    const payload = { ...existingClass, name, yearLevel, subject, teacher:subject, banner:banner.name, color, updatedAt:new Date().toISOString() };
    const sync = homeClassroomSync();
    if(sync?.saveClassroom){
      try{
        const saved = await sync.saveClassroom(payload);
        if(saved){
          if(Number.isInteger(editIndex) && classes[editIndex]) classes[editIndex] = saved;
          else classes.push(saved);
          saveHomeClasses(classes);
          closeHomeModal();
          renderHomePage();
          homeToast(existingClass ? 'Classroom updated.' : 'Classroom created.');
          return;
        }
      }catch(err){
        console.warn('Could not save classroom to Supabase:', err);
        homeToast(err?.message || 'Could not save classroom.', true);
        return;
      }
    }
    if(Number.isInteger(editIndex) && classes[editIndex]){
      classes[editIndex] = { ...classes[editIndex], ...payload };
    }else{
      const localCode = homeGenerateLocalClassCode(classes);
      const profile = getHomeProfile();
      classes.push({ ...payload, teacherId:profile.user?.id || '', creatorEmail:profile.email || '', classCode:localCode, code:localCode, createdAt:new Date().toISOString() });
    }
    saveHomeClasses(classes);
    closeHomeModal();
    renderHomePage();
  };

  window.deleteHomeClass = async function deleteHomeClass(index,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    if(!confirm('Delete this classroom permanently?')) return;
    homeClassSettingsOpen = null;
    const classes = getHomeClasses();
    const cls = classes[index];
    const sync = homeClassroomSync();
    if(sync?.deleteClassroom && cls?.id){
      try{
        await sync.deleteClassroom(cls);
      }catch(err){
        console.warn('Could not delete classroom from Supabase:', err);
        homeToast(err?.message || 'Could not delete classroom.', true);
        return;
      }
    }
    classes.splice(index, 1);
    saveHomeClasses(classes);
    homeClassSettingsOpen = null;
    if(homeOpenClassIndex === index) homeOpenClassIndex = null;
    renderHomePage();
  };

  window.leaveHomeClass = async function leaveHomeClass(index,event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    if(!confirm('Leave this classroom?')) return;
    const classes = getHomeClasses();
    const cls = classes[index];
    if(!cls) return;
    const sync = homeClassroomSync();
    if(cls.id || cls.supabaseId){
      try{
        if(!sync?.leaveClassroom) throw new Error('Classroom sync is unavailable. Please refresh and try again.');
        await sync.leaveClassroom(cls.id || cls.supabaseId);
      }catch(err){
        console.warn('Could not leave classroom in Supabase:', err);
        homeToast(err?.message || 'Could not leave classroom.', true);
        return;
      }
      classes.splice(index, 1);
      saveHomeClasses(classes);
      homeClassSettingsOpen = null;
      if(homeOpenClassIndex === index) homeOpenClassIndex = null;
      renderHomePage();
      homeToast('Left classroom.');
      return;
    }
    const student = homeCurrentStudent(cls);
    const raw = Array.isArray(cls.students) ? cls.students : [];
    const memberIndex = raw.findIndex((member,memberIndex)=>{
      if(typeof member === 'string') return String(member || '').trim().toLowerCase() === String(student.name || '').trim().toLowerCase();
      const memberUserId = member?.userId || member?.user_id || '';
      const memberEmail = String(member?.email || '').trim().toLowerCase();
      const memberKey = String(member?.id || member?.userId || member?.user_id || member?.email || member?.name || `student-${memberIndex}`);
      return (student.userId && memberUserId === student.userId) || (student.email && memberEmail === String(student.email || '').trim().toLowerCase()) || memberKey === student.key;
    });
    if(memberIndex < 0){
      classes.splice(index, 1);
      saveHomeClasses(classes);
      homeClassSettingsOpen = null;
      if(homeOpenClassIndex === index) homeOpenClassIndex = null;
      renderHomePage();
      return;
    }
    raw.splice(memberIndex, 1);
    cls.students = raw;
    classes.splice(index, 1);
    saveHomeClasses(classes);
    homeClassSettingsOpen = null;
    if(homeOpenClassIndex === index) homeOpenClassIndex = null;
    renderHomePage();
    homeToast('Left classroom.');
  };

  window.restoreArchivedHomeClass = async function restoreArchivedHomeClass(archiveIndex){
    const classes = getHomeClasses();
    const archivedClasses = classes.filter(cls=>cls?.archived);
    const cls = archivedClasses[archiveIndex];
    if(!cls) return;
    const sync = homeClassroomSync();
    if(sync?.restoreClassroom && cls?.id){
      try{
        await sync.restoreClassroom(cls);
      }catch(err){
        console.warn('Could not restore classroom in Supabase:', err);
        homeToast(err?.message || 'Could not restore classroom.', true);
        return;
      }
    }
    const classIndex = classes.findIndex(item=>homeClassroomMatchKey(item,0) === homeClassroomMatchKey(cls,0));
    if(classIndex >= 0) classes[classIndex] = { ...classes[classIndex], archived:false, archivedAt:'' };
    saveHomeClasses(classes);
    homeClassroomsLoadedForKey = '';
    homeArchivedClassroomsLoadedForKey = '';
    renderClassroomArchivePage();
    homeToast('Classroom restored.');
  };

  window.deleteArchivedHomeClass = async function deleteArchivedHomeClass(archiveIndex){
    if(!confirm('Delete this archived classroom permanently?')) return;
    const classes = getHomeClasses();
    const archivedClasses = classes.filter(cls=>cls?.archived);
    const cls = archivedClasses[archiveIndex];
    if(!cls) return;
    const sync = homeClassroomSync();
    if(sync?.deleteClassroom && cls?.id){
      try{
        await sync.deleteClassroom(cls);
      }catch(err){
        console.warn('Could not delete archived classroom from Supabase:', err);
        homeToast(err?.message || 'Could not delete archived classroom.', true);
        return;
      }
    }
    const classIndex = classes.findIndex(item=>homeClassroomMatchKey(item,0) === homeClassroomMatchKey(cls,0));
    if(classIndex >= 0) classes.splice(classIndex, 1);
    saveHomeClasses(classes);
    homeArchivedClassroomsLoadedForKey = '';
    renderClassroomArchivePage();
    homeToast('Archived classroom deleted.');
  };
})();
