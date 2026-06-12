<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

class Restriction
{
    /**
     * Get all available dietary restrictions from the database.
     */
    public static function getAll(): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query('SELECT id, type, name FROM restrictions ORDER BY type, name');
        return $stmt->fetchAll();
    }
}