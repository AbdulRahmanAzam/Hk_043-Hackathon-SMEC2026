// API Helper Functions

const API = {
    token: null,

    // Set token
    setToken(token) {
        this.token = token;
    },

    // Get auth token from localStorage
    getToken() {
        return this.token || localStorage.getItem('token') || localStorage.getItem('uniride_token');
    },

    // Get current user from localStorage
    getUser() {
        const user = localStorage.getItem('user') || localStorage.getItem('uniride_user');
        return user ? JSON.parse(user) : null;
    },

    // Set auth data in localStorage
    setAuth(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    },

    // Clear auth data
    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    status: response.status,
                    message: data.message || 'An error occurred',
                    errors: data.errors
                };
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                status: 0,
                message: 'Network error. Please check your connection.'
            };
        }
    },

    // Simplified API methods for premium app
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(data) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async searchRides(params) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/rides/search?${queryString}`);
    },

    async getRide(id) {
        return this.request(`/rides/${id}`);
    },

    async getMyRides(status = '') {
        const query = status ? `?status=${status}` : '';
        return this.request(`/rides/my-rides${query}`);
    },

    async createRide(data) {
        return this.request('/rides', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async completeRide(id) {
        return this.request(`/rides/${id}/complete`, {
            method: 'POST'
        });
    },

    async cancelRide(id) {
        return this.request(`/rides/${id}`, {
            method: 'DELETE'
        });
    },

    async bookRide(rideId, seats = 1) {
        return this.request('/bookings/lock-seat', {
            method: 'POST',
            body: JSON.stringify({ ride_id: rideId, seats_requested: seats })
        });
    },

    async getMyBookings() {
        return this.request('/bookings/my-bookings');
    },

    async getPickupPoints() {
        return this.request('/rides/pickup-points');
    },

    async getCarbonDashboard() {
        return this.request('/rides/carbon-dashboard');
    },

    async getGamificationStats() {
        return this.request('/rides/gamification');
    },

    async getEmergencyContacts() {
        return this.request('/safety/emergency-contacts');
    },

    async addEmergencyContact(data) {
        return this.request('/safety/emergency-contacts', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async removeEmergencyContact(id) {
        return this.request(`/safety/emergency-contacts/${id}`, {
            method: 'DELETE'
        });
    },

    async triggerSOS(rideId, location, message) {
        return this.request(`/safety/rides/${rideId}/sos`, {
            method: 'POST',
            body: JSON.stringify({ ...location, message })
        });
    },

    async generateShareLink(rideId) {
        return this.request(`/safety/rides/${rideId}/share`, {
            method: 'POST'
        });
    },

    // Auth endpoints (legacy)
    auth: {
        async signup(data) {
            return API.request('/auth/signup', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async login(email, password) {
            return API.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },

        async getProfile() {
            return API.request('/auth/profile');
        },

        async updateProfile(data) {
            return API.request('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async getStats() {
            return API.request('/auth/stats');
        }
    },

    // Rides endpoints (legacy)
    rides: {
        async create(data) {
            return API.request('/rides', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async search(params) {
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/rides/search?${queryString}`);
        },

        async getById(id) {
            return API.request(`/rides/${id}`);
        },

        async getMyRides(status = '') {
            const query = status ? `?status=${status}` : '';
            return API.request(`/rides/my-rides${query}`);
        },

        async update(id, data) {
            return API.request(`/rides/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async cancel(id) {
            return API.request(`/rides/${id}`, {
                method: 'DELETE'
            });
        },

        async complete(id) {
            return API.request(`/rides/${id}/complete`, {
                method: 'POST'
            });
        }
    },

    // Bookings endpoints (legacy)
    bookings: {
        async lockSeat(rideId) {
            return API.request('/bookings/lock-seat', {
                method: 'POST',
                body: JSON.stringify({ ride_id: rideId })
            });
        },

        async confirm(bookingId) {
            return API.request(`/bookings/confirm/${bookingId}`, {
                method: 'POST'
            });
        },

        async cancel(bookingId, reason = '') {
            return API.request(`/bookings/cancel/${bookingId}`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
        },

        async getMyBookings(type = '') {
            const query = type ? `?type=${type}` : '';
            return API.request(`/bookings/my-bookings${query}`);
        },

        async getById(id) {
            return API.request(`/bookings/${id}`);
        },

        async rate(bookingId, rating, comment = '') {
            return API.request(`/bookings/${bookingId}/rate`, {
                method: 'POST',
                body: JSON.stringify({ rating, comment })
            });
        },

        async markNoShow(bookingId) {
            return API.request(`/bookings/${bookingId}/no-show`, {
                method: 'POST'
            });
        }
    }
};
