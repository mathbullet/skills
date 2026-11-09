(function(root) {
  'use strict';
  const A = typeof module !== 'undefined' && module.exports ? require('./answer.js') : root.DCardsAnswers;
  const {blank, hasAnswer} = A;
  const status = answer => hasAnswer(answer) ? 'answered' : 'open';
  const stateLabels = {open:'未回答',answered:'回答あり'};
  const messageLabels = {
    'copied':'回答をコピーしました。',
    'copy-changed':'回答をコピーしました。コピー中に変更した内容は含まれていません。',
    'save-failed':'回答を保存できません。閉じる前にコピーしてください。',
    'restore-failed':'保存した回答の一部を読み込めませんでした。',
    'storage-unavailable':'このブラウザーでは回答を保存・復元できません。閉じる前にコピーしてください。',
    'clear-failed':'保存された回答を削除できませんでした。再読み込みすると元の回答が戻る場合があります。'
  };
  let nextId=0;
  const uid=()=> 'dc-'+(++nextId);
  const figureKey=(themeId,cardId)=>JSON.stringify([themeId,cardId]);
  function el(tag,attrs={},...children) {
    const node=document.createElement(tag);
    for(const [key,value] of Object.entries(attrs)) {
      if(value===false || value===null || value===undefined) continue;
      node.setAttribute(key,value===true?'':String(value));
    }
    for(const child of children.flat(Infinity)) if(child!==null && child!==undefined) node.append(child instanceof Node?child:String(child));
    return node;
  }
  const text=(content,cls='')=>el('p',{class:cls||null},content);
  function button(label,kind='secondary',attrs={}) {
    return el('button',{type:'button',class:'dc-button'+(kind==='primary'?' dc-button-primary':''),...attrs},label);
  }

  const radioBindings=new WeakMap();
  function radioGroup(input) {
    return Array.from(input.getRootNode().querySelectorAll('.dc-radio')).filter(peer=>peer.name===input.name && peer.form===input.form);
  }
  function selectRadio(input,selected) {
    if(input.disabled)return;
    for(const peer of radioGroup(input)) {
      peer.checked=selected && peer===input;
      radioBindings.get(peer).selected=peer.checked;
    }
    radioBindings.get(input).onChange(selected);
  }
  function radio({name=uid(),checked=false,label='選択肢',value}={},onChange=()=>{}) {
    const input=el('input',{type:'radio',class:'dc-radio',name,checked,value,'aria-label':label});
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
      const peers=radioGroup(input);
      const next=peers[(peers.indexOf(input)+direction+peers.length)%peers.length];
      if(next){next.focus();selectRadio(next,true);}
    });
    return input;
  }
  function input(value='',attrs={}) {
    const node=el('textarea',{class:'dc-input',rows:3,'aria-label':'自由入力',...attrs},value);
    if (!CSS.supports('field-sizing', 'content')) {
      const resize = () => {
        if (!node.getBoundingClientRect().width) return;
        node.style.height = 'auto';
        node.style.height = (node.scrollHeight + 4) + 'px';
      };
      node.addEventListener('input', resize);
      new ResizeObserver(resize).observe(node);
    }
    return node;
  }

  function cardNav(cards,onSelect=()=>{}) {
    const nav=el('nav',{class:'dc-nav','aria-label':'カード一覧'});
    cards.forEach((card,index)=>{
      const target=el('button',{type:'button',class:'dc-nav-button','data-card-id':card.id,title:card.title,'aria-current':String(index===0),'data-state':'open'},String(index+1));
      target.addEventListener('click',()=>onSelect(index));
      nav.append(target);
    });
    return nav;
  }
  function updateNav(nav,index,stateOf) {
    Array.from(nav.children).forEach((target,position)=>{
      const state=stateOf(target.dataset.cardId);
      target.setAttribute('aria-current',String(position===index));
      target.dataset.state=state;
      target.setAttribute('aria-label','カード '+(position+1)+'：'+stateLabels[state]);
    });
  }
  function context(card) {
    return el('section',{class:'dc-context'},el('h3',{class:'dc-section-label'},'背景'),card.context.map(paragraph=>text(paragraph)));
  }
  function figure(svg,caption,number) {
    const frame=el('div',{class:'mb-figure-frame'});
    frame.innerHTML=svg;
    frame.querySelector('svg')?.setAttribute('aria-label',caption);
    return el('figure',{class:'mb-figure'},frame,el('figcaption',{},'図'+number+'　'+caption));
  }
  function optionGroup(card,answer=blank(),onChange=()=>{},labelId) {
    const name=uid();
    const group=el('fieldset',{class:'dc-options','aria-labelledby':labelId});
    for(const item of card.options) {
      const recommended=card.recommendation?.option===item.id;
      const control=radio({name,checked:answer.choice===item.id,label:item.label,value:item.id},checked=>{
        answer.choice=checked?item.id:null;
        onChange(answer);
      });
      group.append(el('label',{class:'dc-option'},control,
        el('span',{class:'dc-option-label'},item.label,recommended?el('span',{class:'dc-recommended'},'推奨'):null),
        el('span',{class:'dc-option-consequence'},item.consequence)));
    }
    return group;
  }
  function recommendation(card) {
    if(!card.recommendation)return null;
    const chosen=card.options.find(item=>item.id===card.recommendation.option);
    return text('推奨：'+chosen.label+'。'+card.recommendation.reason,'dc-recommendation');
  }
  function note(answer,onChange,labelId) {
    const id=uid();
    const field=input(answer.note,{id,'aria-describedby':labelId});
    field.addEventListener('input',()=>{answer.note=field.value;onChange(answer);});
    return el('div',{},el('label',{class:'dc-section-label',for:id,style:'display:block'},'自由入力'),field);
  }
  function decisionCard(card,{answer=blank(),position=1,total=1,svg,figureNumber=1,onChange=()=>{}}={}) {
    const questionId=uid();
    const state=el('span',{'data-state':status(answer)},stateLabels[status(answer)]);
    const changed=value=>{state.dataset.state=status(value);state.textContent=stateLabels[status(value)];onChange(value);};
    return el('article',{class:'mb-card dc-card','data-card-id':card.id,'aria-labelledby':questionId},
      el('div',{class:'dc-card-meta'},el('span',{},'カード '+position+' / '+total+'　'+card.id),state),
      context(card),
      card.figure&&svg?figure(svg,card.figure.caption,figureNumber):null,
      el('h2',{class:'dc-question',id:questionId},card.title),
      optionGroup(card,answer,changed,questionId),
      recommendation(card),
      note(answer,changed,questionId));
  }
  function pager(onMove=()=>{}) {
    const previous=button('前へ','secondary',{'data-move':'-1'});
    const next=button('次へ','primary',{'data-move':'1'});
    previous.addEventListener('click',()=>onMove(-1));
    next.addEventListener('click',()=>onMove(1));
    return el('div',{class:'dc-pager'},previous,el('span',{class:'dc-pager-position','aria-live':'polite'}),next);
  }
  function updatePager(node,index,total,nextIsNewTheme=false) {
    node.querySelector('[data-move="-1"]').disabled=index===0;
    const next=node.querySelector('[data-move="1"]');
    next.disabled=index===total-1;
    next.textContent=nextIsNewTheme?'次のテーマへ':'次へ';
    node.querySelector('.dc-pager-position').textContent=(index+1)+' / '+total;
  }
  const count=(answered,total)=>text('回答あり '+answered+' / '+total+'枚','dc-count');
  function footer(onClear=()=>{},onCopy=()=>{}) {
    const clear=button('回答をクリア','secondary',{'data-clear':true});
    const copy=button('回答をコピー','primary',{'data-copy':true});
    clear.addEventListener('click',onClear);
    copy.addEventListener('click',onCopy);
    return el('footer',{class:'dc-footer'},
      el('div',{class:'dc-footer-row'},count(0,0),el('div',{class:'dc-actions'},clear,copy)),
      el('div',{class:'dc-copy-result',role:'status','aria-live':'polite','aria-atomic':'true'}));
  }
  function manualCopy(content) {
    const field=input(content,{readonly:true,'aria-label':'コピーする回答'});
    const select=button('全文を選択');
    select.addEventListener('click',()=>{field.focus();field.select();});
    return el('section',{class:'dc-manual'},el('h3',{},'この欄からコピーしてください'),
      text('ブラウザーが自動コピーを許可しませんでした。全文を選択し、コピーしてください。'),field,select);
  }
  function message(code) {
    return text(messageLabels[code],'dc-feedback'+(['copied','copy-changed'].includes(code)?'':' dc-error'));
  }
  async function copyAllInto(area,answers) {
    area.replaceChildren();
    const result=await answers.copyAll();
    area.replaceChildren(result.ok?message(result.text===answers.formatAll()?'copied':'copy-changed'):manualCopy(result.text));
  }
  function confirmClear(themeName,onClear,confirm=message=>window.confirm(message)) {
    if(confirm(themeName+'の回答をクリアしますか？')){onClear();return true;}
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

  function themeHeading(theme,position=1,total=1) {
    return el('header',{class:'dc-header'},
      total>1?el('p',{class:'dc-theme-position'},'テーマ '+position+' / '+total):null,
      el('h1',{},theme.name),
      theme.description?text(theme.description):null);
  }

  function workspace(data,figures={},io=browserIO()) {
    const answers=A.createAnswers(data,io);
    const steps=data.themes.flatMap((theme,themeIndex)=>theme.cards.map(card=>({theme,themeIndex,card})));
    const figureNumbers=new Map();
    for(const theme of data.themes) theme.cards.filter(card=>card.figure).forEach((card,position)=>figureNumbers.set(figureKey(theme.id,card.id),position+1));
    let index=0,busy=false,shownTheme=null,nav=null;
    const heading=el('div',{});
    const navSlot=el('div',{});
    const slot=el('div',{});
    const warning=el('div',{class:'dc-feedback dc-error',role:'status'});
    const pages=pager(step=>show(index+step));
    const foot=footer(()=>confirmClear('すべてのテーマ',()=>{answers.clearAll();feedback.replaceChildren();show(index);}),async()=>{
      busy=true;refresh();
      await copyAllInto(feedback,answers);
      busy=false;refresh();
    });
    const feedback=foot.querySelector('.dc-copy-result');
    function refresh() {
      const {theme,card}=steps[index];
      const answered=answers.countAll();
      updateNav(nav,theme.cards.indexOf(card),id=>status(answers.get(theme.id,id)));
      updatePager(pages,index,steps.length,steps[index+1]&&steps[index+1].theme!==theme);
      foot.querySelector('.dc-count').textContent=count(answered,steps.length).textContent;
      const copy=foot.querySelector('[data-copy]');
      copy.disabled=busy||answered===0;copy.textContent=busy?'コピー中…':'回答をコピー';
      foot.querySelector('[data-clear]').disabled=busy||answered===0;
      warning.replaceChildren(...answers.issues().map(code=>messageLabels[code]+' '));
      warning.hidden=!answers.issues().length;
    }
    function show(target) {
      index=Math.max(0,Math.min(steps.length-1,target));
      const {theme,themeIndex,card}=steps[index];
      if(shownTheme!==theme) {
        shownTheme=theme;
        heading.replaceChildren(themeHeading(theme,themeIndex+1,data.themes.length));
        const offset=steps.findIndex(step=>step.theme===theme);
        nav=cardNav(theme.cards,position=>show(offset+position));
        navSlot.replaceChildren(nav);
      }
      slot.replaceChildren(decisionCard(card,{
        answer:answers.get(theme.id,card.id),position:theme.cards.indexOf(card)+1,total:theme.cards.length,
        svg:figures[figureKey(theme.id,card.id)],figureNumber:figureNumbers.get(figureKey(theme.id,card.id)),
        onChange:value=>{answers.update(theme.id,card.id,value);feedback.replaceChildren();refresh();}
      }));
      refresh();
    }
    if(!steps.length) return el('div',{},text('カードがありません。'));
    show(0);
    return el('div',{},heading,navSlot,slot,pages,foot,warning);
  }

  const inventory=[
    ['card-parts','カードの部品',[
      ['context','背景',context],['figure','図',figure],['option-group','選択肢と帰結',optionGroup],
      ['recommendation','推奨と理由',recommendation],['decision-card','decision card',decisionCard]
    ]],
    ['navigation','移動',[['theme-heading','テーマ見出し',themeHeading],['card-nav','カード番号',cardNav],['pager','前へ／次へ',pager]]],
    ['answers','回答の操作',[['footer','回答数とコピー',footer],['manual-copy','手動コピー',manualCopy],['messages','メッセージ',message]]],
    ['screens','画面全体',[['workspace','decision card の画面',workspace]]]
  ];
  const api={inventory,el,uid,figureKey,messageLabels,browserIO,copyAllInto,confirmClear,updateNav,updatePager};
  for(const [,,entries] of inventory) for(const [id,,build] of entries) api[id]=build;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.DCardsComponents=api;
})(globalThis);
