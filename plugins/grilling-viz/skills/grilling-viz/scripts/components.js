(function(root) {
  'use strict';
  const A = typeof module !== 'undefined' && module.exports ? require('./answer.js') : root.GrillingAnswers;
  const {blank, hasAnswer} = A;
  const status = answer => hasAnswer(answer) ? 'answered' : 'open';
  const stateLabels = {open:'未回答',answered:'回答あり'};
  const emptyLabels = {all:'このテーマにはまだ質問がありません。',open:'未回答の質問はありません。',answered:'回答済みの質問はありません。'};
  const messageLabels = {
    'copied':'回答をコピーしました。',
    'copy-changed':'回答をコピーしました。コピー中に変更した内容は含まれていません。',
    'save-failed':'回答を保存できません。閉じる前にコピーしてください。',
    'restore-failed':'保存した回答の一部を読み込めませんでした。',
    'storage-unavailable':'このブラウザーでは回答を保存・復元できません。閉じる前にコピーしてください。',
    'clear-failed':'保存された回答を削除できませんでした。再読み込みすると元の回答が戻る場合があります。'
  };
  let nextId=0;
  const uid=()=> 'gv-'+(++nextId);
  function el(tag,attrs={},...children) {
    const node=document.createElement(tag);
    for(const [key,value] of Object.entries(attrs)) {
      if(value===false || value===null || value===undefined) continue;
      node.setAttribute(key,value===true?'':String(value));
    }
    for(const child of children.flat(Infinity)) if(child!==null && child!==undefined) node.append(child instanceof Node?child:String(child));
    return node;
  }

  const text=(content,cls='')=>el('p',{class:cls},content);
  function button(label,kind='primary',attrs={}) {
    const classes='gv-button'+(kind==='primary'?'':' gv-button-secondary');
    return el('button',{type:'button',class:classes,...attrs},label);
  }
  // Radios are pre-checked by the browser before click handlers; retain committed state for toggling.
  const radioBindings=new WeakMap();
  function radioGroup(input) {
    return Array.from(input.getRootNode().querySelectorAll('.gv-radio')).filter(peer=>peer.name===input.name && peer.form===input.form);
  }
  function selectRadio(input,selected) {
    if(input.disabled)return;
    for(const peer of radioGroup(input)) {
      peer.checked=selected && peer===input;
      radioBindings.get(peer).selected=peer.checked;
    }
    radioBindings.get(input).onChange(selected);
  }
  function radio({name=uid(),checked=false,disabled=false,label='選択肢',preview}={},onChange=()=>{}) {
    const input=el('input',{type:'radio',class:'gv-radio',name,checked,disabled,'aria-label':label,'data-preview':preview});
    radioBindings.set(input,{selected:checked,onChange});
    input.addEventListener('click',()=>selectRadio(input,!radioBindings.get(input).selected));
    input.addEventListener('keydown',event=>{
      if(event.key===' ' || event.key==='Enter') {
        event.preventDefault();
        if(!event.repeat)selectRadio(input,!radioBindings.get(input).selected);
        return;
      }
      const direction={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[event.key];
      if(!direction)return;
      event.preventDefault();
      const peers=radioGroup(input).filter(peer=>!peer.disabled);
      const next=peers[(peers.indexOf(input)+direction+peers.length)%peers.length];
      if(next){next.focus();selectRadio(next,true);}
    });
    return input;
  }
  function option(label,attrs={},onChange=()=>{}) {
    const {preview,...control}=attrs;
    return el('label',{class:'gv-option','data-preview':preview},radio({label,...control},onChange),el('span',{},label));
  }
  function input(value='',attrs={}) {
    const node=el('textarea',{class:'gv-input',rows:3,'aria-label':'自由入力',...attrs},value);
    if (!CSS.supports('field-sizing', 'content')) {
      let width;
      const resize = () => {
        if (!node.getBoundingClientRect().width) return;
        node.style.height = 'auto';
        const style = getComputedStyle(node);
        node.style.height = (node.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)) + 'px';
      };
      node.addEventListener('input', resize);
      new ResizeObserver(() => {
        if (width !== node.clientWidth) { width = node.clientWidth; resize(); }
      }).observe(node);
    }
    return node;
  }
  const badge=(state='open')=>el('span',{class:'gv-badge','data-state':state},stateLabels[state]);
  function meta(id,state) { return el('div',{class:'gv-meta'},el('span',{class:'gv-small'},id),badge(state)); }
  function prompt(q,answer=blank()) {
    const heading=el('h3',{class:'gv-question-title',id:uid()},q.title);
    return el('header',{class:'gv-prompt'},meta(q.id,status(answer)),heading);
  }
  function optionGroup(q,answer=blank(),onChange=()=>{},labelId) {
    const name=uid();
    const group=el('fieldset',{class:'gv-options','aria-labelledby':labelId,'aria-label':labelId?null:q.title});
    for(const item of q.options) {
      const choice=option(item.label,{name,checked:answer.choice===item.id},checked=>{
        answer.choice=checked?item.id:null;
        onChange(answer);
      });
      choice.querySelector('input').value=item.id;
      group.append(choice);
    }
    return group;
  }
  function noteHeading(labelId) {
    return el('div',{class:'gv-note-heading'},el('label',{class:'gv-label',for:labelId},'自由入力'));
  }
  function answerBlock(q,answer=blank(),onChange=()=>{},labelId) {
    const noteId=uid();
    const group=optionGroup(q,answer,onChange,labelId);
    const heading=noteHeading(noteId);
    const field=input(answer.note,{id:noteId,'aria-describedby':labelId});
    field.addEventListener('input',()=>{answer.note=field.value;onChange(answer);});
    return el('div',{class:'gv-answer'},group,el('div',{},heading,field));
  }
  function questionBlock(q,answer=blank(),onChange=()=>{}) {
    const header=prompt(q,answer);
    const control=answerBlock(q,answer,()=>{
      const state=header.querySelector('.gv-badge');state.dataset.state=status(answer);state.textContent=stateLabels[status(answer)];onChange(answer);
    },header.querySelector('h3').id);
    return el('article',{class:'gv-question','data-question-id':q.id},header,control);
  }
  function themeButton(theme,selected=false,attrs={}) {
    return el('button',{type:'button',class:'gv-theme-button','aria-current':String(selected),...attrs},el('span',{},theme.name),el('small',{},'質問 '+theme.questions.length+'件'));
  }

  function themeList(themes,current=themes[0]?.id,onChange=()=>{}) {
    const list=el('div',{class:'gv-theme-list'});
    for(const theme of themes) {
      const b=themeButton(theme,theme.id===current);
      b.addEventListener('click',()=>{
        list.querySelectorAll('button').forEach(n=>n.setAttribute('aria-current',String(n===b)));
        onChange(theme.id);
      });
      list.append(b);
    }
    return el('aside',{class:'gv-theme-nav','aria-label':'テーマ一覧'},text('テーマ','gv-small'),list);
  }
  function themeHeader(theme) {
    return el('header',{class:'gv-theme-header'},el('h2',{class:'gv-title'},theme.name),
      theme.description ? text(theme.description,'gv-small') : null);
  }
  function filterButton(label='すべて',active=false,attrs={}) {
    return el('button',{type:'button',class:'gv-filter','aria-pressed':String(active),...attrs},label);
  }
  function filters(current='all',onChange=()=>{}) {
    const group=el('div',{class:'gv-filters',role:'group','aria-label':'質問の表示切り替え'});
    for(const [value,label] of [['all','すべて'],['open','未回答'],['answered','回答あり']]) {
      const b=filterButton(label,value===current,{'data-filter':value});
      b.addEventListener('click',()=>{
        group.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
        onChange(value);
      });
      group.append(b);
    }
    return group;
  }
  const toolbar=(current='all',onChange)=>el('div',{class:'gv-toolbar'},filters(current,onChange));
  const count=(answers,total)=>text('回答あり '+answers+' / '+total+'件','gv-count');
  function actions(enabled=true,onClear=()=>{},onCopy=()=>{}) {
    const clear=button('回答をクリア','secondary',{disabled:!enabled,'data-clear':true});
    const copy=button('回答をコピー','primary',{disabled:!enabled,'data-copy':true});
    clear.addEventListener('click',onClear);
    copy.addEventListener('click',onCopy);
    return el('div',{class:'gv-actions'},clear,copy);
  }
  const footer=(answered=0,total=0,onClear,onCopy)=>el('footer',{class:'gv-footer'},count(answered,total),actions(answered>0,onClear,onCopy));
  function manualCopy(content) {
    const field=input(content,{readonly:true,'aria-label':'コピーする回答'});
    const select=button('全文を選択','secondary');
    select.addEventListener('click',()=>{field.focus();field.select();});
    return el('section',{class:'gv-manual'},el('h3',{class:'gv-question-title'},'この欄からコピーしてください'),
      text('ブラウザーが自動コピーを許可しませんでした。全文を選択し、コピーしてください。','gv-small'),field,el('div',{},select));
  }
  function message(code) {
    return text(messageLabels[code], 'gv-feedback' + (['copied','copy-changed'].includes(code) ? '' : ' gv-error'));
  }
  async function copyInto(area,answers,themeId) {
    area.replaceChildren();
    const result=await answers.copy(themeId);
    area.replaceChildren(result.ok ? message(result.text===answers.format(themeId)?'copied':'copy-changed') : manualCopy(result.text));
  }
  const empty = (filter='all') => text(emptyLabels[filter],'gv-empty');
  const divider = () => el('hr',{class:'gv-divider'});
  const noscript = () => text('回答の入力とコピーにはJavaScriptが必要です。');
  const questionList = (questions,getAnswer=()=>blank(),onChange=()=>{}) =>
    el('div',{class:'gv-question-list'},questions.map(q=>questionBlock(q,getAnswer(q.id),a=>onChange(q.id,a))));
  function confirmClear(themeName,onClear,confirm=message=>window.confirm(message)) {
    if (confirm('「'+themeName+'」の回答をクリアしますか？')) { onClear(); return true; }
    return false;
  }
  function browserIO() {
    return {
      read: key=>localStorage.getItem(key),
      write: (key,value)=>localStorage.setItem(key,value),
      remove: key=>localStorage.removeItem(key),
      keys: ()=>Object.keys(localStorage),
      copy: text=>navigator.clipboard.writeText(text),
    };
  }

  function workspace(data,io=browserIO()) {
    const answers=A.createAnswers(data,io);
    const views=new Map();
    const nav=themeList(data.themes,data.themes[0].id,id=>{
      for (const [themeId,view] of views) { view.hidden=themeId!==id; }
    });
    const main=el('section',{class:'gv-main','aria-label':'選択したテーマ'});
    for(const theme of data.themes) {
      const view=el('section',{'data-theme-id':theme.id,hidden:theme!==data.themes[0]});
      let filter='all',busy=false;
      const feedback=el('div',{role:'status','aria-live':'polite'});
      const warning=el('div',{class:'gv-warning',role:'status'});
      const updateAnswer=(id,answer)=>{
        answers.update(theme.id,id,answer);
        feedback.replaceChildren();
        refresh();
      };
      const list=questionList(theme.questions,id=>answers.get(theme.id,id),updateAnswer);
      const missing=empty();
      const foot=footer(0,theme.questions.length,()=>{
        confirmClear(theme.name,()=>{
          answers.clear(theme.id);
          const replacement=questionList(theme.questions,id=>answers.get(theme.id,id),updateAnswer);
          list.replaceChildren(...replacement.children);
          feedback.replaceChildren();refresh();
        });
      },async()=>{
        busy=true;refresh();
        await copyInto(feedback,answers,theme.id);
        busy=false;refresh();
      });
      function refresh() {
        const n=answers.count(theme.id);
        foot.querySelector('.gv-count').textContent=count(n,theme.questions.length).textContent;
        const copy=foot.querySelector('[data-copy]');
        copy.disabled=busy||n===0;copy.textContent=busy?'コピー中…':'回答をコピー';
        copy.setAttribute('aria-busy',String(busy));
        foot.querySelector('[data-clear]').disabled=busy||!theme.questions.some(q=>{
          const a=answers.get(theme.id,q.id);return a.choice!==null||a.note.length;
        });
        for(const item of list.children) {
          const matches=filter==='all'||status(answers.get(theme.id,item.dataset.questionId))===filter;
          item.hidden=!matches&&!item.contains(document.activeElement);
        }
        missing.textContent=emptyLabels[filter];
        missing.hidden=Array.from(list.children).some(item=>!item.hidden);
        warning.replaceChildren(...answers.issues().map(message));
        warning.hidden=!answers.issues().length;
      }
      list.addEventListener('focusout',()=>queueMicrotask(refresh));
      view.append(themeHeader(theme),toolbar(filter,value=>{filter=value;refresh();}),list,missing,foot,warning,feedback);
      views.set(theme.id,view);main.append(view);refresh();
    }
    return el('div',{class:'gv-viewport'},el('div',{class:'gv-workspace'},nav,main));
  }

  const inventory=[
    ['primitives','基本部品',[
      ['text','文字',text],['radio','ラジオボタン',radio],['option','選択肢',option],['input','自由入力欄',input],
      ['buttons','ボタン',button],['filter-button','フィルターボタン',filterButton],['theme-button','テーマボタン',themeButton],
      ['badge','回答状態',badge],['metadata','識別子・件数',meta],['messages','メッセージ',message],['divider','境界線',divider]
    ]],
    ['compositions','組み合わせ',[
      ['theme-header','テーマ見出し',themeHeader],['question-prompt','質問見出し',prompt],['option-group','選択肢グループ',optionGroup],
      ['note-heading','自由入力ラベル',noteHeading],['answer-block','回答入力',answerBlock],['question-block','質問と回答',questionBlock],
      ['filters','フィルター列',filters],['actions','回答操作',actions],['manual-copy','手動コピー',manualCopy],['clear-confirm','回答をクリアする確認',confirmClear]
    ]],
    ['collections','一覧',[
      ['theme-list','テーマ一覧',themeList],['question-list','質問一覧',questionList],['toolbar','質問一覧の操作領域',toolbar],
      ['footer','質問一覧のフッター',footer],['empty','質問がないとき',empty],['noscript','JavaScriptが無効なとき',noscript]
    ]],
    ['screens','画面全体',[['workspace','テーマ一覧とテーマ内の質問一覧',workspace]]]
  ];
  const api={inventory,el,uid,count,messageLabels,browserIO,copyInto};
  for(const [,,entries] of inventory) for(const [id,,build] of entries) api[id]=build;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.GrillingComponents=api;
})(globalThis);
