import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from './api';

export interface User {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: 'admin' | 'actor';
	organizationId: string;
	organization?: {
		name: string;
		slug: string;
		showTitle?: string | null;
		weekStartsOn?: number | null;
	};
}

interface AuthContextValue {
	user: User | null;
	loading: boolean;
	login: (email: string, password: string) => Promise<User>;
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		try {
			const u = await api.get<User>('/auth/me');
			setUser(u);
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const login = useCallback(async (email: string, password: string) => {
		const u = await api.post<{ user: User }>('/auth/login', { email, password });
		setUser(u.user);
		return u.user;
	}, []);

	const logout = useCallback(async () => {
		await api.post('/auth/logout');
		setUser(null);
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}
