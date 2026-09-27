(() => {
  const cfg = window.NOVEL_CONFIG || {};
  const siteId = cfg.siteId || 'main';
  const cloudReady = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
  const client = cloudReady
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  const channelName = 'novel-site-live';
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(channelName) : null;
  const localPublicKey = `novel_public_${siteId}`;
  const localDraftKey = `novel_draft_${siteId}`;

  const clone = value => JSON.parse(JSON.stringify(value));
  const fallback = () => clone(window.SITE_DATA);
  const validData = value => value && typeof value === 'object' && value.meta && Array.isArray(value.characters);

  async function loadPublic() {
    if (!cloudReady) {
      try {
        const raw = localStorage.getItem(localPublicKey);
        const data = raw ? JSON.parse(raw) : null;
        return { data: validData(data) ? data : fallback(), source: raw ? 'local' : 'default', updatedAt: null };
      } catch {
        return { data: fallback(), source: 'default', updatedAt: null };
      }
    }
    const { data, error } = await client.from('site_public').select('data,updated_at').eq('id', siteId).maybeSingle();
    if (error) throw error;
    return { data: validData(data?.data) ? data.data : fallback(), source: data ? 'cloud' : 'default', updatedAt: data?.updated_at || null };
  }

  async function loadDraft() {
    if (!cloudReady) {
      try {
        const raw = localStorage.getItem(localDraftKey);
        const draft = raw ? JSON.parse(raw) : null;
        if (validData(draft)) return { data: draft, updatedAt: null };
        return await loadPublic();
      } catch {
        return await loadPublic();
      }
    }
    const { data, error } = await client.from('site_draft').select('data,updated_at').eq('id', siteId).maybeSingle();
    if (error) throw error;
    if (validData(data?.data)) return { data: data.data, updatedAt: data.updated_at };
    return await loadPublic();
  }

  async function saveDraft(data) {
    const snapshot = clone(data);
    if (!cloudReady) {
      localStorage.setItem(localDraftKey, JSON.stringify(snapshot));
      return { local: true };
    }
    const { error } = await client.from('site_draft').upsert({ id: siteId, data: snapshot, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { local: false };
  }

  async function publish(data) {
    const snapshot = clone(data);
    if (!cloudReady) {
      localStorage.setItem(localDraftKey, JSON.stringify(snapshot));
      localStorage.setItem(localPublicKey, JSON.stringify(snapshot));
      bc?.postMessage({ type: 'published', data: snapshot });
      window.dispatchEvent(new CustomEvent('novel-local-published', { detail: snapshot }));
      return { local: true };
    }
    const now = new Date().toISOString();
    const [draftResult, publicResult] = await Promise.all([
      client.from('site_draft').upsert({ id: siteId, data: snapshot, updated_at: now }),
      client.from('site_public').upsert({ id: siteId, data: snapshot, updated_at: now })
    ]);
    if (draftResult.error) throw draftResult.error;
    if (publicResult.error) throw publicResult.error;
    return { local: false };
  }

  async function signIn(email, password) {
    if (!cloudReady) throw new Error('Supabase가 아직 연결되지 않았습니다.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!cloudReady) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function getSession() {
    if (!cloudReady) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function checkAdmin() {
    if (!cloudReady) return false;
    const { data, error } = await client.rpc('is_novel_admin');
    if (error) throw error;
    return Boolean(data);
  }

  function subscribePublic(callback) {
    if (!cloudReady) {
      const onMessage = ev => { if (ev.data?.type === 'published' && validData(ev.data.data)) callback(clone(ev.data.data)); };
      bc?.addEventListener('message', onMessage);
      const onStorage = ev => {
        if (ev.key === localPublicKey && ev.newValue) {
          try { const parsed = JSON.parse(ev.newValue); if (validData(parsed)) callback(parsed); } catch {}
        }
      };
      const onLocal = ev => { if (validData(ev.detail)) callback(clone(ev.detail)); };
      window.addEventListener('storage', onStorage);
      window.addEventListener('novel-local-published', onLocal);
      return () => {
        bc?.removeEventListener('message', onMessage);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('novel-local-published', onLocal);
      };
    }

    const channel = client
      .channel(`site-public-${siteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_public', filter: `id=eq.${siteId}` }, async () => {
        try { const fresh = await loadPublic(); callback(fresh.data); } catch (e) { console.error(e); }
      })
      .subscribe();

    return () => client.removeChannel(channel);
  }

  window.NOVEL_API = {
    cloudReady,
    client,
    siteId,
    loadPublic,
    loadDraft,
    saveDraft,
    publish,
    signIn,
    signOut,
    getSession,
    checkAdmin,
    subscribePublic
  };
})();
