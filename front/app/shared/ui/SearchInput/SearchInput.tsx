'use client';

import styles from './SearchInput.module.css';

type SearchInputProps = {
  placeholder?: string;
  onChange: (value: string) => void;
};

export function SearchInput({ placeholder, onChange }: SearchInputProps) {
  return (
    <div className={styles.searchWrap}>
      <span className={styles.searchIcon}>⌕</span>
      <input
        type="search"
        className={styles.searchInput}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
