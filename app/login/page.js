import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Server-rendered shell so Hostinger/nginx always deliver HTML, not a cached RSC flight body. */
export default function LoginPage() {
  return <LoginForm />;
}
