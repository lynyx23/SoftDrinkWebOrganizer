<?php
declare(strict_types=1);

class Beverage
{
    /**
     * Get all beverages, optionally filtered by category or search term.
     */
    public static function getAll(string $category = '', string $search = ''): array
    {
        $pdo = Database::getConnection();
        $sql = 'SELECT * FROM beverages WHERE 1=1';
        $params = [];

        if ($category !== '') {
            $sql .= ' AND category = :category';
            $params[':category'] = $category;
        }
        if ($search !== '') {
            $sql .= ' AND name LIKE :search';
            $params[':search'] = "%$search%";
        }
        $sql .= ' ORDER BY name ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get a single beverage by ID.
     */
    public static function findById(int $id): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM beverages WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Create a new beverage (admin only).
     * Returns the new ID.
     */
    public static function create(array $data, int $createdBy): int
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            INSERT INTO beverages (name, category, price, volume_ml, description, image_url,
                                   ingredients, perishable, validity_days, season, region, venue, created_by)
            VALUES (:name, :category, :price, :volume, :desc, :img, :ingredients,
                    :perishable, :validity, :season, :region, :venue, :created_by)
        ');
        $stmt->execute([
            ':name'        => $data['name'],
            ':category'    => $data['category'] ?? null,
            ':price'       => $data['price'],
            ':volume'      => $data['volume_ml'] ?? null,
            ':desc'        => $data['description'] ?? null,
            ':img'         => $data['image_url'] ?? null,
            ':ingredients' => $data['ingredients'] ?? null,
            ':perishable'  => $data['perishable'] ? 1 : 0,
            ':validity'    => $data['validity_days'] ?? null,
            ':season'      => $data['season'] ?? null,
            ':region'      => $data['region'] ?? null,
            ':venue'       => $data['venue'] ?? null,
            ':created_by'  => $createdBy,
        ]);
        return (int) $pdo->lastInsertId();
    }

    /**
     * Update an existing beverage.
     */
    public static function update(int $id, array $data): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            UPDATE beverages SET
                name = :name, category = :category, price = :price,
                volume_ml = :volume, description = :desc, image_url = :img,
                ingredients = :ingredients, perishable = :perishable,
                validity_days = :validity, season = :season, region = :region,
                venue = :venue, updated_at = datetime(\'now\')
            WHERE id = :id
        ');
        $stmt->execute([
            ':name'        => $data['name'],
            ':category'    => $data['category'] ?? null,
            ':price'       => $data['price'],
            ':volume'      => $data['volume_ml'] ?? null,
            ':desc'        => $data['description'] ?? null,
            ':img'         => $data['image_url'] ?? null,
            ':ingredients' => $data['ingredients'] ?? null,
            ':perishable'  => $data['perishable'] ? 1 : 0,
            ':validity'    => $data['validity_days'] ?? null,
            ':season'      => $data['season'] ?? null,
            ':region'      => $data['region'] ?? null,
            ':venue'       => $data['venue'] ?? null,
            ':id'          => $id,
        ]);
    }

    /**
     * Delete a beverage.
     */
    public static function delete(int $id): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM beverages WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }
}