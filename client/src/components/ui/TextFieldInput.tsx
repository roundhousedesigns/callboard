import { type ReactNode } from 'react';
import {
	Input,
	Label,
	TextField as AriaTextField,
	type InputProps,
	type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';
import { cx } from './utils';

type BaseInputProps = Omit<InputProps, 'className' | 'value' | 'defaultValue' | 'onChange'>;

export interface TextFieldInputProps extends Omit<AriaTextFieldProps, 'children' | 'className'> {
	label?: ReactNode;
	className?: string;
	labelClassName?: string;
	inputClassName?: string;
	inputProps?: BaseInputProps;
}

export function TextFieldInput({
	label,
	className,
	labelClassName,
	inputClassName,
	inputProps,
	...props
}: TextFieldInputProps) {
	return (
		<AriaTextField
			{...props}
			className={cx('field', className)}
		>
			{label ? <Label className={cx('field-label', labelClassName)}>{label}</Label> : null}
			<Input
				{...inputProps}
				className={cx('app-input', inputClassName)}
			/>
		</AriaTextField>
	);
}
