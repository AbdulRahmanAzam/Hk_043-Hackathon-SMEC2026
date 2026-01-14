import React, { useState } from 'react';
import { User } from '../types';
import { X, User as UserIcon, Building2, FileText, Image, Loader } from 'lucide-react';
import * as api from '../services/api';

interface ProfileEditModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ user, isOpen, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user.name);
  const [university, setUniversity] = useState(user.university || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatar);
  const [skills, setSkills] = useState<string[]>(user.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddSkill = () => {
    const trimmedSkill = newSkill.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill)) {
      setSkills([...skills, trimmedSkill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Update profile
      const updatedUser = await api.updateUserProfile(user.id, {
        name,
        university,
        bio,
        avatar
      });

      // Update skills separately
      await api.updateUserSkills(user.id, skills);

      // Merge skills into updated user
      updatedUser.skills = skills;

      onUpdate(updatedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const avatarOptions = [
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`,
    `https://api.dicebear.com/7.x/identicon/svg?seed=${user.name}`,
    `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-slate-900">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-8 py-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Profile Avatar</label>
              <div className="grid grid-cols-5 gap-4">
                {avatarOptions.map((avatarUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAvatar(avatarUrl)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      avatar === avatarUrl 
                        ? 'border-violet-600 ring-4 ring-violet-100 scale-105' 
                        : 'border-slate-200 hover:border-violet-300'
                    }`}
                  >
                    <img src={avatarUrl} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Select an avatar or paste a custom URL below</p>
              <div className="mt-2">
                <div className="relative">
                  <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="Custom avatar URL"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  placeholder="Your full name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* University */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">University/School</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  minLength={2}
                  placeholder="Stanford University"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Bio</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell others about yourself, your skills, and what you're studying..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all resize-none"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{bio.length}/500 characters</p>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Your Skills</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Add a skill (e.g., React, Python, Design)"
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="px-6 py-2 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all text-sm"
                >
                  Add
                </button>
              </div>
              
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span 
                      key={skill}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:bg-violet-200 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
