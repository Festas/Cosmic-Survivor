// Database module for user accounts and progress persistence
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { randomInt } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, 'cosmic_survivor.db');
const SALT_ROUNDS = 10;

let db;

export function initDatabase() {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            display_name TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            last_login TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS user_stats (
            user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            total_kills INTEGER DEFAULT 0,
            total_credits INTEGER DEFAULT 0,
            max_wave INTEGER DEFAULT 0,
            upgrades_purchased INTEGER DEFAULT 0,
            weapons_unlocked INTEGER DEFAULT 1,
            total_games INTEGER DEFAULT 0,
            total_playtime_seconds INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            achievement_id TEXT NOT NULL,
            unlocked_at TEXT DEFAULT (datetime('now')),
            UNIQUE(user_id, achievement_id)
        );

        CREATE TABLE IF NOT EXISTS high_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            wave INTEGER NOT NULL,
            score INTEGER NOT NULL,
            difficulty TEXT NOT NULL,
            character_id TEXT,
            timestamp INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_high_scores_user ON high_scores(user_id);
        CREATE INDEX IF NOT EXISTS idx_high_scores_score ON high_scores(score DESC);
    `);

    return db;
}

// User registration
export function createUser(username, password, displayName) {
    if (!username || username.length < 3 || username.length > 20) {
        return { error: 'Username must be 3-20 characters' };
    }
    if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { error: 'Username can only contain letters, numbers, and underscores' };
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
        return { error: 'Username already taken' };
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const name = displayName || username;

    db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)').run(id, username, passwordHash, name);
    db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(id);

    return { success: true, userId: id, username, displayName: name };
}

// User login
export function loginUser(username, password) {
    const user = db.prepare('SELECT id, username, password_hash, display_name FROM users WHERE username = ?').get(username);
    if (!user) {
        return { error: 'Invalid username or password' };
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
        return { error: 'Invalid username or password' };
    }

    db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

    return {
        success: true,
        userId: user.id,
        username: user.username,
        displayName: user.display_name
    };
}

// Guest account creation (no password required)
export function createGuestUser() {
    const id = uuidv4();
    const guestNum = randomInt(1000, 10000);
    const username = `guest_${guestNum}`;
    const displayName = `Guest ${guestNum}`;
    const passwordHash = bcrypt.hashSync(id, SALT_ROUNDS); // Use id as password for guest

    db.prepare('INSERT INTO users (id, username, password_hash, display_name) VALUES (?, ?, ?, ?)').run(id, username, passwordHash, displayName);
    db.prepare('INSERT INTO user_stats (user_id) VALUES (?)').run(id);

    return { success: true, userId: id, username, displayName, isGuest: true };
}

// Get user stats
export function getUserStats(userId) {
    const stats = db.prepare('SELECT * FROM user_stats WHERE user_id = ?').get(userId);
    return stats || null;
}

// Update user stats (merge with existing)
export function updateUserStats(userId, newStats) {
    const existing = getUserStats(userId);
    if (!existing) return false;

    db.prepare(`
        UPDATE user_stats SET
            total_kills = total_kills + ?,
            total_credits = total_credits + ?,
            max_wave = MAX(max_wave, ?),
            upgrades_purchased = upgrades_purchased + ?,
            weapons_unlocked = MAX(weapons_unlocked, ?),
            total_games = total_games + ?,
            total_playtime_seconds = total_playtime_seconds + ?
        WHERE user_id = ?
    `).run(
        newStats.totalKills || 0,
        newStats.totalCredits || 0,
        newStats.maxWave || 0,
        newStats.upgradesPurchased || 0,
        newStats.weaponsUnlocked || existing.weapons_unlocked,
        newStats.gamesPlayed || 0,
        newStats.playtimeSeconds || 0,
        userId
    );
    return true;
}

// Achievements
export function getUserAchievements(userId) {
    return db.prepare('SELECT achievement_id FROM achievements WHERE user_id = ?').all(userId).map(r => r.achievement_id);
}

export function addAchievement(userId, achievementId) {
    try {
        db.prepare('INSERT OR IGNORE INTO achievements (user_id, achievement_id) VALUES (?, ?)').run(userId, achievementId);
        return true;
    } catch {
        return false;
    }
}

// High scores
export function getUserHighScores(userId, limit = 10) {
    return db.prepare('SELECT wave, score, difficulty, character_id, timestamp FROM high_scores WHERE user_id = ? ORDER BY score DESC LIMIT ?').all(userId, limit);
}

export function addHighScore(userId, score) {
    db.prepare('INSERT INTO high_scores (user_id, wave, score, difficulty, character_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
        userId, score.wave, score.score, score.difficulty, score.characterId || null, score.timestamp
    );

    // Keep only top 10 per user
    db.prepare(`
        DELETE FROM high_scores WHERE user_id = ? AND id NOT IN (
            SELECT id FROM high_scores WHERE user_id = ? ORDER BY score DESC LIMIT 10
        )
    `).run(userId, userId);
}

// Global leaderboard
export function getGlobalLeaderboard(limit = 50) {
    return db.prepare(`
        SELECT hs.wave, hs.score, hs.difficulty, hs.character_id, hs.timestamp, u.display_name
        FROM high_scores hs
        JOIN users u ON hs.user_id = u.id
        ORDER BY hs.score DESC
        LIMIT ?
    `).all(limit);
}

// Get full user profile (for sync on login)
export function getUserProfile(userId) {
    const user = db.prepare('SELECT id, username, display_name FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    return {
        userId: user.id,
        username: user.username,
        displayName: user.display_name,
        stats: getUserStats(userId),
        achievements: getUserAchievements(userId),
        highScores: getUserHighScores(userId)
    };
}

export function closeDatabase() {
    if (db) db.close();
}
