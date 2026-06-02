<?php
declare(strict_types=1);

class Database
{
    private static ?PDO $instance = null;

    /**
     * Returns a singleton PDO connection.
     * Creates the database directory if it doesn't exist.
     */
    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            // Path to SQLite file (outside web root)
            $dbPath = __DIR__ . '/../database/db.sqlite';
            $dbDir = dirname($dbPath);

            // Ensure the directory exists
            if (!is_dir($dbDir)) {
                mkdir($dbDir, 0755, true);
            }

            // Build the Data Source Name (DSN) for SQLite
            $dsn = 'sqlite:' . $dbPath;

            try {
                self::$instance = new PDO($dsn);
                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                // Enable WAL mode and foreign keys
                self::$instance->exec('PRAGMA journal_mode=WAL');
                self::$instance->exec('PRAGMA foreign_keys=ON');
            } catch (PDOException $e) {
                throw new RuntimeException('Database connection failed: ' . $e->getMessage());
            }
        }
        return self::$instance;
    }

    /**
     * Execute the schema.sql file to create all tables.
     */
    public static function initializeSchema(): void
    {
        $pdo = self::getConnection();
        $sql = file_get_contents(__DIR__ . '/schema.sql');
        $pdo->exec($sql);
    }
}