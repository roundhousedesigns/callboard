import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { CallboardPage } from './pages/admin/CallboardPage';
import { ActorsPage } from './pages/admin/ActorsPage';
import { ShowsPage } from './pages/admin/ShowsPage';
import { QRDisplayPage } from './pages/admin/QRDisplayPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { OfflinePrintSheetPage } from './pages/admin/OfflinePrintSheetPage';
import { ManualEntryPage } from './pages/admin/ManualEntryPage';
import { CalendarImportPage } from './pages/admin/CalendarImportPage';
import { PastShowSheetPage } from './pages/admin/PastShowSheetPage';
import { SignInLandingPage } from './pages/actor/SignInLandingPage';
import { ActorHomePage } from './pages/actor/ActorHomePage';

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	if (user.role !== 'admin') return <Navigate to="/actor" replace />;
	return <>{children}</>;
}

function HomeRedirect() {
	const { user, loading } = useAuth();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	if (user.role === 'admin') return <Navigate to="/admin" replace />;
	return <Navigate to="/actor" replace />;
}

function ProtectedActor({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
	if (!user) return <Navigate to="/login" replace />;
	if (user.role !== 'actor') return <Navigate to="/admin" replace />;
	return <>{children}</>;
}

export default function App() {
	return (
		<Routes>
			<Route path="/login" element={<LoginPage />} />
			<Route path="/s/:token" element={<SignInLandingPage />} />
			<Route
				path="/admin"
				element={
					<ProtectedAdmin>
						<AdminLayout />
					</ProtectedAdmin>
				}
			>
				<Route index element={<CallboardPage />} />
				<Route path="actors" element={<ActorsPage />} />
				<Route path="shows" element={<ShowsPage />} />
				<Route path="qr" element={<QRDisplayPage />} />
				<Route path="shows/past/:showId" element={<PastShowSheetPage />} />
				<Route path="import" element={<CalendarImportPage />} />
				<Route path="reports" element={<ReportsPage />} />
				<Route path="offline" element={<OfflinePrintSheetPage />} />
				<Route path="manual-entry" element={<ManualEntryPage />} />
			</Route>
			<Route
				path="/actor"
				element={
					<ProtectedActor>
						<ActorHomePage />
					</ProtectedActor>
				}
			/>
			<Route path="/" element={<HomeRedirect />} />
			<Route path="*" element={<Navigate to="/" replace />} />
		</Routes>
	);
}
