<?php
/**
 * Registration of user meta fields.
 *
 * @package Callboard
 * @subpackage Callboard/includes
 *
 * @since 0.0.2
 */

/**
 * Sets up custom data for Users.
 *
 * @package Callboard
 * @subpackage Callboard/includes
 *
 * @since 0.0.2
 */
class Callboard_Users {
	/**
	 * Create the custom Company Member role, cloning the `subscriber` role's capabilities.
	 *
	 * @since 0.0.2
	 */
	public function add_company_member_role() {
		$subscriber = get_role( 'subscriber' );
		add_role( 'company_member', __( 'Company Member', 'callboard' ), $subscriber->capabilities );
	}

	/**
	 * Remove the Company Member role.
	 *
	 * @return void
	 */
	public static function remove_company_member_role() {
		remove_role( 'company_member' );
	}

	/**
	 * Add new fields above 'Update' button.
	 *
	 * @since 0.0.2
	 *
	 * @param WP_User $user User object.
	 */
	public function callboard_user_fields( $user ) {
		$role   = get_the_author_meta( 'callboard-role', $user->ID );
		$active = get_the_author_meta( 'callboard-active', $user->ID );

		wp_nonce_field( 'custom_user_fields', 'custom_user_fields_nonce', false );

		printf(
			'<h3>%1$s</h3>
			<p><strong>%2$s</strong></p>
			<table class="form-table">
				<tr>
					<th><label for="callboard-role">%3$s</label></th>
					<td>
						<input type="text" id="callboard-role" name="callboard-role" value="%4$s" />
					</td>
				</tr>
				<tr>
					<th><label for="callboard-active">%5$s</label></th>
					<td>
						<input type="checkbox" id="callboard-active" name="callboard-active" value=1 %6$s />
					</td>
				</tr>
			</table>',
			esc_html__( 'Callboard Data', 'callboard' ),
			esc_html__( 'Please do not edit this directly.', 'callboard' ),
			esc_html__( 'Role', 'callboard' ),
			esc_textarea( $role ),
			esc_html__( 'Active', 'callboard' ),
			checked( $active, true, false )
		);
	}

	/**
	 * Save additional profile fields.
	 *
	 * @since 0.0.2
	 *
	 * @param int $user_id Current user ID.
	 */
	public function save_callboard_user_fields( $user_id ) {
		if ( ! current_user_can( 'edit_user', $user_id ) || ! isset( $_POST['custom_user_fields_nonce'] ) || ! wp_verify_nonce( $_POST['custom_user_fields_nonce'], 'custom_user_fields' ) ) {
			return false;
		}

		if ( isset( $_POST['callboard-role'] ) ) {
			if ( empty( $_POST['callboard-role'] ) ) {
				delete_user_meta( $user_id, 'callboard-role' );
			}

			update_user_meta( $user_id, 'callboard-role', wp_strip_all_tags( wp_unslash( $_POST['callboard-role'] ) ) );
		}

		if ( ! isset( $_POST['callboard-active'] ) ) {
			delete_user_meta( $user_id, 'callboard-active' );
		} else {
			update_user_meta( $user_id, 'callboard-active', wp_strip_all_tags( wp_unslash( $_POST['callboard-active'] ) ) );
		}
	}
}
