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
		<div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			<header
				className="no-print"
				style={{
					padding: '0.75rem 1.5rem',
					borderBottom: '1px solid var(--border)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					flexWrap: 'wrap',
					gap: '1rem',
				}}
			>
				<nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
					<NavLink
						to="/admin"
						end
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Callboard
					</NavLink>
					<NavLink
						to="/admin/actors"
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Actors
					</NavLink>
					<NavLink
						to="/admin/shows"
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Shows
					</NavLink>
					<NavLink
						to="/admin/qr"
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Current QR
					</NavLink>
					<NavLink
						to="/admin/import"
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Import
					</NavLink>
					<NavLink
						to="/admin/reports"
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Reports
					</NavLink>
					<NavLink
						to="/admin/offline"
						style={({ isActive }) => ({
							fontWeight: isActive ? 600 : 400,
							color: isActive ? 'var(--accent)' : 'var(--text)',
						})}
					>
						Offline
					</NavLink>
				</nav>
				<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
					<span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
						{user?.organization?.name ?? 'Admin'}
					</span>
					<button onClick={handleLogout}>Log out</button>
				</div>
			</header>
			<main style={{ flex: 1, padding: '1.5rem' }}>
				<Outlet />
			</main>
		</div>
	);
}
