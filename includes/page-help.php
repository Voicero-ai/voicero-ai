<?php
/**
 * Help Center Interface Page
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

function voicero_render_help_page_content() {
    // Get the access key
    $access_key = get_option('voicero_access_key', '');
    
    if (empty($access_key)) {
        echo '<div class="notice notice-error"><p>Please configure your access key in the settings first.</p></div>';
        return;
    }

    // Enqueue the help JavaScript and CSS
    wp_enqueue_script(
        'voicero-help-js',
        plugin_dir_url(__FILE__) . '../assets/js/admin/voicero-help.js',
        array('jquery'),
        '1.0.0',
        true
    );

    wp_enqueue_style(
        'voicero-admin-style',
        plugin_dir_url(__FILE__) . '../assets/css/admin-style.css',
        array(),
        '1.0.0'
    );

    // Localize script with configuration
    wp_localize_script('voicero-help-js', 'voiceroHelpConfig', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('voicero_help_nonce'),
        'accessKey' => $access_key,
        'apiUrl' => 'https://www.voicero.ai',
        'strings' => array(
            'loading' => 'Loading help modules...',
            'error' => 'Error loading help center',
            'saveSuccess' => 'Changes saved successfully!',
            'saveFailed' => 'Failed to save changes',
            'publishSuccess' => 'Question published successfully!',
            'unpublishSuccess' => 'Question unpublished successfully!',
            'deleteSuccess' => 'Question deleted',
            'deleteFailed' => 'Failed to delete question',
            'addSuccess' => 'Question added',
            'addFailed' => 'Failed to add question',
            'maxQuestions' => 'Maximum number of questions reached',
            'confirmDelete' => 'Are you sure you want to delete this question?',
        )
    ));

    // Output the HTML structure
    ?>
    <div class="wrap voicero-help-page">
        <h1>Help Center</h1>
        <p class="description">Manage your help center questions and answers</p>

        <!-- Main Container -->
        <div class="voicero-help-container">
            <!-- Header Card -->
            <div class="voicero-card voicero-header-card">
                <div class="voicero-header-content">
                    <div class="voicero-icon-wrapper">
                        <span class="dashicons dashicons-editor-help"></span>
                    </div>
                    <div>
                        <h2>Help Center</h2>
                        <p>Find answers to common questions and learn how to use our platform effectively.</p>
                    </div>
                    <div class="voicero-header-actions">
                        <button id="voicero-refresh-help" class="button">
                            <span class="dashicons dashicons-update"></span>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading State -->
            <div id="voicero-help-loading" class="voicero-loading-state" style="display: none;">
                <div class="voicero-spinner"></div>
                <p>Loading help modules...</p>
            </div>

            <!-- Error State -->
            <div id="voicero-help-error" class="voicero-error-state" style="display: none;">
                <div class="voicero-error-content">
                    <span class="dashicons dashicons-warning"></span>
                    <p id="voicero-help-error-message"></p>
                    <button id="voicero-retry-help" class="button button-primary">Retry</button>
                </div>
            </div>

            <!-- Main Content -->
            <div id="voicero-help-content" class="voicero-help-main-content" style="display: none;">
                <div class="voicero-help-layout">
                    <!-- Sidebar -->
                    <div class="voicero-help-sidebar">
                        <div class="voicero-card">
                            <div class="voicero-sidebar-header">
                                <h3>
                                    <span class="dashicons dashicons-editor-help"></span>
                                    Questions
                                </h3>
                                <button id="voicero-add-question" class="button button-primary">
                                    <span class="dashicons dashicons-plus"></span>
                                    Add Question
                                </button>
                            </div>
                            <div id="voicero-questions-list" class="voicero-questions-list">
                                <!-- Questions will be populated here -->
                            </div>
                        </div>
                    </div>

                    <!-- Main Content Area -->
                    <div class="voicero-help-main">
                        <!-- No Selection State -->
                        <div id="voicero-no-selection" class="voicero-no-selection">
                            <div class="voicero-card">
                                <div class="voicero-empty-state">
                                    <span class="dashicons dashicons-editor-help"></span>
                                    <h3>No questions yet</h3>
                                    <p>Create your first help center question to get started</p>
                                    <button id="voicero-add-first-question" class="button button-primary">
                                        <span class="dashicons dashicons-plus"></span>
                                        Add your first question
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Question Content -->
                        <div id="voicero-question-content" class="voicero-question-content" style="display: none;">
                            <!-- Question Header -->
                            <div class="voicero-card voicero-question-header">
                                <div class="voicero-question-title-section">
                                    <div id="voicero-question-title-display" class="voicero-title-display">
                                        <!-- Title will be populated here -->
                                    </div>
                                    <div id="voicero-question-title-edit" class="voicero-title-edit" style="display: none;">
                                        <input type="text" id="voicero-edit-title" class="voicero-title-input" placeholder="Enter question title">
                                    </div>
                                </div>

                                <div class="voicero-question-meta">
                                    <!-- Meta tags will be populated here -->
                                </div>

                                <div class="voicero-question-actions">
                                    <div id="voicero-view-actions" class="voicero-action-group">
                                        <button id="voicero-edit-question" class="button button-primary">
                                            <span class="dashicons dashicons-edit"></span>
                                            Edit
                                        </button>
                                        <button id="voicero-publish-question" class="button voicero-publish-btn">
                                            <span class="dashicons dashicons-yes"></span>
                                            Publish
                                        </button>
                                        <button id="voicero-unpublish-question" class="button voicero-unpublish-btn" style="display: none;">
                                            <span class="dashicons dashicons-visibility"></span>
                                            Unpublish
                                        </button>
                                    </div>
                                    <div id="voicero-edit-actions" class="voicero-action-group" style="display: none;">
                                        <button id="voicero-cancel-edit" class="button">
                                            Cancel
                                        </button>
                                        <button id="voicero-save-changes" class="button button-primary">
                                            <span class="dashicons dashicons-yes"></span>
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Question Editor -->
                            <div class="voicero-card voicero-question-editor">
                                <div id="voicero-content-display" class="voicero-content-display">
                                    <!-- Content will be populated here -->
                                </div>
                                <div id="voicero-content-edit" class="voicero-content-edit" style="display: none;">
                                    <div class="voicero-editor-header">
                                        <h4>Rich Text Editor</h4>
                                    </div>
                                    <div class="voicero-editor-toolbar">
                                        <button type="button" class="voicero-format-btn" data-format="bold" title="Bold">
                                            <span class="dashicons dashicons-editor-bold"></span>
                                        </button>
                                        <button type="button" class="voicero-format-btn" data-format="italic" title="Italic">
                                            <span class="dashicons dashicons-editor-italic"></span>
                                        </button>
                                        <button type="button" class="voicero-format-btn" data-format="underline" title="Underline">
                                            <span class="dashicons dashicons-editor-underline"></span>
                                        </button>
                                        <div class="voicero-toolbar-separator"></div>
                                        <button type="button" class="voicero-format-btn" data-format="insertOrderedList" title="Numbered List">
                                            <span class="dashicons dashicons-editor-ol"></span>
                                        </button>
                                        <button type="button" class="voicero-format-btn" data-format="insertUnorderedList" title="Bulleted List">
                                            <span class="dashicons dashicons-editor-ul"></span>
                                        </button>
                                        <div class="voicero-toolbar-separator"></div>
                                        <button type="button" class="voicero-format-btn" data-format="createLink" title="Insert Link">
                                            <span class="dashicons dashicons-admin-links"></span>
                                        </button>
                                    </div>
                                    <div class="voicero-editor-container">
                                        <div id="voicero-content-editor" class="voicero-rich-editor" contenteditable="true" placeholder="Write your content here...">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Toast Notifications -->
        <div id="voicero-toast-container" class="voicero-toast-container"></div>
    </div>
    <?php
}

// AJAX handler for getting help center data
function voicero_get_help_data() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'voicero_help_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'));
        return;
    }

    $access_key = get_option('voicero_access_key', '');
    if (empty($access_key)) {
        wp_send_json_error(array('message' => 'No access key configured'));
        return;
    }

    // Make request to external API (GET request with Authorization header)
    $response = wp_remote_get('https://www.voicero.ai/api/helpCenter/get', array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $access_key,
        ),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        error_log('Voicero Help API Error: ' . $response->get_error_message());
        wp_send_json_error(array('message' => 'Connection failed: ' . $response->get_error_message()));
        return;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);

    error_log('Voicero Help API Response Code: ' . $response_code);
    error_log('Voicero Help API Response Body: ' . $response_body);

    if ($response_code !== 200) {
        wp_send_json_error(array('message' => 'API request failed with status ' . $response_code));
        return;
    }

    $data = json_decode($response_body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(array('message' => 'Invalid JSON response'));
        return;
    }

    wp_send_json_success($data);
}
add_action('wp_ajax_voicero_get_help_data', 'voicero_get_help_data');

// AJAX handler for saving help center question
function voicero_save_help_question() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'voicero_help_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'));
        return;
    }

    $access_key = get_option('voicero_access_key', '');
    if (empty($access_key)) {
        wp_send_json_error(array('message' => 'No access key configured'));
        return;
    }

    $question_data = array(
        'accessKey' => $access_key,
        'id' => sanitize_text_field($_POST['id']),
        'question' => sanitize_text_field($_POST['question']),
        'documentAnswer' => wp_kses_post($_POST['documentAnswer']),
        'number' => intval($_POST['number']),
        'type' => sanitize_text_field($_POST['type']),
        'status' => sanitize_text_field($_POST['status']),
    );

    // Make request to external API
    $response = wp_remote_post('https://www.voicero.ai/api/helpCenter/edit', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $access_key,
        ),
        'body' => json_encode($question_data),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        error_log('Voicero Help Save API Error: ' . $response->get_error_message());
        wp_send_json_error(array('message' => 'Connection failed: ' . $response->get_error_message()));
        return;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        wp_send_json_error(array('message' => 'API request failed with status ' . $response_code));
        return;
    }

    $data = json_decode($response_body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(array('message' => 'Invalid JSON response'));
        return;
    }

    wp_send_json_success($data);
}
add_action('wp_ajax_voicero_save_help_question', 'voicero_save_help_question');

// AJAX handler for adding new help center question
function voicero_add_help_question() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'voicero_help_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'));
        return;
    }

    $access_key = get_option('voicero_access_key', '');
    if (empty($access_key)) {
        wp_send_json_error(array('message' => 'No access key configured'));
        return;
    }

    $question_data = array(
        'accessKey' => $access_key,
        'question' => sanitize_text_field($_POST['question']),
        'documentAnswer' => wp_kses_post($_POST['documentAnswer']),
        'number' => intval($_POST['number']),
        'type' => sanitize_text_field($_POST['type']),
        'status' => sanitize_text_field($_POST['status']),
    );

    // Make request to external API
    $response = wp_remote_post('https://www.voicero.ai/api/helpCenter/add', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $access_key,
        ),
        'body' => json_encode($question_data),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        error_log('Voicero Help Add API Error: ' . $response->get_error_message());
        wp_send_json_error(array('message' => 'Connection failed: ' . $response->get_error_message()));
        return;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        wp_send_json_error(array('message' => 'API request failed with status ' . $response_code));
        return;
    }

    $data = json_decode($response_body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(array('message' => 'Invalid JSON response'));
        return;
    }

    wp_send_json_success($data);
}
add_action('wp_ajax_voicero_add_help_question', 'voicero_add_help_question');

// AJAX handler for deleting help center question
function voicero_delete_help_question() {
    // Verify nonce
    if (!wp_verify_nonce($_POST['nonce'], 'voicero_help_nonce')) {
        wp_send_json_error(array('message' => 'Security check failed'));
        return;
    }

    $access_key = get_option('voicero_access_key', '');
    if (empty($access_key)) {
        wp_send_json_error(array('message' => 'No access key configured'));
        return;
    }

    $delete_data = array(
        'accessKey' => $access_key,
        'id' => sanitize_text_field($_POST['id']),
    );

    // Make request to external API
    $response = wp_remote_post('https://www.voicero.ai/api/helpCenter/delete', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $access_key,
        ),
        'body' => json_encode($delete_data),
        'timeout' => 30,
    ));

    if (is_wp_error($response)) {
        error_log('Voicero Help Delete API Error: ' . $response->get_error_message());
        wp_send_json_error(array('message' => 'Connection failed: ' . $response->get_error_message()));
        return;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        wp_send_json_error(array('message' => 'API request failed with status ' . $response_code));
        return;
    }

    $data = json_decode($response_body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        wp_send_json_error(array('message' => 'Invalid JSON response'));
        return;
    }

    wp_send_json_success($data);
}
add_action('wp_ajax_voicero_delete_help_question', 'voicero_delete_help_question');
