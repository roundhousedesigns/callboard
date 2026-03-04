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
	const organization = membership?.organization;
	const orgName = organization ? (organization.showTitle ?? organization.name) : 'Admin';

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
	const closeMenu = () => setIsMobileMenuOpen(false);

	return (
		<div className={`app-shell app-shell--admin${isMobileMenuOpen ? ' sidebar-open' : ''}`}>
			<div className="app-admin-layout">
				<aside
					id="admin-nav"
					className="app-sidebar no-print"
					aria-label="Admin"
				>
					<div className="app-sidebar__brand">
						<div>
							<p className="app-sidebar__title">Organization</p>
							<p className="app-sidebar__subtitle">{orgName}</p>
						</div>
						<button
							type="button"
							className="app-sidebar-toggle"
							aria-label="Close menu"
							onClick={closeMenu}
						>
							✕
						</button>
					</div>
					<nav className="app-sidebar__nav">
						<NavLink to={base} end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
							Callboard
						</NavLink>
						<NavLink to={`${base}/shows`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
							Shows
						</NavLink>
						<NavLink to={`${base}/actors`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
							Actors
						</NavLink>
						<NavLink to={`${base}/offline`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
							Offline
						</NavLink>
						<NavLink to={`${base}/settings`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
							Show Settings
						</NavLink>
						<NavLink to={`${base}/qr`} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
							QR
						</NavLink>
						{hasActiveShow && (
							<NavLink
								to={`${base}/current-show`}
								className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
								onClick={closeMenu}
							>
								Current show
							</NavLink>
						)}
					</nav>
					<div className="app-sidebar__footer">
						<nav className="app-sidebar__footer-nav" aria-label="Account">
							<NavLink to="/account" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={closeMenu}>
								Account
							</NavLink>
						</nav>
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
				</aside>
				<button
					type="button"
					className="app-sidebar-backdrop no-print"
					aria-label="Close sidebar"
					onClick={closeMenu}
				/>
				<main className="app-main app-main--admin">
					<div className="container container--admin app-main__inner">
						<div className="app-main-mobilebar no-print">
							<button
								type="button"
								className="app-sidebar-toggle"
								aria-expanded={isMobileMenuOpen}
								aria-controls="admin-nav"
								onClick={() => setIsMobileMenuOpen((prev) => !prev)}
							>
								<span aria-hidden>{isMobileMenuOpen ? '✕' : '☰'}</span>
								<span>Menu</span>
							</button>
							<span className="badge app-main-mobilebar__org" title={orgName}>{orgName}</span>
						</div>
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
