import { useEffect, useState } from 'react';
import ProfileForm from '@/components/ProfileForm.jsx';
import { useToast } from '@/components/ui.jsx';
import { getProfile, saveProfile } from '@/lib/storage.js';
import PageTitle from './PageTitle.jsx';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [toastNode, toast] = useToast();
  useEffect(() => void getProfile().then(setProfile), []);
  if (!profile) return null;

  const save = async () => {
    setProfile(await saveProfile(profile));
    setDirty(false);
    toast('Profile saved on this device');
  };

  return (
    <>
      <PageTitle title="Your profile">Fill this once. ExpoFill uses it on every form, and it never leaves this computer.</PageTitle>
      <ProfileForm
        profile={profile}
        onChange={(p) => {
          setProfile(p);
          setDirty(true);
        }}
      />
      <div className="fixed bottom-0 right-0 z-10 p-5">
        <button type="button" className="btn-go px-8 py-3 text-base font-bold shadow-lg" onClick={save} disabled={!dirty}>
          {dirty ? 'Save profile' : 'Saved'}
        </button>
      </div>
      {toastNode}
    </>
  );
}
