import './CardHolo.css';

/** Decorative foil sits below card content and never participates in input or layout. */
export default function CardHolo() {
  return <span className="card-holo" aria-hidden="true">
    <span className="card-holo-foil" />
    <span className="card-holo-stars"><i /><i /><i /></span>
  </span>;
}
