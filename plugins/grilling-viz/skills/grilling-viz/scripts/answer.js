(function (root) {
  'use strict';

  const schemaVersion = 1;
  const blank = () => ({ choice: null, note: '' });
  const hasAnswer = answer => answer.choice !== null || Boolean(answer.note.trim());

  function validateDocument(data) {
    const object = (value, path) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(path + ' はオブジェクトにしてください。');
    };
    const string = (value, path) => {
      if (typeof value !== 'string' || !value.trim()) throw new Error(path + ' は空でない文字列にしてください。');
    };
    const list = (value, path, visit) => {
      if (!Array.isArray(value)) throw new Error(path + ' は配列にしてください。');
      const ids = new Set();
      value.forEach((item, index) => {
        const at = path + '[' + index + ']';
        object(item, at);
        string(item.id, at + '.id');
        if (ids.has(item.id)) throw new Error(at + '.id が重複しています。');
        ids.add(item.id);
        visit(item, at);
      });
    };
    object(data, 'document');
    if (data.schemaVersion !== schemaVersion) throw new Error('schemaVersion は ' + schemaVersion + ' にしてください。');
    string(data.documentId, 'documentId');
    list(data.themes, 'themes', (theme, at) => {
      string(theme.name, at + '.name');
      if (theme.description !== undefined && typeof theme.description !== 'string') throw new Error(at + '.description は文字列にしてください。');
      list(theme.questions, at + '.questions', (question, at) => {
        string(question.title, at + '.title');
        list(question.options, at + '.options', (option, at) => string(option.label, at + '.label'));
      });
    });
    if (!data.themes.length) throw new Error('テーマを一つ以上指定してください。');
    return data;
  }

  function validateAnswer(answer, question) {
    if (!answer || typeof answer.note !== 'string' ||
        !(answer.choice === null || question.options.some(option => option.id === answer.choice))) {
      throw new Error('質問に対応しない回答です。');
    }
    return { choice: answer.choice, note: answer.note };
  }

  function formatAnswers(theme, getAnswer) {
    const entries = theme.questions.flatMap(question => {
      const answer = getAnswer(question.id);
      if (!hasAnswer(answer)) return [];
      const selected = question.options.find(option => option.id === answer.choice);
      return [[question.id + '. ' + question.title,
        selected ? '選択：' + selected.label : '',
        answer.note.trim() ? '自由入力：' + answer.note : '',
      ].filter(Boolean).join('\n')];
    });
    return entries.join('\n\n');
  }

  function createAnswers(data, io = {}) {
    validateDocument(data);
    const records = new Map();
    const problems = new Set();
    const prefix = themeId => 'grilling-viz:' + JSON.stringify([data.documentId, themeId]) + ':';
    const key = (themeId, questionId) => prefix(themeId) + JSON.stringify(questionId);
    const theme = id => {
      const found = data.themes.find(theme => theme.id === id);
      if (!found) throw new Error('テーマが見つかりません。');
      return found;
    };
    const question = (themeId, id) => {
      const found = theme(themeId).questions.find(question => question.id === id);
      if (!found) throw new Error('質問が見つかりません。');
      return found;
    };
    for (const theme of data.themes) for (const question of theme.questions) {
      const id = key(theme.id, question.id);
      let answer = blank();
      let raw;
      try { raw = io.read?.(id); } catch { problems.add('storage-unavailable'); }
      if (raw != null) {
        try {
          const saved = JSON.parse(raw);
          if (saved.schemaVersion !== schemaVersion) throw new Error('保存形式が異なります。');
          answer = validateAnswer(saved, question);
        } catch { problems.add('restore-failed'); }
      }
      records.set(id, answer);
    }
    const get = (themeId, questionId) => {
      question(themeId, questionId);
      return { ...records.get(key(themeId, questionId)) };
    };
    const format = themeId => formatAnswers(theme(themeId), questionId => get(themeId, questionId));
    return {
      get,
      update(themeId, questionId, value) {
        const answer = validateAnswer(value, question(themeId, questionId));
        const id = key(themeId, questionId);
        records.set(id, answer);
        try { io.write?.(id, JSON.stringify({ schemaVersion, ...answer })); }
        catch { problems.add('save-failed'); }
      },
      clear(themeId) {
        const current = theme(themeId);
        const ids = new Set(current.questions.map(question => key(themeId, question.id)));
        try { for (const id of io.keys?.() || []) if (id.startsWith(prefix(themeId))) ids.add(id); }
        catch { problems.add('clear-failed'); }
        for (const id of ids) {
          if (records.has(id)) records.set(id, blank());
          try { io.remove?.(id); } catch { problems.add('clear-failed'); }
        }
      },
      count: themeId => theme(themeId).questions.filter(question => hasAnswer(get(themeId, question.id))).length,
      format,
      async copy(themeId) {
        const text = format(themeId);
        if (!text) return { ok: false, text };
        try {
          if (!io.copy) throw new Error('コピー処理がありません。');
          await io.copy(text);
          return { ok: true, text };
        } catch { return { ok: false, text }; }
      },
      issues: () => [...problems],
    };
  }

  const api = { schemaVersion, validateDocument, blank, hasAnswer, formatAnswers, createAnswers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GrillingAnswers = api;
})(globalThis);
