// School Manager screen and active-school wiring for Exam Builder.

let schoolAccountFilters={teacher:{search:'',status:'all'},student:{search:'',status:'all'}};
let schoolManagerSelectedTab='details';
let schoolManagerDropdownOpen=false;

function syncExamSchoolOptions(selected){
  const el=document.getElementById('exam-school-name');
  const current=selected||(el?el.value:'')||(typeof examSchoolName!=='undefined'?examSchoolName:'')||'Quero Learning Tools';
  const names=activeSchoolNames();
  if(current&&!names.includes(current))names.unshift(current);
  if(!names.length)names.push('Quero Learning Tools');
  if(typeof examSchoolName!=='undefined')examSchoolName=names.includes(current)?current:names[0];
  if(!el)return;
  el.innerHTML=names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
  el.value=names.includes(current)?current:names[0];
}
function selectedSchool(){
  schools=normaliseSchools(schools);
  if(!schools.some(s=>s.id===selectedSchoolId))selectedSchoolId=schools[0]?.id||'';
  return schools.find(s=>s.id===selectedSchoolId)||null;
}
function schoolAccountCount(schoolId,role){
  return schoolAccounts.filter(a=>a.schoolId===schoolId&&(!role||a.role===role)).length;
}
function renderSchoolManager(){
  const root=document.getElementById('school-manager-root');
  if(!root)return;
  if(currentRole!=='admin'){
    root.innerHTML=`<div class="empty-state"><i class="ti ti-lock"></i><div>Admin access only</div></div>`;
    return;
  }
  schools=normaliseSchools(schools);
  schoolAccounts=normaliseSchoolAccounts(schoolAccounts,schools.map(s=>s.id));
  const school=selectedSchool();
  root.innerHTML=`<div class="school-manager">
    <section class="school-manager-panel">
      <div class="school-manager-head">
        <div>
          <h1>School Manager</h1>
          <div class="school-note">Manage schools, join codes, approvals, and account records.</div>
        </div>
        <div class="school-manager-actions">
          <div class="school-add-row">
            <input id="school-new-name" placeholder="School name">
            <button type="button" class="school-square-action" onclick="addSchool()" title="Add school"><i class="ti ti-plus"></i></button>
          </div>
          <button type="button" class="school-sync-btn" onclick="syncSchoolsToSupabase()"><i class="ti ti-cloud-upload"></i>Sync</button>
        </div>
      </div>
      <div class="school-picker-area">
        ${school?schoolPickerHtml(school):''}
        <section class="school-selected-shell">
          ${school?schoolDetailHtml(school):`<div class="empty-state"><i class="ti ti-building"></i><div>Add a school to begin</div></div>`}
        </section>
      </div>
    </section>
  </div>`;
  requestAnimationFrame(()=>{applySchoolAccountFilters('teacher');applySchoolAccountFilters('student');});
}
function schoolListRow(s){
  const selected=s.id===selectedSchoolId;
  const count=schoolAccountCount(s.id);
  return `<button type="button" class="school-list-row${selected?' active':''}" onclick="selectSchool('${esc(s.id)}')">
    <span><strong>${esc(s.name)}</strong><small>${s.active?'Active':'Inactive'} · ${count} account${count===1?'':'s'} · ${esc(s.studentJoinCode||'No student code')}</small></span>
    <i class="ti ti-chevron-right"></i>
  </button>`;
}
function schoolPickerHtml(school){
  return `<div class="school-picker-wrap">
    <span class="school-picker-label">Selected school</span>
    <button type="button" class="school-picker" onclick="toggleSchoolDropdown()" aria-expanded="${schoolManagerDropdownOpen?'true':'false'}">
      <span><strong>${esc(school.name)}</strong><small>${school.active?'Active':'Inactive'} · ${schoolAccountCount(school.id)} account${schoolAccountCount(school.id)===1?'':'s'} · ${esc(school.studentJoinCode||'No student code')}</small></span>
      <i class="ti ${schoolManagerDropdownOpen?'ti-chevron-up':'ti-chevron-down'}"></i>
    </button>
    ${schoolManagerDropdownOpen?`<div class="school-dropdown">
      ${schools.map(s=>schoolDropdownRow(s)).join('')}
    </div>`:''}
  </div>`;
}
function schoolDropdownRow(s){
  const selected=s.id===selectedSchoolId;
  const count=schoolAccountCount(s.id);
  return `<button type="button" class="school-dropdown-row${selected?' active':''}" onclick="selectSchool('${escJs(s.id)}')">
    <span><strong>${esc(s.name)}</strong><small>${s.active?'Active':'Inactive'} · ${count} account${count===1?'':'s'} · ${esc(s.studentJoinCode||'No student code')}</small></span>
    <i class="ti ${selected?'ti-check':'ti-chevron-right'}"></i>
  </button>`;
}
function toggleSchoolDropdown(){
  schoolManagerDropdownOpen=!schoolManagerDropdownOpen;
  renderSchoolManager();
}
function schoolDetailHtml(school){
  const teacherApprovalOn=school.teacherRequiresApproval!==false;
  const activeTab=['details','assets','teachers','students'].includes(schoolManagerSelectedTab)?schoolManagerSelectedTab:'details';
  return `<div class="school-detail-head">
    <div>
      <h2>${esc(school.name)}</h2>
      <div class="school-selected-domain">${esc(school.emailDomain||'No email domain set')}</div>
    </div>
    <div class="school-detail-toggles">
      <span class="school-status-pill ${school.active?'on':'off'}"><i class="ti ti-circle-check"></i>${school.active?'Active':'Inactive'}</span>
      <span class="school-status-pill ${teacherApprovalOn?'on':'off'}"><i class="ti ti-shield-check"></i>Teacher approval ${teacherApprovalOn?'on':'off'}</span>
      <div class="school-header-actions">
        <button type="button" class="school-danger-btn" onclick="deleteSelectedSchool()"><i class="ti ti-trash"></i>Delete</button>
        <button type="button" class="school-save-btn" onclick="saveSelectedSchool()"><i class="ti ti-device-floppy"></i>Save</button>
      </div>
    </div>
  </div>
  <div class="school-detail-divider"></div>
  <div class="school-tabs" role="tablist" aria-label="School sections">
    <button type="button" class="school-tab ${activeTab==='details'?'active':''}" onclick="selectSchoolManagerTab('details')"><i class="ti ti-settings-2"></i>School Details</button>
    <button type="button" class="school-tab ${activeTab==='teachers'?'active':''}" onclick="selectSchoolManagerTab('teachers')"><i class="ti ti-user-check"></i>Teachers <span>${schoolAccountCount(school.id,'teacher')}</span></button>
    <button type="button" class="school-tab ${activeTab==='students'?'active':''}" onclick="selectSchoolManagerTab('students')"><i class="ti ti-users"></i>Students <span>${schoolAccountCount(school.id,'student')}</span></button>
    <button type="button" class="school-tab ${activeTab==='assets'?'active':''}" onclick="selectSchoolManagerTab('assets')"><i class="ti ti-photo-up"></i>Exam Builder Assets</button>
  </div>
  <div class="school-tab-panel">
    ${activeTab==='details'?schoolDetailsTabHtml(school,teacherApprovalOn):activeTab==='teachers'?schoolAccountsTabHtml(school,'teacher','Teachers'):activeTab==='students'?schoolAccountsTabHtml(school,'student','Students'):schoolAssetsTabHtml(school)}
  </div>`;
}
function schoolDetailsTabHtml(school,teacherApprovalOn){
  return `<div class="school-edit-grid">
    <div class="school-detail-card">
      <h3>School Details</h3>
      <div class="school-edit-row school-edit-row-main">
        <label>School name<input id="school-edit-name" value="${esc(school.name)}"></label>
        <label>Email domain<input id="school-edit-email-domain" value="${esc(school.emailDomain||'')}" placeholder="e.g. email.vic.edu.au"></label>
      </div>
      <label class="school-switch-row">
        <span><strong>School active</strong><small>Inactive schools cannot be chosen for new work.</small></span>
        <input type="checkbox" ${school.active?'checked':''} onchange="toggleSchoolActive(this.checked)">
      </label>
    </div>
    <div class="school-detail-card">
      <h3>Join Codes</h3>
      <div class="school-edit-row school-edit-row-codes">
        <label>Teacher join code<input id="school-edit-teacher-code" value="${esc(school.teacherJoinCode||'')}" placeholder="e.g. QLT-TEACHER"></label>
        <label>Student join code<input id="school-edit-student-code" value="${esc(school.studentJoinCode||'')}" placeholder="e.g. QLT-STUDENT"></label>
      </div>
      <label class="school-switch-row">
        <span><strong>Teacher approval</strong><small>Teachers need approval before their account becomes active.</small></span>
        <input id="school-edit-teacher-approval" type="checkbox" ${teacherApprovalOn?'checked':''} onchange="toggleSchoolTeacherApproval(this.checked)">
      </label>
    </div>
  </div>`;
}
function schoolAccountsTabHtml(school,role,title){
  return `<div class="school-security-note"><i class="ti ti-shield-lock"></i><span>Passwords are never saved in this file. Use the password box only to record that a temporary password or reset should be issued through Supabase Auth.</span></div>
  ${schoolAccountsSection(school,role,title)}`;
}
function schoolAssetsTabHtml(school){
  return `<div class="school-assets-grid">
    ${schoolAssetCardHtml('logo','Cover Page',school.coverLogoData,school.coverLogoName)}
    ${schoolAssetCardHtml('footer','Footer',school.coverFooterData,school.coverFooterName)}
  </div>`;
}
function schoolAssetCardHtml(kind,title,data,name){
  const has=!!data;
  return `<div class="school-detail-card school-asset-card">
    <div class="school-asset-head">
      <div>
        <h3>${esc(title)}</h3>
        <p>${has?esc(name||'Custom image selected'):'No image uploaded yet'}</p>
      </div>
      ${has?`<button type="button" class="school-asset-remove" onclick="clearSchoolExamAsset('${kind}')" title="Remove ${esc(title)}"><i class="ti ti-x"></i></button>`:''}
    </div>
    <div class="school-asset-preview ${has?'has-image':''}">
      ${has?`<img src="${esc(data)}" alt="${esc(title)} preview">`:`<i class="ti ti-photo"></i><span>Upload PNG or JPG</span>`}
    </div>
    <div class="school-asset-actions">
      <input type="file" id="school-asset-${kind}" accept="image/png,image/jpeg" style="display:none" onchange="handleSchoolExamAssetUpload('${kind}',event)">
      <button type="button" class="school-asset-upload" onclick="document.getElementById('school-asset-${kind}').click()"><i class="ti ti-upload"></i>${has?'Replace image':'Upload image'}</button>
    </div>
  </div>`;
}
function schoolAccountsSection(school,role,title){
  const filters=schoolAccountFilters[role]||{search:'',status:'all'};
  const statusOrder={pending:0,active:1,suspended:2,archived:3};
  const rows=schoolAccounts
    .filter(a=>a.schoolId===school.id&&a.role===role)
    .sort((a,b)=>(statusOrder[a.status]??9)-(statusOrder[b.status]??9)||String(a.displayName||a.username||a.email||'').localeCompare(String(b.displayName||b.username||b.email||'')));
  return `<div class="school-accounts-section">
    <div class="school-accounts-head">
      <div class="school-panel-title">${title}</div>
      <div class="school-accounts-actions">
        <div class="school-note school-account-count">${rows.length} ${role}${rows.length===1?'':'s'}</div>
      </div>
    </div>
    <div class="school-account-filter-row">
      <input id="school-${role}-search" value="${esc(filters.search||'')}" placeholder="Search ${role}s..." oninput="setSchoolAccountFilter('${role}','search',this.value)">
      <select id="school-${role}-status-filter" onchange="setSchoolAccountFilter('${role}','status',this.value)">
        ${['all','pending','active','suspended','archived'].map(status=>`<option value="${status}" ${filters.status===status?'selected':''}>${status==='all'?'All status':status[0].toUpperCase()+status.slice(1)}</option>`).join('')}
      </select>
    </div>
    <div class="school-account-table">
      ${rows.length?rows.map(accountRowHtml).join(''):`<div class="school-empty-row">No ${role} accounts yet.</div>`}
    </div>
  </div>`;
}
function setSchoolAccountFilter(role,key,value){
  schoolAccountFilters[role]={...(schoolAccountFilters[role]||{search:'',status:'all'}),[key]:String(value||'')};
  applySchoolAccountFilters(role);
}
function applySchoolAccountFilters(role){
  const filters=schoolAccountFilters[role]||{search:'',status:'all'};
  const search=String(filters.search||'').trim().toLowerCase();
  const status=String(filters.status||'all').toLowerCase();
  document.querySelectorAll(`.school-account-row[data-role="${role}"]`).forEach(row=>{
    const rowStatus=(row.dataset.status||'').toLowerCase();
    const rowSearch=(row.dataset.search||'').toLowerCase();
    row.style.display=(!search||rowSearch.includes(search))&&(status==='all'||rowStatus===status)?'grid':'none';
  });
}
function accountRowHtml(a){
  const isPendingTeacher=a.role==='teacher'&&a.status==='pending';
  const searchable=[a.displayName,a.username,a.email,a.status].map(x=>String(x||'')).join(' ');
  return `<div class="school-account-row" data-role="${esc(a.role)}" data-status="${esc(a.status||'active')}" data-search="${esc(searchable)}">
    <input value="${esc(a.displayName)}" placeholder="Display name" onchange="updateSchoolAccount('${esc(a.id)}','displayName',this.value)">
    <input value="${esc(a.username)}" placeholder="Username" onchange="updateSchoolAccount('${esc(a.id)}','username',this.value)">
    <input value="${esc(a.email)}" placeholder="Email" onchange="updateSchoolAccount('${esc(a.id)}','email',this.value)">
    <select onchange="updateSchoolAccount('${esc(a.id)}','status',this.value)">
      ${['pending','active','suspended','archived'].map(status=>`<option value="${status}" ${a.status===status?'selected':''}>${status[0].toUpperCase()+status.slice(1)}</option>`).join('')}
    </select>
    <div class="school-password-status">${esc(a.passwordStatus||'Not set')}${a.passwordUpdatedAt?`<small>${esc(a.passwordUpdatedAt)}</small>`:''}</div>
    ${isPendingTeacher?`<button type="button" class="btn btn-sm btn-primary" onclick="approveSchoolTeacher('${esc(a.id)}')"><i class="ti ti-check"></i>Approve</button>`:`<span class="school-approve-placeholder"></span>`}
    <button type="button" class="btn btn-sm" onclick="markSchoolAccountPassword('${esc(a.id)}')"><i class="ti ti-key"></i>Reset</button>
    <button type="button" class="icon-btn" onclick="deleteSchoolAccount('${esc(a.id)}')" title="Delete account" style="color:#A32D2D"><i class="ti ti-trash"></i></button>
  </div>`;
}
async function addSchool(){
  if(currentRole!=='admin')return;
  const input=document.getElementById('school-new-name');
  const name=(input?.value||'').trim();
  if(!name){showToast('School name is required',true);return;}
  if(schools.some(s=>s.name.toLowerCase()===name.toLowerCase())){showToast('School already exists',true);return;}
  let id=schoolSlug(name),base=id,n=2;
  while(schools.some(s=>s.id===id))id=`${base}-${n++}`;
  let joinCode=normalizeSchoolJoinCode(name).slice(0,12)||id.toUpperCase();
  const joinBase=joinCode||'SCHOOL';
  let joinN=2;
  while(schools.some(s=>[s.studentJoinCode,s.teacherJoinCode].some(code=>normalizeSchoolJoinCode(code)===joinCode)))joinCode=`${joinBase}${joinN++}`;
  const school={id,name,emailDomain:'',studentJoinCode:`${joinCode}STUDENT`,teacherJoinCode:`${joinCode}TEACHER`,teacherRequiresApproval:true,active:true,createdAt:new Date().toISOString()};
  schools=normaliseSchools([...schools,school]);
  selectedSchoolId=id;
  schoolManagerSelectedTab='details';
  schoolManagerDropdownOpen=false;
  if(input)input.value='';
  syncExamSchoolOptions(name);
  saveState();
  renderSchoolManager();
  await saveSchoolToSupabase(school,false);
  showToast('School added');
}
function selectSchool(id){
  selectedSchoolId=id;
  schoolManagerSelectedTab='details';
  schoolManagerDropdownOpen=false;
  saveState();
  renderSchoolManager();
}
function selectSchoolManagerTab(tab){
  schoolManagerSelectedTab=['details','assets','teachers','students'].includes(tab)?tab:'details';
  schoolManagerDropdownOpen=false;
  renderSchoolManager();
}
function setSchoolExamAsset(kind,data,name){
  const school=selectedSchool();
  if(!school)return;
  const isLogo=kind==='logo';
  let savedSchool=null;
  schools=schools.map(s=>s.id===school.id?(savedSchool={...s,[isLogo?'coverLogoData':'coverFooterData']:data||'',[isLogo?'coverLogoName':'coverFooterName']:name||'',updatedAt:new Date().toISOString()}):s);
  saveState();
  const selectedExamSchool=(document.getElementById('exam-school-name')||{}).value||(typeof examSchoolName!=='undefined'?examSchoolName:'');
  if(savedSchool&&selectedExamSchool===savedSchool.name&&typeof applySchoolExamAssetsForExam==='function'){
    applySchoolExamAssetsForExam(false);
    if(typeof renderExam==='function')renderExam();
  }
  renderSchoolManager();
  saveSchoolToSupabase(savedSchool,true);
}
function handleSchoolExamAssetUpload(kind,event){
  const file=event&&event.target&&event.target.files&&event.target.files[0];
  if(!file)return;
  if(!/^image\/(png|jpe?g)$/i.test(file.type)){
    showToast('Please choose a PNG, JPG, or JPEG image.',true);
    event.target.value='';
    return;
  }
  const reader=new FileReader();
  reader.onload=()=>setSchoolExamAsset(kind,reader.result,file.name);
  reader.readAsDataURL(file);
}
function clearSchoolExamAsset(kind){
  setSchoolExamAsset(kind,'','');
}
async function saveSelectedSchool(){
  const school=selectedSchool();
  if(!school)return;
  const nameEl=document.getElementById('school-edit-name');
  const emailDomainEl=document.getElementById('school-edit-email-domain');
  const studentJoinCodeEl=document.getElementById('school-edit-student-code');
  const teacherJoinCodeEl=document.getElementById('school-edit-teacher-code');
  const teacherApprovalEl=document.getElementById('school-edit-teacher-approval');
  const name=(nameEl?.value??school.name??'').trim();
  const emailDomain=(emailDomainEl?.value??school.emailDomain??'').trim().toLowerCase();
  const studentJoinCode=normalizeSchoolJoinCode(studentJoinCodeEl?.value??school.studentJoinCode??'');
  const teacherJoinCode=normalizeSchoolJoinCode(teacherJoinCodeEl?.value??school.teacherJoinCode??'');
  const teacherRequiresApproval=teacherApprovalEl?teacherApprovalEl.checked:school.teacherRequiresApproval!==false;
  if(!name){showToast('School name is required',true);return;}
  if(!studentJoinCode||!teacherJoinCode){showToast('Student and teacher join codes are required',true);return;}
  if(schools.some(s=>s.id!==school.id&&s.name.toLowerCase()===name.toLowerCase())){showToast('School already exists',true);return;}
  const usedCodes=new Set(schools.filter(s=>s.id!==school.id).flatMap(s=>[s.studentJoinCode,s.teacherJoinCode].map(normalizeSchoolJoinCode).filter(Boolean)));
  if(usedCodes.has(studentJoinCode)||usedCodes.has(teacherJoinCode)||studentJoinCode===teacherJoinCode){showToast('Join codes must be unique.',true);return;}
  const oldName=school.name;
  let savedSchool=null;
  schools=schools.map(s=>s.id===school.id?(savedSchool={...s,name,emailDomain,studentJoinCode,teacherJoinCode,teacherRequiresApproval,updatedAt:new Date().toISOString()}):s);
  const examSchool=document.getElementById('exam-school-name');
  syncExamSchoolOptions(examSchool?.value===oldName?name:examSchool?.value);
  saveState();
  renderSchoolManager();
  await saveSchoolToSupabase(savedSchool,false);
  showToast('School saved');
}
async function toggleSchoolActive(active){
  const school=selectedSchool();
  if(!school)return;
  let savedSchool=null;
  schools=schools.map(s=>s.id===school.id?(savedSchool={...s,active:!!active,updatedAt:new Date().toISOString()}):s);
  syncExamSchoolOptions();
  saveState();
  renderSchoolManager();
  await saveSchoolToSupabase(savedSchool,false);
}
async function toggleSchoolTeacherApproval(required){
  const school=selectedSchool();
  if(!school)return;
  let savedSchool=null;
  schools=schools.map(s=>s.id===school.id?(savedSchool={...s,teacherRequiresApproval:!!required,updatedAt:new Date().toISOString()}):s);
  saveState();
  renderSchoolManager();
  await saveSchoolToSupabase(savedSchool,false);
}
async function deleteSelectedSchool(){
  const school=selectedSchool();
  if(!school)return;
  const count=schoolAccountCount(school.id);
  if(count){showToast('Remove or move school accounts before deleting this school',true);return;}
  if(!confirm(`Delete ${school.name}? This cannot be undone.`))return;
  schools=schools.filter(s=>s.id!==school.id);
  selectedSchoolId=schools[0]?.id||'';
  syncExamSchoolOptions();
  saveState();
  renderSchoolManager();
  await deleteSchoolFromSupabase(school.id,false);
  showToast('School deleted');
}
function updateSchoolAccount(id,key,value){
  let updated=null;
  schoolAccounts=schoolAccounts.map(a=>a.id===id?(updated={...a,[key]:String(value||'').trim(),updatedAt:new Date().toISOString()}):a);
  saveState();
  if(updated)saveSchoolMembershipToSupabase(updated,false);
}
async function approveSchoolTeacher(id){
  let updated=null;
  schoolAccounts=schoolAccounts.map(a=>a.id===id?(updated={...a,status:'active',updatedAt:new Date().toISOString()}):a);
  saveState();
  renderSchoolManager();
  if(updated){
    await saveSchoolMembershipToSupabase(updated,false);
    if(supabaseClient&&updated.userId){
      try{
        await supabaseClient.from('profiles').upsert({id:updated.userId,email:updated.email||'',username:updated.username||updated.displayName||'',role:'s_teacher',pending_school_join_code:null},{onConflict:'id'});
      }catch(e){console.warn('Could not update approved teacher profile:',e);}
    }
  }
  showToast('Teacher approved');
}
async function markSchoolAccountPassword(id){
  let updated=null;
  schoolAccounts=schoolAccounts.map(a=>a.id===id?(updated={...a,passwordStatus:'Password reset required',passwordUpdatedAt:new Date().toLocaleDateString('en-AU'),updatedAt:new Date().toISOString()}):a);
  saveState();
  renderSchoolManager();
  await saveSchoolMembershipToSupabase(updated,false);
  showToast('Password reset marked. Use Supabase Auth to issue the real reset.');
}
async function deleteSchoolAccount(id){
  const account=schoolAccounts.find(a=>a.id===id);
  if(!account)return;
  const label=account.displayName||account.username||account.email||'this account';
  if(!confirm(`Delete ${label} from this school and remove their Supabase app records?`))return;
  schoolAccounts=schoolAccounts.filter(a=>a.id!==id);
  saveState();
  renderSchoolManager();
  await deleteSchoolAccountDetailsFromSupabase(account,false);
  showToast('Account removed');
}
async function syncSchoolsToSupabase(){
  if(currentRole!=='admin')return;
  if(!supabaseClient){showToast('Supabase is not connected. Schools are saved locally only.',true);return;}
  try{
    const btn=event?.currentTarget,old=btn?.innerHTML;
    if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader"></i>Syncing...';}
    let ok=true;
    for(const school of normaliseSchools(schools))ok=(await saveSchoolToSupabase(school,true))&&ok;
    for(const account of normaliseSchoolAccounts(schoolAccounts,schools.map(s=>s.id)))ok=(await saveSchoolMembershipToSupabase(account,true))&&ok;
    if(!ok)throw new Error('One or more school records could not be saved.');
    await loadSchoolsFromSupabase(true);
    showToast('Schools synced to Supabase');
    if(btn){btn.disabled=false;btn.innerHTML=old;}
  }catch(e){
    console.warn('School sync failed:',e);
    showToast('School sync failed. Check the Supabase tables and policies.',true);
    renderSchoolManager();
  }
}
