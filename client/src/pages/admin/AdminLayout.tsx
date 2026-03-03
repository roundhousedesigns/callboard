import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { Button } from '../../components/ui';

export function AdminLayout() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [hasActiveShow, setHasActiveShow] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [location.pathname]);

	async function handleLogout() {
		await logout();
		navigate('/login');
	}

	useEffect(() => {
		let cancelled = false;

		const check = async () => {
			try {
				const show = await api.get<{ id: string } | null>('/shows/active');
				if (!cancelled) setHasActiveShow(Boolean(show));
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
					<button
						type="button"
						className="app-nav-toggle"
						aria-expanded={isMobileMenuOpen}
						aria-controls="admin-nav"
						onClick={() => {
							setIsMobileMenuOpen((prev) => !prev);
						}}
					>
						<span aria-hidden>{isMobileMenuOpen ? '✕' : '☰'}</span>
						<span>Menu</span>
					</button>
					<nav
						id="admin-nav"
						className={`app-nav${isMobileMenuOpen ? ' is-open' : ''}`}
						aria-label="Admin"
						onClick={(event) => {
							const target = event.target as HTMLElement | null;
							if (target?.closest('a')) {
								setIsMobileMenuOpen(false);
							}
						}}
					>
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
						<NavLink
							to="/admin/qr"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							QR
						</NavLink>

						{hasActiveShow && (
							<NavLink
								to="/admin/current-show"
								className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
							>
								Current show
							</NavLink>
						)}
					</nav>
					<div className="app-header__actions">
						<span className="badge">
							{user?.organization?.showTitle ?? user?.organization?.name ?? 'Admin'}
						</span>
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
