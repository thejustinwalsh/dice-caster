export type AlertType = 'info' | 'success' | 'warning' | 'error';

export type AlertProps = {
  style?: AlertType;
  icon?: AlertType;
  content: React.ReactNode;
};

const styles = {
  alert: '',
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
};

const icons = {
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

const stroke = {
  info: 'stroke-info',
  success: 'stroke-success',
  warning: 'stroke-warning',
  error: 'stroke-error',
};

export default function Alert({style, content, icon}: AlertProps) {
  const i = icon ?? style ?? undefined;
  const alertClass = style ? styles[style] : '';
  const iconClass = i ? icons[i] : '';
  const strokeClass = i ? stroke[i] : '';

  return (
    <div role="alert" className={`absolute top-0 left-0 right-0 flex items-center`}>
      <div className={`alert ${alertClass} m-6`}>
        {i && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`${strokeClass} shrink-0 h-6 w-6`}
            fill="none"
            viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={iconClass} />
          </svg>
        )}
        {content}
      </div>
    </div>
  );
}
