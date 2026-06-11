<?php
declare(strict_types=1);

require_once __DIR__ . '/../../Models/Preference.php';
require_once __DIR__ . '/AuthController.php';
require_once __DIR__ . '/../../Models/Beverage.php';

class PreferenceController
{
    /**
     * GET /api/preferences
     * Returns the currently logged-in user's preferences.
     */
    public function index(array $data): void
    {
        $user = AuthController::requireAuth();
        $preferences = Preference::getByUser((int)$user['id']);
        Response::success(['preferences' => $preferences]);
    }

    /**
     * POST /api/preferences
     * JSON Body: { "beverage_id": 1, "rating": 5, "notes": "Loved it!" }
     */
    public function save(array $data): void
    {
        $user = AuthController::requireAuth();

        if (empty($data['beverage_id'])) {
            Response::error('Beverage ID is required', 400);
        }

        $beverageId = (int)$data['beverage_id'];
        $rating = isset($data['rating']) ? (int)$data['rating'] : null;
        $notes = $data['notes'] ?? null;

        // Ensure rating strictly follows the DB constraint (BETWEEN 1 AND 5)
        if ($rating !== null && ($rating < 1 || $rating > 5)) {
            Response::error('Rating must be between 1 and 5', 400);
        }

        // Verify the beverage actually exists in the catalogue
        $beverage = Beverage::findById($beverageId);
        if (!$beverage) {
            Response::error('Beverage not found in catalogue', 404);
        }

        Preference::savePreference((int)$user['id'], $beverageId, $rating, $notes);

        Response::success(null, 'Preference saved successfully');
    }

    /**
     * DELETE /api/preferences?beverage_id=123
     */
    public function delete(array $data): void
    {
        $user = AuthController::requireAuth();

        $beverageId = $_GET['beverage_id'] ?? null;
        if (!$beverageId || !is_numeric($beverageId)) {
            Response::error('Missing or invalid beverage ID', 400);
        }

        Preference::delete((int)$user['id'], (int)$beverageId);
        Response::success(null, 'Preference deleted successfully');
    }
}