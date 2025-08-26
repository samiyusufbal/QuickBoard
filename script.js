// Configuration variables
const searchUrl = "https://searx.tiekoetter.com/search?q="; // Search engine URL
const weatherCity = "Istanbul"; // City for weather data
const openWeatherApiKey = "YOUR_API_KEY"; // OpenWeatherMap API key

// Search on enter key event
function search(e) {
  if (e.keyCode == 13) {
    var val = $("#search-field").val();
    if (val.trim() !== "") {
      window.open(searchUrl + val);
    }
  }
}

// Get current time and format
function getTime() {
  let date = new Date(),
    min = date.getMinutes(),
    sec = date.getSeconds(),
    hour = date.getHours();
  return (
    "" +
    (hour < 10 ? "0" + hour : hour) +
    ":" +
    (min < 10 ? "0" + min : min) +
    ":" +
    (sec < 10 ? "0" + sec : sec)
  );
}

// Handle Weather request
function getWeather() {
  $.ajax({
    url: `https://api.openweathermap.org/data/2.5/weather?q=${weatherCity}&units=metric&appid=${openWeatherApiKey}`,
    method: "GET",
    success: function(data) {
      $("#temp").html(data.main.temp.toFixed(0) + " °C");
      $("#weather-description").html(data.weather[0].description);
    },
    error: function(xhr) {
      console.log("Error message: " + xhr.status);
      $("#temp").html("N/A");
      $("#weather-description").html("No data");
    }
  });
}

// Handle writing out Bookmarks
function setupBookmarks() {
  const bookmarkHtml = bookmarks
    .map((b) => {
      const html = ["<div class='bookmark-set'>"];
      html.push(`<div class="bookmark-title">${b.title}</div>`);
      html.push('<div class="bookmark-inner-container">');
      html.push(
        ...b.links.map(
          (l) =>
            `<a class="bookmark" href="${l.url}" target="_blank">${l.name}</a>`
        )
      );
      html.push("</div></div>");
      return html.join("");
    })
    .join("");
  
  $("#bookmark-container").html(bookmarkHtml);
}

$(document).ready(function() {
  setupBookmarks();
  getWeather();
  
  // Set up the clock
  $("#clock").html(getTime());
  
  // Set clock interval to tick clock
  setInterval(function() {
    $("#clock").html(getTime());
  }, 100);
});

$(document).keyup(function(event) {
  if (event.keyCode == 32) {
    // Spacebar code to open search
    $("#search").css("display", "flex");
    $("#search-field").focus();
  } else if (event.keyCode == 27) {
    // Esc to close search
    $("#search-field").val("");
    $("#search-field").blur();
    $("#search").css("display", "none");
  }
});

// Close search when clicking outside the search box
$("#search").click(function(e) {
  if (e.target.id === "search") {
    $("#search-field").val("");
    $("#search-field").blur();
    $("#search").css("display", "none");
  }
});
