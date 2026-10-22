export function Ball({
  number,
  fixed = false,
}: {
  number: number;
  fixed?: boolean;
}) {
  return (
    <span
      className={`ball ball-${Math.min(4, Math.floor((number - 1) / 10))}${fixed ? ' ball-fixed' : ''}`}
    >
      {String(number).padStart(2, '0')}
      {fixed && <span className="fixed-dot" title="고정 번호" />}
    </span>
  );
}
