# AI返信機能 仕様書

## 概要

Virtual SNS MVPにおけるAI自動返信機能は、ユーザーの投稿に対して3つの個性豊かなAIペルソナが自動的に返信する仕組みです。リアルタイム通知により、AI返信が生成され次第、即座にユーザー画面に反映されます。

### 主要な特徴

- **非同期処理**: Celeryを使用してAI返信生成をバックグラウンド化し、ユーザー体験を損なわない
- **リアルタイム更新**: Server-Sent Events (SSE) とRedis Pub/Subによる即座の通知
- **複数ペルソナ**: 3種類のAIペルソナが確率的に返信（重み付け選択）
- **自然な間隔**: 各返信にランダムなディレイを設定し、人間らしいタイミングを再現

---

## アーキテクチャ

### システム構成

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│     DB      │
│   (React)   │  HTTP   │  (FastAPI)  │         │ (PostgreSQL)│
└──────┬──────┘         └──────┬──────┘         └─────────────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐
       │                │    Redis    │
       │                │  (Pub/Sub)  │
       │                └──────┬──────┘
       │                       │
       │                       ▼
       │                ┌─────────────┐         ┌─────────────┐
       │                │   Celery    │────────▶│  OpenAI API │
       │                │   Worker    │         │ (GPT-4o-mini)│
       │                └──────┬──────┘         └─────────────┘
       │                       │
       └───────────────────────┘
              SSE (返信通知)
```

### 処理フロー

```
1. ユーザー投稿
   └─▶ POST /posts
       └─▶ DB保存
           └─▶ Celeryタスク投入 (generate_reply.delay)

2. Celery Worker処理
   ├─▶ ペルソナ選択（重み付け1〜2件）
   ├─▶ 各ペルソナごとに
   │   ├─▶ ランダムディレイ (1〜10秒 + 順番補正)
   │   ├─▶ OpenAI API呼び出し
   │   └─▶ POST /internal/replies（返信登録）
   │       └─▶ DB保存
   │           └─▶ Redis Pub/Sub発行 (publish_reply)
   │
   └─▶ SSEストリーム配信
       └─▶ フロントエンドで即座にUI更新
```

---

## AIペルソナ仕様

### ペルソナ一覧

| ID | 表示名 | 役割 | 選択確率 | Temperature | 文字数制限 |
|---|---|---|---|---|---|
| `listener_bot` | やさしい聞き役 | 共感的で丁寧な応答 | 60% | 0.6 | 60文字以内 |
| `humorist_bot` | 軽口ユーモア | 軽快で楽しい応答 | 25% | 0.9 | 60文字以内 |
| `coach_bot` | やさしいコーチ | 励ましと前向きなアドバイス | 15% | 0.7 | 60文字以内 |

### ペルソナ詳細

#### 1. listener_bot（やさしい聞き役）

- **システムプロンプト**:
  ```
  あなたはSNS上の聞き役ユーザーです。
  短く共感し、安心感のある一言を返します。
  絵文字は1〜2個まで。60文字以内。
  ```
- **Temperature**: 0.6（一貫性重視）
- **使用例**: 「それは大変でしたね😊 無理せず休んでくださいね」

#### 2. humorist_bot（軽口ユーモア）

- **システムプロンプト**:
  ```
  あなたはSNS上の軽口ユーザーです。
  相手を傷つけないユーモアで、ふっと気が抜ける返しをします。
  やりすぎ注意。60文字以内。
  ```
- **Temperature**: 0.9（創造性重視）
- **使用例**: 「カフェインの力でも限界あるよね😂 お疲れさまです！」

#### 3. coach_bot（やさしいコーチ）

- **システムプロンプト**:
  ```
  あなたはSNS上のやさしいコーチです。
  相手の気持ちを受け止め、無理のない小さな行動を1つ提案します。
  説教臭さは禁止。60文字以内。
  ```
- **Temperature**: 0.7（バランス型）
- **使用例**: 「今日はよく頑張りましたね💪 明日は5分早く寝るのはどうですか？」

---

## API仕様

### 1. 投稿作成API

**エンドポイント**: `POST /posts`

**リクエスト**:
```json
{
  "text": "今日はとても疲れた..."
}
```

**レスポンス**:
```json
{
  "id": 123,
  "text": "今日はとても疲れた...",
  "created_at": "2025-11-23T10:30:00.123Z",
  "replies": []
}
```

**処理**:
1. 投稿をDBに保存
2. Celeryタスク `generate_reply.delay(post_id, text)` を非同期実行
3. 即座にレスポンス返却（AI返信生成を待たない）

---

### 2. 内部API - 返信登録

**エンドポイント**: `POST /internal/replies`

**認証**: `X-Internal-Secret` ヘッダー（Celery Workerのみアクセス可）

**リクエスト**:
```json
{
  "post_id": 123,
  "ai_user": "listener_bot",
  "text": "それは大変でしたね😊 無理せず休んでくださいね"
}
```

**レスポンス**:
```json
{
  "id": 456,
  "post_id": 123,
  "ai_user": "listener_bot",
  "text": "それは大変でしたね😊 無理せず休んでくださいね",
  "created_at": "2025-11-23T10:30:15.456Z"
}
```

**処理**:
1. シークレットキー検証（403 Forbiddenで拒否）
2. 投稿存在確認（404 Not Found）
3. 返信をDBに保存
4. Redis Pub/Subでイベント発行（バックグラウンドタスク）

---

### 3. SSEストリーム

**エンドポイント**: `GET /stream`

**レスポンス形式**: `text/event-stream`

**イベント例**:
```
event: ping
data: {"t": 1700000000.123}

event: reply
data: {"type":"reply","post_id":123,"reply":{"id":456,"post_id":123,"text":"それは大変でしたね😊","ai_user":"listener_bot","created_at":"2025-11-23T10:30:15.456Z"}}
```

**特徴**:
- `ping`: 15秒ごとに接続維持用pingを送信
- `reply`: 新しい返信が登録されるたびにリアルタイム配信
- クライアント側で自動再接続対応

---

## 実装詳細

### バックエンド

#### 1. Celeryタスク定義

ファイル: `backend/app/workers/tasks.py`

```python
@celery_app.task(name="generate_reply", bind=True)
def generate_reply(self, post_id: int, text: str):
    # 返信数を1〜MAX_REPLIESでランダム決定（デフォルト: 1〜2件）
    k = random.randint(1, max(1, MAX_REPLIES))

    # 重み付けペルソナ選択（重複なし）
    persona_ids = _weighted_choice_k(k)

    for idx, persona_id in enumerate(persona_ids):
        # 自然な間隔のディレイ（1〜10秒 + 順番補正）
        delay = random.randint(REPLY_DELAY_MIN, REPLY_DELAY_MAX) + idx * 2
        time.sleep(delay)

        # OpenAI API呼び出し
        reply_text, ai_user_id = generate_ai_reply(text, persona_id=persona_id)

        # 内部APIで返信登録
        requests.post(
            f"{API_BASE}/internal/replies",
            headers={"X-Internal-Secret": INTERNAL_SECRET},
            json={"post_id": post_id, "text": reply_text, "ai_user": ai_user_id}
        )
```

**ポイント**:
- 各返信にディレイを設定し、人間らしいタイミングを実現
- 重み付け選択により、聞き役ボット（60%）が優先的に選ばれる
- エラー時もタスクは続行（他のペルソナの返信生成を妨げない）

---

#### 2. OpenAI API呼び出し

ファイル: `backend/app/services/ai_client.py`

```python
def generate_ai_reply(text: str, persona_id: str | None = None) -> tuple[str, str]:
    persona = resolve_persona(persona_id)

    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": persona.system_prompt},
            {"role": "user", "content": f"投稿: {text}"},
        ],
        temperature=persona.temperature,
        max_tokens=persona.max_tokens,
    )

    reply = (response.choices[0].message.content or "").strip()
    return reply, persona.id
```

**ポイント**:
- システムプロンプトでペルソナの性格を定義
- Temperatureでランダム性を制御（聞き役: 0.6、ユーモア: 0.9）
- モデルは`gpt-4o-mini`推奨（コスト効率が良い）

---

#### 3. Redis Pub/Sub イベント配信

ファイル: `backend/app/services/bus.py`

```python
async def publish_reply(message: dict):
    r = aioredis.from_url(REDIS_URL)
    try:
        await r.publish("sns-replies", json.dumps(message))
    finally:
        await r.close()

async def subscribe():
    r = aioredis.from_url(REDIS_URL)
    psub = r.pubsub()
    await psub.subscribe("sns-replies")
    try:
        async for msg in psub.listen():
            if msg and msg["type"] == "message":
                yield msg["data"]
    finally:
        await psub.unsubscribe("sns-replies")
        await psub.close()
        await r.close()
```

**ポイント**:
- チャンネル名: `sns-replies`
- メッセージ形式: JSON文字列
- SSEエンドポイントが購読し、クライアントにストリーム配信

---

### フロントエンド

#### 1. SSE接続フック

ファイル: `frontend/src/hooks/useSSE.ts`

```typescript
export function useSSE(onReply: OnReply) {
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const es = new EventSource(`${base}/stream`, { withCredentials: false });

    es.addEventListener("reply", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        onReply({ post_id: data.post_id, reply: data.reply });
      } catch (e) {
        console.warn("bad sse message", e);
      }
    });

    es.addEventListener("ping", () => {/* no-op */});
    es.onerror = () => { /* 接続切断時はブラウザが自動再接続 */ };

    return () => es.close();
  }, [onReply]);
}
```

**ポイント**:
- `EventSource` APIで自動再接続対応
- `reply` イベントで返信データを受信
- コールバック関数でUI更新をトリガー

---

#### 2. リアルタイムUI更新

ファイル: `frontend/src/pages/TimelinePage.tsx`

```typescript
function LivePost({ initial }: { initial: Post }) {
  const [post, setPost] = useState<Post>(initial);

  useEffect(() => {
    const el = document.getElementById("tl-cache");
    if (!el) return;

    const handler = (e: Event) => {
      const { post_id, reply } = (e as CustomEvent).detail;
      if (post_id === post.id) {
        setPost((old) => ({ ...old, replies: [...old.replies, reply] }));
      }
    };

    el.addEventListener("tl-reply", handler as EventListener);
    return () => el.removeEventListener("tl-reply", handler as EventListener);
  }, [post.id]);

  return <PostCard post={post} />;
}
```

**ポイント**:
- CustomEventでグローバルイベントバスを実装
- 該当する投稿のみローカルステートを更新
- 不要な再レンダリングを防ぐ軽量設計

---

## 環境変数設定

### Backend（`.env`）

```bash
# OpenAI API
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # デフォルト

# 内部API認証
INTERNAL_SECRET=your-random-secret-key-here-change-in-production

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# AI返信設定
REPLY_DELAY_MIN=1          # 最小ディレイ（秒）
REPLY_DELAY_MAX=10         # 最大ディレイ（秒）
MAX_REPLIES_PER_POST=2     # 1投稿あたり最大返信数（1〜2推奨）

# API
API_BASE=http://backend:8000  # Celery Workerから呼ぶ内部APIのベースURL
```

### Frontend（`.env`）

```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## パフォーマンス指標

### 目標値

| 指標 | 目標 | 備考 |
|---|---|---|
| 投稿レスポンス時間 | < 100ms | AI生成は非同期のため影響なし |
| AI返信生成時間 | 3〜15秒 | OpenAI API + ディレイ |
| SSE配信遅延 | < 100ms | Redis Pub/Sub経由 |
| 同時SSE接続数 | 100まで | MVP想定 |

### コスト試算（OpenAI API）

- モデル: `gpt-4o-mini`
- 1投稿あたり: 約2〜3トークン × 2返信 = 約0.0001ドル
- 1000投稿/月 = 約0.10ドル（非常に低コスト）

---

## トラブルシューティング

### 問題1: AI返信が生成されない

**原因**:
- OpenAI APIキーが未設定/無効
- Celery Workerが起動していない

**解決方法**:
```bash
# APIキー確認
cat backend/.env | grep OPENAI_API_KEY

# Celery Worker起動確認
docker ps | grep worker

# Celery Workerログ確認
docker-compose logs -f worker
```

---

### 問題2: SSEでリアルタイム更新されない

**原因**:
- Redisが起動していない
- `/stream` エンドポイントに接続できていない

**解決方法**:
```bash
# Redis起動確認
docker ps | grep redis

# ブラウザ開発者ツールでSSE接続確認
# Network タブ → stream → EventStream
```

---

### 問題3: 返信が遅すぎる/速すぎる

**解決方法**:
環境変数 `REPLY_DELAY_MIN`, `REPLY_DELAY_MAX` を調整

```bash
# 即座に返信（テスト用）
REPLY_DELAY_MIN=0
REPLY_DELAY_MAX=2

# よりゆっくり（本番想定）
REPLY_DELAY_MIN=5
REPLY_DELAY_MAX=20
```

---

## 今後の拡張予定

- [ ] ペルソナのカスタマイズ機能（ユーザーが独自のペルソナを作成）
- [ ] AI返信の「いいね」機能（ペルソナ選択確率に反映）
- [ ] より高度なプロンプトエンジニアリング（会話履歴の考慮など）
- [ ] AI返信の通知ON/OFF設定
- [ ] 投稿内容に応じたペルソナの動的選択

---

## 参考ファイル

- バックエンド
  - `backend/app/workers/tasks.py` - Celeryタスク定義
  - `backend/app/services/ai_personas.py` - ペルソナ定義
  - `backend/app/services/ai_client.py` - OpenAI API呼び出し
  - `backend/app/api/sse.py` - SSEエンドポイント
  - `backend/app/services/bus.py` - Redis Pub/Sub
  - `backend/app/main.py` - 投稿API、内部API

- フロントエンド
  - `frontend/src/hooks/useSSE.ts` - SSE接続フック
  - `frontend/src/pages/TimelinePage.tsx` - リアルタイムUI更新
  - `frontend/src/constants/personas.ts` - ペルソナ定義（フロント用）

---

## ライセンス

MIT License
