# Bluebird implementation audit

Audit baseline: 2026-11-26. Status is based on source code, schema creation/migrations and automated checks, not on UI labels.

| Функция | Frontend | API | БД | Permission tests | Статус |
|---|---|---|---|---|---|
| Регистрация/login/logout | `views/Auth.tsx`, `App.tsx` | `/api/auth/*` | `users`, `sessions` | unit/contract baseline | verified |
| Безопасный session auth | shared auth calls | `StoreService.auth` | `sessions` | direct-cookie fallback removed in P0 | verified |
| Recovery ownership proof | `Auth.tsx` two-step flow | `/auth/password/recovery/request`, `/auth/password/reset` | `auth_challenges` | challenge expiry/one-use path | verified |
| MFA/TOTP | `Settings.tsx`, `Auth.tsx` | `/auth/mfa/*` | `mfa` | backup-code consume path | verified |
| CSRF/CORS origin policy | browser requests | `main.ts` middleware | n/a | origin rejection path | verified |
| Profiles/privacy | `Profile.tsx` | social/profile endpoints | users/profile tables | server ACL in controllers | partial |
| Feed/posts/comments | `Feed.tsx` | social/posts endpoints | posts/comments/reactions | contract smoke | partial |
| Direct/group messages | `Messages.tsx`, `GroupChats.tsx` | messages + Socket.IO gateway | message/chat tables | realtime ACL needs expanded integration suite | partial |
| Media pipeline | media views | files/photos/video/clips endpoints | media tables + local adapter | MIME/size paths | partial |
| Groups/channels | `Groups.tsx`, `Channels.tsx` | communities/channels endpoints | groups/channels/member tables | role paths present | partial |
| Search/notifications/bookmarks | corresponding views | dedicated controllers | dedicated tables | endpoint smoke | partial |
| WebRTC calls | `Calls.tsx` | call signaling | call tables | provider-dependent | blocked without TURN/SFU |
| Payments/push/live ingest | screens/provider boundaries | provider interfaces | config/audit tables | external provider unavailable | blocked |
| Admin/moderation | `SupportAdmin.tsx` | creator/admin controller | admin/audit/moderation tables | server role check | partial |
| Modern responsive UI | shared CSS/OpenVK-inspired skin | n/a | n/a | build + manual viewport review | verified |

## Baseline commands

```text
npm ci                         PASS (14 dependency audit advisories reported)
npm run test:types             PASS
npm run build                  PASS (Vite chunk-size warning only)
npm run test:web               PASS (1 test)
npm run test:api               PASS (1 test)
npm run test:contract         PASS (2 tests)
```

The next vertical slices must add integration coverage for two authenticated users, then close the `partial` rows without marking provider-dependent work as working unless a real provider is configured.
