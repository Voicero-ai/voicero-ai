/**
 * WooCommerce Orders Client
 * A JavaScript client for interacting with WooCommerce orders via WordPress AJAX.
 */

// Create global namespace for orders data
window.VoiceroOrdersData = {
  initialized: false,
  isLoading: true,
  orders: null,
  lastFetched: null,
  errors: [],
};

var WooOrdersClient = {
  config: {
    ajaxUrl:
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig.ajaxUrl
        : "/wp-admin/admin-ajax.php",
    nonce: typeof voiceroConfig !== "undefined" ? voiceroConfig.nonce : "",
    defaultHeaders: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    debug: true,
    storageKey: "voicero_woo_orders",
    orderDays: 30, // Get orders from the last 30 days
    refreshInterval: 3600000, // 1 hour in milliseconds - how often to refresh orders
  },

  /**
   * Initialize the client with custom configuration
   * @param {Object} userConfig - Custom configuration to override defaults
   * @returns {Object} - The client instance for chaining
   */
  init: function (userConfig = {}) {
    this.config = {
      ...this.config,
      ...userConfig,
      defaultHeaders: {
        ...this.config.defaultHeaders,
        ...(userConfig.defaultHeaders || {}),
      },
    };

    if (this.config.debug) {
    }

    return this;
  },

  /**
   * Load orders from localStorage if available
   * Only used as a fallback if server fetch fails
   */
  loadFromLocalStorage: function () {
    try {
      var storedData = localStorage.getItem(this.config.storageKey);
      if (storedData) {
        var parsedData = JSON.parse(storedData);
        if (parsedData.orders) {
          window.VoiceroOrdersData.orders = parsedData.orders;
          window.VoiceroOrdersData.lastFetched = parsedData.lastFetched;
          window.VoiceroOrdersData.initialized = true;
          window.VoiceroOrdersData.isLoading = false;

          // Render orders if there's a container
          this.renderOrdersToDOM(parsedData.orders);
          return true;
        }
      }
    } catch (e) {
      console.error("Error loading from localStorage:", e);
    }
    return false;
  },

  /**
   * Save orders to localStorage
   * @param {Object} orders - The orders data to save
   */
  saveToLocalStorage: function (orders) {
    try {
      var dataToStore = {
        orders: orders,
        lastFetched: new Date().toISOString(),
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(dataToStore));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  },

  /**
   * Fetch orders from WordPress using AJAX
   * @returns {Promise} - A promise that resolves with the orders data
   */
  fetchAndLogOrders: function () {
    // Set loading state
    window.VoiceroOrdersData.isLoading = true;

    // Create form data for the AJAX request
    var formData = new FormData();
    formData.append("action", "voicero_get_woo_orders");
    formData.append("nonce", this.config.nonce);
    formData.append("days", this.config.orderDays);

    return fetch(this.config.ajaxUrl, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((response) => {
        if (response.success && response.data) {
          // Store in global variable
          window.VoiceroOrdersData.orders = response.data;
          window.VoiceroOrdersData.lastFetched = new Date().toISOString();
          window.VoiceroOrdersData.initialized = true;
          window.VoiceroOrdersData.isLoading = false;

          // Save to localStorage
          this.saveToLocalStorage(response.data);

          // Create an HTML element to display orders if on a page with #orders-container
          this.renderOrdersToDOM(response.data);

          return response.data;
        } else {
          console.error(
            "Error in orders response:",
            response.data || "Unknown error"
          );

          window.VoiceroOrdersData.errors.push({
            time: new Date().toISOString(),
            message: response.data || "Unknown error in orders response",
          });
          window.VoiceroOrdersData.isLoading = false;

          throw new Error(response.data || "Failed to fetch orders");
        }
      })
      .catch((error) => {
        console.error("Failed to fetch orders:", error);

        window.VoiceroOrdersData.errors.push({
          time: new Date().toISOString(),
          message: error.message || "Failed to fetch orders",
        });
        window.VoiceroOrdersData.isLoading = false;

        // Try to load from localStorage as a fallback
        this.loadFromLocalStorage();

        throw error;
      });
  },

  /**
   * Force refresh orders data from the server
   * @returns {Promise} - A promise that resolves with the orders data
   */
  refreshOrders: function () {
    return this.fetchAndLogOrders();
  },

  /**
   * Render orders to the DOM if a container exists
   * @param {Object} orders - The orders data
   */
  renderOrdersToDOM: function (orders) {},
};

// Make globally available
window.WooOrdersClient = window.WooOrdersClient || WooOrdersClient;

// Initialize with debug mode on to log all requests and responses
WooOrdersClient.init({ debug: true });

// Always fetch from the server first
WooOrdersClient.fetchAndLogOrders()
  .then((orders) => {})
  .catch((error) => {
    console.error("❌ Error in fresh data fetch:", error);
  });

// Also try with DOMContentLoaded for safety
document.addEventListener("DOMContentLoaded", function () {
  // Always fetch fresh data on page load
  WooOrdersClient.fetchAndLogOrders()
    .then((orders) => {})
    .catch((error) => {
      console.error("❌ Error in DOMContentLoaded fetch:", error);
    });
});
