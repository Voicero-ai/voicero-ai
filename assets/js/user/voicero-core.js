/**
 * VoiceroAI Core Module - Minimal Version
 */

// Ensure compatibility with WordPress jQuery
(function (window, document) {
  // Create a minimal jQuery-like fallback when jQuery is not available
  var $ =
    window.jQuery ||
    function (selector) {
      // Return a simple object that implements a ready method
      return {
        ready: function (fn) {
          if (document.readyState !== "loading") {
            setTimeout(fn, 0);
          } else {
            document.addEventListener("DOMContentLoaded", fn);
          }
        },
      };
    };

  var VoiceroCore = {
    apiBaseUrls: [window.voiceroConfig?.apiBase || "/wp-json/voicero/v1"],
    apiBaseUrl: null, // Store the working API URL
    apiConnected: false, // Track connection status
    session: null, // Store the current session
    thread: null, // Store the current thread
    websiteColor: "#882be6", // Default color if not provided by API
    isInitializingSession: false, // Track if a session initialization is in progress
    sessionInitialized: false, // Track if session is fully initialized
    isWebsiteActive: false, // Track website active status
    isSessionOperationInProgress: false, // Track if any session operation is in progress
    lastSessionOperationTime: 0, // Track when the last session operation completed
    sessionOperationTimeout: 2000, // Timeout in ms to consider session operation as stuck
    appState: {}, // Store application state, including UI flags

    // Queue for pending window state updates
    pendingWindowStateUpdates: [],
    // Queue for pending session operations
    pendingSessionOperations: [],

    // Flag to track if state updates are disabled
    stateUpdatesDisabled: false,
    stateUpdateDisableTimer: null,

    // Function to temporarily disable state updates
    disableStateUpdates: function (duration = 1000) {
      // Set the disabled flag
      this.stateUpdatesDisabled = true;

      // Clear any existing timer
      if (this.stateUpdateDisableTimer) {
        clearTimeout(this.stateUpdateDisableTimer);
      }

      // Set a timer to re-enable updates after the specified duration
      this.stateUpdateDisableTimer = setTimeout(() => {
        this.stateUpdatesDisabled = false;
        this.stateUpdateDisableTimer = null;

        // Process any queued updates
        if (
          this.pendingWindowStateUpdates &&
          this.pendingWindowStateUpdates.length > 0
        ) {
          // Take only the most recent update for each property to avoid conflicts
          var latestUpdate = {};

          // Process updates in reverse order (newest first)
          for (let i = this.pendingWindowStateUpdates.length - 1; i >= 0; i--) {
            var update = this.pendingWindowStateUpdates[i];

            // Add each property from this update to the latest update if not already present
            Object.keys(update).forEach((key) => {
              if (latestUpdate[key] === undefined) {
                latestUpdate[key] = update[key];
              }
            });
          }

          // Apply the combined update
          if (Object.keys(latestUpdate).length > 0) {
            this.updateWindowState(latestUpdate);
          }

          // Clear the queue
          this.pendingWindowStateUpdates = [];
        }
      }, duration);
    },

    // Initialize on page load
    init: function () {
      // Set up global reference
      window.VoiceroCore = this;

      // Initialize appState with default values
      this.appState = this.appState || {};
      this.appState.hasShownVoiceWelcome = false;
      this.appState.hasShownTextWelcome = false;
      this.appState.hasShownHelpBubble = false; // Track if help bubble has been shown

      // Set default clickMessage value (will be overridden if API provides one)
      this.clickMessage = "Need Help Shopping?";

      // Set initializing flag to prevent button flickering during startup
      this.isInitializing = true;

      // Create global property to track button visibility timeouts
      this.buttonVisibilityTimeouts = [];

      // Track website active status - Default to true until explicitly told otherwise by the API
      this.isWebsiteActive = true;

      // Make sure apiConnected is false by default until we get a successful API response
      this.apiConnected = false;

      // Check if config is available
      if (typeof voiceroConfig !== "undefined") {
      } else {
      }

      // Step 1: First set up basic containers (but not the button yet)
      this.createTextChatInterface();
      this.createVoiceChatInterface();

      // Step 2: Initialize the API connection - this will create the button
      this.checkApiConnection();

      // Apply button animation to ensure it's attractive
      this.applyButtonAnimation();

      // Clear initializing flag after a delay
      setTimeout(() => {
        this.isInitializing = false;
      }, 2000);

      // Don't force the button to show here anymore - wait for API
      // setTimeout(() => {
      //   this.ensureMainButtonVisible();
      // }, 500);
    },

    // Initialize API connection - empty since we call checkApiConnection directly now
    initializeApiConnection: function () {
      // This method is now empty as we call checkApiConnection directly from init
    },

    // Set up event listeners
    setupEventListeners: function () {
      // Don't create the button here - wait for API connection first

      // Create chat interface elements that might be needed
      this.createTextChatInterface();
      this.createVoiceChatInterface();
    },

    // Create the main interface with the two option buttons
    createButton: function () {
      // Don't create button if website is not active
      if (!this.isWebsiteActive) {
        console.log(
          "Website is not active (isWebsiteActive=false), skipping button creation"
        );
        this.hideMainButton();
        return;
      }

      console.log("Website is active (isWebsiteActive=true), creating button");

      // DON'T SKIP BUTTON CREATION - Even if API isn't connected, we need the main button
      // Just log a warning instead of completely skipping
      if (!this.apiConnected) {
      }

      // Make sure theme colors are updated
      this.updateThemeColor(this.websiteColor);

      // Add CSS Animations for fade-in effect only (button styling is now in updateThemeColor)
      var styleEl = document.createElement("style");
      styleEl.innerHTML = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Help Bubble Styles */
      #voicero-help-bubble {
        position: fixed;
        bottom: 80px;
        right: 30px;
        background-color: white;
        border: 1px solid #000;
        box-shadow: 4px 4px 0 rgb(0, 0, 0);
        border-radius: 8px;
        padding: 10px 15px;
        font-size: 16px;
        font-weight: bold;
        z-index: 2147483646;
        display: none;
        animation: fadeIn 0.3s ease-out;
        color: #000;
        font-family: Arial, sans-serif;
      }
      
      #voicero-help-bubble:after {
        content: "";
        position: absolute;
        bottom: -10px;
        right: 20px;
        border-width: 10px 10px 0;
        border-style: solid;
        border-color: white transparent transparent;
        display: block;
        width: 0;
      }
      
      #voicero-help-bubble:before {
        content: "";
        position: absolute;
        bottom: -11px;
        right: 19px;
        border-width: 11px 11px 0;
        border-style: solid;
        border-color: #000 transparent transparent;
        display: block;
        width: 0;
      }
      
      #voicero-help-close {
        position: absolute;
        top: 3px;
        left: 6px;
        cursor: pointer;
        font-size: 16px;
        color: #000;
        background: none;
        border: none;
        padding: 0 2px;
      }
      
      #voicero-help-close:hover {
        opacity: 0.7;
      }
      
      /* Ensure button icons stay visible on hover */
      #chat-website-button svg {
        position: relative !important;
        z-index: 2 !important;
        pointer-events: none !important;
      }
    `;
      document.head.appendChild(styleEl);

      // Use the website color from API or default
      var themeColor = this.websiteColor || "#882be6";

      // Check if the container exists, otherwise append to body
      let container = document.getElementById("voicero-app-container");

      if (!container) {
        // If the WordPress-added container doesn't exist, create one on the body

        document.body.insertAdjacentHTML(
          "beforeend",
          `<div id="voicero-app-container"></div>`
        );
        container = document.getElementById("voicero-app-container");
      }

      // CRITICAL FIX: Always ensure the container is visible
      if (container) {
        container.style.display = "block";
        container.style.visibility = "visible";
        container.style.opacity = "1";
      }

      if (container) {
        // Create the button container inside the main container
        container.innerHTML = `<div id="voice-toggle-container"></div>`;
        var buttonContainer = document.getElementById("voice-toggle-container");

        if (buttonContainer) {
          // Apply styles directly to the element with !important to override injected styles
          buttonContainer.style.cssText = `
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          z-index: 2147483647 !important; /* Maximum z-index value to ensure it's always on top */
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          top: auto !important;
          left: auto !important;
        `;

          // Get the iconBot value from session if available
          var iconBot =
            this.session && this.session.iconBot
              ? this.session.iconBot
              : "message";
          let iconSvg = "";

          // Choose the appropriate SVG based on iconBot value
          if (iconBot === "bot") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="24" height="24" fill="currentColor">
              <rect x="12" y="16" width="40" height="32" rx="10" ry="10" stroke="white" stroke-width="2" fill="currentColor"/>
              <circle cx="22" cy="32" r="4" fill="white"/>
              <circle cx="42" cy="32" r="4" fill="white"/>
              <path d="M24 42c4 4 12 4 16 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
              <line x1="32" y1="8" x2="32" y2="16" stroke="white" stroke-width="2"/>
              <circle cx="32" cy="6" r="2" fill="white"/>
            </svg>`;
          } else if (iconBot === "voice") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z"/>
            </svg>`;
          } else {
            // Default to message icon
            iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>`;
          }

          // Add the main button with the chosen icon
          buttonContainer.innerHTML = `
          <button id="chat-website-button" class="visible" style="background-color: ${themeColor}; position: relative;">
            ${iconSvg}
          </button>
        `;

          // Add help bubble
          buttonContainer.insertAdjacentHTML(
            "beforeend",
            `<div id="voicero-help-bubble">
              <button id="voicero-help-close">×</button>
              ${this.clickMessage || "Need Help Shopping?"}
            </div>`
          );

          // Apply enhanced button animation
          this.applyButtonAnimation();

          // ALWAYS force visibility on all devices
          var chatButtonEl = document.getElementById("chat-website-button");
          if (chatButtonEl) {
            chatButtonEl.style.cssText = `
              background-color: ${themeColor};
              display: flex !important;
              visibility: visible !important;
              opacity: 1 !important;
              width: 50px !important;
              height: 50px !important;
              border-radius: 50% !important;
              justify-content: center !important;
              align-items: center !important;
              color: white !important;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
              border: none !important;
              cursor: pointer !important;
              transition: all 0.2s ease !important;
              padding: 0 !important;
              margin: 0 !important;
              position: relative !important;
              z-index: 2147483647 !important;
            `;
          }

          // Add the chooser as a separate element
          buttonContainer.insertAdjacentHTML(
            "beforeend",
            `
          <div
            id="interaction-chooser"
            style="
              position: fixed !important;
              bottom: 80px !important;
              right: 20px !important;
              z-index: 10001 !important;
              background-color: #c8c8c8 !important;
              border-radius: 12px !important;
              box-shadow: 6px 6px 0 ${themeColor} !important;
              padding: 15px !important;
              width: 280px !important;
              border: 1px solid rgb(0, 0, 0) !important;
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              flex-direction: column !important;
              align-items: center !important;
              margin: 0 !important;
              transform: none !important;
            "
          >
            <div
              id="voice-chooser-button"
              class="interaction-option voice"
              style="
                position: relative;
                display: flex;
                align-items: center;
                padding: 10px 10px;
                margin-bottom: 10px;
                margin-left: -30px;
                cursor: pointer;
                border-radius: 8px;
                background-color: white;
                border: 1px solid rgb(0, 0, 0);
                box-shadow: 4px 4px 0 rgb(0, 0, 0);
                transition: all 0.2s ease;
                width: 200px;
              "
              onmouseover="this.style.transform='translateY(-1px)'"
              onmouseout="this.style.transform='translateY(0)'"
            >
              <span style="font-weight: 700; color: rgb(0, 0, 0); font-size: 16px; width: 100%; text-align: center; white-space: nowrap;">
                Voice Conversation
              </span>
              <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" style="position: absolute; right: -50px; width: 35px; height: 35px;">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <path d="M12 19v4"/>
                <path d="M8 23h8"/>
              </svg>
            </div>

            <div
              id="text-chooser-button"
              class="interaction-option text"
              style="
                position: relative;
                display: flex;
                align-items: center;
                padding: 10px 10px;
                margin-left: -30px;
                cursor: pointer;
                border-radius: 8px;
                background-color: white;
                border: 1px solid rgb(0, 0, 0);
                box-shadow: 4px 4px 0 rgb(0, 0, 0);
                transition: all 0.2s ease;
                width: 200px;
              "
              onmouseover="this.style.transform='translateY(-1px)'"
              onmouseout="this.style.transform='translateY(0)'"
            >
              <span style="font-weight: 700; color: rgb(0, 0, 0); font-size: 16px; width: 100%; text-align: center;">
                Message
              </span>
              <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" style="position: absolute; right: -50px; width: 35px; height: 35px;">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            
            <div style="
              text-align: center;
              margin-top: 18px;
              line-height: 1;
            ">
              <div style="
                font-size: 10px;
                color: black;
                opacity: 0.8;
                margin-bottom: 2px;
              ">Powered by Voicero</div>
              <div style="
                font-size: 8px;
                color: black;
                opacity: 0.6;
              ">Voicero AI can make mistakes</div>
            </div>
          </div>
        `
          );

          // Add click handler for the main button to toggle the chooser
          var mainButton = document.getElementById("chat-website-button");
          var chooser = document.getElementById("interaction-chooser");

          // Add click handler for help bubble close button
          var helpBubble = document.getElementById("voicero-help-bubble");
          var helpClose = document.getElementById("voicero-help-close");

          if (helpClose && helpBubble) {
            helpClose.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();
              helpBubble.style.display = "none";
              // Mark as shown so it doesn't appear again this session
              if (window.VoiceroCore) {
                window.VoiceroCore.appState.hasShownHelpBubble = true;
              }
            });
          }

          // Set a timeout to show the help bubble after 2 seconds (reduced from 4) if core button is visible
          this.helpBubbleTimeout = setTimeout(() => {
            if (
              window.VoiceroCore &&
              !window.VoiceroCore.appState.hasShownHelpBubble &&
              window.VoiceroCore.session &&
              window.VoiceroCore.session.coreOpen &&
              !window.VoiceroCore.session.chooserOpen &&
              !window.VoiceroCore.session.textOpen &&
              !window.VoiceroCore.session.voiceOpen
            ) {
              var helpBubble = document.getElementById("voicero-help-bubble");
              if (helpBubble) {
                helpBubble.style.display = "block";
                window.VoiceroCore.appState.hasShownHelpBubble = true;
              }
            }
          }, 2000); // Reduced from 4000ms to 2000ms

          // Add additional retry to make sure the bubble shows up
          this.helpBubbleRetryTimeout = setTimeout(() => {
            if (
              window.VoiceroCore &&
              !window.VoiceroCore.appState.hasShownHelpBubble &&
              window.VoiceroCore.session
            ) {
              var helpBubble = document.getElementById("voicero-help-bubble");
              if (helpBubble) {
                helpBubble.style.display = "block";
                window.VoiceroCore.appState.hasShownHelpBubble = true;
              }
            }
          }, 5000);

          // Add a fallback timeout with fewer conditions
          this.helpBubbleFallbackTimeout = setTimeout(() => {
            // Only check if bubble has been shown already
            if (
              window.VoiceroCore &&
              !window.VoiceroCore.appState.hasShownHelpBubble
            ) {
              var helpBubble = document.getElementById("voicero-help-bubble");
              if (helpBubble) {
                helpBubble.style.display = "block";
                window.VoiceroCore.appState.hasShownHelpBubble = true;
              }
            }
          }, 8000);

          if (mainButton && chooser) {
            mainButton.addEventListener("click", function (e) {
              e.preventDefault();
              e.stopPropagation();

              // Hide help bubble when button is clicked
              var helpBubble = document.getElementById("voicero-help-bubble");
              if (helpBubble) {
                helpBubble.style.display = "none";
                window.VoiceroCore.appState.hasShownHelpBubble = true;
              }

              // Check if session operations are in progress
              if (window.VoiceroCore && window.VoiceroCore.isSessionBusy()) {
                return;
              }

              // Check if any interfaces are open and close them (acting as home button)
              var voiceInterface = document.getElementById(
                "voice-chat-interface"
              );
              var textInterface = document.getElementById(
                "voicero-text-chat-container"
              );

              let interfacesOpen = false;

              if (voiceInterface && voiceInterface.style.display === "block") {
                // Close voice interface
                if (window.VoiceroVoice && window.VoiceroVoice.closeVoiceChat) {
                  window.VoiceroVoice.closeVoiceChat();
                  interfacesOpen = true;
                } else {
                  voiceInterface.style.display = "none";
                  interfacesOpen = true;
                }
              }

              if (textInterface && textInterface.style.display === "block") {
                // Close text interface
                if (window.VoiceroText && window.VoiceroText.closeTextChat) {
                  window.VoiceroText.closeTextChat();
                  interfacesOpen = true;
                } else {
                  textInterface.style.display = "none";
                  interfacesOpen = true;
                }
              }

              // If no interfaces were open, then toggle the chooser
              if (!interfacesOpen) {
                // Simply toggle the chooserOpen state
                var shouldShow = !window.VoiceroCore.session?.chooserOpen;
                // Update the session and UI
                if (shouldShow) {
                  // Session first then UI
                  if (window.VoiceroCore.session) {
                    window.VoiceroCore.session.chooserOpen = true;
                  }

                  // Show the UI
                  if (window.VoiceroChooser) {
                    window.VoiceroChooser.showChooser();
                  }

                  // Update API
                  window.VoiceroCore.updateWindowState({
                    chooserOpen: true,
                  });
                } else {
                  // Session first then UI
                  if (window.VoiceroCore.session) {
                    window.VoiceroCore.session.chooserOpen = false;
                  }

                  // Hide the UI
                  if (window.VoiceroChooser) {
                    window.VoiceroChooser.hideChooser();
                  }

                  // Update API
                  window.VoiceroCore.updateWindowState({
                    chooserOpen: false,
                  });
                }
              }
            });
          }

          // Add click handlers for voice and text buttons
          var voiceButton = document.getElementById("voice-chooser-button");
          var textButton = document.getElementById("text-chooser-button");

          if (voiceButton) {
            // Remove the inline onclick attribute
            voiceButton.removeAttribute("onclick");

            // Add event listener to open voice chat and update window state
            voiceButton.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Check if session operations are in progress
              if (window.VoiceroCore && window.VoiceroCore.isSessionBusy()) {
                return;
              }

              // Hide the chooser
              if (chooser) {
                window.VoiceroCore.hideChooser();
              }

              // Update session state directly
              if (window.VoiceroCore && window.VoiceroCore.updateWindowState) {
                window.VoiceroCore.updateWindowState({
                  voiceOpen: true,
                  voiceOpenWindowUp: true,
                  textOpen: false,
                  textOpenWindowUp: false,
                  coreOpen: false,
                });
              }

              // Create voice interface if needed
              let voiceInterface = document.getElementById(
                "voice-chat-interface"
              );
              if (!voiceInterface) {
                container.insertAdjacentHTML(
                  "beforeend",
                  `<div id="voice-chat-interface" style="display: none;"></div>`
                );
              }

              // Try to open voice interface
              if (window.VoiceroVoice && window.VoiceroVoice.openVoiceChat) {
                window.VoiceroVoice.openVoiceChat();
                // Force maximize after opening
                setTimeout(() => {
                  if (
                    window.VoiceroVoice &&
                    window.VoiceroVoice.maximizeVoiceChat
                  ) {
                    window.VoiceroVoice.maximizeVoiceChat();
                  }
                }, 100);
              }
            });
          }

          if (textButton) {
            // Remove the inline onclick attribute
            textButton.removeAttribute("onclick");

            // Add event listener to open text chat and update window state
            textButton.addEventListener("click", (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Check if session operations are in progress
              if (window.VoiceroCore && window.VoiceroCore.isSessionBusy()) {
                return;
              }

              // Hide the chooser
              if (chooser) {
                window.VoiceroCore.hideChooser();
              }

              // Update session state directly
              if (window.VoiceroCore && window.VoiceroCore.updateWindowState) {
                window.VoiceroCore.updateWindowState({
                  textOpen: true,
                  textOpenWindowUp: true,
                  voiceOpen: false,
                  voiceOpenWindowUp: false,
                  coreOpen: false,
                });
              }

              // Create text interface if needed
              let textInterface = document.getElementById(
                "voicero-text-chat-container"
              );
              if (!textInterface) {
                container.insertAdjacentHTML(
                  "beforeend",
                  `<div id="voicero-text-chat-container" style="display: none;"></div>`
                );
              }

              // Try to open text interface
              if (window.VoiceroText && window.VoiceroText.openTextChat) {
                window.VoiceroText.openTextChat();
                // Force maximize after opening
                setTimeout(() => {
                  if (window.VoiceroText && window.VoiceroText.maximizeChat) {
                    window.VoiceroText.maximizeChat();
                  }
                }, 100);
              }
            });
          }
        } else {
        }
      } else {
      }

      // Update the button icon based on current session
      this.updateButtonIcon();
    },

    // Create text chat interface (basic container elements)
    createTextChatInterface: function () {
      // Check if text chat interface already exists
      if (document.getElementById("voicero-text-chat-container")) {
        return;
      }

      // Get the container or create it if not exists
      let container = document.getElementById("voicero-app-container");
      if (!container) {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div id="voicero-app-container"></div>`
        );
        container = document.getElementById("voicero-app-container");
      }

      // Add the interface to the container
      if (container) {
        container.insertAdjacentHTML(
          "beforeend",
          `<div id="voicero-text-chat-container" style="display: none;"></div>`
        );
      } else {
      }
    },

    // Create voice chat interface (basic container elements)
    createVoiceChatInterface: function () {
      // Check if voice chat interface already exists
      if (document.getElementById("voice-chat-interface")) {
        return;
      }

      // Get the container or create it if not exists
      let container = document.getElementById("voicero-app-container");
      if (!container) {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div id="voicero-app-container"></div>`
        );
        container = document.getElementById("voicero-app-container");
      }

      // Add the interface to the container
      if (container) {
        container.insertAdjacentHTML(
          "beforeend",
          `<div id="voice-chat-interface" style="display: none;"></div>`
        );
      } else {
      }
    },

    // Format markdown (helper function that may be used by modules)
    formatMarkdown: function (text) {
      if (!text) return "";

      // Replace links
      text = text.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="chat-link" target="_blank">$1</a>'
      );

      // Replace bold
      text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Replace italics
      text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");

      // Replace line breaks
      text = text.replace(/\n/g, "<br>");

      return text;
    },

    // Check API connection
    checkApiConnection: function () {
      // Try each API base URL
      this.apiBaseUrls.forEach((baseUrl) => {
        // Get auth headers from config if available
        var headers = {
          Accept: "application/json",
          ...(window.voiceroConfig?.getAuthHeaders
            ? window.voiceroConfig.getAuthHeaders()
            : {}),
        };

        fetch(`${baseUrl}/connect`, {
          method: "GET",
          headers: headers,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`API connection failed: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            // Store the working API URL
            this.apiBaseUrl = baseUrl;
            this.apiConnected = true;

            // Add debug logging to see exact API response for website active status
            console.log("API response websiteFound:", data.websiteFound);
            console.log("API response website object:", data.website);

            // Check both websiteFound and website.active properties
            // We need to check explicitly for false values in both fields
            const isExplicitlyInactive =
              data.websiteFound === false || data.website?.active === false;

            if (isExplicitlyInactive) {
              console.log(
                "Website is explicitly marked inactive (websiteFound=false or website.active=false), hiding Voicero UI"
              );
              this.isWebsiteActive = false;
              // Hide any existing buttons/UI
              this.hideMainButton();
              this.removeAllButtons();
              return;
            } else {
              // Any other case (true, undefined, etc.) we assume active
              console.log(
                "Website is active (no explicit inactive flags found)"
              );
              this.isWebsiteActive = true;
            }

            this.websiteId = data.website?.id;

            // Set website color if provided by API
            if (data.website?.color) {
              this.websiteColor = data.website.color;
              // Update theme colors immediately
              this.updateThemeColor(this.websiteColor);
            }

            // Store clickMessage from API if provided
            if (data.website?.clickMessage) {
              this.clickMessage = data.website.clickMessage;
              window.voiceroClickMessage = data.website.clickMessage;
            } else {
              this.clickMessage = "Need Help Shopping?";
              window.voiceroClickMessage = "Need Help Shopping?";
            }

            // Save ALL icon settings from API
            // Save botName and customWelcomeMessage
            if (data.website?.botName) {
              this.botName = data.website.botName;
              window.voiceroBotName = data.website.botName;
            }

            if (data.website?.customWelcomeMessage) {
              this.customWelcomeMessage = data.website.customWelcomeMessage;
              window.voiceroCustomWelcomeMessage =
                data.website.customWelcomeMessage;
            }

            // ADDED: Store popup questions directly on VoiceroCore
            if (data.website?.popUpQuestions) {
              this.popUpQuestions = data.website.popUpQuestions;
              window.voiceroPopUpQuestions = data.website.popUpQuestions;
            }

            // Save the entire website object
            this.website = data.website;

            // Save icon settings globally
            if (data.website?.iconBot) {
              // Make sure to update session with the new icon
              if (this.session) {
                this.session.iconBot = data.website.iconBot;
              }
              this.iconBot = data.website.iconBot;
              window.voiceroIconBot = data.website.iconBot;

              // Force an icon update multiple times to ensure it takes effect
              setTimeout(() => {
                if (this.updateButtonIcon) {
                  this.updateButtonIcon();
                }
              }, 100);

              setTimeout(() => {
                if (this.updateButtonIcon) {
                  this.updateButtonIcon();
                }
              }, 1000);

              setTimeout(() => {
                if (this.updateButtonIcon) {
                  this.updateButtonIcon();
                }
              }, 2000);
            }

            if (data.website?.iconMessage) {
              this.iconMessage = data.website.iconMessage;
              window.voiceroIconMessage = data.website.iconMessage;
            }

            if (data.website?.iconVoice) {
              this.iconVoice = data.website.iconVoice;
              window.voiceroIconVoice = data.website.iconVoice;
            }

            // Save removeHighlight setting if provided by API
            if (data.website?.removeHighlight !== undefined) {
              this.removeHighlight = data.website.removeHighlight;
              window.voiceroRemoveHighlight = data.website.removeHighlight;

              // Also update it directly in the session if it exists
              if (this.session) {
                this.session.removeHighlight = data.website.removeHighlight;
              }
            }

            // Create the button now that we have API connection
            this.createButton();

            // Force icon update after button creation
            setTimeout(() => {
              this.updateButtonIcon();
            }, 1000);

            // Check for existing session
            var savedSession = localStorage.getItem("voicero_session");
            if (savedSession) {
              try {
                var parsedSession = JSON.parse(savedSession);
                this.session = parsedSession;
                this.sessionId = parsedSession.id;

                // Fetch latest session data from API
                fetch(`${baseUrl}/session?sessionId=${this.sessionId}`, {
                  method: "GET",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...(window.voiceroConfig?.getAuthHeaders
                      ? window.voiceroConfig.getAuthHeaders()
                      : {}),
                  },
                })
                  .then((response) => {
                    if (!response.ok) {
                      throw new Error(
                        `Session fetch failed: ${response.status}`
                      );
                    }
                    return response.json();
                  })
                  .then((data) => {
                    if (data.session) {
                      // Update local session with latest data
                      this.session = data.session;

                      // Make sure botName and customWelcomeMessage are transferred
                      if (data.website && data.website.botName) {
                        this.session.botName = data.website.botName;
                      } else if (this.botName) {
                        this.session.botName = this.botName;
                      }

                      if (data.website && data.website.customWelcomeMessage) {
                        this.session.customWelcomeMessage =
                          data.website.customWelcomeMessage;
                      } else if (this.customWelcomeMessage) {
                        this.session.customWelcomeMessage =
                          this.customWelcomeMessage;
                      }

                      // Make sure removeHighlight setting is transferred from website data to session
                      if (
                        data.website &&
                        data.website.removeHighlight !== undefined
                      ) {
                        this.session.removeHighlight =
                          data.website.removeHighlight;
                      } else if (this.removeHighlight !== undefined) {
                        this.session.removeHighlight = this.removeHighlight;
                      }

                      localStorage.setItem(
                        "voicero_session",
                        JSON.stringify(data.session)
                      );
                      // Make session available to other modules
                      if (window.VoiceroText) {
                        window.VoiceroText.session = this.session;
                      }
                      if (window.VoiceroVoice) {
                        window.VoiceroVoice.session = this.session;
                      }

                      // Check if we need to open any interfaces based on session state
                      if (data.session.voiceOpen === true) {
                        if (
                          window.VoiceroVoice &&
                          window.VoiceroVoice.openVoiceChat
                        ) {
                          // First ensure the voiceOpenWindowUp is set to true in the session
                          if (data.session) {
                            data.session.voiceOpenWindowUp = true;
                          }

                          // Then open the interface (always maximized)
                          window.VoiceroVoice.openVoiceChat();

                          // We no longer minimize based on session value when explicitly opening
                        }
                      } else if (data.session.textOpen === true) {
                        if (
                          window.VoiceroText &&
                          window.VoiceroText.openTextChat
                        ) {
                          // First ensure the textOpenWindowUp is set to true in the session
                          if (data.session) {
                            data.session.textOpenWindowUp = true;
                          }

                          // Then open the interface (always maximized)
                          window.VoiceroText.openTextChat();

                          // We no longer minimize based on session value when explicitly opening
                        }
                      }
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "VoiceroCore: Error fetching latest session:",
                      error
                    );
                    // If session fetch fails, create a new one
                    this.createSession();
                  });
              } catch (error) {
                console.error(
                  "VoiceroCore: Error parsing saved session:",
                  error
                );
                this.createSession();
              }
            } else {
              this.createSession();
            }
          })
          .catch((error) => {
            console.error("VoiceroCore: API connection failed:", error);
          });
      });
    },

    // Hide the main website button
    hideMainButton: function () {
      // Cancel any pending visibility calls that might conflict
      if (this.buttonVisibilityTimeouts) {
        this.buttonVisibilityTimeouts.forEach((timeoutId) =>
          clearTimeout(timeoutId)
        );
      }
      this.buttonVisibilityTimeouts = [];

      // Hide toggle container with comprehensive styles
      var toggleContainer = document.getElementById("voice-toggle-container");
      if (toggleContainer) {
        toggleContainer.style.cssText = `
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
        `;
      }

      // Hide main button with comprehensive styles
      var mainButton = document.getElementById("chat-website-button");
      if (mainButton) {
        mainButton.style.cssText = `
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          z-index: -1 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
        `;
      }

      // Hide the chooser as well if it exists
      var chooser = document.getElementById("interaction-chooser");
      if (chooser) {
        this.hideChooser();
      }

      // Set a flag in the object to remember button is hidden
      this._buttonHidden = true;
    },

    // Initialize session
    initializeSession: function () {
      // Check if we have a saved session
      var savedSession = localStorage.getItem("voicero_session");
      if (savedSession) {
        try {
          var parsedSession = JSON.parse(savedSession);
          this.session = parsedSession;
          this.sessionId = parsedSession.sessionId;
          this.websiteId = parsedSession.websiteId;

          // Load thread if available
          if (parsedSession.threads && parsedSession.threads.length > 0) {
            this.thread = parsedSession.threads[0];
            this.currentThreadId = parsedSession.threads[0].threadId;
          }

          // Check if we should show the interface
          if (this.session.voiceOpen || this.session.textOpen) {
            if (this.session.voiceOpen) {
              if (window.VoiceroVoice) {
                window.VoiceroVoice.openVoiceChat();
              }
            } else if (this.session.textOpen) {
              if (window.VoiceroText) {
                window.VoiceroText.openTextChat();
              }
            }
          }
        } catch (error) {
          console.error("VoiceroCore: Error loading session:", error);
        }
      } else {
      }
    },

    // Process any pending window state updates
    processPendingWindowStateUpdates: function () {
      if (this.pendingWindowStateUpdates.length === 0 || !this.sessionId) {
        return;
      }

      // Process each pending update
      for (var update of this.pendingWindowStateUpdates) {
        this.updateWindowState(update);
      }

      // Clear the queue
      this.pendingWindowStateUpdates = [];
    },

    // Get an existing session by ID
    getSession: function (sessionId) {
      if (!this.websiteId || !sessionId) {
        this.isInitializingSession = false; // Reset flag even in error case
        return;
      }

      // Ask our WordPress REST proxy for this specific sessionId
      var proxyUrl = `${this.getApiBaseUrl()}/session?sessionId=${sessionId}`;

      fetch(proxyUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            // If we can't get the session, try creating a new one
            if (response.status === 404) {
              // Set a flag to indicate we're calling from getSession to prevent checks
              this.createSessionFromGetSession();
              return null;
            }
            throw new Error(`Session request failed: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (!data) return; // Handle the case where we're creating a new session

          this.session = data.session;

          // Get the most recent thread
          if (
            data.session &&
            data.session.threads &&
            data.session.threads.length > 0
          ) {
            this.thread = data.session.threads[0];
          }

          // Ensure VoiceroCore.thread always matches session.threadId
          var active = this.session.threads.find(
            (t) => t.threadId === this.session.threadId
          );
          // If session.threadId hasn't been set yet, fall back to the first one
          this.thread = active || this.session.threads[0];

          // Log detailed session info
          if (data.session) {
          }

          // Store session ID in global variable and localStorage
          if (data.session && data.session.id) {
            this.sessionId = data.session.id;
            localStorage.setItem("voicero_session_id", data.session.id);

            // Process any pending window state updates now that we have a sessionId
            this.processPendingWindowStateUpdates();

            // Ensure button visibility after session is established
            this.ensureMainButtonVisible();
          }

          // Make session available to other modules
          if (window.VoiceroText) {
            window.VoiceroText.session = this.session;
            window.VoiceroText.thread = this.thread;
          }

          if (window.VoiceroVoice) {
            window.VoiceroVoice.session = this.session;
            window.VoiceroVoice.thread = this.thread;
          }

          // Restore interface state based on session flags
          this.restoreInterfaceState();

          // Update the button icon based on loaded session
          this.updateButtonIcon();

          // Mark session as initialized and no longer initializing
          this.sessionInitialized = true;
          this.isInitializingSession = false;
        })
        .catch((error) => {
          // Reset initialization flag in error case
          this.isInitializingSession = false;

          // Try creating a new session as fallback
          this.createSessionFromGetSession();
        });
    },

    // Restore interface state based on session flags
    restoreInterfaceState: function () {
      if (!this.session) return;

      // Create a flag to track if we need to hide the button
      var shouldHideButton =
        this.session.textOpen === true || this.session.voiceOpen === true;

      // Hide the button first if needed, before any interface operations
      if (shouldHideButton) {
        // Hide button immediately to prevent flickering
        this.hideMainButton();

        // Set a flag to indicate we're currently restoring an interface
        this.isRestoringInterface = true;

        // Cancel any pending button visibility calls
        if (this.buttonVisibilityTimeouts) {
          this.buttonVisibilityTimeouts.forEach((timeoutId) =>
            clearTimeout(timeoutId)
          );
        }
        this.buttonVisibilityTimeouts = [];

        // Add more aggressive button hiding with multiple timers
        setTimeout(() => this.hideMainButton(), 100);
        setTimeout(() => this.hideMainButton(), 500);
        setTimeout(() => this.hideMainButton(), 1000);
        setTimeout(() => this.hideMainButton(), 2000);
      } else {
        // Check if we should show chooser based on session state
        if (this.session.chooserOpen === true) {
          setTimeout(() => this.displayChooser(), 300);
        } else {
          // No interfaces open and chooser not open, ensure button is visible
          this.ensureMainButtonVisible();
        }

        // Clear initialization flag after we've determined no interfaces need to be opened
        this.isInitializing = false;
        return;
      }

      // One-time function to ensure button stays hidden
      var ensureButtonHidden = () => {
        var toggleContainer = document.getElementById("voice-toggle-container");
        if (toggleContainer) {
          toggleContainer.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            z-index: -1 !important;
          `;
        }

        var mainButton = document.getElementById("chat-website-button");
        if (mainButton) {
          mainButton.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            z-index: -1 !important;
          `;
        }
      };

      // Check if text interface should be open
      if (this.session.textOpen === true) {
        // Make sure VoiceroText is initialized
        if (window.VoiceroText) {
          // First ensure the textOpenWindowUp is set to true in the session
          if (this.session) {
            this.session.textOpenWindowUp = true;
          }

          // Open the text chat (always maximized)
          window.VoiceroText.openTextChat();

          // We no longer minimize based on session value when explicitly opening

          // Multiple timeouts to ensure button stays hidden
          this.buttonVisibilityTimeouts = [
            setTimeout(() => ensureButtonHidden(), 300),
            setTimeout(() => ensureButtonHidden(), 800),
            setTimeout(() => ensureButtonHidden(), 1500),
            setTimeout(() => ensureButtonHidden(), 3000),
          ];
        }
      }
      // Check if voice interface should be open
      else if (this.session.voiceOpen === true) {
        // Make sure VoiceroVoice is initialized
        if (window.VoiceroVoice) {
          // First ensure the voiceOpenWindowUp is set to true in the session
          if (this.session) {
            this.session.voiceOpenWindowUp = true;
          }

          // Open voice chat (always maximized)
          window.VoiceroVoice.openVoiceChat();

          // We no longer minimize based on session value when explicitly opening

          // Check if auto mic should be activated
          if (this.session.autoMic === true) {
            setTimeout(() => {
              if (window.VoiceroVoice && window.VoiceroVoice.toggleMic) {
                window.VoiceroVoice.toggleMic();
              }
            }, 1000); // Longer delay for mic activation
          }

          // Multiple timeouts to ensure button stays hidden
          this.buttonVisibilityTimeouts = [
            setTimeout(() => ensureButtonHidden(), 300),
            setTimeout(() => ensureButtonHidden(), 800),
            setTimeout(() => ensureButtonHidden(), 1500),
            setTimeout(() => ensureButtonHidden(), 3000),
          ];
        }
      }

      // Clear restoration flag after a short delay
      setTimeout(() => {
        this.isRestoringInterface = false;

        // Also clear initialization flag after interface restoration is complete
        this.isInitializing = false;

        // One final check to make sure button stays hidden if interfaces are open
        if (this.session.textOpen === true || this.session.voiceOpen === true) {
          this.hideMainButton();
        }
      }, 2000);
    },

    // Create a new session specifically called from getSession
    createSessionFromGetSession: function () {
      // This is a wrapper to avoid infinite loops

      // Always allow this call to proceed even if isInitializingSession is true
      this.isInitializingSession = false;
      this.createSession();
    },

    // Check if session operations are in progress
    isSessionBusy: function () {
      // If a session operation is explicitly marked as in progress
      if (this.isSessionOperationInProgress) {
        // Check if it's been too long (might be stuck)
        var currentTime = Date.now();
        var timeSinceLastOperation =
          currentTime - this.lastSessionOperationTime;

        if (timeSinceLastOperation > this.sessionOperationTimeout) {
          console.warn(
            "VoiceroCore: Session operation timeout exceeded, resetting flag"
          );
          this.isSessionOperationInProgress = false;
          return false;
        }
        return true;
      }

      // Also check if VoiceroText is waiting for an API response
      if (window.VoiceroText && window.VoiceroText.isWaitingForResponse) {
        return true;
      }

      return false;
    },

    // Create a new session
    createSession: function () {
      if (!this.websiteId) {
        console.error("VoiceroCore: Cannot create session - no website ID");
        this.isInitializingSession = false;
        return;
      }

      // Set the initializing flags
      this.isInitializingSession = true;
      this.isSessionOperationInProgress = true;
      this.lastSessionOperationTime = Date.now();
      var proxyUrl = `${this.getApiBaseUrl()}/session`;

      // Check if Shopify customer ID is available
      var shopifyCustomerId = window.__VoiceroCustomerId || null;

      // Create request body with websiteId and shopifyCustomerId if available
      var requestBody = JSON.stringify({
        websiteId: this.websiteId,
        ...(shopifyCustomerId && { shopifyCustomerId }),
      });

      try {
        fetch(proxyUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(window.voiceroConfig?.getAuthHeaders
              ? window.voiceroConfig.getAuthHeaders()
              : {}),
          },
          body: requestBody,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Create session failed: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            // Store session and thread data
            if (data.session) {
              this.session = data.session;

              // Transfer global properties to session if not already set in API response
              if (this.botName && !data.session.botName) {
                this.session.botName = this.botName;
              }
              if (
                this.customWelcomeMessage &&
                !data.session.customWelcomeMessage
              ) {
                this.session.customWelcomeMessage = this.customWelcomeMessage;
              }

              // Store session ID in localStorage
              if (data.session.id) {
                this.sessionId = data.session.id;
                // Store both the session ID and the full session object
                localStorage.setItem("voicero_session_id", data.session.id);
                localStorage.setItem(
                  "voicero_session",
                  JSON.stringify(data.session)
                );
                // Verify the storage
                var storedSessionId =
                  localStorage.getItem("voicero_session_id");
                var storedSession = localStorage.getItem("voicero_session");
              }
            }

            if (data.thread) {
              this.thread = data.thread;
            }

            // Make session available to other modules
            if (window.VoiceroText) {
              window.VoiceroText.session = this.session;
              window.VoiceroText.thread = this.thread;
            }

            if (window.VoiceroVoice) {
              window.VoiceroVoice.session = this.session;
              window.VoiceroVoice.thread = this.thread;
            }

            // Mark session as initialized
            this.sessionInitialized = true;
            this.isInitializingSession = false;
            this.isSessionOperationInProgress = false;
            this.lastSessionOperationTime = Date.now();
          })
          .catch((error) => {
            console.error("VoiceroCore: Session creation failed:", error);
            this.isInitializingSession = false;
            this.isSessionOperationInProgress = false;
            this.lastSessionOperationTime = Date.now();
            this.sessionInitialized = false;
          });
      } catch (error) {
        console.error("VoiceroCore: Session creation error:", error);
        this.isInitializingSession = false;
        this.isSessionOperationInProgress = false;
        this.lastSessionOperationTime = Date.now();
        this.sessionInitialized = false;
      }
    },

    // Fallback method to try creating a session using jQuery AJAX
    _createSessionFallback: function () {
      // Get Shopify customer ID if available
      var shopifyCustomerId = window.__VoiceroCustomerId || null;

      // Only run if jQuery is available
      if (typeof window.jQuery === "undefined") {
        // Use fetch as a fallback if jQuery isn't available
        fetch(`${this.getApiBaseUrl()}/session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            websiteId: this.websiteId,
            ...(shopifyCustomerId && { shopifyCustomerId }),
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.session && data.session.id) {
              this.session = data.session;
              this.sessionId = data.session.id;

              try {
                localStorage.setItem("voicero_session_id", data.session.id);
              } catch (e) {}
            }

            this.sessionInitialized = true;
            this.isInitializingSession = false;
            this.createButton();
          })
          .catch(() => {
            this.isInitializingSession = false;
            this.sessionInitialized = false;
            this.createButton();
          });
        return;
      }

      // Use jQuery if available
      window.jQuery.ajax({
        url: `${this.getApiBaseUrl()}/session`,
        type: "POST",
        data: JSON.stringify({
          websiteId: this.websiteId,
          ...(shopifyCustomerId && { shopifyCustomerId }),
        }),
        contentType: "application/json",
        dataType: "json",
        success: (data) => {
          if (data.session && data.session.id) {
            this.session = data.session;
            this.sessionId = data.session.id;

            try {
              localStorage.setItem("voicero_session_id", data.session.id);
            } catch (e) {}
          }

          this.sessionInitialized = true;
          this.isInitializingSession = false;
          this.createButton();
        },
        error: (xhr, status, error) => {
          this.isInitializingSession = false;
          this.sessionInitialized = false;
          this.createButton();
        },
      });
    },

    // Get the working API base URL
    getApiBaseUrl: function () {
      return this.apiBaseUrl || this.apiBaseUrls[0];
    },

    // Show the chooser interface when an active interface is closed
    showChooser: function () {
      // Check if we already have the right state to avoid redundant updates
      if (this.session && this.session.chooserOpen === true) {
      } else {
        // Make sure chooserOpen is set to true in the session
        if (this.session) {
          this.session.chooserOpen = true;
          // Update the window state
          this.updateWindowState({
            chooserOpen: true,
            coreOpen: true,
            textOpen: false,
            voiceOpen: false,
          });
        }
      }

      // Delegate to the new VoiceroChooser module
      if (window.VoiceroChooser && window.VoiceroChooser.showChooser) {
        window.VoiceroChooser.showChooser();
      } else {
        console.error("VoiceroCore: VoiceroChooser module not available");

        // Fallback if module not available - try to show it directly
        var chooser = document.getElementById("interaction-chooser");
        if (chooser) {
          chooser.style.display = "flex";
          chooser.style.visibility = "visible";
          chooser.style.opacity = "1";
        }
      }

      // Ensure the main button is visible
      this.ensureMainButtonVisible();
    },

    // Create the interaction chooser with consistent HTML and styles
    createChooser: function () {
      // Delegate to the new VoiceroChooser module
      if (window.VoiceroChooser && window.VoiceroChooser.createChooser) {
        window.VoiceroChooser.createChooser();
      } else {
        console.error("VoiceroCore: VoiceroChooser module not available");
      }
    },

    // Ensure the main button is always visible
    ensureMainButtonVisible: function () {
      // Don't show button if website is not active
      if (!this.isWebsiteActive) {
        this.hideMainButton();
        return;
      }

      // Don't show button if we're currently restoring an interface that should have it hidden
      if (this.isRestoringInterface || this.isInitializing) {
        return;
      }

      // Also check if any interfaces are currently visible in the DOM
      var textInterface = document.getElementById(
        "voicero-text-chat-container"
      );
      if (
        textInterface &&
        window.getComputedStyle(textInterface).display === "block"
      ) {
        this.hideMainButton();
        return;
      }

      var voiceInterface = document.getElementById("voice-chat-interface");
      if (
        voiceInterface &&
        window.getComputedStyle(voiceInterface).display === "block"
      ) {
        this.hideMainButton();
        return;
      }

      // Make sure the container is visible
      var container = document.getElementById("voicero-app-container");
      if (container) {
        container.style.display = "block";
        container.style.visibility = "visible";
        container.style.opacity = "1";
      }

      // Make sure button container is visible
      var buttonContainer = document.getElementById("voice-toggle-container");
      if (buttonContainer) {
        buttonContainer.style.display = "block";
        buttonContainer.style.visibility = "visible";
        buttonContainer.style.opacity = "1";

        // Apply critical positioning styles
        buttonContainer.style.cssText = `
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          z-index: 2147483647 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          top: auto !important;
          left: auto !important;
        `;
      }

      // Make sure the main button is visible
      var mainButton = document.getElementById("chat-website-button");
      if (mainButton) {
        var themeColor = this.websiteColor || "#882be6";
        mainButton.style.cssText = `
          background-color: ${themeColor};
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 50px !important;
          height: 50px !important;
          border-radius: 50% !important;
          justify-content: center !important;
          align-items: center !important;
          color: white !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
          border: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          padding: 0 !important;
          margin: 0 !important;
          position: relative !important;
          z-index: 2147483647 !important;
          animation: pulse 2s infinite !important;
        `;
      }

      // Apply button animation
      this.applyButtonAnimation();

      // Update the button icon
      this.updateButtonIcon();
    },

    // Add control buttons to interface
    addControlButtons: function (container, type) {
      // This function can be called by VoiceroText or VoiceroVoice
      // to add common control elements
    },

    // Update window state via API
    updateWindowState: function (windowState) {
      // Check if state updates are disabled
      if (this.stateUpdatesDisabled) {
        // Add to pending updates queue to be processed when re-enabled
        this.pendingWindowStateUpdates = this.pendingWindowStateUpdates || [];
        this.pendingWindowStateUpdates.push(windowState);

        // Return a resolved promise to maintain API consistency
        return Promise.resolve({ success: false, reason: "updates_disabled" });
      }

      // Check if there's already an update in progress
      if (this.isUpdateInProgress) {
        // Add to pending updates queue
        this.pendingWindowStateUpdates = this.pendingWindowStateUpdates || [];
        this.pendingWindowStateUpdates.push(windowState);

        // Return a resolved promise to maintain API consistency
        return Promise.resolve({
          success: false,
          reason: "update_in_progress",
        });
      }

      // Set the lock flag
      this.isUpdateInProgress = true;

      // Check for redundant chooserOpen updates but NEVER skip them
      if (windowState.chooserOpen !== undefined && this.session) {
        if (windowState.chooserOpen === this.session.chooserOpen) {
        }
      }

      this.isSessionOperationInProgress = true;
      this.lastSessionOperationTime = Date.now();

      // Set coreOpen to false if either text or voice interface is open
      if (windowState.textOpen === true || windowState.voiceOpen === true) {
        windowState.coreOpen = false;
        // Also set chooserOpen to false to be explicit
        windowState.chooserOpen = false;
        // Hide the main button when voice or text interface is open
        this.hideMainButton();
      } else if (windowState.chooserOpen === true) {
        // If chooserOpen is explicitly set to true, respect that
        windowState.coreOpen = true;
        // Always recreate the chooser to ensure correct styling
        this.createChooser();
        // Then show it after a short delay
        setTimeout(() => {
          // Double-check that suppressChooser hasn't been set in the meantime
          if (!this.session || !this.session.suppressChooser) {
            this.showChooser();
          }
        }, 100);
      } else if (!windowState.suppressChooser) {
        // Only set coreOpen to true if both interfaces are closed and chooser isn't suppressed
        windowState.coreOpen = true;
        // Set chooserOpen to false by default unless something else changes it
        if (windowState.chooserOpen === undefined) {
          windowState.chooserOpen = false;
        }
      }

      // Store original suppressChooser value
      var hadSuppressChooser = windowState.suppressChooser === true;

      // Check if session initialization is in progress
      if (this.isInitializingSession) {
        this.pendingWindowStateUpdates.push(windowState);
        return;
      }

      // Check if we have a session ID
      if (!this.sessionId) {
        // Add to pending updates queue
        this.pendingWindowStateUpdates.push(windowState);

        // If session is not initialized yet, trigger initialization
        if (!this.sessionInitialized && !this.isInitializingSession) {
          this.initializeSession();
        }

        // Immediately update local session values even without sessionId
        if (this.session) {
          // Update our local session with new values
          Object.assign(this.session, windowState);

          // CRITICAL: Reset suppressChooser after applying it to prevent lingering
          if (hadSuppressChooser && this.session) {
            setTimeout(() => {
              if (this.session) {
                this.session.suppressChooser = false;
              }
            }, 500);
          }

          // Check if iconBot was updated and update the button icon
          if (windowState.iconBot) {
            this.updateButtonIcon();
          }

          // Check if removeHighlight was updated
          if (windowState.removeHighlight !== undefined) {
            // Update the local property too for redundancy
            this.removeHighlight = windowState.removeHighlight;
          }

          // Propagate the immediate updates to other modules
          if (window.VoiceroText) {
            window.VoiceroText.session = this.session;
          }

          if (window.VoiceroVoice) {
            window.VoiceroVoice.session = this.session;
          }
        }

        return;
      }

      // Immediately update local session values for instant access
      if (this.session) {
        // Update our local session with new values
        Object.assign(this.session, windowState);

        // CRITICAL: Reset suppressChooser after applying it to prevent lingering
        if (hadSuppressChooser && this.session) {
          setTimeout(() => {
            if (this.session) {
              this.session.suppressChooser = false;
            }
          }, 500);
        }

        // Check if iconBot was updated and update the button icon
        if (windowState.iconBot) {
          this.updateButtonIcon();
        }

        // Check if removeHighlight was updated
        if (windowState.removeHighlight !== undefined) {
          // Update the local property too for redundancy
          this.removeHighlight = windowState.removeHighlight;
        }

        // Propagate the immediate updates to other modules
        if (window.VoiceroText) {
          window.VoiceroText.session = this.session;
        }

        if (window.VoiceroVoice) {
          window.VoiceroVoice.session = this.session;
        }
      }

      // Store the values we need for the API call to avoid timing issues
      var sessionIdForApi = this.sessionId;
      var windowStateForApi = { ...windowState };

      // Use setTimeout to ensure the API call happens after navigation
      setTimeout(() => {
        // Verify we have a valid sessionId
        if (
          !sessionIdForApi ||
          typeof sessionIdForApi !== "string" ||
          sessionIdForApi.trim() === ""
        ) {
          return;
        }

        // Make API call to persist the changes
        var proxyUrl = `${this.getApiBaseUrl()}/session/windows`;

        // Format the request body to match what the WordPress API expects
        var requestBody = {
          sessionId: sessionIdForApi,
          windowState: windowStateForApi,
        };

        fetch(proxyUrl, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(window.voiceroConfig?.getAuthHeaders
              ? window.voiceroConfig.getAuthHeaders()
              : {}),
          },
          body: JSON.stringify(requestBody),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Window state update failed: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            // Update our local session data with the full server response
            if (data.session) {
              // Need to update the global VoiceroCore session
              if (window.VoiceroCore) {
                window.VoiceroCore.session = data.session;
              }

              // Propagate the updated session to other modules
              if (window.VoiceroText) {
                window.VoiceroText.session = data.session;
              }

              if (window.VoiceroVoice) {
                window.VoiceroVoice.session = data.session;
              }
            }

            this.isSessionOperationInProgress = false;
            this.lastSessionOperationTime = Date.now();

            // Reset the update lock flag
            this.isUpdateInProgress = false;

            // Process any pending updates
            if (
              this.pendingWindowStateUpdates &&
              this.pendingWindowStateUpdates.length > 0 &&
              !this.stateUpdatesDisabled
            ) {
              var nextUpdate = this.pendingWindowStateUpdates.shift();
              setTimeout(() => {
                this.updateWindowState(nextUpdate);
              }, 100); // Small delay to prevent tight loops
            }
          })
          .catch((error) => {
            console.error("VoiceroCore: Window state update failed:", error);

            this.isSessionOperationInProgress = false;
            this.lastSessionOperationTime = Date.now();

            // Reset the update lock flag even on error
            this.isUpdateInProgress = false;

            // Process any pending updates even after an error
            if (
              this.pendingWindowStateUpdates &&
              this.pendingWindowStateUpdates.length > 0 &&
              !this.stateUpdatesDisabled
            ) {
              var nextUpdate = this.pendingWindowStateUpdates.shift();
              setTimeout(() => {
                this.updateWindowState(nextUpdate);
              }, 100); // Small delay to prevent tight loops
            }
          });
      }, 0);
    },

    // Update theme color in CSS variables
    updateThemeColor: function (color) {
      if (!color) color = this.websiteColor;

      // Update CSS variables with the theme color
      document.documentElement.style.setProperty(
        "--voicero-theme-color",
        color
      );

      // Create lighter and darker variants
      let lighterVariant = color;
      let hoverVariant = color;

      // If it's a hex color, we can calculate variants
      if (color.startsWith("#")) {
        try {
          // Convert hex to RGB for the lighter variant
          var r = parseInt(color.slice(1, 3), 16);
          var g = parseInt(color.slice(3, 5), 16);
          var b = parseInt(color.slice(5, 7), 16);

          // Create a lighter variant by adjusting brightness
          var lighterR = Math.min(255, Math.floor(r * 1.2));
          var lighterG = Math.min(255, Math.floor(g * 1.2));
          var lighterB = Math.min(255, Math.floor(b * 1.2));

          // Create a darker variant for hover
          var darkerR = Math.floor(r * 0.8);
          var darkerG = Math.floor(g * 0.8);
          var darkerB = Math.floor(b * 0.8);

          // Convert back to hex
          lighterVariant = `#${lighterR.toString(16).padStart(2, "0")}${lighterG
            .toString(16)
            .padStart(2, "0")}${lighterB.toString(16).padStart(2, "0")}`;
          hoverVariant = `#${darkerR.toString(16).padStart(2, "0")}${darkerG
            .toString(16)
            .padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`;

          // Create a more robust enhanced pulsing style
          var pulseStyle = document.createElement("style");
          pulseStyle.innerHTML = `
            /* Button Pulse Animation */
            @keyframes pulse {
              0% {
                box-shadow: 0 0 0 0 rgba(${r}, ${g}, ${b}, 0.4);
              }
              70% {
                box-shadow: 0 0 0 10px rgba(${r}, ${g}, ${b}, 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(${r}, ${g}, ${b}, 0);
              }
            }
            
            #chat-website-button {
              transition: all 0.2s ease !important;
              animation: pulse 2s infinite !important;
              position: relative !important;
            }
            
            #chat-website-button:hover {
              transform: scale(1.1) !important;
              box-shadow: 0 6px 20px rgba(${r}, ${g}, ${b}, 0.3) !important;
              animation: none !important;
            }
            
            #chat-website-button:active {
              transform: scale(0.95) !important;
              box-shadow: 0 2px 10px rgba(${r}, ${g}, ${b}, 0.2) !important;
            }
            
            /* Ensure SVG icons stay visible */
            #chat-website-button svg {
              position: relative !important;
              z-index: 5 !important;
              pointer-events: none !important;
            }

            /* Animated ring around button */
            #chat-website-button::after {
              content: "" !important;
              position: absolute !important;
              width: 100% !important;
              height: 100% !important;
              top: 0 !important;
              left: 0 !important;
              border-radius: 50% !important;
              box-shadow: 0 0 0 2px rgba(${r}, ${g}, ${b}, 0.3) !important;
              animation: voiceroRingPulse 1.5s ease-out infinite !important;
              pointer-events: none !important;
              z-index: 1 !important;
            }
            
            @keyframes ringPulse {
              0% {
                transform: scale(0.95);
                opacity: 0.7;
              }
              50% {
                transform: scale(1.1);
                opacity: 0;
              }
              100% {
                transform: scale(0.95);
                opacity: 0.7;
              }
            }
          `;

          // Remove any existing pulse style and add the new one
          var existingPulseStyle = document.getElementById(
            "voicero-pulse-style"
          );
          if (existingPulseStyle) {
            existingPulseStyle.remove();
          }

          pulseStyle.id = "voicero-pulse-style";
          document.head.appendChild(pulseStyle);
        } catch (e) {
          // Fallback to default variants
          lighterVariant = "#9370db";
          hoverVariant = "#7a5abf";
        }
      }

      // Set the variant colors
      document.documentElement.style.setProperty(
        "--voicero-theme-color-light",
        lighterVariant
      );
      document.documentElement.style.setProperty(
        "--voicero-theme-color-hover",
        hoverVariant
      );
    },

    // BULLETPROOF FAILSAFE to ensure button always exists and is visible
    setupButtonFailsafe: function () {
      // Only set up failsafe if website is active
      if (!this.isWebsiteActive) {
        console.log("Website is not active, skipping button failsafe setup");
        // Hide any existing buttons
        this.hideMainButton();
        this.removeAllButtons();
        return;
      }

      // Set multiple timers at different intervals to guarantee button creation
      setTimeout(() => this.createFailsafeButton(), 1000);
      setTimeout(() => this.createFailsafeButton(), 2000);
      setTimeout(() => this.createFailsafeButton(), 5000);

      // Also add window load event listener as an additional guarantee
      window.addEventListener("load", () => {
        // Check if site is active before creating button
        if (this.isWebsiteActive) {
          setTimeout(() => this.createFailsafeButton(), 500);
        } else {
          this.hideMainButton();
          this.removeAllButtons();
        }
      });

      // Add visibility change listener to ensure button when tab becomes visible
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.isWebsiteActive) {
          setTimeout(() => this.createFailsafeButton(), 300);
        } else if (
          document.visibilityState === "visible" &&
          !this.isWebsiteActive
        ) {
          this.hideMainButton();
          this.removeAllButtons();
        }
      });
    },

    // Create a failsafe button if one doesn't exist
    createFailsafeButton: function () {
      // CRITICAL: Only create button if website is active
      if (!this.isWebsiteActive) {
        // Actually hide the button if it exists and site is inactive
        this.hideMainButton();
        this.removeAllButtons();
        return;
      }

      // Check if button already exists
      if (document.getElementById("chat-website-button")) {
        this.ensureMainButtonVisible();
        return;
      }

      // Create app container if it doesn't exist
      let container = document.getElementById("voicero-app-container");
      if (!container) {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div id="voicero-app-container" style="display:block!important;visibility:visible!important;opacity:1!important;"></div>`
        );
        container = document.getElementById("voicero-app-container");
      } else {
        // Force container visibility
        container.style.cssText =
          "display:block!important;visibility:visible!important;opacity:1!important;";
      }

      // Check if button container exists, create if not
      let buttonContainer = document.getElementById("voice-toggle-container");
      if (!buttonContainer) {
        container.insertAdjacentHTML(
          "beforeend",
          `<div id="voice-toggle-container" style="position:fixed!important;bottom:20px!important;right:20px!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;"></div>`
        );
        buttonContainer = document.getElementById("voice-toggle-container");
      } else {
        // Force button container visibility
        buttonContainer.style.cssText =
          "position:fixed!important;bottom:20px!important;right:20px!important;z-index:2147483647!important;display:block!important;visibility:visible!important;opacity:1!important;";
      }

      // If the main button does not exist, create it with absolute guaranteed visibility
      var chatButton = document.getElementById("chat-website-button");
      if (!chatButton && buttonContainer) {
        var themeColor = this.websiteColor || "#882be6";

        // Get the iconBot value from session if available
        var iconBot =
          this.session && this.session.iconBot
            ? this.session.iconBot
            : "message";
        let iconSvg = "";

        // Choose the appropriate SVG based on iconBot value
        if (iconBot === "bot" || iconBot === "BotIcon") {
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="24" height="24" fill="currentColor">
          <rect x="12" y="16" width="40" height="32" rx="10" ry="10" stroke="white" stroke-width="2" fill="currentColor"/>
          <circle cx="22" cy="32" r="4" fill="white"/>
          <circle cx="42" cy="32" r="4" fill="white"/>
          <path d="M24 42c4 4 12 4 16 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <line x1="32" y1="8" x2="32" y2="16" stroke="white" stroke-width="2"/>
          <circle cx="32" cy="6" r="2" fill="white"/>
        </svg>`;
        } else if (iconBot === "voice" || iconBot === "VoiceIcon") {
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z"/>
        </svg>`;
        } else if (iconBot === "DocumentIcon") {
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" />
        </svg>`;
        } else if (iconBot === "WaveformIcon") {
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 12h2v3H3v-3zm4-4h2v10H7V8zm4-6h2v22h-2V2zm4 6h2v10h-2V8zm4 4h2v3h-2v-3z" />
        </svg>`;
        } else if (iconBot === "CursorIcon") {
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
          <path d="M11 2h2v20h-2z" />
        </svg>`;
        } else if (iconBot === "MicrophoneIcon") {
          iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
          <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" />
        </svg>`;
        } else {
          // Default to message icon
          iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>`;
        }

        buttonContainer.insertAdjacentHTML(
          "beforeend",
          `<button id="chat-website-button" class="visible" style="background-color:${themeColor};display:flex!important;visibility:visible!important;opacity:1!important;width:50px!important;height:50px!important;border-radius:50%!important;justify-content:center!important;align-items:center!important;color:white!important;box-shadow:0 4px 15px rgba(0,0,0,0.2)!important;border:none!important;cursor:pointer!important;transition:all 0.2s ease!important;padding:0!important;margin:0!important;position:relative!important;z-index:2147483647!important;animation:pulse 2s infinite!important;">
            ${iconSvg}
          </button>`
        );
      }

      // ALWAYS add click handler to ensure the button works
      this.attachButtonClickHandler();

      // Final insurance: force both elements to be visible with inline styles
      var mainButton = document.getElementById("chat-website-button");
      if (mainButton) {
        mainButton.setAttribute(
          "style",
          `background-color:${
            this.websiteColor || "#882be6"
          };display:flex!important;visibility:visible!important;opacity:1!important;width:50px!important;height:50px!important;border-radius:50%!important;justify-content:center!important;align-items:center!important;color:white!important;box-shadow:0 4px 15px rgba(0,0,0,0.2)!important;border:none!important;cursor:pointer!important;transition:all 0.2s ease!important;padding:0!important;margin:0!important;position:relative!important;z-index:2147483647!important;`
        );
      }
    },

    // Attach bulletproof click handler to button
    attachButtonClickHandler: function () {
      var mainButton = document.getElementById("chat-website-button");
      if (!mainButton) return;

      // Remove existing listeners to prevent duplicates
      var newButton = mainButton.cloneNode(true);
      if (mainButton.parentNode) {
        mainButton.parentNode.replaceChild(newButton, mainButton);
      }

      // Add the new bulletproof click handler
      newButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if session operations are in progress
        if (window.VoiceroCore && window.VoiceroCore.isSessionBusy()) {
          return;
        }

        // Create chooser if it doesn't exist
        let chooser = document.getElementById("interaction-chooser");
        if (!chooser) {
          var themeColor = this.websiteColor || "#882be6";
          var buttonContainer = document.getElementById(
            "voice-toggle-container"
          );

          if (buttonContainer) {
            buttonContainer.insertAdjacentHTML(
              "beforeend",
              `<div
                id="interaction-chooser"
                style="
                  position: fixed !important;
                  bottom: 80px !important;
                  right: 20px !important;
                  z-index: 10001 !important;
                  background-color: #c8c8c8 !important;
                  border-radius: 12px !important;
                  box-shadow: 6px 6px 0 ${themeColor} !important;
                  padding: 15px !important;
                  width: 280px !important;
                  border: 1px solid rgb(0, 0, 0) !important;
                  display: none !important;
                  visibility: hidden !important;
                  opacity: 0 !important;
                  flex-direction: column !important;
                  align-items: center !important;
                  margin: 0 !important;
                  transform: none !important;
                  pointer-events: auto !important;
                "
              >
                <div
                  id="voice-chooser-button"
                  class="interaction-option voice"
                  style="
                    position: relative;
                    display: flex;
                    align-items: center;
                    padding: 10px 10px;
                    margin-bottom: 10px;
                    margin-left: -30px;
                    cursor: pointer;
                    border-radius: 8px;
                    background-color: white;
                    border: 1px solid rgb(0, 0, 0);
                    box-shadow: 4px 4px 0 rgb(0, 0, 0);
                    transition: all 0.2s ease;
                    width: 200px;
                  "
                >
                  <span style="font-weight: 700; color: rgb(0, 0, 0); font-size: 16px; width: 100%; text-align: center; white-space: nowrap;">
                    Voice Conversation
                  </span>
                  <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" style="position: absolute; right: -50px; width: 35px; height: 35px;">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <path d="M12 19v4"/>
                    <path d="M8 23h8"/>
                  </svg>
                </div>

                <div
                  id="text-chooser-button"
                  class="interaction-option text"
                  style="
                    position: relative;
                    display: flex;
                    align-items: center;
                    padding: 10px 10px;
                    margin-left: -30px;
                    cursor: pointer;
                    border-radius: 8px;
                    background-color: white;
                    border: 1px solid rgb(0, 0, 0);
                    box-shadow: 4px 4px 0 rgb(0, 0, 0);
                    transition: all 0.2s ease;
                    width: 200px;
                  "
                >
                  <span style="font-weight: 700; color: rgb(0, 0, 0); font-size: 16px; width: 100%; text-align: center; white-space: nowrap;">
                    Message
                  </span>
                  <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" style="position: absolute; right: -50px; width: 35px; height: 35px;">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>`
            );

            chooser = document.getElementById("interaction-chooser");

            // Add click handlers to the new options
            var voiceButton = document.getElementById("voice-chooser-button");
            if (voiceButton) {
              voiceButton.addEventListener("click", () => {
                // Check if session operations are in progress
                if (window.VoiceroCore && window.VoiceroCore.isSessionBusy()) {
                  return;
                }

                if (chooser) {
                  window.VoiceroCore.hideChooser();
                }

                // Update session state directly
                if (
                  window.VoiceroCore &&
                  window.VoiceroCore.updateWindowState
                ) {
                  window.VoiceroCore.updateWindowState({
                    voiceOpen: true,
                    voiceOpenWindowUp: true,
                    textOpen: false,
                    textOpenWindowUp: false,
                    coreOpen: false,
                  });
                }

                // Create voice interface if needed
                let voiceInterface = document.getElementById(
                  "voice-chat-interface"
                );
                if (!voiceInterface) {
                  container.insertAdjacentHTML(
                    "beforeend",
                    `<div id="voice-chat-interface" style="display: none;"></div>`
                  );
                }

                // Try to open voice interface
                if (window.VoiceroVoice && window.VoiceroVoice.openVoiceChat) {
                  window.VoiceroVoice.openVoiceChat();
                  // Force maximize after opening
                  setTimeout(() => {
                    if (
                      window.VoiceroVoice &&
                      window.VoiceroVoice.maximizeVoiceChat
                    ) {
                      window.VoiceroVoice.maximizeVoiceChat();
                    }
                  }, 100);
                }
              });
            }

            var textButton = document.getElementById("text-chooser-button");
            if (textButton) {
              textButton.addEventListener("click", () => {
                // Check if session operations are in progress
                if (window.VoiceroCore && window.VoiceroCore.isSessionBusy()) {
                  return;
                }

                if (chooser) {
                  window.VoiceroCore.hideChooser();
                }

                // Update session state directly
                if (
                  window.VoiceroCore &&
                  window.VoiceroCore.updateWindowState
                ) {
                  window.VoiceroCore.updateWindowState({
                    textOpen: true,
                    textOpenWindowUp: true,
                    voiceOpen: false,
                    voiceOpenWindowUp: false,
                    coreOpen: false,
                  });
                }

                // Create text interface if needed
                let textInterface = document.getElementById(
                  "voicero-text-chat-container"
                );
                if (!textInterface) {
                  container.insertAdjacentHTML(
                    "beforeend",
                    `<div id="voicero-text-chat-container" style="display: none;"></div>`
                  );
                }

                // Try to open text interface
                if (window.VoiceroText && window.VoiceroText.openTextChat) {
                  window.VoiceroText.openTextChat();
                  // Force maximize after opening
                  setTimeout(() => {
                    if (window.VoiceroText && window.VoiceroText.maximizeChat) {
                      window.VoiceroText.maximizeChat();
                    }
                  }, 100);
                }
              });
            }
          }
        }

        // If chooser exists now, show it
        chooser = document.getElementById("interaction-chooser");
        if (chooser) {
          // Check current visibility
          var computedStyle = window.getComputedStyle(chooser);
          var isVisible =
            computedStyle.display !== "none" &&
            computedStyle.visibility !== "hidden" &&
            computedStyle.opacity !== "0";

          if (isVisible) {
            // Hide if already visible
            window.VoiceroCore.hideChooser();
          } else {
            // Show if hidden
            window.VoiceroCore.displayChooser();
          }
        } else {
          // Last resort - create direct interface
          var voiceInterface = document.getElementById("voice-chat-interface");
          if (voiceInterface) {
            voiceInterface.innerHTML = `<div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:400px;height:500px;background:white;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:999999;padding:20px;display:flex;flex-direction:column;border:1px solid #ccc;">
              <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:15px;">
                <h3 style="margin:0;font-size:18px;font-weight:600;">Voice Assistant</h3>
                <button id="emergency-voice-close" style="background:none;border:none;font-size:20px;cursor:pointer;">×</button>
              </div>
              <div style="flex:1;overflow-y:auto;padding:10px;">
                <p>The voice module is loading. Please try again in a moment.</p>
              </div>
            </div>`;
            voiceInterface.style.display = "block";

            // Add close button handler
            var closeBtn = document.getElementById("emergency-voice-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", () => {
                voiceInterface.style.display = "none";
              });
            }
          }
        }
      });
    },

    // Force remove all buttons from the DOM
    removeAllButtons: function () {
      // Try to remove the toggle container completely
      var toggleContainer = document.getElementById("voice-toggle-container");
      if (toggleContainer && toggleContainer.parentNode) {
        toggleContainer.parentNode.removeChild(toggleContainer);
      }

      // Also look for any stray buttons
      var mainButton = document.getElementById("chat-website-button");
      if (mainButton && mainButton.parentNode) {
        mainButton.parentNode.removeChild(mainButton);
      }

      // Remove all chooser interfaces
      var chooser = document.getElementById("interaction-chooser");
      if (chooser && chooser.parentNode) {
        chooser.parentNode.removeChild(chooser);
      }
    },

    // Create the UI
    initializeUI: function () {
      // Set initializing flag to prevent multiple operations
      this.isInitializing = true;

      // Create global property to track button visibility timeouts
      this.buttonVisibilityTimeouts = [];

      // Create main container
      // ... existing code ...

      // After initialization, clear the flag with a short delay
      setTimeout(() => {
        this.isInitializing = false;
      }, 1000);
    },

    // Helper to determine if the chooser should be displayed
    shouldShowChooser: function () {
      // Delegate to the new VoiceroChooser module
      if (window.VoiceroChooser && window.VoiceroChooser.shouldShowChooser) {
        return window.VoiceroChooser.shouldShowChooser();
      } else {
        console.error("VoiceroCore: VoiceroChooser module not available");
        return false;
      }
    },

    // Helper function to convert hex color to RGB
    hexToRgb: function (hex) {
      // Check if it's already a valid hex color
      if (!hex || typeof hex !== "string" || !hex.startsWith("#")) {
        // Return default if not a valid hex
        return { r: 136, g: 43, b: 230 };
      }

      // Remove # if present
      hex = hex.replace(/^#/, "");

      // Parse hex values
      var bigint = parseInt(hex, 16);
      var r = (bigint >> 16) & 255;
      var g = (bigint >> 8) & 255;
      var b = bigint & 255;

      return { r, g, b };
    },

    // Add button animation directly
    applyButtonAnimation: function () {
      // Create a standalone animation style that doesn't depend on other functions
      var animStyle = document.createElement("style");

      // Get the theme color
      var color = this.websiteColor || "#882be6";

      // Parse RGB components for animation
      let r = 136,
        g = 43,
        b = 230; // Default fallback
      try {
        if (color.startsWith("#")) {
          r = parseInt(color.slice(1, 3), 16);
          g = parseInt(color.slice(3, 5), 16);
          b = parseInt(color.slice(5, 7), 16);
        }
      } catch (e) {
        console.error("Color parsing error:", e);
      }

      // Define button animations
      animStyle.innerHTML = `
        /* Minimal hover effect */
        #chat-website-button {
          position: relative !important;
          transition: transform 0.2s ease !important;
        }
        
        #chat-website-button:hover {
          transform: scale(1.05) !important;
          transition: transform 0.2s ease !important;
          background-color: ${color} !important;
        }
        
        /* Ensure SVG icon stays visible */
        #chat-website-button svg {
          position: relative !important;
          z-index: 5 !important;
          pointer-events: none !important;
        }
      `;

      // Add an ID to find and remove it later if needed
      animStyle.id = "voicero-button-animation";

      // Remove existing animation if present
      var existingAnim = document.getElementById("voicero-button-animation");
      if (existingAnim) {
        existingAnim.remove();
      }

      // Add to document
      document.head.appendChild(animStyle);

      // Also apply animation directly to button for redundancy
      setTimeout(() => {
        var button = document.getElementById("chat-website-button");
        if (button) {
          button.style.animation = "pulse 2s infinite !important;";
          button.style.position = "relative";
        }
      }, 100);
    },

    // Helper to hide the chooser interface
    hideChooser: function () {
      // Always update the session state for consistency
      if (this.session) {
        this.session.chooserOpen = false;

        // Update window state to persist the chooserOpen flag
        this.updateWindowState({
          chooserOpen: false,
        });
      }

      // Delegate to the new VoiceroChooser module
      if (window.VoiceroChooser && window.VoiceroChooser.hideChooser) {
        window.VoiceroChooser.hideChooser();
      } else {
        // Fallback if VoiceroChooser is not available
        var chooser = document.getElementById("interaction-chooser");
        if (chooser) {
          chooser.style.display = "none";
          chooser.style.visibility = "hidden";
          chooser.style.opacity = "0";
        }
      }
    },

    // Helper to display the chooser interface
    displayChooser: function () {
      // Make session update conditional but ALWAYS show the UI
      if (this.session && this.session.chooserOpen === true) {
      } else {
        // Update the session state
        if (this.session) {
          this.session.chooserOpen = true;

          // Update window state to persist the chooserOpen flag and ensure other interfaces are closed
          this.updateWindowState({
            chooserOpen: true,
            coreOpen: true,
            voiceOpen: false,
            voiceOpenWindowUp: false,
            textOpen: false,
            textOpenWindowUp: false,
          });
        }
      }

      // ALWAYS hide any open interfaces
      var textInterface = document.getElementById(
        "voicero-text-chat-container"
      );
      if (textInterface) {
        textInterface.style.display = "none";
      }

      var voiceInterface = document.getElementById("voice-chat-interface");
      if (voiceInterface) {
        voiceInterface.style.display = "none";
      }

      // ALWAYS show the UI, regardless of state
      // First check if VoiceroChooser module is available
      if (window.VoiceroChooser && window.VoiceroChooser.showChooser) {
        window.VoiceroChooser.showChooser();
      } else {
        // Fallback if VoiceroChooser is not available
        var chooser = document.getElementById("interaction-chooser");
        if (chooser) {
          chooser.style.display = "flex";
          chooser.style.visibility = "visible";
          chooser.style.opacity = "1";
        }
      }

      // Also make sure main button is visible
      this.ensureMainButtonVisible();
    },

    // Update the main button icon based on iconBot
    updateButtonIcon: function () {
      // Get button element
      var button = document.getElementById("chat-website-button");
      if (!button) return;

      // Get the iconBot value and log it for debugging
      var iconBot =
        this.session && this.session.iconBot
          ? this.session.iconBot
          : this.iconBot || "message";
      let iconSvg = "";

      // IMPORTANT: handle BotIcon first
      if (iconBot === "BotIcon") {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="24" height="24" fill="currentColor">
          <rect x="12" y="16" width="40" height="32" rx="10" ry="10" stroke="white" stroke-width="2" fill="currentColor"/>
          <circle cx="22" cy="32" r="4" fill="white"/>
          <circle cx="42" cy="32" r="4" fill="white"/>
          <path d="M24 42c4 4 12 4 16 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <line x1="32" y1="8" x2="32" y2="16" stroke="white" stroke-width="2"/>
          <circle cx="32" cy="6" r="2" fill="white"/>
        </svg>`;
      } else if (iconBot === "bot") {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="24" height="24" fill="currentColor">
          <rect x="12" y="16" width="40" height="32" rx="10" ry="10" stroke="white" stroke-width="2" fill="currentColor"/>
          <circle cx="22" cy="32" r="4" fill="white"/>
          <circle cx="42" cy="32" r="4" fill="white"/>
          <path d="M24 42c4 4 12 4 16 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
          <line x1="32" y1="8" x2="32" y2="16" stroke="white" stroke-width="2"/>
          <circle cx="32" cy="6" r="2" fill="white"/>
        </svg>`;
      } else if (
        iconBot === "voice" ||
        iconBot === "VoiceIcon" ||
        iconBot === "SpeakerIcon"
      ) {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z"/>
        </svg>`;
      } else if (iconBot === "DocumentIcon") {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1v5h5v10H6V4h7zm-2 8v2h4v-2h-4zm0 4v2h4v-2h-4z"/>
        </svg>`;
      } else if (iconBot === "WaveformIcon") {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 12h2v8H3zm4-8h2v16H7zm4 4h2v12h-2zm4-4h2v16h-2zm4 8h2v8h-2z"/>
        </svg>`;
      } else {
        // Log what icon wasn't matched
        // Default to message icon
        iconSvg = `<svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>`;
      }

      // Update the button's inner HTML
      button.innerHTML = iconSvg;
    },
  };

  // Initialize on DOM content loaded
  if (typeof $ === "function") {
    $(document).ready(function () {
      VoiceroCore.init();
    });
  } else {
    // Direct fallback if $ isn't working as expected
    if (document.readyState !== "loading") {
      setTimeout(function () {
        VoiceroCore.init();
      }, 0);
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        VoiceroCore.init();
      });
    }
  }

  // Also initialize immediately if DOM is already loaded
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(function () {
      VoiceroCore.init();
    }, 1);
  }

  // Expose global functions
  window.VoiceroCore = VoiceroCore;
})(window, document);
