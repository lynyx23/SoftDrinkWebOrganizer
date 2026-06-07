<?php
declare(strict_types=1);

// Autoload (simple manual require – you can improve later)
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../utils/Response.php';
require_once __DIR__ . '/../utils/Security.php';

// Get the request URI and method
$requestUri = $_SERVER['REQUEST_URI'];
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove query string (if any) and base path
$parsedUrl = parse_url($requestUri);
$path = $parsedUrl['path'] ?? '/';

// In case the script is in a subdirectory, we want only the part after /api/
// For a built-in server with `php -S localhost:8000 -t public/`, we use:
$basePath = '/api';
if (strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
}
// Ensure leading "/" for consistent routing
$path = '/' . trim($path, '/');

// Routing table: method + path → controller/method
$routes = [
    // Auth
    'POST /users/register' => ['AuthController', 'register'],
    'POST /users/login'    => ['AuthController', 'login'],
    'POST /users/logout'   => ['AuthController', 'logout'],
    'GET /users/me'        => ['AuthController', 'me'],
    'GET /users'           => ['AuthController', 'listUsers'],   // admin only later
    

    // Beverages
    'GET /beverages'       => ['BeverageController', 'index'],
    'POST /beverages'      => ['BeverageController', 'create'],
    'PUT /beverages'       => ['BeverageController', 'update'],
    'DELETE /beverages'    => ['BeverageController', 'delete'],

    // Lists
    'GET /lists'           => ['ListController', 'index'],
    'POST /lists'          => ['ListController', 'create'],

    // Stats
    'GET /stats/popular'   => ['StatsController', 'popular'],
    'GET /stats/export'    => ['StatsController', 'export'],

    // RSS
    'GET /rss'             => ['RssController', 'feed'],
];

// Build key: "METHOD /path"
$routeKey = $requestMethod . ' ' . $path;

if (!isset($routes[$routeKey])) {
    Response::error('Endpoint not found', 404);
}

[$controllerName, $methodName] = $routes[$routeKey];

// Include the controller file (expected in Controllers/ folder)
$controllerFile = __DIR__ . '/Controllers/' . $controllerName . '.php';
if (!file_exists($controllerFile)) {
    Response::error('Server error: controller not found', 500);
}

require_once $controllerFile;

// Instantiate and call method
$controller = new $controllerName();
if (!method_exists($controller, $methodName)) {
    Response::error('Server error: method not found', 500);
}

// All controller methods must accept ($data) where $data is sanitized input
// For GET/DELETE we fetch from $_GET; for POST/PUT we read JSON body
$inputData = [];
if (in_array($requestMethod, ['POST', 'PUT'])) {
    $rawBody = file_get_contents('php://input');
    $decoded = json_decode($rawBody, true);
    if (is_array($decoded)) {
        $inputData = Security::sanitize($decoded);
    }
} else {
    // For GET/DELETE, sanitize $_GET parameters
    $inputData = Security::sanitize($_GET);
}

// Call the method; it's responsible for sending a Response
$controller->$methodName($inputData);