# virtual-sns

AIが反応する仮想SNS（MVP構成）

## 開発環境
- Frontend: React (Vite + TypeScript)
- Backend: FastAPI + Celery + Redis
- DB: PostgreSQL
- AI: OpenAI API (GPT-4o-mini 推奨)

## 起動手順
```bash
# frontend
cd frontend
npm install
npm run dev

# backend
cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
