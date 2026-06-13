<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

class Group
{
    public static function getByUser(int $userId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT g.id, g.name, g.description, g.created_by, g.created_at,
                   (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) as member_count
            FROM groups g
            JOIN user_groups ug ON g.id = ug.group_id
            WHERE ug.user_id = :user_id
            ORDER BY g.created_at DESC
        ');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    public static function create(int $userId, string $name, string $description = ''): int
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('INSERT INTO groups (name, description, created_by) VALUES (:name, :description, :created_by)');
        $stmt->execute([':name' => $name, ':description' => $description, ':created_by' => $userId]);
        $groupId = (int)$pdo->lastInsertId();

        // Add creator as first member
        $add = $pdo->prepare('INSERT INTO user_groups (user_id, group_id) VALUES (:user_id, :group_id)');
        $add->execute([':user_id' => $userId, ':group_id' => $groupId]);

        return $groupId;
    }

    public static function getDetails(int $groupId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, name, description, created_by, created_at FROM groups WHERE id = :id');
        $stmt->execute([':id' => $groupId]);
        $group = $stmt->fetch();

        if (!$group) return [];

        // Get members
        $stmtMembers = $pdo->prepare('
            SELECT u.id, u.username, u.avatar_url
            FROM users u
            JOIN user_groups ug ON u.id = ug.user_id
            WHERE ug.group_id = :group_id
        ');
        $stmtMembers->execute([':group_id' => $groupId]);
        $group['members'] = $stmtMembers->fetchAll();

        return $group;
    }

    public static function addMember(int $groupId, int $userId): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('INSERT OR IGNORE INTO user_groups (user_id, group_id) VALUES (:user_id, :group_id)');
        $stmt->execute([':user_id' => $userId, ':group_id' => $groupId]);
    }

    public static function delete(int $groupId): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM groups WHERE id = :id');
        $stmt->execute([':id' => $groupId]);
    }
}
