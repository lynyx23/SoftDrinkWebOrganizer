<?php
declare(strict_types=1);

require_once __DIR__ . '/config/Database.php';

// Ensure the database directory exists
$dbDir = __DIR__ . '/database';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0755, true);
}

// Run the schema
Database::initializeSchema();

$pdo = Database::getConnection();
$pdo->exec("
    CREATE TABLE IF NOT EXISTS auth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
");
echo "Auth tokens table created.\n";

echo "Database tables created successfully.\n";