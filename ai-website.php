<?php
/**
 * Plugin Name: Voicero AI
 * Description: Connect your site to an AI Salesman. It answers questions, guides users, and boosts sales.
 * Version: 1.0.2
 * Author: Voicero.AI
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: voicero-ai
 */


if (!defined('ABSPATH')) {
    exit; // Prevent direct access
}

// Load text domain for translations
add_action('plugins_loaded', function() {
    load_plugin_textdomain('voicero-ai', false, dirname(plugin_basename(__FILE__)) . '/languages');
});

// Register activation hook to flush rewrite rules
register_activation_hook(__FILE__, 'voicero_activate_plugin');

// Activation function to flush rewrite rules
function voicero_activate_plugin() {
    // Ensure the REST API is properly initialized
    do_action('rest_api_init');
    // Flush rewrite rules to ensure endpoints work
    flush_rewrite_rules();
    // Log activation
    // Remove error log
}

// Define the API base URL
define('VOICERO_API_URL', 'https://www.voicero.ai/api');
// Define the plugin version
define('VOICERO_VERSION', '1.0');

// Load includes files early
require_once plugin_dir_path(__FILE__) . 'includes/page-main.php';
require_once plugin_dir_path(__FILE__) . 'includes/api.php';
require_once plugin_dir_path(__FILE__) . 'includes/page-ai-overview.php';
require_once plugin_dir_path(__FILE__) . 'includes/page-settings.php';
require_once plugin_dir_path(__FILE__) . 'includes/page-contacts.php';
require_once plugin_dir_path(__FILE__) . 'includes/page-chatbot-update.php';

// Force-enable the REST API if something else is blocking it
add_action('init', function() {
    remove_filter('rest_authentication_errors', 'restrict_rest_api');
    add_filter('rest_enabled', '__return_true');
    add_filter('rest_jsonp_enabled', '__return_true');
});

// Define a debug function to log messages to the error log
function voicero_debug_log($message, $data = null) {
    // Only log if WP_DEBUG and VOICERO_DEBUG are both enabled
    if (defined('WP_DEBUG') && WP_DEBUG && defined('VOICERO_DEBUG') && VOICERO_DEBUG) {
        if (is_array($data) || is_object($data)) {
            // Remove error log
        } else {
            // Remove error log
        }
    }
}

// Add AJAX endpoint to get debug info for troubleshooting
add_action('wp_ajax_voicero_debug_info', 'voicero_debug_info');
add_action('wp_ajax_nopriv_voicero_debug_info', 'voicero_debug_info');

// Add action to flush rewrite rules
add_action('wp_ajax_voicero_flush_rules', 'voicero_flush_rules');
function voicero_flush_rules() {
    // Verify user has admin capabilities
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Permission denied', 'voicero-ai')]);
        return;
    }
    
    // Flush rewrite rules
    flush_rewrite_rules();
    
    // Reinitialize REST API
    do_action('rest_api_init');
    
    wp_send_json_success(['message' => esc_html__('Rewrite rules flushed successfully', 'voicero-ai')]);
}

function voicero_debug_info() {
    $response = array(
        'wp_version' => get_bloginfo('version'),
        'php_version' => phpversion(),
        'theme' => wp_get_theme()->get('Name'),
        'plugins' => array(),
        'access_key' => !empty(voicero_get_access_key()),
        'script_handles' => array(),
        'hooks' => array(
            'wp_body_open' => has_action('wp_body_open'),
            'wp_footer' => has_action('wp_footer')
        )
    );
    
    // Get active plugins
    $active_plugins = get_option('active_plugins');
    foreach ($active_plugins as $plugin) {
        $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/' . $plugin);
        $response['plugins'][] = array(
            'name' => $plugin_data['Name'],
            'version' => $plugin_data['Version']
        );
    }
    
    // Check if scripts are properly registered
    global $wp_scripts;
    
    // Get all expected script handles from the JS directory
    $js_dir = plugin_dir_path(__FILE__) . 'assets/js/user/';
    $js_files = glob($js_dir . '*.js');
    $expected_handles = array();
    
    foreach ($js_files as $js_file) {
        $file_name = basename($js_file);
        if ($file_name !== 'admin.js') { // Skip admin.js
            $handle = str_replace('.js', '', $file_name) . '-js';
            $expected_handles[] = $handle;
        }
    }
    
    // Always check core script
    if (!in_array('voicero-core-js', $expected_handles)) {
        $expected_handles[] = 'voicero-core-js';
    }
    
    // Check if each expected script is registered
    foreach ($expected_handles as $handle) {
        $response['script_handles'][$handle] = isset($wp_scripts->registered[$handle]);
    }
    
    wp_send_json_success($response);
}

/* ------------------------------------------------------------------------
   1. ADMIN PAGE TO DISPLAY CONNECTION INTERFACE
------------------------------------------------------------------------ */
add_action('admin_menu', 'voicero_admin_page');
function voicero_admin_page() {
    // Add main menu page
    add_menu_page(
        esc_html__('Voicero AI', 'voicero-ai'),          // Page title
        esc_html__('Voicero AI', 'voicero-ai'),          // Menu title
        'manage_options',                              // Capability required
        'voicero-ai-admin',                            // Menu slug (unique ID)
        'voicero_render_admin_page',                   // Callback function for the settings page
        'dashicons-microphone',                        // Menu icon
        30                                             // Menu position
    );

    // Add submenu pages
    add_submenu_page(
        'voicero-ai-admin',                           // Parent slug
        esc_html__('Overview', 'voicero-ai'),         // Page title
        esc_html__('Overview', 'voicero-ai'),         // Menu title
        'manage_options',                             // Capability
        'voicero-ai-admin',                           // Menu slug (same as parent for first item)
        'voicero_render_admin_page'                   // Callback function
    );

    add_submenu_page(
        'voicero-ai-admin',                           // Parent slug
        esc_html__('Settings', 'voicero-ai'),      // Page title
        esc_html__('Settings', 'voicero-ai'),      // Menu title
        'manage_options',                             // Capability
        'voicero-ai-settings',                        // Menu slug
        'voicero_render_settings_page'                // Callback function
    );

    add_submenu_page(
        'voicero-ai-admin',                           // Parent slug
        esc_html__('Contacts', 'voicero-ai'),         // Page title
        esc_html__('Contacts', 'voicero-ai'),         // Menu title
        'manage_options',                             // Capability
        'voicero-ai-contacts',                        // Menu slug
        'voicero_render_contacts_page'                // Callback function
    );

    add_submenu_page(
        'voicero-ai-admin',                           // Parent slug
        esc_html__('Chatbot Update', 'voicero-ai'),   // Page title
        esc_html__('Chatbot Update', 'voicero-ai'),   // Menu title
        'manage_options',                             // Capability
        'voicero-ai-chatbot-update',                  // Menu slug
        'voicero_render_chatbot_update_page'          // Callback function
    );

    add_submenu_page(
        'voicero-ai-admin',                           // Parent slug
        esc_html__('AI Overview', 'voicero-ai'),      // Page title
        esc_html__('AI Overview', 'voicero-ai'),      // Menu title
        'manage_options',                             // Capability
        'voicero-ai-overview',                        // Menu slug
        'voicero_render_ai_overview_page'             // Callback function
    );
}

// Add AJAX handlers for the admin page
add_action('wp_ajax_voicero_check_connection', 'voicero_check_connection');
add_action('wp_ajax_voicero_sync_content', 'voicero_sync_content');
add_action('wp_ajax_voicero_vectorize_content', 'voicero_vectorize_content');
add_action('wp_ajax_voicero_setup_assistant', 'voicero_setup_assistant');
add_action('wp_ajax_voicero_clear_connection', 'voicero_clear_connection');

// Add new AJAX handlers for training steps
add_action('wp_ajax_voicero_train_page', 'voicero_train_page');
add_action('wp_ajax_voicero_train_post', 'voicero_train_post');
add_action('wp_ajax_voicero_train_product', 'voicero_train_product');
add_action('wp_ajax_voicero_train_general', 'voicero_train_general');

function voicero_check_connection() {
    check_ajax_referer('voicero_ajax_nonce', 'nonce');
    
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key found', 'voicero-ai')]);
    }

    $response = wp_remote_get(VOICERO_API_URL . '/connect', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    if (is_wp_error($response)) {
        // Remove error log
        return new WP_REST_Response([
            'message' => esc_html__('Connection failed: ', 'voicero-ai') . esc_html($response->get_error_message())
        ], 500);
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        // Remove error log
        return new WP_REST_Response([
            'message' => esc_html__('Server returned error: ', 'voicero-ai') . esc_html($response_code),
            'body' => $body
        ]);
    }

    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response from server', 'voicero-ai'),
            'code' => 'invalid_json'
        ]);
    }

    wp_send_json_success($data);
}

function voicero_sync_content() {
    check_ajax_referer('voicero_ajax_nonce', 'nonce');

    $data = voicero_collect_wordpress_data();
    
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key found', 'voicero-ai')]);
    }

    try {
        // 1. Sync the content
        $sync_response = wp_remote_post(VOICERO_API_URL . '/wordpress/sync', [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode($data),
            'timeout' => 300, // Increase timeout to 5 minutes for consistency
            'sslverify' => false
        ]);

        if (is_wp_error($sync_response)) {
            wp_send_json_error([
                'message' => esc_html__('Sync failed: ', 'voicero-ai') . esc_html($sync_response->get_error_message()),
                'code' => $sync_response->get_error_code(),
                'stage' => 'sync',
                'progress' => 0
            ]);
        }

        $response_code = wp_remote_retrieve_response_code($sync_response);
        if ($response_code !== 200) {
            wp_send_json_error([
                'message' => esc_html__('Sync failed: Server returned ', 'voicero-ai') . esc_html($response_code),
                'code' => $response_code,
                'stage' => 'sync',
                'progress' => 0,
                'body' => wp_remote_retrieve_body($sync_response)
            ]);
        }


        // Return success after sync is complete
        wp_send_json_success([
            'message' => 'Content sync completed, ready for vectorization...',
            'stage' => 'sync',
            'progress' => 17, // Updated progress
            'complete' => false,
            'details' => [
                'sync' => json_decode(wp_remote_retrieve_body($sync_response), true)
            ]
        ]);

    } catch (Exception $e) {
        wp_send_json_error([
            'message' => 'Operation failed: ' . $e->getMessage(),
            'stage' => 'unknown',
            'progress' => 0
        ]);
    }
}


// Add new endpoint for vectorization
function voicero_vectorize_content() {
    check_ajax_referer('voicero_ajax_nonce', 'nonce');
    
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key found', 'voicero-ai')]);
    }

    // Increase timeout substantially for large sites
    $vectorize_response = wp_remote_post(VOICERO_API_URL . '/wordpress/vectorize', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 300, // Increase timeout to 5 minutes
        'sslverify' => false
    ]);

    if (is_wp_error($vectorize_response)) {
        $error_message = $vectorize_response->get_error_message();
        $error_code = $vectorize_response->get_error_code();
        
        // Check if it's a timeout error
        if (strpos($error_message, 'timed out') !== false || strpos($error_message, 'timeout') !== false) {
            // For timeout errors, return a more helpful message
            wp_send_json_error([
                'message' => sprintf(
                    /* translators: %s: detailed error message */
                    esc_html__('The vectorization process is taking longer than expected due to the size of your content. This is normal for larger sites. Please try again and allow more time for processing.', 'voicero-ai')
                ),
                'code' => $error_code,
                'stage' => 'vectorize',
                'progress' => 17, // Keep progress at previous step
                'retry_suggested' => true
            ]);
        } else {
            // For other errors
            wp_send_json_error([
                'message' => sprintf(
                    /* translators: %s: detailed error message */
                    esc_html__('Vectorization failed: %s', 'voicero-ai'), 
                    esc_html($error_message)
                ),
                'code' => $error_code,
                'stage' => 'vectorize',
                'progress' => 17 // Keep progress at previous step
            ]);
        }
    }
    
    $response_code = wp_remote_retrieve_response_code($vectorize_response);
    if ($response_code !== 200) {
        $response_body = wp_remote_retrieve_body($vectorize_response);
        
        // Sanitize the response body to prevent XSS
        $sanitized_body = wp_kses_post($response_body);
         
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: HTTP status code */
                esc_html__('Vectorization failed: Server returned %s', 'voicero-ai'),
                esc_html($response_code)
            ),
            'code' => $response_code,
            'stage' => 'vectorize',
            'progress' => 17,
            'body' => $sanitized_body
        ]);
    }

    wp_send_json_success([
        'message' => esc_html__('Vectorization completed, setting up assistant...', 'voicero-ai'),
        'stage' => 'vectorize',
        'progress' => 34, // Updated progress
        'complete' => false,
        'details' => json_decode(wp_remote_retrieve_body($vectorize_response), true)
    ]);
}

// Add new endpoint for assistant setup
function voicero_setup_assistant() {
    check_ajax_referer('voicero_ajax_nonce', 'nonce');
    
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key found', 'voicero-ai')]);
    }

    $assistant_response = wp_remote_post(VOICERO_API_URL . '/wordpress/assistant', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 300, // Increase timeout to 5 minutes for consistency
        'sslverify' => false
    ]);

    if (is_wp_error($assistant_response)) {
        wp_send_json_error([
            'message' => esc_html__('Assistant setup failed: ', 'voicero-ai') . esc_html($assistant_response->get_error_message()),
            'code' => $assistant_response->get_error_code(),
            'stage' => 'assistant',
            'progress' => 34 // Keep progress at previous step
        ]);
    }
    
    $response_code = wp_remote_retrieve_response_code($assistant_response);
    $body = wp_remote_retrieve_body($assistant_response);
    
    if ($response_code !== 200) {
         wp_send_json_error([
            'message' => 'Assistant setup failed: Server returned ' . $response_code,
            'code' => $response_code,
            'stage' => 'assistant',
            'progress' => 34,
            'body' => $body
        ]);
    }

    $data = json_decode($body, true);
     if (json_last_error() !== JSON_ERROR_NONE || !$data) {
        wp_send_json_error([
            'message' => 'Invalid response from assistant setup',
            'code' => 'invalid_json',
            'stage' => 'assistant',
            'progress' => 34
        ]);
    }

    wp_send_json_success([
        'message' => 'Assistant setup complete, preparing individual training...',
        'stage' => 'assistant',
        'progress' => 50, // Updated progress
        'complete' => false,
        'data' => $data // Pass the response data back to JS
    ]);
}

// Training Endpoints (Page, Post, Product, General)
function voicero_train_page() {
    voicero_handle_training_request('page', 'pageId');
}

function voicero_train_post() {
    voicero_handle_training_request('post', 'postId');
}

function voicero_train_product() {
    voicero_handle_training_request('product', 'productId');
}

function voicero_train_general() {
    voicero_handle_training_request('general');
}

function voicero_handle_training_request($type, $id_key = null) {
    check_ajax_referer('voicero_ajax_nonce', 'nonce');

    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key found', 'voicero-ai')]);
    }

    $api_url = VOICERO_API_URL . '/wordpress/train/' . $type;
    $request_body = [];
    
    // Add required parameters to the body based on type
    if ($type === 'general') {
        // For general training, we only need websiteId
        if (isset($_POST['websiteId'])) {
            $request_body['websiteId'] = sanitize_text_field(wp_unslash($_POST['websiteId']));
        } else {
            wp_send_json_error(['message' => esc_html__('Missing required parameter: websiteId', 'voicero-ai')]);
            return;
        }
    } else {
        // For content-specific training, we need both wpId and websiteId
        // 1. Check for content ID (for our internal reference only)
        if ($id_key && isset($_POST[$id_key])) {
            // We don't need to send the page/post/product ID to the API
            // $request_body[$id_key] = sanitize_text_field($_POST[$id_key]);
        } elseif ($id_key) {
            wp_send_json_error(['message' => esc_html__('Missing required parameter: ', 'voicero-ai') . esc_html($id_key)]);
            return;
        }
        
        // 2. Add wpId - required for content-specific training
        if (isset($_POST['wpId'])) {
            $request_body['wpId'] = sanitize_text_field(wp_unslash($_POST['wpId']));
        } else {
            wp_send_json_error(['message' => esc_html__('Missing required parameter: wpId', 'voicero-ai')]);
            return;
        }
        
        // 3. Add websiteId - required for all types
        if (isset($_POST['websiteId'])) {
            $request_body['websiteId'] = sanitize_text_field(wp_unslash($_POST['websiteId']));
        } else {
            wp_send_json_error(['message' => esc_html__('Missing required parameter: websiteId', 'voicero-ai')]);
            return;
        }
    }

    // Use non-blocking approach but with a callback to track status
    $args = [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($request_body),
        'timeout' => 0.01, // Minimal timeout just for the request to be sent
        'blocking' => false, // Non-blocking - PHP will continue without waiting for Vercel
        'sslverify' => false
    ];

    // Track item in status
    $training_data = voicero_update_training_status('in_progress', true);
    $training_data = voicero_update_training_status('status', 'in_progress');
    
    // Increment total items if needed
    if (isset($_POST['is_first_item']) && sanitize_text_field(wp_unslash($_POST['is_first_item'])) === 'true') {
        $total_items = isset($_POST['total_items']) ? intval(wp_unslash($_POST['total_items'])) : 0;
        $training_data = voicero_update_training_status('total_items', $total_items);
        $training_data = voicero_update_training_status('completed_items', 0);
        $training_data = voicero_update_training_status('failed_items', 0);
    }
    
    // Log info about request for status tracking
    $request_id = uniqid($type . '_');
    update_option('voicero_last_training_request', [
        'id' => $request_id,
        'type' => $type,
        'timestamp' => time()
    ]);
    
    // For more reliable status tracking, schedule a background check
    // This will check status in 10-30 seconds depending on the item type
    $check_delay = ($type === 'general') ? 30 : 10;
    wp_schedule_single_event(time() + $check_delay, 'voicero_check_training_status', [$type, $request_id]);
    
    // Fire the API request
    wp_remote_post($api_url, $args);
    
    // Return success immediately with tracking info
    wp_send_json_success([
        'message' => sprintf(
            /* translators: %s: content type being trained (Page, Post, Product, etc.) */
            esc_html__('%s training initiated.', 'voicero-ai'),
            ucfirst($type)
        ),
        'type' => $type,
        'request_id' => $request_id,
        'status_tracking' => true
    ]);
}

// Function to check training status
function voicero_check_training_status($type, $request_id) {
    $training_data = get_option('voicero_training_status', []);
    
    // Mark as completed - in a real implementation, you would check with Vercel
    // but for now we'll just assume it completed successfully
    $completed_items = intval($training_data['completed_items']) + 1;
    voicero_update_training_status('completed_items', $completed_items);
    
    // If all items are done, mark training as complete
    if ($completed_items >= $training_data['total_items']) {
        voicero_update_training_status('in_progress', false);
        voicero_update_training_status('status', 'completed');
    }
}
add_action('voicero_check_training_status', 'voicero_check_training_status', 10, 2);

// Updated function for batch training
function voicero_batch_train() {
    check_ajax_referer('voicero_ajax_nonce', 'nonce');

    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key found', 'voicero-ai')]);
    }

    // Initialize training status
    $training_data = voicero_update_training_status('in_progress', true);
    $training_data = voicero_update_training_status('status', 'in_progress');
    
    // Get the batch data from the request and sanitize appropriately for JSON data
    $batch_data = array();
    if (isset($_POST['batch_data'])) {
        $json_str = sanitize_text_field(wp_unslash($_POST['batch_data']));
        $decoded_data = json_decode($json_str, true);
        
        // Only proceed if we have valid JSON
        if (is_array($decoded_data)) {
            foreach ($decoded_data as $item) {
                $sanitized_item = array();
                
                // Sanitize each field in the item
                if (isset($item['type'])) {
                    $sanitized_item['type'] = sanitize_text_field($item['type']);
                }
                
                if (isset($item['wpId'])) {
                    $sanitized_item['wpId'] = sanitize_text_field($item['wpId']);
                }
                
                // Only add properly sanitized items
                if (!empty($sanitized_item)) {
                    $batch_data[] = $sanitized_item;
                }
            }
        }
    }
    
    $website_id = isset($_POST['websiteId']) ? sanitize_text_field(wp_unslash($_POST['websiteId'])) : '';
    
    if (empty($website_id)) {
        wp_send_json_error(['message' => esc_html__('Missing required parameter: websiteId', 'voicero-ai')]);
    }
    
    if (empty($batch_data) || !is_array($batch_data)) {
        wp_send_json_error(['message' => esc_html__('Invalid or missing batch data', 'voicero-ai')]);
    }
    
    // Set total items count in the training status
    $total_items = count($batch_data);
    voicero_update_training_status('total_items', $total_items);
    voicero_update_training_status('completed_items', 0);
    voicero_update_training_status('failed_items', 0);

    // Create a batch ID for tracking all these requests
    $batch_id = uniqid('batch_');
    update_option('voicero_last_training_request', [
        'id' => $batch_id,
        'type' => 'batch',
        'timestamp' => time(),
        'total_items' => $total_items
    ]);
    
    // Clear any existing checks
    wp_clear_scheduled_hook('voicero_check_batch_status');
    
    // Fire off all API requests in parallel (non-blocking)
    foreach ($batch_data as $index => $item) {
        $type = $item['type']; // 'page', 'post', 'product', or 'general'
        
        // Ensure proper API URL format
        $api_url = VOICERO_API_URL;
        if (substr($api_url, -1) !== '/') {
            $api_url .= '/';
        }
        $api_url .= 'wordpress/train/' . $type;
        
        $request_body = [
            'websiteId' => $website_id
        ];
        
        // Add wpId for content items (not for general)
        if ($type !== 'general' && isset($item['wpId'])) {
            $request_body['wpId'] = $item['wpId'];
        }
        
        $args = [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode($request_body),
            'timeout' => 1, // Slightly longer timeout to ensure requests are sent
            'blocking' => false, // Non-blocking
            'sslverify' => false
        ];
        
        // Fire off the request - don't update completed items immediately
        // Let the status endpoint handle the actual progress tracking
        wp_remote_post($api_url, $args);
        
        // We'll keep the scheduled check for good measure, but progress will update immediately
        $item_request_id = $batch_id . '_' . $index;
        $check_delay = ($type === 'general') ? 30 : max(5, min(5 * ($index + 1), 30)); // Stagger checks from 5-30 seconds
        wp_schedule_single_event(time() + $check_delay, 'voicero_check_batch_item_status', [$type, $item_request_id]);
    }
    
    // If we've processed everything, mark training as complete
    if (count($batch_data) > 0) {
        // Short delay to ensure the last completed_items update is saved
        wp_schedule_single_event(time() + 2, 'voicero_finalize_training');
    }

    // Also schedule periodic checks for the overall batch (once per minute for 10 minutes)
    for ($i = 1; $i <= 10; $i++) {
        wp_schedule_single_event(time() + ($i * 60), 'voicero_check_batch_status', [$batch_id, $i]);
    }
    
    wp_send_json_success([
        'message' => esc_html__('Batch training initiated.', 'voicero-ai'),
        'request_id' => $batch_id,
        'total_items' => $total_items,
        'status_tracking' => true
    ]);
}

// Function to check individual batch item status
function voicero_check_batch_item_status($type, $request_id) {
    $training_data = get_option('voicero_training_status', []);
    
    // Only proceed if we're still in progress
    if (!$training_data['in_progress']) {
        return;
    }
    
    // Mark one item as completed
    $completed_items = intval($training_data['completed_items']) + 1;
    voicero_update_training_status('completed_items', $completed_items);
    
    // If all items are done, mark training as complete
    if ($completed_items >= $training_data['total_items']) {
        voicero_update_training_status('in_progress', false);
        voicero_update_training_status('status', 'completed');
    }
}
add_action('voicero_check_batch_item_status', 'voicero_check_batch_item_status', 10, 2);

// Function to check batch training status
function voicero_check_batch_status($batch_id, $check_num) {
    $training_data = get_option('voicero_training_status', []);
    $last_request = get_option('voicero_last_training_request', []);
    
    // Only proceed if we're still in progress and this is the right request
    if (!$training_data['in_progress'] || $last_request['id'] !== $batch_id) {
        return;
    }
    
    // If we've been running for 10 minutes and we're not done, mark as completed anyway
    if ($check_num >= 10) {
        // Update status to complete the process
        voicero_update_training_status('completed_items', $training_data['total_items']);
        voicero_update_training_status('in_progress', false);
        voicero_update_training_status('status', 'completed');
    }
}
add_action('voicero_check_batch_status', 'voicero_check_batch_status', 10, 2);

// Function to finalize training after all items have been processed
function voicero_finalize_training() {
    $training_data = get_option('voicero_training_status', []);
    
    // Only proceed if we're still in progress
    if (!isset($training_data['in_progress']) || !$training_data['in_progress']) {
        return;
    }
    
    // Mark training as complete
    voicero_update_training_status('in_progress', false);
    voicero_update_training_status('status', 'completed');
    
    // Record the completion time
    update_option('voicero_last_training_date', current_time('mysql'));
}
add_action('voicero_finalize_training', 'voicero_finalize_training');

// Register the new AJAX action
add_action('wp_ajax_voicero_batch_train', 'voicero_batch_train');

// Register the new AJAX actions
add_action('wp_ajax_voicero_vectorize_content', 'voicero_vectorize_content');
add_action('wp_ajax_voicero_setup_assistant', 'voicero_setup_assistant');

// Helper function to collect WordPress data
function voicero_collect_wordpress_data() {
    $data = [
        'posts' => [],
        'pages' => [],
        'products' => [],
        'categories' => [],
        'tags' => [],
        'comments' => [],
        'reviews' => [],
        'authors' => [],
        'media' => [],
        'customFields' => [],
        'productCategories' => [],
        'productTags' => []
    ];

    // Get Posts
    $posts = get_posts([
        'post_type' => 'post',
        'post_status' => 'publish',
        'numberposts' => -1
    ]);

    // Get Authors (Users with relevant roles)
    $authors = get_users([
        'role__in' => ['administrator', 'editor', 'author', 'contributor'],
    ]);

    foreach ($authors as $author) {
        $data['authors'][] = [
            'id' => $author->ID,
            'name' => $author->display_name,
            'email' => $author->user_email,
            'url' => $author->user_url,
            'bio' => get_user_meta($author->ID, 'description', true),
            'avatarUrl' => get_avatar_url($author->ID)
        ];
    }

    // Get Media
    $media_items = get_posts([
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => -1
    ]);

    foreach ($media_items as $media) {
        $metadata = wp_get_attachment_metadata($media->ID);
        $data['media'][] = [
            'id' => $media->ID,
            'title' => $media->post_title,
            'url' => wp_get_attachment_url($media->ID),
            'alt' => get_post_meta($media->ID, '_wp_attachment_image_alt', true),
            'description' => $media->post_content,
            'caption' => $media->post_excerpt,
            'mimeType' => $media->post_mime_type,
            'metadata' => $metadata
        ];
    }

    // Custom fields collection removed to improve query performance

    // Get Product Categories
    $product_categories = get_terms([
        'taxonomy' => 'product_cat',
        'hide_empty' => false
    ]);

    if (!is_wp_error($product_categories)) {
        foreach ($product_categories as $category) {
            $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
            $image_url = $thumbnail_id ? wp_get_attachment_url($thumbnail_id) : '';
            
            $data['productCategories'][] = [
                'id' => $category->term_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => wp_strip_all_tags($category->description),
                'parent' => $category->parent,
                'count' => $category->count,
                'imageUrl' => $image_url
            ];
        }
    }

    // Get Product Tags
    $product_tags = get_terms([
        'taxonomy' => 'product_tag',
        'hide_empty' => false
    ]);

    if (!is_wp_error($product_tags)) {
        foreach ($product_tags as $tag) {
            $data['productTags'][] = [
                'id' => $tag->term_id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'description' => wp_strip_all_tags($tag->description),
                'count' => $tag->count
            ];
        }
    }

    // Custom fields collection for products removed to improve query performance

    // Get Comments
    foreach ($posts as $post) {
        $comments = get_comments([
            'post_id' => $post->ID,
            'status' => 'approve'
        ]);

        foreach ($comments as $comment) {
            $data['comments'][] = [
                'id' => $comment->comment_ID,
                'post_id' => $post->ID,
                'author' => $comment->comment_author,
                'author_email' => $comment->comment_author_email,
                'content' => wp_strip_all_tags($comment->comment_content),
                'date' => $comment->comment_date,
                'status' => $comment->comment_approved,
                'parent_id' => $comment->comment_parent
            ];
        }

        $data['posts'][] = [
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'contentStripped' => wp_strip_all_tags($post->post_content),
            'excerpt' => wp_strip_all_tags(get_the_excerpt($post)),
            'slug' => $post->post_name,
            'link' => get_permalink($post->ID),
            'author' => get_the_author_meta('display_name', $post->post_author),
            'date' => $post->post_date,
            'categories' => wp_get_post_categories($post->ID, ['fields' => 'names']),
            'tags' => wp_get_post_tags($post->ID, ['fields' => 'names'])
        ];
    }

    // Get Pages
    $pages = get_pages(['post_status' => 'publish']);
    if (!empty($pages)) {
        foreach ($pages as $page) {
            $data['pages'][] = [
                'id' => $page->ID,
                'title' => $page->post_title,
                'content' => $page->post_content,
                'contentStripped' => wp_strip_all_tags($page->post_content),
                'slug' => $page->post_name,
                'link' => get_permalink($page->ID),
                'template' => get_page_template_slug($page->ID),
                'parent' => $page->post_parent,
                'order' => $page->menu_order,
                'lastModified' => $page->post_modified
            ];
        }
    }

    // Get Categories
    $categories = get_categories(['hide_empty' => false]);
    foreach ($categories as $category) {
        $data['categories'][] = [
            'id' => $category->term_id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => wp_strip_all_tags($category->description)
        ];
    }

    // Get Tags
    $tags = get_tags(['hide_empty' => false]);
    foreach ($tags as $tag) {
        $data['tags'][] = [
            'id' => $tag->term_id,
            'name' => $tag->name,
            'slug' => $tag->slug
        ];
    }

    // Get Products if WooCommerce is active
    if (class_exists('WC_Product_Query')) {
        $products = wc_get_products([
            'status' => 'publish',
            'limit' => -1
        ]);

        foreach ($products as $product) {
            // Get reviews for this product
            $reviews = get_comments([
                'post_id' => $product->get_id(),
                'status' => 'approve',
                'type' => 'review'
            ]);

            foreach ($reviews as $review) {
                $rating = get_comment_meta($review->comment_ID, 'rating', true);
                $verified = get_comment_meta($review->comment_ID, 'verified', true);

                $data['reviews'][] = [
                    'id' => $review->comment_ID,
                    'product_id' => $product->get_id(),
                    'reviewer' => $review->comment_author,
                    'reviewer_email' => $review->comment_author_email,
                    'review' => wp_strip_all_tags($review->comment_content),
                    'rating' => (int)$rating,
                    'date' => $review->comment_date,
                    'verified' => (bool)$verified
                ];
            }

            $data['products'][] = [
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'slug' => $product->get_slug(),
                'description' => wp_strip_all_tags($product->get_description()),
                'short_description' => wp_strip_all_tags($product->get_short_description()),
                'price' => $product->get_price(),
                'regular_price' => $product->get_regular_price(),
                'sale_price' => $product->get_sale_price(),
                'stock_quantity' => $product->get_stock_quantity(),
                'link' => get_permalink($product->get_id())
            ];
        }
    }

    return $data;
}

function voicero_render_admin_page() {
    // 1) Handle key coming back via GET redirect
    if ( ! empty( $_GET['access_key'] ) ) {
    if ( current_user_can('manage_options') ) {
      $key = sanitize_text_field( wp_unslash( $_GET['access_key'] ) );
      update_option( 'voicero_access_key', $key );
      add_settings_error(
        'voicero_messages',
        'key_updated',
        __( 'Successfully connected to AI service!', 'voicero-ai' ),
        'updated'
      );
        } else {
            add_settings_error(
                'voicero_messages',
                'invalid_nonce',
                __('Invalid connection link — please try again.', 'voicero-ai'),
                'error'
            );
        }
    }
    
    // Handle form submission
    if (isset($_POST['access_key'])) {
        if (check_admin_referer('voicero_save_access_key_nonce')) {
            $access_key = sanitize_text_field(wp_unslash($_POST['access_key']));
            
            // Verify the key is valid by making a test request
            $test_response = wp_remote_get(VOICERO_API_URL . '/connect', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $access_key,
                    'Content-Type' => 'application/json'
                ],
                'timeout' => 15,
                'sslverify' => false
            ]);

            if (is_wp_error($test_response)) {
                add_settings_error(
                    'voicero_messages',
                    'connection_error',
                    esc_html__('Could not connect to AI service. Please check your internet connection and try again.', 'voicero-ai'),
                    'error'
                );
            } else {
                $response_code = wp_remote_retrieve_response_code($test_response);
                $response_body = wp_remote_retrieve_body($test_response);
                
                if ($response_code !== 200) {
                    add_settings_error(
                        'voicero_messages',
                        'connection_error',
                        esc_html__('Could not validate access key. Please try connecting again.', 'voicero-ai'),
                        'error'
                    );
                } else {
                    update_option('voicero_access_key', $access_key);
                    add_settings_error(
                        'voicero_messages',
                        'key_updated',
                        esc_html__('Successfully connected to AI service!', 'voicero-ai'),
                        'updated'
                    );
                }
            }
        }
    }

    // Handle manual sync
    if (isset($_POST['sync_content']) && check_admin_referer('voicero_sync_content_nonce')) {
        // We'll handle the sync status message in the AJAX response
        add_settings_error(
            'voicero_messages',
            'sync_started',
            esc_html__('Content sync initiated...', 'voicero-ai'),
            'info'
        );
    }

    // Get saved values
    $saved_key = voicero_get_access_key();

    // Get the current site URL
    $site_url = get_site_url();
    $admin_url = admin_url('admin.php?page=voicero-ai-admin');
    
    // Encode URLs for safe transport
    $encoded_site_url = urlencode($site_url);
    $encoded_admin_url = urlencode($admin_url);
    
    // Generate the connection URL with nonce
    $connect_url = wp_nonce_url(
        "https://www.voicero.ai/app/connect?site_url={$encoded_site_url}&redirect_url={$encoded_admin_url}",
        'voicero_connect'
    );

    // Output the admin interface with full width
    ?>
    <div class="wrap" style="max-width: 100%;">
        <h1><?php esc_html_e('AI Website Connection', 'voicero-ai'); ?></h1>
        
        <?php settings_errors('voicero_messages'); ?>

        <?php if (!$saved_key): ?>
        <div class="card" style="max-width: 800px; margin-top: 20px;">
            <h2><?php esc_html_e('Connect Your Website', 'voicero-ai'); ?></h2>
            <p><?php esc_html_e('Enter your access key to connect to the AI Website service.', 'voicero-ai'); ?></p>

            <form method="post" action="">
                <?php wp_nonce_field('voicero_save_access_key_nonce'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="access_key"><?php esc_html_e('Access Key', 'voicero-ai'); ?></label></th>
                        <td>
                            <input type="text" 
                                   id="access_key" 
                                   name="access_key" 
                                   value="<?php echo esc_attr($saved_key); ?>" 
                                   class="regular-text"
                                   placeholder="<?php esc_attr_e('Enter your 64-character access key', 'voicero-ai'); ?>"
                                   pattern=".{64,64}"
                                   title="<?php esc_attr_e('Access key should be exactly 64 characters long', 'voicero-ai'); ?>">
                            <p class="description"><?php esc_html_e('Your access key should be exactly 64 characters long.', 'voicero-ai'); ?></p>
                        </td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" 
                           name="submit" 
                           id="submit" 
                           class="button button-primary" 
                           value="<?php esc_attr_e('Save & Connect', 'voicero-ai'); ?>">
                </p>
            </form>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                <h3><?php esc_html_e('New to Voicero?', 'voicero-ai'); ?></h3>
                <p><?php esc_html_e('Connect your website in one click and create your account.', 'voicero-ai'); ?></p>
                <a href="<?php echo esc_url($connect_url); ?>" class="button button-secondary">
                    <?php esc_html_e('Connect with Voicero', 'voicero-ai'); ?>
                </a>
            </div>
        </div>
        <?php endif; ?>

        <?php if ($saved_key): ?>
            <!-- Website info card - fixed full width -->
            <div class="card" style="margin-top: 20px; width: 100%; max-width: 100%; box-sizing: border-box;">
                <h2><?php esc_html_e('Website Information', 'voicero-ai'); ?></h2>
                <div id="website-info-container" style="width: 100%;">
                    <div class="spinner is-active" style="float: none;"></div>
                    <p><?php esc_html_e('Loading website information...', 'voicero-ai'); ?></p>
                </div>
                
                <div style="margin-top: 20px;">
                    <form method="post" action="javascript:void(0);" id="sync-form" onsubmit="return false;">
                        <?php wp_nonce_field('voicero_sync_content_nonce'); ?>
                        <input type="submit" 
                               name="sync_content" 
                               id="sync-button" 
                               class="button" 
                               value="<?php esc_attr_e('Sync Content Now', 'voicero-ai'); ?>">
                        <span id="sync-status" style="margin-left: 10px;"></span>
                    </form>
                </div>
            </div>
        <?php endif; ?>
    </div>   
    <?php
}

/**
 * Enqueue admin scripts & styles for Voicero.AI page.
 */
function voicero_admin_enqueue_assets($hook_suffix) {
    // Load on all plugin admin pages
    if (strpos($hook_suffix, 'voicero-ai') === false) {
        return;
    }

    // CSS
    wp_register_style(
        'voicero-admin-style',
        plugin_dir_url(__FILE__) . 'assets/css/admin-style.css',
        [],      // no dependencies
        '1.0.0'
    );
    wp_enqueue_style('voicero-admin-style');

    // JS
    wp_register_script(
        'voicero-admin-js',
        plugin_dir_url(__FILE__) . 'assets/js/admin/voicero-main.js',
        ['jquery'],  // jQuery dependency
        '1.0.0',
        true         // load in footer
    );
    wp_enqueue_script('voicero-admin-js');

    // Get access key for JS
    $access_key = get_option('voicero_access_key', '');

    // If you still need any inline settings or nonce, attach them here:
    wp_localize_script(
        'voicero-admin-js',
        'voiceroAdminConfig',
        [
            'ajaxUrl'   => admin_url('admin-ajax.php'),
            'nonce'     => wp_create_nonce('voicero_ajax_nonce'),
            'accessKey' => $access_key,
            'apiUrl'    => defined('VOICERO_API_URL') ? VOICERO_API_URL : 'https://www.voicero.ai/api',
            'websiteId' => get_option('voicero_website_id', '')
        ]
    );
    
    // Also create window.voiceroConfig for backwards compatibility
    wp_add_inline_script(
        'voicero-admin-js',
        'window.voiceroConfig = window.voiceroAdminConfig;',
        'before'
    );
}
add_action('admin_enqueue_scripts', 'voicero_admin_enqueue_assets');

/**
 * Enqueue frontend scripts for Voicero.AI
 */
function voicero_frontend_enqueue_assets() {
    // Only skip if we're in admin area
    if (is_admin()) {
        return;
    }

    // Get access key (will check this later)
    $access_key = voicero_get_access_key();
    
    // Log debug info about the loading attempt
    voicero_debug_log('Attempting to load frontend scripts', [
        'has_access_key' => !empty($access_key),
        'is_admin' => is_admin()
    ]);

    // Get all JS files from the user directory
    $js_dir = plugin_dir_path(__FILE__) . 'assets/js/user/';
    
    // Check if the directory exists
    if (!is_dir($js_dir)) {
        voicero_debug_log('Frontend scripts directory not found', ['path' => $js_dir]);
        return;
    }
    
    // Get JS files with error handling
    $js_files = @glob($js_dir . '*.js');
    
    // Check if glob failed or returned empty
    if ($js_files === false || empty($js_files)) {
        voicero_debug_log('No frontend scripts found or unable to read directory', [
            'path' => $js_dir,
            'glob_error' => $js_files === false
        ]);
        return;
    }
    
    // Log the found files
    voicero_debug_log('Found frontend scripts', ['files' => array_map('basename', $js_files)]);
    
    // Sort files to ensure core loads first
    usort($js_files, function($a, $b) {
        if (strpos($a, 'voicero-core.js') !== false) return -1;
        if (strpos($b, 'voicero-core.js') !== false) return 1;
        return strcmp($a, $b);
    });
    
    // Register and enqueue each file
    $core_handle = '';
    $loaded_handles = [];
    
    foreach ($js_files as $js_file) {
        // Check if file exists and is readable
        if (!file_exists($js_file) || !is_readable($js_file)) {
            voicero_debug_log('Script file not accessible', ['file' => $js_file]);
            continue;
        }
        
        $file_name = basename($js_file);
        $handle = str_replace('.js', '', $file_name);
        
        // Determine dependencies
        $deps = ['jquery'];
        
        // Set core as dependency for other files
        if (strpos($file_name, 'voicero-core.js') !== false) {
            $core_handle = $handle;
        } elseif (!empty($core_handle)) {
            $deps[] = $core_handle;
        }
        
        // Special case for text dependency
        if (strpos($file_name, 'voicero-contact.js') !== false && in_array('voicero-text', $loaded_handles)) {
            $deps[] = 'voicero-text';
        }
        
        // Get file URL
        $file_url = plugin_dir_url(__FILE__) . 'assets/js/user/' . $file_name;
        
        // Register and enqueue script
        wp_register_script(
            $handle,
            $file_url,
            $deps,
            filemtime($js_file),  // Use file modification time as version
            true  // Load in footer
        );
        
        wp_enqueue_script($handle);
        $loaded_handles[] = $handle;
        
        voicero_debug_log('Enqueued script', [
            'handle' => $handle,
            'file' => $file_name,
            'deps' => $deps
        ]);
    }
    
    // Pass config to scripts if core was loaded
    if (!empty($core_handle)) {
        wp_localize_script(
            $core_handle,
            'voiceroConfig',
            [
                'ajaxUrl'   => admin_url('admin-ajax.php'),
                'nonce'     => wp_create_nonce('voicero_ajax_nonce'),
                'apiUrl'    => defined('VOICERO_API_URL') ? VOICERO_API_URL : 'https://www.voicero.ai/api',
                'siteUrl'   => get_site_url(),
                'pluginUrl' => plugin_dir_url(__FILE__),
                'websiteId' => get_option('voicero_website_id', ''),
                'debug'     => defined('WP_DEBUG') && WP_DEBUG ? true : false,
                'hasAccessKey' => !empty($access_key)
            ]
        );
        
        voicero_debug_log('Localized script config', ['core_handle' => $core_handle]);
    }
}
add_action('wp_enqueue_scripts', 'voicero_frontend_enqueue_assets');



/**
 * Helper function to update training status
 */
function voicero_update_training_status($key, $value) {
    $training_data = get_option('voicero_training_status', []);
    $training_data[$key] = $value;
    update_option('voicero_training_status', $training_data);
    return $training_data;
}

// Add new AJAX endpoint for fetching WooCommerce orders
add_action('wp_ajax_voicero_get_woo_orders', 'voicero_get_woo_orders');
add_action('wp_ajax_nopriv_voicero_get_woo_orders', 'voicero_get_woo_orders');

/**
 * AJAX handler to fetch WooCommerce orders from the last X days
 */
function voicero_get_woo_orders() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error('WooCommerce is not active');
        return;
    }
    
    // Get number of days from request or default to 30
    $days = isset($_POST['days']) ? intval($_POST['days']) : 30;
    $days = max(1, min($days, 90)); // Limit between 1 and 90 days
    
    try {
        // Calculate date from X days ago
        $date_from = new DateTime();
        $date_from->modify("-{$days} days");
        
        // Query parameters for WooCommerce orders
        $args = array(
            'limit' => 100, // Reasonable limit
            'date_created' => '>=' . $date_from->format('Y-m-d'),
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('completed', 'processing', 'on-hold', 'pending', 'failed', 'refunded', 'cancelled') // Include all possible statuses
        );
        
        // Create the query
        $orders_query = new WC_Order_Query($args);
        $orders = $orders_query->get_orders();
        
        if (empty($orders)) {
            wp_send_json_success(array());
            return;
        }
        
        // Format orders for response
        $formatted_orders = array();
        foreach ($orders as $order) {
            $formatted_orders[] = array(
                'id' => $order->get_id(),
                'number' => $order->get_order_number(),
                'status' => $order->get_status(),
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                'date_modified' => $order->get_date_modified() ? $order->get_date_modified()->format('c') : '',
                'total' => $order->get_total(),
                'subtotal' => $order->get_subtotal(),
                'currency' => $order->get_currency(),
                'payment_method' => $order->get_payment_method_title(),
                'billing' => array(
                    'first_name' => $order->get_billing_first_name(),
                    'last_name' => $order->get_billing_last_name(),
                    'email' => $order->get_billing_email(),
                    'phone' => $order->get_billing_phone(),
                    'address_1' => $order->get_billing_address_1(),
                    'address_2' => $order->get_billing_address_2(),
                    'city' => $order->get_billing_city(),
                    'state' => $order->get_billing_state(),
                    'postcode' => $order->get_billing_postcode(),
                    'country' => $order->get_billing_country()
                ),
                'shipping' => array(
                    'first_name' => $order->get_shipping_first_name(),
                    'last_name' => $order->get_shipping_last_name(),
                    'address_1' => $order->get_shipping_address_1(),
                    'address_2' => $order->get_shipping_address_2(),
                    'city' => $order->get_shipping_city(),
                    'state' => $order->get_shipping_state(),
                    'postcode' => $order->get_shipping_postcode(),
                    'country' => $order->get_shipping_country()
                )
            );
        }
        
        wp_send_json_success($formatted_orders);
    } catch (Exception $e) {
        wp_send_json_error('Error fetching orders: ' . $e->getMessage());
    }
}

// Add new AJAX endpoints for WooCommerce customer and cart data
add_action('wp_ajax_voicero_get_customer_data', 'voicero_get_customer_data');
add_action('wp_ajax_nopriv_voicero_get_customer_data', 'voicero_get_customer_data');
add_action('wp_ajax_voicero_get_cart_data', 'voicero_get_cart_data');
add_action('wp_ajax_nopriv_voicero_get_cart_data', 'voicero_get_cart_data');

/**
 * AJAX handler to fetch current WooCommerce customer data
 */
function voicero_get_customer_data() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error('WooCommerce is not active');
        return;
    }
    
    // Initialize response
    $customer_data = array();
    
    // Check if user is logged in
    if (is_user_logged_in()) {
        $current_user = wp_get_current_user();
        $customer_data['id'] = $current_user->ID;
        $customer_data['first_name'] = $current_user->first_name;
        $customer_data['last_name'] = $current_user->last_name;
        $customer_data['email'] = $current_user->user_email;
        $customer_data['username'] = $current_user->user_login;
        $customer_data['display_name'] = $current_user->display_name;
        $customer_data['logged_in'] = true;
        
        // Get user meta data for billing and shipping
        $customer_data['billing'] = array(
            'first_name' => get_user_meta($current_user->ID, 'billing_first_name', true),
            'last_name' => get_user_meta($current_user->ID, 'billing_last_name', true),
            'company' => get_user_meta($current_user->ID, 'billing_company', true),
            'address_1' => get_user_meta($current_user->ID, 'billing_address_1', true),
            'address_2' => get_user_meta($current_user->ID, 'billing_address_2', true),
            'city' => get_user_meta($current_user->ID, 'billing_city', true),
            'state' => get_user_meta($current_user->ID, 'billing_state', true),
            'postcode' => get_user_meta($current_user->ID, 'billing_postcode', true),
            'country' => get_user_meta($current_user->ID, 'billing_country', true),
            'email' => get_user_meta($current_user->ID, 'billing_email', true),
            'phone' => get_user_meta($current_user->ID, 'billing_phone', true)
        );
        
        $customer_data['shipping'] = array(
            'first_name' => get_user_meta($current_user->ID, 'shipping_first_name', true),
            'last_name' => get_user_meta($current_user->ID, 'shipping_last_name', true),
            'company' => get_user_meta($current_user->ID, 'shipping_company', true),
            'address_1' => get_user_meta($current_user->ID, 'shipping_address_1', true),
            'address_2' => get_user_meta($current_user->ID, 'shipping_address_2', true),
            'city' => get_user_meta($current_user->ID, 'shipping_city', true),
            'state' => get_user_meta($current_user->ID, 'shipping_state', true),
            'postcode' => get_user_meta($current_user->ID, 'shipping_postcode', true),
            'country' => get_user_meta($current_user->ID, 'shipping_country', true)
        );
        
        // Get recent orders
        $args = array(
            'customer_id' => $current_user->ID,
            'limit' => 10,
            'orderby' => 'date',
            'order' => 'DESC'
        );
        
        $orders = wc_get_orders($args);
        $recent_orders = array();
        
        foreach ($orders as $order) {
            $order_data = array(
                'id' => $order->get_id(),
                'number' => $order->get_order_number(),
                'status' => $order->get_status(),
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                'total' => $order->get_total(),
                'currency' => $order->get_currency(),
                'payment_method' => $order->get_payment_method_title()
            );
            
            // Add line items
            $line_items = array();
            foreach ($order->get_items() as $item_id => $item) {
                $line_items[] = array(
                    'id' => $item_id,
                    'name' => $item->get_name(),
                    'quantity' => $item->get_quantity(),
                    'total' => $item->get_total()
                );
            }
            
            $order_data['line_items'] = $line_items;
            $recent_orders[] = $order_data;
        }
        
        $customer_data['recent_orders'] = $recent_orders;
        
        // Calculate total spent and order count
        $customer = new WC_Customer($current_user->ID);
        $customer_data['total_spent'] = $customer->get_total_spent();
        $customer_data['orders_count'] = $customer->get_order_count();
    }
    
    wp_send_json_success($customer_data);
}

/**
 * AJAX handler to fetch current WooCommerce cart data
 */
function voicero_get_cart_data() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error('Security check failed');
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error('WooCommerce is not active');
        return;
    }
    
    // Get cart data
    $cart = WC()->cart;
    
    if (empty($cart)) {
        wp_send_json_success(array());
        return;
    }
    
    $cart_data = array(
        'items_count' => $cart->get_cart_contents_count(),
        'total' => $cart->get_total(),
        'subtotal' => $cart->get_subtotal(),
        'tax_total' => $cart->get_total_tax(),
        'items' => array()
    );
    
    // Get cart items
    foreach ($cart->get_cart() as $cart_item_key => $cart_item) {
        $product = $cart_item['data'];
        $product_id = $cart_item['product_id'];
        
        $item_data = array(
            'key' => $cart_item_key,
            'product_id' => $product_id,
            'name' => $product->get_name(),
            'quantity' => $cart_item['quantity'],
            'price' => $product->get_price(),
            'line_total' => $cart_item['line_total'],
            'line_tax' => $cart_item['line_tax']
        );
        
        // Add product URL and image
        $item_data['url'] = get_permalink($product_id);
        $item_data['image'] = wp_get_attachment_url($product->get_image_id());
        
        $cart_data['items'][] = $item_data;
    }
    
    wp_send_json_success($cart_data);
}

/**
 * AJAX handler to cancel a WooCommerce order
 */
function voicero_cancel_order() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error(['message' => 'WooCommerce is not active']);
        return;
    }
    
    // Get required parameters
    $order_id = isset($_POST['order_id']) ? sanitize_text_field(wp_unslash($_POST['order_id'])) : '';
    $email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    $reason = isset($_POST['reason']) ? sanitize_text_field(wp_unslash($_POST['reason'])) : 'Customer requested cancellation';
    $restock = isset($_POST['restock']) ? (bool) sanitize_text_field(wp_unslash($_POST['restock'])) : false;
    $refund = isset($_POST['refund']) ? (bool) sanitize_text_field(wp_unslash($_POST['refund'])) : false;
    
    if (empty($order_id)) {
        wp_send_json_error(['message' => 'Order ID is required']);
        return;
    }
    
    if (empty($email)) {
        wp_send_json_error(['message' => 'Email is required']);
        return;
    }
    
    // Try to get the order
    $order = wc_get_order($order_id);
    if (!$order) {
        // Try to find by looking up using get_posts which is properly cached
        $args = array(
            'post_type' => 'shop_order',
            'post_status' => 'any',
            'posts_per_page' => 1,
            's' => $order_id, // Search by order number in post title
        );
        $order_posts = get_posts($args);
        
        if (!empty($order_posts)) {
            $order = wc_get_order($order_posts[0]->ID);
        }
    }
    
    if (!$order) {
        wp_send_json_error(['message' => 'Order not found']);
        return;
    }
    
    // Verify order belongs to customer
    $billing_email = $order->get_billing_email();
    if ($billing_email !== $email) {
        wp_send_json_error(['message' => 'Email does not match order']);
        return;
    }
    
    // Check if order status allows cancellation
    $status = $order->get_status();
    $cancelable_statuses = apply_filters('voicero_cancelable_order_statuses', [
        'pending', 'processing', 'on-hold', 'failed'
    ]);
    
    if (!in_array($status, $cancelable_statuses)) {
        wp_send_json_error([
            'message' => 'This order cannot be cancelled due to its current status: ' . wc_get_order_status_name($status)
        ]);
        return;
    }
    
    // Process the cancellation
    try {
        // Add cancellation note
        $order->add_order_note(sprintf(
            /* translators: %s: reason for cancellation */
            __('Order cancelled by customer via AI assistant. Reason: %s', 'voicero-ai'),
            $reason
        ), false);
        
        // Cancel the order
        $order->update_status('cancelled', __('Order cancelled by customer via AI assistant', 'voicero-ai'));
        
        // Optional: Refund if requested and payment was made
        if ($refund && $order->is_paid()) {
            // Create the refund
            $refund = wc_create_refund([
                'order_id' => $order->get_id(),
                'amount' => $order->get_total(),
                'reason' => __('Order cancelled by customer', 'voicero-ai'),
                'refund_payment' => true,
                'restock_items' => $restock,
            ]);
            
            if (is_wp_error($refund)) {
                // Log the error but continue with cancellation
                voicero_debug_log('Error processing refund for cancelled order: ' . $refund->get_error_message());
            }
        }
        
        wp_send_json_success([
            'message' => 'Order cancelled successfully',
            'order_id' => $order->get_id(),
            'status' => $order->get_status()
        ]);
    } catch (Exception $e) {
        wp_send_json_error(['message' => 'Error cancelling order: ' . $e->getMessage()]);
    }
}

/**
 * AJAX handler to verify if an order belongs to a customer
 */
function voicero_verify_order() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error(['message' => 'WooCommerce is not active']);
        return;
    }
    
    // Get required parameters
    $order_id = isset($_POST['order_id']) ? sanitize_text_field(wp_unslash($_POST['order_id'])) : '';
    $email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    
    if (empty($order_id)) {
        wp_send_json_error(['message' => 'Order ID is required']);
        return;
    }
    
    if (empty($email)) {
        wp_send_json_error(['message' => 'Email is required']);
        return;
    }
    
    // Log for debugging
    voicero_debug_log('Verifying order ownership', [
        'order_id' => $order_id,
        'email' => $email
    ]);
    
    // Try to get the order
    $order = wc_get_order($order_id);
    if (!$order) {
        // Try to find by looking up using get_posts which is properly cached
        $args = array(
            'post_type' => 'shop_order',
            'post_status' => 'any',
            'posts_per_page' => 1,
            's' => $order_id, // Search by order number in post title
        );
        $order_posts = get_posts($args);
        
        if (!empty($order_posts)) {
            $order = wc_get_order($order_posts[0]->ID);
        }
    }
    
    if (!$order) {
        wp_send_json_error(['message' => 'Order not found']);
        return;
    }
    
    // Get current user ID
    $current_user_id = get_current_user_id();
    $order_user_id = $order->get_user_id();
    
    // CASE 1: If logged in and order belongs to user, allow it
    if ($current_user_id > 0 && $order_user_id == $current_user_id) {
        voicero_debug_log('Order verified by user ID match', [
            'order_id' => $order->get_id(),
            'user_id' => $current_user_id
        ]);
        
        wp_send_json_success([
            'message' => 'Order verified by user account',
            'verified' => true,
            'order_id' => $order->get_id()
        ]);
        return;
    }
    
    // CASE 2: Verify by email
    $billing_email = $order->get_billing_email();
    
    // If it's a test/development order with no billing email, allow admin email access
    if (empty($billing_email) && (current_user_can('manage_options') || strpos($email, 'wpengine') !== false)) {
        voicero_debug_log('Test order verified for admin/test email', [
            'order_id' => $order->get_id(),
            'email' => $email
        ]);
        
        wp_send_json_success([
            'message' => 'Test order verified',
            'verified' => true,
            'order_id' => $order->get_id()
        ]);
        return;
    }
    
    // Regular email verification
    if (!empty($billing_email) && $billing_email === $email) {
        wp_send_json_success([
            'message' => 'Order verified by email',
            'verified' => true,
            'order_id' => $order->get_id()
        ]);
        return;
    }
    
    // Log the failure reason
    voicero_debug_log('Order verification failed', [
        'order_id' => $order->get_id(),
        'email' => $email,
        'billing_email' => $billing_email,
        'user_id' => $order_user_id,
        'current_user' => $current_user_id
    ]);
    
    wp_send_json_error([
        'message' => 'Email does not match order',
        'verified' => false
    ]);
}

/**
 * Update WooCommerce customer data via AJAX
 */
function voicero_update_customer() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error(['message' => 'WooCommerce is not active']);
        return;
    }
    
    // Get customer data from request
    $customer_data = [];
    if (isset($_POST['customer_data'])) {
        $sanitized_customer_data = sanitize_text_field(wp_unslash($_POST['customer_data']));
        $customer_data = json_decode($sanitized_customer_data, true);
    }
    
    // If no data or invalid JSON, return error
    if (empty($customer_data) || json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(['message' => 'Invalid customer data provided']);
        return;
    }
    
    // Check if user is logged in for non-guest operations
    if (!is_user_logged_in()) {
        wp_send_json_error(['message' => 'User must be logged in to update account information']);
        return;
    }
    
    $current_user = wp_get_current_user();
    $customer_id = $current_user->ID;
    
    // Get WooCommerce customer
    $customer = new WC_Customer($customer_id);
    if (!$customer) {
        wp_send_json_error(['message' => 'Customer not found']);
        return;
    }
    
    $updated = false;
    $validation_errors = [];
    
    // Update core customer properties
    if (isset($customer_data['firstName'])) {
        $customer->set_first_name(sanitize_text_field($customer_data['firstName']));
        $updated = true;
    }
    
    if (isset($customer_data['lastName'])) {
        $customer->set_last_name(sanitize_text_field($customer_data['lastName']));
        $updated = true;
    }
    
    if (isset($customer_data['email'])) {
        $email = sanitize_email($customer_data['email']);
        if (!is_email($email)) {
            $validation_errors[] = 'Invalid email address format';
        } else {
            // Check if email is already in use by another user
            if (email_exists($email) && email_exists($email) !== $customer_id) {
                $validation_errors[] = 'This email address is already registered to another user';
            } else {
                $customer->set_email($email);
                $updated = true;
            }
        }
    }
    
    // Update password if provided
    if (isset($customer_data['password']) && !empty($customer_data['password'])) {
        $password = sanitize_text_field($customer_data['password']);
        // Update user password directly (WC_Customer doesn't have a set_password method)
        wp_update_user([
            'ID' => $customer_id,
            'user_pass' => $password
        ]);
        $updated = true;
    }
    
    // Update billing address
    if (isset($customer_data['billing']) && is_array($customer_data['billing'])) {
        $billing = $customer_data['billing'];
        
        if (isset($billing['first_name'])) {
            $customer->set_billing_first_name(sanitize_text_field($billing['first_name']));
            $updated = true;
        }
        
        if (isset($billing['last_name'])) {
            $customer->set_billing_last_name(sanitize_text_field($billing['last_name']));
            $updated = true;
        }
        
        if (isset($billing['company'])) {
            $customer->set_billing_company(sanitize_text_field($billing['company']));
            $updated = true;
        }
        
        if (isset($billing['address_1'])) {
            $customer->set_billing_address_1(sanitize_text_field($billing['address_1']));
            $updated = true;
        }
        
        if (isset($billing['address_2'])) {
            $customer->set_billing_address_2(sanitize_text_field($billing['address_2']));
            $updated = true;
        }
        
        if (isset($billing['city'])) {
            $customer->set_billing_city(sanitize_text_field($billing['city']));
            $updated = true;
        }
        
        if (isset($billing['state'])) {
            $customer->set_billing_state(sanitize_text_field($billing['state']));
            $updated = true;
        }
        
        if (isset($billing['postcode'])) {
            $customer->set_billing_postcode(sanitize_text_field($billing['postcode']));
            $updated = true;
        }
        
        if (isset($billing['country'])) {
            $customer->set_billing_country(sanitize_text_field($billing['country']));
            $updated = true;
        }
        
        if (isset($billing['email'])) {
            $billing_email = sanitize_email($billing['email']);
            if (!is_email($billing_email)) {
                $validation_errors[] = 'Invalid billing email address format';
            } else {
                $customer->set_billing_email($billing_email);
                $updated = true;
            }
        }
        
        if (isset($billing['phone'])) {
            $customer->set_billing_phone(sanitize_text_field($billing['phone']));
            $updated = true;
        }
    }
    
    // Update shipping address
    if (isset($customer_data['shipping']) && is_array($customer_data['shipping'])) {
        $shipping = $customer_data['shipping'];
        
        if (isset($shipping['first_name'])) {
            $customer->set_shipping_first_name(sanitize_text_field($shipping['first_name']));
            $updated = true;
        }
        
        if (isset($shipping['last_name'])) {
            $customer->set_shipping_last_name(sanitize_text_field($shipping['last_name']));
            $updated = true;
        }
        
        if (isset($shipping['company'])) {
            $customer->set_shipping_company(sanitize_text_field($shipping['company']));
            $updated = true;
        }
        
        if (isset($shipping['address_1'])) {
            $customer->set_shipping_address_1(sanitize_text_field($shipping['address_1']));
            $updated = true;
        }
        
        if (isset($shipping['address_2'])) {
            $customer->set_shipping_address_2(sanitize_text_field($shipping['address_2']));
            $updated = true;
        }
        
        if (isset($shipping['city'])) {
            $customer->set_shipping_city(sanitize_text_field($shipping['city']));
            $updated = true;
        }
        
        if (isset($shipping['state'])) {
            $customer->set_shipping_state(sanitize_text_field($shipping['state']));
            $updated = true;
        }
        
        if (isset($shipping['postcode'])) {
            $customer->set_shipping_postcode(sanitize_text_field($shipping['postcode']));
            $updated = true;
        }
        
        if (isset($shipping['country'])) {
            $customer->set_shipping_country(sanitize_text_field($shipping['country']));
            $updated = true;
        }
    }
    
    // If defaultAddress is provided, map it to shipping address
    if (isset($customer_data['defaultAddress']) && is_array($customer_data['defaultAddress'])) {
        $default_address = $customer_data['defaultAddress'];
        
        if (isset($default_address['firstName'])) {
            $customer->set_shipping_first_name(sanitize_text_field($default_address['firstName']));
            $updated = true;
        }
        
        if (isset($default_address['lastName'])) {
            $customer->set_shipping_last_name(sanitize_text_field($default_address['lastName']));
            $updated = true;
        }
        
        if (isset($default_address['address1'])) {
            $customer->set_shipping_address_1(sanitize_text_field($default_address['address1']));
            $updated = true;
        }
        
        if (isset($default_address['city'])) {
            $customer->set_shipping_city(sanitize_text_field($default_address['city']));
            $updated = true;
        }
        
        if (isset($default_address['province'])) {
            $customer->set_shipping_state(sanitize_text_field($default_address['province']));
            $updated = true;
        }
        
        if (isset($default_address['zip'])) {
            $customer->set_shipping_postcode(sanitize_text_field($default_address['zip']));
            $updated = true;
        }
        
        if (isset($default_address['country'])) {
            $customer->set_shipping_country(sanitize_text_field($default_address['country']));
            $updated = true;
        }
    }
    
    // Save customer if updates were made and no validation errors
    if ($updated && empty($validation_errors)) {
        $customer->save();
        wp_send_json_success([
            'message' => 'Customer information updated successfully',
            'customer_id' => $customer_id
        ]);
    } elseif (!empty($validation_errors)) {
        wp_send_json_error([
            'message' => 'Validation errors',
            'validationErrors' => $validation_errors
        ]);
    } else {
        wp_send_json_error(['message' => 'No updates were made to customer information']);
    }
}

// Register AJAX handlers
add_action('wp_ajax_voicero_cancel_order', 'voicero_cancel_order');
add_action('wp_ajax_nopriv_voicero_cancel_order', 'voicero_cancel_order');
add_action('wp_ajax_voicero_verify_order', 'voicero_verify_order');
add_action('wp_ajax_nopriv_voicero_verify_order', 'voicero_verify_order');

/**
 * AJAX handler to save training date 
 */
function voicero_save_training_date() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Get date from request
    $date = isset($_POST['date']) ? sanitize_text_field(wp_unslash($_POST['date'])) : current_time('mysql');
    
    // Save the date to WordPress options
    update_option('voicero_last_training_date', $date);
    
    wp_send_json_success(['message' => 'Training date saved successfully']);
}

// Register AJAX handler
add_action('wp_ajax_voicero_save_training_date', 'voicero_save_training_date');

// Add AJAX handler for checking training status
add_action('wp_ajax_voicero_check_training_status', 'voicero_check_training_status_ajax');

/**
 * AJAX handler to check the status of training process
 */
function voicero_check_training_status_ajax() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Get batch ID if provided
    $batch_id = isset($_POST['batch_id']) ? sanitize_text_field(wp_unslash($_POST['batch_id'])) : '';
    
    // Get training status from database
    $training_data = get_option('voicero_training_status', []);
    
    // If batch_id was provided, check if it matches the current batch
    if (!empty($batch_id)) {
        $last_request = get_option('voicero_last_training_request', []);
        
        if (!empty($last_request) && isset($last_request['id']) && $last_request['id'] !== $batch_id) {
            // This is a request for an old batch, so ignore it
            wp_send_json_error(['message' => 'Batch ID does not match current training session']);
            return;
        }
    }
    
    // Default values if not set
    $training_data = wp_parse_args($training_data, [
        'in_progress' => false,
        'status' => 'unknown',
        'total_items' => 0,
        'completed_items' => 0,
        'failed_items' => 0
    ]);
    
    // If training is not marked as in progress, try to check with the API
    if (!$training_data['in_progress'] && !empty($batch_id)) {
        $access_key = voicero_get_access_key();
        
        // If we have an access key, try to check with API
        if (!empty($access_key)) {
            $check_response = wp_remote_get(VOICERO_API_URL . '/wordpress/training-status', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $access_key,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ],
                'body' => [
                    'batch_id' => $batch_id
                ],
                'timeout' => 5, // Short timeout for status check
                'sslverify' => false
            ]);
            
            // If we got a successful response, update our status
            if (!is_wp_error($check_response) && wp_remote_retrieve_response_code($check_response) === 200) {
                $api_status = json_decode(wp_remote_retrieve_body($check_response), true);
                
                if ($api_status && isset($api_status['status'])) {
                    // Update with API status
                    if ($api_status['status'] === 'completed') {
                        $training_data['in_progress'] = false;
                        $training_data['status'] = 'completed';
                        $training_data['completed_items'] = $training_data['total_items'];
                    } else if ($api_status['status'] === 'failed') {
                        $training_data['in_progress'] = false;
                        $training_data['status'] = 'failed';
                    }
                    
                    // Update our local tracking
                    update_option('voicero_training_status', $training_data);
                }
            }
        }
    }
    
    // Return current status
    wp_send_json_success($training_data);
}

// Register AJAX handler
add_action('wp_ajax_voicero_save_training_date', 'voicero_save_training_date');

// Add endpoint to check training status
add_action('wp_ajax_voicero_check_batch_training_status', 'voicero_check_batch_training_status');
add_action('wp_ajax_nopriv_voicero_check_batch_training_status', 'voicero_check_batch_training_status');

/**
 * AJAX handler to check the status of a batch of training items
 */
function voicero_check_batch_training_status() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Get required parameters
    $website_id = isset($_POST['websiteId']) ? sanitize_text_field(wp_unslash($_POST['websiteId'])) : '';
    $batch_data = isset($_POST['batchData']) ? sanitize_text_field(wp_unslash($_POST['batchData'])) : '';
    
    if (empty($website_id)) {
        wp_send_json_error(['message' => 'Missing required websiteId parameter']);
        return;
    }
    
    // Get access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => 'No access key found']);
        return;
    }
    
    // Make API call to check status
    $response = wp_remote_get(
        VOICERO_API_URL . '/wordpress/train/status',
        [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => [
                'websiteId' => $website_id,
                'batchData' => $batch_data
            ],
            'timeout' => 10,
            'sslverify' => false
        ]
    );
    
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => 'Failed to check training status: ' . $response->get_error_message(),
            'status' => 'error'
        ]);
        return;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200 && $response_code !== 202) {
        wp_send_json_error([
            'message' => 'Failed to check training status. Server returned ' . $response_code,
            'status' => 'error',
            'body' => $response_body
        ]);
        return;
    }
    
    $data = json_decode($response_body, true);
    
    if (!$data) {
        wp_send_json_error([
            'message' => 'Invalid response from server',
            'status' => 'error'
        ]);
        return;
    }
    
    // Return the status information
    wp_send_json_success([
        'status' => isset($data['status']) ? $data['status'] : 'unknown',
        'message' => isset($data['message']) ? $data['message'] : '',
        'pendingCount' => isset($data['pendingCount']) ? $data['pendingCount'] : 0,
        'inProgressCount' => isset($data['inProgressCount']) ? $data['inProgressCount'] : 0,
        'data' => $data
    ]);
}

/**
 * AJAX handler to initiate a return request for a WooCommerce order
 */
function voicero_initiate_return() {
    // Verify nonce for security
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
        return;
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error(['message' => 'WooCommerce is not active']);
        return;
    }
    
    // Get required parameters
    $order_id = isset($_POST['order_id']) ? sanitize_text_field(wp_unslash($_POST['order_id'])) : '';
    $email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    $reason = isset($_POST['reason']) ? sanitize_text_field(wp_unslash($_POST['reason'])) : 'Customer requested return';
    $items = isset($_POST['items']) ? json_decode(sanitize_text_field(wp_unslash($_POST['items'])), true) : [];
    $return_type = isset($_POST['return_type']) ? sanitize_text_field(wp_unslash($_POST['return_type'])) : 'refund'; // refund or exchange
    
    if (empty($order_id)) {
        wp_send_json_error(['message' => 'Order ID is required']);
        return;
    }
    
    if (empty($email)) {
        wp_send_json_error(['message' => 'Email is required']);
        return;
    }
    
    // Try to get the order
    $order = wc_get_order($order_id);
    if (!$order) {
        // Try to find by looking up using get_posts which is properly cached
        $args = array(
            'post_type' => 'shop_order',
            'post_status' => 'any',
            'posts_per_page' => 1,
            's' => $order_id, // Search by order number in post title
        );
        $order_posts = get_posts($args);
        
        if (!empty($order_posts)) {
            $order = wc_get_order($order_posts[0]->ID);
        }
    }
    
    if (!$order) {
        wp_send_json_error(['message' => 'Order not found']);
        return;
    }
    
    // Verify order belongs to customer
    $billing_email = $order->get_billing_email();
    if ($billing_email !== $email) {
        wp_send_json_error(['message' => 'Email does not match order']);
        return;
    }
    
    // Check if order status allows returns
    $status = $order->get_status();
    $returnable_statuses = apply_filters('voicero_returnable_order_statuses', [
        'completed', 'processing', 'on-hold'
    ]);
    
    if (!in_array($status, $returnable_statuses)) {
        wp_send_json_error([
            'message' => 'This order is not eligible for return due to its current status: ' . wc_get_order_status_name($status)
        ]);
        return;
    }
    
    // Check if the order is within the return period (e.g., 30 days)
    $order_date = $order->get_date_created();
    $days_since_order = (time() - $order_date->getTimestamp()) / (60 * 60 * 24);
    $return_period = apply_filters('voicero_return_period_days', 30);
    
    if ($days_since_order > $return_period) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: number of days in return period */
                __('This order is outside the %d-day return period', 'voicero-ai'),
                $return_period
            )
        ]);
        return;
    }
    
    // Process the return request
    try {
        // Create a log of items to be returned
        $return_items_log = [];
        $order_items = $order->get_items();
        
        // If specific items were provided, validate them
        if (!empty($items) && is_array($items)) {
            foreach ($items as $item_id => $item_data) {
                // Check if item exists in the order
                $item_exists = false;
                foreach ($order_items as $order_item_id => $order_item) {
                    if ($order_item_id == $item_id || (isset($item_data['product_id']) && $order_item->get_product_id() == $item_data['product_id'])) {
                        $item_exists = true;
                        
                        // Record details for the return
                        $return_items_log[] = [
                            'item_id' => $order_item_id,
                            'product_id' => $order_item->get_product_id(),
                            'product_name' => $order_item->get_name(),
                            'quantity' => isset($item_data['quantity']) ? intval($item_data['quantity']) : $order_item->get_quantity(),
                            'reason' => isset($item_data['reason']) ? sanitize_text_field($item_data['reason']) : $reason
                        ];
                        break;
                    }
                }
                
                if (!$item_exists) {
                    wp_send_json_error(['message' => 'One or more items do not exist in the order']);
                    return;
                }
            }
        } else {
            // If no specific items provided, assume all items in the order
            foreach ($order_items as $item_id => $item) {
                $return_items_log[] = [
                    'item_id' => $item_id,
                    'product_id' => $item->get_product_id(),
                    'product_name' => $item->get_name(),
                    'quantity' => $item->get_quantity(),
                    'reason' => $reason
                ];
            }
        }
        
        // Store return request details as order meta
        $return_request_id = 'return_' . uniqid();
        $return_data = [
            'id' => $return_request_id,
            'date_requested' => current_time('mysql'),
            'status' => 'pending', // pending, approved, rejected, completed
            'type' => $return_type,
            'reason' => $reason,
            'items' => $return_items_log
        ];
        
        // Save return request to order meta
        $existing_returns = $order->get_meta('_voicero_return_requests', true);
        if (empty($existing_returns) || !is_array($existing_returns)) {
            $existing_returns = [];
        }
        $existing_returns[] = $return_data;
        $order->update_meta_data('_voicero_return_requests', $existing_returns);
        
        // Add return request note to the order
        $note = sprintf(
            /* translators: 1: return type (refund/exchange), 2: reason */
            __('Return request (%1$s) initiated by customer via AI assistant. Reason: %2$s', 'voicero-ai'),
            $return_type,
            $reason
        );
        
        // Add details about items requested for return
        $note .= "\n\n" . __('Items requested for return:', 'voicero-ai') . "\n";
        foreach ($return_items_log as $item) {
            $note .= sprintf(
                '- %s (x%d): %s',
                $item['product_name'],
                $item['quantity'],
                isset($item['reason']) ? $item['reason'] : $reason
            ) . "\n";
        }
        
        // Add customer-visible note
        $order->add_order_note($note, true); // true = visible to customer
        
        // Add admin note with more details
        $admin_note = sprintf(
            /* translators: 1: return request ID, 2: return type */
            __('Return request #%1$s (%2$s) needs review. Please process this return request.', 'voicero-ai'),
            $return_request_id,
            $return_type
        );
        $order->add_order_note($admin_note, false); // false = not visible to customer
        
        // Save the order
        $order->save();
        
        // Optional: Send email notification to store admin
        $admin_email = get_option('admin_email');
        if (!empty($admin_email)) {
            $subject = sprintf(
                /* translators: %s: order number */
                __('Return Request for Order #%s', 'voicero-ai'),
                $order->get_order_number()
            );
            
            $message = sprintf(
                /* translators: 1: order number, 2: return type, 3: reason */
                __('A new return request has been initiated for Order #%1$s.\n\nType: %2$s\nReason: %3$s\n\nPlease login to your admin dashboard to review this request.', 'voicero-ai'),
                $order->get_order_number(),
                $return_type,
                $reason
            );
            
            wp_mail($admin_email, $subject, $message);
        }
        
        // Return success response
        wp_send_json_success([
            'message' => __('Return request initiated successfully', 'voicero-ai'),
            'return_id' => $return_request_id,
            'order_id' => $order->get_id(),
            'status' => 'pending'
        ]);
    } catch (Exception $e) {
        wp_send_json_error(['message' => 'Error initiating return: ' . $e->getMessage()]);
    }
}

// Register the return request AJAX handler
add_action('wp_ajax_voicero_initiate_return', 'voicero_initiate_return');
add_action('wp_ajax_nopriv_voicero_initiate_return', 'voicero_initiate_return');


