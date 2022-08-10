<?php
/**
 * Registration of user meta fields.
 *
 * @package Callboard
 */

/**
 * Sets up custom data for Users.
 */
class Callboard_Users extends Callboard {
	/**
	 * Constructor.
	 */
	public function __construct() {
		register_activation_hook( CALLBOARD_CORE, [$this, 'add_company_member_role'] );

		add_action( 'user_new_form', [$this, 'callboard_user_fields'] );
		add_action( 'show_user_profile', [$this, 'callboard_user_fields'] );
		add_action( 'edit_user_profile', [$this, 'callboard_user_fields'] );
		add_action( 'user_register', [$this, 'save_callboard_user_fields'] );
		add_action( 'personal_options_update', [$this, 'save_callboard_user_fields'] );
		add_action( 'edit_user_profile_update', [$this, 'save_callboard_user_fields'] );
	}

	/**
	 * Create the custom Company Member role, cloning the `subscriber` role's capabilities.
	 */
	public function add_company_member_role() {
		$subscriber = get_role( 'subscriber' );
		add_role( 'company_member', __( 'Company Member', 'callboard' ), $subscriber->capabilities );
	}

	/**
	 * Add new fields above 'Update' button.
	 *
	 * @param WP_User $user User object.
	 */
	public function callboard_user_fields( $user ) {
		$callboard_role = 'object' === gettype( $user ) ? get_the_author_meta( 'callboard-role', $user->ID ) : '';

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
			</table>',
			esc_html__( 'Callboard Data', 'callboard' ),
			esc_html__( 'Please do not edit this directly.', 'callboard' ),
			esc_html__( 'Role', 'callboard' ),
			esc_textarea( $callboard_role )
		);
	}

	/**
	 * Save additional profile fields.
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
	}
}

$graphql = new Callboard_Users();
