<?php
declare(strict_types=1);

require_once __DIR__ . '/../../Models/ShoppingList.php';
require_once __DIR__ . '/AuthController.php';

class ListController
{
    // GET /api/lists
    public function index(array $data): void
    {
        $user = AuthController::requireAuth();
        $lists = ShoppingList::getByUser((int)$user['id']);
        Response::success(['lists' => $lists]);
    }

    // POST /api/lists
    public function create(array $data): void
    {
        $user = AuthController::requireAuth();
        if (empty($data['name'])) {
            Response::error('List name is required', 400);
        }
        $id = ShoppingList::create((int)$user['id'], $data['name']);
        Response::success(['id' => $id], 'List created successfully', 201);
    }

    // GET /api/lists/items?list_id=1
    public function items(array $data): void
    {
        AuthController::requireAuth();
        $listId = $_GET['list_id'] ?? null;
        if (!$listId) Response::error('list_id is required', 400);
        
        $items = ShoppingList::getItems((int)$listId);
        Response::success(['items' => $items]);
    }

    // PUT /api/lists/items
    public function toggleItem(array $data): void
    {
        AuthController::requireAuth();
        if (empty($data['item_id']) || !isset($data['purchased'])) {
            Response::error('item_id and purchased status required', 400);
        }
        ShoppingList::togglePurchased((int)$data['item_id'], (int)$data['purchased']);
        Response::success(null, 'Item updated');
    }
}