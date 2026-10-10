// Quero Practice: assigned classroom practice player.
(function(){
  const LETTERS = ['A','B','C','D'];
  const PRACTICE_DIAGRAM_IMAGE_SCALE = 0.35;
  const practiceState = {
    open:false,
    submitted:false,
    classIndex:null,
    termKey:'',
    taskId:'',
    cls:null,
    task:null,
    studentKey:'',
    studentName:'',
    questions:[],
    currentIndex:0,
    zoom:100,
    startedAt:0,
    answers:{},
    optionOrders:{},
    reviewMode:false,
    reviewAttempt:null
  };

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch=>({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function jsEsc(value){
    return String(value == null ? '' : value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }

  function values(value,field=''){
    if(Array.isArray(value)) return value.map(item=>String(item || '').trim()).filter(Boolean);
    const text = String(value || '').trim();
    if(!text) return [];
    if(text.startsWith('[')){
      try{
        const parsed = JSON.parse(text);
        if(Array.isArray(parsed)) return parsed.map(item=>String(item || '').trim()).filter(Boolean);
      }catch(err){}
    }
    if(typeof splitCreatorMultiValue === 'function'){
      try{ return splitCreatorMultiValue(text,field).filter(Boolean); }catch(err){}
    }
    return text.split(/[,;]/).map(item=>item.trim()).filter(Boolean);
  }

  function same(a,b){
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function matchesTaskSelection(questionValue,selection,field){
    const selected = values(selection);
    return !selected.length || values(questionValue,field).some(item=>selected.some(value=>same(item,value)));
  }

  function questionYearLevels(q){
    const raw = q.yearLevels || q.yearLevel || q.year_levels || q.year_level || q.yearFrom || q.year || q?.data?.yearLevels || q?.data?.yearLevel || '';
    if(typeof normalizeYearLevels === 'function'){
      try{ return normalizeYearLevels(raw); }catch(err){}
    }
    return values(raw,'yearLevels');
  }

  function questionMatches(q,filters){
    if(!q || q.deletedAt) return false;
    if(!['mc','tf'].includes(String(q.type || ''))) return false;
    if(filters.subject && !values(q.subjects || q.subject || q.mainArea,'subjects').some(item=>same(item,filters.subject))) return false;
    if(filters.yearLevel && !questionYearLevels(q).some(item=>same(item,filters.yearLevel))) return false;
    if(!matchesTaskSelection(q.topics || q.topic,filters.topic,'topics')) return false;
    if(!matchesTaskSelection(q.subtopics || q.subtopic,filters.subtopic,'subtopics')) return false;
    if(!matchesTaskSelection(q.skills,filters.skill,'skills')) return false;
    return true;
  }

  function correctIndex(q){
    const raw = q.correctIndex ?? q.correct ?? q.answerIndex ?? q.answer;
    if(typeof raw === 'number') return Math.max(0,Math.min(3,raw));
    const text = String(raw ?? '').trim().toUpperCase();
    if(/^[A-D]$/.test(text)) return text.charCodeAt(0)-65;
    const n = parseInt(text,10);
    return Number.isFinite(n) ? Math.max(0,Math.min(3,n-1)) : null;
  }

  function imageHtml(data,name,cls='quero-practice-diagram'){
    return data ? `<img class="${cls}" src="${data}" alt="${esc(name || 'Question image')}">` : '';
  }

  function textHtml(html,text){
    return html || esc(text || '');
  }

  function questionText(q){
    return textHtml(q.textHtml || q.questionHtml || q.questionTextHtml, q.text || q.question || q.questionText || '');
  }

  function legacyImage(item,suffix=''){
    return { data:item[`imageData${suffix}`] || item[`diagramData${suffix}`] || item[`image${suffix}`] || '', name:item[`imageName${suffix}`] || item[`diagramName${suffix}`] || '' };
  }

  function contentHtml(item){
    let html = '';
    const blocks = Array.isArray(item.contentBlocks) ? item.contentBlocks : Array.isArray(item.blocks) ? item.blocks : [];
    if(blocks.length){
      blocks.forEach(block=>{
        html += imageHtml(block.imageData || block.diagramData || block.data || '', block.imageName || block.diagramName || block.name || '');
        const after = textHtml(block.afterTextHtml, block.afterText);
        if(after) html += `<div class="quero-practice-question-text">${after}</div>`;
      });
      return html;
    }
    const first = legacyImage(item);
    html += imageHtml(first.data,first.name);
    const after = textHtml(item.afterTextHtml,item.afterText);
    if(after) html += `<div class="quero-practice-question-text">${after}</div>`;
    const second = legacyImage(item,'2');
    html += imageHtml(second.data,second.name);
    const after2 = textHtml(item.afterText2Html,item.afterText2);
    if(after2) html += `<div class="quero-practice-question-text">${after2}</div>`;
    return html;
  }

  function optionData(q){
    const optionTemplate = q.optionTemplate || 'standard';
    const texts = q.options || ['','','',''];
    const htmls = q.optionsHtml || [];
    const images = q.optionImages || [];
    return [0,1,2,3].map(index=>({
      originalIndex:index,
      html: htmls[index] || esc(texts[index] || ''),
      text: texts[index] || '',
      image: images[index] || {},
      template: optionTemplate
    }));
  }

  function optionOrder(key,count){
    if(Array.isArray(practiceState.optionOrders[key])) return practiceState.optionOrders[key];
    const order = Array.from({length:count},(_,index)=>index);
    for(let i=order.length-1;i>0;i--){
      const j = Math.floor(Math.random() * (i + 1));
      [order[i],order[j]] = [order[j],order[i]];
    }
    practiceState.optionOrders[key] = order;
    return order;
  }

  function optionBody(option){
    const img = option.image?.data ? imageHtml(option.image.data,option.image.name,'quero-practice-option-image') : '';
    if(option.template === 'diagram2' || option.template === 'diagram') return img || `<span>${esc(option.image?.name || option.text || '')}</span>`;
    if(option.template === 'diagram1') return `<div class="quero-practice-option-hybrid">${option.html ? `<div>${option.html}</div>` : ''}${img}</div>`;
    return option.html || '&nbsp;';
  }

  function multipleInstruction(q,startNumber,countOverride){
    const count = countOverride || q.subQuestions?.length || 1;
    if(typeof multipleInstructionRange === 'function'){
      try{ return multipleInstructionRange(startNumber,count); }catch(err){}
    }
    if(count === 2) return `Use the following information to answer Questions ${startNumber} and ${startNumber + 1}.`;
    return `Use the following information to answer Questions ${startNumber} - ${startNumber + count - 1}.`;
  }

  function totalQuestionCount(items){
    return items.reduce((sum,item)=>sum + (item.questionCount || 1),0);
  }

  function flattenQuestions(task,cls){
    const filters = {
      subject: cls?.subject || '',
      yearLevel: cls?.yearLevel || '',
      topic: task?.topic || '',
      subtopic: task?.subtopic || '',
      skill: task?.skill || ''
    };
    const source = (typeof questions !== 'undefined' && Array.isArray(questions)) ? questions : [];
    const limit = Math.max(1,Number(task?.questionCount) || 10);
    const out = [];
    source.filter(q=>questionMatches(q,filters)).sort((a,b)=>(Number(a.questionNumber)||0)-(Number(b.questionNumber)||0)).forEach((q,index)=>{
      const used = totalQuestionCount(out);
      if(used >= limit) return;
      if(q.type === 'mc' && q.template === 'multiple' && Array.isArray(q.subQuestions) && q.subQuestions.length){
        const parentStart = used + 1;
        const remaining = limit - used;
        const subQuestions = q.subQuestions.slice(0,remaining);
        const items = subQuestions.map((sq,subIndex)=>({
          id:`${q.id || index}-sub-${subIndex}`,
          parent:q,
          q:sq,
          number:parentStart + subIndex,
          shared:true,
          subIndex,
          parentStart,
          parentEnd: parentStart + subQuestions.length - 1
        }));
        if(items.length){
          out.push({ id:`${q.id || index}-multiple`, parent:q, q, number:parentStart, questionCount:items.length, multiple:true, items, parentStart, parentEnd:parentStart + items.length - 1 });
        }
      }else{
        out.push({ id:`${q.id || index}`, parent:null, q, number:used + 1, questionCount:1, multiple:false, shared:false, subIndex:0 });
      }
    });
    return out;
  }

  function answerItems(){
    return practiceState.questions.flatMap(item=>item.multiple ? item.items : [item]);
  }

  function pageAnswerItems(item){
    if(!item) return [];
    return item.multiple ? item.items : [item];
  }

  function pageHasAllAnswers(item){
    const items = pageAnswerItems(item);
    return items.length > 0 && items.every(answerItem=>practiceState.answers[answerItem.id] !== undefined);
  }

  function renderOptions(item){
    const answer = practiceState.answers[item.id];
    const q = item.q;
    const correct = correctIndex(q);
    const submitted = practiceState.submitted;
    const ordered = optionOrder(item.id,4).map((originalIndex,displayIndex)=>({
      ...optionData(q)[originalIndex],
      displayLetter: LETTERS[displayIndex]
    }));
    return `<div class="quero-practice-options">
      ${ordered.map(option=>{
      const selected = answer === option.originalIndex;
      const isCorrect = submitted && correct === option.originalIndex;
      const isWrong = submitted && selected && correct !== option.originalIndex;
      const showCorrectAnswer = submitted && answer !== undefined && correct !== null && answer !== correct && correct === option.originalIndex;
      const feedback = selected && submitted && correct !== null
        ? `<span class="quero-practice-option-feedback ${isCorrect ? 'right' : 'wrong'}"><i class="ti ${isCorrect ? 'ti-check' : 'ti-x'}"></i></span>`
        : '';
      return `<button type="button" class="quero-practice-option ${selected ? 'selected' : ''} ${isCorrect ? 'right' : ''} ${isWrong ? 'wrong' : ''} ${showCorrectAnswer ? 'correct-answer' : ''}" ${submitted ? 'disabled' : ''} onclick="selectQueroPracticeAnswer('${jsEsc(item.id)}',${option.originalIndex})">
        <span class="quero-practice-option-letter">${option.displayLetter}.</span>
        <span class="quero-practice-option-body">${optionBody(option)}</span>
        ${feedback}
      </button>`;
    }).join('')}
  </div>`;
  }

  function renderQuestionHead(item){
    const answer = practiceState.answers[item.id];
    const correct = correctIndex(item.q);
    const submitted = practiceState.submitted;
    return `<div class="quero-practice-question-head">
      <h2>Question ${item.number}</h2>
      ${submitted && correct !== null ? `<span class="quero-practice-review-pill ${answer === correct ? 'right' : 'wrong'}">${answer === correct ? 'Correct' : 'Review'}</span>` : ''}
    </div>`;
  }

  function renderQuestionBody(item){
    const q = item.q;
    return `<div class="quero-practice-question-text">${textHtml(q.questionHtml || q.textHtml, q.question || q.text || '') || questionText(q)}</div>
      ${contentHtml(q)}
      ${renderOptions(item)}`;
  }

  function renderMultipleQuestion(page){
    const parent = page.parent;
    return `<article class="quero-practice-question-card quero-practice-multiple-card">
      <div class="quero-practice-shared">
        <div class="quero-practice-multiple-instruction">${esc(multipleInstruction(parent,page.parentStart || page.number,page.items.length))}</div>
        <div class="quero-practice-question-text">${questionText(parent)}</div>
        ${contentHtml(parent)}
      </div>
      <div class="quero-practice-internal-stack">
        ${page.items.map(item=>`<section class="quero-practice-internal-question">
          ${renderQuestionHead(item)}
          ${renderQuestionBody(item)}
        </section>`).join('')}
      </div>
    </article>`;
  }

  function renderQuestion(item){
    if(item.multiple) return renderMultipleQuestion(item);
    return `<article class="quero-practice-question-card">
      ${renderQuestionHead(item)}
      ${renderQuestionBody(item)}
    </article>`;
  }

  function score(){
    const marked = answerItems().filter(item=>correctIndex(item.q) !== null);
    const attempted = marked.filter(item=>practiceState.answers[item.id] !== undefined);
    const correct = attempted.filter(item=>practiceState.answers[item.id] === correctIndex(item.q)).length;
    const total = attempted.length;
    return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
  }

  function renderProgressLabel(current,total){
    if(!current || !total) return 'Question 0 of 0';
    if(current.multiple){
      return current.parentStart === current.parentEnd ? `Question ${current.parentStart} of ${total}` : `Questions ${current.parentStart}-${current.parentEnd} of ${total}`;
    }
    return `Question ${current.number} of ${total}`;
  }

  function render(){
    const root = document.getElementById('quero-practice-root');
    if(!root || !practiceState.open) return;
    const items = answerItems();
    const answered = items.filter(item=>practiceState.answers[item.id] !== undefined).length;
    const total = items.length;
    const pageTotal = practiceState.questions.length;
    practiceState.currentIndex = Math.max(0,Math.min(practiceState.currentIndex,pageTotal ? pageTotal - 1 : 0));
    const current = practiceState.questions[practiceState.currentIndex];
    const allAnswered = total > 0 && answered >= total;
    const currentAnswered = pageHasAllAnswers(current);
    const isLast = practiceState.currentIndex >= pageTotal - 1;
    const result = practiceState.submitted ? score() : null;
    const zoom = Math.max(70,Math.min(150,Number(practiceState.zoom) || 100));
    root.innerHTML = `<section class="quero-practice-screen">
      <header class="quero-practice-topbar">
        <button type="button" class="quero-practice-icon-btn" onclick="closeQueroPractice()" title="Close"><i class="ti ti-x"></i></button>
        <div class="quero-practice-title">
          <h1>${esc(practiceState.task?.title || 'Quero Practice')}</h1>
         <p>${esc([practiceState.cls?.name,([practiceState.task?.skill,practiceState.task?.subtopic,practiceState.task?.topic].map(value=>values(value)).find(items=>items.length)||[]).join(', ')].filter(Boolean).join(' - '))}</p>
        </div>
        <div class="quero-practice-status">
          ${practiceState.submitted ? `<strong>${result.percent}%</strong><span>${result.correct} of ${result.total}</span>` : `<strong>${answered}/${total}</strong><span>answered</span>`}
        </div>
        <div class="quero-practice-zoom-controls" aria-label="Zoom controls">
          <button type="button" onclick="setQueroPracticeZoom(-10)" title="Zoom out" ${zoom <= 70 ? 'disabled' : ''}>-</button>
          <span>${zoom}%</span>
          <button type="button" onclick="setQueroPracticeZoom(10)" title="Zoom in" ${zoom >= 150 ? 'disabled' : ''}>+</button>
        </div>
        <button type="button" class="quero-practice-icon-btn" onclick="toggleQueroPracticeFullscreen()" title="Fullscreen"><i class="ti ti-arrows-maximize"></i></button>
      </header>
      <main class="quero-practice-main">
        <div class="quero-practice-question-scale" style="zoom:${zoom / 100};">
          ${current ? renderQuestion(current) : `<div class="quero-practice-empty"><h2>No questions found</h2><p>This assignment does not have matching questions yet.</p></div>`}
        </div>
      </main>
      <footer class="quero-practice-footer">
        <button type="button" onclick="queroPracticePrevious()" ${practiceState.currentIndex <= 0 ? 'disabled' : ''}><i class="ti ti-chevron-left"></i><span>Previous</span></button>
        <div class="quero-practice-progress-label">${renderProgressLabel(current,total)}</div>
        <div class="quero-practice-nav-actions">
          ${practiceState.submitted
            ? (isLast ? `<button type="button" onclick="closeQueroPractice()">Done</button>` : `<button type="button" onclick="queroPracticeNext()"><span>Next</span><i class="ti ti-chevron-right"></i></button>`)
            : isLast
              ? `<button type="button" class="primary" onclick="submitQueroPractice()" ${!allAnswered ? 'disabled' : ''}>Submit</button>`
              : `<button type="button" onclick="queroPracticeNext()" ${!currentAnswered ? 'disabled' : ''}><span>Next</span><i class="ti ti-chevron-right"></i></button>`}
        </div>
      </footer>
    </section>`;
    try{ if(typeof renderKatexIn === 'function') renderKatexIn(root); }catch(err){}
    applyPracticeImageScale(root);
  }

  function applyPracticeImageScale(root){
    root.querySelectorAll('img.quero-practice-diagram,img.quero-practice-option-image').forEach(img=>{
      const apply = ()=>{
        if(!img.naturalWidth) return;
        img.style.width = `${Math.max(1,Math.round(img.naturalWidth * PRACTICE_DIAGRAM_IMAGE_SCALE))}px`;
        img.style.height = 'auto';
        img.style.maxWidth = '100%';
      };
      if(img.complete) apply();
      else img.addEventListener('load',apply,{ once:true });
    });
  }

  function practiceScrollSnapshot(){
    const scroller = document.querySelector('#quero-practice-root .quero-practice-main');
    return scroller ? { top: scroller.scrollTop || 0, left: scroller.scrollLeft || 0 } : { top:0, left:0 };
  }

  function restorePracticeScrollSnapshot(snapshot){
    const restore = ()=>{
      const scroller = document.querySelector('#quero-practice-root .quero-practice-main');
      if(!scroller) return;
      scroller.scrollTop = snapshot?.top || 0;
      scroller.scrollLeft = snapshot?.left || 0;
    };
    restore();
    requestAnimationFrame(restore);
    setTimeout(restore,0);
  }

  function renderPreservingPracticeScroll(){
    const snapshot = practiceScrollSnapshot();
    render();
    restorePracticeScrollSnapshot(snapshot);
  }

  function ensureRoot(){
    let root = document.getElementById('quero-practice-root');
    if(root) return root;
    root = document.createElement('div');
    root.id = 'quero-practice-root';
    document.body.appendChild(root);
    return root;
  }

  window.openQueroPracticeAssignment = async function openQueroPracticeAssignment({ classIndex, termKey, taskId, cls, task, studentKey, studentName }){
    Object.assign(practiceState,{
      open:true,
      submitted:false,
      classIndex,
      termKey,
      taskId,
      cls,
      task,
      studentKey: studentKey || '',
      studentName: studentName || '',
      questions: flattenQuestions(task,cls),
      currentIndex:0,
      zoom:100,
      startedAt:Date.now(),
      answers:{},
      optionOrders:{},
      reviewMode:false,
      reviewAttempt:null
    });
    const root = ensureRoot();
    root.hidden = false;
    document.body.classList.add('quero-practice-active');
    render();
  };

  window.toggleQueroPracticeFullscreen = async function toggleQueroPracticeFullscreen(){
    const screen = document.querySelector('#quero-practice-root .quero-practice-screen');
    if(!screen) return;
    try{
      if(document.fullscreenElement){
        await document.exitFullscreen();
      }else if(screen.requestFullscreen){
        await screen.requestFullscreen();
      }
    }catch(err){
      console.warn('Could not toggle Quero Practice fullscreen',err);
    }
  };

  window.setQueroPracticeZoom = function setQueroPracticeZoom(delta){
    practiceState.zoom = Math.max(70,Math.min(150,(Number(practiceState.zoom) || 100) + delta));
    renderPreservingPracticeScroll();
  };

  window.selectQueroPracticeAnswer = function selectQueroPracticeAnswer(key,index){
    if(practiceState.submitted) return;
    practiceState.answers[key] = index;
    renderPreservingPracticeScroll();
  };

  window.queroPracticePrevious = function queroPracticePrevious(){
    practiceState.currentIndex = Math.max(0,practiceState.currentIndex - 1);
    render();
  };

  window.queroPracticeNext = function queroPracticeNext(){
    const current = practiceState.questions[practiceState.currentIndex];
    if(!practiceState.submitted && !pageHasAllAnswers(current)) return;
    practiceState.currentIndex = Math.min(Math.max(0,practiceState.questions.length - 1),practiceState.currentIndex + 1);
    render();
  };

  window.submitQueroPractice = async function submitQueroPractice(){
    if(practiceState.submitted) return;
    const result = score();
    result.durationMs = Math.max(0, Date.now() - (Number(practiceState.startedAt) || Date.now()));
    result.answers = { ...practiceState.answers };
    result.questions = answerItems().map(item=>({ id:item.id, number:item.number, correctIndex:correctIndex(item.q), selectedIndex:practiceState.answers[item.id] }));
    result.optionOrders = JSON.parse(JSON.stringify(practiceState.optionOrders || {}));
    practiceState.submitted = true;
    let trackerSaveResult = null;
    if(typeof saveHomePracticeAttemptResult === 'function' && practiceState.classIndex !== null){
      trackerSaveResult = await saveHomePracticeAttemptResult(practiceState.classIndex, practiceState.termKey, practiceState.taskId, practiceState.studentKey, result);
    }else if(typeof saveHomeTrackerResult === 'function' && practiceState.classIndex !== null){
      await saveHomeTrackerResult(practiceState.classIndex, practiceState.termKey, practiceState.taskId, practiceState.studentKey, `${result.percent}%`);
    }
    if(window.QueroClassroomSupabase?.savePracticeAttempt && trackerSaveResult?.saveDetailed !== false){
      try{
        await window.QueroClassroomSupabase.savePracticeAttempt(practiceState.cls, practiceState.taskId, practiceState.studentKey, {
          termKey: practiceState.termKey,
          studentName: practiceState.studentName,
          scorePercent: result.percent,
          correctCount: result.correct,
          totalCount: result.total,
          attemptNumber: trackerSaveResult?.attemptNumber || 0,
          recordType: trackerSaveResult?.recordType || 'detail',
          durationMs: result.durationMs,
          answers: result.answers,
          questions: result.questions,
          optionOrders: result.optionOrders
        });
      }catch(err){ console.warn('Could not save Quero Practice attempt',err); }
    }else if(window.QueroClassroomSupabase?.cleanupPracticeAttempts && trackerSaveResult?.saveDetailed === false){
      try{
        await window.QueroClassroomSupabase.cleanupPracticeAttempts(practiceState.cls, practiceState.taskId, practiceState.studentKey);
      }catch(err){ console.warn('Could not clean up Quero Practice attempts',err); }
    }
    renderPreservingPracticeScroll();
  };

  window.openQueroPracticeReview = function openQueroPracticeReview({ classIndex, termKey, taskId, cls, task, studentKey, studentName, attempt }){
    const answers = attempt?.answers || attempt?.data?.answers || {};
    const optionOrders = attempt?.optionOrders || attempt?.data?.optionOrders || {};
    Object.assign(practiceState,{
      open:true,
      submitted:true,
      classIndex,
      termKey,
      taskId,
      cls,
      task,
      studentKey: studentKey || '',
      studentName: studentName || '',
      questions: flattenQuestions(task,cls),
      currentIndex:0,
      zoom:100,
      startedAt:0,
      answers:{ ...answers },
      optionOrders:{ ...optionOrders },
      reviewMode:true,
      reviewAttempt:attempt || null
    });
    const root = ensureRoot();
    root.hidden = false;
    document.body.classList.add('quero-practice-active');
    render();
  };

  window.closeQueroPractice = async function closeQueroPractice(){
    const root = document.getElementById('quero-practice-root');
    if(document.fullscreenElement && root?.contains(document.fullscreenElement)){
      try{ await document.exitFullscreen(); }catch(err){}
    }
    practiceState.open = false;
    if(root){ root.hidden = true; root.innerHTML = ''; }
    document.body.classList.remove('quero-practice-active');
    if(typeof renderHomePagePreservingScroll === 'function') renderHomePagePreservingScroll();
    else if(typeof renderHomePage === 'function') renderHomePage();
  };
})();
