/**
 * Classes.
 */

/**
 * @modle Show
 *
 * @param {String} id Unique.
 * @param {Date} datetime Performance date and time.
 * @param {Object} attendance A collection of status strings, keyed by performerId.
 * @param {String} notes Show notes to display.
 */
export const Show = class {
	constructor(id = 0, datetime = new Date(), attendance = {}, notes = '') {
		this.id = id;
		this.datetime = datetime;
		this.attendance = attendance;
		this.notes = notes;
	}
};

/**
 * @module Performer
 *
 * @param {String} id Unique.
 * @param {String} name Performer's name.
 * @param {String} role Performer's role.
 */
export const Performer = class {
	constructor(id, name, role) {
		this.id = id;
		this.name = name;
		this.role = role;
	}
};
