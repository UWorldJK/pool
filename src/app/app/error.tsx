"use client";
export default function ApplicationError({ reset }: { reset: () => void }) {
  return <><h1>Application data could not be loaded</h1><p role="alert">Check your connection and try again.</p><button type="button" onClick={reset}>Try again</button></>;
}
