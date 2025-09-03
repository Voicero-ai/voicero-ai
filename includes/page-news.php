<?php
/**
 * News Interface page for Voicero AI
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render the News Interface page
 */
function voicero_render_news_page() {
    // Get saved values
    $saved_key = voicero_get_access_key();
    
    if (!$saved_key) {
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('News Interface', 'voicero-ai'); ?></h1>
            <div class="notice notice-warning">
                <p><?php esc_html_e('Please connect your website first in the main settings.', 'voicero-ai'); ?></p>
            </div>
        </div>
        <?php
        return;
    }
    ?>
    
    <div class="wrap voicero-news-page">
        <h1><?php esc_html_e('News Interface Settings', 'voicero-ai'); ?></h1>
        
        <div class="voicero-news-container">
            <!-- Header Section -->
            <div class="voicero-card voicero-header-card">
                <div class="voicero-header-content">
                    <div class="voicero-header-info">
                        <div class="voicero-icon-wrapper voicero-icon-blue">
                            <span class="dashicons dashicons-admin-post"></span>
                        </div>
                        <div class="voicero-header-text">
                            <h3><?php esc_html_e('Blog Selection', 'voicero-ai'); ?></h3>
                            <p><?php esc_html_e('Choose which blog to view or browse all posts', 'voicero-ai'); ?></p>
                        </div>
                    </div>
                    <div class="voicero-hot-posts-counter">
                        <span class="voicero-hot-indicator"></span>
                        <span class="voicero-hot-text">0/2 Hot Posts</span>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div class="voicero-loading-state" id="voicero-loading-state">
                <div class="voicero-card">
                    <div class="voicero-loading-content">
                        <div class="voicero-spinner-wrapper">
                            <div class="voicero-spinner"></div>
                        </div>
                        <h3><?php esc_html_e('Loading news data...', 'voicero-ai'); ?></h3>
                        <p><?php esc_html_e('Fetching the latest blog posts and articles', 'voicero-ai'); ?></p>
                    </div>
                </div>
            </div>

          

            <!-- Main Content -->
            <div class="voicero-news-content" id="voicero-news-content" style="display: none;">
                <!-- Blog Tabs -->
                <div class="voicero-card">
                    <div class="voicero-tabs-container">
                        <div class="voicero-tabs" id="voicero-blog-tabs">
                            <!-- Tabs will be populated by JavaScript -->
                        </div>
                    </div>
                </div>

                <!-- Blog Info -->
                <div class="voicero-blog-info" id="voicero-blog-info" style="display: none;">
                    <!-- Blog info will be populated by JavaScript -->
                </div>

                <!-- All Posts Header -->
                <div class="voicero-all-posts-header" id="voicero-all-posts-header" style="display: none;">
                    <div class="voicero-card voicero-all-posts-card">
                        <div class="voicero-all-posts-content">
                            <div class="voicero-all-posts-info">
                                <div class="voicero-icon-wrapper voicero-icon-purple">
                                    <span class="dashicons dashicons-portfolio"></span>
                                </div>
                                <h3><?php esc_html_e('All Blog Posts', 'voicero-ai'); ?></h3>
                            </div>
                            <div class="voicero-posts-counter">
                                <span id="voicero-all-posts-count">0</span> <?php esc_html_e('articles', 'voicero-ai'); ?>
                            </div>
                        </div>
                        <p><?php esc_html_e('Showing posts from all blogs, sorted by publish date', 'voicero-ai'); ?></p>
                    </div>
                </div>

                <!-- Articles List -->
                <div class="voicero-card">
                    <div class="voicero-articles-header">
                        <div class="voicero-icon-wrapper voicero-icon-green">
                            <span class="dashicons dashicons-chart-bar"></span>
                        </div>
                        <h3><?php esc_html_e('Articles', 'voicero-ai'); ?></h3>
                    </div>
                    <div class="voicero-articles-list" id="voicero-articles-list">
                        <!-- Articles will be populated by JavaScript -->
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div class="voicero-empty-state" id="voicero-empty-state" style="display: none;">
                <div class="voicero-card">
                    <div class="voicero-empty-content">
                        <div class="voicero-empty-icon">
                            <span class="dashicons dashicons-admin-post"></span>
                        </div>
                        <h3><?php esc_html_e('No blogs found', 'voicero-ai'); ?></h3>
                        <p><?php esc_html_e('No blog data is available from the API.', 'voicero-ai'); ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast Notifications -->
        <div class="voicero-toast" id="voicero-toast" style="display: none;">
            <span class="voicero-toast-message" id="voicero-toast-message"></span>
            <button class="voicero-toast-close" onclick="voiceroHideToast()">&times;</button>
        </div>
    </div>

    <?php
}

/**
 * Enqueue News Interface scripts and styles
 */
function voicero_news_enqueue_assets($hook_suffix) {
    // Only load on news page
    if (strpos($hook_suffix, 'voicero-ai-news') === false) {
        return;
    }

    // Enqueue the news-specific JavaScript
    wp_register_script(
        'voicero-news-js',
        plugin_dir_url(__FILE__) . '../assets/js/admin/voicero-news.js',
        ['jquery'],
        '1.0.0',
        true
    );
    wp_enqueue_script('voicero-news-js');

    // Localize script with WordPress data
    wp_localize_script(
        'voicero-news-js',
        'voiceroNewsConfig',
        [
            'ajaxUrl'   => admin_url('admin-ajax.php'),
            'nonce'     => wp_create_nonce('voicero_ajax_nonce'),
            'accessKey' => voicero_get_access_key(),
            'apiUrl'    => defined('VOICERO_API_URL') ? VOICERO_API_URL : 'https://d37c011f0026.ngrok-free.app/api',
            'websiteId' => get_option('voicero_website_id', ''),
            'strings' => [
                'loadingError' => esc_html__('Error loading news data', 'voicero-ai'),
                'updateError' => esc_html__('Error updating hot status', 'voicero-ai'),
                'hotMarked' => esc_html__('Post marked as hot!', 'voicero-ai'),
                'hotRemoved' => esc_html__('Post removed from hot', 'voicero-ai'),
                'maxHotReached' => esc_html__('Maximum of 2 hot posts allowed', 'voicero-ai'),
                'noContent' => esc_html__('No content available', 'voicero-ai'),
                'articles' => esc_html__('articles', 'voicero-ai'),
            ]
        ]
    );

    // Enqueue admin styles (shared)
    wp_enqueue_style('voicero-admin-style');
}
add_action('admin_enqueue_scripts', 'voicero_news_enqueue_assets');

/**
 * AJAX handler for fetching news data
 */
function voicero_get_news_data() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }

    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => 'No access key found']);
        return;
    }

    try {
        // Call the external news API endpoint with Bearer token auth
        $response = wp_remote_post('https://d37c011f0026.ngrok-free.app/api/news', [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode([]),
            'timeout' => 30,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => $response->get_error_message()]);
            return;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        // Log the raw response for debugging
        error_log('Hot API Response Code: ' . $response_code);
        error_log('Hot API Response Body: ' . $body);

        if ($response_code !== 200) {
            wp_send_json_error(['message' => 'Server returned error: ' . $response_code . ' - ' . $body]);
            return;
        }

        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $json_error = json_last_error_msg();
            error_log('JSON Decode Error: ' . $json_error);
            error_log('Raw Response Body: ' . $body);
            wp_send_json_error(['message' => 'Invalid response from server: ' . $json_error . '. Raw response: ' . substr($body, 0, 200)]);
            return;
        }

        wp_send_json_success($data);

    } catch (Exception $e) {
        wp_send_json_error(['message' => $e->getMessage()]);
    }
}
add_action('wp_ajax_voicero_get_news_data', 'voicero_get_news_data');

/**
 * AJAX handler for updating hot status
 */
function voicero_update_hot_status() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }

    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => 'No access key found']);
        return;
    }

    $post_id = isset($_POST['postId']) ? sanitize_text_field(wp_unslash($_POST['postId'])) : '';
    $website_id = isset($_POST['websiteId']) ? sanitize_text_field(wp_unslash($_POST['websiteId'])) : '';
    $hot = isset($_POST['hot']) ? (bool) wp_unslash($_POST['hot']) : false;

    if (empty($post_id) || empty($website_id)) {
        wp_send_json_error(['message' => 'Missing required parameters']);
        return;
    }

    try {
        $response = wp_remote_post('https://d37c011f0026.ngrok-free.app/api/news/hot', [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode([
                'postId' => $post_id,
                'websiteId' => $website_id,
                'hot' => $hot
            ]),
            'timeout' => 15,
            'sslverify' => false
        ]);

        if (is_wp_error($response)) {
            wp_send_json_error(['message' => $response->get_error_message()]);
            return;
        }

        $response_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);

        if ($response_code === 400) {
            // Parse the error message from the 400 response
            $error_data = json_decode($body, true);
            $error_message = isset($error_data['error']) ? $error_data['error'] : 'Bad request error';
            
            // If it's the Shopify-only error, provide a helpful message
            if (strpos($error_message, 'not a Shopify store') !== false) {
                wp_send_json_error(['message' => 'Hot post feature is currently only available for Shopify stores. WordPress support coming soon.']);
                return;
            }
            
            wp_send_json_error(['message' => $error_message]);
            return;
        }

        if ($response_code !== 200) {
            wp_send_json_error(['message' => 'Server returned error: ' . $response_code . ' - ' . $body]);
            return;
        }

        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error(['message' => 'Invalid response from server']);
            return;
        }

        wp_send_json_success($data);

    } catch (Exception $e) {
        wp_send_json_error(['message' => $e->getMessage()]);
    }
}
add_action('wp_ajax_voicero_update_hot_status', 'voicero_update_hot_status');
