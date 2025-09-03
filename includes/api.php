<?php
/**
 * API and proxy endpoints for Voicero.AI
 */

if (!defined('ABSPATH')) {
    exit; // Prevent direct access
}

// Define the API base URL if not already defined
if (!defined('VOICERO_API_URL')) {
    define('VOICERO_API_URL', 'https://56b2c4656c5a.ngrok-free.app/api');
}

/**
 * Add secure proxy endpoint for Voicero API
 * This keeps the access key server-side only
 */
add_action('rest_api_init', function() {
    register_rest_route(
        'voicero/v1',
        '/connect',
        [
            'methods'             => WP_REST_Server::READABLE,    // GET
            'callback'            => 'voicero_connect_proxy',
            'permission_callback' => '__return_true',            // <-- allows public
        ]
    );

    // New session endpoint proxy that handles both GET and POST
    register_rest_route('voicero/v1', '/session', [
        'methods'  => ['GET', 'POST'],
        'callback' => 'voicero_session_proxy',
        'permission_callback' => '__return_true'
    ]);
    
    // Register the session/windows endpoint used by the JavaScript
    register_rest_route('voicero/v1', '/session/windows', [
        'methods'  => ['POST'],
        'callback' => 'voicero_window_state_proxy',
        'permission_callback' => '__return_true'
    ]);
    
    // Alternative endpoint without nested path
    register_rest_route('voicero/v1', '/window_state', [
        'methods'  => ['POST'],
        'callback' => 'voicero_window_state_proxy',
        'permission_callback' => '__return_true'
    ]);

    // 1) Admin-only: return site info & plan
    register_rest_route(
        'voicero/v1',
        '/connect',
        [
            'methods'             => 'GET',
            'callback'            => 'voicero_connect_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // 2) Public session endpoints for frontend chat
    register_rest_route(
        'voicero/v1',
        '/session',
        [
            'methods'             => ['GET', 'POST'],
            'callback'            => 'voicero_session_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // 3) Public endpoint: update window state (front-end UI)
    register_rest_route(
        'voicero/v1',
        '/window_state',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_window_state_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // 4) Public endpoint: clear/reset session
    register_rest_route(
        'voicero/v1',
        '/session_clear',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_session_clear_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // 5) Public chat proxy for WordPress-flavored messages
    register_rest_route(
        'voicero/v1',
        '/wordpress/chat',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_chat_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // 6) Public TTS (text-to-speech) proxy
    register_rest_route(
        'voicero/v1',
        '/tts',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_tts_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // 7) Public Whisper (speech-to-text) proxy
    register_rest_route(
        'voicero/v1',
        '/whisper',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_whisper_proxy',
            'permission_callback' => '__return_true',
        ]
    );
    
    // 8) Support feedback endpoint
    register_rest_route(
        'voicero/v1',
        '/support',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_support_proxy',
            'permission_callback' => '__return_true',
        ]
    );
    
    // 9) Toggle website status endpoint
    register_rest_route(
        'voicero/v1',
        '/toggle-status',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_toggle_status_proxy',
            'permission_callback' => '__return_true',
        ]
    );
    


    // 11) Second Look analysis endpoint
    register_rest_route(
        'voicero/v1',
        '/wordpress/secondLook',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_second_look_proxy',
            'permission_callback' => '__return_true', // Allow all users to use the second look feature
        ]
    );

    // Register the websites/get endpoint
    register_rest_route(
        'voicero/v1',
        '/websites/get',
        [
            'methods'             => 'GET',
            'callback'            => 'voicero_websites_get_proxy',
            'permission_callback' => '__return_true',
        ]
    );

    // Register the website auto features update endpoint
    register_rest_route(
        'voicero/v1',
        '/website-auto-features',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_website_auto_features_proxy',
            'permission_callback' => function() {
                // Allow access to site administrators or through valid API request
                return current_user_can('manage_options') || 
                       (isset($_SERVER['HTTP_X_VOICERO_API']) && $_SERVER['HTTP_X_VOICERO_API'] === get_option('voicero_api_secret', ''));
            },
        ]
    );
    
    // Customer data endpoint
    register_rest_route(
        'voicero/v1',
        '/getCustomer',
        [
            'methods'             => ['GET', 'POST'],
            'callback'            => 'voicero_get_customer_rest',
            'permission_callback' => '__return_true',
            'args' => [
                'email' => [
                    'required' => false,
                    'validate_callback' => function($param, $request, $key) {
                        return empty($param) || is_email($param);
                    }
                ],
                'user_id' => [
                    'required' => false,
                    'validate_callback' => function($param, $request, $key) {
                        return empty($param) || is_numeric($param);
                    }
                ]
            ]
        ]
    );
    
    // Cart data endpoint
    register_rest_route(
        'voicero/v1',
        '/getCart',
        [
            'methods'             => ['GET', 'POST'],
            'callback'            => 'voicero_get_cart_rest',
            'permission_callback' => '__return_true'
        ]
    );
    
    // Public nonce endpoint for frontend
    register_rest_route(
        'voicero/v1',
        '/getNonce',
        [
            'methods'             => 'GET',
            'callback'            => 'voicero_get_nonce_rest',
            'permission_callback' => '__return_true'
        ]
    );
    
    // Debug endpoint to check authentication status
    register_rest_route(
        'voicero/v1',
        '/debug-auth',
        [
            'methods'             => 'GET',
            'callback'            => 'voicero_debug_auth_rest',
            'permission_callback' => '__return_true'
        ]
    );

    // Register the getOrders endpoint (for Node.js compatibility)
    register_rest_route(
        'voicero/v1',
        '/getOrders',
        [
            'methods'             => 'GET',
            'callback'            => 'voicero_get_orders_rest',
            'permission_callback' => '__return_true',
        ]
    );

    // Register the trackOrder endpoint (for Node.js compatibility)
    register_rest_route(
        'voicero/v1',
        '/trackOrder',
        [
            'methods'             => 'GET',
            'callback'            => 'voicero_track_order_rest',
            'permission_callback' => '__return_true',
        ]
    );

    // Register the cancelOrder endpoint (for Node.js compatibility)
    register_rest_route(
        'voicero/v1',
        '/cancelOrder',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_cancel_order_rest',
            'permission_callback' => '__return_true',
        ]
    );

    // Register the returnOrder endpoint (for Node.js compatibility)
    register_rest_route(
        'voicero/v1',
        '/returnOrder',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_return_order_rest',
            'permission_callback' => '__return_true',
        ]
    );

    // Register cart management endpoints (for Node.js compatibility)
    register_rest_route(
        'voicero/v1',
        '/addToCart',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_add_to_cart_rest',
            'permission_callback' => '__return_true',
        ]
    );

    register_rest_route(
        'voicero/v1',
        '/removeFromCart',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_remove_from_cart_rest',
            'permission_callback' => '__return_true',
        ]
    );

    register_rest_route(
        'voicero/v1',
        '/clearCart',
        [
            'methods'             => 'POST',
            'callback'            => 'voicero_clear_cart_rest',
            'permission_callback' => '__return_true',
        ]
    );
});

/**
 * Initialize WooCommerce for REST API calls
 */
function voicero_init_woocommerce_for_rest() {
    // Initialize WooCommerce session, customer, and cart properly for REST API
    if (!defined('WC_ABSPATH')) {
        include_once(WP_PLUGIN_DIR . '/woocommerce/includes/wc-cart-functions.php');
        include_once(WP_PLUGIN_DIR . '/woocommerce/includes/wc-notice-functions.php');
    }
    
    // Initialize session
    if (is_null(WC()->session)) {
        $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
        WC()->session = new $session_class();
        WC()->session->init();
    }
    
    if (!WC()->session->has_session()) {
        WC()->session->set_customer_session_cookie(true);
    }
    
    // Initialize customer
    if (is_null(WC()->customer)) {
        WC()->customer = new WC_Customer(get_current_user_id(), true);
    }
    
    // Ensure WooCommerce cart is available
    if (is_null(WC()->cart)) {
        WC()->initialize_cart();
    }
    
    // Make sure cart is properly initialized
    WC()->cart->get_cart_from_session();
}

function voicero_connect_proxy() {
    // Get the access key from options (server-side only)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => esc_html__('No access key configured', 'voicero-ai')], 403);
    }
    
    // Make the API request with the key as URL parameter (backward compatibility)
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
    }
    
    // Return the API response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    return new WP_REST_Response(json_decode($response_body, true), $status_code);
}

function voicero_session_proxy(WP_REST_Request $request) {
    // 1) Pull the server-side access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(
            ['error' => esc_html__('No access key configured', 'voicero-ai')],
            403
        );
    }

    // 2) Base URL
    $base = rtrim(VOICERO_API_URL, '/') . '/session';

    // 3) Handle GET — must use query-string, NOT a path segment
    if ('GET' === $request->get_method()) {
        $sessionId = $request->get_param('sessionId');
        $websiteId = $request->get_param('websiteId');

        if ($sessionId) {
            $endpoint = $base . '?sessionId=' . rawurlencode($sessionId);
        } elseif ($websiteId) {
            $endpoint = $base . '?websiteId=' . rawurlencode($websiteId);
        } else {
            return new WP_REST_Response(
                ['error' => esc_html__('Either sessionId or websiteId is required', 'voicero-ai')],
                400
            );
        }

        $response = wp_remote_get(esc_url_raw($endpoint), [
            'headers'   => [
                'Authorization' => 'Bearer ' . $access_key,
                'Accept'        => 'application/json',
            ],
            'timeout'   => 30,
            'sslverify' => false,
        ]);
    }
    // 4) Handle POST — pass through body to create a new session
    else {
        $endpoint = $base;
        $body     = $request->get_body();
        $response = wp_remote_post($endpoint, [
            'headers'   => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'body'      => $body,
            'timeout'   => 30,
            'sslverify' => false,
        ]);
    }

    // 5) Error?
    if (is_wp_error($response)) {
        return new WP_REST_Response(
            ['error' => 'API request failed: ' . $response->get_error_message()],
            500
        );
    }

    // 6) Forward the API's JSON back to the caller
    $status_code   = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data          = json_decode($response_body, true);

    return new WP_REST_Response($data, $status_code);
}

function voicero_window_state_proxy($request) {
    // Get the access key from options (server-side only)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 403);
    }
    
    // Get the request body
    $body = $request->get_body();
    
    // Decode the body to validate it has the required fields
    $decoded_body = json_decode($body, true);
    if (!isset($decoded_body['sessionId']) || !isset($decoded_body['windowState'])) {
        return new WP_REST_Response(['error' => 'Session ID and window state are required'], 400);
    }
    
    // Ensure session ID is a properly formatted string
    $session_id = trim($decoded_body['sessionId']);
    if (empty($session_id)) {
        return new WP_REST_Response(['error' => 'Valid Session ID is required'], 400);
    }
    
    // Construct the API endpoint
    $endpoint = VOICERO_API_URL . '/session/windows';
    
    // Make the POST request with the key (server-side)
    $response = wp_remote_request($endpoint, [
        'method' => 'POST', // Explicitly use POST method for updating
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => $body, // Keep the original body format
        'timeout' => 30,
        'sslverify' => false // Only for local development
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => 'API request failed: ' . $response->get_error_message()
        ], 500);
    }
    
    // Return the API response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    return new WP_REST_Response(json_decode($response_body, true), $status_code);
}

function voicero_session_clear_proxy($request) {
    // Get the access key from options (server-side only)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 403);
    }
    
    // Get the request body
    $body = $request->get_body();
    
    // Decode the body to validate it has the required fields
    $decoded_body = json_decode($body, true);
    if (!isset($decoded_body['sessionId'])) {
        return new WP_REST_Response(['error' => 'Session ID is required'], 400);
    }
    
    // Construct the API endpoint
    $endpoint = VOICERO_API_URL . '/session/clear';
    
    // Make the POST request with the key (server-side)
    $response = wp_remote_request($endpoint, [
        'method' => 'POST',
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => $body, // Keep the original body format
        'timeout' => 30,
        'sslverify' => false // Only for local development
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => 'API request failed: ' . $response->get_error_message()
        ], 500);
    }
    
    // Return the API response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    return new WP_REST_Response(json_decode($response_body, true), $status_code);
}

function voicero_chat_proxy($request) {
    // Get the access key from options (server-side only)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 403);
    }
    
    // Get the request body
    $body = $request->get_body();
    
    // Decode the body to validate it has the required fields
    $decoded_body = json_decode($body, true);
    if (!isset($decoded_body['message'])) {
        return new WP_REST_Response(['error' => 'Message is required'], 400);
    }
    
    // Ensure pageData is included in the request
    if (!isset($decoded_body['pageData'])) {
        $decoded_body['pageData'] = [
            'url' => isset($decoded_body['currentPageUrl']) ? $decoded_body['currentPageUrl'] : '',
            'full_text' => '',
            'buttons' => [],
            'forms' => [],
            'sections' => [],
            'images' => []
        ];
    } else {
        // Filter pageData to remove WordPress admin elements and Voicero UI
        $decoded_body['pageData'] = voicero_filter_page_data($decoded_body['pageData']);
    }
    
    // Re-encode the body with any modifications
    $body = json_encode($decoded_body);
    
    // Construct the API endpoint - Updated to use /wordpress/chat instead of /chat
    $endpoint = VOICERO_API_URL . '/wordpress/chat';
    
    // Make the POST request with the key (server-side)
    $response = wp_remote_post($endpoint, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => $body,
        'timeout' => 60, // Longer timeout for chat responses
        'sslverify' => false // Only for local development
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => 'API request failed: ' . $response->get_error_message()
        ], 500);
    }
    
    // Return the API response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    return new WP_REST_Response(json_decode($response_body, true), $status_code);
}

/**
 * Proxy for the SecondLook feature that analyzes forms and product pages
 * 
 * @param WP_REST_Request $request The incoming request
 * @return WP_REST_Response The response from the API
 */
function voicero_second_look_proxy($request) {
    // Get the access key from options (server-side only)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 403);
    }
    
    // Get the request body
    $body = $request->get_body();
    
    // Decode the body to validate it has the required fields
    $decoded_body = json_decode($body, true);
    if (!isset($decoded_body['sessionId'])) {
        return new WP_REST_Response(['error' => 'Session ID is required'], 400);
    }
    
    // Check for either websitePageData or formData (backward compatibility)
    if (!isset($decoded_body['websitePageData']) && (!isset($decoded_body['formData']) || !is_array($decoded_body['formData']))) {
        return new WP_REST_Response(['error' => 'Website page data is required'], 400);
    }
    
    // Construct the API endpoint
    $endpoint = VOICERO_API_URL . '/wordpress/secondLook';
    
    // Log the request for debugging
    
    // If we got websitePageData, ensure it's correctly handled before forwarding
    if (isset($decoded_body['websitePageData'])) {
        // Convert websitePageData to formData format according to the API's expectations
        $formData = [
            'forms' => [],
            'url' => $decoded_body['url'] ?? $decoded_body['websitePageData']['url'] ?? ''
        ];
        
        // Extract forms from websitePageData if they exist
        if (isset($decoded_body['websitePageData']['forms']) && is_array($decoded_body['websitePageData']['forms'])) {
            foreach ($decoded_body['websitePageData']['forms'] as $idx => $form) {
                // Structure the form data according to the expected API format
                $formFields = [];
                
                // Try to extract input fields if available
                if (isset($decoded_body['websitePageData']['inputs']) && is_array($decoded_body['websitePageData']['inputs'])) {
                    foreach ($decoded_body['websitePageData']['inputs'] as $input) {
                        $formFields[] = [
                            'name' => $input['name'] ?? $input['id'] ?? 'field_' . wp_rand(1000, 9999),
                            'type' => $input['type'] ?? 'text',
                            'label' => $input['label'] ?? $input['placeholder'] ?? '',
                            'placeholder' => $input['placeholder'] ?? '',
                            'required' => false
                        ];
                    }
                }
                
                $formData['forms'][] = [
                    'form_id' => $form['id'] ?? 'form_' . ($idx + 1),
                    'title' => 'Form ' . ($idx + 1),
                    'fields' => $formFields,
                    'submit_text' => 'Submit'
                ];
            }
        }
        
        // Replace the old formData with our new structure
        $decoded_body['formData'] = $formData;
        
        // Re-encode the body with the new structure
        $body = json_encode($decoded_body);
        
        // Log the transformed request for debugging
    }
    
    // Make the POST request with the key (server-side)
    $response = wp_remote_post($endpoint, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => $body,
        'timeout' => 30, // Longer timeout for analysis
        'sslverify' => false // Only for local development
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => 'API request failed: ' . $response->get_error_message()
        ], 500);
    }
    
    // Return the API response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    
    return new WP_REST_Response(json_decode($response_body, true), $status_code);
}

function voicero_tts_proxy(WP_REST_Request $request) {
    /* 1. Guard clauses ---------------------------------------------------- */
    $access_key = get_option('voicero_access_key', '');
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 403);
    }

    $json_body   = $request->get_body();
    $body_params = json_decode($json_body, true);

    if (empty($body_params['text'])) {
        return new WP_REST_Response(['error' => 'No text provided'], 400);
    }

    /* 2. Forward to Voicero API ------------------------------------------- */
    $response = wp_remote_post(
        'https://56b2c4656c5a.ngrok-free.app/api/tts',
        [
            'headers'   => [
                'Authorization'            => 'Bearer ' . $access_key,
                'Content-Type'             => 'application/json',
                'Accept'                   => 'audio/mpeg',
                'X-Expected-Response-Type' => 'audio/mpeg',
            ],
            'body'      => $json_body,
            'timeout'   => 30,
            'sslverify' => false,
        ]
    );

    if (is_wp_error($response)) {
        return new WP_REST_Response(
            ['error' => 'Failed to connect to TTS API: ' . $response->get_error_message()],
            500
        );
    }

    $status_code = wp_remote_retrieve_response_code($response);
    if ($status_code < 200 || $status_code >= 300) {
        return new WP_REST_Response(
            [
                'error'   => 'TTS API returned error',
                'details' => wp_remote_retrieve_body($response),
            ],
            $status_code
        );
    }

    $audio_data = wp_remote_retrieve_body($response);

    /* Basic sanity check (ID3 or MPEG‑sync) */
    if (!str_starts_with($audio_data, 'ID3')
         && (ord($audio_data[0]) !== 0xFF || (ord($audio_data[1]) & 0xE0) !== 0xE0)) {
        return new WP_REST_Response(
            ['error' => 'Invalid audio payload from TTS API'],
            500
        );
    }

    /* 3. Save the MP3 to uploads ----------------------------------------- */
    $upload_dir = wp_upload_dir();
    $subdir     = trailingslashit($upload_dir['basedir']) . 'voicero';

    if (!file_exists($subdir)) {
        wp_mkdir_p($subdir);
    }

    $filename   = 'tts-' . gmdate('Ymd-His') . '-' . wp_generate_password(6, false) . '.mp3';
    $saved      = wp_upload_bits($filename, null, $audio_data, 'voicero');

    if ($saved['error']) {
        return new WP_REST_Response(
            ['error' => 'Failed to write audio file: ' . esc_html($saved['error'])],
            500
        );
    }

    /* 4. Return the public URL (signed if desired) ----------------------- */
    $file_url = $saved['url'];  // already absolute, no need to esc_url() for JSON
    // Ensure the URL uses HTTPS instead of HTTP to prevent mixed content warnings
    $file_url = str_replace('http://', 'https://', $file_url);

    return new WP_REST_Response(
        [
            'success' => true,
            'url'     => $file_url,
            // 'expires' => time() + 3600   // add TTL if you generate signed URLs
        ],
        200
    );
}

function voicero_whisper_proxy($request) {
    // Get the access key from options (server-side only)
    $access_key = get_option('voicero_access_key', '');
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 403);
    }
    
    // Get the uploaded file
    $files = $request->get_file_params();
    if (empty($files['audio']) || !isset($files['audio']['tmp_name'])) {
        return new WP_REST_Response(['error' => 'No audio file uploaded'], 400);
    }
    
    // Get other form parameters
    $params = $request->get_params();
    
    // Create a new multipart form for the upstream request
    $boundary = wp_generate_uuid4();
    
    // Start building multipart body
    $body = '';
    
    // Add audio file to request body - ensure path is validated and sanitized
    $file_path = isset($files['audio']['tmp_name']) ? wp_normalize_path($files['audio']['tmp_name']) : '';
    
    // Validate the file exists and is a valid uploaded file
    if (empty($file_path) || !is_uploaded_file($file_path)) {
        return new WP_REST_Response(['error' => 'Invalid uploaded file'], 400);
    }
    
    $file_name = isset($files['audio']['name']) ? sanitize_file_name($files['audio']['name']) : 'audio.webm';
    $file_type = isset($files['audio']['type']) && !empty($files['audio']['type']) ? 
                 sanitize_text_field($files['audio']['type']) : 'audio/webm';
    $file_content = file_get_contents($file_path);
    
    // Add file as part
    $body .= "--$boundary\r\n";
    $body .= "Content-Disposition: form-data; name=\"audio\"; filename=\"$file_name\"\r\n";
    $body .= "Content-Type: $file_type\r\n\r\n";
    $body .= $file_content . "\r\n";
    
    // Add additional parameters if needed
    foreach ($params as $key => $value) {
        if ($key !== 'audio') { // Skip the file parameter
            $body .= "--$boundary\r\n";
            $body .= "Content-Disposition: form-data; name=\"$key\"\r\n\r\n";
            $body .= $value . "\r\n";
        }
    }
    
    // Close multipart body
    $body .= "--$boundary--\r\n";
    
    // Send request to local API
    $response = wp_remote_post('https://56b2c4656c5a.ngrok-free.app/api/whisper', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
        ],
        'body' => $body,
        'timeout' => 30,
        'sslverify' => false
    ]);
    
    // Check for errors
    if (is_wp_error($response)) {
        return new WP_REST_Response(
            ['error' => 'Failed to connect to Whisper API: ' . $response->get_error_message()], 
            500
        );
    }
    
    // Get response status code
    $status_code = wp_remote_retrieve_response_code($response);
    
    // If not successful, return error
    if ($status_code < 200 || $status_code >= 300) {
        $error_body = wp_remote_retrieve_body($response);
        
        // Clean up the error response to ensure it's valid JSON
        $sanitized_error = $error_body;
        if (!empty($error_body)) {
            // Try to decode JSON response
            $json_decoded = json_decode($error_body, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                // If JSON is invalid, escape it as a string
                $sanitized_error = 'Invalid JSON response: ' . esc_html($error_body);
            } else {
                // If JSON is valid, re-encode it to ensure proper formatting
                $sanitized_error = json_encode($json_decoded);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $sanitized_error = 'Error encoding response';
                }
            }
        }
        
        return new WP_REST_Response(
            ['error' => 'Whisper API returned error', 'details' => $sanitized_error],
            $status_code
        );
    }
    
    // Return API response
    $body = wp_remote_retrieve_body($response);
    return new WP_REST_Response(json_decode($body, true), $status_code);
}

function voicero_support_proxy($request) {
    // Get the request body
    $json_body = $request->get_body();
    $params = json_decode($json_body, true);
    
    // Validate required parameters - must be valid UUIDs
    if (!isset($params['messageId']) || !isset($params['threadId'])) {
        return new WP_REST_Response([
            'error' => 'Missing required parameters: messageId and threadId are required'
        ], 400);
    }
    
    // Log the incoming request
    
    // Validate format
    $uuid_pattern = '/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';
    if (!preg_match($uuid_pattern, $params['messageId']) || !preg_match($uuid_pattern, $params['threadId'])) {
        return new WP_REST_Response([
            'error' => 'Invalid format: messageId and threadId must be valid UUIDs'
        ], 400);
    }
    
    // Get the access key from options
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response([
            'error' => 'No access key configured'
        ], 403);
    }
    
    // Create session-like auth for the external API
    // This fakes a session that the Next.js API expects
    $session_auth = array(
        'user' => array(
            'id' => 'wordpress_plugin', // This will be checked by the API
            'websiteId' => $params['threadId'], // Use the thread ID as website ID for auth
        )
    );
    
    // Encode as JWT-like format
    $session_token = base64_encode(json_encode($session_auth));
    
    // Create data to forward
    $forward_data = array(
        'messageId' => sanitize_text_field($params['messageId']),
        'threadId' => sanitize_text_field($params['threadId']),
        // Add authentication data for the Next.js API
        'auth' => array(
            'session' => $session_token
        )
    );
    
    // Forward to support API
    $response = wp_remote_post('https://56b2c4656c5a.ngrok-free.app/api/support/help', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'X-Voicero-Session' => $session_token, // Add session token in header
            'X-Voicero-Source' => 'wordpress_plugin' // Add source identifier
        ],
        'body' => json_encode($forward_data),
        'timeout' => 15,
        'sslverify' => true // Enable SSL verification for production
    ]);
    
    // Check for request errors
    if (is_wp_error($response)) {
        $error_message = 'Failed to connect to support API: ' . $response->get_error_message();
        return new WP_REST_Response([
            'error' => $error_message
        ], 500);
    }
    
    // Get response status and body
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    // Log the response for debugging
    
    // If it's a 401, try to handle it gracefully
    if ($status_code === 401) {
        // Try to parse the response for more details
        $response_data = json_decode($response_body, true);
        $error_message = isset($response_data['error']) ? $response_data['error'] : 'Authentication failed';
        
        return new WP_REST_Response([
            'error' => 'Authentication failed with support API: ' . $error_message,
            'suggestion' => 'Please check your access key or contact Voicero support'
        ], 401);
    }
    
    // Return the API response
    return new WP_REST_Response(
        json_decode($response_body, true),
        $status_code
    );
}



/**
 * Filter page data to remove WordPress admin and Voicero UI elements
 * 
 * @param array $pageData The page data to filter
 * @return array The filtered page data
 */
function voicero_filter_page_data($pageData) {
    // Define the IDs we want to ignore
    $ignored_ids = [
        // WordPress admin elements
        'wpadminbar',
        'adminbarsearch',
        'page',
        'masthead',
        
        // Voicero UI elements
        'chat-website-button',
        'voice-mic-button',
        'voice-toggle-container',
        'voice-messages',
        'voice-loading-bar',
        'voice-controls-header',
        'voice-input-wrapper',
    ];
    
    // Additional filters for partial matches
    $ignored_prefixes = [
        'wp-',
        'voicero',
    ];
    
    $ignored_substrings = [
        'voice-',
        'text-chat',
    ];
    
    // Filter buttons
    if (isset($pageData['buttons']) && is_array($pageData['buttons'])) {
        $pageData['buttons'] = array_filter($pageData['buttons'], function($btn) use ($ignored_ids, $ignored_prefixes, $ignored_substrings) {
            if (empty($btn['id'])) return true;
            
            // Check for exact match
            if (in_array($btn['id'], $ignored_ids)) return false;
            
            // Check for prefix match
            foreach ($ignored_prefixes as $prefix) {
                if (strpos($btn['id'], $prefix) === 0) return false;
            }
            
            // Check for substring match
            foreach ($ignored_substrings as $substr) {
                if (strpos($btn['id'], $substr) !== false) return false;
            }
            
            return true;
        });
        
        // Re-index array
        $pageData['buttons'] = array_values($pageData['buttons']);
    }
    
    // Filter forms
    if (isset($pageData['forms']) && is_array($pageData['forms'])) {
        $pageData['forms'] = array_filter($pageData['forms'], function($form) use ($ignored_ids, $ignored_prefixes, $ignored_substrings) {
            if (empty($form['id'])) return true;
            
            // Check for exact match
            if (in_array($form['id'], $ignored_ids)) return false;
            
            // Check for prefix match
            foreach ($ignored_prefixes as $prefix) {
                if (strpos($form['id'], $prefix) === 0) return false;
            }
            
            // Check for substring match
            foreach ($ignored_substrings as $substr) {
                if (strpos($form['id'], $substr) !== false) return false;
            }
            
            return true;
        });
        
        // Re-index array
        $pageData['forms'] = array_values($pageData['forms']);
    }
    
    // Filter sections
    if (isset($pageData['sections']) && is_array($pageData['sections'])) {
        $pageData['sections'] = array_filter($pageData['sections'], function($section) use ($ignored_ids, $ignored_prefixes, $ignored_substrings) {
            if (empty($section['id'])) {
                // For elements without IDs, check if it's in header/footer based on tag and text
                if ($section['tag'] === 'header' || $section['tag'] === 'footer') {
                    return false;
                }
                return true;
            }
            
            // Check for exact match
            if (in_array($section['id'], $ignored_ids)) return false;
            
            // Check for prefix match
            foreach ($ignored_prefixes as $prefix) {
                if (strpos($section['id'], $prefix) === 0) return false;
            }
            
            // Check for substring match
            foreach ($ignored_substrings as $substr) {
                if (strpos($section['id'], $substr) !== false) return false;
            }
            
            return true;
        });
        
        // Re-index array
        $pageData['sections'] = array_values($pageData['sections']);
    }
    
    // Filter images - usually no need to filter these, but included for completeness
    if (isset($pageData['images']) && is_array($pageData['images'])) {
        // Keep images that aren't from admin or Gravatar
        $pageData['images'] = array_filter($pageData['images'], function($img) {
            if (empty($img['src'])) return false;
            
            // Skip Gravatar images
            if (strpos($img['src'], 'gravatar.com') !== false) return false;
            
            return true;
        });
        
        // Re-index array
        $pageData['images'] = array_values($pageData['images']);
    }
    
    return $pageData;
}

function voicero_websites_get_proxy(WP_REST_Request $request) {
    // Get the access key from options (server-side only)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => esc_html__('No access key configured', 'voicero-ai')], 403);
    }
    
    // Extract websiteId from query parameters
    $website_id = $request->get_param('id');
    if (empty($website_id)) {
        return new WP_REST_Response(['error' => esc_html__('Website ID is required', 'voicero-ai')], 400);
    }
    
    // Construct the API endpoint
    $endpoint = VOICERO_API_URL . '/websites/get?id=' . urlencode($website_id);
    
    // Make the API request with the key (server-side)
    $response = wp_remote_get($endpoint, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'error' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
    }
    
    // Return the API response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    return new WP_REST_Response(json_decode($response_body, true), $status_code);
}

/**
 * Handle AJAX requests for website info from both frontend and admin
 */
add_action('wp_ajax_nopriv_voicero_get_info', 'voicero_get_info'); // For logged-out users (frontend)
add_action('wp_ajax_voicero_get_info', 'voicero_get_info'); // For logged-in users (admin and frontend)

/**
 * Handle AJAX requests for detailed website data
 */
add_action('wp_ajax_voicero_websites_get', 'voicero_websites_get_ajax');

/**
 * Handle AJAX requests for user information
 */
add_action('wp_ajax_voicero_get_user_info', 'voicero_get_user_info_ajax');

function voicero_websites_get_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Grab & verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check if we have an ID
    $website_id = isset($_REQUEST['id']) ? sanitize_text_field(wp_unslash($_REQUEST['id'])) : '';
    if (empty($website_id)) {
        wp_send_json_error(['message' => esc_html__('Website ID is required', 'voicero-ai')], 400);
        return;
    }

    // 4) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 5) Make the API request
    $endpoint = VOICERO_API_URL . '/websites/get?id=' . urlencode($website_id);
    $response = wp_remote_get($endpoint, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 120, // Increased to 2 minutes for large websites
        'sslverify' => false // Only for local development
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 6) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);

    if ($status_code !== 200 || !$data) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($status_code)
            ),
            'body' => wp_kses_post($response_body)
        ]);
        return;
    }

    // 7) Return the data
    wp_send_json_success($data);
}

function voicero_get_user_info_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }
    
    // 3) Check if we have a website ID
    $website_id = isset($_REQUEST['websiteId']) ? sanitize_text_field(wp_unslash($_REQUEST['websiteId'])) : '';
    if (empty($website_id)) {
        wp_send_json_error(['message' => esc_html__('Website ID is required', 'voicero-ai')], 400);
        return;
    }

    // 4) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 5) Make the API request to the users/me endpoint
    $endpoint = VOICERO_API_URL . '/user/me?websiteId=' . urlencode($website_id);
    
    $response = wp_remote_get($endpoint, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 6) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);

    // Log the response for debugging
    
    if ($status_code !== 200 || !$data) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($status_code)
            ),
            'body' => wp_kses_post($response_body)
        ]);
        return;
    }

    // Check if email field exists
    if (empty($data['email'])) {
        // Continue anyway - don't stop processing just because email is missing
    }

    // 7) Return the user data
    wp_send_json_success($data);
}

function voicero_get_info() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Grab & verify nonce _before_ trusting any inputs
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    
    // Determine which nonce to check based on the context
    $is_admin = is_admin();
    $nonce_action = $is_admin ? 'voicero_ajax_nonce' : 'voicero_frontend_nonce';
    
    if (!check_ajax_referer($nonce_action, 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check capability for admin-specific data if in admin context
    if ($is_admin && !current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Now that nonce & permissions are good, you can safely use action param
    $action = isset($_REQUEST['action']) ? sanitize_key(wp_unslash($_REQUEST['action'])) : '';
    
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured for this site.', 'voicero-ai')]);
        return;
    }

    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key) . '&nocache=' . time(), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false // Keep false for local dev
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ]);
        return;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($response_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($response_code)
            ),
            'body' => wp_kses_post($body) // Sanitize the body content
        ]);
        return;
    }

    $data = json_decode($body, true);
    // The /connect endpoint returns { website: {...} }
    if (!$data || !isset($data['website'])) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response structure from server.', 'voicero-ai')
        ]);
        return;
    }

    // Override the queryLimit to 200 for free plan users
    if (isset($data['website']['plan']) && $data['website']['plan'] === 'Free') {
        $data['website']['queryLimit'] = 200;
    }

    // Get WordPress content directly and add it to the response
    $wordpress_data = voicero_collect_wordpress_data();
    $data['website']['content'] = [
        'products' => $wordpress_data['products'],
        'posts' => $wordpress_data['posts'],
        'pages' => $wordpress_data['pages'],
        'blogPosts' => $wordpress_data['posts'] // Alias for posts
    ];

    // Return website data with WordPress content
    wp_send_json_success($data['website']);
}

/**
 * Handle login requests via AJAX
 */
add_action('wp_ajax_nopriv_my_login_action', 'my_login_handler');

function my_login_handler() {
    // Verify nonce
    if (!check_ajax_referer('voicero_frontend_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => 'Invalid security token']);
        return;
    }

    // Sanitize and unslash input
    $username = isset($_POST['username']) ? sanitize_user(wp_unslash($_POST['username'])) : '';
    $password = isset($_POST['password']) && is_string($_POST['password']) ? sanitize_text_field(wp_unslash($_POST['password'])) : '';

    // Validate required fields
    if (empty($username) || empty($password)) {
        wp_send_json_error(['message' => 'Username and password are required']);
        return;
    }

    // Attempt login
    $creds = array(
        'user_login'    => $username,
        'user_password' => $password,
        'remember'      => true,
    );

    $user = wp_signon($creds, is_ssl());

    if (is_wp_error($user)) {
        wp_send_json_error(['message' => 'Login failed: ' . $user->get_error_message()]);
    } else {
        wp_send_json_success(['message' => 'Login successful']);
    }

    wp_die();
}

/**
 * 2F) /wp-json/my-plugin/v1/all-content
 *     Returns all content types in one request
 */
add_action('rest_api_init', function() {
    register_rest_route('voicero-ai/v1', '/all-content', [
        'methods'  => ['GET', 'POST', 'OPTIONS'],
        'callback' => function($request) {
            $response = [
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

            // Get Authors
            $authors = get_users(['role__in' => ['author', 'editor', 'administrator']]);
            foreach ($authors as $author) {
                $response['authors'][] = [
                    'id' => $author->ID,
                    'name' => $author->display_name,
                    'email' => $author->user_email,
                    'url' => $author->user_url,
                    'bio' => get_user_meta($author->ID, 'description', true),
                    'avatar' => get_avatar_url($author->ID)
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
                $response['media'][] = [
                    'id' => $media->ID,
                    'title' => $media->post_title,
                    'url' => wp_get_attachment_url($media->ID),
                    'alt' => get_post_meta($media->ID, '_wp_attachment_image_alt', true),
                    'description' => $media->post_content,
                    'caption' => $media->post_excerpt,
                    'mime_type' => $media->post_mime_type,
                    'metadata' => $metadata
                ];
            }

            // Get Custom Fields (Post Meta)
            $post_types = ['post', 'page', 'product'];
            foreach ($post_types as $post_type) {
                $posts = get_posts([
                    'post_type' => $post_type,
                    'posts_per_page' => -1
                ]);
                foreach ($posts as $post) {
                    $custom_fields = get_post_custom($post->ID);
                    foreach ($custom_fields as $key => $values) {
                        // Skip internal WordPress meta
                        if (strpos($key, '_') === 0) continue;
                        
                        // phpcs:disable WordPress.DB.SlowDBQuery.slow_db_query_meta_key, WordPress.DB.SlowDBQuery.slow_db_query_meta_value
                        $response['customFields'][] = [
                            'post_id' => $post->ID,
                            'post_type' => $post_type,
                            'meta_key' => $key,
                            'meta_value' => $values[0]
                        ];
                        // phpcs:enable
                    }
                }
            }

            // Get Product Categories
            if (taxonomy_exists('product_cat')) {
                $product_categories = get_terms([
                    'taxonomy' => 'product_cat',
                    'hide_empty' => false
                ]);
                foreach ($product_categories as $category) {
                    $thumbnail_id = get_term_meta($category->term_id, 'thumbnail_id', true);
                    $response['productCategories'][] = [
                        'id' => $category->term_id,
                        'name' => $category->name,
                        'slug' => $category->slug,
                        'description' => $category->description,
                        'parent' => $category->parent,
                        'count' => $category->count,
                        'image' => $thumbnail_id ? wp_get_attachment_url($thumbnail_id) : null
                    ];
                }
            }

            // Get Product Tags
            if (taxonomy_exists('product_tag')) {
                $product_tags = get_terms([
                    'taxonomy' => 'product_tag',
                    'hide_empty' => false
                ]);
                foreach ($product_tags as $tag) {
                    $response['productTags'][] = [
                        'id' => $tag->term_id,
                        'name' => $tag->name,
                        'slug' => $tag->slug,
                        'description' => $tag->description,
                        'count' => $tag->count
                    ];
                }
            }

            // Get Posts
            $posts = get_posts([
                'post_type' => 'post',
                'post_status' => 'publish',
                'numberposts' => -1
            ]);

            foreach ($posts as $post) {
                // Get comments for this post
                $comments = get_comments([
                    'post_id' => $post->ID,
                    'status' => 'approve'
                ]);

                $formatted_comments = [];
                foreach ($comments as $comment) {
                    $formatted_comments[] = [
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

                // Add comments to the main comments array
                $response['comments'] = array_merge($response['comments'], $formatted_comments);

                $response['posts'][] = [
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
                    $response['pages'][] = [
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
                $response['categories'][] = [
                    'id' => $category->term_id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'description' => wp_strip_all_tags($category->description)
                ];
            }

            // Get Tags
            $tags = get_tags(['hide_empty' => false]);
            foreach ($tags as $tag) {
                $response['tags'][] = [
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

                    $formatted_reviews = [];
                    foreach ($reviews as $review) {
                        $rating = get_comment_meta($review->comment_ID, 'rating', true);
                        $verified = get_comment_meta($review->comment_ID, 'verified', true);

                        $formatted_reviews[] = [
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

                    // Add reviews to the main reviews array
                    $response['reviews'] = array_merge($response['reviews'], $formatted_reviews);

                    $response['products'][] = [
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

            return new WP_REST_Response($response, 200);
        },
        'permission_callback' => '__return_true'
    ]);
});

/**
 * Check if the chat is available 
 */
add_action('wp_ajax_voicero_check_availability', 'voicero_check_availability');
add_action('wp_ajax_nopriv_voicero_check_availability', 'voicero_check_availability');

function voicero_check_availability() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_frontend_nonce')) {
        wp_send_json_error(['message' => esc_html__('Security check failed', 'voicero-ai')]);
    }

    // Get access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai'), 'available' => false]);
    }

    // Make API request to check if website is active
    $response = wp_remote_get(VOICERO_API_URL . '/websites/status', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);

    if (is_wp_error($response)) {
        // For frontend, still return success with available=false
        wp_send_json_success([
            'available' => false,
            'message' => esc_html__('Error checking availability', 'voicero-ai')
        ]);
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if ($response_code !== 200 || !$data) {
        // For frontend, still return success with available=false
        wp_send_json_success([
            'available' => false,
            'message' => esc_html__('Website not activated', 'voicero-ai')
        ]);
    }

    // Check if the website is active and synced
    $is_active = isset($data['active']) ? (bool)$data['active'] : false;
    $is_synced = isset($data['lastSyncedAt']) && !empty($data['lastSyncedAt']);

    // Only available if both active and synced
    $is_available = $is_active && $is_synced;

    // Get conversation ID from cookie if it exists
    $conversation_id = isset($_COOKIE['voicero_conversation_id']) ? sanitize_text_field(wp_unslash($_COOKIE['voicero_conversation_id'])) : null;

    wp_send_json_success([
        'available' => $is_available,
        'active' => $is_active,
        'synced' => $is_synced,
        'conversation_id' => $conversation_id,
        'messages' => [] // No saved messages for now
    ]);
}

/**
 * Handle chat messages
 */
add_action('wp_ajax_voicero_chat_message', 'voicero_chat_message');
add_action('wp_ajax_nopriv_voicero_chat_message', 'voicero_chat_message');

function voicero_chat_message() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_frontend_nonce')) {
        wp_send_json_error(['message' => esc_html__('Security check failed', 'voicero-ai')]);
    }

    // Get the message from POST data
    if (!isset($_POST['message']) || empty($_POST['message'])) {
        wp_send_json_error(['message' => esc_html__('No message provided', 'voicero-ai')]);
    }

    $message = sanitize_textarea_field(wp_unslash($_POST['message']));
    $conversation_id = isset($_POST['conversation_id']) ? sanitize_text_field(wp_unslash($_POST['conversation_id'])) : null;

    // Get access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')]);
    }

    // Prepare API request
    $api_url = VOICERO_API_URL . '/chat';
    
    // Get current page URL and title to provide context
    $current_url = isset($_SERVER['HTTP_REFERER']) ? esc_url_raw(wp_unslash($_SERVER['HTTP_REFERER'])) : '';
    $current_title = '';
    
    // Get page metadata if possible
    if (!empty($current_url)) {
        $current_post_id = url_to_postid($current_url);
        if ($current_post_id) {
            $current_title = get_the_title($current_post_id);
        }
    }
    
    // Prepare the request body
    $request_body = [
        'message' => $message,
        'context' => [
            'url' => $current_url,
            'title' => $current_title,
            'userAgent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT'])) : '',
        ]
    ];
    
    // Add conversation ID if it exists
    if ($conversation_id) {
        $request_body['conversationId'] = $conversation_id;
    }

    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($request_body),
        'timeout' => 30, // Longer timeout for AI response
        'sslverify' => false
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => esc_html__('Error communicating with AI service', 'voicero-ai'),
            'error' => $response->get_error_message()
        ]);
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if ($response_code !== 200 || !$data) {
        wp_send_json_error([
            'message' => esc_html__('Failed to get response from AI service', 'voicero-ai'),
            'error' => $response_code,
            'body' => wp_kses_post($body)
        ]);
    }

    // Extract the response message and conversation ID
    $ai_message = isset($data['message']) ? $data['message'] : esc_html__('Sorry, I couldn\'t process your request.', 'voicero-ai');
    $new_conversation_id = isset($data['conversationId']) ? $data['conversationId'] : null;

    // Set cookie with conversation ID if it exists
    if ($new_conversation_id) {
        setcookie('voicero_conversation_id', $new_conversation_id, time() + (86400 * 30), '/'); // 30 days
    }

    wp_send_json_success([
        'message' => $ai_message,
        'conversation_id' => $new_conversation_id
    ]);
}

/**
 * Handle voice transcription requests
 */
add_action('wp_ajax_voicero_transcribe_audio', 'voicero_transcribe_audio');
add_action('wp_ajax_nopriv_voicero_transcribe_audio', 'voicero_transcribe_audio');

function voicero_transcribe_audio() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['nonce'])), 'voicero_frontend_nonce')) {
        wp_send_json_error(['message' => esc_html__('Security check failed', 'voicero-ai')]);
    }

    // Check if we have audio data
    if (!isset($_FILES['audio'])) {
        wp_send_json_error(['message' => esc_html__('No audio data provided', 'voicero-ai')]);
    }
    
    // Sanitize and validate the uploaded file path
    // First, get and sanitize the raw file path
    $raw_tmp_name = '';
    if (isset($_FILES['audio']['tmp_name'])) {
        $raw_tmp_name = sanitize_text_field($_FILES['audio']['tmp_name']);
    }
    
    // Then validate it's a valid uploaded file
    if (empty($raw_tmp_name) || !is_uploaded_file($raw_tmp_name)) {
        wp_send_json_error(['message' => esc_html__('No valid audio file uploaded', 'voicero-ai')]);
    }
    
    // Finally normalize the path
    $tmp_name = wp_normalize_path($raw_tmp_name);
    if (empty($tmp_name)) {
        wp_send_json_error(['message' => esc_html__('No audio file uploaded', 'voicero-ai')]);
    }

    // Get access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')]);
    }

    // Prepare API request
    $api_url = VOICERO_API_URL . '/transcribe';
    
    // Use the already validated and sanitized path from above
    $file_path = $tmp_name;
    
    // File has already been validated with is_uploaded_file() above
    
    $audio_data = file_get_contents($file_path);
    if (!$audio_data) {
        wp_send_json_error(['message' => esc_html__('Failed to read audio data', 'voicero-ai')]);
    }
    
    // Create a boundary for the multipart form data
    $boundary = wp_generate_password(24, false);
    
    // Prepare the multipart data
    $multipart_data = "--$boundary\r\n";
    $multipart_data .= "Content-Disposition: form-data; name=\"file\"; filename=\"audio.webm\"\r\n";
    $multipart_data .= "Content-Type: audio/webm\r\n\r\n";
    $multipart_data .= $audio_data . "\r\n";
    $multipart_data .= "--$boundary--\r\n";
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
            'Accept' => 'application/json'
        ],
        'body' => $multipart_data,
        'timeout' => 30, // Longer timeout for audio processing
        'sslverify' => false
    ]);

    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => esc_html__('Error communicating with transcription service', 'voicero-ai'),
            'error' => $response->get_error_message()
        ]);
    }

    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if ($response_code !== 200 || !$data) {
        wp_send_json_error([
            'message' => esc_html__('Failed to transcribe audio', 'voicero-ai'),
            'error' => $response_code,
            'body' => wp_kses_post($body)
        ]);
    }

    // Extract the transcription
    $transcription = isset($data['text']) ? $data['text'] : '';

    wp_send_json_success([
        'transcription' => $transcription
    ]);
}

/**
 * Handle AJAX requests for AI history
 */
add_action('wp_ajax_voicero_get_ai_history', 'voicero_get_ai_history_ajax');

function voicero_get_ai_history_ajax() {
    // Log that this function is being called
    error_log('=== VOICERO AI HISTORY AJAX CALLED ===');
    error_log('Request method: ' . $_SERVER['REQUEST_METHOD']);
    error_log('DOING_AJAX defined: ' . (defined('DOING_AJAX') ? 'YES' : 'NO'));
    error_log('DOING_AJAX value: ' . (defined('DOING_AJAX') ? (DOING_AJAX ? 'TRUE' : 'FALSE') : 'NOT_DEFINED'));
    error_log('POST data: ' . print_r($_POST, true));
    error_log('=== END VOICERO AI HISTORY AJAX CALLED ===');
    
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        error_log('AI History AJAX: Not AJAX request, exiting');
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get the website ID (allow override via request)
    $website_id = isset($_REQUEST['websiteId'])
        ? sanitize_text_field(wp_unslash($_REQUEST['websiteId']))
        : get_option('voicero_website_id', '');
    
    if (empty($website_id)) {
        wp_send_json_error(['message' => esc_html__('Website ID not configured', 'voicero-ai')], 400);
        return;
    }

    // Validate website ID format (should be a UUID in most cases)
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $website_id)) {
        // Don't fail here, the API will validate
    }

    // 5) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 6) Prepare the request data - ensure exact parameter names match the API
    $request_data = [
        'websiteId' => $website_id,
        'type' => 'WordPress'
    ];

    // 7) Make the API request
    // Allow the API base URL to be configured via constant
    $api_base = defined('VOICERO_API_URL') ? VOICERO_API_URL : 'https://56b2c4656c5a.ngrok-free.app/api';
    $endpoint  = trailingslashit($api_base) . 'aiHistory';

    // Log the request data for debugging
    error_log('=== AI HISTORY REQUEST DATA ===');
    error_log('Website ID: ' . $website_id);
    error_log('Request Data: ' . json_encode($request_data));
    error_log('API Endpoint: ' . $endpoint);
    error_log('Access Key (first 10 chars): ' . substr($access_key, 0, 10) . '...');
    error_log('=== END AI HISTORY REQUEST DATA ===');
    
    try {
        $response = wp_remote_post($endpoint, [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode($request_data),
            'timeout' => 30, // Longer timeout for potential analysis generation
            'sslverify' => false // Only for local development
        ]);
    } catch (Exception $e) {
        wp_send_json_error([
            'message' => 'Exception during API request: ' . $e->getMessage(),
            'endpoint' => $endpoint
        ], 500);
        return;
    }

    // 8) Handle errors
    if (is_wp_error($response)) {
        $error_message = $response->get_error_message();
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($error_message)
            ),
            'endpoint' => $endpoint
        ], 500);
        return;
    }

    // 9) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    // Log the response for debugging
    error_log('=== AI HISTORY API RESPONSE ===');
    error_log('Status Code: ' . $status_code);
    error_log('Response Body: ' . $response_body);
    error_log('Response Length: ' . strlen($response_body));
    error_log('=== END AI HISTORY API RESPONSE ===');
    
    $data = json_decode($response_body, true);
    
    // Log the decoded data
    error_log('=== AI HISTORY DECODED DATA ===');
    error_log('Decoded Data: ' . json_encode($data, JSON_PRETTY_PRINT));
    error_log('Data Type: ' . gettype($data));
    if (is_array($data)) {
        error_log('Data Keys: ' . implode(', ', array_keys($data)));
    }
    error_log('=== END AI HISTORY DECODED DATA ===');

    // Handle specific error codes
    if ($status_code === 400) {
        wp_send_json_error([
            'message' => 'API reported bad request format. Check website ID and access key.',
            'status' => $status_code,
            'details' => $data, 
            'request' => $request_data,
            'endpoint' => $endpoint
        ], 400);
        return;
    } else if ($status_code === 401) {
        wp_send_json_error([
            'message' => 'API authorization failed. Check your access key.',
            'status' => $status_code,
            'endpoint' => $endpoint
        ], 401);
        return;
    } else if ($status_code === 404) {
        wp_send_json_error([
            'message' => 'API endpoint not found. Check the API configuration.',
            'status' => $status_code,
            'endpoint' => $endpoint
        ], 404);
        return;
    } else if ($status_code === 405) {
        wp_send_json_error([
            'message' => 'API does not allow this request method. Contact the developer.',
            'status' => $status_code,
            'endpoint' => $endpoint
        ], 405);
        return;
    } else if ($status_code !== 200) {
        $error_message = isset($data['error']) ? $data['error'] : esc_html__('Unknown error occurred', 'voicero-ai');
        wp_send_json_error([
            'message' => $error_message,
            'status' => $status_code,
            'details' => $data, 
            'request' => $request_data,
            'endpoint' => $endpoint
        ], 500);
        return;
    }

    // If no data was returned, return a graceful error
    if (!is_array($data)) {
        wp_send_json_error([
            'message' => 'API returned invalid data format',
            'status' => $status_code,
            'endpoint' => $endpoint
        ], 500);
        return;
    }

    // 10) Return the data
    wp_send_json_success($data);
}


function voicero_delete_message_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check required params
    $message_id = isset($_REQUEST['message_id']) ? sanitize_text_field(wp_unslash($_REQUEST['message_id'])) : '';
    $website_id = isset($_REQUEST['websiteId']) ? sanitize_text_field(wp_unslash($_REQUEST['websiteId'])) : '';
    
    if (empty($message_id)) {
        wp_send_json_error(['message' => esc_html__('Message ID is required', 'voicero-ai')], 400);
        return;
    }
    
    if (empty($website_id)) {
        wp_send_json_error(['message' => esc_html__('Website ID is required', 'voicero-ai')], 400);
        return;
    }

    // 4) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 5) Make the API request to delete message - only send the 'id' parameter as required by the API
    $api_url = VOICERO_API_URL . '/wordpress/deleteContact';
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode([
            'id' => $message_id // The only required parameter
        ]),
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    // 6) Handle errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 7) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);

    if ($status_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($status_code)
            ),
            'body' => wp_kses_post($response_body)
        ], $status_code);
        return;
    }

    // 8) Return success with updated stats
    wp_send_json_success([
        'success' => true,
        'stats' => isset($data['stats']) ? $data['stats'] : [
            'total' => 0,
            'unread' => 0,
            'read' => 0,
            'high_priority' => 0,
            'response_rate' => 0
        ],
        'message' => esc_html__('Message deleted successfully', 'voicero-ai')
    ]);
}

/**
 * Handle AJAX requests for website auto features update
 */
add_action('wp_ajax_voicero_update_website_autos', 'voicero_update_website_autos_ajax');

function voicero_update_website_autos_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get the features data from request
    $features = [];
    if (isset($_REQUEST['features']) && is_array($_REQUEST['features'])) {
        // Sanitize the features array recursively
        $features = map_deep(wp_unslash($_REQUEST['features']), 'sanitize_text_field');
    } else {
        wp_send_json_error(['message' => esc_html__('No feature data provided', 'voicero-ai')], 400);
        return;
    }
    
    // 5) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 6) Get the website ID by making a request to the connect endpoint
    
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);
    
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($response_code)
            ),
            'body' => wp_kses_post($body)
        ]);
        return;
    }
    
    $data = json_decode($body, true);
    if (!$data || !isset($data['website']) || !isset($data['website']['id'])) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response structure from server.', 'voicero-ai')
        ]);
        return;
    }
    
    $website_id = $data['website']['id'];

    // 7) Prepare request payload - ensure all values are explicit booleans
    // This must exactly match the expected format in the Next.js API
    $payload = [
        'websiteId' => $website_id,
    ];
    
    // Add all features with explicit boolean conversion
    if (isset($features['allowAutoRedirect'])) {
        $payload['allowAutoRedirect'] = $features['allowAutoRedirect'] === true || $features['allowAutoRedirect'] === 'true' || $features['allowAutoRedirect'] === '1' || $features['allowAutoRedirect'] === 1;
    }
    
    if (isset($features['allowAutoScroll'])) {
        $payload['allowAutoScroll'] = $features['allowAutoScroll'] === true || $features['allowAutoScroll'] === 'true' || $features['allowAutoScroll'] === '1' || $features['allowAutoScroll'] === 1;
    }
    
    if (isset($features['allowAutoHighlight'])) {
        $payload['allowAutoHighlight'] = $features['allowAutoHighlight'] === true || $features['allowAutoHighlight'] === 'true' || $features['allowAutoHighlight'] === '1' || $features['allowAutoHighlight'] === 1;
    }
    
    if (isset($features['allowAutoClick'])) {
        $payload['allowAutoClick'] = $features['allowAutoClick'] === true || $features['allowAutoClick'] === 'true' || $features['allowAutoClick'] === '1' || $features['allowAutoClick'] === 1;
    }
    
    if (isset($features['allowAutoFillForm'])) {
        $payload['allowAutoFillForm'] = $features['allowAutoFillForm'] === true || $features['allowAutoFillForm'] === 'true' || $features['allowAutoFillForm'] === '1' || $features['allowAutoFillForm'] === 1;
    }
    
    if (isset($features['allowAutoCancel'])) {
        $payload['allowAutoCancel'] = $features['allowAutoCancel'] === true || $features['allowAutoCancel'] === 'true' || $features['allowAutoCancel'] === '1' || $features['allowAutoCancel'] === 1;
    }
    
    if (isset($features['allowAutoTrackOrder'])) {
        $payload['allowAutoTrackOrder'] = $features['allowAutoTrackOrder'] === true || $features['allowAutoTrackOrder'] === 'true' || $features['allowAutoTrackOrder'] === '1' || $features['allowAutoTrackOrder'] === 1;
    }
    
    if (isset($features['allowAutoGetUserOrders'])) {
        $payload['allowAutoGetUserOrders'] = $features['allowAutoGetUserOrders'] === true || $features['allowAutoGetUserOrders'] === 'true' || $features['allowAutoGetUserOrders'] === '1' || $features['allowAutoGetUserOrders'] === 1;
    }
    
    if (isset($features['allowAutoUpdateUserInfo'])) {
        $payload['allowAutoUpdateUserInfo'] = $features['allowAutoUpdateUserInfo'] === true || $features['allowAutoUpdateUserInfo'] === 'true' || $features['allowAutoUpdateUserInfo'] === '1' || $features['allowAutoUpdateUserInfo'] === 1;
    }
    
    if (isset($features['allowAutoLogout'])) {
        $payload['allowAutoLogout'] = $features['allowAutoLogout'] === true || $features['allowAutoLogout'] === 'true' || $features['allowAutoLogout'] === '1' || $features['allowAutoLogout'] === 1;
    }
    
    if (isset($features['allowAutoLogin'])) {
        $payload['allowAutoLogin'] = $features['allowAutoLogin'] === true || $features['allowAutoLogin'] === 'true' || $features['allowAutoLogin'] === '1' || $features['allowAutoLogin'] === 1;
    }
    
    // Add support for allowAutoReturn and allowAutoExchange if they exist
    if (isset($features['allowAutoReturn'])) {
        $payload['allowAutoReturn'] = $features['allowAutoReturn'] === true || $features['allowAutoReturn'] === 'true' || $features['allowAutoReturn'] === '1' || $features['allowAutoReturn'] === 1;
    }
    
    if (isset($features['allowAutoExchange'])) {
        $payload['allowAutoExchange'] = $features['allowAutoExchange'] === true || $features['allowAutoExchange'] === 'true' || $features['allowAutoExchange'] === '1' || $features['allowAutoExchange'] === 1;
    }
    
    if (isset($features['allowAutoGenerateImage'])) {
        $payload['allowAutoGenerateImage'] = $features['allowAutoGenerateImage'] === true || $features['allowAutoGenerateImage'] === 'true' || $features['allowAutoGenerateImage'] === '1' || $features['allowAutoGenerateImage'] === 1;
    }
    
    
    // 8) Make the API request to updateWebsiteAutos endpoint
    $api_url = VOICERO_API_URL . '/wordpress/updateWebsiteAutos';
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload),
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    // 9) Handle API errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 10) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    
    if ($status_code !== 200 || !$data || !isset($data['success']) || !$data['success']) {
        $error_message = isset($data['error']) ? $data['error'] : esc_html__('Unknown error occurred', 'voicero-ai');
        wp_send_json_error([
            'message' => $error_message,
            'status' => $status_code,
            'details' => $data
        ], $status_code >= 400 ? $status_code : 500);
        return;
    }

    // 11) Store the updated settings in WordPress options for later use
    if (isset($data['settings']) && is_array($data['settings'])) {
        update_option('voicero_ai_features', $data['settings'], false);
    }

    // 12) Return success
    wp_send_json_success([
        'message' => isset($data['message']) ? $data['message'] : esc_html__('AI features updated successfully', 'voicero-ai'),
        'settings' => isset($data['settings']) ? $data['settings'] : []
    ]);
}

/**
 * REST API proxy for website auto features update
 * 
 * @param WP_REST_Request $request The request object
 * @return WP_REST_Response The response
 */
function voicero_website_auto_features_proxy(WP_REST_Request $request) {
    // Get the request body
    $params = $request->get_json_params();
    
    // Validate required data
    if (empty($params) || !is_array($params)) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'No feature data provided'
        ], 400);
    }
    
    // Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'No access key configured'
        ], 403);
    }
    
    // Get the website ID by making a request to the connect endpoint
    
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);
    
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Connection failed: ' . $response->get_error_message()
        ], 500);
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Server returned error: ' . $response_code
        ], $response_code);
    }
    
    $data = json_decode($body, true);
    if (!$data || !isset($data['website']) || !isset($data['website']['id'])) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Invalid response structure from server'
        ], 500);
    }
    
    $website_id = $data['website']['id'];
    
    // Prepare request payload - ensure all values are explicit booleans
    // This must exactly match the expected format in the Next.js API
    $payload = [
        'websiteId' => $website_id,
    ];
    
    // Add all features with explicit boolean conversion
    if (isset($params['allowAutoRedirect'])) {
        $payload['allowAutoRedirect'] = $params['allowAutoRedirect'] === true || $params['allowAutoRedirect'] === 'true' || $params['allowAutoRedirect'] === '1' || $params['allowAutoRedirect'] === 1;
    }
    
    if (isset($params['allowAutoScroll'])) {
        $payload['allowAutoScroll'] = $params['allowAutoScroll'] === true || $params['allowAutoScroll'] === 'true' || $params['allowAutoScroll'] === '1' || $params['allowAutoScroll'] === 1;
    }
    
    if (isset($params['allowAutoHighlight'])) {
        $payload['allowAutoHighlight'] = $params['allowAutoHighlight'] === true || $params['allowAutoHighlight'] === 'true' || $params['allowAutoHighlight'] === '1' || $params['allowAutoHighlight'] === 1;
    }
    
    if (isset($params['allowAutoClick'])) {
        $payload['allowAutoClick'] = $params['allowAutoClick'] === true || $params['allowAutoClick'] === 'true' || $params['allowAutoClick'] === '1' || $params['allowAutoClick'] === 1;
    }
    
    if (isset($params['allowAutoFillForm'])) {
        $payload['allowAutoFillForm'] = $params['allowAutoFillForm'] === true || $params['allowAutoFillForm'] === 'true' || $params['allowAutoFillForm'] === '1' || $params['allowAutoFillForm'] === 1;
    }
    
    if (isset($params['allowAutoCancel'])) {
        $payload['allowAutoCancel'] = $params['allowAutoCancel'] === true || $params['allowAutoCancel'] === 'true' || $params['allowAutoCancel'] === '1' || $params['allowAutoCancel'] === 1;
    }
    
    if (isset($params['allowAutoTrackOrder'])) {
        $payload['allowAutoTrackOrder'] = $params['allowAutoTrackOrder'] === true || $params['allowAutoTrackOrder'] === 'true' || $params['allowAutoTrackOrder'] === '1' || $params['allowAutoTrackOrder'] === 1;
    }
    
    if (isset($params['allowAutoGetUserOrders'])) {
        $payload['allowAutoGetUserOrders'] = $params['allowAutoGetUserOrders'] === true || $params['allowAutoGetUserOrders'] === 'true' || $params['allowAutoGetUserOrders'] === '1' || $params['allowAutoGetUserOrders'] === 1;
    }
    
    if (isset($params['allowAutoUpdateUserInfo'])) {
        $payload['allowAutoUpdateUserInfo'] = $params['allowAutoUpdateUserInfo'] === true || $params['allowAutoUpdateUserInfo'] === 'true' || $params['allowAutoUpdateUserInfo'] === '1' || $params['allowAutoUpdateUserInfo'] === 1;
    }
    
    if (isset($params['allowAutoLogout'])) {
        $payload['allowAutoLogout'] = $params['allowAutoLogout'] === true || $params['allowAutoLogout'] === 'true' || $params['allowAutoLogout'] === '1' || $params['allowAutoLogout'] === 1;
    }
    
    if (isset($params['allowAutoLogin'])) {
        $payload['allowAutoLogin'] = $params['allowAutoLogin'] === true || $params['allowAutoLogin'] === 'true' || $params['allowAutoLogin'] === '1' || $params['allowAutoLogin'] === 1;
    }
    
    // Add support for allowAutoReturn and allowAutoExchange if they exist
    if (isset($params['allowAutoReturn'])) {
        $payload['allowAutoReturn'] = $params['allowAutoReturn'] === true || $params['allowAutoReturn'] === 'true' || $params['allowAutoReturn'] === '1' || $params['allowAutoReturn'] === 1;
    }
    
    if (isset($params['allowAutoExchange'])) {
        $payload['allowAutoExchange'] = $params['allowAutoExchange'] === true || $params['allowAutoExchange'] === 'true' || $params['allowAutoExchange'] === '1' || $params['allowAutoExchange'] === 1;
    }
    
    if (isset($params['allowAutoGenerateImage'])) {
        $payload['allowAutoGenerateImage'] = $params['allowAutoGenerateImage'] === true || $params['allowAutoGenerateImage'] === 'true' || $params['allowAutoGenerateImage'] === '1' || $params['allowAutoGenerateImage'] === 1;
    }
    
    
    // Make the API request to updateWebsiteAutos endpoint
    $api_url = VOICERO_API_URL . '/wordpress/updateWebsiteAutos';
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload),
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);
    
    // Handle API errors
    if (is_wp_error($response)) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Connection failed: ' . $response->get_error_message()
        ], 500);
    }
    
    // Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    
    // Store the updated settings in WordPress options for later use
    if (isset($data['settings']) && is_array($data['settings'])) {
        update_option('voicero_ai_features', $data['settings'], false);
    }
    
    // Return the API response
    return new WP_REST_Response($data, $status_code);
}

/**
 * Handle AJAX requests for toggling AI features
 */
add_action('wp_ajax_voicero_toggle_ai_features', 'voicero_toggle_ai_features_ajax');

function voicero_toggle_ai_features_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get the features data from request
    $features = [];
    if (isset($_REQUEST['features']) && is_array($_REQUEST['features'])) {
        // Sanitize the features array recursively
        $features = map_deep(wp_unslash($_REQUEST['features']), 'sanitize_text_field');
    } else {
        wp_send_json_error(['message' => esc_html__('No feature data provided', 'voicero-ai')], 400);
        return;
    }

    // 5) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 6) Get the website ID by making a request to the connect endpoint
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);
    
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($response_code)
            ),
            'body' => wp_kses_post($body)
        ]);
        return;
    }
    
    $data = json_decode($body, true);
    if (!$data || !isset($data['website']) || !isset($data['website']['id'])) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response structure from server.', 'voicero-ai')
        ]);
        return;
    }
    
    $website_id = $data['website']['id'];

    // 7) Process each feature toggle - API expects one feature at a time
    $api_url = VOICERO_API_URL . '/websites/toggle-feature';
    $results = [];
    $errors = [];
    
    // Handle voiceAI toggle
    if (isset($features['voiceAI'])) {
        $enabled = $features['voiceAI'] === true || $features['voiceAI'] === 'true' || $features['voiceAI'] === '1' || $features['voiceAI'] === 1;
        $payload = [
            'feature' => 'voice',
            'enabled' => $enabled
        ];
        
        $response = wp_remote_post($api_url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode($payload),
            'timeout' => 15,
            'sslverify' => false
        ]);
        
        if (is_wp_error($response)) {
            $errors[] = 'Voice AI: ' . $response->get_error_message();
        } else {
            $status_code = wp_remote_retrieve_response_code($response);
            $response_body = wp_remote_retrieve_body($response);
            $data = json_decode($response_body, true);
            
            if ($status_code !== 200 || !$data || !isset($data['success']) || !$data['success']) {
                $error_message = isset($data['error']) ? $data['error'] : 'Unknown error occurred';
                $errors[] = 'Voice AI: ' . $error_message;
            } else {
                $results['voice'] = $data;
            }
        }
    }
    
    // Handle textAI toggle
    if (isset($features['textAI'])) {
        $enabled = $features['textAI'] === true || $features['textAI'] === 'true' || $features['textAI'] === '1' || $features['textAI'] === 1;
        $payload = [
            'feature' => 'text',
            'enabled' => $enabled
        ];
        
        $response = wp_remote_post($api_url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'body' => json_encode($payload),
            'timeout' => 15,
            'sslverify' => false
        ]);
        
        if (is_wp_error($response)) {
            $errors[] = 'Text AI: ' . $response->get_error_message();
        } else {
            $status_code = wp_remote_retrieve_response_code($response);
            $response_body = wp_remote_retrieve_body($response);
            $data = json_decode($response_body, true);
            
            if ($status_code !== 200 || !$data || !isset($data['success']) || !$data['success']) {
                $error_message = isset($data['error']) ? $data['error'] : 'Unknown error occurred';
                $errors[] = 'Text AI: ' . $error_message;
            } else {
                $results['text'] = $data;
            }
        }
    }
    
    // 8) Process results
    if (!empty($errors)) {
        wp_send_json_error([
            'message' => 'Some features failed to update: ' . implode(', ', $errors),
            'details' => $errors,
            'partial_success' => !empty($results)
        ], 500);
        return;
    }
    
    if (empty($results)) {
        wp_send_json_error([
            'message' => esc_html__('No valid features provided', 'voicero-ai')
        ], 400);
        return;
    }
    
    // 9) Extract the final state from the last successful response
    $final_state = null;
    foreach ($results as $result) {
        if (isset($result['state'])) {
            $final_state = $result['state'];
        }
    }
    
    // 10) Store the updated settings in WordPress options for later use
    if ($final_state) {
        update_option('voicero_ai_toggle_features', $final_state, false);
    }

    // 11) Return success
    wp_send_json_success([
        'message' => esc_html__('AI features updated successfully', 'voicero-ai'),
        'state' => $final_state,
        'results' => $results
    ]);
}

/**
 * Handle AJAX requests for AI features (original handler, now uses the proxy)
 */
add_action('wp_ajax_voicero_save_ai_features', 'voicero_save_ai_features_ajax');

function voicero_save_ai_features_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get the features data from request
    $features = [];
    if (isset($_REQUEST['features']) && is_array($_REQUEST['features'])) {
        $features = map_deep(wp_unslash($_REQUEST['features']), 'sanitize_text_field');
    }
    
    // Check if we have valid data
    if (empty($features)) {
        wp_send_json_error(['message' => esc_html__('No feature data provided', 'voicero-ai')], 400);
        return;
    }

    // 5) Log the request for debugging

    // 6) Map to the API feature names - ensure they are explicit booleans
    $api_features = [];
    
    // Use strict comparisons for explicit boolean values
    if (isset($features['ai_redirect'])) {
        $api_features['allowAutoRedirect'] = ($features['ai_redirect'] === true || $features['ai_redirect'] === 'true' || $features['ai_redirect'] === '1' || $features['ai_redirect'] === 1);
    }
    
    if (isset($features['ai_scroll'])) {
        $api_features['allowAutoScroll'] = ($features['ai_scroll'] === true || $features['ai_scroll'] === 'true' || $features['ai_scroll'] === '1' || $features['ai_scroll'] === 1);
    }
    
    if (isset($features['ai_highlight'])) {
        $api_features['allowAutoHighlight'] = ($features['ai_highlight'] === true || $features['ai_highlight'] === 'true' || $features['ai_highlight'] === '1' || $features['ai_highlight'] === 1);
    }
    
    if (isset($features['ai_click'])) {
        $api_features['allowAutoClick'] = ($features['ai_click'] === true || $features['ai_click'] === 'true' || $features['ai_click'] === '1' || $features['ai_click'] === 1);
    }
    
    if (isset($features['ai_forms'])) {
        $api_features['allowAutoFillForm'] = ($features['ai_forms'] === true || $features['ai_forms'] === 'true' || $features['ai_forms'] === '1' || $features['ai_forms'] === 1);
    }
    
    if (isset($features['ai_cancel_orders'])) {
        $api_features['allowAutoCancel'] = ($features['ai_cancel_orders'] === true || $features['ai_cancel_orders'] === 'true' || $features['ai_cancel_orders'] === '1' || $features['ai_cancel_orders'] === 1);
    }
    
    if (isset($features['ai_track_orders'])) {
        $api_features['allowAutoTrackOrder'] = ($features['ai_track_orders'] === true || $features['ai_track_orders'] === 'true' || $features['ai_track_orders'] === '1' || $features['ai_track_orders'] === 1);
    }
    
    if (isset($features['ai_order_history'])) {
        $api_features['allowAutoGetUserOrders'] = ($features['ai_order_history'] === true || $features['ai_order_history'] === 'true' || $features['ai_order_history'] === '1' || $features['ai_order_history'] === 1);
    }
    
    if (isset($features['ai_update_account'])) {
        $api_features['allowAutoUpdateUserInfo'] = ($features['ai_update_account'] === true || $features['ai_update_account'] === 'true' || $features['ai_update_account'] === '1' || $features['ai_update_account'] === 1);
    }
    
    if (isset($features['ai_logout'])) {
        $api_features['allowAutoLogout'] = ($features['ai_logout'] === true || $features['ai_logout'] === 'true' || $features['ai_logout'] === '1' || $features['ai_logout'] === 1);
    }
    
    if (isset($features['ai_login'])) {
        $api_features['allowAutoLogin'] = ($features['ai_login'] === true || $features['ai_login'] === 'true' || $features['ai_login'] === '1' || $features['ai_login'] === 1);
    }
    

    // 7) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 8) Get the website ID by making a request to the connect endpoint
    
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);
    
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($response_code)
            ),
            'body' => wp_kses_post($body)
        ]);
        return;
    }
    
    $data = json_decode($body, true);
    if (!$data || !isset($data['website']) || !isset($data['website']['id'])) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response structure from server.', 'voicero-ai')
        ]);
        return;
    }
    
    $website_id = $data['website']['id'];

    // 9) Call the API directly since we have all the data we need
    $api_url = VOICERO_API_URL . '/wordpress/updateWebsiteAutos';
    
    // Prepare payload - start with websiteId to ensure proper structure
    $payload = [
        'websiteId' => $website_id
    ];
    
    // Add each feature value from our mapped array
    foreach ($api_features as $key => $value) {
        // Ensure every value is a true boolean
        $payload[$key] = (bool)$value;
    }
    
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload),
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    // 10) Handle API errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 11) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    
    if ($status_code !== 200 || !$data || !isset($data['success']) || !$data['success']) {
        $error_message = isset($data['error']) ? $data['error'] : esc_html__('Unknown error occurred', 'voicero-ai');
        wp_send_json_error([
            'message' => $error_message,
            'status' => $status_code,
            'details' => $data
        ], $status_code >= 400 ? $status_code : 500);
        return;
    }

    // 12) Store the updated settings in WordPress options for later use
    if (isset($data['settings']) && is_array($data['settings'])) {
        update_option('voicero_ai_features', $data['settings'], false);
    }

    // 13) Return success response to browser
    wp_send_json_success([
        'message' => isset($data['message']) ? $data['message'] : esc_html__('AI features updated successfully', 'voicero-ai'),
        'settings' => isset($data['settings']) ? $data['settings'] : []
    ]);
}

/**
 * Handle AJAX requests for website information update
 */
add_action('wp_ajax_voicero_update_website', 'voicero_update_website_ajax');

function voicero_update_website_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get the website data
    $website_data = [];
    if (isset($_REQUEST['website_data'])) {
        // Sanitize the entire $_REQUEST['website_data'] to make sure it's an array
        $website_data_raw = null;
        
        // First, safely get and sanitize the input - using map_deep for arrays or sanitize_text_field for strings
        if (is_array($_REQUEST['website_data'])) {
            $input = map_deep(wp_unslash($_REQUEST['website_data']), 'sanitize_text_field');
        } else {
            $input = sanitize_text_field(wp_unslash($_REQUEST['website_data']));
        }
        
        if (is_string($input)) {
            // If it's a string (e.g. JSON), sanitize it first
            $sanitized_string = sanitize_text_field($input);
            $website_data_raw = json_decode($sanitized_string, true);
        } elseif (is_array($input)) {
            // If it's already an array, create a new array to store sanitized values
            $raw_data = [];
            $website_data_raw = [];
            
            // Copy only the fields we need with appropriate sanitization
            if (isset($input['name'])) {
                $website_data_raw['name'] = sanitize_text_field($input['name']);
            }
            if (isset($input['url'])) {
                $website_data_raw['url'] = esc_url_raw($input['url']);
            }
            if (isset($input['customInstructions'])) {
                $website_data_raw['customInstructions'] = sanitize_textarea_field($input['customInstructions']);
            }
        }
        
        // Proceed only if we have a valid array
        if (is_array($website_data_raw)) {
            // Copy sanitized fields to final data structure
            if (isset($website_data_raw['name'])) {
                $website_data['name'] = $website_data_raw['name'];
            }
            if (isset($website_data_raw['url'])) {
                $website_data['url'] = $website_data_raw['url'];
            }
            if (isset($website_data_raw['customInstructions'])) {
                $website_data['customInstructions'] = $website_data_raw['customInstructions'];
            }
        }
    }
    
    if (empty($website_data)) {
        wp_send_json_error(['message' => esc_html__('No website data provided', 'voicero-ai')], 400);
        return;
    }

    // 5) Validate required fields
    if (empty($website_data['name']) && empty($website_data['url']) && empty($website_data['customInstructions'])) {
        wp_send_json_error(['message' => esc_html__('At least one field (name, url, or customInstructions) must be provided', 'voicero-ai')], 400);
        return;
    }

    // 6) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 7) Get the website ID by making a request to the connect endpoint
    
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);
    
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($response_code)
            ),
            'body' => wp_kses_post($body)
        ]);
        return;
    }
    
    $data = json_decode($body, true);
    if (!$data || !isset($data['website']) || !isset($data['website']['id'])) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response structure from server.', 'voicero-ai')
        ]);
        return;
    }
    
    $website_id = $data['website']['id'];

    // 8) Prepare request payload
    $payload = $website_data;
    $payload['websiteId'] = $website_id;
    
    
    // 9) Make the API request to updateWebsite endpoint
    $api_url = VOICERO_API_URL . '/wordpress/updateWebsite';
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload),
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    // 10) Handle API errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 11) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    
    if ($status_code !== 200 || !$data || !isset($data['success']) || !$data['success']) {
        $error_message = isset($data['error']) ? $data['error'] : esc_html__('Unknown error occurred', 'voicero-ai');
        wp_send_json_error([
            'message' => $error_message,
            'status' => $status_code,
            'details' => $data
        ], $status_code >= 400 ? $status_code : 500);
        return;
    }

    // 12) Store the updated settings in WordPress options for later use
    if (isset($data['website']) && is_array($data['website'])) {
        update_option('voicero_website_name', $data['website']['name'], false);
        update_option('voicero_website_url', $data['website']['url'], false);
        if (isset($data['website']['customInstructions'])) {
            update_option('voicero_custom_instructions', $data['website']['customInstructions'], false);
        }
    }

    // 13) Also update the original website info to maintain backward compatibility
    if (isset($website_data['name'])) {
        update_option('voicero_website_name', $website_data['name']);
    }
    if (isset($website_data['url'])) {
        update_option('voicero_website_url', $website_data['url']);
    }
    if (isset($website_data['customInstructions'])) {
        update_option('voicero_custom_instructions', $website_data['customInstructions']);
    }

    // 14) Return success
    wp_send_json_success([
        'message' => isset($data['message']) ? $data['message'] : esc_html__('Website information updated successfully', 'voicero-ai'),
        'website' => isset($data['website']) ? $data['website'] : []
    ]);
}

/**
 * Handle the original AJAX request for website info (backward compatibility)
 */
add_action('wp_ajax_voicero_save_website_info', 'voicero_save_website_info_ajax');

function voicero_save_website_info_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get website data from the original format
    $website_name = isset($_REQUEST['website_name']) ? sanitize_text_field(wp_unslash($_REQUEST['website_name'])) : '';
    $website_url = isset($_REQUEST['website_url']) ? esc_url_raw(wp_unslash($_REQUEST['website_url'])) : '';
    $custom_instructions = isset($_REQUEST['custom_instructions']) ? sanitize_textarea_field(wp_unslash($_REQUEST['custom_instructions'])) : '';
    
    // 5) Log the request
    
    // 6) Create sanitized data for the new format (avoiding direct $_REQUEST modification)
    $sanitized_website_data = [
        'name' => $website_name,
        'url' => $website_url,
        'customInstructions' => $custom_instructions
    ];
    
    // Use the sanitized data
    $_REQUEST['website_data'] = $sanitized_website_data;
    
    // 7) Delegate to the new handler
    return voicero_update_website_ajax();
}

/**
 * Handle AJAX requests for user settings update
 */
add_action('wp_ajax_voicero_update_user_settings', 'voicero_update_user_settings_ajax');

function voicero_update_user_settings_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get the user data
    $user_data = [];
    if (isset($_REQUEST['user_data'])) {
        // Sanitize the entire $_REQUEST['user_data'] to make sure it's an array
        $user_data_raw = null;
        
        // First, safely get and sanitize the input - using map_deep for arrays or sanitize_text_field for strings
        if (is_array($_REQUEST['user_data'])) {
            $input = map_deep(wp_unslash($_REQUEST['user_data']), 'sanitize_text_field');
        } else {
            $input = sanitize_text_field(wp_unslash($_REQUEST['user_data']));
        }
        
        if (is_string($input)) {
            // If it's a string (e.g. JSON), sanitize it first
            $sanitized_string = sanitize_text_field($input);
            $user_data_raw = json_decode($sanitized_string, true);
        } elseif (is_array($input)) {
            // If it's already an array, process each field with proper sanitization
            $user_data_raw = [];
        }
        
        // Proceed only if we have a valid array
        if (is_array($user_data_raw)) {
            // Sanitize each field appropriately
            if (isset($user_data_raw['name'])) {
                $user_data['name'] = sanitize_text_field($user_data_raw['name']);
            } elseif (isset($input['name'])) {
                $user_data['name'] = sanitize_text_field($input['name']);
            }
            
            if (isset($user_data_raw['username'])) {
                $user_data['username'] = sanitize_user($user_data_raw['username']);
            } elseif (isset($input['username'])) {
                $user_data['username'] = sanitize_user($input['username']);
            }
            
            if (isset($user_data_raw['email'])) {
                $user_data['email'] = sanitize_email($user_data_raw['email']);
            } elseif (isset($input['email'])) {
                $user_data['email'] = sanitize_email($input['email']);
            }
        }
    }
    
    if (empty($user_data)) {
        wp_send_json_error(['message' => esc_html__('No user data provided', 'voicero-ai')], 400);
        return;
    }

    // 5) Validate required fields
    if (empty($user_data['name']) && empty($user_data['username']) && empty($user_data['email'])) {
        wp_send_json_error(['message' => esc_html__('At least one field (name, username, or email) must be provided', 'voicero-ai')], 400);
        return;
    }

    // 6) Get the access key
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => esc_html__('No access key configured', 'voicero-ai')], 403);
        return;
    }

    // 7) Get the website ID by making a request to the connect endpoint
    
    $response = wp_remote_get(VOICERO_API_URL . '/connect?access_token=' . urlencode($access_key), [
        'headers' => [
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'timeout' => 15,
        'sslverify' => false
    ]);
    
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }
    
    $response_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    if ($response_code !== 200) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %d: HTTP status code */
                esc_html__('Server returned error: %d', 'voicero-ai'),
                intval($response_code)
            ),
            'body' => wp_kses_post($body)
        ]);
        return;
    }
    
    $data = json_decode($body, true);
    if (!$data || !isset($data['website']) || !isset($data['website']['id'])) {
        wp_send_json_error([
            'message' => esc_html__('Invalid response structure from server.', 'voicero-ai')
        ]);
        return;
    }
    
    $website_id = $data['website']['id'];

    // 8) Prepare request payload
    $payload = $user_data;
    $payload['websiteId'] = $website_id;
    
    
    // 9) Make the API request to updateUserSettings endpoint
    $api_url = VOICERO_API_URL . '/wordpress/updateUserSettings';
    
    $response = wp_remote_post($api_url, [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload),
        'timeout' => 15,
        'sslverify' => false // Only for local development
    ]);

    // 10) Handle API errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => sprintf(
                /* translators: %s: detailed error message */
                esc_html__('Connection failed: %s', 'voicero-ai'),
                esc_html($response->get_error_message())
            )
        ], 500);
        return;
    }

    // 11) Process the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);
    
    
    if ($status_code !== 200 || !$data || !isset($data['success']) || !$data['success']) {
        $error_message = isset($data['error']) ? $data['error'] : esc_html__('Unknown error occurred', 'voicero-ai');
        wp_send_json_error([
            'message' => $error_message,
            'status' => $status_code,
            'details' => $data
        ], $status_code >= 400 ? $status_code : 500);
        return;
    }

    // 12) Store the updated settings in WordPress options for later use
    if (isset($data['user']) && is_array($data['user'])) {
        update_option('voicero_user_name', $data['user']['name'], false);
        update_option('voicero_username', $data['user']['username'], false);
        update_option('voicero_email', $data['user']['email'], false);
    }

    // 13) Also update the local user settings to maintain backward compatibility
    if (isset($user_data['name'])) {
        update_option('voicero_user_name', $user_data['name']);
    }
    if (isset($user_data['username'])) {
        update_option('voicero_username', $user_data['username']);
    }
    if (isset($user_data['email'])) {
        update_option('voicero_email', $user_data['email']);
    }

    // 14) Return success
    wp_send_json_success([
        'message' => isset($data['message']) ? $data['message'] : esc_html__('User settings updated successfully', 'voicero-ai'),
        'user' => isset($data['user']) ? $data['user'] : []
    ]);
}

/**
 * Handle the original AJAX request for user settings (backward compatibility)
 */
add_action('wp_ajax_voicero_save_user_settings', 'voicero_save_user_settings_ajax');

function voicero_save_user_settings_ajax() {
    // 1) Must be AJAX
    if (!defined('DOING_AJAX') || !DOING_AJAX) {
        wp_send_json_error(['message' => esc_html__('Invalid request type', 'voicero-ai')], 400);
        return;
    }

    // 2) Verify nonce
    $nonce = isset($_REQUEST['nonce']) ? sanitize_text_field(wp_unslash($_REQUEST['nonce'])) : '';
    if (!check_ajax_referer('voicero_ajax_nonce', 'nonce', false)) {
        wp_send_json_error(['message' => esc_html__('Invalid nonce', 'voicero-ai')], 403);
        return;
    }

    // 3) Check admin capability
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => esc_html__('Insufficient permissions', 'voicero-ai')], 403);
        return;
    }

    // 4) Get user data from the original format
    $user_name = isset($_REQUEST['user_name']) ? sanitize_text_field(wp_unslash($_REQUEST['user_name'])) : '';
    $username = isset($_REQUEST['username']) ? sanitize_text_field(wp_unslash($_REQUEST['username'])) : '';
    $email = isset($_REQUEST['email']) ? sanitize_email(wp_unslash($_REQUEST['email'])) : '';
    
    // 5) Log the request
    
    // 6) Convert to the new format
    $_REQUEST['user_data'] = [
        'name' => $user_name,
        'username' => $username,
        'email' => $email
    ];
    
    // 7) Delegate to the new handler
    return voicero_update_user_settings_ajax();
}

/**
 * Handle AJAX requests for customer data
 */
add_action('wp_ajax_voicero_set_customer_data', 'voicero_set_customer_data_ajax');
add_action('wp_ajax_nopriv_voicero_set_customer_data', 'voicero_set_customer_data_ajax');

function voicero_set_customer_data_ajax() {
    // Log for debugging
    
    // 1) Verify nonce - accept either frontend or ajax nonce for flexibility
    $nonce = isset($_POST['nonce']) ? sanitize_text_field(wp_unslash($_POST['nonce'])) : '';
    
    // Try with different nonce actions to be flexible with how the nonce was created
    $nonce_valid = wp_verify_nonce($nonce, 'voicero_frontend_nonce') || 
                  wp_verify_nonce($nonce, 'voicero_ajax_nonce');
    
    if (empty($nonce) || !$nonce_valid) {
        wp_send_json_error(['message' => 'Security check failed - invalid nonce']);
        return;
    }

    // 2) Get the payload
    if (!isset($_POST['payload'])) {
        wp_send_json_error(['message' => 'No payload provided']);
        return;
    }

    // Handle different possible payload formats - properly unslash and sanitize the input
    $raw_payload = sanitize_text_field(wp_unslash($_POST['payload']));
    
    // Try different payload parsing approaches
    // First try with clean unslashed input
    $payload = json_decode($raw_payload, true);
    
    // If that fails, try with stripslashes
    if (!$payload) {
        $payload = json_decode(stripslashes($raw_payload), true);
    }
    
    // If both approaches fail, error out
    if (!$payload) {
        wp_send_json_error(['message' => 'Invalid payload format: ' . json_last_error_msg()]);
        return;
    }

    // 3) Get the access key from server-side (more secure than client-side)
    $access_key = voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => 'No access key configured']);
        return;
    }

    // 4) Forward to external API
    $response = wp_remote_post(VOICERO_API_URL . '/wordpress/setCustomer', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($payload),
        'timeout' => 30, // Longer timeout for API
        'sslverify' => false // For local development
    ]);

    // 5) Handle errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => 'API connection failed: ' . $response->get_error_message()
        ]);
        return;
    }

    // 6) Get response details
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $data = json_decode($response_body, true);

    // 7) Check status code for specific error handling
    if ($status_code !== 200) {
        wp_send_json_error([
            'message' => 'API returned error: ' . $status_code,
            'data' => $data
        ], $status_code);
        return;
    }

    // 8) Return the successful response to the client
    wp_send_json_success($data);
}

/**
 * Proxy function to save chatbot settings to the API
 */
function voicero_save_chatbot_settings_proxy() {
    // Verify the nonce - using isset to prevent undefined index errors
    if (!isset($_POST['nonce'])) {
        wp_send_json_error(['message' => 'Security token missing']);
        return;
    }
    
    // Properly unslash and sanitize the nonce before verification
    $nonce = sanitize_key(wp_unslash($_POST['nonce']));
    
    if (!wp_verify_nonce($nonce, 'voicero_chatbot_nonce')) {
        wp_send_json_error(['message' => 'Invalid security token']);
        return;
    }

    // Check if user has permission
    if (!current_user_can('manage_options')) {
        wp_send_json_error(['message' => 'You do not have permission to perform this action']);
        return;
    }

    // Get the settings from the request - handle direct access_key case
    $settings = [];
    if (isset($_POST['settings']) && is_array($_POST['settings'])) {
        // Properly unslash and sanitize the settings array
        $raw_settings = map_deep(wp_unslash($_POST['settings']), 'sanitize_text_field');
        
        // Process the settings array recursively and sanitize each value
        foreach ($raw_settings as $key => $value) {
            $clean_key = sanitize_key($key);
            
            if (is_array($value)) {
                // For arrays like popUpQuestions/suggested_questions
                $settings[$clean_key] = array_map('sanitize_text_field', $value);
            } else if ($key === 'customInstructions' || $key === 'custom_instructions' || 
                       $key === 'customWelcomeMessage' || $key === 'welcome_message') {
                // For textarea fields
                $settings[$clean_key] = sanitize_textarea_field($value);
            } else if ($key === 'color' || $key === 'primary_color') {
                // For color values
                $settings[$clean_key] = sanitize_hex_color($value) ?: sanitize_text_field($value);
            } else {
                // For standard text fields
                $settings[$clean_key] = sanitize_text_field($value);
            }
        }
    }
    
    // Handle direct POST parameters if settings isn't set
    if (empty($settings) && isset($_POST['access_key'])) {
        // Create settings from direct POST data - properly unslashed and sanitized
        $direct_post = wp_unslash($_POST);
        
        // Sanitize each relevant field
        if (isset($direct_post['access_key'])) {
            $settings['access_key'] = sanitize_text_field($direct_post['access_key']);
        }
        if (isset($direct_post['chatbot_name']) || isset($direct_post['botName'])) {
            $settings['botName'] = sanitize_text_field($direct_post['chatbot_name'] ?? $direct_post['botName'] ?? '');
        }
        if (isset($direct_post['welcome_message']) || isset($direct_post['customWelcomeMessage'])) {
            $settings['customWelcomeMessage'] = sanitize_textarea_field($direct_post['welcome_message'] ?? $direct_post['customWelcomeMessage'] ?? '');
        }
        if (isset($direct_post['custom_instructions']) || isset($direct_post['customInstructions'])) {
            $settings['customInstructions'] = sanitize_textarea_field($direct_post['custom_instructions'] ?? $direct_post['customInstructions'] ?? '');
        }
        if (isset($direct_post['primary_color']) || isset($direct_post['color'])) {
            $color = $direct_post['primary_color'] ?? $direct_post['color'] ?? '';
            $settings['color'] = sanitize_hex_color($color) ?: sanitize_text_field($color);
        }
    }
    
    if (empty($settings)) {
        wp_send_json_error(['message' => 'No settings provided']);
        return;
    }
    
    // Debug output
    
    // Get access key - from settings or from server
    $access_key = isset($settings['access_key']) ? $settings['access_key'] : voicero_get_access_key();
    if (empty($access_key)) {
        wp_send_json_error(['message' => 'No access key configured']);
        return;
    }
    
    // Try to get website ID from multiple sources
    $website_id = '';
    
    // 1. Try from settings
    if (!empty($settings['websiteId'])) {
        $website_id = $settings['websiteId'];
    }
    
    // 2. Try from direct field
    if (empty($website_id) && !empty($settings['website_id'])) {
        $website_id = $settings['website_id'];
    }
    
    // 3. Try from options
    if (empty($website_id)) {
        $website_id = get_option('voicero_website_id', '');
    }
    
    // 4. Try from API info
    if (empty($website_id)) {
        $info_response = wp_remote_get(VOICERO_API_URL . '/connect', [
            'headers' => [
                'Authorization' => 'Bearer ' . $access_key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ],
            'timeout' => 15,
            'sslverify' => false
        ]);
        
        if (!is_wp_error($info_response) && wp_remote_retrieve_response_code($info_response) === 200) {
            $info_data = json_decode(wp_remote_retrieve_body($info_response), true);
            
            if (isset($info_data['website']) && isset($info_data['website']['id'])) {
                $website_id = $info_data['website']['id'];
                // Save it for future use
                update_option('voicero_website_id', $website_id);
            }
        }
    }
    
    // If we still don't have a website ID, error out
    if (empty($website_id)) {
        wp_send_json_error(['message' => 'Website ID is required but could not be determined. Please contact support.']);
        return;
    }
    
    // Build the data to send to the API - ensuring exact match with the API requirements
    $api_data = [
        'websiteId' => sanitize_text_field($website_id),
        'botName' => isset($settings['chatbot_name']) ? sanitize_text_field($settings['chatbot_name']) : 
                    (isset($settings['botName']) ? sanitize_text_field($settings['botName']) : ''),
        'customWelcomeMessage' => isset($settings['welcome_message']) ? sanitize_textarea_field($settings['welcome_message']) : 
                                 (isset($settings['customWelcomeMessage']) ? sanitize_textarea_field($settings['customWelcomeMessage']) : ''),
        'clickMessage' => isset($settings['click_message']) ? sanitize_textarea_field($settings['click_message']) : 
                         (isset($settings['clickMessage']) ? sanitize_textarea_field($settings['clickMessage']) : ''),
        'allowMultiAIReview' => isset($settings['allow_multi_ai_review']) ? (bool)$settings['allow_multi_ai_review'] : 
                               (isset($settings['allowMultiAIReview']) ? (bool)$settings['allowMultiAIReview'] : false),
        'customInstructions' => isset($settings['custom_instructions']) ? sanitize_textarea_field($settings['custom_instructions']) : 
                               (isset($settings['customInstructions']) ? sanitize_textarea_field($settings['customInstructions']) : ''),
        'color' => isset($settings['primary_color']) ? sanitize_text_field($settings['primary_color']) : 
                  (isset($settings['color']) ? sanitize_text_field($settings['color']) : ''),
        'removeHighlight' => isset($settings['remove_highlighting']) ? (bool)$settings['remove_highlighting'] : 
                            (isset($settings['removeHighlight']) ? (bool)$settings['removeHighlight'] : false),
        'iconBot' => isset($settings['bot_icon_type']) ? mapIconToApi('bot', $settings['bot_icon_type']) : 
                    (isset($settings['iconBot']) ? sanitize_text_field($settings['iconBot']) : 'BotIcon'),
        'iconVoice' => isset($settings['voice_icon_type']) ? mapIconToApi('voice', $settings['voice_icon_type']) : 
                      (isset($settings['iconVoice']) ? sanitize_text_field($settings['iconVoice']) : 'MicrophoneIcon'),
        'iconMessage' => isset($settings['message_icon_type']) ? mapIconToApi('message', $settings['message_icon_type']) : 
                        (isset($settings['iconMessage']) ? sanitize_text_field($settings['iconMessage']) : 'MessageIcon'),
        'popUpQuestions' => isset($settings['suggested_questions']) && is_array($settings['suggested_questions']) ? 
                           array_map('sanitize_text_field', $settings['suggested_questions']) : 
                           (isset($settings['popUpQuestions']) && is_array($settings['popUpQuestions']) ? 
                           array_map('sanitize_text_field', $settings['popUpQuestions']) : [])
    ];
    
    
    // Send the request to the API with the exact endpoint 
    $response = wp_remote_post(VOICERO_API_URL . '/saveBotSettings', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body' => json_encode($api_data),
        'timeout' => 30,
        'sslverify' => false
    ]);
    
    // Check for errors
    if (is_wp_error($response)) {
        wp_send_json_error([
            'message' => 'Error communicating with API: ' . $response->get_error_message(),
            'data' => $api_data
        ]);
        return;
    }
    
    // Parse the response
    $status_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    $response_data = json_decode($response_body, true);
    
    // Check if the request was successful
    if ($status_code !== 200) {
        $error_message = 'Unknown error';
        
        if (isset($response_data['error'])) {
            $error_message = $response_data['error'];
        } else if (isset($response_data['message'])) {
            $error_message = $response_data['message'];
        } else if (isset($response_data['details'])) {
            $error_message = $response_data['details'];
        }
        
        
        wp_send_json_error([
            'message' => 'API returned error: ' . $error_message,
            'status' => $status_code,
            'data' => $api_data
        ]);
        return;
    }
    
    // Store the settings in WordPress as a backup
    update_option('voicero_chatbot_settings', $api_data);
    
    // Return success
    wp_send_json_success([
        'message' => 'Chatbot settings saved successfully',
        'data' => $response_data
    ]);
}

/**
 * Map icon types from UI to API format
 * 
 * @param string $type The icon type (bot, voice, message)
 * @param string $value The icon value from UI
 * @return string The API icon value
 */
function mapIconToApi($type, $value) {
    $maps = [
        'bot' => [
            'Bot' => 'BotIcon',
            'Voice' => 'VoiceIcon',
            'Message' => 'MessageIcon'
        ],
        'voice' => [
            'Microphone' => 'MicrophoneIcon',
            'Waveform' => 'WaveformIcon',
            'Speaker' => 'SpeakerIcon'
        ],
        'message' => [
            'Message' => 'MessageIcon',
            'Document' => 'DocumentIcon',
            'Cursor' => 'CursorIcon'
        ]
    ];
    
    if (isset($maps[$type]) && isset($maps[$type][$value])) {
        return $maps[$type][$value];
    }
    
    // Default values
    $defaults = [
        'bot' => 'BotIcon',
        'voice' => 'MicrophoneIcon',
        'message' => 'MessageIcon'
    ];
    
    return $defaults[$type] ?? 'BotIcon';
}

// Register AJAX handler
add_action('wp_ajax_voicero_save_chatbot_settings_proxy', 'voicero_save_chatbot_settings_proxy');

/**
 * Toggle website status proxy function
 * 
 * @param WP_REST_Request $request The request object
 * @return WP_REST_Response The response
 */
function voicero_toggle_status_proxy(WP_REST_Request $request) {
    // Get access key
    $access_key = voicero_get_access_key();
    
    if (empty($access_key)) {
        return new WP_REST_Response(['error' => 'No access key configured'], 400);
    }
    
    // Get request data
    $params = $request->get_json_params();
    $website_id = isset($params['websiteId']) ? sanitize_text_field($params['websiteId']) : '';
    
    if (empty($website_id)) {
        return new WP_REST_Response(['error' => 'Missing website ID'], 400);
    }
    
    // Prepare request to external API
    $api_url = VOICERO_API_URL . '/websites/toggle-status';
    
    $response = wp_remote_post($api_url, [
        'timeout'     => 45,
        'headers'     => [
            'Authorization' => 'Bearer ' . $access_key,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json'
        ],
        'body'        => json_encode([
            'websiteId' => $website_id,
        ]),
        'sslverify' => false // Only for local development
    ]);
    
    // Check for request error
    if (is_wp_error($response)) {
        return new WP_REST_Response(['error' => $response->get_error_message()], 500);
    }
    
    // Get response code
    $response_code = wp_remote_retrieve_response_code($response);
    
    // Get response body
    $response_body = wp_remote_retrieve_body($response);
    $response_data = json_decode($response_body, true);
    
    // Forward the response
    return new WP_REST_Response($response_data, $response_code);
}

/**
 * REST API callback function to get customer data
 */
function voicero_get_customer_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'WooCommerce is not active'
        ], 400);
    }

    // Get parameters
    $email = $request->get_param('email');
    $user_id = $request->get_param('user_id');
    
    // Initialize response
    $customer_data = array();
    $current_user = null;

    // Try to determine the current user from various sources
    $current_user = null;
    
    // Method 1: Check if user is specified by email parameter
    if (!empty($email)) {
        $user = get_user_by('email', sanitize_email($email));
        if ($user) {
            $current_user = $user;
        } else {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Customer not found with this email'
            ], 404);
        }
    } 
    // Method 2: Check if user is specified by user_id parameter
    elseif (!empty($user_id)) {
        $user = get_user_by('ID', intval($user_id));
        if ($user) {
            $current_user = $user;
        } else {
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Customer not found with this ID'
            ], 404);
        }
    } 
    // Method 3: Try to get current logged-in user (REST API context)
    else {
        // First try the standard WordPress way
        if (is_user_logged_in()) {
            $current_user = wp_get_current_user();
        } else {
            // Try to determine user from cookies manually for REST API context
            $current_user = wp_get_current_user();
            
            // If we still don't have a user, try to parse WordPress auth cookies
            if (!$current_user || $current_user->ID === 0) {
                // Try to validate auth cookies manually
                $user_id = wp_validate_auth_cookie('', 'logged_in');
                if ($user_id) {
                    $current_user = get_user_by('ID', $user_id);
                }
            }
        }
        
        // If still no user found, return guest data instead of error
        if (!$current_user || $current_user->ID === 0) {
            return new WP_REST_Response([
                'success' => true,
                'data' => [
                    'id' => 0,
                    'logged_in' => false,
                    'is_guest' => true,
                    'message' => 'No user logged in - guest session'
                ]
            ], 200);
        }
    }

    if ($current_user) {
        // Basic user data
        $customer_data['id'] = $current_user->ID;
        $customer_data['first_name'] = $current_user->first_name;
        $customer_data['last_name'] = $current_user->last_name;
        $customer_data['email'] = $current_user->user_email;
        $customer_data['username'] = $current_user->user_login;
        $customer_data['display_name'] = $current_user->display_name;
        $customer_data['logged_in'] = is_user_logged_in() && $current_user->ID === get_current_user_id();
        
        // Get billing information
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
        
        // Get shipping information
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
        
        // Get recent orders (last 10)
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
                'status_name' => wc_get_order_status_name($order->get_status()),
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                'date_created_formatted' => $order->get_date_created() ? $order->get_date_created()->format('F j, Y') : '',
                'total' => $order->get_total(),
                'total_formatted' => wc_price($order->get_total()),
                'currency' => $order->get_currency(),
                'payment_method' => $order->get_payment_method_title(),
                'billing_email' => $order->get_billing_email(),
                'billing_phone' => $order->get_billing_phone()
            );
            
            // Add line items
            $line_items = array();
            foreach ($order->get_items() as $item_id => $item) {
                $product = $item->get_product();
                $line_items[] = array(
                    'id' => $item_id,
                    'product_id' => $item->get_product_id(),
                    'name' => $item->get_name(),
                    'quantity' => $item->get_quantity(),
                    'total' => $item->get_total(),
                    'total_formatted' => wc_price($item->get_total()),
                    'price' => $product ? $product->get_price() : 0,
                    'sku' => $product ? $product->get_sku() : '',
                    'permalink' => $product ? get_permalink($product->get_id()) : ''
                );
            }
            
            $order_data['line_items'] = $line_items;
            $recent_orders[] = $order_data;
        }
        
        $customer_data['recent_orders'] = $recent_orders;
        
        // Calculate total spent and order count
        $customer = new WC_Customer($current_user->ID);
        $customer_data['total_spent'] = $customer->get_total_spent();
        $customer_data['total_spent_formatted'] = wc_price($customer->get_total_spent());
        $customer_data['orders_count'] = $customer->get_order_count();
        
        // Add registration date
        $customer_data['date_registered'] = $current_user->user_registered;
        $customer_data['date_registered_formatted'] = date('F j, Y', strtotime($current_user->user_registered));
        
        // Add customer roles
        $customer_data['roles'] = $current_user->roles;
        
        // Get cart data if user is logged in and has a cart
        if ($customer_data['logged_in'] && !empty(WC()->cart)) {
            $cart = WC()->cart;
            $customer_data['cart'] = array(
                'items_count' => $cart->get_cart_contents_count(),
                'total' => $cart->get_total(),
                'total_formatted' => wc_price($cart->get_total()),
                'subtotal' => $cart->get_subtotal(),
                'subtotal_formatted' => wc_price($cart->get_subtotal()),
                'tax_total' => $cart->get_total_tax(),
                'tax_total_formatted' => wc_price($cart->get_total_tax())
            );
        }
    }
    
    return new WP_REST_Response([
        'success' => true,
        'data' => $customer_data
    ], 200);
}

/**
 * REST API callback function to get cart data
 */
function voicero_get_cart_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'WooCommerce is not active'
        ], 400);
    }
    
    // Initialize WooCommerce session, customer, and cart properly for REST API
    if (!defined('WC_ABSPATH')) {
        include_once(WP_PLUGIN_DIR . '/woocommerce/includes/wc-cart-functions.php');
        include_once(WP_PLUGIN_DIR . '/woocommerce/includes/wc-notice-functions.php');
    }
    
    // Initialize session
    if (is_null(WC()->session)) {
        $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
        WC()->session = new $session_class();
        WC()->session->init();
    }
    
    if (!WC()->session->has_session()) {
        WC()->session->set_customer_session_cookie(true);
    }
    
    // Initialize customer
    if (is_null(WC()->customer)) {
        WC()->customer = new WC_Customer(get_current_user_id(), true);
    }
    
    // Ensure WooCommerce cart is available
    if (is_null(WC()->cart)) {
        WC()->initialize_cart();
    }
    
    // Make sure cart is properly initialized
    WC()->cart->get_cart_from_session();
    
    // Get cart data
    $cart = WC()->cart;
    
    if (empty($cart)) {
        return new WP_REST_Response([
            'success' => true,
            'data' => array()
        ], 200);
    }
    
    $cart_data = array(
        'items_count' => $cart->get_cart_contents_count(),
        'total' => $cart->get_total(),
        'total_formatted' => wc_price($cart->get_total()),
        'subtotal' => $cart->get_subtotal(),
        'subtotal_formatted' => wc_price($cart->get_subtotal()),
        'tax_total' => $cart->get_total_tax(),
        'tax_total_formatted' => wc_price($cart->get_total_tax()),
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
            'price_formatted' => wc_price($product->get_price()),
            'line_total' => $cart_item['line_total'],
            'line_total_formatted' => wc_price($cart_item['line_total']),
            'line_tax' => $cart_item['line_tax'],
            'line_tax_formatted' => wc_price($cart_item['line_tax'])
        );
        
        // Add product URL and image
        $item_data['url'] = get_permalink($product_id);
        $item_data['image'] = wp_get_attachment_url($product->get_image_id());
        $item_data['sku'] = $product->get_sku();
        
        $cart_data['items'][] = $item_data;
    }
    
    return new WP_REST_Response([
        'success' => true,
        'data' => $cart_data
    ], 200);
}

/**
 * REST API callback function to get a nonce for frontend use
 */
function voicero_get_nonce_rest($request) {
    return new WP_REST_Response([
        'success' => true,
        'data' => [
            'nonce' => wp_create_nonce('voicero_frontend_nonce'),
            'ajax_nonce' => wp_create_nonce('voicero_ajax_nonce')
        ]
    ], 200);
}

/**
 * Debug endpoint to check authentication status
 */
function voicero_debug_auth_rest($request) {
    $current_user = wp_get_current_user();
    $is_logged_in = is_user_logged_in();
    
    // Try to get user from auth cookies
    $auth_cookie_user_id = wp_validate_auth_cookie('', 'logged_in');
    
    // Get all cookies for debugging
    $cookies = [];
    if (isset($_COOKIE)) {
        foreach ($_COOKIE as $name => $value) {
            if (strpos($name, 'wordpress') !== false || strpos($name, 'wp_') !== false) {
                $cookies[$name] = substr($value, 0, 50) . '...';
            }
        }
    }
    
    return new WP_REST_Response([
        'success' => true,
        'data' => [
            'is_logged_in' => $is_logged_in,
            'current_user_id' => $current_user->ID,
            'current_user_login' => $current_user->user_login,
            'current_user_email' => $current_user->user_email,
            'auth_cookie_user_id' => $auth_cookie_user_id,
            'cookies_found' => array_keys($cookies),
            'cookie_count' => count($cookies),
            'request_headers' => getallheaders() ?: [],
            'server_request_uri' => $_SERVER['REQUEST_URI'] ?? '',
            'is_ssl' => is_ssl()
        ]
    ], 200);
}

/**
 * REST API callback for getting orders
 */
function voicero_get_orders_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    // Get parameters
    $days = $request->get_param('days') ?: 30;
    $days = max(1, min($days, 90)); // Limit between 1 and 90 days
    $email = $request->get_param('email');
    
    try {
        // Calculate date from X days ago
        $date_from = new DateTime();
        $date_from->modify("-{$days} days");
        
        // Base query parameters for WooCommerce orders
        $args = array(
            'limit' => 100,
            'date_created' => '>=' . $date_from->format('Y-m-d'),
            'orderby' => 'date',
            'order' => 'DESC',
            'status' => array('completed', 'processing', 'on-hold', 'pending', 'failed', 'refunded', 'cancelled')
        );
        
        // If email is provided, filter by customer email
        if (!empty($email)) {
            // First try to find user by email
            $user = get_user_by('email', $email);
            if ($user) {
                $args['customer_id'] = $user->ID;
            } else {
                // If no user found, filter by billing email in meta query
                $args['meta_query'] = array(
                    array(
                        'key' => '_billing_email',
                        'value' => $email,
                        'compare' => '='
                    )
                );
            }
        } else {
            // If no email specified, try to get current user's orders
            $current_user_id = get_current_user_id();
            if ($current_user_id > 0) {
                $args['customer_id'] = $current_user_id;
            } else {
                // For guests/testing, return all recent orders (admin/dev access)
                if (!current_user_can('manage_options')) {
                    return new WP_REST_Response(['error' => 'Email parameter required for guest access'], 400);
                }
            }
        }
        
        // Create the query
        $orders_query = new WC_Order_Query($args);
        $orders = $orders_query->get_orders();
        
        if (empty($orders)) {
            return new WP_REST_Response([], 200);
        }
        
        // Format orders for response
        $formatted_orders = array();
        foreach ($orders as $order) {
            $formatted_orders[] = array(
                'id' => $order->get_id(),
                'number' => $order->get_order_number(),
                'status' => $order->get_status(),
                'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                'total' => $order->get_total(),
                'currency' => $order->get_currency(),
                'payment_method' => $order->get_payment_method_title(),
                'billing' => array(
                    'first_name' => $order->get_billing_first_name(),
                    'last_name' => $order->get_billing_last_name(),
                    'email' => $order->get_billing_email(),
                )
            );
        }
        
        return new WP_REST_Response($formatted_orders, 200);
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error fetching orders: ' . $e->getMessage()], 500);
    }
}

/**
 * REST API callback for tracking/verifying a specific order
 */
function voicero_track_order_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    // Get required parameters
    $order_id = $request->get_param('order_id');
    $email = $request->get_param('email');
    
    if (empty($order_id)) {
        return new WP_REST_Response(['error' => 'Order ID is required'], 400);
    }
    
    if (empty($email)) {
        return new WP_REST_Response(['error' => 'Email is required'], 400);
    }
    
    try {
        // Try to get the order
        $order = wc_get_order($order_id);
        if (!$order) {
            // Try to find by looking up using get_posts
            $args = array(
                'post_type' => 'shop_order',
                'post_status' => 'any',
                'posts_per_page' => 1,
                's' => $order_id,
            );
            $order_posts = get_posts($args);
            
            if (!empty($order_posts)) {
                $order = wc_get_order($order_posts[0]->ID);
            }
        }
        
        if (!$order) {
            return new WP_REST_Response(['error' => 'Order not found'], 404);
        }
        
        // Get current user ID
        $current_user_id = get_current_user_id();
        $order_user_id = $order->get_user_id();
        
        // CASE 1: If logged in and order belongs to user, allow it
        if ($current_user_id > 0 && $order_user_id == $current_user_id) {
            return new WP_REST_Response([
                'message' => 'Order verified by user account',
                'verified' => true,
                'order' => [
                    'id' => $order->get_id(),
                    'number' => $order->get_order_number(),
                    'status' => $order->get_status(),
                    'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                    'total' => $order->get_total(),
                    'currency' => $order->get_currency(),
                    'payment_method' => $order->get_payment_method_title(),
                    'billing' => [
                        'first_name' => $order->get_billing_first_name(),
                        'last_name' => $order->get_billing_last_name(),
                        'email' => $order->get_billing_email(),
                    ],
                    'shipping' => [
                        'first_name' => $order->get_shipping_first_name(),
                        'last_name' => $order->get_shipping_last_name(),
                        'address_1' => $order->get_shipping_address_1(),
                        'city' => $order->get_shipping_city(),
                        'state' => $order->get_shipping_state(),
                        'postcode' => $order->get_shipping_postcode(),
                        'country' => $order->get_shipping_country(),
                    ]
                ]
            ], 200);
        }
        
        // CASE 2: Verify by email
        $billing_email = $order->get_billing_email();
        
        // Test/development order handling
        if (empty($billing_email) && (current_user_can('manage_options') || strpos($email, 'wpengine') !== false)) {
            return new WP_REST_Response([
                'message' => 'Test order verified',
                'verified' => true,
                'order' => [
                    'id' => $order->get_id(),
                    'number' => $order->get_order_number(),
                    'status' => $order->get_status(),
                    'total' => $order->get_total(),
                ]
            ], 200);
        }
        
        // Regular email verification
        if (!empty($billing_email) && $billing_email === $email) {
            return new WP_REST_Response([
                'message' => 'Order verified by email',
                'verified' => true,
                'order' => [
                    'id' => $order->get_id(),
                    'number' => $order->get_order_number(),
                    'status' => $order->get_status(),
                    'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : '',
                    'total' => $order->get_total(),
                    'currency' => $order->get_currency(),
                    'payment_method' => $order->get_payment_method_title(),
                    'billing' => [
                        'first_name' => $order->get_billing_first_name(),
                        'last_name' => $order->get_billing_last_name(),
                        'email' => $order->get_billing_email(),
                    ]
                ]
            ], 200);
        }
        
        return new WP_REST_Response(['error' => 'Email does not match order', 'verified' => false], 403);
        
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error verifying order: ' . $e->getMessage()], 500);
    }
}

/**
 * REST API callback for canceling an order
 */
function voicero_cancel_order_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    // Get required parameters
    $order_id = $request->get_param('order_id');
    $email = $request->get_param('email');
    
    if (empty($order_id)) {
        return new WP_REST_Response(['error' => 'Order ID is required'], 400);
    }
    
    if (empty($email)) {
        return new WP_REST_Response(['error' => 'Email is required'], 400);
    }
    
    try {
        // Try to get the order
        $order = wc_get_order($order_id);
        if (!$order) {
            // Try to find by looking up using get_posts
            $args = array(
                'post_type' => 'shop_order',
                'post_status' => 'any',
                'posts_per_page' => 1,
                's' => $order_id,
            );
            $order_posts = get_posts($args);
            
            if (!empty($order_posts)) {
                $order = wc_get_order($order_posts[0]->ID);
            }
        }
        
        if (!$order) {
            return new WP_REST_Response(['error' => 'Order not found'], 404);
        }
        
        // Verify order belongs to customer
        $billing_email = $order->get_billing_email();
        if ($billing_email !== $email) {
            return new WP_REST_Response(['error' => 'Email does not match order'], 403);
        }
        
        // Check if order status allows cancellation
        $status = $order->get_status();
        $cancelable_statuses = apply_filters('voicero_cancelable_order_statuses', [
            'pending', 'processing', 'on-hold', 'failed'
        ]);
        
        if (!in_array($status, $cancelable_statuses)) {
            return new WP_REST_Response([
                'error' => 'This order cannot be cancelled due to its current status: ' . wc_get_order_status_name($status)
            ], 400);
        }
        
        // Process the cancellation
        $order->update_status('cancelled', 'Order cancelled by customer via API');
        $order->save();
        
        return new WP_REST_Response([
            'message' => 'Order cancelled successfully',
            'order_id' => $order->get_id(),
            'status' => $order->get_status()
        ], 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error cancelling order: ' . $e->getMessage()], 500);
    }
}

/**
 * REST API callback for initiating order return
 */
function voicero_return_order_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    // Get required parameters
    $order_id = $request->get_param('order_id');
    $email = $request->get_param('email');
    $return_type = $request->get_param('return_type') ?: 'refund';
    $reason = $request->get_param('reason') ?: 'Customer requested return';
    
    if (empty($order_id)) {
        return new WP_REST_Response(['error' => 'Order ID is required'], 400);
    }
    
    if (empty($email)) {
        return new WP_REST_Response(['error' => 'Email is required'], 400);
    }
    
    try {
        // Try to get the order
        $order = wc_get_order($order_id);
        if (!$order) {
            return new WP_REST_Response(['error' => 'Order not found'], 404);
        }
        
        // Verify order belongs to customer
        $billing_email = $order->get_billing_email();
        if ($billing_email !== $email) {
            return new WP_REST_Response(['error' => 'Email does not match order'], 403);
        }
        
        // Check if order status allows returns
        $status = $order->get_status();
        $returnable_statuses = apply_filters('voicero_returnable_order_statuses', [
            'completed', 'processing', 'on-hold'
        ]);
        
        if (!in_array($status, $returnable_statuses)) {
            return new WP_REST_Response([
                'error' => 'This order is not eligible for return due to its current status: ' . wc_get_order_status_name($status)
            ], 400);
        }
        
        // Create return request
        $return_request_id = 'return_' . uniqid();
        $return_data = [
            'id' => $return_request_id,
            'date_requested' => current_time('mysql'),
            'status' => 'pending',
            'type' => $return_type,
            'reason' => $reason,
            'customer_email' => $email
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
            'Return request (%s) initiated by customer via API. Reason: %s',
            $return_type,
            $reason
        );
        $order->add_order_note($note);
        $order->save();
        
        return new WP_REST_Response([
            'message' => 'Return request submitted successfully',
            'return_id' => $return_request_id,
            'order_id' => $order->get_id(),
            'status' => 'pending'
        ], 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error processing return request: ' . $e->getMessage()], 500);
    }
}

/**
 * REST API callback for adding item to cart
 */
function voicero_add_to_cart_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    // Get parameters
    $product_id = $request->get_param('product_id');
    $product_name = $request->get_param('product_name');
    $sku = $request->get_param('sku');
    $quantity = $request->get_param('quantity') ?: 1;
    $variation_id = $request->get_param('variation_id') ?: 0;
    
    // Must have at least one identifier
    if (empty($product_id) && empty($product_name) && empty($sku)) {
        return new WP_REST_Response(['error' => 'Product ID, product name, or SKU is required'], 400);
    }
    
    try {
        // Initialize WooCommerce session, customer, and cart properly for REST API
        if (!defined('WC_ABSPATH')) {
            include_once(WP_PLUGIN_DIR . '/woocommerce/includes/wc-cart-functions.php');
            include_once(WP_PLUGIN_DIR . '/woocommerce/includes/wc-notice-functions.php');
        }
        
        // Initialize session
        if (is_null(WC()->session)) {
            $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
            WC()->session = new $session_class();
            WC()->session->init();
        }
        
        if (!WC()->session->has_session()) {
            WC()->session->set_customer_session_cookie(true);
        }
        
        // Initialize customer
        if (is_null(WC()->customer)) {
            WC()->customer = new WC_Customer(get_current_user_id(), true);
        }
        
        // Ensure WooCommerce cart is available
        if (is_null(WC()->cart)) {
            WC()->initialize_cart();
        }
        
        // Make sure cart is properly initialized
        WC()->cart->get_cart_from_session();
        
        $product = null;
        
        // Method 1: Find by product ID
        if (!empty($product_id)) {
            $product = wc_get_product($product_id);
        }
        
        // Method 2: Find by SKU
        if (!$product && !empty($sku)) {
            $product_id = wc_get_product_id_by_sku($sku);
            if ($product_id) {
                $product = wc_get_product($product_id);
            }
        }
        
        // Method 3: Find by product name (search)
        if (!$product && !empty($product_name)) {
            $args = array(
                'post_type' => 'product',
                'post_status' => 'publish',
                'posts_per_page' => 5,
                's' => $product_name,
                'meta_query' => array(
                    array(
                        'key' => '_stock_status',
                        'value' => 'instock',
                        'compare' => '='
                    )
                )
            );
            
            $products = get_posts($args);
            
            if (empty($products)) {
                // Try broader search without stock status
                $args = array(
                    'post_type' => 'product',
                    'post_status' => 'publish',
                    'posts_per_page' => 5,
                    's' => $product_name
                );
                $products = get_posts($args);
            }
            
            if (!empty($products)) {
                // Return multiple options if more than one found
                if (count($products) > 1) {
                    $product_options = [];
                    foreach ($products as $prod) {
                        $wc_product = wc_get_product($prod->ID);
                        $product_options[] = [
                            'id' => $wc_product->get_id(),
                            'name' => $wc_product->get_name(),
                            'price' => $wc_product->get_price(),
                            'sku' => $wc_product->get_sku(),
                            'in_stock' => $wc_product->is_in_stock()
                        ];
                    }
                    
                    return new WP_REST_Response([
                        'message' => 'Multiple products found. Please specify which one:',
                        'products' => $product_options
                    ], 200);
                }
                
                // Use the first (best match) product
                $product = wc_get_product($products[0]->ID);
                $product_id = $product->get_id();
            }
        }
        
        if (!$product) {
            return new WP_REST_Response(['error' => 'Product not found'], 404);
        }
        
        // Check if product is purchasable
        if (!$product->is_purchasable()) {
            return new WP_REST_Response(['error' => 'Product is not available for purchase'], 400);
        }
        
        // Check stock status
        if (!$product->is_in_stock()) {
            return new WP_REST_Response(['error' => 'Product is out of stock'], 400);
        }
        
        // Add item to cart
        $cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id);
        
        if (!$cart_item_key) {
            return new WP_REST_Response(['error' => 'Could not add item to cart'], 400);
        }
        
        // Save cart to session
        WC()->cart->set_session();
        WC()->session->save_data();
        
        // Get updated cart data
        $cart = WC()->cart;
        $cart_data = [
            'message' => 'Item added to cart successfully',
            'cart_item_key' => $cart_item_key,
            'cart_total' => $cart->get_total(),
            'cart_count' => $cart->get_cart_contents_count(),
            'item_count' => $quantity,
            'product' => [
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'price' => $product->get_price(),
                'sku' => $product->get_sku()
            ]
        ];
        
        return new WP_REST_Response($cart_data, 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error adding item to cart: ' . $e->getMessage()], 500);
    }
}

/**
 * REST API callback for removing item from cart
 */
function voicero_remove_from_cart_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    // Get parameters
    $cart_item_key = $request->get_param('cart_item_key');
    $product_id = $request->get_param('product_id');
    $product_name = $request->get_param('product_name');
    $sku = $request->get_param('sku');
    
    if (empty($cart_item_key) && empty($product_id) && empty($product_name) && empty($sku)) {
        return new WP_REST_Response(['error' => 'Cart item key, product ID, product name, or SKU is required'], 400);
    }
    
    try {
        // Initialize WooCommerce session and cart properly
        if (is_null(WC()->session)) {
            $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
            WC()->session = new $session_class();
            WC()->session->init();
        }
        
        if (!WC()->session->has_session()) {
            WC()->session->set_customer_session_cookie(true);
        }
        
        // Initialize customer
        if (is_null(WC()->customer)) {
            WC()->customer = new WC_Customer(get_current_user_id(), true);
        }
        
        // Ensure WooCommerce cart is available
        if (is_null(WC()->cart)) {
            WC()->initialize_cart();
        }
        
        // Make sure cart is properly initialized
        WC()->cart->get_cart_from_session();
        
        $removed = false;
        $target_product_id = null;
        
        // Method 1: Remove by cart item key (preferred - most specific)
        if (!empty($cart_item_key)) {
            $removed = WC()->cart->remove_cart_item($cart_item_key);
        }
        // Method 2: Find product ID and remove
        else {
            // Find by product ID
            if (!empty($product_id)) {
                $target_product_id = $product_id;
            }
            // Find by SKU
            else if (!empty($sku)) {
                $target_product_id = wc_get_product_id_by_sku($sku);
            }
            // Find by product name
            else if (!empty($product_name)) {
                $args = array(
                    'post_type' => 'product',
                    'post_status' => 'publish',
                    'posts_per_page' => 1,
                    's' => $product_name
                );
                $products = get_posts($args);
                
                if (!empty($products)) {
                    $target_product_id = $products[0]->ID;
                }
            }
            
            // Remove all instances of the product from cart
            if ($target_product_id) {
                foreach (WC()->cart->get_cart() as $key => $cart_item) {
                    if ($cart_item['product_id'] == $target_product_id) {
                        WC()->cart->remove_cart_item($key);
                        $removed = true;
                    }
                }
            }
        }
        
        if (!$removed) {
            return new WP_REST_Response(['error' => 'Item not found in cart or could not be removed'], 404);
        }
        
        // Save cart to session
        WC()->cart->set_session();
        WC()->session->save_data();
        
        // Get updated cart data
        $cart = WC()->cart;
        $cart_data = [
            'message' => 'Item removed from cart successfully',
            'cart_total' => $cart->get_total(),
            'cart_count' => $cart->get_cart_contents_count()
        ];
        
        return new WP_REST_Response($cart_data, 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error removing item from cart: ' . $e->getMessage()], 500);
    }
}

/**
 * REST API callback for clearing entire cart
 */
function voicero_clear_cart_rest($request) {
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        return new WP_REST_Response(['error' => 'WooCommerce is not active'], 400);
    }
    
    try {
        // Initialize WooCommerce session and cart properly
        if (is_null(WC()->session)) {
            $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
            WC()->session = new $session_class();
            WC()->session->init();
        }
        
        if (!WC()->session->has_session()) {
            WC()->session->set_customer_session_cookie(true);
        }
        
        // Initialize customer
        if (is_null(WC()->customer)) {
            WC()->customer = new WC_Customer(get_current_user_id(), true);
        }
        
        // Ensure WooCommerce cart is available
        if (is_null(WC()->cart)) {
            WC()->initialize_cart();
        }
        
        // Make sure cart is properly initialized
        WC()->cart->get_cart_from_session();
        
        // Clear the entire cart
        WC()->cart->empty_cart();
        
        // Save cart to session
        WC()->cart->set_session();
        WC()->session->save_data();
        
        return new WP_REST_Response([
            'message' => 'Cart cleared successfully',
            'cart_total' => '0.00',
            'cart_count' => 0
        ], 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response(['error' => 'Error clearing cart: ' . $e->getMessage()], 500);
    }
}