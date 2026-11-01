<?php
/**
 * Plugin Name:       doorbell.life
 * Plugin URI:        https://doorbell.life/
 * Description:       讓 404 頁與維護模式頁顯示失蹤協尋、捐血、待認養動物等公益資訊。不改變狀態碼、不轉址、不追蹤訪客。
 * Version:           0.1.0
 * Requires at least: 6.3
 * Requires PHP:      7.4
 * Author:            doorbell.life contributors
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       doorbell-life
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const DOORBELL_LIFE_WIDGET  = 'https://cdn.doorbell.life/widget.js';
const DOORBELL_LIFE_OPTION  = 'doorbell_life_options';
const DOORBELL_LIFE_MARKER  = 'doorbell-life-maintenance';
const DOORBELL_LIFE_TOPICS  = array( 'missing-elders', 'missing-children', 'missing-adults', 'blood', 'animals-lost', 'animals-adopt', 'stats' );
const DOORBELL_LIFE_LANGS   = array( '', 'zh-TW', 'en' );
const DOORBELL_LIFE_REGIONS = array( '', 'taiwan' );

/** 讀設定，並只留下白名單內的值。 */
function doorbell_life_options() {
	$o = get_option( DOORBELL_LIFE_OPTION, array() );
	return doorbell_life_sanitize( is_array( $o ) ? $o : array() );
}

function doorbell_life_sanitize( $in ) {
	$lang   = isset( $in['lang'] ) ? (string) $in['lang'] : '';
	$region = isset( $in['region'] ) ? (string) $in['region'] : '';
	$topics = isset( $in['topics'] ) && is_array( $in['topics'] ) ? array_values( array_intersect( DOORBELL_LIFE_TOPICS, $in['topics'] ) ) : array();
	return array(
		'lang'   => in_array( $lang, DOORBELL_LIFE_LANGS, true ) ? $lang : '',
		'region' => in_array( $region, DOORBELL_LIFE_REGIONS, true ) ? $region : '',
		'topics' => $topics,
	);
}

/** 元件 script 的 data 屬性。 */
function doorbell_life_attrs( $status ) {
	$o     = doorbell_life_options();
	$attrs = array( 'data-status' => (string) (int) $status );
	if ( $o['lang'] ) {
		$attrs['data-lang'] = $o['lang'];
	}
	if ( $o['region'] ) {
		$attrs['data-region'] = $o['region'];
	}
	if ( $o['topics'] ) {
		$attrs['data-topics'] = implode( ',', $o['topics'] );
	}
	return $attrs;
}

// 404：只在 404 頁載入元件。狀態碼由 WordPress 照常設定，外掛不改。
add_action(
	'wp_enqueue_scripts',
	function () {
		if ( is_404() ) {
			wp_enqueue_script( 'doorbell-life', DOORBELL_LIFE_WIDGET, array(), null, array( 'strategy' => 'async', 'in_footer' => true ) );
		}
	}
);

add_filter(
	'script_loader_tag',
	function ( $tag, $handle ) {
		if ( 'doorbell-life' !== $handle ) {
			return $tag;
		}
		$extra = '';
		foreach ( doorbell_life_attrs( 404 ) as $k => $v ) {
			$extra .= ' ' . $k . '="' . esc_attr( $v ) . '"';
		}
		return str_replace( ' src=', $extra . ' src=', $tag );
	},
	10,
	2
);

/** 維護模式頁（wp-content/maintenance.php）內容：回 503，載入等待輪播元件。 */
function doorbell_life_maintenance_php() {
	$attrs = '';
	foreach ( doorbell_life_attrs( 503 ) as $k => $v ) {
		$attrs .= ' ' . $k . '="' . esc_attr( $v ) . '"';
	}
	$title = esc_html__( '網站維護中，請稍後再來。', 'doorbell-life' );
	return "<?php\n// " . DOORBELL_LIFE_MARKER . "：由 doorbell.life 外掛產生，停用或刪除外掛時會一併移除。\n"
		. "http_response_code( 503 );\nheader( 'Retry-After: 600' );\nheader( 'Content-Type: text/html; charset=utf-8' );\n?>\n"
		. "<!doctype html>\n<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>503</title>"
		. "<style>body{margin:0;font:400 24px/1.6 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;background:#f5f6f8;color:#1e2030}main{max-width:720px;margin:0 auto;padding:48px 16px}</style>"
		. "</head><body><main><h1>{$title}</h1>\n<script src=\"" . DOORBELL_LIFE_WIDGET . "\" async data-retry=\"600\"{$attrs}></script></main></body></html>\n";
}

function doorbell_life_maintenance_path() {
	return WP_CONTENT_DIR . '/maintenance.php';
}

/** 只處理自己產生的維護頁，不動別人的。 */
function doorbell_life_maintenance_is_ours() {
	$p = doorbell_life_maintenance_path();
	return file_exists( $p ) && false !== strpos( (string) file_get_contents( $p ), DOORBELL_LIFE_MARKER ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
}

function doorbell_life_filesystem() {
	global $wp_filesystem;
	require_once ABSPATH . 'wp-admin/includes/file.php';
	WP_Filesystem();
	return $wp_filesystem;
}

function doorbell_life_maintenance_install() {
	$p = doorbell_life_maintenance_path();
	if ( file_exists( $p ) && ! doorbell_life_maintenance_is_ours() ) {
		return new WP_Error( 'exists', __( 'wp-content/maintenance.php 已存在且不是本外掛產生的，沒有覆蓋。', 'doorbell-life' ) );
	}
	$fs = doorbell_life_filesystem();
	return $fs && $fs->put_contents( $p, doorbell_life_maintenance_php(), FS_CHMOD_FILE ) ? true : new WP_Error( 'write', __( '無法寫入 wp-content/maintenance.php。', 'doorbell-life' ) );
}

function doorbell_life_maintenance_remove() {
	if ( doorbell_life_maintenance_is_ours() ) {
		$fs = doorbell_life_filesystem();
		if ( $fs ) {
			$fs->delete( doorbell_life_maintenance_path() );
		}
	}
}

register_deactivation_hook( __FILE__, 'doorbell_life_maintenance_remove' );

// 後台設定頁：設定 → doorbell.life
add_action(
	'admin_menu',
	function () {
		add_options_page( 'doorbell.life', 'doorbell.life', 'manage_options', 'doorbell-life', 'doorbell_life_settings_page' );
	}
);

add_action(
	'admin_init',
	function () {
		register_setting( 'doorbell_life', DOORBELL_LIFE_OPTION, array( 'sanitize_callback' => 'doorbell_life_sanitize' ) );
	}
);

// 設定變更時，若維護頁是本外掛產生的，跟著更新。
add_action(
	'update_option_' . DOORBELL_LIFE_OPTION,
	function () {
		if ( doorbell_life_maintenance_is_ours() ) {
			doorbell_life_maintenance_install();
		}
	}
);

add_action(
	'admin_post_doorbell_life_maintenance',
	function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( '權限不足。', 'doorbell-life' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'doorbell_life_maintenance' );
		$do  = isset( $_POST['do'] ) ? sanitize_key( wp_unslash( $_POST['do'] ) ) : '';
		$res = true;
		if ( 'install' === $do ) {
			$res = doorbell_life_maintenance_install();
		} elseif ( 'remove' === $do ) {
			doorbell_life_maintenance_remove();
		}
		$msg = is_wp_error( $res ) ? $res->get_error_code() : 'ok';
		wp_safe_redirect( add_query_arg( array( 'page' => 'doorbell-life', 'dbl' => $msg ), admin_url( 'options-general.php' ) ) );
		exit;
	}
);

function doorbell_life_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$o     = doorbell_life_options();
	$names = array(
		'missing-elders'   => __( '失智走失長者', 'doorbell-life' ),
		'missing-children' => __( '失蹤兒少', 'doorbell-life' ),
		'missing-adults'   => __( '失蹤成人', 'doorbell-life' ),
		'blood'            => __( '捐血', 'doorbell-life' ),
		'animals-lost'     => __( '走失毛孩', 'doorbell-life' ),
		'animals-adopt'    => __( '待認養動物', 'doorbell-life' ),
		'stats'            => __( '宣導數字', 'doorbell-life' ),
	);
	$n     = DOORBELL_LIFE_OPTION;
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- 只用來顯示結果訊息
	$flash = isset( $_GET['dbl'] ) ? sanitize_key( wp_unslash( $_GET['dbl'] ) ) : '';
	?>
	<div class="wrap">
		<h1>doorbell.life</h1>
		<?php if ( 'ok' === $flash ) : ?>
			<div class="notice notice-success"><p><?php esc_html_e( '已更新維護頁。', 'doorbell-life' ); ?></p></div>
		<?php elseif ( $flash ) : ?>
			<div class="notice notice-error"><p><?php echo 'exists' === $flash ? esc_html__( 'wp-content/maintenance.php 已存在且不是本外掛產生的，沒有覆蓋。', 'doorbell-life' ) : esc_html__( '無法寫入 wp-content/maintenance.php。', 'doorbell-life' ); ?></p></div>
		<?php endif; ?>
		<p><?php esc_html_e( '404 頁會顯示公益資訊卡片。狀態碼維持不變，不設 cookie、不追蹤訪客。', 'doorbell-life' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'doorbell_life' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="dbl-lang"><?php esc_html_e( '介面語言', 'doorbell-life' ); ?></label></th>
					<td><select id="dbl-lang" name="<?php echo esc_attr( $n ); ?>[lang]">
						<option value="" <?php selected( $o['lang'], '' ); ?>><?php esc_html_e( '自動（跟著網站與瀏覽器）', 'doorbell-life' ); ?></option>
						<option value="zh-TW" <?php selected( $o['lang'], 'zh-TW' ); ?>>繁體中文</option>
						<option value="en" <?php selected( $o['lang'], 'en' ); ?>>English</option>
					</select></td>
				</tr>
				<tr>
					<th scope="row"><label for="dbl-region"><?php esc_html_e( '地區', 'doorbell-life' ); ?></label></th>
					<td><select id="dbl-region" name="<?php echo esc_attr( $n ); ?>[region]">
						<option value="" <?php selected( $o['region'], '' ); ?>><?php esc_html_e( '自動（依訪客時區）', 'doorbell-life' ); ?></option>
						<option value="taiwan" <?php selected( $o['region'], 'taiwan' ); ?>><?php esc_html_e( '台灣', 'doorbell-life' ); ?></option>
					</select></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( '議題', 'doorbell-life' ); ?></th>
					<td><fieldset>
						<p class="description"><?php esc_html_e( '都不勾表示全部播放。', 'doorbell-life' ); ?></p>
						<?php foreach ( $names as $k => $label ) : ?>
							<label><input type="checkbox" name="<?php echo esc_attr( $n ); ?>[topics][]" value="<?php echo esc_attr( $k ); ?>" <?php checked( in_array( $k, $o['topics'], true ) ); ?>> <?php echo esc_html( $label ); ?></label><br>
						<?php endforeach; ?>
					</fieldset></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<h2><?php esc_html_e( '維護模式頁', 'doorbell-life' ); ?></h2>
		<p><?php esc_html_e( 'WordPress 更新時會顯示維護頁（503）。可以換成會顯示公益資訊輪播的版本，停用外掛時自動移除。', 'doorbell-life' ); ?></p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="doorbell_life_maintenance">
			<?php wp_nonce_field( 'doorbell_life_maintenance' ); ?>
			<?php if ( doorbell_life_maintenance_is_ours() ) : ?>
				<button class="button" name="do" value="remove"><?php esc_html_e( '移除維護頁', 'doorbell-life' ); ?></button>
			<?php else : ?>
				<button class="button" name="do" value="install"><?php esc_html_e( '安裝維護頁', 'doorbell-life' ); ?></button>
			<?php endif; ?>
		</form>
	</div>
	<?php
}
