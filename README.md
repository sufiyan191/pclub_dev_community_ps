# SpatialDev — 3D Spatial Developer Community Platform (PS 06: Advanced)

A VisionOS-inspired **3D Spatial Glassmorphism Developer Community Platform** built for the **Programming Club (Software Division), IIT Indore** Volunteer Induction (Problem Statement 6 — Advanced Level).

SpatialDev merges the real-time community hierarchy of **Discord** (_Servers ➔ Groups ➔ Live Group Chat_) with the structured technical knowledge-sharing of **Stack Overflow & Dev.to** (_Markdown & Code Posts, Tag Filtering, Atomic Upvoting/Downvoting, Accepted Answers, and Developer Reputation_) inside an interactive 3D spatial workspace.

---

## 🔗 Live Deployment & Demo Links

- **Live Frontend (Vercel):** `https://pclub-dev-community-ps.vercel.app`
- **Live Backend API & WebSockets (Render):** `https://pclub-swd-ps.onrender.com/health`
- **GitHub Repository:** `https://github.com/sufiyan191/pclub_dev_community_ps`

---

## ✨ Features Implemented

### A. Core Requirements (Strictly Adhering to PS 06)

1. **Authentication & Security:**
   - User registration, login, and logout (`POST /api/auth/register`, `/login`, `/logout`).
   - Password salting and hashing using `bcryptjs` (10 salt rounds).
   - Stateless session management using cryptographically signed `JWT` tokens stored in `HttpOnly` cookies (for XSS protection) with `Authorization: Bearer <token>` support.
2. **Developer Profile Pages:**
   - Dedicated profile view displaying developer `bio`, `skills` (stored natively as a PostgreSQL `TEXT[]` array), live `reputation` score, recent questions posted, and recent answers contributed.
   - Profile editor allowing authenticated users to update their bio and skills array.
3. **Posts & Questions CRUD with Markdown & Code Formatting:**
   - Create, read, edit, and delete technical posts/questions inside any community group.
   - Custom Markdown and triple-backtick (` ```lang `) syntax code block parser with one-click clipboard copy.
4. **Community Interaction, Atomic Voting & Accepted Answers:**
   - Post Markdown-formatted answers/comments on any question.
   - **Atomic Upvote (`+1`) & Downvote (`-1`) Engine:** Uses PostgreSQL `BEGIN ... COMMIT` transactions and a composite unique constraint `UNIQUE(user_id, target_type, target_id)` so double-voting is impossible at the database level. Automatically handles vote toggling (`0`) and vote direction switching (`±2` net score swing).
   - **Accepted Answer Verification:** Question authors can mark one answer as the official **Accepted Answer**, pinning it to the top of the thread and awarding `+15` reputation to the answer author.
5. **Discovery Feed, Tag Filtering, Search & Sorting:**
   - Sort feed dynamically by **Newest** (`created_at DESC`) or **Top Voted** (`score DESC`).
   - Filter questions by `#tags` accelerated via a PostgreSQL Generalized Inverted Index (`GIN`).
   - **Global Floating Omni-Search Bar:** Searches simultaneously across Developers (`users`), Communities (`servers`), Channels (`groups`), and Questions (`posts`) using case-insensitive `ILIKE` pattern matching.
6. **Input Validation & Ownership Access Control:**
   - Request bodies validated using `Zod` schemas.
   - Strict authorization checks ensure users can **only edit or delete their own posts**, and only the original post author can accept an answer (`403 Forbidden` returned otherwise).

### B. Stretch Goals & Custom Spatial UI Innovations

- **VisionOS 3D Spatial Choreography:**
  - **Left Floating Dock & Collapsible Server Monogram Bar:** Clicking the _My Joined Servers_ button rotates the indicator arrow (`▸` to `▾`) and slides out an adjacent vertical glass dock displaying circular server monograms (`PC`, `FS`, `CP`).
  - **3D Perspective Right Wing Panel (`rotateY(-14deg)`):** Clicking any group opens its live member chat and Q&A thread on the angled right spatial wing.
  - **Dynamic Center Stage Focus Swap:** Clicking the Right Wing panel smoothly glides it to Center Stage (`rotateY(0deg)`), while collapsing the previous Center Groups panel into a third vertical Group Monogram sidebar on the left.
  - **Customizable Spatial Environment:** Switch between preset architectural backgrounds or paste any custom wallpaper URL in Settings.
- **Real-Time Group Chat & Live Notifications (`Socket.io` + MongoDB):**
  - Instant room-based WebSocket messaging (`join_group`, `send_group_message`) with live code-snippet attachments persisted in MongoDB.
  - Real-time notification badges triggered when another developer answers your post or marks your answer as Accepted.
- **Automated Reputation Engine:**
  - `+15 Rep` for an Accepted Answer, `+5 Rep` per upvote received, and `-2 Rep` per downvote.
- **CI Pipeline (GitHub Actions):**
  - Automated workflow (`.github/workflows/ci.yml`) that checks backend syntax and runs a full production Next.js build (`npm run build`) on every push and pull request.

---

## 🏗️ Tech Stack & Polyglot Persistence Justification

A key architectural decision in **SpatialDev** is combining **PostgreSQL** and **MongoDB** (**Polyglot Persistence**), choosing each database engine for the exact data workload it handles best:

| Layer             | Technology                                              | Architectural Role & Justification                                                                                                                                                                                                              |
| :---------------- | :------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**      | Next.js (App Router), React, Tailwind CSS, Lucide Icons | Provides fast rendering, reactive state machine transitions for the 3-panel spatial layout, and hardware-accelerated CSS 3D transforms.                                                                                                         |
| **Backend**       | Node.js (ES Modules), Express.js, Socket.io             | Decoupled REST API server paired with a persistent stateful WebSocket server for real-time room broadcasting.                                                                                                                                   |
| **Relational DB** | **PostgreSQL** (Neon Cloud, raw SQL via `pg.Pool`)      | Stores structured, transactional entities (`users`, `servers`, `server_members`, `groups`, `posts`, `comments`, `votes`). Guarantees ACID compliance during voting/reputation updates and leverages native `TEXT[]` arrays with `GIN` indexing. |
| **Document DB**   | **MongoDB Atlas** (`Mongoose`)                          | Stores high-write, unstructured event streams (`GroupMessage` live chat logs and `Notification` payloads), offloading ephemeral traffic from core relational tables.                                                                            |
| **Security & CI** | `bcryptjs`, `jsonwebtoken`, `Zod`, GitHub Actions       | Enforces salted password hashing, stateless JWT verification, strict schema validation, and continuous integration build checks.                                                                                                                |

---

## 🗄️ Database Schema Diagram & Details

### 1. PostgreSQL Relational Schema (`server/src/config/schema.sql`)

```text
+-----------------------+       +-----------------------+       +-----------------------+
|         users         |       |        servers        |       |    server_members     |
+-----------------------+       +-----------------------+       +-----------------------+
| id (PK, SERIAL)       |<---+  | id (PK, SERIAL)       |<------| server_id (PK, FK)    |
| username (UNIQUE)     |    +--| owner_id (FK)         |       | user_id (PK, FK)      |
| email (UNIQUE)        |       | name (UNIQUE)         |       | role (OWNER/MEMBER)   |
| password_hash         |       | monogram (VARCHAR 4)  |       | joined_at             |
| bio                   |       | description           |       +-----------------------+
| skills (TEXT[])       |       | created_at            |
| reputation (INT)      |       +-----------------------+
| role (USER/ADMIN)     |                   |
| created_at            |                   | 1:N (ON DELETE CASCADE)
+-----------------------+                   v
            |                   +-----------------------+
            |                   |        groups         |
            |                   +-----------------------+
            |                   | id (PK, SERIAL)       |
            |                   | server_id (FK)        |
            |                   | name                  |
            |                   | description           |
            |                   | UNIQUE(server_id,name)|
            |                   +-----------------------+
            |                               |
            | 1:N                           | 1:N (ON DELETE CASCADE)
            |                               v
            |                   +-----------------------+       +-----------------------+
            +------------------>|         posts         |<------|       comments        |
                                +-----------------------+  1:N  +-----------------------+
                                | id (PK, SERIAL)       |       | id (PK, SERIAL)       |
                                | group_id (FK)         |       | post_id (FK)          |
                                | author_id (FK)        |       | author_id (FK)        |
                                | title                 |       | body_markdown         |
                                | body_markdown         |       | score (INT DEFAULT 0) |
                                | tags (TEXT[] GIN IDX) |       | created_at            |
                                | score (INT DEFAULT 0) |       +-----------------------+
                                | accepted_comment_id   |
                                | created_at, updated_at|       +-----------------------+
                                +-----------------------+       |         votes         |
                                                                +-----------------------+
                                                                | id (PK, SERIAL)       |
                                                                | user_id (FK)          |
                                                                | target_type (POST/CMT)|
                                                                | target_id (INT)       |
                                                                | vote_value (1 or -1)  |
                                                                | UNIQUE(user,type,id)  |
                                                                +-----------------------+
```

### 2. Custom PostgreSQL Indexes Created

- `idx_posts_group_newest` ON `posts(group_id, created_at DESC)` — Optimizes sorting group feeds by `newest`.
- `idx_posts_group_top` ON `posts(group_id, score DESC)` — Optimizes sorting group feeds by `top`.
- `idx_posts_tags_gin` ON `posts USING GIN (tags)` — Inverted index enabling fast `ANY(tags)` array lookups.
- `idx_comments_post` ON `comments(post_id, score DESC, created_at ASC)` — Speeds up rendering answers ordered by score.

### 3. MongoDB Document Schemas (`server/src/models/`)

- **`GroupMessage` (`groupmessages` collection):**
  `{ groupId: Number, senderId: Number, senderUsername: String, content: String, codeSnippet: String, createdAt: Date }`
- **`Notification` (`notifications` collection):**
  `{ recipientUserId: Number, actorUsername: String, type: 'COMMENT_ADDED' | 'ANSWER_ACCEPTED' | 'UPVOTE_RECEIVED', message: String, postId: Number, groupId: Number, isRead: Boolean, createdAt: Date }`

---

## 📡 API Endpoints Documentation

### 1. Authentication & Developer Profiles (`/api/auth`)

| Method | Endpoint                      | Access        | Description                                                                    |
| :----- | :---------------------------- | :------------ | :----------------------------------------------------------------------------- |
| `POST` | `/api/auth/register`          | Public        | Register a new developer, hash password with `bcrypt`, return JWT + cookie     |
| `POST` | `/api/auth/login`             | Public        | Verify credentials and issue signed JWT (`HttpOnly` cookie + JSON token)       |
| `POST` | `/api/auth/logout`            | Public        | Clear session cookie                                                           |
| `GET`  | `/api/auth/me`                | Auth Required | Get currently authenticated user's profile details                             |
| `GET`  | `/api/auth/profile/:username` | Public        | Get developer's public profile, `skills[]`, reputation, recent posts & answers |
| `PUT`  | `/api/auth/profile`           | Auth Required | Update own `bio`, `skills` array, or `avatar_url`                              |

### 2. Servers, Groups, Live Chat & Global Search (`/api/servers`)

| Method | Endpoint                            | Access                 | Description                                                            |
| :----- | :---------------------------------- | :--------------------- | :--------------------------------------------------------------------- |
| `GET`  | `/api/servers`                      | Public / Optional Auth | Fetch all discoverable servers + logged-in user's joined servers       |
| `POST` | `/api/servers`                      | Auth Required          | Create a new server, add creator as `OWNER`, and seed `#general` group |
| `POST` | `/api/servers/:serverId/join`       | Auth Required          | Join a server (`INSERT ... ON CONFLICT DO NOTHING`)                    |
| `GET`  | `/api/servers/:serverId/groups`     | Public                 | List all groups inside a server with post counts                       |
| `POST` | `/api/servers/:serverId/groups`     | Auth Required          | Create a new discussion/Q&A group inside a server                      |
| `GET`  | `/api/servers/groups/:groupId/chat` | Public                 | Fetch last 100 live chat messages for a group from MongoDB             |
| `GET`  | `/api/servers/search?q=<query>`     | Public                 | Global Omni-Search across Developers, Servers, Groups, and Posts       |
| `GET`  | `/api/servers/notifications`        | Auth Required          | Fetch user's recent notifications from MongoDB                         |

### 3. Posts, Answers, Atomic Voting & Accepted Answers (`/api/posts`)

| Method   | Endpoint                                 | Access          | Description                                                                         |
| :------- | :--------------------------------------- | :-------------- | :---------------------------------------------------------------------------------- |
| `GET`    | `/api/posts?groupId=&tag=&search=&sort=` | Public          | Fetch posts filtered by group, tag, or keyword and sorted by `newest` or `top`      |
| `GET`    | `/api/posts/:postId`                     | Public          | Fetch single question and all answers (Accepted Answer pinned first)                |
| `POST`   | `/api/posts`                             | Auth Required   | Create a new question with Markdown body, code blocks, and tags                     |
| `PUT`    | `/api/posts/:postId`                     | **Author Only** | Edit own post's title, Markdown content, or tags                                    |
| `DELETE` | `/api/posts/:postId`                     | **Author Only** | Permanently delete own post                                                         |
| `POST`   | `/api/posts/:postId/comments`            | Auth Required   | Add a Markdown answer to a post and dispatch a MongoDB notification                 |
| `PATCH`  | `/api/posts/:postId/accept/:commentId`   | **Author Only** | Mark an answer as Accepted and award `+15` reputation to the responder              |
| `POST`   | `/api/posts/vote`                        | Auth Required   | Atomic PostgreSQL transaction (`BEGIN...COMMIT`) to upvote/downvote post or comment |

---

## 💻 Local Setup & Run Instructions

### Prerequisites

- **Node.js** `v18+` or `v20+`
- A free **PostgreSQL** connection string from [Neon.tech](https://neon.tech)
- A free **MongoDB** connection string from [MongoDB Atlas](https://www.mongodb.com/atlas)

### Step 1: Clone the Repository

```bash
git clone https://github.com/sufiyan191/pclub_dev_community_ps.git
cd pclub_dev_community_ps
```

### Step 2: Initialize the PostgreSQL Schema

Open your **Neon.tech SQL Editor**, copy the contents of `server/src/config/schema.sql`, and click **Run** to create the 7 relational tables and performance indexes.

### Step 3: Configure & Start the Backend Server (`server/`)

```bash
cd server
npm install
```

Create a `.env` file inside the `server/` directory (never commit `.env` secrets):

```env
PORT=5000
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://<username>:<password>@<your-neon-host>/neondb?sslmode=require
MONGO_URI=mongodb+srv://<username>:<password>@<your-atlas-cluster>.mongodb.net/spatial_dev?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_signing_key_here
NODE_ENV=development
```

Start the backend server (automatically seeds initial communities `PC`, `FS`, and `CP` on first run):

```bash
npm run dev
```

### Step 4: Configure & Start the Spatial Frontend (`client/`)

Open a second terminal window:

```bash
cd client
npm install
```

Create a `.env.local` file inside the `client/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the Next.js development server:

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser to explore the Spatial Developer Platform!
