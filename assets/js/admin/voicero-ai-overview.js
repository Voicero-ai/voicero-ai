/**
 * Voicero AI Overview
 * Handles the AI usage overview functionality
 */

(function ($) {
  "use strict";

  /**
   * Initialize the AI overview page
   */
  function initAIOverviewPage() {
    // Load the markdown parser
    loadMarkdownParser();

    // Set up refresh data button
    $("#refresh-data-btn").on("click", function () {
      refreshData();
    });

    // Set up view more links for recent queries (using event delegation for dynamically added elements)
    $(document).on("click", ".view-more-link", function (e) {
      e.preventDefault();
      var $queryItem = $(this).closest(".query-item");
      viewConversationDetails($queryItem);
    });

    // Set up view all conversations button
    $("#view-all-conversations").on("click", function (e) {
      e.preventDefault();
      viewAllConversations();
    });

    // Set up manage settings button
    $("#manage-settings-btn").on("click", function () {
      navigateToSettings();
    });

    // Load AI history data directly using the website ID from the config
    var config = typeof voiceroConfig !== "undefined" ? voiceroConfig : {};

    // Debug the config object
    console.log("=== AI OVERVIEW CONFIG DEBUG ===");
    console.log("voiceroConfig exists:", typeof voiceroConfig !== "undefined");
    console.log("voiceroConfig object:", voiceroConfig);
    console.log("config object:", config);
    console.log("config.websiteId:", config.websiteId);
    console.log("config.websiteId type:", typeof config.websiteId);
    console.log("config.websiteId empty check:", !config.websiteId);
    console.log("=== END AI OVERVIEW CONFIG DEBUG ===");

    if (config.websiteId) {
      loadAIHistory(config.websiteId);
    } else {
      console.error(
        "Website ID is missing from config, cannot load AI history"
      );
      showErrorMessage(
        "Website ID not found. Please configure your website in the settings."
      );
    }
  }

  /**
   * Load the Marked.js markdown parser
   */
  function loadMarkdownParser() {
    if (typeof window.marked === "undefined") {
      // Create script element to load Marked.js from CDN
      var script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/marked@4.3.0/marked.min.js";
      script.onload = function () {
        // Configure marked options if needed
        if (window.marked) {
          window.marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: false,
            sanitize: true,
          });
        }
      };
      script.onerror = function () {
        console.error("Failed to load markdown parser");
      };
      document.head.appendChild(script);
    }
  }

  /**
   * Parse markdown content to HTML
   * @param {string} content - The markdown content
   * @return {string} The HTML content
   */
  function parseMarkdown(content) {
    if (!content) return "";

    // If marked is loaded, use it to parse markdown
    if (typeof window.marked !== "undefined") {
      return window.marked.parse(content);
    }

    // Fallback if marked is not loaded yet
    return content;
  }

  /**
   * Load website information first, then load AI history
   * Similar to the approach in voicero-settings.js
   * NOTE: This function is no longer used in AI Overview - we get websiteId directly from config
   */
  function loadWebsiteInfo() {
    // Show loading overlay
    showLoadingIndicator();

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
        action: "voicero_websites_get",
        nonce: config.nonce,
        id: config.websiteId,
      },
      success: function (response) {
        if (response.success && response.data) {
          var websiteData = response.data;
          // Save the website ID to use for AI history
          if (websiteData.id) {
            // Now load AI history with the website ID
            loadAIHistory(websiteData.id);

            // Update website information
            $("#website-name").text(websiteData.name || "Alias");
            $("#website-plan").text(websiteData.plan || "Starter");

            // Format queries as "used/limit"
            var queries = websiteData.queryCount || 0;
            var queryLimit = websiteData.queryLimit || 1000;
            $("#website-queries").text(
              queries + "/" + queryLimit + " included"
            );

            // Format domain
            $("#website-domain").text(
              websiteData.domain || "http://alias.local"
            );

            // Format status
            var status = websiteData.active ? "Active" : "Inactive";
            $("#website-status").text(status);
          } else {
            hideLoadingIndicator();
            showErrorMessage(
              "Website ID not found in the response. Please configure your website in the settings."
            );
            console.error("Website ID not found in the response:", websiteData);
          }
        } else {
          hideLoadingIndicator();
          showErrorMessage(
            "Failed to load website information. Please refresh the page and try again."
          );
          console.error("Failed to load website information:", response);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        hideLoadingIndicator();
        console.error(
          "AJAX error while loading website info:",
          textStatus,
          errorThrown
        );
        console.error("Response:", jqXHR.responseText);
        showErrorMessage(
          "Failed to connect to the server. Please check your internet connection and try again."
        );
      },
    });
  }

  /**
   * Load AI history data from the API
   * @param {string} websiteId - The website ID to use for fetching history
   */
  function loadAIHistory(websiteId) {
    // Show loading indicator if it's not already shown
    if ($("#overview-loading").length === 0) {
      showLoadingIndicator();
    }

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Use jQuery AJAX just like in voicero-settings.js
    console.log("=== MAKING AI HISTORY AJAX CALL ===");
    console.log("AJAX URL:", config.ajaxUrl);
    console.log("Website ID:", websiteId);
    console.log("Nonce:", config.nonce);
    console.log("=== END AJAX CALL SETUP ===");

    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_get_ai_history",
        nonce: config.nonce,
        websiteId: websiteId,
      },
      success: function (response) {
        hideLoadingIndicator();

        // Console log EVERYTHING from the AI History API
        console.log("=== AI HISTORY API RESPONSE (FULL) ===");
        console.log("Full Response Object:", response);
        console.log("Response Success:", response.success);
        console.log("Response Data:", response.data);
        console.log("Response Data Type:", typeof response.data);
        console.log(
          "Response Data Keys:",
          response.data ? Object.keys(response.data) : "No data"
        );
        console.log("=== END AI HISTORY API RESPONSE ===");

        if (response.success) {
          console.log("=== AI HISTORY DATA DETAILS ===");
          console.log("Data object:", response.data);

          if (response.data) {
            console.log("Analysis:", response.data.analysis);
            console.log("Threads:", response.data.threads);
            console.log("Thread Count:", response.data.threadCount);
            console.log("Total Queries:", response.data.total_queries);
            console.log("Current Plan:", response.data.current_plan);
            console.log("Query Limit:", response.data.query_limit);

            // Log each thread individually if they exist
            if (response.data.threads && Array.isArray(response.data.threads)) {
              console.log("Individual Threads:");
              response.data.threads.forEach((thread, index) => {
                console.log(`Thread ${index}:`, thread);
              });
            }
          }
          console.log("=== END AI HISTORY DATA DETAILS ===");

          // Store the data globally so we can access it when viewing conversation details
          window.latestAIHistoryData = response.data;

          displayAIHistory(response.data);
        } else {
          var errorMessage =
            response.data?.message ||
            "An error occurred while fetching AI history.";
          console.error("AI History API error:", errorMessage);
          showErrorMessage(errorMessage);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error("AJAX error while loading AI history:");
        console.error("Status:", textStatus);
        console.error("Error:", errorThrown);
        console.error("Response:", jqXHR.responseText);
        console.error("Status code:", jqXHR.status);

        let errorMsg = "An error occurred while fetching AI history.";
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

        hideLoadingIndicator();
        showErrorMessage(errorMsg + " (Status: " + jqXHR.status + ")");
      },
      complete: function (jqXHR, textStatus) {},
    });
  }

  /**
   * Display AI history data
   * @param {Object} data - The AI history data
   */
  function displayAIHistory(data) {
    // First, clear any existing static/placeholder content
    $(".analysis-list").empty();
    $(".recent-queries-list").empty();

    // Check if data is empty or has no relevant information
    var hasNoData =
      !data ||
      ((!data.threads || data.threads.length === 0) && data.threadCount === 0);

    if (hasNoData) {
      // Show empty state messages
      $(".analysis-list").html(
        "<li>No AI usage analysis available yet. This will appear after more user interactions.</li>"
      );
      $(".recent-queries-list").html(
        "<div class='empty-state'>No recent conversations found. Conversations will appear here once users start interacting with the AI.</div>"
      );
      return;
    }

    // Update the page with the rich new data structure
    updateKPISection(data);
    updateAnalysisSection(data);
    updateRecentQueries(data.threads || []);

    // Show a success message briefly
    showSuccessMessage("AI usage data loaded successfully");
  }

  /**
   * Update the KPI metrics section
   * @param {Object} data - The AI history data
   */
  function updateKPISection(data) {
    // Update thread count
    if (data.threadCount !== undefined) {
      $(".usage-amount").text(data.threadCount);
    }

    // If we have KPI snapshot data, display it
    if (data.report && data.report.kpi_snapshot) {
      var kpi = data.report.kpi_snapshot;

      // Update or create KPI cards if they don't exist
      var $kpiContainer = $(".voicero-card").first();
      if ($kpiContainer.length) {
        // Add KPI metrics after the usage amount
        var kpiHtml = `
          <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
            <div class="kpi-card">
              <div class="kpi-value" style="font-size: 24px; font-weight: 600; color: #22c55e;">${
                kpi.helpful_percent || 0
              }%</div>
              <div class="kpi-label" style="color: #666; font-size: 14px;">Helpful Interactions</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value" style="font-size: 24px; font-weight: 600; color: #ef4444;">${
                kpi.needs_work_percent || 0
              }%</div>
              <div class="kpi-label" style="color: #666; font-size: 14px;">Need Improvement</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value" style="font-size: 24px; font-weight: 600; color: #3b82f6;">${
                kpi.total_threads || 0
              }</div>
              <div class="kpi-label" style="color: #666; font-size: 14px;">Total Conversations</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-value" style="font-size: 24px; font-weight: 600; color: #8b5cf6;">${
                kpi.avg_user_messages_when_good || 0
              }</div>
              <div class="kpi-label" style="color: #666; font-size: 14px;">Avg Messages (Good)</div>
            </div>
          </div>
        `;

        // Insert after the usage stats
        $kpiContainer.find(".voicero-card-content").append(kpiHtml);
      }
    }
  }

  /**
   * Update the analysis section with the rich AI analysis data
   * @param {Object} data - The full AI history data object
   */
  function updateAnalysisSection(data) {
    var $analysisContainer = $(".analysis-list").parent().parent();

    if (!data.report) {
      $(".analysis-list").html("<li>No analysis data available</li>");
      return;
    }

    var report = data.report;
    var analysisHtml = "";

    // Main AI Usage Analysis
    if (report.ai_usage_analysis) {
      analysisHtml += `
        <div class="analysis-section">
          <h3 style="color: #2271b1; margin-bottom: 15px; font-size: 16px;">📊 Overall Analysis</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; line-height: 1.6;">
            ${parseMarkdown(report.ai_usage_analysis)}
          </div>
        </div>
      `;
    }

    // What's Working Section
    if (report.whats_working && report.whats_working.length > 0) {
      analysisHtml += `
        <div class="analysis-section">
          <h3 style="color: #22c55e; margin-bottom: 15px; font-size: 16px;">✅ What's Working Well</h3>
          <ul style="margin-bottom: 20px;">
            ${report.whats_working
              .map(
                (item) =>
                  `<li style="margin-bottom: 8px; color: #059669;">${item}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    // Quick Wins Section
    if (report.quick_wins && report.quick_wins.length > 0) {
      analysisHtml += `
        <div class="analysis-section">
          <h3 style="color: #3b82f6; margin-bottom: 15px; font-size: 16px;">🚀 Quick Wins</h3>
          <ul style="margin-bottom: 20px;">
            ${report.quick_wins
              .map(
                (item) =>
                  `<li style="margin-bottom: 8px; color: #2563eb;">${item}</li>`
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    // Pain Points Section
    if (report.pain_points && report.pain_points.length > 0) {
      analysisHtml += `
        <div class="analysis-section">
          <h3 style="color: #ef4444; margin-bottom: 15px; font-size: 16px;">⚠️ Areas for Improvement</h3>
          <div style="margin-bottom: 20px;">
            ${report.pain_points
              .map(
                (point) => `
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 10px; border-radius: 0 6px 6px 0;">
                <h4 style="color: #dc2626; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${point.title}</h4>
                <p style="margin: 0; color: #b91c1c; line-height: 1.5;">${point.description}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    }

    // Chat Review Summary
    if (report.chat_review) {
      var review = report.chat_review;
      analysisHtml += `
        <div class="analysis-section">
          <h3 style="color: #8b5cf6; margin-bottom: 15px; font-size: 16px;">💬 Conversation Quality</h3>
          <div style="background: #faf5ff; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <div style="font-size: 18px; font-weight: 600; color: #22c55e;">${
                  review.good_count || 0
                }</div>
                <div style="color: #666; font-size: 12px;">Good Conversations</div>
              </div>
              <div>
                <div style="font-size: 18px; font-weight: 600; color: #ef4444;">${
                  review.needs_work_count || 0
                }</div>
                <div style="color: #666; font-size: 12px;">Need Work</div>
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 13px; color: #7c3aed;">
              <strong>Good:</strong> ${
                review.good_definition || "No definition available"
              }
            </div>
          </div>
        </div>
      `;
    }

    // Replace the analysis list with our rich content
    $(".analysis-list").html(analysisHtml);
  }

  /**
   * Update the recent queries section with thread data
   * @param {Array} threads - The thread data
   */
  function updateRecentQueries(threads) {
    // Clear existing queries
    var $container = $(".recent-queries-list");
    $container.empty();

    // Check if threads is empty
    if (!threads || threads.length === 0) {
      $container.html(
        "<div class='empty-state'>No recent conversations found</div>"
      );
      return;
    }

    // Add each thread as a query item
    threads.forEach((thread) => {
      // Find the first user message to use as the query text
      var userMessage =
        thread.messages && thread.messages.find((msg) => msg.role === "user");
      var queryText =
        userMessage && userMessage.content
          ? userMessage.content
          : "No query text available";

      // Format the timestamp
      var timestamp = thread.lastMessageAt
        ? new Date(thread.lastMessageAt).toLocaleString()
        : "Unknown date";

      // Get message count with fallback
      var messageCount = thread.messageCount || thread.messages?.length || 0;

      // Parse markdown in query text
      var parsedQueryText = parseMarkdown(queryText);

      // Use either threadId or id, whichever is available
      var threadIdentifier = thread.threadId || thread.id || "";

      // Create the query item
      var $queryItem = $(`
        <div class="query-item" data-thread-id="${threadIdentifier}">
            <div class="query-content">
                <div class="query-text">${parsedQueryText}</div>
                <div class="query-time">${timestamp}</div>
            </div>
            <div class="query-stats">
                <div class="message-count">${messageCount} messages</div>
                <a href="#" class="view-more-link">View More</a>
            </div>
        </div>
      `);

      // Store the thread data as a data attribute for easy access
      $queryItem.data("thread-data", thread);

      // Add to container
      $container.append($queryItem);
    });
  }

  /**
   * Refresh data from the API
   */
  function refreshData() {
    // Show loading indicator
    showLoadingIndicator();

    // Create a config object with fallbacks if voiceroConfig isn't defined
    var config =
      typeof voiceroConfig !== "undefined"
        ? voiceroConfig
        : {
            ajaxUrl: ajaxurl,
            nonce: $("#voicero_nonce").val(),
          };

    // Use jQuery AJAX just like in voicero-settings.js
    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_refresh_ai_stats",
        nonce: config.nonce,
      },
      success: function (response) {
        hideLoadingIndicator();

        if (response.success) {
          showSuccessMessage("Data refreshed successfully");

          // Reload the page to show updated data
          setTimeout(function () {
            location.reload();
          }, 1000);
        } else {
          var errorMessage =
            response.data?.message ||
            "An error occurred while refreshing data.";
          console.error("AI refresh error:", errorMessage);
          showErrorMessage(errorMessage);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error("AJAX error while refreshing data:");
        console.error("Status:", textStatus);
        console.error("Error:", errorThrown);
        console.error("Response:", jqXHR.responseText);
        console.error("Status code:", jqXHR.status);

        let errorMsg = "An error occurred while refreshing data.";
        if (jqXHR.responseText) {
          try {
            var responseData = JSON.parse(jqXHR.responseText);
            if (responseData.message) {
              errorMsg = responseData.message;
            }
          } catch (e) {
            // If we can't parse JSON, just use the raw response text
            if (jqXHR.responseText.length < 100) {
              errorMsg += " " + jqXHR.responseText;
            }
          }
        }

        hideLoadingIndicator();
        showErrorMessage(errorMsg + " (Status: " + jqXHR.status + ")");
      },
      complete: function (jqXHR, textStatus) {},
    });
  }

  /**
   * View conversation details
   * @param {Object} $queryItem - The query item jQuery object
   */
  function viewConversationDetails($queryItem) {
    var threadId = $queryItem.data("thread-id");

    // If conversation details already exist, toggle it
    if ($queryItem.next(".conversation-details").length) {
      $queryItem.next(".conversation-details").slideToggle();
      return;
    }

    // Log the thread ID we're looking for to help debug
    "Looking for thread with ID:", threadId;

    // Find the thread data in the latest response
    var thread = null;

    // First try to get it from the stored thread data in the element
    thread = $queryItem.data("thread-data");

    // If that didn't work, try to find it in the global data
    if (
      !thread &&
      window.latestAIHistoryData &&
      window.latestAIHistoryData.threads
    ) {
      // Log available thread IDs to help debug

      thread = window.latestAIHistoryData.threads.find(
        (t) => t.threadId === threadId || t.id === threadId
      );
    }

    if (!thread || !thread.messages || thread.messages.length === 0) {
      // If we can't find thread data, show an error
      console.error("Could not find thread with ID:", threadId);
      alert("Conversation details not available");
      return;
    }

    "Found thread:", thread;

    // Create conversation details element
    var $details = $('<div class="conversation-details"></div>');

    // Add each message to the conversation
    thread.messages.forEach(function (message) {
      var isUser = message.role === "user";
      var content = message.content || "";

      // Clean up AI response if it's in JSON format
      if (!isUser && content.startsWith("{") && content.endsWith("}")) {
        try {
          var jsonData = JSON.parse(content);
          if (jsonData.answer) {
            content = jsonData.answer;
          }
        } catch (e) {
          // Keep original content if parsing fails
        }
      }

      // Create message bubble
      var $message = $(
        '<div class="message-container ' +
          (isUser ? "user-message" : "assistant-message") +
          '">' +
          '<div class="message-bubble">' +
          '<div class="message-role">' +
          (isUser ? "User" : "Assistant") +
          "</div>" +
          '<div class="message-content">' +
          parseMarkdown(content) +
          "</div>" +
          '<div class="message-time">' +
          new Date(message.createdAt).toLocaleTimeString() +
          "</div>" +
          "</div>" +
          "</div>"
      );

      $details.append($message);
    });

    // Insert conversation details after the query item
    $details.insertAfter($queryItem).hide().slideDown();
  }

  /**
   * View all conversations
   */
  function viewAllConversations() {
    // Navigate to a hypothetical conversations page
    window.location.href = "admin.php?page=voicero-ai-conversations";
  }

  /**
   * Navigate to settings page
   */
  function navigateToSettings() {
    window.location.href = "admin.php?page=voicero-ai-settings";
  }

  /**
   * Show a loading indicator
   */
  function showLoadingIndicator() {
    // Add a loading overlay if it doesn't exist
    if ($("#overview-loading").length === 0) {
      $("body").append(
        '<div id="overview-loading" class="loading-overlay"><span class="spinner is-active"></span><p>Refreshing data...</p></div>'
      );
    }

    // Show the overlay
    $("#overview-loading").fadeIn();
  }

  /**
   * Hide the loading indicator
   */
  function hideLoadingIndicator() {
    // Hide and remove the overlay
    $("#overview-loading").fadeOut(function () {
      $(this).remove();
    });
  }

  /**
   * Show a success message
   * @param {string} message - The success message
   */
  function showSuccessMessage(message) {
    var $notice = $(
      '<div class="notice notice-success is-dismissible"><p>' +
        message +
        "</p></div>"
    );
    $("#voicero-overview-message").html($notice);

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
  function showErrorMessage(message) {
    var $notice = $(
      '<div class="notice notice-error is-dismissible"><p>' +
        message +
        "</p></div>"
    );
    $("#voicero-overview-message").html($notice);
  }

  // Initialize when the DOM is ready
  $(document).ready(function () {
    // Check if we're on the AI overview page
    if ($(".voicero-ai-overview-page").length > 0) {
      initAIOverviewPage();

      // Add CSS for the AI overview page
      addCustomCSS();
    }
  });

  /**
   * Add custom CSS for the AI overview page
   */
  function addCustomCSS() {
    $("head").append(`
            <style>
                /* AI Overview Page Styles */
                .voicero-ai-overview-page {
                    max-width: 800px;
                }
                
                .overview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                
                .back-link {
                    text-decoration: none;
                    color: #2271b1;
                    display: flex;
                    align-items: center;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .back-link .dashicons {
                    margin-right: 5px;
                }
                
                #refresh-data-btn {
                    display: flex;
                    align-items: center;
                }
                
                #refresh-data-btn .dashicons {
                    margin-right: 5px;
                }
                
                /* Card Styles */
                .voicero-card {
                    background: #fff;
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                    overflow: hidden;
                }
                
                .voicero-card-header {
                    display: flex;
                    align-items: center;
                    padding: 15px 20px;
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .card-header-icon {
                    margin-right: 15px;
                }
                
                .card-header-icon .dashicons {
                    color: #2271b1;
                    font-size: 20px;
                }
                
                .voicero-card-header h2 {
                    margin: 0;
                    flex-grow: 1;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .voicero-card-content {
                    padding: 20px;
                }
                
                /* Monthly Query Usage */
                .usage-stats {
                    text-align: center;
                    padding: 10px 0;
                }
                
                .usage-amount {
                    font-size: 24px;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                
                .usage-description {
                    color: #666;
                    font-style: italic;
                }
                
                /* AI Usage Analysis */
                .analysis-list {
                    margin: 0;
                    padding-left: 20px;
                }
                
                .analysis-list li {
                    margin-bottom: 15px;
                    line-height: 1.5;
                }
                
                .analysis-list li:last-child {
                    margin-bottom: 0;
                }
                
                /* Usage Statistics */
                .stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                
                .stats-item {
                    display: flex;
                    align-items: flex-start;
                }
                
                .stats-label {
                    font-weight: 600;
                    margin-right: 10px;
                    width: 100px;
                    flex-shrink: 0;
                }
                
                .stats-value {
                    color: #333;
                }
                
                .plan-badge {
                    background-color: #2271b1;
                    color: white;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                /* Recent AI Queries */
                .recent-queries-list {
                    margin-bottom: 20px;
                }
                
                .query-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .query-item:last-child {
                    border-bottom: none;
                }
                
                .query-content {
                    flex-grow: 1;
                    padding-right: 15px;
                }
                
                .query-text {
                    font-weight: 500;
                    margin-bottom: 5px;
                }
                
                .query-text p {
                    margin: 0 0 0.5em 0;
                }
                
                .query-text p:last-child {
                    margin-bottom: 0;
                }
                
                .query-text code {
                    background: #f0f0f0;
                    padding: 2px 4px;
                    border-radius: 3px;
                }
                
                .query-text pre {
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 0.5em 0;
                }
                
                .query-text ul, .query-text ol {
                    margin-left: 1.5em;
                    margin-top: 0.5em;
                    margin-bottom: 0.5em;
                }
                
                .query-time {
                    color: #666;
                    font-size: 12px;
                }
                
                .query-stats {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                
                .message-count {
                    background-color: #f0f6fc;
                    padding: 3px 8px;
                    border-radius: 10px;
                    font-size: 12px;
                    color: #2271b1;
                    margin-bottom: 5px;
                }
                
                .view-more-link {
                    font-size: 12px;
                    color: #2271b1;
                    text-decoration: none;
                    cursor: pointer;
                }
                
                .view-all-container {
                    text-align: center;
                }
                
                /* Conversation Details Styles */
                .conversation-details {
                    background: #f9f9f9;
                    border-radius: 4px;
                    margin: 10px 0 15px;
                    padding: 15px;
                    border: 1px solid #eee;
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .message-container {
                    margin-bottom: 12px;
                    display: flex;
                }
                
                .user-message {
                    justify-content: flex-end;
                }
                
                .assistant-message {
                    justify-content: flex-start;
                }
                
                .message-bubble {
                    border-radius: 10px;
                    padding: 10px 12px;
                    max-width: 85%;
                    position: relative;
                }
                
                .user-message .message-bubble {
                    background: #e6f2ff;
                    border: 1px solid #cce5ff;
                }
                
                .assistant-message .message-bubble {
                    background: #f0f0f0;
                    border: 1px solid #e0e0e0;
                }
                
                .message-role {
                    font-weight: 600;
                    font-size: 12px;
                    margin-bottom: 5px;
                    color: #666;
                }
                
                .message-content {
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .message-content p:first-child {
                    margin-top: 0;
                }
                
                .message-content p:last-child {
                    margin-bottom: 0;
                }
                
                .message-time {
                    font-size: 10px;
                    color: #999;
                    margin-top: 5px;
                    text-align: right;
                }
                
                /* Website Overview */
                .website-info {
                    display: grid;
                    gap: 15px;
                }
                
                .info-item {
                    display: flex;
                }
                
                .info-label {
                    font-weight: 600;
                    width: 100px;
                    flex-shrink: 0;
                }
                
                .info-value {
                    color: #333;
                }
                
                /* Loading Overlay */
                .loading-overlay {
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
                
                .loading-overlay .spinner {
                    float: none;
                    margin: 0 0 10px 0;
                }
                
                /* Loading placeholders */
                .loading-placeholder {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                    padding: 20px;
                    background: #f9f9f9;
                    border-radius: 4px;
                    border: 1px dashed #ddd;
                }
            </style>
        `);
  }
})(jQuery);
