<?php
declare(strict_types=1);

class AuthController
{
    /**
     * Register a new user.
     * POST /api/users/register
     * JSON Body: { "username", "email", "password" }
     */
    public function register(array $data): void
    {
        // --- 1. Validate required fields ---
        $required = ['username', 'email', 'password'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                Response::error("Missing field: $field", 400);
            }
        }

        $username = trim($data['username']);
        $email    = trim($data['email']);
        $password = $data['password'];

        // --- 2. Validate format ---
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid email format', 400);
        }
        if (strlen($password) < 6) {
            Response::error('Password must be at least 6 characters', 400);
        }

        // TODO: password can contain unusual characters

        // --- 3. Check for duplicates ---
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username OR email = :email');
        $stmt->execute([':username' => $username, ':email' => $email]);
        if ($stmt->fetch()) {
            Response::error('Username or email already taken', 409);
        }

        // --- 4. Hash the password securely ---
        $hashedPassword = Security::hashPassword($password);

        // --- 5. Insert new user ---
        $insert = $pdo->prepare(
            'INSERT INTO users (username, email, password_hash, role) VALUES (:username, :email, :password, :role)'
        );
        $insert->execute([
            ':username' => $username,
            ':email'    => $email,
            ':password' => $hashedPassword,
            ':role'     => 'user'   // default role
        ]);

        $userId = $pdo->lastInsertId();

        // --- 6. Return success (without sensitive info) ---
        Response::success([
            'user' => [
                'id'       => $userId,
                'username' => $username,
                'email'    => $email,
                'role'     => 'user'
            ]
        ], 'Registration successful', 201);
    }

    /**
     * Login an existing user.
     * POST /api/users/login
     * JSON Body: { "username", "password" }
     */
    public function login(array $data): void
    {
        // --- 1. Validate required fields ---
        if (empty($data['username']) || empty($data['password'])) {
            Response::error('Username and password are required', 400);
        }

        $username = trim($data['username']);
        $password = $data['password'];

        // --- 2. Find user by username ---
        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :username');
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::error('Invalid username or password', 401);
        }

        // --- 3. Verify password ---
        if (!Security::verifyPassword($password, $user['password_hash'])) {
            Response::error('Invalid username or password', 401);
        }

        // --- 4. Generate a random token and store it ---
        $token = Security::randomToken();
        $insertToken = $pdo->prepare(
            'INSERT INTO auth_tokens (user_id, token) VALUES (:user_id, :token)'
        );
        $insertToken->execute([':user_id' => $user['id'], ':token' => $token]);

        // --- 5. Return token + user info ---
        Response::success([
            'token' => $token,
            'user'  => [
                'id'       => $user['id'],
                'username' => $user['username'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ], 'Login successful');
    }

    /**
     * Logout – invalidate the current token.
     * POST /api/users/logout
     * Headers: Authorization: Bearer <token>
     */
    public function logout(array $data): void
    {
        $token = self::getBearerToken();
        if (!$token) {
            Response::error('No token provided', 401);
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('DELETE FROM auth_tokens WHERE token = :token');
        $stmt->execute([':token' => $token]);

        Response::success(null, 'Logged out successfully');
    }
    // TODO: orice token trimis merge pt logout, dar /me merge cum ar trebui hmm
    // TODO: se pot genera mai multe token-uri pt acelasi user si toate sunt valide pt /me
    
    /**
     * Return the currently authenticated user.
     * GET /api/users/me
     * Headers: Authorization: Bearer <token>
     */
    public function me(array $data): void
    {
        $user = self::getAuthenticatedUser();
        if (!$user) {
            Response::error('Authentication required', 401);
        }

        Response::success([
            'user' => [
                'id'       => $user['id'],
                'username' => $user['username'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ]);
    }

    // -----------------------------------------------------------------
    //  Helper methods – can be called from any controller
    // -----------------------------------------------------------------

    /**
     * Extract the Bearer token from the Authorization header.
     *
     * @return string|null
     */
    public static function getBearerToken(): ?string
{
    // getallheaders() may not exist on the built-in server
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    } else {
        // Fallback: manually parse $_SERVER for HTTP_ headers
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') === 0) {
                $key = str_replace('_', '-', substr($name, 5));
                $headers[$key] = $value;
            }
        }
    }

    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            $header = trim($value);
            if (preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
                return $matches[1];
            }
        }
    }
    return null;
}

    /**
     * Validate the token and return the user row.
     *
     * @return array|null User row from database, or null if invalid/expired token
     */
    public static function getAuthenticatedUser(): ?array
    {
        $token = self::getBearerToken();
        if (!$token) {
            return null;
        }

        $pdo = Database::getConnection();
        $stmt = $pdo->prepare('
            SELECT u.*
            FROM auth_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token = :token
        ');
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    /**
     * Convenience method that terminates with 401 if the user is not authenticated.
     * Use this at the beginning of any protected method.
     *
     * @return array The authenticated user row
     */
    public static function requireAuth(): array
    {
        $user = self::getAuthenticatedUser();
        if (!$user) {
            Response::error('Authentication required', 401);
        }
        return $user;
    }
}