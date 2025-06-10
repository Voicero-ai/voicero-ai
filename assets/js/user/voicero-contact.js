/**
 * VoiceroAI Contact Form Module
 * Handles contact form functionality within the Voicero text interface
 */

var VoiceroContact = {
  // Initialize the contact module
  init: function () {
    // This will be called when loaded
  },

  // Create and display contact form in the chat interface
  showContactForm: function (params) {
    // Extract message content from params if available
    var prefilledMessage = params && params.message ? params.message : "";

    // Determine which interface is active
    let textMessagesContainer = null;
    let voiceMessagesContainer = null;
    let activeInterface = null;

    // Check for text interface
    if (window.VoiceroText && window.VoiceroText.shadowRoot) {
      textMessagesContainer =
        window.VoiceroText.shadowRoot.getElementById("chat-messages");
      if (textMessagesContainer) {
        activeInterface = "text";
      }
    }

    // Check for voice interface
    if (document.getElementById("voice-messages")) {
      voiceMessagesContainer = document.getElementById("voice-messages");
      if (voiceMessagesContainer) {
        // Only override if text wasn't found
        if (!activeInterface) {
          activeInterface = "voice";
        }
      }
    }

    // Exit if neither interface is available
    if (!textMessagesContainer && !voiceMessagesContainer) {
      console.error("VoiceroContact: No valid interface container found");
      return;
    }

    // Create the contact form HTML with prefilled message if available
    var contactFormHTML = `
      <div class="contact-form-container">
        <h3>How can we help?</h3>
        <p>Please fill out the form below and we'll get back to you soon.</p>
        <div class="form-group">
          <label for="contact-email">Email:</label>
          <input type="email" id="contact-email" placeholder="Your email address" required>
        </div>
        <div class="form-group">
          <label for="contact-message">Message:</label>
          <textarea id="contact-message" placeholder="How can we help you?" rows="4" required>${
            prefilledMessage || ""
          }</textarea>
        </div>
        <div class="form-actions">
          <button id="contact-submit" class="contact-submit-btn">Submit</button>
          <button id="contact-cancel" class="contact-cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    // Create and show the form in both interfaces if both are available
    if (textMessagesContainer) {
      // Create message for text interface
      var textMessageDiv = document.createElement("div");
      textMessageDiv.className = "ai-message";

      // Create message content
      var textContentDiv = document.createElement("div");
      textContentDiv.className = "message-content contact-form-message";
      textContentDiv.innerHTML = contactFormHTML;

      // Style the form to match the chat interface
      textContentDiv.style.maxWidth = "85%";
      textContentDiv.style.width = "300px";
      textContentDiv.style.padding = "15px";

      // Add to message div
      textMessageDiv.appendChild(textContentDiv);

      // Add to messages container
      textMessagesContainer.appendChild(textMessageDiv);
      textMessagesContainer.scrollTop = textMessagesContainer.scrollHeight;

      // Apply styles and setup listeners
      this.applyFormStyles(textMessageDiv);
      this.setupFormEventListeners(textMessageDiv, "text");

      // Generate a unique ID for the message for reporting
      var textMessageId =
        "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      textMessageDiv.dataset.messageId = textMessageId;

      // Use VoiceroSupport to attach the report button if available
      if (
        window.VoiceroSupport &&
        typeof window.VoiceroSupport.attachReportButtonToMessage === "function"
      ) {
        setTimeout(() => {
          window.VoiceroSupport.attachReportButtonToMessage(
            textMessageDiv,
            "text"
          );
        }, 100);
      }
    }

    // If voice interface is also available, add it there too
    if (voiceMessagesContainer && activeInterface === "voice") {
      // Create message for voice interface
      var voiceMessageDiv = document.createElement("div");
      voiceMessageDiv.className = "ai-message";

      // Create message content
      var voiceContentDiv = document.createElement("div");
      voiceContentDiv.className = "voice-message-content contact-form-message";
      voiceContentDiv.innerHTML = contactFormHTML;

      // Style the form to match the voice interface
      voiceContentDiv.style.maxWidth = "85%";
      voiceContentDiv.style.width = "300px";
      voiceContentDiv.style.padding = "15px";

      // Add to message div
      voiceMessageDiv.appendChild(voiceContentDiv);

      // Add to messages container
      voiceMessagesContainer.appendChild(voiceMessageDiv);
      voiceMessagesContainer.scrollTop = voiceMessagesContainer.scrollHeight;

      // Apply styles and setup listeners
      this.applyFormStyles(voiceMessageDiv);
      this.setupFormEventListeners(voiceMessageDiv, "voice");

      // Generate a unique ID for the message for reporting
      var voiceMessageId =
        "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      voiceMessageDiv.dataset.messageId = voiceMessageId;

      // Use VoiceroSupport to attach the report button if available
      if (
        window.VoiceroSupport &&
        typeof window.VoiceroSupport.attachReportButtonToMessage === "function"
      ) {
        setTimeout(() => {
          window.VoiceroSupport.attachReportButtonToMessage(
            voiceMessageDiv,
            "voice"
          );
        }, 100);
      }
    }
  },

  // Apply styles to the form elements
  applyFormStyles: function (formContainer) {
    // Get the main theme color from VoiceroText or VoiceroVoice - more comprehensive approach
    let mainColor;

    // First try VoiceroVoice
    if (window.VoiceroVoice && window.VoiceroVoice.websiteColor) {
      mainColor = window.VoiceroVoice.websiteColor;
    }
    // Then try various ways to get it from VoiceroText
    else if (window.VoiceroText) {
      if (window.VoiceroText.websiteColor) {
        mainColor = window.VoiceroText.websiteColor;
      } else if (
        window.VoiceroText.colorVariants &&
        window.VoiceroText.colorVariants.main
      ) {
        mainColor = window.VoiceroText.colorVariants.main;
      } else if (window.VoiceroText.shadowRoot) {
        // Try to find color from send button which should have the website color
        var sendButton =
          window.VoiceroText.shadowRoot.getElementById("send-message-btn");
        if (sendButton && sendButton.style.backgroundColor) {
          mainColor = sendButton.style.backgroundColor;
        }
      }
    }

    // Fallback to default purple if no color found
    if (!mainColor) {
      mainColor = "#882be6";
    }

    // Apply styles to form elements - use more specific selectors and !important where needed
    var styles = `
      .contact-form-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        background-color: #f8f9fa !important;
        border-radius: 12px !important;
        padding: 20px !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
        max-width: 90% !important;
        margin: 0 auto !important;
      }
      
      .contact-form-container h3 {
        margin: 0 0 10px 0 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        color: #333 !important;
      }
      
      .contact-form-container p {
        margin: 0 0 15px 0 !important;
        font-size: 14px !important;
        line-height: 1.4 !important;
        color: #666 !important;
      }
      
      .form-group {
        margin-bottom: 16px !important;
      }
      
      .form-group label {
        display: block !important;
        margin-bottom: 6px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        color: #444 !important;
      }
      
      .form-group input, 
      .form-group textarea {
        width: 90% !important;
        padding: 10px 12px !important;
        border: 1px solid #ccc !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        box-sizing: border-box !important;
        background-color: white !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
      }
      
      .form-group input:focus, 
      .form-group textarea:focus {
        outline: none !important;
        border-color: ${mainColor} !important;
        box-shadow: 0 0 0 2px rgba(${parseInt(mainColor.slice(1, 3), 16)}, 
                                   ${parseInt(mainColor.slice(3, 5), 16)}, 
                                   ${parseInt(
                                     mainColor.slice(5, 7),
                                     16
                                   )}, 0.2) !important;
      }
      
      .form-actions {
        display: flex !important;
        justify-content: flex-start !important;
        gap: 10px !important;
        margin-top: 20px !important;
      }
      
      .contact-submit-btn, 
      .contact-cancel-btn {
        padding: 8px 15px !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        border: none !important;
        min-width: 100px !important;
        width: auto !important;
        text-align: center !important;
      }
      
      .contact-submit-btn {
        background-color: ${mainColor} !important;
        color: white !important;
      }
      
      .contact-submit-btn:hover {
        opacity: 0.9 !important;
      }
      
      /* Force color with !important to override any other styles */
      .contact-form-message .contact-submit-btn {
        background-color: ${mainColor} !important;
        color: white !important;
      }
      
      .contact-cancel-btn {
        background-color: #e9e9e9 !important;
        color: #555 !important;
      }
      
      .contact-cancel-btn:hover {
        background-color: #ddd !important;
      }
      
      .form-error {
        color: #ff3b30 !important;
        font-size: 12px !important;
        margin-top: 4px !important;
        font-weight: 400 !important;
      }
      
      .form-submit-error {
        background-color: #fff0f0 !important;
        border: 1px solid #ffcccb !important;
        border-radius: 6px !important;
        padding: 10px !important;
        margin-top: 12px !important;
        color: #d32f2f !important;
        font-size: 13px !important;
      }
    `;

    // Determine where to add the styles based on interface
    // For voice interface, add styles directly to the document head
    if (document.getElementById("voice-messages")) {
      // Check if style already exists
      var existingStyle = document.getElementById("voicero-contact-styles");
      if (existingStyle) {
        existingStyle.textContent = styles;
      } else {
        var styleEl = document.createElement("style");
        styleEl.id = "voicero-contact-styles";
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
      }
    }
    // For text interface with shadow DOM
    else if (window.VoiceroText && window.VoiceroText.shadowRoot) {
      // Check if style already exists in shadow DOM
      var existingStyle = window.VoiceroText.shadowRoot.getElementById(
        "voicero-contact-styles"
      );
      if (existingStyle) {
        existingStyle.textContent = styles;
      } else {
        var styleEl = document.createElement("style");
        styleEl.id = "voicero-contact-styles";
        styleEl.textContent = styles;
        window.VoiceroText.shadowRoot.appendChild(styleEl);
      }
    }
    // Fallback - add to document if neither condition is met
    else {
      // Check if style already exists
      var existingStyle = document.getElementById("voicero-contact-styles");
      if (existingStyle) {
        existingStyle.textContent = styles;
      } else {
        var styleEl = document.createElement("style");
        styleEl.id = "voicero-contact-styles";
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
      }
    }

    // Directly apply styles to the form elements for maximum reliability
    var form = formContainer.querySelector(".contact-form-container");
    if (form) {
      form.style.backgroundColor = "#f8f9fa";
      form.style.borderRadius = "12px";
      form.style.padding = "20px";
      form.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
      form.style.maxWidth = "90%";
      form.style.margin = "0 auto";

      // Style inputs directly
      var inputs = form.querySelectorAll("input, textarea");
      inputs.forEach((input) => {
        input.style.width = "90%";
        input.style.padding = "10px 12px";
        input.style.border = "1px solid #ccc";
        input.style.borderRadius = "8px";
        input.style.fontSize = "14px";
        input.style.backgroundColor = "white";
        input.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
      });

      // Style button container
      var formActions = form.querySelector(".form-actions");
      if (formActions) {
        formActions.style.display = "flex";
        formActions.style.justifyContent = "flex-start";
        formActions.style.gap = "10px";
      }

      // Style submit button directly
      var submitBtn = form.querySelector("#contact-submit");
      if (submitBtn) {
        submitBtn.style.backgroundColor = mainColor;
        submitBtn.style.color = "white";
        submitBtn.style.padding = "8px 15px";
        submitBtn.style.borderRadius = "6px";
        submitBtn.style.border = "none";
        submitBtn.style.fontWeight = "500";
        submitBtn.style.cursor = "pointer";
        submitBtn.style.minWidth = "100px";
        submitBtn.style.textAlign = "center";
      }

      // Style cancel button directly
      var cancelBtn = form.querySelector("#contact-cancel");
      if (cancelBtn) {
        cancelBtn.style.backgroundColor = "#e9e9e9";
        cancelBtn.style.color = "#555";
        cancelBtn.style.padding = "8px 15px";
        cancelBtn.style.borderRadius = "6px";
        cancelBtn.style.border = "none";
        cancelBtn.style.fontWeight = "500";
        cancelBtn.style.cursor = "pointer";
        cancelBtn.style.minWidth = "100px";
        cancelBtn.style.textAlign = "center";
      }
    }
  },

  // Set up event listeners for the form
  setupFormEventListeners: function (formContainer, interfaceType) {
    // Get form elements
    var submitButton = formContainer.querySelector("#contact-submit");
    var cancelButton = formContainer.querySelector("#contact-cancel");
    var emailInput = formContainer.querySelector("#contact-email");
    var messageInput = formContainer.querySelector("#contact-message");

    // Directly set the button color to match current interface
    if (submitButton) {
      // Get the main theme color with more aggressive checks
      let buttonColor = "#882be6"; // Default purple

      // First try getting from the current interface
      if (
        interfaceType === "voice" &&
        window.VoiceroVoice &&
        window.VoiceroVoice.websiteColor
      ) {
        buttonColor = window.VoiceroVoice.websiteColor;
      } else if (
        interfaceType === "text" &&
        window.VoiceroText &&
        window.VoiceroText.websiteColor
      ) {
        buttonColor = window.VoiceroText.websiteColor;
      }
      // If still default, try harder to get the color
      if (buttonColor === "#882be6") {
        if (window.VoiceroVoice && window.VoiceroVoice.websiteColor) {
          buttonColor = window.VoiceroVoice.websiteColor;
        } else if (window.VoiceroText && window.VoiceroText.websiteColor) {
          buttonColor = window.VoiceroText.websiteColor;
        }
        // Try to get from document style if available
        else if (
          document.documentElement.style.getPropertyValue(
            "--voicero-theme-color"
          )
        ) {
          buttonColor = document.documentElement.style.getPropertyValue(
            "--voicero-theme-color"
          );
        }
      }

      // Forcefully apply the color to the button
      submitButton.style.backgroundColor = buttonColor;

      // SUPER AGGRESSIVE APPROACH: Force the color with !important inline style
      submitButton.setAttribute(
        "style",
        `background-color: ${buttonColor} !important; color: white !important`
      );

      // Also set a timeout to apply the color again after a short delay in case it gets overridden
      setTimeout(() => {
        submitButton.setAttribute(
          "style",
          `background-color: ${buttonColor} !important; color: white !important`
        );
      }, 100);

      // And check again after the form is fully rendered
      setTimeout(() => {
        if (submitButton.style.backgroundColor !== buttonColor) {
          submitButton.setAttribute(
            "style",
            `background-color: ${buttonColor} !important; color: white !important`
          );
        }
      }, 500);
    }

    // Add submit handler
    if (submitButton) {
      submitButton.addEventListener("click", () => {
        // Basic validation
        if (!emailInput.value.trim()) {
          this.showFormError(emailInput, "Please enter your email address");
          return;
        }

        if (!this.validateEmail(emailInput.value.trim())) {
          this.showFormError(emailInput, "Please enter a valid email address");
          return;
        }

        if (!messageInput.value.trim()) {
          this.showFormError(messageInput, "Please enter your message");
          return;
        }

        // Check message length (must be at least 5 characters to match server validation)
        if (messageInput.value.trim().length < 5) {
          this.showFormError(
            messageInput,
            "Message must be at least 5 characters long"
          );
          return;
        }

        // Submit the form
        this.submitContactForm(
          emailInput.value.trim(),
          messageInput.value.trim(),
          formContainer,
          interfaceType
        );
      });
    }

    // Add cancel handler
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        // Remove the form from the chat
        formContainer.remove();

        // Add a cancellation message based on interface type
        var cancelMessage =
          "No problem! Let me know if you have any other questions.";

        if (
          interfaceType === "voice" &&
          window.VoiceroVoice &&
          window.VoiceroVoice.addMessage
        ) {
          window.VoiceroVoice.addMessage(cancelMessage, "ai");
        } else if (window.VoiceroText && window.VoiceroText.addMessage) {
          window.VoiceroText.addMessage(cancelMessage, "ai");
        }
      });
    }
  },

  // Show error for form field
  showFormError: function (inputElement, message) {
    // Remove any existing error message
    var parent = inputElement.parentElement;
    var existingError = parent.querySelector(".form-error");
    if (existingError) {
      existingError.remove();
    }

    // Add error styles to input
    inputElement.style.borderColor = "#ff3b30";

    // Create error message
    var errorDiv = document.createElement("div");
    errorDiv.className = "form-error";
    errorDiv.textContent = message;
    errorDiv.style.color = "#ff3b30";
    errorDiv.style.fontSize = "12px";
    errorDiv.style.marginTop = "4px";

    // Add error message after input
    parent.appendChild(errorDiv);

    // Focus the input
    inputElement.focus();
  },

  // Validate email format
  validateEmail: function (email) {
    var re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  },

  // Submit the contact form to the WordPress REST API
  submitContactForm: function (email, message, formContainer, interfaceType) {
    // Create submit in progress UI
    var submitButton = formContainer.querySelector("#contact-submit");
    var originalText = submitButton.textContent;
    submitButton.textContent = "Sending...";
    submitButton.disabled = true;
    submitButton.style.opacity = "0.7";

    // Create the request data
    var requestData = {
      email: email,
      message: message,
    };

    // Add threadId from the session if available
    if (window.VoiceroCore && window.VoiceroCore.session) {
      // Try to get the current thread ID - we need the 'id' property, not the 'threadId' property
      let threadId = null;

      // First check if VoiceroCore.thread is available
      if (window.VoiceroCore.thread && window.VoiceroCore.thread.id) {
        // Get the 'id' value from the thread object
        threadId = window.VoiceroCore.thread.id;
      }
      // If still not found, try to get the most recent thread from the session
      else if (
        window.VoiceroCore.session.threads &&
        window.VoiceroCore.session.threads.length > 0
      ) {
        // Sort threads by lastMessageAt or createdAt to get the most recent
        var threads = [...window.VoiceroCore.session.threads];
        var sortedThreads = threads.sort((a, b) => {
          if (a.lastMessageAt && b.lastMessageAt) {
            return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Get the most recent thread
        var thread = sortedThreads[0];

        // Use the id property (not the threadId property)
        if (thread.id) {
          threadId = thread.id;
        }
      }

      // Add threadId to request if found (must use camelCase to match the API)
      if (threadId) {
        requestData.threadId = threadId;
      }

      // Get websiteId - REQUIRED by the API
      if (window.VoiceroCore.websiteId) {
        requestData.websiteId = window.VoiceroCore.websiteId;
      } else if (window.VoiceroCore.session.websiteId) {
        requestData.websiteId = window.VoiceroCore.session.websiteId;
      } else {
        // Log error if websiteId is missing
        console.error("Contact form - Missing required websiteId");
      }
    }

    // Send the request to the WordPress REST API
    fetch("/wp-json/voicero/v1/contactHelp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })
      .then((response) => {
        if (!response.ok) {
          // Get the error details from the response
          return response
            .json()
            .then((errorData) => {
              console.error("Contact form submission error:", errorData);
              throw new Error(errorData.error || "Network response was not ok");
            })
            .catch((jsonError) => {
              // If we can't parse the JSON, use the status text
              console.error(
                "Contact form error response parsing failed:",
                jsonError
              );
              throw new Error(
                `Request failed: ${response.status} ${response.statusText}`
              );
            });
        }
        return response.json();
      })
      .then((data) => {
        // Remove the form
        formContainer.remove();

        // Show success message based on interface type
        var successMessage =
          "Thank you for your message! We've received your request and will get back to you soon.";

        if (
          interfaceType === "voice" &&
          window.VoiceroVoice &&
          window.VoiceroVoice.addMessage
        ) {
          window.VoiceroVoice.addMessage(successMessage, "ai");
        } else if (window.VoiceroText && window.VoiceroText.addMessage) {
          window.VoiceroText.addMessage(successMessage, "ai");
        }
      })
      .catch((error) => {
        // Restore button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        submitButton.style.opacity = "1";

        // Show error message
        var formActions = formContainer.querySelector(".form-actions");
        var existingError = formContainer.querySelector(".form-submit-error");

        if (existingError) {
          existingError.remove();
        }

        var errorDiv = document.createElement("div");
        errorDiv.className = "form-submit-error";
        errorDiv.textContent =
          "There was a problem sending your message. Please try again.";
        errorDiv.style.color = "#ff3b30";
        errorDiv.style.fontSize = "12px";
        errorDiv.style.marginTop = "8px";

        if (formActions) {
          formActions.parentNode.insertBefore(
            errorDiv,
            formActions.nextSibling
          );
        }
      });
  },
};

// Initialize when document is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize only if VoiceroText is available
  if (window.VoiceroText) {
    VoiceroContact.init();
  } else {
    // Wait for VoiceroText to be available
    let attempts = 0;
    var checkInterval = setInterval(() => {
      attempts++;
      if (window.VoiceroText) {
        clearInterval(checkInterval);
        VoiceroContact.init();
      } else if (attempts >= 50) {
        clearInterval(checkInterval);
        console.error("VoiceroText not available after 50 attempts");
      }
    }, 100);
  }
});

// Expose to global scope
window.VoiceroContact = VoiceroContact;
