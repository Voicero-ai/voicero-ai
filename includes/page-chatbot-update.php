<?php
// includes/page-chatbot-update.php
if ( ! defined('ABSPATH') ) {
    exit;
}

/**
 * Register and enqueue scripts for the Chatbot Update page
 */
add_action('admin_enqueue_scripts', 'voicero_register_chatbot_scripts');
function voicero_register_chatbot_scripts($hook) {
    // Only enqueue on our plugin page
    if ($hook !== 'voicero-ai_page_voicero-ai-chatbot-update') {
        return;
    }
    
    // Register and enqueue the chatbot JS
    wp_register_script(
        'voicero-chatbot',
        plugin_dir_url(__FILE__) . '../assets/js/admin/voicero-chatbot.js',
        array('jquery'),
        VOICERO_VERSION,
        true
    );
    
    wp_enqueue_script('voicero-chatbot');
}

/**
 * Renders the "Customize AI Chatbot" page.
 * This page allows customization of the chatbot appearance and behavior.
 */
function voicero_render_chatbot_update_page() {
    // First, get the website data from the API
    $access_key = voicero_get_access_key();
    $website_id = '';
    $website_data = array();
    $api_debug = array();
    
    // Get basic website info first to get the ID
    $info_response = wp_remote_post(admin_url('admin-ajax.php'), array(
        'body' => array(
            'action' => 'voicero_get_info',
            'nonce' => wp_create_nonce('voicero_ajax_nonce')
        )
    ));
    
    $api_debug['info_response'] = $info_response;
    
    if (!is_wp_error($info_response) && wp_remote_retrieve_response_code($info_response) === 200) {
        $info_data = json_decode(wp_remote_retrieve_body($info_response), true);
        $api_debug['info_data'] = $info_data;
        
        if (isset($info_data['success']) && $info_data['success'] && !empty($info_data['data']['id'])) {
            $website_id = $info_data['data']['id'];
            
            // Now get detailed website data
            $detailed_response = wp_remote_post(admin_url('admin-ajax.php'), array(
                'body' => array(
                    'action' => 'voicero_websites_get',
                    'nonce' => wp_create_nonce('voicero_ajax_nonce'),
                    'id' => $website_id
                ),
                'timeout' => 30, // Increase timeout for larger responses
            ));
            
            $api_debug['detailed_response'] = $detailed_response;
            
            if (!is_wp_error($detailed_response) && wp_remote_retrieve_response_code($detailed_response) === 200) {
                $response_data = json_decode(wp_remote_retrieve_body($detailed_response), true);
                $api_debug['response_data'] = $response_data;
                
                if (isset($response_data['success']) && $response_data['success']) {
                    $website_data = $response_data['data'];
                    
                    // Log the data to help with debugging
                } else {
                    // Log error
                }
            } else {
                // Log error
                if (is_wp_error($detailed_response)) {
                } else {
                }
            }
        }
    }
    
    // Set defaults and then override with API data if available
    $chatbot_name = !empty($website_data['botName']) ? $website_data['botName'] : '';
    $welcome_message = !empty($website_data['customWelcomeMessage']) ? $website_data['customWelcomeMessage'] : '';
    $custom_instructions = !empty($website_data['customInstructions']) ? $website_data['customInstructions'] : '';
    $primary_color = !empty($website_data['color']) ? $website_data['color'] : '#008060'; // Default to teal
    

    
    // Get suggested questions
    $suggested_questions = !empty($website_data['popUpQuestions']) ? $website_data['popUpQuestions'] : array();
    
    // Get website info
    $website_name = !empty($website_data['name']) ? $website_data['name'] : 'Your Website';
    
    // Format last synced date if available
    $last_synced = 'Never';
    if (!empty($website_data['lastSyncedAt'])) {
        $last_synced_date = new DateTime($website_data['lastSyncedAt']);
        $last_synced = $last_synced_date->format('m/d/Y, h:i:s A');
    }
    
    // Pass website data to JavaScript
    wp_localize_script('voicero-chatbot', 'voiceroChatbotData', $website_data);
    
    ?>
    <div class="wrap voicero-chatbot-page">
        <div class="chatbot-header">
            <a href="<?php echo esc_url(admin_url('admin.php?page=voicero-ai-admin')); ?>" class="back-link">
                <span class="dashicons dashicons-arrow-left-alt"></span> 
                <?php esc_html_e( 'Customize AI Chatbot', 'voicero-ai' ); ?>
            </a>
            <button type="button" id="save-settings-btn" class="button button-primary">
                <?php esc_html_e( 'Save Settings', 'voicero-ai' ); ?>
            </button>
        </div>
        
        <div id="voicero-settings-message"></div>
        
        <form id="voicero-chatbot-form" method="post" action="javascript:void(0);">
            <?php wp_nonce_field('voicero_chatbot_nonce', 'voicero_chatbot_nonce'); ?>
            <input type="hidden" id="website-id" name="website_id" value="<?php echo esc_attr($website_id); ?>">
            <input type="hidden" id="access-key" name="access_key" value="<?php echo esc_attr($access_key); ?>">
            
            <!-- Chatbot Identity Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-admin-users"></span>
                    </div>
                    <h2><?php esc_html_e( 'Chatbot Identity', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <div class="form-field">
                        <label for="chatbot-name"><?php esc_html_e( 'Chatbot Name', 'voicero-ai' ); ?></label>
                        <input type="text" id="chatbot-name" name="chatbot_name" value="<?php echo esc_attr($chatbot_name); ?>" maxlength="120">
                        <p class="field-description"><?php esc_html_e( 'The name displayed to your customers (max 120 characters)', 'voicero-ai' ); ?></p>
                        <div class="voicero-form-error" id="chatbot-name-error"></div>
                    </div>
                    
                    <div class="form-field">
                        <label for="welcome-message"><?php esc_html_e( 'Welcome Message', 'voicero-ai' ); ?></label>
                        <textarea id="welcome-message" name="welcome_message" rows="3"><?php echo esc_textarea($welcome_message); ?></textarea>
                        <p class="field-description"><?php esc_html_e( 'First message shown when a customer opens the chat (max 25 words)', 'voicero-ai' ); ?></p>
                        <div class="word-count" id="welcome-message-count">0/25 words</div>
                        <div class="voicero-form-error" id="welcome-message-error"></div>
                    </div>
                    
                    <div class="form-field">
                        <label for="custom-instructions"><?php esc_html_e( 'Custom Instructions', 'voicero-ai' ); ?></label>
                        <textarea id="custom-instructions" name="custom_instructions" rows="5"><?php echo esc_textarea($custom_instructions); ?></textarea>
                        <p class="field-description"><?php esc_html_e( 'Specific instructions for how the AI should behave or respond (max 50 words)', 'voicero-ai' ); ?></p>
                        <div class="word-count" id="custom-instructions-count">0/50 words</div>
                        <div class="voicero-form-error" id="custom-instructions-error"></div>
                    </div>
                </div>
            </div>
            
            <!-- Suggested Questions Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-editor-help"></span>
                    </div>
                    <h2><?php esc_html_e( 'Suggested Questions', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <p><?php esc_html_e( 'Add up to 3 suggested questions that will appear as quick options for customers to click.', 'voicero-ai' ); ?></p>
                    
                    <div id="suggested-questions-container">
                        <?php if (empty($suggested_questions)): ?>
                            <div class="no-questions"><?php esc_html_e( 'No suggested questions added yet.', 'voicero-ai' ); ?></div>
                        <?php else: ?>
                            <?php foreach ($suggested_questions as $index => $question): ?>
                                <div class="suggested-question-item" data-index="<?php echo esc_attr($index); ?>">
                                    <input type="text" name="suggested_questions[]" value="<?php echo esc_attr($question); ?>" class="suggested-question-input">
                                    <button type="button" class="remove-question-btn button-link">
                                        <span class="dashicons dashicons-trash"></span>
                                    </button>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                    
                    <div class="question-counter"><span id="questions-count"><?php echo count($suggested_questions); ?></span>/3 questions added</div>
                    
                    <div class="add-question-container" <?php echo (count($suggested_questions) >= 3) ? 'style="display:none;"' : ''; ?>>
                        <div class="add-question-field">
                            <input type="text" id="new-question" placeholder="<?php esc_attr_e('Type a question customers might ask...', 'voicero-ai'); ?>">
                            <button type="button" id="add-question-btn" class="button" style="display: flex; align-items: center; justify-content: center;">
                                <span class="dashicons dashicons-plus" style="margin-right: 5px; line-height: 1.2;"></span> <?php esc_html_e( 'Add', 'voicero-ai' ); ?>
                            </button>
                        </div>
                    </div>
                    
                    <div class="voicero-form-error" id="popup-questions-error"></div>
                </div>
            </div>
            
            <!-- Appearance Settings Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-admin-appearance"></span>
                    </div>
                    <h2><?php esc_html_e( 'Appearance Settings', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <div class="form-field">
                        <label><?php esc_html_e( 'Primary Color', 'voicero-ai' ); ?></label>
                        <div class="color-picker-container" style="display: flex; align-items: center; gap: 15px; margin-top: 10px;">
                            <input type="color" id="primary-color" name="primary_color" value="<?php echo esc_attr($primary_color); ?>" style="width: 50px; height: 40px; border: none; border-radius: 4px; cursor: pointer;" />
                            <input type="text" id="color-input" name="color_input" value="<?php echo esc_attr($primary_color); ?>" placeholder="#008060 or rgb(0,128,96) or 0,128,96" style="width: 200px; font-family: monospace;" />
                            <div class="color-preview" style="width: 30px; height: 30px; background: <?php echo esc_attr($primary_color); ?>; border: 1px solid #ddd; border-radius: 4px; display: inline-block;"></div>
                        </div>
                        <p class="field-description"><?php esc_html_e( 'This color will be used for the chatbot button and header. Supports hex (#008060), RGB (rgb(0,128,96)), or comma-separated (0,128,96) formats.', 'voicero-ai' ); ?></p>
                    </div>
                </div>
            </div>
            
            <!-- AI UI Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-admin-settings"></span>
                    </div>
                    <h2><?php esc_html_e( 'AI UI', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <div class="form-field checkbox-field">
                        <label>
                            <input type="checkbox" id="activate-all-ai" name="activate_all_ai">
                            <?php esc_html_e( 'Activate All', 'voicero-ai' ); ?>
                        </label>
                        <p class="field-description"><?php esc_html_e( 'Toggle both Voice and Text AI', 'voicero-ai' ); ?></p>
                    </div>
                    
                    <div class="form-field checkbox-field">
                        <label>
                            <input type="checkbox" id="show-voice-ai" name="show_voice_ai" value="1" checked>
                            <?php esc_html_e( 'Voice AI', 'voicero-ai' ); ?>
                        </label>
                        <p class="field-description"><?php esc_html_e( 'Enable voice-based assistant UI', 'voicero-ai' ); ?></p>
                    </div>
                    
                    <div class="form-field checkbox-field">
                        <label>
                            <input type="checkbox" id="show-text-ai" name="show_text_ai" value="1" checked>
                            <?php esc_html_e( 'Text AI', 'voicero-ai' ); ?>
                        </label>
                        <p class="field-description"><?php esc_html_e( 'Enable text chat assistant UI', 'voicero-ai' ); ?></p>
                    </div>
                </div>
            </div>
            
            <!-- AI Auto Features Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-admin-settings"></span>
                    </div>
                    <h2><?php esc_html_e( 'AI Auto Features', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #856404;"><strong><?php esc_html_e( 'Warning:', 'voicero-ai' ); ?></strong> <?php esc_html_e( 'Disabling these features may reduce the assistant\'s effectiveness.', 'voicero-ai' ); ?></p>
                    </div>
                    
                    <div class="auto-features-grid">
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-redirect" name="allowAutoRedirect">
                                <?php esc_html_e( 'Automatically redirect users to relevant pages', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-scroll" name="allowAutoScroll">
                                <?php esc_html_e( 'Scroll to relevant sections on the page', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-highlight" name="allowAutoHighlight">
                                <?php esc_html_e( 'Highlight important elements on the page', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-click" name="allowAutoClick">
                                <?php esc_html_e( 'Click buttons and links on behalf of users', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-fill-form" name="allowAutoFillForm" checked>
                                <?php esc_html_e( 'Automatically fill forms for users', 'voicero-ai' ); ?>
                            </label>
                        </div>
                    </div>
                    
                    <h4 style="margin: 25px 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;"><?php esc_html_e( 'Order Features', 'voicero-ai' ); ?></h4>
                    <div class="auto-features-grid">
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-cancel" name="allowAutoCancel">
                                <?php esc_html_e( 'Help users cancel orders', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-return" name="allowAutoReturn" disabled>
                                <?php esc_html_e( 'Help users return products', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-exchange" name="allowAutoExchange" disabled>
                                <?php esc_html_e( 'Help users exchange products', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-track-order" name="allowAutoTrackOrder" checked>
                                <?php esc_html_e( 'Help users track their orders', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-get-user-orders" name="allowAutoGetUserOrders">
                                <?php esc_html_e( 'Fetch and display user order history', 'voicero-ai' ); ?>
                            </label>
                        </div>
                    </div>
                    
                    <h4 style="margin: 25px 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;"><?php esc_html_e( 'User Data Features', 'voicero-ai' ); ?></h4>
                    <div class="auto-features-grid">
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-update-user-info" name="allowAutoUpdateUserInfo">
                                <?php esc_html_e( 'Help users update their account information', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-logout" name="allowAutoLogout" checked>
                                <?php esc_html_e( 'Help users log out', 'voicero-ai' ); ?>
                            </label>
                        </div>
                        
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-login" name="allowAutoLogin" checked>
                                <?php esc_html_e( 'Help users log in', 'voicero-ai' ); ?>
                            </label>
                        </div>
                    </div>
                    
                    <h4 style="margin: 25px 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;"><?php esc_html_e( 'Content Generation Features', 'voicero-ai' ); ?></h4>
                    <div class="auto-features-grid">
                        <div class="auto-feature-item">
                            <label>
                                <input type="checkbox" id="allow-auto-generate-image" name="allowAutoGenerateImage" disabled>
                                <?php esc_html_e( 'Generate images for users', 'voicero-ai' ); ?>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Navigation Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-admin-settings"></span>
                    </div>
                    <h2><?php esc_html_e( 'Bottom Navigation', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <div class="form-field checkbox-field">
                        <label>
                            <input type="checkbox" id="show-home" name="show_home" value="1" checked>
                            <?php esc_html_e( 'Home', 'voicero-ai' ); ?>
                        </label>
                        <p class="field-description"><?php esc_html_e( 'Shown in nav', 'voicero-ai' ); ?></p>
                    </div>
                    
                    <div class="form-field checkbox-field">
                        <label>
                            <input type="checkbox" id="show-news" name="show_news" value="1" checked>
                            <?php esc_html_e( 'News', 'voicero-ai' ); ?>
                        </label>
                        <p class="field-description"><?php esc_html_e( 'Shown in nav', 'voicero-ai' ); ?></p>
                    </div>
                    
                    <div class="form-field checkbox-field">
                        <label>
                            <input type="checkbox" id="show-help" name="show_help" value="1" checked>
                            <?php esc_html_e( 'Help', 'voicero-ai' ); ?>
                        </label>
                        <p class="field-description"><?php esc_html_e( 'Shown in nav', 'voicero-ai' ); ?></p>
                    </div>
                </div>
            </div>

            <!-- Website Information Section -->
            <div class="voicero-card">
                <div class="voicero-card-header">
                    <div class="card-header-icon">
                        <span class="dashicons dashicons-admin-site-alt3"></span>
                    </div>
                    <h2><?php esc_html_e( 'Website Information', 'voicero-ai' ); ?></h2>
                </div>
                
                <div class="voicero-card-content">
                    <div class="info-field">
                        <span class="info-label"><?php esc_html_e( 'Website:', 'voicero-ai' ); ?></span>
                        <span class="info-value"><?php echo esc_html($website_name); ?></span>
                    </div>
                    
                    <div class="info-field">
                        <span class="info-label"><?php esc_html_e( 'Last Synced:', 'voicero-ai' ); ?></span>
                        <span class="info-value"><?php echo esc_html($last_synced); ?></span>
                    </div>
                </div>
            </div>
           
        </form>
    </div>
    <?php
}

// Register the AJAX handler for "voicero_trigger_chatbot_update":
add_action( 'wp_ajax_voicero_trigger_chatbot_update', function() {
    if ( ! check_admin_referer( 'voicero_update_chatbot_nonce', 'nonce' ) ) {
        wp_send_json_error( [ 'message' => __( 'Invalid nonce', 'voicero-ai' ) ] );
    }

    // 1) Check capability
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( [ 'message' => __( 'Insufficient permissions', 'voicero-ai' ) ] );
    }

    // 2) Fetch access key
    $access_key = get_option( 'voicero_access_key', '' );
    if ( empty( $access_key ) ) {
        wp_send_json_error( [ 'message' => __( 'No access key configured.', 'voicero-ai' ) ] );
    }

    // 3) Fire off your remote API call to trigger chatbot update:
    $response = wp_remote_post( VOICERO_API_URL . '/wordpress/update-chatbot', [
        'headers'  => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type'  => 'application/json',
            'Accept'        => 'application/json',
        ],
        'body'     => json_encode( [ 'websiteId' => get_option( 'voicero_website_id', '' ) ] ), // adjust as needed
        'timeout'  => 30,
        'sslverify'=> false,
    ] );
    if ( is_wp_error( $response ) ) {
        wp_send_json_error( [ 'message' => __( 'API request failed: ', 'voicero-ai' ) . $response->get_error_message() ] );
    }

    $code = wp_remote_retrieve_response_code( $response );
    $body = wp_remote_retrieve_body( $response );
    if ( $code !== 200 ) {
        /* translators: %d: HTTP response code */
        wp_send_json_error( [ 'message' => sprintf( esc_html__( 'Server returned %d', 'voicero-ai' ), $code ) ] );
    }

    wp_send_json_success();
} );

// Register the AJAX handler for "voicero_save_chatbot_settings":
add_action('wp_ajax_voicero_save_chatbot_settings', function() {
    if (!check_admin_referer('voicero_chatbot_nonce', 'nonce')) {
        wp_send_json_error(['message' => __('Invalid nonce', 'voicero-ai')]);
    }

    // Check capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => __('Insufficient permissions', 'voicero-ai')]);
    }

    // Get settings from request
    if (isset($_POST['settings'])) {
        if (is_string($_POST['settings'])) {
            // If it's a string (JSON), sanitize it as a text field then unslash
            $raw_settings = sanitize_text_field(wp_unslash($_POST['settings']));
            $settings = json_decode($raw_settings, true);
        } else if (is_array($_POST['settings'])) {
            // If it's already an array, unslash and sanitize it
            $settings = map_deep(wp_unslash($_POST['settings']), 'sanitize_text_field');
        } else {
            $settings = [];
        }
    } else {
        $settings = [];
    }
    
    if (empty($settings)) {
        wp_send_json_error(['message' => __('No settings provided', 'voicero-ai')]);
    }
    
    // Map UI icon types to API icon types
    $bot_icon_map = [
        'Bot' => 'BotIcon',
        'Voice' => 'VoiceIcon',
        'Message' => 'MessageIcon'
    ];
    
    $voice_icon_map = [
        'Microphone' => 'MicrophoneIcon',
        'Waveform' => 'WaveformIcon',
        'Speaker' => 'SpeakerIcon'
    ];
    
    $message_icon_map = [
        'Message' => 'MessageIcon',
        'Document' => 'DocumentIcon',
        'Cursor' => 'CursorIcon'
    ];
    
    // Format data for API
    $api_data = [
        'websiteId' => isset($settings['websiteId']) ? sanitize_text_field($settings['websiteId']) : '',
        'botName' => isset($settings['chatbot_name']) ? sanitize_text_field($settings['chatbot_name']) : '',
        'customWelcomeMessage' => isset($settings['welcome_message']) ? sanitize_textarea_field($settings['welcome_message']) : '',
        'clickMessage' => isset($settings['click_message']) ? sanitize_textarea_field($settings['click_message']) : '',
        'allowMultiAIReview' => isset($settings['allow_multi_ai_review']) ? (bool) $settings['allow_multi_ai_review'] : false,
        'customInstructions' => isset($settings['custom_instructions']) ? sanitize_textarea_field($settings['custom_instructions']) : '',
        'color' => isset($settings['primary_color']) ? sanitize_text_field($settings['primary_color']) : '',
        'removeHighlight' => isset($settings['remove_highlighting']) ? (bool) $settings['remove_highlighting'] : false,
        'iconBot' => isset($settings['bot_icon_type']) && isset($bot_icon_map[$settings['bot_icon_type']]) ? 
            $bot_icon_map[$settings['bot_icon_type']] : 'BotIcon',
        'iconVoice' => isset($settings['voice_icon_type']) && isset($voice_icon_map[$settings['voice_icon_type']]) ? 
            $voice_icon_map[$settings['voice_icon_type']] : 'MicrophoneIcon',
        'iconMessage' => isset($settings['message_icon_type']) && isset($message_icon_map[$settings['message_icon_type']]) ? 
            $message_icon_map[$settings['message_icon_type']] : 'MessageIcon',
        'popUpQuestions' => isset($settings['suggested_questions']) && is_array($settings['suggested_questions']) ? 
            array_map('sanitize_text_field', $settings['suggested_questions']) : []
    ];
    
    // Store settings in WordPress for fallback
    update_option('voicero_chatbot_name', $api_data['botName']);
    update_option('voicero_welcome_message', $api_data['customWelcomeMessage']);
    update_option('voicero_click_message', $api_data['clickMessage']);
    update_option('voicero_allow_multi_ai_review', $api_data['allowMultiAIReview']);
    update_option('voicero_custom_instructions', $api_data['customInstructions']);
    update_option('voicero_primary_color', $api_data['color']);
    update_option('voicero_remove_highlighting', $api_data['removeHighlight']);
    
    // Get UI icon types for storage
    $bot_icon_type = isset($settings['bot_icon_type']) ? sanitize_text_field($settings['bot_icon_type']) : 'bot';
    $voice_icon_type = isset($settings['voice_icon_type']) ? sanitize_text_field($settings['voice_icon_type']) : 'microphone';
    $message_icon_type = isset($settings['message_icon_type']) ? sanitize_text_field($settings['message_icon_type']) : 'message';
    
    update_option('voicero_bot_icon_type', $bot_icon_type);
    update_option('voicero_voice_icon_type', $voice_icon_type);
    update_option('voicero_message_icon_type', $message_icon_type);
    update_option('voicero_suggested_questions', $api_data['popUpQuestions']);
    
    // Update last synced timestamp
    update_option('voicero_last_synced', current_time('m/d/Y, h:i:s A'));
    
    // Send settings to the remote API
    $access_key = get_option('voicero_access_key', '');
    if (!empty($access_key)) {
        $response = wp_remote_post(VOICERO_API_URL . '/websites/update', [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
            'body' => json_encode($api_data),
            'timeout' => 30,
            'sslverify' => false,
        ]);
        
        if (is_wp_error($response)) {
            // Save settings locally even if API call fails
            wp_send_json_success(['message' => __('Settings saved locally, but API update failed: ', 'voicero-ai') . $response->get_error_message()]);
            return;
        }
        
        $code = wp_remote_retrieve_response_code($response);
        if ($code !== 200) {
            // Save settings locally even if API returns error
            wp_send_json_success(['message' => __('Settings saved locally, but API returned error code: ', 'voicero-ai') . $code]);
            return;
        }
    }
    
    wp_send_json_success(['message' => __('Chatbot settings saved successfully', 'voicero-ai')]);
});
