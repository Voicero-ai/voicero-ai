/**
 * Voicero Return Handler
 * Handles order cancellations for WooCommerce orders
 */

var VoiceroReturnHandler = {
  config: {
    defaultHeaders: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    debug: true,
  },

  /**
   * Initialize the handler with custom configuration
   * @param {Object} userConfig - Custom configuration to override defaults
   * @returns {Object} - The handler instance for chaining
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
   * Handle an order cancellation request
   * @param {Object} context - The context object with order details
   * @returns {Promise} - A promise that resolves when the cancellation is processed
   */
  handleCancelOrder: async function (context) {
    // Handle different parameter formats (support both email and order_email)
    var context_normalized = { ...context };
    if (!context_normalized.email && context_normalized.order_email) {
      context_normalized.email = context_normalized.order_email;
    }

    var { order_id, order_number, email } = context_normalized || {};
    var orderIdentifier = order_id || order_number;

    // Check if we have the required information
    if (!orderIdentifier) {
      this.notifyUser(
        "To cancel an order, I need your order number. Please provide it."
      );
      return;
    }

    if (!email) {
      this.notifyUser(
        "To verify your identity for the cancellation, I need the email address used when placing the order."
      );
      return;
    }

    // Check if user is logged in
    var isLoggedIn = this.checkUserLoggedIn();
    if (!isLoggedIn) {
      this.notifyUser(
        "You need to be logged into your account to cancel an order. Please log in first."
      );
      return;
    }

    // Verify order belongs to user
    if (!(await this.verifyOrderOwnership(orderIdentifier, email))) {
      this.notifyUser(
        "I couldn't verify that this order belongs to your account. Please check the order number and email address."
      );
      return;
    }

    this.notifyUser(
      "I'm processing your cancellation request. This may take a moment..."
    );

    // Use WordPress AJAX to cancel the WooCommerce order
    try {
      // Get AJAX configuration from voiceroConfig
      var ajaxUrl =
        window.voiceroConfig && window.voiceroConfig.ajaxUrl
          ? window.voiceroConfig.ajaxUrl
          : "/wp-admin/admin-ajax.php";

      var nonce =
        window.voiceroConfig && window.voiceroConfig.nonce
          ? window.voiceroConfig.nonce
          : "";

      // Prepare the form data for the AJAX request
      var formData = new FormData();
      formData.append("action", "voicero_cancel_order");
      formData.append("nonce", nonce);
      formData.append("order_id", orderIdentifier);
      formData.append("email", email);
      formData.append(
        "reason",
        context.reason || "Customer requested cancellation"
      );
      formData.append("refund", context.refund !== false ? "1" : "0");
      formData.append("restock", context.restock !== false ? "1" : "0");
      formData.append("notify_customer", "1");

      // Send the update via WordPress AJAX
      var response = await fetch(ajaxUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      var data = await response.json();

      if (data.success) {
        this.notifyUser(
          `✅ Your order #${orderIdentifier} has been cancelled successfully! You should receive a confirmation email shortly.`
        );
      } else {
        this.notifyUser(
          `❌ I couldn't cancel your order automatically: ${
            data.data?.message || "Unknown error"
          }. Please contact customer support for assistance.`
        );
      }
    } catch (error) {
      console.error("Order cancellation error:", error);
      this.notifyUser(
        "There was a problem cancelling your order. Please contact customer support directly for assistance."
      );
    }
  },

  /**
   * Verify that the order belongs to the user with the given email
   * @param {string} orderNumber - The order ID or number
   * @param {string} email - The email to verify
   * @returns {Promise<boolean>} - True if the order belongs to the user
   */
  verifyOrderOwnership: async function (orderNumber, email) {
    try {
      // Get AJAX configuration from voiceroConfig
      var ajaxUrl =
        window.voiceroConfig && window.voiceroConfig.ajaxUrl
          ? window.voiceroConfig.ajaxUrl
          : "/wp-admin/admin-ajax.php";

      var nonce =
        window.voiceroConfig && window.voiceroConfig.nonce
          ? window.voiceroConfig.nonce
          : "";

      // Prepare the form data for the AJAX request
      var formData = new FormData();
      formData.append("action", "voicero_verify_order");
      formData.append("nonce", nonce);
      formData.append("order_id", orderNumber);
      formData.append("email", email);

      // Send the verification request
      var response = await fetch(ajaxUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      if (!response.ok) {
        return false;
      }

      var data = await response.json();
      return data.success && data.data.verified;
    } catch (error) {
      console.error("Order verification error:", error);
      return false;
    }
  },

  /**
   * Check if the user is currently logged in
   * @returns {boolean} - True if the user is logged in
   */
  checkUserLoggedIn: function () {
    // Try different ways to check if user is logged in

    // Method 1: VoiceroUserData
    if (window.VoiceroUserData && window.VoiceroUserData.isLoggedIn) {
      return true;
    }

    // Method 2: Customer data injection
    if (window.__VoiceroCustomerData && window.__VoiceroCustomerData.id) {
      return true;
    }

    // Method 3: Check for login-specific elements on the page
    var accountLinks = document.querySelectorAll(
      ".woocommerce-MyAccount-navigation, .woocommerce-account"
    );
    var logoutLinks = document.querySelectorAll('a[href*="/logout"]');

    if (accountLinks.length > 0 || logoutLinks.length > 0) {
      return true;
    }

    return false;
  },

  /**
   * Show a notification to the user
   * @param {string} message - The message to display
   */
  notifyUser: function (message) {
    // Try VoiceroText first
    if (window.VoiceroText && window.VoiceroText.addMessage) {
      window.VoiceroText.addMessage(message, "ai");
      return;
    }

    // Try VoiceroVoice next
    if (window.VoiceroVoice && window.VoiceroVoice.addMessage) {
      window.VoiceroVoice.addMessage(message, "ai");
      return;
    }

    // Fallback to console and alert
    alert(message);
  },
};

// Export as global
window.VoiceroReturnHandler = VoiceroReturnHandler;

// Direct action interceptor to catch cancel_order actions
// Add this before the DOMContentLoaded event
if (!window.originalHandleAction && window.handleAction) {
  // Store the original function
  window.originalHandleAction = window.handleAction;

  // Replace with our intercepting version
  window.handleAction = function (action, data) {
    // Check if this is a cancel action
    if ((action === "cancel_order" || action === "cancel") && data) {
      // Normalize the data
      var cancelContext = {
        order_id: data.order_id,
        email: data.order_email || data.email,
        reason: data.reason || "Customer requested cancellation",
      };

      // Call our handler
      if (window.VoiceroReturnHandler) {
        window.VoiceroReturnHandler.handleCancelOrder(cancelContext);
        return true; // Signal that we handled it
      }
    }

    // Pass through to original handler
    return window.originalHandleAction(action, data);
  };
}

// Initialize on load
document.addEventListener("DOMContentLoaded", function () {
  if (window.VoiceroReturnHandler) {
    window.VoiceroReturnHandler.init();

    // CRITICAL FIX: Connect AI response to cancel handler
    document.addEventListener("ai_response", function (event) {
      var response = event.detail;
      // Check if this is a cancel_order action with context
      if (
        response &&
        (response.action === "cancel_order" || response.action === "cancel") &&
        response.action_context
      ) {
        // Extract reason from any possible location
        var reason =
          response.reason ||
          (response.action_context && response.action_context.reason) ||
          "Customer requested cancellation";

        // Map action_context to the format expected by handleCancelOrder
        var cancelContext = {
          order_id: response.action_context.order_id,
          email:
            response.action_context.order_email ||
            response.action_context.email,
          reason: reason,
        };

        // Call the cancel handler
        window.VoiceroReturnHandler.handleCancelOrder(cancelContext);
      }
    });

    // Also intercept formatted responses that might come in a different event
    document.addEventListener("formatted_response", function (event) {
      var response = event.detail;
      if (
        response &&
        (response.action === "cancel_order" || response.action === "cancel") &&
        response.action_context
      ) {
        // Extract reason from any possible location
        var reason =
          response.reason ||
          (response.action_context && response.action_context.reason) ||
          "Customer requested cancellation";

        var cancelContext = {
          order_id: response.action_context.order_id,
          email:
            response.action_context.order_email ||
            response.action_context.email,
          reason: reason,
        };

        window.VoiceroReturnHandler.handleCancelOrder(cancelContext);
      }
    });
  }
});
