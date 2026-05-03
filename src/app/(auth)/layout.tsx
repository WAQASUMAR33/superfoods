/** Avoid cached layouts so auth pages always read fresh request state. */
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
