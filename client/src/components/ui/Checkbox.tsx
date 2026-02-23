import { type ReactNode } from 'react';
import {
	Checkbox as AriaCheckbox,
	type CheckboxProps as AriaCheckboxProps,
} from 'react-aria-components';
import { cx } from './utils';

interface CheckboxProps extends Omit<AriaCheckboxProps, 'children' | 'className'> {
	children: ReactNode;
	className?: string;
}

export function Checkbox({ children, className, ...props }: CheckboxProps) {
	return (
		<AriaCheckbox
			{...props}
			className={cx('checkbox-row app-checkbox', className)}
		>
			<span
				aria-hidden
				className="app-checkbox__box"
			>
				<span className="app-checkbox__mark">✓</span>
			</span>
			<span>{children}</span>
		</AriaCheckbox>
	);
}
