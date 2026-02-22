import { useAuth } from '../../lib/auth';
import { ActiveShowCallboard } from '../../components/ActiveShowCallboard';

export function ActorCallboardPage() {
	const { user } = useAuth();

	const displayTitle =
		user?.organization?.showTitle ?? user?.organization?.name ?? 'Callboard';

	return (
		<div style={{ padding: '1.25rem' }}>
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Callboard</p>
				</div>
			</div>
			<ActiveShowCallboard />
		</div>
	);
}

