# Agent Notes (2026-03-03)

## 本次改造（统一账号接入版）
- 已移除本地验证码登录流程入口：`/login` 现在只负责跳转 `/auth/start`。
- 已新增统一授权入口：`GET /auth/start`（生成 state + 跳转 `https://user.stringzhao.life/authorize`）。
- 已新增统一授权回调页：`GET /auth/callback`（按统一文档流程处理 `authorized/state`）。
- 已新增本地会话落地接口：`POST /api/auth/session/finalize`（校验 state + JWT + allowlist）。
- 已新增本地会话注销接口：`POST /api/auth/session/logout`（清理 `article_db_gateway_session`）。
- 已将旧本地账号桥接接口统一废弃为 `410`：
  - `POST /api/auth/send-code`
  - `POST /api/auth/verify-code`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- `/archive-review` 已切换为检查 `article_db_gateway_session`，未登录会跳转统一授权入口。

## 白名单与域名
- 白名单邮箱：`daniel21436@hotmail.com`（daniel，全局 git email）。
- 应用域名：`https://article-db.stringzhao.life`。

## 关键环境变量
- `AUTH_ISSUER=https://user.stringzhao.life`
- `AUTH_AUDIENCE=base-account-client`
- `AUTH_JWKS_URL=https://user.stringzhao.life/.well-known/jwks.json`
- `AUTH_EMAIL_ALLOWLIST=daniel21436@hotmail.com`
- `AUTH_GATEWAY_SESSION_SECRET`（可选，未配时回退到 `TRACKER_SIGNING_SECRET` / `CRON_SECRET`）

## 下一步
- 执行并通过 `npm run typecheck && npm test`。
- 提交代码并推送远端。
- 执行部署（Vercel）并在 `article-db.stringzhao.life` 做一次完整回归：
  1. 访问 `/archive-review` 是否跳转 `/auth/start`。
  2. 统一账号登录后是否回跳 `/auth/callback` 并进入审查页。
  3. 非白名单账号是否被 `403 forbidden_not_in_allowlist` 拒绝。
