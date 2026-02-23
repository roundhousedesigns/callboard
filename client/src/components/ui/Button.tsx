import {
	Button as AriaButton,
	type ButtonProps as AriaButtonProps,
} from 'react-aria-components';
import { cx } from './utils';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends Omit<AriaButtonProps, 'className'> {
	className?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
}

export function Button({
	className,
	variant = 'default',
	size = 'md',
	...props
}: ButtonProps) {
	return (
		<AriaButton
			{...props}
			className={cx(
				'btn',
				variant === 'primary' && 'btn--primary',
				variant === 'danger' && 'btn--danger',
				variant === 'ghost' && 'btn--ghost',
				size === 'sm' && 'btn--sm',
				className,
			)}
		/>
	);
}
