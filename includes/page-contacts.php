<?php
// includes/page-contacts.php
if ( ! defined('ABSPATH') ) {
    exit;
}

/**
 * Register and enqueue scripts for the Contacts page
 */
add_action('admin_enqueue_scripts', 'voicero_register_contacts_scripts');
function voicero_register_contacts_scripts($hook) {
    // Only enqueue on our plugin page
    if ($hook !== 'voicero-ai_page_voicero-ai-contacts') {
        return;
    }
    
    // Register and enqueue the contacts JS
    wp_register_script(
        'voicero-contacts',
        plugin_dir_url(__FILE__) . '../assets/js/admin/voicero-contacts.js',
        array('jquery'),
        VOICERO_VERSION,
        true
    );
    
    wp_enqueue_script('voicero-contacts');
    
    // Localize script with necessary data if needed
    wp_localize_script('voicero-contacts', 'voiceroContactsConfig', array(
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('voicero_ajax_nonce')
    ));
}

/**
 * Renders the "Contacts" tab.
 * You can list saved contact‐form submissions here, or provide a quick contact form.
 */
function voicero_render_contacts_page() {
    ?>
    <div class="wrap voicero-contacts-page">
        <h1><?php esc_html_e( 'Customer Messages', 'voicero-ai' ); ?></h1>
        <p><?php esc_html_e( 'Manage customer inquiries and support requests', 'voicero-ai' ); ?></p>
        
        <div class="voicero-card">
            <div class="message-center-header">
                <div>
                    <h2 class="message-center-title"><?php esc_html_e( 'Message Center', 'voicero-ai' ); ?></h2>
                </div>
            </div>
            
            <div class="message-stats">
                <div class="stat-box">
                    <div class="stat-value" id="total-messages">0</div>
                    <div class="stat-label"><?php esc_html_e( 'Total Messages', 'voicero-ai' ); ?></div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-value" id="unread-messages">0</div>
                    <div class="stat-label"><?php esc_html_e( 'Unread', 'voicero-ai' ); ?></div>
                </div>
                
                <div class="stat-box high-priority">
                    <div class="stat-value" id="high-priority-messages">0</div>
                    <div class="stat-label"><?php esc_html_e( 'High Priority', 'voicero-ai' ); ?></div>
                </div>
                
                <div class="stat-box">
                    <div class="stat-value" id="response-rate">0%</div>
                    <div class="stat-label"><?php esc_html_e( 'Response Rate', 'voicero-ai' ); ?></div>
                </div>
            </div>
        </div>
        
        <div class="voicero-card">
            <div class="messages-header">
                <h2><?php esc_html_e( 'Recent Messages', 'voicero-ai' ); ?></h2>
                <button id="refresh-messages" class="button">
                    <span class="dashicons dashicons-update"></span>
                    <?php esc_html_e( 'Refresh', 'voicero-ai' ); ?>
                </button>
            </div>
            
            <p><?php esc_html_e( 'Customer inquiries and support requests', 'voicero-ai' ); ?></p>
            
            <div class="message-tabs">
                <a href="#" class="tab active" data-filter="all"><?php esc_html_e( 'All Messages', 'voicero-ai' ); ?> <span id="all-count">(1)</span></a>
                <a href="#" class="tab" data-filter="unread"><?php esc_html_e( 'Unread', 'voicero-ai' ); ?> <span id="unread-tab-count">(1)</span></a>
                <a href="#" class="tab" data-filter="read"><?php esc_html_e( 'Read', 'voicero-ai' ); ?> <span id="read-count">(0)</span></a>
            </div>
            
            <div id="messages-container" style="position: relative; min-height: 100px;">
                <!-- Messages will be loaded here via JavaScript -->
                <!-- For development/demo purposes, we'll show a static message initially -->
                <div class="message-item unread" data-id="1">
                    <div class="message-avatar"></div>
                    <div class="message-content">
                        <div class="message-header">
                            <div class="message-info">
                                <div class="message-email"></div>
                                <div class="message-meta">
                                    <span class="new-badge"></span>
                                    <span class="message-time"></span>
                                </div>
                            </div>
                            <div class="message-actions">
                                <button class="button mark-read-btn"></button>
                                <button class="button reply-btn"></button>
                                <button class="button delete-btn"></button>
                            </div>
                        </div>
                        <div class="message-body"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
}
