<?php
declare(strict_types=1);

require_once __DIR__ . '/AuthController.php';
require_once __DIR__ . '/../../Models/User.php';

class UserController
{
    /**
     * Get the complete profile data for the authenticated user.
     * GET /api/users/profile
     */
    public function profile(array $data): void
    {
        $authUser = AuthController::requireAuth();
        $profileData = User::getProfile((int)$authUser['id']);

        Response::success(['profile' => $profileData], 'Profile retrieved successfully');
    }

    /**
     * Update the user's profile picture.
     * PUT /api/users/avatar
     * JSON Body: { "avatar_url": "https://example.com/avatar.png" }
     */
    public function updateAvatar(array $data): void
    {
        $user = AuthController::requireAuth(); // Ensure they are logged in

        if (!isset($data['avatar_url'])) {
            Response::error('Avatar URL is required', 400);
        }

        // Basic validation to ensure it's a valid URL (or empty to remove it)
        $avatarUrl = trim($data['avatar_url']);
        if ($avatarUrl !== '' && !filter_var($avatarUrl, FILTER_VALIDATE_URL)) {
            Response::error('Invalid URL format', 400);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('UPDATE users SET avatar_url = :avatar_url WHERE id = :id');
        $stmt->execute([':avatar_url' => $avatarUrl === '' ? null : $avatarUrl, ':id' => $user['id']]);

        Response::success(['avatar_url' => $avatarUrl], 'Profile picture updated');
    }
}