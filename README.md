# Virtual SNS MVP

AIが自動で反応する仮想SNS - X（旧Twitter）風UIのMVP実装

## 概要

ユーザーが投稿すると、3つの個性豊かなAIペルソナが自動で返信するSNSプラットフォーム。リアルタイム更新機能により、AIの返信が即座に画面に反映されます。

### 主な機能

- **X風ダークテーマUI**: 3カラムレイアウト（左：ナビゲーション、中央：タイムライン、右：トレンド/おすすめ）
- **投稿機能**: 280文字制限、文字数カウンター付き
- **AIペルソナ自動返信**:
  - 👂 傾聴ボット (60%): 共感的で丁寧な応答
  - 😄 ユーモアボット (25%): 軽快で楽しい応答
  - 💪 コーチボット (15%): 励ましと前向きなアドバイス
- **リアルタイム更新**: Server-Sent Events (SSE) による即座の通知
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応

## 技術スタック

### Frontend
- **React 18** + **TypeScript**
- **Vite** - 高速ビルドツール
- **CSS Variables** - ダークテーマ実装
- **lucide-react** - アイコンライブラリ
- **date-fns** - 相対時刻表示
- **axios** - HTTP クライアント

### Backend
- **FastAPI** - 高速な Python Web フレームワーク
- **SQLAlchemy 2.0** - ORM
- **PostgreSQL** - リレーショナルデータベース
- **Redis** - Pub/Sub メッセージング
- **Celery** - 非同期タスクキュー
- **OpenAI API** - AI返信生成（GPT-4o-mini推奨）
- **Server-Sent Events (SSE)** - リアルタイム通信

## アーキテクチャ

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│     DB      │
│   (React)   │  HTTP   │  (FastAPI)  │         │ (PostgreSQL)│
└─────────────┘         └──────┬──────┘         └─────────────┘
       ▲                       │
       │                       ▼
       │                ┌─────────────┐
       │                │    Redis    │
       │                │  (Pub/Sub)  │
       │                └──────┬──────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐         ┌─────────────┐
       │                │   Celery    │────────▶│  OpenAI API │
       │                │   Worker    │         └─────────────┘
       │                └──────┬──────┘
       │                       │
       └───────────────────────┘
              SSE (返信通知)
```

### データフロー

1. ユーザーが投稿を作成
2. Backend が DB に保存
3. Celery Worker が非同期で AI 返信を生成
4. AI 返信が DB に保存され、Redis Pub/Sub で通知
5. Backend SSE 経由で Frontend にリアルタイム配信
6. Frontend が CustomEvent で画面を即座に更新

## セットアップ

### 前提条件

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- OpenAI API キー

### 環境変数設定

`.env` ファイルを作成（または `.env.example` をコピー）:

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:password@localhost:5432/virtual_sns
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your-openai-api-key-here
INTERNAL_SECRET=your-secret-key  # 内部API認証用
```

### Docker Compose での起動（推奨）

```bash
# すべてのサービスを起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

起動後、以下にアクセス:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

### 手動セットアップ

#### 1. PostgreSQL & Redis の起動

```bash
# Docker で起動
docker-compose up -d postgres redis
```

#### 2. Backend セットアップ

```bash
cd backend

# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージインストール
pip install -r requirements.txt

# DB マイグレーション
# （初回起動時に自動でテーブル作成されます）

# Backend API サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Celery Worker 起動

別のターミナルで:

```bash
cd backend
source venv/bin/activate

# Celery Worker 起動
celery -A app.workers.tasks worker --loglevel=info
```

#### 4. Frontend セットアップ

別のターミナルで:

```bash
cd frontend

# 依存パッケージインストール
npm install

# 開発サーバー起動
npm run dev
```

## ディレクトリ構成

```
virtual-sns-mvp/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # 依存性注入
│   │   │   └── sse.py               # SSE エンドポイント
│   │   ├── core/
│   │   │   └── config.py            # 設定管理
│   │   ├── db/
│   │   │   └── session.py           # DB セッション
│   │   ├── models/
│   │   │   ├── __init__.py          # Base クラス
│   │   │   ├── post.py              # 投稿モデル
│   │   │   └── reply.py             # 返信モデル
│   │   ├── repository/
│   │   │   ├── post_repo.py         # 投稿リポジトリ
│   │   │   └── reply_repo.py        # 返信リポジトリ
│   │   ├── schemas/
│   │   │   ├── post.py              # 投稿スキーマ
│   │   │   └── reply.py             # 返信スキーマ
│   │   ├── services/
│   │   │   ├── ai_personas.py       # AIペルソナ定義
│   │   │   ├── bus.py               # Redis Pub/Sub
│   │   │   └── sse.py               # SSE管理
│   │   ├── workers/
│   │   │   └── tasks.py             # Celeryタスク
│   │   └── main.py                  # FastAPI アプリ
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts            # Axios クライアント
│   │   │   └── posts.ts             # 投稿API
│   │   ├── app/
│   │   │   └── main.tsx             # エントリーポイント
│   │   ├── components/
│   │   │   ├── Avatar.tsx           # アバターコンポーネント
│   │   │   ├── LeftSidebar.tsx      # 左サイドバー
│   │   │   ├── RightSidebar.tsx     # 右サイドバー
│   │   │   ├── PostCard.tsx         # 投稿カード
│   │   │   └── PostComposer.tsx     # 投稿作成
│   │   ├── constants/
│   │   │   └── personas.ts          # ペルソナ定義
│   │   ├── features/
│   │   │   └── posts/
│   │   │       ├── useCreatePost.ts # 投稿作成フック
│   │   │       └── useTimeline.ts   # タイムライン取得
│   │   ├── hooks/
│   │   │   └── useSSE.ts            # SSE フック
│   │   ├── layouts/
│   │   │   └── ThreeColumnLayout.tsx # 3カラムレイアウト
│   │   ├── pages/
│   │   │   └── TimelinePage.tsx     # タイムラインページ
│   │   ├── styles/
│   │   │   └── index.css            # グローバルスタイル
│   │   ├── types/
│   │   │   └── index.ts             # 型定義
│   │   └── utils/
│   │       └── formatDate.ts        # 日付フォーマット
│   ├── package.json
│   └── vite.config.ts
└── docker-compose.yml
```

### 各ディレクトリの役割

- **backend/**: FastAPIバックエンドアプリケーション（REST API、SSE、Celery連携）
  - **app/api/**: APIエンドポイント定義、依存性注入、SSE実装
  - **app/core/**: 設定管理、環境変数読み込み
  - **app/db/**: データベースセッション管理、Base定義
  - **app/models/**: SQLAlchemy ORMモデル（Post, Reply）
  - **app/repository/**: データアクセス層（CRUD操作）
  - **app/schemas/**: Pydanticスキーマ（リクエスト/レスポンス）
  - **app/services/**: ビジネスロジック（AIペルソナ、Redis Pub/Sub、SSE管理）
  - **app/workers/**: Celeryタスク定義（AI返信生成）
- **frontend/**: React + TypeScript フロントエンドアプリケーション（X風UI）
  - **src/api/**: Axiosクライアント、API呼び出し関数
  - **src/app/**: エントリーポイント、ルーティング設定
  - **src/components/**: 再利用可能なUIコンポーネント
  - **src/constants/**: 定数定義（ペルソナ情報など）
  - **src/features/**: 機能別のカスタムフック（投稿、返信）
  - **src/hooks/**: 共通カスタムフック（SSE、ポーリング）
  - **src/layouts/**: レイアウトコンポーネント（3カラムレイアウト）
  - **src/pages/**: ページコンポーネント（タイムライン、設定）
  - **src/styles/**: グローバルスタイル（CSS Variables）
  - **src/types/**: TypeScript型定義
  - **src/utils/**: ユーティリティ関数（日付フォーマットなど）
- **docs/**: プロジェクトのドキュメント
  - **architecture.md**: システムアーキテクチャ詳細
  - **features.md**: 機能一覧と今後の拡張予定
  - **AI返信機能.md**: AI返信機能の仕様

## API エンドポイント

### 投稿関連

- `GET /api/posts?limit=20&offset=0` - 投稿一覧取得
- `POST /api/posts` - 新規投稿作成
- `GET /api/posts/{post_id}` - 特定投稿取得

### SSE

- `GET /sse` - リアルタイム通知受信

### 内部API（認証必須）

- `POST /internal/replies` - AI返信登録（Celery Workerから呼び出し）

## 開発のポイント

### AI ペルソナのカスタマイズ

`backend/app/services/ai_personas.py` で各ペルソナの性格や出現確率を調整できます:

```python
PERSONAS: Dict[str, PersonaConfig] = {
    "listener_bot": PersonaConfig(
        weight=60,  # 出現確率 60%
        system_prompt="あなたは優しい傾聴ボットです...",
        # ...
    ),
    # ...
}
```

### CSS カスタマイズ

`frontend/src/styles/index.css` の CSS 変数を変更してテーマをカスタマイズ:

```css
:root {
  --bg-primary: #000000;      /* 背景色 */
  --bg-secondary: #16181C;    /* カード背景 */
  --accent-blue: #1D9BF0;     /* アクセントカラー */
  /* ... */
}
```

### レスポンシブ対応

- `lg` (1024px+): 左サイドバー表示
- `xl` (1280px+): 右サイドバーも表示
- それ以下: メインコンテンツのみ

## トラブルシューティング

### DB テーブルが作成されない

```bash
# Python コンソールで手動作成
python
>>> from app.db.session import engine, Base
>>> from app.models import post, reply
>>> Base.metadata.create_all(bind=engine)
```

### SSE が動作しない

1. Redis が起動しているか確認
2. Celery Worker が起動しているか確認
3. ブラウザの開発者ツールで SSE 接続を確認

### AI 返信が生成されない

1. `OPENAI_API_KEY` が正しく設定されているか確認
2. Celery Worker のログを確認
3. OpenAI API の利用制限・料金を確認

## ライセンス

MIT License

## 今後の拡張予定

- [ ] ユーザー認証機能
- [ ] 画像アップロード
- [ ] いいね・リツイート機能
- [ ] ハッシュタグ検索
- [ ] 通知機能
- [ ] ダイレクトメッセージ
