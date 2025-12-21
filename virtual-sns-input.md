# Virtual SNS MVP

AIが自動で反応する仮想SNS - X（旧Twitter）風UIのMVP実装

## 概要

ユーザーが投稿すると、3つの個性豊かなAIペルソナが自動で返信するSNSプラットフォーム。リアルタイム更新機能により、AIの返信が即座に画面に反映されます。

ソーシャルメディア疲れを感じることなく、常に反応が得られる心地よい環境を提供することで、ユーザーの自己表現を促進し、安心感のあるコミュニケーション体験を実現します。

### 主な機能

MVPで実装すべき最小限の機能:

- **X風ダークテーマUI**: 3カラムレイアウト（左：ナビゲーション、中央：タイムライン、右：トレンド/おすすめ）
- **投稿機能**: 280文字制限、文字数カウンター、リアルタイムバリデーション付き
- **AIペルソナ自動返信**:
  - 👂 傾聴ボット (60%): 共感的で丁寧な応答
  - 😄 ユーモアボット (25%): 軽快で楽しい応答
  - 💪 コーチボット (15%): 励ましと前向きなアドバイス
- **リアルタイム更新**: Server-Sent Events (SSE) による即座の通知とUI更新
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ対応

### ユーザーストーリー

主要なユーザーストーリー:

1. 一般ユーザーとして、自分の気持ちを投稿し、AIからの共感的な反応を得ることで、孤独感を和らげたい
2. 一般ユーザーとして、過去の投稿とAI返信を時系列で確認することで、自分の感情の変化を振り返りたい
3. 一般ユーザーとして、投稿するとすぐにAIが返信してくれることで、SNSでの即時的なフィードバックを体験したい
4. 一般ユーザーとして、異なる性格のAIから多様な視点の返信をもらうことで、新しい気づきを得たい

## 技術スタック

### Frontend
- **フレームワーク**: React 18
- **言語**: TypeScript
- **ビルドツール**: Vite
- **スタイリング**: CSS Variables（CSS Modules不使用、グローバルCSS + インラインスタイル）
- **状態管理**: React Hooks（useState, useEffect）のみ（外部ライブラリ不使用）
- **その他ライブラリ**:
  - lucide-react - アイコンライブラリ
  - date-fns - 相対時刻表示（"3分前"など）
  - axios - HTTP クライアント

### Backend
- **フレームワーク**: FastAPI
- **言語**: Python 3.11+
- **データベース**: PostgreSQL 16
- **ORM**: SQLAlchemy 2.0（最新の Mapped 型アノテーション使用）
- **認証**: 内部API用シークレットキー（INTERNAL_SECRET）
- **キャッシュ**: Redis 7（Pub/Sub メッセージング用）
- **非同期処理**: Celery（AI返信生成用バックグラウンドワーカー）
- **外部API**: OpenAI API（GPT-4o-mini推奨）
- **リアルタイム通信**: Server-Sent Events (SSE)

### インフラ・開発環境
- **コンテナ**: Docker, Docker Compose
- **CI/CD**: 未実装（今後の拡張予定）
- **ホスティング**: ローカル開発のみ（本番環境は未設定）
- **監視・ログ**: 未実装（今後の拡張予定）

## アーキテクチャ

### システム構成図

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

主要な処理（投稿→AI返信→リアルタイム通知）のデータフロー:

1. ユーザーがフロントエンドで投稿を作成
2. POST /api/posts でバックエンドに送信、DBに保存
3. 投稿保存後、バックエンドがCeleryタスク（generate_ai_replies）をキューに投入
4. Celery Workerが非同期でOpenAI APIを呼び出し、3つのペルソナからAI返信を生成
5. 生成された各返信が POST /internal/replies でバックエンドに送信され、DBに保存
6. 返信保存時、Redis Pub/Subで "reply_added" イベントを発行
7. バックエンドSSEエンドポイント（GET /sse）がRedisからイベントを受信
8. SSE経由でフロントエンドにリアルタイム配信
9. フロントエンドがCustomEventを使ってUI（タイムライン）を即座に更新

### 設計思想・制約

- **アーキテクチャパターン**: レイヤードアーキテクチャ（API層 → Service層 → Repository層 → Model層）
- **API設計**: RESTful API（JSON形式）
- **認証方式**:
  - 一般API: 認証なし（MVPのため）
  - 内部API（/internal/*）: シークレットキーベース認証（X-Internal-Secret ヘッダー）
- **データベース設計**:
  - シンプルな正規化（posts - replies は 1対多）
  - カスケード削除（投稿削除時に関連返信も削除）
  - インデックス: reply.post_id にインデックス設定
- **非同期処理**: AI返信生成は時間がかかるため、Celeryで非同期化し、ユーザー体験を損なわない
- **リアルタイム通信**: WebSocketではなくSSEを採用（サーバー→クライアントの単方向通信で十分）

## データモデル

### エンティティ一覧

#### Post（投稿）
- **フィールド**:
  - `id`: Integer (Primary Key) - 投稿ID
  - `text`: String (NOT NULL) - 投稿本文（280文字制限）
  - `created_at`: DateTime (timezone=True, server_default=NOW()) - 作成日時
- **リレーション**:
  - Reply - 1対多（1つの投稿に対して複数の返信）

#### Reply（返信）
- **フィールド**:
  - `id`: Integer (Primary Key) - 返信ID
  - `post_id`: Integer (Foreign Key to posts.id, CASCADE, Indexed, NOT NULL) - 対象投稿ID
  - `ai_user`: String(64) (default="listener_bot") - AIペルソナID（listener_bot / humorist_bot / coach_bot）
  - `text`: Text (NOT NULL) - 返信本文
  - `created_at`: DateTime (timezone=True, server_default=NOW()) - 作成日時
- **リレーション**:
  - Post - 多対1（各返信は1つの投稿に紐づく）

### ER図（簡易）

```
┌─────────────────┐         ┌─────────────────┐
│      Post       │         │      Reply      │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │◀───────┤ id (PK)         │
│ text            │    1:N  │ post_id (FK)    │
│ created_at      │         │ ai_user         │
└─────────────────┘         │ text            │
                            │ created_at      │
                            └─────────────────┘
```

## API仕様

### エンドポイント一覧

#### 投稿（Posts）

- `GET /api/posts?limit=20&offset=0` - 投稿一覧取得（返信を含む、新しい順）
  - Query Params:
    - `limit` (デフォルト: 20) - 取得件数
    - `offset` (デフォルト: 0) - オフセット
  - Response:
    ```json
    {
      "data": [
        {
          "id": 1,
          "text": "投稿本文",
          "created_at": "2025-11-08T12:34:56.789Z",
          "replies": [
            {
              "id": 1,
              "post_id": 1,
              "ai_user": "listener_bot",
              "text": "返信本文",
              "created_at": "2025-11-08T12:35:10.123Z"
            }
          ]
        }
      ],
      "total": 100
    }
    ```

- `POST /api/posts` - 新規投稿作成
  - Body:
    ```json
    {
      "text": "投稿本文（280文字以内）"
    }
    ```
  - Response:
    ```json
    {
      "id": 1,
      "text": "投稿本文",
      "created_at": "2025-11-08T12:34:56.789Z",
      "replies": []
    }
    ```

- `GET /api/posts/{post_id}` - 特定投稿取得（返信を含む）
  - Response:
    ```json
    {
      "id": 1,
      "text": "投稿本文",
      "created_at": "2025-11-08T12:34:56.789Z",
      "replies": [...]
    }
    ```

#### SSE（リアルタイム通知）

- `GET /sse` - リアルタイム通知受信（Server-Sent Events）
  - Response: text/event-stream 形式
  - イベント例:
    ```
    event: new_reply
    data: {"reply_id": 123, "post_id": 1, "ai_user": "listener_bot"}
    ```

#### 内部API（認証必須）

- `POST /internal/replies` - AI返信登録（Celery Workerから呼び出し専用）
  - Headers: `X-Internal-Secret: <INTERNAL_SECRET>`
  - Body:
    ```json
    {
      "post_id": 1,
      "ai_user": "listener_bot",
      "text": "AI返信本文"
    }
    ```
  - Response:
    ```json
    {
      "id": 1,
      "post_id": 1,
      "ai_user": "listener_bot",
      "text": "AI返信本文",
      "created_at": "2025-11-08T12:35:10.123Z"
    }
    ```

### 認証・認可

- **認証方式**:
  - 一般API（/api/*）: 認証なし（MVPのため）
  - 内部API（/internal/*）: `X-Internal-Secret` ヘッダーでシークレットキー検証
- **認可ルール**:
  - 一般API: 全てのユーザーがアクセス可能
  - 内部API: Celery Worker のみがアクセス可能
- **エラーハンドリング**:
  - 401 Unauthorized: シークレットキーが不正な場合
  - 404 Not Found: リソースが存在しない場合
  - 422 Unprocessable Entity: バリデーションエラー

## UI/UX要件

### レイアウト

- **デスクトップ（1280px+）**: 3カラムレイアウト
  - 左サイドバー（ナビゲーション）: 280px
  - 中央タイムライン: 600px
  - 右サイドバー（トレンド/おすすめ）: 350px
- **タブレット（1024px - 1279px）**: 2カラムレイアウト
  - 左サイドバー（ナビゲーション）: 80px（アイコンのみ）
  - 中央タイムライン: 残り全幅
  - 右サイドバー: 非表示
- **モバイル（〜1023px）**: 1カラムレイアウト
  - 中央タイムラインのみ表示
  - 左右サイドバー: 非表示

### デザインシステム

- **カラーパレット**: X（Twitter）風ダークテーマ
  - `--bg-primary: #000000` - メイン背景
  - `--bg-secondary: #16181C` - カード背景
  - `--bg-hover: #1C1F23` - ホバー時背景
  - `--accent-blue: #1D9BF0` - プライマリアクション（ボタン、リンク）
  - `--text-primary: #E7E9EA` - メインテキスト
  - `--text-secondary: #71767B` - 補助テキスト
  - `--border-color: #2F3336` - 境界線
- **タイポグラフィ**:
  - フォントファミリー: system-ui, -apple-system, sans-serif
  - サイズ階層:
    - H1: 20px (太字)
    - 本文: 15px
    - 小文字: 13px
    - キャプション: 12px
- **スペーシング**:
  - 基本単位: 4px
  - パディング: 12px, 16px, 20px
  - マージン: 8px, 16px
- **コンポーネント**:
  - ボタン: 丸みのある角（border-radius: 9999px）、ホバー時に暗くなる
  - カード: 境界線あり、ホバー時に背景色変更
  - アバター: 円形、40px x 40px

### ページ構成

主要なページとその機能:

1. **タイムラインページ** (`/`)
   - 目的: 投稿の閲覧と新規投稿の作成
   - 表示内容:
     - 投稿作成エリア（PostComposer）
     - 投稿一覧（PostCard）
     - 各投稿に対するAI返信の表示
   - 主要な操作:
     - 新規投稿作成（280文字制限、文字数カウンター）
     - 投稿一覧のスクロール閲覧
     - AI返信のリアルタイム表示

### アクセシビリティ

- [ ] キーボード操作対応（Enterキーで投稿、Tabキーでフォーカス移動）
- [ ] スクリーンリーダー対応（aria-label, alt属性）
- [ ] カラーコントラスト確保（WCAG 2.1 AA準拠）
- [x] レスポンシブデザイン（モバイル・タブレット・デスクトップ対応済み）

## セキュリティ要件

### 実装必須項目

- [x] **認証**: 内部API用シークレットキー認証（X-Internal-Secret）
- [ ] **認可**: MVPでは未実装（今後、ユーザー認証機能追加時に実装）
- [x] **CSRF対策**: FastAPIのCORSMiddlewareで特定オリジンのみ許可
- [x] **XSS対策**: Reactの自動エスケープ + DOMPurify（必要に応じて追加）
- [x] **SQLインジェクション対策**: SQLAlchemy ORM使用（パラメータ化クエリ）
- [ ] **レート制限**: 未実装（今後の拡張予定）
- [x] **入力バリデーション**: Pydantic スキーマでバリデーション、280文字制限
- [x] **機密情報管理**: 環境変数（.env）でAPIキー、シークレット管理（.gitignore済み）

### HTTPS/TLS

- 本番環境では必須（現在未実装）
- 開発環境ではHTTP使用

## パフォーマンス要件

### 目標指標

- **初期ロード時間**: 2秒以内（Viteの高速ビルドにより達成）
- **API応答時間**:
  - GET /api/posts: 200ms以内
  - POST /api/posts: 100ms以内（AI生成は非同期）
- **AI返信生成時間**: 3-5秒（OpenAI API依存、ユーザー体験に影響なし）
- **同時接続数**: 100まで対応（MVP想定）
- **データベースクエリ**: 50ms以内

### 最適化戦略

- [x] **フロントエンド**:
  - Viteによる高速ビルド
  - 遅延ロード（React.lazy）は未使用（MVPのため）
  - 画像最適化（アバターは小サイズPNG/SVG）
- [x] **バックエンド**:
  - Celeryによる非同期処理（AI生成）
  - SQLAlchemyのeager loading（replies を join 取得）
  - Redis Pub/Sub による効率的なイベント配信
- [ ] **CDN**: 未実装（今後の拡張予定）

## 開発環境・前提条件

### 必須ツール

- **Node.js**: 18+ (推奨: 20 LTS)
- **Python**: 3.11+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **その他**: git

### 推奨環境

- **OS**: macOS / Linux / Windows with WSL2
- **エディタ**: VS Code（推奨拡張機能: Python, ESLint, Prettier, Docker）
- **ブラウザ**: Chrome / Firefox 最新版

### 外部サービス・API

必要なアカウント・APIキー:

- [x] OpenAI API: AI返信生成用 - https://platform.openai.com/api-keys
  - GPT-4o-mini推奨（コスト効率が良い）
  - 使用量目安: 1投稿あたり3返信 = 約0.001ドル

## 環境変数設定

### Backend

`backend/.env` ファイルを作成:

```bash
# Database
DATABASE_URL=postgresql://app:app@postgres:5432/virtualsns

# Cache & Pub/Sub
REDIS_URL=redis://redis:6379/0

# 外部API
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# セキュリティ
INTERNAL_SECRET=your-random-secret-key-here-change-in-production

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# その他
ENVIRONMENT=development
DEBUG=true
```

### Frontend

`frontend/.env` ファイルを作成（必要に応じて）:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## ディレクトリ構成

```
virtual-sns-mvp/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              # 依存性注入（DB セッション、認証など）
│   │   │   └── sse.py               # SSE エンドポイント
│   │   ├── core/
│   │   │   └── config.py            # 設定管理（環境変数読み込み）
│   │   ├── db/
│   │   │   └── session.py           # DB セッション、Base クラス
│   │   ├── models/
│   │   │   ├── __init__.py          # Base エクスポート
│   │   │   ├── post.py              # 投稿モデル
│   │   │   └── reply.py             # 返信モデル
│   │   ├── repository/
│   │   │   ├── post_repo.py         # 投稿リポジトリ（CRUD操作）
│   │   │   └── reply_repo.py        # 返信リポジトリ（CRUD操作）
│   │   ├── schemas/
│   │   │   ├── post.py              # 投稿スキーマ（Pydantic）
│   │   │   └── reply.py             # 返信スキーマ（Pydantic）
│   │   ├── services/
│   │   │   ├── ai_personas.py       # AIペルソナ定義（3種類）
│   │   │   ├── bus.py               # Redis Pub/Sub ラッパー
│   │   │   └── sse.py               # SSE 管理（クライアント接続管理）
│   │   ├── workers/
│   │   │   ├── celery_app.py        # Celery アプリ初期化
│   │   │   └── tasks.py             # Celeryタスク（AI返信生成）
│   │   └── main.py                  # FastAPI アプリ、ルーター登録
│   ├── requirements.txt             # Python 依存パッケージ
│   ├── Dockerfile                   # Backend Docker イメージ
│   └── .env                         # 環境変数（.gitignore済み）
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts            # Axios クライアント設定
│   │   │   └── posts.ts             # 投稿API関数
│   │   ├── app/
│   │   │   └── main.tsx             # エントリーポイント
│   │   ├── components/
│   │   │   ├── Avatar.tsx           # アバターコンポーネント
│   │   │   ├── LeftSidebar.tsx      # 左サイドバー（ナビゲーション）
│   │   │   ├── RightSidebar.tsx     # 右サイドバー（トレンド/おすすめ）
│   │   │   ├── PostCard.tsx         # 投稿カード（返信表示含む）
│   │   │   └── PostComposer.tsx     # 投稿作成フォーム
│   │   ├── constants/
│   │   │   └── personas.ts          # ペルソナ定義（Frontend用）
│   │   ├── features/
│   │   │   └── posts/
│   │   │       ├── useCreatePost.ts # 投稿作成カスタムフック
│   │   │       └── useTimeline.ts   # タイムライン取得カスタムフック
│   │   ├── hooks/
│   │   │   └── useSSE.ts            # SSE 接続カスタムフック
│   │   ├── layouts/
│   │   │   └── ThreeColumnLayout.tsx # 3カラムレイアウト
│   │   ├── pages/
│   │   │   └── TimelinePage.tsx     # タイムラインページ
│   │   ├── styles/
│   │   │   └── index.css            # グローバルスタイル（CSS Variables）
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript型定義
│   │   └── utils/
│   │       └── formatDate.ts        # 日付フォーマット（"3分前"など）
│   ├── public/
│   │   └── vite.svg                 # ファビコン
│   ├── index.html                   # HTMLテンプレート
│   ├── package.json                 # npm 依存パッケージ
│   ├── tsconfig.json                # TypeScript 設定
│   ├── vite.config.ts               # Vite 設定
│   └── .env                         # 環境変数（.gitignore済み）
├── docker-compose.yml               # Docker Compose 設定
├── .gitignore
├── README.md
└── mvp-template.md                  # このテンプレート
```

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/virtual-sns-mvp.git
cd virtual-sns-mvp
```

### 2. 環境変数の設定

```bash
# Backend
cp backend/.env.example backend/.env
# .envファイルを編集してOPENAI_API_KEYなどを設定

# Frontend（必要に応じて）
# デフォルトでは http://localhost:8000 を使用
```

### 3. Docker Composeでの起動（推奨）

```bash
# すべてのサービスを起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down
```

### 4. 手動セットアップ

#### PostgreSQL & Redis の起動

```bash
# Docker で起動（または手動でインストール）
docker-compose up -d postgres redis
```

#### Backend セットアップ

```bash
cd backend

# 仮想環境作成
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージインストール
pip install -r requirements.txt

# データベースマイグレーション
# （初回起動時に自動でテーブル作成されます）

# サーバー起動
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Celery Worker 起動

別のターミナルで:

```bash
cd backend
source venv/bin/activate

# Celery Worker 起動
celery -A app.workers.celery_app.celery_app worker --loglevel=INFO
```

#### Frontend セットアップ

別のターミナルで:

```bash
cd frontend

# 依存パッケージインストール
npm install

# 開発サーバー起動
npm run dev
```

### 5. 動作確認

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

## テスト

### Backend

```bash
cd backend
pytest
```

（注: 現在テストは未実装。今後の拡張予定）

### Frontend

```bash
cd frontend
npm run test
```

（注: 現在テストは未実装。今後の拡張予定）

### E2Eテスト

未実装（今後の拡張予定）

## デプロイ

### ビルド

```bash
# Frontend
cd frontend
npm run build  # dist/ ディレクトリに生成

# Backend
# FastAPIはビルド不要（uvicorn で起動）
```

### デプロイ手順

（未実装。今後の拡張予定）

1. Frontend を Vercel / Netlify / CloudFlare Pages などにデプロイ
2. Backend を AWS ECS / GCP Cloud Run / Heroku などにデプロイ
3. PostgreSQL, Redis をマネージドサービスに移行（AWS RDS, ElastiCache など）

## トラブルシューティング

### 問題1: DB テーブルが作成されない

**原因**: 初回起動時にテーブルが自動作成されない場合

**解決方法**:
```bash
# Python コンソールで手動作成
cd backend
source venv/bin/activate
python
>>> from app.db.session import engine, Base
>>> from app.models import post, reply
>>> Base.metadata.create_all(bind=engine)
>>> exit()
```

### 問題2: SSE が動作しない（AI返信がリアルタイムで表示されない）

**原因**: Redis または Celery Worker が起動していない

**解決方法**:
```bash
# Redis 起動確認
docker ps | grep redis

# Celery Worker 起動確認
docker ps | grep worker
# または手動起動の場合
ps aux | grep celery

# ブラウザの開発者ツールで SSE 接続を確認
# Network タブ → sse → EventStream
```

### 問題3: AI 返信が生成されない

**原因**: OpenAI API キーが未設定または無効

**解決方法**:
```bash
# .env ファイルを確認
cat backend/.env | grep OPENAI_API_KEY

# Celery Worker のログを確認
docker-compose logs -f worker

# OpenAI API の利用制限・料金を確認
# https://platform.openai.com/usage
```

### 問題4: フロントエンドからバックエンドに接続できない

**原因**: CORS設定またはポート競合

**解決方法**:
```bash
# バックエンドが起動しているか確認
curl http://localhost:8000/docs

# CORS設定を確認（backend/app/main.py）
# origins = ["http://localhost:5173"] が設定されているか確認
```

## 開発ガイドライン

### コーディング規約

- **Python**:
  - PEP 8 準拠
  - 型ヒント必須（Python 3.11+ の新しい型構文使用）
  - docstring は Google スタイル

- **TypeScript**:
  - Airbnb スタイルガイド準拠
  - 型注釈必須（any 禁止）
  - 関数はアロー関数を優先

### Git運用

- **ブランチ戦略**: GitHub Flow
  - main: 本番環境（現在は開発のみ）
  - develop: 開発環境
  - feature/xxx: 機能開発
  - fix/xxx: バグ修正
- **コミットメッセージ**: Conventional Commits
  - feat: 新機能
  - fix: バグ修正
  - docs: ドキュメント
  - refactor: リファクタリング
  - test: テスト追加
- **プルリクエスト**:
  - レビュー必須（1人以上）
  - CI/CD パス必須（未実装）

### コードレビュー

- [ ] コードがPEP 8 / Airbnb スタイルガイドに準拠しているか
- [ ] 型注釈が適切に付与されているか
- [ ] セキュリティ脆弱性（XSS, SQLインジェクションなど）がないか
- [ ] パフォーマンス上の問題がないか
- [ ] テストが追加されているか（今後）

## ライセンス

MIT License

## 今後の拡張予定

MVP完成後に実装予定の機能:

- [ ] ユーザー認証機能（サインアップ、ログイン、JWT）
- [ ] 画像アップロード（投稿に画像添付）
- [ ] いいね・リツイート機能
- [ ] ハッシュタグ検索
- [ ] 通知機能（@メンション通知など）
- [ ] ダイレクトメッセージ（DM）
- [ ] ユーザープロフィールページ
- [ ] AI ペルソナのカスタマイズ（ユーザーが独自のペルソナを作成）
- [ ] 本番環境デプロイ（Vercel + AWS）
- [ ] CI/CDパイプライン（GitHub Actions）
- [ ] E2Eテスト（Playwright）
- [ ] レート制限（投稿数制限）
- [ ] 管理画面（投稿管理、ユーザー管理）

## 参考資料

- FastAPI ドキュメント: https://fastapi.tiangolo.com/
- React ドキュメント: https://react.dev/
- SQLAlchemy 2.0 ドキュメント: https://docs.sqlalchemy.org/en/20/
- Celery ドキュメント: https://docs.celeryq.dev/
- OpenAI API ドキュメント: https://platform.openai.com/docs/
- Server-Sent Events (SSE) 仕様: https://html.spec.whatwg.org/multipage/server-sent-events.html

## 連絡先

- **プロジェクトオーナー**: [あなたの名前]
- **リポジトリ**: https://github.com/yourusername/virtual-sns-mvp
- **課題管理**: https://github.com/yourusername/virtual-sns-mvp/issues
