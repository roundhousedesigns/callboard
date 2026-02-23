import { useCallback } from 'react';
import { api } from '../lib/api';
import { CurrentShowCallboard, type CurrentShowCallboardData } from './CurrentShowCallboard';

export function ActiveShowCallboard({
	heading,
}: {
	heading?: React.ReactNode;
}) {
	const load = useCallback(
		() => api.get<CurrentShowCallboardData>('/actor/callboard/active'),
		[],
	);

	return <CurrentShowCallboard heading={heading} readOnly load={load} />;
}

