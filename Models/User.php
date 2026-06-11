<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

class User
{
    /**
     * Get the aggregated profile data for a user.
     */
    public static function getProfile(int $userId): array
    {
        $pdo = Database::getConnection();

        // Fetch user basic info
        $stmt = $pdo->prepare('SELECT id, username, email, role, created_at, avatar_url FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        // Fetch Groups
        $stmtGroups = $pdo->prepare('
            SELECT g.id, g.name 
            FROM groups g
            JOIN user_groups ug ON g.id = ug.group_id
            WHERE ug.user_id = :user_id
        ');
        $stmtGroups->execute([':user_id' => $userId]);
        $user['groups'] = $stmtGroups->fetchAll();

        // Fetch Top Rated Beverages
        $stmtPrefs = $pdo->prepare('
            SELECT b.id, b.name, b.category, p.rating, p.notes 
            FROM preferences p
            JOIN beverages b ON p.beverage_id = b.id
            WHERE p.user_id = :user_id AND p.rating IS NOT NULL
            ORDER BY p.rating DESC
            LIMIT 3
        ');
        $stmtPrefs->execute([':user_id' => $userId]);
        $user['top_preferences'] = $stmtPrefs->fetchAll();

        // Fetch Active Shopping Lists
        $stmtLists = $pdo->prepare('
            SELECT id, name, created_at, group_id
            FROM shopping_lists 
            WHERE user_id = :user_id OR group_id IN (
                SELECT group_id FROM user_groups WHERE user_id = :user_id
            )
            ORDER BY created_at DESC
            LIMIT 5
        ');
        $stmtLists->execute([':user_id' => $userId]);
        $user['shopping_lists'] = $stmtLists->fetchAll();

        // Fetch Dietary Restrictions
        $user['restrictions'] = [];
        try {
            $stmtRestr = $pdo->prepare('
                SELECT r.id, r.name, r.type
                FROM restrictions r
                JOIN user_restrictions ur ON r.id = ur.restriction_id
                WHERE ur.user_id = :user_id
            ');
            $stmtRestr->execute([':user_id' => $userId]);
            $user['restrictions'] = $stmtRestr->fetchAll();
        } catch (PDOException $e) {
            // Fails silently if user_restrictions table isn't created yet
        }

        return $user;
    }
}