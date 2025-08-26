const CONFIG = new Proxy({
  searchUrl: "https://searx.tiekoetter.com/search?q=",
  weatherCity: "Istanbul",
  openWeatherApiKey: "YOUR_API_KEY",
  clockUpdateInterval: 1000, // Update every second instead of 100ms
  timezone: "Europe/Istanbul", // Default timezone - can be changed
  units: "metric", // Default metric - can be imperial
  hourFormat: "24" // "12" or "24" hour format
}, {
  set(target, property, value) {
    const oldValue = target[property];
    target[property] = value;
    
    // If timezone or hourFormat is changed, restart the clock
    if ((property === 'timezone' || property === 'hourFormat') && oldValue !== value && typeof Clock !== 'undefined') {
      console.log(`${property} changed from ${oldValue} to ${value}`);
      Clock.restart();
    }
    
    return true;
  }
});

// Utility functions
const Utils = {
  // Get current date (system locale)
  getCurrentDate(timezone = CONFIG.timezone) {
    const date = new Date();
    try {
      const dateOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      return date.toLocaleDateString(undefined, dateOptions); // system locale
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}. Using local date.`);
      return `${date.getDate().toString().padStart(2,'0')}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getFullYear()}`;
    }
  },

  // Get current time
  getCurrentTime(timezone = CONFIG.timezone) {
    const date = new Date();
    try {
      const timeOptions = {
        timeZone: timezone,
        hour12: String(CONFIG.hourFormat) === "12",
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };

      const timeString = date.toLocaleTimeString(undefined, timeOptions);
      return String(CONFIG.hourFormat) === "12"
        ? timeString.replace(/\s?(ÖÖ|ÖS|AM|PM)/, '') // AM/PM & ÖÖ/ÖS sil
        : timeString;
    } catch (error) {
      console.warn(`Invalid timezone: ${timezone}. Using local time.`);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  },

  // Format temperature
  formatTemperature(temp) {
    return `${Math.round(temp)} °C`;
  },

  // Open search in new tab
  openSearch(query) {
    if (query.trim()) {
      window.open(CONFIG.searchUrl + encodeURIComponent(query));
    }
  }
};

// Search functionality
const Search = {
  elements: {
    searchContainer: '#search',
    searchField: '#search-field'
  },

  init() {
    $(document).on('keyup', this.handleKeyPress.bind(this));
    $(this.elements.searchContainer).on('click', this.handleContainerClick.bind(this));
    $(this.elements.searchField).on('keypress', this.handleSearch.bind(this));
  },

  handleKeyPress(event) {
    const { keyCode } = event;
    
    if (keyCode === 32) { // Spacebar - open search
      this.show();
    } else if (keyCode === 27) { // Escape - close search
      this.hide();
    }
  },

  handleContainerClick(event) {
    if (event.target.id === 'search') {
      this.hide();
    }
  },

  handleSearch(event) {
    if (event.keyCode === 13) { // Enter key
      const query = $(this.elements.searchField).val();
      Utils.openSearch(query);
    }
  },

  show() {
    $(this.elements.searchContainer).css('display', 'flex');
    $(this.elements.searchField).focus();
  },

  hide() {
    $(this.elements.searchField).val('').blur();
    $(this.elements.searchContainer).hide();
  }
};

// Weather functionality
const Weather = {
  elements: {
    temperature: '#temp',
    description: '#weather-description'
  },

  async fetchWeather() {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CONFIG.weatherCity}&units=${CONFIG.units}&appid=${CONFIG.openWeatherApiKey}`;
    
    try {
      const response = await $.ajax({
        url: apiUrl,
        method: 'GET',
        timeout: 10000 // 10 second timeout
      });
      
      this.displayWeather(response);
    } catch (error) {
      console.error('Weather API error:', error);
      this.displayError();
    }
  },

  displayWeather(data) {
    $(this.elements.temperature).text(Utils.formatTemperature(data.main.temp));
    $(this.elements.description).text(data.weather[0].description);
  },

  displayError() {
    $(this.elements.temperature).text('N/A');
    $(this.elements.description).text('Connection error');
  }
};

// Clock functionality
const Clock = {
  element: '#clock',
  intervalId: null,

  init() {
    this.update();
    this.startTicking();
  },

  update() {
    const dateStr = Utils.getCurrentDate();
    const timeStr = Utils.getCurrentTime();
    $(this.element).html(`
      <div class="date">${dateStr}</div>
      <div class="time">${timeStr}</div>
    `);
  },

  startTicking() {
    // Calculate milliseconds until next second to sync properly
    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();
    
    // First timeout to sync to the next second boundary
    setTimeout(() => {
      this.update();
      // Then start the regular interval
      this.intervalId = setInterval(() => {
        this.update();
      }, CONFIG.clockUpdateInterval);
    }, msUntilNextSecond);
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  restart() {
    this.stop();
    this.init();
  }
};

// Bookmarks functionality
const Bookmarks = {
  element: '#bookmark-container',

  init() {
    if (typeof bookmarks !== 'undefined' && Array.isArray(bookmarks)) {
      this.render();
    } else {
      console.warn('Bookmarks data not found or invalid');
    }
  },

  render() {
    const html = bookmarks.map(this.createBookmarkSet).join('');
    $(this.element).html(html);
  },

  createBookmarkSet(bookmarkSet) {
    const linksHtml = bookmarkSet.links
      .map(link => `<a class="bookmark" href="${link.url}" target="_blank">${link.name}</a>`)
      .join('');

    return `
      <div class='bookmark-set'>
        <div class="bookmark-title">${bookmarkSet.title}</div>
        <div class="bookmark-inner-container">
          ${linksHtml}
        </div>
      </div>
    `;
  }
};

// Main application initialization
$(document).ready(() => {
  // Initialize all components
  Bookmarks.init();
  Weather.fetchWeather();
  Clock.init();
  Search.init();

  // Handle page visibility changes to optimize performance
  $(document).on('visibilitychange', () => {
    if (document.hidden) {
      Clock.stop();
    } else {
      Clock.init(); // Re-initialize to sync properly when page becomes visible again
    }
  });
});

