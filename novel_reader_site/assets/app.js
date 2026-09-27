(() => {
  let currentData = window.SITE_DATA;
  const $ = (q, ctx=document) => ctx.querySelector(q);
  const $$ = (q, ctx=document) => [...ctx.querySelectorAll(q)];
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const safeColor = value => /^#[0-9a-fA-F]{3,8}$/.test(String(value || '')) ? value : '#7b8496';
  const safeUrl = value => {
    try { const u = new URL(value, location.href); return ['http:','https:'].includes(u.protocol) ? u.href : '#'; }
    catch { return '#'; }
  };

  function bindText(data) {
    $$('[data-bind]').forEach(el => {
      let v = data;
      el.dataset.bind.split('.').forEach(p => v = v?.[p]);
      if (v !== undefined && v !== null) el.textContent = v;
    });
  }

  function render(data) {
    currentData = data;
    document.title = `${data.meta?.title || '작품'} | 독자용 공식 사이트`;
    bindText(data);

    const keywords = $('#keywords'); keywords.innerHTML = '';
    (data.keywords || []).forEach(k => keywords.insertAdjacentHTML('beforeend', `<span class="chip">#${esc(k)}</span>`));

    const links = $('#serial-links'); links.innerHTML = '';
    const validLinks = (data.links || []).filter(x => x?.url?.trim());
    if (validLinks.length) {
      validLinks.forEach((x, i) => links.insertAdjacentHTML('beforeend', `<a class="btn ${i===0?'primary':''}" href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.label)}에서 읽기 ↗</a>`));
    } else {
      links.insertAdjacentHTML('beforeend', `<a class="btn primary" href="#episodes">회차 둘러보기 ↓</a>`);
    }

    const charGrid = $('#character-grid'); charGrid.innerHTML = '';
    (data.characters || []).forEach(c => {
      charGrid.insertAdjacentHTML('beforeend', `
        <article class="character-card reveal show" tabindex="0" role="button" data-character="${esc(c.id)}" aria-label="${esc(c.name)} 상세 보기">
          <div class="card-tape" aria-hidden="true"></div>
          ${c.spoiler ? '<span class="spoiler-badge">등장 예정 포함</span>' : ''}
          <div class="avatar" style="--avatar:${esc(safeColor(c.color))}">${esc(c.initial)}</div>
          <div class="role">${esc(c.role)}</div>
          <h3>${esc(c.name)}</h3>
          <div class="jp-name">${esc(c.jp)} · ${esc(c.roman)}</div>
          <p class="summary">${esc(c.summary)}</p>
          <div class="card-more">profile →</div>
        </article>`);
    });

    const worldGrid = $('#world-grid'); worldGrid.innerHTML = '';
    (data.world || []).forEach((w, i) => {
      worldGrid.insertAdjacentHTML('beforeend', `
        <article class="world-card reveal show">
          <div class="world-number">${String(i+1).padStart(2,'0')}</div>
          <div class="world-icon">${esc(w.icon)}</div>
          <h3>${esc(w.title)}</h3>
          <div class="subtitle">${esc(w.subtitle)}</div>
          <p>${esc(w.text)}</p>
          <ul class="detail-list">${(w.details || []).map(d => `<li>${esc(d)}</li>`).join('')}</ul>
        </article>`);
    });

    const epList = $('#episode-list'); epList.innerHTML = '';
    (data.episodes || []).forEach(ep => {
      epList.insertAdjacentHTML('beforeend', `
        <article class="episode reveal show">
          <div class="ep-no"><span>${String(ep.no).padStart(2,'0')}</span></div>
          <div><h3>${esc(ep.title)}</h3><p>${esc(ep.teaser)}</p></div>
          <span class="ep-status">${esc(ep.status)}</span>
        </article>`);
    });

    const noticeList = $('#notice-list'); noticeList.innerHTML = '';
    (data.notice || []).forEach(n => noticeList.insertAdjacentHTML('beforeend', `
      <article class="notice-card reveal show"><div class="pin" aria-hidden="true"></div><div class="notice-date">${esc(n.date)}</div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`));
  }

  const modal = $('#character-modal');
  const modalBody = $('#modal-body');
  function openCharacter(id) {
    const c = (currentData.characters || []).find(x => x.id === id);
    if (!c) return;
    modalBody.innerHTML = `
      <div class="modal-top">
        <div class="modal-avatar" style="--avatar:${esc(safeColor(c.color))}">${esc(c.initial)}</div>
        <div><div class="role">${esc(c.role)}</div><h3>${esc(c.name)}</h3><div class="jp-name">${esc(c.jp)} · ${esc(c.roman)}</div></div>
      </div>
      <p class="modal-summary">${esc(c.summary)}</p>
      <div class="fact-grid">${(c.facts || []).map(f => `<div class="fact">${esc(f)}</div>`).join('')}</div>
      ${c.quote ? `<blockquote class="character-quote">“${esc(c.quote)}”</blockquote>` : ''}
      ${c.spoiler ? `<div class="spoiler-cover">※ 현재 공개 범위를 넘는 핵심 설정은 표시하지 않습니다.</div>` : ''}`;
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
  }
  function closeModal(){ modal.classList.remove('open'); document.body.style.overflow = ''; }

  $('#character-grid').addEventListener('click', e => { const card = e.target.closest('[data-character]'); if(card) openCharacter(card.dataset.character); });
  $('#character-grid').addEventListener('keydown', e => { const card=e.target.closest('[data-character]'); if(card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCharacter(card.dataset.character);} });
  $('#modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

  const menu = $('#mobile-menu'); const navLinks = $('#nav-links');
  menu.addEventListener('click', () => navLinks.classList.toggle('open'));
  $$('#nav-links a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  function flashUpdate(){ const t=$('#live-toast'); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }

  async function boot(){
    try {
      const loaded = await window.NOVEL_API.loadPublic();
      render(loaded.data);
      $('#live-dot').classList.toggle('cloud', window.NOVEL_API.cloudReady);
      window.NOVEL_API.subscribePublic(data => { render(data); flashUpdate(); });
    } catch(e) {
      console.error(e); render(window.SITE_DATA); $('#live-dot').classList.add('error');
    }
  }

  window.addEventListener('message', ev => {
    if (ev.data?.type === 'NOVEL_PREVIEW_DATA' && ev.data.data) render(ev.data.data);
  });

  boot();
})();
