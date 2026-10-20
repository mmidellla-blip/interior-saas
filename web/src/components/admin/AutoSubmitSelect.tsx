"use client";

/** 값을 바꾸면 바로 폼을 제출하는 select (문의 상태 변경 등) */
export default function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  className = "input w-auto py-1.5",
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
