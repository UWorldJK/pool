"use client";

import { createContext, useCallback, useContext, useId, useRef } from "react";
import { Icon, type IconName } from "./icon";

const DialogContext = createContext<{ close: () => void } | null>(null);

export function useDialog() {
  return useContext(DialogContext);
}

type Props = {
  /** Text of the button that opens the dialog. */
  label: string;
  icon?: IconName;
  variant?: "primary" | "secondary" | "outline" | "plain" | "danger";
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  /** Accessible label for the trigger when its text is not specific enough. */
  triggerLabel?: string;
};

// Native <dialog> as in v3: focus is trapped by the browser, Escape closes it,
// and focus returns to the trigger.
export function Dialog({ label, icon, variant = "secondary", eyebrow, title, children, triggerLabel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    ref.current?.close();
    triggerRef.current?.focus();
  }, []);

  return (
    <DialogContext.Provider value={{ close }}>
      {/* One wrapper so layouts treat the trigger and its dialog as one item. */}
      <div className="dialog-trigger">
        <button
          ref={triggerRef}
          type="button"
          className={`button ${variant}`}
          aria-label={triggerLabel}
          onClick={() => {
            ref.current?.showModal();
            ref.current?.querySelector<HTMLElement>("h2")?.focus();
          }}
        >
          {icon ? <Icon name={icon} size={18} /> : null}
          <span>{label}</span>
        </button>
        <dialog
          ref={ref}
          className="sheet"
          aria-labelledby={titleId}
          onClick={(event) => {
            if (event.target === ref.current) close();
          }}
        >
          <header className="dialog-head">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h2 id={titleId} tabIndex={-1}>
                {title}
              </h2>
            </div>
            <button type="button" className="icon-button" onClick={close} aria-label="Close dialog">
              <Icon name="close" />
            </button>
          </header>
          <div className="dialog-body">{children}</div>
        </dialog>
      </div>
    </DialogContext.Provider>
  );
}

export function CloseButton({ label = "Cancel" }: { label?: string }) {
  const dialog = useDialog();
  return (
    <button type="button" className="button secondary" onClick={() => dialog?.close()}>
      {label}
    </button>
  );
}
