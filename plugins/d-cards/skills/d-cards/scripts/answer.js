(function (root) {
  'use strict';

  const schemaVersion = 1;
  const answerVersion = 1;
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
    const figure = (value, at) => {
      object(value, at);
      if ((value.tikz === undefined) === (value.svg === undefined)) throw new Error(at + ' には tikz と svg のどちらか一つを指定してください。');
      string(value.tikz ?? value.svg, at + (value.tikz === undefined ? '.svg' : '.tikz'));
      string(value.caption, at + '.caption');
    };
    object(data, 'document');
    if (data.schemaVersion !== schemaVersion) throw new Error('schemaVersion は ' + schemaVersion + ' にしてください。');
    string(data.documentId, 'documentId');
    list(data.themes, 'themes', (theme, at) => {
      string(theme.name, at + '.name');
      if (theme.description !== undefined && typeof theme.description !== 'string') throw new Error(at + '.description は文字列にしてください。');
      list(theme.cards, at + '.cards', (card, at) => {
        string(card.title, at + '.title');
        if (!Array.isArray(card.context) || !card.context.length) throw new Error(at + '.context は空でない配列にしてください。');
        card.context.forEach((paragraph, index) => string(paragraph, at + '.context[' + index + ']'));
        if (card.figure !== undefined) figure(card.figure, at + '.figure');
        list(card.options, at + '.options', (option, at) => {
          string(option.label, at + '.label');
          string(option.consequence, at + '.consequence');
        });
        if (card.recommendation !== undefined) {
          object(card.recommendation, at + '.recommendation');
          if (!card.options.some(option => option.id === card.recommendation.option)) throw new Error(at + '.recommendation.option は選択肢の id にしてください。');
          string(card.recommendation.reason, at + '.recommendation.reason');
        }
      });
    });
    if (!data.themes.length) throw new Error('テーマを一つ以上指定してください。');
    return data;
  }

  function validateAnswer(answer, card) {
    if (!answer || typeof answer.note !== 'string' ||
        !(answer.choice === null || card.options.some(option => option.id === answer.choice))) {
      throw new Error('質問に対応しない回答です。');
    }
    return { choice: answer.choice, note: answer.note };
  }

  function formatAnswers(theme, getAnswer) {
    const entries = theme.cards.flatMap(card => {
      const answer = getAnswer(card.id);
      if (!hasAnswer(answer)) return [];
      const selected = card.options.find(option => option.id === answer.choice);
      return [[card.id + '. ' + card.title,
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
    const prefix = themeId => 'd-cards:' + JSON.stringify([data.documentId, themeId]) + ':';
    const key = (themeId, cardId) => prefix(themeId) + JSON.stringify(cardId);
    const theme = id => {
      const found = data.themes.find(theme => theme.id === id);
      if (!found) throw new Error('テーマが見つかりません。');
      return found;
    };
    const card = (themeId, id) => {
      const found = theme(themeId).cards.find(card => card.id === id);
      if (!found) throw new Error('質問が見つかりません。');
      return found;
    };
    for (const theme of data.themes) for (const card of theme.cards) {
      const id = key(theme.id, card.id);
      let answer = blank();
      let raw;
      try { raw = io.read?.(id); } catch { problems.add('storage-unavailable'); }
      if (raw != null) {
        try {
          const saved = JSON.parse(raw);
          if (saved.schemaVersion !== answerVersion) throw new Error('保存形式が異なります。');
          answer = validateAnswer(saved, card);
        } catch { problems.add('restore-failed'); }
      }
      records.set(id, answer);
    }
    const get = (themeId, cardId) => {
      card(themeId, cardId);
      return { ...records.get(key(themeId, cardId)) };
    };
    async function copyText(text) {
      if (!text) return { ok: false, text };
      try {
        if (!io.copy) throw new Error('コピー処理がありません。');
        await io.copy(text);
        return { ok: true, text };
      } catch { return { ok: false, text }; }
    }
    const format = themeId => formatAnswers(theme(themeId), cardId => get(themeId, cardId));
    return {
      get,
      update(themeId, cardId, value) {
        const answer = validateAnswer(value, card(themeId, cardId));
        const id = key(themeId, cardId);
        records.set(id, answer);
        try { io.write?.(id, JSON.stringify({ schemaVersion: answerVersion, ...answer })); }
        catch { problems.add('save-failed'); }
      },
      clear(themeId) {
        const current = theme(themeId);
        const ids = new Set(current.cards.map(card => key(themeId, card.id)));
        try { for (const id of io.keys?.() || []) if (id.startsWith(prefix(themeId))) ids.add(id); }
        catch { problems.add('clear-failed'); }
        for (const id of ids) {
          if (records.has(id)) records.set(id, blank());
          try { io.remove?.(id); } catch { problems.add('clear-failed'); }
        }
      },
      count: themeId => theme(themeId).cards.filter(card => hasAnswer(get(themeId, card.id))).length,
      format,
      copy: themeId => copyText(format(themeId)),
      formatAll() {
        if (data.themes.length === 1) return format(data.themes[0].id);
        return data.themes.map(theme => [theme, format(theme.id)]).filter(([, text]) => text)
          .map(([theme, text]) => '【' + theme.name + '】\n' + text).join('\n\n');
      },
      countAll() { return data.themes.reduce((total, theme) => total + this.count(theme.id), 0); },
      clearAll() { for (const theme of data.themes) this.clear(theme.id); },
      copyAll() { return copyText(this.formatAll()); },
      issues: () => [...problems],
    };
  }

  const api = { schemaVersion, validateDocument, blank, hasAnswer, formatAnswers, createAnswers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DCardsAnswers = api;
})(globalThis);
