-- Users & Groups
CREATE TABLE IF NOT EXISTS users
(
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    avatar_url    TEXT          DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS groups
(
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT,
    created_by  INTEGER NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS user_groups
(
    user_id  INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
);

-- Beverage catalogue
-- Beverage catalogue
CREATE TABLE IF NOT EXISTS beverages
(
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    barcode          TEXT UNIQUE, -- EAN/UPC from Open Food Facts
    category         TEXT,        -- e.g., tea, juice, dairy
    price            REAL    NOT NULL CHECK (price >= 0),
    volume_ml        INTEGER,     -- common packaging size
    packaging        TEXT,        -- e.g., 'can', 'glass bottle', 'plastic'
    description      TEXT,
    image_url        TEXT,        -- relative path or external URL
    ingredients      TEXT,        -- comma separated or JSON
    nutritional_info TEXT,        -- JSON string of macronutrients
    nutriscore       TEXT CHECK (LOWER(nutriscore) IN ('a', 'b', 'c', 'd', 'e')),
    countries        TEXT,        -- comma separated list of countries
    perishable       INTEGER NOT NULL DEFAULT 0 CHECK (perishable IN (0, 1)),
    validity_days    INTEGER,     -- shelf life in days (if perishable)
    season           TEXT,        -- 'summer','winter','all', etc.
    region           TEXT,        -- geographic availability
    venue            TEXT,        -- specific store/venue name
    created_by       INTEGER,     -- admin who added it
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS beverage_submissions
(
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    original_beverage_id INTEGER          DEFAULT NULL,
    submitted_by         INTEGER NOT NULL,
    status               TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    -- Beverage fields
    name                 TEXT    NOT NULL,
    barcode              TEXT,
    category             TEXT,
    price                REAL,
    volume_ml            INTEGER,
    packaging            TEXT,
    description          TEXT,
    image_url            TEXT,
    ingredients          TEXT,
    nutritional_info     TEXT,
    nutriscore           TEXT CHECK (LOWER(nutriscore) IN ('a', 'b', 'c', 'd', 'e') OR nutriscore IS NULL),
    countries            TEXT,
    perishable           INTEGER DEFAULT 0 CHECK (perishable IN (0, 1)),
    validity_days        INTEGER,
    season               TEXT,
    region               TEXT,
    venue                TEXT,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (original_beverage_id) REFERENCES beverages (id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users (id) ON DELETE CASCADE
);

-- Restrictions (allergens, dietary preferences)
CREATE TABLE IF NOT EXISTS restrictions
(
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('allergen', 'diet', 'other')),
    name TEXT NOT NULL UNIQUE -- e.g., 'lactose', 'vegan', 'nut-free'
);

-- Many-to-many: beverages can have several restrictions
CREATE TABLE IF NOT EXISTS beverage_restrictions
(
    beverage_id    INTEGER NOT NULL,
    restriction_id INTEGER NOT NULL,
    PRIMARY KEY (beverage_id, restriction_id),
    FOREIGN KEY (beverage_id) REFERENCES beverages (id) ON DELETE CASCADE,
    FOREIGN KEY (restriction_id) REFERENCES restrictions (id) ON DELETE CASCADE
);

-- Many-to-many: users can have several restrictions/preferences
CREATE TABLE IF NOT EXISTS user_restrictions
(
    user_id        INTEGER NOT NULL,
    restriction_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, restriction_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (restriction_id) REFERENCES restrictions (id) ON DELETE CASCADE
);

-- User/group preferences
CREATE TABLE IF NOT EXISTS preferences
(
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER,                                -- NULL if it's a group preference
    group_id    INTEGER,                                -- NULL if it's a user preference
    beverage_id INTEGER NOT NULL,
    rating      INTEGER CHECK (rating BETWEEN 1 AND 5), -- optional liking
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    FOREIGN KEY (beverage_id) REFERENCES beverages (id) ON DELETE CASCADE,
    CHECK (
        (user_id IS NOT NULL AND group_id IS NULL)
            OR (user_id IS NULL AND group_id IS NOT NULL)
        )
);

-- Shopping lists
CREATE TABLE IF NOT EXISTS shopping_lists
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER, -- NULL for shared group lists
    group_id   INTEGER,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE,
    CHECK (
        (user_id IS NOT NULL AND group_id IS NULL)
            OR (user_id IS NULL AND group_id IS NOT NULL)
        )
);

CREATE TABLE IF NOT EXISTS shopping_list_items
(
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id     INTEGER NOT NULL,
    beverage_id INTEGER NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    purchased   INTEGER NOT NULL DEFAULT 0 CHECK (purchased IN (0, 1)),
    added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE,
    FOREIGN KEY (beverage_id) REFERENCES beverages (id) ON DELETE CASCADE
);

-- Authentication tokens (one user can have multiple sessions)
CREATE TABLE IF NOT EXISTS auth_tokens
(
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    token      TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_beverages_category ON beverages (category);
CREATE INDEX IF NOT EXISTS idx_preferences_user ON preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_group ON preferences (group_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists (user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_group ON shopping_lists (group_id);