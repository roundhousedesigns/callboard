import { useState, useEffect } from 'react';
import type { User } from '../../lib/auth';
import { api } from '../../lib/api';

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
				<label className="field">
					<span className="field-label">First name</span>
					<input
						placeholder="First name"
						value={form.firstName}
						onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
						required
					/>
				</label>
				<label className="field">
					<span className="field-label">Last name</span>
					<input
						placeholder="Last name"
						value={form.lastName}
						onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
						required
					/>
				</label>
				<label className="field" style={{ minWidth: '16rem' }}>
					<span className="field-label">Email</span>
					<input
						type="email"
						placeholder="Email"
						value={form.email}
						onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
						required
					/>
				</label>
				<label className="field">
					<span className="field-label">Password</span>
					<input
						type="password"
						placeholder="Password"
						value={form.password}
						onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
						required
					/>
				</label>
				<button className="btn btn--sm btn--primary" type="submit">
					Add actor
				</button>
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
												<input
													value={editForm.firstName}
													onChange={(e) =>
														setEditForm((p) => ({ ...p, firstName: e.target.value }))
													}
													placeholder="First name"
												/>
												<input
													value={editForm.lastName}
													onChange={(e) =>
														setEditForm((p) => ({ ...p, lastName: e.target.value }))
													}
													placeholder="Last name"
												/>
											</div>
										</td>
										<td>
											<div className="stack" style={{ gap: '0.5rem' }}>
												<input
													type="email"
													value={editForm.email}
													onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
												/>
												<input
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
											<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
												<button className="btn btn--sm btn--primary" onClick={() => handleUpdate(actor.id)}>
													Save
												</button>
												<button className="btn btn--sm btn--ghost" onClick={() => setEditing(null)}>
													Cancel
												</button>
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
												<button className="btn btn--sm" onClick={() => startEdit(actor)}>
													Edit
												</button>
												<button className="btn btn--sm btn--danger" onClick={() => handleDelete(actor.id)}>
													Delete
												</button>
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
