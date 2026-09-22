# Лист персонажа Pathfinder 2e

Статический лист персонажа (версия **1.4.0**). Работает без сервера: данные хранятся в браузере (`localStorage`), перенос — через XML.

## Как опубликовать на GitHub Pages

1. Создайте **публичный** репозиторий, например `pf2-sheet`.
2. Залейте **содержимое этого архива в корень** репозитория (не внутрь подпапки):
   - `index.html`
   - `404.html`
   - `favicon.svg`
   - `.nojekyll` (обязательно, иначе GitHub Pages может сломать файлы)
   - папка `assets/`
3. Репозиторий → **Settings → Pages**.
4. **Source:** Deploy from a branch.
5. Branch: `main`, folder: `/ (root)`.
6. Save. Через 1–2 минуты сайт будет по адресу:

`https://ВАШ_ЛОГИН.github.io/ИМЯ_РЕПО/`

Если файлы положить во вложенную папку, страница не откроется (404).

## Через git (если удобнее)

```bash
unzip pf2-sheet-github-pages.zip -d pf2-sheet
cd pf2-sheet
git init
git add .
git commit -m "PF2 character sheet 1.4.0"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

Дальше те же Settings → Pages.

## После открытия сайта

- Персонажи из превью сюда сами не переедут: другой адрес — пустое хранилище.
- Импортируйте XML: **Настройки → Импорт**.
- Не открывайте `index.html` с диска — нужен именно адрес GitHub Pages.

## Что внутри

| Файл | Зачем |
|---|---|
| `index.html` | Точка входа |
| `404.html` | Тот же лист, если кто-то зайдёт на несуществующий путь |
| `assets/` | Собранный React-бандл и стили |
| `.nojekyll` | Отключает Jekyll на GitHub Pages |
