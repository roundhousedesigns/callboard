import Dexie, { type Table } from 'dexie';

export interface OfflineActor {
	id: string;
	firstName: string;
	lastName: string;
	syncedAt: number;
}

export interface OfflineShow {
	id: string;
	date: string;
	showTime: string;
	syncedAt: number;
}

export interface PendingSignIn {
	id?: number;
	showId: string;
	userId: string;
	createdAt: number;
}

export class CallboardDB extends Dexie {
	actors!: Table<OfflineActor>;
	shows!: Table<OfflineShow>;
	pendingSignIns!: Table<PendingSignIn>;

	constructor() {
		super('CallboardDB');
		this.version(1).stores({
			actors: 'id, lastName, syncedAt',
			shows: 'id, date, syncedAt',
			pendingSignIns: '++id, showId, userId, createdAt',
		});
	}
}

export const db = new CallboardDB();
