jQuery(document).ready(function ($) {
  // Global state variables for the modernized interface
  let isDataLoading = false;
  let isLoadingExtendedData = false;
  let extendedWebsiteData = null;
  let trainingProgress = 0;
  let trainingStatus = "idle"; // idle, processing, complete, error
  let loadingText = "";
  let timeRemaining = 0;

  // Add toggle functionality
  $(".connection-details-toggle button").on("click", function () {
    var $toggle = $(this).parent();
    var $details = $(".connection-details");
    var isVisible = $details.is(":visible");

    $details.slideToggle();
    $toggle.toggleClass("active");
    $(this).html(`
            <span class="dashicons dashicons-arrow-${
              isVisible ? "down" : "up"
            }-alt2"></span>
            ${isVisible ? "Show" : "Hide"} Connection Details
        `);
  });

  // Function to get training status message
  function getTrainingStatusMessage() {
    switch (trainingStatus) {
      case "processing":
        if (trainingProgress < 17) return "Syncing your website content...";
        if (trainingProgress < 34)
          return "Processing and vectorizing content...";
        if (trainingProgress < 50) return "Setting up AI assistant...";
        if (trainingProgress < 100) return "Training AI on your content...";
        return "Finalizing training process...";
      case "complete":
        return "Training completed successfully!";
      case "error":
        return "Training encountered an error. Please try again.";
      default:
        return "Ready to begin training.";
    }
  }

  // Function to format time remaining
  function formatTimeRemaining(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  // Function to update training progress
  function updateTrainingProgress(
    progress,
    status = null,
    text = null,
    timeLeft = null
  ) {
    trainingProgress = Math.min(100, Math.max(0, progress));
    if (status) trainingStatus = status;
    if (text) loadingText = text;
    if (timeLeft !== null) timeRemaining = timeLeft;
  }

  // Check if WordPress shows expired message - only once
  var bodyText = $("body").text();
  if (
    bodyText.includes("link you followed has expired") &&
    window.location.search.includes("access_key")
  ) {
    // Only refresh if we came from an access_key URL
    var newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("access_key");
    window.location.replace(newUrl.toString()); // Use replace instead of href
    return;
  }

  // Add a flag to localStorage when clearing connection
  $("#clear-connection").on("click", function () {
    if (confirm("Are you sure you want to clear the connection?")) {
      localStorage.setItem("connection_cleared", "true");

      // Make AJAX call to clear the connection
      $.post(voiceroAdminConfig.ajaxUrl, {
        action: "voicero_clear_connection",
        nonce: voiceroAdminConfig.nonce,
      }).then(function () {
        // Clear the form and reload
        $("#access_key").val("");
        window.location.reload();
      });
    }
  });

  // Check for access key in URL - but only if we haven't just cleared
  var urlParams = new URLSearchParams(window.location.search);
  var accessKey = urlParams.get("access_key");
  var wasCleared = localStorage.getItem("connection_cleared") === "true";

  if (accessKey && !wasCleared) {
    // Just fill the form
    $("#access_key").val(accessKey);

    // Clean the URL
    var newUrl = new URL(window.location.href);
    newUrl.searchParams.delete("access_key");
    window.history.replaceState({}, "", newUrl.toString());
  }

  // Clear the flag after handling
  localStorage.removeItem("connection_cleared");

  // Handle sync form submission
  $("#sync-form").on("submit", function (e) {
    // Stop form from submitting normally
    e.preventDefault();
    e.stopPropagation();

    var syncButton = $(
      "#sync-button, #prominent-sync-button, #regular-sync-button"
    );
    var syncStatusContainer = $("#sync-status");

    // No plan checks - always allow sync

    // Reset initial state and start training status
    syncButton.prop("disabled", true);
    trainingStatus = "processing";
    updateTrainingProgress(5, "processing", "Initiating sync...");

    // Create progress bar and status text elements (keeping legacy for compatibility)
    syncStatusContainer.html(`
            <div id="sync-progress-bar-container" style="width: 100%; background-color: #e0e0e0; border-radius: 4px; overflow: hidden; margin-bottom: 5px; height: 24px; position: relative; margin-top: 15px;">
                <div id="sync-progress-bar" style="width: 0%; height: 100%; background-color: #0073aa; transition: width 0.3s ease;"></div>
                <div id="sync-progress-percentage" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; line-height: 24px; text-align: center; color: #fff; font-weight: bold; text-shadow: 1px 1px 1px rgba(0,0,0,0.2);">
                    0%
                </div>
            </div>
            <div id="sync-progress-text" style="font-style: italic; text-align: center;">Initiating sync...</div>
            <div id="sync-warning" style="margin-top: 10px; padding: 8px; background-color: #f0f6fc; border-left: 4px solid #2271b1; color: #1d2327; font-size: 13px; text-align: left;">
                <p><strong>⚠️ Important:</strong> Please do not close this page during training. You can leave the page and do other things while the training is happening. This process could take up to 20 minutes to complete depending on the size of your website.</p>
            </div>
        `);

    var progressBar = $("#sync-progress-bar");
    var progressPercentage = $("#sync-progress-percentage");
    var progressText = $("#sync-progress-text");

    function updateProgress(percentage, text, isError = false) {
      var p = Math.min(100, Math.max(0, Math.round(percentage))); // Clamp between 0 and 100
      progressBar.css("width", p + "%");
      progressPercentage.text(p + "%");
      progressText.text(text);

      // Also update the modern training banner
      updateTrainingProgress(p, isError ? "error" : "processing", text);

      if (isError) {
        progressBar.css("background-color", "#d63638"); // Red for error
        progressPercentage.css("color", "#fff");
      } else {
        progressBar.css("background-color", "#0073aa"); // Blue for progress/success
        progressPercentage.css("color", p < 40 ? "#333" : "#fff");
      }
    }

    updateProgress(5, "⏳ Syncing content...");

    try {
      let assistantData = null; // To store assistant response
      let websiteId = null; // Declare websiteId at a higher scope level

      // Step 1: Initial Sync (to 17%)
      $.post(voiceroAdminConfig.ajaxUrl, {
        action: "voicero_sync_content",
        nonce: voiceroAdminConfig.nonce,
      })
        .then(function (response) {
          if (!response.success)
            throw new Error(response.data.message || "Sync failed");
          updateProgress(
            response.data.progress || 17,
            "⏳ Vectorizing content..."
          );
          // Step 2: Vectorization (to 34%)
          return $.post(voiceroAdminConfig.ajaxUrl, {
            action: "voicero_vectorize_content",
            nonce: voiceroAdminConfig.nonce,
          });
        })
        .then(function (response) {
          if (!response.success)
            throw new Error(response.data.message || "Vectorization failed");
          updateProgress(
            response.data.progress || 34,
            "⏳ Setting up assistant..."
          );
          // Step 3: Assistant Setup (to 50%)
          return $.post(voiceroAdminConfig.ajaxUrl, {
            action: "voicero_setup_assistant",
            nonce: voiceroAdminConfig.nonce,
          });
        })
        .then(function (response) {
          if (!response.success)
            throw new Error(response.data.message || "Assistant setup failed");
          updateProgress(
            response.data.progress || 50,
            "⏳ Training content..."
          );
          assistantData = response.data.data; // Store the content IDs

          // Store websiteId at the higher scope
          if (assistantData && assistantData.websiteId) {
            websiteId = assistantData.websiteId;
          } else {
            // Try to use the first content item's websiteId as fallback
            if (
              assistantData &&
              assistantData.content &&
              assistantData.content.pages &&
              assistantData.content.pages.length > 0
            ) {
              websiteId = assistantData.content.pages[0].websiteId;
            }
            // If still no websiteId, we'll need to handle that error case
            if (!websiteId) {
              throw new Error("No websiteId available for training");
            }
          }

          // --- Step 4: All Training (50% to 100%) ---
          if (!assistantData || !assistantData.content) {
            // Even if no content items, we still need to do general training
          }

          // Prepare training data
          var pages =
            assistantData && assistantData.content
              ? assistantData.content.pages || []
              : [];
          var posts =
            assistantData && assistantData.content
              ? assistantData.content.posts || []
              : [];
          var products =
            assistantData && assistantData.content
              ? assistantData.content.products || []
              : [];

          // Calculate total items including general training which we'll do last
          var allItemsCount = pages.length + posts.length + products.length + 1; // +1 for general training
          updateProgress(50, `⏳ Preparing to train ${allItemsCount} items...`);

          // Build combined array of all items to train
          var allItems = [
            ...pages.map((item) => ({ type: "page", wpId: item.id })),
            ...posts.map((item) => ({ type: "post", wpId: item.id })),
            ...products.map((item) => ({ type: "product", wpId: item.id })),
            { type: "general" }, // Add general training as the last item
          ];

          // Process in batches of 10 items
          var BATCH_SIZE = 10;
          var totalItems = allItems.length;
          var totalBatches = Math.ceil(totalItems / BATCH_SIZE);
          let currentBatch = 0;
          let processedItems = 0;

          function processBatch() {
            currentBatch++;
            var startIndex = (currentBatch - 1) * BATCH_SIZE;
            var endIndex = Math.min(startIndex + BATCH_SIZE, totalItems);
            var batchItems = allItems.slice(startIndex, endIndex);
            var batchSize = batchItems.length;

            // Calculate progress: 50% (setup) + up to 50% for batch processing
            var progress = 50 + ((currentBatch - 1) / totalBatches) * 50;

            updateProgress(
              progress,
              `⏳ Processing batch ${currentBatch}/${totalBatches} (${processedItems}/${totalItems} items)...`
            );

            // Show current status
            $("#sync-warning").html(`
              <p><strong>ℹ️ Training In Progress:</strong> Processing batch ${currentBatch} of ${totalBatches}.</p>
              <div id="training-status-container">
                <p id="training-status">Status: <span>Processing ${processedItems}/${totalItems} items complete</span></p>
              </div>
            `);

            // Process this batch of 10 items
            return $.post(voiceroAdminConfig.ajaxUrl, {
              action: "voicero_batch_train",
              nonce: voiceroAdminConfig.nonce,
              websiteId: websiteId,
              batch_data: JSON.stringify(batchItems),
            }).then(function (response) {
              if (!response.success)
                throw new Error(
                  response.data.message || "Batch training failed"
                );

              // Now check the actual training status and wait until it's complete
              return waitForBatchCompletion(
                websiteId,
                JSON.stringify(batchItems),
                batchSize
              ).then(function () {
                // If there are more batches to process
                if (currentBatch < totalBatches) {
                  // Process the next batch
                  return processBatch();
                }

                // All batches complete, return final result
                return {
                  success: true,
                  message: "All batches processed successfully",
                };
              });
            });
          }

          // Function to poll and wait for batch completion
          function waitForBatchCompletion(websiteId, batchData, batchSize) {
            return new Promise((resolve, reject) => {
              var maxAttempts = 30; // Maximum number of attempts (5 minutes with 10-second interval)
              let attempts = 0;

              function checkStatus() {
                $.post(voiceroAdminConfig.ajaxUrl, {
                  action: "voicero_check_batch_training_status",
                  nonce: voiceroAdminConfig.nonce,
                  websiteId: websiteId,
                  batchData: batchData,
                })
                  .done(function (response) {
                    if (response.success) {
                      var status = response.data.status;

                      // Update status message
                      $("#training-status span").text(
                        response.data.message ||
                          `Processing batch ${currentBatch}/${totalBatches}`
                      );

                      if (status === "complete") {
                        // This batch is complete, update processed items
                        processedItems += batchSize;

                        // Resolve the promise to continue with the next batch
                        resolve(response);
                      } else if (status === "in_progress") {
                        // Still in progress, continue polling if under max attempts
                        if (++attempts < maxAttempts) {
                          setTimeout(checkStatus, 10000); // Check every 10 seconds
                        } else {
                          // Max attempts reached, assume it's taking too long but let it continue
                          console.warn(
                            "Max attempts reached waiting for batch completion"
                          );
                          processedItems += batchSize; // Optimistically count these as done
                          resolve({
                            success: true,
                            message:
                              "Batch processing timeout - continuing with next batch",
                          });
                        }
                      } else {
                        // Unknown status, but continue with the process
                        console.warn("Unknown batch status:", status);
                        processedItems += batchSize;
                        resolve(response);
                      }
                    } else {
                      // Error checking status, but continue with the process
                      console.error("Error checking batch status:", response);
                      processedItems += batchSize;
                      resolve({
                        success: true,
                        message:
                          "Error checking batch status - continuing with next batch",
                      });
                    }
                  })
                  .fail(function (error) {
                    console.error("Failed to check batch status:", error);

                    // Even on failure, continue the process
                    processedItems += batchSize;
                    resolve({
                      success: true,
                      message:
                        "Failed to check batch status - continuing with next batch",
                    });
                  });
              }

              // Start checking status after a short delay to allow processing to begin
              setTimeout(checkStatus, 5000);
            });
          }

          // Start processing the first batch
          return processBatch().then(function () {
            // All batches have been processed
            updateProgress(
              100,
              "✅ Training completed successfully! Please refresh the page to see the changes."
            );
            updateTrainingProgress(
              100,
              "complete",
              "Training completed successfully!"
            );
            syncButton.prop("disabled", false);

            $("#sync-warning").html(`
                <p><strong>✅ Training Complete:</strong> Your website content has been successfully trained. 
                The AI assistant now has up-to-date knowledge about your website content.</p>
              `);

            // Save last training date
            $.post(voiceroAdminConfig.ajaxUrl, {
              action: "voicero_save_training_date",
              nonce: voiceroAdminConfig.nonce,
              date: new Date().toISOString(),
            });
          });
        })
        .catch(function (error) {
          // Handle errors
          var message = error.message || "An unknown error occurred";
          console.error("Error during sync process:", error);

          // Check if this is a timeout error from the vectorization process
          var isTimeoutError =
            message.includes("taking longer than expected") ||
            message.includes("timed out") ||
            message.toLowerCase().includes("timeout");

          // Create a retry button if needed
          var retryButton = "";
          if (isTimeoutError) {
            retryButton = `<button id="retry-vectorize" class="button button-primary" style="margin-top: 10px;">Retry with longer timeout</button>`;

            // Create a more user-friendly message
            message =
              "The AI processing is taking longer than expected due to the size of your content. This is normal for larger sites. Please try again and allow up to 5-10 minutes for processing.";
          }

          updateProgress(0, `❌ Error: ${message}`, true);
          updateTrainingProgress(0, "error", `Error: ${message}`);
          syncButton.prop("disabled", false);

          // Add retry button to sync warning if this is a timeout error
          if (isTimeoutError) {
            $("#sync-warning").html(`
              <div class="notice notice-warning inline">
                <p><strong>⚠️ Processing Time:</strong> ${message}</p>
                ${retryButton}
              </div>
            `);

            // Add retry button handler
            $("#retry-vectorize").on("click", function () {
              // Start the sync process over again but with a notification about the longer process
              $("#sync-form").trigger("submit");

              // Update warning to mention the longer timeout
              $("#sync-warning").html(`
                <div class="notice notice-info inline">
                  <p><strong>ℹ️ Extended Processing:</strong> Using a longer timeout for your large site. Please wait, this may take 5-10 minutes.</p>
                </div>
              `);
            });
          }
        });
    } catch (e) {
      updateProgress(
        0,
        `❌ Error: ${e.message || "An unknown error occurred"}`,
        true
      );
      syncButton.prop("disabled", false);
      //  // console.error("Sync error:", e);
    }
  });

  // Also add a direct click handler as backup
  $(document).on(
    "click",
    "#sync-button, #prominent-sync-button, #regular-sync-button",
    function (e) {
      e.preventDefault();
      e.stopPropagation();

      // If this is inside a form, submit the form via jQuery instead
      if ($(this).closest("form").length) {
        $(this).closest("form").trigger("submit");
      }

      return false;
    }
  );

  /**
   * Build AI Overview Section HTML
   * @param {Object} data - The website data containing aiOverview
   */
  function buildAIOverviewSection(data) {
    const overview = data.aiOverview;
    const globalStats = data.globalStats;

    if (!overview) return "";

    let html = `
      <!-- AI Overview Section -->
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        margin-top: 24px;
      ">
        <h3 style="
          margin: 0 0 24px;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <span class="dashicons dashicons-chart-line" style="color: #667eea; font-size: 24px;"></span>
          AI Assistant Performance
        </h3>
    `;

    // Problem Resolution Rate
    if (overview.problem_resolution_rate) {
      const rate = overview.problem_resolution_rate;
      html += `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 16px; color: #2271b1; font-size: 16px;">📊 Problem Resolution Summary</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #22c55e;">${
                rate.percent
              }%</div>
              <div style="color: #666; font-size: 14px;">Resolution Rate</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #3b82f6;">${
                rate.resolved_threads
              }</div>
              <div style="color: #666; font-size: 14px;">Resolved</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #ef4444;">${
                rate.total_threads - rate.resolved_threads
              }</div>
              <div style="color: #666; font-size: 14px;">Need Work</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #8b5cf6;">${
                overview.avg_messages_per_thread
              }</div>
              <div style="color: #666; font-size: 14px;">Avg Messages</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; text-align: center; font-style: italic;">
            ${overview.period_label}
          </div>
        </div>
      `;
    }

    // Most Common Questions
    if (
      overview.most_common_questions &&
      overview.most_common_questions.length > 0
    ) {
      html += `
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 16px; color: #22c55e; font-size: 16px;">💬 Most Common Question Categories</h4>
          <div style="display: grid; gap: 12px;">
      `;

      overview.most_common_questions.forEach((category) => {
        html += `
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 6px 6px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <h5 style="color: #15803d; margin: 0; font-size: 15px; font-weight: 600;">${category.category}</h5>
              <span style="background: #22c55e; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${category.threads} threads
              </span>
            </div>
            <p style="margin: 0; color: #166534; line-height: 1.5; font-size: 14px;">${category.description}</p>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Recent Questions by Topic (collapsible)
    if (
      overview.recent_questions_by_topic &&
      overview.recent_questions_by_topic.length > 0
    ) {
      html += `
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h4 style="margin: 0; color: #3b82f6; font-size: 16px;">🔍 Recent Questions by Topic</h4>
            <button class="button button-secondary" onclick="toggleRecentQuestions()" style="font-size: 12px; padding: 4px 8px;">
              <span id="toggle-questions-text">Show Details</span>
            </button>
          </div>
          <div id="recent-questions-details" style="display: none;">
      `;

      overview.recent_questions_by_topic.forEach((topic) => {
        html += `
          <div style="background: #f0f4ff; border: 1px solid #3b82f6; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
            <h5 style="color: #1e40af; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">
              ${topic.topic} (${topic.items.length} questions)
            </h5>
            <div style="display: grid; gap: 8px;">
        `;

        topic.items.forEach((item) => {
          const statusColor =
            item.status === "Resolved" ? "#22c55e" : "#ef4444";
          const statusBg = item.status === "Resolved" ? "#f0fdf4" : "#fef2f2";

          html += `
            <div style="background: white; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #1f2937; font-size: 14px;">"${item.question}"</strong>
                <span style="background: ${statusBg}; color: ${statusColor}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                  ${item.status}
                </span>
              </div>
              <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.4;">${item.note}</p>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Action Statistics removed per user request

    html += `
      </div>
      
      <script>
        function toggleRecentQuestions() {
          const details = document.getElementById('recent-questions-details');
          const text = document.getElementById('toggle-questions-text');
          if (details.style.display === 'none') {
            details.style.display = 'block';
            text.textContent = 'Hide Details';
          } else {
            details.style.display = 'none';
            text.textContent = 'Show Details';
          }
        }
      </script>
    `;

    return html;
  }

  /**
   * Update the AI Overview section with detailed data
   * @param {Object} detailedData - The detailed website data containing aiOverview
   */
  function updateAIOverviewSection(detailedData) {
    console.log("=== UPDATING AI OVERVIEW SECTION ===");
    console.log("detailedData.aiOverview exists:", !!detailedData.aiOverview);

    // Find the AI Overview placeholder
    const $placeholder = $("#ai-overview-placeholder");

    if ($placeholder.length && detailedData.aiOverview) {
      console.log("Populating AI overview placeholder with real data");
      // Replace the placeholder with the real AI overview section
      const aiOverviewHtml = buildAIOverviewSection(detailedData);
      $placeholder.html(aiOverviewHtml);
    } else {
      console.log("No aiOverview data or placeholder not found");
    }
  }

  // Function to load website info
  function loadWebsiteInfo() {
    var $container = $("#website-info-container");

    // Set loading state
    isDataLoading = true;

    // Add timeout protection (increased to 2.5 minutes to allow for very slow API responses)
    var timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 150000); // 2.5 minute timeout
    });

    // Show modern loading state with Shopify-style design
    $container.html(`
      <div class="wrap" style="max-width: 100%; padding: 0; margin: 0;">
        <h2 class="wp-heading-inline" style="margin-top: 0;">Dashboard</h2>
        <p class="description">Manage your AI-powered shopping assistant</p>
        
        <!-- Loading State Card -->
        <div style="
          background: white;
          border-radius: 12px;
          padding: 80px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          text-align: center;
          margin-top: 20px;
        ">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div class="spinner is-active" style="float: none; margin: 0;"></div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 500;">Loading your dashboard...</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">This may take a few moments</p>
          </div>
        </div>
      </div>
    `);

    // Race between the actual request and the timeout
    Promise.race([
      new Promise((resolve, reject) => {
        $.post(voiceroAdminConfig.ajaxUrl, {
          action: "voicero_get_info",
          nonce: voiceroAdminConfig.nonce,
        })
          .done(function (response) {
            // Console log the websites/get API response data
            console.log("=== WEBSITE INFO API RESPONSE ===");
            console.log("Full response:", response);
            if (response.data) {
              console.log("Website data:", response.data);
              if (response.data.content) {
                console.log("Content data:", response.data.content);
                console.log("Posts:", response.data.content.posts?.length || 0);
                console.log("Pages:", response.data.content.pages?.length || 0);
                console.log(
                  "Products:",
                  response.data.content.products?.length || 0
                );
              }
            }
            console.log("=== END WEBSITE INFO ===");

            // Log AI Overview data if available
            if (response.data && response.data.aiOverview) {
              console.log("=== AI OVERVIEW DATA ===");
              console.log("AI Overview:", response.data.aiOverview);
              console.log("Global Stats:", response.data.globalStats);
              console.log(
                "Recent Questions by Topic:",
                response.data.aiOverview.recent_questions_by_topic
              );
              console.log(
                "Most Common Questions:",
                response.data.aiOverview.most_common_questions
              );
              console.log(
                "Problem Resolution Rate:",
                response.data.aiOverview.problem_resolution_rate
              );
              console.log("=== END AI OVERVIEW DATA ===");
            }

            resolve(response);
          })
          .fail(function (xhr) {
            // If we get a 400 error but still have a readable response, try to parse it
            if (xhr.status === 400 && xhr.responseText) {
              try {
                var data = JSON.parse(xhr.responseText);
                if (data.success === false) {
                  // Check if it's a simple nonce issue - we can retry with a new nonce
                  if (data.data?.message?.includes("Security check")) {
                    // Try to recover silently by getting a new nonce and retrying
                    $.get(window.location.href, function (html) {
                      // Try to extract a new nonce
                      var match = html.match(/nonce":"([^"]+)"/);
                      if (match && match[1]) {
                        // Got a new nonce, retry the request
                        voiceroAdminConfig.nonce = match[1];
                        // Retry original request with new nonce
                        $.post(voiceroAdminConfig.ajaxUrl, {
                          action: "voicero_get_info",
                          nonce: voiceroAdminConfig.nonce,
                        })
                          .done(resolve)
                          .fail(reject);
                      } else {
                        reject(new Error("Could not refresh nonce"));
                      }
                    });
                    return;
                  }

                  // For other errors, just reject with the message
                  reject(new Error(data.data?.message || "Request failed"));
                } else {
                  // If we somehow have success=true but status 400, use the data anyway
                  resolve(data);
                }
              } catch (e) {
                // If we can't parse JSON, reject with xhr
                reject(xhr);
              }
            } else {
              reject(xhr);
            }
          });
      }),
      timeoutPromise,
    ])
      .then(function (response) {
        if (!response.success) {
          throw new Error(
            response.data?.message || "Failed to load website info"
          );
        }
        var data = response.data;
        // Always get detailed website data if we have an ID
        if (data.id) {
          fetchDetailedWebsiteData(data.id);
        }

        // Format last sync date
        let lastSyncDate = "Never";
        if (data.lastSyncedAt) {
          var date = new Date(data.lastSyncedAt);
          lastSyncDate = date.toLocaleString();
        } else if (data.lastSyncDate) {
          var date = new Date(data.lastSyncDate);
          lastSyncDate = date.toLocaleString();
        }

        // Format last training date
        let lastTrainingDate = "Never";
        if (data.lastTrainingDate) {
          var date = new Date(data.lastTrainingDate);
          lastTrainingDate = date.toLocaleString();
        }

        // Set query limit - no plan restrictions
        let queryLimit = 0;
        let isUnlimited = true;

        // No plan restrictions - unlimited queries
        isUnlimited = true;
        queryLimit = 0;

        var isSubscribed = data.isSubscribed === true;

        // Format website name
        var name = data.name || window.location.hostname;

        // Set loading complete
        isDataLoading = false;

        // Build HTML for modern dashboard with Shopify-style design
        let html = `
          <div class="wrap" style="max-width: 100%; padding: 0; margin: 0;">
           
            
            <!-- Header Actions -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 20px 0;">
              <div>
                <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #202223;">Dashboard</h1>
                <p style="margin: 4px 0 0; color: #6c7381; font-size: 14px;">Manage your AI-powered shopping assistant</p>
              </div>
              ${
                data.id
                  ? `
                <a href="https://56b2c4656c5a.ngrok-free.app/app/websites/website?id=${data.id}" 
                   target="_blank" 
                   class="button button-primary open-control-panel"
                   style="
                     display: inline-flex;
                     align-items: center;
                     gap: 8px;
                     background: #008060;
                     border-color: #008060;
                     font-size: 14px;
                     font-weight: 600;
                     padding: 8px 16px;
                     height: auto;
                     line-height: 1.4;
                   ">
                  <span class="dashicons dashicons-external" style="font-size: 16px; width: 16px; height: 16px;"></span>
                  Open Control Panel
                </a>
              `
                  : ""
              }
            </div>

            <!-- Main Content Grid -->
            <div style="display: flex; flex-direction: column; gap: 24px;">
              
              <!-- Website Status Card -->
              <div style="
                background: linear-gradient(180deg, #F8FAFC, #FFFFFF);
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 10px 20px rgba(16, 24, 40, 0.06);
                border: 1px solid #EEF2F7;
              ">
                <div style="display: flex; flex-direction: column; gap: 24px;">
                  
                  <!-- Header Section -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; gap: 16px; align-items: center;">
                      <div style="
                        width: 56px;
                        height: 56px;
                        border-radius: 14px;
                        background-color: ${
                          data.active || data.status === "active"
                            ? "#E3F5E1"
                            : "#FFF4E4"
                        };
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
                      ">
                        <span class="dashicons ${
                          data.active || data.status === "active"
                            ? "dashicons-yes-alt"
                            : "dashicons-info"
                        }" 
                              style="color: ${
                                data.active || data.status === "active"
                                  ? "#16A34A"
                                  : "#D97706"
                              }; font-size: 24px;"></span>
                      </div>
                      <div>
                        <h2 style="margin: 0 0 4px; font-size: 28px; font-weight: 700; color: #1f2937;">
                          ${data.name || "Website"}
                        </h2>
                        <a href="${
                          data.domain || "#"
                        }" target="_blank" style="color: #6b7280; text-decoration: none; font-size: 14px;">
                          ${data.domain || ""}
                        </a>
                      </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; align-items: center;">
                      <!-- Status Badge -->
                      <div style="
                        background-color: ${
                          data.active || data.status === "active"
                            ? "#E3F5E1"
                            : "#FFF4E4"
                        };
                        padding: 6px 14px;
                        border-radius: 9999px;
                        border: 1px solid #D1D5DB;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                      ">
                        <div style="
                          width: 8px;
                          height: 8px;
                          border-radius: 50%;
                          background-color: ${
                            data.active || data.status === "active"
                              ? "#16A34A"
                              : "#D97706"
                          };
                          box-shadow: 0 0 0 3px rgba(22,163,74,0.15);
                        "></div>
                        <span style="
                          font-size: 12px;
                          font-weight: 600;
                          color: ${
                            data.active || data.status === "active"
                              ? "#065F46"
                              : "#92400E"
                          };
                        ">
                          ${
                            data.active || data.status === "active"
                              ? "Active"
                              : "Inactive"
                          }
                        </span>
                      </div>
                      
                      <!-- Action Button -->
                      <button class="button toggle-status-btn" 
                              data-website-id="${data.id || ""}"
                              style="
                                background: ${
                                  data.active || data.status === "active"
                                    ? "#ef4444"
                                    : "#10b981"
                                };
                                border-color: ${
                                  data.active || data.status === "active"
                                    ? "#ef4444"
                                    : "#10b981"
                                };
                                color: white;
                              ">
                        ${
                          data.active || data.status === "active"
                            ? "Deactivate"
                            : "Activate"
                        }
                      </button>
                    </div>
                  </div>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">

                  <!-- AI Features Section -->
                  <div style="
                    background: #FFFFFF;
                    border-radius: 12px;
                    padding: 16px;
                    border: 1px solid #EEF2F7;
                  ">
                    <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #374151;">AI Features</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      
                      <!-- Voice AI -->
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                          <div style="
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            background-color: #EDE9FE;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          ">
                            <span class="dashicons dashicons-microphone" style="color: #8b5cf6; font-size: 16px;"></span>
                          </div>
                          <div>
                            <div style="font-size: 14px; font-weight: 600; color: #374151;">Voice AI</div>
                            <div style="font-size: 12px; color: #6b7280;">Voice-based interactions</div>
                          </div>
                        </div>
                        <!-- Voice AI Toggle Switch -->
                        <label class="ai-toggle-switch" data-feature="voice" style="
                          position: relative;
                          display: inline-block;
                          width: 44px;
                          height: 24px;
                          cursor: pointer;
                        ">
                          <input type="checkbox" ${
                            data.showVoiceAI ? "checked" : ""
                          } style="
                            opacity: 0;
                            width: 0;
                            height: 0;
                          ">
                          <span class="toggle-slider" style="
                            position: absolute;
                            cursor: pointer;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background-color: ${
                              data.showVoiceAI ? "#8B5CF6" : "#CBD5E1"
                            };
                            transition: 0.3s;
                            border-radius: 24px;
                          ">
                            <span class="toggle-dot" style="
                              position: absolute;
                              content: '';
                              height: 18px;
                              width: 18px;
                              left: ${data.showVoiceAI ? "23px" : "3px"};
                              bottom: 3px;
                              background-color: white;
                              transition: 0.3s;
                              border-radius: 50%;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            "></span>
                          </span>
                        </label>
                      </div>

                      <!-- Text AI -->
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 8px; align-items: center;">
                          <div style="
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            background-color: #EDE9FE;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          ">
                            <span class="dashicons dashicons-format-chat" style="color: #8b5cf6; font-size: 16px;"></span>
                          </div>
                          <div>
                            <div style="font-size: 14px; font-weight: 600; color: #374151;">Text AI</div>
                            <div style="font-size: 12px; color: #6b7280;">Text-based chat</div>
                          </div>
                        </div>
                        <!-- Text AI Toggle Switch -->
                        <label class="ai-toggle-switch" data-feature="text" style="
                          position: relative;
                          display: inline-block;
                          width: 44px;
                          height: 24px;
                          cursor: pointer;
                        ">
                          <input type="checkbox" ${
                            data.showTextAI ? "checked" : ""
                          } style="
                            opacity: 0;
                            width: 0;
                            height: 0;
                          ">
                          <span class="toggle-slider" style="
                            position: absolute;
                            cursor: pointer;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background-color: ${
                              data.showTextAI ? "#8B5CF6" : "#CBD5E1"
                            };
                            transition: 0.3s;
                            border-radius: 24px;
                          ">
                            <span class="toggle-dot" style="
                              position: absolute;
                              content: '';
                              height: 18px;
                              width: 18px;
                              left: ${data.showTextAI ? "23px" : "3px"};
                              bottom: 3px;
                              background-color: white;
                              transition: 0.3s;
                              border-radius: 50%;
                              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                            "></span>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- Quick Stats Grid -->
                  <div style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 16px;
                  ">
                    <!-- Status Tile -->
                    <div style="
                      background-color: ${
                        data.active || data.status === "active"
                          ? "#E8F5E9"
                          : "#FFF4E4"
                      };
                      border-radius: 12px;
                      padding: 16px;
                      transition: transform 0.15s ease, box-shadow 0.15s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.08)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                      <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="
                          width: 40px;
                          height: 40px;
                          border-radius: 10px;
                          background-color: white;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                        ">
                          <span class="dashicons ${
                            data.active || data.status === "active"
                              ? "dashicons-yes-alt"
                              : "dashicons-info"
                          }" 
                                style="color: #374151; font-size: 18px;"></span>
                        </div>
                        <div>
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Status</div>
                          <div style="font-size: 18px; font-weight: 600; color: #111827;">
                            ${
                              data.active || data.status === "active"
                                ? "Active"
                                : "Inactive"
                            }
                          </div>
                          <div style="font-size: 12px; color: #6b7280;">
                            ${
                              data.active || data.status === "active"
                                ? "Live"
                                : "Requires activation"
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Plan Type Tile -->
                    <div style="
                      background-color: #EEF6FF;
                      border-radius: 12px;
                      padding: 16px;
                      transition: transform 0.15s ease, box-shadow 0.15s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.08)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                      <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="
                          width: 40px;
                          height: 40px;
                          border-radius: 10px;
                          background-color: white;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                        ">
                          <span class="dashicons dashicons-chart-pie" style="color: #374151; font-size: 18px;"></span>
                        </div>
                        <div>
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Status</div>
                          <div style="font-size: 18px; font-weight: 600; color: #111827;">
                            Active
                          </div>
                          <div style="font-size: 12px; color: #6b7280;">
                            Full features enabled
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Monthly Queries Tile -->
                    <div style="
                      background-color: #F3E8FF;
                      border-radius: 12px;
                      padding: 16px;
                      transition: transform 0.15s ease, box-shadow 0.15s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.08)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                      <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="
                          width: 40px;
                          height: 40px;
                          border-radius: 10px;
                          background-color: white;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                        ">
                          <span class="dashicons dashicons-format-chat" style="color: #374151; font-size: 18px;"></span>
                        </div>
                        <div>
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Monthly Queries</div>
                          <div style="font-size: 18px; font-weight: 600; color: #111827;">
                            ${data.monthlyQueries || 0}
                          </div>
                          <div style="font-size: 12px; color: #6b7280;">
                            / Unlimited
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Last Synced Tile -->
                    <div style="
                      background-color: ${
                        data.lastSyncedAt ? "#E8F5E9" : "#FFF4E4"
                      };
                      border-radius: 12px;
                      padding: 16px;
                      transition: transform 0.15s ease, box-shadow 0.15s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.08)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                      <div style="display: flex; gap: 12px; align-items: center;">
                        <div style="
                          width: 40px;
                          height: 40px;
                          border-radius: 10px;
                          background-color: white;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                        ">
                          <span class="dashicons dashicons-calendar-alt" style="color: #374151; font-size: 18px;"></span>
                        </div>
                        <div>
                          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">Last Synced</div>
                          <div style="font-size: 18px; font-weight: 600; color: #111827;">
                            ${
                              data.lastSyncedAt
                                ? new Date(
                                    data.lastSyncedAt
                                  ).toLocaleDateString()
                                : "Never"
                            }
                          </div>
                          <div style="font-size: 12px; color: #6b7280;">
                            ${data.lastSyncedAt ? "Up to date" : "Never synced"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sync Status Section -->
              ${
                !data.lastSyncedAt
                  ? `
                <!-- Never Synced - Show Prominent Sync Button -->
                <div style="
                  background: white;
                  border-radius: 12px;
                  padding: 32px 24px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  text-align: center;
                ">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                    <div style="
                      width: 80px;
                      height: 80px;
                      border-radius: 50%;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                    ">
                      <span class="dashicons dashicons-cloud-upload" style="color: white; font-size: 32px;"></span>
                    </div>
                    <div>
                      <h3 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1f2937;">
                        Ready to Get Started?
                      </h3>
                      <p style="margin: 0; color: #6b7280; font-size: 16px; max-width: 400px;">
                        Sync your website content to activate your AI assistant and start helping customers
                      </p>
                    </div>
                    <button id="prominent-sync-button" class="button button-primary" style="
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      border: none;
                      color: white;
                      font-size: 16px;
                      font-weight: 600;
                      padding: 14px 32px;
                      height: auto;
                      border-radius: 8px;
                      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                      display: inline-flex;
                      align-items: center;
                      gap: 8px;
                      transition: all 0.2s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.4)';" 
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)';">
                      <span class="dashicons dashicons-update" style="font-size: 18px;"></span>
                      Sync Website Content Now
                    </button>
                  </div>
                </div>
              `
                  : `
                <!-- Already Synced - Show Modern Sync Status -->
                <div style="
                  background: white;
                  border-radius: 12px;
                  padding: 24px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                ">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 16px; align-items: center;">
                      <div style="
                        width: 48px;
                        height: 48px;
                        border-radius: 10px;
                        background-color: #E8F5E9;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      ">
                        <span class="dashicons dashicons-yes-alt" style="color: #16A34A; font-size: 20px;"></span>
                      </div>
                      <div>
                        <h3 style="margin: 0 0 4px; font-size: 18px; font-weight: 600; color: #1f2937;">
                          Website synced and ready
                        </h3>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                          Last synced: ${new Date(
                            data.lastSyncedAt
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button id="regular-sync-button" class="button button-secondary" style="
                      display: inline-flex;
                      align-items: center;
                      gap: 8px;
                      padding: 8px 16px;
                      border-radius: 8px;
                      font-weight: 500;
                    ">
                      <span class="dashicons dashicons-update" style="font-size: 16px;"></span>
                      Re-sync Content
                    </button>
                  </div>
                </div>
                
                <!-- Content Overview Section -->
                ${
                  data.lastSyncedAt
                    ? `
                <div id="content-overview-section" style="
                  background: white;
                  border-radius: 12px;
                  padding: 24px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  margin-top: 20px;
                ">
                  <h3 style="
                    margin: 0 0 20px;
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                  ">
                    <span class="dashicons dashicons-admin-page" style="color: #667eea; font-size: 20px;"></span>
                    Content Overview
                  </h3>
                  <div id="content-overview-grid" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                  ">
                    <!-- Content cards will be populated here -->
                  </div>
                  
                  <!-- Detailed Content View -->
                  <div id="content-detailed-view" style="
                    margin-top: 24px;
                    display: none;
                  ">
                    <!-- Tabs for switching between content types -->
                    <div id="content-tabs" style="
                      display: flex;
                      border-bottom: 2px solid #e5e7eb;
                      margin-bottom: 20px;
                    ">
                      <!-- Tabs will be populated here -->
                    </div>
                    
                    <!-- Content list area -->
                    <div id="content-list-area" style="
                      background: #f9fafb;
                      border-radius: 8px;
                      padding: 20px;
                      min-height: 300px;
                    ">
                      <!-- Content lists will be populated here -->
                    </div>
                    
                    <!-- Close button -->
                    <div style="text-align: center; margin-top: 16px;">
                      <button id="close-detailed-view" class="button button-secondary" style="
                        padding: 8px 16px;
                        border-radius: 6px;
                      ">
                        <span class="dashicons dashicons-no-alt" style="font-size: 16px; margin-right: 4px;"></span>
                        Close Detailed View
                      </button>
                    </div>
                  </div>
                </div>
                `
                    : ""
                }
              `
              }


            </div>
            
            <!-- AI Overview Section - Will be populated by fetchDetailedWebsiteData -->
            <div id="ai-overview-placeholder"></div>

          </div>
        `;

        // Insert the modern HTML

        // Add hidden sync form for compatibility
        html += `
          <!-- Hidden sync form for legacy compatibility -->
          <form method="post" action="javascript:void(0);" id="sync-form" style="display: none;" onsubmit="return false;">
            <div id="sync-status"></div>
          </form>
        `;

        // Insert the HTML
        $container.html(html);

        // Set up modern content tab functionality
        setupModernContentTabs();

        // Add sync button handlers for the new buttons
        $("#sync-content-btn, #prominent-sync-button, #regular-sync-button")
          .off("click")
          .on("click", function (e) {
            e.preventDefault();
            e.stopPropagation();

            // Start the sync process directly
            startModernSyncProcess();
          });

        // Skip detailed data fetch - we already have WordPress content from initial response
        // The voicero_get_info call now includes all WordPress content we need
        console.log(
          "Using WordPress content from initial response, skipping external API call"
        );
      })
      .catch(function (error) {
        console.error("Error loading website info:", error);

        // Reset loading state
        isDataLoading = false;

        // Check if this is a network/timeout error
        var isNetworkError =
          error.message &&
          (error.message.includes("Connection failed") ||
            error.message.includes("cURL error") ||
            error.message.includes("Operation timed out") ||
            error.message.includes("Request timed out"));

        var errorMessage = isNetworkError
          ? "Unable to connect to Voicero servers. This may be due to network connectivity issues or server maintenance."
          : error.message || "An unknown error occurred";

        $container.html(`
          <div class="wrap" style="max-width: 100%; padding: 0; margin: 0;">
            <h2 class="wp-heading-inline" style="margin-top: 0;">Dashboard</h2>
            <p class="description">Manage your AI-powered shopping assistant</p>
            
            <!-- Error State Card -->
            <div style="
              background: white;
              border-radius: 12px;
              padding: 40px 24px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              text-align: center;
              margin-top: 20px;
              border-left: 4px solid #dc3545;
            ">
              <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                <div style="
                  width: 64px;
                  height: 64px;
                  border-radius: 50%;
                  background-color: #f8d7da;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <span class="dashicons dashicons-warning" style="color: #721c24; font-size: 24px;"></span>
                </div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #721c24;">
                  Connection Error
                </h3>
                <p style="margin: 0; color: #666; font-size: 14px; max-width: 500px; line-height: 1.5;">
                  ${errorMessage}
                </p>
                ${
                  isNetworkError
                    ? `
                  <div style="
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 16px;
                    max-width: 500px;
                  ">
                    <h4 style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #856404;">
                      Troubleshooting Steps:
                    </h4>
                    <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 13px; text-align: left;">
                      <li>Check your internet connection</li>
                      <li>Ensure your server can make outbound HTTPS requests</li>
                      <li>Verify firewall settings allow connections to external APIs</li>
                      <li>Try refreshing the page in a few minutes</li>
                    </ul>
                  </div>
                `
                    : ""
                }
                <button class="button button-primary" onclick="window.location.reload()" style="
                  margin-top: 16px;
                  padding: 8px 20px;
                ">
                  <span class="dashicons dashicons-update" style="margin-right: 5px;"></span>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        `);
      });
  }

  // Function to fetch detailed website data
  function fetchDetailedWebsiteData(websiteId) {
    if (!websiteId) {
      console.error("No website ID provided for detailed data fetch");
      return;
    }

    // Use the existing AJAX endpoint instead of REST API
    $.ajax({
      url: voiceroAdminConfig.ajaxUrl,
      method: "POST",
      data: {
        action: "voicero_websites_get",
        nonce: voiceroAdminConfig.nonce,
        id: websiteId,
      },
      timeout: 120000, // 2 minutes timeout to match PHP timeout
    })
      .done(function (response) {
        // Process websites/get response directly (no more contacts calls)
        if (response.success && response.data) {
          // Store the detailed response in a global variable that chatbot.js can access
          window.voiceroDetailedWebsiteResponse = response;

          // Directly call the chatbot's update function if it exists
          if (typeof window.voiceroUpdateChatbotSettings === "function") {
            window.voiceroUpdateChatbotSettings(response.data);
          }

          // Console log the websites/get response for debugging
          console.log("=== DETAILED WEBSITE DATA ===");
          console.log("Full detailed response:", response.data);
          if (response.data.content) {
            console.log("Detailed content:", response.data.content);
            console.log(
              "Detailed Posts:",
              response.data.content.posts?.length || 0
            );
            console.log(
              "Detailed Pages:",
              response.data.content.pages?.length || 0
            );
            console.log(
              "Detailed Products:",
              response.data.content.products?.length || 0
            );
            console.log(
              "Detailed Blog Posts:",
              response.data.content.blogPosts?.length || 0
            );
          }
          console.log("=== END DETAILED DATA ===");

          updateContentDisplay(response.data);

          // Update AI Overview section with the detailed data
          updateAIOverviewSection(response.data);
        }
      })
      .fail(function (error) {
        console.error("Failed to fetch detailed website data:", error);
      });
  }

  // Function to update content displays with detailed data
  function updateContentDisplay(detailedData) {
    if (!detailedData || !detailedData.content) return;

    var content = detailedData.content;

    // ONLY update the numbers - DO NOT rebuild the entire content overview
    // Only update if the count elements exist (meaning the template loaded properly)
    if ($(".products-count").length > 0) {
      $(".products-count").html(`
        <div style="font-size: 28px; font-weight: 700; color: #111827;">
          ${content.products?.length || 0}
        </div>
      `);
    }

    if ($(".pages-count").length > 0) {
      $(".pages-count").html(`
        <div style="font-size: 28px; font-weight: 700; color: #111827;">
          ${content.pages?.length || 0}
        </div>
      `);
    }

    if ($(".posts-count").length > 0) {
      $(".posts-count").html(`
        <div style="font-size: 28px; font-weight: 700; color: #111827;">
          ${content.blogPosts?.length || 0}
        </div>
      `);
    }

    // Update unread messages count if available
    if (detailedData.unreadMessages !== undefined) {
      var unreadCount = detailedData.unreadMessages;
      var messageText =
        unreadCount === 1 ? "unread message" : "unread messages";
      $(".unread-messages-badge").text(`${unreadCount} ${messageText}`);
    }

    // Store content data for detailed view access
    storeContentData(content);

    // Update Content Overview Grid
    updateContentOverviewGrid(content);

    // Update Products section with modern design
    if (content.products && content.products.length > 0) {
      let productsHtml = `
        <div style="
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          align-items: start;
        ">
      `;

      content.products.forEach((product) => {
        // Truncate description to make it readable
        var shortDesc = product.description
          ? product.description.length > 150
            ? product.description.substring(0, 150) + "..."
            : product.description
          : "No description available";

        productsHtml += `
          <div style="
            background: linear-gradient(180deg, #FFFFFF, #F9FAFB);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #EEF2F7;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.06)';" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: #EEF6FF;
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <span class="dashicons dashicons-cart" style="color: #2563eb; font-size: 18px;"></span>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1f2937; word-wrap: break-word;">
                    ${product.title || "Untitled Product"}
                  </h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5; word-wrap: break-word;">
                    ${shortDesc}
                  </p>
                </div>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap; min-width: 0;">
                  ${
                    product.handle
                      ? `
                    <span style="
                      background: #F3F4F6;
                      color: #374151;
                      padding: 4px 8px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 500;
                    ">${product.handle}</span>
                  `
                      : ""
                  }
                </div>
                ${
                  product.url
                    ? `
                  <a href="${product.url}" target="_blank" class="button button-small" style="
                    background: #2563eb;
                    color: white;
                    border-color: #2563eb;
                    text-decoration: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    flex-shrink: 0;
                  ">View</a>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      });

      productsHtml += `</div>`;
      $("#products-content").html(productsHtml);

      // Update product count in tab
      $('.content-tab[data-content-type="products"] div:last-child').text(
        content.products.length
      );
    } else {
      $("#products-content").html(`
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #F9FAFB;
          border-radius: 12px;
          gap: 16px;
        ">
          <span class="dashicons dashicons-cart" style="font-size: 48px; color: #9ca3af;"></span>
          <p style="margin: 0; color: #6b7280; font-size: 16px;">No products found</p>
        </div>
      `);
    }

    // Update Pages section with modern design
    if (content.pages && content.pages.length > 0) {
      let pagesHtml = `
        <div style="
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          align-items: start;
        ">
      `;

      content.pages.forEach((page) => {
        // Extract a short description from content
        var shortContent = page.content
          ? page.content.length > 150
            ? page.content.substring(0, 150) + "..."
            : page.content
          : "No content available";

        pagesHtml += `
          <div style="
            background: linear-gradient(180deg, #FFFFFF, #F9FAFB);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #EEF2F7;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.06)';" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: #E8F5E9;
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <span class="dashicons dashicons-admin-page" style="color: #16a34a; font-size: 18px;"></span>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1f2937; word-wrap: break-word;">
                    ${page.title || "Untitled Page"}
                  </h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5; word-wrap: break-word;">
                    ${shortContent}
                  </p>
                </div>
              </div>
              
              <div style="display: flex; justify-content: flex-end; align-items: center;">
                ${
                  page.url
                    ? `
                  <a href="${page.url}" target="_blank" class="button button-small" style="
                    background: #16a34a;
                    color: white;
                    border-color: #16a34a;
                    text-decoration: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                  ">View</a>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      });

      pagesHtml += `</div>`;
      $("#pages-content").html(pagesHtml);

      // Update page count in tab
      $('.content-tab[data-content-type="pages"] div:last-child').text(
        content.pages.length
      );
    } else {
      $("#pages-content").html(`
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #F9FAFB;
          border-radius: 12px;
          gap: 16px;
        ">
          <span class="dashicons dashicons-admin-page" style="font-size: 48px; color: #9ca3af;"></span>
          <p style="margin: 0; color: #6b7280; font-size: 16px;">No pages found</p>
        </div>
      `);
    }

    // Update Blog Posts section with modern design
    if (content.blogPosts && content.blogPosts.length > 0) {
      let postsHtml = `
        <div style="
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        ">
      `;

      content.blogPosts.forEach((post) => {
        // Extract a short description from content
        var shortContent = post.content
          ? post.content.length > 150
            ? post.content.substring(0, 150) + "..."
            : post.content
          : "No content available";

        postsHtml += `
          <div style="
            background: linear-gradient(180deg, #FFFFFF, #F9FAFB);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #EEF2F7;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 8px 16px rgba(16,24,40,0.06)';" 
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <div style="
                  width: 40px;
                  height: 40px;
                  background: #FEF3C7;
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                ">
                  <span class="dashicons dashicons-admin-post" style="color: #d97706; font-size: 18px;"></span>
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h4 style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #1f2937; word-wrap: break-word;">
                    ${post.title || "Untitled Post"}
                  </h4>
                  <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.5; word-wrap: break-word;">
                    ${shortContent}
                  </p>
                </div>
              </div>
              
              <div style="display: flex; justify-content: flex-end; align-items: center;">
                ${
                  post.url
                    ? `
                  <a href="${post.url}" target="_blank" class="button button-small" style="
                    background: #d97706;
                    color: white;
                    border-color: #d97706;
                    text-decoration: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                  ">View</a>
                `
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      });

      postsHtml += `</div>`;
      $("#posts-content").html(postsHtml);

      // Update posts count in tab
      $('.content-tab[data-content-type="posts"] div:last-child').text(
        content.blogPosts.length
      );
    } else {
      $("#posts-content").html(`
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #F9FAFB;
          border-radius: 12px;
          gap: 16px;
        ">
          <span class="dashicons dashicons-admin-post" style="font-size: 48px; color: #9ca3af;"></span>
          <p style="margin: 0; color: #6b7280; font-size: 16px;">No blog posts found</p>
        </div>
      `);
    }

    // Update other stats from the data
    if (detailedData.stats) {
      // Update statistics
      if (detailedData.stats.totalRedirects !== undefined) {
        $(".analytics-redirects").text(detailedData.stats.totalRedirects);
      }

      if (detailedData.stats.redirectRate !== undefined) {
        $(".analytics-redirect-rate").text(
          Math.ceil(detailedData.stats.redirectRate) + "%"
        );
      }

      if (detailedData.stats.totalTextChats !== undefined) {
        $(".analytics-text-chats").text(detailedData.stats.totalTextChats);
      }

      if (detailedData.stats.totalVoiceChats !== undefined) {
        $(".analytics-voice-chats").text(detailedData.stats.totalVoiceChats);
      }

      // Action statistics
      if (detailedData.stats.aiRedirects !== undefined) {
        $(".action-redirects").text(detailedData.stats.aiRedirects);
      }

      if (detailedData.stats.aiPurchases !== undefined) {
        $(".action-purchases").text(detailedData.stats.aiPurchases);
      }

      if (detailedData.stats.aiClicks !== undefined) {
        $(".action-clicks").text(detailedData.stats.aiClicks);
      }

      if (detailedData.stats.aiScrolls !== undefined) {
        $(".action-scrolls").text(detailedData.stats.aiScrolls);
      }
    }
  }

  // Function to start modern sync process with training banner
  function startModernSyncProcess() {
    // Initialize training status
    trainingStatus = "processing";
    updateTrainingProgress(10, "processing", "Collecting WordPress content...");

    // Disable sync buttons
    $("#sync-content-btn, #prominent-sync-button, #regular-sync-button").prop(
      "disabled",
      true
    );

    function updateProgress(percentage, text, isError = false) {
      // Update the modern training banner
      updateTrainingProgress(
        percentage,
        isError ? "error" : "processing",
        text
      );
    }

    try {
      // Step 1: Get data from WordPress and sync to localhost:3001/api/wordpress/sync
      console.log("=== STARTING SYNC PROCESS ===");
      console.log(
        "Calling voicero_sync_content action (will hit localhost:3001/api/wordpress/sync)..."
      );

      $.post(voiceroAdminConfig.ajaxUrl, {
        action: "voicero_sync_content",
        nonce: voiceroAdminConfig.nonce,
      })
        .then(function (response) {
          console.log("=== SYNC RESPONSE ===");
          console.log("=== SYNC API RESPONSE ===");
          console.log("Sync response:", response);

          // Log the EXACT body sent to localhost:3001/api/wordpress/sync
          console.log(
            "=== EXACT BODY SENT TO localhost:3001/api/wordpress/sync ==="
          );
          if (response.data && response.data.sentToAPI) {
            console.log(
              "FULL JSON BODY:",
              JSON.stringify(response.data.sentToAPI, null, 2)
            );
            console.log(
              "Products sent:",
              response.data.sentToAPI.products?.length || 0
            );
            console.log(
              "Posts sent:",
              response.data.sentToAPI.posts?.length || 0
            );
            console.log(
              "Pages sent:",
              response.data.sentToAPI.pages?.length || 0
            );
          }
          console.log("=== END EXACT BODY ===");

          if (!response.success)
            throw new Error(response.data.message || "Sync failed");

          console.log("Sync successful, proceeding to vectorization...");
          updateProgress(33, "⏳ Vectorizing content...");

          // Step 2: Call localhost:3001/api/wordpress/vectorize
          console.log(
            "Calling voicero_vectorize_content action (will hit localhost:3001/api/wordpress/vectorize)..."
          );
          return $.post(voiceroAdminConfig.ajaxUrl, {
            action: "voicero_vectorize_content",
            nonce: voiceroAdminConfig.nonce,
          });
        })
        .then(function (response) {
          console.log("=== VECTORIZATION RESPONSE ===");
          console.log("Vectorization response:", response);

          if (!response.success)
            throw new Error(response.data.message || "Vectorization failed");

          console.log("Vectorization successful, starting final wait...");
          updateProgress(66, "⏳ Finalizing setup...");

          // Step 3: Wait 30 seconds and then assume it worked
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ success: true, message: "Setup completed" });
            }, 30000); // 30 second wait
          });
        })
        .then(function () {
          // Always assume success after 30 seconds
          updateProgress(100, "✅ Sync completed successfully!");
          updateTrainingProgress(100, "complete", "Ready to activate website!");

          // Show activation option
          setTimeout(() => {
            if (
              confirm(
                "🎉 Sync completed! Would you like to activate your website now?"
              )
            ) {
              // Add ?sync=true to the current URL to activate
              var currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set("sync", "true");
              window.location.href = currentUrl.toString();
            } else {
              // Re-enable sync buttons
              $(
                "#sync-content-btn, #prominent-sync-button, #regular-sync-button"
              ).prop("disabled", false);

              // Refresh to show updated data
              window.location.reload();
            }
          }, 2000);
        })
        .catch(function (error) {
          console.error("Error during sync process:", error);
          var message = error.message || "An unknown error occurred";

          updateProgress(0, `❌ Error: ${message}`, true);
          updateTrainingProgress(0, "error", `Error: ${message}`);

          // Re-enable sync buttons
          $(
            "#sync-content-btn, #prominent-sync-button, #regular-sync-button"
          ).prop("disabled", false);
        });
    } catch (e) {
      updateProgress(
        0,
        `❌ Error: ${e.message || "An unknown error occurred"}`,
        true
      );
      updateTrainingProgress(0, "error", `Error: ${e.message}`);

      // Re-enable sync buttons
      $("#sync-content-btn, #prominent-sync-button, #regular-sync-button").prop(
        "disabled",
        false
      );
    }
  }

  // Function to set up modern content tabs with updated styling
  function setupModernContentTabs() {
    // Remove any existing handlers
    $(document).off("click", ".content-tab");

    // Add modern tab functionality
    $(document).on("click", ".content-tab", function () {
      // Remove active class and styling from all tabs
      $(".content-tab").removeClass("active").css({
        background: "#F9FAFB",
        border: "1px solid transparent",
      });

      // Add active class and styling to clicked tab
      $(this).addClass("active").css({
        background: "#EEF6FF",
        border: "1px solid #B3D7FF",
      });

      // Hide all content sections with fade effect
      $(".content-section").fadeOut(200);

      // Show the corresponding content section
      var contentType = $(this).data("content-type");
      $("#" + contentType + "-content")
        .delay(200)
        .fadeIn(300);
    });
  }

  // Load website info when page loads
  loadWebsiteInfo();

  // Update the click handler for toggle status button
  $(document).on("click", ".toggle-status-btn", function () {
    var websiteId = $(this).data("website-id");
    var $button = $(this);

    if (!websiteId) {
      alert("Could not identify website. Please try refreshing the page.");
      return;
    }

    // Disable button during request
    $button.prop("disabled", true);

    // Use WordPress REST API proxy endpoint instead of direct API call
    // Get the site URL root (remove admin-ajax.php path to get the WordPress site root)
    var siteUrlBase = new URL(voiceroConfig.ajaxUrl).origin;

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
        if (data.error) {
          throw new Error(data.error);
        }
        // Refresh the page to show updated status
        window.location.reload();
      })
      .catch((error) => {
        alert(
          "Failed to toggle website status: " +
            error.message +
            ". Please try again."
        );
      })
      .finally(() => {
        $button.prop("disabled", false);
      });
  });

  // Add script to detect nav height and position button
  function updateNavbarPositioning() {
    // Find the navigation element - checking common WordPress nav classes/IDs
    var nav = document.querySelector(
      "header, " + // Try header first
        "#masthead, " + // Common WordPress header ID
        ".site-header, " + // Common header class
        "nav.navbar, " + // Bootstrap navbar
        "nav.main-navigation, " + // Common nav classes
        ".nav-primary, " +
        "#site-navigation, " +
        ".site-navigation"
    );

    if (nav) {
      var navRect = nav.getBoundingClientRect();
      var navBottom = Math.max(navRect.bottom, 32); // Minimum 32px from top

      // Set the custom property for positioning
      document.documentElement.style.setProperty(
        "--nav-bottom",
        navBottom + "px"
      );
    }
  }

  // Run on load
  updateNavbarPositioning();

  // Run on resize
  window.addEventListener("resize", updateNavbarPositioning);

  // Run after a short delay to catch any dynamic header changes
  setTimeout(updateNavbarPositioning, 500);

  // Function to handle content type section toggling
  $(document).on("click", ".content-type-header", function () {
    $(this).next(".content-type-items").slideToggle();
    $(this)
      .find(".toggle-icon")
      .toggleClass("dashicons-arrow-down dashicons-arrow-up");
  });

  // Function to display content statistics with expandable sections
  function displayContentStatistics(detailedData) {
    var $container = $("#website-detailed-info");

    // Add section after the analytics cards
    let contentHtml = `
      <div class="card" style="margin-top: 20px; background: white; border-radius: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="padding: 15px 20px; border-bottom: 1px solid #eee;">
          <h3 style="margin: 0; font-size: 16px;">Content Statistics</h3>
          <p style="margin: 5px 0 0; color: #666; font-size: 13px;">Click on a content type to view details</p>
        </div>
        <div style="padding: 20px;">
    `;

    // Pages section
    if (
      detailedData.content &&
      detailedData.content.pages &&
      detailedData.content.pages.length > 0
    ) {
      var pages = detailedData.content.pages;
      contentHtml += `
        <div class="content-type-section" style="margin-bottom: 15px;">
          <div class="content-type-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f0f0f1; cursor: pointer; border-radius: 4px;">
            <h4 style="margin: 0; font-size: 15px;">Pages (${pages.length})</h4>
            <span class="toggle-icon dashicons dashicons-arrow-down"></span>
          </div>
          <div class="content-type-items" style="display: none; padding: 10px; border: 1px solid #eee; border-top: none; margin-bottom: 10px;">
            <table class="widefat" style="border: none;">
              <thead>
                <tr>
                  <th style="width: 60%;">Title</th>
                  <th style="width: 20%;">URL</th>
                  <th style="width: 20%;">Redirects</th>
                </tr>
              </thead>
              <tbody>
      `;

      pages.forEach((page) => {
        contentHtml += `
          <tr>
            <td>${page.title || "Untitled"}</td>
            <td><a href="${
              page.url
            }" target="_blank" class="button button-small">View</a></td>
            <td>${page.aiRedirects || 0}</td>
          </tr>
        `;
      });

      contentHtml += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Products section
    if (
      detailedData.content &&
      detailedData.content.products &&
      detailedData.content.products.length > 0
    ) {
      var products = detailedData.content.products;
      contentHtml += `
        <div class="content-type-section" style="margin-bottom: 15px;">
          <div class="content-type-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f0f0f1; cursor: pointer; border-radius: 4px;">
            <h4 style="margin: 0; font-size: 15px;">Products (${products.length})</h4>
            <span class="toggle-icon dashicons dashicons-arrow-down"></span>
          </div>
          <div class="content-type-items" style="display: none; padding: 10px; border: 1px solid #eee; border-top: none; margin-bottom: 10px;">
            <table class="widefat" style="border: none;">
              <thead>
                <tr>
                  <th style="width: 40%;">Title</th>
                  <th style="width: 40%;">Description</th>
                  <th style="width: 10%;">URL</th>
                  <th style="width: 10%;">Redirects</th>
                </tr>
              </thead>
              <tbody>
      `;

      products.forEach((product) => {
        // Truncate description to 100 characters
        var shortDesc = product.description
          ? product.description.length > 100
            ? product.description.substring(0, 100) + "..."
            : product.description
          : "";

        contentHtml += `
          <tr>
            <td>${product.title || "Untitled"}</td>
            <td>${shortDesc}</td>
            <td><a href="${
              product.url
            }" target="_blank" class="button button-small">View</a></td>
            <td>${product.aiRedirects || 0}</td>
          </tr>
        `;
      });

      contentHtml += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Blog Posts section
    if (
      detailedData.content &&
      detailedData.content.blogPosts &&
      detailedData.content.blogPosts.length > 0
    ) {
      var posts = detailedData.content.blogPosts;
      contentHtml += `
        <div class="content-type-section" style="margin-bottom: 15px;">
          <div class="content-type-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f0f0f1; cursor: pointer; border-radius: 4px;">
            <h4 style="margin: 0; font-size: 15px;">Blog Posts (${posts.length})</h4>
            <span class="toggle-icon dashicons dashicons-arrow-down"></span>
          </div>
          <div class="content-type-items" style="display: none; padding: 10px; border: 1px solid #eee; border-top: none; margin-bottom: 10px;">
            <table class="widefat" style="border: none;">
              <thead>
                <tr>
                  <th style="width: 50%;">Title</th>
                  <th style="width: 30%;">URL</th>
                  <th style="width: 20%;">Redirects</th>
                </tr>
              </thead>
              <tbody>
      `;

      posts.forEach((post) => {
        contentHtml += `
          <tr>
            <td>${post.title || "Untitled"}</td>
            <td><a href="${
              post.url
            }" target="_blank" class="button button-small">View</a></td>
            <td>${post.aiRedirects || 0}</td>
          </tr>
        `;
      });

      contentHtml += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Collections section
    if (
      detailedData.content &&
      detailedData.content.collections &&
      detailedData.content.collections.length > 0
    ) {
      var collections = detailedData.content.collections;
      contentHtml += `
        <div class="content-type-section" style="margin-bottom: 15px;">
          <div class="content-type-header" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f0f0f1; cursor: pointer; border-radius: 4px;">
            <h4 style="margin: 0; font-size: 15px;">Collections (${collections.length})</h4>
            <span class="toggle-icon dashicons dashicons-arrow-down"></span>
          </div>
          <div class="content-type-items" style="display: none; padding: 10px; border: 1px solid #eee; border-top: none; margin-bottom: 10px;">
            <table class="widefat" style="border: none;">
              <thead>
                <tr>
                  <th style="width: 40%;">Title</th>
                  <th style="width: 40%;">Description</th>
                  <th style="width: 20%;">Redirects</th>
                </tr>
              </thead>
              <tbody>
      `;

      collections.forEach((collection) => {
        var shortDesc = collection.description
          ? collection.description.length > 100
            ? collection.description.substring(0, 100) + "..."
            : collection.description
          : "";

        contentHtml += `
          <tr>
            <td>${collection.title || "Untitled"}</td>
            <td>${shortDesc}</td>
            <td>${collection.aiRedirects || 0}</td>
          </tr>
        `;
      });

      contentHtml += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    contentHtml += `
        </div>
      </div>
    `;

    return contentHtml;
  }

  // Function to update the content overview grid
  function updateContentOverviewGrid(content) {
    const $grid = $("#content-overview-grid");
    if (!$grid.length || !content) return;

    const contentTypes = [
      {
        key: "products",
        label: "Products",
        icon: "dashicons-products",
        color: "#667eea",
        bgColor: "#f0f4ff",
      },
      {
        key: "pages",
        label: "Pages",
        icon: "dashicons-admin-page",
        color: "#16a34a",
        bgColor: "#f0fdf4",
      },
      {
        key: "blogPosts",
        label: "Blog Posts",
        icon: "dashicons-edit",
        color: "#ea580c",
        bgColor: "#fff7ed",
      },
    ];

    let gridHtml = "";

    contentTypes.forEach((type) => {
      const count = content[type.key]?.length || 0;

      gridHtml += `
        <div style="
          background: ${type.bgColor};
          border: 1px solid ${type.color}20;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        " class="content-overview-card" data-content-type="${
          type.key
        }" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
          ">
            <span class="dashicons ${type.icon}" style="
              font-size: 24px;
              color: ${type.color};
              margin-right: 8px;
            "></span>
            <h4 style="
              margin: 0;
              font-size: 16px;
              font-weight: 600;
              color: #1f2937;
            ">${type.label}</h4>
          </div>
          <div style="
            font-size: 32px;
            font-weight: 700;
            color: ${type.color};
            margin-bottom: 4px;
          ">${count}</div>
          <div style="
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Total ${type.label.toLowerCase()}</div>
        </div>
      `;
    });

    $grid.html(gridHtml);

    // Add click handlers to overview cards
    setupContentOverviewClickHandlers();
  }

  // Function to setup click handlers for content overview cards
  function setupContentOverviewClickHandlers() {
    $(document)
      .off("click", ".content-overview-card")
      .on("click", ".content-overview-card", function () {
        const contentType = $(this).data("content-type");
        showContentDetailedView(contentType);
      });

    // Close button handler
    $(document)
      .off("click", "#close-detailed-view")
      .on("click", "#close-detailed-view", function () {
        hideContentDetailedView();
      });
  }

  // Function to show the detailed content view
  function showContentDetailedView(activeType) {
    const $detailedView = $("#content-detailed-view");
    const $tabsContainer = $("#content-tabs");
    const $listArea = $("#content-list-area");

    if (!$detailedView.length) return;

    // Get the current content data
    const currentData = window.currentContentData || {};

    // Create tabs
    createContentTabs($tabsContainer, activeType);

    // Show the detailed view with animation
    $detailedView.slideDown(300);

    // Load the content for the active type
    loadContentList(activeType, currentData);

    // Scroll to the detailed view
    $("html, body").animate(
      {
        scrollTop: $detailedView.offset().top - 50,
      },
      500
    );
  }

  // Function to hide the detailed content view
  function hideContentDetailedView() {
    $("#content-detailed-view").slideUp(300);
  }

  // Function to create content tabs
  function createContentTabs($container, activeType) {
    const contentTypes = [
      { key: "products", label: "Products", icon: "dashicons-products" },
      { key: "pages", label: "Pages", icon: "dashicons-admin-page" },
      { key: "blogPosts", label: "Blog Posts", icon: "dashicons-edit" },
    ];

    let tabsHtml = "";

    contentTypes.forEach((type) => {
      const isActive = type.key === activeType;
      tabsHtml += `
        <button class="content-tab ${
          isActive ? "active" : ""
        }" data-content-type="${type.key}" style="
          background: ${isActive ? "#667eea" : "transparent"};
          color: ${isActive ? "white" : "#6b7280"};
          border: 2px solid ${isActive ? "#667eea" : "transparent"};
          border-radius: 6px 6px 0 0;
          padding: 12px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 4px;
        " onmouseover="if(!this.classList.contains('active')) { this.style.background='#f3f4f6'; this.style.color='#374151'; }" onmouseout="if(!this.classList.contains('active')) { this.style.background='transparent'; this.style.color='#6b7280'; }">
          <span class="dashicons ${type.icon}" style="font-size: 16px;"></span>
          ${type.label}
        </button>
      `;
    });

    $container.html(tabsHtml);

    // Add tab click handlers
    $(".content-tab")
      .off("click")
      .on("click", function () {
        const contentType = $(this).data("content-type");
        const currentData = window.currentContentData || {};

        // Update tab styles
        $(".content-tab").removeClass("active").css({
          background: "transparent",
          color: "#6b7280",
          border: "2px solid transparent",
        });

        $(this).addClass("active").css({
          background: "#667eea",
          color: "white",
          border: "2px solid #667eea",
        });

        // Load content for this tab
        loadContentList(contentType, currentData);
      });
  }

  // Function to load content list based on type
  function loadContentList(contentType, data) {
    const $listArea = $("#content-list-area");
    let listHtml = "";

    const content = data[contentType] || [];

    if (content.length === 0) {
      listHtml = `
        <div style="text-align: center; padding: 40px; color: #6b7280;">
          <span class="dashicons dashicons-info" style="font-size: 48px; margin-bottom: 16px; display: block;"></span>
          <h4 style="margin: 0 0 8px; font-size: 18px;">No ${getContentLabel(
            contentType
          )} Found</h4>
          <p style="margin: 0;">Your website doesn't have any ${getContentLabel(
            contentType
          ).toLowerCase()} yet.</p>
        </div>
      `;
    } else {
      listHtml = `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0; color: #1f2937; font-size: 16px;">
            ${content.length} ${getContentLabel(contentType)} Found
          </h4>
        </div>
        <div style="display: grid; gap: 12px;">
      `;

      content.forEach((item, index) => {
        listHtml += createContentListItem(item, contentType, index);
      });

      listHtml += "</div>";
    }

    $listArea.html(listHtml);
  }

  // Function to create individual content list items
  function createContentListItem(item, contentType, index) {
    let title, subtitle, link, content;

    switch (contentType) {
      case "products":
        title = item.name || "Untitled Product";
        subtitle = item.price ? `$${item.price}` : "No price set";
        link = item.link || "#";
        content =
          item.short_description ||
          item.description ||
          "No description available";
        break;
      case "pages":
        title = item.title || "Untitled Page";
        subtitle = item.slug ? `/${item.slug}` : "No slug";
        link = item.link || "#";
        content = item.contentStripped
          ? item.contentStripped.substring(0, 150) + "..."
          : "No content available";
        break;
      case "blogPosts":
        title = item.title || "Untitled Post";
        subtitle = item.date
          ? new Date(item.date).toLocaleDateString()
          : "No date";
        link = item.link || "#";
        content =
          item.excerpt ||
          (item.contentStripped
            ? item.contentStripped.substring(0, 150) + "..."
            : "No excerpt available");
        break;
      default:
        title = "Unknown Item";
        subtitle = "";
        link = "#";
        content = "";
    }

    return `
      <div style="
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s ease;
      " onmouseover="this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)'; this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 8px;">
          <div style="flex: 1;">
            <h5 style="margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1.4;">
              ${title}
            </h5>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              ${subtitle}
            </p>
          </div>
          ${
            link !== "#"
              ? `
            <a href="${link}" target="_blank" style="
              color: #667eea;
              text-decoration: none;
              font-size: 12px;
              font-weight: 500;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span class="dashicons dashicons-external" style="font-size: 14px;"></span>
              View
            </a>
          `
              : ""
          }
        </div>
        <p style="margin: 0; font-size: 13px; color: #4b5563; line-height: 1.4;">
          ${content}
        </p>
      </div>
    `;
  }

  // Helper function to get content label
  function getContentLabel(contentType) {
    const labels = {
      products: "Products",
      pages: "Pages",
      blogPosts: "Blog Posts",
    };
    return labels[contentType] || "Content";
  }

  // Store content data globally for access in detailed view
  function storeContentData(content) {
    window.currentContentData = content;
  }

  // Function to setup AI toggle switch handlers
  function setupAIToggleHandlers() {
    $(document)
      .off("change", '.ai-toggle-switch input[type="checkbox"]')
      .on("change", '.ai-toggle-switch input[type="checkbox"]', function () {
        const $toggle = $(this);
        const $label = $toggle.closest(".ai-toggle-switch");
        const feature = $label.data("feature");
        const isEnabled = $toggle.is(":checked");

        // Prevent multiple rapid clicks
        if ($label.hasClass("updating")) {
          return;
        }

        $label.addClass("updating");

        // Call the API to toggle the feature
        toggleAIFeature(feature, isEnabled, $label);
      });
  }

  // Function to toggle AI features via API
  function toggleAIFeature(feature, isEnabled, $toggleElement) {
    // Debug: Check if we have proper config
    if (!window.voiceroAdminConfig && !window.voiceroConfig) {
      console.error(
        "Voicero config not found. Available globals:",
        Object.keys(window).filter((k) => k.includes("voicero"))
      );
      showToggleError($toggleElement, "Configuration not loaded properly");
      return;
    }

    // Get access key
    const accessKey =
      $("#voicero-access-key").val() ||
      window.voiceroAdminConfig?.accessKey ||
      window.voiceroConfig?.accessKey;
    if (!accessKey) {
      showToggleError($toggleElement, "No access key configured");
      return;
    }

    // Prepare the data to send
    const toggleData = {
      voiceAI: feature === "voice" ? isEnabled : undefined,
      textAI: feature === "text" ? isEnabled : undefined,
    };

    // Remove undefined values
    Object.keys(toggleData).forEach((key) => {
      if (toggleData[key] === undefined) {
        delete toggleData[key];
      }
    });

    // Debug: Log the AJAX request details
    const ajaxUrl =
      window.voiceroAdminConfig?.ajaxUrl ||
      window.ajaxurl ||
      "/wp-admin/admin-ajax.php";
    const nonce =
      window.voiceroAdminConfig?.nonce || window.voiceroConfig?.nonce;

    console.log("AJAX Request Details:", {
      url: ajaxUrl,
      nonce: nonce ? "Present" : "Missing",
      feature: feature,
      enabled: isEnabled,
      toggleData: toggleData,
    });

    // Make the API call
    $.ajax({
      url: ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_toggle_ai_features",
        nonce: nonce,
        features: toggleData,
      },
      beforeSend: function () {
        // Update the toggle to show loading state
        updateToggleState($toggleElement, isEnabled, true);
      },
      success: function (response) {
        if (response.success) {
          // Update the toggle to reflect the new state
          updateToggleState($toggleElement, isEnabled, false);

          // Show success message
          showNotification("AI feature updated successfully", "success");

          // Update any stored data if needed
          if (response.data && response.data.state) {
            window.currentAIFeatures = response.data.state;

            // Update other toggles if their state changed
            updateOtherToggles(response.data.state);
          }
        } else {
          showToggleError(
            $toggleElement,
            response.data?.message || "Failed to update AI feature"
          );
        }
      },
      error: function (xhr, status, error) {
        showToggleError(
          $toggleElement,
          "Error communicating with server: " + error
        );
      },
      complete: function () {
        $toggleElement.removeClass("updating");
      },
    });
  }

  // Function to update toggle visual state
  function updateToggleState($toggleElement, isEnabled, isLoading = false) {
    const $slider = $toggleElement.find(".toggle-slider");
    const $dot = $toggleElement.find(".toggle-dot");
    const $checkbox = $toggleElement.find('input[type="checkbox"]');

    if (isLoading) {
      // Show loading state
      $slider.css({
        "background-color": "#94A3B8",
        opacity: "0.7",
      });
      $dot.css({
        "background-color": "#E2E8F0",
      });
    } else {
      // Update to final state
      $checkbox.prop("checked", isEnabled);
      $slider.css({
        "background-color": isEnabled ? "#8B5CF6" : "#CBD5E1",
        opacity: "1",
      });
      $dot.css({
        left: isEnabled ? "23px" : "3px",
        "background-color": "white",
      });
    }
  }

  // Function to update other toggles based on server state
  function updateOtherToggles(state) {
    if (!state) return;

    // Update Voice AI toggle if present
    if (typeof state.showVoiceAI !== "undefined") {
      const $voiceToggle = $('.ai-toggle-switch[data-feature="voice"]');
      if ($voiceToggle.length) {
        updateToggleState($voiceToggle, state.showVoiceAI, false);
      }
    }

    // Update Text AI toggle if present
    if (typeof state.showTextAI !== "undefined") {
      const $textToggle = $('.ai-toggle-switch[data-feature="text"]');
      if ($textToggle.length) {
        updateToggleState($textToggle, state.showTextAI, false);
      }
    }
  }

  // Function to show toggle error and revert state
  function showToggleError($toggleElement, message) {
    // Revert the toggle to its previous state
    const $checkbox = $toggleElement.find('input[type="checkbox"]');
    const wasChecked = $checkbox.is(":checked");

    // Revert checkbox state
    $checkbox.prop("checked", !wasChecked);

    // Update visual state to reverted state
    updateToggleState($toggleElement, !wasChecked, false);

    // Show error message
    showNotification(message, "error");
  }

  // Function to show notifications
  function showNotification(message, type = "info") {
    // Create notification element
    const $notification = $("<div>", {
      class: `ai-toggle-notification ${type}`,
      html: `
        <div style="
          position: fixed;
          top: 32px;
          right: 20px;
          background: ${
            type === "error"
              ? "#DC2626"
              : type === "success"
              ? "#059669"
              : "#3B82F6"
          };
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 9999;
          font-size: 14px;
          font-weight: 500;
          max-width: 400px;
          animation: slideIn 0.3s ease-out;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="dashicons ${
              type === "error"
                ? "dashicons-dismiss"
                : type === "success"
                ? "dashicons-yes-alt"
                : "dashicons-info"
            }" style="font-size: 16px;"></span>
            ${message}
          </div>
        </div>
      `,
    });

    // Add to page
    $("body").append($notification);

    // Remove after 3 seconds
    setTimeout(() => {
      $notification.fadeOut(300, function () {
        $(this).remove();
      });
    }, 3000);
  }

  // Add CSS animations for notifications
  const animationCSS = `
    <style id="ai-toggle-animations">
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .ai-toggle-switch:hover .toggle-slider {
        box-shadow: 0 0 1px #8B5CF6;
      }
      
      .ai-toggle-switch.updating .toggle-slider {
        opacity: 0.7;
      }
      
      .ai-toggle-switch.updating .toggle-dot {
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
    </style>
  `;

  // Add the CSS to the page if it doesn't exist
  if (!$("#ai-toggle-animations").length) {
    $("head").append(animationCSS);
  }

  // Initialize toggle handlers when DOM is ready
  $(document).ready(function () {
    setupAIToggleHandlers();
  });
});
