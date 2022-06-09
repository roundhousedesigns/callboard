import React, { useContext, useReducer, useMemo, useEffect } from 'react';
import { isEmpty, isEqual } from 'lodash';
import { Popover } from '@mui/material';
import { format, isAfter, isBefore } from 'date-fns';
import { Box } from '@mui/system';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

import ProductionContext from '../../ProductionContext';

import StatusIcon from './StatusIcon';

function anchorElReducer(state, action) {
	switch (action.type) {
		case 'INIT': {
			var anchorEls = {};
			Object.keys(action.payload).forEach((id) => {
				anchorEls[id] = null;
			});

			return anchorEls;
		}

		case 'MOUSEENTER': {
			return {
				...state,
				[action.id]: action.payload,
			};
		}

		case 'MOUSEOUT': {
			return {
				...state,
				[action.id]: null,
			};
		}

		default:
			return state;
	}
}

export default function ShowTable({ showIds }) {
	const {
		production: { roster, shows, currentShow },
	} = useContext(ProductionContext);

	const [anchorEl, anchorElDispatch] = useReducer(anchorElReducer, {});

	// Inialize anchorEls
	const anchorEls = useMemo(() => {
		if (isEmpty(shows)) return {};

		return { type: 'INIT', payload: shows };
	}, [shows]);

	useEffect(() => {
		anchorElDispatch(anchorEls);
	}, [anchorEls]);

	const handlePopoverOpen = (event) => {
		// setAnchorEl(event.currentTarget);
		anchorElDispatch({
			type: 'MOUSEENTER',
			id: event.target.getAttribute('id'),
			payload: event.currentTarget,
		});
	};

	const handlePopoverClose = (event) => {
		// setAnchorEl(null);
		anchorElDispatch({
			type: 'MOUSEOUT',
			id: event.target.getAttribute('id'),
		});
	};

	// Disable the icon button if this show is in the future.
	const checkButtonEnabled = (showId) => {
		var enabled = false;

		if (showId === currentShow) {
			enabled = true;
		} else if (
			isBefore(shows[showId].datetime, shows[currentShow].datetime) ||
			isEqual(shows[showId].datetime, shows[currentShow].datetime)
		) {
			enabled = true;
		}

		return enabled;
	};

	const rows = Object.keys(roster).map((performerId) => {
		return {
			name: roster[performerId].name,
			role: roster[performerId].role,
			id: performerId,
			attendance: showIds.map((showId) => {
				return shows[showId].attendance[performerId];
			}),
		};
	});

	const showHeadingLabel = (id) => {
		return format(shows[id].datetime, 'M/d (ha)');
	};

	return isEmpty(shows) || isEmpty(showIds) ? null : (
		<TableContainer component={Paper} sx={{ width: '100%' }}>
			<Table size="small" aria-label="a weekly attendance table">
				<TableHead>
					<TableRow>
						<TableCell
							sx={{
								flexShrink: 1,
								flexGrow: 1,
								textAlign: 'right',
								borderRightWidth: 1,
								borderRightColor: 'primary.gray',
								borderRightStyle: 'solid',
								textTransform: 'uppercase',
							}}
						>
							<Typography variant="button" sx={{ fontSize: '1.1em' }}>
								Performer
							</Typography>
						</TableCell>
						{showIds.map((id) => {
							return (
								<TableCell key={id}>
									<Typography
										variant="button"
										id={id}
										sx={{
											cursor: 'default',
											p: 1,
											borderRadius: 1,
											backgroundColor: String(currentShow) === id && showIds.length > 1 ? 'secondary.main' : 'inherit',
											fontSize: '1.1em',
											opacity: isAfter(shows[id].datetime, shows[currentShow].datetime) ? 0.4 : 1,
										}}
										aria-haspopup="true"
										onMouseEnter={handlePopoverOpen}
										onMouseLeave={handlePopoverClose}
									>
										{showHeadingLabel(id)}
									</Typography>
									<Popover
										sx={{ pointerEvents: 'none' }}
										open={!!anchorEl[id]}
										anchorEl={anchorEl[id]}
										anchorOrigin={{
											vertical: 'bottom',
											horizontal: 'left',
										}}
										onClose={handlePopoverClose}
										disableRestoreFocus
									>
										{shows[id].notes ? (
											<Typography sx={{ p: 2 }}>{shows[id].notes}</Typography>
										) : (
											<Typography sx={{ p: 2, color: 'primary.gray' }}>No notes.</Typography>
										)}
									</Popover>
								</TableCell>
							);
						})}
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.name}>
							<TableCell
								sx={{
									pr: 3,
									pl: 0,
									borderRightWidth: 1,
									borderRightColor: 'primary.gray',
									borderRightStyle: 'solid',
									textAlign: 'right',
								}}
								scope="row"
							>
								<Typography variant="body1" sx={{ lineHeight: 1 }}>
									{row.name}
								</Typography>
								<Typography variant="caption" sx={{ fontStyle: 'italic' }}>
									{row.role}
								</Typography>
							</TableCell>
							{showIds.map((id, i) => (
								<TableCell key={id} scope="row">
									<Box sx={{ p: 1, lineHeight: 1 }}>
										<StatusIcon
											status={row.attendance[i] ? row.attendance[i] : null}
											performerId={row.id}
											showId={id}
											buttonEnabled={checkButtonEnabled(id)}
										/>
									</Box>
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}
