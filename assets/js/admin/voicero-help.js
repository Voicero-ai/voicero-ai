/**
 * Voicero Help Center Interface
 * Plain JavaScript (no React/Remix dependencies)
 */

jQuery(document).ready(function ($) {
  // Configuration from PHP
  const config = window.voiceroHelpConfig || {};
  const strings = config.strings || {};

  // Global state
  let helpData = null;
  let questions = [];
  let selectedQuestion = null;
  let isEditing = false;
  let isLoading = false;
  let isSubmitting = false;

  // Utility functions
  function showToast(message, isError = false) {
    const toastContainer = $("#voicero-toast-container");
    const toastClass = isError
      ? "voicero-toast-error"
      : "voicero-toast-success";
    const iconClass = isError ? "dashicons-warning" : "dashicons-yes";

    const toast = $(`
      <div class="voicero-toast ${toastClass}">
        <span class="dashicons ${iconClass}"></span>
        <span class="voicero-toast-message">${message}</span>
        <button class="voicero-toast-close">
          <span class="dashicons dashicons-no-alt"></span>
        </button>
      </div>
    `);

    toastContainer.append(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.fadeOut(300, () => toast.remove());
    }, 3000);

    // Remove on click
    toast.find(".voicero-toast-close").on("click", () => {
      toast.fadeOut(300, () => toast.remove());
    });
  }

  function setLoadingState(loading) {
    isLoading = loading;
    if (loading) {
      $("#voicero-help-loading").show();
      $("#voicero-help-content").hide();
      hideError();
    } else {
      $("#voicero-help-loading").hide();
      $("#voicero-help-content").show();
    }
  }

  function showError(message) {
    $("#voicero-help-error-message").text(message);
    $("#voicero-help-error").show();
    $("#voicero-help-content").hide();
    $("#voicero-help-loading").hide();
  }

  function hideError() {
    $("#voicero-help-error").hide();
  }

  function ensureHtml(content) {
    if (!content) return "";
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    return looksLikeHtml ? content : content;
  }

  function fetchQuestions() {
    if (!config.accessKey) return;

    setLoadingState(true);

    $.post(config.ajaxUrl, {
      action: "voicero_get_help_data",
      nonce: config.nonce,
    })
      .done(function (response) {
        if (response.success) {
          helpData = response.data;
          const modules = Array.isArray(helpData.modules)
            ? helpData.modules
            : [];
          questions = modules.map((m) => ({
            id: m.id,
            title: m.question,
            order: Number(m.number) || 0,
            isAIGenerated: (m.type || "manual") === "ai",
            status: m.status || "draft",
            content: ensureHtml(m.documentAnswer || ""),
            websiteId: m.websiteId,
          }));

          selectedQuestion = questions[0] || null;
          hideError();
          renderHelpInterface();
        } else {
          showError(response.data.message || strings.error);
        }
      })
      .fail(function (xhr) {
        showError("Failed to load help center: " + xhr.responseText);
      })
      .always(function () {
        setLoadingState(false);
      });
  }

  function handleSave() {
    if (!selectedQuestion) return;

    isSubmitting = true;
    updateSubmittingState();

    const editTitle = $("#voicero-edit-title").val();
    const editContent = $("#voicero-content-editor").html();

    $.post(config.ajaxUrl, {
      action: "voicero_save_help_question",
      nonce: config.nonce,
      id: selectedQuestion.id,
      question: editTitle,
      documentAnswer: editContent,
      number: selectedQuestion.order,
      type: selectedQuestion.isAIGenerated ? "ai" : "manual",
      status: selectedQuestion.status,
    })
      .done(function (response) {
        if (response.success) {
          // Update local data
          const questionIndex = questions.findIndex(
            (q) => q.id === selectedQuestion.id
          );
          if (questionIndex !== -1) {
            questions[questionIndex].content = ensureHtml(editContent);
            questions[questionIndex].title = editTitle;
          }

          selectedQuestion.content = ensureHtml(editContent);
          selectedQuestion.title = editTitle;

          setEditingMode(false);
          renderHelpInterface();
          showToast(strings.saveSuccess);
        } else {
          showToast(response.data.message || strings.saveFailed, true);
        }
      })
      .fail(function () {
        showToast(strings.saveFailed, true);
      })
      .always(function () {
        isSubmitting = false;
        updateSubmittingState();
      });
  }

  function updatePublishStatus(nextStatus) {
    if (!selectedQuestion) return;

    isSubmitting = true;
    updateSubmittingState();

    $.post(config.ajaxUrl, {
      action: "voicero_save_help_question",
      nonce: config.nonce,
      id: selectedQuestion.id,
      question: selectedQuestion.title,
      documentAnswer: selectedQuestion.content,
      number: selectedQuestion.order,
      type: selectedQuestion.isAIGenerated ? "ai" : "manual",
      status: nextStatus,
    })
      .done(function (response) {
        if (response.success) {
          // Update local data
          const questionIndex = questions.findIndex(
            (q) => q.id === selectedQuestion.id
          );
          if (questionIndex !== -1) {
            questions[questionIndex].status = nextStatus;
          }

          selectedQuestion.status = nextStatus;
          renderHelpInterface();

          const message =
            nextStatus === "published"
              ? strings.publishSuccess
              : strings.unpublishSuccess;
          showToast(message);
        } else {
          showToast(response.data.message || "Failed to update status", true);
        }
      })
      .fail(function () {
        showToast("Failed to update status", true);
      })
      .always(function () {
        isSubmitting = false;
        updateSubmittingState();
      });
  }

  function handlePublish() {
    updatePublishStatus("published");
  }

  function handleUnpublish() {
    updatePublishStatus("draft");
  }

  function handleDelete(id) {
    if (!id) return;

    if (!confirm(strings.confirmDelete)) {
      return;
    }

    isSubmitting = true;
    updateSubmittingState();

    $.post(config.ajaxUrl, {
      action: "voicero_delete_help_question",
      nonce: config.nonce,
      id: id,
    })
      .done(function (response) {
        if (response.success) {
          // Remove from local data
          questions = questions.filter((q) => q.id !== id);

          // Update selected question
          if (selectedQuestion && selectedQuestion.id === id) {
            selectedQuestion = questions[0] || null;
          }

          renderHelpInterface();
          showToast(strings.deleteSuccess);
        } else {
          showToast(response.data.message || strings.deleteFailed, true);
        }
      })
      .fail(function () {
        showToast(strings.deleteFailed, true);
      })
      .always(function () {
        isSubmitting = false;
        updateSubmittingState();
      });
  }

  function handleAdd() {
    isSubmitting = true;
    updateSubmittingState();

    const nextOrder =
      questions.reduce((max, q) => Math.max(max, Number(q.order) || 0), 0) + 1;
    const draftTitle = "New Question";
    const draftContent = "<p></p>";

    $.post(config.ajaxUrl, {
      action: "voicero_add_help_question",
      nonce: config.nonce,
      question: draftTitle,
      documentAnswer: draftContent,
      number: nextOrder,
      type: "manual",
      status: "draft",
    })
      .done(function (response) {
        if (response.success) {
          const created =
            response.data.module ||
            response.data.created ||
            response.data.result ||
            {};
          const newItem = {
            id: created.id || Date.now().toString(),
            title: draftTitle,
            order: nextOrder,
            isAIGenerated: false,
            status: "draft",
            content: ensureHtml(draftContent),
            websiteId: created.websiteId || null,
          };

          questions.push(newItem);
          questions.sort((a, b) => a.order - b.order);

          selectedQuestion = newItem;
          setEditingMode(true);

          $("#voicero-edit-title").val(draftTitle);
          $("#voicero-content-editor").html(draftContent);

          renderHelpInterface();
          showToast(strings.addSuccess);
        } else {
          showToast(response.data.message || strings.addFailed, true);
        }
      })
      .fail(function () {
        showToast(strings.addFailed, true);
      })
      .always(function () {
        isSubmitting = false;
        updateSubmittingState();
      });
  }

  function updateSubmittingState() {
    const buttons = $(
      "#voicero-add-question, #voicero-add-first-question, #voicero-save-changes, #voicero-edit-question, #voicero-publish-question, #voicero-unpublish-question"
    );
    buttons.prop("disabled", isSubmitting);

    if (isSubmitting) {
      buttons.addClass("loading");
    } else {
      buttons.removeClass("loading");
    }
  }

  function setEditingMode(editing) {
    isEditing = editing;

    if (editing) {
      $("#voicero-question-title-display").hide();
      $("#voicero-question-title-edit").show();
      $("#voicero-content-display").hide();
      $("#voicero-content-edit").show();
      $("#voicero-view-actions").hide();
      $("#voicero-edit-actions").show();
    } else {
      $("#voicero-question-title-display").show();
      $("#voicero-question-title-edit").hide();
      $("#voicero-content-display").show();
      $("#voicero-content-edit").hide();
      $("#voicero-view-actions").show();
      $("#voicero-edit-actions").hide();
    }
  }

  function renderHelpInterface() {
    if (questions.length === 0) {
      $("#voicero-no-selection").show();
      $("#voicero-question-content").hide();
    } else {
      $("#voicero-no-selection").hide();
      $("#voicero-question-content").show();
    }

    renderQuestionsList();
    renderSelectedQuestion();
  }

  function renderQuestionsList() {
    const questionsList = $("#voicero-questions-list");

    if (questions.length === 0) {
      questionsList.html(
        '<p class="voicero-empty-message">No questions yet</p>'
      );
      return;
    }

    let html = "";
    questions.forEach((question) => {
      const isSelected =
        selectedQuestion && selectedQuestion.id === question.id;
      const statusClass =
        question.status === "published" ? "published" : "draft";
      const typeClass = question.isAIGenerated ? "ai-generated" : "manual";

      html += `
        <div class="voicero-question-item ${
          isSelected ? "selected" : ""
        }" data-question-id="${question.id}">
          <div class="voicero-question-header">
            <h4 class="voicero-question-title">${question.title}</h4>
            <div class="voicero-question-order">#${question.order}</div>
          </div>
          <div class="voicero-question-meta">
            <span class="voicero-badge voicero-badge-${typeClass}">
              <span class="dashicons ${
                question.isAIGenerated
                  ? "dashicons-admin-tools"
                  : "dashicons-edit"
              }"></span>
              ${question.isAIGenerated ? "AI Generated" : "Manual"}
            </span>
            <span class="voicero-badge voicero-badge-${statusClass}">
              <span class="dashicons ${
                question.status === "published"
                  ? "dashicons-yes"
                  : "dashicons-visibility"
              }"></span>
              ${question.status === "published" ? "Published" : "Draft"}
            </span>
          </div>
          <div class="voicero-question-actions">
            <button class="voicero-delete-question button button-small" data-question-id="${
              question.id
            }">
              <span class="dashicons dashicons-trash"></span>
              Delete
            </button>
          </div>
        </div>
      `;
    });

    questionsList.html(html);
  }

  function renderSelectedQuestion() {
    if (!selectedQuestion) return;

    // Render title
    $("#voicero-question-title-display").html(
      `<h2>${selectedQuestion.title}</h2>`
    );
    $("#voicero-edit-title").val(selectedQuestion.title);

    // Render meta
    const typeClass = selectedQuestion.isAIGenerated
      ? "ai-generated"
      : "manual";
    const statusClass =
      selectedQuestion.status === "published" ? "published" : "draft";

    const metaHtml = `
      <div class="voicero-meta-tags">
        <span class="voicero-meta-tag">#${selectedQuestion.order}</span>
        <span class="voicero-badge voicero-badge-${typeClass}">
          <span class="dashicons ${
            selectedQuestion.isAIGenerated
              ? "dashicons-admin-tools"
              : "dashicons-edit"
          }"></span>
          ${selectedQuestion.isAIGenerated ? "AI Generated" : "Manual"}
        </span>
        <span class="voicero-badge voicero-badge-${statusClass}">
          <span class="dashicons ${
            selectedQuestion.status === "published"
              ? "dashicons-yes"
              : "dashicons-visibility"
          }"></span>
          ${selectedQuestion.status === "published" ? "Published" : "Draft"}
        </span>
      </div>
    `;
    $(".voicero-question-meta").html(metaHtml);

    // Render content
    $("#voicero-content-display").html(selectedQuestion.content);
    $("#voicero-content-editor").html(selectedQuestion.content);

    // Update publish/unpublish button visibility
    if (selectedQuestion.status === "published") {
      $("#voicero-publish-question").hide();
      $("#voicero-unpublish-question").show();
    } else {
      $("#voicero-publish-question").show();
      $("#voicero-unpublish-question").hide();
    }
  }

  function setupEventHandlers() {
    // Refresh button
    $("#voicero-refresh-help").on("click", fetchQuestions);

    // Retry button
    $("#voicero-retry-help").on("click", fetchQuestions);

    // Add question buttons
    $("#voicero-add-question, #voicero-add-first-question").on(
      "click",
      handleAdd
    );

    // Edit mode buttons
    $("#voicero-edit-question").on("click", function () {
      setEditingMode(true);
    });

    $("#voicero-cancel-edit").on("click", function () {
      setEditingMode(false);
      renderSelectedQuestion(); // Reset form values
    });

    $("#voicero-save-changes").on("click", handleSave);

    // Publish/unpublish buttons
    $("#voicero-publish-question").on("click", handlePublish);
    $("#voicero-unpublish-question").on("click", handleUnpublish);

    // Question selection
    $(document).on("click", ".voicero-question-item", function () {
      const questionId = $(this).data("question-id");
      selectedQuestion = questions.find((q) => q.id == questionId);
      if (selectedQuestion) {
        setEditingMode(false);
        renderHelpInterface();
      }
    });

    // Delete question
    $(document).on("click", ".voicero-delete-question", function (e) {
      e.stopPropagation();
      const questionId = $(this).data("question-id");
      handleDelete(questionId);
    });

    // Rich text editor toolbar
    $(document).on("click", ".voicero-format-btn", function () {
      const format = $(this).data("format");
      const editor = document.getElementById("voicero-content-editor");

      if (format === "createLink") {
        const url = prompt("Enter URL:");
        if (url) {
          document.execCommand(format, false, url);
        }
      } else {
        document.execCommand(format, false, null);
      }

      editor.focus();
    });
  }

  // Initialize the help interface
  function init() {
    if (config.accessKey && $(".voicero-help-page").length > 0) {
      setupEventHandlers();
      fetchQuestions();
    }
  }

  // Start initialization
  init();
});
