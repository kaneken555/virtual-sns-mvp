# セキュリティポリシー

## 概要

Virtual SNS MVPのセキュリティ対策とベストプラクティスをまとめたドキュメントです。本プロジェクトは現在MVP（最小実装）フェーズであり、一部のセキュリティ機能は今後実装予定です。

---

## セキュリティ対策一覧

### 実装済み対策

| 対策項目 | 実装状況 | 実装方法 | 実装場所 |
|---------|---------|---------|---------|
| **内部API認証** | ✅ | X-Internal-Secret ヘッダー | `backend/app/main.py` |
| **CORS対策** | ✅ | FastAPI CORSMiddleware | `backend/app/main.py` |
| **SQLインジェクション対策** | ✅ | SQLAlchemy ORM (パラメータ化クエリ) | `backend/app/repository/*.py` |
| **XSS対策** | ✅ | React自動エスケープ | Frontend全体 |
| **CSRF対策** | ✅ | CORSによるオリジン制限 | `backend/app/main.py` |
| **入力バリデーション** | ✅ | Pydantic スキーマ | `backend/app/schemas/*.py` |
| **機密情報管理** | ✅ | 環境変数 (.env, .gitignore) | `.env`, `backend/app/core/config.py` |
| **コンテナ隔離** | ✅ | Dockerネットワーク分離 | `docker-compose.yml` |

### 未実装（今後の対応予定）

| 対策項目 | 実装予定 | 備考 |
|---------|---------|------|
| **ユーザー認証** | Phase 1 | JWT認証、サインアップ/ログイン機能 |
| **レート制限** | Phase 6 | 投稿数制限、API呼び出し制限 |
| **HTTPS/TLS** | 本番環境 | SSL/TLS証明書 (Let's Encrypt) |
| **データベース暗号化** | 本番環境 | TLS接続、暗号化ボリューム |
| **Secrets Manager** | 本番環境 | AWS Secrets Manager / GCP Secret Manager |
| **ネットワーク制限** | 本番環境 | ファイアウォール、Security Groups |

---

## セキュリティアーキテクチャ

### 1. 認証・認可

#### 現在の認証方式

```
┌─────────────────────────────────────────────────────────┐
│                    API エンドポイント                    │
├─────────────────────────────────────────────────────────┤
│  Public API (認証不要)                                   │
│  - GET /posts                                           │
│  - POST /posts                                          │
│  - GET /stream                                          │
│  - GET /health                                          │
├─────────────────────────────────────────────────────────┤
│  Internal API (シークレットキー認証)                      │
│  - POST /internal/replies                               │
│    Header: X-Internal-Secret: {INTERNAL_SECRET}        │
│    ✅ シークレット一致 → 200 OK                          │
│    ❌ シークレット不一致 → 403 Forbidden                 │
└─────────────────────────────────────────────────────────┘
```

**実装詳細**:
- 内部API（Celery Workerから呼び出し専用）は `X-Internal-Secret` ヘッダーでシークレットキー検証
- シークレットキーは環境変数 `INTERNAL_SECRET` で管理
- Public APIは現在認証なし（MVPのため）

**今後の拡張**:
- Phase 1でユーザー認証（JWT）を追加予定
- `/posts` にユーザー所有権チェック追加予定
- リフレッシュトークン機能の実装

---

### 2. 通信セキュリティ

| レイヤ | 対策 | 実装状況 | 詳細 |
|-------|------|---------|------|
| **HTTPS/TLS** | SSL/TLS証明書 (Let's Encrypt) | ❌ 本番環境で実装予定 | 開発環境はHTTP |
| **CORS** | FastAPI CORSMiddleware | ✅ 特定オリジンのみ許可 | `CORS_ORIGINS` 環境変数で設定 |
| **SSE** | Same-Origin Policy | ✅ | ブラウザ標準のセキュリティ |

**CORS設定例** (`backend/app/main.py`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 3. アプリケーションセキュリティ

#### 3.1 一般的な脅威への対策

| 脅威 | 対策 | 実装場所 | 詳細 |
|-----|------|---------|------|
| **SQLインジェクション** | SQLAlchemy ORM (パラメータ化クエリ) | `backend/app/repository/*.py` | ORMを使用し、生SQLは使用しない |
| **XSS** | React自動エスケープ | Frontend全体 | dangerouslySetInnerHTMLは使用しない |
| **CSRF** | CORSによるオリジン制限 | `backend/app/main.py` | 特定オリジンのみ許可 |
| **入力バリデーション** | Pydantic スキーマ | `backend/app/schemas/*.py` | すべてのAPIリクエストで検証 |
| **機密情報漏洩** | 環境変数管理 (.env, .gitignore) | `.env`, `backend/app/core/config.py` | APIキー等は環境変数で管理 |

#### 3.2 入力バリデーション

**投稿バリデーション例** (`backend/app/schemas/post.py`):
```python
class PostCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=280)
```

**実装ガイドライン**:
- すべてのユーザー入力をPydanticスキーマで検証
- 文字数制限、型チェック、必須項目チェックを実施
- エラーメッセージは422 Unprocessable Entityで返却

---

### 4. インフラセキュリティ

| 項目 | 対策 | 実装状況 | 詳細 |
|-----|------|---------|------|
| **コンテナ隔離** | Dockerネットワーク分離 | ✅ | すべてのコンテナが独立したネットワーク内 |
| **データベース暗号化** | TLS接続、暗号化ボリューム | ❌ 本番環境で実装予定 | 開発環境は平文 |
| **シークレット管理** | 環境変数、Secrets Manager | 部分的 (環境変数のみ) | 本番ではSecrets Manager使用予定 |
| **ネットワーク制限** | ファイアウォール、Security Groups | ❌ 本番環境で実装予定 | 開発環境は制限なし |

---

## 環境変数とシークレット管理

### 必須環境変数

| 環境変数 | 説明 | セキュリティレベル | 例 |
|---------|------|------------------|---|
| `DATABASE_URL` | PostgreSQL接続URL | 🔴 高 | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis接続URL | 🟡 中 | `redis://localhost:6379/0` |
| `OPENAI_API_KEY` | OpenAI APIキー | 🔴 高 | `sk-xxxxxxxxxxxxxxxx` |
| `INTERNAL_SECRET` | 内部API認証用シークレット | 🔴 高 | ランダム生成文字列 |
| `CORS_ORIGINS` | CORS許可オリジン | 🟡 中 | `http://localhost:5173` |

### ベストプラクティス

1. **絶対に `.env` ファイルをGitにコミットしない**
   - `.gitignore` に `.env` を追加済み

2. **本番環境では強力なシークレットを使用**
   - `INTERNAL_SECRET` は最低32文字以上のランダム文字列
   - パスワード生成ツールを使用推奨

3. **環境ごとに異なるシークレットを使用**
   - 開発環境と本番環境で同じシークレットを使い回さない

4. **定期的なシークレットローテーション**
   - 本番環境では3ヶ月ごとにシークレットを更新

---

## セキュアコーディングガイドライン

### Backend (Python)

1. **SQL操作はORMのみ使用**
   ```python
   # ✅ Good
   db.query(Post).filter(Post.id == post_id).first()

   # ❌ Bad
   db.execute(f"SELECT * FROM posts WHERE id = {post_id}")
   ```

2. **環境変数から機密情報を読み込む**
   ```python
   # ✅ Good
   OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

   # ❌ Bad
   OPENAI_API_KEY = "sk-xxxxxxxxxxxxxxxx"
   ```

3. **Pydanticでバリデーション必須**
   ```python
   # ✅ Good
   @app.post("/posts", response_model=PostOut)
   def create_post(req: PostCreate, db: Session = Depends(get_db)):
       ...

   # ❌ Bad
   @app.post("/posts")
   def create_post(text: str, db: Session = Depends(get_db)):
       ...
   ```

### Frontend (TypeScript)

1. **dangerouslySetInnerHTMLは使用禁止**
   ```tsx
   // ✅ Good
   <p>{post.text}</p>

   // ❌ Bad
   <p dangerouslySetInnerHTML={{ __html: post.text }} />
   ```

2. **型定義を必ず使用**
   ```typescript
   // ✅ Good
   const posts: Post[] = await fetchPosts();

   // ❌ Bad
   const posts: any = await fetchPosts();
   ```

3. **APIキーをフロントエンドに埋め込まない**
   ```typescript
   // ✅ Good
   // バックエンド経由でOpenAI APIを呼び出す

   // ❌ Bad
   const OPENAI_API_KEY = "sk-xxxxxxxxxxxxxxxx";
   ```

---

## 脆弱性報告

### セキュリティ脆弱性を発見した場合

セキュリティ脆弱性を発見した場合は、以下の手順で報告してください：

1. **公開Issueに投稿しない**
   - セキュリティ脆弱性は公開Issueではなく、非公開で報告してください

2. **報告先**
   - メール: [プロジェクトオーナーのメールアドレス]
   - GitHub Security Advisory (推奨)

3. **報告内容**
   - 脆弱性の詳細
   - 再現手順
   - 影響範囲
   - 可能であれば修正案

4. **対応期間**
   - 報告から48時間以内に初回返信
   - 重大度に応じて1週間〜1ヶ月以内に修正

---

## セキュリティチェックリスト

### 開発時

- [ ] 新しいAPIエンドポイントにはPydanticバリデーションを追加
- [ ] ユーザー入力は必ずエスケープまたはサニタイズ
- [ ] 機密情報は環境変数で管理
- [ ] SQLクエリはORMを使用（生SQLは禁止）
- [ ] エラーメッセージに機密情報を含めない

### デプロイ前

- [ ] `.env` ファイルがGitに含まれていないことを確認
- [ ] 本番環境用の強力なシークレットを生成
- [ ] CORS設定が本番環境のオリジンのみ許可
- [ ] HTTPS/TLS証明書の設定（本番環境）
- [ ] セキュリティヘッダーの設定（X-Frame-Options, CSP等）

### 運用時

- [ ] 定期的な依存パッケージの更新
- [ ] セキュリティパッチの適用
- [ ] アクセスログの監視
- [ ] 異常なトラフィックの検出

---

## 依存パッケージのセキュリティ

### 脆弱性スキャン

**Backend (Python)**:
```bash
# pipでセキュリティ脆弱性をチェック
pip install pip-audit
pip-audit

# または
pip install safety
safety check
```

**Frontend (Node.js)**:
```bash
# npmでセキュリティ脆弱性をチェック
npm audit

# 自動修正
npm audit fix
```

### 定期的な更新

- 月1回、依存パッケージの脆弱性スキャンを実施
- セキュリティパッチが公開されたら速やかに適用
- メジャーバージョンアップ時は慎重にテスト

---

## 今後のセキュリティ強化予定

### Phase 1: 認証機能 (3ヶ月以内)
- [ ] JWT認証の実装
- [ ] ユーザー登録/ログイン機能
- [ ] パスワードハッシュ化 (bcrypt)
- [ ] リフレッシュトークン

### Phase 2: アクセス制御 (6ヶ月以内)
- [ ] ロールベースアクセス制御 (RBAC)
- [ ] 投稿の所有権チェック
- [ ] 管理者権限

### Phase 3: レート制限 (6ヶ月以内)
- [ ] IPベースのレート制限
- [ ] ユーザーベースのレート制限
- [ ] DDoS対策

### Phase 4: 本番環境対応 (9ヶ月以内)
- [ ] HTTPS/TLS証明書
- [ ] Secrets Manager連携
- [ ] セキュリティヘッダー
- [ ] WAF (Web Application Firewall)
- [ ] 侵入検知システム (IDS)

---

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)
- [React Security Best Practices](https://react.dev/learn/security)
- [SQLAlchemy Security](https://docs.sqlalchemy.org/en/20/faq/security.html)

---

**最終更新日**: 2025-12-20
