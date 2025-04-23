document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const expiryCheck = document.getElementById('expiry-check');
    const passwordCheck = document.getElementById('password-check');
    const geoCheck = document.getElementById('geo-check');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Update URL hash for deep linking
            window.location.hash = tabId;
        });
    });

    // Check for hash on page load to handle deep links
    if (window.location.hash) {
        const tabId = window.location.hash.substring(1);
        const tabButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }

    // Data storage for URLs and analytics
    const urlMappings = JSON.parse(localStorage.getItem('urlMappings')) || {};
    const analyticsData = JSON.parse(localStorage.getItem('analyticsData')) || {};
    
    // Initialize stats counters
    let totalLinks = parseInt(localStorage.getItem('totalLinks')) || 1245879;
    let totalQRs = parseInt(localStorage.getItem('totalQRs')) || 548621;
    
    // Update stats display
    document.getElementById('total-links').textContent = totalLinks.toLocaleString();
    document.getElementById('total-qrs').textContent = totalQRs.toLocaleString();
    
    // Link shortener functionality
    const shortenBtn = document.getElementById('shorten-btn');
    const urlInput = document.getElementById('url-input');
    const shortenResult = document.getElementById('shorten-result');
    const domainSelect = document.getElementById('domain-select');
    const customPath = document.getElementById('custom-path');

    shortenBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const domain = domainSelect.value;
        const path = customPath.value.trim();
        
        if (!url) {
            showError(shortenResult, 'Please enter a URL');
            return;
        }
        
        if (!isValidUrl(url)) {
            showError(shortenResult, 'Please enter a valid URL (include http:// or https://)');
            return;
        }
        
        try {
            shortenBtn.disabled = true;
            shortenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Shortening...';

            // Collect advanced options
            const options = {
                expiry: expiryCheck.checked ? getExpiryDate() : null,
                password: passwordCheck.checked ? await getPassword() : null,
                geo: geoCheck.checked ? await getGeoTargeting() : null
            };
            
            // First check if we already have this URL shortened locally
            const existingShortCode = findExistingShortCode(url);
            if (existingShortCode) {
                const shortLink = `${domain}/${existingShortCode}`;
                showShortenedLink(shortenResult, shortLink);
                return;
            }
            
            // Try external APIs first if using the default domain
            if (domain === 'lnksht.pro') {
                try {
                    const shortLink = await tryShorteningServices(url, options);
                    showShortenedLink(shortenResult, shortLink, options);
                    
                    // Track in analytics
                    trackLink(shortLink, url, options);
                    return;
                } catch (apiError) {
                    console.log('API shortening failed, falling back to local method');
                }
            }
            
            // If APIs fail or using custom domain, use our local method
            const shortCode = path || generateShortCode(url);
            const shortLink = `${domain}/${shortCode}`;
            
            // Store the mapping
            urlMappings[shortCode] = {
                url: url,
                options: options,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('urlMappings', JSON.stringify(urlMappings));
            
            // Track in analytics
            trackLink(shortLink, url, options);
            
            showShortenedLink(shortenResult, shortLink, options);
            
            // Increment counter
            totalLinks++;
            localStorage.setItem('totalLinks', totalLinks);
            document.getElementById('total-links').textContent = totalLinks.toLocaleString();
        } catch (error) {
            showError(shortenResult, 'Failed to shorten URL: ' + error.message);
            console.error('Error:', error);
        } finally {
            shortenBtn.disabled = false;
            shortenBtn.innerHTML = '<i class="fas fa-magic"></i> Shorten URL';
        }
    });

    // Helper functions for advanced options
    function getExpiryDate() {
        // Default to 7 days from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        return expiryDate.toISOString();
    }

    async function getPassword() {
        return new Promise((resolve) => {
            // In a real app, you would show a modal or prompt
            const password = prompt('Enter password for this link (min 4 characters):');
            if (password && password.length >= 4) {
                resolve(password);
            } else {
                resolve(null);
            }
        });
    }

    async function getGeoTargeting() {
        return new Promise((resolve) => {
            // In a real app, you would show a proper UI for this
            const countries = prompt('Enter target countries (comma separated, e.g. "US,UK,DE"):');
            if (countries) {
                resolve(countries.split(',').map(c => c.trim().toUpperCase()));
            } else {
                resolve(null);
            }
        });
    }

    // QR code generator functionality
    const generateBtn = document.getElementById('generate-btn');
    const qrInput = document.getElementById('qr-input');
    const qrResult = document.getElementById('qr-result');
    const qrColor = document.getElementById('qr-color');
    const qrSize = document.getElementById('qr-size');
    const qrLogo = document.getElementById('qr-logo');

    generateBtn.addEventListener('click', async () => {
        const url = qrInput.value.trim();
        
        if (!url) {
            showError(qrResult, 'Please enter a URL');
            return;
        }
        
        if (!isValidUrl(url)) {
            showError(qrResult, 'Please enter a valid URL (include http:// or https://)');
            return;
        }
        
        try {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            
            await generateQRCode(url);
            
            // Increment counter
            totalQRs++;
            localStorage.setItem('totalQRs', totalQRs);
            document.getElementById('total-qrs').textContent = totalQRs.toLocaleString();
        } catch (error) {
            showError(qrResult, 'Failed to generate QR code: ' + error.message);
            console.error('Error:', error);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-qrcode"></i> Generate QR Code';
        }
    });

    // Analytics functionality
    const analyticsBtn = document.getElementById('analytics-btn');
    const analyticsInput = document.getElementById('analytics-input');
    const analyticsResult = document.getElementById('analytics-result');

    analyticsBtn.addEventListener('click', () => {
        const shortUrl = analyticsInput.value.trim();
        
        if (!shortUrl) {
            showError(analyticsResult, 'Please enter a short URL');
            return;
        }
        
        try {
            showAnalytics(shortUrl);
        } catch (error) {
            showError(analyticsResult, 'Failed to fetch analytics: ' + error.message);
            console.error('Error:', error);
        }
    });

    // Branded links functionality
    const brandedBtn = document.getElementById('branded-btn');
    const brandedUrlInput = document.getElementById('branded-url-input');
    const brandedPath = document.getElementById('branded-path');
    const brandedResult = document.getElementById('branded-result');

    brandedBtn.addEventListener('click', () => {
        const url = brandedUrlInput.value.trim();
        const path = brandedPath.value.trim();
        
        if (!url) {
            showError(brandedResult, 'Please enter a URL');
            return;
        }
        
        if (!path) {
            showError(brandedResult, 'Please enter a custom path');
            return;
        }
        
        if (!isValidUrl(url)) {
            showError(brandedResult, 'Please enter a valid URL (include http:// or https://)');
            return;
        }
        
        try {
            brandedBtn.disabled = true;
            brandedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            
            const shortLink = `yourbrand.com/${path}`;
            
            // Store the mapping
            urlMappings[path] = url;
            localStorage.setItem('urlMappings', JSON.stringify(urlMappings));
            
            // Track in analytics
            trackLink(shortLink, url);
            
            showShortenedLink(brandedResult, shortLink);
            
            // Increment counter
            totalLinks++;
            localStorage.setItem('totalLinks', totalLinks);
            document.getElementById('total-links').textContent = totalLinks.toLocaleString();
        } catch (error) {
            showError(brandedResult, 'Failed to create branded link: ' + error.message);
            console.error('Error:', error);
        } finally {
            brandedBtn.disabled = false;
            brandedBtn.innerHTML = '<i class="fas fa-tag"></i> Create Branded Link';
        }
    });

    // Check for short URLs on page load
    checkForShortUrl();

    // Helper functions
    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function showError(element, message) {
        element.innerHTML = `<div class="error" style="color: var(--error-color); padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">${message}</div>`;
    }

    function showSuccess(element, message) {
        element.innerHTML = `<div class="success" style="color: var(--success-color); padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">${message}</div>`;
    }

    function showShortenedLink(element, shortLink, options = {}) {
        let optionsHtml = '';
        
        if (options.expiry || options.password || options.geo) {
            optionsHtml = `
                <div class="link-options">
                    <h4>Link Options:</h4>
                    <ul>
                        ${options.expiry ? `<li><i class="fas fa-clock"></i> Expires: ${new Date(options.expiry).toLocaleString()}</li>` : ''}
                        ${options.password ? `<li><i class="fas fa-lock"></i> Password protected</li>` : ''}
                        ${options.geo ? `<li><i class="fas fa-globe"></i> Geo-targeting: ${options.geo.join(', ')}</li>` : ''}
                    </ul>
                </div>
            `;
        }
        
        element.innerHTML = `
            <div class="shortened-link">
                <a href="${ensureHttp(shortLink)}" target="_blank">${shortLink}</a>
                <button class="copy-btn" data-link="${shortLink}">
                    <i class="fas fa-copy"></i> Copy
                </button>
                ${shortLink.includes('lnksht.pro') ? '' : '<p class="local-notice">(This link will only work if you configure your domain)</p>'}
            </div>
            ${optionsHtml}
            <div class="analytics-link">
                <a href="#" class="view-analytics" data-link="${shortLink}">
                    <i class="fas fa-chart-bar"></i> View Analytics
                </a>
            </div>
        `;
        
        element.querySelector('.copy-btn').addEventListener('click', function() {
            navigator.clipboard.writeText(shortLink).then(() => {
                const btn = this;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            });
        });
        
        element.querySelector('.view-analytics').addEventListener('click', function(e) {
            e.preventDefault();
            const link = this.getAttribute('data-link');
            document.querySelector('.tab-btn[data-tab="analytics"]').click();
            document.getElementById('analytics-input').value = link;
            showAnalytics(link);
        });
    }

    function ensureHttp(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'https://' + url;
        }
        return url;
    }

    async function generateQRCode(url) {
        const color = qrColor.value.substring(1); // Remove #
        const size = qrSize.value;
        
        let qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=${color}`;
        
        // Check if a logo was uploaded
        if (qrLogo.files && qrLogo.files[0]) {
            // For a real implementation, you would need to upload the logo to a server
            // and then use the API with logo parameter
            // This is just a simulation
            qrCodeUrl += `&logo=https://yourdomain.com/logo.png`;
        }
        
        // Create the QR code image
        qrResult.innerHTML = `
            <div class="qr-code-container">
                <img src="${qrCodeUrl}" alt="QR Code for ${url}" class="qr-code-image">
                <div class="qr-actions">
                    <button class="download-btn" data-url="${qrCodeUrl}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
        
        // Add download functionality
        qrResult.querySelector('.download-btn').addEventListener('click', function() {
            const downloadUrl = this.getAttribute('data-url');
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `qr-code-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }

    function generateShortCode(url) {
        // Simple hash function to generate a short code
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36).substring(0, 6);
    }

    function findExistingShortCode(url, options) {
        // Check if we already have this URL shortened
        for (const [shortCode, data] of Object.entries(urlMappings)) {
            if (data.url === url) {
                // Check if options match
                const optsMatch = (
                    (!options.expiry && !data.options.expiry) || 
                    (options.expiry && data.options.expiry && new Date(options.expiry).getTime() === new Date(data.options.expiry).getTime())
                ) && (
                    (!options.password && !data.options.password) || 
                    (options.password && data.options.password && options.password === data.options.password)
                ) && (
                    (!options.geo && !data.options.geo) || 
                    (options.geo && data.options.geo && JSON.stringify(options.geo) === JSON.stringify(data.options.geo))
                );
                
                if (optsMatch) {
                    return shortCode;
                }
            }
        }
        return null;
    }

    async function tryShorteningServices(url) {
        // Try popular URL shortening APIs
        // Note: These would require actual API keys in a real implementation
        const services = [
            {
                name: 'shrtco.de',
                url: `https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(url)}`
            },
            {
                name: 'TinyURL',
                url: `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
                isPlainText: true
            },
            {
                name: 'is.gd',
                url: `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
                isPlainText: true
            },
            {
                name: 'Bitly',
                url: 'https://api-ssl.bitly.com/v4/shorten',
                options: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer YOUR_BITLY_TOKEN' // Replace with actual token
                    },
                    body: JSON.stringify({ long_url: url })
                }
            }
        ];
        
        // Try each service until one works
        for (const service of services) {
            try {
                const response = await fetchWithTimeout(service.url, {
                    timeout: 5000
                });
                
                if (service.isPlainText) {
                    const shortLink = await response.text();
                    if (shortLink && isValidUrl(shortLink)) {
                        return shortLink;
                    }
                } else {
                    const data = await response.json();
                    if (data.ok && data.result) {
                        return data.result.full_short_link || 
                               data.result.short_link || 
                               data.result.short_url;
                    }
                }
            } catch (error) {
                console.warn(`Failed with ${service.name}:`, error);
            }
        }
        
        throw new Error('All shortening services failed');
    }

    function fetchWithTimeout(url, options = {}) {
        const { timeout = 8000 } = options;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const fetchOptions = {
            ...options,
            signal: controller.signal
        };
        
        return fetch(url, fetchOptions)
            .then(response => {
                clearTimeout(timeoutId);
                return response;
            })
            .catch(error => {
                clearTimeout(timeoutId);
                throw error;
            });
    }

    function trackLink(shortLink, originalUrl, options = {}) {
        const shortCode = shortLink.split('/').pop();
        
        if (!analyticsData[shortCode]) {
            analyticsData[shortCode] = {
                originalUrl: originalUrl,
                clicks: 0,
                createdAt: new Date().toISOString(),
                devices: {},
                locations: {},
                referrers: {},
                options: options
            };
        }
        
        localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
    }

    function showAnalytics(shortUrl) {
        const shortCode = shortUrl.split('/').pop();
        const data = analyticsData[shortCode];
        
        if (!data) {
            showError(analyticsResult, 'No analytics data found for this URL');
            return;
        }
        
        // Simulate some analytics data
        const devices = {
            'Desktop': Math.floor(Math.random() * 100),
            'Mobile': Math.floor(Math.random() * 150),
            'Tablet': Math.floor(Math.random() * 50)
        };
        
        const locations = {
            'United States': Math.floor(Math.random() * 120),
            'United Kingdom': Math.floor(Math.random() * 80),
            'Germany': Math.floor(Math.random() * 60),
            'India': Math.floor(Math.random() * 90)
        };
        
        const referrers = {
            'Direct': Math.floor(Math.random() * 100),
            'Google': Math.floor(Math.random() * 80),
            'Facebook': Math.floor(Math.random() * 60),
            'Twitter': Math.floor(Math.random() * 40)
        };
        
        // Update the actual data with simulated clicks
        data.clicks = Object.values(devices).reduce((a, b) => a + b, 0);
        data.devices = devices;
        data.locations = locations;
        data.referrers = referrers;
        
        // Display the analytics
        analyticsResult.innerHTML = `
            <div class="analytics-dashboard">
                <div class="analytics-header">
                    <h3>Analytics for <a href="${ensureHttp(shortUrl)}" target="_blank">${shortUrl}</a></h3>
                    <p>Original URL: <a href="${ensureHttp(data.originalUrl)}" target="_blank">${data.originalUrl}</a></p>
                    <p>Created: ${new Date(data.createdAt).toLocaleString()}</p>
                </div>
                
                <div class="analytics-summary">
                    <div class="summary-card total-clicks">
                        <i class="fas fa-mouse-pointer"></i>
                        <div>
                            <h4>Total Clicks</h4>
                            <p>${data.clicks.toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="summary-card unique-visitors">
                        <i class="fas fa-users"></i>
                        <div>
                            <h4>Unique Visitors</h4>
                            <p>${Math.floor(data.clicks * 0.7).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                
                <div class="analytics-charts">
                    <div class="chart-container">
                        <h4>Devices</h4>
                        <div class="chart" id="devices-chart">
                            ${Object.entries(devices).map(([device, count]) => `
                                <div class="chart-bar">
                                    <div class="bar-label">${device}</div>
                                    <div class="bar-container">
                                        <div class="bar" style="width: ${(count / Math.max(...Object.values(devices))) * 100}%"></div>
                                        <div class="bar-value">${count}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <h4>Locations</h4>
                        <div class="chart" id="locations-chart">
                            ${Object.entries(locations).map(([location, count]) => `
                                <div class="chart-bar">
                                    <div class="bar-label">${location}</div>
                                    <div class="bar-container">
                                        <div class="bar" style="width: ${(count / Math.max(...Object.values(locations))) * 100}%"></div>
                                        <div class="bar-value">${count}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="chart-container">
                        <h4>Referrers</h4>
                        <div class="chart" id="referrers-chart">
                            ${Object.entries(referrers).map(([referrer, count]) => `
                                <div class="chart-bar">
                                    <div class="bar-label">${referrer}</div>
                                    <div class="bar-container">
                                        <div class="bar" style="width: ${(count / Math.max(...Object.values(referrers))) * 100}%"></div>
                                        <div class="bar-value">${count}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="analytics-actions">
                    <button class="export-btn">
                        <i class="fas fa-file-export"></i> Export Data
                    </button>
                </div>
            </div>
        `;
        
        // Add export functionality
        analyticsResult.querySelector('.export-btn').addEventListener('click', () => {
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${shortCode}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    function checkForShortUrl() {
        const path = window.location.pathname.substring(1);
        if (path && urlMappings[path]) {
            const linkData = urlMappings[path];
            
            // Check if link is expired
            if (linkData.options?.expiry && new Date(linkData.options.expiry) < new Date()) {
                document.body.innerHTML = `
                    <div class="error-page">
                        <h1>Link Expired</h1>
                        <p>This link expired on ${new Date(linkData.options.expiry).toLocaleString()}</p>
                    </div>
                `;
                return;
            }
            
            // Check if password protected
            if (linkData.options?.password) {
                const password = prompt('This link is password protected. Please enter the password:');
                if (password !== linkData.options.password) {
                    alert('Incorrect password');
                    return;
                }
            }
            
            // Check geo targeting
            if (linkData.options?.geo) {
                // In a real app, you would detect the user's country
                const userCountry = 'US'; // Simulated for demo
                if (!linkData.options.geo.includes(userCountry)) {
                    document.body.innerHTML = `
                        <div class="error-page">
                            <h1>Content Not Available</h1>
                            <p>This link is not available in your region</p>
                        </div>
                    `;
                    return;
                }
            }
            
            window.location.href = ensureHttp(linkData.url);
        }
    }
});