import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export function AdminLayout() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	async function handleLogout() {
		await logout();
		navigate('/login');
	}

	return (
		<div className="app-shell">
			<header
				className="no-print app-header"
			>
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
							to="/admin/actors"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Actors
						</NavLink>
						<NavLink
							to="/admin/shows"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Shows
						</NavLink>
						<NavLink
							to="/admin/qr"
							className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
						>
							Current QR
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
					</nav>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
						<span className="badge">
							{user?.organization?.showTitle ?? user?.organization?.name ?? 'Admin'}
						</span>
						<button className="btn btn--sm btn--ghost" onClick={handleLogout}>
							Log out
						</button>
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
