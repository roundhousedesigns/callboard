/**
 * Classes for standardized data types.
 */
import { showLabel } from './functions';
import { adminRoles } from 'context/AuthContext';

/**
 * @module Show
 *
 * @param {String} id Unique.
 * @param {String} datetime Performance date and time.
 * @param {Object} attendance A collection of status strings, keyed by CompanyMember ID.
 * @param {String} notes Show notes to display.
 */
export const Show = class {
	constructor(id = '', datetime = '', attendance = {}, notes = '') {
		this.id = id;
		this.datetime = datetime;
		this.attendance = attendance;
		this.notes = notes;
		this.label = showLabel(datetime);
	}
};

/**
 * @module CompanyMember
 *
 * @param {String} id Unique.
 * @param {String} firstName
 * @param {String} lastName
 * @param {String} role Public/visible role.
 */
export const CompanyMember = class {
	constructor(id = '', firstName = '', lastName = '', role = '') {
		this.id = id;
		this.firstName = firstName;
		this.lastName = lastName;
		this.role = role;
	}
};

/**
 * @module User Represents the current logged-in user.
 *
 * @param {String} userId Unique.
 * @param {String} roles WP user roles.
 */
export const User = class {
	constructor(userId = '', roles = '') {
		this.id = userId;
		this.roles = roles.split('c');
		this.isAdmin = this.setIsAdmin();
	}

	setIsAdmin() {
		return this.roles.some((item) => adminRoles.indexOf(item) >= 0);
	}
};
