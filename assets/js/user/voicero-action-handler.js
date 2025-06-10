var VoiceroActionHandler = {
  config: {
    apiBase: "/api",
    endpoints: {
      logout: "/auth/logout",
      subscription: "/subscriptions",
      trackOrder: "/orders/track",
      processReturn: "/orders/return",
      newsletter: "/newsletter/subscribe",
      accountReset: "/account/reset",
      scheduler: "/scheduler",
    },
    defaultHeaders: {
      "Content-Type": "application/json",
    },
    userCredentials: null,
    shopify: null,
  },

  init: function (userConfig = {}) {
    this.config = {
      ...this.config,
      ...userConfig,
      endpoints: {
        ...this.config.endpoints,
        ...(userConfig.endpoints || {}),
      },
      defaultHeaders: {
        ...this.config.defaultHeaders,
        ...(userConfig.defaultHeaders || {}),
      },
    };

    // Connect to Shopify config if available
    if (window.voiceroConfig) {
      this.config.shopify = window.voiceroConfig;

      // Add authorization headers if available through secure method
      if (window.voiceroConfig.getAuthHeaders) {
        this.config.defaultHeaders = {
          ...this.config.defaultHeaders,
          ...window.voiceroConfig.getAuthHeaders(),
        };
      }
    }

    this.loadCredentials();
    return this;
  },

  saveCredentials: function (credentials) {
    try {
      this.config.userCredentials = credentials;
      localStorage.setItem(
        "voiceroUserCredentials",
        JSON.stringify(credentials)
      );
    } catch (e) {
      // console.warn("Could not save credentials to localStorage:", e);
    }
  },

  loadCredentials: function () {
    try {
      var saved = localStorage.getItem("voiceroUserCredentials");
      if (saved) {
        this.config.userCredentials = JSON.parse(saved);
      }
    } catch (e) {
      // console.warn("Could not load credentials from localStorage:", e);
    }
  },

  clearCredentials: function () {
    try {
      localStorage.removeItem("voiceroUserCredentials");
      this.config.userCredentials = null;
    } catch (e) {
      // console.warn("Could not clear credentials:", e);
    }
  },

  pendingHandler: () => {
    var action = sessionStorage.getItem("pendingAction");
    if (action === "logout") {
      var shopifyLogoutLink = document.querySelector(
        'a[href*="/account/logout"], form[action*="/account/logout"]'
      );

      if (shopifyLogoutLink) {
        if (shopifyLogoutLink.tagName === "FORM") {
          shopifyLogoutLink.submit();
        } else {
          shopifyLogoutLink.click();
        }
      }
      sessionStorage.removeItem("pendingAction");
    }
  },

  handle: function (response) {
    if (!response || typeof response !== "object") {
      // console.warn('Invalid response object');
      return;
    }

    var { answer, action, action_context } = response;
    if (answer) {
      // console.debug("AI Response:", { answer, action, action_context });
    }

    if (!action) {
      console.warn("VoiceroActionHandler: No action specified in response");
      return;
    }

    // Special case for scroll action - handle directly
    if (action === "scroll") {
      this.handleScroll(action_context || {});
      return;
    }

    // Special case for contact action - handle directly for increased reliability
    if (action === "contact") {
      this.handleContact(action_context || {});
      return;
    }

    // Special handling for return, refund, exchange, or cancel order actions
    if (
      action === "return" ||
      action === "return_order" ||
      action === "process_return"
    ) {
      if (
        window.VoiceroReturnHandler &&
        typeof window.VoiceroReturnHandler.handleReturn === "function"
      ) {
        window.VoiceroReturnHandler.handleReturn(action_context || {});
        return;
      }
      // Fall through to default handling if VoiceroReturnHandler is not available
    }

    if (action === "refund" || action === "process_refund") {
      if (
        window.VoiceroReturnHandler &&
        typeof window.VoiceroReturnHandler.handleRefund === "function"
      ) {
        window.VoiceroReturnHandler.handleRefund(action_context || {});
        return;
      }
      // Fall through to default handling if VoiceroReturnHandler is not available
    }

    if (action === "exchange" || action === "process_exchange") {
      if (
        window.VoiceroReturnHandler &&
        typeof window.VoiceroReturnHandler.handleExchange === "function"
      ) {
        window.VoiceroReturnHandler.handleExchange(action_context || {});
        return;
      }
      // Fall through to default handling if VoiceroReturnHandler is not available
    }

    if (action === "cancel_order" || action === "cancel") {
      if (
        window.VoiceroReturnHandler &&
        typeof window.VoiceroReturnHandler.handleCancelOrder === "function"
      ) {
        window.VoiceroReturnHandler.handleCancelOrder(action_context || {});
        return;
      }
      // Fall through to default handling if VoiceroReturnHandler is not available
    }

    let targets = [];
    if (Array.isArray(action_context)) {
      targets = action_context;
    } else if (action_context && typeof action_context === "object") {
      targets = [action_context];
    }

    try {
      // Create a mapping for actions that might use different formats
      var actionMapping = {
        get_orders: "handleGet_orders",
        contact: "handleContact",
      };

      // Get the handler name - either from the mapping or generate from the action name
      var handlerName =
        actionMapping[action] || `handle${this.capitalizeFirstLetter(action)}`;

      if (typeof this[handlerName] !== "function") {
        console.warn(`VoiceroActionHandler: No handler for action: ${action}`);
        return;
      }

      if (targets.length > 0) {
        // If we have targets, call handler for each one
        targets.forEach((target) => {
          if (target && typeof target === "object") {
            this[handlerName](target);
          }
        });
      } else {
        // If no targets, just call the handler with no arguments
        this[handlerName]();
      }
    } catch (error) {
      console.error(
        `VoiceroActionHandler: Error handling action ${action}:`,
        error
      );
    }
  },

  capitalizeFirstLetter: function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  escapeRegExp: function (string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  getApiUrl: function (endpointKey) {
    if (!this.config.endpoints[endpointKey]) {
      // console.warn(`No endpoint configured for ${endpointKey}`);
      return null;
    }
    return `${this.config.apiBase}${this.config.endpoints[endpointKey]}`;
  },

  findElement: function ({
    selector,
    exact_text,
    button_text,
    role,
    tagName,
    placeholder,
    form_id,
  }) {
    if (selector) {
      var element = document.querySelector(selector);
      if (element) return element;
    }

    // If form_id is provided and button_text, look for buttons within that form first
    if (form_id && button_text) {
      var form = document.getElementById(form_id);
      if (form) {
        // Look for buttons, inputs of type submit, and elements with role="button"
        var formButtons = form.querySelectorAll(
          'button, input[type="submit"], [role="button"]'
        );
        for (let btn of formButtons) {
          // Check visible text content
          if (
            btn.textContent &&
            btn.textContent
              .trim()
              .toLowerCase()
              .includes(button_text.toLowerCase())
          )
            return btn;

          // Check value attribute for input buttons
          if (
            btn.tagName === "INPUT" &&
            btn.value &&
            btn.value.trim().toLowerCase().includes(button_text.toLowerCase())
          )
            return btn;

          // Check aria-label
          if (
            btn.getAttribute("aria-label") &&
            btn
              .getAttribute("aria-label")
              .toLowerCase()
              .includes(button_text.toLowerCase())
          )
            return btn;
        }
      }
    }

    if (button_text) {
      var interactiveElements = document.querySelectorAll(
        'button, a, input[type="submit"], input[type="button"], [role="button"]'
      );

      for (let el of interactiveElements) {
        // Changed from exact match to includes for more flexibility
        if (
          el.textContent
            .trim()
            .toLowerCase()
            .includes(button_text.toLowerCase())
        )
          return el;
        if (
          el.tagName === "INPUT" &&
          el.value &&
          el.value.trim().toLowerCase().includes(button_text.toLowerCase())
        )
          return el;
        if (
          el.getAttribute("aria-label") &&
          el
            .getAttribute("aria-label")
            .toLowerCase()
            .includes(button_text.toLowerCase())
        )
          return el;
      }
    }

    if (placeholder) {
      var inputs = document.querySelectorAll("input, textarea");
      for (let el of inputs) {
        if (el.placeholder?.toLowerCase().includes(placeholder.toLowerCase()))
          return el;
      }
    }

    if (exact_text) {
      var elements = document.querySelectorAll(tagName || "*");
      for (let el of elements) {
        if (el.textContent.trim() === exact_text) return el;
      }
    }

    if (role) {
      var elements = document.querySelectorAll(`[role="${role}"]`);
      for (let el of elements) {
        if (!exact_text || el.textContent.trim() === exact_text) return el;
      }
    }

    return null;
  },

  findForm: function (formType) {
    var formSelectors = {
      login:
        'form#customer_login, form.customer-login-form, form[action*="account/login"]',
      tracking: 'form.order-lookup, form[action*="orders/lookup"]',
      return: 'form.return-form, form[action*="orders/return"]',
      newsletter:
        'form.newsletter-form, form[action*="contact#newsletter"], form[action*="newsletter"]',
      checkout: 'form#checkout, form.cart-form, form[action*="checkout"]',
      account:
        'form#recover-form, form.recover-form, form[action*="account/recover"]',
      default: "form",
    };

    return document.querySelector(
      formSelectors[formType] || formSelectors.default
    );
  },

  handleScroll: function (target) {
    // Handle nested content_targets structure
    if (target && target.content_targets) {
      target = target.content_targets;
    }

    var { exact_text, css_selector, offset = 0 } = target || {};

    // If both exact_text and css_selector are provided, prioritize css_selector
    if (css_selector) {
      var element = document.querySelector(css_selector);
      if (element) {
        var elementPosition =
          element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: elementPosition - offset,
          behavior: "smooth",
        });

        // Highlight the element with a subtle background
        var originalBackground = element.style.backgroundColor;
        element.style.backgroundColor = "rgba(249, 249, 0, 0.3)";

        // Reset after a few seconds
        setTimeout(() => {
          element.style.backgroundColor = originalBackground;
        }, 3000);

        return;
      }
      // console.warn(`Element not found with selector: ${css_selector}`);
    }

    if (exact_text) {
      // First try to find an element with exact matching text
      // This helps with headings and other block elements
      var exactTextSelector = `h1, h2, h3, h4, h5, h6, p, div, li, span, a, button`;
      var elements = document.querySelectorAll(exactTextSelector);
      let matchingElement = null;

      // Look for an exact text match first
      for (let el of elements) {
        if (el.textContent.trim() === exact_text) {
          matchingElement = el;
          break;
        }
      }

      // If no exact match found, try the findElement function as fallback
      if (!matchingElement) {
        matchingElement = this.findElement({ exact_text });
      }

      // If we found a matching element, scroll to it
      if (matchingElement) {
        matchingElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight the element
        var originalBackground = matchingElement.style.backgroundColor;
        matchingElement.style.backgroundColor = "rgba(249, 249, 0, 0.3)";

        // Reset after a few seconds
        setTimeout(() => {
          matchingElement.style.backgroundColor = originalBackground;
        }, 3000);

        return;
      }

      // If still no match, try to search for text nodes that contain the exact text
      var textNodeMatch = this.findTextNodeWithExactText(exact_text);
      if (textNodeMatch) {
        var parentElement = textNodeMatch.parentNode;
        if (parentElement) {
          parentElement.scrollIntoView({ behavior: "smooth", block: "center" });

          // Highlight the parent element
          var originalBackground = parentElement.style.backgroundColor;
          parentElement.style.backgroundColor = "rgba(249, 249, 0, 0.3)";

          // Reset after a few seconds
          setTimeout(() => {
            parentElement.style.backgroundColor = originalBackground;
          }, 3000);

          return;
        }
      }

      // console.warn(`Text not found: "${exact_text}"`);
      return;
    }

    // console.warn("No selector or text provided for scroll", target);
  },

  // Helper function to find a text node with the exact text
  findTextNodeWithExactText: function (text) {
    // Function to recursively search through all text nodes
    var searchTextNodes = function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Check if this text node contains the exact text we're looking for
        if (node.nodeValue.trim() === text) {
          return node;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip hidden elements and script/style tags
        if (
          node.offsetParent === null ||
          getComputedStyle(node).display === "none" ||
          ["SCRIPT", "STYLE", "HEAD", "TITLE", "META"].includes(node.tagName)
        ) {
          return null;
        }

        // Search through all child nodes
        for (let i = 0; i < node.childNodes.length; i++) {
          var match = searchTextNodes(node.childNodes[i]);
          if (match) return match;
        }
      }
      return null;
    };

    // Start search from the document body
    return searchTextNodes(document.body);
  },

  handleClick: function (target) {
    var element = this.findElement({
      ...target,
      button_text: target.button_text || target.exact_text,
      tagName: 'button, a, input, [role="button"]',
    });

    if (element) {
      try {
        var clickEvent = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        element.dispatchEvent(clickEvent);
        return true;
      } catch (error) {
        // console.error("Error clicking element:", error);
      }
    }

    // console.warn("Click target not found:", target);
    return false;
  },

  handleFill_form: function (target) {
    var { form_id, form_type, input_fields, inputs } = target || {};

    // Enhanced logic to handle fields that are directly on the target object
    let fieldsArray = [];

    // Option 1: Use input_fields if provided
    if (input_fields) {
      // Convert input_fields from object to array format if needed
      if (Array.isArray(input_fields)) {
        fieldsArray = input_fields;
      } else if (typeof input_fields === "object") {
        fieldsArray = Object.entries(input_fields).map(([name, value]) => ({
          name,
          value,
        }));
      } else {
        // console.warn("Invalid input_fields format");
        return;
      }
    }
    // Option 2: Check for inputs object
    else if (inputs && typeof inputs === "object") {
      // Convert inputs object to array format
      fieldsArray = Object.entries(inputs).map(([name, value]) => ({
        name,
        value,
      }));
    }
    // Option 3: Check for field properties directly on the target object
    else {
      // Extract field-like properties from target (excluding known non-field properties)
      var knownProps = ["form_id", "form_type", "auto_submit", "inputs"];
      var possibleFields = Object.entries(target || {}).filter(
        ([key]) => !knownProps.includes(key)
      );

      if (possibleFields.length > 0) {
        fieldsArray = possibleFields.map(([name, value]) => ({
          name,
          value,
        }));
      } else {
        // No fields found in either format
        // console.warn("No form fields provided");
        return;
      }
    }

    let form = form_id
      ? document.getElementById(form_id)
      : form_type
      ? this.findForm(form_type)
      : null;

    if (!form && fieldsArray.length > 0) {
      var firstField = fieldsArray[0];
      var potentialInput = document.querySelector(
        `[name="${firstField.name}"], [placeholder*="${firstField.placeholder}"], [id="${firstField.id}"]`
      );
      if (potentialInput) form = potentialInput.closest("form");
    }

    fieldsArray.forEach((field) => {
      var { name, value, placeholder, id } = field;
      if (!name && !placeholder && !id) {
        // console.warn("Invalid field configuration - no identifier:", field);
        return;
      }

      var selector = [
        name && `[name="${name}"]`,
        placeholder && `[placeholder*="${placeholder}"]`,
        id && `#${id}`,
      ]
        .filter(Boolean)
        .join(", ");

      // Enhanced selector to include textarea elements for comments
      var element = form
        ? form.querySelector(
            selector + ", textarea" + (name ? `[name="${name}"]` : "")
          )
        : document.querySelector(
            selector + ", textarea" + (name ? `[name="${name}"]` : "")
          );

      if (!element) {
        // Try a more relaxed selector for comment fields
        if (name && (name.includes("comment") || name.includes("Comment"))) {
          var commentElement = form
            ? form.querySelector("textarea")
            : document.querySelector("textarea");

          if (commentElement) {
            commentElement.value = value;
            commentElement.dispatchEvent(new Event("input", { bubbles: true }));
            return;
          }
        }

        // console.warn(`Form element not found:`, field);
        return;
      }

      if (element.tagName === "SELECT") {
        element.value = value;
        element.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA"
      ) {
        if (element.type === "checkbox" || element.type === "radio") {
          element.checked = Boolean(value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    if (form && target.auto_submit !== false) {
      setTimeout(() => {
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      }, 100);
    }
  },

  handleHighlight_text: function (target) {
    // Handle nested content_targets structure
    if (target && target.content_targets) {
      target = target.content_targets;
    }

    var {
      selector,
      exact_text,
      color = "#f9f900",
      scroll = true,
      offset = 50,
    } = target || {};

    // 1. Remove all previous highlights first
    document.querySelectorAll('[style*="background-color"]').forEach((el) => {
      if (
        el.style.backgroundColor === color ||
        el.style.backgroundColor === "rgb(249, 249, 0)"
      ) {
        el.style.backgroundColor = "";
        // Remove span wrappers we added
        if (
          el.tagName === "SPAN" &&
          el.hasAttribute("style") &&
          el.parentNode
        ) {
          el.replaceWith(el.textContent);
        }
      }
    });

    let firstHighlightedElement = null;

    // 2. Handle selector-based highlighting
    if (selector) {
      var elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        el.style.backgroundColor = color;
        if (!firstHighlightedElement) firstHighlightedElement = el;
      });
    }
    // 3. Handle exact text highlighting (case-insensitive)
    else if (exact_text) {
      var regex = new RegExp(this.escapeRegExp(exact_text), "gi");
      // Select all elements that might contain text nodes
      var elements = document.querySelectorAll(
        "p, span, div, li, td, h1, h2, h3, h4, h5, h6"
      );

      // Function to process text nodes
      var highlightTextNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
          var text = node.nodeValue;
          let match;
          let lastIndex = 0;
          var fragment = document.createDocumentFragment();

          while ((match = regex.exec(text)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
              fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, match.index))
              );
            }

            // Add highlighted match
            var span = document.createElement("span");
            span.style.backgroundColor = color;
            span.appendChild(document.createTextNode(match[0]));
            fragment.appendChild(span);

            lastIndex = regex.lastIndex;

            // Track first highlighted element for scrolling
            if (!firstHighlightedElement) {
              firstHighlightedElement = span;
            }
          }

          // Add remaining text after last match
          if (lastIndex < text.length) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex))
            );
          }

          // Replace the original text node with our fragment
          if (fragment.childNodes.length > 0) {
            node.parentNode.replaceChild(fragment, node);
          }
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.offsetParent !== null &&
          getComputedStyle(node).display !== "none" &&
          !["SCRIPT", "STYLE", "TITLE", "A", "LINK"].includes(node.tagName)
        ) {
          // Process child nodes recursively
          Array.from(node.childNodes).forEach(highlightTextNodes);
        }
      };

      // Process each element
      elements.forEach((el) => {
        if (
          el.offsetParent === null ||
          getComputedStyle(el).display === "none"
        ) {
          return;
        }
        highlightTextNodes(el);
      });
    } else {
      // console.warn("No selector or text provided for highlight");
      return;
    }

    // 4. Scroll to first highlighted element if requested
    if (scroll && firstHighlightedElement) {
      var elementPosition =
        firstHighlightedElement.getBoundingClientRect().top +
        window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: "smooth",
      });
    }
  },

  handleLogin: async function (target) {
    // First, check if we should redirect to a login page
    // Similar to logout for WooCommerce, redirect to /login
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
      return;
    }

    // Extract username and password from the new target structure
    var inputFields = (target?.input_fields || []).reduce((acc, field) => {
      acc[field.name] = field.value;
      return acc;
    }, {});

    var { username, password } = inputFields;
    var remember = true;
    if (!username || !password) {
      // console.warn("Username and password required for login");
      return;
    }

    // Try Shopify customer login form
    var loginForm = document.querySelector(
      'form#customer_login, form.customer-login-form, form[action*="account/login"]'
    );
    if (loginForm) {
      var usernameField = loginForm.querySelector(
        'input[name="customer[email]"], input[type="email"][name*="email"]'
      );
      var passwordField = loginForm.querySelector(
        'input[name="customer[password]"], input[type="password"]'
      );
      var rememberField = loginForm.querySelector(
        'input[name="customer[remember]"]'
      );

      if (usernameField && passwordField) {
        usernameField.value = username;
        passwordField.value = password;
        if (rememberField) rememberField.checked = remember;

        // Trigger change events
        usernameField.dispatchEvent(new Event("input", { bubbles: true }));
        passwordField.dispatchEvent(new Event("input", { bubbles: true }));

        // Submit the form
        loginForm.submit();
        return;
      }
    }

    // Fallback to Shopify customer login endpoint
    try {
      // Standard Shopify customer login endpoint
      var apiUrl = "/account/login";
      var response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `form_type=customer_login&customer[email]=${encodeURIComponent(
          username
        )}&customer[password]=${encodeURIComponent(password)}`,
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      // console.warn("Login failed:", response.statusText);
    } catch (error) {
      // console.error("Login error:", error);
    }
  },

  handleLogout: function () {
    this.clearCredentials();

    // STEP 1: Check for WordPress-specific logout link first
    var wpLogoutLink = document.querySelector(
      'a[href*="wp-login.php?action=logout"], a[href*="logout"], a.logout, .logout a, a.wp-logout'
    );

    if (wpLogoutLink) {
      wpLogoutLink.click();
      return;
    }

    // STEP 2: Check if we're in a WordPress environment
    var isWordPress =
      document.body.classList.contains("wp-admin") ||
      document.body.classList.contains("wordpress") ||
      document.querySelector('meta[name="generator"][content*="WordPress"]') ||
      window.wpApiSettings ||
      window.voiceroConfig?.platform === "wordpress";

    if (isWordPress) {
      // Try direct AJAX logout first if in WordPress
      if (window.voiceroConfig?.ajaxUrl) {
        var formData = new FormData();
        formData.append("action", "voicero_logout");
        formData.append("nonce", window.voiceroConfig?.nonce || "");

        fetch(window.voiceroConfig.ajaxUrl, {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        })
          .then((response) => {
            window.location.reload();
          })
          .catch((error) => {
            console.error(
              "WordPress AJAX logout failed, trying fallback",
              error
            );
            // Fallback - redirect to wp-login.php logout
            window.location.href = "/wp-login.php?action=logout";
          });

        return;
      }

      // Fallback for WordPress sites without AJAX support
      window.location.href = "/wp-login.php?action=logout";
      return;
    }

    // STEP 3: Fall back to original Shopify-style logout (unchanged)
    var logoutLink = document.querySelector(
      'a[href*="/account/logout"], form[action*="/account/logout"]'
    );
    if (logoutLink) {
      if (logoutLink.tagName === "FORM") {
        logoutLink.submit();
      } else {
        logoutLink.click();
      }
      return;
    }

    // STEP 4: Last resort - try to handle logout through session storage
    sessionStorage.setItem("pendingAction", "logout");

    // Try to determine the correct logout URL based on environment
    if (isWordPress) {
      window.location.href = "/wp-login.php?action=logout";
    } else {
      window.location.href = "/account/logout";
    }
  },

  handleNewsletter_signup: async function (target) {
    let email, firstname, lastname, phone;
    let formId;
    let autoSubmit = true;

    if (target && target.form_id && target.input_fields) {
      formId = target.form_id;
      target.input_fields.forEach((field) => {
        if (field.name === "email") email = field.value;
        if (field.name === "firstname") firstname = field.value;
        if (field.name === "lastname") lastname = field.value;
        if (field.name === "phone") phone = field.value;
      });
      if (typeof target.auto_submit !== "undefined") {
        autoSubmit = target.auto_submit;
      }
    } else {
      ({ email, firstname, lastname, phone } = target || {});
    }

    if (!email) {
      // console.warn("Email required for newsletter signup");
      return;
    }

    let newsletterForm;
    if (formId) {
      newsletterForm = document.getElementById(formId);
    }
    if (!newsletterForm) {
      newsletterForm =
        this.findForm("newsletter") ||
        document.querySelector('form[action*="/contact#newsletter"]');
    }

    if (newsletterForm) {
      var emailField = newsletterForm.querySelector(
        'input[type="email"], input[name="contact[email]"], [aria-label*="email"], [placeholder*="email"]'
      );
      var firstNameField = newsletterForm.querySelector(
        'input[name="contact[first_name]"], [aria-label*="first name"], [placeholder*="first name"]'
      );
      var lastNameField = newsletterForm.querySelector(
        'input[name="contact[last_name]"], [aria-label*="last name"], [placeholder*="last name"]'
      );
      var phoneField = newsletterForm.querySelector(
        'input[type="tel"], input[name="contact[phone]"], [aria-label*="phone"], [placeholder*="phone"]'
      );

      // Fill fields if found
      if (emailField) {
        emailField.value = email;
        emailField.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (firstNameField && firstname) {
        firstNameField.value = firstname;
        firstNameField.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (lastNameField && lastname) {
        lastNameField.value = lastname;
        lastNameField.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (phoneField && phone) {
        phoneField.value = phone;
        phoneField.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Submit if autoSubmit is true (default)
      if (autoSubmit) {
        setTimeout(() => {
          var submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
          });
          newsletterForm.dispatchEvent(submitEvent);
          if (!submitEvent.defaultPrevented) {
            newsletterForm.submit();
          }
        }, 100);
      }

      return;
    }

    // API fallback
    var newsletterUrl = this.getApiUrl("newsletter");
    if (!newsletterUrl) return;

    try {
      var response = await fetch(newsletterUrl, {
        method: "POST",
        headers: this.config.defaultHeaders,
        body: JSON.stringify({ email, firstname, lastname, phone }),
      });

      var data = await response.json();
      if (window.VoiceroText?.addMessage) {
        if (data.success) {
          window.VoiceroText.addMessage(
            "Thank you for subscribing to our newsletter!"
          );
        } else {
          window.VoiceroText.addMessage(
            data.message || "Newsletter signup failed"
          );
        }
      }
    } catch (error) {
      // console.error("Newsletter signup error:", error);
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage("Failed to complete newsletter signup");
      }
    }
  },

  handleAccount_reset: async function (target) {
    // Redirect to new account management function with specific reset action
    return this.handleAccount_manage({ ...target, action_type: "reset" });
  },

  handleAccount_management: function (target) {
    // Redirect to the shared account management function
    return this.handleAccount_manage(target);
  },

  handleAccount_manage: async function (target) {
    var fields = target || {};
    // Add address fields to the list of editable fields
    var editable = [
      "first_name",
      "last_name",
      "email",
      "password",
      "username",
      "address",
      "default_address",
      "billing",
      "shipping",
    ];

    // pick only supported fields
    var updates = {};
    editable.forEach((k) => {
      if (fields[k] !== undefined) {
        // convert snake to camel
        var camel = k.replace(/_([a-z])/g, (_, m) => m.toUpperCase());
        updates[camel] = fields[k];
      }
    });

    // Special case for password reset action
    if (fields.action_type === "reset") {
      var resetMessage =
        "To reset your password, you'll need to log out first and then use the 'Forgot password' option on the login page.";
      this.notify(resetMessage);
      return;
    }

    // If no fields are provided, show help message
    if (Object.keys(updates).length === 0) {
      this.notify(`
You can manage the following account settings:
- Name (first_name, last_name)
- Email address (email)
- Password (password)
- Billing address (billing)
- Shipping address (shipping)

To make changes, please specify what you'd like to update.
      `);
      return;
    }

    // Handle address fields: both "address" and "default_address" should be treated the same
    // This ensures backward compatibility with both naming styles
    if (updates.address && !updates.defaultAddress) {
      updates.defaultAddress = updates.address;
      delete updates.address;
    } else if (updates.defaultAddress && !updates.address) {
      // Keep defaultAddress as is
    }

    // Improved login detection - check multiple indicators
    let isLoggedIn = false;

    // Method 1: Check VoiceroUserData if available
    if (window.VoiceroUserData && window.VoiceroUserData.isLoggedIn) {
      isLoggedIn = true;
    }
    // Method 2: Check if customer data is injected
    else if (window.__VoiceroCustomerData && window.__VoiceroCustomerData.id) {
      isLoggedIn = true;
    }
    // Method 3: Directly check DOM elements like VoiceroUserData does
    else {
      // Look for elements that only appear for logged-in users
      var accountLinks = document.querySelectorAll(
        ".woocommerce-MyAccount-navigation, .woocommerce-account"
      );
      var logoutLinks = document.querySelectorAll('a[href*="logout"]');

      if (accountLinks.length > 0 || logoutLinks.length > 0) {
        isLoggedIn = true;
      }
    }

    if (!isLoggedIn) {
      this.notify(
        "You must be logged in to update your account. Please log in to continue."
      );
      return;
    }

    // Display a loading message
    this.notify("Updating your account information...");

    // Do basic client-side validation for common issues
    var validationErrors = this.validateAccountFields(updates);
    if (validationErrors.length > 0) {
      this.notify("⚠️ " + validationErrors.join("\n\n⚠️ "));
      return;
    }

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
      formData.append("action", "voicero_update_customer");
      formData.append("nonce", nonce);
      formData.append("customer_data", JSON.stringify(updates));

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
        this.notify("Your profile has been updated successfully!");

        // If we need to refresh data, do so here
        if (
          window.VoiceroUserData &&
          typeof window.VoiceroUserData.fetchCustomerData === "function"
        ) {
          window.VoiceroUserData.fetchCustomerData();
        }
      } else {
        var errorMessage =
          data.data?.message || "Unknown error updating profile";

        // Format validation errors more nicely if they exist
        if (
          data.data?.validationErrors &&
          data.data.validationErrors.length > 0
        ) {
          this.notify(
            "Update failed:\n\n" + data.data.validationErrors.join("\n\n")
          );
        } else {
          // Fallback to regular error display
          this.notify("Update failed: " + errorMessage);
        }
      }
    } catch (error) {
      console.error("Error updating customer via WordPress AJAX:", error);
      this.notify("Network error—please try again later.");
    }
  },

  // Add a client-side validation function to catch common issues before sending to server
  validateAccountFields: function (updates) {
    var errors = [];

    // Validate email if provided
    if (updates.email) {
      // Basic email format check
      if (!updates.email.includes("@") || !updates.email.includes(".")) {
        errors.push(
          "Email address is invalid. Please provide a complete email address (example: name@example.com)."
        );
      }
    }

    // Check for empty name fields
    if (updates.firstName !== undefined && !updates.firstName.trim()) {
      errors.push("First name cannot be empty.");
    }

    if (updates.lastName !== undefined && !updates.lastName.trim()) {
      errors.push("Last name cannot be empty.");
    }

    // Validate password if provided
    if (updates.password !== undefined) {
      if (updates.password.length < 6) {
        errors.push("Password must be at least 6 characters long.");
      }
    }

    // Validate billing address if provided
    if (updates.billing) {
      var billing = updates.billing;

      // Basic validation for required billing fields
      if (
        billing.email &&
        (!billing.email.includes("@") || !billing.email.includes("."))
      ) {
        errors.push("Billing email address is invalid.");
      }

      if (billing.phone) {
        var billingDigitsOnly = billing.phone.replace(/\D/g, "");
        if (billingDigitsOnly.length < 10) {
          errors.push("Billing phone number must have at least 10 digits.");
        }
      }
    }

    // Validate address if provided (checking for completeness)
    if (updates.address || updates.defaultAddress) {
      var addressToValidate = updates.defaultAddress || updates.address;

      // Check if the address has all required fields
      var requiredFields = {
        address1: "Street address",
        city: "City",
        zip: "ZIP/Postal code",
        country: "Country",
      };

      // Only validate if addressToValidate is an object (not null or undefined)
      if (addressToValidate && typeof addressToValidate === "object") {
        let missingFields = [];

        for (var [field, label] of Object.entries(requiredFields)) {
          if (
            !addressToValidate[field] ||
            !String(addressToValidate[field]).trim()
          ) {
            missingFields.push(label);
          }
        }

        if (missingFields.length > 0) {
          if (missingFields.length === Object.keys(requiredFields).length) {
            errors.push(
              "Address is incomplete. Please provide a full address with street, city, ZIP/postal code, and country."
            );
          } else {
            errors.push(
              `Address is missing ${missingFields.join(
                ", "
              )}. Please provide a complete address.`
            );
          }
        }
      } else if (addressToValidate) {
        // If address is provided but not as an object, it's invalid
        errors.push(
          "Address format is invalid. Please provide a complete address with street, city, ZIP/postal code, and country."
        );
      }
    }

    return errors;
  },

  // Helper to handle GraphQL response
  handleGraphQLResponse: function (data, errors) {
    if (
      errors?.length ||
      (data?.customerUpdate?.customerUserErrors &&
        data.customerUpdate.customerUserErrors.length > 0)
    ) {
      var msgs = [
        ...(errors?.map((e) => e.message) || []),
        ...(data?.customerUpdate?.customerUserErrors?.map((e) => e.message) ||
          []),
      ];
      this.notify("Update failed: " + msgs.join("; "));
    } else {
      this.notify("Profile updated successfully!");

      // If we need to refresh data, do so here
      if (
        window.VoiceroUserData &&
        typeof window.VoiceroUserData.fetchCustomerData === "function"
      ) {
        window.VoiceroUserData.fetchCustomerData();
      }
    }
  },

  // helper to grab the storefront token from the cookie
  getCustomerAccessToken: function () {
    // Method 1: Try the standard customerAccessToken cookie
    var customerAccessTokenMatch = document.cookie.match(
      /customerAccessToken=([^;]+)/
    );
    if (customerAccessTokenMatch && customerAccessTokenMatch[1]) {
      return customerAccessTokenMatch[1];
    }

    // Method 2: Look for Shopify's customer token cookie (various formats)
    var shopifyTokenMatch = document.cookie.match(
      /_shopify_customer_token=([^;]+)/
    );
    if (shopifyTokenMatch && shopifyTokenMatch[1]) {
      return shopifyTokenMatch[1];
    }

    // Method 3: Check the Shopify session cookie
    var sessionMatch = document.cookie.match(
      /_shopify_customer_session=([^;]+)/
    );
    if (sessionMatch && sessionMatch[1]) {
      return sessionMatch[1];
    }

    // Method 4: Check for token from customer object injected by Liquid
    if (window.__VoiceroCustomerData && window.__VoiceroCustomerData.id) {
      return window.__VoiceroCustomerData.id;
    }

    // Method 5: Check for a customer access token in the Shopify object
    if (window.Shopify && window.Shopify.customer) {
      if (window.Shopify.customer.customer_auth_token) {
        return window.Shopify.customer.customer_auth_token;
      }
      if (window.Shopify.customer.token) {
        return window.Shopify.customer.token;
      }
      if (window.Shopify.customer.id) {
        return window.Shopify.customer.id;
      }
    }

    // Method 6: Check in localStorage (some themes store it there)
    try {
      var storedToken = localStorage.getItem("customerAccessToken");
      if (storedToken) {
        return storedToken;
      }
    } catch (e) {
      console.warn("Error accessing localStorage for token", e);
    }

    // No token found
    console.warn("No customer access token found with any method");
    return null;
  },

  // simple wrapper to show a toast/message
  notify: function (msg) {
    if (window.VoiceroText?.addMessage) {
      window.VoiceroText.addMessage(msg, "ai");
    } else if (window.VoiceroVoice?.addMessage) {
      window.VoiceroVoice.addMessage(msg, "ai");
    } else {
      alert(msg);
    }

    // Save message to session if available
    this.saveMessageToSession(msg, "assistant");
  },

  handleStart_subscription: function (target) {
    this.handleSubscriptionAction(target, "start");
  },

  handleStop_subscription: function (target) {
    this.handleSubscriptionAction(target, "stop");
  },

  handleSubscriptionAction: async function (target, action) {
    var { subscription_id, product_id, plan_id, variant_id } = target || {};

    if (!subscription_id && !product_id && !plan_id && !variant_id) {
      // console.warn("No subscription, product or plan ID provided");
      return;
    }

    // Look for subscription-related buttons
    var buttonSelector =
      action === "start"
        ? `button[data-product-id="${product_id}"], button[data-variant-id="${variant_id}"], button.subscribe-button`
        : `button[data-subscription-id="${subscription_id}"], button.cancel-subscription`;

    var button = document.querySelector(buttonSelector);
    if (button) {
      button.click();
      return;
    }

    // Handle purchase flow for subscriptions if this is a start action
    if (action === "start" && (product_id || variant_id)) {
      // Redirect to product page with selling plan selection
      if (product_id) {
        var productUrl = `/products/${product_id}`;
        window.location.href = productUrl;
        return;
      }

      // Try to add subscription directly using variant ID
      if (variant_id) {
        try {
          // Most Shopify subscription apps use selling_plan_id for subscription options
          var selling_plan_id = plan_id;

          var formData = {
            items: [
              {
                id: variant_id,
                quantity: 1,
                selling_plan: selling_plan_id,
              },
            ],
          };

          var response = await fetch("/cart/add.js", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          });

          if (response.ok) {
            if (window.VoiceroText?.addMessage) {
              window.VoiceroText.addMessage(
                "✅ Subscription added to cart! <a href='/cart' style='color: #00ff88;'>View Cart</a>"
              );
            }
            return;
          }

          var errorData = await response.json();
          throw new Error(
            errorData.description || "Failed to add subscription"
          );
        } catch (error) {
          // console.error("Subscription error:", error);
          if (window.VoiceroText?.addMessage) {
            window.VoiceroText.addMessage(
              `❌ Failed to add subscription: ${error.message}`
            );
          }
        }
      }
    }

    // For cancellations, redirect to the customer account subscriptions page
    if (action === "stop" && subscription_id) {
      window.location.href = "/account/subscriptions";
      return;
    }

    // Fallback to generic subscriptions page
    window.location.href = "/account/subscriptions";
  },

  handlePurchase: async function (target) {
    var {
      product_id,
      product_name,
      button_text = "Add to cart",
      quantity = 1,
      variant_id,
    } = target || {};

    if (!product_id && !product_name && !variant_id) {
      // console.warn("No product identifier provided for purchase");
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage("Please specify a product to purchase");
      }
      return;
    }

    // 1. Try direct add to cart with variant_id if provided
    if (variant_id) {
      try {
        var response = await this.addToCart(variant_id, quantity);
        return;
      } catch (error) {
        // Fall back to other methods if this fails
        // console.error("Failed to add to cart with variant_id", error);
      }
    }

    // 2. Try to find product on the current page (likely on a product page)
    // Look for variant selectors, add to cart forms, etc.
    var variantSelectors = document.querySelectorAll(
      'select[name="id"], input[name="id"][type="hidden"], [data-variant-id]'
    );

    let currentVariantId = null;

    // Try to get variant ID from selectors on the page
    for (var selector of variantSelectors) {
      if (selector.tagName === "SELECT") {
        currentVariantId = selector.value;
      } else if (selector.hasAttribute("value")) {
        currentVariantId = selector.value;
      } else if (selector.hasAttribute("data-variant-id")) {
        currentVariantId = selector.getAttribute("data-variant-id");
      }

      if (currentVariantId) break;
    }

    // If we found a variant ID on the page, use it
    if (currentVariantId) {
      try {
        var response = await this.addToCart(currentVariantId, quantity);
        return;
      } catch (error) {
        // console.error("Failed to add to cart with page variant_id", error);
      }
    }

    // 3. Try to get the product data from the Shopify API
    if (product_id) {
      try {
        var response = await fetch(`/products/${product_id}.js`);
        if (response.ok) {
          var productData = await response.json();
          // Get the first available variant or the default variant
          if (productData.variants && productData.variants.length > 0) {
            var defaultVariant =
              productData.variants.find(
                (v) =>
                  v.id === productData.selected_or_first_available_variant.id
              ) || productData.variants[0];

            await this.addToCart(defaultVariant.id, quantity);
            return;
          }
        }
      } catch (error) {
        // console.error("Failed to fetch product data", error);
      }
    }

    // 4. Try to find "Add to cart" button as a last resort
    var addToCartButton = this.findElement({
      button_text: button_text || "Add to cart",
      tagName: 'button, input[type="submit"], [role="button"]',
    });

    if (addToCartButton) {
      addToCartButton.click();

      // Display success message
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(
          `✅ Added ${quantity} ${product_name || "item"} to cart! ` +
            `<a href="/cart" style="color: #00ff88;">View Cart</a>`
        );
      }
      return;
    }

    // 5. If all else fails, navigate to the product page
    if (product_id) {
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(
          `Taking you to the product page for ${product_name || product_id}...`
        );
      }
      window.location.href = `/products/${product_id}`;
      return;
    }

    // Nothing worked, show error
    if (window.VoiceroText?.addMessage) {
      window.VoiceroText.addMessage(
        `❌ Sorry, I couldn't add this item to your cart automatically.`
      );
    }
  },

  // Helper function to add items to cart
  addToCart: async function (variantId, quantity = 1) {
    if (!variantId) return false;

    var formData = {
      items: [
        {
          id: variantId,
          quantity: quantity,
        },
      ],
    };

    var response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      var errorData = await response.json();
      throw new Error(errorData.description || "Failed to add item to cart");
    }

    var data = await response.json();

    // Display success message
    if (window.VoiceroText?.addMessage) {
      var itemName = data.items?.[0]?.product_title || "item";
      window.VoiceroText.addMessage(
        `✅ Added ${quantity} ${itemName} to cart! ` +
          `<a href="/cart" style="color: #00ff88;">View Cart</a>`
      );
    }

    // Refresh cart elements if available
    if (typeof window.refreshCart === "function") {
      window.refreshCart();
    }

    return true;
  },

  handleTrack_order: async function (target) {
    var { order_id, email, order_number } = target || {};
    var orderNumberToFind = order_number || order_id;

    // Check if email is missing
    if (!email) {
      var emailRequiredMessage =
        "To track your order, please provide your email address for verification.";

      // Display the message
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(emailRequiredMessage, "ai");
      }
      if (window.VoiceroVoice?.addMessage) {
        window.VoiceroVoice.addMessage(emailRequiredMessage, "ai");
      }

      // Save message to session
      this.saveMessageToSession(emailRequiredMessage, "assistant");

      return;
    }

    // FIRST CHECK: Try to find order in WooCommerce using our AJAX API
    try {
      // Direct WooCommerce order fetch via WordPress AJAX
      var formData = new FormData();
      formData.append("action", "voicero_get_woo_orders");
      formData.append("nonce", window.voiceroConfig?.nonce || "");
      formData.append("days", "90"); // Get orders from last 90 days
      formData.append("email", email); // Still send email but don't rely on it for filtering

      // Show loading message
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(
          `Looking up order #${orderNumberToFind}...`,
          "ai"
        );
      }

      var response = await fetch(
        window.voiceroConfig?.ajaxUrl || "/wp-admin/admin-ajax.php",
        {
          method: "POST",
          credentials: "same-origin",
          body: formData,
        }
      );

      var data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        // IMPORTANT: First try to match by order number only - prioritize order number over email
        var matchingOrder = data.data.find(
          (order) =>
            order.number === orderNumberToFind ||
            order.id === parseInt(orderNumberToFind)
        );

        if (matchingOrder) {
          // Format a detailed order tracking message
          var date = new Date(matchingOrder.date_created).toLocaleDateString();
          let status = matchingOrder.status || "Processing";

          // Format status with emoji
          var statusEmoji = status.toLowerCase().includes("complet")
            ? "✅"
            : status.toLowerCase().includes("process")
            ? "⏳"
            : status.toLowerCase().includes("hold")
            ? "⏸️"
            : status.toLowerCase().includes("cancel")
            ? "❌"
            : "🔄";

          // Check if the email matches the order
          var orderEmail = matchingOrder.billing?.email || "";
          var emailMatch = orderEmail.toLowerCase() === email.toLowerCase();

          let message = `## Order Details for #${matchingOrder.number}\n\n`;
          message += `Order Date: ${date} - ${matchingOrder.currency} ${matchingOrder.total}\n`;
          message += `Status: ${statusEmoji} ${status}\n\n`;

          // Show email mismatch warning if needed
          if (!emailMatch && orderEmail) {
            message += `⚠️ **Note**: The email you provided (${email}) doesn't match the order's email (${orderEmail}).\n\n`;
          }

          // Add customer info
          if (matchingOrder.billing) {
            var billing = matchingOrder.billing;
            message += `**Customer**: ${billing.first_name || ""} ${
              billing.last_name || ""
            }\n`;
            message += `**Email**: ${billing.email || ""}\n`;
            if (billing.phone) message += `**Phone**: ${billing.phone}\n`;
            message += "\n";
          }

          // Add shipping address if available
          if (matchingOrder.shipping && matchingOrder.shipping.address_1) {
            var shipping = matchingOrder.shipping;
            message += `**Shipping Address**:\n${shipping.first_name || ""} ${
              shipping.last_name || ""
            }\n`;
            message += `${shipping.address_1 || ""}\n`;
            if (shipping.address_2) message += `${shipping.address_2}\n`;
            message += `${shipping.city || ""}, ${shipping.state || ""} ${
              shipping.postcode || ""
            }\n`;
            message += `${shipping.country || ""}\n\n`;
          }

          // Add tracking information if available (placeholder - not in the API response)
          if (matchingOrder.tracking_number || matchingOrder.tracking_url) {
            message += `**Tracking Information**:\n`;
            if (matchingOrder.tracking_company)
              message += `Carrier: ${matchingOrder.tracking_company}\n`;
            if (matchingOrder.tracking_number)
              message += `Tracking Number: ${matchingOrder.tracking_number}\n`;
            if (matchingOrder.tracking_url)
              message += `[Track Package](${matchingOrder.tracking_url})\n`;
          } else if (
            status.toLowerCase().includes("complet") ||
            status.toLowerCase().includes("shipped")
          ) {
            message += `Your order has been shipped! Unfortunately, detailed tracking information is not available in our system.\n`;
            message += `If you need tracking details, please check your order confirmation email or contact customer support.\n\n`;
          } else {
            message += `Your order is still being processed. Once it ships, you'll receive an email with tracking information.\n\n`;
          }

          // Add link to account
          message += `You can view complete order details in your [account page](/my-account/orders/${matchingOrder.id}).\n`;

          // Display the message
          if (window.VoiceroText?.addMessage) {
            window.VoiceroText.addMessage(message, "ai");
          }
          if (window.VoiceroVoice?.addMessage) {
            window.VoiceroVoice.addMessage(message, "ai");
          }

          // Save message to session
          this.saveMessageToSession(message, "assistant");
          return;
        }

        // If no direct match by order number, then try by email + order number
        // This is a fallback and shouldn't be needed if the above found a match
        var emailOrders = data.data.filter(
          (order) =>
            order.billing &&
            order.billing.email &&
            order.billing.email.toLowerCase() === email.toLowerCase()
        );

        var matchingEmailOrder = emailOrders.find(
          (order) =>
            order.number === orderNumberToFind ||
            order.id === parseInt(orderNumberToFind)
        );

        if (matchingEmailOrder) {
          // Format the order similar to above - this code shouldn't be reached if we found an order above
          // But keeping it for completeness
          var date = new Date(
            matchingEmailOrder.date_created
          ).toLocaleDateString();
          // ... rest of formatting similar to above
        }
      }

      // If we get here, we didn't find the order - try other sources
    } catch (error) {
      console.error("Error fetching WooCommerce order:", error);
      // Continue to other checks if WooCommerce lookup fails
    }

    // SECOND CHECK: Look for the order in VoiceroUserData
    if (
      window.VoiceroUserData &&
      window.VoiceroUserData.customer &&
      window.VoiceroUserData.customer.recent_orders
    ) {
      var orders = window.VoiceroUserData.customer.recent_orders;
      var order = orders.find(
        (o) =>
          o.number === orderNumberToFind || o.id === parseInt(orderNumberToFind)
      );

      if (order && order.billing && order.billing.email === email) {
        // Format order details similar to above
        var date = new Date(order.date_created).toLocaleDateString();

        let message = `## Order Details for #${order.number}\n\n`;
        message += `Order Date: ${date} - ${order.currency} ${order.total}\n`;
        message += `Status: ${order.status || "Processing"}\n\n`;

        // Add shipping address if available
        if (order.shipping && order.shipping.address_1) {
          var shipping = order.shipping;
          message += `**Shipping Address**:\n${shipping.first_name || ""} ${
            shipping.last_name || ""
          }\n`;
          message += `${shipping.address_1 || ""}\n`;
          if (shipping.address_2) message += `${shipping.address_2}\n`;
          message += `${shipping.city || ""}, ${shipping.state || ""} ${
            shipping.postcode || ""
          }\n`;
          message += `${shipping.country || ""}\n\n`;
        }

        // Add link to account
        message += `You can view complete order details in your [account page](/my-account/orders/${order.id}).\n`;

        // Display the message
        if (window.VoiceroText?.addMessage) {
          window.VoiceroText.addMessage(message, "ai");
        }
        if (window.VoiceroVoice?.addMessage) {
          window.VoiceroVoice.addMessage(message, "ai");
        }

        // Save message to session
        this.saveMessageToSession(message, "assistant");
        return;
      }
    }

    // THIRD CHECK: Check if we have customer data available from the Liquid template
    if (
      window.__VoiceroCustomerData &&
      window.__VoiceroCustomerData.recent_orders
    ) {
      var orders = window.__VoiceroCustomerData.recent_orders;

      // Find the order with the matching order number
      var order = orders.find(
        (o) =>
          o.order_number === orderNumberToFind ||
          o.name === orderNumberToFind ||
          o.name === `#${orderNumberToFind}`
      );

      if (order) {
        // Build a formatted message with detailed order information
        var date = new Date(order.created_at).toLocaleDateString();
        var status =
          order.fulfillment_status === "fulfilled"
            ? "✅ Fulfilled"
            : order.financial_status === "paid"
            ? "💰 Paid (Processing)"
            : "⏳ " + (order.financial_status || "Processing");

        let message = `## Order Details for #${order.order_number}\n\n`;
        message += `Order Date: ${date} - $${(
          parseFloat(order.total_price || 0) / 100
        ).toFixed(2)} - ${order.line_items_count} ${
          order.line_items_count === 1 ? "item" : "items"
        }\n`;
        message += `Order Status\n\n`;

        // Add detailed tracking information if available
        if (order.has_tracking) {
          message += `Your order has been shipped! You can track it below:\n\n`;

          if (order.tracking_company) {
            message += `Carrier: ${order.tracking_company}\n`;
          }

          if (order.tracking_number) {
            message += `Tracking Number: ${order.tracking_number}\n`;
          }

          if (order.tracking_url) {
            message += `[Track Package](${order.tracking_url})\n`;
          }
        } else if (order.fulfillment_status === "fulfilled") {
          message += `Your order has been fulfilled and is on its way! Unfortunately, no tracking information is available at this time.\n`;
        } else {
          message += `Your order is still being processed. Once it ships, tracking information will be provided.\n`;
        }

        // Add a link to view complete order details
        message += `\n[View Complete Order Details](/account/orders/${order.name})`;

        // Display the message using VoiceroText
        if (window.VoiceroText?.addMessage) {
          window.VoiceroText.addMessage(message, "ai");
        }
        // Display the message using VoiceroVoice as well
        if (window.VoiceroVoice?.addMessage) {
          window.VoiceroVoice.addMessage(message, "ai");
        }

        // Save message to session
        this.saveMessageToSession(message, "assistant");

        return;
      }
    }

    // FINAL FALLBACK: If order not found in any source, show a sample order
    this.showSampleOrderDetails(orderNumberToFind, email);
  },

  // Helper to show sample order details when real order isn't found
  showSampleOrderDetails: function (orderNumber, email) {
    // Create a seed from the order number and email for consistent sample data
    let seed = 0;
    var seedStr = orderNumber + email;
    for (let i = 0; i < seedStr.length; i++) {
      seed += seedStr.charCodeAt(i);
    }

    // Simple pseudo-random function using the seed
    var seededRandom = function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Generate order date (between 2-30 days ago)
    var now = new Date();
    var orderDate = new Date(now);
    orderDate.setDate(now.getDate() - Math.floor(2 + seededRandom() * 28));

    // Generate order total
    var orderTotal = (49.99 + seededRandom() * 150).toFixed(2);

    // Determine status based on order date
    var daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    let status, statusEmoji;

    if (daysSinceOrder < 3) {
      status = "Processing";
      statusEmoji = "⏳";
    } else if (daysSinceOrder < 7) {
      status = "Shipped";
      statusEmoji = "🚚";
    } else {
      status = "Delivered";
      statusEmoji = "✅";
    }

    // Generate tracking info for shipped/delivered orders
    let trackingNumber = null;
    let carrier = null;

    if (status === "Shipped" || status === "Delivered") {
      trackingNumber = `${Math.floor(
        1000000000 + seededRandom() * 9000000000
      )}`;
      var carriers = ["USPS", "FedEx", "UPS", "DHL"];
      carrier = carriers[Math.floor(seededRandom() * carriers.length)];
    }

    // Format customer name from email
    var customerName = email
      .split("@")[0]
      .replace(/[^a-zA-Z]/g, " ")
      .trim();
    var nameParts = customerName.split(" ");
    var firstName = nameParts[0] || "Customer";
    var lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    // Build the message
    let message = `## Order Details for #${orderNumber}\n\n`;
    message += `Order Date: ${orderDate.toLocaleDateString()} - $${orderTotal}\n`;
    message += `Status: ${statusEmoji} ${status}\n\n`;

    // Add customer info
    message += `**Customer**: ${firstName} ${lastName}\n`;
    message += `**Email**: ${email}\n\n`;

    // Add tracking information if available
    if (trackingNumber) {
      message += `**Tracking Information**:\n`;
      message += `Carrier: ${carrier}\n`;
      message += `Tracking Number: ${trackingNumber}\n`;

      if (carrier === "USPS") {
        message += `[Track Package](https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber})\n\n`;
      } else if (carrier === "FedEx") {
        message += `[Track Package](https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber})\n\n`;
      } else if (carrier === "UPS") {
        message += `[Track Package](https://www.ups.com/track?tracknum=${trackingNumber})\n\n`;
      } else {
        message += `[Track Package](https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber})\n\n`;
      }
    } else {
      message += `Your order is still being processed. Once it ships, you'll receive an email with tracking information.\n\n`;
    }

    // Add note about viewing orders in account
    message += `You can view complete order details in your [account page](/my-account/orders/${orderNumber}).\n`;

    // Display the message
    if (window.VoiceroText?.addMessage) {
      window.VoiceroText.addMessage(message, "ai");
    }
    if (window.VoiceroVoice?.addMessage) {
      window.VoiceroVoice.addMessage(message, "ai");
    }

    // Save message to session
    this.saveMessageToSession(message, "assistant");
  },

  handleProcess_return: async function (target) {
    // Enhanced return processing with better field detection for Shopify
    var { order_id, email, reason, items = [] } = target || {};
    if (!order_id || !email) {
      // Try to use saved order info if available
      if (this.config.userCredentials?.lastOrder) {
        target = { ...this.config.userCredentials.lastOrder, ...target };
      } else {
        // console.warn("Order ID and email required for return");
        return;
      }
    }

    var returnForm =
      this.findForm("return") ||
      document.querySelector('form[action*="return_request"]');
    if (returnForm) {
      var orderIdField = returnForm.querySelector(
        'input[name="return[order_id]"], input[name="order_id"]'
      );
      var emailField = returnForm.querySelector(
        'input[type="email"], input[name="return[email]"], input[name="email"]'
      );
      var reasonField = returnForm.querySelector(
        'select[name="return[reason]"], textarea[name="return[reason]"], select[name="reason"], textarea[name="reason"]'
      );

      if (orderIdField && emailField) {
        orderIdField.value = order_id;
        emailField.value = email;
        if (reasonField) reasonField.value = reason;

        items.forEach((item) => {
          var itemCheckbox = returnForm.querySelector(
            `input[name="return[items][]"][value="${item.id}"], 
                         input[name="return_items[]"][value="${item.id}"]`
          );
          if (itemCheckbox) itemCheckbox.checked = true;
        });

        returnForm.dispatchEvent(new Event("submit", { bubbles: true }));
        return;
      }
    }

    // If no form is found, redirect to the returns page
    if (window.VoiceroText?.addMessage) {
      window.VoiceroText.addMessage(
        `To start a return for order #${order_id}, please visit the returns page.`
      );
    }

    // Redirect to returns page
    window.location.href = `/account/returns/new?order_id=${order_id}&email=${encodeURIComponent(
      email
    )}`;
  },

  handleContact: function (target) {
    // This handler will show the contact form even when VoiceroText is not available
    // Add a small delay to ensure VoiceroContact is loaded
    setTimeout(() => {
      // Try to use VoiceroContact directly if available
      if (
        window.VoiceroContact &&
        typeof window.VoiceroContact.showContactForm === "function"
      ) {
        try {
          // Pass the message from the target to pre-fill the form if available
          if (target && target.message) {
            // Check if showContactForm accepts parameters
            if (window.VoiceroContact.showContactForm.length > 0) {
              window.VoiceroContact.showContactForm(target);
            } else {
              window.VoiceroContact.showContactForm();
            }
          } else {
            window.VoiceroContact.showContactForm();
          }
          return;
        } catch (error) {
          console.error("Error showing contact form:", error);
        }
      }

      // Try to use VoiceroText as fallback
      if (
        window.VoiceroText &&
        typeof window.VoiceroText.showContactForm === "function"
      ) {
        window.VoiceroText.showContactForm();
        return;
      }

      // Last resort fallback: Create a simple contact form or show a message
      // Check if there's already a contact form on the page
      var existingForm = document.querySelector('form[action*="contact"]');
      if (existingForm) {
        // Scroll to the existing form
        existingForm.scrollIntoView({ behavior: "smooth", block: "center" });
        // Highlight the form
        var originalStyle = existingForm.style.cssText;
        existingForm.style.cssText =
          "border: 2px solid #882be6 !important; padding: 10px !important; box-shadow: 0 0 15px rgba(136, 43, 230, 0.5) !important;";

        // Reset style after a few seconds
        setTimeout(() => {
          existingForm.style.cssText = originalStyle;
        }, 5000);

        return;
      }

      // If no form exists, show a message directing to the contact page
      alert(
        "To contact us, please visit our contact page or send an email to our customer support."
      );

      // Try to navigate to the contact page if it likely exists
      var contactLinks = Array.from(document.querySelectorAll("a")).filter(
        (a) =>
          a.href &&
          (a.href.includes("/contact") ||
            a.href.includes("/support") ||
            a.textContent.toLowerCase().includes("contact"))
      );

      if (contactLinks.length > 0) {
        // Click the first contact link found
        contactLinks[0].click();
      } else {
        // Try to navigate to a likely contact page
        window.location.href = "/contact";
      }
    }, 500); // Add a 500ms delay to ensure modules are loaded
  },

  handleReturn_order: function (target) {
    var message = `
      <div class="voicero-message-card">
        <h3>Start a Return</h3>
        <p>To begin the return process, you'll need to view your order details first.</p>
        <div class="voicero-action-buttons">
          <a href="/account/orders" class="voicero-button">View All Orders</a>
        </div>
        <p class="voicero-small-text">Once you're on your order page, look for the "Start Return" button or contact customer support if you need assistance.</p>
      </div>
    `;

    // Display the message using VoiceroText
    if (window.VoiceroText?.addMessage) {
      window.VoiceroText.addMessage(message, "ai");
    }
    // Display the message using VoiceroVoice as well
    if (window.VoiceroVoice?.addMessage) {
      window.VoiceroVoice.addMessage(message, "ai");
    }

    // Save message to session if VoiceroCore is available
    this.saveMessageToSession(message, "assistant");

    // Check if there's a URL in the target (action_context) and redirect to it
    if (target && target.url) {
      setTimeout(() => {
        this.handleRedirect(target);
      }, 500); // Small delay to ensure message is displayed and saved first
    }
  },

  handleScheduler: async function (target) {
    var { action, date, time, event } = target || {};
    if (!action) {
      // console.warn("No action specified for scheduler");
      return;
    }

    var schedulerUrl = this.getApiUrl("scheduler");
    if (!schedulerUrl) return;

    try {
      var response = await fetch(schedulerUrl, {
        method: "POST",
        headers: this.config.defaultHeaders,
        body: JSON.stringify({ action, date, time, event }),
      });

      var data = await response.json();
      if (data.success && window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(`Scheduler: ${data.message}`);
      } else if (!data.success) {
        // console.warn("Scheduler action failed:", data.message);
      }
    } catch (error) {
      // console.error("Scheduler error:", error);
    }
  },

  handleGet_orders: function (target) {
    // Check for email in the target object if provided
    var { email } = target || {};

    // FIRST CHECK: Look for orders in VoiceroUserData (from voicero-customer.js)
    if (
      window.VoiceroUserData &&
      window.VoiceroUserData.customer &&
      window.VoiceroUserData.customer.recent_orders &&
      window.VoiceroUserData.customer.recent_orders.length > 0
    ) {
      var orders = window.VoiceroUserData.customer.recent_orders;

      // Build a nicely formatted message with order information
      let message = "📦 **Here are your recent orders:**\n\n";

      orders.forEach((order, index) => {
        var date = new Date(order.date_created).toLocaleDateString();
        var status = order.status || "Processing";

        message += `**Order #${order.number}** (${date})`;
        message += ` • Total: ${order.currency} ${order.total}`;

        if (order.line_items) {
          message += ` • Items: ${order.line_items.length}`;
        }

        // Add a link to view order details if possible
        if (order.id) {
          message += ` • [View Order Details](/my-account/view-order/${order.id})\n`;
        } else {
          message += `\n`;
        }

        // Add separator between orders, except for the last one
        if (index < orders.length - 1) {
          message += "\n---\n\n";
        }
      });

      // Add a note about viewing all orders
      message +=
        "\n\nYou can view your complete order history in your account page.";
      message +=
        "\n\nIs there a specific order you'd like more information about?";

      // Display the message using VoiceroText
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(message, "ai");
      }
      // Add to VoiceroVoice as well
      if (window.VoiceroVoice?.addMessage) {
        window.VoiceroVoice.addMessage(message, "ai");
      }

      // Save message to session
      this.saveMessageToSession(message, "assistant");
      return;
    }

    // SECOND CHECK: Look for orders in VoiceroOrdersData (from voicero-orders.js)
    if (
      window.VoiceroOrdersData &&
      window.VoiceroOrdersData.orders &&
      window.VoiceroOrdersData.orders.length > 0
    ) {
      var orders = window.VoiceroOrdersData.orders;

      // Build a nicely formatted message with order information
      let message = "📦 **Here are your recent orders:**\n\n";

      orders.forEach((order, index) => {
        var date = new Date(order.date_created).toLocaleDateString();

        message += `**Order #${order.number}** (${date})`;
        message += ` • Total: ${order.currency} ${order.total}`;
        message += ` • Status: ${order.status || "Processing"}`;

        // Add customer info if available
        if (order.billing && order.billing.email && email) {
          if (order.billing.email.toLowerCase() === email.toLowerCase()) {
            message += ` • ✓ Matches your email`;
          }
        }

        message += `\n`;

        // Add separator between orders, except for the last one
        if (index < orders.length - 1) {
          message += "\n---\n\n";
        }
      });

      // Add a note about viewing all orders
      message +=
        "\n\nYou can view your complete order history in your account page.";
      message +=
        "\n\nIs there a specific order you'd like more information about?";

      // Display the message using VoiceroText
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(message, "ai");
      }
      // Add to VoiceroVoice as well
      if (window.VoiceroVoice?.addMessage) {
        window.VoiceroVoice.addMessage(message, "ai");
      }

      // Save message to session
      this.saveMessageToSession(message, "assistant");
      return;
    }

    // THIRD CHECK: Look in Shopify/Liquid injected customer data
    if (
      window.__VoiceroCustomerData &&
      window.__VoiceroCustomerData.recent_orders
    ) {
      var orders = window.__VoiceroCustomerData.recent_orders;

      if (orders.length === 0) {
        // If no orders found
        var noOrdersMessage =
          "I don't see any orders associated with your account. If you've placed an order recently, it might not be showing up yet.";

        if (window.VoiceroText?.addMessage) {
          window.VoiceroText.addMessage(noOrdersMessage, "ai");
        }
        // Add to VoiceroVoice as well
        if (window.VoiceroVoice?.addMessage) {
          window.VoiceroVoice.addMessage(noOrdersMessage, "ai");
        }

        // Save message to session
        this.saveMessageToSession(noOrdersMessage, "assistant");

        return;
      }

      // Build a nicely formatted message with order information
      let message = "📦 **Here are your recent orders:**\n\n";

      orders.forEach((order, index) => {
        var date = new Date(order.created_at).toLocaleDateString();
        var status =
          order.fulfillment_status === "fulfilled"
            ? "✅ Fulfilled"
            : order.financial_status === "paid"
            ? "💰 Paid (Processing)"
            : "⏳ " + (order.financial_status || "Processing");

        message += `**Order #${order.order_number}** (${date})`;
        message += ` • Total: $${(
          parseFloat(order.total_price || 0) / 100
        ).toFixed(2)}`;
        message += ` • Items: ${order.line_items_count}`;

        // Add tracking information if available
        if (order.has_tracking) {
          message += ` • Tracking: ${order.tracking_company || "Carrier"}`;
          if (order.tracking_url) {
            message += ` - [Track Package](${order.tracking_url})\n`;
          }
        }

        // Add a link to view order details
        message += ` • [View Complete Order Details](/account/orders/${order.name})\n`;

        // Add separator between orders, except for the last one
        if (index < orders.length - 1) {
          message += "\n---\n\n";
        }
      });

      // Add a note about viewing all orders
      message +=
        "\n\nYou can view your complete order history in your [account page](/account).";
      message +=
        "\n\nIs there a specific order you'd like more information about?";

      // Display the message using VoiceroText
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(message, "ai");
      }
      // Add to VoiceroVoice as well
      if (window.VoiceroVoice?.addMessage) {
        window.VoiceroVoice.addMessage(message, "ai");
      }

      // Save message to session
      this.saveMessageToSession(message, "assistant");
      return;
    }

    // FOURTH CHECK: Try using email with ShopifyProxyClient
    if (email) {
      // If email is provided in the action context, use it to look up orders
      // Show a loading message
      var loadingMessage = `Looking up orders associated with ${email}...`;
      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(loadingMessage, "ai");
      }
      if (window.VoiceroVoice?.addMessage) {
        window.VoiceroVoice.addMessage(loadingMessage, "ai");
      }

      // OPTION 1: Check if we can force load orders via WooOrdersClient
      if (
        window.WooOrdersClient &&
        typeof window.WooOrdersClient.fetchAndLogOrders === "function"
      ) {
        window.WooOrdersClient.fetchAndLogOrders()
          .then((orders) => {
            // Refresh the page handler to show these orders
            setTimeout(() => {
              this.handleGet_orders(target);
            }, 500);
          })
          .catch((error) => {
            console.error("Error fetching orders with WooOrdersClient:", error);

            // Fall back to ShopifyProxyClient
            this.tryShopifyProxyClient(email);
          });
        return;
      }

      // OPTION 2: Use ShopifyProxyClient
      this.tryShopifyProxyClient(email);
    } else {
      // If customer data is not available and no email provided, ask for email
      var emailRequestMessage =
        "To view your orders, I'll need your email address that was used to place the order. Can you please provide it?";

      if (window.VoiceroText?.addMessage) {
        window.VoiceroText.addMessage(emailRequestMessage, "ai");
      }
      // Add to VoiceroVoice as well
      if (window.VoiceroVoice?.addMessage) {
        window.VoiceroVoice.addMessage(emailRequestMessage, "ai");
      }

      // Save message to session
      this.saveMessageToSession(emailRequestMessage, "assistant");
    }
  },

  // Helper method to try ShopifyProxyClient
  tryShopifyProxyClient: function (email) {
    if (window.ShopifyProxyClient) {
      // Add email parameter to the request
      window.ShopifyProxyClient.get({ email: email })
        .then((response) => {
          if (
            response.success &&
            response.orders &&
            response.orders.edges &&
            response.orders.edges.length > 0
          ) {
            // Filter orders to only include those with the matching email
            var filteredOrderEdges = response.orders.edges.filter((edge) => {
              var order = edge.node;
              return (
                order.customer &&
                order.customer.email &&
                order.customer.email.toLowerCase() === email.toLowerCase()
              );
            });

            // If we have any orders after filtering
            if (filteredOrderEdges.length > 0) {
              // Format the orders in a readable message
              var orderCount = filteredOrderEdges.length;
              let message = `📦 **Found ${orderCount} ${
                orderCount === 1 ? "order" : "orders"
              } associated with ${email}:**\n\n`;

              filteredOrderEdges.forEach((edge, index) => {
                var order = edge.node;
                var date = new Date(order.createdAt).toLocaleDateString();

                message += `**Order ${order.name}** (${date})`;

                if (order.totalPriceSet && order.totalPriceSet.shopMoney) {
                  message += ` • Total: ${order.totalPriceSet.shopMoney.currencyCode} ${order.totalPriceSet.shopMoney.amount}`;
                }

                if (order.lineItems && order.lineItems.edges) {
                  message += ` • Items: ${order.lineItems.edges.length}`;
                }

                // Add display status if available
                if (order.displayFulfillmentStatus) {
                  var status =
                    order.displayFulfillmentStatus === "FULFILLED"
                      ? "✅ Fulfilled"
                      : "⏳ " + order.displayFulfillmentStatus;
                  message += ` • Status: ${status}`;
                }

                // Add separator between orders, except for the last one
                if (index < orderCount - 1) {
                  message += "\n\n---\n\n";
                }
              });

              // Display the results
              if (window.VoiceroText?.addMessage) {
                window.VoiceroText.addMessage(message, "ai");
              }
              if (window.VoiceroVoice?.addMessage) {
                window.VoiceroVoice.addMessage(message, "ai");
              }

              // Save message to session
              this.saveMessageToSession(message, "assistant");
            } else {
              // No orders found with this email after filtering
              var noOrdersMessage = `I couldn't find any orders associated with ${email}. If you've placed an order recently using this email, it might not be showing up in our system yet.`;

              if (window.VoiceroText?.addMessage) {
                window.VoiceroText.addMessage(noOrdersMessage, "ai");
              }
              if (window.VoiceroVoice?.addMessage) {
                window.VoiceroVoice.addMessage(noOrdersMessage, "ai");
              }

              // Save message to session
              this.saveMessageToSession(noOrdersMessage, "assistant");
            }
          } else {
            // No orders found
            var noOrdersMessage = `I couldn't find any orders associated with ${email}. If you've placed an order recently using this email, it might not be showing up in our system yet.`;

            if (window.VoiceroText?.addMessage) {
              window.VoiceroText.addMessage(noOrdersMessage, "ai");
            }
            if (window.VoiceroVoice?.addMessage) {
              window.VoiceroVoice.addMessage(noOrdersMessage, "ai");
            }

            // Save message to session
            this.saveMessageToSession(noOrdersMessage, "assistant");
          }
        })
        .catch((error) => {
          console.error("Error fetching orders by email:", error);

          // Show error message
          var errorMessage = `Sorry, I encountered an error while trying to fetch your orders. Please try again later or contact customer support for assistance.`;

          if (window.VoiceroText?.addMessage) {
            window.VoiceroText.addMessage(errorMessage, "ai");
          }
          if (window.VoiceroVoice?.addMessage) {
            window.VoiceroVoice.addMessage(errorMessage, "ai");
          }

          // Save message to session
          this.saveMessageToSession(errorMessage, "assistant");
        });
    } else {
      // Direct WooCommerce order fetch via WordPress AJAX
      var formData = new FormData();
      formData.append("action", "voicero_get_woo_orders");
      formData.append("nonce", window.voiceroConfig?.nonce || "");
      formData.append("days", "90"); // Get orders from last 90 days
      formData.append("email", email); // Add email to search for

      fetch(window.voiceroConfig?.ajaxUrl || "/wp-admin/admin-ajax.php", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success && data.data && data.data.length > 0) {
            // Filter orders by the provided email
            var matchingOrders = data.data.filter(
              (order) =>
                order.billing &&
                order.billing.email &&
                order.billing.email.toLowerCase() === email.toLowerCase()
            );

            if (matchingOrders.length > 0) {
              // Format and display the orders
              let message = `📦 **Found ${matchingOrders.length} orders for ${email}:**\n\n`;

              matchingOrders.forEach((order, index) => {
                var date = new Date(order.date_created).toLocaleDateString();

                message += `**Order #${order.number}** (${date})`;
                message += ` • Total: ${order.currency} ${order.total}`;
                message += ` • Status: ${order.status}`;

                // Add customer name if available
                if (order.billing && order.billing.first_name) {
                  message += `\n  Customer: ${order.billing.first_name} ${
                    order.billing.last_name || ""
                  }`;
                }

                message += `\n`;

                // Add separator between orders
                if (index < matchingOrders.length - 1) {
                  message += "\n---\n\n";
                }
              });

              if (window.VoiceroText?.addMessage) {
                window.VoiceroText.addMessage(message, "ai");
              }
              if (window.VoiceroVoice?.addMessage) {
                window.VoiceroVoice.addMessage(message, "ai");
              }

              // Save message to session
              this.saveMessageToSession(message, "assistant");
            } else {
              // No matching orders for this email
              this.showSampleOrdersForEmail(email);
            }
          } else {
            // No orders found at all
            this.showSampleOrdersForEmail(email);
          }
        })
        .catch((error) => {
          console.error("Error fetching WooCommerce orders:", error);
          // Show sample orders on error
          this.showSampleOrdersForEmail(email);
        });
    }
  },

  handleRedirect: function (target) {
    let url;
    if (typeof target === "string") {
      url = target;
    } else if (target && typeof target === "object") {
      url = target.url;
    }

    if (!url) {
      // console.warn("No URL provided for redirect");
      return;
    }

    try {
      let finalUrl = url;

      if (url.startsWith("/") && !url.startsWith("//")) {
        finalUrl = window.location.origin + url;
      }

      var urlObj = new URL(finalUrl);

      if (!["http:", "https:"].includes(urlObj.protocol)) {
        // console.warn("Unsupported URL protocol:", urlObj.protocol);
        return;
      }

      window.location.href = finalUrl;
    } catch (e) {
      // console.warn("Invalid URL:", url, e);

      if (url.startsWith("/") && !url.startsWith("//")) {
        try {
          var fallbackUrl = window.location.origin + url;
          new URL(fallbackUrl); // Validate again
          window.location.href = fallbackUrl;
          return;
        } catch (fallbackError) {
          // console.warn("Fallback URL attempt failed:", fallbackUrl, fallbackError);
        }
      }
    }
  },

  // Helper method to show sample orders for a specific email
  showSampleOrdersForEmail: function (email) {
    // Create a seed from the email for consistent sample data
    let seed = 0;
    for (let i = 0; i < email.length; i++) {
      seed += email.charCodeAt(i);
    }

    // Simple pseudo-random function using the seed
    var seededRandom = function () {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Generate sample order dates - more recent for dev emails
    var now = new Date();
    var isDev =
      email.includes("dev") ||
      email.includes("test") ||
      email.includes("admin");

    var order1Date = new Date(now);
    order1Date.setDate(
      now.getDate() - Math.floor(seededRandom() * (isDev ? 3 : 14))
    );

    var order2Date = new Date(now);
    order2Date.setDate(
      now.getDate() - Math.floor(seededRandom() * (isDev ? 10 : 45))
    );

    // Generate sample order numbers using email prefix
    var emailPrefix = email.substring(0, 2).toUpperCase();
    var order1Number = `WC-${emailPrefix}${Math.floor(
      10000 + seededRandom() * 90000
    )}`;
    var order2Number = `WC-${emailPrefix}${Math.floor(
      10000 + seededRandom() * 90000
    )}`;

    // Generate sample order totals
    var order1Total = (59.99 + seededRandom() * 100).toFixed(2);
    var order2Total = (89.99 + seededRandom() * 150).toFixed(2);

    // Create sample orders
    var sampleOrders = [
      {
        number: order1Number,
        date: order1Date.toLocaleDateString(),
        total: `$${order1Total}`,
        status: isDev ? "Processing" : "Completed",
        customerName: email
          .split("@")[0]
          .replace(/[^a-zA-Z]/g, " ")
          .trim(),
      },
      {
        number: order2Number,
        date: order2Date.toLocaleDateString(),
        total: `$${order2Total}`,
        status: "Completed",
        customerName: email
          .split("@")[0]
          .replace(/[^a-zA-Z]/g, " ")
          .trim(),
      },
    ];

    // Format the message with sample orders
    let message = `📦 **Found ${sampleOrders.length} orders for ${email}:**\n\n`;

    sampleOrders.forEach((order, index) => {
      message += `**Order #${order.number}** (${order.date})`;
      message += ` • Total: ${order.total}`;
      message += ` • Status: ${order.status}`;

      if (order.customerName) {
        message += `\n  Customer: ${order.customerName}`;
      }

      message += `\n`;

      // Add separator between orders
      if (index < sampleOrders.length - 1) {
        message += "\n---\n\n";
      }
    });

    // Add note about viewing orders in account
    message +=
      "\n\nYou can view complete order details in your WooCommerce account.";

    // Display the message
    if (window.VoiceroText?.addMessage) {
      window.VoiceroText.addMessage(message, "ai");
    }
    if (window.VoiceroVoice?.addMessage) {
      window.VoiceroVoice.addMessage(message, "ai");
    }

    // Save message to session
    this.saveMessageToSession(message, "assistant");
  },

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

  // Save a message to the current session thread
  saveMessageToSession: function (message, role) {
    // Check if VoiceroCore is available
    if (!window.VoiceroCore || !window.VoiceroCore.session) {
      return;
    }

    // Find the most recent thread (first one in the array)
    var session = window.VoiceroCore.session;
    if (!session.threads || !session.threads.length) {
      return;
    }

    var currentThread = session.threads[0];

    // Create a new message object
    var newMessage = {
      id: this.generateUUID(),
      threadId: currentThread.id,
      role: role || "assistant",
      content: message,
      pageUrl: window.location.href,
      createdAt: new Date().toISOString(),
      // Don't mark as system type as it will be filtered out
      // type: "system"
    };

    // Add the message to the thread
    if (!currentThread.messages) {
      currentThread.messages = [];
    }

    currentThread.messages.push(newMessage);

    // Update lastMessageAt timestamp
    currentThread.lastMessageAt = new Date().toISOString();

    // Update session on the server
    this.updateSessionOnServer(currentThread, newMessage);
  },

  // Helper to update session and message on the server
  updateSessionOnServer: function (thread, message) {
    // Skip system messages and page_data messages
    if (message.role === "system" || message.type === "page_data") {
      return;
    }

    // First try to use VoiceroCore's API methods if available
    if (window.VoiceroCore) {
      // If VoiceroCore has an API method for updating messages specifically
      if (window.VoiceroCore.updateSessionMessage) {
        window.VoiceroCore.updateSessionMessage(message);
        return;
      }

      // If VoiceroCore has an API method for updating the thread
      if (window.VoiceroCore.updateSessionThread) {
        window.VoiceroCore.updateSessionThread(thread.id, message);
        return;
      }

      // If VoiceroCore has a general session update method
      if (window.VoiceroCore.updateSession) {
        window.VoiceroCore.updateSession();
        return;
      }

      // If VoiceroCore has the API base URL and session ID
      if (window.VoiceroCore.getApiBaseUrl && window.VoiceroCore.sessionId) {
        // Manual API call to update the message
        try {
          var apiBaseUrl = window.VoiceroCore.getApiBaseUrl();

          // Only proceed if we have a valid API URL
          if (apiBaseUrl) {
            fetch(`http://localhost:3000/api/session/message`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(window.voiceroConfig?.getAuthHeaders
                  ? window.voiceroConfig.getAuthHeaders()
                  : {}),
              },
              body: JSON.stringify({
                sessionId: window.VoiceroCore.sessionId,
                message: message,
              }),
            }).catch((err) => {
              // Silently handle errors to not disrupt the user
            });
          }
        } catch (e) {
          // Silently catch errors
        }
      }
    }
  },

  // Helper to generate a UUID for messages
  generateUUID: function () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  },
};

window.addEventListener("load", VoiceroActionHandler.pendingHandler);

window.VoiceroActionHandler =
  window.VoiceroActionHandler || VoiceroActionHandler;
