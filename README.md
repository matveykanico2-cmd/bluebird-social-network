# Bluebird Social

Fullstack-социальная сеть с интерфейсом в стиле классических социальных сетей: лента, профили, друзья, сообщества, каналы, сообщения, звонки, медиа, истории, поиск, уведомления и админские модули.

Интерфейс содержит независимый OpenVK-inspired skin (`apps/web/src/openvk-skin.css`): компактная синяя шапка, левая навигация, плотные белые панели и адаптивная мобильная версия. OpenVK используется только как функциональный и визуальный референс; PHP-код и чужие ассеты не копируются. Подробности лицензирования и атрибуции — в `THIRD_PARTY_NOTICES.md`.

Рабочий fullstack-вертикальный срез социальной сети на React/Vite и NestJS/SQLite.

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

При использовании окружения, которое отключает install scripts для native-пакетов, API автоматически выполняет `npm rebuild better-sqlite3` перед запуском. Поэтому SQLite должен быть доступен после обычного `npm run dev`/`npm run start:nest`.

Web: http://localhost:5173 · API: http://localhost:3000/api/health

Production-проверки: `npm run build`, `npm run test:types`, `npm run test:web`, `npm run test:api`, `npm run test:contract`.

Проверено перед публикацией: typecheck, web/API build, web/API unit tests и contract tests.

Сессии используют httpOnly cookie, SQLite хранится в `apps/api/data/app.db`. Для media/S3, email/SMS, push, TURN, платежей и FFmpeg нужны отдельные внешние провайдеры; неподключённые части перечислены в `PROGRESS.md`.
