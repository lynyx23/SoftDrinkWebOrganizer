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

    // POST /api/lists/items
    public function addItem(array $data): void
    {
        $user = AuthController::requireAuth();
        if (empty($data['list_id']) || empty($data['beverage_id'])) {
            Response::error('list_id and beverage_id required', 400);
        }

        // Get the list to check access
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, user_id, group_id FROM shopping_lists WHERE id = :id');
        $stmt->execute([':id' => $data['list_id']]);
        $list = $stmt->fetch();

        if (!$list) {
            Response::error('List not found', 404);
        }

        // Verify user has access (owns it or is in the group)
        $hasAccess = false;
        if ($list['user_id'] == $user['id']) {
            $hasAccess = true;
        } elseif ($list['group_id']) {
            $checkGroup = $pdo->prepare('SELECT 1 FROM user_groups WHERE user_id = :user_id AND group_id = :group_id');
            $checkGroup->execute([':user_id' => $user['id'], ':group_id' => $list['group_id']]);
            $hasAccess = (bool)$checkGroup->fetch();
        }

        if (!$hasAccess) {
            Response::error('Access denied to this list', 403);
        }

        $itemId = ShoppingList::addItem((int)$data['list_id'], (int)$data['beverage_id']);
        Response::success(['id' => $itemId], 'Item added to list', 201);
    }

    // DELETE /api/lists
    public function delete(array $data): void
    {
        $user = AuthController::requireAuth();
        if (empty($data['list_id'])) {
            Response::error('list_id required', 400);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id, user_id, group_id FROM shopping_lists WHERE id = :id');
        $stmt->execute([':id' => $data['list_id']]);
        $list = $stmt->fetch();

        if (!$list) {
            Response::error('List not found', 404);
        }

        // For personal lists, verify ownership
        if ($list['user_id'] && $list['user_id'] != $user['id']) {
            Response::error('Can only delete your own lists', 403);
        }

        // For group lists, only group creator can delete
        if ($list['group_id']) {
            $groupStmt = $pdo->prepare('SELECT created_by FROM groups WHERE id = :id');
            $groupStmt->execute([':id' => $list['group_id']]);
            $group = $groupStmt->fetch();
            if (!$group || $group['created_by'] != $user['id']) {
                Response::error('Only group creator can delete group lists', 403);
            }
        }

        ShoppingList::delete((int)$data['list_id']);
        Response::success(null, 'List deleted successfully');
    }
}