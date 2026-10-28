"use client";

import { Icon } from "@/components/icon";

export default function TeamError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty card mt-6" role="alert">
      <Icon name="warning" size={32} />
      <h3>We couldn&apos;t load this page.</h3>
      <p>Your plan is safe. Check your connection and try again.</p>
      <button type="button" className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
