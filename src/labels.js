// The words the system uses (what a "record" is called, what each role is called).
// They come from the server (/api/labels), so changing one setting on the server
// re-labels the website AND this app. The copy below is only used if the server
// cannot be reached for a moment.
import { api } from './api';

export let L = {
  appName: 'Novo Care', tagline: 'Patient records you can trust, access you control.',
  intro: 'A secure patient records portal with two-factor sign-in and role-based access.',
  pills: ['Passwords protected with salt + pepper', 'Two-factor sign-in with an authenticator app', 'Patient notes encrypted with AES-256-GCM'],
  record: 'patient note', records: 'patient notes', Record: 'Patient note', Records: 'Patient notes',
  titleLabel: 'Patient (name or number)', detailsLabel: 'Clinical notes (stored encrypted)',
  roles: { inputter: 'Nurse', manager: 'Doctor', admin: 'Records officer', administrator: 'Administrator' },
  rolePlurals: { inputter: 'Nurses', manager: 'Doctors', admin: 'Records officers', administrator: 'Administrators' },
  abilities: {},
};

export const roleName = (role) => (L.roles && L.roles[role]) || role;

export async function loadLabels() {
  const r = await api('/api/labels');
  if (r.ok && r.data && r.data.roles) L = r.data;
}
