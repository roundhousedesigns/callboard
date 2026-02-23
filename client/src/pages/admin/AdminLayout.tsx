import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
	Alignment,
	Button,
	ButtonGroup,
	Navbar,
	NavbarDivider,
	NavbarGroup,
	NavbarHeading,
	Tag,
} from '@blueprintjs/core';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';

export function AdminLayout() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
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

	const orgLabel = user?.organization?.showTitle ?? user?.organization?.name ?? 'Admin';
	const isActive = (path: string, exact = false) =>
		exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

	return (
		<div className="app-shell">
			<Navbar className="no-print app-navbar">
				<div className="container app-navbar-inner">
					<NavbarGroup align={Alignment.LEFT}>
						<NavbarHeading>Callboard</NavbarHeading>
						<NavbarDivider />
						<ButtonGroup>
							<Button
								minimal
								text="Callboard"
								intent={isActive('/admin', true) ? 'primary' : undefined}
								onClick={() => navigate('/admin')}
							/>
							<Button
								minimal
								text="Shows"
								intent={isActive('/admin/shows') ? 'primary' : undefined}
								onClick={() => navigate('/admin/shows')}
							/>
							<Button
								minimal
								text="Actors"
								intent={isActive('/admin/actors') ? 'primary' : undefined}
								onClick={() => navigate('/admin/actors')}
							/>
							<Button
								minimal
								text="Offline"
								intent={isActive('/admin/offline') ? 'primary' : undefined}
								onClick={() => navigate('/admin/offline')}
							/>
							<Button
								minimal
								text="Settings"
								intent={isActive('/admin/settings') ? 'primary' : undefined}
								onClick={() => navigate('/admin/settings')}
							/>
							{hasActiveShow && (
								<Button
									minimal
									text="Current show"
									intent={isActive('/admin/current-show') ? 'primary' : undefined}
									onClick={() => navigate('/admin/current-show')}
								/>
							)}
						</ButtonGroup>
					</NavbarGroup>
					<NavbarGroup align={Alignment.RIGHT}>
						<Tag>{orgLabel}</Tag>
						<Button minimal text="Log out" onClick={() => void handleLogout()} />
					</NavbarGroup>
				</div>
			</Navbar>
			<main className="app-main">
				<div className="container">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
