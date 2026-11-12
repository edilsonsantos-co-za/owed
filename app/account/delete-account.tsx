'use client';

// "Delete my account" swaps in a confirmation right where it is: no email link, no second page.
import { useState } from 'react';

export default function DeleteAccount({ email }: { email?: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 items-center rounded-full border border-[#f87171]/60 px-4 text-sm font-medium text-[#b91c1c] hover:bg-[#f87171]/10"
      >
        Delete my account
      </button>
    );
  }
  return (
    <form method="post" action="/account/delete" role="alertdialog" aria-labelledby="delete-title" className="rounded-2xl border border-[#f87171]/50 bg-[#f87171]/[0.06] p-4">
      <p id="delete-title" className="font-medium">Delete your Owed account?</p>
      <p className="mt-1 text-sm text-muted">
        Your Owed data goes and you&apos;re signed out. We&apos;ll email {email || 'you'} a confirmation. It can&apos;t be undone.
      </p>
      <input type="hidden" name="confirm" value="delete" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="inline-flex h-9 items-center rounded-full bg-[#dc2626] px-4 text-sm font-semibold text-white hover:bg-[#b91c1c]">Yes, delete it</button>
        <button type="button" autoFocus onClick={() => setConfirming(false)} className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-sm hover:bg-sunken">
          Keep my account
        </button>
      </div>
    </form>
  );
}
