/**
 * Voicero AI Chatbot Customization
 * Handles the customization functionality for the AI chatbot
 */

(function ($) {
  "use strict";

  // Store color picker instance
  let colorPicker;

  // Store the website data from the API
  let websiteData =
    typeof voiceroChatbotData !== "undefined" ? voiceroChatbotData : {};

  // Store SVG icons
  let svgIcons = typeof voiceroSvgIcons !== "undefined" ? voiceroSvgIcons : {};

  // Flag to track if initialization has occurred
  let initialized = false;

  // Form state variables
  let formState = {
    botName: "",
    welcomeMessage: "",
    customInstructions: "",
    popUpQuestions: [],
    primaryColor: "#008060",
    colorHsb: { hue: 147, brightness: 0.5, saturation: 1 },
    autoFeatures: {
      allowAutoRedirect: false,
      allowAutoScroll: false,
      allowAutoHighlight: false,
      allowAutoClick: false,
      allowAutoCancel: false,
      allowAutoReturn: false,
      allowAutoExchange: false,
      allowAutoGetUserOrders: false,
      allowAutoUpdateUserInfo: false,
      allowAutoFillForm: true,
      allowAutoTrackOrder: true,
      allowAutoLogout: true,
      allowAutoLogin: true,
      allowAutoGenerateImage: true,
    },
    showVoiceAI: true,
    showTextAI: true,
    showHome: true,
    showNews: true,
    showHelp: true,
  };

  // Validation errors
  let validationErrors = {
    botName: "",
    welcomeMessage: "",
    customInstructions: "",
    popUpQuestions: "",
  };

  /**
   * Utility function to normalize backend flags that may arrive as 1/0, "1"/"0", "true"/"false", or booleans
   */
  function toBoolean(value, defaultValue = false) {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
      if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    }
    return Boolean(value);
  }

  /**
   * Utility function to count words in a string
   */
  function countWords(str) {
    return str.trim().split(/\s+/).filter(Boolean).length;
  }

  /**
   * Helper function to convert hex color to HSB
   */
  function hexToHsb(hex) {
    // Remove the # if present
    hex = hex.replace(/^#/, "");

    // Parse the hex values to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Find the maximum and minimum values to calculate saturation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Calculate HSB values
    let h = 0;
    let s = max === 0 ? 0 : delta / max;
    let br = max;

    // Calculate hue
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta) % 6;
      } else if (max === g) {
        h = (b - r) / delta + 2;
      } else {
        h = (r - g) / delta + 4;
      }

      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    // Return HSB object
    return {
      hue: h,
      saturation: s,
      brightness: br,
    };
  }

  /**
   * Helper function to convert HSB to hex
   */
  function hsbToHex({ hue, saturation, brightness }) {
    let h = hue / 360;
    let s = saturation;
    let v = brightness;

    let r, g, b;

    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    // Convert to hex
    r = Math.round(r * 255)
      .toString(16)
      .padStart(2, "0");
    g = Math.round(g * 255)
      .toString(16)
      .padStart(2, "0");
    b = Math.round(b * 255)
      .toString(16)
      .padStart(2, "0");

    return `#${r}${g}${b}`;
  }

  /**
   * Parse color input string to hex. Accepts #RRGGBB, #RGB, rgb(r,g,b)
   */
  function parseColorInputToHex(input) {
    if (!input) return null;
    const value = String(input).trim();

    // Hex full or short
    if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
      return value.startsWith("#") ? value : `#${value}`;
    }
    if (/^#?[0-9a-fA-F]{3}$/.test(value)) {
      const v = value.replace("#", "");
      const r = v[0];
      const g = v[1];
      const b = v[2];
      return `#${r}${r}${g}${g}${b}${b}`;
    }

    // rgb(r,g,b)
    const rgbMatch = value
      .replace(/\s+/g, "")
      .match(/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i);
    if (rgbMatch) {
      const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10)));
      const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10)));
      const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10)));
      const toHex = (n) => n.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Plain comma separated r,g,b
    const parts = value.split(",");
    if (parts.length === 3 && parts.every((p) => /^\d{1,3}$/.test(p.trim()))) {
      const r = Math.max(0, Math.min(255, parseInt(parts[0].trim(), 10)));
      const g = Math.max(0, Math.min(255, parseInt(parts[1].trim(), 10)));
      const b = Math.max(0, Math.min(255, parseInt(parts[2].trim(), 10)));
      const toHex = (n) => n.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return null;
  }

  /**
   * Main initialization function - we'll call this when document is ready
   * but delay the actual form setup until we have data
   */
  async function init() {
    // Override SVG icons immediately to ensure they're available
    overrideSvgIcons();

    // Add debug info to page
    $(".voicero-chatbot-page").prepend(`
      <div id="debug-info" style="background: #f9f9f9; padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; display: none;">
        <h3>Debug Information</h3>
        <p><strong>Available Icons:</strong> ${Object.keys(svgIcons).join(
          ", "
        )}</p>
        <button id="toggle-debug" class="button">Show/Hide Debug</button>
      </div>
    `);

    $("#toggle-debug").on("click", function () {
      $("#debug-info").toggle();
    });

    // Show loading indicator
    $(".voicero-chatbot-page").prepend(`
      <div id="loading-indicator" style="text-align: center; padding: 20px;">
        <p>Loading chatbot settings...</p>
        <div class="spinner is-active" style="float: none; margin: 10px auto;"></div>
      </div>
    `);

    // Fetch data using the proper API endpoints
    try {
      await fetchChatbotData();
      initChatbotPage();
    } catch (error) {
      console.error("Error fetching chatbot data:", error);
      $("#loading-indicator").html(`
        <div style="text-align: center; padding: 20px;">
          <p style="color: #d63638;">Failed to load chatbot settings: ${error.message}</p>
          <button id="retry-load" class="button">Retry</button>
        </div>
      `);

      $("#retry-load").on("click", function () {
        location.reload();
      });
    }
  }

  /**
   * Fetch chatbot data using the same pattern as React code
   */
  async function fetchChatbotData() {
    const accessKey = $("#access-key").val() || window.voiceroAccessKey;

    if (!accessKey) {
      throw new Error("No access key found");
    }

    // Step 1: Get basic website data from connect API
    const connectResponse = await fetch(
      `${window.voiceroApiUrl || "https://www.voicero.ai"}/api/connect`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessKey}`,
        },
      }
    );

    if (!connectResponse.ok) {
      const responseText = await connectResponse.text();
      console.error("Connect API Error:", connectResponse.status, responseText);
      throw new Error(
        `Failed to fetch website data: ${connectResponse.status} ${connectResponse.statusText}`
      );
    }

    let connectData;
    try {
      connectData = await connectResponse.json();
    } catch (error) {
      console.error("Connect API returned invalid JSON:", error);
      throw new Error("Connect API returned invalid response format");
    }

    console.log("Connect API Response:", connectData);

    if (!connectData.website) {
      throw new Error("No website data found in response");
    }

    const website = connectData.website;

    // Step 2: Fetch interface settings using new API
    const interfaceResponse = await fetch(
      `https://www.voicero.ai/api/updateInterface/get?websiteId=${website.id}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessKey}`,
        },
      }
    );

    if (!interfaceResponse.ok) {
      const responseText = await interfaceResponse.text();
      console.error(
        "Interface API Error:",
        interfaceResponse.status,
        responseText
      );
      throw new Error(
        `Failed to fetch interface settings: ${interfaceResponse.status} ${interfaceResponse.statusText}`
      );
    }

    let interfaceData;
    try {
      interfaceData = await interfaceResponse.json();
    } catch (error) {
      console.error("Interface API returned invalid JSON:", error);
      throw new Error("Interface API returned invalid response format");
    }

    const site = interfaceData.website;

    // Format popup questions properly
    let formattedPopUpQuestions = [];
    if (site.popUpQuestions && Array.isArray(site.popUpQuestions)) {
      formattedPopUpQuestions = site.popUpQuestions.map((q) => ({
        id: q.id,
        question: q.question || "",
        createdAt: q.createdAt,
      }));
    }

    // Auto features normalized
    const autoFeatures = {
      allowAutoRedirect: toBoolean(site.allowAutoRedirect, false),
      allowAutoScroll: toBoolean(site.allowAutoScroll, false),
      allowAutoHighlight: toBoolean(site.allowAutoHighlight, false),
      allowAutoClick: toBoolean(site.allowAutoClick, false),
      allowAutoCancel: toBoolean(site.allowAutoCancel, false),
      allowAutoReturn: toBoolean(site.allowAutoReturn, false),
      allowAutoExchange: toBoolean(site.allowAutoExchange, false),
      allowAutoGetUserOrders: toBoolean(site.allowAutoGetUserOrders, false),
      allowAutoUpdateUserInfo: toBoolean(site.allowAutoUpdateUserInfo, false),
      // Defaults true where UI indicates enabled-by-default
      allowAutoFillForm: toBoolean(site.allowAutoFillForm, true),
      allowAutoTrackOrder: toBoolean(site.allowAutoTrackOrder, true),
      allowAutoLogout: toBoolean(site.allowAutoLogout, true),
      allowAutoLogin: toBoolean(site.allowAutoLogin, true),
      allowAutoGenerateImage: toBoolean(site.allowAutoGenerateImage, true),
    };

    // Store the complete website data with interface settings
    websiteData = {
      // Basic website info
      id: website.id,
      name: website.name,
      url: website.url,
      monthlyQueries: website.monthlyQueries,
      queryLimit: website.queryLimit,
      renewsOn: website.renewsOn,
      lastSyncedAt: website.lastSyncedAt,

      // Interface settings
      customInstructions: site.customInstructions || "",
      customWelcomeMessage: site.customWelcomeMessage || "",
      popUpQuestions: formattedPopUpQuestions,
      color: site.color || "#008060",
      removeHighlight: false,
      botName: site.botName || "AI Assistant",
      autoFeatures,
      showVoiceAI: toBoolean(site.showVoiceAI, true),
      showTextAI: toBoolean(site.showTextAI, true),
      showHome: toBoolean(site.showHome, true),
      showNews: toBoolean(site.showNews, true),
      showHelp: toBoolean(site.showHelp, true),
    };

    // Store access key for later use
    window.voiceroAccessKey = accessKey;

    console.log("Complete website data:", websiteData);
  }

  /**
   * Override SVG icons with direct definitions
   */
  function overrideSvgIcons() {
    // Directly define SVG icons here to override any potential issues with PHP passing
    svgIcons = {
      // Voice icons
      Microphone:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" /><path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" /></svg>',
      Waveform:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12h2v3H3v-3zm4-4h2v10H7V8zm4-6h2v22h-2V2zm4 6h2v10h-2V8zm4 4h2v3h-2v-3z" /></svg>',
      Speaker:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z" /></svg>',

      // Message icons
      Message:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM4 16V4h16v12H5.17L4 17.17V16z" /></svg>',
      Cursor:
        '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"><path d="M11 2h2v20h-2z" /></svg>',
      Document:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" /></svg>',

      // Bot icons
      Bot: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="24" height="24" fill="currentColor"><rect x="12" y="16" width="40" height="32" rx="10" ry="10" stroke="black" stroke-width="2" fill="currentColor" /><circle cx="22" cy="32" r="4" fill="white" /><circle cx="42" cy="32" r="4" fill="white" /><path d="M24 42c4 4 12 4 16 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" /><line x1="32" y1="8" x2="32" y2="16" stroke="black" stroke-width="2" /><circle cx="32" cy="6" r="2" fill="black" /></svg>',
      Voice:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z" /></svg>',

      // Also add lowercase versions for compatibility
      microphone:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" /><path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" /></svg>',
      waveform:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M3 12h2v3H3v-3zm4-4h2v10H7V8zm4-6h2v22h-2V2zm4 6h2v10h-2V8zm4 4h2v3h-2v-3z" /></svg>',
      speaker:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z" /></svg>',
      message:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM4 16V4h16v12H5.17L4 17.17V16z" /></svg>',
      cursor:
        '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="24" height="24"><path d="M11 2h2v20h-2z" /></svg>',
      document:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v2H4V4zm0 4h16v2H4V8zm0 4h10v2H4v-2zm0 4h16v2H4v-2z" /></svg>',
      bot: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="24" height="24" fill="currentColor"><rect x="12" y="16" width="40" height="32" rx="10" ry="10" stroke="black" stroke-width="2" fill="currentColor" /><circle cx="22" cy="32" r="4" fill="white" /><circle cx="42" cy="32" r="4" fill="white" /><path d="M24 42c4 4 12 4 16 0" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" /><line x1="32" y1="8" x2="32" y2="16" stroke="black" stroke-width="2" /><circle cx="32" cy="6" r="2" fill="black" /></svg>',
      voice:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M5 9v6h4l5 5V4L9 9H5zm13.54.12a1 1 0 1 0-1.41 1.42 3 3 0 0 1 0 4.24 1 1 0 1 0 1.41 1.41 5 5 0 0 0 0-7.07z" /></svg>',
    };
  }

  /**
   * Initialize the chatbot customization page
   */
  function initChatbotPage() {
    // Set the initialized flag
    initialized = true;

    // Remove loading indicator
    $("#loading-indicator").remove();

    // Initialize form fields with data from API
    updateFormFieldsWithData(websiteData);

    // Initialize all form components
    initWordCounters();
    initSuggestedQuestions();
    initColorPicker();
    initAutoFeatures();
    initUIToggles();

    // Handle form submission
    $("#save-settings-btn").on("click", function () {
      saveSettings();
    });

    console.log("Chatbot page initialized successfully");
  }

  /**
   * Update form fields with website data
   * @param {Object} data - The website data
   */
  function updateFormFieldsWithData(data) {
    // Update form state with data from API
    formState.botName = data.botName || "Voicero AI";
    formState.welcomeMessage = data.customWelcomeMessage || "";
    formState.customInstructions = data.customInstructions || "";
    formState.primaryColor = data.color || "#008060";
    formState.colorHsb = hexToHsb(formState.primaryColor);

    // Update auto features if they exist
    if (data.autoFeatures) {
      Object.keys(formState.autoFeatures).forEach((key) => {
        if (data.autoFeatures.hasOwnProperty(key)) {
          formState.autoFeatures[key] = toBoolean(
            data.autoFeatures[key],
            formState.autoFeatures[key]
          );
        }
      });
    }

    // Update UI toggles
    formState.showVoiceAI = toBoolean(data.showVoiceAI, true);
    formState.showTextAI = toBoolean(data.showTextAI, true);
    formState.showHome = toBoolean(data.showHome, true);
    formState.showNews = toBoolean(data.showNews, true);
    formState.showHelp = toBoolean(data.showHelp, true);

    // Update popup questions
    if (data.popUpQuestions && Array.isArray(data.popUpQuestions)) {
      formState.popUpQuestions = data.popUpQuestions.map((q) => {
        if (typeof q === "object" && q.question) {
          return { id: q.id, question: q.question, createdAt: q.createdAt };
        }
        return { question: String(q) };
      });
    }

    // Update DOM elements
    updateFormElementsFromState();

    // Update website information section
    updateWebsiteInformation();
  }

  /**
   * Update DOM elements based on current form state
   */
  function updateFormElementsFromState() {
    // Update basic text fields
    $("#chatbot-name").val(formState.botName);
    $("#welcome-message").val(formState.welcomeMessage);
    $("#custom-instructions").val(formState.customInstructions);

    // Update color fields
    $("#primary-color").val(formState.primaryColor);
    $("#color-input").val(formState.primaryColor);
    $(".color-preview").css("background-color", formState.primaryColor);

    // Update auto features checkboxes
    Object.keys(formState.autoFeatures).forEach((key) => {
      $(
        `#${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
      ).prop("checked", formState.autoFeatures[key]);
    });

    // Update UI toggles
    $("#show-voice-ai").prop("checked", formState.showVoiceAI);
    $("#show-text-ai").prop("checked", formState.showTextAI);
    $("#show-home").prop("checked", formState.showHome);
    $("#show-news").prop("checked", formState.showNews);
    $("#show-help").prop("checked", formState.showHelp);

    // Update popup questions
    updatePopupQuestionsDisplay();

    // Trigger input events for word counters
    $("#welcome-message, #custom-instructions").trigger("input");
  }

  /**
   * Update website information display
   */
  function updateWebsiteInformation() {
    if (websiteData) {
      // Update website name
      $(".info-value")
        .eq(0)
        .text(websiteData.name || "Not set");

      // Update last synced date
      let lastSyncedText = "Never";
      if (websiteData.lastSyncedAt) {
        try {
          const lastSyncedDate = new Date(websiteData.lastSyncedAt);
          lastSyncedText = lastSyncedDate.toLocaleString();
        } catch (error) {
          console.warn("Error parsing lastSyncedAt date:", error);
          lastSyncedText = websiteData.lastSyncedAt;
        }
      }
      $(".info-value").eq(1).text(lastSyncedText);
    }
  }

  /**
   * Update popup questions display
   */
  function updatePopupQuestionsDisplay() {
    const container = $("#suggested-questions-container");
    container.empty();

    if (formState.popUpQuestions.length === 0) {
      container.append(
        '<div class="no-questions">No suggested questions added yet.</div>'
      );
    } else {
      formState.popUpQuestions.forEach((question, index) => {
        const questionText =
          typeof question === "object" ? question.question || "" : question;
        container.append(`
          <div class="suggested-question-item" data-index="${index}">
            <input type="text" name="suggested_questions[]" value="${questionText}" class="suggested-question-input" readonly>
            <button type="button" class="remove-question-btn button-link" data-index="${index}">
              <span class="dashicons dashicons-trash"></span>
            </button>
          </div>
        `);
      });
    }

    // Update question count
    $("#questions-count").text(formState.popUpQuestions.length);

    // Show/hide add container based on limit
    if (formState.popUpQuestions.length >= 3) {
      $(".add-question-container").hide();
    } else {
      $(".add-question-container").show();
    }
  }

  /**
   * Initialize word counters and validation for text areas
   */
  function initWordCounters() {
    // Bot name validation (character count)
    $("#chatbot-name").on("input", function () {
      const value = $(this).val();
      formState.botName = value;
      validateBotName(value);
    });

    // Welcome message word counter and validation
    $("#welcome-message")
      .on("input", function () {
        const value = $(this).val();
        formState.welcomeMessage = value;
        updateWordCount($(this), $("#welcome-message-count"), 25);
        validateWelcomeMessage(value);
      })
      .trigger("input");

    // Custom instructions word counter and validation
    $("#custom-instructions")
      .on("input", function () {
        const value = $(this).val();
        formState.customInstructions = value;
        updateWordCount($(this), $("#custom-instructions-count"), 50);
        validateCustomInstructions(value);
      })
      .trigger("input");
  }

  /**
   * Validation functions
   */
  function validateBotName(value) {
    const chars = value.length;
    const errorElement = $("#chatbot-name-error");

    if (chars > 120) {
      validationErrors.botName = "Bot name cannot be more than 120 characters";
      errorElement.text(validationErrors.botName).show();
      return false;
    }

    validationErrors.botName = "";
    errorElement.hide();
    return true;
  }

  function validateWelcomeMessage(value) {
    const words = countWords(value);
    const errorElement = $("#welcome-message-error");

    if (words > 25) {
      validationErrors.welcomeMessage =
        "Welcome message cannot be more than 25 words";
      errorElement.text(validationErrors.welcomeMessage).show();
      return false;
    }

    validationErrors.welcomeMessage = "";
    errorElement.hide();
    return true;
  }

  function validateCustomInstructions(value) {
    const words = countWords(value);
    const errorElement = $("#custom-instructions-error");

    if (words > 50) {
      validationErrors.customInstructions =
        "Custom instructions cannot be more than 50 words";
      errorElement.text(validationErrors.customInstructions).show();
      return false;
    }

    validationErrors.customInstructions = "";
    errorElement.hide();
    return true;
  }

  function validatePopupQuestions() {
    const errorElement = $("#popup-questions-error");

    if (formState.popUpQuestions.length > 3) {
      validationErrors.popUpQuestions =
        "You can only have up to 3 popup questions";
      errorElement.text(validationErrors.popUpQuestions).show();
      return false;
    }

    validationErrors.popUpQuestions = "";
    errorElement.hide();
    return true;
  }

  /**
   * Validate entire form
   */
  function validateForm() {
    const isNameValid = formState.botName
      ? validateBotName(formState.botName)
      : true;
    const isWelcomeValid = validateWelcomeMessage(formState.welcomeMessage);
    const isInstructionsValid = validateCustomInstructions(
      formState.customInstructions
    );
    const areQuestionsValid = validatePopupQuestions();

    return (
      isNameValid && isWelcomeValid && isInstructionsValid && areQuestionsValid
    );
  }

  /**
   * Update word count for a text area
   * @param {Object} $textarea - The textarea jQuery object
   * @param {Object} $counter - The counter element jQuery object
   * @param {number} limit - The word limit
   */
  function updateWordCount($textarea, $counter, limit) {
    var text = $textarea.val().trim();
    var wordCount = text ? text.split(/\s+/).length : 0;

    $counter.text(wordCount + "/" + limit + " words");

    if (wordCount > limit) {
      $counter.addClass("over-limit");
    } else {
      $counter.removeClass("over-limit");
    }
  }

  /**
   * Initialize suggested questions functionality
   */
  function initSuggestedQuestions() {
    // Add question button
    $("#add-question-btn").on("click", function () {
      addSuggestedQuestion();
    });

    // Enter key in new question field
    $("#new-question").on("keypress", function (e) {
      if (e.which === 13) {
        e.preventDefault();
        addSuggestedQuestion();
      }
    });

    // Remove question button (using event delegation)
    $("#suggested-questions-container").on(
      "click",
      ".remove-question-btn",
      function () {
        const index = parseInt($(this).attr("data-index"), 10);
        removeSuggestedQuestion(index);
      }
    );
  }

  /**
   * Add a new suggested question
   */
  async function addSuggestedQuestion() {
    const newQuestion = $("#new-question").val().trim();

    if (!newQuestion) {
      return;
    }

    // Check if we've reached the limit
    if (formState.popUpQuestions.length >= 3) {
      showErrorMessage("You can only have up to 3 popup questions");
      return;
    }

    try {
      // Get access key from hidden field or global
      const accessKey = $("#access-key").val() || window.voiceroAccessKey;
      const websiteId =
        $("#website-id").val() || (websiteData && websiteData.id);

      if (!accessKey || !websiteId) {
        throw new Error("Missing access key or website ID");
      }

      // Call API to add question
      const response = await fetch(
        "https://www.voicero.ai/api/updateInterface/addQuestion",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessKey}`,
          },
          body: JSON.stringify({
            websiteId: websiteId,
            question: newQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to add question");
      }

      // Add to form state
      formState.popUpQuestions.push({
        id: data.id,
        question: newQuestion,
        createdAt: new Date().toISOString(),
      });

      // Clear input
      $("#new-question").val("");

      // Update display
      updatePopupQuestionsDisplay();
      validatePopupQuestions();

      showSuccessMessage("Question added successfully");
    } catch (error) {
      console.error("Error adding question:", error);
      showErrorMessage("Failed to add question: " + error.message);
    }
  }

  /**
   * Remove a suggested question
   * @param {number} indexToRemove - The index of the question to remove
   */
  async function removeSuggestedQuestion(indexToRemove) {
    const question = formState.popUpQuestions[indexToRemove];

    if (!question) {
      return;
    }

    try {
      // If question has an ID, call API to delete it
      if (question.id) {
        const accessKey = $("#access-key").val() || window.voiceroAccessKey;
        const websiteId =
          $("#website-id").val() || (websiteData && websiteData.id);

        if (!accessKey || !websiteId) {
          throw new Error("Missing access key or website ID");
        }

        const response = await fetch(
          "https://www.voicero.ai/api/updateInterface/deleteQuestion",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${accessKey}`,
            },
            body: JSON.stringify({
              websiteId: websiteId,
              id: question.id,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to delete question");
        }
      }

      // Remove from form state
      formState.popUpQuestions.splice(indexToRemove, 1);

      // Update display
      updatePopupQuestionsDisplay();
      validatePopupQuestions();

      showSuccessMessage("Question removed successfully");
    } catch (error) {
      console.error("Error removing question:", error);
      showErrorMessage("Failed to remove question: " + error.message);
    }
  }

  /**
   * Initialize the color picker and related inputs
   */
  function initColorPicker() {
    // Initialize HTML5 color input
    $("#primary-color").on("input", function () {
      const colorValue = $(this).val();
      formState.primaryColor = colorValue;
      formState.colorHsb = hexToHsb(colorValue);

      // Update other color inputs and preview
      $("#color-input").val(colorValue);
      $(".color-preview").css("background-color", colorValue);
    });

    // Initialize text color input (supports multiple formats)
    $("#color-input").on("input", function () {
      const inputValue = $(this).val();
      const hexColor = parseColorInputToHex(inputValue);

      if (hexColor) {
        formState.primaryColor = hexColor;
        formState.colorHsb = hexToHsb(hexColor);

        // Update color picker and preview
        $("#primary-color").val(hexColor);
        $(".color-preview").css("background-color", hexColor);
      }
    });

    // Initialize preset color buttons if they exist
    $(".color-preset").on("click", function () {
      const presetColor = $(this).data("color");
      if (presetColor) {
        formState.primaryColor = presetColor;
        formState.colorHsb = hexToHsb(presetColor);

        // Update all color inputs and preview
        $("#primary-color").val(presetColor);
        $("#color-input").val(presetColor);
        $(".color-preview").css("background-color", presetColor);
      }
    });

    // Set initial color values
    $("#primary-color").val(formState.primaryColor);
    $("#color-input").val(formState.primaryColor);
    $(".color-preview").css("background-color", formState.primaryColor);
  }

  /**
   * Initialize auto features checkboxes
   */
  function initAutoFeatures() {
    Object.keys(formState.autoFeatures).forEach((key) => {
      const checkboxId = `#${key.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      )}`;

      $(checkboxId).on("change", function () {
        formState.autoFeatures[key] = $(this).is(":checked");
      });
    });
  }

  /**
   * Initialize UI toggles
   */
  function initUIToggles() {
    // Voice AI and Text AI toggles
    $("#show-voice-ai").on("change", function () {
      formState.showVoiceAI = $(this).is(":checked");
    });

    $("#show-text-ai").on("change", function () {
      formState.showTextAI = $(this).is(":checked");
    });

    // Activate All toggle for AI UI
    $("#activate-all-ai").on("change", function () {
      const isChecked = $(this).is(":checked");
      formState.showVoiceAI = isChecked;
      formState.showTextAI = isChecked;

      $("#show-voice-ai").prop("checked", isChecked);
      $("#show-text-ai").prop("checked", isChecked);
    });

    // Bottom navigation toggles
    $("#show-home").on("change", function () {
      formState.showHome = $(this).is(":checked");
    });

    $("#show-news").on("change", function () {
      formState.showNews = $(this).is(":checked");
    });

    $("#show-help").on("change", function () {
      formState.showHelp = $(this).is(":checked");
    });
  }

  /**
   * Estimate color picker position from a hex color
   * @param {string} color - Hex color code
   * @returns {number|null} Position as percentage (0-100) or null if cannot be determined
   */
  function estimatePositionFromColor(color) {
    if (!color.startsWith("#")) return null;

    try {
      // Extract RGB components
      var r = parseInt(color.slice(1, 3), 16) / 255;
      var g = parseInt(color.slice(3, 5), 16) / 255;
      var b = parseInt(color.slice(5, 7), 16) / 255;

      // Find the dominant colors
      if (r === 1 && g < 1 && b === 0) {
        // Red to Yellow
        return g * 16.67;
      } else if (r > 0 && g === 1 && b === 0) {
        // Yellow to Green
        return 16.67 + (1 - r) * 16.67;
      } else if (r === 0 && g === 1 && b < 1) {
        // Green to Cyan
        return 33.33 + b * 16.67;
      } else if (r === 0 && g > 0 && b === 1) {
        // Cyan to Blue
        return 50 + (1 - g) * 16.67;
      } else if (r < 1 && g === 0 && b === 1) {
        // Blue to Magenta
        return 66.67 + r * 16.67;
      } else if (r === 1 && g === 0 && b > 0) {
        // Magenta to Red
        return 83.33 + (1 - b) * 16.67;
      }

      // If we can't determine a good position, return null
      return null;
    } catch (e) {
      console.warn("Error estimating position from color:", e);
      return null;
    }
  }

  /**
   * Update the color picker handle position and color
   * @param {number} position - The position as a percentage (0-100)
   */
  function updateColorPickerHandle(position) {
    // varrain position to 0-100%
    position = Math.max(0, Math.min(100, position));

    // Update handle position
    $(".color-handle").css("left", position + "%");

    // Calculate color based on position (simplified)
    // This is a very basic implementation
    let color;
    if (position < 16.67) {
      // Red to Yellow
      var ratio = position / 16.67;
      color = rgbToHex(255, Math.round(255 * ratio), 0);
    } else if (position < 33.33) {
      // Yellow to Lime
      var ratio = (position - 16.67) / 16.67;
      color = rgbToHex(Math.round(255 * (1 - ratio)), 255, 0);
    } else if (position < 50) {
      // Lime to Cyan
      var ratio = (position - 33.33) / 16.67;
      color = rgbToHex(0, 255, Math.round(255 * ratio));
    } else if (position < 66.67) {
      // Cyan to Blue
      var ratio = (position - 50) / 16.67;
      color = rgbToHex(0, Math.round(255 * (1 - ratio)), 255);
    } else if (position < 83.33) {
      // Blue to Magenta
      var ratio = (position - 66.67) / 16.67;
      color = rgbToHex(Math.round(255 * ratio), 0, 255);
    } else {
      // Magenta to Red
      var ratio = (position - 83.33) / 16.67;
      color = rgbToHex(255, 0, Math.round(255 * (1 - ratio)));
    }

    // Update handle color and input
    $(".color-handle").css("background", color);
    $("#primary-color").val(color);
    $(".color-preview").css("background", color);
  }

  /**
   * Convert RGB values to HEX color code
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {string} HEX color code
   */
  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  /**
   * Convert a color component to HEX
   * @param {number} c - Color component (0-255)
   * @returns {string} HEX component
   */
  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }

  /**
   * Convert hex color to RGBA format
   * @param {string} hex - The hex color code
   * @returns {string} RGBA color string
   */
  function hexToRgba(hex) {
    // Remove the # if present
    hex = hex.replace("#", "");

    // Parse the hex values
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      return null;
    }

    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  /**
   * Save settings via API
   */
  async function saveSettings() {
    // Show saving indicator
    showSavingIndicator();

    // Validate form
    if (!validateForm()) {
      hideSavingIndicator();
      return;
    }

    try {
      // Get access key and website ID
      const accessKey = $("#access-key").val() || window.voiceroAccessKey;
      const websiteId =
        $("#website-id").val() || (websiteData && websiteData.id);

      if (!accessKey || !websiteId) {
        throw new Error("Missing access key or website ID");
      }

      // Prepare data for interface API (matching the React structure)
      const updateData = {
        websiteId: websiteId,
        botName: formState.botName,
        customWelcomeMessage: formState.welcomeMessage,
        customInstructions: formState.customInstructions,
        color: formState.primaryColor,
        showVoiceAI: formState.showVoiceAI,
        showTextAI: formState.showTextAI,
        showHome: formState.showHome,
        showNews: formState.showNews,
        showHelp: formState.showHelp,

        // Auto features
        allowAutoRedirect: formState.autoFeatures.allowAutoRedirect,
        allowAutoScroll: formState.autoFeatures.allowAutoScroll,
        allowAutoHighlight: formState.autoFeatures.allowAutoHighlight,
        allowAutoClick: formState.autoFeatures.allowAutoClick,
        allowAutoCancel: formState.autoFeatures.allowAutoCancel,
        allowAutoReturn: formState.autoFeatures.allowAutoReturn,
        allowAutoExchange: formState.autoFeatures.allowAutoExchange,
        allowAutoGetUserOrders: formState.autoFeatures.allowAutoGetUserOrders,
        allowAutoUpdateUserInfo: formState.autoFeatures.allowAutoUpdateUserInfo,
        allowAutoFillForm: formState.autoFeatures.allowAutoFillForm,
        allowAutoTrackOrder: formState.autoFeatures.allowAutoTrackOrder,
        allowAutoLogout: formState.autoFeatures.allowAutoLogout,
        allowAutoLogin: formState.autoFeatures.allowAutoLogin,
        allowAutoGenerateImage: formState.autoFeatures.allowAutoGenerateImage,
      };

      console.log("Saving chatbot settings:", updateData);

      // Make API call to save interface settings
      const response = await fetch(
        "https://www.voicero.ai/api/updateInterface/edit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessKey}`,
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || "Failed to update settings"
        );
      }

      // Get the response data
      const data = await response.json();
      console.log("API response:", data);

      // Update websiteData with new values
      if (websiteData) {
        Object.assign(websiteData, {
          botName: formState.botName,
          customWelcomeMessage: formState.welcomeMessage,
          customInstructions: formState.customInstructions,
          color: formState.primaryColor,
          showVoiceAI: formState.showVoiceAI,
          showTextAI: formState.showTextAI,
          showHome: formState.showHome,
          showNews: formState.showNews,
          showHelp: formState.showHelp,
          autoFeatures: { ...formState.autoFeatures },
          popUpQuestions: [...formState.popUpQuestions],
        });
      }

      showSuccessMessage(
        "Chatbot settings and auto features saved successfully!"
      );
    } catch (error) {
      console.error("Error saving settings:", error);
      showErrorMessage("Failed to save settings: " + error.message);
    } finally {
      hideSavingIndicator();
    }
  }

  /**
   * Validate the form
   * @returns {boolean} Is valid
   */
  function validateForm() {
    // Check word limits
    const welcomeMessage = $("#welcome-message").val();
    if (
      welcomeMessage &&
      welcomeMessage.trim() &&
      countWords(welcomeMessage.trim()) > 25
    ) {
      showErrorMessage("Welcome Message exceeds the 25 word limit.");
      return false;
    }

    const customInstructions = $("#custom-instructions").val();
    if (
      customInstructions &&
      customInstructions.trim() &&
      countWords(customInstructions.trim()) > 50
    ) {
      showErrorMessage("Custom Instructions exceeds the 50 word limit.");
      return false;
    }

    // Check popup questions limit
    if (formState.popUpQuestions.length > 3) {
      showErrorMessage("You can only have up to 3 popup questions.");
      return false;
    }

    return true;
  }

  /**
   * Show a saving indicator
   */
  function showSavingIndicator() {
    // Disable save button and show spinner
    $("#save-settings-btn")
      .prop("disabled", true)
      .html(
        '<span class="spinner is-active" style="float: none; margin: 0 5px 0 0;"></span> Saving...'
      );
  }

  /**
   * Hide the saving indicator
   */
  function hideSavingIndicator() {
    // Re-enable save button
    $("#save-settings-btn").prop("disabled", false).html("Save Settings");
  }

  /**
   * Show a success message (toast-like notification)
   * @param {string} message - The success message
   */
  function showSuccessMessage(message) {
    // Remove existing notices
    $(".voicero-toast").remove();

    // Create toast notification
    const $toast = $(`
      <div class="voicero-toast voicero-toast-success">
        <div class="voicero-toast-content">
          <span class="dashicons dashicons-yes-alt"></span>
          <span class="voicero-toast-message">${message}</span>
          <button type="button" class="voicero-toast-close" aria-label="Dismiss">
            <span class="dashicons dashicons-dismiss"></span>
          </button>
        </div>
      </div>
    `);

    // Add to page
    $("body").append($toast);

    // Show with animation
    setTimeout(() => $toast.addClass("voicero-toast-show"), 100);

    // Handle close button
    $toast.find(".voicero-toast-close").on("click", function () {
      $toast.removeClass("voicero-toast-show");
      setTimeout(() => $toast.remove(), 300);
    });

    // Auto-dismiss after 5 seconds
    setTimeout(function () {
      $toast.removeClass("voicero-toast-show");
      setTimeout(() => $toast.remove(), 300);
    }, 5000);
  }

  /**
   * Show an error message (toast-like notification)
   * @param {string} message - The error message
   */
  function showErrorMessage(message) {
    // Remove existing notices
    $(".voicero-toast").remove();

    // Create toast notification
    const $toast = $(`
      <div class="voicero-toast voicero-toast-error">
        <div class="voicero-toast-content">
          <span class="dashicons dashicons-warning"></span>
          <span class="voicero-toast-message">${message}</span>
          <button type="button" class="voicero-toast-close" aria-label="Dismiss">
            <span class="dashicons dashicons-dismiss"></span>
          </button>
        </div>
      </div>
    `);

    // Add to page
    $("body").append($toast);

    // Show with animation
    setTimeout(() => $toast.addClass("voicero-toast-show"), 100);

    // Handle close button
    $toast.find(".voicero-toast-close").on("click", function () {
      $toast.removeClass("voicero-toast-show");
      setTimeout(() => $toast.remove(), 300);
    });

    // Auto-dismiss after 8 seconds (longer for errors)
    setTimeout(function () {
      $toast.removeClass("voicero-toast-show");
      setTimeout(() => $toast.remove(), 300);
    }, 8000);
  }

  // Initialize when the DOM is ready
  $(document).ready(function () {
    // Check if we're on the chatbot page
    if ($(".voicero-chatbot-page").length > 0) {
      init();

      // Add CSS for the chatbot page
      addCustomCSS();
    }
  });

  /**
   * Add custom CSS for the chatbot page
   */
  function addCustomCSS() {
    $("head").append(`
            <style>
                /* Chatbot Customization Page Styles */
                .voicero-chatbot-page {
                    max-width: 800px;
                }
                
                .chatbot-header {
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
                }
                
                .required-badge {
                    background-color: #f0f6fc;
                    color: #2271b1;
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                .voicero-card-content {
                    padding: 20px;
                }
                
                .form-field {
                    margin-bottom: 20px;
                }
                
                .form-field:last-child {
                    margin-bottom: 0;
                }
                
                .form-field label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                }
                
                .form-field input[type="text"],
                .form-field textarea,
                .form-field select {
                    width: 100%;
                }
                
                .field-description {
                    margin-top: 5px;
                    color: #666;
                    font-style: italic;
                }
                
                .word-count {
                    text-align: right;
                    color: #666;
                    font-size: 12px;
                    margin-top: 5px;
                }
                
                .word-count.over-limit {
                    color: #d63638;
                    font-weight: 600;
                }
                
                /* Suggested Questions */
                .suggested-question-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    padding: 5px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    background-color: #f9f9f9;
                }
                
                .suggested-question-input {
                    flex-grow: 1;
                    margin-right: 10px;
                }
                
                .remove-question-btn {
                    color: #d63638;
                }
                
                .remove-question-btn:hover {
                    color: #b32d2e;
                }
                
                .question-counter {
                    margin: 10px 0;
                    color: #666;
                    font-size: 13px;
                }
                
                .add-question-field {
                    display: flex;
                    margin-top: 10px;
                }
                
                .add-question-field input {
                    flex-grow: 1;
                    margin-right: 10px;
                }
                
                .no-questions {
                    padding: 15px;
                    background-color: #f9f9f9;
                    border: 1px dashed #ddd;
                    text-align: center;
                    color: #666;
                    border-radius: 3px;
                }
                
                /* Color Picker */
                .color-picker-container {
                    margin-top: 10px;
                    display: flex;
                    align-items: center;
                }
                
                /* Icon Selector */
                .icon-selector {
                    display: flex;
                    align-items: center;
                    margin-top: 5px;
                }
                
                .icon-selector select {
                    margin-right: 10px;
                    width: 150px;
                }
                
                .icon-preview {
                    width: 40px;
                    height: 40px;
                    background-color: #f0f6fc;
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #ddd;
                }
                
                .icon-preview svg {
                    color: #2271b1;
                    width: 24px;
                    height: 24px;
                }
                
                /* Website Information */
                .info-field {
                    display: flex;
                    margin-bottom: 10px;
                }
                
                .info-field:last-child {
                    margin-bottom: 0;
                }
                
                .info-label {
                    font-weight: 600;
                    width: 120px;
                    flex-shrink: 0;
                }
                
                .info-value {
                    color: #333;
                }
                
                /* Checkbox Field */
                .checkbox-field {
                    display: flex;
                    align-items: flex-start;
                }
                
                .checkbox-field input[type="checkbox"] {
                    margin-top: 3px;
                    margin-right: 8px;
                }

                /* Toast Notifications */
                .voicero-toast {
                    position: fixed;
                    top: 32px;
                    right: 20px;
                    z-index: 100000;
                    max-width: 400px;
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease-in-out;
                }

                .voicero-toast.voicero-toast-show {
                    opacity: 1;
                    transform: translateX(0);
                }

                .voicero-toast-success {
                    background-color: #d4edda;
                    border-left: 4px solid #28a745;
                    color: #155724;
                }

                .voicero-toast-error {
                    background-color: #f8d7da;
                    border-left: 4px solid #dc3545;
                    color: #721c24;
                }

                .voicero-toast-content {
                    display: flex;
                    align-items: center;
                    padding: 12px 16px;
                    gap: 8px;
                }

                .voicero-toast-message {
                    flex-grow: 1;
                    font-weight: 500;
                }

                .voicero-toast-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 2px;
                    opacity: 0.7;
                }

                .voicero-toast-close:hover {
                    opacity: 1;
                }

                .voicero-toast .dashicons {
                    width: 18px;
                    height: 18px;
                    font-size: 18px;
                }

                /* Form Validation Errors */
                .voicero-form-error {
                    color: #d63638;
                    font-size: 12px;
                    margin-top: 4px;
                    display: none;
                }

                /* Improved form styling */
                .form-field {
                    position: relative;
                    margin-bottom: 20px;
                }

                .form-field input[type="text"],
                .form-field input[type="color"],
                .form-field textarea,
                .form-field select {
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    padding: 8px 12px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .form-field input[type="text"]:focus,
                .form-field input[type="color"]:focus,
                .form-field textarea:focus,
                .form-field select:focus {
                    border-color: #2271b1;
                    outline: none;
                    box-shadow: 0 0 0 1px #2271b1;
                }

                .color-preview {
                    width: 30px;
                    height: 30px;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                    display: inline-block;
                    vertical-align: middle;
                    margin-left: 10px;
                }

                /* Auto features grid */
                .auto-features-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 15px;
                    margin-top: 15px;
                }

                .auto-feature-item {
                    padding: 10px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background-color: #f9f9f9;
                }

                .auto-feature-item label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                }

                .auto-feature-item input[type="checkbox"] {
                    margin-right: 8px;
                }
            </style>
        `);
  }
})(jQuery);
