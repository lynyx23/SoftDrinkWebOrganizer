<?php
declare(strict_types=1);

class Security
{
    /**
     * Recursively sanitize input against XSS.
     */
    public static function sanitize($data)
    {
        if (is_array($data)) {
            return array_map([self::class, 'sanitize'], $data);
        }

        if($data === null) {
            return null;
        }

        return htmlspecialchars((string) $data, ENT_QUOTES, 'UTF-8');
    }

    /**
     * Hash a password using bcrypt.
     */
    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    /**
     * Verify a password against its bcrypt hash.
     */
    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    /**
     * Generate a cryptographically secure random token (hex string).
     *
     * @param int $length Length of random bytes (default 32 → 64 hex chars)
     * @return string
     */
    public static function randomToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }
}