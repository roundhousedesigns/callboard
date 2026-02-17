import { useState, useEffect } from "react";
import type { User } from "../../lib/auth";
import { api } from "../../lib/api";

export function ActorsPage() {
  const [actors, setActors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
  });
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  useEffect(() => {
    api
      .get<User[]>("/users")
      .then((users) => setActors(users.filter((u) => u.role === "actor")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = await api.post<User>("/users", {
        ...form,
        role: "actor",
      });
      setActors((prev) => [...prev, user].sort((a, b) => a.lastName.localeCompare(b.lastName)));
      setForm({ email: "", password: "", firstName: "", lastName: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  function startEdit(actor: User) {
    setEditing(actor.id);
    setEditForm({
      email: actor.email,
      firstName: actor.firstName,
      lastName: actor.lastName,
      password: "",
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
        prev.map((a) => (a.id === id ? user : a)).sort((a, b) => a.lastName.localeCompare(b.lastName))
      );
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this actor?")) return;
    try {
      await api.delete(`/users/${id}`);
      setActors((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Actors</h1>
      <form
        onSubmit={handleCreate}
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <input
          placeholder="First name"
          value={form.firstName}
          onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
          required
        />
        <input
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          required
        />
        <button type="submit">Add actor</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {actors.map((actor) => (
            <tr key={actor.id}>
              {editing === actor.id ? (
                <>
                  <td>
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
                  </td>
                  <td>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, password: e.target.value }))
                      }
                      placeholder="New password (optional)"
                    />
                  </td>
                  <td>
                    <button onClick={() => handleUpdate(actor.id)}>Save</button>
                    <button onClick={() => setEditing(null)}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>
                    {actor.lastName}, {actor.firstName}
                  </td>
                  <td>{actor.email}</td>
                  <td>
                    <button onClick={() => startEdit(actor)}>Edit</button>
                    <button onClick={() => handleDelete(actor.id)}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
