<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

class Preference
{
    /**
     * Get all preferences for a specific user, joined with beverage details.
     */
    public static function getByUser(int $userId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT p.*, b.name AS beverage_name, b.image_url, b.category
            FROM preferences p
            JOIN beverages b ON p.beverage_id = b.id
            WHERE p.user_id = :user_id
            ORDER BY p.created_at DESC
        ');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    /**
     * Insert a new preference or update an existing one.
     */
    public static function savePreference(int $userId, int $beverageId, ?int $rating, ?string $notes): void
    {
        $pdo = Database::getConnection();
        
        // Check if the user already has a preference saved for this beverage
        $stmt = $pdo->prepare('SELECT id FROM preferences WHERE user_id = :user_id AND beverage_id = :beverage_id');
        $stmt->execute([':user_id' => $userId, ':beverage_id' => $beverageId]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update existing preference
            $update = $pdo->prepare('
                UPDATE preferences
                SET rating = :rating, notes = :notes, created_at = datetime("now")
                WHERE id = :id
            ');
            $update->execute([
                ':rating' => $rating,
                ':notes' => $notes,
                ':id' => $existing['id']
            ]);
        } else {
            // Insert new preference (group_id is explicitly set to NULL based on the schema constraints)
            $insert = $pdo->prepare('
                INSERT INTO preferences (user_id, group_id, beverage_id, rating, notes)
                VALUES (:user_id, NULL, :beverage_id, :rating, :notes)
            ');
            $insert->execute([
                ':user_id' => $userId,
                ':beverage_id' => $beverageId,
                ':rating' => $rating,
                ':notes' => $notes
            ]);
        }
    }

    /**
     * Remove a preference.
     */
    public static function delete(int $userId, int $beverageId): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM preferences WHERE user_id = :user_id AND beverage_id = :beverage_id');
        $stmt->execute([':user_id' => $userId, ':beverage_id' => $beverageId]);
    }
}