jQuery(document).ready(function ($) {
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

    var syncButton = $("#sync-button");
    var syncStatusContainer = $("#sync-status");

    // Check if plan is inactive
    var plan = $("th:contains('Plan')").next().text().trim();
    if (plan === "Inactive") {
      syncStatusContainer.html(`
        <div class="notice notice-error inline">
          <p>⚠️ Please upgrade to a paid plan to sync content.</p>
        </div>
      `);
      return false;
    }

    // Reset initial state
    syncButton.prop("disabled", true);

    // Create progress bar and status text elements
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

          // Process in batches of 12 items
          const BATCH_SIZE = 12;
          const totalItems = allItems.length;
          const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
          let currentBatch = 0;
          let processedItems = 0;

          function processBatch() {
            currentBatch++;
            const startIndex = (currentBatch - 1) * BATCH_SIZE;
            const endIndex = Math.min(startIndex + BATCH_SIZE, totalItems);
            const batchItems = allItems.slice(startIndex, endIndex);
            const batchSize = batchItems.length;

            // Calculate progress: 50% (setup) + up to 50% for batch processing
            const progress = 50 + ((currentBatch - 1) / totalBatches) * 50;

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

            // Process this batch
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
              const maxAttempts = 30; // Maximum number of attempts (5 minutes with 10-second interval)
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
                      const status = response.data.status;

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
          console.log("Error during sync process:", error);

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
  $(document).on("click", "#sync-button", function (e) {
    e.preventDefault();
    e.stopPropagation();

    // If this is inside a form, submit the form via jQuery instead
    if ($(this).closest("form").length) {
      $(this).closest("form").trigger("submit");
    }

    return false;
  });

  // Function to load website info
  function loadWebsiteInfo() {
    var $container = $("#website-info-container");

    // Add timeout protection
    var timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 10000); // 10 second timeout
    });

    // Show loading state
    $container.html(`
      <div class="spinner is-active" style="float: none;"></div>
      <p>Loading website information...</p>
    `);

    // Race between the actual request and the timeout
    Promise.race([
      new Promise((resolve, reject) => {
        $.post(voiceroAdminConfig.ajaxUrl, {
          action: "voicero_get_info",
          nonce: voiceroAdminConfig.nonce,
        })
          .done(function (response) {
            resolve(response);
          })
          .fail(function (xhr) {
            // If we get a 400 error but still have a readable response, try to parse it
            if (xhr.status === 400 && xhr.responseText) {
              try {
                const data = JSON.parse(xhr.responseText);
                if (data.success === false) {
                  // Check if it's a simple nonce issue - we can retry with a new nonce
                  if (data.data?.message?.includes("Security check")) {
                    // Try to recover silently by getting a new nonce and retrying
                    $.get(window.location.href, function (html) {
                      // Try to extract a new nonce
                      const match = html.match(/nonce":"([^"]+)"/);
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
        // Get detailed website data if we have an ID
        if (data.id) {
          fetchDetailedWebsiteData(data.id);
        }

        // Format last sync date
        let lastSyncDate = "Never";
        if (data.lastSyncDate) {
          var date = new Date(data.lastSyncDate);
          lastSyncDate = date.toLocaleString();
        }

        // Format last training date
        let lastTrainingDate = "Never";
        if (data.lastTrainingDate) {
          var date = new Date(data.lastTrainingDate);
          lastTrainingDate = date.toLocaleString();
        }

        // Format plan details
        var plan = data.plan || "Inactive";
        let queryLimit = 0;
        let isUnlimited = false;

        // Set query limit based on plan type
        switch (plan.toLowerCase()) {
          case "starter":
            queryLimit = 1000;
            break;
          case "enterprise":
            isUnlimited = true;
            queryLimit = Infinity; // For calculation purposes
            break;
          default:
            queryLimit = 0; // Inactive or unknown plan
        }

        var isSubscribed = data.isSubscribed === true;

        // Format website name
        var name = data.name || window.location.hostname;

        // Build HTML for website info using the new dashboard design - fixed full width layout
        let html = `
          <div class="wrap" style="max-width: 100%; padding: 0; margin: 0;">
            <h2 class="wp-heading-inline" style="margin-top: 0;">Dashboard</h2>
            <p class="description">Manage your AI-powered shopping assistant</p>
            
            <div style="text-align: right; margin: 15px 0;">
              <a href="https://www.voicero.ai/app/websites/website?id=${
                data.id || ""
              }" target="_blank" class="button button-primary open-control-panel">
                <span class="dashicons dashicons-external" style="margin-right: 5px;"></span>
                Open Control Panel
              </a>
            </div>
            
            <!-- Customer Contacts -->
            <div class="card" style="margin-bottom: 20px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; box-sizing: border-box;">
              <div style="padding: 16px 20px; border-bottom: 1px solid #eee;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 500;">Customer Contacts</h2>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Messages from your store visitors</p>
              </div>
              <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <div style="background: #fff9c4; color: #806600; border-radius: 20px; padding: 5px 12px; font-size: 13px; font-weight: 500;" class="unread-messages-badge">
                    ${
                      data.unreadMessages !== undefined
                        ? data.unreadMessages
                        : 0
                    } unread message${
          (data.unreadMessages !== undefined ? data.unreadMessages : 0) !== 1
            ? "s"
            : ""
        }
                  </div>
                  <a href="https://www.voicero.ai/app/contacts" class="button button-secondary">
                    <span class="dashicons dashicons-visibility" style="margin-right: 5px;"></span>
                    View Contacts
                  </a>
                </div>
                
                <!-- Contact List -->
                <div style="margin-bottom: 20px;">
                  <div style="display: flex; align-items: center; padding: 15px; border-radius: 6px; background: #f0f6fc; margin-bottom: 15px;">
                    <div style="color: ${
                      data.active ? "#46b450" : "#d63638"
                    }; margin-right: 15px;">
                      <span class="dashicons ${
                        data.active ? "dashicons-yes-alt" : "dashicons-no-alt"
                      }"></span>
                    </div>
                    <div style="flex: 1;">
                      <h3 style="margin: 0 0 5px; font-size: 16px; font-weight: 500;">${name}</h3>
                      <a href="${
                        data.url || "#"
                      }" style="color: #0073aa; text-decoration: none; font-size: 13px;">${
          data.url || "https://" + name
        }</a>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; 
                        background: ${data.active ? "#edf7ed" : "#fbeaea"}; 
                        color: ${data.active ? "#1e7e34" : "#d63638"};
                        border: 1px solid ${
                          data.active ? "#c3e6cb" : "#f5c6cb"
                        };">
                        ${data.active ? "Active" : "Inactive"}
                      </span>
                      <button class="button button-small toggle-status-btn" 
                              data-website-id="${data.id || ""}" 
                              ${!data.lastSyncedAt ? "disabled" : ""}>
                        ${data.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                  
                  <!-- Contact Details -->
                  <div style="margin-top: 20px;">
                    <table class="widefat" style="border: none; box-shadow: none; background: #f9f9f9; width: 100%;">
                      <tr>
                        <th style="width: 30%; text-align: left;">Plan Type</th>
                        <td>${plan}</td>
                      </tr>
                      <tr>
                        <th style="width: 30%; text-align: left;">Monthly Queries</th>
                        <td>${
                          isUnlimited
                            ? `${data.monthlyQueries || 0} / Unlimited`
                            : `${data.monthlyQueries || 0} / ${queryLimit}`
                        }</td>
                      </tr>
                      <tr>
                        <th style="width: 30%; text-align: left;">Last Synced</th>
                        <td>${
                          data.lastSyncedAt
                            ? new Date(data.lastSyncedAt).toLocaleString()
                            : "Never"
                        }</td>
                      </tr>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Conversation Analytics -->
            <div class="card" style="margin-bottom: 20px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; box-sizing: border-box;">
              <div style="padding: 16px 20px; border-bottom: 1px solid #eee;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 500;">Conversation Analytics</h2>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Insights into how customers interact with your AI assistant</p>
              </div>
              <div style="padding: 20px;">
                <div style="text-align: right; margin-bottom: 15px;">
                  <button class="button refresh-data-btn">
                    <span class="dashicons dashicons-update" style="margin-right: 5px;"></span>
                    Refresh Data
                  </button>
                </div>
                
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; margin: 0 -10px;">
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #e3f2fd; color: #0277bd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-randomize"></span>
                    </div>
                    <div class="analytics-redirects" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.stats?.totalRedirects ||
                      data.globalStats?.totalAiRedirects ||
                      0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Total Redirects</div>
                  </div>
                  
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #e8f5e9; color: #2e7d32; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-chart-bar"></span>
                    </div>
                    <div class="analytics-redirect-rate" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.stats?.redirectRate
                        ? Math.ceil(data.stats.redirectRate) + "%"
                        : "0%"
                    }</div>
                    <div style="color: #666; font-size: 13px;">Redirect Rate %</div>
                  </div>
                  
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #f3e5f5; color: #7b1fa2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-format-chat"></span>
                    </div>
                    <div class="analytics-text-chats" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.globalStats?.totalTextChats || 0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Text Chats</div>
                  </div>
                  
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #ede7f6; color: #512da8; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-microphone"></span>
                    </div>
                    <div class="analytics-voice-chats" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.globalStats?.totalVoiceChats || 0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Voice Chats</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Action Statistics -->
            <div class="card" style="margin-bottom: 20px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; box-sizing: border-box;">
              <div style="padding: 16px 20px; border-bottom: 1px solid #eee;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 500;">Action Statistics</h2>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">How customers are interacting with your AI assistant</p>
              </div>
              <div style="padding: 20px;">
                <div style="display: flex; flex-wrap: wrap; justify-content: space-between; margin: 0 -10px;">
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #e3f2fd; color: #0277bd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-randomize"></span>
                    </div>
                    <div class="action-redirects" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.stats?.aiRedirects ||
                      data.globalStats?.totalAiRedirects ||
                      0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Redirects</div>
                  </div>
                  
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #e8f5e9; color: #2e7d32; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-cart"></span>
                    </div>
                    <div class="action-purchases" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.stats?.aiPurchases ||
                      data.globalStats?.totalAiPurchases ||
                      0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Purchases</div>
                  </div>
                  
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #e0f2f1; color: #00796b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-admin-links"></span>
                    </div>
                    <div class="action-clicks" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.stats?.aiClicks ||
                      data.globalStats?.totalAiClicks ||
                      0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Clicks</div>
                  </div>
                  
                  <div style="flex: 1; min-width: 150px; text-align: center; padding: 20px 10px; margin: 0 10px 20px; background: #f9f9f9; border-radius: 8px;">
                    <div style="width: 40px; height: 40px; background: #fff8e1; color: #ff8f00; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                      <span class="dashicons dashicons-editor-alignleft"></span>
                    </div>
                    <div class="action-scrolls" style="font-size: 28px; font-weight: 600; margin-bottom: 5px;">${
                      data.stats?.aiScrolls ||
                      data.globalStats?.totalAiScrolls ||
                      0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Scrolls</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Content Overview -->
            <div class="card" style="margin-bottom: 20px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); width: 100%; box-sizing: border-box;">
              <div style="padding: 16px 20px; border-bottom: 1px solid #eee;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 500;">Content Overview</h2>
                <p style="margin: 4px 0 0; color: #666; font-size: 14px;">Your store's AI-ready content</p>
              </div>
              <div style="padding: 20px;">
                
                
                <!-- Content Type Tabs - Only 3 buttons -->
                <div style="display: flex; flex-wrap: wrap; margin: 0 -10px 20px;">
                  <div class="content-tab active" data-content-type="products" style="flex: 1; min-width: 120px; text-align: center; padding: 15px 10px; margin: 0 10px 15px; background: #e8eaf6; border-radius: 8px; cursor: pointer;">
                    <div style="width: 40px; height: 40px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #333;">
                      <span class="dashicons dashicons-cart"></span>
                    </div>
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 5px;">${
                      data.content?.products?.length || 0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Products</div>
                  </div>
                  
                  <div class="content-tab" data-content-type="pages" style="flex: 1; min-width: 120px; text-align: center; padding: 15px 10px; margin: 0 10px 15px; background: #f9f9f9; border-radius: 8px; cursor: pointer;">
                    <div style="width: 40px; height: 40px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #333;">
                      <span class="dashicons dashicons-admin-page"></span>
                    </div>
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 5px;">${
                      data.content?.pages?.length || 0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Pages</div>
                  </div>
                  
                  <div class="content-tab" data-content-type="posts" style="flex: 1; min-width: 120px; text-align: center; padding: 15px 10px; margin: 0 10px 15px; background: #f9f9f9; border-radius: 8px; cursor: pointer;">
                    <div style="width: 40px; height: 40px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; color: #333;">
                      <span class="dashicons dashicons-admin-post"></span>
                    </div>
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 5px;">${
                      data.content?.blogPosts?.length || 0
                    }</div>
                    <div style="color: #666; font-size: 13px;">Blog Posts</div>
                  </div>
                </div>
                
                <!-- Content List - Default shows Products -->
                <div id="content-display" style="margin-top: 30px;">
                  <!-- Products List (default view) -->
                  <div id="products-content" class="content-section active">
                    <div class="spinner is-active" style="float: none; margin: 0 auto; display: block;"></div>
                    <p style="text-align: center;">Loading products...</p>
                  </div>
                  
                  <!-- Pages List (hidden by default) -->
                  <div id="pages-content" class="content-section" style="display: none;">
                    <div class="spinner is-active" style="float: none; margin: 0 auto; display: block;"></div>
                    <p style="text-align: center;">Loading pages...</p>
                  </div>
                  
                  <!-- Blog Posts List (hidden by default) -->
                  <div id="posts-content" class="content-section" style="display: none;">
                    <div class="spinner is-active" style="float: none; margin: 0 auto; display: block;"></div>
                    <p style="text-align: center;">Loading blog posts...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

        // Insert the HTML
        $container.html(html);

        // Add click handlers for content tabs
        $(document).on("click", ".content-tab", function () {
          // Remove active class from all tabs
          $(".content-tab").removeClass("active").css("background", "#f9f9f9");
          // Add active class to clicked tab
          $(this).addClass("active").css("background", "#e8eaf6");

          // Hide all content sections
          $(".content-section").hide();
          // Show the content section corresponding to the clicked tab
          var contentType = $(this).data("content-type");
          $("#" + contentType + "-content").show();
        });

        // Now fetch the detailed website data if needed
        if (data.id) {
          // Detailed data is now being handled in the rest of the UI
        }
      })
      .catch(function (error) {
        console.error("Error loading website info:", error);
        $container.html(`
        <div class="notice notice-error inline">
          <p>Error loading website information: ${error.message}</p>
          <p>Please try refreshing the page. If the problem persists, contact support.</p>
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
    })
      .done(function (response) {
        // Fetch unread messages count using existing contacts endpoint
        $.ajax({
          url: voiceroAdminConfig.ajaxUrl,
          method: "POST",
          data: {
            action: "voicero_get_messages",
            nonce: voiceroAdminConfig.nonce,
            websiteId: websiteId,
            filter: "all",
          },
        })
          .done(function (contactsResponse) {
            // Here we can update the UI with the detailed data
            if (response.success && response.data) {
              // Add unread messages count to the response data
              if (
                contactsResponse.success &&
                contactsResponse.data &&
                contactsResponse.data.stats
              ) {
                response.data.unreadMessages =
                  contactsResponse.data.stats.unread || 0;
              }

              // Store the detailed response in a global variable that chatbot.js can access
              window.voiceroDetailedWebsiteResponse = response;

              // Directly call the chatbot's update function if it exists
              if (typeof window.voiceroUpdateChatbotSettings === "function") {
                window.voiceroUpdateChatbotSettings(response.data);
              }

              updateContentDisplay(response.data);
            }
          })
          .fail(function (error) {
            console.error("Failed to fetch messages count:", error);

            // Continue with website data anyway
            if (response.success && response.data) {
              // Store the detailed response in a global variable that chatbot.js can access
              window.voiceroDetailedWebsiteResponse = response;

              // Directly call the chatbot's update function if it exists
              if (typeof window.voiceroUpdateChatbotSettings === "function") {
                window.voiceroUpdateChatbotSettings(response.data);
              }

              updateContentDisplay(response.data);
            }
          });
      })
      .fail(function (error) {
        console.error("Failed to fetch detailed website data:", error);
      });
  }

  // Function to update content displays with detailed data
  function updateContentDisplay(detailedData) {
    if (!detailedData || !detailedData.content) return;

    var content = detailedData.content;

    // Update unread messages count if available
    if (detailedData.unreadMessages !== undefined) {
      var unreadCount = detailedData.unreadMessages;
      var messageText =
        unreadCount === 1 ? "unread message" : "unread messages";
      $(".unread-messages-badge").text(`${unreadCount} ${messageText}`);
    }

    // Update Products section
    if (content.products && content.products.length > 0) {
      let productsHtml = "";
      content.products.forEach((product) => {
        // Truncate description to make it readable
        var shortDesc = product.description
          ? product.description.length > 150
            ? product.description.substring(0, 150) + "..."
            : product.description
          : "No description available";

        productsHtml += `
          <div style="display: flex; padding: 15px; border-bottom: 1px solid #eee;">
            <div style="margin-right: 15px; width: 40px; height: 40px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span class="dashicons dashicons-cart"></span>
            </div>
            <div style="flex: 1; overflow-wrap: break-word; word-wrap: break-word;">
              <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 500;">${
                product.title || "Untitled Product"
              }</h4>
              <p style="color: #666; margin: 0 0 8px; font-size: 13px;">${shortDesc}</p>
              ${
                product.handle
                  ? `
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                  <span style="background: #f0f0f0; color: #333; padding: 3px 8px; border-radius: 4px; font-size: 12px;">${product.handle}</span>
                </div>
              `
                  : ""
              }
            </div>
            <div style="display: flex; align-items: center; margin-left: 15px;">
              <a href="${
                product.url || "#"
              }" target="_blank" class="button button-small">View</a>
            </div>
          </div>
        `;
      });

      $("#products-content").html(productsHtml || "<p>No products found.</p>");
      $(
        '.content-tab[data-content-type="products"] div:first-of-type + div'
      ).text(content.products.length);
    }

    // Update Pages section
    if (content.pages && content.pages.length > 0) {
      let pagesHtml = "";
      content.pages.forEach((page) => {
        // Extract a short description from content
        var shortContent = page.content
          ? page.content.length > 150
            ? page.content.substring(0, 150) + "..."
            : page.content
          : "No content available";

        pagesHtml += `
          <div style="display: flex; padding: 15px; border-bottom: 1px solid #eee;">
            <div style="margin-right: 15px; width: 40px; height: 40px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span class="dashicons dashicons-admin-page"></span>
            </div>
            <div style="flex: 1; overflow-wrap: break-word; word-wrap: break-word;">
              <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 500;">${
                page.title || "Untitled Page"
              }</h4>
              <p style="color: #666; margin: 0 0 8px; font-size: 13px;">${shortContent}</p>
            </div>
            <div style="display: flex; align-items: center; margin-left: 15px;">
              <a href="${
                page.url || "#"
              }" target="_blank" class="button button-small">View</a>
            </div>
          </div>
        `;
      });

      $("#pages-content").html(pagesHtml || "<p>No pages found.</p>");
      $('.content-tab[data-content-type="pages"] div:first-of-type + div').text(
        content.pages.length
      );
    }

    // Update Blog Posts section
    if (content.blogPosts && content.blogPosts.length > 0) {
      let postsHtml = "";
      content.blogPosts.forEach((post) => {
        // Extract a short description from content
        var shortContent = post.content
          ? post.content.length > 150
            ? post.content.substring(0, 150) + "..."
            : post.content
          : "No content available";

        postsHtml += `
          <div style="display: flex; padding: 15px; border-bottom: 1px solid #eee;">
            <div style="margin-right: 15px; width: 40px; height: 40px; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <span class="dashicons dashicons-admin-post"></span>
            </div>
            <div style="flex: 1; overflow-wrap: break-word; word-wrap: break-word;">
              <h4 style="margin: 0 0 8px; font-size: 15px; font-weight: 500;">${
                post.title || "Untitled Post"
              }</h4>
              <p style="color: #666; margin: 0 0 8px; font-size: 13px;">${shortContent}</p>
            </div>
            <div style="display: flex; align-items: center; margin-left: 15px;">
              <a href="${
                post.url || "#"
              }" target="_blank" class="button button-small">View</a>
            </div>
          </div>
        `;
      });

      $("#posts-content").html(postsHtml || "<p>No blog posts found.</p>");
      $('.content-tab[data-content-type="posts"] div:first-of-type + div').text(
        content.blogPosts.length
      );
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
});
