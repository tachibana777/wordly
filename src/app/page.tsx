import { redirect } from 'next/navigation';
import { currentUser } from '@/server/auth';
import { WordlyApp } from '@/components/WordlyApp';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return <WordlyApp user={user} />;
}
