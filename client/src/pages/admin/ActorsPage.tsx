import { useState, useEffect } from 'react';
import {
	Button,
	Callout,
	Card,
	FormGroup,
	HTMLTable,
	InputGroup,
	Spinner,
} from '@blueprintjs/core';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';

export function ActorsPage() {
	const [actors, setActors] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<string | null>(null);
	const [message, setMessage] = useState<{ type: 'danger' | 'success'; text: string } | null>(null);
	const [editForm, setEditForm] = useState({
		email: '',
		firstName: '',
		lastName: '',
		password: '',
	});
	const [form, setForm] = useState({
		email: '',
		password: '',
		firstName: '',
		lastName: '',
	});

	useEffect(() => {
		api
			.get<User[]>('/users')
			.then((users) => setActors(users.filter((u) => u.role === 'actor')))
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		setMessage(null);
		try {
			const user = await api.post<User>('/users', {
				...form,
				role: 'actor',
			});
			setActors((prev) => [...prev, user].sort((a, b) => a.lastName.localeCompare(b.lastName)));
			setForm({ email: '', password: '', firstName: '', lastName: '' });
			setMessage({ type: 'success', text: 'Actor added.' });
		} catch (err) {
			setMessage({ type: 'danger', text: err instanceof Error ? err.message : 'Failed to add actor.' });
		}
	}

	function startEdit(actor: User) {
		setEditing(actor.id);
		setEditForm({
			email: actor.email,
			firstName: actor.firstName,
			lastName: actor.lastName,
			password: '',
		});
	}

	async function handleUpdate(id: string) {
		setMessage(null);
		try {
			const payload: Record<string, string> = {
				email: editForm.email,
				firstName: editForm.firstName,
				lastName: editForm.lastName,
			};
			if (editForm.password) payload.password = editForm.password;
			const user = await api.patch<User>(`/users/${id}`, payload);
			setActors((prev) =>
				prev
					.map((a) => (a.id === id ? user : a))
					.sort((a, b) => a.lastName.localeCompare(b.lastName)),
			);
			setEditing(null);
			setMessage({ type: 'success', text: 'Actor updated.' });
		} catch (err) {
			setMessage({
				type: 'danger',
				text: err instanceof Error ? err.message : 'Failed to update actor.',
			});
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this actor?')) return;
		setMessage(null);
		try {
			await api.delete(`/users/${id}`);
			setActors((prev) => prev.filter((a) => a.id !== id));
			setMessage({ type: 'success', text: 'Actor deleted.' });
		} catch (err) {
			setMessage({
				type: 'danger',
				text: err instanceof Error ? err.message : 'Failed to delete actor.',
			});
		}
	}

	if (loading) {
		return (
			<div className="page-centered">
				<Spinner size={28} />
			</div>
		);
	}

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Actors</h1>
					<p className="page-subtitle">Add and manage actor accounts.</p>
				</div>
			</div>
			{message && <Callout intent={message.type}>{message.text}</Callout>}
			<Card className="no-print toolbar-card">
				<form onSubmit={handleCreate} className="toolbar-grid">
					<FormGroup label="First name" className="toolbar-field">
						<InputGroup
							placeholder="First name"
							value={form.firstName}
							onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
							required
						/>
					</FormGroup>
					<FormGroup label="Last name" className="toolbar-field">
						<InputGroup
							placeholder="Last name"
							value={form.lastName}
							onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
							required
						/>
					</FormGroup>
					<FormGroup label="Email" className="toolbar-field toolbar-field-wide">
						<InputGroup
							type="email"
							placeholder="Email"
							value={form.email}
							onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
							required
						/>
					</FormGroup>
					<FormGroup label="Password" className="toolbar-field">
						<InputGroup
							type="password"
							placeholder="Password"
							value={form.password}
							onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
							required
						/>
					</FormGroup>
					<div className="toolbar-actions">
						<Button small intent="primary" type="submit" text="Add actor" />
					</div>
				</form>
			</Card>
			<Card className="table-card">
				<HTMLTable bordered striped interactive condensed className="admin-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th className="no-print"></th>
						</tr>
					</thead>
					<tbody>
						{actors.map((actor) => (
							<tr key={actor.id}>
								{editing === actor.id ? (
									<>
										<td>
											<div className="form-stack-tight">
												<InputGroup
													value={editForm.firstName}
													onChange={(e) =>
														setEditForm((p) => ({ ...p, firstName: e.target.value }))
													}
													placeholder="First name"
												/>
												<InputGroup
													value={editForm.lastName}
													onChange={(e) =>
														setEditForm((p) => ({ ...p, lastName: e.target.value }))
													}
													placeholder="Last name"
												/>
											</div>
										</td>
										<td>
											<div className="form-stack-tight">
												<InputGroup
													type="email"
													value={editForm.email}
													onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
												/>
												<InputGroup
													type="password"
													value={editForm.password}
													onChange={(e) =>
														setEditForm((p) => ({ ...p, password: e.target.value }))
													}
													placeholder="New password (optional)"
												/>
											</div>
										</td>
										<td className="no-print">
											<div className="inline-actions align-right">
												<Button
													small
													intent="primary"
													text="Save"
													onClick={() => {
														void handleUpdate(actor.id);
													}}
												/>
												<Button small text="Cancel" onClick={() => setEditing(null)} />
											</div>
										</td>
									</>
								) : (
									<>
										<td>
											{actor.lastName}, {actor.firstName}
										</td>
										<td>{actor.email}</td>
										<td className="no-print">
											<div className="inline-actions align-right">
												<Button small text="Edit" onClick={() => startEdit(actor)} />
												<Button
													small
													intent="danger"
													text="Delete"
													onClick={() => {
														void handleDelete(actor.id);
													}}
												/>
											</div>
										</td>
									</>
								)}
							</tr>
						))}
					</tbody>
				</HTMLTable>
			</Card>
		</div>
	);
}
