<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/Database.php';

class RssController
{
    public function feed(array $data): void
    {
        $pdo = Database::getConnection();

        // Get top 10 rated beverages
        $stmt = $pdo->query('
            SELECT b.id, b.name, b.category, b.description, AVG(p.rating) as avg_rating, COUNT(p.id) as total_votes
            FROM beverages b
            LEFT JOIN preferences p ON b.id = p.beverage_id
            GROUP BY b.id
            ORDER BY avg_rating DESC
            LIMIT 10
        ');
        $beverages = $stmt->fetchAll();

        // Set RSS content type
        header('Content-Type: application/rss+xml; charset=utf-8');

        // Build RSS
        $rss = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $rss .= '<rss version="2.0">' . "\n";
        $rss .= '<channel>' . "\n";
        $rss .= '<title>The Soda Aisle - Top Beverages</title>' . "\n";
        $rss .= '<link>' . (isset($_SERVER['HTTP_HOST']) ? 'http://' . $_SERVER['HTTP_HOST'] : 'http://localhost') . '</link>' . "\n";
        $rss .= '<description>Top rated beverages from The Soda Aisle store</description>' . "\n";
        $rss .= '<language>en-us</language>' . "\n";

        foreach ($beverages as $bev) {
            $rating = $bev['avg_rating'] ? number_format((float)$bev['avg_rating'], 2) : 'Not rated';
            $rss .= '<item>' . "\n";
            $rss .= '<title>' . htmlspecialchars($bev['name']) . '</title>' . "\n";
            $rss .= '<description>' . htmlspecialchars($bev['description'] ?? 'No description') . ' | Category: ' . htmlspecialchars($bev['category']) . ' | Average Rating: ' . $rating . '/5 (' . $bev['total_votes'] . ' votes)</description>' . "\n";
            $rss .= '<category>' . htmlspecialchars($bev['category']) . '</category>' . "\n";
            $rss .= '<pubDate>' . date('r') . '</pubDate>' . "\n";
            $rss .= '</item>' . "\n";
        }

        $rss .= '</channel>' . "\n";
        $rss .= '</rss>';

        echo $rss;
    }
}
