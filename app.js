
"use strict";
const KEY="deutsch-klar-v1";
const TARGET="2026-12-31";
const NEW_LIMIT=12;
const STEPS=[1,3,7,14,30];
let DATA={words:[],grammar:[],speaking:[],tests:[]};
const UI={view:"today",deck:"all",filter:"all",level:"A2",search:"",lesson:null,word:null,scenario:null,session:null,quiz:null,showAllWords:false};

const $=q=>document.querySelector(q);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const today=()=>dateKey(new Date());
let S=loadState();
function addDays(key,n){const [y,m,d]=key.split("-").map(Number),day=new Date(y,m-1,d);day.setDate(day.getDate()+n);return dateKey(day);}
const daysLeft=()=>Math.max(0,Math.round((new Date(2026,11,31).getTime()-new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()).getTime())/86400000));
function loadState(){try{const o=JSON.parse(localStorage.getItem(KEY)||"{}");return{cards:o.cards||{},history:o.history||{},grammarDone:o.grammarDone||{},misses:o.misses||{},introduced:o.introduced||{},startDate:o.startDate||today(),theme:o.theme||"light",migrated:!!o.migrated};}catch{return{cards:{},history:{},grammarDone:{},misses:{},introduced:{},startDate:today(),theme:"light",migrated:false};}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch{toast("Не удалось сохранить прогресс: сделай резервную копию.");}}
function toast(t){const box=$("#toast");if(!box)return;box.textContent=t;box.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>box.classList.remove("show"),2700);}
async function json(path){const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error("Не загружается "+path+" ("+r.status+")");return r.json();}
function normalize(s){return String(s||"").toLocaleLowerCase("de").trim().replace(/^(der|die|das)\s+/,"");}
function mergeWords(core,extra){const map=new Map();for(const item of [...core,...extra]){if(!item.german||!item.russian)continue;const k=normalize(item.german);const old=map.get(k);map.set(k,{...old,...item,id:old?.id||item.id,article:item.artikel||old?.artikel||"",exampleDE:item.exampleDE||old?.exampleDE||"",exampleRU:item.exampleRU||old?.exampleRU||"",priority:item.priority||old?.priority||"medium",plural:item.plural||old?.plural||"",notes:item.notes||old?.notes||""});}return[...map.values()].filter(x=>x.russian).sort((a,b)=>((a.priority==="high"?0:1)-(b.priority==="high"?0:1))||a.german.localeCompare(b.german,"de"));}
async function init(){
  try{
    const [core,essential,grammar,speaking,tests,legacy]=await Promise.all([json("data/core.json"),json("data/essentials.json"),json("data/grammar-core.json"),json("data/speaking.json"),json("data/tests.json"),json("data/vocabulary.json")]);
    DATA.words=mergeWords(core,essential);
    DATA.grammar=grammar;
    DATA.speaking=Array.isArray(speaking)?speaking:speaking.topics||[];
    DATA.tests=Array.isArray(tests)?tests:tests.tests||[];
    if(!S.migrated)migrate(legacy);
    applyTheme();render();
  }catch(e){console.error(e);$("#app").innerHTML='<div class="card"><h2>Не удалось загрузить данные</h2><p>'+esc(e.message)+'</p><p class="small muted">Открой сайт через GitHub Pages, а не как локальный HTML-файл. Затем обнови страницу.</p><button class="btn primary" onclick="location.reload()">Повторить</button></div>';}
}
function migrate(legacy){
  let count=0;
  try{
    const old=JSON.parse(localStorage.getItem("d90")||"{}").srs||{};
    for(const w of DATA.words){const e=old[w.id];if(e?.box&&!S.cards[w.id]){S.cards[w.id]={stage:Math.min(5,Number(e.box)),due:e.due||today()};count++;}}
    const sprint=JSON.parse(localStorage.getItem("deutschProgress")||"{}");
    for(const w of legacy){const stage=sprint[w.id]==="known"?3:sprint[w.id]==="learning"?1:0;if(!stage)continue;const matched=DATA.words.find(x=>normalize(x.german)===normalize(w.german));if(matched&&!S.cards[matched.id]){S.cards[matched.id]={stage,due:today()};count++;}}
  }catch(e){console.warn("Old progress unavailable",e);}
  S.migrated=true;save();if(count)toast("Сохранено "+count+" карточек из старых проектов");
}
function applyTheme(){document.documentElement.dataset.theme=S.theme;const theme=$("#themeBtn");if(theme)theme.textContent=S.theme==="dark"?"☀":"◐";}
function inDeck(w,deck){return deck==="all"||(deck==="drive"?w.topic==="Fahrschule":deck==="work"?(w.topic==="Arbeit & IT"||w.topic==="Arbeit"||w.topic==="Bildung"):!(["Fahrschule","Arbeit & IT"].includes(w.topic)));}
function deckName(d){return({all:"Все слова",life:"Повседневность",drive:"Вождение",work:"Работа и IT"})[d]||"Все слова";}
function decks(){return[{id:"life",name:"Повседневная жизнь",sub:"Магазины, врач, документы, семья",icon:"☕",className:"mint"},{id:"drive",name:"Вождение",sub:"Команды на экзамене и дорожные ситуации",icon:"↗",className:"peach"},{id:"work",name:"Работа и IT",sub:"Собеседования, QA, переписка",icon:"⌘",className:"lilac"}];}
function dueList(deck="all"){const t=today();return DATA.words.filter(w=>inDeck(w,deck)&&S.cards[w.id]&&S.cards[w.id].due<=t).sort((a,b)=>S.cards[a.id].due.localeCompare(S.cards[b.id].due));}
function newList(deck="all"){return DATA.words.filter(w=>inDeck(w,deck)&&!S.cards[w.id]);}
function introducedToday(){return(S.introduced[today()]||[]).length;}
function completed(){return DATA.words.filter(w=>(S.cards[w.id]?.stage||0)>=3).length;}
function started(){return DATA.words.filter(w=>S.cards[w.id]).length;}
function streak(){let n=0,d=today();if(!S.history[d]?.reviewed)d=addDays(d,-1);while(S.history[d]?.reviewed){n++;d=addDays(d,-1);}return n;}
function stats(){return{known:completed(),learning:started()-completed(),due:dueList().length,new:newList().length,total:DATA.words.length};}
function go(view){UI.view=view;UI.word=null;if(view!=="grammarDetail")UI.lesson=null;window.scrollTo({top:0,behavior:"instant"});render();}
function headline(title,sub,eyebrow){return`<div class="eyebrow">${esc(eyebrow||"DEUTSCH KLAR")}</div><h1 class="page-title">${esc(title)}</h1>${sub?`<p class="subtitle">${esc(sub)}</p>`:""}`;}
function render(){const app=$("#app");if(!app)return;const renders={today:renderToday,learn:renderLearn,words:renderWords,grammar:renderGrammar,grammarDetail:renderGrammarDetail,wordDetail:renderWordDetail,speak:renderSpeak,tests:renderTests,progress:renderProgress,more:renderMore};app.innerHTML=(renders[UI.view]||renderToday)();document.querySelectorAll("#nav [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===(["speak","tests","progress"].includes(UI.view)?"more":UI.view==="grammarDetail"?"grammar":UI.view==="wordDetail"?"words":UI.view)));applyTheme();}
function renderToday(){
  const t=new Date(),day=t.toLocaleDateString("ru-RU",{day:"numeric",month:"long"});
  const d=stats();const remaining=Math.max(0,NEW_LIMIT-introducedToday()),due=d.due,ready=Math.min(remaining,d.new);
  const grammar=DATA.grammar.find(g=>g.level==="A2"&&!S.grammarDone[g.id])||DATA.grammar.find(g=>!S.grammarDone[g.id]);
  return`${headline("Guten Tag! 👋",day+" · "+daysLeft()+" дней до 31 декабря","ТВОЯ ПОДГОТОВКА К B1")}
  <div class="card hero"><div class="label">ПЛАН НА СЕГОДНЯ</div><h2>12 слов. Одно правило. Живая речь.</h2>
  <p>${due?`${due} слов пора повторить. `:""}${ready?`Доступно до ${ready} новых слов. `:"Новые слова на сегодня закончились. "}Никакой гонки: важнее вспомнить без подсказки.</p>
  <button class="btn white" data-action="start" data-deck="all">Начать занятие <span>↗</span></button></div>
  <div class="stats-grid"><div class="stat"><div class="stat-num">${d.known}</div><div class="stat-name">Закреплено</div></div><div class="stat"><div class="stat-num">${d.due}</div><div class="stat-name">Повторить</div></div><div class="stat"><div class="stat-num">${streak()} 🔥</div><div class="stat-name">Дней подряд</div></div></div>
  <h2 class="section-title">Учи то, что нужно тебе</h2>${decks().map(x=>`<button class="deck" data-action="start" data-deck="${x.id}"><span class="deck-ic ${x.className}">${x.icon}</span><span class="deck-copy"><strong>${x.name}</strong><small>${x.sub}</small></span><span class="chevron">›</span></button>`).join("")}
  <h2 class="section-title">Ещё 10 минут с пользой</h2>
  ${grammar?`<button class="deck" data-action="lesson" data-id="${esc(grammar.id)}"><span class="deck-ic sky">§</span><span class="deck-copy"><strong>${esc(grammar.title)}</strong><small>Грамматика · ${esc(grammar.level)} · 3–5 примеров</small></span><span class="chevron">›</span></button>`:""}
  <button class="deck" data-view="speak"><span class="deck-ic lilac">♫</span><span class="deck-copy"><strong>Разговорная практика</strong><small>Слушай, повторяй и отвечай вслух</small></span><span class="chevron">›</span></button>
  <button class="deck" data-view="tests"><span class="deck-ic peach">✓</span><span class="deck-copy"><strong>Проверь себя</strong><small>10 вопросов · сразу разбираем ошибки</small></span><span class="chevron">›</span></button>
  <p class="tiny muted">Словарь содержит ${d.total} проверяемых карточек. Статус «закреплено» присваивается только после успешных повторений.</p>`;
}
function startSession(deck){
  UI.deck=deck||UI.deck;
  const due=dueList(UI.deck);
  const fresh=newList(UI.deck).slice(0,Math.max(0,NEW_LIMIT-introducedToday()));
  let list=[...due,...fresh];
  if(!list.length&&UI.deck!=="all"){list=[...dueList(),...newList().slice(0,Math.max(0,NEW_LIMIT-introducedToday()))];}
  UI.session={list,pos:0,flip:false,correct:0,reviewed:0,done:false};
  go("learn");
}
function lemma(w){return`${w.artikel?`<span class="article ${esc(w.artikel)}">${esc(w.artikel)}</span>`:""}${esc(w.german)}`;}
function renderLearn(){
  if(!UI.session)return`${headline("Учить слова","12 новых слов в день + повторение 1, 3, 7 и 14 дней","VOKABELTRAINER")}
  <div class="card"><h3>Выбери набор</h3><p class="muted">Сначала вспоминай сам, затем открывай перевод и оценивай ответ.</p><button class="btn primary full" data-action="start" data-deck="all">Начать все слова →</button></div>
  ${decks().map(x=>`<button class="deck" data-action="start" data-deck="${x.id}"><span class="deck-ic ${x.className}">${x.icon}</span><span class="deck-copy"><strong>${x.name}</strong><small>Новые слова и повторение</small></span><span class="chevron">›</span></button>`).join("")}`;
  const ss=UI.session;
  if(ss.done||ss.pos>=ss.list.length)return`${headline("Занятие готово ✓","Молодец, не считай карточки за знания. Возвращайся на повторение.","LERNEN")}
  <div class="card"><div class="result-num">${ss.correct}/${ss.reviewed}</div><p>Верных ответов в этой сессии</p><div class="progress"><i style="width:${ss.reviewed?100*ss.correct/ss.reviewed:0}%"></i></div></div>
  <button class="btn primary full" data-action="start" data-deck="${UI.deck}">Ещё повторить →</button><p class="small muted">Система назначила интервалы повторения автоматически.</p>`;
  const w=ss.list[ss.pos];const progress=ss.list.length?Math.round(ss.pos/ss.list.length*100):0;
  return`${headline("Учить слова",deckName(UI.deck)+" · повторяй до уверенного ответа","ВОСПОМИНАЙ, НЕ УГАДЫВАЙ")}
  <div class="row between"><span class="small strong">${ss.pos+1} / ${ss.list.length}</span><span class="pill">${S.cards[w.id]?"Повторение":"Новое слово"}</span></div>
  <div class="progress mt18"><i style="width:${progress}%"></i></div>
  <div class="learnbox"><div class="learnhead"><span>${esc(w.topic)} · ${esc(w.level||"A2")}</span><button class="speaka" data-action="speak" data-text="${esc((w.artikel?w.artikel+" ":"")+w.german)}" aria-label="Прослушать слово">♫</button></div>
  <button class="flashcard" data-action="${ss.flip?"none":"flip"}" ${ss.flip?'disabled':''}>
    <span class="flashword">${lemma(w)}</span>
    ${ss.flip?`<span class="flashtranslation">${esc(w.russian)}</span>${w.plural&&w.artikel?`<span class="small muted">Plural: ${esc(w.plural)}</span>`:""}${w.pos==="verb"&&w.preterite?`<span class="small muted">${esc(w.preterite)} · ${esc(w.participle)} · ${esc(w.aux)}</span>`:""}${w.notes?`<span class="small muted">${esc(w.notes)}</span>`:""}${w.exampleDE?`<span class="exde">${esc(w.exampleDE)}</span>`:""}${w.exampleRU?`<span class="exru">${esc(w.exampleRU)}</span>`:""}`
    :`<span class="hint">Вспомни перевод и произнеси слово вслух.<br>Нажми, чтобы проверить себя.</span>`}
  </button></div>
  ${ss.flip?`<div class="grade-grid"><button class="btn review-btn" data-action="grade" data-ok="0">↻ Не вспомнил</button><button class="btn good-btn" data-action="grade" data-ok="1">✓ Вспомнил</button></div>`:`<button class="btn primary full" data-action="flip">Показать перевод →</button>`}
  <p class="tiny muted mt18">Нельзя отмечать слово выученным, пока не открыт ответ. Ошибки возвращаются на повторение.</p>`;
}
function grade(ok){
  const ss=UI.session;if(!ss||!ss.list[ss.pos]||!ss.flip)return;
  const w=ss.list[ss.pos],old=S.cards[w.id],d=today();
  if(!old){(S.introduced[d] ||= []).push(w.id);}
  const stage=ok?Math.min(5,(old?.stage||0)+1):0;
  S.cards[w.id]={stage,due:addDays(d,ok?STEPS[Math.max(0,stage-1)]:1),wrong:(old?.wrong||0)+(ok?0:1)};
  S.history[d] ||= {reviewed:0,correct:0};
  S.history[d].reviewed++;if(ok){S.history[d].correct++;ss.correct++;}else{S.misses[w.topic]=(S.misses[w.topic]||0)+1;}
  ss.reviewed++;ss.pos++;ss.flip=false;save();render();
}
function renderWords(){
  let collection=DATA.words.filter(w=>inDeck(w,UI.filter));
  const q=normalize(UI.search);if(q)collection=collection.filter(w=>normalize(w.german).includes(q)||String(w.russian).toLowerCase().includes(q));
  const limit=UI.showAllWords?500:40;
  return`${headline("Словарь","Поиск, примеры, артикли и произношение","WORTSCHATZ")}
  <input class="search" id="wordSearch" placeholder="Например: Termin, работа, поворот…" value="${esc(UI.search)}" autocomplete="off" aria-label="Поиск слов">
  <div class="filters">${[{id:"all",label:"Все"},{id:"life",label:"Быт"},{id:"drive",label:"Вождение"},{id:"work",label:"Работа / IT"}].map(x=>`<button class="chip ${UI.filter===x.id?"active":""}" data-action="filter" data-id="${x.id}">${x.label}</button>`).join("")}</div>
  <div id="wordCount" class="tiny muted mb14">${collection.length} записей · показано ${Math.min(limit,collection.length)}</div>
  <div id="wordResults">${listWords(collection,limit)}</div>`;
}
function listWords(collection,limit){return collection.slice(0,limit).map(w=>`<div class="word-card"><button class="word-card-body" style="background:none;border:0;text-align:left;padding:0;cursor:pointer;color:inherit" data-action="word" data-id="${esc(w.id)}"><strong>${lemma(w)}</strong><small>${esc(w.russian)}</small></button><button class="speaka" aria-label="Произнести" data-action="speak" data-text="${esc((w.artikel?w.artikel+" ":"")+w.german)}">♫</button></div>`).join("")+(collection.length>limit?`<button class="btn soft full" data-action="moreWords">Показать ещё ↓</button>`:collection.length?"":'<div class="empty">Таких слов не найдено.</div>');}
function renderWordDetail(){
 const w=DATA.words.find(x=>String(x.id)===String(UI.word));if(!w)return renderWords();
 return`<button class="btn soft mb14" data-view="words">← К словарю</button><div class="card"><div class="eyebrow">${esc(w.topic)} · ${esc(w.level)}</div><h1 class="page-title" style="margin:16px 0">${lemma(w)}</h1><h3>${esc(w.russian)}</h3><button class="btn soft" data-action="speak" data-text="${esc((w.artikel?w.artikel+" ":"")+w.german)}">♫ Произнести</button>${w.plural&&w.artikel?`<p>Plural: <b>${esc(w.plural)}</b></p>`:""}${w.pos==="verb"&&w.preterite?`<p class="small">Präteritum: <b>${esc(w.preterite)}</b><br>Partizip II: <b>${esc(w.participle)}</b><br>Hilfsverb: <b>${esc(w.aux)}</b></p>`:""}${w.exampleDE?`<div class="example"><b>${esc(w.exampleDE)}</b><small>${esc(w.exampleRU||"Перевод примера пока не добавлен")}</small></div>`:""}${w.notes?`<p class="small muted">${esc(w.notes)}</p>`:""}</div>`;
}
function renderGrammar(){
  const a=DATA.grammar.filter(g=>g.level===UI.level);
  return`${headline("Грамматика","Правило → формула → примеры → практика","GRAMMATIK")}
  <div class="level-tabs">${["A1","A2","B1"].map(l=>`<button class="chip ${UI.level===l?"active":""}" data-action="level" data-id="${l}">${l}</button>`).join("")}</div>
  <div class="tiny muted mb14">${Object.keys(S.grammarDone).length} тем отмечено как изученные из ${DATA.grammar.length}. Начни с пробелов A2.</div>
  ${a.map((g,i)=>`<button class="grammar-item" data-action="lesson" data-id="${esc(g.id)}"><span class="grammar-num">${String(i+1).padStart(2,"0")}</span><span class="grammar-copy">${esc(g.title)}</span><span class="chevron">${S.grammarDone[g.id]?"✓":"›"}</span></button>`).join("")}`;
}
function renderGrammarDetail(){
  const g=DATA.grammar.find(x=>x.id===UI.lesson);if(!g)return renderGrammar();
  return`<button class="btn soft mb14" data-view="grammar">← Все правила</button>${headline(g.title,"Уровень "+g.level,"GRAMMATIK")}
  <div class="card"><h3>Объяснение</h3><p>${esc(g.explanationRU||"")}</p><div class="rule">${esc(g.formula||"")}</div></div>
  <h2 class="section-title">Примеры</h2><div class="card">${(g.examples||[]).slice(0,5).map(e=>`<div class="example"><b>${esc(e.de)}</b><small>${esc(e.ru)}</small><button class="speaka mt18" data-action="speak" data-text="${esc(e.de)}" aria-label="Прослушать пример">♫</button></div>`).join("")}</div>
  <h2 class="section-title">Самостоятельно</h2><div class="card">${(g.exercises||[]).slice(0,5).map((e,i)=>`<div class="exercise"><p>${i+1}. ${esc(e.task)}</p><button data-action="showAnswer" data-id="${i}">Показать ответ</button><div class="answer" id="a${i}" hidden>${esc(e.answer)}</div></div>`).join("")}
  ${g.mistakesRU?`<details class="mt18"><summary>Типичные ошибки</summary><p class="small muted">${esc(typeof g.mistakesRU==="string"?g.mistakesRU:g.mistakesRU.join("; "))}</p></details>`:""}</div>
  <button class="btn ${S.grammarDone[g.id]?"soft":"primary"} full" data-action="markGrammar" data-id="${esc(g.id)}">${S.grammarDone[g.id]?"✓ Тема отмечена":"Я разобрал тему и проверил ответы ✓"}</button>`;
}
function renderSpeak(){
 const topics=DATA.speaking;
 const card=topics.find(x=>String(x.id)===String(UI.scenario))||topics[0];
 const phrases=(card?.phrases||[]).slice(0,8);const task=card?.rolePlay||card?.roleplay||[];
 return`${headline("Говори по-немецки","Повтори вслух, затем отвечай своими словами","SPRECHEN")}
 <div class="filters">${topics.map((s,i)=>`<button class="chip ${card?.id===s.id?"active":""}" data-action="scenario" data-id="${esc(s.id)}">${esc(s.topic||s.title||"Тема "+(i+1))}</button>`).join("")}</div>
 <div class="card scenario"><span class="eyebrow">РЕАЛЬНЫЕ СИТУАЦИИ</span><h3>${esc(card?.topic||card?.title||"Диалог")}</h3><p class="small muted">Слушай немецкую фразу, повторяй дважды, затем закрой перевод.</p></div>
 ${phrases.map((p,i)=>`<div class="phrase"><div class="row between"><p>${esc(p.de)}</p><button class="speaka" data-action="speak" data-text="${esc(p.de)}">♫</button></div><small>${esc(p.ru)}</small></div>`).join("")}
 <h2 class="section-title">Твоя очередь</h2><div class="card"><p>${esc(task[0]||"Расскажи своими словами, что ты понял, и ответь на одну из фраз.")}</p><textarea id="spokenDraft" class="textarea" placeholder="Можешь записать ответ здесь или сказать вслух."></textarea><p class="tiny muted">Автоматической оценки произношения пока нет. Скажи ответ без подсказки, а затем сравни с примерами.</p></div>`;
}
function createQuiz(){
 const tests=DATA.tests.filter(x=>Array.isArray(x.options)&&typeof x.answer==="string"&&["A1","A2"].includes(x.level));
 const selected=[...tests].sort(()=>Math.random()-.5).slice(0,10);
 UI.quiz={list:selected,pos:0,score:0,answered:false,pick:null};go("tests");
}
function renderTests(){
 const q=UI.quiz;
 if(!q)return`${headline("Проверка знаний","10 вопросов по артиклям, падежам и грамматике","MINI-TEST")}<div class="card"><h3>Не угадывай — проверяй себя.</h3><p class="muted">После ответа увидишь объяснение и правильный вариант. Ошибки учитываются в статистике.</p><button class="btn primary full" data-action="quizStart">Начать мини-тест →</button></div>`;
 if(q.pos>=q.list.length)return`${headline("Тест завершён","Результат записан в твою историю.","MINI-TEST")}<div class="card"><div class="result-num">${q.score}/10</div><p>${q.score>=8?"Грамматика этого блока усвоена неплохо.":"Повтори темы вопросов, где ошибся."}</p><button class="btn primary full" data-action="quizStart">Пройти новый тест →</button></div>`;
 const item=q.list[q.pos];
 return`${headline("Мини-тест","Вопрос "+(q.pos+1)+" из "+q.list.length,"WISSENSPRÜFUNG")}
 <div class="progress mb14"><i style="width:${q.pos/q.list.length*100}%"></i></div>
 <div class="card"><span class="pill">${esc(item.level)} · ${esc(item.topic||item.type||"Grammatik")}</span><h3 style="margin-top:20px">${esc(item.question)}</h3>
 ${item.options.map((o,i)=>`<button class="choice ${q.answered?(o===item.answer?"correct":i===q.pick?"wrong":""):""}" data-action="quizAnswer" data-id="${i}" ${q.answered?"disabled":""}>${esc(o)}</button>`).join("")}
 ${q.answered?`<div class="feedback ${item.options[q.pick]===item.answer?"":"bad"}">${item.options[q.pick]===item.answer?"Правильно.":"Правильный ответ: "+esc(item.answer)}<br>${esc(item.explanation||"")}</div><button class="btn primary full" data-action="quizNext">${q.pos+1===q.list.length?"Показать результат":"Следующий вопрос →"}</button>`:""}</div>`;
}
function renderProgress(){
 const d=stats(),p=d.total?Math.round(d.known/d.total*100):0;
 const hist=Object.entries(S.history).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);
 const weak=Object.entries(S.misses).sort((a,b)=>b[1]-a[1]).slice(0,5);
 return`${headline("Твой прогресс","Реальные повторения, а не просто дни в приложении","FORTSCHRITT")}
 <div class="card"><div class="row between"><h3 class="mb0">Словарь</h3><div class="strong">${p}%</div></div><p class="muted small">${d.known} закреплено · ${d.learning} в процессе · ${d.new} не начато</p><div class="progress"><i style="width:${p}%"></i></div><p class="tiny muted">Всего ${d.total} записей. Цель к концу декабря — уверенная основа A2 перед курсом B1.</p></div>
 <div class="stats-grid"><div class="stat"><div class="stat-num">${streak()}</div><div class="stat-name">Серия дней</div></div><div class="stat"><div class="stat-num">${d.due}</div><div class="stat-name">Ожидают</div></div><div class="stat"><div class="stat-num">${Object.keys(S.grammarDone).length}</div><div class="stat-name">Правил</div></div></div>
 <h2 class="section-title">Последние занятия</h2><div class="card">${hist.length?hist.map(([day,r])=>`<div class="topic-row"><span class="small">${day}</span><span class="small strong">${r.reviewed} карточек · ${r.correct} верно</span></div>`).join(""):'<p class="muted">Пока нет завершённых карточек. Начни с короткой сессии.</p>'}</div>
 ${weak.length?`<h2 class="section-title">На что обратить внимание</h2><div class="card">${weak.map(([key,n])=>`<div class="topic-row"><span class="small">${esc(key)}</span><span class="pill">${n} ошибок</span></div>`).join("")}</div>`:""}
 <button class="btn outline full" data-action="export">↓ Скачать резервную копию прогресса</button>`;
}
function renderMore(){
 return`${headline("Больше практики","Всё нужное без перегруженного меню","MEHR")}
 <button class="deck" data-view="speak"><span class="deck-ic mint">♫</span><span class="deck-copy"><strong>Разговорная практика</strong><small>Реальные диалоги с переводом</small></span><span class="chevron">›</span></button>
 <button class="deck" data-view="tests"><span class="deck-ic peach">✓</span><span class="deck-copy"><strong>Тесты</strong><small>Мини-проверки с объяснениями</small></span><span class="chevron">›</span></button>
 <button class="deck" data-view="progress"><span class="deck-ic sky">▥</span><span class="deck-copy"><strong>Мой прогресс</strong><small>Изученные слова, слабые места, серия дней</small></span><span class="chevron">›</span></button>
 <div class="card mt18"><h3>Мои данные</h3><p class="small muted">Прогресс хранится в этом браузере. При удалении данных Safari он исчезнет — регулярно сохраняй резервную копию.</p><button class="btn primary full mb14" data-action="export">↓ Экспорт прогресса JSON</button><label for="progressImport" class="btn soft full" style="cursor:pointer">↑ Импорт резервной копии</label><input id="progressImport" type="file" accept=".json,application/json" hidden><hr class="line"><button class="btn outline danger full" data-action="reset">Сбросить весь прогресс</button></div>
 <div class="soft-warning"><b>До 31 декабря:</b> 12 новых карточек в день — максимум, не обязательство. Пройди A2-диагностику, работай над пробелами и регулярно повторяй слова. Ни одно приложение само по себе не гарантирует B1.</div>`;
}
function speak(txt){if(!("speechSynthesis" in window)){toast("Озвучивание недоступно в этом браузере.");return;}const synth=window.speechSynthesis;synth.cancel();const u=new SpeechSynthesisUtterance(txt);u.lang="de-DE";u.rate=.86;const voices=synth.getVoices();const german=voices.find(v=>v.lang.toLowerCase().startsWith("de"));if(german)u.voice=german;synth.speak(u);}
function exportProgress(){const blob=new Blob([JSON.stringify({application:"Deutsch Klar",version:1,exported:today(),state:S},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="deutsch-klar-backup-"+today()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast("Резервная копия сохранена");}
document.addEventListener("click",e=>{
 const view=e.target.closest("[data-view]");if(view){go(view.dataset.view);return;}
 const el=e.target.closest("[data-action]");if(!el)return;
 const act=el.dataset.action,id=el.dataset.id;
 if(act==="start")startSession(el.dataset.deck);
 else if(act==="flip"&&UI.session){UI.session.flip=true;render();}
 else if(act==="grade")grade(el.dataset.ok==="1");
 else if(act==="filter"){UI.filter=id;UI.showAllWords=false;render();}
 else if(act==="moreWords"){UI.showAllWords=true;render();}
 else if(act==="word"){UI.word=id;UI.view="wordDetail";render();}
 else if(act==="level"){UI.level=id;render();}
 else if(act==="lesson"){UI.lesson=id;UI.view="grammarDetail";render();}
 else if(act==="showAnswer"){const answer=$("#a"+id);if(answer)answer.hidden=!answer.hidden;el.textContent=answer?.hidden?"Показать ответ":"Скрыть ответ";}
 else if(act==="markGrammar"){S.grammarDone[id]=today();save();render();toast("Тема отмечена");}
 else if(act==="scenario"){UI.scenario=id;render();}
 else if(act==="speak")speak(el.dataset.text||"");
 else if(act==="quizStart")createQuiz();
 else if(act==="quizAnswer"&&UI.quiz&&!UI.quiz.answered){const q=UI.quiz,item=q.list[q.pos],idx=Number(id);q.pick=idx;q.answered=true;S.history[today()]||={reviewed:0,correct:0};if(item.options[idx]===item.answer){q.score++;}else{S.misses[item.topic||"Grammatik"]=(S.misses[item.topic||"Grammatik"]||0)+1;}save();render();}
 else if(act==="quizNext"&&UI.quiz){UI.quiz.pos++;UI.quiz.answered=false;render();}
 else if(act==="export")exportProgress();
 else if(act==="reset"){if(confirm("Удалить весь прогресс Deutsch Klar? Это невозможно отменить без резервной копии.")){localStorage.removeItem(KEY);S=loadState();UI.session=null;render();toast("Прогресс сброшен");}}
});
document.addEventListener("input",e=>{if(e.target.id==="wordSearch"){UI.search=e.target.value;const q=normalize(UI.search);let collection=DATA.words.filter(w=>inDeck(w,UI.filter));if(q)collection=collection.filter(w=>normalize(w.german).includes(q)||String(w.russian).toLowerCase().includes(q));const limit=UI.showAllWords?500:40;$("#wordResults").innerHTML=listWords(collection,limit);$("#wordCount").textContent=collection.length+" записей · показано "+Math.min(limit,collection.length);}});
document.addEventListener("change",async e=>{if(e.target.id!=="progressImport"||!e.target.files?.[0])return;try{const o=JSON.parse(await e.target.files[0].text());if(o.application!=="Deutsch Klar"||!o.state?.cards||!o.state?.history)throw Error("Некорректный файл резервной копии");if(!confirm("Заменить текущий прогресс импортированным?"))return;const v=o.state;S={...loadState(),cards:v.cards,history:v.history,grammarDone:v.grammarDone||{},misses:v.misses||{},introduced:v.introduced||{},startDate:v.startDate||today(),theme:v.theme||"light",migrated:true};save();render();toast("Прогресс восстановлен");}catch(err){toast("Ошибка импорта: "+err.message);}});
$("#themeBtn").addEventListener("click",()=>{S.theme=S.theme==="dark"?"light":"dark";save();applyTheme();});
init();
