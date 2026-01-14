import React, { useState } from 'react';
import { saveUser } from '../utils/storage';

const UserProfile = ({ user, setUser }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', username: user?.username || '' });
  const [error, setError] = useState('');

  const startEdit = () => {
    setForm({ name: user?.name || '', username: user?.username || '' });
    setError('');
    setEditing(true);
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    if (!/^@?\w{2,30}$/.test(form.username)) return setError('Username must be 2-30 chars and alphanumeric (optional @)');

    const sanitized = { ...user, name: form.name.trim(), username: form.username.startsWith('@') ? form.username : `@${form.username}` };
    setUser(sanitized);
    saveUser(sanitized);
    setEditing(false);
  };

  return (
    <section aria-label="User profile" className="user-profile-component">
      <div className="profile-card">
        <div className="avatar" aria-hidden>{user?.avatar || 'U'}</div>
        <div className="info">
          <div className="name">{user?.name}</div>
          <div className="username">{user?.username}</div>
        </div>
        <div className="actions">
          <button onClick={startEdit} className="edit-btn" aria-label="Edit profile">Edit</button>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="profile-form" aria-label="Edit profile form">
          <label>
            Name
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} aria-label="Full name" required />
          </label>
          <label>
            Username
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} aria-label="Username" required />
          </label>
          {error && <div role="alert" className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="submit" className="save-btn">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="cancel-btn">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
};

export default UserProfile;
