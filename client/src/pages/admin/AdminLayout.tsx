import { Outlet, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth, getMembership } from '../../lib/auth';
import { api } from '../../lib/api';
import { Button } from '../../components/ui';

export function AdminLayout() {
	const { user, logout } = useAuth();
	const { orgSlug } = useParams<{ orgSlug: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const [hasActiveShow, setHasActiveShow] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const membership = orgSlug ? getMembership(user, orgSlug) : undefined;
	const orgName = membership?.organization?.showTitle ?? membership?.organization?.name ?? 'Admin';

	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [location.pathname]);

	async function handleLogout() {
		await logout();
		navigate('/login');
	}

	useEffect(() => {
		if (!orgSlug) return;
		let cancelled = false;

		const check = async () => {
			try {
				const show = await api.org(orgSlug).get<{ id: string } | null>('/shows/active');
				if (!cancelled) setHasActiveShow(Boolean(show));
			} catch {
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
	}, [orgSlug]);

	if (!orgSlug) return null;

	const base = `/admin/${orgSlug}`;

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
							to="/account"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Account
						</NavLink>
						<NavLink
							to={base}
							end
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Callboard
						</NavLink>
						<NavLink
							to={`${base}/shows`}
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Shows
						</NavLink>
						<NavLink
							to={`${base}/actors`}
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Actors
						</NavLink>
						<NavLink
							to={`${base}/offline`}
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Offline
						</NavLink>
						<NavLink
							to={`${base}/settings`}
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Settings
						</NavLink>
						<NavLink
							to={`${base}/qr`}
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							QR
						</NavLink>

						{hasActiveShow && (
							<NavLink
								to={`${base}/current-show`}
								className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
							>
								Current show
							</NavLink>
						)}
					</nav>
					<div className="app-header__actions">
						<span className="badge">{orgName}</span>
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
