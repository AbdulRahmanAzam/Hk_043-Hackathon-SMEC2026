// Map Management

const MapManager = {
    maps: {},
    markers: {},
    routes: {},

    // Initialize a map
    init(containerId, options = {}) {
        mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
            container: containerId,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: CONFIG.KARACHI_CENTER,
            zoom: options.zoom || CONFIG.DEFAULT_ZOOM,
            maxBounds: CONFIG.KARACHI_BOUNDS
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add geolocation control
        map.addControl(
            new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                trackUserLocation: true,
                showUserHeading: true
            }),
            'top-right'
        );

        this.maps[containerId] = map;
        this.markers[containerId] = {};

        return map;
    },

    // Get map instance
    getMap(containerId) {
        return this.maps[containerId];
    },

    // Add a marker to the map
    addMarker(containerId, id, lng, lat, options = {}) {
        const map = this.maps[containerId];
        if (!map) return null;

        // Remove existing marker with same id
        this.removeMarker(containerId, id);

        // Create marker element
        const el = document.createElement('div');
        el.className = `map-marker ${options.type || 'default'}`;
        el.innerHTML = options.icon || '📍';
        el.style.cssText = `
            font-size: 24px;
            cursor: pointer;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        `;

        // Create popup if provided
        let popup = null;
        if (options.popup) {
            popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(options.popup);
        }

        const marker = new mapboxgl.Marker({
            element: el,
            draggable: options.draggable || false
        })
        .setLngLat([lng, lat])
        .addTo(map);

        if (popup) {
            marker.setPopup(popup);
        }

        // Store marker reference
        if (!this.markers[containerId]) {
            this.markers[containerId] = {};
        }
        this.markers[containerId][id] = marker;

        return marker;
    },

    // Remove a marker
    removeMarker(containerId, id) {
        if (this.markers[containerId] && this.markers[containerId][id]) {
            this.markers[containerId][id].remove();
            delete this.markers[containerId][id];
        }
    },

    // Clear all markers
    clearMarkers(containerId) {
        if (this.markers[containerId]) {
            Object.values(this.markers[containerId]).forEach(marker => marker.remove());
            this.markers[containerId] = {};
        }
    },

    // Get route from Mapbox Directions API
    async getRoute(sourceLng, sourceLat, destLng, destLat) {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${sourceLng},${sourceLat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${CONFIG.MAPBOX_TOKEN}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    distance: route.distance / 1000, // Convert to km
                    duration: route.duration / 60, // Convert to minutes
                    geometry: route.geometry
                };
            }

            return null;
        } catch (error) {
            console.error('Error fetching route:', error);
            return null;
        }
    },

    // Draw route on map
    drawRoute(containerId, routeId, geometry, color = '#2563eb') {
        const map = this.maps[containerId];
        if (!map) return;

        // Remove existing route
        this.removeRoute(containerId, routeId);

        // Wait for map to load
        if (!map.loaded()) {
            map.on('load', () => this.drawRoute(containerId, routeId, geometry, color));
            return;
        }

        // Add source
        map.addSource(routeId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: geometry
            }
        });

        // Add layer
        map.addLayer({
            id: routeId,
            type: 'line',
            source: routeId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': color,
                'line-width': 5,
                'line-opacity': 0.8
            }
        });

        // Store route reference
        if (!this.routes[containerId]) {
            this.routes[containerId] = {};
        }
        this.routes[containerId][routeId] = true;
    },

    // Remove route
    removeRoute(containerId, routeId) {
        const map = this.maps[containerId];
        if (!map || !map.loaded()) return;

        if (map.getLayer(routeId)) {
            map.removeLayer(routeId);
        }
        if (map.getSource(routeId)) {
            map.removeSource(routeId);
        }

        if (this.routes[containerId]) {
            delete this.routes[containerId][routeId];
        }
    },

    // Clear all routes
    clearRoutes(containerId) {
        if (this.routes[containerId]) {
            Object.keys(this.routes[containerId]).forEach(routeId => {
                this.removeRoute(containerId, routeId);
            });
        }
    },

    // Fit map to markers
    fitToMarkers(containerId, padding = 50) {
        const map = this.maps[containerId];
        if (!map || !this.markers[containerId]) return;

        const markers = Object.values(this.markers[containerId]);
        if (markers.length === 0) return;

        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach(marker => {
            bounds.extend(marker.getLngLat());
        });

        map.fitBounds(bounds, { padding });
    },

    // Reverse geocode coordinates to address
    async reverseGeocode(lng, lat) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${CONFIG.MAPBOX_TOKEN}&country=PK&types=address,poi`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                return data.features[0].place_name;
            }

            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            console.error('Reverse geocode error:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    },

    // Forward geocode address to coordinates
    async geocode(address) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${CONFIG.MAPBOX_TOKEN}&country=PK&proximity=${CONFIG.KARACHI_CENTER.join(',')}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                return {
                    lng: feature.center[0],
                    lat: feature.center[1],
                    address: feature.place_name
                };
            }

            return null;
        } catch (error) {
            console.error('Geocode error:', error);
            return null;
        }
    }
};
