// Question Extractor parsing, preview, metadata, and save flow.

function cleanTextToEditorHtml(text){
  if(typeof plainTextPasteHtml==='function')return plainTextPasteHtml(text);
  const safe=String(text||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  const lines=safe.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  return lines.length>1?lines.map(line=>`<div>${line||'<br>'}</div>`).join(''):lines[0];
}
function extractorPlainToHtml(text){return cleanTextToEditorHtml(text);}
function extractorTextFromHtml(html){const div=document.createElement('div');div.innerHTML=html||'';return (div.innerText||div.textContent||'').replace(/\u00a0/g,' ').trim();}
function extractorOptionLines(block){
  const lines=String(block||'').split(/\n/);
  const optionRegex=/^\s*([A-E])[\.\)]\s+(.+)$/i;
  const opts=['','','',''];
  const optionLineIndexes=[];
  lines.forEach((line,index)=>{
    const m=line.match(optionRegex);
    if(m){
      const optIndex=m[1].toUpperCase().charCodeAt(0)-65;
      if(optIndex<opts.length)opts[optIndex]=m[2].trim();
      optionLineIndexes.push(index);
    }
  });
  const questionLines=lines.filter((_,index)=>!optionLineIndexes.includes(index));
  return{questionText:questionLines.join('\n').trim(),options:opts};
}
function extractorQuestionStart(line){return /^(?:question|q)\s*\d+\b/i.test(line)||/^\d+[\.\)]\s+/i.test(line);}
function extractorQuestionNumber(block,index=0){const m=String(block||'').replace(/^[^\w\d]+/,'').match(/^(?:(?:question|q)\s*)?(\d+)[\.\)]?\b/i);return m?Number(m[1]):index+1;}
function extractorHeadingMarks(block){
  const first=String(block||'').split(/\n/)[0]||'';
  const m=first.match(/^(?:(?:question|q)\s*)?\d+[\.\)]?\s*\(\s*(\d+)\s*marks?\s*\)/i);
  return m?Number(m[1]):0;
}
function extractorStripQuestionHeading(block){
  const lines=String(block||'').split(/\n/);
  if(!lines.length)return'';
  lines[0]=lines[0].replace(/^[^\w\d]*/,'').replace(/^(?:(?:question|q)\s*)?\d+[\.\)]?\s*/i,'').replace(/^\(\s*\d+\s*marks?\s*\)\s*/i,'').trim();
  return lines.filter((line,index)=>index>0||line).join('\n').trim();
}
function extractorSplitSourceData(textOrLines){
  const lines=Array.isArray(textOrLines)?textOrLines:String(textOrLines||'').split(/\n/);
  const body=[],sources=[];
  lines.forEach(raw=>{
    const line=String(raw||'').trim();
    const m=line.match(/^(source|data)\s*:\s*(.*)$/i);
    if(m)sources.push({sourceType:m[1].toLowerCase()==='data'?'data':'source',source:m[2].trim()});
    else body.push(raw);
  });
  const first=sources[0]||null;
  return{
    text:body.join('\n').trim(),
    lines:body,
    source:first?sources.map(s=>s.source).filter(Boolean).join(' '):'',
    sourceType:first?first.sourceType:'source'
  };
}
function extractorSharedInstruction(line){return String(line||'').match(/^use\s+the\s+following(?:\s+information)?\s+to\s+answer\s+questions?\s+(\d+)(?:\s*(?:-|–|—|to|and)\s*(\d+))?/i);}
function extractorPartMatch(line){
  const m=String(line||'').match(/^\s*(?:\(([a-z])\)|([a-z])\.)(?:\s+(.+))?$/i);
  return m?{label:(m[1]||m[2]||'').toLowerCase(),text:m[3]||''}:null;
}
function extractorSubpartMatch(line){
  const roman='i|ii|iii|iv|v|vi|vii|viii|ix|x';
  const re=new RegExp(`^\\s*(?:\\((${roman})\\)|(${roman})\\.)\\s+(.+)$`,'i');
  const m=String(line||'').match(re);
  return m?{label:(m[1]||m[2]||'').toLowerCase(),text:m[3]||''}:null;
}
function extractorPartSubpartMatch(line){
  const roman='i|ii|iii|iv|v|vi|vii|viii|ix|x';
  const re=new RegExp(`^\\s*(?:\\(([a-z])\\)|([a-z])\\.)\\s+(?:\\((${roman})\\)|(${roman})\\.)\\s+(.+)$`,'i');
  const m=String(line||'').match(re);
  return m?{part:(m[1]||m[2]||'').toLowerCase(),subpart:(m[3]||m[4]||'').toLowerCase(),text:m[5]||''}:null;
}
function extractorMarksFromText(text){const m=String(text||'').match(/(?:\(\s*)?(\d+)\s*marks?(?:\s*\))?/i);return m?Number(m[1]):0;}
function extractorLinesFromText(text){const m=String(text||'').match(/(?:no\.?\s*lines?|lines?)\s*[:=]\s*(\d+)/i);return m?Number(m[1]):1;}
function extractorCleanSaerText(text){return String(text||'').replace(/(?:\(\s*)?\d+\s*marks?(?:\s*\))?/ig,'').replace(/(?:no\.?\s*lines?|lines?)\s*[:=]\s*\d+/ig,'').replace(/\s+/g,' ').trim();}
function extractorBlankSaerPart(){return{...defaultSaerPart(),marks:0,lines:1,subparts:[]};}
function extractorBlankSaerSubpart(){return{...defaultSaerSubpart(),marks:0,lines:1};}
function extractorTotalSaerMarks(parts){return(parts||[]).reduce((total,p)=>total+(Number(p.marks)||0)+(p.subparts||[]).reduce((s,sp)=>s+(Number(sp.marks)||0),0),0);}
function extractorParseSaerParts(text){
  const lines=String(text||'').split(/\n/);
  const mainLines=[],parts=[];let currentPart=null,currentSubpart=null,currentPartLabel='';
  const setItemText=item=>{item.textHtml=extractorPlainToHtml(item.text);};
  const appendLine=(item,line)=>{const clean=extractorCleanSaerText(line);if(!clean)return;item.text=[item.text,clean].filter(Boolean).join('\n');setItemText(item);};
  lines.forEach(raw=>{
    const line=String(raw||'').trim();
    if(!line)return;
    const combinedMatch=extractorPartSubpartMatch(line);
    if(combinedMatch){
      if(!currentPart||currentPartLabel!==combinedMatch.part){
        const part=extractorBlankSaerPart();
        parts.push(part);currentPart=part;currentPartLabel=combinedMatch.part;
      }
      const sp=extractorBlankSaerSubpart();
      sp.text=extractorCleanSaerText(combinedMatch.text);sp.textHtml=extractorPlainToHtml(sp.text);
      sp.marks=extractorMarksFromText(combinedMatch.text);sp.lines=extractorLinesFromText(combinedMatch.text);
      currentPart.subparts.push(sp);currentSubpart=sp;return;
    }
    const subMatch=currentPart?extractorSubpartMatch(line):null;
    if(subMatch){
      const sp=extractorBlankSaerSubpart();
      sp.text=extractorCleanSaerText(subMatch.text);sp.textHtml=extractorPlainToHtml(sp.text);
      sp.marks=extractorMarksFromText(subMatch.text);sp.lines=extractorLinesFromText(subMatch.text);
      currentPart.subparts.push(sp);currentSubpart=sp;return;
    }
    const partMatch=extractorPartMatch(line);
    if(partMatch){
      const part=extractorBlankSaerPart();
      currentPartLabel=partMatch.label;
      part.text=extractorCleanSaerText(partMatch.text);part.textHtml=extractorPlainToHtml(part.text);
      part.marks=extractorMarksFromText(partMatch.text);part.lines=extractorLinesFromText(partMatch.text);
      parts.push(part);currentPart=part;currentSubpart=null;return;
    }
    if(currentSubpart){appendLine(currentSubpart,line);return;}
    if(currentPart){appendLine(currentPart,line);return;}
    mainLines.push(line);
  });
  const mainText=mainLines.join('\n').trim();
  return{hasParts:parts.length>0,text:mainText,parts,marks:extractorTotalSaerMarks(parts)};
}
function extractorLooksLikeFrontMatter(lines){
  const head=lines.slice(0,16).join('\n').toLowerCase();
  return /\bstudent name\b|\bquestion and answer book\b|\bapproved materials\b|\bmaterials supplied\b|\breading time\b|\bwriting time\b|\binstructions\b|\bcontents\b/.test(head);
}
function extractorFilterFrontMatter(lines){
  if(!extractorLooksLikeFrontMatter(lines))return lines;
  const start=lines.findIndex(line=>extractorQuestionStart(line)||extractorSharedInstruction(line));
  return start>=0?lines.slice(start):[];
}
function extractorEndMarker(line){
  const text=String(line||'').replace(/\s+/g,' ').trim();
  return /^end\s+of\s+examination\s+questions\.?$/i.test(text)||/^end\s+of\s+question\s+and\s+answer\s+book\.?$/i.test(text);
}
function extractorCutAfterEndMarker(lines){
  const end=(lines||[]).findIndex(extractorEndMarker);
  return end>=0?lines.slice(0,end):lines;
}
function extractorIsPageFurniture(line){
  const text=String(line||'').replace(/\s+/g,' ').trim();
  if(!text)return true;
  if(/^do not write in this area\.?$/i.test(text))return true;
  if(/^page\s+\d+\s+of\s+\d+$/i.test(text))return true;
  if(/^page\s+\d+\s+of\s+\d+\s+\d{4}\s+vce\b.*$/i.test(text))return true;
  if(/^\d{4}\s+vce\b.*\bpage\s+\d+\s+of\s+\d+$/i.test(text))return true;
  if(/^section\s+[a-z]\s+\d{4}\s+vce\b.*$/i.test(text))return true;
  if(/^\d{4}\s+vce\b.*\bsection\s+[a-z]\b.*\bpage\s+\d+\s+of\s+\d+$/i.test(text))return true;
  if(/^page\s+\d+\s+of\s+\d+\s+section\s+[a-z]\s+\d{4}\s+vce\b.*$/i.test(text))return true;
  return false;
}
function extractorStripInlinePageFurniture(line){
  return String(line||'')
    .replace(/\s+\d{4}\s+vce\b[^.!?\n]*?\bsection\s+[a-z]\b[^.!?\n]*?\bpage\s+\d+\s+of\s+\d+\s*$/i,'')
    .replace(/\s+page\s+\d+\s+of\s+\d+\s+section\s+[a-z]\s+\d{4}\s+vce\b[^.!?\n]*\s*$/i,'')
    .replace(/\s+page\s+\d+\s+of\s+\d+\s+\d{4}\s+vce\b[^.!?\n]*\s*$/i,'')
    .replace(/\s+\d{4}\s+vce\b[^.!?\n]*?\bpage\s+\d+\s+of\s+\d+\s*$/i,'')
    .replace(/\s+do not write in this area\.?\s*$/i,'')
    .trim();
}
function extractorFilterPageFurniture(lines){
  return(lines||[]).map(extractorStripInlinePageFurniture).filter(line=>!extractorIsPageFurniture(line));
}
function parseExtractorStandaloneBlock(block,index){
    const start=block.match(/^(?:question\s*)?(\d+)[\.\)]?\s*(.*)$/i);
    const detectedNumber=extractorQuestionNumber(block,index);
    const headingMarks=extractorHeadingMarks(block);
    const isWrittenByHeading=headingMarks>0;
    const cleanedBlock=extractorStripQuestionHeading(block);
    const sourceSplit=extractorSplitSourceData(cleanedBlock);
    const parsed=isWrittenByHeading?{questionText:sourceSplit.text,options:['','','','']}:extractorOptionLines(sourceSplit.text);
    const hasMcq=!isWrittenByHeading&&parsed.options.filter(Boolean).length>=2;
    const saerSplit=isWrittenByHeading?extractorParseSaerParts(sourceSplit.text):null;
    const textPart=(hasMcq?parsed.questionText:(saerSplit?.hasParts?saerSplit.text:sourceSplit.text)).trim();
    const type=isWrittenByHeading?'sa':'mc';
    const marks=type==='mc'?1:(saerSplit?.marks||headingMarks||1);
    return{
      selected:true,
      type,
      template:hasMcq&&sourceSplit.source?'diagram':'standard',
      bank:'private',
      marks,
      questionNumber:detectedNumber,
      subject:document.getElementById('exam-subject')?.value||'General Mathematics',
      topic:'',
      yearLevels:['7'],
      difficulty:'Easy',
      calculator:'Calculator',
      author:'Original',
      date:new Date().getFullYear(),
      text:textPart,
      parts:saerSplit?.hasParts?saerSplit.parts:[],
      source:sourceSplit.source,
      sourceType:sourceSplit.sourceType,
      correct:null,
      options:hasMcq?parsed.options:['','','','']
    };
}
function parseExtractorMultipleBlock(instruction,statementLines,subBlocks,index){
  const firstNum=extractorQuestionNumber(subBlocks[0],index+1);
  const statementSource=extractorSplitSourceData(statementLines);
  const subQuestions=subBlocks.map((block,si)=>{
    const parsed=parseExtractorStandaloneBlock(block,firstNum+si);
    return{question:parsed.text,questionHtml:extractorPlainToHtml(parsed.text),source:parsed.source||'',sourceType:parsed.sourceType||'source',options:parsed.options,optionsHtml:parsed.options.map(extractorPlainToHtml),correct:null,optionTemplate:'standard',solution:'',solutionHtml:'',responsePercent:0,response:0,attemptCount:0,correctCount:0,difficulty:'Easy'};
  }).filter(sq=>sq.question||sq.options.some(Boolean));
  if(subQuestions.length<2)return null;
  return{selected:true,type:'mc',template:'multiple',bank:'private',marks:subQuestions.length,questionNumber:firstNum,subject:document.getElementById('exam-subject')?.value||'General Mathematics',topic:'',yearLevels:['7'],difficulty:'Easy',calculator:'Calculator',author:'Original',date:new Date().getFullYear(),text:statementSource.text,source:statementSource.source,sourceType:statementSource.sourceType,multiInstruction:instruction,subQuestions,options:['','','','']};
}
function cleanExtractorDuplicateSharedStatements(candidates){
  const norm=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
  const grouped=(candidates||[]).filter(q=>q.template==='multiple'&&q.subQuestions?.length);
  if(!grouped.length)return candidates;
  return candidates.filter(q=>{
    if(q.template==='multiple'&&q.subQuestions?.length)return true;
    const text=norm(q.text);
    if(!text)return q.options?.some(Boolean);
    return !grouped.some(group=>{
      const statement=norm(group.text),instruction=norm(group.multiInstruction);
      return (statement&&text===statement)||(instruction&&text===instruction)||(instruction&&statement&&text===norm(`${group.multiInstruction} ${group.text}`));
    });
  });
}
function parseExtractorQuestions(text){
  const clean=String(text||'').replace(/\r/g,'').replace(/\t/g,' ').replace(/\u00a0/g,' ').trim();
  if(!clean)return[];
  const rawLines=clean.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const lines=extractorFilterPageFurniture(extractorFilterFrontMatter(extractorCutAfterEndMarker(rawLines)));
  const candidates=[];
  let i=0,standaloneIndex=0;
  while(i<lines.length){
    const shared=extractorSharedInstruction(lines[i]);
    if(shared){
      const instructionMatch=String(shared[0]||'').trim();
      const instruction=/[.!?]$/.test(instructionMatch)?instructionMatch:`${instructionMatch}.`;
      const trailingStatement=String(lines[i]||'').slice(String(shared[0]||'').length).replace(/^\s*[.:;-]?\s*/,'').trim();
      const rangeEnd=shared[2]?Number(shared[2]):null,statementLines=trailingStatement?[trailingStatement]:[],subBlocks=[];
      i++;
      while(i<lines.length&&!extractorQuestionStart(lines[i])&&!extractorSharedInstruction(lines[i])){statementLines.push(lines[i]);i++;}
      while(i<lines.length&&!extractorSharedInstruction(lines[i])){
        if(!extractorQuestionStart(lines[i])){i++;continue;}
        const blockLines=[lines[i++]];
        while(i<lines.length&&!extractorQuestionStart(lines[i])&&!extractorSharedInstruction(lines[i])){blockLines.push(lines[i]);i++;}
        const qn=extractorQuestionNumber(blockLines.join('\n'),subBlocks.length+1);
        if(rangeEnd&&qn>rangeEnd){i-=blockLines.length;break;}
        subBlocks.push(blockLines.join('\n'));
        if(rangeEnd&&qn>=rangeEnd)break;
      }
      const multiple=parseExtractorMultipleBlock(instruction,statementLines,subBlocks,candidates.length);
      if(multiple){candidates.push(multiple);continue;}
      const fallback=[instruction,...statementLines,...subBlocks].join('\n');
      if(fallback.trim())candidates.push(parseExtractorStandaloneBlock(fallback,standaloneIndex++));
      continue;
    }
    const blockLines=[];
    if(extractorQuestionStart(lines[i])){
      blockLines.push(lines[i++]);
      while(i<lines.length&&!extractorQuestionStart(lines[i])&&!extractorSharedInstruction(lines[i])){blockLines.push(lines[i]);i++;}
    }else{
      blockLines.push(lines[i++]);
      while(i<lines.length&&!extractorQuestionStart(lines[i])&&!extractorSharedInstruction(lines[i])){blockLines.push(lines[i]);i++;}
    }
    const candidate=parseExtractorStandaloneBlock(blockLines.join('\n'),standaloneIndex++);
    if(candidate.text||candidate.options.some(Boolean))candidates.push(candidate);
  }
  return cleanExtractorDuplicateSharedStatements(candidates.filter(q=>q&&(q.text||q.options.some(Boolean)||q.subQuestions?.length)));
}
function parseExtractorFromText(){
  const text=document.getElementById('extractor-text')?.value||'';
  const global=extractorGlobalMeta();
  extractorCandidates=parseExtractorQuestions(text).map(q=>extractorApplyGlobalDefaults(q,global));
  renderExtractorPreview();
}
function extractorCorrectOptionRows(cardIndex,opts,correct,namePrefix='extractor-correct'){
  const selected=Number.isInteger(Number(correct))?Number(correct):null;
  return[0,1,2,3].map(oi=>`<label class="extractor-option-choice" style="display:grid;grid-template-columns:22px 28px minmax(0,1fr);gap:7px;align-items:center;margin:0;padding:5px 8px;border-radius:var(--border-radius-sm)">
    <input type="radio" name="${namePrefix}-${cardIndex}" value="${oi}" ${selected===oi?'checked':''}>
    <strong style="font-family:Arial,sans-serif;color:var(--color-text-primary)">${String.fromCharCode(65+oi)}.</strong>
    <input id="extractor-opt-${cardIndex}-${oi}" placeholder="Option ${String.fromCharCode(65+oi)}" value="${esc((opts||[])[oi]||'')}">
  </label>`).join('');
}
function extractorMultipleQuestionPreview(q,cardIndex){
  if(!(q.template==='multiple'&&q.subQuestions?.length))return'';
  const start=Number(q.questionNumber)||1;
  return`<div style="margin-top:8px;border-top:0.5px solid var(--color-border-tertiary);padding-top:8px">${q.subQuestions.map((sq,si)=>{const selected=Number.isInteger(Number(sq.correct))?Number(sq.correct):null;return`<div style="margin-bottom:10px"><div style="font:700 13px Arial,sans-serif;margin-bottom:4px;color:var(--color-text-primary)">Question ${start+si}</div><textarea id="extractor-sub-question-${cardIndex}-${si}" placeholder="Question text" style="margin-bottom:5px">${esc(sq.question||'')}</textarea><div style="display:grid;gap:5px">${[0,1,2,3].map(oi=>`<label class="extractor-option-choice" style="display:grid;grid-template-columns:22px 28px minmax(0,1fr);gap:7px;align-items:center;margin:0;padding:5px 8px;border-radius:var(--border-radius-sm)"><input type="radio" name="extractor-sub-correct-${cardIndex}-${si}" value="${oi}" ${selected===oi?'checked':''}><strong style="font-family:Arial,sans-serif;color:var(--color-text-primary)">${String.fromCharCode(65+oi)}.</strong><input class="extractor-sub-option-input" id="extractor-sub-opt-${cardIndex}-${si}-${oi}" placeholder="Option ${String.fromCharCode(65+oi)}" value="${esc((sq.options||[])[oi]||'')}"></label>`).join('')}</div></div>`;}).join('')}</div>`;
}
function extractorSaerPartsPreview(q){
  const parts=normaliseSaerParts(q.parts||[]);
  if(!parts.length)return'';
  const subCount=parts.reduce((sum,p)=>sum+(p.subparts||[]).length,0);
  const marks=extractorTotalSaerMarks(parts);
  const meta=item=>[Number(item.marks)?`${Number(item.marks)} mark${Number(item.marks)===1?'':'s'}`:'',Number(item.lines)?`${Number(item.lines)} line${Number(item.lines)===1?'':'s'}`:''].filter(Boolean).join(', ');
  const roman=['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
  const rows=parts.map((p,pi)=>{
    const partMeta=meta(p),partLabel=String.fromCharCode(97+pi)+'.';
    const subRows=(p.subparts||[]).map((sp,si)=>{
      const subMeta=meta(sp),subLabel=(roman[si]||`${si+1}`)+'.';
      return`<div style="display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:8px;align-items:start;padding:4px 0 4px 28px;border-top:0.5px solid var(--color-border-tertiary)">
        <div style="font:700 13px Arial,sans-serif;color:var(--color-text-primary)">${esc(subLabel)}</div>
        <div style="font:13px/1.35 'Times New Roman',Times,serif;color:var(--color-text-primary);white-space:pre-wrap">${esc(sp.text||'')}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">${esc(subMeta)}</div>
      </div>`;
    }).join('');
    return`<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);background:#fff;margin-top:6px;overflow:hidden">
      <div style="display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:8px;align-items:start;padding:7px 8px;background:#fafafa">
        <div style="font:700 13px Arial,sans-serif;color:var(--color-text-primary)">${esc(partLabel)}</div>
        <div style="font:13px/1.35 'Times New Roman',Times,serif;color:var(--color-text-primary);white-space:pre-wrap">${esc(p.text||'')}</div>
        <div style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">${esc(partMeta)}</div>
      </div>
      ${subRows}
    </div>`;
  }).join('');
  return`<div class="extractor-note"><strong>Detected SA/ER parts:</strong> ${parts.length} part${parts.length===1?'':'s'}${subCount?`, ${subCount} subpart${subCount===1?'':'s'}`:''}${marks?`, ${marks} mark${marks===1?'':'s'}`:''}. This will save into the Parts/Subparts structure.</div><div style="margin-top:6px">${rows}</div>`;
}
function extractorDifficultyFromResponse(value){
  const raw=String(value??'').trim();
  if(raw==='')return 'Easy';
  const pct=clampResponsePercent(raw);
  if(pct>=80)return 'Easy';
  if(pct>=60)return 'Medium';
  if(pct>=40)return 'Hard';
  if(pct>=20)return 'Advance';
  return 'Extension';
}
function extractorSplitMulti(value){
  if(Array.isArray(value))return value.map(v=>String(v).trim()).filter(Boolean);
  return String(value||'').split(',').map(v=>v.trim()).filter(Boolean);
}
function extractorJoinMulti(values){
  return [...new Set(extractorSplitMulti(values))].join(', ');
}
function extractorHierarchyContext(field,selected){
  const globalSubject=extractorMultiValues('extractor-global-subject');
  const globalYears=normalizeYearLevels(extractorMultiValues('extractor-global-year-level'));
  const globalTopics=extractorMultiValues('extractor-global-topic');
  const globalSubtopics=extractorMultiValues('extractor-global-subtopic');
  const globalSkills=extractorMultiValues('extractor-global-skills');
  return {
    subjects:field==='subject'?extractorSplitMulti(selected):globalSubject,
    yearLevels:field==='yearLevels'?normalizeYearLevels(selected):globalYears,
    topics:field==='topic'?extractorSplitMulti(selected):globalTopics,
    subtopics:field==='subtopic'?extractorSplitMulti(selected):globalSubtopics,
    skills:field==='skills'?extractorSplitMulti(selected):globalSkills
  };
}
function extractorMultiValues(id){
  const menu=document.getElementById(`${id}-menu`);
  if(!menu)return [];
  return [...menu.querySelectorAll('input[type=checkbox]:checked')].map(cb=>cb.value).filter(Boolean);
}
function setExtractorMultiValues(id,values){
  const selected=extractorSplitMulti(values);
  const menu=document.getElementById(`${id}-menu`);
  if(!menu)return;
  selected.forEach(v=>{
    if(![...menu.querySelectorAll('input[type=checkbox]')].some(cb=>cb.value===v)){
      menu.insertAdjacentHTML('afterbegin',`<label class="multi-select-option"><input type="checkbox" value="${esc(v)}" onchange="updateExtractorMultiButton(this.closest('.extractor-multiselect'))"> <span>${esc(v)}</span></label>`);
    }
  });
  menu.querySelectorAll('input[type=checkbox]').forEach(cb=>{cb.checked=selected.includes(cb.value);});
  updateExtractorMultiButton(menu.closest('.extractor-multiselect'));
}
function extractorCardIndexFromId(id){
  const match=String(id||'').match(/^extractor-(?:topic|subtopic|skills|year-level)-(\d+)$/);
  return match?Number(match[1]):-1;
}
function extractorControlHierarchyContext(id,field,selected,initialContext=null){
  if(initialContext)return initialContext;
  if(String(id||'').startsWith('extractor-global-'))return extractorHierarchyContext(field,selected);
  const index=extractorCardIndexFromId(id);
  return{
    subjects:extractorMultiValues('extractor-global-subject'),
    yearLevels:field==='yearLevels'?normalizeYearLevels(selected):normalizeYearLevels(index>=0?extractorMultiValues(`extractor-year-level-${index}`):[]),
    topics:field==='topic'?extractorSplitMulti(selected):(index>=0?extractorMultiValues(`extractor-topic-${index}`):[]),
    subtopics:field==='subtopic'?extractorSplitMulti(selected):(index>=0?extractorMultiValues(`extractor-subtopic-${index}`):[]),
    skills:field==='skills'?extractorSplitMulti(selected):(index>=0?extractorMultiValues(`extractor-skills-${index}`):[])
  };
}
function syncExtractorMultiOptions(id,field,selected){
  const menu=document.getElementById(`${id}-menu`);
  if(!menu)return;
  menu.innerHTML=extractorMultiOptions(field,selected,id);
  updateExtractorMultiButton(menu.closest('.extractor-multiselect'));
}
function extractorMultiOptions(field,selected,id='',initialContext=null){
  const current=extractorSplitMulti(selected);
  const context=extractorControlHierarchyContext(id,field,current,initialContext);
  const hierarchy=field==='topic'?curriculumOptionValues('topics',context):field==='subtopic'?curriculumOptionValues('subtopics',context):field==='skills'?curriculumOptionValues('skills',context):[];
  const base=field==='subject'?examSubjectValues():(field==='yearLevels'?curriculumYearLevelValues():hierarchy);
  const values=[...base];
  if(field==='yearLevels')current.forEach(v=>{if(!values.includes(v))values.unshift(v);});
  const checkedCurrent=['subject','yearLevels'].includes(field)?current:current.filter(value=>values.includes(value));
  return values.length?values.map(v=>`<label class="multi-select-option"><input type="checkbox" value="${esc(v)}" ${checkedCurrent.includes(v)?'checked':''} onchange="updateExtractorMultiButton(this.closest('.extractor-multiselect'))"> <span>${esc(v)}</span></label>`).join(''):`<div class="multi-select-option" style="cursor:default;color:var(--color-text-tertiary)">No options yet</div>`;
}
function extractorMultiSelect(id,field,selected,placeholder,initialContext=null){
  const label=extractorJoinMulti(selected)||placeholder;
  return `<div class="year-multiselect extractor-multiselect" id="${id}-wrap"><button type="button" class="multi-select-button" id="${id}-button" onclick="toggleExtractorMultiMenu(event,'${id}')" title="${esc(label)}">${esc(label)}</button><div class="multi-select-menu" id="${id}-menu">${extractorMultiOptions(field,selected,id,initialContext)}</div></div>`;
}
function updateExtractorMultiButton(wrap){
  if(!wrap)return;
  const id=wrap.id.replace(/-wrap$/,'');
  const button=document.getElementById(`${id}-button`);
  const values=extractorMultiValues(id);
  const fallback=id.includes('subject')?'General Mathematics':id.includes('topic')&&!id.includes('subtopic')?'Topic':id.includes('subtopic')?'Subtopic':id.includes('skills')?'Skills':'7';
  const label=extractorJoinMulti(values)||fallback;
  if(button){button.textContent=label;button.title=label;}
  if(id.startsWith('extractor-global-')){
    const field=id.replace('extractor-global-','').replace('year-level','yearLevels');
    if(['subject','yearLevels','topic','subtopic','skills'].includes(field))refreshExtractorGlobalHierarchyMenus(field);
    syncExtractorGlobalMetaToCards(field);
  }else{
    const field=id.includes('topic-')&&!id.includes('subtopic-')?'topic':id.includes('subtopic-')?'subtopic':id.includes('skills-')?'skills':id.includes('year-level-')?'yearLevels':'';
    if(field)refreshExtractorCardHierarchyMenus(id,field);
  }
}
let suppressExtractorHierarchyRefresh=false;
function refreshExtractorGlobalHierarchyMenus(changedField){
  if(suppressExtractorHierarchyRefresh)return;
  const fields=changedField==='topic'?['subtopic','skills','subject','yearLevels']:changedField==='subtopic'?['skills','subject','yearLevels']:changedField==='skills'?['subject','yearLevels']:[];
  suppressExtractorHierarchyRefresh=true;
  fields.forEach(field=>{
    const id=`extractor-global-${field==='yearLevels'?'year-level':field}`;
    const selectedSkills=extractorMultiValues('extractor-global-skills');
    const current=extractorMultiValues(id);
    const linked=selectedSkills.length&&(field==='subject'||field==='yearLevels')?curriculumLinkedValuesFromHighestSkill(field==='subject'?'subjects':'year-level',{skills:selectedSkills,topics:extractorMultiValues('extractor-global-topic'),subtopics:extractorMultiValues('extractor-global-subtopic')}):[];
    const selected=changedField==='skills'&&(field==='subject'||field==='yearLevels')?[...linked]:[...new Set([...current,...linked])];
    syncExtractorMultiOptions(id,field,selected);
  });
  suppressExtractorHierarchyRefresh=false;
}function refreshExtractorCardHierarchyMenus(changedId,changedField){
  if(suppressExtractorHierarchyRefresh)return;
  const index=extractorCardIndexFromId(changedId);
  if(index<0)return;
  const fields=changedField==='topic'?['subtopic','skills','yearLevels']:changedField==='subtopic'?['skills','yearLevels']:changedField==='skills'?['yearLevels']:[];
  suppressExtractorHierarchyRefresh=true;
  fields.forEach(field=>{
    const id=`extractor-${field==='yearLevels'?'year-level':field}-${index}`;
    const selectedSkills=extractorMultiValues(`extractor-skills-${index}`);
    const current=extractorMultiValues(id);
    const linked=selectedSkills.length&&field==='yearLevels'?curriculumLinkedValuesFromHighestSkill('year-level',{skills:selectedSkills,topics:extractorMultiValues(`extractor-topic-${index}`),subtopics:extractorMultiValues(`extractor-subtopic-${index}`)}):[];
    const selected=changedField==='skills'&&field==='yearLevels'?[...linked]:[...new Set([...current,...linked])];
    syncExtractorMultiOptions(id,field,selected);
  });
  suppressExtractorHierarchyRefresh=false;
}
function positionExtractorMultiMenu(id){
  const wrap=document.getElementById(`${id}-wrap`),menu=document.getElementById(`${id}-menu`);
  if(!wrap||!menu)return;
  wrap.classList.remove('open-up');
  const rect=wrap.getBoundingClientRect();
  const below=window.innerHeight-rect.bottom;
  const above=rect.top;
  const menuHeight=Math.min(menu.scrollHeight||190,190);
  if(below<menuHeight+8&&above>below)wrap.classList.add('open-up');
}
function toggleExtractorMultiMenu(event,id){
  event?.stopPropagation?.();
  document.querySelectorAll('.extractor-multiselect.open').forEach(wrap=>{if(wrap.id!==`${id}-wrap`)wrap.classList.remove('open','open-up');});
  const wrap=document.getElementById(`${id}-wrap`);
  if(!wrap)return;
  wrap.classList.toggle('open');
  if(wrap.classList.contains('open'))positionExtractorMultiMenu(id);
}
function extractorGlobalMeta(){
  const value=id=>document.getElementById(id)?.value||'';
  const year=Number(value('extractor-global-year'))||new Date().getFullYear();
  return{
    bank:value('extractor-global-bank')||'private',
    author:value('extractor-global-author')||'Original',
    calculator:value('extractor-global-calculator')||'Calculator',
    date:year,
    yearLevels:normalizeYearLevels(extractorMultiValues('extractor-global-year-level')),
    subject:extractorJoinMulti(extractorMultiValues('extractor-global-subject'))||currentExamSubject()||'General Mathematics',
    topic:extractorJoinMulti(extractorMultiValues('extractor-global-topic')),
    subtopic:extractorJoinMulti(extractorMultiValues('extractor-global-subtopic')),
    skills:extractorJoinMulti(extractorMultiValues('extractor-global-skills'))
  };
}
function extractorApplyGlobalDefaults(q,global=extractorGlobalMeta()){
  const years=normalizeYearLevels(q.yearLevels||q.yearLevel||global.yearLevels||['7']);
  return{...q,bank:q.bank||global.bank,author:q.author||global.author,calculator:q.calculator||global.calculator,date:q.date||global.date||new Date().getFullYear(),subject:q.subject||global.subject,topic:q.topic||global.topic||'',subtopic:q.subtopic||global.subtopic||'',skills:q.skills||global.skills||'',yearLevels:years.length?years:global.yearLevels,difficulty:q.responsePercent!==undefined&&String(q.responsePercent).trim()!==''?extractorDifficultyFromResponse(q.responsePercent):(q.difficulty||'Easy')};
}
function syncExtractorGlobalMetaToCards(field){
  const global=extractorGlobalMeta();
  const map={subject:'subject',topic:'topic',subtopic:'subtopic',skills:'skills',yearLevels:'yearLevels'};
  const key=map[field];
  if(!key)return;
  extractorCandidates.forEach((q,i)=>{
    if(key==='yearLevels'){
      setExtractorMultiValues(`extractor-year-level-${i}`,global.yearLevels||['7']);
      q.yearLevels=global.yearLevels||['7'];
      q.yearLevel=q.yearLevels;
      return;
    }
    setExtractorMultiValues(`extractor-${key}-${i}`,global[key]||'');
    q[key]=global[key]||'';
  });
}
function renderExtractorPreview(){
  const el=document.getElementById('extractor-preview'),count=document.getElementById('extractor-count');
  if(count){
    if(extractorCandidates.length){
      const mcqCount=extractorCandidates.reduce((sum,q)=>sum+(q.type==='mc'?(q.template==='multiple'&&q.subQuestions?.length?q.subQuestions.length:1):0),0);
      const saerCount=extractorCandidates.reduce((sum,q)=>sum+((q.type==='sa'||q.type==='er')?1:0),0);
      count.textContent=`${mcqCount} - MCQ & ${saerCount} - SA/ER`;
    }else count.textContent='No questions detected yet';
  }
  if(!el)return;
  if(!extractorCandidates.length){el.innerHTML=`<div class="empty-state"><i class="ti ti-file-search"></i><div>Paste or upload a document to start</div></div>`;return;}
  const typeOptions=[['mc','MCQ'],['tf','T/F'],['sa','SA'],['er','ER']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  const bankOptions=[['private','Private Bank'],['brainforge','Quero Bank'],['vcaa','VCAA Bank'],['global','Live Quiz Bank']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  el.innerHTML=extractorCandidates.map((q,i)=>`<div class="extractor-card" data-extractor-index="${i}">
    <div class="extractor-card-top"><label style="display:flex;align-items:center;gap:7px;margin:0"><input type="checkbox" id="extractor-sel-${i}" ${q.selected?'checked':''}> <span class="extractor-card-title">${q.template==='multiple'?'Multiple-template group':`Detected Question ${q.questionNumber||i+1}`}</span></label><span style="font-size:12px;color:var(--color-text-secondary)">Q${esc(q.questionNumber||i+1)}${q.subQuestions?.length?` - ${Number(q.questionNumber||1)+q.subQuestions.length-1}`:''}</span></div>
    ${q.template==='multiple'&&q.subQuestions?.length?`<label style="display:block;margin:0 0 4px;font-size:12px;color:var(--color-text-secondary)">Instruction</label><input id="extractor-instruction-${i}" value="${esc(q.multiInstruction||multipleInstructionText(q.subQuestions.length))}" style="width:100%;height:34px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);padding:6px 8px;font-size:13px;background:#fff;margin-bottom:8px"><label style="display:block;margin:0 0 4px;font-size:12px;color:var(--color-text-secondary)">Statement text</label>`:''}
    <textarea id="extractor-text-${i}" placeholder="${q.template==='multiple'&&q.subQuestions?.length?'Statement text':'Question text'}">${esc(q.text||'')}</textarea>
    ${q.template==='multiple'?'':extractorSaerPartsPreview(q)}
    ${q.template==='multiple'&&q.subQuestions?.length?`<div class="extractor-note"><strong>Grouped internal questions:</strong> ${q.subQuestions.length}. This will save as one MCQ Multiple-template question.</div>${extractorMultipleQuestionPreview(q,i)}`:''}
    <div class="extractor-option-grid" id="extractor-options-${i}" style="${(q.type==='mc'||q.type==='tf')&&q.template!=='multiple'?'':'display:none'}">${extractorCorrectOptionRows(i,q.options||[],q.correct)}</div>
    <div class="extractor-meta-grid">
      <select id="extractor-type-${i}" title="Question Type" onchange="document.getElementById('extractor-options-${i}').style.display=(this.value==='mc'||this.value==='tf')?'grid':'none'">${typeOptions.replace(`value="${q.type}"`,`value="${q.type}" selected`)}</select>
      <input id="extractor-response-${i}" type="number" min="0" max="100" step="1" value="${esc(q.responsePercent??q.response??'')}" placeholder="Performance (%)" title="Performance (%)">
      <input id="extractor-marks-${i}" type="number" min="0" value="${esc(q.marks||1)}" title="Marks">
      <input id="extractor-qnum-${i}" type="number" min="1" value="${esc(q.questionNumber||i+1)}" title="Question Number">
      ${(()=>{const meta=extractorGlobalMeta(),topic=q.topic||meta.topic||'',subtopic=q.subtopic||meta.subtopic||'',skills=q.skills||meta.skills||'',years=normalizeYearLevels(q.yearLevels||meta.yearLevels||['7']);const ctx={subjects:extractorSplitMulti(q.subject||meta.subject||''),yearLevels:years,topics:extractorSplitMulti(topic),subtopics:extractorSplitMulti(subtopic),skills:extractorSplitMulti(skills)};return `${extractorMultiSelect(`extractor-topic-${i}`,'topic',topic,'Topic',ctx)}${extractorMultiSelect(`extractor-subtopic-${i}`,'subtopic',subtopic,'Subtopic',ctx)}${extractorMultiSelect(`extractor-skills-${i}`,'skills',skills,'Skills',ctx)}${extractorMultiSelect(`extractor-year-level-${i}`,'yearLevels',years,'7',ctx)}`;})()}
    </div>
  </div>`).join('');
}
function unselectExtractorQuestions(){
  extractorCandidates=readExtractorCandidatesFromDom().map(q=>({...q,selected:false}));
  renderExtractorPreview();
}
function readExtractorCandidatesFromDom(){
  const global=extractorGlobalMeta();
  return extractorCandidates.map((q,i)=>{
    const type=document.getElementById(`extractor-type-${i}`)?.value||q.type||'sa';
    const opts=[0,1,2,3].map(oi=>document.getElementById(`extractor-opt-${i}-${oi}`)?.value||'');
    const years=normalizeYearLevels(extractorMultiValues(`extractor-year-level-${i}`).length?extractorMultiValues(`extractor-year-level-${i}`):global.yearLevels||['7']);
    const correctRadio=document.querySelector(`input[name="extractor-correct-${i}"]:checked`);
    const responseRaw=document.getElementById(`extractor-response-${i}`)?.value??'';
    const responsePercent=String(responseRaw).trim()===''?'':clampResponsePercent(responseRaw);
    const subQuestions=(q.subQuestions||[]).map((sq,si)=>{const r=document.querySelector(`input[name="extractor-sub-correct-${i}-${si}"]:checked`),subText=document.getElementById(`extractor-sub-question-${i}-${si}`)?.value??sq.question??'',subOpts=[0,1,2,3].map(oi=>document.getElementById(`extractor-sub-opt-${i}-${si}-${oi}`)?.value||'');return{...sq,question:subText,questionHtml:extractorPlainToHtml(subText),options:subOpts,optionsHtml:subOpts.map(extractorPlainToHtml),correct:r?Number(r.value):sq.correct,responsePercent,response:responsePercent,difficulty:extractorDifficultyFromResponse(responseRaw)};});
    const item={...q,selected:!!document.getElementById(`extractor-sel-${i}`)?.checked,type,bank:global.bank,marks:Number(document.getElementById(`extractor-marks-${i}`)?.value)||1,questionNumber:Number(document.getElementById(`extractor-qnum-${i}`)?.value)||i+1,subject:global.subject,subjects:global.subject,topic:extractorJoinMulti(extractorMultiValues(`extractor-topic-${i}`))||global.topic||'',subtopic:extractorJoinMulti(extractorMultiValues(`extractor-subtopic-${i}`))||global.subtopic||'',skills:extractorJoinMulti(extractorMultiValues(`extractor-skills-${i}`))||global.skills||'',yearLevels:years,author:global.author,date:global.date||new Date().getFullYear(),calculator:global.calculator,responsePercent,response:responsePercent,difficulty:extractorDifficultyFromResponse(responseRaw),text:document.getElementById(`extractor-text-${i}`)?.value||'',multiInstruction:document.getElementById(`extractor-instruction-${i}`)?.value||q.multiInstruction,options:opts,correct:correctRadio?Number(correctRadio.value):q.correct,subQuestions};
    if(typeof applyCurriculumLinkedMeta==='function')applyCurriculumLinkedMeta(item);
    return item;
  });
}
function extractorCandidateToQuestion(item){
  const years=normalizeYearLevels(item.yearLevels||['7']);
  const text=item.text||'';
  const type=item.type||'sa';
  const isMultiple=type==='mc'&&item.template==='multiple'&&Array.isArray(item.subQuestions)&&item.subQuestions.length;
  const source=item.source||'',sourceType=item.sourceType||'source';
  const template=isMultiple?'multiple':(type==='mc'&&source?'diagram':(type==='mc'?(item.template||'standard'):'standard'));
  const parsedParts=type==='sa'||type==='er'?normaliseSaerParts(item.parts||[]):[],partMarks=extractorTotalSaerMarks(parsedParts);
  const q={id:nextId++,type,template,optionTemplate:'standard',text,textHtml:extractorPlainToHtml(text),options:isMultiple?['','','','']:(item.options||['','','','']),optionsHtml:isMultiple?['','','','']:(item.options||['','','','']).map(extractorPlainToHtml),correct:Number.isInteger(Number(item.correct))?Number(item.correct):0,marks:isMultiple?item.subQuestions.length:(partMarks||Number(item.marks)||1),bank:item.bank||'private',subject:item.subject||'General Mathematics',subjects:item.subject||'General Mathematics',topic:item.topic||'',topics:item.topic||'',subtopic:item.subtopic||'',subtopics:item.subtopic||'',skills:item.skills||'',yearLevels:years,yearLevel:years,yearFrom:years[0],yearTo:years[years.length-1]||years[0],year:years.join(', '),mainArea:item.subject||'General Mathematics',difficulty:item.difficulty||'Easy',calculator:item.calculator||'Calculator',author:item.author||'Original',date:item.date||new Date().getFullYear(),questionNumber:Number(item.questionNumber)||1,responsePercent:Number(item.responsePercent??item.response)||0,response:Number(item.responsePercent??item.response)||0,attemptCount:0,correctCount:0,reviewStatus:'Draft',reviewedBy:'',reviewedby:'',comments:'',solution:'',solutionHtml:'',parts:parsedParts,source,sourceType,extraBlocks:source?[{imageData:'',imageName:'',diagramSolutionImageData:'',diagramSolutionImageName:'',source,sourceType,afterText:'',afterTextHtml:''}]:[]};
  if(isMultiple){q.multiInstruction=item.multiInstruction||multipleInstructionText(item.subQuestions.length);q.subQuestions=item.subQuestions.map((sq,si)=>{const sqSource=sq.source||'',sqSourceType=sq.sourceType||'source';return{question:sq.question||'',questionHtml:sq.questionHtml||extractorPlainToHtml(sq.question||''),source:sqSource,sourceType:sqSourceType,extraBlocks:sqSource?[{imageData:'',imageName:'',diagramSolutionImageData:'',diagramSolutionImageName:'',source:sqSource,sourceType:sqSourceType,afterText:'',afterTextHtml:''}]:[],options:sq.options||['','','',''],optionsHtml:(sq.optionsHtml&&sq.optionsHtml.length?sq.optionsHtml:(sq.options||['','','','']).map(extractorPlainToHtml)),correct:Number.isInteger(Number(sq.correct))?Number(sq.correct):0,optionTemplate:sq.optionTemplate||'standard',solution:sq.solution||'',solutionHtml:sq.solutionHtml||'',responsePercent:Number(sq.responsePercent??sq.response)||0,response:Number(sq.responsePercent??sq.response)||0,attemptCount:Number(sq.attemptCount)||0,correctCount:Number(sq.correctCount)||0,difficulty:sq.difficulty||item.difficulty||'Easy'};});}
  if(type==='tf'){q.options=['True','False','',''];q.optionsHtml=['True','False','',''];q.correct=0;}
  if(typeof applyCurriculumLinkedMeta==='function')applyCurriculumLinkedMeta(q);
  return safeNormalizeQuestion(q);
}
async function saveExtractorQuestions(){
  if(currentRole!=='admin'){showToast('Admin access only',true);return;}
  extractorCandidates=readExtractorCandidatesFromDom();
  const selected=extractorCandidates.filter(q=>q.selected&&(q.text||q.options.some(Boolean)||q.subQuestions?.length||q.parts?.length));
  if(!selected.length){showToast('Select at least one detected question',true);return;}
  let saved=0,onlineFailed=0;
  for(const item of selected){
    let q=extractorCandidateToQuestion(item);
    try{q=await saveQuestionToSupabase(q);}catch(e){onlineFailed++;console.error('Extractor Supabase save failed:',e);}
    questions.push(q);saved++;
  }
  saveState();renderBank();renderAddQList();updateStats();
  showToast(onlineFailed?`Saved ${saved} question${saved!==1?'s':''} locally; ${onlineFailed} Supabase save failed`:`Saved ${saved} question${saved!==1?'s':''} to the bank`,!!onlineFailed);
}
async function handleExtractorFile(event){
  const file=event.target.files&&event.target.files[0];if(!file)return;
  const name=(file.name||'').toLowerCase();
  try{
    if(name.endsWith('.txt')){document.getElementById('extractor-text').value=await file.text();parseExtractorFromText();return;}
    if(name.endsWith('.docx')){
      if(typeof JSZip==='undefined'){showToast('DOCX reader is not ready. Refresh and try again.',true);return;}
      const zip=await JSZip.loadAsync(await file.arrayBuffer());
      const docFile=zip.file('word/document.xml');
      if(!docFile){showToast('Could not find document text in this DOCX',true);return;}
      const xml=await docFile.async('string');
      const doc=new DOMParser().parseFromString(xml,'application/xml');
      const paras=Array.from(doc.getElementsByTagName('w:p')).map(p=>Array.from(p.getElementsByTagName('w:t')).map(t=>t.textContent).join('')).filter(Boolean);
      document.getElementById('extractor-text').value=paras.join('\n');
      parseExtractorFromText();return;
    }
    if(name.endsWith('.pdf')){showToast('PDF upload needs a PDF text parser. For now, copy text from the PDF and paste it here.',true);return;}
    showToast('Use a TXT or DOCX file, or paste text directly',true);
  }catch(e){console.error('Extractor file read failed:',e);showToast('Could not read this file',true);}
  finally{event.target.value='';}
}
function clearExtractor(){
  const t=document.getElementById('extractor-text');if(t)t.value='';
  extractorCandidates=[];renderExtractorPreview();
}
function escJs(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r?\n/g,' ');}
function normalizeLearningAreaName(value){return String(value||'Mathematics').replace(/\s+/g,' ').trim()||'Mathematics';}
function hiddenLearningAreaSet(){return new Set((deletedLearningAreas||[]).map(normalizeLearningAreaName).filter(Boolean));}
function normalizeLearningAreaSubjects(value){
  const result={},hidden=hiddenLearningAreaSet();
  Object.entries(DEFAULT_LEARNING_AREA_SUBJECTS).forEach(([area,subjects])=>{const key=normalizeLearningAreaName(area);if(!hidden.has(key))result[key]=subjects.map(normalizeSubjectName).filter(Boolean);});
  if(value&&typeof value==='object')Object.entries(value).forEach(([area,subjects])=>{const key=normalizeLearningAreaName(area);if(!hidden.has(key))setLearningAreaSubjectList(key,subjects,result);});
  return result;
}
function ensureLearningAreaSubjectRecord(area){
  const key=normalizeLearningAreaName(area);
  if(!learningAreaSubjects||typeof learningAreaSubjects!=='object')learningAreaSubjects={};
  if(!Array.isArray(learningAreaSubjects[key])){
    const defaults=DEFAULT_LEARNING_AREA_SUBJECTS[key]||[];
    const linked=[];
    CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===key)(link.subjects||[]).forEach(subject=>linked.push(subject));});
    learningAreaSubjects[key]=[...new Set([...defaults,...linked].map(normalizeSubjectName).filter(Boolean))];
  }
  return learningAreaSubjects[key];
}
function setLearningAreaSubjectList(area,subjects,target=learningAreaSubjects){
  const key=normalizeLearningAreaName(area);
  target[key]=[...new Set((Array.isArray(subjects)?subjects:[]).map(normalizeSubjectName).filter(Boolean))];
  return target[key];
}
function normalizeLearningAreaYearLevels(value){
  const result={Mathematics:[...YEAR_LEVEL_OPTIONS]};
  if(value&&typeof value==='object')Object.entries(value).forEach(([area,years])=>{setLearningAreaYearLevelList(area,years,result);});
  return result;
}
function ensureLearningAreaYearLevelRecord(area){
  const key=normalizeLearningAreaName(area);
  if(!learningAreaYearLevels||typeof learningAreaYearLevels!=='object')learningAreaYearLevels={};
  if(!Array.isArray(learningAreaYearLevels[key])){
    const source=key==='Mathematics'?YEAR_LEVEL_OPTIONS:ensureLearningAreaYearLevelRecord('Mathematics');
    const linked=[];
    CURRICULUM_SKILL_LINKS.forEach(link=>{if(normalizeLearningAreaName(link.learningArea||'Mathematics')===key)(link.yearLevels||[]).forEach(year=>linked.push(year));});
    learningAreaYearLevels[key]=[...new Set([...source,...linked].map(normalizeYearLevelName).filter(Boolean))];
  }
  return learningAreaYearLevels[key];
}
function setLearningAreaYearLevelList(area,years,target=learningAreaYearLevels){
  const key=normalizeLearningAreaName(area);
  target[key]=[...new Set((Array.isArray(years)?years:[]).map(normalizeYearLevelName).filter(Boolean))];
  return target[key];
}
function subjectRowsFromLearningAreas(withArea=true){
  const rows=[];
  curriculumLearningAreas().forEach(area=>ensureLearningAreaSubjectRecord(area).forEach(name=>rows.push(withArea?{learning_area:area,name}:{name})));
  const seen=new Set();
  return rows.filter(row=>{const key=withArea?`${row.learning_area}||${row.name}`:row.name;if(seen.has(key))return false;seen.add(key);return true;});
}
function yearRowsFromLearningAreas(withArea=true){
  const rows=[];
  curriculumLearningAreas().forEach(area=>ensureLearningAreaYearLevelRecord(area).forEach(name=>rows.push(withArea?{learning_area:area,name}:{name})));
  const seen=new Set();
  return rows.filter(row=>{const key=withArea?`${row.learning_area}||${row.name}`:row.name;if(seen.has(key))return false;seen.add(key);return true;});
}
function curriculumLearningAreas(){
  const hidden=hiddenLearningAreaSet();
  const values=[...new Set([...customLearningAreas,...Object.keys(learningAreaSubjects||{}),...CURRICULUM_SKILL_LINKS.map(l=>normalizeLearningAreaName(l.learningArea||'Mathematics'))].map(normalizeLearningAreaName).filter(area=>area&&!hidden.has(area)))];
  const order=new Map(customLearningAreas.map((area,index)=>[normalizeLearningAreaName(area),index]));
  return values.sort((a,b)=>(order.has(a)?order.get(a):9999)-(order.has(b)?order.get(b):9999)||a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
}
function activeCurriculumLearningArea(){
  const current=normalizeLearningAreaName(curriculumManagerState.learningArea||'Mathematics');
  const areas=curriculumLearningAreas();
  return areas.includes(current)?current:(areas[0]||'Mathematics');
}
function curriculumLinksForArea(area=activeCurriculumLearningArea()){
  const active=normalizeLearningAreaName(area);
  return CURRICULUM_SKILL_LINKS.filter(l=>normalizeLearningAreaName(l.learningArea||'Mathematics')===active);
}
