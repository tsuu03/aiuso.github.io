(() => {
  const $ = q => document.querySelector(q);
  const clone = v => JSON.parse(JSON.stringify(v));
  const api = window.NOVEL_API;
  let state = clone(window.SITE_DATA);
  let activeSection = 'basic';
  let saveTimer = null;
  let publishTimer = null;
  let dirty = false;

  const sections = {
    basic:'기본 정보', story:'작품 소개', characters:'등장인물', world:'세계관', episodes:'회차', notice:'소식'
  };

  function show(id){ ['setup-screen','login-screen','denied-screen','studio'].forEach(x=>$('#'+x).classList.toggle('hidden',x!==id)); }
  function status(text, error=false){ const el=$('#save-status'); el.textContent=text; el.style.color=error?'#a65757':'#78838d'; }
  function field(label, path, value='', type='text', full=false){
    const cls=`field${full?' full':''}`;
    if(type==='textarea') return `<label class="${cls}"><span>${label}</span><textarea data-path="${path}">${esc(value)}</textarea></label>`;
    return `<label class="${cls}"><span>${label}</span><input data-path="${path}" type="${type}" value="${attr(value)}"></label>`;
  }
  function esc(s=''){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
  function attr(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function csv(v){return Array.isArray(v)?v.join(', '):''}
  function toList(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean)}
  function idFromName(name='item'){return name.toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-|-$/g,'')||`item-${Date.now()}`}

  function renderBasic(){
    $('#section-basic').innerHTML=`<div class="panel"><h2>작품 기본 정보</h2><div class="field-grid">
      ${field('작품 제목','meta.title',state.meta.title)}${field('짧은 제목','meta.shortTitle',state.meta.shortTitle)}
      ${field('상단 장르 문구','meta.eyebrow',state.meta.eyebrow,'text',true)}${field('한 줄 콘셉트','meta.tagline',state.meta.tagline,'textarea',true)}
      ${field('연재 상태','meta.status',state.meta.status)}${field('예상 분량','meta.plannedEpisodes',state.meta.plannedEpisodes)}
      ${field('배경','meta.setting',state.meta.setting,'text',true)}${field('저작권 문구','meta.copyright',state.meta.copyright,'text',true)}
      ${field('키워드 (쉼표 구분)','keywords',csv(state.keywords),'text',true)}
    </div></div><div class="panel"><h2>연재 링크</h2><div class="field-grid">${(state.links||[]).map((l,i)=>field(`플랫폼 ${i+1} 이름`,`links.${i}.label`,l.label)+field(`플랫폼 ${i+1} 주소`,`links.${i}.url`,l.url)).join('')}</div></div>`;
  }

  function renderStory(){ $('#section-story').innerHTML=`<div class="panel"><h2>독자용 작품 소개</h2><div class="field-grid">${field('첫 소개 문장','intro.lead',state.intro.lead,'textarea',true)}${field('본문 소개','intro.body',state.intro.body,'textarea',true)}${field('분위기 메모','intro.note',state.intro.note,'textarea',true)}</div></div>`; }

  function renderCharacters(){
    $('#section-characters').innerHTML=`<div class="panel"><h2>등장인물</h2><div class="repeat-list">${(state.characters||[]).map((c,i)=>`<div class="item-card"><div class="item-head"><strong>${esc(c.name||`인물 ${i+1}`)}</strong><div class="mini-actions"><button class="mini-button danger" data-remove="characters" data-index="${i}">삭제</button></div></div><div class="field-grid">
      ${field('이름',`characters.${i}.name`,c.name)}${field('ID',`characters.${i}.id`,c.id)}${field('일본어 이름',`characters.${i}.jp`,c.jp)}${field('영문 이름',`characters.${i}.roman`,c.roman)}${field('역할',`characters.${i}.role`,c.role)}${field('포인트 색상',`characters.${i}.color`,c.color,'color')}${field('대표 글자',`characters.${i}.initial`,c.initial)}${field('스포일러 표시 (true/false)',`characters.${i}.spoiler`,String(Boolean(c.spoiler)))}${field('공개 소개',`characters.${i}.summary`,c.summary,'textarea',true)}${field('프로필 항목 (쉼표 구분)',`characters.${i}.facts`,csv(c.facts),'text',true)}${field('대표 대사',`characters.${i}.quote`,c.quote,'textarea',true)}
      </div></div>`).join('')}</div><button class="add-button" data-add="characters">+ 등장인물 추가</button></div>`;
  }

  function renderWorld(){ $('#section-world').innerHTML=`<div class="panel"><h2>세계관 / 장소</h2><div class="repeat-list">${(state.world||[]).map((w,i)=>`<div class="item-card"><div class="item-head"><strong>${esc(w.title||`설정 ${i+1}`)}</strong><button class="mini-button danger" data-remove="world" data-index="${i}">삭제</button></div><div class="field-grid">${field('아이콘',`world.${i}.icon`,w.icon)}${field('제목',`world.${i}.title`,w.title)}${field('부제',`world.${i}.subtitle`,w.subtitle,'text',true)}${field('설명',`world.${i}.text`,w.text,'textarea',true)}${field('세부 태그 (쉼표 구분)',`world.${i}.details`,csv(w.details),'text',true)}</div></div>`).join('')}</div><button class="add-button" data-add="world">+ 세계관 항목 추가</button></div>`; }

  function renderEpisodes(){ $('#section-episodes').innerHTML=`<div class="panel"><h2>회차</h2><div class="repeat-list">${(state.episodes||[]).map((ep,i)=>`<div class="item-card"><div class="item-head"><strong>EP. ${ep.no||i+1} · ${esc(ep.title||'새 회차')}</strong><button class="mini-button danger" data-remove="episodes" data-index="${i}">삭제</button></div><div class="field-grid">${field('회차 번호',`episodes.${i}.no`,ep.no,'number')}${field('상태',`episodes.${i}.status`,ep.status)}${field('제목',`episodes.${i}.title`,ep.title,'text',true)}${field('한 줄 소개',`episodes.${i}.teaser`,ep.teaser,'textarea',true)}</div></div>`).join('')}</div><button class="add-button" data-add="episodes">+ 회차 추가</button></div>`; }

  function renderNotice(){ $('#section-notice').innerHTML=`<div class="panel"><h2>작품 소식</h2><div class="repeat-list">${(state.notice||[]).map((n,i)=>`<div class="item-card"><div class="item-head"><strong>${esc(n.title||`소식 ${i+1}`)}</strong><button class="mini-button danger" data-remove="notice" data-index="${i}">삭제</button></div><div class="field-grid">${field('날짜',`notice.${i}.date`,n.date)}${field('제목',`notice.${i}.title`,n.title)}${field('내용',`notice.${i}.body`,n.body,'textarea',true)}</div></div>`).join('')}</div><button class="add-button" data-add="notice">+ 소식 추가</button></div>`; }

  function renderAll(){ renderBasic();renderStory();renderCharacters();renderWorld();renderEpisodes();renderNotice(); bindEditorEvents(); updatePreview(); document.querySelectorAll('[data-side-title]').forEach(x=>x.textContent=state.meta.shortTitle||'작품 편집실'); }

  function setPath(path,value){
    const parts=path.split('.'); let obj=state;
    for(let i=0;i<parts.length-1;i++){const p=parts[i];obj=obj[p];}
    const last=parts.at(-1);
    if(path==='keywords'){ state.keywords=toList(value); return; }
    if(last==='facts'||last==='details'){ obj[last]=toList(value); return; }
    if(last==='spoiler'){ obj[last]=String(value).trim().toLowerCase()==='true'; return; }
    if(last==='no'){ obj[last]=Number(value)||0; return; }
    obj[last]=value;
  }

  function bindEditorEvents(){
    document.querySelectorAll('[data-path]').forEach(el=>el.addEventListener('input',()=>{ setPath(el.dataset.path,el.value); dirty=true; status('수정 중…'); updatePreview(); scheduleSave(); }));
    document.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{ if(!confirm('이 항목을 삭제할까요?'))return; state[btn.dataset.remove].splice(Number(btn.dataset.index),1); dirty=true; renderAll(); scheduleSave(); }));
    document.querySelectorAll('[data-add]').forEach(btn=>btn.addEventListener('click',()=>{ addItem(btn.dataset.add); dirty=true; renderAll(); scheduleSave(); }));
  }

  function addItem(type){
    if(type==='characters') state.characters.push({id:`character-${Date.now()}`,name:'새 인물',jp:'',roman:'',role:'조연',color:'#8296aa',initial:'?',summary:'',facts:[],quote:'',spoiler:false});
    if(type==='world') state.world.push({icon:'✦',title:'새 설정',subtitle:'',text:'',details:[]});
    if(type==='episodes') state.episodes.push({no:(state.episodes.at(-1)?.no||0)+1,title:'새 회차',teaser:'',status:'준비 중'});
    if(type==='notice') state.notice.unshift({date:new Date().toISOString().slice(0,10).replaceAll('-','.'),title:'새 소식',body:''});
  }

  function updatePreview(){ const f=$('#preview-frame'); f?.contentWindow?.postMessage({type:'NOVEL_PREVIEW_DATA',data:clone(state)},'*'); }
  function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>saveDraft(true),900); if($('#auto-publish').checked){ clearTimeout(publishTimer); publishTimer=setTimeout(()=>publish(true),1400); } }
  async function saveDraft(silent=false){ try{status('초안 저장 중…');await api.saveDraft(state);dirty=false;status(silent?'초안 자동 저장됨':'초안을 저장했습니다.');}catch(e){status('저장 실패: '+e.message,true);} }
  async function publish(silent=false){ try{status('게시 중…');await api.publish(state);dirty=false;status(silent?'자동 게시 완료':'독자 사이트에 게시했습니다.');}catch(e){status('게시 실패: '+e.message,true);} }

  document.querySelectorAll('#editor-nav button').forEach(btn=>btn.addEventListener('click',()=>{ activeSection=btn.dataset.section;document.querySelectorAll('#editor-nav button').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.edit-section').forEach(s=>s.classList.toggle('active',s.id===`section-${activeSection}`));$('#section-title').textContent=sections[activeSection]; }));
  $('#save-draft').addEventListener('click',()=>saveDraft(false));
  $('#publish').addEventListener('click',()=>publish(false));
  $('#logout').addEventListener('click',async()=>{await api.signOut();location.reload();});
  $('#denied-logout').addEventListener('click',async()=>{await api.signOut();location.reload();});
  $('#preview-frame').addEventListener('load',updatePreview);
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

  $('#login-form').addEventListener('submit',async e=>{e.preventDefault();const msg=$('#login-status');msg.textContent='로그인 중…';try{await api.signIn($('#login-email').value,$('#login-password').value);if(await api.checkAdmin()){await enterStudio();}else{show('denied-screen');}}catch(err){msg.textContent='로그인 실패: '+err.message;}});

  async function enterStudio(){ show('studio'); try{const loaded=await api.loadDraft();state=clone(loaded.data);renderAll();status('초안을 불러왔습니다.');$('#cloud-mode').textContent=api.cloudReady?'Supabase 연결됨 · 독자 사이트 실시간 갱신':'로컬 모드';}catch(e){status('초안을 불러오지 못했습니다: '+e.message,true);} }

  async function boot(){
    if(!api.cloudReady){show('setup-screen');return;}
    try{const session=await api.getSession();if(!session){show('login-screen');return;}if(await api.checkAdmin())await enterStudio();else show('denied-screen');}catch(e){show('login-screen');$('#login-status').textContent=e.message;}
  }
  boot();
})();
