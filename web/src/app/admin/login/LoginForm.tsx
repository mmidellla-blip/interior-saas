"use client";

import { useActionState } from "react";
import { login } from "@/lib/admin-actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="card space-y-3 p-5">
      <label className="label" htmlFor="password">
        비밀번호
      </label>
      <input id="password" name="password" type="password" className="input" autoComplete="current-password" required autoFocus />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" className="btn-primary w-full py-3" disabled={pending}>
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
