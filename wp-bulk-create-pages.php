<?php
/*
Plugin Name: Bulk Create Pages
Description: Upload a CSV of external website URI's and convert to wordpress pages/posts by specifying content selectors.
Author: Justin Roy
Version: 1
*/

// Create Admin Menu Item Under Tools
add_action('admin_menu', 'create_tools_submenu');
function create_tools_submenu() {
    add_management_page( 'Content Creator', 'Bulk Create Pages', 'manage_options', 'content-creator', 'generate_page_content' );
}
function generate_page_content() {
    require_once 'view/home.php';

    wp_enqueue_style('content-move-style', plugin_dir_url(__FILE__) . 'css/style.css');
    wp_enqueue_script( 'papa-parse', plugins_url( '/js/papaparse.min.js', __FILE__ ), array('jquery') );
    wp_enqueue_script( 'ajax-script', plugins_url( '/js/main.js', __FILE__ ), array('jquery') );
	wp_localize_script( 'ajax-script', 'ajax_object',
        array(
            'ajax_url' => admin_url( 'admin-ajax.php' ),
            'siteURL' => get_site_url(),
            'nonce' => wp_create_nonce('wp_rest'),
            'pluginURL' => plugin_dir_url(__FILE__),
        )
    );
}

function getHeaders($response){
    $headers = array();
    $header_text = substr($response, 0, strpos($response, "\r\n\r\n"));
    foreach (explode("\r\n", $header_text) as $i => $line)
        if ($i === 0)
        $headers['http_code'] = $line;
    else {
        list($key, $value) = explode(': ', $line);
        $headers[$key] = $value;
    }
    return $headers;
}


add_action( 'wp_ajax_get_url_contents', 'get_url_contents' );
function get_url_contents() {
    if ( isset($_REQUEST) ) {
        $url_to_process = $_REQUEST['url_to_process'];
        if ( !empty($url_to_process) ) {
            // $html = file_get_contents($url_to_process);
            //echo $html;
            $ch = curl_init();
            $curlConfig = array(
                CURLOPT_URL            => $url_to_process,
                CURLOPT_POST           => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_VERBOSE => 1,
                CURLOPT_HEADER => 1,
                CURLOPT_FAILONERROR  =>true,
                CURLOPT_TIMEOUT => 0,
            );
            curl_setopt_array($ch, $curlConfig);
            $response = curl_exec($ch);
            
            // Then, after your curl_exec call:
            $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $headers = getHeaders($response);
            $body = substr($response, $header_size);

            if (curl_error($ch)) {
                $error_msg = curl_error($ch);
            }

            //die(print_r($headers, 1));

            curl_close($ch);
            $data = json_decode($body);

            if (isset($error_msg)) {
                echo json_encode(array(
                    'error' => true,
                    'curl_error' => $error_msg,
                    'headers' => $headers
                ));
            } else {
                echo json_encode(array('html' => $body));
            }
        }
    }
  wp_die();
}


add_action( 'wp_ajax_add_yoast_content', 'add_yoast_content' );
function add_yoast_content() {
    if ( isset($_REQUEST) ) {
        $YoastPostID = $_REQUEST['YoastPostID'];
        $YoastPost_title = $_REQUEST['YoastPost_title'];
        $YoastPost_desc = $_REQUEST['YoastPost_desc'];
        $YoastPost_keywords = $_REQUEST['YoastPost_keywords'];
        if ( !empty($YoastPostID) ) {
            function add_to_yoast_seo($post_id, $metatitle, $metadesc, $metakeywords){
                $ret = false;
                // Include plugin library to check if Yoast Seo is presently active
                include_once( ABSPATH.'panel/includes/plugin.php' );
                if ( defined('WPSEO_VERSION') ) {
                    // plugin is activated
                    $updated_title = update_post_meta($post_id, '_yoast_wpseo_title', $metatitle);
                    $updated_desc = update_post_meta($post_id, '_yoast_wpseo_metadesc', $metadesc);
                    $updated_kw = update_post_meta($post_id, '_yoast_wpseo_metakeywords', $metakeywords);
                    if($updated_title && $updated_desc && $updated_kw){
                        $ret = true;
                    }
                }
                return $ret;
            }
            $seo_updated = add_to_yoast_seo(
                $YoastPostID,
                $YoastPost_title,
                $YoastPost_desc,
                $YoastPost_keywords
            );
        }
    }
   die();
}
