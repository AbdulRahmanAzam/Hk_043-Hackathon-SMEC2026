/**
 * UniRide Karachi - Premium Application
 * Smart University Carpooling Platform
 */

// App State
const AppState = {
    user: null,
    token: null,
    currentView: 'home',
    selectedRide: null,
    searchResults: [],
    maps: {},
    markers: {},
    selectedSeats: 1,
    pickupPoints: [],
    platformStats: {
        co2Saved: 0,
        totalRides: 0,
        totalUsers: 0
    }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Initialize the application
 */
async function initApp() {
    console.log('🚗 UniRide Karachi - Initializing...');
    
    // Check for saved auth
    const savedToken = localStorage.getItem('uniride_token');
    const savedUser = localStorage.getItem('uniride_user');
    
    if (savedToken && savedUser) {
        AppState.token = savedToken;
        AppState.user = JSON.parse(savedUser);
        API.setToken(savedToken);
        updateUIForLoggedInUser();
    }
    
    // Initialize components
    initNavigation();
    initAuthModal();
    initUserDropdown();
    initThemeToggle();
    initSearchForm();
    initPostRideForm();
    initBookingActions();
    
    // Load initial data
    await loadPickupPoints();
    await loadPlatformStats();
    
    // Initialize maps after a short delay
    setTimeout(() => {
        initMaps();
        hideLoadingScreen();
    }, 1500);
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

/**
 * Initialize navigation
 */
function initNavigation() {
    // Nav links
    document.querySelectorAll('.nav-link, [data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;
            if (view) {
                navigateTo(view);
            }
        });
    });
    
    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const backTo = btn.dataset.back || 'home';
            navigateTo(backTo);
        });
    });
}

/**
 * Navigate to a view
 */
function navigateTo(viewName) {
    // Check auth for protected views
    const protectedViews = ['post', 'my-rides', 'bookings', 'dashboard', 'profile', 'safety'];
    if (protectedViews.includes(viewName) && !AppState.user) {
        showAuthModal();
        return;
    }
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show target view
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.classList.add('active');
        AppState.currentView = viewName;
        
        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        
        // Load view-specific data
        onViewEnter(viewName);
    }
}

/**
 * Handle view-specific initialization
 */
async function onViewEnter(viewName) {
    switch (viewName) {
        case 'home':
            if (AppState.maps.home) {
                AppState.maps.home.resize();
            }
            break;
        case 'search':
            if (AppState.maps.search) {
                AppState.maps.search.resize();
            }
            break;
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'my-rides':
            await loadMyRides();
            break;
        case 'bookings':
            await loadMyBookings();
            break;
        case 'profile':
            loadProfileData();
            break;
        case 'safety':
            await loadSafetyData();
            break;
    }
}

/**
 * Initialize maps
 */
function initMaps() {
    if (typeof mapboxgl === 'undefined') {
        console.error('Mapbox GL JS not loaded');
        return;
    }
    
    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;
    
    // Home map
    const homeMapContainer = document.getElementById('home-map');
    if (homeMapContainer) {
        AppState.maps.home = new mapboxgl.Map({
            container: 'home-map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [67.0011, 24.8607], // Karachi center
            zoom: 11
        });
        
        AppState.maps.home.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
        
        // Add markers for popular pickups
        AppState.pickupPoints.forEach(pickup => {
            const marker = new mapboxgl.Marker({ color: '#10B981' })
                .setLngLat([pickup.lng, pickup.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`<strong>${pickup.name}</strong><br>${pickup.address}`))
                .addTo(AppState.maps.home);
        });
    }
    
    // Search results map
    const searchMapContainer = document.getElementById('search-map');
    if (searchMapContainer) {
        AppState.maps.search = new mapboxgl.Map({
            container: 'search-map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [67.0011, 24.8607],
            zoom: 11
        });
        
        AppState.maps.search.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    }
}

/**
 * Initialize auth modal
 */
function initAuthModal() {
    const modal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('login-btn');
    const closeBtn = document.getElementById('close-auth-modal');
    const authTabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    loginBtn?.addEventListener('click', showAuthModal);
    closeBtn?.addEventListener('click', hideAuthModal);
    
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) hideAuthModal();
    });
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            authTabs.forEach(t => t.classList.toggle('active', t === tab));
            loginForm?.classList.toggle('hidden', targetTab !== 'login');
            registerForm?.classList.toggle('hidden', targetTab !== 'register');
        });
    });
    
    loginForm?.addEventListener('submit', handleLogin);
    registerForm?.addEventListener('submit', handleRegister);
}

/**
 * Show auth modal
 */
function showAuthModal() {
    document.getElementById('auth-modal')?.classList.add('show');
}

/**
 * Hide auth modal
 */
function hideAuthModal() {
    document.getElementById('auth-modal')?.classList.remove('show');
}

/**
 * Handle login
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await API.login(email, password);
        
        if (response.success) {
            AppState.token = response.data.token;
            AppState.user = response.data.user;
            
            localStorage.setItem('uniride_token', response.data.token);
            localStorage.setItem('uniride_user', JSON.stringify(response.data.user));
            
            API.setToken(response.data.token);
            updateUIForLoggedInUser();
            hideAuthModal();
            showToast('Welcome back! 🚗', 'success');
        } else {
            showToast(response.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    }
}

/**
 * Handle registration
 */
async function handleRegister(e) {
    e.preventDefault();
    
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    const data = {
        email: document.getElementById('register-email').value,
        password: password,
        name: document.getElementById('register-name').value,
        university: document.getElementById('register-university').value,
        department: document.getElementById('register-department').value,
        role: document.getElementById('register-role').value
    };
    
    try {
        const response = await API.register(data);
        
        if (response.success) {
            AppState.token = response.data.token;
            AppState.user = response.data.user;
            
            localStorage.setItem('uniride_token', response.data.token);
            localStorage.setItem('uniride_user', JSON.stringify(response.data.user));
            
            API.setToken(response.data.token);
            updateUIForLoggedInUser();
            hideAuthModal();
            showToast('Account created! Welcome to UniRide 🎉', 'success');
        } else {
            showToast(response.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed. Please try again.', 'error');
    }
}

/**
 * Update UI for logged in user
 */
function updateUIForLoggedInUser() {
    const userMenu = document.getElementById('user-menu');
    const userProfile = document.getElementById('user-profile');
    
    if (AppState.user) {
        userMenu?.classList.add('hidden');
        userProfile?.classList.remove('hidden');
        
        // Set initials
        const initials = AppState.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.querySelectorAll('.avatar-initials, #profile-initials').forEach(el => {
            el.textContent = initials.substring(0, 2);
        });
        
        // Set dropdown info
        document.getElementById('dropdown-name').textContent = AppState.user.name;
        document.getElementById('dropdown-email').textContent = AppState.user.email;
        
        // Update streak badge
        document.getElementById('streak-badge').querySelector('.streak-count').textContent = 
            AppState.user.current_streak || 0;
        
        // Show/hide driver features
        const canDrive = AppState.user.role === 'driver' || AppState.user.role === 'both';
        document.getElementById('nav-post')?.classList.toggle('hidden', !canDrive);
    }
}

/**
 * Initialize user dropdown
 */
function initUserDropdown() {
    const avatarBtn = document.getElementById('avatar-btn');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    
    avatarBtn?.addEventListener('click', () => {
        dropdown?.classList.toggle('show');
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-profile')) {
            dropdown?.classList.remove('show');
        }
    });
    
    logoutBtn?.addEventListener('click', handleLogout);
}

/**
 * Handle logout
 */
function handleLogout() {
    AppState.user = null;
    AppState.token = null;
    localStorage.removeItem('uniride_token');
    localStorage.removeItem('uniride_user');
    API.setToken(null);
    
    document.getElementById('user-menu')?.classList.remove('hidden');
    document.getElementById('user-profile')?.classList.add('hidden');
    document.getElementById('user-dropdown')?.classList.remove('show');
    
    navigateTo('home');
    showToast('Logged out successfully', 'info');
}

/**
 * Initialize theme toggle
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('uniride_theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('uniride_theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-toggle')?.querySelector('span');
    if (icon) {
        icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

/**
 * Initialize search form
 */
function initSearchForm() {
    const findRidesBtn = document.getElementById('find-rides-btn');
    const locateBtn = document.getElementById('locate-me');
    const quickDate = document.getElementById('quick-date');
    
    // Set default date to today
    if (quickDate) {
        quickDate.value = new Date().toISOString().split('T')[0];
    }
    
    findRidesBtn?.addEventListener('click', handleSearch);
    locateBtn?.addEventListener('click', getCurrentLocation);
    
    // Sort dropdown
    document.getElementById('sort-rides')?.addEventListener('change', (e) => {
        sortSearchResults(e.target.value);
    });
}

/**
 * Get current location
 */
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Check if within Karachi bounds
            if (latitude < 24.7 || latitude > 25.6 || longitude < 66.7 || longitude > 67.6) {
                showToast('Location must be within Karachi', 'error');
                return;
            }
            
            // Reverse geocode
            try {
                const response = await fetch(
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${CONFIG.MAPBOX_TOKEN}`
                );
                const data = await response.json();
                
                if (data.features && data.features.length > 0) {
                    document.getElementById('quick-from').value = data.features[0].place_name;
                    document.getElementById('quick-from').dataset.lat = latitude;
                    document.getElementById('quick-from').dataset.lng = longitude;
                    showToast('Location found!', 'success');
                }
            } catch (error) {
                console.error('Geocoding error:', error);
                showToast('Could not get address', 'error');
            }
        },
        (error) => {
            showToast('Could not get location', 'error');
        }
    );
}

/**
 * Handle ride search
 */
async function handleSearch() {
    const fromInput = document.getElementById('quick-from');
    const toInput = document.getElementById('quick-to');
    const dateInput = document.getElementById('quick-date');
    const timeInput = document.getElementById('quick-time');
    
    // Build search params
    const params = {
        date: dateInput?.value,
        radius: 3
    };
    
    if (fromInput?.dataset.lat && fromInput?.dataset.lng) {
        params.source_lat = fromInput.dataset.lat;
        params.source_lng = fromInput.dataset.lng;
    }
    
    if (toInput?.dataset.lat && toInput?.dataset.lng) {
        params.destination_lat = toInput.dataset.lat;
        params.destination_lng = toInput.dataset.lng;
    }
    
    if (timeInput?.value) {
        params.time_from = timeInput.value;
    }
    
    // Navigate to search view
    navigateTo('search');
    
    // Show loading state
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = `
        <div class="ride-card skeleton">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-40"></div>
        </div>
        <div class="ride-card skeleton">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-80"></div>
            <div class="skeleton-line w-40"></div>
        </div>
    `;
    
    try {
        const response = await API.searchRides(params);
        
        if (response.success) {
            AppState.searchResults = response.data.rides;
            renderSearchResults(response.data.rides);
            
            // Update map with results
            updateSearchMap(response.data.rides);
        } else {
            showToast(response.message || 'Search failed', 'error');
        }
    } catch (error) {
        console.error('Search error:', error);
        showToast('Failed to search rides', 'error');
    }
}

/**
 * Render search results
 */
function renderSearchResults(rides) {
    const resultsList = document.getElementById('results-list');
    const resultsSummary = document.getElementById('results-summary');
    
    resultsSummary.innerHTML = `<span class="results-count">${rides.length} rides found</span>`;
    
    if (rides.length === 0) {
        resultsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <h3>No rides found</h3>
                <p>Try adjusting your search criteria or check back later</p>
            </div>
        `;
        return;
    }
    
    resultsList.innerHTML = rides.map(ride => `
        <div class="ride-card" data-ride-id="${ride.id}" onclick="selectRide('${ride.id}')">
            <div class="ride-card-header">
                <span class="match-score-badge">
                    <span>⭐</span>
                    <span>${ride.matchScore || 75}% match</span>
                </span>
            </div>
            <div class="ride-route">
                <div class="route-point">
                    <div class="point-marker start"></div>
                    <span class="point-text">${truncateText(ride.source_address, 40)}</span>
                </div>
                <div class="route-connector"></div>
                <div class="route-point">
                    <div class="point-marker end"></div>
                    <span class="point-text">${truncateText(ride.destination_address, 40)}</span>
                </div>
            </div>
            <div class="ride-meta-row">
                <span><span class="meta-icon">📅</span>${formatDate(ride.departure_date)}</span>
                <span><span class="meta-icon">⏰</span>${ride.departure_time}</span>
                <span><span class="meta-icon">💺</span>${ride.available_seats} seats</span>
                ${ride.fuel_split_price ? `<span><span class="meta-icon">💵</span>PKR ${ride.fuel_split_price}</span>` : ''}
            </div>
            <div class="ride-footer">
                <div class="driver-preview">
                    <div class="driver-avatar-sm">${getInitials(ride.driver_name)}</div>
                    <span class="driver-name-sm">${ride.driver_name}</span>
                    <span class="driver-rating-sm">⭐ ${ride.driver_rating?.toFixed(1) || 'New'}</span>
                </div>
                ${ride.carbonImpact ? `
                    <span class="carbon-badge">
                        <span>🌱</span>
                        <span>${ride.carbonImpact.co2Saved?.toFixed(1) || 0}kg CO₂</span>
                    </span>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Select a ride and show details
 */
async function selectRide(rideId) {
    // Highlight selected card
    document.querySelectorAll('.ride-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.rideId === rideId);
    });
    
    try {
        const response = await API.getRide(rideId);
        
        if (response.success) {
            AppState.selectedRide = response.data.ride;
            showRideDetailSheet(response.data.ride);
        }
    } catch (error) {
        console.error('Get ride error:', error);
        showToast('Failed to load ride details', 'error');
    }
}

/**
 * Show ride detail bottom sheet
 */
function showRideDetailSheet(ride) {
    const sheet = document.getElementById('ride-detail-sheet');
    
    // Update match badge
    const matchScore = ride.matchScore || 75;
    document.getElementById('detail-match-badge').innerHTML = `
        <span class="match-icon">${matchScore >= 90 ? '🌟' : matchScore >= 70 ? '⭐' : '✨'}</span>
        <span class="match-score">${matchScore}%</span>
        <span class="match-label">Match</span>
    `;
    
    // Update route info
    document.getElementById('detail-source').textContent = ride.source_address;
    document.getElementById('detail-destination').textContent = ride.destination_address;
    
    // Update meta
    document.getElementById('detail-date').textContent = formatDate(ride.departure_date);
    document.getElementById('detail-time').textContent = ride.departure_time;
    document.getElementById('detail-seats').textContent = `${ride.available_seats} available`;
    document.getElementById('detail-price').textContent = ride.fuel_split_price ? `PKR ${ride.fuel_split_price}` : 'Free';
    
    // Update driver info
    document.getElementById('detail-driver-avatar').textContent = getInitials(ride.driver_name);
    document.getElementById('detail-driver-name').textContent = ride.driver_name;
    document.getElementById('detail-driver-uni').textContent = ride.driver_university;
    document.getElementById('detail-driver-rating').textContent = ride.driver_rating?.toFixed(1) || 'New';
    document.getElementById('detail-driver-rides').textContent = `(${ride.driver_rides_completed || 0} rides)`;
    
    // Trust score
    const trustScore = ride.driverTrustInfo?.trustScore || 75;
    document.getElementById('detail-trust-score').textContent = trustScore;
    document.getElementById('detail-trust-fill').style.width = `${trustScore}%`;
    
    // Vehicle info
    if (ride.vehicleInfo && (ride.vehicleInfo.make || ride.vehicleInfo.model)) {
        document.getElementById('detail-vehicle').innerHTML = `
            <span class="vehicle-icon">🚗</span>
            <span class="vehicle-text">${ride.vehicleInfo.make || ''} ${ride.vehicleInfo.model || ''} • ${ride.vehicleInfo.color || 'Unknown'} • ${ride.vehicleInfo.plate || 'N/A'}</span>
        `;
    }
    
    // Carbon impact
    if (ride.carbonImpact) {
        document.getElementById('detail-co2').textContent = ride.carbonImpact.co2Saved?.toFixed(2) || '0';
        document.getElementById('detail-trees').textContent = ride.carbonImpact.treesEquivalent?.toFixed(2) || '0';
    }
    
    // Safety tips
    if (ride.safetyTips) {
        document.getElementById('detail-safety-tips').querySelector('.tips-list').innerHTML = 
            ride.safetyTips.map(tip => `<li>${tip}</li>`).join('');
    }
    
    // Update seat buttons
    const seatBtns = document.querySelectorAll('.seat-btn');
    seatBtns.forEach(btn => {
        const seats = parseInt(btn.dataset.seats);
        btn.disabled = seats > ride.available_seats;
        btn.classList.toggle('active', seats === AppState.selectedSeats && seats <= ride.available_seats);
    });
    
    // Show sheet
    sheet.classList.add('show');
}

/**
 * Initialize booking actions
 */
function initBookingActions() {
    // Close detail sheet
    document.getElementById('close-detail')?.addEventListener('click', () => {
        document.getElementById('ride-detail-sheet').classList.remove('show');
    });
    
    // Seat selection
    document.querySelectorAll('.seat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            document.querySelectorAll('.seat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.selectedSeats = parseInt(btn.dataset.seats);
        });
    });
    
    // Book ride button
    document.getElementById('book-ride-btn')?.addEventListener('click', handleBookRide);
}

/**
 * Handle ride booking
 */
async function handleBookRide() {
    if (!AppState.user) {
        showAuthModal();
        return;
    }
    
    if (!AppState.selectedRide) {
        showToast('Please select a ride', 'error');
        return;
    }
    
    const bookBtn = document.getElementById('book-ride-btn');
    bookBtn.disabled = true;
    bookBtn.innerHTML = '<span>⏳</span> Booking...';
    
    try {
        const response = await API.bookRide(AppState.selectedRide.id, AppState.selectedSeats);
        
        if (response.success) {
            showToast('Ride booked successfully! 🎉', 'success');
            document.getElementById('ride-detail-sheet').classList.remove('show');
            
            // Refresh search if we're on search view
            if (AppState.currentView === 'search') {
                handleSearch();
            }
        } else {
            showToast(response.message || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToast('Failed to book ride. Please try again.', 'error');
    } finally {
        bookBtn.disabled = false;
        bookBtn.innerHTML = '<span>✓</span> Book This Ride';
    }
}

/**
 * Initialize post ride form
 */
function initPostRideForm() {
    const form = document.getElementById('post-ride-form');
    const dateInput = document.getElementById('post-date');
    
    // Set min date to today
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
    }
    
    form?.addEventListener('submit', handlePostRide);
    
    // Map pick buttons
    document.querySelectorAll('.map-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            // TODO: Open map picker modal
            showToast('Click on map to pick location (feature coming soon)', 'info');
        });
    });
}

/**
 * Handle post ride
 */
async function handlePostRide(e) {
    e.preventDefault();
    
    const data = {
        source_address: document.getElementById('post-source').value,
        source_lat: parseFloat(document.getElementById('post-source-lat').value) || 24.8607,
        source_lng: parseFloat(document.getElementById('post-source-lng').value) || 67.0011,
        destination_address: document.getElementById('post-destination').value,
        destination_lat: parseFloat(document.getElementById('post-destination-lat').value) || 24.9338,
        destination_lng: parseFloat(document.getElementById('post-destination-lng').value) || 67.1106,
        departure_date: document.getElementById('post-date').value,
        departure_time: document.getElementById('post-time').value,
        total_seats: parseInt(document.getElementById('post-seats').value),
        fuel_split_price: parseFloat(document.getElementById('post-price').value) || null,
        ride_rules: document.getElementById('post-rules').value
    };
    
    try {
        const response = await API.createRide(data);
        
        if (response.success) {
            showToast('Ride posted successfully! 🚗', 'success');
            e.target.reset();
            navigateTo('my-rides');
        } else {
            showToast(response.message || 'Failed to post ride', 'error');
        }
    } catch (error) {
        console.error('Post ride error:', error);
        showToast('Failed to post ride. Please try again.', 'error');
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    try {
        // Load carbon dashboard
        const carbonResponse = await API.getCarbonDashboard();
        if (carbonResponse.success) {
            updateCarbonDashboard(carbonResponse.data);
        }
        
        // Load gamification stats
        const gamificationResponse = await API.getGamificationStats();
        if (gamificationResponse.success) {
            updateGamificationStats(gamificationResponse.data);
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

/**
 * Update carbon dashboard UI
 */
function updateCarbonDashboard(data) {
    const userStats = data.userStats || {};
    
    document.getElementById('dash-co2').textContent = (userStats.totalCo2Saved || 0).toFixed(1);
    document.getElementById('dash-trees').textContent = (userStats.treesEquivalent || 0).toFixed(1);
    document.getElementById('dash-savings').textContent = `PKR ${Math.round(userStats.moneySaved || 0)}`;
    document.getElementById('dash-distance').textContent = `${(userStats.totalDistance || 0).toFixed(0)} km`;
    
    // Animate progress circle
    const progress = Math.min((userStats.totalCo2Saved || 0) / 100, 1);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference * (1 - progress);
    document.getElementById('carbon-progress')?.setAttribute('stroke-dashoffset', offset);
    
    // Update message based on impact
    const message = userStats.totalCo2Saved >= 100 
        ? '🌟 Amazing impact! Keep it up!'
        : userStats.totalCo2Saved >= 50 
            ? '🎯 Great progress! Halfway to 100kg!'
            : 'Start carpooling to make an impact!';
    document.getElementById('carbon-message').textContent = message;
}

/**
 * Update gamification stats UI
 */
function updateGamificationStats(data) {
    // Update badges
    const badgesGrid = document.getElementById('badges-grid');
    if (badgesGrid && data.badges) {
        const badgeTypes = ['eco_starter', 'eco_warrior', 'reliable_rider', 'weekly_warrior'];
        const earnedTypes = data.badges.map(b => b.type);
        
        badgesGrid.innerHTML = badgeTypes.map(type => {
            const badge = data.badges.find(b => b.type === type);
            const isEarned = earnedTypes.includes(type);
            const defaultBadge = {
                eco_starter: { icon: '🌱', name: 'Eco Starter' },
                eco_warrior: { icon: '🌍', name: 'Eco Warrior' },
                reliable_rider: { icon: '⭐', name: 'Reliable' },
                weekly_warrior: { icon: '🔥', name: 'Streak 7' }
            };
            const display = badge || defaultBadge[type];
            
            return `
                <div class="badge-item ${isEarned ? '' : 'locked'}">
                    <span class="badge-icon">${display?.icon || '🏆'}</span>
                    <span class="badge-name">${display?.name || type}</span>
                </div>
            `;
        }).join('');
    }
    
    // Update next milestone
    if (data.nextMilestones && data.nextMilestones.length > 0) {
        const milestone = data.nextMilestones[0];
        document.getElementById('next-milestone-icon').textContent = milestone.icon;
        document.getElementById('next-milestone-name').textContent = milestone.badge;
        document.getElementById('milestone-progress').style.width = `${(milestone.progress / milestone.target) * 100}%`;
        document.getElementById('milestone-text').textContent = `${milestone.progress}/${milestone.target}`;
    }
    
    // Update leaderboard
    if (data.leaderboards && data.leaderboards.co2) {
        updateLeaderboard(data.leaderboards.co2, 'co2');
    }
    
    // Update user rank
    if (data.userRanks) {
        document.getElementById('your-rank').textContent = `#${data.userRanks.co2 || '--'}`;
    }
}

/**
 * Update leaderboard
 */
function updateLeaderboard(entries, type) {
    const list = document.getElementById('leaderboard-list');
    if (!list || !entries) return;
    
    const ranks = ['🥇', '🥈', '🥉'];
    
    list.innerHTML = entries.slice(0, 3).map((entry, index) => `
        <div class="leaderboard-item rank-${index + 1}">
            <span class="rank">${ranks[index]}</span>
            <span class="name">${entry.name}</span>
            <span class="value">${entry.value?.toFixed(1) || 0} ${entry.unit || ''}</span>
        </div>
    `).join('');
}

/**
 * Load my rides
 */
async function loadMyRides(status = 'active') {
    try {
        const response = await API.getMyRides(status);
        
        if (response.success) {
            renderMyRides(response.data.rides);
        }
    } catch (error) {
        console.error('Load rides error:', error);
    }
}

/**
 * Render my rides
 */
function renderMyRides(rides) {
    const list = document.getElementById('my-rides-list');
    
    if (!rides || rides.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🚗</span>
                <h3>No rides yet</h3>
                <p>Post a ride to get started</p>
                <button class="btn btn-primary" onclick="navigateTo('post')">Post a Ride</button>
            </div>
        `;
        return;
    }
    
    list.innerHTML = rides.map(ride => `
        <div class="ride-card" data-ride-id="${ride.id}">
            <div class="ride-route">
                <div class="route-point">
                    <div class="point-marker start"></div>
                    <span class="point-text">${truncateText(ride.source_address, 40)}</span>
                </div>
                <div class="route-connector"></div>
                <div class="route-point">
                    <div class="point-marker end"></div>
                    <span class="point-text">${truncateText(ride.destination_address, 40)}</span>
                </div>
            </div>
            <div class="ride-meta-row">
                <span><span class="meta-icon">📅</span>${formatDate(ride.departure_date)}</span>
                <span><span class="meta-icon">⏰</span>${ride.departure_time}</span>
                <span><span class="meta-icon">💺</span>${ride.available_seats}/${ride.total_seats} seats</span>
                <span><span class="meta-icon">👥</span>${ride.total_bookings || 0} bookings</span>
            </div>
            <div class="ride-footer">
                <span class="status-badge ${ride.status}">${ride.status}</span>
                ${ride.status === 'active' ? `
                    <div>
                        <button class="btn btn-sm btn-secondary" onclick="completeRide('${ride.id}')">Complete</button>
                        <button class="btn btn-sm btn-danger" onclick="cancelRide('${ride.id}')">Cancel</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Complete a ride
 */
async function completeRide(rideId) {
    if (!confirm('Mark this ride as completed?')) return;
    
    try {
        const response = await API.completeRide(rideId);
        
        if (response.success) {
            showToast('Ride completed! 🎉', 'success');
            
            if (response.data.newBadges && response.data.newBadges.length > 0) {
                response.data.newBadges.forEach(badge => {
                    showToast(`New badge earned: ${badge.name} ${badge.icon}`, 'success');
                });
            }
            
            loadMyRides();
        } else {
            showToast(response.message || 'Failed to complete ride', 'error');
        }
    } catch (error) {
        console.error('Complete ride error:', error);
        showToast('Failed to complete ride', 'error');
    }
}

/**
 * Cancel a ride
 */
async function cancelRide(rideId) {
    if (!confirm('Are you sure you want to cancel this ride?')) return;
    
    try {
        const response = await API.cancelRide(rideId);
        
        if (response.success) {
            showToast('Ride cancelled', 'info');
            loadMyRides();
        } else {
            showToast(response.message || 'Failed to cancel ride', 'error');
        }
    } catch (error) {
        console.error('Cancel ride error:', error);
        showToast('Failed to cancel ride', 'error');
    }
}

/**
 * Load my bookings
 */
async function loadMyBookings(status = 'upcoming') {
    try {
        const response = await API.getMyBookings();
        
        if (response.success) {
            // Filter by status
            let bookings = response.data.bookings;
            if (status === 'upcoming') {
                bookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
            } else {
                bookings = bookings.filter(b => b.status === status);
            }
            renderMyBookings(bookings);
        }
    } catch (error) {
        console.error('Load bookings error:', error);
    }
}

/**
 * Render my bookings
 */
function renderMyBookings(bookings) {
    const list = document.getElementById('my-bookings-list');
    
    if (!bookings || bookings.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📅</span>
                <h3>No bookings yet</h3>
                <p>Find a ride to get started</p>
                <button class="btn btn-primary" onclick="navigateTo('search')">Find a Ride</button>
            </div>
        `;
        return;
    }
    
    list.innerHTML = bookings.map(booking => `
        <div class="ride-card">
            <div class="ride-route">
                <div class="route-point">
                    <div class="point-marker start"></div>
                    <span class="point-text">${truncateText(booking.ride_source_address, 40)}</span>
                </div>
                <div class="route-connector"></div>
                <div class="route-point">
                    <div class="point-marker end"></div>
                    <span class="point-text">${truncateText(booking.ride_destination_address, 40)}</span>
                </div>
            </div>
            <div class="ride-meta-row">
                <span><span class="meta-icon">📅</span>${formatDate(booking.ride_departure_date)}</span>
                <span><span class="meta-icon">⏰</span>${booking.ride_departure_time}</span>
                <span><span class="meta-icon">💺</span>${booking.seats_booked} seat(s)</span>
            </div>
            <div class="ride-footer">
                <div class="driver-preview">
                    <div class="driver-avatar-sm">${getInitials(booking.driver_name)}</div>
                    <span class="driver-name-sm">${booking.driver_name}</span>
                </div>
                <span class="status-badge ${booking.status}">${booking.status}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Load safety data
 */
async function loadSafetyData() {
    try {
        const response = await API.getEmergencyContacts();
        
        if (response.success) {
            renderEmergencyContacts(response.data.contacts);
        }
    } catch (error) {
        console.error('Load safety data error:', error);
    }
}

/**
 * Render emergency contacts
 */
function renderEmergencyContacts(contacts) {
    const list = document.getElementById('emergency-contacts-list');
    
    if (!contacts || contacts.length === 0) {
        list.innerHTML = '<p class="empty-text">No emergency contacts added</p>';
        return;
    }
    
    list.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <span>${contact.name}</span>
            <span>${contact.phone}</span>
            <span>${contact.relationship || ''}</span>
            <button onclick="removeContact('${contact.id}')" class="btn btn-sm">✕</button>
        </div>
    `).join('');
}

/**
 * Load profile data
 */
function loadProfileData() {
    if (!AppState.user) return;
    
    document.getElementById('profile-name').textContent = AppState.user.name;
    document.getElementById('profile-email').textContent = AppState.user.email;
    document.getElementById('profile-university').textContent = AppState.user.university;
    document.getElementById('profile-rides').textContent = AppState.user.rides_completed || 0;
    document.getElementById('profile-rating').textContent = AppState.user.average_rating?.toFixed(1) || '--';
    document.getElementById('profile-behavior').textContent = Math.round(AppState.user.behavior_score || 100);
}

/**
 * Load pickup points
 */
async function loadPickupPoints() {
    try {
        const response = await API.getPickupPoints();
        
        if (response.success) {
            AppState.pickupPoints = response.data.pickups;
            renderPickupChips(response.data.pickups);
        }
    } catch (error) {
        console.error('Load pickup points error:', error);
    }
}

/**
 * Render pickup chips
 */
function renderPickupChips(pickups) {
    const container = document.getElementById('pickup-chips');
    if (!container) return;
    
    container.innerHTML = pickups.slice(0, 6).map(pickup => `
        <button class="pickup-chip" onclick="selectPickup(${pickup.lat}, ${pickup.lng}, '${pickup.name}')">
            <span>${getCategoryIcon(pickup.category)}</span>
            <span>${pickup.name}</span>
        </button>
    `).join('');
}

/**
 * Select a pickup point
 */
function selectPickup(lat, lng, name) {
    const fromInput = document.getElementById('quick-from');
    if (fromInput) {
        fromInput.value = name;
        fromInput.dataset.lat = lat;
        fromInput.dataset.lng = lng;
    }
    
    // Center map on pickup
    if (AppState.maps.home) {
        AppState.maps.home.flyTo({ center: [lng, lat], zoom: 14 });
    }
}

/**
 * Load platform stats
 */
async function loadPlatformStats() {
    // For now, use mock data
    AppState.platformStats = {
        co2Saved: 1250,
        totalRides: 450,
        totalUsers: 180
    };
    
    document.getElementById('stat-co2').textContent = AppState.platformStats.co2Saved;
    document.getElementById('stat-rides').textContent = AppState.platformStats.totalRides;
    document.getElementById('stat-users').textContent = AppState.platformStats.totalUsers;
}

/**
 * Update search map with results
 */
function updateSearchMap(rides) {
    if (!AppState.maps.search) return;
    
    // Clear existing markers
    if (AppState.markers.search) {
        AppState.markers.search.forEach(m => m.remove());
    }
    AppState.markers.search = [];
    
    // Add markers for each ride
    rides.forEach(ride => {
        // Source marker
        const sourceMarker = new mapboxgl.Marker({ color: '#10B981' })
            .setLngLat([ride.source_lng, ride.source_lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>Pickup</strong><br>${ride.source_address}`))
            .addTo(AppState.maps.search);
        
        AppState.markers.search.push(sourceMarker);
        
        // Destination marker
        const destMarker = new mapboxgl.Marker({ color: '#3B82F6' })
            .setLngLat([ride.destination_lng, ride.destination_lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>Drop-off</strong><br>${ride.destination_address}`))
            .addTo(AppState.maps.search);
        
        AppState.markers.search.push(destMarker);
    });
    
    // Fit bounds to show all markers
    if (rides.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        rides.forEach(ride => {
            bounds.extend([ride.source_lng, ride.source_lat]);
            bounds.extend([ride.destination_lng, ride.destination_lat]);
        });
        AppState.maps.search.fitBounds(bounds, { padding: 50 });
    }
}

/**
 * Sort search results
 */
function sortSearchResults(sortBy) {
    let sorted = [...AppState.searchResults];
    
    switch (sortBy) {
        case 'match':
            sorted.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
            break;
        case 'time':
            sorted.sort((a, b) => {
                const timeA = a.departure_date + a.departure_time;
                const timeB = b.departure_date + b.departure_time;
                return timeA.localeCompare(timeB);
            });
            break;
        case 'price':
            sorted.sort((a, b) => (a.fuel_split_price || 0) - (b.fuel_split_price || 0));
            break;
        case 'rating':
            sorted.sort((a, b) => (b.driver_rating || 0) - (a.driver_rating || 0));
            break;
    }
    
    AppState.searchResults = sorted;
    renderSearchResults(sorted);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Utility functions
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getCategoryIcon(category) {
    const icons = {
        university: '🎓',
        mall: '🛍️',
        transit: '🚇',
        landmark: '📍'
    };
    return icons[category] || '📍';
}

// Make functions available globally
window.navigateTo = navigateTo;
window.selectRide = selectRide;
window.selectPickup = selectPickup;
window.completeRide = completeRide;
window.cancelRide = cancelRide;
