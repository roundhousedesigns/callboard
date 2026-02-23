import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Button } from '../../components/ui';

export function AdminLayout() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [hasActiveShow, setHasActiveShow] = useState(false);

	async function handleLogout() {
		await logout();
		navigate('/login');
	}

	useEffect(() => {
		let cancelled = false;

		const check = async () => {
			try {
				await api.get('/shows/active');
				if (!cancelled) setHasActiveShow(true);
			} catch (err) {
				if (!cancelled) setHasActiveShow(false);
			}
		};

		void check();

		const interval = window.setInterval(() => {
			if (document.visibilityState === 'visible') {
				void check();
			}
		}, 30000);

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				void check();
			}
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			cancelled = true;
			window.clearInterval(interval);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, []);

	return (
		<div className="app-shell">
			<header className="no-print app-header">
				<div className="container app-header__inner">
					<nav className="app-nav" aria-label="Admin">
						<NavLink
							to="/admin"
							end
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Callboard
						</NavLink>
						<NavLink
							to="/admin/shows"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Shows
						</NavLink>
						<NavLink
							to="/admin/actors"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Actors
						</NavLink>
						<NavLink
							to="/admin/offline"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Offline
						</NavLink>
						<NavLink
							to="/admin/settings"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Settings
						</NavLink>
						{hasActiveShow && (
							<NavLink to="/admin/current-show">
								Current show
							</NavLink>
						)}
						<span className="badge">
							{user?.organization?.showTitle ?? user?.organization?.name ?? 'Admin'}
						</span>
					</nav>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
						<Button
							size="sm"
							variant="ghost"
							onPress={() => {
								void handleLogout();
							}}
						>
							Log out
						</Button>
					</div>
				</div>
			</header>
			<main className="app-main">
				<div className="container">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
