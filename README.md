# CivicLens AI — AI-Powered Hyperlocal Problem Solver

CivicLens AI is a production-ready, full-stack civic platform designed for hackathons. It bridges the gap between citizens and local government by offering intelligent, automated reporting, verification, and resolution of civic problems.

## Tech Stack
* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, TailwindCSS, shadcn/ui, Google Maps.
* **Backend**: FastAPI (Python 3.11), SQLAlchemy, PostgreSQL, Redis.
* **AI Pipelines**: OpenCV (Image Preprocessing), HuggingFace Vision Transformers (Category classification), Gemini 1.5 Flash (Advanced reasoning, recommendations, fake report detection, emergency escalation, and before/after verification).
* **Storage & Deployment**: Google Cloud Storage (Media files), Firebase Auth (Security), Cloud Build & Cloud Run (Infrastructure).

---

## 🌟 Advanced AI Features Included

1. **Hybrid AI Pipeline (OpenCV + HF + Gemini)**: Pre-processes images using OpenCV, uses fine-tuned ViT models to classify, and uses Gemini to analyze details.
2. **AI Recommendation Engine**: Generates immediate action advice, short/long-term remedies, and safety warnings for every reported issue.
3. **Fake Report Screening**: Inspects image metadata (EXIF) and uses Gemini Vision to identify AI-generated images, memes, and screenshots.
4. **Before/After Resolution Slider**: Drag-to-compare interface comparing original problem vs resolution proof.
5. **Before/After AI Verification**: Automatically compares before and after photos. If unresolved, it flags it instead of closing.
6. **Smart Department Routing**: Automates category-to-department assignments and adds notifications.
7. **Resolution Time Predictor**: Predicts resolution timelines dynamically.
8. **Emergency Escalation**: Instantly detects structures collapes, flooding, or fires, prioritizing them to 100/100 score.
9. **Citizen Trust Score**: Computes trust index (0-100%) for citizens based on verified reports.
10. **Voice Assistant**: Integrated speech-to-text to automatically dictate descriptions.
11. **Ward Heatmaps**: Aggregated ward-level maps for governmental decision-makers.
12. **Predictive Maintenance**: Predicts asset degradation risks based on cluster patterns.

---

## ⚙️ Local Development Setup

### Prerequisites
* Docker & Docker Compose
* Node.js v20+ & npm

### Setup Steps
1. **Clone & Configuration**:
   Copy `.env.example` in `backend/` and configure values:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Run Dev Services via Docker Compose**:
   ```bash
   docker-compose up --build
   ```
   * Frontend: `http://localhost:3000`
   * Backend API: `http://localhost:8000`
   * API Documentation: `http://localhost:8000/api/docs`

---

## 🚀 Google Cloud Platform Deployment

Deploy both frontend and backend to Google Cloud Run in minutes:

```bash
# 1. Authorize gcloud
gcloud auth login

# 2. Set active project
gcloud config set project YOUR_PROJECT_ID

# 3. Grant execute permission and run deployment script
chmod +x deployment/deploy.sh
./deployment/deploy.sh YOUR_PROJECT_ID
```
The script will output the public URL of the deployed application.
