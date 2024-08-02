'use client';

import SwaggerUISpec from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export type Props = {
  spec: Record<string, any>;
};

export default function SwaggerUI({spec}: Props) {
  return <SwaggerUISpec spec={spec} />;
}
