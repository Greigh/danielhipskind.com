document.addEventListener('DOMContentLoaded', () => {
    const state = {
        currentPage: 1,
        loading: false,
        hasMore: true
    };

    const articlesContainer = document.querySelector('.articles-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const endMessage = document.getElementById('end-message');
    const errorMessage = document.getElementById('error-message');

    async function fetchArticles(page) {
        try {
            const response = await fetch(`/demos/visual-rss-feed/api/articles?page=${page}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('[Client] Error fetching articles:', error);
            throw error;
        }
    }

    async function loadMoreArticles() {
        if (state.loading || !state.hasMore) return;

        try {
            state.loading = true;
            loadingIndicator.style.display = 'block';
            errorMessage.style.display = 'none';

            const data = await fetchArticles(state.currentPage + 1);
            
            if (data.articles?.length) {
                appendArticles(data.articles);
                state.currentPage++;
                state.hasMore = data.hasMore;
            } else {
                state.hasMore = false;
                endMessage.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading articles:', error);
            errorMessage.style.display = 'block';
        } finally {
            state.loading = false;
            loadingIndicator.style.display = 'none';
        }
    }

    function appendArticles(articles) {
        articles.forEach(article => {
            const articleEl = createArticleElement(article);
            articlesContainer.appendChild(articleEl);
        });
    }

    function createArticleElement(article) {
        const el = document.createElement('div');
        el.className = 'article';
        
        // Create image wrapper and image
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'article-image';
        const img = document.createElement('img');
        img.src = article.imageUrl || DEFAULT_IMAGE;
        img.alt = article.title || 'Article thumbnail';
        img.loading = 'lazy'; // Enable lazy loading
        img.onerror = () => {
            img.src = DEFAULT_IMAGE;
            img.onerror = null; // Prevent infinite loop
        };
        imgWrapper.appendChild(img);
        
        // Create article content wrapper
        const content = document.createElement('div');
        content.className = 'article-content';
        
        // Create title with link
        const title = document.createElement('h2');
        const titleLink = document.createElement('a');
        titleLink.href = article.link;
        titleLink.textContent = article.title;
        titleLink.target = '_blank';
        titleLink.rel = 'noopener noreferrer';
        title.appendChild(titleLink);
        
        // Create metadata section
        const meta = document.createElement('div');
        meta.className = 'article-meta';
        
        // Add score if available
        if (article.score) {
            const score = document.createElement('span');
            score.className = 'score';
            score.innerHTML = `<i class="fas fa-arrow-up"></i> ${article.score} points`;
            meta.appendChild(score);
        }
        
        // Add author with preference for original article author
        if (article.originalAuthor || article.author) {
            const author = document.createElement('span');
            author.className = 'author';
            author.textContent = `by ${article.originalAuthor || article.author}`;
            meta.appendChild(author);
        }
        
        // Add time with timezone
        if (article.formattedTime) {
            const time = document.createElement('span');
            time.className = 'time';
            time.textContent = article.formattedTime;
            meta.appendChild(time);
        }
        
        // Assemble the content
        content.appendChild(title);
        content.appendChild(meta);
        
        // Assemble the article
        el.appendChild(imgWrapper);
        el.appendChild(content);
        
        return el;
    }

    // Scroll handler
    const handleScroll = () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
            loadMoreArticles();
        }
    };

    // Add scroll event listener with debounce
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 100);
    });
});
