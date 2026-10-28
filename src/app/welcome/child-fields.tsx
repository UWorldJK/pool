"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

export function ChildFields() {
  const [count, setCount] = useState(1);
  return (
    <fieldset>
      <legend>Children</legend>
      <div className="grid gap-3">
        {Array.from({ length: count }, (_, n) => (
          <label key={n}>
            {n === 0 ? "First name" : `Child ${n + 1} first name`}
            <input name="child" required={n === 0} maxLength={40} autoComplete="off" />
          </label>
        ))}
      </div>
      {count < 6 ? (
        <button type="button" className="button plain mt-2" onClick={() => setCount(count + 1)}>
          <Icon name="plus" size={18} />
          <span>Add another child</span>
        </button>
      ) : null}
    </fieldset>
  );
}
