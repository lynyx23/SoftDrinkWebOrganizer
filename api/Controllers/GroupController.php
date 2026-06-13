<?php
declare(strict_types=1);

require_once __DIR__ . '/AuthController.php';
require_once __DIR__ . '/../../Models/Group.php';

class GroupController
{
    // GET /api/groups
    public function index(array $data): void
    {
        $user = AuthController::requireAuth();
        $groups = Group::getByUser((int)$user['id']);
        Response::success(['groups' => $groups]);
    }

    // POST /api/groups
    public function create(array $data): void
    {
        $user = AuthController::requireAuth();
        if (empty($data['name'])) {
            Response::error('Group name is required', 400);
        }

        $groupId = Group::create((int)$user['id'], $data['name'], $data['description'] ?? '');
        Response::success(['id' => $groupId], 'Group created successfully', 201);
    }

    // GET /api/groups/:id
    public function show(array $data): void
    {
        $user = AuthController::requireAuth();
        $groupId = $_GET['id'] ?? null;
        if (!$groupId) {
            Response::error('Group ID is required', 400);
        }

        $group = Group::getDetails((int)$groupId);
        if (!$group) {
            Response::error('Group not found', 404);
        }

        // Verify user is member
        $isMember = false;
        foreach ($group['members'] as $member) {
            if ($member['id'] == $user['id']) {
                $isMember = true;
                break;
            }
        }
        if (!$isMember) {
            Response::error('Access denied', 403);
        }

        Response::success(['group' => $group]);
    }

    // POST /api/groups/invite
    public function invite(array $data): void
    {
        $user = AuthController::requireAuth();
        if (empty($data['group_id']) || empty($data['username'])) {
            Response::error('group_id and username required', 400);
        }

        // Verify user is group creator
        $group = Group::getDetails((int)$data['group_id']);
        if (!$group || $group['created_by'] != $user['id']) {
            Response::error('Only group creator can invite members', 403);
        }

        // Find user by username
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username');
        $stmt->execute([':username' => $data['username']]);
        $invitedUser = $stmt->fetch();

        if (!$invitedUser) {
            Response::error('User not found', 404);
        }

        Group::addMember((int)$data['group_id'], (int)$invitedUser['id']);
        Response::success(null, 'Member added successfully');
    }

    // DELETE /api/groups
    public function delete(array $data): void
    {
        $user = AuthController::requireAuth();
        if (empty($data['group_id'])) {
            Response::error('group_id required', 400);
        }

        $group = Group::getDetails((int)$data['group_id']);
        if (!$group) {
            Response::error('Group not found', 404);
        }

        if ($group['created_by'] != $user['id'] && $user['role'] !== 'admin') {
            Response::error('Only group creator or admin can delete', 403);
        }

        Group::delete((int)$data['group_id']);
        Response::success(null, 'Group deleted successfully');
    }
}
