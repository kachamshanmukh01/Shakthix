import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Plus, X, Check, Trash2 } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileManagerModalProps {
    isOpen: boolean;
    profiles: UserProfile[];
    activeProfileId: string | null;
    onClose: () => void;
    onSelectProfile: (id: string) => void;
    onCreateProfile: (profile: Omit<UserProfile, 'id'>) => void;
    onDeleteProfile: (id: string) => void;
}

export function ProfileManagerModal({
    isOpen,
    profiles,
    activeProfileId,
    onClose,
    onSelectProfile,
    onCreateProfile,
    onDeleteProfile
}: ProfileManagerModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [height, setHeight] = useState('170');
    const [weight, setWeight] = useState('70');

    useEffect(() => {
        if (isOpen) {
            setIsCreating(profiles.length === 0);
        }
    }, [isOpen, profiles.length]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && height && weight) {
            onCreateProfile({
                name,
                height: parseFloat(height),
                weight: parseFloat(weight)
            });
            setIsCreating(false);
            setName('');
            setHeight('170');
            setWeight('70');
        }
    };

    const handleCreateCancel = () => {
        if (profiles.length > 0) {
            setIsCreating(false);
            setName('');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl"
                        onClick={profiles.length > 0 ? onClose : undefined}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
                    >
                        {profiles.length > 0 && (
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
                            >
                                <X size={20} />
                            </button>
                        )}

                        <div className="p-8 sm:p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-14 h-14 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-200">
                                    <User size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">
                                        Profiles
                                    </h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                        Manage your identity
                                    </p>
                                </div>
                            </div>

                            {!isCreating ? (
                                <div className="space-y-4">
                                    <div className="max-h-64 overflow-y-auto space-y-3 p-1">
                                        {profiles.map(profile => (
                                            <div
                                                key={profile.id}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${activeProfileId === profile.id
                                                        ? 'border-brand-500 bg-brand-50'
                                                        : 'border-slate-100 bg-white hover:border-slate-200 cursor-pointer'
                                                    }`}
                                                onClick={() => {
                                                    if (activeProfileId !== profile.id) {
                                                        onSelectProfile(profile.id);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${activeProfileId === profile.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {profile.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">{profile.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {profile.height}cm • {profile.weight}kg
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {activeProfileId === profile.id && (
                                                        <div className="flex items-center justify-center w-6 h-6 bg-brand-500 text-white rounded-full">
                                                            <Check size={14} />
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteProfile(profile.id);
                                                        }}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl transition-all border border-slate-200"
                                    >
                                        <Plus size={20} />
                                        Add New Profile
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4 z-10 relative bg-white">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Alex"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Height (cm)</label>
                                        <input
                                            type="number"
                                            required
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            placeholder="170"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weight (kg)</label>
                                        <input
                                            type="number"
                                            required
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="70"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        {profiles.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleCreateCancel}
                                                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                                        >
                                            Save Profile
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
