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
  function renderGuides() {
    const box = $('guides'); box.replaceChildren(); const query = $('search').value.trim().toLowerCase(); const category = $('category').value;
    const filtered = guides.filter(g => (!category || g.category === category) && (!query || [g.title,g.summary,g.when,g.watch,g.limit,...(g.steps || [])].join(' ').toLowerCase().includes(query)));
    $('guide-count').textContent = filtered.length ? `显示 ${filtered.length} / ${guides.length} 篇` : `没有找到匹配指南（共 ${guides.length} 篇）`;
    filtered.forEach(g => { const card = document.createElement('article'); card.className = 'card'; const h = document.createElement('h3'); h.textContent = g.title; card.append(h); const tag = document.createElement('p'); tag.className = 'tag'; tag.textContent = `${g.category || ''} · 原创项目材料 · 未验证`; card.append(tag); const summary = document.createElement('p'); summary.textContent = g.summary || ''; card.append(summary); const details = document.createElement('details'); const summaryEl = document.createElement('summary'); summaryEl.textContent = '展开这篇指南'; details.append(summaryEl); [['适用时机',g.when],['步骤',(g.steps || []).join(' → ')],['留意',g.watch],['边界',g.limit],['来源状态',g.origin]].forEach(([label,value]) => { const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = `${label}：`; p.append(strong, document.createTextNode(value || '')); details.append(p); }); card.append(details); const actions = document.createElement('div'); actions.className = 'guide-actions'; actions.append(button('用这篇整理一件事', () => { state.selectedGuide = { ...g, version: window.PUBLIC_GUIDES.version || '未提供' }; renderRecords(); $('input').focus(); show(`已选择“${g.title}”，保存后可复制到已有AI。`); })); card.append(actions); box.append(card); });
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
  if (state.locked) { $('backup').value = state.corruptRaw || ''; show(state.corruptRaw !== null ? '本地记录无法读取，已闭锁保存与导入；请先下载原始备份或明确清除。' : '浏览器本地存储不可用；仍可阅读指南，请复制保留自己的输入。'); } renderGuides(); renderRecords();
})();
