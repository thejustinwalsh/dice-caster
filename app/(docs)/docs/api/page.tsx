import {getApiDocs} from '@/lib/openapi';
import SwaggerUI from './SwaggerUI';

export default async function Page() {
  const spec = await getApiDocs();
  return (
    <section className="container">
      <SwaggerUI spec={spec} />
    </section>
  );
}
