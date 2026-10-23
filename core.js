'use strict';

(function (root) {
  const MAX_BYTES = 1000000;
  const MAX_RECORDS = 200;
  const MAX_VERSIONS = 200;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function validate(state) {
    if (!state || !Array.isArray(state.records) || state.records.length > MAX_RECORDS) throw Error('记录格式不正确。');
    const ids = new Set();
    for (const record of state.records) {
      if (!record || typeof record.id !== 'string' || !record.id.trim() || ids.has(record.id) || !Array.isArray(record.versions) || !record.versions.length || record.versions.length > MAX_VERSIONS) throw Error('记录格式不正确。');
      ids.add(record.id);
      for (const version of record.versions) {
        if (!version || ['input', 'answer', 'choice', 'review', 'at'].some(key => typeof version[key] !== 'string')) throw Error('记录格式不正确。');
        if (!version.input.trim() || version.input.length > 4000 || version.answer.length > 8000 || version.choice.length > 1000 || version.review.length > 1000 || version.at.length > 100) throw Error('记录格式不正确。');
      }
    }
    return state;
  }

  function serialized(state) {
    const text = JSON.stringify(state);
    if (text.length > MAX_BYTES) throw Error('记录文件过大，请先导出。');
    return text;
  }

  function decode(text) {
    if (typeof text !== 'string' || text.length > MAX_BYTES) throw Error('记录文件过大。');
    try { return validate(JSON.parse(text)); } catch (_) { throw Error('记录格式不正确。请保留原文件。'); }
  }

  function commit(state, selectedId, data, id, at) {
    validate(state);
    if (!data || typeof data.input !== 'string' || !data.input.trim() || typeof data.answer !== 'string' || typeof data.choice !== 'string' || typeof data.review !== 'string' || typeof at !== 'string') throw Error('记录内容不正确。');
    const next = clone(state);
    let record = selectedId ? next.records.find(item => item.id === selectedId) : null;
    if (selectedId && !record) throw Error('原记录不存在。');
    if (!record) { record = { id, versions: [] }; next.records.push(record); }
    record.versions.push({ input: data.input, answer: data.answer, choice: data.choice, review: data.review, at });
    validate(next);
    serialized(next);
    return next;
  }

  function persist(storage, key, expected, state) {
    validate(state);
    if (storage.getItem(key) !== expected) throw Error('另一个页面修改了记录，已停止覆盖。请复制当前回答后刷新。');
    const text = serialized(state);
    storage.setItem(key, text);
    return text;
  }

  function merge(existing, incoming) {
    validate(existing); validate(incoming);
    const next = clone(existing);
    for (const incomingRecord of incoming.records) {
      const found = next.records.find(item => item.id === incomingRecord.id);
      if (!found) { next.records.push(clone(incomingRecord)); continue; }
      if (JSON.stringify(found) !== JSON.stringify(incomingRecord)) throw Error('导入记录冲突，已保留已有记录。');
    }
    validate(next); serialized(next); return next;
  }

  function context(state, selectedId, guide) {
    validate(state);
    const records = selectedId ? state.records.filter(item => item.id === selectedId) : state.records;
    const lines = ['用户自己的笔记（以下判断均由用户填写，不是AI答案）：', '“当前”仅表示该记录最后保存的版本，不表示内容已验证；历史版本全部保留。'];
    for (const record of records) {
      lines.push(`记录：${record.id}（${record.versions.length}个版本）`);
      record.versions.forEach((version, index) => {
        const status = index === record.versions.length - 1 ? '当前' : '历史';
        lines.push(`版本 ${index + 1}（${status}）`, `保存时间：${version.at || '（未记录）'}`, `问题：${version.input}`, `我的判断：${version.answer || '（尚未形成判断）'}`, `我的下一步：${version.choice || '（未填写）'}`, `我计划回看：${version.review || '（未填写）'}`);
      });
    }
    if (guide) {
      lines.push('自愿附加的公开指南（原创项目材料，未验证，不是用户笔记）：');
      lines.push(`标题：${guide.title || ''}`, `版本：${guide.version || '未提供'}`, `摘要：${guide.summary || ''}`, `适用时机：${guide.when || ''}`, `步骤：${(guide.steps || []).join(' → ')}`, `留意：${guide.watch || ''}`, `边界：${guide.limit || ''}`);
      lines.push(...(guide.explanation || []));
      if (guide.example) lines.push('以下为虚构演示，不能当作用户经历或现实效果证据：', guide.example.situation, guide.example.action, guide.example.signal);
      if (guide.pitfalls) lines.push('容易误用的地方：', ...guide.pitfalls);
      if (guide.origin) lines.push('来源状态：' + guide.origin);
      for (const source of guide.sources || []) {
        lines.push([source.work, source.title, source.id, source.locator].join(' · '), source.note);
      }
      lines.push('请围绕我的实际问题提供帮助，检查适用条件；不必机械套用指南，也不要把虚构示例当成我的事实。');
    }
    return lines.join('\n');
  }

  const api = { decode, commit, persist, merge, context, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DecisionRecord = api;
})(typeof window !== 'undefined' ? window : globalThis);
