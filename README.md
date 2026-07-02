# Deutsch 90 Tage — Intensive German System

Мобильный статический сайт для GitHub Pages: словарь A1–B1/B2, грамматика, mini-tests, speaking cards, Zahlen и 90-дневный план.

## Что внутри

```text
/index.html
/styles.css
/app.js
/data/vocabulary.json
/data/grammar.json
/data/tests.json
/data/speaking.json
/data/plan.json
/data/numbers.json
/README.md
```

## Как открыть локально

Вариант нормальный:

```bash
cd german-intensive-github-pages
python -m http.server 8000
```

Потом открыть:

```text
http://localhost:8000
```

Почему не двойной клик по `index.html`: браузер может заблокировать загрузку JSON-файлов через `fetch`. Это не баг сайта, это браузер делает вид, что охраняет мир.

## Как залить на GitHub

```bash
git init
git add .
git commit -m "Initial German learning system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Как включить GitHub Pages

1. Открой repository на GitHub.
2. Settings → Pages.
3. Source: `Deploy from a branch`.
4. Branch: `main`.
5. Folder: `/root`.
6. Save.
7. Через 1–3 минуты сайт будет доступен по ссылке вида:

```text
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

## Как добавлять слова

Открой `data/vocabulary.json` и добавь объект:

```json
{
  "id": "v091",
  "german": "die Rückmeldung",
  "artikel": "die",
  "plural": "Rückmeldungen",
  "english": "feedback / response",
  "russian": "ответ / обратная связь",
  "level": "B1.2",
  "topic": "Behörden",
  "partOfSpeech": "noun",
  "exampleDE": "Ich warte auf Ihre Rückmeldung.",
  "exampleRU": "Я жду Вашего ответа.",
  "exampleEN": "I am waiting for your response.",
  "notes": "формально и полезно для email",
  "priority": "high",
  "status": "new",
  "tags": ["email", "behörden"]
}
```

Правило: одно слово = один объект. Не мешай в одном поле три разных значения, иначе поиск и тесты будут мусором.

## Как добавлять грамматику

Открой `data/grammar.json` и добавь объект с полями:

- `id`
- `level`
- `title`
- `explanationRU`
- `formula`
- `examples`
- `exercises`
- `mistakesRU`

## Как добавлять тесты

Открой `data/tests.json`:

```json
{
  "id": "t061",
  "question": "Выбери правильный вариант: Ich warte auf ___ Rückmeldung.",
  "options": ["Ihre", "Ihren", "Ihrer", "Ihrem"],
  "answer": "Ihre",
  "explanation": "auf + Akkusativ; die Rückmeldung → Ihre Rückmeldung.",
  "level": "B1",
  "topic": "Behörden",
  "type": "case"
}
```

## Как добавлять speaking-карты

Открой `data/speaking.json`. У каждой темы есть:

- `topic`
- `phrases`
- `dialogue`
- `rolePlay`

Лучший формат: 20 фраз на тему, каждая с DE/RU/EN.

## Методика обучения

Каждый день:

1. 15–22 новых слова.
2. 15 минут повторения старых слов.
3. 1 грамматический pattern.
4. 10 своих предложений по этому pattern.
5. 15–25 минут speaking вслух.
6. 10–20 минут listening/shadowing.
7. 5–8 предложений письменно.
8. Mini-test.
9. 1 voice note на немецком каждые 3 дня.

## Spaced repetition logic

Повторять слово:

- день 0: выучил
- день 1: повторил
- день 3: повторил
- день 7: повторил
- день 14: повторил
- день 30: контроль

В текущей MVP-версии статус хранится в `localStorage`: `new`, `learning`, `known`.

## Roadmap

### MVP 1
- 90 ключевых слов
- 14 грамматических тем
- 60 тестов
- 14 speaking-разделов по 20 фраз
- 90-дневный план

### MVP 2
- расширить словарь до 500 слов A1–A2
- добавить аудио-ссылки или TTS
- добавить SRS scheduling по датам
- добавить экспорт прогресса в JSON

### MVP 3
- 1000–1500 слов A1–B1
- отдельные модули Behörden, Arbeit, Bewerbung
- writing templates: email, complaint, appointment, application

### MVP 4
- B2 модуль: Argumentation, Nominalstil, Präsentation, formelle E-Mails
- подготовка к собеседованию QA Engineer на немецком

## Важное ограничение

Этот проект не заменяет живую речь. Он должен заставлять тебя каждый день говорить, писать и повторять. Немецкий не загружается в голову как драйвер на Windows, к сожалению.
