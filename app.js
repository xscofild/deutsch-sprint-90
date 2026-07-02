const state = {
  vocabulary: [], grammar: [], tests: [], speaking: [], plan: [], numbers: {},
  currentQuiz: null,
  progress: JSON.parse(localStorage.getItem('deutschProgress') || '{}'),
  day: Number(localStorage.getItem('deutschDay') || '1')
};

const $ = (id) => document.getElementById(id);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const unique = (arr) => [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));

async function loadData() {
  const files = ['vocabulary','grammar','tests','speaking','plan','numbers'];
  const [vocabulary, grammar, tests, speaking, plan, numbers] = await Promise.all(
    files.map(name => fetch(`data/${name}.json`).then(r => r.json()))
  );
  Object.assign(state, { vocabulary, grammar, tests, speaking, plan, numbers });
  hydrateFilters();
  renderAll();
}

function saveProgress() {
  localStorage.setItem('deutschProgress', JSON.stringify(state.progress));
  localStorage.setItem('deutschDay', String(state.day));
}

function hydrateFilters() {
  const levels = unique(state.vocabulary.map(v => v.level));
  const topics = unique(state.vocabulary.map(v => v.topic));
  const grammarLevels = unique(state.grammar.map(g => g.level));
  const speakingTopics = unique(state.speaking.map(s => s.topic));
  const quizLevels = unique(state.tests.map(t => t.level));
  fillSelect($('levelFilter'), levels);
  fillSelect($('topicFilter'), topics);
  fillSelect($('grammarLevel'), grammarLevels);
  fillSelect($('speakingTopic'), speakingTopics);
  fillSelect($('quizLevel'), quizLevels);
}
function fillSelect(select, values) {
  const first = select.firstElementChild;
  select.innerHTML = '';
  select.appendChild(first);
  values.forEach(v => select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`));
}

function renderAll() {
  renderDashboard();
  renderVocabulary();
  renderGrammar();
  renderSpeaking();
  renderNumbers();
  renderPlan();
  renderQuiz();
}

function renderDashboard() {
  const plan = state.plan.find(p => p.day === state.day) || state.plan[0];
  $('todayPlan').innerHTML = `
    <p class="day-number">День ${plan.day}: ${escapeHtml(plan.phase)}</p>
    <h3>${escapeHtml(plan.focus)}</h3>
    <p><b>Новые слова:</b> ${plan.newWords}</p>
    <p><b>Грамматика:</b> ${escapeHtml(plan.grammar)}</p>
    <p><b>Speaking:</b> ${escapeHtml(plan.speaking)}</p>
    <p><b>Письмо:</b> ${escapeHtml(plan.writing)}</p>
    <p><b>Mini-test:</b> ${escapeHtml(plan.miniTest)}</p>
    <p><b>Output:</b> ${escapeHtml(plan.output)}</p>`;
  const counts = { known:0, learning:0, new:0 };
  state.vocabulary.forEach(v => counts[state.progress[v.id] || 'new']++);
  $('knownCount').textContent = counts.known;
  $('learningCount').textContent = counts.learning;
  $('newCount').textContent = counts.new;
  renderWordOfDay();
  renderSpeakingOfDay();
}

function renderWordOfDay() {
  const word = state.vocabulary[(state.day - 1) % state.vocabulary.length];
  $('wordOfDay').innerHTML = `<h2>Слово дня</h2>${wordCard(word, true)}`;
}
function renderSpeakingOfDay() {
  const card = state.speaking[(state.day - 1) % state.speaking.length];
  const phrase = pick(card.phrases);
  $('speakingOfDay').innerHTML = `<h2>Speaking-карта дня</h2><p class="badge">${escapeHtml(card.topic)}</p><h3>${escapeHtml(phrase.de)}</h3><p>${escapeHtml(phrase.ru)}</p><p class="muted">${escapeHtml(phrase.en)}</p>`;
}

function renderVocabulary() {
  const q = $('searchInput').value.toLowerCase().trim();
  const level = $('levelFilter').value;
  const topic = $('topicFilter').value;
  const priority = $('priorityFilter').value;
  const items = state.vocabulary.filter(v => {
    const hay = `${v.german} ${v.english} ${v.russian} ${v.topic} ${v.tags.join(' ')}`.toLowerCase();
    return (!q || hay.includes(q)) && (!level || v.level === level) && (!topic || v.topic === topic) && (!priority || v.priority === priority);
  });
  $('vocabList').innerHTML = items.map(v => wordCard(v)).join('') || `<article class="card">Ничего не найдено.</article>`;
}

function wordCard(v, embedded=false) {
  const status = state.progress[v.id] || v.status || 'new';
  return `<article class="${embedded ? '' : 'card'}" data-word-id="${v.id}">
    <div class="vocab-word">
      <div>
        <div class="word-title">${escapeHtml(v.artikel ? `${v.artikel} ${v.german.replace(/^(der|die|das)\s+/,'')}` : v.german)}</div>
        <p class="muted">${escapeHtml(v.english)} · ${escapeHtml(v.russian)}</p>
      </div>
      <span class="badge">${escapeHtml(v.level)}</span>
    </div>
    <div class="badges">
      <span class="badge">${escapeHtml(v.topic)}</span><span class="badge">${escapeHtml(v.partOfSpeech)}</span><span class="badge">${escapeHtml(v.priority)}</span><span class="badge">${escapeHtml(status)}</span>
    </div>
    <p><b>DE:</b> ${escapeHtml(v.exampleDE)}</p>
    <div class="translation" id="tr-${v.id}">
      <p><b>RU:</b> ${escapeHtml(v.exampleRU)}</p>
      <p><b>EN:</b> ${escapeHtml(v.exampleEN)}</p>
      <p class="muted">${escapeHtml(v.notes || '')}</p>
    </div>
    <div class="actions">
      <button onclick="toggleTranslation('${v.id}')">Показать перевод</button>
      <button class="ghost" onclick="setWordStatus('${v.id}','learning')">learning</button>
      <button class="ghost" onclick="setWordStatus('${v.id}','known')">known</button>
    </div>
  </article>`;
}
window.toggleTranslation = (id) => $(`tr-${id}`).classList.toggle('show');
window.setWordStatus = (id, status) => { state.progress[id] = status; saveProgress(); renderVocabulary(); renderDashboard(); };

function renderQuiz() {
  const level = $('quizLevel').value;
  const pool = state.tests.filter(t => !level || t.level === level);
  state.currentQuiz = pick(pool.length ? pool : state.tests);
  const q = state.currentQuiz;
  $('quizQuestion').textContent = q.question;
  $('quizResult').textContent = '';
  $('quizOptions').innerHTML = shuffle([...q.options]).map(o => `<button onclick="answerQuiz(this, '${escapeAttr(o)}')">${escapeHtml(o)}</button>`).join('');
}
window.answerQuiz = (btn, answer) => {
  const q = state.currentQuiz;
  const buttons = [...$('quizOptions').querySelectorAll('button')];
  buttons.forEach(b => b.disabled = true);
  if (answer === q.answer) {
    btn.classList.add('correct');
    $('quizResult').textContent = `Верно. ${q.explanation}`;
  } else {
    btn.classList.add('wrong');
    buttons.find(b => b.textContent === q.answer)?.classList.add('correct');
    $('quizResult').textContent = `Нет. Правильно: ${q.answer}. ${q.explanation}`;
  }
};

function renderGrammar() {
  const level = $('grammarLevel').value;
  const items = state.grammar.filter(g => !level || g.level === level);
  $('grammarList').innerHTML = items.map(g => `<article class="card">
    <div class="badges"><span class="badge">${escapeHtml(g.level)}</span></div>
    <h2>${escapeHtml(g.title)}</h2>
    <p>${escapeHtml(g.explanationRU)}</p>
    <p><b>Формула:</b> <code>${escapeHtml(g.formula)}</code></p>
    <details open><summary>Примеры</summary>${g.examples.map(e => `<p><b>${escapeHtml(e.de)}</b><br>${escapeHtml(e.ru)}<br><span class="muted">${escapeHtml(e.en)}</span></p>`).join('')}</details>
    <details><summary>Упражнения + ответы</summary>${g.exercises.map((e,i) => `<p>${i+1}. ${escapeHtml(e.task)}<br><b>Ответ:</b> ${escapeHtml(e.answer)}</p>`).join('')}</details>
    <details><summary>Типичные ошибки</summary><ul>${g.mistakesRU.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul></details>
  </article>`).join('');
}

function renderSpeaking() {
  const topic = $('speakingTopic').value;
  const items = state.speaking.filter(s => !topic || s.topic === topic);
  $('speakingList').innerHTML = items.map(s => `<article class="card">
    <span class="badge">${escapeHtml(s.topic)}</span>
    <h2>${escapeHtml(s.topic)}</h2>
    <details open><summary>20 useful phrases</summary>${s.phrases.map(p => `<p><b>${escapeHtml(p.de)}</b><br>${escapeHtml(p.ru)}<br><span class="muted">${escapeHtml(p.en)}</span></p>`).join('')}</details>
    <details><summary>Мини-диалог</summary>${s.dialogue.map(d => `<p><b>${escapeHtml(d.de)}</b><br>${escapeHtml(d.ru)}<br><span class="muted">${escapeHtml(d.en)}</span></p>`).join('')}</details>
    <details><summary>Role-play</summary><ul>${s.rolePlay.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></details>
  </article>`).join('');
}

function renderNumbers() {
  const n = state.numbers;
  $('numbersContent').innerHTML = `<article class="card"><h2>${escapeHtml(n.title)}</h2><p class="hint">Немецкие числа надо тренировать ушами и ртом. Читать глазами недостаточно.</p></article>` +
    n.rules.map(r => `<article class="card"><span class="badge">${escapeHtml(r.topic)}</span><h2>${escapeHtml(r.de)}</h2><p>${escapeHtml(r.ru)}</p><p class="muted">${escapeHtml(r.en)}</p></article>`).join('') +
    `<article class="card"><h2>Mini tests</h2>${n.tests.map(t => `<details><summary>${escapeHtml(t.q)}</summary><p><b>${escapeHtml(t.a)}</b></p></details>`).join('')}</article>`;
}

function renderPlan() {
  const q = $('planSearch').value.toLowerCase().trim();
  const items = state.plan.filter(p => !q || JSON.stringify(p).toLowerCase().includes(q));
  $('planList').innerHTML = items.map(p => `<article class="card day-card">
    <span class="day-number">День ${p.day}</span>
    <h3>${escapeHtml(p.phase)}</h3>
    <p>${escapeHtml(p.focus)}</p>
    <p><b>Words:</b> ${p.newWords}</p>
    <p><b>Speaking:</b> ${escapeHtml(p.speaking)}</p>
    <p><b>Test:</b> ${escapeHtml(p.miniTest)}</p>
  </article>`).join('');
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }
function escapeHtml(s='') { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escapeAttr(s='') { return escapeHtml(s).replace(/'/g, '&#39;'); }

// Events
document.querySelectorAll('.tabs button').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  btn.classList.add('active');
  $(btn.dataset.view).classList.add('active');
}));
['searchInput','levelFilter','topicFilter','priorityFilter'].forEach(id => $(id).addEventListener('input', renderVocabulary));
$('grammarLevel').addEventListener('input', renderGrammar);
$('speakingTopic').addEventListener('input', renderSpeaking);
$('quizLevel').addEventListener('input', renderQuiz);
$('nextQuizBtn').addEventListener('click', renderQuiz);
$('planSearch').addEventListener('input', renderPlan);
$('nextDayBtn').addEventListener('click', () => { state.day = state.day >= 90 ? 1 : state.day + 1; saveProgress(); renderDashboard(); });
$('resetProgressBtn').addEventListener('click', () => { if(confirm('Сбросить прогресс?')) { state.progress = {}; state.day = 1; saveProgress(); renderAll(); } });
$('randomSpeakingBtn').addEventListener('click', () => { const s = pick(state.speaking); $('speakingTopic').value = s.topic; renderSpeaking(); });
$('themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? '' : 'dark';
  localStorage.setItem('deutschTheme', dark ? '' : 'dark');
});
document.documentElement.dataset.theme = localStorage.getItem('deutschTheme') || '';
loadData().catch(err => {
  document.body.innerHTML = `<main><article class="card"><h1>Ошибка загрузки данных</h1><p>Открой проект через локальный сервер: <code>python -m http.server</code>, а не двойным кликом по index.html.</p><pre>${err}</pre></article></main>`;
});
