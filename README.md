# GitInsight

> GitHub Developer Growth, Activity Analytics and Career Intelligence platform.

GitInsight is a full-stack platform designed to help developers track their activity patterns, extract verified skill evidence from codebases, and align their capabilities with modern career opportunities.

---

## Current Status: Phase 7 (Job Description Matching & Evidence Mapping)

This phase establishes the **Job Description Matching & Evidence Mapping** module:
- **Explicit Requirement Extraction**: Parses unstructured plain-text Job Descriptions to detect explicit technology/skill mentions using canonical registry patterns and aliases.
- **Required vs Preferred Classification**: Uses section headings (e.g. *Requirements*, *Must have*, *Basic Qualifications*) and in-line cues (e.g. *nice to have*, *a plus*, *bonus*) to categorize requirements into `required`, `preferred`, or `unspecified`.
- **Evidence-Based Matching**: Maps detected JD requirements directly against verified `SkillEvidence` stored in MongoDB.
- **Traceable Proof Trails**: Matched technologies report supporting repository links and evidence types (`dependency`, `file_manifest`, `language`, `repository_metadata`).
- **Absence Distinction**: Explicitly flags requirements without evidence as `No observable GitHub evidence` (never assuming lack of developer skill).
- **Persistent Match Records**: Persists `JobMatch` records in MongoDB for longitudinal tracking.
- **Strict Semantic Boundary**:
  > **Important:** Job matching in GitInsight reports observable GitHub evidence against job-description requirements. It does **NOT** measure expertise, candidate quality, employability, hiring probability, or produce arbitrary candidate scores.

---

## Architecture

```text
Job Description (Plain Text Input)
      ↓ (Technology Extraction & Heading Heuristics)
jobDescriptionService
      ↓ (Canonical Keys & Aliases)
technologyRegistry
      ↓ (Direct Lookup in Stored Evidence - No GitHub API calls)
MongoDB (SkillEvidence Collection)
      ↓ (Matched vs No Observable Evidence Mapping)
jobMatchingService
      ↓ (REST Endpoints)
API Routes (/api/github/users/:username/job-matches/*)
      ↓ (Axios Service)
Frontend (React + SCSS Interactive Comparison Interface)
```

---

## Project Structure

```text
GitInsight/
├── client/                      # Frontend Application (React + Vite)
│   ├── public/                  # Static assets & favicon
│   ├── src/
│   │   ├── components/          # UI components (Navbar, Footer, GitHubTester, SystemStatusBadge)
│   │   ├── layouts/             # Application layouts (MainLayout)
│   │   ├── pages/               # Routed pages (HomePage, NotFoundPage)
│   │   ├── services/            # Axios API instances (api.js, healthService.js, githubService.js, analyticsService.js, skillEvidenceService.js, repositoryHealthService.js, jobMatchingService.js)
│   │   ├── styles/              # Global SCSS variables, reset, & theme tokens
│   │   ├── App.jsx              # React Router route tree
│   │   └── main.jsx             # React entrypoint
│   ├── .env.example             # Client environment template
│   ├── index.html               # Vite HTML entrypoint
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/              # Environment config, DB & technologyRegistry
│   │   ├── controllers/         # Request handlers (health, github, analytics, skillEvidence, repositoryHealth, jobMatching)
│   │   ├── middleware/          # Centralized error handler & 404 handler
│   │   ├── models/              # Mongoose schemas (GitHubUser, GitHubRepository, GitHubSnapshot, GitHubRepositorySnapshot, SkillEvidence, JobMatch)
│   │   ├── routes/              # Express API routers (healthRoutes, githubRoutes, analyticsRoutes, skillEvidenceRoutes, repositoryHealthRoutes, jobMatchingRoutes)
│   │   ├── services/            # Services (githubService, syncService, snapshotService, analyticsService, skillEvidenceService, repositoryHealthService, jobDescriptionService, jobMatchingService)
│   │   ├── utils/               # Normalization & trend math utilities (githubNormalizer, trendCalculator)
│   │   ├── app.js               # Express application configuration
│   │   └── server.js            # Server entrypoint & lifecycle listeners
│   ├── .env.example             # Server environment template
│   └── package.json
│
├── .gitignore                   # Workspace gitignore
├── package.json                 # Workspace script helper
└── README.md                    # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI.

---

### Environment Setup

#### 1. Backend Environment
Copy `server/.env.example` to `server/.env`:
```bash
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/gitinsight
CLIENT_URL=http://localhost:5173

# Optional: Personal Access Token (classic or fine-grained) for 5,000 req/hr rate limit
GITHUB_TOKEN=
GITHUB_API_URL=https://api.github.com
```

#### 2. Frontend Environment
Copy `client/.env.example` to `client/.env`:
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

---

### Installation & Running

#### Start Backend Server
```bash
cd server
npm install
npm run dev
```
The server will start on [http://localhost:5000](http://localhost:5000).

#### Start Frontend Client
```bash
cd client
npm install
npm run dev
```
The frontend will start on [http://localhost:5173](http://localhost:5173).

#### Workspace Convenience Scripts
```bash
npm run dev:server    # Run backend server
npm run dev:client    # Run frontend client
```

---

## API Endpoints

### System & Health
- `GET /api/health`: Basic diagnostic ping, service uptime, environment, and MongoDB connection status.

### GitHub Integration & Sync
- `GET /api/github/users/:username`: Retrieves normalized public GitHub user profile + sync metadata.
- `GET /api/github/users/:username/repos`: Retrieves repositories with pagination (`?page=1&per_page=30&source=api|db`).
- `GET /api/github/users/:username/repos/:repo/languages`: Retrieves repository language byte breakdown.
- `GET /api/github/users/:username/events`: Retrieves public user activity events.
- `POST /api/github/users/:username/sync`: Synchronizes user profile, repositories, daily snapshot, and extracts observable skill evidence.
- `GET /api/github/rate-limit`: Checks remaining GitHub API rate limit quota and reset timestamp.

### Historical Snapshot Engine
- `GET /api/github/users/:username/snapshots`: Retrieves historical daily snapshots (`?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=30`).
- `GET /api/github/users/:username/snapshots/latest`: Retrieves the most recent snapshot for a user.
- `GET /api/github/users/:username/snapshots/compare`: Computes metric deltas between two snapshots (`?dateA=...&dateB=...`).
- `GET /api/github/users/:username/repositories/history`: Retrieves repository history snapshots (`?repo=name&from=...&to=...`).
- `GET /api/github/users/:username/languages/history`: Retrieves language byte time-series across snapshots.

### Developer Analytics Engine
- `GET /api/github/users/:username/analytics/overview`: Consolidated overview (profile, repo totals, language distribution, snapshot metadata).
- `GET /api/github/users/:username/analytics/repositories`: Repository growth time-series and period growth deltas.
- `GET /api/github/users/:username/analytics/repositories/activity`: Repository push activity freshness (&le;30d, &le;90d, &le;365d, &gt;1y).
- `GET /api/github/users/:username/analytics/languages`: Language distribution percentages and multi-date trend matrices.
- `GET /api/github/users/:username/analytics/activity`: Observable public activity time-series and data availability descriptors.

### Skill Evidence Engine (Phase 5)
- `GET /api/github/users/:username/skills`: List of detected technologies with evidence counts, supporting repositories, and categories.
- `GET /api/github/users/:username/skills/:technology`: Traceable evidence detail records linking technology to exact repositories, manifests, and sources.

### Repository Health & Maintenance Analytics (Phase 6)
- `GET /api/github/users/:username/repository-health`: Portfolio maintenance overview and filtered repository health list (`?status=...&language=...&archived=...&from=...&to=...`).
- `GET /api/github/users/:username/repository-health/:repository`: Single repository observable indicators (push recency, documentation signals, activity counts) and historical snapshot trends.

### Job Description Matching & Evidence Mapping (Phase 7)
- `POST /api/github/users/:username/job-matches`: Submit Job Description text and compute matched vs missing observable evidence with resolved repository links.
- `GET /api/github/users/:username/job-matches`: List saved job matches for user with summary counts.
- `GET /api/github/users/:username/job-matches/:id`: Retrieve single saved job match by ID with resolved evidence records.

---

## Supported Initial Technologies

| Category | Technologies |
| :--- | :--- |
| **Languages** | JavaScript, TypeScript, Python, Java, C++, C, Go, Rust, PHP, Ruby, HTML, CSS, SCSS |
| **Frameworks & Runtimes** | React, Next.js, Vue.js, Angular, Node.js, Express.js, Django, Flask, FastAPI, Spring Boot |
| **Databases & Tools** | MongoDB, PostgreSQL, MySQL, Redis, Docker |

---

## Sample Job Description Match Response (`POST /api/github/users/octocat/job-matches`)

```json
{
  "success": true,
  "data": {
    "matchId": "6abb430304cc9b9911c11c50",
    "username": "octocat",
    "title": "Full Stack Developer",
    "createdAt": "2026-09-29T04:45:00.000Z",
    "summary": {
      "totalRequirements": 6,
      "requiredCount": 4,
      "preferredCount": 2,
      "unspecifiedCount": 0,
      "matchedCount": 4,
      "noEvidenceCount": 2,
      "recognizedCount": 5,
      "unrecognizedCount": 1,
      "matchedRequiredCount": 3,
      "matchedPreferredCount": 1,
      "coveragePercentage": 67
    },
    "requirements": [
      {
        "technologyKey": "javascript",
        "technology": "JavaScript",
        "category": "required",
        "recognitionStatus": "recognized",
        "matchStatus": "matched",
        "evidenceCount": 4,
        "repositoryCount": 3,
        "repositories": [
          {
            "repository": "Spoon-Knife",
            "repositoryFullName": "octocat/Spoon-Knife",
            "repositoryUrl": "https://github.com/octocat/Spoon-Knife",
            "evidenceTypes": ["language"],
            "sources": ["GitHub repository language distribution"]
          }
        ],
        "matchedText": "JavaScript"
      },
      {
        "technologyKey": "react",
        "technology": "React",
        "category": "required",
        "recognitionStatus": "recognized",
        "matchStatus": "no_observable_evidence",
        "evidenceCount": 0,
        "repositoryCount": 0,
        "repositories": [],
        "matchedText": "React.js"
      }
    ]
  }
}
```

---

## Important Boundaries & Disclaimers

- **Observable Evidence Mapping Only**: Job matching in GitInsight reports observable repository evidence that supports explicit Job Description requirements.
- **No Employability Predictions**: GitInsight strictly avoids making claims such as "You are suitable", "You will get selected", "Strong candidate", or "You are job-ready".
- **Absence Distinction**: "No observable GitHub evidence" means the user's stored GitHub repositories currently have no recorded proof for that skill—it does **NOT** mean the developer lacks the skill.
- **No Direct API Calls**: Matching operates strictly on stored MongoDB `SkillEvidence` records without uncoordinated external API requests.

---

## Planned Pillars (Upcoming Phases)

1. **Activity & History**: Longitudinal trend visualizers and developer activity intelligence.
2. **Skill Evidence & Repository Health**: Explainable indicator models, documentation coverage metrics, and architecture maintainability.
3. **Career Intelligence & Growth Pathways**: Actionable skill gap learning recommendations and growth roadmaps.
#   G i t I n s i g h t  
 