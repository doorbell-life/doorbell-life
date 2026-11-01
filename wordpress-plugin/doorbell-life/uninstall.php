<?php
// 刪除外掛時清掉設定。維護頁已在停用時移除。
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'doorbell_life_options' );
