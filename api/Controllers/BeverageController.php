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
        $search = $_GET['search'] ?? '';
        $safeMode = isset($_GET['safe_mode']) && $_GET['safe_mode'] === '1';

        $userId = null;
        if ($safeMode) {
            // Only apply safe mode if they are logged in
            $user = AuthController::getAuthenticatedUser();
            if ($user) {
                $userId = (int)$user['id'];
            }
        }

        $beverages = Beverage::getAll($category, $search, $userId);
        Response::success(['beverages' => $beverages]);
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

    /**
     * GET /api/beverages/single?id=123
     */
    public function getSingle(array $data): void
    {
        $id = $_GET['id'] ?? null;
        $beverage = Beverage::findById((int)$id);
        if (!$beverage) Response::error('Not found', 404);
        Response::success(['beverage' => $beverage]);
    }

    /**
     * POST /api/beverages/submit
     * Any logged-in user can submit a new beverage or an edit.
     */
    public function submit(array $data): void
    {
        $user = AuthController::requireAuth();

        if (empty($data['name']) || !isset($data['price'])) {
            Response::error('Name and price are required', 400);
        }

        // Delegating DB execution entirely to the Model
        Beverage::createSubmission($data, (int)$user['id']);

        Response::success(null, 'Beverage submitted for admin approval!', 201);
    }

    /**
     * GET /api/beverages/submissions
     * Admin only. Lists pending submissions.
     */
    public function listSubmissions(array $data): void
    {
        $user = AuthController::requireAuth();
        if ($user['role'] !== 'admin') Response::error('Admins only', 403);

        $submissions = Beverage::getPendingSubmissions();

        Response::success(['submissions' => $submissions]);
    }

    /**
     * GET /api/beverages/submission?id=123
     */
    public function getSubmission(array $data): void
    {
        $user = AuthController::requireAuth();
        if ($user['role'] !== 'admin') Response::error('Admins only', 403);

        $id = $_GET['id'] ?? null;
        $submission = Beverage::getSubmissionById((int)$id);

        if (!$submission) Response::error('Not found', 404);

        Response::success(['submission' => $submission]);
    }

    /**
     * POST /api/beverages/review
     * JSON Body: { "submission_id": 1, "action": "approve" | "reject" }
     */
    public function review(array $data): void
    {
        $user = AuthController::requireAuth();
        if ($user['role'] !== 'admin') Response::error('Admins only', 403);

        $subId = $data['submission_id'] ?? null;
        $action = $data['action'] ?? null;

        if (!$subId || !in_array($action, ['approve', 'reject'])) {
            Response::error('Invalid parameters', 400);
        }

        $sub = Beverage::getSubmissionById((int)$subId);

        if (!$sub || $sub['status'] !== 'pending') {
            Response::error('Pending submission not found', 404);
        }

        if ($action === 'approve') {
            if ($sub['original_beverage_id']) {
                Beverage::update((int)$sub['original_beverage_id'], $sub);
            } else {
                Beverage::create($sub, $sub['submitted_by']);
            }
        }

        Beverage::updateSubmissionStatus((int)$subId, $action . 'd');

        Response::success(null, "Submission {$action}d successfully.");
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
     * GET /api/beverages/off-lookup?barcode=123456789
     * Proxies the request to Open Food Facts safely.
     */
    public function lookupOff(array $data): void
    {
        $user = AuthController::requireAuth();

        $barcode = $_GET['barcode'] ?? '';
        if (empty($barcode) || !ctype_alnum($barcode)) {
            Response::error('Valid barcode is required', 400);
        }

        $offUrl = "https://world.openfoodfacts.org/api/v0/product/{$barcode}.json";

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $offUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        // Header-ul obligatoriu Open Food Facts
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "User-Agent: SoftDrinkWebOrganizer/1.0 (tudorbc23@gmail.com)"
        ]);
        
        // MAGIC LINE: Ignoră verificarea certificatului SSL local
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $result = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);    

        if ($result === false || $httpCode !== 200) {
            Response::error('API Error: ' . $curlError . ' (HTTP ' . $httpCode . ')', 502);
        }

        $decoded = json_decode($result, true);

        if (isset($decoded['status']) && $decoded['status'] == 0) {
            Response::error('Product not found on Open Food Facts.', 404);
        }

        Response::success(['product' => $decoded['product'] ?? null]);
    }
}