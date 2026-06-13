# SOr — Soft Drink Web Organizer (The Soda Aisle)

![PHP 8.x](https://img.shields.io/badge/PHP-8.x-777BB4?style=for-the-badge&logo=php&logoColor=white)
![SQLite3](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5/CSS3](https://img.shields.io/badge/HTML5%20&%20CSS3-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**SOr** (commercially styled as **The Soda Aisle**) is a modern, responsive Web application designed to manage personal and group preferences for non-alcoholic beverages, including teas, dairy, juices, and syrups. 

This project was developed from scratch to adhere to strict academic engineering constraints for the **Web Technologies** course at the *Faculty of Computer Science, "Alexandru Ioan Cuza" University of Iași*. It deliberately circumvents the use of third-party frameworks, highlighting native Web APIs, secure database models, and service-oriented communication.

## ✨ Features

* **Secure Session Controls**: Custom multi-device authentication tokens utilizing bcrypt password hashing.
* **Allergen & Diet-Safe Catalog ("Safe Mode")**: Automatically excludes beverages matching a user's allergy tags while strictly filtering by structural diets (e.g., Vegan, Vegetarian).
* **Group Coordination Systems**: Allows social circles to merge preference models, view aggregated stats, and compile cohesive requests.
* **Shopping List Workspaces**: Real-time co-authoring tools to manage shopping carts with bought/pending item toggles.
* **Analytic Engine**: Formats raw metrics directly into Open Data standards (tabular CSV arrays and dynamically drawn SVG charts).
* **Global RSS Feed**: Syndication stream for popular product rankings (`/api/rss`).
* **Open Food Facts Proxy Handler (Bonus)**: Real-time barcode ingestion mapping ingredients, macros, and certifications straight from public databases, bypassing CORS restrictions.

## 🛠️ Tech Stack

* **Backend**: Vanilla PHP 8.x
* **Database**: SQLite 3 (Zero-overhead, local execution)
* **Frontend**: HTML5, CSS3, Vanilla JavaScript (Fetch API / DOM Manipulation)
* **Architecture**: RESTful JSON API via a Front Controller pattern, Singleton DB connection, and inline MVC design.

> **Note**: No external frameworks (e.g., React, Laravel, Bootstrap) were used in the creation of this project to comply with project constraints.
