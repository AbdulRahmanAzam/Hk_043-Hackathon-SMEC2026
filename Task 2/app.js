// ShopSmart - Price Comparison App
// fetches products from 3 different ecommerce APIs

// dom elements - grabbing all the stuff we need
var searchInput = document.getElementById('searchInput');
var searchBtn = document.getElementById('searchBtn');
var productsGrid = document.getElementById('productsGrid');
var loader = document.getElementById('loader');
var filterSection = document.getElementById('filterSection');
var productsSection = document.getElementById('productsSection');
var noResults = document.getElementById('noResults');
var bestDealSection = document.getElementById('bestDealSection');
var resultCount = document.getElementById('resultCount');

// filter elements
var sortSelect = document.getElementById('sortBy');
var storeFilter = document.getElementById('storeFilter');
var minPriceInput = document.getElementById('minPrice');
var maxPriceInput = document.getElementById('maxPrice');
var priceFilterBtn = document.getElementById('priceFilterBtn');

// modal elements
var compareModal = document.getElementById('compareModal');
var closeModal = document.getElementById('closeModal');
var compareGrid = document.getElementById('compareGrid');

// wishlist stuff
var wishlistBtn = document.getElementById('wishlistBtn');
var wishlistPanel = document.getElementById('wishlistPanel');
var closeWishlist = document.getElementById('closeWishlist');
var wishlistItems = document.getElementById('wishlistItems');
var wishlistCountEl = document.getElementById('wishlistCount');

// store all products here after fetching
var allProducts = [];
var filteredProducts = [];
var wishlist = [];

// search history for suggestions
var searchHistory = [];

// run when page loads
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadWishlistFromStorage();
    loadSearchHistory();
});

// setup all the click handlers and stuff
function setupEventListeners() {
    // search button
    searchBtn.addEventListener('click', function() {
        doSearch();
    });
    
    // enter key to search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            doSearch();
        }
    });
    
    // category quick buttons
    var catBtns = document.querySelectorAll('.cat-btn');
    for (var i = 0; i < catBtns.length; i++) {
        catBtns[i].addEventListener('click', function() {
            searchInput.value = this.getAttribute('data-cat');
            doSearch();
        });
    }
    
    // sorting dropdown change
    sortSelect.addEventListener('change', function() {
        applyFilters();
    });
    
    // store filter dropdown
    storeFilter.addEventListener('change', function() {
        applyFilters();
    });
    
    // price filter button
    priceFilterBtn.addEventListener('click', function() {
        applyFilters();
    });
    
    // close comparison modal
    closeModal.addEventListener('click', function() {
        compareModal.classList.add('hidden');
    });
    
    // click outside modal to close
    compareModal.addEventListener('click', function(e) {
        if (e.target === compareModal) {
            compareModal.classList.add('hidden');
        }
    });
    
    // wishlist panel toggle
    wishlistBtn.addEventListener('click', function() {
        wishlistPanel.classList.toggle('hidden');
        renderWishlist();
    });
    
    closeWishlist.addEventListener('click', function() {
        wishlistPanel.classList.add('hidden');
    });
}

// main search function - this does the heavy lifting
async function doSearch() {
    var query = searchInput.value.trim();
    if (query === '') {
        alert('Please type something to search');
        return;
    }
    
    // save to history
    addToSearchHistory(query);
    
    showLoader();
    hideResults();
    
    try {
        // fetch from all 3 stores at once using Promise.all
        // this is faster than doing them one by one
        var results = await Promise.all([
            fetchFakeStore(query),
            fetchDummyJSON(query),
            fetchPlatzi(query)
        ]);
        
        // merge all results into one array
        allProducts = [];
        
        // add fakestore products
        for (var i = 0; i < results[0].length; i++) {
            allProducts.push(normalizeProduct(results[0][i], 'fakestore'));
        }
        
        // add dummyjson products
        for (var j = 0; j < results[1].length; j++) {
            allProducts.push(normalizeProduct(results[1][j], 'dummyjson'));
        }
        
        // add platzi products
        for (var k = 0; k < results[2].length; k++) {
            allProducts.push(normalizeProduct(results[2][k], 'platzi'));
        }
        
        hideLoader();
        
        // update stats
        document.getElementById('totalProducts').textContent = allProducts.length;
        
        if (allProducts.length > 0) {
            filteredProducts = allProducts.slice(); // make a copy
            showBestDeal();
            applyFilters();
            showResults();
        } else {
            showNoResults();
        }
        
    } catch (err) {
        console.log('Error during search:', err);
        hideLoader();
        showNoResults();
    }
}

// fetch products from FakeStore API
async function fetchFakeStore(query) {
    try {
        var resp = await fetch(API_CONFIG.fakestore.url);
        var data = await resp.json();
        
        // filter based on search query
        var matched = [];
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var titleLower = item.title.toLowerCase();
            var catLower = item.category.toLowerCase();
            var searchLower = query.toLowerCase();
            
            if (titleLower.indexOf(searchLower) !== -1 || catLower.indexOf(searchLower) !== -1) {
                matched.push(item);
            }
        }
        
        return matched;
    } catch (e) {
        console.log('FakeStore fetch failed:', e);
        return [];
    }
}

// fetch from DummyJSON - this one has built in search
async function fetchDummyJSON(query) {
    try {
        var url = API_CONFIG.dummyjson.url + '/search?q=' + encodeURIComponent(query);
        var resp = await fetch(url);
        var data = await resp.json();
        
        if (data.products) {
            return data.products;
        }
        return [];
    } catch (e) {
        console.log('DummyJSON fetch failed:', e);
        return [];
    }
}

// fetch from Platzi store
async function fetchPlatzi(query) {
    try {
        var resp = await fetch(API_CONFIG.platzi.url);
        var data = await resp.json();
        
        // manual filtering since no search endpoint
        var matched = [];
        var q = query.toLowerCase();
        
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (item.title.toLowerCase().indexOf(q) !== -1) {
                matched.push(item);
            }
        }
        
        // dont return too many
        if (matched.length > 20) {
            matched = matched.slice(0, 20);
        }
        
        return matched;
    } catch (e) {
        console.log('Platzi fetch failed:', e);
        return [];
    }
}

// convert products from different APIs to same format
// each api returns different structure so we normalize it
function normalizeProduct(product, source) {
    var result = {
        id: product.id,
        source: source,
        title: '',
        price: 0,
        originalPrice: 0,
        image: '',
        rating: 0,
        category: '',
        description: ''
    };
    
    // fakestore format
    if (source === 'fakestore') {
        result.title = product.title;
        result.price = product.price;
        result.originalPrice = product.price * 1.2; // fake discount
        result.image = product.image;
        result.rating = product.rating ? product.rating.rate : 4.0;
        result.category = product.category;
        result.description = product.description || '';
    }
    // dummyjson format
    else if (source === 'dummyjson') {
        result.title = product.title;
        result.price = product.price;
        // calculate original from discount percentage
        var discount = product.discountPercentage || 10;
        result.originalPrice = Math.round(product.price / (1 - discount/100));
        result.image = product.thumbnail;
        result.rating = product.rating;
        result.category = product.category;
        result.description = product.description || '';
    }
    // platzi format
    else if (source === 'platzi') {
        result.title = product.title;
        result.price = product.price;
        result.originalPrice = product.price * 1.15;
        // platzi has images array
        result.image = (product.images && product.images[0]) ? product.images[0] : '';
        // no rating in platzi so generate random
        result.rating = (Math.random() * 2 + 3).toFixed(1);
        result.category = product.category ? product.category.name : 'Other';
        result.description = product.description || '';
    }
    
    return result;
}

// apply filters and sorting to products
function applyFilters() {
    var sortVal = sortSelect.value;
    var storeVal = storeFilter.value;
    var minP = parseFloat(minPriceInput.value) || 0;
    var maxP = parseFloat(maxPriceInput.value) || 999999;
    
    // start fresh
    filteredProducts = allProducts.slice();
    
    // filter by store if not "all"
    if (storeVal !== 'all') {
        var temp = [];
        for (var i = 0; i < filteredProducts.length; i++) {
            if (filteredProducts[i].source === storeVal) {
                temp.push(filteredProducts[i]);
            }
        }
        filteredProducts = temp;
    }
    
    // filter by price range
    var temp2 = [];
    for (var j = 0; j < filteredProducts.length; j++) {
        var p = filteredProducts[j];
        if (p.price >= minP && p.price <= maxP) {
            temp2.push(p);
        }
    }
    filteredProducts = temp2;
    
    // now sort based on selection
    if (sortVal === 'lowprice') {
        filteredProducts.sort(function(a, b) {
            return a.price - b.price;
        });
    }
    else if (sortVal === 'highprice') {
        filteredProducts.sort(function(a, b) {
            return b.price - a.price;
        });
    }
    else if (sortVal === 'rating') {
        filteredProducts.sort(function(a, b) {
            return parseFloat(b.rating) - parseFloat(a.rating);
        });
    }
    else if (sortVal === 'name') {
        filteredProducts.sort(function(a, b) {
            return a.title.localeCompare(b.title);
        });
    }
    // bestmatch = no sorting, keep original
    
    // update the count text
    resultCount.textContent = filteredProducts.length + ' products found';
    
    // render the cards
    renderProducts();
}

// find lowest price item and display in banner
function showBestDeal() {
    if (allProducts.length === 0) {
        bestDealSection.classList.add('hidden');
        return;
    }
    
    // find cheapest
    var cheapest = allProducts[0];
    for (var i = 1; i < allProducts.length; i++) {
        if (allProducts[i].price < cheapest.price) {
            cheapest = allProducts[i];
        }
    }
    
    // find most expensive for savings calc
    var expensive = allProducts[0];
    for (var j = 1; j < allProducts.length; j++) {
        if (allProducts[j].price > expensive.price) {
            expensive = allProducts[j];
        }
    }
    
    var saved = expensive.price - cheapest.price;
    
    // update the banner
    document.getElementById('bestDealImg').src = cheapest.image;
    document.getElementById('bestDealTitle').textContent = cheapest.title;
    document.getElementById('bestDealStore').textContent = 'from ' + API_CONFIG[cheapest.source].name;
    document.getElementById('bestDealPrice').textContent = '$' + cheapest.price.toFixed(2);
    document.getElementById('bestDealSavings').textContent = 'Save $' + saved.toFixed(2) + ' compared to highest price';
    
    bestDealSection.classList.remove('hidden');
}

// render product cards in grid
function renderProducts() {
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    // find lowest price for marking
    var lowestPrice = filteredProducts[0].price;
    for (var i = 1; i < filteredProducts.length; i++) {
        if (filteredProducts[i].price < lowestPrice) {
            lowestPrice = filteredProducts[i].price;
        }
    }
    
    var html = '';
    
    for (var j = 0; j < filteredProducts.length; j++) {
        var prod = filteredProducts[j];
        var isBest = (prod.price === lowestPrice);
        var isInWishlist = checkIfInWishlist(prod);
        var starsHtml = generateStars(prod.rating);
        
        html += '<div class="product-card ' + (isBest ? 'best-price' : '') + '">';
        html += '  <div class="img-wrap">';
        html += '    <img src="' + prod.image + '" alt="Product" onerror="this.src=\'https://via.placeholder.com/200x200?text=No+Image\'">';
        if (isBest) {
            html += '    <span class="best-tag">Best Price</span>';
        }
        html += '    <button class="wishlist-btn ' + (isInWishlist ? 'active' : '') + '" onclick="toggleWishlist(' + prod.id + ', \'' + prod.source + '\')">';
        html += '      <i class="' + (isInWishlist ? 'fas' : 'far') + ' fa-heart"></i>';
        html += '    </button>';
        html += '  </div>';
        html += '  <div class="card-body">';
        html += '    <span class="store-badge ' + prod.source + '">' + API_CONFIG[prod.source].name + '</span>';
        html += '    <h3 class="title">' + prod.title + '</h3>';
        html += '    <div class="rating">' + starsHtml + ' <span>(' + prod.rating + ')</span></div>';
        html += '    <div class="price-row">';
        html += '      <span class="price">$' + prod.price.toFixed(2) + '</span>';
        html += '      <span class="old-price">$' + prod.originalPrice.toFixed(2) + '</span>';
        html += '    </div>';
        html += '    <button class="card-btn" onclick="compareProduct(\'' + escapeQuotes(prod.title) + '\')">Compare Prices</button>';
        html += '  </div>';
        html += '</div>';
    }
    
    productsGrid.innerHTML = html;
}

// escape quotes in title for onclick
function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// generate star rating html
function generateStars(rating) {
    var stars = '';
    var full = Math.floor(rating);
    var half = (rating % 1) >= 0.5;
    
    for (var i = 0; i < full; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (half) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    var empty = 5 - full - (half ? 1 : 0);
    for (var j = 0; j < empty; j++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// open comparison modal for a product
function compareProduct(title) {
    // find all products with similar names
    var similar = [];
    var firstWord = title.toLowerCase().split(' ')[0];
    
    for (var i = 0; i < allProducts.length; i++) {
        var p = allProducts[i];
        if (p.title.toLowerCase().indexOf(firstWord) !== -1) {
            similar.push(p);
        }
    }
    
    if (similar.length < 2) {
        alert('No comparison available - only found in one store');
        return;
    }
    
    // sort by price low to high
    similar.sort(function(a, b) {
        return a.price - b.price;
    });
    
    var lowestP = similar[0].price;
    
    // build modal content
    var html = '';
    for (var j = 0; j < similar.length; j++) {
        var item = similar[j];
        var isLowest = (item.price === lowestP);
        
        html += '<div class="compare-item ' + (isLowest ? 'lowest' : '') + '">';
        html += '  <img src="' + item.image + '" alt="Product">';
        html += '  <div class="store">' + API_CONFIG[item.source].name + '</div>';
        html += '  <div class="cmp-price">$' + item.price.toFixed(2) + '</div>';
        if (isLowest) {
            html += '  <span style="color:#27ae60;font-size:12px;">Lowest!</span>';
        }
        html += '</div>';
    }
    
    compareGrid.innerHTML = html;
    compareModal.classList.remove('hidden');
}

// wishlist functions
function toggleWishlist(productId, source) {
    var key = source + '-' + productId;
    var idx = -1;
    
    for (var i = 0; i < wishlist.length; i++) {
        if (wishlist[i].key === key) {
            idx = i;
            break;
        }
    }
    
    if (idx !== -1) {
        // remove from wishlist
        wishlist.splice(idx, 1);
    } else {
        // add to wishlist
        var prod = findProduct(productId, source);
        if (prod) {
            wishlist.push({
                key: key,
                product: prod
            });
        }
    }
    
    saveWishlistToStorage();
    updateWishlistCount();
    renderProducts(); // refresh cards to update heart icons
}

function findProduct(id, source) {
    for (var i = 0; i < allProducts.length; i++) {
        if (allProducts[i].id === id && allProducts[i].source === source) {
            return allProducts[i];
        }
    }
    return null;
}

function checkIfInWishlist(product) {
    var key = product.source + '-' + product.id;
    for (var i = 0; i < wishlist.length; i++) {
        if (wishlist[i].key === key) {
            return true;
        }
    }
    return false;
}

function updateWishlistCount() {
    wishlistCountEl.textContent = wishlist.length;
}

function renderWishlist() {
    if (wishlist.length === 0) {
        wishlistItems.innerHTML = '<p class="empty-wishlist">Your wishlist is empty</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < wishlist.length; i++) {
        var p = wishlist[i].product;
        html += '<div class="wishlist-item">';
        html += '  <img src="' + p.image + '" alt="">';
        html += '  <div class="wish-info">';
        html += '    <p class="wish-title">' + p.title.substring(0, 30) + '...</p>';
        html += '    <p class="wish-price">$' + p.price.toFixed(2) + '</p>';
        html += '  </div>';
        html += '  <button onclick="removeFromWishlist(\'' + wishlist[i].key + '\')">&times;</button>';
        html += '</div>';
    }
    
    wishlistItems.innerHTML = html;
}

function removeFromWishlist(key) {
    for (var i = 0; i < wishlist.length; i++) {
        if (wishlist[i].key === key) {
            wishlist.splice(i, 1);
            break;
        }
    }
    saveWishlistToStorage();
    updateWishlistCount();
    renderWishlist();
    renderProducts();
}

// localStorage stuff for wishlist
function saveWishlistToStorage() {
    try {
        localStorage.setItem('shopsmart_wishlist', JSON.stringify(wishlist));
    } catch(e) {
        console.log('Could not save wishlist');
    }
}

function loadWishlistFromStorage() {
    try {
        var saved = localStorage.getItem('shopsmart_wishlist');
        if (saved) {
            wishlist = JSON.parse(saved);
            updateWishlistCount();
        }
    } catch(e) {
        wishlist = [];
    }
}

// search history
function addToSearchHistory(query) {
    if (searchHistory.indexOf(query) === -1) {
        searchHistory.unshift(query);
        if (searchHistory.length > 10) {
            searchHistory.pop();
        }
        saveSearchHistory();
    }
}

function saveSearchHistory() {
    try {
        localStorage.setItem('shopsmart_history', JSON.stringify(searchHistory));
    } catch(e) {}
}

function loadSearchHistory() {
    try {
        var saved = localStorage.getItem('shopsmart_history');
        if (saved) {
            searchHistory = JSON.parse(saved);
        }
    } catch(e) {
        searchHistory = [];
    }
}

// helper functions for showing/hiding stuff
function showLoader() {
    loader.classList.remove('hidden');
}

function hideLoader() {
    loader.classList.add('hidden');
}

function showResults() {
    filterSection.classList.remove('hidden');
    productsSection.classList.remove('hidden');
}

function hideResults() {
    filterSection.classList.add('hidden');
    productsSection.classList.add('hidden');
    bestDealSection.classList.add('hidden');
    noResults.classList.add('hidden');
}

function showNoResults() {
    noResults.classList.remove('hidden');
}
