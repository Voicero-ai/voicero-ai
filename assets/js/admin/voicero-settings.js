/**
 * Voicero AI Settings Page JavaScript
 * Handles all the interactive functionality of the settings page
 */

(function ($) {
  "use strict";

  /**
   * Initialize the settings page functionality
   */
  function initSettingsPage() {
    // Load website info when page loads
    loadWebsiteInfo();

    // Handle edit button clicks
    $(".voicero-edit-button").on("click", function () {
      var section = $(this).data("section");
      showEditForm(section);
    });

    // Handle cancel button clicks
    $(".voicero-cancel-button").on("click", function () {
      var section = $(this).data("section");
      hideEditForm(section);
    });

    // Handle form submissions
    $("#website-info-form").on("submit", function (e) {
      e.preventDefault();
      saveWebsiteInfo();
    });

    $("#user-settings-form").on("submit", function (e) {
      e.preventDefault();
      saveUserSettings();
    });

    $("#ai-features-form").on("submit", function (e) {
      e.preventDefault();
      saveAIFeatures();
    });

    // Handle status toggle
    $("#toggle-status").on("click", function () {
      toggleStatus();
    });

    // Set subscription link with the websiteId
    setSubscriptionLink();

    // Handle clear connection button
    $("#clear-connection").on("click", function () {
      handleClearConnection();
    });
  }

  /**
   * Load website information and user information
   */
  function loadWebsiteInfo() {
    // Show loading overlay
    showLoadingOverlay("Loading website information...");

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // First, get the basic website info
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_get_info",
        nonce: config.nonce,
      },
      success: function (response) {
        // Hide loading overlay
        hideLoadingOverlay();

        if (response.success && response.data) {
          var websiteData = response.data;
          // Update website info fields
          updateWebsiteInfo(websiteData);

          // If we have a website ID, fetch detailed info and user info
          if (websiteData.id) {
            fetchDetailedWebsiteData(websiteData.id);
            fetchUserInfo(websiteData.id);
          }
        } else {
          showErrorMessage(
            "Failed to load website information. Please refresh the page and try again."
          );
        }
      },
      error: function () {
        hideLoadingOverlay();
        showErrorMessage(
          "Failed to connect to the server. Please check your internet connection and try again."
        );
      },
    });
  }

  /**
   * Fetch detailed website data including AI features
   * @param {string} websiteId - The website ID
   */
  function fetchDetailedWebsiteData(websiteId) {
    if (!websiteId) return;

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Fetch detailed website data
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_websites_get",
        nonce: config.nonce,
        id: websiteId,
      },
      success: function (response) {
        if (response.success && response.data) {
          var detailedData = response.data;
          // Update AI features based on the detailed data
          updateAIFeatures(detailedData);

          // Update custom instructions if available
          if (detailedData.customInstructions) {
            $("#custom-instructions-display").html(
              detailedData.customInstructions.replace(/\n/g, "<br>")
            );
            $("#custom-instructions").val(detailedData.customInstructions);
          }
        }
      },
      error: function (error) {
        console.error("Error fetching detailed website data:", error);
      },
    });
  }

  /**
   * Fetch user information
   * @param {string} websiteId - The website ID
   */
  function fetchUserInfo(websiteId) {
    if (!websiteId) {
      console.error("No website ID provided for user info fetch");
      return;
    }

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Use the existing AJAX endpoint to make a request to /api/users/me
    $.ajax({
      url: config.ajaxUrl,
      method: "POST",
      data: {
        action: "voicero_get_user_info",
        nonce: config.nonce,
        websiteId: websiteId,
      },
      success: function (response) {
        if (response.success && response.data) {
          // Log each field individually to see what's available
          for (var [key, value] of Object.entries(response.data)) {
          }

          updateUserInfo(response.data);
        } else {
          console.error("User information response error:", response);
        }
      },
      error: function (error) {
        console.error("Failed to fetch user information:", error);
      },
    });
  }

  /**
   * Update website information in the UI
   * @param {Object} websiteData - The website data
   */
  function updateWebsiteInfo(websiteData) {
    if (!websiteData) return;

    // Update website name
    if (websiteData.name) {
      $("#website-name-display").text(websiteData.name);
      $("#website-name").val(websiteData.name);
    }

    // Update website URL
    if (websiteData.url || websiteData.domain) {
      var url = websiteData.url || websiteData.domain;
      $("#website-url-display").text(url);
      $("#website-url").val(url);
    }

    // Update status
    var statusElement = $(".voicero-status-active, .voicero-status-inactive");
    var toggleButton = $("#toggle-status");

    if (websiteData.active || websiteData.status === "active") {
      statusElement
        .text("Active")
        .removeClass("voicero-status-inactive")
        .addClass("voicero-status-active");
      toggleButton.text("Deactivate");
    } else {
      statusElement
        .text("Inactive")
        .removeClass("voicero-status-active")
        .addClass("voicero-status-inactive");
      toggleButton.text("Activate");
    }

    // Update subscription information
    updateSubscriptionInfo(websiteData);
  }

  /**
   * Update subscription information in the UI
   * @param {Object} websiteData - The website data
   */
  function updateSubscriptionInfo(websiteData) {
    if (!websiteData) return;

    // Update plan
    var plan = websiteData.plan || "Free";
    $(".voicero-plan-badge").text(plan);

    // Update price based on plan
    let priceText = "";
    switch (plan.toLowerCase()) {
      case "starter":
        priceText = "$120/month";
        break;
      case "enterprise":
        priceText = "$0.10 per request";
        break;
      case "free":
        priceText = "Free";
        break;
      default:
        priceText = "Contact for pricing";
    }

    // Update the price text
    $('.voicero-field-group:contains("Price:") .voicero-field-value').text(
      priceText
    );

    // Update last synced date
    let lastSyncedText = "Never";
    if (websiteData.lastSyncedAt) {
      var lastSyncedDate = new Date(websiteData.lastSyncedAt);
      lastSyncedText = lastSyncedDate.toLocaleString();
    } else if (websiteData.lastSyncDate) {
      var lastSyncedDate = new Date(websiteData.lastSyncDate);
      lastSyncedText = lastSyncedDate.toLocaleString();
    }

    // Update the last synced text
    $(
      '.voicero-field-group:contains("Last Synced:") .voicero-field-value'
    ).text(lastSyncedText);
  }

  /**
   * Update user information in the UI
   * @param {Object} userData - The user data
   */
  function updateUserInfo(userData) {
    if (!userData) return;

    // Update user name
    if (userData.name) {
      $("#user-name-display").text(userData.name);
      $("#user-name").val(userData.name);
    }

    // Update username
    if (userData.username) {
      $("#username-display").text(userData.username);
      $("#username").val(userData.username);
    }

    // Update email - handle case where it might be missing
    if (userData.email) {
      $("#email-display").text(userData.email);
      $("#email").val(userData.email);
    } else {
      // If email is missing, show a placeholder message
      $("#email-display").html("<em>No email available</em>");
      $("#email").val("");
      console.warn("Email field is missing from user data");
    }
  }

  /**
   * Update AI features based on website data
   * @param {Object} websiteData - The website data
   */
  function updateAIFeatures(websiteData) {
    if (!websiteData) return;

    // Map of feature names to their corresponding DOM elements
    var featureMap = {
      allowAutoRedirect: {
        icon: '.voicero-features-list li:contains("redirect users to relevant pages") .dashicons',
        toggle: 'input[name="ai_redirect"]',
      },
      allowAutoScroll: {
        icon: '.voicero-features-list li:contains("scroll to relevant sections") .dashicons',
        toggle: 'input[name="ai_scroll"]',
      },
      allowAutoHighlight: {
        icon: '.voicero-features-list li:contains("highlight important elements") .dashicons',
        toggle: 'input[name="ai_highlight"]',
      },
      allowAutoClick: {
        icon: '.voicero-features-list li:contains("click buttons and links") .dashicons',
        toggle: 'input[name="ai_click"]',
      },
      allowAutoFillForm: {
        icon: '.voicero-features-list li:contains("automatically fill forms") .dashicons',
        toggle: 'input[name="ai_forms"]',
      },
      allowAutoCancel: {
        icon: '.voicero-features-list li:contains("help users cancel orders") .dashicons',
        toggle: 'input[name="ai_cancel_orders"]',
      },
      allowAutoTrackOrder: {
        icon: '.voicero-features-list li:contains("help users track their orders") .dashicons',
        toggle: 'input[name="ai_track_orders"]',
      },
      allowAutoGetUserOrders: {
        icon: '.voicero-features-list li:contains("fetch and display user order history") .dashicons',
        toggle: 'input[name="ai_order_history"]',
      },
      allowAutoUpdateUserInfo: {
        icon: '.voicero-features-list li:contains("help users update their account information") .dashicons',
        toggle: 'input[name="ai_update_account"]',
      },
      allowAutoLogout: {
        icon: '.voicero-features-list li:contains("help users log out") .dashicons',
        toggle: 'input[name="ai_logout"]',
      },
      allowAutoLogin: {
        icon: '.voicero-features-list li:contains("help users log in") .dashicons',
        toggle: 'input[name="ai_login"]',
      },
    };

    // Update each feature based on the website data
    for (var [key, selectors] of Object.entries(featureMap)) {
      var isEnabled = websiteData[key] === true;

      // Update the icon in the display view
      var iconElement = $(selectors.icon);
      if (iconElement.length) {
        if (isEnabled) {
          iconElement.removeClass("dashicons-no").addClass("dashicons-yes");
        } else {
          iconElement.removeClass("dashicons-yes").addClass("dashicons-no");
        }
      }

      // Update the toggle in the edit form
      var toggleElement = $(selectors.toggle);
      if (toggleElement.length) {
        toggleElement.prop("checked", isEnabled);
      }
    }
  }

  /**
   * Show the edit form for a section
   * @param {string} section - The section identifier
   */
  function showEditForm(section) {
    // Hide view content
    $(`#${section}-info-view, #${section}-settings-view`).hide();

    // Show edit form
    $(`#${section}-info-edit, #${section}-settings-edit`).fadeIn();
  }

  /**
   * Hide the edit form for a section
   * @param {string} section - The section identifier
   */
  function hideEditForm(section) {
    // Hide edit form
    $(`#${section}-info-edit, #${section}-settings-edit`).hide();

    // Show view content
    $(`#${section}-info-view, #${section}-settings-view`).fadeIn();
  }

  /**
   * Save website information
   */
  function saveWebsiteInfo() {
    // Show spinner or loading state
    showSavingState();

    // Get form data
    var websiteName = $("#website-name").val();
    var websiteUrl = $("#website-url").val();
    var customInstructions = $("#custom-instructions").val();

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Prepare the data for API in the exact format expected
    var websiteData = {
      name: websiteName,
      url: websiteUrl,
      customInstructions: customInstructions,
    };

    // Send AJAX request to our new proxy endpoint
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_update_website",
        nonce: config.nonce,
        website_data: websiteData,
      },
      success: function (response) {
        hideSavingState();

        if (response.success) {
          // Update the displayed values
          $("#website-name-display").text(websiteName);
          $("#website-url-display").text(websiteUrl);

          if (customInstructions) {
            $("#custom-instructions-display").html(
              customInstructions.replace(/\n/g, "<br>")
            );
          } else {
            $("#custom-instructions-display").html(
              "<em>No custom instructions set</em>"
            );
          }

          // Hide the edit form
          hideEditForm("website");

          // Show success message
          showSuccessMessage("Website information updated successfully.");
        } else {
          console.error("AJAX Error Response:", response);
          // Show error message
          showErrorMessage(
            response.data?.message || "An error occurred while saving."
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX Request Failed:", status, error);
        console.error("Response Text:", xhr.responseText);
        hideSavingState();
        showErrorMessage("An error occurred while saving. Please try again.");
      },
    });
  }

  /**
   * Save user settings
   */
  function saveUserSettings() {
    // Show spinner or loading state
    showSavingState();

    // Get form data
    var userName = $("#user-name").val();
    var username = $("#username").val();
    var email = $("#email").val();

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Prepare the data for API in the exact format expected
    var userData = {
      name: userName,
      username: username,
      email: email,
    };

    // Send AJAX request to our new proxy endpoint
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_update_user_settings",
        nonce: config.nonce,
        user_data: userData,
      },
      success: function (response) {
        hideSavingState();

        if (response.success) {
          // Update the displayed values
          $("#user-name-display").text(userName);
          $("#username-display").text(username);
          $("#email-display").text(email);

          // Hide the edit form
          hideEditForm("user");

          // Show success message
          showSuccessMessage("User settings updated successfully.");
        } else {
          console.error("AJAX Error Response:", response);
          // Show error message
          showErrorMessage(
            response.data?.message || "An error occurred while saving."
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX Request Failed:", status, error);
        console.error("Response Text:", xhr.responseText);
        hideSavingState();
        showErrorMessage("An error occurred while saving. Please try again.");
      },
    });
  }

  /**
   * Save AI features settings
   */
  function saveAIFeatures() {
    // Show spinner or loading state
    showSavingState();

    // Get all toggle states
    var features = {};

    // Critical features
    features.ai_redirect = $('#ai-features-form input[name="ai_redirect"]').is(
      ":checked"
    );
    features.ai_scroll = $('#ai-features-form input[name="ai_scroll"]').is(
      ":checked"
    );
    features.ai_highlight = $(
      '#ai-features-form input[name="ai_highlight"]'
    ).is(":checked");
    features.ai_click = $('#ai-features-form input[name="ai_click"]').is(
      ":checked"
    );
    features.ai_forms = $('#ai-features-form input[name="ai_forms"]').is(
      ":checked"
    );

    // Order features
    features.ai_cancel_orders = $(
      '#ai-features-form input[name="ai_cancel_orders"]'
    ).is(":checked");
    features.ai_track_orders = $(
      '#ai-features-form input[name="ai_track_orders"]'
    ).is(":checked");
    features.ai_order_history = $(
      '#ai-features-form input[name="ai_order_history"]'
    ).is(":checked");

    // User data features
    features.ai_update_account = $(
      '#ai-features-form input[name="ai_update_account"]'
    ).is(":checked");
    features.ai_logout = $('#ai-features-form input[name="ai_logout"]').is(
      ":checked"
    );
    features.ai_login = $('#ai-features-form input[name="ai_login"]').is(
      ":checked"
    );

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Map WordPress feature names to API expected names
    // Ensure each value is explicitly converted to boolean with !!
    var apiFeatures = {
      allowAutoRedirect: !!features.ai_redirect,
      allowAutoScroll: !!features.ai_scroll,
      allowAutoHighlight: !!features.ai_highlight,
      allowAutoClick: !!features.ai_click,
      allowAutoFillForm: !!features.ai_forms,
      allowAutoCancel: !!features.ai_cancel_orders,
      allowAutoTrackOrder: !!features.ai_track_orders,
      allowAutoGetUserOrders: !!features.ai_order_history,
      allowAutoUpdateUserInfo: !!features.ai_update_account,
      allowAutoLogout: !!features.ai_logout,
      allowAutoLogin: !!features.ai_login,
    };

    // Send AJAX request to our new proxy endpoint
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_update_website_autos",
        nonce: config.nonce,
        features: apiFeatures,
      },
      success: function (response) {
        hideSavingState();

        if (response.success) {
          // Update the displayed features in view mode
          updateFeaturesDisplay(features);

          // Hide the edit form
          hideEditForm("ai-features");

          // Show success message
          showSuccessMessage("AI features updated successfully.");
        } else {
          console.error("AJAX Error Response:", response);
          // Show error message
          showErrorMessage(
            response.data?.message || "An error occurred while saving."
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX Request Failed:", status, error);
        console.error("Response Text:", xhr.responseText);
        hideSavingState();
        showErrorMessage("An error occurred while saving. Please try again.");
      },
    });
  }

  /**
   * Update the features display in the view mode
   * @param {Object} features - The features object with boolean values
   */
  function updateFeaturesDisplay(features) {
    // Update the icon for each feature in the view mode
    for (var [key, value] of Object.entries(features)) {
      var iconElement = $(
        `.voicero-features-list li:contains("${getFeatureLabel(
          key
        )}") .dashicons`
      );

      if (iconElement.length > 0) {
        if (value) {
          iconElement.removeClass("dashicons-no").addClass("dashicons-yes");
        } else {
          iconElement.removeClass("dashicons-yes").addClass("dashicons-no");
        }
      }
    }
  }

  /**
   * Get the feature label from the feature key
   * @param {string} key - The feature key
   * @returns {string} The feature label
   */
  function getFeatureLabel(key) {
    var labels = {
      ai_redirect: "redirect users to relevant pages",
      ai_scroll: "scroll to relevant sections",
      ai_highlight: "highlight important elements",
      ai_click: "click buttons and links",
      ai_forms: "automatically fill forms",
      ai_cancel_orders: "help users cancel orders",
      ai_track_orders: "help users track their orders",
      ai_order_history: "fetch and display user order history",
      ai_update_account: "help users update their account information",
      ai_logout: "help users log out",
      ai_login: "help users log in",
    };

    return labels[key] || key;
  }

  /**
   * Toggle the active status
   */
  function toggleStatus() {
    var isActive = $("#toggle-status").text().trim() === "Deactivate";

    // Show loading overlay
    showLoadingOverlay("Updating status...");

    // Get website ID from the page if available
    let websiteId = "";
    if (typeof voiceroConfig !== "undefined" && voiceroConfig.websiteId) {
      websiteId = voiceroConfig.websiteId;
    }

    // Use apiUrl from voiceroConfig or fallback to localhost
    var apiUrl =
      typeof voiceroConfig !== "undefined" && voiceroConfig.apiUrl
        ? voiceroConfig.apiUrl
        : "https://www.voicero.ai/api";

    // Get access key from config
    var accessKey =
      typeof voiceroConfig !== "undefined" && voiceroConfig.accessKey
        ? voiceroConfig.accessKey
        : $("#voicero_access_key").val();

    // Use WordPress REST API proxy endpoint instead of direct API call
    // Get the site URL root (remove admin-ajax.php path to get the WordPress site root)
    var siteUrlBase =
      typeof voiceroConfig !== "undefined" && voiceroConfig.ajaxUrl
        ? new URL(voiceroConfig.ajaxUrl).origin
        : new URL(ajaxurl).origin;

    // varruct the correct REST API endpoint URL
    var proxyUrl = siteUrlBase + "/wp-json/voicero/v1/toggle-status";

    fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        websiteId: websiteId || undefined,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        hideLoadingOverlay();

        if (data.error) {
          throw new Error(data.error);
        }

        if (isActive) {
          // Update to deactivated state
          $(".voicero-status-active")
            .text("Inactive")
            .removeClass("voicero-status-active")
            .addClass("voicero-status-inactive");
          $("#toggle-status").text("Activate");
        } else {
          // Update to activated state
          $(".voicero-status-inactive")
            .text("Active")
            .removeClass("voicero-status-inactive")
            .addClass("voicero-status-active");
          $("#toggle-status").text("Deactivate");
        }

        // Show success message
        showSuccessMessage(
          `Voicero AI has been ${
            isActive ? "deactivated" : "activated"
          } successfully.`
        );
      })
      .catch((error) => {
        hideLoadingOverlay();
        showErrorMessage(
          error.message ||
            "An error occurred while updating status. Please try again."
        );
      });
  }

  /**
   * Show a loading overlay with a message
   * @param {string} message - The message to display
   */
  function showLoadingOverlay(message = "Loading...") {
    if ($(".voicero-loading-overlay").length === 0) {
      $("body").append(
        `<div class="voicero-loading-overlay">
          <span class="spinner is-active"></span>
          <p>${message}</p>
        </div>`
      );
    } else {
      $(".voicero-loading-overlay p").text(message);
      $(".voicero-loading-overlay").fadeIn();
    }
  }

  /**
   * Hide the loading overlay
   */
  function hideLoadingOverlay() {
    $(".voicero-loading-overlay").fadeOut();
  }

  /**
   * Show a saving state (spinner or loading message)
   */
  function showSavingState() {
    // Add a loading overlay if it doesn't exist
    showLoadingOverlay("Saving...");
  }

  /**
   * Hide the saving state
   */
  function hideSavingState() {
    // Hide the overlay
    hideLoadingOverlay();
  }

  /**
   * Show a success message
   * @param {string} message - The success message
   */
  function showSuccessMessage(message) {
    // Remove any existing notices
    $(".voicero-notice").remove();

    // Add the success notice
    $(
      '<div class="voicero-notice notice notice-success is-dismissible"><p>' +
        message +
        "</p></div>"
    )
      .insertAfter(".wrap h1")
      .hide()
      .slideDown();

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      $(".voicero-notice").slideUp(function () {
        $(this).remove();
      });
    }, 5000);
  }

  /**
   * Show an error message
   * @param {string} message - The error message
   */
  function showErrorMessage(message) {
    // Remove any existing notices
    $(".voicero-notice").remove();

    // Add the error notice
    $(
      '<div class="voicero-notice notice notice-error is-dismissible"><p>' +
        message +
        "</p></div>"
    )
      .insertAfter(".wrap h1")
      .hide()
      .slideDown();
  }

  /**
   * Set the subscription link with the correct website ID
   */
  function setSubscriptionLink() {
    // Get websiteId from voiceroConfig
    var websiteId = voiceroConfig.websiteId;
    if (websiteId) {
      // Set the subscription URL
      var subscriptionUrl =
        "https://www.voicero.ai/app/websites/website?id=" + websiteId;
      $("#update-subscription-link").attr("href", subscriptionUrl);
    }
  }

  /**
   * Handle the clear connection button click
   */
  function handleClearConnection() {
    if (
      confirm(
        "Are you sure you want to clear the connection? Your AI assistant will stop working until you reconnect."
      )
    ) {
      // Create a config object with fallbacks if voiceroConfig isn't defined
      var config =
        typeof voiceroConfig !== "undefined"
          ? voiceroConfig
          : {
              ajaxUrl: ajaxurl,
              nonce: $("#voicero_nonce").val(),
            };

      $.ajax({
        url: config.ajaxUrl,
        type: "POST",
        data: {
          action: "voicero_clear_connection",
          nonce: config.nonce,
        },
        success: function (response) {
          if (response.success) {
            location.reload();
          } else {
            alert(
              response.data.message || "An error occurred. Please try again."
            );
          }
        },
        error: function () {
          alert("An error occurred. Please try again.");
        },
      });
    }
  }

  // Initialize when the DOM is ready
  $(document).ready(function () {
    initSettingsPage();

    // Add CSS for the loading overlay
    $("head").append(`
            <style>
                .voicero-loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(255, 255, 255, 0.7);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }
                
                .voicero-loading-overlay .spinner {
                    float: none;
                    margin: 0 0 10px 0;
                }
                
                .voicero-status-inactive {
                    color: #dc3232;
                    font-weight: 600;
                    margin-right: 10px;
                }
            </style>
        `);

    // Create and inject the subscription button
    function createSubscriptionButton() {
      // Get website ID from multiple possible sources
      let websiteId = "";

      // Try to get from voiceroConfig
      if (typeof voiceroConfig !== "undefined" && voiceroConfig.websiteId) {
        websiteId = voiceroConfig.websiteId;
      }
      // Try to get from voiceroAdminConfig
      else if (
        typeof voiceroAdminConfig !== "undefined" &&
        voiceroAdminConfig.websiteId
      ) {
        websiteId = voiceroAdminConfig.websiteId;
      }

      // ALWAYS create the button, even without websiteId
      var subscriptionUrl = websiteId
        ? "https://www.voicero.ai/app/websites/website?id=" + websiteId
        : "https://www.voicero.ai/app/websites";

      var button = $("<a></a>")
        .attr("href", subscriptionUrl)
        .attr("class", "button button-primary")
        .attr("target", "_blank")
        .text("Update Subscription");

      // Add the button to the container
      $("#subscription-button-container").html(button);
      // For debugging, log if container exists
    }

    // Call the function to create the button with slight delay to ensure DOM is ready
    setTimeout(createSubscriptionButton, 500);
  });
})(jQuery);
