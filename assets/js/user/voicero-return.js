/**
 * Voicero Return Handler
 * Handles return, refund, exchange, and cancel order functionality
 */

var VoiceroReturnHandler = {
  init: function () {
    // Initialize return handler
    ("VoiceroReturnHandler initialized");
    return this;
  },

  /**
   * Handle return request
   * @param {Object} context - The action context with order details
   */
  handleReturn: function (context) {
    // Normalize context to handle different field names
    var normalizedContext = { ...context };

    // Handle order_number vs order_id
    if (!normalizedContext.order_id && normalizedContext.order_number) {
      normalizedContext.order_id = normalizedContext.order_number;
    }

    var {
      order_id,
      email,
      reason,
      items,
      return_type = "refund",
    } = normalizedContext || {};

    // If we don't have order_id AND email, we need to ask for them
    if (!order_id || !email) {
      // Instead of showing an error, ask for the information we need
      let message = "To process your return request, I'll need a few details:";

      if (!order_id && !email) {
        message +=
          "\n\n1. Your order number\n2. The email address used for the order\n3. The reason for your return";
      } else if (!order_id) {
        message += "\n\nPlease provide your order number.";
      } else if (!email) {
        message +=
          "\n\nPlease provide the email address associated with order #" +
          order_id;
      }

      message +=
        "\n\nOnce you provide this information, I can help process your return request.";

      this.showMessage(message);
      return;
    }

    this.showMessage(`Looking up order #${order_id} for return processing...`);

    // Format items if provided
    let formattedItems = [];
    if (items && Array.isArray(items)) {
      formattedItems = items;
    } else if (items && typeof items === "object") {
      // Convert from object format to array
      formattedItems = Object.keys(items).map((key) => {
        return {
          product_id: key,
          quantity: items[key].quantity || 1,
          reason: items[key].reason || reason,
        };
      });
    }

    // Call our WordPress AJAX endpoint
    this.initiateReturn({
      order_id: order_id,
      email: email,
      reason: reason || "Customer requested return",
      items: formattedItems,
      return_type: return_type,
    });
  },

  /**
   * Handle return_order action (alias for return)
   * @param {Object} context - The action context with order details
   */
  handleReturn_order: function (context) {
    // This is just an alias for handleReturn to maintain compatibility
    // with different action naming conventions
    this.handleReturn(context);
  },

  /**
   * Handle refund request (alias for return with refund type)
   * @param {Object} context - The action context with order details
   */
  handleRefund: function (context) {
    // Normalize context to handle different field names
    var normalizedContext = { ...context };

    // Handle order_number vs order_id
    if (!normalizedContext.order_id && normalizedContext.order_number) {
      normalizedContext.order_id = normalizedContext.order_number;
    }

    // Check if we have the minimum required information
    var { order_id, email } = normalizedContext || {};

    if (!order_id || !email) {
      // Ask for the information we need
      let message = "To process your refund request, I'll need a few details:";

      if (!order_id && !email) {
        message +=
          "\n\n1. Your order number\n2. The email address used for the order\n3. The reason for your refund request";
      } else if (!order_id) {
        message += "\n\nPlease provide your order number.";
      } else if (!email) {
        message +=
          "\n\nPlease provide the email address associated with order #" +
          order_id;
      }

      message +=
        "\n\nOnce you provide this information, I can help process your refund request.";

      this.showMessage(message);
      return;
    }

    // Add refund type to context
    var updatedContext = {
      ...normalizedContext,
      return_type: "refund",
    };
    this.handleReturn(updatedContext);
  },

  /**
   * Handle exchange request (alias for return with exchange type)
   * @param {Object} context - The action context with order details
   */
  handleExchange: function (context) {
    // Normalize context to handle different field names
    var normalizedContext = { ...context };

    // Handle order_number vs order_id
    if (!normalizedContext.order_id && normalizedContext.order_number) {
      normalizedContext.order_id = normalizedContext.order_number;
    }

    // Check if we have the minimum required information
    var { order_id, email } = normalizedContext || {};

    if (!order_id || !email) {
      // Ask for the information we need
      let message =
        "To process your exchange request, I'll need a few details:";

      if (!order_id && !email) {
        message +=
          "\n\n1. Your order number\n2. The email address used for the order\n3. The item(s) you want to exchange\n4. The reason for your exchange";
      } else if (!order_id) {
        message += "\n\nPlease provide your order number.";
      } else if (!email) {
        message +=
          "\n\nPlease provide the email address associated with order #" +
          order_id;
      }

      message +=
        "\n\nOnce you provide this information, I can help process your exchange request.";

      this.showMessage(message);
      return;
    }

    // Add exchange type to context
    var updatedContext = {
      ...normalizedContext,
      return_type: "exchange",
    };
    this.handleReturn(updatedContext);
  },

  /**
   * Handle cancel order request
   * @param {Object} context - The action context with order details
   */
  handleCancelOrder: function (context) {
    // Normalize context to handle different field names
    var normalizedContext = { ...context };

    // Handle order_number vs order_id
    if (!normalizedContext.order_id && normalizedContext.order_number) {
      normalizedContext.order_id = normalizedContext.order_number;
    }

    var { order_id, email, reason } = normalizedContext || {};

    if (!order_id || !email) {
      // Ask for the information we need
      let message = "To cancel your order, I'll need a few details:";

      if (!order_id && !email) {
        message +=
          "\n\n1. Your order number\n2. The email address used for the order\n3. The reason for cancellation (optional)";
      } else if (!order_id) {
        message += "\n\nPlease provide your order number.";
      } else if (!email) {
        message +=
          "\n\nPlease provide the email address associated with order #" +
          order_id;
      }

      message +=
        "\n\nOnce you provide this information, I can help cancel your order.";

      this.showMessage(message);
      return;
    }

    this.showMessage(`Looking up order #${order_id} for cancellation...`);

    // Call our WordPress AJAX endpoint
    this.cancelOrder({
      order_id: order_id,
      email: email,
      reason: reason || "Customer requested cancellation",
      restock: true,
    });
  },

  /**
   * Make AJAX call to initiate a return
   * @param {Object} data - Return data to send to server
   */
  initiateReturn: function (data) {
    // Get AJAX configuration from voiceroConfig
    var ajaxUrl =
      window.voiceroConfig && window.voiceroConfig.ajaxUrl
        ? window.voiceroConfig.ajaxUrl
        : "/wp-admin/admin-ajax.php";

    var nonce =
      window.voiceroConfig && window.voiceroConfig.nonce
        ? window.voiceroConfig.nonce
        : "";

    // Prepare form data
    var formData = new FormData();
    formData.append("action", "voicero_initiate_return");
    formData.append("nonce", nonce);
    formData.append("order_id", data.order_id);
    formData.append("email", data.email);
    formData.append("reason", data.reason);
    formData.append("return_type", data.return_type);

    // Add items if provided
    if (data.items && data.items.length > 0) {
      formData.append("items", JSON.stringify(data.items));
    }

    // Send the request
    fetch(ajaxUrl, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          this.showMessage(`
✅ Return request initiated successfully!

Your return request for order #${data.order_id} has been submitted and is pending review. 
You'll receive an email with further instructions on how to return your items.

Return ID: ${result.data.return_id}
Status: ${result.data.status}
        `);
        } else {
          this.showMessage(
            `❌ Return request failed: ${
              result.data.message || "Unknown error"
            }`
          );
        }
      })
      .catch((error) => {
        console.error("Error initiating return:", error);
        this.showMessage(
          "❌ There was a problem processing your return request. Please try again later or contact customer support."
        );
      });
  },

  /**
   * Make AJAX call to cancel an order
   * @param {Object} data - Cancel data to send to server
   */
  cancelOrder: function (data) {
    // Get AJAX configuration from voiceroConfig
    var ajaxUrl =
      window.voiceroConfig && window.voiceroConfig.ajaxUrl
        ? window.voiceroConfig.ajaxUrl
        : "/wp-admin/admin-ajax.php";

    var nonce =
      window.voiceroConfig && window.voiceroConfig.nonce
        ? window.voiceroConfig.nonce
        : "";

    // Prepare form data
    var formData = new FormData();
    formData.append("action", "voicero_cancel_order");
    formData.append("nonce", nonce);
    formData.append("order_id", data.order_id);
    formData.append("email", data.email);
    formData.append("reason", data.reason);
    formData.append("restock", data.restock ? "1" : "0");
    formData.append("refund", data.refund ? "1" : "0");

    // Send the request
    fetch(ajaxUrl, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          this.showMessage(`
✅ Order cancelled successfully!

Your order #${data.order_id} has been cancelled. 
${
  data.refund
    ? "A refund will be processed according to your payment method."
    : ""
}
${data.restock ? "The items have been returned to inventory." : ""}
        `);
        } else {
          this.showMessage(
            `❌ Order cancellation failed: ${
              result.data.message || "Unknown error"
            }`
          );
        }
      })
      .catch((error) => {
        console.error("Error cancelling order:", error);
        this.showMessage(
          "❌ There was a problem cancelling your order. Please try again later or contact customer support."
        );
      });
  },

  /**
   * Helper to show messages to the user
   * @param {string} message - Message to display
   */
  showMessage: function (message) {
    // Try VoiceroText first
    if (
      window.VoiceroText &&
      typeof window.VoiceroText.addMessage === "function"
    ) {
      window.VoiceroText.addMessage(message, "ai");
      return;
    }

    // Try VoiceroVoice as fallback
    if (
      window.VoiceroVoice &&
      typeof window.VoiceroVoice.addMessage === "function"
    ) {
      window.VoiceroVoice.addMessage(message, "ai");
      return;
    }

    // Last resort: alert
    alert(message);
  },

  /**
   * Verify if an order belongs to a customer
   * @param {Object} data - Order verification data
   * @returns {Promise} - Promise resolving to verification result
   */
  verifyOrder: function (data) {
    return new Promise((resolve, reject) => {
      // Get AJAX configuration from voiceroConfig
      var ajaxUrl =
        window.voiceroConfig && window.voiceroConfig.ajaxUrl
          ? window.voiceroConfig.ajaxUrl
          : "/wp-admin/admin-ajax.php";

      var nonce =
        window.voiceroConfig && window.voiceroConfig.nonce
          ? window.voiceroConfig.nonce
          : "";

      // Prepare form data
      var formData = new FormData();
      formData.append("action", "voicero_verify_order");
      formData.append("nonce", nonce);
      formData.append("order_id", data.order_id);
      formData.append("email", data.email);

      // Send the request
      fetch(ajaxUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.success) {
            resolve(result.data);
          } else {
            reject(
              new Error(result.data.message || "Order verification failed")
            );
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  },
};

// Initialize on load
window.addEventListener("DOMContentLoaded", function () {
  window.VoiceroReturnHandler =
    window.VoiceroReturnHandler || VoiceroReturnHandler.init();
});

// Make sure the handler is available immediately for early action handling
window.VoiceroReturnHandler =
  window.VoiceroReturnHandler || VoiceroReturnHandler;
