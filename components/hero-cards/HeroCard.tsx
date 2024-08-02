export type HeroCardProps = React.PropsWithChildren<{
  id?: string;
  title: string;
  tagline: string;
}>;

export default function HeroCard({id, title, tagline, children}: HeroCardProps) {
  return (
    <div id={id} className="carousel-item w-full hero-content flex-col lg:flex-row-reverse">
      <div className="flex-shrink-0 text-center lg:text-left">
        <h1 className="text-6xl font-bold">{title}</h1>
        <p className="py-2 text-lg">{tagline}</p>
      </div>
      <div className="card flex-shrink-0 w-full max-w-sm shadow-xl bg-base-100">
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}
