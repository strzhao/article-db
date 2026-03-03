# Agent Notes (2026-03-03)

## 本次落地
- 已接入账号系统：JWT + 远程 JWKS 验签。
- 已启用白名单模式：通过 `AUTH_EMAIL_ALLOWLIST` 控制可登录邮箱（当前目标账号：daniel）。
- 已保留 `ARTICLE_DB_API_TOKEN` 兼容，避免现有调用方中断。
- 已新增 `/api/auth/*` 登录桥接接口。
- 已为 `/archive-review` 启用登录保护，未登录跳转 `/login`。

## 关键环境变量
- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `AUTH_JWKS_URL`
- `AUTH_EMAIL_ALLOWLIST`

## 当前线上配置
- 白名单邮箱：`daniel21436@hotmail.com`（与全局 git email 对齐）。
- 应用域名：`https://article-db.stringzhao.life`。
