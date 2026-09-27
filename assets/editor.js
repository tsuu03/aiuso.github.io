(()=>{
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let data=structuredClone(DEFAULT_DATA),tab='home',dirty=false;
 const tabs={home:'基本情報',about:'作品紹介',characters:'人物',world:'世界観',students:'学級名簿',episodes:'連載',news:'お知らせ'};
 Object.assign(tabs,{home:'기본 정보',about:'작품 소개',characters:'등장인물',world:'세계관',students:'학생 명단',episodes:'연재 링크',news:'소식'});
 const status=(msg,error=false)=>{$('#status').textContent=msg;$('#status').classList.toggle('error',error)};
 const get=p=>p.split('.').reduce((o,k)=>o?.[k],data);
 function set(p,v){const keys=p.split('.');const last=keys.pop();keys.reduce((o,k)=>o[k],data)[last]=v}
 function field(label,path,multi=false){return `<label>${esc(label)}${multi?`<textarea data-path="${path}">${esc(get(path))}</textarea>`:`<input data-path="${path}" value="${esc(get(path))}">`}</label>`}
 function upload(label,path){return field(label+' URL',path)+`<label>${esc(label)} 파일 선택 (PNG/JPEG/WebP, 2MB 이하)<input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${path}"></label>`}
 function post(){try{$('#preview').contentWindow.postMessage({type:'notebook-preview',content:data},location.origin)}catch{}}
 function changed(){dirty=true;$('#dirty').textContent='수정 중 · 미리보기만 반영됩니다.';post()}
 function draw(){
  $('#edit-nav').innerHTML=Object.entries(tabs).map(([k,v])=>`<button data-tab="${k}" class="${tab===k?'active':''}" aria-pressed="${tab===k}">${v}</button>`).join('');let h='';
  if(tab==='home')h=field('한국어 작품명','title')+field('상단 메뉴 제목','shortTitle')+field('일본어 작품명','japanese')+field('짧은 소개 (줄바꿈 가능)','intro',true)+field('태그 (쉼표로 구분)','tags')+upload('제목 로고','logo');
  if(tab==='about')h=field('분홍 상자 문구','quote')+field('작품 소개','about',true);
  if(tab==='characters')h=data.characters.map((c,i)=>`<section class="item-editor"><h3>${esc(c.name||'새 등장인물')}</h3>${field('이름',`characters.${i}.name`)}${field('일본어 / 영어 이름',`characters.${i}.sub`)}${field('카드 소개',`characters.${i}.summary`,true)}${field('프로필 (한 줄에 한 항목)',`characters.${i}.facts`,true)}${field('대표 대사',`characters.${i}.quote`)}${upload('캐릭터 이미지',`characters.${i}.image`)}<p class="tiny">기본 두 인물은 이미지 URL을 비우면 첨부 원본이 표시됩니다.</p><button class="remove" data-remove="characters.${i}">인물 삭제</button></section>`).join('')+'<button class="btn secondary" data-add="characters">등장인물 추가</button>';
  if(tab==='world')h=data.world.map((w,i)=>`<section class="item-editor">${field('제목',`world.${i}.title`)}${field('부제',`world.${i}.sub`)}${field('설명',`world.${i}.body`,true)}${field('메모',`world.${i}.note`)}</section>`).join('');
  if(tab==='students')h='<p class="quiet">번호 / 요미가나 / 한국어 이름 / 성별 / 특이사항</p>'+data.students.map((r,i)=>`<section class="item-editor student-editor">${r.map((v,j)=>`<input aria-label="${i+1}번 학생 ${['번호','요미가나','한국어 이름','성별','특이사항'][j]}" data-path="students.${i}.${j}" value="${esc(v)}">`).join('')}</section>`).join('');
  if(tab==='episodes')h='<p class="quiet">작품의 정확한 연재 주소를 입력하세요. 빈 주소는 독자 화면에서 ‘준비 중’으로 표시됩니다.</p>'+field('조아라 작품 주소 (https://...)','joara')+field('카쿠요무 작품 주소 (추후 추가)','kakuyomu');
  if(tab==='news')h='<h3>SNS 링크</h3>'+data.socials.map((s,i)=>`<section class="item-editor">${field('버튼 이름',`socials.${i}.label`)}${field('주소 (https://...)',`socials.${i}.url`)}<button class="remove" data-remove="socials.${i}">링크 삭제</button></section>`).join('')+'<button class="btn secondary" data-add="socials">SNS 링크 추가</button><h3>공지</h3>'+data.news.map((n,i)=>`<section class="item-editor">${field('날짜',`news.${i}.date`)}${field('제목',`news.${i}.title`)}${field('내용',`news.${i}.body`,true)}<button class="remove" data-remove="news.${i}">공지 삭제</button></section>`).join('')+'<button class="btn secondary" data-add="news">공지 추가</button>';
  $('#fields').innerHTML=h;
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;draw();const map={students:'world',episodes:'episodes'};$('#preview').src='index.html?preview=1#'+(map[tab]||tab)});
  document.querySelectorAll('[data-path]').forEach(el=>el.oninput=()=>{set(el.dataset.path,el.value);changed()});
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(!confirm('이 항목을 삭제할까요? 게시 전까지 공개 내용은 유지됩니다.'))return;const [key,i]=b.dataset.remove.split('.');data[key].splice(+i,1);changed();draw()});
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const k=b.dataset.add;data[k].push(k==='characters'?{name:'새 등장인물',sub:'',summary:'',facts:'',quote:'',sprite:'',image:''}:k==='socials'?{label:'SNS',url:''}:{date:new Date().toLocaleDateString('sv-SE'),title:'새 소식',body:''});changed();draw()});
  document.querySelectorAll('[data-upload]').forEach(el=>el.onchange=async()=>{const f=el.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>2*1024*1024){status('PNG/JPEG/WebP 형식의 2MB 이하 이미지를 선택해 주세요.',true);return}const fr=new FileReader();fr.onload=()=>{set(el.dataset.upload,fr.result);changed();draw();status('이미지를 넣었어요. 게시용 파일을 GitHub에 올리면 독자 화면에 반영됩니다.')};fr.onerror=()=>status('이미지 파일을 읽지 못했어요.',true);fr.readAsDataURL(f)});
 }
 function validate(d){
  if(!d||typeof d!=='object'||Array.isArray(d))throw Error('올바른 백업 파일이 아니에요.');
  for(const k of ['title','shortTitle','japanese','intro','tags','logo','quote','about','joara','kakuyomu'])if(typeof d[k]!=='string')throw Error('백업 항목이 올바르지 않아요: '+k);
  const schemas={characters:['name','sub','summary','facts','quote','image','sprite'],world:['title','sub','body','note'],socials:['label','url'],news:['date','title','body']};
  for(const [k,fields]of Object.entries(schemas)){if(!Array.isArray(d[k])||d[k].length>100)throw Error('잘못된 목록: '+k);for(const row of d[k])for(const f of fields)if(typeof row?.[f]!=='string')throw Error('잘못된 항목: '+k+'.'+f)}
  if(!Array.isArray(d.students)||d.students.length>200||d.students.some(r=>!Array.isArray(r)||r.length!==5||r.some(v=>typeof v!=='string')))throw Error('학생 명단 형식이 올바르지 않아요.');
  const web=v=>!v||/^https?:\/\//i.test(v);if(!web(d.joara)||!web(d.kakuyomu)||d.socials.some(s=>!web(s.url)))throw Error('연재/SNS 주소는 https:// 또는 http://로 시작해야 해요.');
  const img=v=>!v||/^assets\/[A-Za-z0-9_./-]+$/.test(v)||/^https?:\/\//i.test(v)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);if(!img(d.logo)||d.characters.some(c=>!img(c.image)))throw Error('이미지 주소를 확인해 주세요.');
  if(new Blob([JSON.stringify(d)]).size>8*1024*1024)throw Error('전체 데이터는 8MB 이하여야 해요. 이미지 크기를 줄여 주세요.');return d;
 }

 const draftKey='novel-notebook-pages-draft:'+location.pathname;
 function download(text,name,type){const blob=new Blob([text],{type}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
 $('#publish').onclick=()=>{try{validate(data);download('window.DEFAULT_DATA = '+JSON.stringify(data,null,2)+';\n','site-data.js','text/javascript');dirty=false;$('#dirty').textContent='파일 내려받음 · GitHub 업로드 필요';status('내려받은 site-data.js를 GitHub 저장소의 assets/site-data.js에 덮어쓰고 Commit해 주세요.')}catch(e){status(e.message,true)}};
 $('#save-draft').onclick=()=>{try{validate(data);localStorage.setItem(draftKey,JSON.stringify(data));dirty=false;$('#dirty').textContent='이 브라우저에 임시 저장됨';status('이 브라우저에 임시 저장했어요. 공개 사이트는 바뀌지 않습니다.')}catch(e){status('임시 저장 실패: '+e.message+' JSON 백업을 사용해 주세요.',true)}};
 $('#export').onclick=()=>download(JSON.stringify(data,null,2),'novel-notebook-backup.json','application/json');
 $('#import').onchange=async ev=>{try{const f=ev.target.files[0];if(!f)return;if(f.size>8*1024*1024)throw Error('8MB 이하 파일을 선택해 주세요.');const d=validate(JSON.parse(await f.text()));if(!confirm('편집 중인 내용을 교체할까요?'))return;data=d;changed();draw();status('백업을 불러왔어요. 게시용 파일을 내려받아 GitHub에 올려 주세요.')}catch(e){status(e.message,true)}finally{ev.target.value=''}};
 for(const id of ['published','draft'])$('#load-'+id).onclick=()=>{if(dirty&&!confirm('편집 중인 내용을 덮어쓸까요?'))return;try{if(id==='draft'){const saved=localStorage.getItem(draftKey);if(!saved)throw Error('이 브라우저에 임시 저장된 내용이 없어요.');data=validate(JSON.parse(saved))}else data=structuredClone(DEFAULT_DATA);changed();draw();status('내용을 불러왔어요.')}catch(e){status(e.message,true)}};
 $('#preview-width').onchange=ev=>$('#preview').style.width=ev.target.value;
 window.addEventListener('message',ev=>{if(ev.origin===location.origin&&ev.source===$('#preview').contentWindow&&ev.data?.type==='notebook-ready')post()});$('#preview').onload=post;
 window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue=''}});
 $('#mode').textContent='로컬 작가 편집실';$('#dirty').textContent='수정 → 파일 내려받기 → GitHub 업로드';draw();post();
 status('로그인 없이 편집할 수 있어요. 공개 사이트 변경은 GitHub 저장소의 쓰기 권한이 있는 사람만 가능합니다.');
})();
