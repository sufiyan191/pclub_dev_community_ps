# SpatialDev — 3D Spatial Developer Community Platform (PS 06: Advanced)

A VisionOS-inspired **3D Spatial Glassmorphism Developer Community Platform** built for the **Programming Club (Software Division), IIT Indore** Induction. SpatialDev blends the community hierarchy of **Discord** (Servers ➔ Groups ➔ Real-time Group Chat) with the structured technical knowledge-sharing of **Stack Overflow & Dev.to** (Markdown/Code Posts, Tag Filtering, Atomic Upvoting/Downvoting, Accepted Answers, and Developer Reputation).

🔗 **Live Frontend (Vercel):** `[Add your Vercel URL here after deployment]`  
🔗 **Live Backend API (Render):** `[Add your Render URL here after deployment]`

---

## ✨ Key Features

### 1. Core Requirements Implemented (PS 06)
- **Authentication & Security:** Secure registration, login, and logout using `bcryptjs` salted password hashing (10 rounds) and signed `JWT` tokens stored in `HttpOnly` cookies + Bearer fallback.
- **Strict Access Control & Validation:** Request payloads validated with `Zod`. Ownership guards ensure users can edit or delete **only their own posts**, and only the question author can mark an **Accepted Answer**.
- **Developer Profiles & Activity:** View and edit user profiles featuring bio, PostgreSQL `TEXT[]` skills array, live reputation score, recent questions posted, and recent answers contributed.
- **Markdown & Syntax Code Blocks:** Full CRUD for technical posts/questions and answers with Markdown formatting, syntax-highlighted code blocks, and one-click code copying.
- **Atomic Voting & Accepted Answers:** Upvote (`+1`) and Downvote (`-1`) on both posts and comments powered by **PostgreSQL ACID Transactions (`BEGIN ... COMMIT`)** with automatic toggle/reversal math (`scoreDelta = ±2` when switching votes).
- **Discovery Feed & Global Omni-Search:** Sort posts by `Newest` or `Top Voted`, filter by `#tags` (accelerated via PostgreSQL `GIN` array indexing), or use the top floating Omni-Search bar to search across Developers, Servers, Groups, and Posts simultaneously.

### 2. Spatial UI & Stretch Goals Implemented
- **VisionOS 3D Spatial Choreography:**
  - **Left Floating Dock & Collapsible Server Monogram Bar:** Clicking *My Joined Servers* rotates the indicator (`▸` ➔ `▾`) and slides out the vertical server monogram dock.
  - **3D Tilted Right Wing Panel (`rotateY(-14deg)`):** Selecting any Group opens its live people chat and Q&A thread on the angled right spatial wing.
  - **Dynamic Center Stage Focus Swap:** Clicking the Right Wing panel smoothly glides it to Center Stage while collapsing the previous Center Groups panel into an adjacent vertical Group Monogram sidebar.
- **Real-Time Group Chat & Notifications (WebSockets + MongoDB):** Live group chat rooms with instant code-snippet sharing via `Socket.io` and real-time answer/acceptance notifications persisted in MongoDB.
- **Reputation Engine:** Developers earn `+15 Rep` when their answer is marked Accepted, `+5 Rep` on upvotes, and `-2 Rep` on downvotes.
- **CI Pipeline:** Automated GitHub Actions workflow (`.github/workflows/ci.yml`) verifying backend syntax and Next.js production builds on every push.

---

## 🛠️ Tech Stack & Polyglot Persistence Architecture

| Layer | Technology | Why We Chose It |
| :--- | :--- | :--- |
| **Frontend** | Next.js (App Router), React, Tailwind CSS, Lucide Icons | Fast client/server rendering and custom 3D CSS perspective glassmorphism transforms. |
| **Backend** | Node.js (ES Modules), Express.js, Socket.io | Decoupled REST API + stateful WebSocket server for real-time group rooms. |
| **Relational DB** | **PostgreSQL** (`pg` pool, Raw SQL) | Enforces ACID transactions, foreign-key integrity, composite unique constraints on votes, and native `TEXT[]` arrays with `GIN` indexing. |
| **Document DB** | **MongoDB Atlas** (`Mongoose`) | Handles high-velocity, flexible-schema real-time group chat messages and user notifications without locking core relational tables. |
| **Validation & Auth** | `Zod`, `jsonwebtoken`, `bcryptjs` | Schema validation at API boundaries and cryptographic session security. |

---

## 🗄️ Database Schema Diagram & Description

### 1. PostgreSQL Relational Schema (`server/src/config/schema.sql`)

```text
+-------------------+       +-------------------+       +-------------------+
|       users       |       |      servers      |       |  server_members   |
+-------------------+       +-------------------+       +-------------------+
| id (PK, SERIAL)   |<---+  | id (PK, SERIAL)   |<------| server_id (PK,FK) |
| username (UNIQUE) |    +--| owner_id (FK)     |       | user_id (PK,FK)   |
| email (UNIQUE)    |       | name (UNIQUE)     |       | role              |
| password_hash     |       | monogram (4 CHAR) |       +-------------------+
| bio               |       | description       |
| skills (TEXT[])   |       +-------------------+
| reputation (INT)  |                 |
| role              |                 | 1:N
+-------------------+                 v
         |                  +-------------------+
         |                  |      groups       |
         |                  +-------------------+
         |                  | id (PK, SERIAL)   |
         |                  | server_id (FK)    |
         |                  | name              |
         |                  +-------------------+
         |                            | 1:N
         | 1:N                        v
         |                  +-------------------+       +-------------------+
         +----------------->|       posts       |<------|     comments      |
                            +-------------------+  1:N  +-------------------+
                            | id (PK, SERIAL)   |       | id (PK, SERIAL)   |
                            | group_id (FK)     |       | post_id (FK)      |
                            | author_id (FK)    |       | author_id (FK)    |
                            | title             |       | body_markdown     |
                            | body_markdown     |       | score (INT)       |
                            | tags (TEXT[] GIN) |       +-------------------+
                            | score (INT)       |
                            | accepted_comment  |       +-------------------+
                            +-------------------+       |       votes       |
                                                        +-------------------+
                                                        | id (PK, SERIAL)   |
                                                        | user_id (FK)      |
                                                        | target_type       |
                                                        | target_id         |
                                                        | vote_value (1/-1) |
                                                        | UNIQUE(user,t,id) |
                                                        +-------------------+