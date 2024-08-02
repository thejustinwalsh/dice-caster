import NextLink, {type LinkProps as NextLinkProps} from 'next/link';

import {ButtonProps} from './Button';

export type LinkProps = React.PropsWithChildren<ButtonProps & NextLinkProps>;

export default function Link({children, ...props}: LinkProps) {
  return (
    <NextLink className="btn btn-block gap-2 btn-accent" {...props}>
      {children}
    </NextLink>
  );
}
