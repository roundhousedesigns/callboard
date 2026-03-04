import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth, hasAdminAccess, hasActorAccess } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { CallboardPage } from './pages/admin/CallboardPage';
import { CurrentShowPage } from './pages/admin/CurrentShowPage';
import { ActorsPage } from './pages/admin/ActorsPage';
import { ShowsPage } from './pages/admin/ShowsPage';
import { QRDisplayPage } from './pages/admin/QRDisplayPage';
import { OfflinePrintSheetPage } from './pages/admin/OfflinePrintSheetPage';
import { ManualEntryPage } from './pages/admin/ManualEntryPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { PastShowSheetPage } from './pages/admin/PastShowSheetPage';
import { SignInLandingPage } from './pages/actor/SignInLandingPage';
import { ActorCallboardPage } from './pages/actor/ActorCallboardPage';

function ProtectedAccount({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	return <>{children}</>;
}

function ProtectedOrgAdmin({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const { orgSlug } = useParams<{ orgSlug: string }>();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	if (!orgSlug || !hasAdminAccess(user, orgSlug)) {
		return <Navigate to="/account" replace />;
	}
	return <>{children}</>;
}

function ProtectedOrgActor({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const { orgSlug } = useParams<{ orgSlug: string }>();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	if (!orgSlug || !hasActorAccess(user, orgSlug)) {
		return <Navigate to="/account" replace />;
	}
	return <>{children}</>;
}

function HomeRedirect() {
	const { user, loading } = useAuth();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	return <Navigate to="/account" replace />;
}

export default function App() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route path="/s/:token" element={<SignInLandingPage />} />
			<Route
				path="/account"
				element={
					<ProtectedAccount>
						<AccountPage />
					</ProtectedAccount>
				}
			/>
			<Route
				path="/admin/:orgSlug"
				element={
					<ProtectedOrgAdmin>
						<AdminLayout />
					</ProtectedOrgAdmin>
				}
			>
				<Route index element={<CallboardPage />} />
				<Route path="current-show" element={<CurrentShowPage />} />
				<Route path="actors" element={<ActorsPage />} />
				<Route path="shows" element={<ShowsPage />} />
				<Route path="qr" element={<QRDisplayPage />} />
				<Route path="shows/past/:showId" element={<PastShowSheetPage />} />
				<Route path="offline" element={<OfflinePrintSheetPage />} />
				<Route path="manual-entry" element={<ManualEntryPage />} />
				<Route path="settings" element={<SettingsPage />} />
			</Route>
			<Route
				path="/actor/:orgSlug"
				element={
					<ProtectedOrgActor>
						<ActorCallboardPage />
					</ProtectedOrgActor>
				}
			/>
			<Route path="/" element={<HomeRedirect />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
