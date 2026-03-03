import { useEffect, useState } from 'react';

const MOBILE_PORTRAIT_QUERY = '(max-width: 768px) and (orientation: portrait)';

function getInitialMatch(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}
	return window.matchMedia(MOBILE_PORTRAIT_QUERY).matches;
}

export function useIsMobilePortrait() {
	const [isMobilePortrait, setIsMobilePortrait] = useState<boolean>(() => getInitialMatch());

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
			return;
		}

		const mediaQuery = window.matchMedia(MOBILE_PORTRAIT_QUERY);
		const onChange = (event: MediaQueryListEvent) => {
			setIsMobilePortrait(event.matches);
		};

		setIsMobilePortrait(mediaQuery.matches);
		mediaQuery.addEventListener('change', onChange);
		return () => {
			mediaQuery.removeEventListener('change', onChange);
		};
	}, []);

	return isMobilePortrait;
}
