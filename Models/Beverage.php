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
            INSERT INTO beverages (name, barcode, category, price, volume_ml, packaging, description, image_url,
                                   ingredients, nutritional_info, nutriscore, countries, perishable, validity_days, season, region, venue, created_by)
            VALUES (:name, :barcode, :category, :price, :volume, :packaging, :desc, :img, :ingredients, :nutritional_info, :nutriscore, :countries,
                    :perishable, :validity, :season, :region, :venue, :created_by)
        ');

        // Safely encode the nutritional array to JSON (or fix corrupted string quotes)
        $nutritionalInfo = $data['nutritional_info'] ?? null;
        if (is_array($nutritionalInfo)) $nutritionalInfo = json_encode($nutritionalInfo);
        elseif (is_string($nutritionalInfo)) $nutritionalInfo = htmlspecialchars_decode($nutritionalInfo, ENT_QUOTES);

        $stmt->execute([
            ':name'        => $data['name'],
            ':barcode'     => $data['barcode'] ?? null,
            ':category'    => $data['category'] ?? null,
            ':price'       => $data['price'],
            ':volume'      => $data['volume_ml'] ?? null,
            ':packaging'   => $data['packaging'] ?? null,
            ':desc'        => $data['description'] ?? null,
            ':img'         => $data['image_url'] ?? null,
            ':ingredients' => $data['ingredients'] ?? null,
            ':nutritional_info' => $nutritionalInfo,
            ':nutriscore'  => $data['nutriscore'] ?? null,
            ':countries'   => $data['countries'] ?? null,
            ':perishable'  => !empty($data['perishable']) ? 1 : 0,
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
                name = :name, barcode = :barcode, category = :category, price = :price,
                volume_ml = :volume, packaging = :packaging, description = :desc, image_url = :img,
                ingredients = :ingredients, nutritional_info = :nutritional_info, nutriscore = :nutriscore, countries = :countries, 
                perishable = :perishable, validity_days = :validity, season = :season, region = :region,
                venue = :venue, updated_at = datetime(\'now\')
            WHERE id = :id
        ');

        $nutritionalInfo = $data['nutritional_info'] ?? null;
        if (is_array($nutritionalInfo)) $nutritionalInfo = json_encode($nutritionalInfo);
        elseif (is_string($nutritionalInfo)) $nutritionalInfo = htmlspecialchars_decode($nutritionalInfo, ENT_QUOTES);

        $stmt->execute([
            ':name'        => $data['name'],
            ':barcode'     => $data['barcode'] ?? null,
            ':category'    => $data['category'] ?? null,
            ':price'       => $data['price'],
            ':volume'      => $data['volume_ml'] ?? null,
            ':packaging'   => $data['packaging'] ?? null,
            ':desc'        => $data['description'] ?? null,
            ':img'         => $data['image_url'] ?? null,
            ':ingredients' => $data['ingredients'] ?? null,
            ':nutritional_info' => $nutritionalInfo,
            ':nutriscore'  => $data['nutriscore'] ?? null,
            ':countries'   => $data['countries'] ?? null,
            ':perishable'  => !empty($data['perishable']) ? 1 : 0,
            ':validity'    => $data['validity_days'] ?? null,
            ':season'      => $data['season'] ?? null,
            ':region'      => $data['region'] ?? null,
            ':venue'       => $data['venue'] ?? null,
            ':id'          => $id,
        ]);
    }

    public static function createSubmission(array $data, int $userId): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            INSERT INTO beverage_submissions 
            (original_beverage_id, submitted_by, name, barcode, category, price, volume_ml, packaging, description, image_url,
             ingredients, nutritional_info, nutriscore, countries, perishable, validity_days, season, region, venue)
            VALUES (:original_id, :submitted_by, :name, :barcode, :category, :price, :volume, :packaging, :desc, :img,
             :ingredients, :nutritional_info, :nutriscore, :countries, :perishable, :validity, :season, :region, :venue)
        ');

        $nutritionalInfo = $data['nutritional_info'] ?? null;
        if (is_array($nutritionalInfo)) $nutritionalInfo = json_encode($nutritionalInfo);
        elseif (is_string($nutritionalInfo)) $nutritionalInfo = htmlspecialchars_decode($nutritionalInfo, ENT_QUOTES);

        $stmt->execute([
            ':original_id' => $data['original_beverage_id'] ?? null,
            ':submitted_by'=> $userId,
            ':name'        => $data['name'],
            ':barcode'     => $data['barcode'] ?? null,
            ':category'    => $data['category'] ?? null,
            ':price'       => $data['price'],
            ':volume'      => $data['volume_ml'] ?? null,
            ':packaging'   => $data['packaging'] ?? null,
            ':desc'        => $data['description'] ?? null,
            ':img'         => $data['image_url'] ?? null,
            ':ingredients' => $data['ingredients'] ?? null,
            ':nutritional_info' => $nutritionalInfo,
            ':nutriscore'  => $data['nutriscore'] ?? null,
            ':countries'   => $data['countries'] ?? null,
            ':perishable'  => !empty($data['perishable']) ? 1 : 0,
            ':validity'    => $data['validity_days'] ?? null,
            ':season'      => $data['season'] ?? null,
            ':region'      => $data['region'] ?? null,
            ':venue'       => $data['venue'] ?? null,
        ]);
    }

    public static function getPendingSubmissions(): array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->query("SELECT s.*, u.username FROM beverage_submissions s JOIN users u ON s.submitted_by = u.id WHERE s.status = 'pending' ORDER BY s.created_at");
        return $stmt->fetchAll();
    }

    public static function getSubmissionById(int $id): ?array
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM beverage_submissions WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function updateSubmissionStatus(int $id, string $status): void
    {
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare("UPDATE beverage_submissions SET status = :status WHERE id = :id");
        $stmt->execute([':status' => $status, ':id' => $id]);
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