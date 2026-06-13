<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/Database.php';

class ShoppingList
{
    // Obține listele utilizatorului
    public static function getByUser(int $userId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM shopping_lists WHERE user_id = :user_id ORDER BY created_at DESC');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    // Creează o listă nouă
    public static function create(int $userId, string $name): int
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('INSERT INTO shopping_lists (user_id, name) VALUES (:user_id, :name)');
        $stmt->execute([':user_id' => $userId, ':name' => $name]);
        return (int)$pdo->lastInsertId();
    }

    // Obține sucurile dintr-o anumită listă
    public static function getItems(int $listId): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT i.*, b.name as beverage_name, b.price, b.image_url, b.volume_ml
            FROM shopping_list_items i
            JOIN beverages b ON i.beverage_id = b.id
            WHERE i.list_id = :list_id
            ORDER BY i.purchased ASC, i.added_at DESC
        ');
        $stmt->execute([':list_id' => $listId]);
        return $stmt->fetchAll();
    }

    // Marchează un suc ca fiind cumpărat / necumpărat
    public static function togglePurchased(int $itemId, int $status): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('UPDATE shopping_list_items SET purchased = :status WHERE id = :id');
        $stmt->execute([':status' => $status, ':id' => $itemId]);
    }

    // Adaugă un suc la o listă
    public static function addItem(int $listId, int $beverageId): int
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('INSERT INTO shopping_list_items (list_id, beverage_id, purchased) VALUES (:list_id, :beverage_id, 0)');
        $stmt->execute([':list_id' => $listId, ':beverage_id' => $beverageId]);
        return (int)$pdo->lastInsertId();
    }
}