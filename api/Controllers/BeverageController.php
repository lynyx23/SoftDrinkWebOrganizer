<?php
declare(strict_types=1);

require_once __DIR__ . '/../../Models/Beverage.php';
require_once __DIR__ . '/AuthController.php';

class BeverageController
{
    /**
     * GET /api/beverages?category=...&search=...
     */
    public function index(array $data): void
    {
        $category = $_GET['category'] ?? '';
        $search   = $_GET['search'] ?? '';
        $beverages = Beverage::getAll($category, $search);
        Response::success(['beverages' => $beverages]);
    }

    /**
     * POST /api/beverages  (admin only)
     */
    public function create(array $data): void
    {
        $user = AuthController::requireAuth();
        if ($user['role'] !== 'admin') {
            Response::error('Only admins can create beverages', 403);
        }

        // Simple validation
        if (empty($data['name']) || !isset($data['price'])) {
            Response::error('Name and price are required', 400);
        }

        $id = Beverage::create($data, $user['id']);
        $newBeverage = Beverage::findById($id);
        Response::success(['beverage' => $newBeverage], 'Beverage created', 201);
    }

    /**
     * PUT /api/beverages?id=123  (admin only)
     * Because the front controller doesn't yet extract ID from URL,
     * we'll pass the ID as a query parameter.
     */
    public function update(array $data): void
    {
        $user = AuthController::requireAuth();
        if ($user['role'] !== 'admin') {
            Response::error('Only admins can update beverages', 403);
        }

        $id = $_GET['id'] ?? null;
        if (!$id || !is_numeric($id)) {
            Response::error('Missing or invalid beverage ID', 400);
        }

        $existing = Beverage::findById((int)$id);
        if (!$existing) {
            Response::error('Beverage not found', 404);
        }

        Beverage::update((int)$id, $data);
        $updated = Beverage::findById((int)$id);
        Response::success(['beverage' => $updated], 'Beverage updated');
    }

    /**
     * DELETE /api/beverages?id=123  (admin only)
     */
    public function delete(array $data): void
    {
        $user = AuthController::requireAuth();
        if ($user['role'] !== 'admin') {
            Response::error('Only admins can delete beverages', 403);
        }

        $id = $_GET['id'] ?? null;
        if (!$id || !is_numeric($id)) {
            Response::error('Missing or invalid beverage ID', 400);
        }

        $existing = Beverage::findById((int)$id);
        if (!$existing) {
            Response::error('Beverage not found', 404);
        }

        Beverage::delete((int)$id);
        Response::success(null, 'Beverage deleted');
    }
}