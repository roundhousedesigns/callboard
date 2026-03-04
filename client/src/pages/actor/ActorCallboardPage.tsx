import { useParams, Link } from 'react-router-dom';
import { useAuth, getMembership } from '../../lib/auth';
import { ActiveShowCallboard } from '../../components/ActiveShowCallboard';

export function ActorCallboardPage() {
	const { orgSlug } = useParams<{ orgSlug: string }>();
	const { user } = useAuth();
	const membership = orgSlug ? getMembership(user, orgSlug) : undefined;

	const displayTitle =
		membership?.organization?.showTitle ?? membership?.organization?.name ?? 'Callboard';

	return (
		<div className="page-content">
			<div className="page-header">
				<div>
					<h1 className="page-title">{displayTitle}</h1>
					<p className="page-subtitle">Callboard</p>
				</div>
				<div className="no-print">
					<Link to="/account" className="btn btn--sm btn--ghost">
						Account
					</Link>
				</div>
			</div>
			{orgSlug && <ActiveShowCallboard orgSlug={orgSlug} />}
		</div>
	);
}
