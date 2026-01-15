// Main Application Logic

// Global state
let currentPage = 'home';
let searchLocationMode = null; // 'source' or 'destination'
let postLocationMode = 'source';
let currentRideId = null;
let currentBookingId = null;
let seatLockTimer = null;
let seatLockInterval = null;

// ===============================================
// INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Check authentication status
    updateAuthUI();
    
    // Initialize navigation
    initNavigation();
    
    // Initialize date inputs with today's date
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.min = today;
        if (input.id === 'searchDate' || input.id === 'postDate') {
            input.value = today;
        }
    });
    
    // Initialize maps when pages are shown
    initMaps();
    
    // Initialize rating stars
    initRatingStars();
    
    // Show home page by default
    showPage('home');
}

function initNavigation() {
    // Mobile nav toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const navAuth = document.getElementById('navAuth');
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('show');
            navAuth.classList.toggle('show');
        });
    }
    
    // User dropdown
    const userBtn = document.getElementById('userBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (userBtn && dropdownMenu) {
        userBtn.addEventListener('click', () => {
            dropdownMenu.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-dropdown')) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

function initMaps() {
    // Initialize hero map
    setTimeout(() => {
        if (document.getElementById('heroMap')) {
            const heroMap = MapManager.init('heroMap', { zoom: 10 });
            heroMap.on('load', () => {
                // Add some sample markers for visual appeal
                MapManager.addMarker('heroMap', 'fast', 67.0623, 24.8534, { icon: '🎓', popup: '<strong>FAST-NUCES</strong>' });
                MapManager.addMarker('heroMap', 'iba', 67.0012, 24.8256, { icon: '🎓', popup: '<strong>IBA Karachi</strong>' });
                MapManager.addMarker('heroMap', 'ned', 67.1106, 24.9338, { icon: '🎓', popup: '<strong>NED University</strong>' });
            });
        }
    }, 100);
}

// ===============================================
// PAGE NAVIGATION
// ===============================================

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(`${pageName}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageName;
        
        // Initialize page-specific content
        initPageContent(pageName);
    }
    
    // Close mobile nav
    document.getElementById('navLinks')?.classList.remove('show');
    document.getElementById('navAuth')?.classList.remove('show');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

function initPageContent(pageName) {
    switch (pageName) {
        case 'search':
            initSearchPage();
            break;
        case 'post-ride':
            initPostRidePage();
            break;
        case 'my-rides':
            loadMyRides('active');
            break;
        case 'bookings':
            loadMyBookings('upcoming');
            break;
        case 'profile':
            loadProfile();
            break;
        case 'history':
            loadHistory();
            break;
        case 'rideDetails':
            if (currentRideId) {
                loadRideDetails(currentRideId);
            }
            break;
    }
}

// ===============================================
// AUTHENTICATION
// ===============================================

function updateAuthUI() {
    const user = API.getUser();
    const navAuth = document.getElementById('navAuth');
    const navUser = document.getElementById('navUser');
    const postRideLink = document.getElementById('postRideLink');
    const myRidesLink = document.getElementById('myRidesLink');
    const myBookingsLink = document.getElementById('myBookingsLink');
    
    if (user) {
        // User is logged in
        navAuth.style.display = 'none';
        navUser.style.display = 'block';
        
        // Update user info in nav
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        
        // Show role-specific links
        if (user.role === 'driver' || user.role === 'both') {
            postRideLink.style.display = 'block';
            myRidesLink.style.display = 'block';
        }
        if (user.role === 'rider' || user.role === 'both') {
            myBookingsLink.style.display = 'block';
        }
    } else {
        // User is not logged in
        navAuth.style.display = 'flex';
        navUser.style.display = 'none';
        postRideLink.style.display = 'none';
        myRidesLink.style.display = 'none';
        myBookingsLink.style.display = 'none';
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const btn = document.getElementById('signupBtn');
    const errorDiv = document.getElementById('signupError');
    
    // Get form values
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const department = document.getElementById('signupDepartment').value.trim();
    const semester = document.getElementById('signupSemester').value;
    const gender = document.getElementById('signupGender').value;
    const role = document.getElementById('signupRole').value;
    const phone = document.getElementById('signupPhone').value.trim();
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showFormError(errorDiv, 'Passwords do not match');
        return;
    }
    
    // Validate password strength
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        showFormError(errorDiv, 'Password must contain uppercase, lowercase, and a number');
        return;
    }
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span>Creating account...</span>';
        
        const response = await API.auth.signup({
            name, email, password, department, 
            semester: semester ? parseInt(semester) : null,
            gender, role, phone
        });
        
        // Save auth data
        API.setAuth(response.data.token, response.data.user);
        
        // Update UI
        updateAuthUI();
        
        // Show success
        showToast('success', 'Account created successfully!');
        
        // Navigate to home
        showPage('home');
        
    } catch (error) {
        showFormError(errorDiv, error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Create Account</span>';
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const btn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span>Logging in...</span>';
        
        const response = await API.auth.login(email, password);
        
        // Save auth data
        API.setAuth(response.data.token, response.data.user);
        
        // Update UI
        updateAuthUI();
        
        // Show success
        showToast('success', 'Welcome back!');
        
        // Navigate to home
        showPage('home');
        
    } catch (error) {
        showFormError(errorDiv, error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Login</span>';
    }
}

function logout() {
    API.clearAuth();
    updateAuthUI();
    showToast('info', 'You have been logged out');
    showPage('home');
}

// ===============================================
// SEARCH PAGE
// ===============================================

let searchMap = null;

function initSearchPage() {
    if (!searchMap) {
        setTimeout(() => {
            searchMap = MapManager.init('searchMapContainer');
            
            searchMap.on('click', (e) => {
                handleSearchMapClick(e.lngLat);
            });
            
            searchMap.on('load', () => {
                // Auto-search on load
                searchRides();
            });
        }, 100);
    } else {
        searchRides();
    }
}

async function handleSearchMapClick(lngLat) {
    if (!searchLocationMode) return;
    
    const { lng, lat } = lngLat;
    const address = await MapManager.reverseGeocode(lng, lat);
    
    if (searchLocationMode === 'source') {
        document.getElementById('searchSource').value = address;
        document.getElementById('searchSourceLat').value = lat;
        document.getElementById('searchSourceLng').value = lng;
        MapManager.addMarker('searchMapContainer', 'searchSource', lng, lat, { icon: '🟢' });
    } else {
        document.getElementById('searchDestination').value = address;
        document.getElementById('searchDestLat').value = lat;
        document.getElementById('searchDestLng').value = lng;
        MapManager.addMarker('searchMapContainer', 'searchDest', lng, lat, { icon: '🔴' });
    }
    
    searchLocationMode = null;
}

function setLocationMode(mode) {
    searchLocationMode = mode;
    showToast('info', `Click on the map to set your ${mode === 'source' ? 'pickup' : 'drop'} location`);
}

async function searchRides() {
    const params = {};
    
    const sourceLat = document.getElementById('searchSourceLat').value;
    const sourceLng = document.getElementById('searchSourceLng').value;
    const destLat = document.getElementById('searchDestLat').value;
    const destLng = document.getElementById('searchDestLng').value;
    const date = document.getElementById('searchDate').value;
    const timeFrom = document.getElementById('searchTimeFrom').value;
    const timeTo = document.getElementById('searchTimeTo').value;
    const radius = document.getElementById('searchRadius').value;
    
    if (sourceLat && sourceLng) {
        params.source_lat = sourceLat;
        params.source_lng = sourceLng;
    }
    if (destLat && destLng) {
        params.destination_lat = destLat;
        params.destination_lng = destLng;
    }
    if (date) params.date = date;
    if (timeFrom) params.time_from = timeFrom;
    if (timeTo) params.time_to = timeTo;
    if (radius) params.radius = radius;
    
    try {
        const response = await API.rides.search(params);
        displaySearchResults(response.data.rides);
    } catch (error) {
        showToast('error', error.message);
    }
}

function displaySearchResults(rides) {
    const resultsList = document.getElementById('resultsList');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = `${rides.length} ride${rides.length !== 1 ? 's' : ''} found`;
    
    if (rides.length === 0) {
        resultsList.innerHTML = `
            <div class="no-results">
                <p>🔍 No rides found matching your criteria</p>
                <p>Try adjusting your search filters</p>
            </div>
        `;
        return;
    }
    
    resultsList.innerHTML = rides.map(ride => `
        <div class="ride-card" onclick="viewRideDetails('${ride.id}')">
            <div class="ride-card-header">
                <div class="ride-driver">
                    <div class="driver-avatar">${ride.driver_name.charAt(0)}</div>
                    <div class="driver-info">
                        <h4>${ride.driver_name}</h4>
                        <p>${ride.driver_university}</p>
                    </div>
                </div>
                <div class="ride-rating">
                    ⭐ ${ride.driver_rating?.toFixed(1) || 'New'}
                </div>
            </div>
            
            <div class="ride-route">
                <div class="route-point">
                    <span class="route-dot source"></span>
                    <span>${truncateText(ride.source_address, 40)}</span>
                </div>
                <div class="route-point">
                    <span class="route-dot dest"></span>
                    <span>${truncateText(ride.destination_address, 40)}</span>
                </div>
            </div>
            
            <div class="ride-meta">
                <span>📅 ${formatDate(ride.departure_date)}</span>
                <span>🕐 ${formatTime(ride.departure_time)}</span>
                ${ride.distance_km ? `<span>📏 ${ride.distance_km.toFixed(1)} km</span>` : ''}
                ${ride.estimated_duration_minutes ? `<span>⏱️ ${ride.estimated_duration_minutes} min</span>` : ''}
            </div>
            
            <div class="ride-card-footer">
                <span class="seats-badge ${ride.available_seats <= 2 ? 'low' : ''}">${ride.available_seats} seat${ride.available_seats !== 1 ? 's' : ''} left</span>
                ${ride.fuel_split_price ? `<span class="price-tag">PKR ${ride.fuel_split_price}</span>` : '<span class="price-tag">Free</span>'}
            </div>
        </div>
    `).join('');
    
    // Add markers to map
    MapManager.clearMarkers('searchMapContainer');
    
    rides.forEach((ride, index) => {
        MapManager.addMarker('searchMapContainer', `ride-${index}`, ride.source_lng, ride.source_lat, {
            icon: '🚗',
            popup: `<strong>${ride.driver_name}</strong><br>${formatTime(ride.departure_time)}<br>${ride.available_seats} seats`
        });
    });
    
    if (rides.length > 0) {
        MapManager.fitToMarkers('searchMapContainer');
    }
}

function clearSearch() {
    document.getElementById('searchSource').value = '';
    document.getElementById('searchSourceLat').value = '';
    document.getElementById('searchSourceLng').value = '';
    document.getElementById('searchDestination').value = '';
    document.getElementById('searchDestLat').value = '';
    document.getElementById('searchDestLng').value = '';
    document.getElementById('searchDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('searchTimeFrom').value = '';
    document.getElementById('searchTimeTo').value = '';
    document.getElementById('searchRadius').value = 3;
    document.getElementById('radiusValue').textContent = '3';
    
    MapManager.clearMarkers('searchMapContainer');
    searchRides();
}

// ===============================================
// POST RIDE PAGE
// ===============================================

let postMap = null;

function initPostRidePage() {
    if (!API.getUser()) {
        showToast('warning', 'Please login to post a ride');
        showPage('login');
        return;
    }
    
    if (!postMap) {
        setTimeout(() => {
            postMap = MapManager.init('postMapContainer');
            
            postMap.on('click', (e) => {
                handlePostMapClick(e.lngLat);
            });
        }, 100);
    }
    
    // Set minimum date to today
    document.getElementById('postDate').min = new Date().toISOString().split('T')[0];
}

async function handlePostMapClick(lngLat) {
    const { lng, lat } = lngLat;
    const address = await MapManager.reverseGeocode(lng, lat);
    
    if (postLocationMode === 'source') {
        document.getElementById('postSource').value = address;
        document.getElementById('postSourceLat').value = lat;
        document.getElementById('postSourceLng').value = lng;
        MapManager.addMarker('postMapContainer', 'postSource', lng, lat, { icon: '🟢' });
    } else {
        document.getElementById('postDestination').value = address;
        document.getElementById('postDestLat').value = lat;
        document.getElementById('postDestLng').value = lng;
        MapManager.addMarker('postMapContainer', 'postDest', lng, lat, { icon: '🔴' });
    }
    
    // Calculate route if both points are set
    const sourceLat = document.getElementById('postSourceLat').value;
    const sourceLng = document.getElementById('postSourceLng').value;
    const destLat = document.getElementById('postDestLat').value;
    const destLng = document.getElementById('postDestLng').value;
    
    if (sourceLat && sourceLng && destLat && destLng) {
        calculateAndDisplayRoute(sourceLng, sourceLat, destLng, destLat);
    }
}

function setPostLocationMode(mode) {
    postLocationMode = mode;
    document.getElementById('currentLocationMode').textContent = mode === 'source' ? 'pickup' : 'drop';
    
    document.getElementById('postSourceBtn').classList.toggle('active', mode === 'source');
    document.getElementById('postDestBtn').classList.toggle('active', mode === 'destination');
}

async function calculateAndDisplayRoute(sourceLng, sourceLat, destLng, destLat) {
    const route = await MapManager.getRoute(sourceLng, sourceLat, destLng, destLat);
    
    if (route) {
        // Display route info
        document.getElementById('routeInfo').style.display = 'flex';
        document.getElementById('routeDistance').textContent = `${route.distance.toFixed(1)} km`;
        document.getElementById('routeDuration').textContent = `${Math.round(route.duration)} min`;
        
        // Store for submission
        document.getElementById('postDistanceKm').value = route.distance;
        document.getElementById('postDuration').value = Math.round(route.duration);
        document.getElementById('postPolyline').value = JSON.stringify(route.geometry);
        
        // Draw route on map
        MapManager.drawRoute('postMapContainer', 'postRoute', route.geometry);
        MapManager.fitToMarkers('postMapContainer');
    }
}

async function handlePostRide(event) {
    event.preventDefault();
    
    const btn = document.getElementById('postRideBtn');
    const errorDiv = document.getElementById('postRideError');
    
    // Get form values
    const sourceAddress = document.getElementById('postSource').value;
    const sourceLat = parseFloat(document.getElementById('postSourceLat').value);
    const sourceLng = parseFloat(document.getElementById('postSourceLng').value);
    const destAddress = document.getElementById('postDestination').value;
    const destLat = parseFloat(document.getElementById('postDestLat').value);
    const destLng = parseFloat(document.getElementById('postDestLng').value);
    const date = document.getElementById('postDate').value;
    const time = document.getElementById('postTime').value;
    const seats = parseInt(document.getElementById('postSeats').value);
    const price = document.getElementById('postPrice').value;
    const rules = document.getElementById('postRules').value;
    const distanceKm = parseFloat(document.getElementById('postDistanceKm').value);
    const duration = parseInt(document.getElementById('postDuration').value);
    const polyline = document.getElementById('postPolyline').value;
    
    // Validate
    if (!sourceAddress || !sourceLat || !sourceLng) {
        showFormError(errorDiv, 'Please select a pickup location on the map');
        return;
    }
    if (!destAddress || !destLat || !destLng) {
        showFormError(errorDiv, 'Please select a drop location on the map');
        return;
    }
    if (!date || !time) {
        showFormError(errorDiv, 'Please select departure date and time');
        return;
    }
    
    // Check if time is in future
    const departureDateTime = new Date(`${date}T${time}`);
    if (departureDateTime <= new Date()) {
        showFormError(errorDiv, 'Departure time must be in the future');
        return;
    }
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span>Posting ride...</span>';
        
        const rideData = {
            source_address: sourceAddress,
            source_lat: sourceLat,
            source_lng: sourceLng,
            destination_address: destAddress,
            destination_lat: destLat,
            destination_lng: destLng,
            departure_date: date,
            departure_time: time,
            total_seats: seats,
            fuel_split_price: price ? parseFloat(price) : null,
            ride_rules: rules || null,
            distance_km: distanceKm || null,
            estimated_duration_minutes: duration || null,
            route_polyline: polyline || null
        };
        
        await API.rides.create(rideData);
        
        showToast('success', 'Ride posted successfully!');
        
        // Reset form
        document.getElementById('postRideForm').reset();
        document.getElementById('routeInfo').style.display = 'none';
        MapManager.clearMarkers('postMapContainer');
        MapManager.removeRoute('postMapContainer', 'postRoute');
        
        // Navigate to my rides
        showPage('my-rides');
        
    } catch (error) {
        showFormError(errorDiv, error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Post Ride</span>';
    }
}

// ===============================================
// RIDE DETAILS & BOOKING
// ===============================================

function viewRideDetails(rideId) {
    currentRideId = rideId;
    showPage('rideDetails');
}

async function loadRideDetails(rideId) {
    const content = document.getElementById('rideDetailsContent');
    
    try {
        const response = await API.rides.getById(rideId);
        const ride = response.data.ride;
        
        // Display ride details
        content.innerHTML = `
            <div class="details-header">
                <button class="btn btn-outline" onclick="showPage('search')">← Back to Search</button>
                <h2 class="details-title">${ride.source_address}</h2>
                <p style="color: var(--gray-500); margin-bottom: var(--space-md);">to ${ride.destination_address}</p>
                <div class="details-meta">
                    <span>📅 ${formatDate(ride.departure_date)}</span>
                    <span>🕐 ${formatTime(ride.departure_time)}</span>
                    ${ride.distance_km ? `<span>📏 ${ride.distance_km.toFixed(1)} km</span>` : ''}
                    ${ride.estimated_duration_minutes ? `<span>⏱️ ${ride.estimated_duration_minutes} min</span>` : ''}
                </div>
            </div>
            
            <div class="details-section">
                <h3>👤 Driver</h3>
                <div class="driver-profile">
                    <div class="driver-avatar">${ride.driver_name.charAt(0)}</div>
                    <div>
                        <h4>${ride.driver_name}</h4>
                        <p>${ride.driver_university}${ride.driver_department ? ` • ${ride.driver_department}` : ''}</p>
                        <div class="ride-rating">
                            ⭐ ${ride.driver_rating?.toFixed(1) || 'New'} (${ride.driver_rides_completed} rides)
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="details-section">
                <h3>💺 Availability</h3>
                <p><strong>${ride.available_seats}</strong> of ${ride.total_seats} seats available</p>
                ${ride.fuel_split_price ? `<p><strong>Fuel contribution:</strong> PKR ${ride.fuel_split_price} per person</p>` : '<p><strong>Price:</strong> Free ride</p>'}
            </div>
            
            ${ride.ride_rules ? `
                <div class="details-section">
                    <h3>📝 Ride Rules</h3>
                    <p>${ride.ride_rules}</p>
                </div>
            ` : ''}
            
            ${ride.bookings && ride.bookings.length > 0 ? `
                <div class="details-section">
                    <h3>👥 Current Passengers</h3>
                    ${ride.bookings.map(b => `
                        <p>• ${b.rider_name} (${b.rider_university})</p>
                    `).join('')}
                </div>
            ` : ''}
            
            <div style="margin-top: var(--space-xl);">
                ${API.getUser() ? 
                    (ride.available_seats > 0 ? 
                        `<button class="btn btn-primary btn-lg btn-block" onclick="initiateBooking('${ride.id}')">Book This Ride</button>` :
                        '<button class="btn btn-outline btn-lg btn-block" disabled>No Seats Available</button>'
                    ) : 
                    '<button class="btn btn-primary btn-lg btn-block" onclick="showPage(\'login\')">Login to Book</button>'
                }
            </div>
        `;
        
        // Initialize map and show route
        setTimeout(() => {
            const detailsMap = MapManager.init('rideDetailsMap');
            
            detailsMap.on('load', () => {
                MapManager.addMarker('rideDetailsMap', 'source', ride.source_lng, ride.source_lat, { icon: '🟢' });
                MapManager.addMarker('rideDetailsMap', 'dest', ride.destination_lng, ride.destination_lat, { icon: '🔴' });
                
                if (ride.route_polyline) {
                    MapManager.drawRoute('rideDetailsMap', 'route', JSON.parse(ride.route_polyline));
                }
                
                MapManager.fitToMarkers('rideDetailsMap');
            });
        }, 100);
        
    } catch (error) {
        content.innerHTML = `
            <div class="no-results">
                <p>❌ ${error.message}</p>
                <button class="btn btn-primary" onclick="showPage('search')">Back to Search</button>
            </div>
        `;
    }
}

async function initiateBooking(rideId) {
    const user = API.getUser();
    
    if (!user) {
        showToast('warning', 'Please login to book a ride');
        showPage('login');
        return;
    }
    
    try {
        // Lock the seat
        const response = await API.bookings.lockSeat(rideId);
        
        currentBookingId = response.data.booking_id;
        
        // Show lock timer
        startSeatLockTimer(response.data.remaining_seconds);
        
        // Show confirmation modal
        document.getElementById('bookingModalBody').innerHTML = `
            <p>You have reserved a seat for the next <strong>${response.data.remaining_seconds}</strong> seconds.</p>
            <p>Click "Confirm Booking" to complete your reservation.</p>
            <div class="timer-display" style="text-align: center; font-size: 2rem; font-weight: bold; color: var(--primary); margin: var(--space-lg) 0;">
                <span id="modalTimer">${response.data.remaining_seconds}</span>s
            </div>
        `;
        
        openModal('bookingModal');
        
    } catch (error) {
        showToast('error', error.message);
    }
}

function startSeatLockTimer(seconds) {
    const timerDiv = document.getElementById('seatLockTimer');
    const timerSeconds = document.getElementById('timerSeconds');
    const modalTimer = document.getElementById('modalTimer');
    
    timerDiv.style.display = 'block';
    seatLockTimer = seconds;
    
    seatLockInterval = setInterval(() => {
        seatLockTimer--;
        timerSeconds.textContent = seatLockTimer;
        if (modalTimer) modalTimer.textContent = seatLockTimer;
        
        if (seatLockTimer <= 0) {
            clearInterval(seatLockInterval);
            timerDiv.style.display = 'none';
            closeModal('bookingModal');
            showToast('warning', 'Seat reservation expired. Please try again.');
        }
    }, 1000);
}

function cancelSeatLock() {
    clearInterval(seatLockInterval);
    document.getElementById('seatLockTimer').style.display = 'none';
    closeModal('bookingModal');
    
    if (currentBookingId) {
        API.bookings.cancel(currentBookingId, 'User cancelled').catch(() => {});
        currentBookingId = null;
    }
}

async function confirmBooking() {
    if (!currentBookingId) return;
    
    const btn = document.getElementById('confirmBookingBtn');
    
    try {
        btn.disabled = true;
        btn.textContent = 'Confirming...';
        
        await API.bookings.confirm(currentBookingId);
        
        // Stop timer
        clearInterval(seatLockInterval);
        document.getElementById('seatLockTimer').style.display = 'none';
        
        // Close modal
        closeModal('bookingModal');
        
        showToast('success', 'Booking confirmed! Have a great ride!');
        
        // Navigate to bookings
        currentBookingId = null;
        showPage('bookings');
        
    } catch (error) {
        showToast('error', error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
    }
}

function confirmBookingFromTimer() {
    confirmBooking();
}

// ===============================================
// MY RIDES (Driver)
// ===============================================

async function loadMyRides(status) {
    const list = document.getElementById('myRidesList');
    
    // Update tab UI
    document.querySelectorAll('#myRidesPage .tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === status);
    });
    
    try {
        list.innerHTML = '<div class="loading">Loading...</div>';
        
        const response = await API.rides.getMyRides(status);
        const rides = response.data.rides;
        
        if (rides.length === 0) {
            list.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1;">
                    <p>No ${status} rides found</p>
                    ${status === 'active' ? '<button class="btn btn-primary" onclick="showPage(\'post-ride\')">Post a Ride</button>' : ''}
                </div>
            `;
            return;
        }
        
        list.innerHTML = rides.map(ride => `
            <div class="ride-card">
                <div class="ride-route">
                    <div class="route-point">
                        <span class="route-dot source"></span>
                        <span>${truncateText(ride.source_address, 35)}</span>
                    </div>
                    <div class="route-point">
                        <span class="route-dot dest"></span>
                        <span>${truncateText(ride.destination_address, 35)}</span>
                    </div>
                </div>
                
                <div class="ride-meta">
                    <span>📅 ${formatDate(ride.departure_date)}</span>
                    <span>🕐 ${formatTime(ride.departure_time)}</span>
                    <span>👥 ${ride.total_bookings || 0} bookings</span>
                </div>
                
                <div class="ride-card-footer">
                    <span class="seats-badge">${ride.available_seats}/${ride.total_seats} seats</span>
                    <span class="status-badge ${ride.status}">${ride.status}</span>
                </div>
                
                ${ride.status === 'active' ? `
                    <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
                        <button class="btn btn-success btn-sm" onclick="completeRide('${ride.id}')">Complete</button>
                        <button class="btn btn-danger btn-sm" onclick="cancelRide('${ride.id}')">Cancel</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        list.innerHTML = `<div class="no-results" style="grid-column: 1/-1;">${error.message}</div>`;
    }
}

async function completeRide(rideId) {
    if (!confirm('Mark this ride as completed?')) return;
    
    try {
        await API.rides.complete(rideId);
        showToast('success', 'Ride marked as completed!');
        loadMyRides('active');
    } catch (error) {
        showToast('error', error.message);
    }
}

async function cancelRide(rideId) {
    if (!confirm('Are you sure you want to cancel this ride? All bookings will be cancelled.')) return;
    
    try {
        await API.rides.cancel(rideId);
        showToast('success', 'Ride cancelled');
        loadMyRides('active');
    } catch (error) {
        showToast('error', error.message);
    }
}

// ===============================================
// MY BOOKINGS (Rider)
// ===============================================

async function loadMyBookings(type) {
    const list = document.getElementById('myBookingsList');
    
    // Update tab UI
    document.querySelectorAll('#bookingsPage .tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === type);
    });
    
    try {
        list.innerHTML = '<div class="loading">Loading...</div>';
        
        const response = await API.bookings.getMyBookings(type);
        const bookings = response.data.bookings;
        
        if (bookings.length === 0) {
            list.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1;">
                    <p>No ${type} bookings found</p>
                    ${type === 'upcoming' ? '<button class="btn btn-primary" onclick="showPage(\'search\')">Find a Ride</button>' : ''}
                </div>
            `;
            return;
        }
        
        list.innerHTML = bookings.map(booking => `
            <div class="ride-card">
                <div class="ride-card-header">
                    <div class="ride-driver">
                        <div class="driver-avatar">${booking.driver_name.charAt(0)}</div>
                        <div class="driver-info">
                            <h4>${booking.driver_name}</h4>
                            <p>${booking.driver_university}</p>
                        </div>
                    </div>
                    <span class="status-badge ${booking.status}">${booking.status}</span>
                </div>
                
                <div class="ride-route">
                    <div class="route-point">
                        <span class="route-dot source"></span>
                        <span>${truncateText(booking.source_address, 35)}</span>
                    </div>
                    <div class="route-point">
                        <span class="route-dot dest"></span>
                        <span>${truncateText(booking.destination_address, 35)}</span>
                    </div>
                </div>
                
                <div class="ride-meta">
                    <span>📅 ${formatDate(booking.departure_date)}</span>
                    <span>🕐 ${formatTime(booking.departure_time)}</span>
                    ${booking.fuel_split_price ? `<span>💰 PKR ${booking.fuel_split_price}</span>` : ''}
                </div>
                
                ${booking.status === 'pending' || booking.status === 'confirmed' ? `
                    <div style="margin-top: var(--space-md);">
                        <button class="btn btn-danger btn-sm" onclick="cancelBooking('${booking.id}')">Cancel Booking</button>
                    </div>
                ` : ''}
                
                ${booking.status === 'completed' && !booking.has_rated ? `
                    <div style="margin-top: var(--space-md);">
                        <button class="btn btn-primary btn-sm" onclick="openRatingModal('${booking.id}')">Rate Ride</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        list.innerHTML = `<div class="no-results" style="grid-column: 1/-1;">${error.message}</div>`;
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        await API.bookings.cancel(bookingId);
        showToast('success', 'Booking cancelled');
        loadMyBookings('upcoming');
    } catch (error) {
        showToast('error', error.message);
    }
}

// ===============================================
// RATING
// ===============================================

function initRatingStars() {
    const stars = document.querySelectorAll('.rating-stars .star');
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            document.getElementById('ratingValue').value = rating;
            
            stars.forEach((s, i) => {
                s.classList.toggle('active', i < rating);
            });
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
                s.style.color = i < rating ? 'var(--accent)' : '';
            });
        });
        
        star.addEventListener('mouseleave', () => {
            const currentRating = parseInt(document.getElementById('ratingValue').value);
            stars.forEach((s, i) => {
                s.style.color = i < currentRating ? 'var(--accent)' : '';
            });
        });
    });
}

function openRatingModal(bookingId) {
    document.getElementById('ratingBookingId').value = bookingId;
    document.getElementById('ratingValue').value = 0;
    document.getElementById('ratingComment').value = '';
    
    // Reset stars
    document.querySelectorAll('.rating-stars .star').forEach(s => {
        s.classList.remove('active');
    });
    
    openModal('ratingModal');
}

async function submitRating() {
    const bookingId = document.getElementById('ratingBookingId').value;
    const rating = parseInt(document.getElementById('ratingValue').value);
    const comment = document.getElementById('ratingComment').value;
    
    if (!rating || rating < 1 || rating > 5) {
        showToast('warning', 'Please select a rating');
        return;
    }
    
    try {
        await API.bookings.rate(bookingId, rating, comment);
        closeModal('ratingModal');
        showToast('success', 'Thank you for your feedback!');
        loadMyBookings('past');
    } catch (error) {
        showToast('error', error.message);
    }
}

// ===============================================
// PROFILE
// ===============================================

async function loadProfile() {
    try {
        const [profileRes, statsRes] = await Promise.all([
            API.auth.getProfile(),
            API.auth.getStats()
        ]);
        
        const user = profileRes.data.user;
        const stats = statsRes.data.stats;
        
        // Update display
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileUniversity').textContent = user.university;
        document.getElementById('profileAvatar').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('profileRating').textContent = '★'.repeat(Math.round(user.average_rating || 0)) + '☆'.repeat(5 - Math.round(user.average_rating || 0));
        document.getElementById('profileRatingCount').textContent = `(${user.total_ratings} ratings)`;
        
        // Stats
        document.getElementById('profileRidesCompleted').textContent = stats.rides_completed;
        document.getElementById('profileRidesPosted').textContent = stats.rides_posted;
        document.getElementById('profileRidesTaken').textContent = stats.rides_taken;
        document.getElementById('profileNoShows').textContent = stats.no_shows;
        
        // Form
        document.getElementById('profileEditName').value = user.name;
        document.getElementById('profileEditDept').value = user.department || '';
        document.getElementById('profileEditSemester').value = user.semester || '';
        document.getElementById('profileEditPhone').value = user.phone || '';
        document.getElementById('profileEditRole').value = user.role;
        
    } catch (error) {
        showToast('error', error.message);
    }
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    
    try {
        const data = {
            name: document.getElementById('profileEditName').value,
            department: document.getElementById('profileEditDept').value,
            semester: document.getElementById('profileEditSemester').value ? parseInt(document.getElementById('profileEditSemester').value) : null,
            phone: document.getElementById('profileEditPhone').value,
            role: document.getElementById('profileEditRole').value
        };
        
        const response = await API.auth.updateProfile(data);
        
        // Update local storage
        const user = API.getUser();
        Object.assign(user, response.data.user);
        localStorage.setItem('user', JSON.stringify(user));
        
        updateAuthUI();
        showToast('success', 'Profile updated successfully');
        loadProfile();
        
    } catch (error) {
        showToast('error', error.message);
    }
}

// ===============================================
// HISTORY
// ===============================================

async function loadHistory() {
    const list = document.getElementById('historyList');
    const filter = document.getElementById('historyFilter').value;
    
    try {
        list.innerHTML = '<div class="loading">Loading...</div>';
        
        const response = await API.bookings.getMyBookings('past');
        let bookings = response.data.bookings;
        
        // Filter if needed
        if (filter !== 'all') {
            bookings = bookings.filter(b => b.status === filter);
        }
        
        if (bookings.length === 0) {
            list.innerHTML = '<div class="no-results"><p>No ride history found</p></div>';
            return;
        }
        
        list.innerHTML = bookings.map(booking => `
            <div class="history-item">
                <div class="history-item-info">
                    <h4>${truncateText(booking.source_address, 30)} → ${truncateText(booking.destination_address, 30)}</h4>
                    <div class="history-item-meta">
                        <span>📅 ${formatDate(booking.departure_date)}</span>
                        <span>👤 ${booking.driver_name}</span>
                    </div>
                </div>
                <span class="status-badge ${booking.status}">${booking.status}</span>
            </div>
        `).join('');
        
    } catch (error) {
        list.innerHTML = `<div class="no-results">${error.message}</div>`;
    }
}

// ===============================================
// UTILITIES
// ===============================================

function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    
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
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showFormError(errorDiv, message) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
