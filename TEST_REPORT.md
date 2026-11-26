# Test report

| Команда | Результат |
|---|---|
| `npm install --fetch-timeout=120000 --fetch-retries=3` | PASS; 533 packages audited, npm reported 14 known vulnerabilities |
| `npm run build:web` | PASS; Vite production build |
| `npm run build:api` | PASS; Nest compilation |
| `npm run test:contract` | PASS; 2 tests |
| `npm run test:types` | PASS; TypeScript project references |
| auth section build/tests | PASS; auth API compiled with scrypt, sessions, recovery, export and account lifecycle endpoints |
| auth/profile runtime smoke на `PORT=3103` | PASS; register, TOTP enable, 8 backup codes, profile PATCH, profile GET |
| MFA/privacy runtime smoke на `PORT=3104` | PASS; MFA challenge, TOTP login, hidden bio for another user |
| backup-code runtime smoke на `PORT=3105` | PASS; backup login succeeds once, reuse rejected |
| profile media/feed runtime smoke на `PORT=3106` | PASS; image upload, cursor page 20+2, hide post |
| profile safety runtime smoke на `PORT=3107` | PASS; pin, profile posts, report, block and blocked-feed filtering |
| final web/api build after 3.01–3.03 UI changes | PASS; build, web/api/contract/type tests |
| publications runtime smoke на `PORT=3108` | PASS; draft save/delete, idempotent create, edit and soft-delete |
| post lifecycle runtime smoke на `PORT=3109` | PASS; scheduled visibility, audience/comments settings, revisions and archive |
| `npm run build` after bookmarks/PWA | PASS |
| `npm run test:web` | PASS; 1 test |
| `npm run test:api` | PASS; 1 test |
| web/API same-origin proxy smoke | PASS; `GET http://127.0.0.1:5173/api/auth/me` проксирован в API и вернул JSON 200 |
| friends request lifecycle smoke на `PORT=3110` | PASS; request, reject, повторная request и cancel вернули ожидаемые статусы |
| validation error smoke | PASS; некорректное имя возвращает `400 VALIDATION_ERROR`, а не `500` |
| phone registration smoke на `PORT=3111` | PASS; пустой email + `+79781827502` создают аккаунт без обязательного подтверждения |
| direct registration/recovery smoke на `PORT=3112` | PASS; регистрация сразу возвращает сессию, recovery по телефону выдаёт challenge, reset меняет пароль, новый login успешен |
| direct registration/login/recovery smoke на `PORT=3113` | PASS; регистрация и вход без подтверждения, восстановление email/телефон + новый пароль, повторный вход новым паролем |
| notifications read-one smoke на `PORT=3114` | PASS; уведомление заявки прочитано только владельцем, `read` изменился с `0` на `1` |
| search history smoke на `PORT=3115` | PASS; сохранение, получение и очистка запроса `alice` |
| profile 3.02 smoke на `PORT=3116` | PASS; расширенные поля, privacy, closed-profile model, links, online/lastSeen и counters |
| account settings UI build/type smoke | PASS; пароль, отдельная сессия, согласия, integration permissions, export и soft-delete подключены |
| profile media counters/upload smoke на `PORT=3118` | PASS; photo upload из multipart сохранился, `photos=1`, mediaItems возвращён профилем |
| feed 3.03 runtime smoke на `PORT=3120` | PASS; fresh/following/recommended, recommendations, preferences, follow, hide-author и not-interested сценарии проверены; groups table initialization исправлена |
| feed privacy smoke на `PORT=3122` | PASS; friends-only post виден принятому другу и отсутствует в following-feed постороннего пользователя |
| post metadata smoke на `PORT=3123` | PASS; create/edit пересчитывают hashtags, mentions и safe link metadata |
| polls smoke на `PORT=3124` | PASS; create, options, vote/result and repeated-vote rejection проверены |
| stories smoke на `PORT=3125` | PASS; create, 24h expiry metadata, list, view and delete проверены |
| post media upload/display API smoke на `PORT=3130` | PASS; multipart PNG attachment stored as `photo`, `GET /posts/:id/media` returns correct `kind/url`, web composer and feed renderer built |
| engagement runtime smoke на `PORT=3132` | PASS; unique views, reaction list, comment edit/reaction, repost with source and comment verified |
| mentions/metadata runtime smoke на `PORT=3133` | PASS; mention notification, hashtag/mention extraction and safe HTTP(S) link metadata verified |
| post multi-media/story-media runtime smoke на `PORT=3134` | PASS; multiple photo/GIF attachments and photo story upload verified |
| nested comments runtime smoke на `PORT=3135` | PASS; parent/child comments and popular sorting verified |
| profile extras/location runtime smoke на `PORT=3136` | PASS; gifts catalog/send/receive, profile recommendations, verification request and post geolocation verified |
| messenger message runtime smoke на `PORT=3137` | PASS after fix; send/edit/reaction/read and `GET /messages` now return valid JSON without ambiguous-column 500 |
| messenger chats UI/build smoke | PASS; chat list/search/history UI compiled with all web/API/contract/type checks |
| groups membership/roles/posts runtime smoke на `PORT=3138` | PASS; create, join, owner role, group post and detail verified |
| global search runtime smoke на `PORT=3139` | PASS; public post and group type-filter search verified with private-user ACL preserved |
| discussion moderation runtime smoke на `PORT=3140` | PASS; subscribe, comment pin/audit and image attachment upload verified |
| stories archive/reaction API + full checks | PASS; API compiled and `test:web`, `test:api`, `test:contract`, `test:types` passed |
| source feed runtime smoke на `PORT=3141` | PASS; `/api/feed?mode=photo` и `/api/feed?mode=video` применяют media-kind фильтр |
| friends online/search build smoke | PASS; online list query and city filter compile and all automated checks pass |
| friends age filter/relationship notifications | PASS; build, web, API, contract and type checks passed |
| messenger pagination/search/scroll/sort smoke | PASS; UI build and all web/API/contract/type checks passed |
| group chat vertical slice | PASS; create/list/detail/member-role ACL/group messages/delete-owner routes compiled and full automated checks passed |
| group chat invite/leave smoke | PASS; invite token, accept and leave routes compile with complete automated checks |
| message chat preferences | PASS; mute/archive/pin persistence routes and UI build verified with full checks |
| notifications filters/deeplinks | PASS; type/unread filters and target navigation compile with complete checks |
| bookmarks search/sort/filter/collections | PASS; API/UI build and complete automated checks passed |
| global search typeahead/pagination | PASS; clean Vite build and full web/API/contract/type checks passed |
| notification quiet hours/channel settings | PASS; persisted settings API/UI and complete automated checks passed |
| ручной smoke на `PORT=3100` | PASS; health/register/post/feed/reaction/comment |
| ручной smoke на `PORT=3101` | PASS; groups list/create/detail, notifications |
| Socket.IO smoke на `PORT=3102` | PASS; authorized connect, `sync_messages`, `send_message` |
| roadmap baseline `npm ci` | PASS; clean install, 14 advisories reported by npm audit |
| P0 auth security runtime smoke на `PORT=3135` | PASS; register, forged `bb_user` rejected, recovery challenge issued, reset succeeds once, replay rejected |
| P0 full regression after secure auth/Socket.IO changes | PASS; typecheck, web/API build, web/API/contract tests |
| production dependency remediation | PASS; Drizzle 0.45.4 + Zod 4.6.7, complete checks green, `npm audit --omit=dev` reports 0 vulnerabilities |

`npm run test:e2e` требует Playwright-сценариев и браузерных бинарников; это остаётся следующим шагом.
