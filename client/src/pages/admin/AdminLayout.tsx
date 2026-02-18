import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

function QRCodeIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<rect x="3" y="3" width="7" height="7" rx="1" />
			<rect x="14" y="3" width="7" height="7" rx="1" />
			<rect x="3" y="14" width="7" height="7" rx="1" />
			<rect x="14" y="14" width="3" height="3" rx="0.5" />
			<rect x="19" y="14" width="2" height="2" rx="0.5" />
			<rect x="14" y="19" width="2" height="2" rx="0.5" />
		</svg>
	);
}

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
						{user?.organization?.showTitle && (
							<NavLink
								to="/admin/qr"
								className={({ isActive }) => `nav-link nav-link--icon nav-link--qr${isActive ? ' active' : ''}`}
								aria-label="Current QR code"
								title="Current QR code"
							>
								<QRCodeIcon />
							</NavLink>
						)}
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
