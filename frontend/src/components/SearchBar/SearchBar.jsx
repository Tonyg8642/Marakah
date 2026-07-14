import "./SearchBar.css";

export default function SearchBar() {
  return (
    <div className="searchbar">
      <input
        type="search"
        placeholder="Search reminders, events, scholars"
        aria-label="Search"
      />
    </div>
  );
}
