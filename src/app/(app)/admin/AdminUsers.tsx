"use client";

import { useCallback, useEffect, useState } from "react";

type U = { id: string; full_name: string | null; email: string | null; phone: string | null; is_admin: boolean; is_active: boolean; created_at: string };

export function AdminUsers({ meId }: { meId: string }) {
  const [users, setUsers] = useState<U[]>([]);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.users) setUsers(data.users);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const data = await res.json();
    setBusy(false);
    if (data.ok) {
      setMsg(`Created. Login: ${f.phone || f.email} / ${f.password}`);
      setF({ full_name: "", email: "", phone: "", password: "" });
      load();
    } else setMsg(data.error);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    const data = await res.json();
    setMsg(data.ok ? "Updated ✓" : data.error);
    load();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={create} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <h2 className="font-medium sm:col-span-2">Add a user</h2>
        <div>
          <label className="label">Name</label>
          <input className="field" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Phone (10 digits, or with country code)</label>
          <input className="field" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="9876543210" />
        </div>
        <div>
          <label className="label">Email (optional if phone given)</label>
          <input type="email" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create user"}</button>
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  {u.full_name || "—"} {u.is_admin && <span className="ml-1 rounded bg-accent-soft px-1.5 text-xs text-accent">admin</span>}
                </td>
                <td className="px-4 py-3 text-muted">
                  {u.phone ? `+${u.phone}` : ""}
                  {u.phone && u.email ? " · " : ""}
                  {u.email ?? ""}
                </td>
                <td className="px-4 py-3">{u.is_active ? "Active" : <span className="text-warm">Paused</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button
                      className="text-accent hover:underline"
                      onClick={() => {
                        const pw = prompt(`New password for ${u.full_name || u.phone || u.email}:`);
                        if (pw) patch(u.id, { password: pw });
                      }}
                    >
                      Reset password
                    </button>
                    {u.id !== meId && (
                      <>
                        <button className="hover:underline" onClick={() => patch(u.id, { is_active: !u.is_active })}>
                          {u.is_active ? "Pause" : "Unpause"}
                        </button>
                        <button className="hover:underline" onClick={() => patch(u.id, { is_admin: !u.is_admin })}>
                          {u.is_admin ? "Remove admin" : "Make admin"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
