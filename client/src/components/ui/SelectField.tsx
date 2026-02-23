import { type ReactNode } from 'react';
import {
	Button,
	Label,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
} from 'react-aria-components';
import { cx } from './utils';

export interface SelectFieldOption {
	id: string;
	label: ReactNode;
	textValue?: string;
}

interface SelectFieldProps {
	label?: ReactNode;
	ariaLabel?: string;
	options: SelectFieldOption[];
	selectedKey: string | null;
	onSelectionChange: (key: string) => void;
	placeholder?: string;
	className?: string;
	isRequired?: boolean;
	isDisabled?: boolean;
}

export function SelectField({
	label,
	ariaLabel,
	options,
	selectedKey,
	onSelectionChange,
	placeholder = 'Select an option',
	className,
	isRequired,
	isDisabled,
}: SelectFieldProps) {
	return (
		<Select
			aria-label={ariaLabel}
			selectedKey={selectedKey ?? null}
			onSelectionChange={(key) => {
				if (key !== null) {
					onSelectionChange(String(key));
				}
			}}
			isRequired={isRequired}
			isDisabled={isDisabled}
			className={cx('field field-select', className)}
		>
			{label ? <Label className="field-label">{label}</Label> : null}
			<Button className="field-select__trigger">
				<SelectValue>
					{({ defaultChildren, isPlaceholder }) =>
						isPlaceholder ? <span className="muted">{placeholder}</span> : defaultChildren
					}
				</SelectValue>
				<span
					aria-hidden
					className="field-select__chevron"
				>
					▾
				</span>
			</Button>
			<Popover
				offset={4}
				className="field-select__popover"
			>
				<ListBox className="field-select__listbox">
					{options.map((option) => (
						<ListBoxItem
							key={option.id}
							id={option.id}
							textValue={option.textValue}
							className="field-select__item"
						>
							{option.label}
						</ListBoxItem>
					))}
				</ListBox>
			</Popover>
		</Select>
	);
}
