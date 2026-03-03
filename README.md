# article-db (Analysis Service)

`article-db` 是 AI 文章分析基础服务，负责：

- RSS 抓取与去重
- AI 质量评估与标签治理
- Postgres 归档（高质量、全量分析、运行记录）
- 对外提供文章查询与治理 API
- 提供 flomo 推送批次状态接口（`next/sent/failed`）

## Core APIs

- `GET /api/v1/ingestion/run`
- `GET /api/v1/articles/high-quality`
- `GET /api/v1/articles/high-quality/range`
- `GET /api/v1/articles/archive-list`
- `GET /api/v1/articles/:article_id`
- `POST /api/v1/articles/feedback`
- `GET /api/v1/runs/:date`
- `GET /api/v1/observability/ai`
- `GET /api/v1/tags/groups`
- `PUT /api/v1/tags/groups/:group_key/:tag_key`
- `DELETE /api/v1/tags/groups/:group_key/:tag_key`
- `POST /api/v1/tags/governance/run`
- `GET/PUT /api/v1/tags/governance/objective`
- `GET/POST /api/v1/tags/governance/feedback`
- `POST /api/v1/flomo/push-batches/next`
- `POST /api/v1/flomo/push-batches/:batch_key/sent`
- `POST /api/v1/flomo/push-batches/:batch_key/failed`

## Environment Variables

### Required

- `DATABASE_URL`
- `DEEPSEEK_API_KEY`

### Recommended

- `ARTICLE_DB_API_TOKEN`
- `CRON_SECRET`

## Development

```bash
npm install
npm run dev
npm run typecheck
npm test
```

## Deployment

`vercel.json` 仅保留 ingestion cron：

- `0 * * * *` (UTC) -> `/api/v1/ingestion/run`

消费层仓库 `ai-news` 通过 `ARTICLE_DB_BASE_URL` + `ARTICLE_DB_API_TOKEN` 调用本服务。
