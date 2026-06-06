<?php
require 'config/Database.php';
Database::getConnection()->exec("UPDATE users SET role='admin' WHERE id=1");
echo "User 1 is now admin.\n";