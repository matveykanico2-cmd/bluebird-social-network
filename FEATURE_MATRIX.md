# Feature matrix

Статусы: `implemented/verified` — реализовано и проверено; `partial` — рабочая часть без полного каталога; `blocked` — нужен внешний провайдер; `not-started` — не начиналось.

| Требование | Статус | Код / API / данные / тест |
|---|---|---|
| Регистрация, login, logout, cookie-сессия | implemented/verified | Регистрация по email/телефону сразу создаёт сессию; `auth.controller.ts`, `Auth.tsx`, SQLite `users/sessions`, runtime smoke |
| Пароли, rate limit, восстановление, экспорт, delete/restore, consent/language/permissions | partial | API и Settings UI проверены; внешние MFA/WebAuthn/QR/anti-bot провайдеры остаются отдельной интеграцией |
| TOTP и резервные коды | partial | setup/enable/disable и одноразовые backup codes проверены; login не блокируется MFA по требованию продукта, WebAuthn не подключён |
| Профиль: просмотр, счётчики, редактирование полей | partial | `GET/PATCH /api/profile/:username`, links, privacy, closed profile, common-friends count, `Profile.tsx`; verified badge, full friends/media catalog ещё не готовы |
| Профиль media | partial | avatar/cover/photo/video/clip upload, history, client-side crop, responsive profile gallery and counters verified; server-side resize/EXIF processing ещё не подключены |
| Profile posts/pin/block/report | partial | `GET /profile/:username/posts`, pin, block/unblock, reports and feed ACL verified; moderation workflow ещё не готов |
| Feed cursor/preferences/hide | implemented/verified | fresh/following/recommended ranking with block/report moderation, preferences, hide post/author/not-interested, photo/video/sticker stories with views/reactions/archive, labelled ad posts, activity aggregation, autoload/refresh/scroll restore/skeleton/error retry verified |
| Publications 3.04 core | implemented/verified | drafts/autosave, idempotency, edit/revisions, soft-delete/archive, scheduledAt, pin, audience/comments, hashtag/mention metadata, polls, OpenGraph previews, structured attachments, multiple media/audio/doc/GIF uploads, author signatures and wall ACL verified |
| Publications attachments/crosspost | implemented/verified | structured product/article/event attachments, group-post form, repost visibility, crosspost to stories/chats in `Feed.tsx`; API schema/ACL and full type/build/test suite verified |
| Bookmarks | partial | post add/remove/list API and `/bookmarks` UI verified; typed collections for other entities ещё не готовы |
| PWA | partial | manifest + service worker shell cache added; offline mutation sync/push ещё не готовы |
| Theme and visual preferences | implemented/verified | `apps/web/src/app/App.tsx`, `apps/web/src/views/Settings.tsx`, `apps/web/src/styles.css`; light/dark/system modes, accent colors, persistence and reduced-motion styles; type/build/web/api/contract tests |
| Профиль и профильный URL | implemented/verified | `Profile.tsx`, `GET /api/profile/:username` |
| Profile tabs/deeplinks | implemented/verified | `Profile.tsx`, `Views.module.css`; anchor navigation for profile/posts/photos/videos/clips/music/friends/links; type/build/web/api/contract tests |
| Посты и публичная feed | implemented/verified | `SocialController`, `posts`, `Feed.tsx` |
| Реакции и комментарии | implemented/verified | `reactions`, `comments`, `POST /posts/:id/react`, `/comments` |
| Личные сообщения | partial | `messages`, `/api/messages`, `Messages.tsx`, `ChatGateway`; realtime/reconnect/sync, pin/forward/silent/reply, local attachment search and per-chat themes verified; media uploads and calls still separate integrations |
| Messenger shared data and safety | partial | `/messages/peer/:id/shared`, block/report actions and shared media/link panel verified; folders/system events/call history/channels/bots remain separate modules |
| Messenger folders/events | implemented/verified | chat folders, peer assignment, archive/favorite chat actions, system events, typed group/channel/community/bot chats and call history actions implemented in API/UI |
| Друзья и заявки | implemented/verified | `/api/friends`, request/accept/reject/cancel/remove endpoints, `Friends.tsx`; runtime smoke verified |
| Friend discovery and lists | implemented/verified | city/age/public-field search, close-friend lists, consent-gated contact import, birthday notifications, hidden friends, per-user privacy exceptions and duplicate-request notifications verified |
| Сообщества | implemented/verified | `/api/groups`, `Groups.tsx`, SQLite `groups/group_members` |
| Уведомления | partial | `/api/notifications`, read-one/read-all, группировка по дате, уведомление friend request; фильтры/deeplink/push ещё не готовы |
| Поиск людей и история | implemented/verified | `/api/users?q=`, city/age filters, `/api/search/history`, сохранение/очистка, `Search.tsx`; type/build/web tests verified |
| Медиа, звонки, истории, клипы, видео, музыка, маркет, реклама, админка | not-started | Требуют отдельных вертикальных срезов и провайдеров |
| PWA, Capacitor, Tauri, push, S3, FFmpeg, платежи | blocked | Нужны инфраструктура, secrets, лицензии и внешние сервисы |
