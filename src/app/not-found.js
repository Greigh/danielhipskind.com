import Link from "next/link";

export const metadata = {
  title: "Page Not Found | Daniel Hipskind",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main>
      <div className="error-container">
        <h1>404</h1>
        <p>
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
        <Link href="/">Back to homepage</Link>
      </div>
    </main>
  );
}
