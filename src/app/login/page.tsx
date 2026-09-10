import { redirect } from 'next/navigation';
import { currentUser } from '@/server/auth';
import { LoginForm } from '@/components/LoginForm';
export const dynamic = 'force-dynamic';
export default async function Login() {
  if (await currentUser()) redirect('/');
  return <LoginForm />;
}
