import { redirect } from 'next/navigation';

export default function SuperAdminProfileRedirect() {
  redirect('/admin/profile');
}
