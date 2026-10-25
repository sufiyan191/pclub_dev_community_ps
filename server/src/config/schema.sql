-- 1. USERS TABLE (Core Auth & Profile Requirement)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    skills TEXT[] DEFAULT '{}',
    reputation INT DEFAULT 0,
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'MODERATOR', 'ADMIN')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. SERVERS TABLE (Discord-like Communities in Left Spatial Sidebar)
CREATE TABLE IF NOT EXISTS servers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    monogram VARCHAR(4) NOT NULL,
    icon_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    owner_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. SERVER MEMBERS (Tracks "My Joined Servers" M:N Relationship)
CREATE TABLE IF NOT EXISTS server_members (
    server_id INT REFERENCES servers(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'MODERATOR', 'OWNER')),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (server_id, user_id)
);

-- 4. GROUPS TABLE (Channels listed in Center Spatial Panel)
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    server_id INT REFERENCES servers(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(80) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (server_id, name)
);

-- 5. POSTS TABLE (Questions/Topics inside a Group with Markdown & Tags)
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    author_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    body_markdown TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    score INT DEFAULT 0,
    accepted_comment_id INT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. COMMENTS TABLE (Answers & Replies in Right Spatial Wing Panel)
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    author_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    body_markdown TEXT NOT NULL,
    score INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. VOTES TABLE (Enforces 1 Upvote/Downvote per User per Post/Comment)
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('POST', 'COMMENT')),
    target_id INT NOT NULL,
    vote_value SMALLINT NOT NULL CHECK (vote_value IN (1, -1)),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, target_type, target_id)
);

-- PERFORMANCE INDEXES (For Fast Sorting & Tag Filtering)
CREATE INDEX IF NOT EXISTS idx_posts_group_newest ON posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_group_top ON posts(group_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, score DESC, created_at ASC);