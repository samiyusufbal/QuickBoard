const CONFIG = new Proxy({
  searchUrl: "https://www.google.com/search?q=",
  weatherCity: "Istanbul",
  openWeatherApiKey: "OPENWEATHER_API_KEY",
  clockUpdateInterval: 1000,
  timezone: "Europe/Istanbul",
  units: "metric",
  hourFormat: "24",
  accentColor: "#4dabf7",
  showBackground: true,
  showQuotes: true
}, {
  set(target, property, value) {
    const oldValue = target[property];
    target[property] = value;
    
    // Save settings to local storage
    try {
      localStorage.setItem('QB_CONFIG', JSON.stringify(target));
    } catch (e) {}

    // Handle immediate UI updates
    if (property === 'accentColor') {
      document.documentElement.style.setProperty('--accent', value);
    }

    if (property === 'showBackground') {
      if (value) Weather.fetchWeather();
      else {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = 'var(--bg)';
      }
    }

    if (property === 'showQuotes') {
      document.getElementById('quote-container').style.display = value ? 'block' : 'none';
    }

    if ((property === 'timezone' || property === 'hourFormat') && oldValue !== value && typeof Clock !== 'undefined') {
      Clock.restart();
    }
    
    return true;
  }
});

const Utils = {
  getCurrentDate(timezone = CONFIG.timezone) {
    const date = new Date();
    try {
      const dateOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      return date.toLocaleDateString(navigator.language, dateOptions);
    } catch (error) {
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    }
  },

  getCurrentTime(timezone = CONFIG.timezone) {
    const date = new Date();
    const is12Hour = String(CONFIG.hourFormat) === "12";
    try {
      const timeOptions = {
        timeZone: timezone,
        hour12: is12Hour,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      };

      let timeString = date.toLocaleTimeString(navigator.language, timeOptions);
      if (is12Hour) {
        timeString = timeString.replace(/\s?(ÖÖ|ÖS|AM|PM)/i, '');
      }
      return timeString;
    } catch (error) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
  },

  formatTemperature(temp) {
    const unit = CONFIG.units === "metric" ? "°C" : "°F";
    return `${Math.round(temp)} ${unit}`;
  },

  openSearch(query) {
    if (query.trim()) {
      window.open(CONFIG.searchUrl + encodeURIComponent(query), '_blank');
    }
  }
};

const Background = {
  async update(keyword = 'nature,dark') {
    if (!CONFIG.showBackground) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Using LoremFlickr: Extremely fast and reliable alternative to Unsplash
    const url = `https://loremflickr.com/${width}/${height}/${keyword.split(',')[0]}?lock=${Math.floor(Math.random() * 1000)}`;
    
    const img = new Image();
    img.src = url;
    img.onload = () => {
      document.body.style.backgroundImage = `url('${url}')`;
    };
    img.onerror = () => {
      console.error('Image failed to load from primary source. Using fallback.');
      document.body.style.backgroundColor = 'var(--bg)';
    };
  }
};

const Quote = {
  // Local fallback quotes
  fallbackQuotes: [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" }
  ],

  init() {
    this.updateVisibility();
    this.fetchLiveQuote();
  },

  updateVisibility() {
    document.getElementById('quote-container').style.display = CONFIG.showQuotes ? 'block' : 'none';
  },

  async fetchLiveQuote() {
    if (!CONFIG.showQuotes) return;

    try {
      const response = await fetch('https://dummyjson.com/quotes/random');
      if (!response.ok) throw new Error('API limit or issue');
      
      const data = await response.json();
      this.render(data.quote, data.author);
    } catch (error) {
      console.warn('Live quote failed, using fallback:', error);
      this.displayRandomFallback();
    }
  },

  displayRandomFallback() {
    const index = Math.floor(Math.random() * this.fallbackQuotes.length);
    const quote = this.fallbackQuotes[index];
    this.render(quote.text, quote.author);
  },

  render(text, author) {
    document.getElementById('quote-text').textContent = `"${text}"`;
    document.getElementById('quote-author').textContent = `— ${author}`;
  }
};

const Help = {
  element: document.getElementById('help-modal'),
  btn: document.getElementById('help-btn'),
  close: document.getElementById('close-help'),

  init() {
    this.btn.addEventListener('click', () => this.toggle());
    this.close.addEventListener('click', () => this.closeModal());
    
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) this.closeModal();
    });
  },

  toggle() {
    const isVisible = this.element.style.display === 'flex';
    if (isVisible) this.closeModal();
    else this.open();
  },

  open() {
    this.element.style.display = 'flex';
  },

  closeModal() {
    this.element.style.display = 'none';
  }
};

const Settings = {
  elements: {
    modal: document.getElementById('settings-modal'),
    btn: document.getElementById('settings-btn'),
    close: document.getElementById('close-settings'),
    save: document.getElementById('save-settings'),
    // Inputs
    searchEngine: document.getElementById('set-search-engine'),
    city: document.getElementById('set-city'),
    apiKey: document.getElementById('set-api-key'),
    units: document.getElementById('set-units'),
    accent: document.getElementById('set-accent-color'),
    hourFormat: document.getElementById('set-hour-format'),
    showBg: document.getElementById('set-show-bg'),
    showQuotes: document.getElementById('set-show-quotes')
  },

  init() {
    this.elements.btn.addEventListener('click', () => this.open());
    this.elements.close.addEventListener('click', () => this.close());
    this.elements.save.addEventListener('click', () => this.save());
    
    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) this.close();
    });
  },

  open() {
    this.elements.searchEngine.value = CONFIG.searchUrl;
    this.elements.city.value = CONFIG.weatherCity;
    this.elements.apiKey.value = CONFIG.openWeatherApiKey === "OPENWEATHER_API_KEY" ? "" : CONFIG.openWeatherApiKey;
    this.elements.units.value = CONFIG.units;
    this.elements.accent.value = CONFIG.accentColor;
    this.elements.hourFormat.value = CONFIG.hourFormat;
    this.elements.showBg.checked = CONFIG.showBackground;
    this.elements.showQuotes.checked = CONFIG.showQuotes;

    this.elements.modal.style.display = 'flex';
  },

  close() {
    this.elements.modal.style.display = 'none';
  },

  save() {
    CONFIG.searchUrl = this.elements.searchEngine.value;
    CONFIG.weatherCity = this.elements.city.value || "Istanbul";
    CONFIG.openWeatherApiKey = this.elements.apiKey.value || "OPENWEATHER_API_KEY";
    CONFIG.units = this.elements.units.value;
    CONFIG.accentColor = this.elements.accent.value;
    CONFIG.hourFormat = this.elements.hourFormat.value;
    CONFIG.showBackground = this.elements.showBg.checked;
    CONFIG.showQuotes = this.elements.showQuotes.checked;

    Weather.fetchWeather();
    this.close();
  }
};

const Search = {
  elements: {
    container: document.getElementById('search'),
    field: document.getElementById('search-field')
  },

  init() {
    document.addEventListener('keyup', (e) => this.handleKeyPress(e));
    this.elements.container.addEventListener('click', (e) => this.handleContainerClick(e));
    this.elements.field.addEventListener('keypress', (e) => this.handleSearch(e));
  },

  handleKeyPress(event) {
    const isEditingInput = document.activeElement.tagName === 'INPUT';

    // Space to search
    if (event.code === 'Space' && !isEditingInput) {
      this.show();
    } 
    // Escape to close all
    else if (event.key === 'Escape') {
      this.hide();
      Settings.close();
      Help.closeModal();
    }
    // H for help
    else if (event.key.toLowerCase() === 'h' && !isEditingInput) {
      Help.toggle();
    }
    // S for settings
    else if (event.key.toLowerCase() === 's' && !isEditingInput) {
      Settings.open();
    }
  },

  handleContainerClick(event) {
    if (event.target === this.elements.container) {
      this.hide();
    }
  },

  handleSearch(event) {
    if (event.key === 'Enter') {
      Utils.openSearch(this.elements.field.value);
      this.hide();
    }
  },

  show() {
    this.elements.container.style.display = 'flex';
    this.elements.field.value = '';
    this.elements.field.focus();
  },

  hide() {
    this.elements.field.blur();
    this.elements.container.style.display = 'none';
  }
};

const Weather = {
  elements: {
    temp: document.getElementById('temp'),
    desc: document.getElementById('weather-description')
  },

  async fetchWeather() {
    if (!CONFIG.openWeatherApiKey || CONFIG.openWeatherApiKey === "OPENWEATHER_API_KEY") {
      Background.update();
      this.displayError("API Key missing");
      return;
    }

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${CONFIG.weatherCity}&units=${CONFIG.units}&appid=${CONFIG.openWeatherApiKey}`;
    
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Weather data could not be fetched');
      const data = await response.json();
      this.displayWeather(data);
      
      if (CONFIG.showBackground) {
        Background.update(`${data.weather[0].main.toLowerCase()},nature,hd`);
      }
    } catch (error) {
      console.error('Weather error:', error);
      this.displayError('Weather unavailable');
      Background.update();
    }
  },

  displayWeather(data) {
    this.elements.temp.textContent = Utils.formatTemperature(data.main.temp);
    this.elements.desc.textContent = data.weather[0].description;
  },

  displayError(msg) {
    this.elements.temp.textContent = 'N/A';
    this.elements.desc.textContent = msg;
  }
};

const TimeProgress = {
  elements: {
    bar: document.getElementById('progress-bar'),
    text: document.getElementById('progress-text')
  },

  init() {
    this.update();
  },

  update() {
    const now = new Date();
    const passedSeconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const totalSeconds = 24 * 3600;
    const percentage = (passedSeconds / totalSeconds) * 100;
    
    this.elements.bar.style.width = `${percentage}%`;
    this.elements.text.textContent = `Day Progress: ${Math.round(percentage)}%`;
  }
};

const Clock = {
  elements: {
    date: document.getElementById('date'),
    time: document.getElementById('time')
  },
  intervalId: null,

  init() {
    this.update();
    this.startTicking();
  },

  update() {
    const dateStr = Utils.getCurrentDate();
    const timeStr = Utils.getCurrentTime();
    
    if (this.elements.date.textContent !== dateStr) {
      this.elements.date.textContent = dateStr;
    }
    if (this.elements.time.textContent !== timeStr) {
      this.elements.time.textContent = timeStr;
      // Update Tab Title: "14:05 | QuickBoard"
      document.title = `${timeStr} | QuickBoard`;
      // Also update progress bar if it's a new minute/second
      TimeProgress.update();
    }
  },

  startTicking() {
    const now = new Date();
    const msUntilNextSecond = 1000 - now.getMilliseconds();
    
    setTimeout(() => {
      this.update();
      this.intervalId = setInterval(() => this.update(), CONFIG.clockUpdateInterval);
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

const Bookmarks = {
  element: document.getElementById('bookmark-container'),

  init() {
    if (typeof bookmarks !== 'undefined' && Array.isArray(bookmarks)) {
      this.render();
    }
  },

  render() {
    const html = bookmarks.map((set, index) => this.createBookmarkSet(set, index)).join('');
    this.element.innerHTML = html;
  },

  createBookmarkSet(bookmarkSet, index) {
    const linksHtml = bookmarkSet.links
      .map(link => {
        const domain = new URL(link.url).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        return `<a class="bookmark" href="${link.url}" target="_blank" rel="noopener">
          <img src="${faviconUrl}" alt="${link.name} icon" loading="lazy">
          ${link.name}
        </a>`;
      })
      .join('');

    // Staggered animation delay starting after quote container (0.5s)
    const delay = 0.5 + (index * 0.1);
    
    return `
      <section class='bookmark-set' style="animation-delay: ${delay}s">
        <h2 class="bookmark-title">${bookmarkSet.title}</h2>
        <div class="bookmark-inner-container">
          ${linksHtml}
        </div>
      </section>
    `;
  }
};

// Start the application
document.addEventListener('DOMContentLoaded', () => {
  // 1. Load saved settings first
  const savedConfig = localStorage.getItem('QB_CONFIG');
  if (savedConfig) {
    try {
      const parsed = JSON.parse(savedConfig);
      Object.assign(CONFIG, parsed);
      // Apply accent color on load
      if (CONFIG.accentColor) {
        document.documentElement.style.setProperty('--accent', CONFIG.accentColor);
      }
    } catch (e) {
      console.error("Settings load failed:", e);
    }
  }

  // 2. Initialize Components
  Bookmarks.init();
  Weather.fetchWeather();
  Clock.init();
  Search.init();
  Quote.init();
  Settings.init();
  Help.init();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Clock.stop();
    } else {
      Clock.restart();
    }
  });
});







