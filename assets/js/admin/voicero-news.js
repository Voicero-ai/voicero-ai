/**
 * Voicero News Interface JavaScript for WordPress
 */

jQuery(document).ready(function ($) {
  "use strict";

  // Global variables
  let newsData = null;
  let selectedBlogIndex = 0;
  let expandedArticleId = null;
  let isLoading = false;
  let isUpdatingHot = false;

  // Get configuration from WordPress
  const config = window.voiceroNewsConfig || {};
  const strings = config.strings || {};

  // Fetch news data from WordPress AJAX
  function fetchNewsData() {
    if (!config.accessKey) return;

    setLoadingState(true);
    hideError();

    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_get_news_data",
        nonce: config.nonce,
      },
      success: function (response) {
        console.log("News API Response:", response);
        if (response.success) {
          newsData = response.data;
          console.log("News Data:", newsData);
          renderNewsData();
        } else {
          console.error("News API Error:", response);
          showError(response.data?.message || strings.loadingError);
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error fetching news data:", {
          xhr: xhr,
          status: status,
          error: error,
          responseText: xhr.responseText,
        });
        showError(strings.loadingError + ": " + error);
      },
      complete: function () {
        setLoadingState(false);
      },
    });
  }

  // Toggle hot status for a post
  function toggleHotStatus(postId, currentHotStatus, websiteId) {
    if (!config.accessKey || isUpdatingHot) return;

    isUpdatingHot = true;

    const newHotStatus = currentHotStatus ? 0 : 1; // Convert to integer

    console.log("Toggle Hot Status Debug:", {
      postId: postId,
      currentHotStatus: currentHotStatus,
      newHotStatus: newHotStatus,
      websiteId: websiteId,
    });

    $.ajax({
      url: config.ajaxUrl,
      type: "POST",
      data: {
        action: "voicero_update_hot_status",
        nonce: config.nonce,
        postId: postId,
        websiteId: websiteId,
        hot: newHotStatus,
      },
      success: function (response) {
        if (response.success) {
          // Update the local data
          updatePostHotStatus(postId, newHotStatus);
          renderNewsData();

          // Show success toast
          showToast(
            !currentHotStatus ? strings.hotMarked : strings.hotRemoved,
            false
          );
        } else {
          showToast(response.data.message || strings.updateError, true);
        }
      },
      error: function (xhr, status, error) {
        console.error("Error updating hot status:", error);
        showToast(strings.updateError, true);
      },
      complete: function () {
        isUpdatingHot = false;
      },
    });
  }

  // Utility functions
  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function toggleArticleExpansion(articleId) {
    expandedArticleId = expandedArticleId === articleId ? null : articleId;
    updateArticleDisplay(articleId);
  }

  function updatePostHotStatus(postId, newHotStatus) {
    if (!newsData || !newsData.blogs) return;

    newsData.blogs.forEach((blog) => {
      // Handle both Shopify (blogPosts) and WordPress (content) structure
      const posts = blog.blogPosts || blog.content || [];
      posts.forEach((post) => {
        if (post.id === postId) {
          // newHotStatus is already 0 or 1, use it directly
          post.hot = newHotStatus;
        }
      });
    });
  }

  function getAllBlogPosts() {
    if (!newsData || !newsData.blogs) return [];

    const allPosts = [];
    newsData.blogs.forEach((blog) => {
      // Handle both Shopify (blogPosts) and WordPress (content) structure
      const posts = blog.blogPosts || blog.content || [];
      posts.forEach((post) => {
        allPosts.push({
          ...post,
          blogTitle: blog.title,
          websiteId: newsData.websiteId,
        });
      });
    });
    return allPosts;
  }

  function sortPostsByHotAndDate(posts) {
    return [...posts].sort((a, b) => {
      // First sort by hot status (hot posts first)
      if ((a.hot === 1 || a.hot === true) && b.hot !== 1 && b.hot !== true) {
        return -1;
      }
      if ((b.hot === 1 || b.hot === true) && a.hot !== 1 && a.hot !== true) {
        return 1;
      }
      // Then sort by date
      return (
        new Date(b.publishedAt || b.createdAt) -
        new Date(a.publishedAt || a.createdAt)
      );
    });
  }

  function getSelectedBlog() {
    if (!newsData || !newsData.blogs || selectedBlogIndex === 0) return null;
    return newsData.blogs[selectedBlogIndex - 1];
  }

  function getArticlesToDisplay() {
    if (selectedBlogIndex === 0) {
      // Show all posts
      return sortPostsByHotAndDate(getAllBlogPosts());
    } else {
      // Show posts from selected blog
      const selectedBlog = getSelectedBlog();
      if (selectedBlog) {
        // Handle both Shopify (blogPosts) and WordPress (content) structure
        const posts = selectedBlog.blogPosts || selectedBlog.content || [];
        return sortPostsByHotAndDate(posts);
      }
    }
    return [];
  }

  function countHotArticles() {
    const allPosts = getAllBlogPosts();
    return allPosts.filter(
      (post) => post.hot === 1 || post.hot === true
    ).length;
  }

  // DOM manipulation functions
  function setLoadingState(loading) {
    isLoading = loading;
    const loadingEl = $("#voicero-loading-state");
    const contentEl = $("#voicero-news-content");

    if (loading) {
      loadingEl.show();
      contentEl.hide();
    } else {
      loadingEl.hide();
    }
  }

  function showError(message) {
    $("#voicero-error-message").text(message);
    $("#voicero-error-state").show();
    $("#voicero-news-content").hide();
    $("#voicero-empty-state").hide();
  }

  function hideError() {
    $("#voicero-error-state").hide();
  }

  function showToast(message, isError) {
    const toast = $("#voicero-toast");
    const messageEl = $("#voicero-toast-message");

    messageEl.text(message);
    toast.removeClass("voicero-toast-error voicero-toast-success");
    toast.addClass(isError ? "voicero-toast-error" : "voicero-toast-success");
    toast.show();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.hide();
    }, 3000);
  }

  // Global function for hiding toast
  window.voiceroHideToast = function () {
    $("#voicero-toast").hide();
  };

  function updateHotPostsCounter() {
    const hotCount = countHotArticles();
    const indicator = $(".voicero-hot-indicator");
    const text = $(".voicero-hot-text");

    text.text(hotCount + "/2 Hot Posts");

    if (hotCount >= 2) {
      indicator.css("background-color", "#F59E0B");
      indicator.parent().css({
        "background-color": "#FEF3C7",
        border: "1px solid #F59E0B",
      });
      text.css("color", "#92400E");
    } else {
      indicator.css("background-color", "#0284C7");
      indicator.parent().css({
        "background-color": "#E0F2FE",
        border: "1px solid #0284C7",
      });
      text.css("color", "#0C4A6E");
    }
  }

  function renderBlogTabs() {
    const tabsContainer = $("#voicero-blog-tabs");
    let html =
      '<div class="voicero-tab voicero-tab-active" data-blog-index="0">All Blog Posts</div>';

    if (newsData && newsData.blogs) {
      newsData.blogs.forEach((blog, index) => {
        html += `<div class="voicero-tab" data-blog-index="${index + 1}">${
          blog.title
        }</div>`;
      });
    }

    tabsContainer.html(html);

    // Add click handlers
    $(".voicero-tab").on("click", function () {
      const blogIndex = parseInt($(this).data("blog-index"));
      selectBlog(blogIndex);
    });
  }

  function selectBlog(index) {
    selectedBlogIndex = index;

    // Update tab appearance
    $(".voicero-tab").removeClass("voicero-tab-active");
    $(`.voicero-tab[data-blog-index="${index}"]`).addClass(
      "voicero-tab-active"
    );

    // Update content
    renderBlogInfo();
    renderArticles();
  }

  function renderBlogInfo() {
    const blogInfoEl = $("#voicero-blog-info");
    const allPostsHeaderEl = $("#voicero-all-posts-header");

    if (selectedBlogIndex === 0) {
      // Show all posts header
      blogInfoEl.hide();
      allPostsHeaderEl.show();

      const allPosts = getAllBlogPosts();
      $("#voicero-all-posts-count").text(allPosts.length);
    } else {
      // Show selected blog info
      const selectedBlog = getSelectedBlog();
      if (selectedBlog) {
        const html = `
                    <div class="voicero-card voicero-blog-info-card">
                        <div class="voicero-blog-info-content">
                            <h3>${selectedBlog.title}</h3>
                            <div class="voicero-blog-posts-count">
                                ${
                                  selectedBlog.blogPosts
                                    ? selectedBlog.blogPosts.length
                                    : selectedBlog.content
                                    ? selectedBlog.content.length
                                    : 0
                                } ${strings.articles}
                            </div>
                        </div>
                        <p>Type: ${
                          selectedBlog.type || "Blog"
                        } | Created: ${formatDate(selectedBlog.createdAt)}</p>
                    </div>
                `;
        blogInfoEl.html(html).show();
      } else {
        blogInfoEl.hide();
      }
      allPostsHeaderEl.hide();
    }
  }

  function renderArticles() {
    const articlesContainer = $("#voicero-articles-list");
    const articles = getArticlesToDisplay();

    if (!articles || articles.length === 0) {
      articlesContainer.html(`
                <div class="voicero-empty-articles">
                    <div class="voicero-empty-icon">
                        <span class="dashicons dashicons-admin-post"></span>
                    </div>
                    <h3>No articles found</h3>
                    <p>No articles available in the selected blog.</p>
                </div>
            `);
      return;
    }

    let html = "";
    articles.forEach((article) => {
      html += renderArticleItem(article);
    });

    articlesContainer.html(html);

    // Add event handlers
    $(".voicero-article-toggle").on("click", function (e) {
      e.stopPropagation();
      const articleId = $(this).data("article-id");
      toggleArticleExpansion(articleId);
    });

    $(".voicero-hot-toggle").on("click", function (e) {
      e.stopPropagation();
      const articleId = $(this).data("article-id");

      // Find the actual current hot status from the data instead of relying on the HTML attribute
      const allPosts = getAllBlogPosts();
      const currentPost = allPosts.find((post) => post.id == articleId);
      // Convert to boolean for logic, but API expects 0/1 integers
      const currentHot = currentPost ? currentPost.hot === 1 : false;

      const websiteId = $(this).data("website-id");

      console.log("Hot Toggle Click Debug:", {
        articleId,
        currentPost,
        currentPostHotValue: currentPost ? currentPost.hot : "POST NOT FOUND",
        currentHot,
        willToggleTo: currentHot ? 0 : 1,
      });

      // Check limit: only prevent making NEW hot posts if we already have 2
      const hotCount = countHotArticles();
      if (!currentHot && hotCount >= 2) {
        showToast(
          "Maximum 2 hot posts allowed. Remove a hot post first.",
          true
        );
        return;
      }

      toggleHotStatus(articleId, currentHot, websiteId);
    });
  }

  function renderArticleItem(article) {
    const isExpanded = expandedArticleId === article.id;
    const isHot = article.hot === 1; // Only check for integer 1
    const websiteId = article.websiteId || (newsData ? newsData.websiteId : "");
    const isUpdatingHot = false; // Not updating during render

    return `
            <div class="voicero-article-item ${
              isHot ? "voicero-article-hot" : ""
            }" data-article-id="${article.id}">
                <div class="voicero-article-header">
                    <div class="voicero-article-title-section">
                        ${isHot ? '<div class="voicero-hot-icon">🔥</div>' : ""}
                        <h4 class="voicero-article-title">${article.title}</h4>
                  </div>
                    <div class="voicero-article-actions">
                        <button class="voicero-hot-toggle ${
                          isHot ? "voicero-hot-active" : ""
                        } ${isUpdatingHot ? "disabled" : ""}" 
                                data-article-id="${article.id}" 
                                data-current-hot="${isHot}" 
                                data-website-id="${websiteId}"
                                ${isUpdatingHot ? "disabled" : ""}>
                            <span class="dashicons dashicons-star-${
                              isHot ? "filled" : "empty"
                            }"></span>
                            ${isHot ? "Remove Hot" : "Make Hot"}
                        </button>
                        <button class="voicero-article-toggle" data-article-id="${
                          article.id
                        }">
                            <span class="dashicons dashicons-arrow-${
                              isExpanded ? "up" : "down"
                            }-alt2"></span>
                        </button>
              </div>
                </div>
                
                <div class="voicero-article-meta">
                    <span class="voicero-meta-tag voicero-meta-date">${formatDate(
                      article.publishedAt
                    )}</span>
                    ${
                      article.author
                        ? `<span class="voicero-meta-tag voicero-meta-author">${article.author}</span>`
                        : ""
                    }
                    ${
                      selectedBlogIndex === 0 && article.blogTitle
                        ? `<span class="voicero-meta-tag voicero-meta-blog">${article.blogTitle}</span>`
                        : ""
                    }
                    ${
                      isHot
                        ? '<span class="voicero-meta-tag voicero-meta-hot">🔥 Hot Post</span>'
                        : ""
                    }
                </div>
                
                <div class="voicero-article-content" id="voicero-article-content-${
                  article.id
                }" style="display: ${isExpanded ? "block" : "none"}">
                    <div class="voicero-article-content-wrapper">
                        <h5>Article Content</h5>
                        <div class="voicero-article-text">
                            ${
                              article.content ||
                              "<p>" + strings.noContent + "</p>"
                            }
                        </div>
                                </div>
                          </div>
                                  </div>
        `;
  }

  function updateArticleDisplay(articleId) {
    const contentEl = $(`#voicero-article-content-${articleId}`);
    const toggleBtn = $(
      `.voicero-article-toggle[data-article-id="${articleId}"] .dashicons`
    );

    if (expandedArticleId === articleId) {
      contentEl.show();
      toggleBtn
        .removeClass("dashicons-arrow-down-alt2")
        .addClass("dashicons-arrow-up-alt2");
    } else {
      contentEl.hide();
      toggleBtn
        .removeClass("dashicons-arrow-up-alt2")
        .addClass("dashicons-arrow-down-alt2");
    }
  }

  function renderNewsData() {
    if (!newsData) return;

    // Hide error state when we have data
    hideError();

    if (!newsData.blogs || newsData.blogs.length === 0) {
      $("#voicero-empty-state").show();
      $("#voicero-news-content").hide();
      return;
    }

    $("#voicero-empty-state").hide();
    $("#voicero-news-content").show();

    renderBlogTabs();
    renderBlogInfo();
    renderArticles();
    updateHotPostsCounter();
  }

  // Initialize the news interface
  function init() {
    // Only fetch news data if we're on the news page and have an access key
    if (config.accessKey && $(".voicero-news-page").length > 0) {
      console.log(
        "Initializing news interface with access key:",
        config.accessKey.substring(0, 10) + "..."
      );
      fetchNewsData();
    } else {
      console.log("News interface not initialized:", {
        hasAccessKey: !!config.accessKey,
        isNewsPage: $(".voicero-news-page").length > 0,
      });
    }

    // Add refresh functionality (if there's a refresh button)
    $(document).on("click", ".voicero-refresh-news", function () {
      fetchNewsData();
    });
  }

  // Initialize when DOM is ready
  init();
});
