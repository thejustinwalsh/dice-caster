export type ButtonProps = React.PropsWithChildren<{
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: () => void;
}>;

export default function Button({
  children,
  onClick,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  return (
    <button
      className="btn btn-block gap-2 btn-neutral"
      type={type}
      disabled={disabled}
      onClick={onClick}>
      {children}
    </button>
  );
}
