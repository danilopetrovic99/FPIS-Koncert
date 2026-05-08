import { NavLink, Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="brand">
          <span className="brand__dot">K</span>
          <span className="brand__name">
            KoncertApp <small>· Eros Ramazzotti</small>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Koncert
          </NavLink>
          <NavLink to="/book">Rezerviši</NavLink>
          <NavLink to="/my">Moja rezervacija</NavLink>
        </nav>
      </div>
    </header>
  );
}
