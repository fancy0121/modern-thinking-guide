(function () {
  'use strict';
  const KEY = 'modern-thinking-public-record-v1';
  const MAX_IMPORT_BYTES = 1000000;
  const guides = (window.PUBLIC_GUIDES && Array.isArray(window.PUBLIC_GUIDES.cards)) ? window.PUBLIC_GUIDES.cards : [];
  const $ = id => document.getElementById(id);
  const state = { data: { records: [] }, raw: null, selectedGuide: null, selectedRecord: null, locked: false, stale: false, corruptRaw: null };
  try { state.raw = localStorage.getItem(KEY); state.data = state.raw ? DecisionRecord.decode(state.raw) : { records: [] }; }
  catch (_) { state.corruptRaw = state.raw; state.locked = true; state.data = { records: [] }; }
  function show(message) { $('notice').textContent = message || ''; }
  function formValues() { return { input: $('input').value, answer: $('answer').value, choice: $('choice').value, review: $('review').value }; }
  function persist(next) {
    if (state.locked) { show(state.corruptRaw !== null ? '记录数据损坏，已停止覆盖。请先下载原始备份或明确清除。' : '浏览器本地存储不可用，无法保存；表单内容已保留，请复制备份。'); return false; }
    if (state.stale) { show('检测到另一个页面修改了记录，已停止覆盖；当前表单内容已保留。'); return false; }
    try { const written = DecisionRecord.persist(localStorage, KEY, state.raw, next); state.data = next; state.raw = written; state.selectedRecord = null; renderRecords(); show('已保存到此浏览器。'); return true; }
    catch (error) { show(error.message || '保存失败；表单内容已保留，请复制后重试。'); return false; }
  }
  function button(label, handler, secondary) { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (secondary) b.className = 'secondary'; b.addEventListener('click', handler); return b; }
  function paragraph(parent, text) { const p = document.createElement('p'); p.textContent = text || ''; parent.append(p); return p; }
  function heading(parent, text) { const h = document.createElement('h4'); h.textContent = text; parent.append(h); }
  function list(parent, items, ordered) { const ul = document.createElement(ordered ? 'ol' : 'ul'); (items || []).forEach(text => { const li = document.createElement('li'); li.textContent = text; ul.append(li); }); parent.append(ul); }
  function selectedHash() { return window.location ? window.location.hash : ''; }
  function guideBody(parent, g) {
    heading(parent, '适用时机'); paragraph(parent, g.when);
    heading(parent, '为什么这样做'); (g.explanation || []).forEach(text => paragraph(parent, text));
    heading(parent, '可以这样做'); list(parent, g.steps, true);
    if (g.example) {
      const example = document.createElement('div'); example.className = 'example';
      heading(example, '虚构演示'); paragraph(example, g.example.situation); paragraph(example, g.example.action); paragraph(example, g.example.signal); parent.append(example);
    }
    heading(parent, '容易误用的地方'); list(parent, g.pitfalls);
    heading(parent, '何时回看'); paragraph(parent, g.watch);
    heading(parent, '不适用的情况'); paragraph(parent, g.limit);
    const evidence = document.createElement('div'); evidence.className = 'sources'; heading(evidence, '依据与来源'); paragraph(evidence, g.origin);
    (g.sources || []).forEach(s => { paragraph(evidence, `${s.work} · ${s.title}`); const p = paragraph(evidence, `${s.id} · ${s.locator}`); p.className = 'tag'; paragraph(evidence, s.note); }); parent.append(evidence);
    if (g.related && g.related.length) {
      heading(parent, '接着看');
      g.related.forEach(id => { const target = guides.find(item => item.id === id); if (!target) return; const a = document.createElement('a'); a.href = '#guide-' + id; a.textContent = target.title; a.className = 'related-link'; parent.append(a); });
    }
  }
  function renderGuides() {
    const box = $('guides'); box.replaceChildren(); const query = $('search').value.trim().toLowerCase(); const category = $('category').value;
    const filtered = guides.filter(g => (!category || g.category === category) && (!query || JSON.stringify(g).toLowerCase().includes(query)));
    $('guide-count').textContent = filtered.length ? `显示 ${filtered.length} / ${guides.length} 篇` : `没有找到匹配指南（共 ${guides.length} 篇）`;
    if (!filtered.length) {
      paragraph(box, '这里按关键词匹配。可以换一个短词，或清空搜索和类别，浏览全部指南。');
      box.append(button('清空筛选，查看全部指南', () => {
        $('search').value = ''; $('category').value = ''; renderGuides(); $('search').focus();
      }, true));
      return;
    }
    filtered.forEach(g => {
      const card = document.createElement('article'); card.className = 'card'; card.id = 'guide-' + g.id;
      const tag = paragraph(card, `${g.category || ''} · 约${Math.max(2, Math.ceil(JSON.stringify(g).length / 500))}分钟`); tag.className = 'tag';
      const h = document.createElement('h3'); const link = document.createElement('a'); link.href = '#guide-' + g.id; link.textContent = g.title; h.append(link); card.append(h);
      paragraph(card, g.summary);
      const details = document.createElement('details'); const summaryEl = document.createElement('summary'); summaryEl.textContent = '阅读全文与做法'; details.append(summaryEl); guideBody(details, g); details.open = selectedHash() === '#guide-' + g.id; card.append(details);
      const actions = document.createElement('div'); actions.className = 'guide-actions';
      actions.append(button('用这篇整理一件事', () => { state.selectedGuide = { ...g, version: window.PUBLIC_GUIDES.version || '未提供' }; renderRecords(); $('input').focus(); show(`已选择“${g.title}”，保存后可复制到已有AI。`); }));
      actions.append(button('复制整篇给AI', () => copyText(DecisionRecord.context({ records: [] }, null, { ...g, version: window.PUBLIC_GUIDES.version })), true));
      card.append(actions); box.append(card);
    });
  }
  function openHashGuide() {
    const hash = selectedHash();
    if (!guides.some(g => hash === '#guide-' + g.id)) return;
    $('search').value = ''; $('category').value = ''; renderGuides();
    const target = document.getElementById(hash.slice(1)); if (target && target.scrollIntoView) target.scrollIntoView({ block: 'start' });
  }
  function renderRecords() {
    const box = $('records'); box.replaceChildren(); const h = document.createElement('h3'); h.textContent = '已保存记录与历史版本'; box.append(h);
    state.data.records.forEach(record => {
      const item = document.createElement('details');
      const title = document.createElement('summary');
      title.textContent = `${record.versions[0].input}（${record.versions.length}个版本）`;
      item.append(title);
      record.versions.forEach((version, index) => {
        const p = document.createElement('p');
        p.textContent = `版本 ${index + 1}｜${version.at}\n问题：${version.input}\n判断：${version.answer || '尚未形成判断'}\n下一步：${version.choice || '未填写'}\n回看：${version.review || '未填写'}`;
        item.append(p);
      });
      item.append(button('修订这条记录', () => {
        state.selectedRecord = record.id;
        const latest = record.versions[record.versions.length - 1];
        $('input').value = latest.input; $('answer').value = latest.answer; $('choice').value = latest.choice; $('review').value = latest.review;
        show('正在修订这条记录；保存会追加一个历史版本。'); $('input').focus();
      }));
      item.append(button('复制我的记录到AI', () => copyText(DecisionRecord.context(state.data, record.id, null))));
      if (state.selectedGuide) {
        const guide = state.selectedGuide;
        item.append(button(`附上“${guide.title}”复制到AI`, () => copyText(DecisionRecord.context(state.data, record.id, guide)), true));
      }
      box.append(item);
    });
  }
  async function copyText(text) { try { await navigator.clipboard.writeText(text); show('已复制；请粘贴到你已有的AI。'); } catch (_) { $('backup').value = text; $('backup').focus(); $('backup').select(); show('浏览器未允许自动复制，已放入文本框，请手动复制。'); } }
  function backupText() { return state.locked && state.corruptRaw !== null ? state.corruptRaw : JSON.stringify(state.data, null, 2); }
  function downloadBackup() { const blob = new Blob([backupText()], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'modern-thinking-records.json'; link.click(); URL.revokeObjectURL(url); show('已下载JSON备份。'); }
  $('category').replaceChildren(new Option('全部类别', '')); [...new Set(guides.map(g => g.category).filter(Boolean))].forEach(c => $('category').append(new Option(c, c)));
  $('search').addEventListener('input', renderGuides); $('category').addEventListener('change', renderGuides);
  $('new-record').addEventListener('click', () => { state.selectedRecord = null; state.selectedGuide = null; $('record-form').reset(); show('已开始新记录。'); });
  $('record-form').addEventListener('submit', event => { event.preventDefault(); const values = formValues(); const id = state.selectedRecord || `r-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; try { const next = DecisionRecord.commit(state.data, state.selectedRecord, values, id, new Date().toISOString()); if (persist(next)) event.target.reset(); } catch (error) { show(error.message || '保存失败；表单内容已保留，请重试。'); } });
  $('export-copy').addEventListener('click', () => { $('backup').value = backupText(); copyText($('backup').value); }); $('export-download').addEventListener('click', downloadBackup);
  $('import-file').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; if (file.size > MAX_IMPORT_BYTES) { show('导入文件过大，已有记录未改变。'); event.target.value = ''; return; } if (state.locked) { show('记录数据损坏，已停止导入；请先下载原始备份或明确清除。'); event.target.value = ''; return; } const reader = new FileReader(); reader.onload = () => { try { const incoming = DecisionRecord.decode(String(reader.result)); persist(DecisionRecord.merge(state.data, incoming)); } catch (error) { show(error.message || '导入失败，已有记录未改变。'); } event.target.value = ''; }; reader.readAsText(file); });
  $('clear').addEventListener('click', () => { if (!window.confirm('确定清除此设备上保存的记录吗？')) return; try { if (localStorage.getItem(KEY) !== state.raw) throw Error('另一个页面修改了记录，已停止覆盖。'); localStorage.removeItem(KEY); state.data = { records: [] }; state.raw = null; state.locked = false; state.corruptRaw = null; state.stale = false; state.selectedRecord = null; state.selectedGuide = null; renderRecords(); show('已清除本设备记录。'); } catch (error) { show(error.message); } });
  window.addEventListener('storage', event => { if (event.key !== KEY) return; state.stale = true; show('另一个页面修改了记录；当前表单内容已保留，请刷新后再决定如何处理。'); });
  window.addEventListener('hashchange', openHashGuide);
  if (state.locked) { $('backup').value = state.corruptRaw || ''; show(state.corruptRaw !== null ? '本地记录无法读取，已闭锁保存与导入；请先下载原始备份或明确清除。' : '浏览器本地存储不可用；仍可阅读指南，请复制保留自己的输入。'); } renderGuides(); renderRecords(); openHashGuide();
})();
