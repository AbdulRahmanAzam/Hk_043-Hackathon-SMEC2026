import React, { useState } from 'react';
import { saveUser } from '../utils/storage';

const UserProfile = ({ user, setUser }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', username: user?.username || '', avatarDataUrl: user?.avatarDataUrl || '', shareName: user?.shareName ?? true, shareUsername: user?.shareUsername ?? true });
  const [error, setError] = useState('');

  const startEdit = () => {
    setForm({ name: user?.name || '', username: user?.username || '', avatarDataUrl: user?.avatarDataUrl || '', shareName: user?.shareName ?? true, shareUsername: user?.shareUsername ?? true });
    setError('');
    setEditing(true);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, avatarDataUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const save = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    if (!/^@?\w{2,30}$/.test(form.username)) return setError('Username must be 2-30 chars and alphanumeric (optional @)');

    const sanitized = {
      ...user,
      name: form.name.trim(),
      username: form.username.startsWith('@') ? form.username : `@${form.username}`,
      avatarDataUrl: form.avatarDataUrl,
      avatar: (form.name.trim()[0] || 'U').toUpperCase() + (form.name.trim().split(' ')[1]?.[0] || ''),
      shareName: !!form.shareName,
      shareUsername: !!form.shareUsername,
    };
    setUser(sanitized);
    saveUser(sanitized);
    setEditing(false);
  };

  return (
    <section aria-label="User profile" className="user-profile-component">
      <div className="profile-card">
        {user?.avatarDataUrl ? (
          <img src={user.avatarDataUrl} alt="Avatar" style={{width:40,height:40,borderRadius:'50%',objectFit:'cover'}} />
        ) : (
          <div className="avatar" aria-hidden>{user?.avatar || 'U'}</div>
        )}
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
          <label>
            Avatar
            <input type="file" accept="image/*" onChange={handleAvatarChange} aria-label="Upload avatar" />
          </label>
          {form.avatarDataUrl && (
            <img src={form.avatarDataUrl} alt="Avatar preview" style={{width:60,height:60,borderRadius:'50%',objectFit:'cover'}} />
          )}
          <div style={{display:'flex',gap:12,marginTop:10}}>
            <label style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={form.shareName} onChange={e => setForm({...form, shareName: e.target.checked})} /> Share name in QR
            </label>
            <label style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={form.shareUsername} onChange={e => setForm({...form, shareUsername: e.target.checked})} /> Share username in QR
            </label>
          </div>
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
