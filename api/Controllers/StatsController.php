<?php
declare(strict_types=1);

require_once __DIR__ . '/../../config/Database.php';

class StatsController
{
    /**
     * GET /api/stats/popular
     * Returnează datele brute în format JSON pentru afișarea în pagină
     */
    public function popular(array $data): void
    {
        $pdo = Database::getConnection();

        // 1. Top 5 cele mai bine cotate sucuri
        $stmtTop = $pdo->query('
            SELECT b.name, b.category, AVG(p.rating) as avg_rating, COUNT(p.id) as total_votes
            FROM beverages b
            JOIN preferences p ON b.id = p.beverage_id
            GROUP BY b.id
            HAVING avg_rating IS NOT NULL
            ORDER BY avg_rating DESC, total_votes DESC
            LIMIT 5
        ');
        $topRated = $stmtTop->fetchAll();

        // 2. Distribuția pe categorii (Câte sucuri avem în fiecare categorie)
        $stmtCat = $pdo->query('
            SELECT category, COUNT(id) as count
            FROM beverages
            GROUP BY category
            ORDER BY count DESC
        ');
        $categories = $stmtCat->fetchAll();

        Response::success([
            'top_rated' => $topRated,
            'categories' => $categories
        ]);
    }

    /**
     * GET /api/stats/export?format=csv (sau svg)
     * Endpoint public pentru a forța descărcarea fișierelor generate automat.
     */
    public function export(array $data): void
    {
        $format = $_GET['format'] ?? 'csv';
        $pdo = Database::getConnection();

        // Luăm toate sucurile și media lor
        $stmt = $pdo->query('
            SELECT b.name, b.category, AVG(p.rating) as avg_rating, COUNT(p.id) as total_votes
            FROM beverages b
            LEFT JOIN preferences p ON b.id = p.beverage_id
            GROUP BY b.id
            ORDER BY avg_rating DESC
        ');
        $stats = $stmt->fetchAll();

        if ($format === 'csv') {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="beverage_stats.csv"');
            
            $output = fopen('php://output', 'w');
            // Antetul coloanelor
            fputcsv($output, ['Nume Bautura', 'Categorie', 'Rating Mediu', 'Numar Voturi']);
            
            foreach ($stats as $row) {
                fputcsv($output, [
                    $row['name'],
                    $row['category'],
                    $row['avg_rating'] !== null ? number_format((float)$row['avg_rating'], 2) : 'N/A',
                    $row['total_votes']
                ]);
            }
            fclose($output);
            exit;
        }

        if ($format === 'svg') {
            header('Content-Type: image/svg+xml; charset=utf-8');
            header('Content-Disposition: attachment; filename="top_beverages_chart.svg"');
            
            // Generăm un grafic cu bare SVG folosind PHP
            $top5 = array_slice($stats, 0, 5);
            $width = 800;
            $height = 400;
            $barHeight = 40;
            $spacing = 20;

            $svg = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            $svg .= '<svg xmlns="http://www.w3.org/2000/svg" width="'.$width.'" height="'.$height.'" style="background-color: #FFF59D; font-family: Arial, sans-serif;">';
            $svg .= '<text x="20" y="40" font-size="24" font-weight="bold" fill="#2D3436">Top Rated Beverages (Out of 5 Stars)</text>';

            $y = 80;
            foreach ($top5 as $index => $row) {
                $rating = (float)$row['avg_rating'];
                // 500px lățime max pentru 5 stele
                $barWidth = ($rating / 5) * 500; 
                if($barWidth == 0) continue; // Sărim peste cele fără rating
                
                // Numele sucului
                $svg .= '<text x="20" y="'.($y + 25).'" font-size="16" fill="#2D3436">'.htmlspecialchars($row['name']).' ('.number_format($rating, 1).'★)</text>';
                // Bara retro din grafic
                $svg .= '<rect x="300" y="'.$y.'" width="'.$barWidth.'" height="'.$barHeight.'" fill="#FF6B6B" rx="5" ry="5" stroke="#2D3436" stroke-width="3"/>';
                
                $y += $barHeight + $spacing;
            }

            $svg .= '</svg>';
            echo $svg;
            exit;
        }

        Response::error('Invalid format. Use ?format=csv or ?format=svg', 400);
    }
}