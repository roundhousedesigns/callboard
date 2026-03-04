import { useCallback } from 'react';
import { api } from '../lib/api';
import { CurrentShowCallboard, type CurrentShowCallboardData } from './CurrentShowCallboard';

export function ActiveShowCallboard({
	orgSlug,
	heading,
}: {
	orgSlug: string;
	heading?: React.ReactNode;
}) {
	const load = useCallback(
		() => api.org(orgSlug).get<CurrentShowCallboardData>('/actor/callboard/active'),
		[orgSlug],
	);

	return <CurrentShowCallboard heading={heading} readOnly load={load} />;
}

