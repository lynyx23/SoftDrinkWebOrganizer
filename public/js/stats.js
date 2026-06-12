document.addEventListener('DOMContentLoaded', () => {
    
    const topRatedList = document.getElementById('topRatedList');
    const categoryStatsList = document.getElementById('categoryStatsList');

    fetch('/api/stats/popular')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderTopRated(data.data.top_rated);
                renderCategories(data.data.categories);
            } else {
                topRatedList.innerHTML = '<li class="error-message">Failed to load stats.</li>';
            }
        })
        .catch(err => {
            console.error("Error loading stats:", err);
            topRatedList.innerHTML = '<li class="error-message">A network error occurred.</li>';
        });

    function renderTopRated(items) {
        topRatedList.innerHTML = '';
        if (items.length === 0) {
            topRatedList.innerHTML = '<li class="empty-state">No ratings available yet. Go rate some drinks!</li>';
            return;
        }

        items.forEach((item, index) => {
            const rating = parseFloat(item.avg_rating).toFixed(1);
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>#${index + 1} ${item.name}</strong> (${item.category})</span>
                <span style="color:var(--washed-red); font-weight: bold;">${rating} ★ (${item.total_votes} votes)</span>
            `;
            topRatedList.appendChild(li);
        });
    }

    function renderCategories(categories) {
        categoryStatsList.innerHTML = '';
        if (categories.length === 0) {
            categoryStatsList.innerHTML = '<p class="empty-state">No products in catalog.</p>';
            return;
        }

        categories.forEach(cat => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.style.fontSize = '1.1rem';
            span.style.padding = '8px 15px';
            span.style.backgroundColor = 'var(--dark-text)';
            
            // Formatăm frumos numele categoriei (ex: "soda" -> "Soda: 5")
            const catName = cat.category ? cat.category.charAt(0).toUpperCase() + cat.category.slice(1) : 'Unknown';
            span.textContent = `${catName} (${cat.count} items)`;
            
            categoryStatsList.appendChild(span);
        });
    }
});