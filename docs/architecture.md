# Virtual SNS MVP - システムアーキテクチャ

## 目次

1. [システム概要](#システム概要)
2. [全体構成図](#全体構成図)
3. [コンポーネント詳細](#コンポーネント詳細)
4. [データフロー](#データフロー)
5. [デプロイメント構成](#デプロイメント構成)
6. [セキュリティアーキテクチャ](#セキュリティアーキテクチャ)

---

## システム概要

Virtual SNS MVPは、ユーザーの投稿に対してAIが自動で返信する仮想SNSプラットフォームです。リアルタイム更新機能により、AI返信が即座に画面に反映されます。

### アーキテクチャの特徴

- **フロントエンド／API／ワーカーの分離構成**: Frontend、Backend、Workerが独立して動作
- **イベント駆動型**: Redis Pub/Subによる非同期イベント配信
- **リアルタイム通信**: Server-Sent Events (SSE) によるプッシュ通知
- **スケーラビリティ**: Celeryによる水平スケーリング可能なタスク処理

---

## 全体構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                            User Browser                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (Vite)                      │  │
│  │  - UI Components (PostCard, PostComposer, etc.)              │  │
│  │  - State Management (React Hooks)                            │  │
│  │  - API Client (Axios)                                        │  │
│  │  - SSE Client (EventSource)                                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
           │                                    ▲
           │ HTTP/REST                          │ SSE
           │ (POST /posts, GET /posts)          │ (GET /stream)
           ▼                                    │
┌─────────────────────────────────────────────────────────────────────┐
│                       Backend Server (FastAPI)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │   API Routes    │  │   Repositories  │  │   ORM Models       │  │
│  │  - POST /posts  │──│  - PostRepo     │──│  - Post            │  │
│  │  - GET /posts   │  │  - ReplyRepo    │  │  - Reply           │  │
│  │  - GET /stream  │  └─────────────────┘  └────────────────────┘  │
│  │  - POST /internal│                                               │
│  │    /replies     │                                               │
│  └─────────────────┘                                               │
│           │              ┌─────────────────┐                        │
│           │              │   Services      │                        │
│           ├──────────────│  - bus.py       │─────────┐              │
│           │              │  - sse.py       │         │              │
│           │              │  - ai_personas  │         │              │
│           │              └─────────────────┘         │              │
└───────────┼──────────────────────────────────────────┼──────────────┘
            │                                          │
            │                                          │ Redis Pub/Sub
            │ DB Access                                │ (publish_reply)
            ▼                                          ▼
┌─────────────────────┐                    ┌─────────────────────────┐
│   PostgreSQL DB     │                    │     Redis Server        │
│  ┌───────────────┐  │                    │  ┌──────────────────┐   │
│  │  posts table  │  │                    │  │ Channel:         │   │
│  │  - id         │  │                    │  │  "sns-replies"   │   │
│  │  - text       │  │                    │  │                  │   │
│  │  - created_at │  │                    │  │ Pub/Sub System   │   │
│  └───────────────┘  │                    │  └──────────────────┘   │
│  ┌───────────────┐  │                    │                         │
│  │ replies table │  │                    │  ┌──────────────────┐   │
│  │  - id         │  │                    │  │ Celery Broker    │   │
│  │  - post_id FK │  │                    │  │ Task Queue       │   │
│  │  - ai_user    │  │                    │  └──────────────────┘   │
│  │  - text       │  │                    └─────────────────────────┘
│  │  - created_at │  │                                │
│  └───────────────┘  │                                │ Task Queue
└─────────────────────┘                                │ (generate_reply)
                                                       ▼
                                          ┌─────────────────────────┐
                                          │   Celery Worker         │
                                          │  ┌──────────────────┐   │
                                          │  │ tasks.py         │   │
                                          │  │ - generate_reply │   │
                                          │  └──────────────────┘   │
                                          │           │             │
                                          │           │ AI Request  │
                                          └───────────┼─────────────┘
                                                      ▼
                                          ┌─────────────────────────┐
                                          │   OpenAI API            │
                                          │  (GPT-4o-mini)          │
                                          │                         │
                                          │  - Chat Completion      │
                                          │  - Persona-based Reply  │
                                          └─────────────────────────┘
```

---

## コンポーネント詳細

### 1. Frontend (React + Vite)

**役割**: ユーザーインターフェースの提供とユーザー操作の処理

**主要機能**:
- 投稿作成フォーム (PostComposer)
- タイムライン表示 (TimelinePage)
- AI返信のリアルタイム表示 (LivePost)
- SSE接続管理 (useSSE hook)

**技術スタック**:
- React 18 (UI フレームワーク)
- TypeScript (型安全性)
- Vite (高速ビルド)
- Axios (HTTP クライアント)
- EventSource API (SSE クライアント)

**主要ファイル**:
```
frontend/src/
├── pages/TimelinePage.tsx        # メインページ
├── components/
│   ├── PostComposer.tsx          # 投稿作成
│   ├── PostCard.tsx              # 投稿表示
│   └── Avatar.tsx                # アバター
├── hooks/
│   └── useSSE.ts                 # SSE接続管理
├── features/posts/
│   ├── useTimeline.ts            # タイムライン取得
│   └── useCreatePost.ts          # 投稿作成
└── api/
    ├── client.ts                 # Axios設定
    └── posts.ts                  # API呼び出し
```

---

### 2. Backend (FastAPI)

**役割**: RESTful API提供、ビジネスロジック処理、データ永続化

**主要機能**:
- 投稿CRUD操作
- AI返信登録（内部API）
- SSE接続管理
- Celeryタスク投入
- Redis Pub/Sub イベント配信

**技術スタック**:
- FastAPI (Webフレームワーク)
- SQLAlchemy 2.0 (ORM)
- Pydantic (バリデーション)
- sse-starlette (SSE実装)
- redis-py (Redis クライアント)

**レイヤー構成**:
```
┌─────────────────────────────────────┐
│         API Layer (Endpoints)        │  ← HTTP リクエスト受付
├─────────────────────────────────────┤
│      Service Layer (Business Logic) │  ← ビジネスロジック
├─────────────────────────────────────┤
│    Repository Layer (Data Access)    │  ← データアクセス
├─────────────────────────────────────┤
│       Model Layer (ORM Models)       │  ← データモデル
└─────────────────────────────────────┘
```

**主要ファイル**:
```
backend/app/
├── main.py                       # FastAPIアプリ、ルーター登録
├── api/
│   ├── sse.py                    # SSEエンドポイント (GET /stream)
│   └── deps.py                   # 依存性注入 (DB session, etc.)
├── services/
│   ├── bus.py                    # Redis Pub/Sub ラッパー
│   ├── sse.py                    # SSE接続管理
│   └── ai_personas.py            # AIペルソナ定義
├── repository/
│   ├── post_repo.py              # 投稿CRUD
│   └── reply_repo.py             # 返信CRUD
├── models/
│   ├── post.py                   # Postモデル
│   └── reply.py                  # Replyモデル
└── schemas/
    ├── post.py                   # Pydanticスキーマ (Post)
    └── reply.py                  # Pydanticスキーマ (Reply)
```

---

### 3. Celery Worker

**役割**: AI返信の非同期生成処理

**主要機能**:
- 投稿に対するAI返信生成
- ペルソナの重み付けランダム選択
- OpenAI API呼び出し
- 返信のバックエンド登録（内部API呼び出し）

**処理フロー**:
```
1. Celeryタスク受信 (generate_reply)
   ↓
2. 返信数決定 (1〜MAX_REPLIES)
   ↓
3. ペルソナ選択 (重み付けランダム)
   ↓
4. 各ペルソナごとにループ:
   a. ランダム遅延 (REPLY_DELAY_MIN〜MAX秒)
   b. OpenAI API呼び出し
   c. POST /internal/replies で返信登録
   ↓
5. タスク完了
```

**環境変数**:
- `REPLY_DELAY_MIN`: 最小遅延秒数 (デフォルト: 1秒)
- `REPLY_DELAY_MAX`: 最大遅延秒数 (デフォルト: 10秒)
- `MAX_REPLIES_PER_POST`: 投稿あたり最大返信数 (デフォルト: 2)

**主要ファイル**:
```
backend/app/workers/
├── celery_app.py                 # Celeryアプリ初期化
└── tasks.py                      # Celeryタスク定義
```

---

### 4. PostgreSQL Database

**役割**: データ永続化

**テーブル構成**:

#### posts テーブル
| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | INTEGER | PRIMARY KEY | 投稿ID |
| text | VARCHAR | NOT NULL | 投稿本文（280文字以内） |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |

#### replies テーブル
| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | INTEGER | PRIMARY KEY | 返信ID |
| post_id | INTEGER | FOREIGN KEY (posts.id) ON DELETE CASCADE, INDEX | 投稿ID |
| ai_user | VARCHAR(64) | NOT NULL, DEFAULT 'listener_bot' | AIペルソナID |
| text | TEXT | NOT NULL | 返信本文 |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時 |

**リレーション**:
```
posts (1) ←→ (N) replies
```

---

### 5. Redis Server

**役割**: メッセージブローカー、Pub/Subシステム

**用途**:

1. **Celery Broker**: タスクキューの管理
   - キュー: `celery` (デフォルト)
   - タスク: `generate_reply`

2. **Redis Pub/Sub**: リアルタイムイベント配信
   - チャンネル: `sns-replies`
   - イベント: AI返信追加通知

**Pub/Subフロー**:
```
1. Backend: publish_reply(message)
   ↓ Redis PUBLISH "sns-replies" {JSON}
2. Redis: メッセージをチャンネルに配信
   ↓
3. Backend SSE: subscribe() でメッセージ受信
   ↓ EventSourceResponse
4. Frontend: EventSource で受信、UI更新
```

---

### 6. OpenAI API

**役割**: AI返信テキスト生成

**使用モデル**: GPT-4o-mini (推奨)

**ペルソナ設定**:

| ペルソナID | 名前 | 出現確率 | System Prompt | Temperature |
|-----------|------|---------|--------------|-------------|
| listener_bot | やさしい聞き役 | 60% | 共感的で安心感のある一言を返す | 0.6 |
| humorist_bot | 軽口ユーモア | 25% | ふっと気が抜けるユーモアを返す | 0.9 |
| coach_bot | やさしいコーチ | 15% | 無理のない小さな行動を提案 | 0.7 |

**API呼び出し仕様**:
- Endpoint: `POST https://api.openai.com/v1/chat/completions`
- Model: `gpt-4o-mini`
- Max Tokens: （返信が短文になる範囲で設定）
- Temperature: ペルソナごとに設定

---

## データフロー

### 1. 投稿作成フロー

```
┌─────────┐
│ User    │
└────┬────┘
     │ 1. 投稿入力
     ▼
┌─────────────┐
│ Frontend    │
└──────┬──────┘
       │ 2. POST /posts {text}
       ▼
┌─────────────┐
│ Backend     │
│ API         │
└──────┬──────┘
       │ 3. repo_create_post(db, text)
       ▼
┌─────────────┐
│ PostgreSQL  │
│ posts table │
└──────┬──────┘
       │ 4. INSERT成功、post_id返却
       ▼
┌─────────────┐
│ Backend     │
│ API         │
└──────┬──────┘
       │ 5. generate_reply.delay(post_id, text)
       │    ↓ Celeryタスク投入
       ▼
┌─────────────┐
│ Redis Queue │
└──────┬──────┘
       │
       │ 6. 200 OK {id, text, created_at, replies: []}
       ▼
┌─────────────┐
│ Frontend    │
│ タイムライン │
│ 更新        │
└─────────────┘
```

---

### 2. AI返信生成フロー

```
┌─────────────┐
│ Redis Queue │
└──────┬──────┘
       │ 1. generate_reply タスク取得
       ▼
┌─────────────┐
│ Celery      │
│ Worker      │
└──────┬──────┘
       │ 2. ペルソナ選択（重み付けランダム）
       │ 3. 各ペルソナごとにループ:
       ▼
┌─────────────┐
│ OpenAI API  │
│ GPT-4o-mini │
└──────┬──────┘
       │ 4. AI返信テキスト生成
       ▼
┌─────────────┐
│ Celery      │
│ Worker      │
└──────┬──────┘
       │ 5. POST /internal/replies
       │    Headers: X-Internal-Secret
       │    Body: {post_id, ai_user, text}
       ▼
┌─────────────┐
│ Backend     │
│ Internal API│
└──────┬──────┘
       │ 6. シークレット検証
       │ 7. repo_create_reply(db, ...)
       ▼
┌─────────────┐
│ PostgreSQL  │
│ replies     │
│ table       │
└──────┬──────┘
       │ 8. INSERT成功
       ▼
┌─────────────┐
│ Backend     │
│ Internal API│
└──────┬──────┘
       │ 9. publish_reply(message)
       ▼
┌─────────────┐
│ Redis       │
│ Pub/Sub     │
│ "sns-replies"│
└──────┬──────┘
       │ 10. メッセージ配信
       ▼
┌─────────────┐
│ Backend     │
│ SSE         │
│ GET /stream │
└──────┬──────┘
       │ 11. subscribe() でメッセージ受信
       │ 12. EventSourceResponse で配信
       ▼
┌─────────────┐
│ Frontend    │
│ EventSource │
└──────┬──────┘
       │ 13. "reply" イベント受信
       │ 14. CustomEvent 発火
       ▼
┌─────────────┐
│ LivePost    │
│ Component   │
└──────┬──────┘
       │ 15. setPost() でローカル状態更新
       ▼
┌─────────────┐
│ PostCard    │
│ 再レンダリング│
└─────────────┘
```

---

### 3. リアルタイム更新フロー (SSE)

```
Frontend起動時:
┌─────────────┐
│ useSSE hook │
└──────┬──────┘
       │ 1. new EventSource("http://backend:8000/stream")
       ▼
┌─────────────┐
│ Backend     │
│ GET /stream │
└──────┬──────┘
       │ 2. EventSourceResponse 開始
       │ 3. subscribe() で Redis Pub/Sub 購読開始
       ▼
┌─────────────┐
│ Redis       │
│ Pub/Sub     │
└─────────────┘
       ↓ (接続維持、メッセージ待機)

AI返信登録時:
┌─────────────┐
│ Backend     │
│ publish_reply│
└──────┬──────┘
       │ Redis PUBLISH "sns-replies" {JSON}
       ▼
┌─────────────┐
│ Redis       │
│ Pub/Sub     │
└──────┬──────┘
       │ 全購読者に配信
       ▼
┌─────────────┐
│ Backend SSE │
│ subscribe() │
└──────┬──────┘
       │ yield {"event": "reply", "data": JSON}
       ▼
┌─────────────┐
│ Frontend    │
│ EventSource │
└──────┬──────┘
       │ addEventListener("reply", handler)
       ▼
┌─────────────┐
│ onReply()   │
│ コールバック │
└──────┬──────┘
       │ CustomEvent("tl-reply") 発火
       ▼
┌─────────────┐
│ LivePost    │
│ useEffect   │
└──────┬──────┘
       │ setPost() でローカル状態更新
       ▼
┌─────────────┐
│ UI 即座更新 │
└─────────────┘
```

---

## デプロイメント構成

### 開発環境 (Docker Compose)

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Host                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Frontend   │  │  Backend    │  │  Celery Worker   │   │
│  │  Container  │  │  Container  │  │  Container       │   │
│  │  :5173      │  │  :8000      │  │                  │   │
│  │             │  │             │  │                  │   │
│  │  Node 20    │  │  Python 3.11│  │  Python 3.11     │   │
│  │  Vite Dev   │  │  Uvicorn    │  │  Celery          │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│                           │                  │             │
│                           ▼                  ▼             │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │ PostgreSQL  │  │   Redis     │                         │
│  │ Container   │  │  Container  │                         │
│  │  :5432      │  │   :6379     │                         │
│  │             │  │             │                         │
│  │  postgres:16│  │  redis:7    │                         │
│  └─────────────┘  └─────────────┘                         │
│                                                             │
│  Volumes:                                                   │
│  - postgres_data (DB永続化)                                 │
│  - redis_data (Redis永続化)                                 │
└─────────────────────────────────────────────────────────────┘
```

**ネットワーク構成**:
- すべてのコンテナが同一Dockerネットワーク内で通信
- Frontendからホストマシン経由でBackendにアクセス
- Backend、Worker、Redisはコンテナ名で名前解決

**ポートマッピング**:
- Frontend: `5173:5173` (Vite Dev Server)
- Backend: `8000:8000` (FastAPI)
- PostgreSQL: `5432:5432` (DB接続)
- Redis: `6379:6379` (Redis CLI接続)

---

### 本番環境構成 (想定)

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      CDN (CloudFlare)                       │
│                   - 静的ファイル配信                         │
│                   - HTTPS終端                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌──────────────────┐     ┌──────────────────────────┐
│  Vercel/Netlify  │     │  Backend (AWS ECS/GCP)   │
│  (Frontend)      │     │  ┌────────────────────┐  │
│                  │     │  │ FastAPI Container  │  │
│  - React Build   │     │  │ - Uvicorn          │  │
│  - Static Assets │     │  │ - Multiple Replicas│  │
└──────────────────┘     │  └────────────────────┘  │
                         │  ┌────────────────────┐  │
                         │  │ Celery Worker      │  │
                         │  │ - Auto Scaling     │  │
                         │  └────────────────────┘  │
                         └──────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │  AWS RDS/Cloud SQL  │       │ ElastiCache/Redis   │
        │  (PostgreSQL)       │       │ (Redis Cluster)     │
        │  - Multi-AZ         │       │ - High Availability │
        │  - Automated Backup │       │ - Pub/Sub, Broker   │
        └─────────────────────┘       └─────────────────────┘
```

**スケーリング戦略**:
- Frontend: CDN + Static Hosting (グローバル配信)
- Backend: 水平スケーリング (ロードバランサー + 複数インスタンス)
- Worker: Celeryワーカー数の動的スケーリング
- Database: リードレプリカ、コネクションプーリング
- Redis: クラスタモード、Sentinel (HA構成)

---

## セキュリティアーキテクチャ

セキュリティ対策の詳細については [SECURITY.md](../SECURITY.md) を参照してください。

**主な実装済み対策**:
- 内部API認証 (X-Internal-Secret)
- CORS対策
- SQLインジェクション対策
- XSS対策
- 入力バリデーション
- 機密情報管理

---

## パフォーマンス最適化

### 1. フロントエンド

| 項目 | 実装 |
|-----|------|
| バンドルサイズ削減 | Viteの自動Tree Shaking |
| コード分割 | 未実装 (今後React.lazy追加予定) |
| 画像最適化 | アバター画像は小サイズPNG/SVG |
| キャッシング | ブラウザキャッシュ活用 |

---

### 2. バックエンド

| 項目 | 実装 |
|-----|------|
| N+1クエリ対策 | SQLAlchemy eager loading (joinedload) |
| コネクションプーリング | SQLAlchemy pooling (デフォルト5) |
| 非同期処理 | Celery (AI返信生成) |
| インデックス | `reply.post_id` にINDEX |

---

### 3. データベース

| 項目 | 実装 |
|-----|------|
| インデックス | `reply.post_id` |
| クエリ最適化 | JOIN による一括取得 |
| コネクションプール | SQLAlchemy管理 |

---

## 監視・ログ

### 現状

| 項目 | 実装状況 |
|-----|---------|
| アプリケーションログ | print文による標準出力 |
| エラートラッキング | 未実装 |
| パフォーマンス監視 | 未実装 |
| ヘルスチェック | ✅ `GET /health` |

### 今後の拡張予定

- 構造化ログ (JSON形式)
- エラートラッキング (Sentry)
- メトリクス収集 (Prometheus + Grafana)
- APM (Application Performance Monitoring)

---

## まとめ

Virtual SNS MVPは、以下の特徴を持つモダンなWebアプリケーションです：

1. **イベント駆動型アーキテクチャ**: Redis Pub/SubとSSEによるリアルタイム性
2. **スケーラブル設計**: CeleryとDockerによる水平スケーリング対応
3. **レイヤードアーキテクチャ**: API/Service/Repository/Modelの明確な分離
4. **型安全性**: TypeScript (Frontend)、Pydantic (Backend)
5. **非同期処理**: AI生成をバックグラウンド化し、ユーザー体験を損なわない

今後、ユーザー認証、画像アップロード、いいね機能などを段階的に追加し、フル機能のSNSプラットフォームへと進化させていきます。

---

**最終更新日**: 2025-12-20
