/**
 * Voicero AI Contacts / Customer Messages
 * Handles the customer message center functionality
 */

(function ($) {
  "use strict";

  // Store the current filter state
  let currentFilter = "all";
  // Store the website ID
  let websiteId = null;

  /**
   * Initialize the contacts page functionality
   */
  function initContactsPage() {
    // Set up tab switching
    setupTabs();

    // Set up message actions
    setupMessageActions();

    // Set up refresh button
    $("#refresh-messages").on("click", function (e) {
      e.preventDefault();
      if (websiteId) {
        loadMessages(currentFilter, websiteId);
      } else {
        showError(
          "Website ID not configured. Please set up your website in the settings."
        );
      }
    });

    // First load website info to get the website ID, then load messages
    loadWebsiteInfo();
  }

  /**
   * Load website information first, then load messages
   * Similar to the approach in voicero-ai-overview.js
   */
  function loadWebsiteInfo() {
    // Show loading state
    showLoadingState();

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Use jQuery AJAX to get website info
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_get_info",
        nonce: config.nonce,
      },
      success: function (response) {
        if (response.success && response.data) {
          var websiteData = response.data;
          // Save the website ID to use for messages
          if (websiteData.id) {
            websiteId = websiteData.id;

            // Now load messages with the website ID
            loadMessages(currentFilter, websiteData.id);
          } else {
            hideLoadingState();
            showError(
              "Website ID not found in the response. Please configure your website in the settings."
            );
            console.error("Website ID not found in the response:", websiteData);

            // Show empty state
            $("#messages-container").html(
              '<div class="no-messages">Please configure your website ID in the settings to view customer messages.</div>'
            );
          }
        } else {
          hideLoadingState();
          showError(
            "Failed to load website information. Please refresh the page and try again."
          );
          console.error("Failed to load website information:", response);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        hideLoadingState();
        console.error(
          "AJAX error while loading website info:",
          textStatus,
          errorThrown
        );
        console.error("Response:", jqXHR.responseText);
        showError(
          "Failed to connect to the server. Please check your internet connection and try again."
        );
      },
    });
  }

  /**
   * Set up the tab switching functionality
   */
  function setupTabs() {
    $(".message-tabs .tab").on("click", function (e) {
      e.preventDefault();

      // Remove active class from all tabs
      $(".message-tabs .tab").removeClass("active");

      // Add active class to clicked tab
      $(this).addClass("active");

      // Get the filter from the data attribute
      var filter = $(this).data("filter");
      currentFilter = filter;

      // Load messages with the selected filter if we have a website ID
      if (websiteId) {
        loadMessages(filter, websiteId);
      } else {
        showError(
          "Website ID not configured. Please set up your website in the settings."
        );
      }
    });
  }

  /**
   * Set up message action buttons (mark read, reply, delete)
   */
  function setupMessageActions() {
    // Use event delegation for dynamically loaded content
    $("#messages-container").on("click", ".mark-read-btn", function () {
      var messageId = $(this).closest(".message-item").data("id");
      markAsRead(messageId);
    });

    $("#messages-container").on("click", ".reply-btn", function () {
      var messageId = $(this).closest(".message-item").data("id");
      replyToMessage(messageId);
    });

    $("#messages-container").on("click", ".delete-btn", function () {
      var messageId = $(this).closest(".message-item").data("id");
      deleteMessage(messageId);
    });
  }

  /**
   * Load messages based on the filter
   * @param {string} filter - The filter to apply (all, unread, read)
   * @param {string} siteId - The website ID
   */
  function loadMessages(filter, siteId) {
    // Show loading state
    showLoadingState();

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Send AJAX request to get messages
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_get_messages",
        nonce: config.nonce,
        filter: filter,
        websiteId: siteId,
      },
      beforeSend: function (xhr, settings) {},
      success: function (response) {
        hideLoadingState();
        if (response.success) {
          // Clear any static content first
          $("#messages-container").empty();

          // Update messages list
          updateMessagesList(response.data.messages);

          // Update stats
          updateMessageStats(response.data.stats);
        } else {
          // Show error message
          showError(
            response.data.message || "An error occurred while loading messages."
          );

          // Show empty state
          $("#messages-container").html(
            '<div class="no-messages">No messages available. ' +
              (response.data.message || "Please try again later.") +
              "</div>"
          );
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        hideLoadingState();
        console.error("AJAX error while loading messages:");
        console.error("Status:", textStatus);
        console.error("Error:", errorThrown);
        console.error("Response:", jqXHR.responseText);

        showError(
          "An error occurred while loading messages. Please try again."
        );

        // Show empty state with error details
        let errorMsg = "An error occurred while loading messages.";
        if (jqXHR.responseText) {
          try {
            var responseData = JSON.parse(jqXHR.responseText);
            if (responseData.data && responseData.data.message) {
              errorMsg = responseData.data.message;
            }
          } catch (e) {
            // If we can't parse JSON, just use the raw response text
            if (jqXHR.responseText.length < 100) {
              errorMsg += " " + jqXHR.responseText;
            }
          }
        }

        $("#messages-container").html(
          '<div class="no-messages">' + errorMsg + "</div>"
        );
      },
    });
  }

  /**
   * Update the messages list in the UI
   * @param {Array} messages - The messages to display
   */
  function updateMessagesList(messages) {
    var $container = $("#messages-container");

    // Clear the container
    $container.empty();

    if (!messages || messages.length === 0) {
      // Show empty state
      $container.html('<div class="no-messages">No messages found.</div>');
      return;
    }

    // Add each message to the container
    messages.forEach(function (message) {
      // Determine which buttons to show based on message state
      var showMarkReadBtn = !message.is_read;
      var showReplyBtn = !message.is_replied; // Hide reply button if already replied to

      // Build the action buttons HTML based on message state
      let actionButtonsHtml = "";
      if (showMarkReadBtn) {
        actionButtonsHtml +=
          '<button class="button mark-read-btn">Mark Read</button>';
      }
      if (showReplyBtn) {
        actionButtonsHtml += '<button class="button reply-btn">Reply</button>';
      }
      actionButtonsHtml += '<button class="button delete-btn">Delete</button>';

      // Get status badges
      let statusBadges = "";
      if (!message.is_read) {
        statusBadges += '<span class="new-badge">New</span>';
      }
      if (message.is_replied) {
        statusBadges += '<span class="replied-badge">Replied</span>';
      }

      var messageHtml = `
                <div class="message-item ${
                  message.is_read ? "read" : "unread"
                }" data-id="${message.id}">
                    <div class="message-avatar">
                        ${message.email.charAt(0).toUpperCase()}
                    </div>
                    <div class="message-content">
                        <div class="message-header">
                            <div class="message-info">
                                <div class="message-email">${
                                  message.email
                                }</div>
                                <div class="message-meta">
                                    ${statusBadges}
                                    <span class="message-time">${
                                      message.time
                                    }</span>
                                </div>
                            </div>
                            <div class="message-actions">
                                ${actionButtonsHtml}
                            </div>
                        </div>
                        <div class="message-body">${message.message}</div>
                    </div>
                </div>
            `;

      $container.append(messageHtml);
    });
  }

  /**
   * Update the message statistics in the UI
   * @param {Object} stats - The message statistics
   */
  function updateMessageStats(stats) {
    // Default to zero values if stats are missing
    var safeStats = stats || {};

    $("#total-messages").text(safeStats.total || 0);
    $("#unread-messages").text(safeStats.unread || 0);
    $("#high-priority-messages").text(safeStats.high_priority || 0);
    $("#response-rate").text((safeStats.response_rate || 0) + "%");

    // Update unread count in the message center header
    var unreadCount = safeStats.unread || 0;
    $("#unread-count").text(
      unreadCount + " " + (unreadCount === 1 ? "Unread" : "Unread")
    );

    // Update tab counts
    $("#all-count").text("(" + (safeStats.total || 0) + ")");
    $("#unread-tab-count").text("(" + (safeStats.unread || 0) + ")");
    $("#read-count").text("(" + (safeStats.read || 0) + ")");
  }

  /**
   * Mark a message as read
   * @param {number} messageId - The ID of the message to mark as read
   */
  function markAsRead(messageId) {
    // Check if we have a website ID
    if (!websiteId) {
      showError("Website ID not configured. Cannot mark message as read.");
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

    // IMMEDIATELY update the UI - do this BEFORE the AJAX call
    // to ensure the user sees the change right away
    var $message = $(`.message-item[data-id="${messageId}"]`);
    $message.removeClass("unread").addClass("read");
    $message.find(".new-badge").remove();
    $message.find(".mark-read-btn").remove();

    // Also update our local stats immediately
    var $totalStats = $("#total-messages");
    var $unreadStats = $("#unread-messages");
    var $readStats = $("#read-count");
    var $unreadCount = $("#unread-count");
    var $unreadTabCount = $("#unread-tab-count");

    var currentTotal = parseInt($totalStats.text()) || 0;
    var currentUnread = parseInt($unreadStats.text()) || 0;
    var currentRead = parseInt($readStats.text().replace(/[()]/g, "")) || 0;

    // Only decrement unread if it's greater than 0
    if (currentUnread > 0) {
      var newUnread = currentUnread - 1;
      var newRead = currentRead + 1;

      $unreadStats.text(newUnread);
      $readStats.text("(" + newRead + ")");
      $unreadCount.text(
        newUnread + " " + (newUnread === 1 ? "Unread" : "Unread")
      );
      $unreadTabCount.text("(" + newUnread + ")");

      // Update response rate if possible
      if (currentTotal > 0) {
        var newRate = Math.round((newRead / currentTotal) * 100);
        $("#response-rate").text(newRate + "%");
      }
    }

    // Send AJAX request
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_mark_message_read",
        nonce: config.nonce,
        message_id: messageId,
        websiteId: websiteId,
      },
      beforeSend: function (xhr, settings) {},
      success: function (response) {
        if (response.success) {
          // Reload messages if we're on a filtered view
          if (currentFilter !== "all") {
            loadMessages(currentFilter, websiteId);
          }

          // Update the stats from the server
          if (response.data && response.data.stats) {
            updateMessageStats(response.data.stats);
          } else {
            console.warn("No stats data in response:", response);
          }
        } else {
          console.error(
            "Error marking message as read:",
            response.data ? response.data.message : "Unknown error"
          );
          showError(response.data.message || "An error occurred.");
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error("AJAX error while marking message as read:");
        console.error("Status:", textStatus);
        console.error("Error:", errorThrown);
        console.error("Response:", jqXHR.responseText);
        showError("An error occurred. Please try again.");
      },
    });
  }

  /**
   * Reply to a message
   * @param {number} messageId - The ID of the message to reply to
   */
  function replyToMessage(messageId) {
    // Check if we have a website ID
    if (!websiteId) {
      showError("Website ID not configured. Cannot reply to message.");
      return;
    }

    // Get the message email
    var $messageElement = $(`.message-item[data-id="${messageId}"]`);
    var email = $messageElement.find(".message-email").text();

    if (!email || email === "No email") {
      showError("Cannot reply - no valid email address found.");
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

    // 1. First mark as read if not already read
    var isUnread = $messageElement.hasClass("unread");

    // Show loading state
    showLoadingState();

    // Function to continue with reply process after marking read
    var continueWithReply = function () {
      // 2. Call the setReplyContacts API
      $.ajax({
        url: config.ajaxUrl,
        type: "POST",
        data: {
          action: "voicero_send_reply",
          nonce: config.nonce,
          message_id: messageId,
          websiteId: websiteId,
        },
        success: function (response) {
          hideLoadingState();

          if (response.success) {
            // Show success message
            showSuccess("Message marked as replied");

            // 3. Update the UI to show replied status
            $messageElement.find(".message-actions .reply-btn").remove();

            // Add replied badge if not present
            if ($messageElement.find(".replied-badge").length === 0) {
              $messageElement
                .find(".message-meta")
                .prepend('<span class="replied-badge">Replied</span>');
            }

            // 4. Open email client
            var subject = "Re: Customer Inquiry";
            var mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
              subject
            )}`;
            window.open(mailtoUrl, "_blank");

            // 5. Refresh messages list to get updated data
            loadMessages(currentFilter, websiteId);
          } else {
            // If API call fails, still open email client but show error
            showError(response.message || "Failed to mark message as replied");

            // Still open email client even if API fails
            var subject = "Re: Customer Inquiry";
            var mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
              subject
            )}`;
            window.open(mailtoUrl, "_blank");
          }
        },
        error: function (xhr, status, error) {
          hideLoadingState();
          showError("Error marking message as replied: " + error);

          // Still open email client even if API fails
          var subject = "Re: Customer Inquiry";
          var mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(
            subject
          )}`;
          window.open(mailtoUrl, "_blank");
        },
      });
    };

    // If message is unread, mark it as read first
    if (isUnread) {
      $.ajax({
        url: config.ajaxUrl,
        type: "POST",
        data: {
          action: "voicero_mark_message_read",
          nonce: config.nonce,
          message_id: messageId,
          websiteId: websiteId,
        },
        success: function (response) {
          if (response.success) {
            // Update UI to mark message as read
            $messageElement.removeClass("unread").addClass("read");
            $messageElement.find(".new-badge").remove();
            $messageElement.find(".mark-read-btn").remove();

            // Update stats
            if (response.data && response.data.stats) {
              updateMessageStats(response.data.stats);
            }

            // Continue with reply
            continueWithReply();
          } else {
            // If marking as read fails, still continue with reply
            hideLoadingState();
            showError(response.message || "Failed to mark message as read");
            continueWithReply();
          }
        },
        error: function (xhr, status, error) {
          // If marking as read fails, still continue with reply
          hideLoadingState();
          showError("Error marking message as read: " + error);
          continueWithReply();
        },
      });
    } else {
      // Message already read, proceed with reply
      continueWithReply();
    }
  }

  /**
   * Delete a message
   * @param {number} messageId - The ID of the message to delete
   */
  function deleteMessage(messageId) {
    // Check if we have a website ID
    if (!websiteId) {
      showError("Website ID not configured. Cannot delete message.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this message? This action cannot be undone."
      )
    ) {
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

    // Send AJAX request
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_delete_message",
        nonce: config.nonce,
        message_id: messageId,
        websiteId: websiteId,
      },
      success: function (response) {
        if (response.success) {
          // Remove the message from the UI
          $(`.message-item[data-id="${messageId}"]`).fadeOut(function () {
            $(this).remove();

            // Show empty state if no messages left
            if ($(".message-item").length === 0) {
              $("#messages-container").html(
                '<div class="no-messages">No messages found.</div>'
              );
            }
          });

          // Update the stats
          updateMessageStats(response.data.stats);

          // Show success message
          showSuccess("Message deleted successfully.");
        } else {
          showError(
            response.data.message ||
              "An error occurred while deleting the message."
          );
        }
      },
      error: function () {
        showError(
          "An error occurred while deleting the message. Please try again."
        );
      },
    });
  }

  /**
   * Show a loading state
   */
  function showLoadingState() {
    // Add a loading overlay to the messages container
    if ($("#messages-loading").length === 0) {
      $("#messages-container").append(
        '<div id="messages-loading" class="loading-overlay"><span class="spinner is-active"></span></div>'
      );
    }
  }

  /**
   * Hide the loading state
   */
  function hideLoadingState() {
    $("#messages-loading").remove();
  }

  /**
   * Show a success message
   * @param {string} message - The success message
   */
  function showSuccess(message) {
    var $notice = $(
      '<div class="notice notice-success is-dismissible"><p>' +
        message +
        "</p></div>"
    );
    $(".wrap h1").after($notice);

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      $notice.fadeOut(function () {
        $(this).remove();
      });
    }, 5000);
  }

  /**
   * Show an error message
   * @param {string} message - The error message
   */
  function showError(message) {
    var $notice = $(
      '<div class="notice notice-error is-dismissible"><p>' +
        message +
        "</p></div>"
    );
    $(".wrap h1").after($notice);
  }

  // Initialize when the DOM is ready
  $(document).ready(function () {
    // Check if we're on the contacts page
    if ($(".voicero-contacts-page").length > 0) {
      initContactsPage();

      // Add CSS for the contacts page
      addCustomCSS();
    }
  });

  /**
   * Add custom CSS for the contacts page
   */
  function addCustomCSS() {
    // Create a style element
    var style = document.createElement("style");

    // Add CSS rules
    style.textContent = `
      /* Message item styles */
      .message-item {
        display: flex;
        padding: 15px;
        border-bottom: 1px solid #e0e0e0;
        background: #fff;
        transition: background-color 0.2s;
      }
      
      .message-item:hover {
        background-color: #f9f9f9;
      }
      
      .message-item.unread {
        background-color: #f0f7ff;
      }
      
      .message-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #2271b1;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-right: 15px;
        flex-shrink: 0;
      }
      
      .message-content {
        flex-grow: 1;
      }
      
      .message-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      .message-email {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .message-meta {
        display: flex;
        align-items: center;
        color: #666;
        font-size: 12px;
      }
      
      .message-time {
        margin-left: 5px;
      }
      
      .new-badge {
        background-color: #d63638;
        color: #fff;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        margin-right: 5px;
        text-transform: uppercase;
      }

      .replied-badge {
        background-color: #2271b1;
        color: #fff;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 10px;
        margin-right: 5px;
        text-transform: uppercase;
      }
      
      .message-actions {
        display: flex;
        gap: 5px;
      }
      
      .message-body {
        color: #555;
      }
      
      /* Loading state */
      .loading-state {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      
      .loading-spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #2271b1;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        animation: spin 1s linear infinite;
        margin-right: 10px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* Message tabs */
      .message-tabs {
        display: flex;
        border-bottom: 1px solid #ccc;
        margin-bottom: 15px;
      }
      
      .message-tabs .tab {
        padding: 10px 15px;
        text-decoration: none;
        color: #555;
        font-weight: 500;
      }
      
      .message-tabs .tab.active {
        border-bottom: 2px solid #2271b1;
        color: #2271b1;
      }
      
      /* Message stats */
      .message-stats {
        display: flex;
        justify-content: space-between;
        padding: 20px 0;
      }
      
      .stat-box {
        flex: 1;
        padding: 10px;
        text-align: center;
        border-right: 1px solid #eee;
      }
      
      .stat-box:last-child {
        border-right: none;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #2271b1;
      }
      
      .stat-label {
        font-size: 12px;
        color: #666;
        margin-top: 5px;
      }
      
      .high-priority .stat-value {
        color: #d63638;
      }
      
      /* Message center header */
      .message-center-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }
      
      .message-center-title {
        margin: 0;
        font-size: 18px;
      }
      
      .message-center-subtitle {
        color: #666;
        font-size: 12px;
      }
      
      .message-center-unread {
        background-color: #d63638;
        color: #fff;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
      }
      
      /* Messages header */
      .messages-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      
      .messages-header h2 {
        margin: 0;
      }
      
      .no-messages {
        padding: 30px;
        text-align: center;
        color: #666;
        background: #f9f9f9;
        border-radius: 4px;
      }
    `;

    // Append to head
    document.head.appendChild(style);
  }
})(jQuery);
