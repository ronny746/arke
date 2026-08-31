import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Download, Upload, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { EmptyState } from '../ui/index.jsx';

export function DataTable({
  data = [],
  columns = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  actions,
  onRowClick,
  selectable = false,
  bulkActions,
  pageSize: defaultPageSize = 10,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  emptyIcon,
  className,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [selected, setSelected] = useState(new Set());

  // Filter
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessorKey ? row[col.accessorKey] : '';
        return String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const allSelected = paginated.length > 0 && paginated.every(r => selected.has(r.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) paginated.forEach(r => next.delete(r.id));
      else paginated.forEach(r => next.add(r.id));
      return next;
    });
  };

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="text-surface-400" />;
    return sortDir === 'asc' ? <ChevronUp size={13} className="text-primary" /> : <ChevronDown size={13} className="text-primary" />;
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {searchable && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-8 w-56 h-8 text-xs"
              />
            </div>
          )}
          {someSelected && bulkActions && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
              <span className="text-xs font-medium text-primary-700 dark:text-primary-300">{selected.size} selected</span>
              {bulkActions.map((action, i) => (
                <button key={i} onClick={() => action.onClick([...selected])} className={cn('btn-sm', `btn-${action.variant || 'ghost'}`)}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {/* Table */}
      <div className="table-wrapper overflow-x-auto">
        <table className="data-table w-full whitespace-nowrap">
          <thead>
            <tr>
              {selectable && (
                <th className="w-10 px-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-surface-300 text-primary focus:ring-primary" />
                </th>
              )}
              {columns.map((col, idx) => (
                <th key={col.key || col.accessorKey || idx} style={{ width: col.width }}>
                  {col.sortable !== false && col.accessorKey ? (
                    <button className="flex items-center gap-1.5 hover:text-surface-700 dark:hover:text-surface-200 transition-colors" onClick={() => handleSort(col.accessorKey)}>
                      {col.header}
                      <SortIcon col={col.accessorKey} />
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="px-4"><div className="skeleton h-4 w-4 rounded" /></td>}
                  {columns.map((col, j) => (
                    <td key={j}><div className="skeleton h-4 rounded" style={{ width: col.width || '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-0">
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={row._id || row.id || `row-${i}`} onClick={() => onRowClick?.(row)} className={cn(onRowClick && 'cursor-pointer')}>
                  {selectable && (
                    <td className="px-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(row.id || row._id)} onChange={() => toggleRow(row.id || row._id)} className="rounded border-surface-300 text-primary focus:ring-primary" />
                    </td>
                  )}
                  {columns.map((col, colIdx) => (
                    <td key={col.key || col.accessorKey || colIdx}>
                      {col.cell ? col.cell(row) : row[col.accessorKey]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-surface-500 dark:text-surface-400">
            <span>Rows per page:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="form-select w-auto h-8 text-xs px-2 py-1">
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="btn-ghost btn-icon p-1.5" onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button className="btn-ghost btn-icon p-1.5" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5) {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                p = start + i;
              }
              return (
                <button key={p} onClick={() => setPage(p)} className={cn('w-8 h-8 rounded-lg text-xs font-medium transition-all', p === page ? 'bg-primary text-white' : 'btn-ghost')}>
                  {p}
                </button>
              );
            })}
            <button className="btn-ghost btn-icon p-1.5" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight size={16} />
            </button>
            <button className="btn-ghost btn-icon p-1.5" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Action menu for table rows
export function RowActions({ actions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false); 
      }
    };
    document.addEventListener('mousedown', handler);
    // Also close on scroll to prevent floating menu
    window.addEventListener('scroll', () => setOpen(false), true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', () => setOpen(false), true);
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuHeight = (actions?.length || 0) * 36 + 16;
      let top = rect.bottom + window.scrollY + 4;
      
      // If menu would go off the bottom of the screen, open upwards
      if (rect.bottom + menuHeight > window.innerHeight) {
        top = rect.top + window.scrollY - menuHeight - 4;
      }
      
      setCoords({ 
        top, 
        left: rect.right - 176 + window.scrollX // 176px is w-44
      });
    }
    setOpen(o => !o);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost btn-icon p-1.5" onClick={handleClick}>
        <MoreHorizontal size={16} />
      </button>
      {open && createPortal(
        <div 
          ref={menuRef}
          style={{ top: coords.top, left: coords.left }}
          className="absolute z-[100] w-44 bg-white dark:bg-surface-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-surface-100 dark:border-surface-700 py-1 animate-fade-in"
        >
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false); }}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors text-left', action.danger ? 'text-danger-600 dark:text-danger-400' : 'text-surface-700 dark:text-surface-300')}
            >
              {action.icon && <action.icon size={14} />}
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
