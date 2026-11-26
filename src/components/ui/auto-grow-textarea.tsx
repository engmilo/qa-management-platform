'use client';
import { useEffect, useRef } from 'react';

// Drop-in replacement for <textarea>.
// Same props, same onChange(e) signature, so you can just rename the tag.
// Auto-grows to show the entire text at once - no inner scroll, no Ctrl+End.
// Merges any ref you pass in (e.g. ref={scopeRef}) with the internal ref.
export function AutoGrowTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const value = props.value;
  const { ref: forwardedRef, ...rest } = props as any;

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    (innerRef as any).current = el;
    if (typeof forwardedRef === 'function') forwardedRef(el);
    else if (forwardedRef && typeof forwardedRef === 'object') (forwardedRef as any).current = el;
  };

  return (
    <textarea
      {...rest}
      ref={setRefs}
      style={{ ...props.style, overflow: 'hidden', resize: 'none' }}
    />
  );
}
