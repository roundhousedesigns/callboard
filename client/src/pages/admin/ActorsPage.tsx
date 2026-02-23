import { useState, useEffect } from 'react';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';
import { Button, TextFieldInput } from '../../components/ui';

export function ActorsPage() {
	const [actors, setActors] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<string | null>(null);
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
		try {
			const user = await api.post<User>('/users', {
				...form,
				role: 'actor',
			});
			setActors((prev) => [...prev, user].sort((a, b) => a.lastName.localeCompare(b.lastName)));
			setForm({ email: '', password: '', firstName: '', lastName: '' });
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
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
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this actor?')) return;
		try {
			await api.delete(`/users/${id}`);
			setActors((prev) => prev.filter((a) => a.id !== id));
		} catch (err) {
			alert(err instanceof Error ? err.message : 'Failed');
		}
	}

	if (loading) return <div className="muted">Loading...</div>;

	return (
		<div>
			<div className="page-header">
				<div>
					<h1 className="page-title">Actors</h1>
					<p className="page-subtitle">Add and manage actor accounts.</p>
				</div>
			</div>
			<form
				onSubmit={handleCreate}
				className="toolbar no-print"
				style={{ marginBottom: '1rem' }}
			>
				<TextFieldInput
					label="First name"
					value={form.firstName}
					onChange={(value) => setForm((p) => ({ ...p, firstName: value }))}
					isRequired
					inputProps={{ placeholder: 'First name' }}
				/>
				<TextFieldInput
					label="Last name"
					value={form.lastName}
					onChange={(value) => setForm((p) => ({ ...p, lastName: value }))}
					isRequired
					inputProps={{ placeholder: 'Last name' }}
				/>
				<TextFieldInput
					label="Email"
					value={form.email}
					onChange={(value) => setForm((p) => ({ ...p, email: value }))}
					isRequired
					style={{ minWidth: '16rem' }}
					inputProps={{
						type: 'email',
						placeholder: 'Email',
					}}
				/>
				<TextFieldInput
					label="Password"
					value={form.password}
					onChange={(value) => setForm((p) => ({ ...p, password: value }))}
					isRequired
					inputProps={{
						type: 'password',
						placeholder: 'Password',
					}}
				/>
				<Button
					size="sm"
					variant="primary"
					type="submit"
				>
					Add actor
				</Button>
			</form>
			<div className="table-wrap">
				<table>
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
											<div className="stack" style={{ gap: '0.5rem' }}>
												<TextFieldInput
													aria-label="First name"
													value={editForm.firstName}
													onChange={(value) => setEditForm((p) => ({ ...p, firstName: value }))}
													inputProps={{ placeholder: 'First name' }}
												/>
												<TextFieldInput
													aria-label="Last name"
													value={editForm.lastName}
													onChange={(value) => setEditForm((p) => ({ ...p, lastName: value }))}
													inputProps={{ placeholder: 'Last name' }}
												/>
											</div>
										</td>
										<td>
											<div className="stack" style={{ gap: '0.5rem' }}>
												<TextFieldInput
													aria-label="Email"
													value={editForm.email}
													onChange={(value) => setEditForm((p) => ({ ...p, email: value }))}
													inputProps={{ type: 'email' }}
												/>
												<TextFieldInput
													aria-label="New password"
													value={editForm.password}
													onChange={(value) => setEditForm((p) => ({ ...p, password: value }))}
													inputProps={{
														type: 'password',
														placeholder: 'New password (optional)',
													}}
												/>
											</div>
										</td>
										<td className="no-print">
											<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
												<Button
													size="sm"
													variant="primary"
													onPress={() => handleUpdate(actor.id)}
												>
													Save
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onPress={() => setEditing(null)}
												>
													Cancel
												</Button>
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
											<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
												<Button
													size="sm"
													onPress={() => startEdit(actor)}
												>
													Edit
												</Button>
												<Button
													size="sm"
													variant="danger"
													onPress={() => handleDelete(actor.id)}
												>
													Delete
												</Button>
											</div>
										</td>
									</>
								)}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
