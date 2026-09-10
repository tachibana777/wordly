import type { Metadata, Viewport } from 'next';
import '@/styles/main.css';
import '@/styles/auth.css';
import '@/styles/responsive.css';
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f7f8fa',
};
export const metadata: Metadata = {
  title: 'Wordly · เก่งขึ้นวันละคำ', description: 'ฝึกภาษาอังกฤษวันละนิด กับคำศัพท์ 400 คำและแบบฝึกแต่งประโยค',
  icons: {icon: '/assets/favicon.svg'},
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="th"><body>{children}</body></html>;
}
