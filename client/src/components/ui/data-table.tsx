import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PaginationMetadata } from "@shared/schema";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DataTableColumn<T> {
  accessorKey: string;
  header: string;
  cell?: (value: any, item: T) => React.ReactNode;
  enableSorting?: boolean;
  hideOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low';
  mobileLabel?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  enableRowSelection?: boolean;
  /** 
   * Called with selected items from current page only. 
   * Use onRowSelectIds for global selection tracking.
   */
  onRowSelect?: (selectedItems: T[]) => void;
  /**
   * Called with all selected row IDs across all pages.
   * Provides global selection state management.
   */
  onRowSelectIds?: (ids: any[]) => void;
  /**
   * Selection behavior mode:
   * - 'page': Selection is cleared when changing pages (default)
   * - 'global': Selection persists across page changes
   */
  selectionMode?: 'page' | 'global';
  /**
   * Key to use for row identification (default: "id")
   */
  rowKey?: string;
  isLoading?: boolean;
  paginationMetadata?: PaginationMetadata;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSearchChange?: (search: string) => void;
  onSortChange?: (sortBy: string, sortOrder: string) => void;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  /**
   * Key to use for error boundary reset detection. 
   * Falls back to data length and first/last row IDs if not provided.
   */
  resetKey?: string | number;
  enableMobileCardView?: boolean;
  cardViewBreakpoint?: number;
  mobileCardRenderer?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  paginationMetadata,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
  enableRowSelection = false,
  onRowSelect,
  onRowSelectIds,
  selectionMode = 'page',
  rowKey = "id",
  isLoading = false,
  pageSizeOptions,
  emptyMessage = "No results.",
  resetKey,
  enableMobileCardView = false,
  cardViewBreakpoint = 768,
  mobileCardRenderer,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
  const [currentSortBy, setCurrentSortBy] = useState<string | null>(null);
  const [currentSortOrder, setCurrentSortOrder] = useState<'asc' | 'desc'>('asc');

  // Mobile detection and responsive logic
  const isMobile = useIsMobile();
  
  // Custom breakpoint detection for card view
  const [isNarrowScreen, setIsNarrowScreen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < cardViewBreakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(`(max-width: ${cardViewBreakpoint - 1}px)`);
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsNarrowScreen(e.matches);
    };
    
    // Set initial value
    handleChange(mediaQuery);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [cardViewBreakpoint]);

  const shouldShowCardView = isNarrowScreen && enableMobileCardView;
  const visibleColumns = isNarrowScreen ? columns.filter(col => !col.hideOnMobile) : columns;

  const handleSort = (columnKey: string) => {
    if (!onSortChange) return;
    
    let newSortOrder: 'asc' | 'desc';
    
    if (currentSortBy === columnKey) {
      // Toggle between asc and desc for the same column
      newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, start with asc
      newSortOrder = 'asc';
    }
    
    setCurrentSortBy(columnKey);
    setCurrentSortOrder(newSortOrder);
    onSortChange(columnKey, newSortOrder);
  };

  const getSortIcon = (columnKey: string) => {
    if (currentSortBy !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return currentSortOrder === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Helper function to get nested object values
  function getNestedValue(obj: any, path: string) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Helper function to get row ID
  const getRowId = (item: T, index: number) => {
    return getNestedValue(item, rowKey) || index;
  };

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    // Clear selections when changing page size in 'page' mode
    if (selectionMode === 'page') {
      setSelectedRows(new Set());
      onRowSelect?.([]);
      onRowSelectIds?.([]);
    }
    onPageSizeChange?.(newPageSize);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    // Clear selections when changing pages in 'page' mode
    if (selectionMode === 'page') {
      setSelectedRows(new Set());
      onRowSelect?.([]);
      onRowSelectIds?.([]);
    }
    onPageChange?.(page);
  };

  // Handle row selection
  const handleRowToggle = (rowId: any) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowId)) {
      newSelectedRows.delete(rowId);
    } else {
      newSelectedRows.add(rowId);
    }
    setSelectedRows(newSelectedRows);
    
    // Call onRowSelect with current page items only
    if (onRowSelect) {
      const selectedItems = data.filter(item => 
        newSelectedRows.has(getNestedValue(item, rowKey))
      );
      onRowSelect(selectedItems);
    }

    // Call onRowSelectIds with all selected IDs (global scope)
    if (onRowSelectIds) {
      onRowSelectIds(Array.from(newSelectedRows));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    // Normalize indeterminate to false
    const isChecked = checked === true;
    
    let newSelectedRows: Set<any>;
    
    if (isChecked) {
      if (selectionMode === 'page') {
        // In page mode, select only current page items
        newSelectedRows = new Set(
          data.map(item => getNestedValue(item, rowKey))
        );
      } else {
        // In global mode, add current page items to existing selection
        newSelectedRows = new Set(selectedRows);
        data.forEach(item => {
          newSelectedRows.add(getNestedValue(item, rowKey));
        });
      }
    } else {
      if (selectionMode === 'page') {
        // In page mode, deselect only current page items
        newSelectedRows = new Set(selectedRows);
        data.forEach(item => {
          newSelectedRows.delete(getNestedValue(item, rowKey));
        });
      } else {
        // In global mode, clear all selections
        newSelectedRows = new Set();
      }
    }
    
    setSelectedRows(newSelectedRows);
    
    // Call onRowSelect with current page selected items
    if (onRowSelect) {
      const selectedItems = data.filter(item => 
        newSelectedRows.has(getNestedValue(item, rowKey))
      );
      onRowSelect(selectedItems);
    }

    // Call onRowSelectIds with all selected IDs
    if (onRowSelectIds) {
      onRowSelectIds(Array.from(newSelectedRows));
    }
  };

  const isAllSelected = data.length > 0 && 
    data.every(item => selectedRows.has(getNestedValue(item, rowKey)));
  const isIndeterminate = data.some(item => 
    selectedRows.has(getNestedValue(item, rowKey))
  ) && !isAllSelected;

  const TableErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Failed to load table data</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>An error occurred while rendering the table.</p>
        <div className="flex gap-2">
          <Button onClick={resetError} size="sm">
            Try Again
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Reload Page
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );

  // Generate meaningful reset keys for error boundary
  const generateResetKeys = (): (string | number)[] => {
    if (resetKey !== undefined) return [resetKey];
    
    const keys: (string | number)[] = [data.length];
    
    if (data.length > 0) {
      // Add first and last row IDs for content change detection
      const firstRowId = getNestedValue(data[0], rowKey);
      const lastRowId = getNestedValue(data[data.length - 1], rowKey);
      if (firstRowId !== undefined) keys.push(firstRowId);
      if (lastRowId !== undefined && lastRowId !== firstRowId) keys.push(lastRowId);
    }
    
    return keys;
  };

  // Mobile Card View Component
  const MobileCardView = () => {
    if (data.length === 0) {
      return (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            {emptyMessage}
          </div>
        </Card>
      );
    }

    if (mobileCardRenderer) {
      return (
        <div className="space-y-3">
          {data.map((item, index) => {
            const rowId = getRowId(item, index);
            return (
              <div key={rowId} className="space-y-2">
                {enableRowSelection && (
                  <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                    <Checkbox
                      checked={selectedRows.has(rowId)}
                      onCheckedChange={() => handleRowToggle(rowId)}
                      aria-label={`Select row ${index + 1}`}
                    />
                  </div>
                )}
                {mobileCardRenderer(item)}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          const rowId = getRowId(item, index);
          const primaryColumn = visibleColumns[0];
          const otherColumns = visibleColumns.slice(1);
          
          return (
            <Card key={rowId} className="p-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {primaryColumn ? (
                      primaryColumn.cell 
                        ? primaryColumn.cell(getNestedValue(item, primaryColumn.accessorKey), item)
                        : String(getNestedValue(item, primaryColumn.accessorKey) || '')
                    ) : ''}
                  </CardTitle>
                  {enableRowSelection && (
                    <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                      <Checkbox
                        checked={selectedRows.has(rowId)}
                        onCheckedChange={() => handleRowToggle(rowId)}
                        aria-label={`Select ${primaryColumn?.header || 'item'}`}
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {otherColumns.map((column) => (
                    <div key={column.accessorKey} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {column.mobileLabel || column.header}:
                      </span>
                      <span>
                        {column.cell 
                          ? column.cell(getNestedValue(item, column.accessorKey), item)
                          : String(getNestedValue(item, column.accessorKey) || '')
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Loading state with mobile card view support
  const LoadingView = () => {
    if (shouldShowCardView) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {enableRowSelection && (
                <TableHead className="min-w-[44px] min-h-[44px]">
                  <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                    <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                  </div>
                </TableHead>
              )}
              {visibleColumns.map((column) => (
                <TableHead key={column.accessorKey}>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {enableRowSelection && (
                  <TableCell>
                    <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                      <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </div>
                  </TableCell>
                )}
                {visibleColumns.map((column) => (
                  <TableCell key={column.accessorKey}>
                    <div className="h-4 bg-muted rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <ErrorBoundary resetKeys={generateResetKeys()} fallback={TableErrorFallback}>
        <div className="space-y-4">
          <LoadingView />
          {paginationMetadata && (
            <DataTablePagination
              paginationMetadata={paginationMetadata}
              onPageChange={onPageChange || (() => {})}
              onPageSizeChange={onPageSizeChange || (() => {})}
              pageSizeOptions={pageSizeOptions}
            />
          )}
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary resetKeys={generateResetKeys()} fallback={TableErrorFallback}>
      <div className="space-y-4">
        {shouldShowCardView ? (
          <MobileCardView />
        ) : (
          <div className="rounded-md border">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  {enableRowSelection && (
                    <TableHead className="min-w-[44px] min-h-[44px]">
                      <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isIndeterminate}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                          data-testid="checkbox-select-all"
                        />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.map((column) => (
                                    <TableHead key={column.accessorKey}>
                      {column.enableSorting ? (
                        <Button
                          variant="ghost"
                          onClick={() => handleSort(column.accessorKey)}
                          className="-ml-4 min-h-[44px] min-w-[44px] p-2 hover:bg-transparent"
                          data-testid={`sort-${column.accessorKey}`}
                        >
                          {column.header}
                          {getSortIcon(column.accessorKey)}
                        </Button>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0)}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => {
                    const rowId = getNestedValue(item, rowKey);
                    const isSelected = selectedRows.has(rowId);
                    
                    return (
                      <TableRow
                        key={rowId || index}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        {enableRowSelection && (
                          <TableCell>
                            <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleRowToggle(rowId)}
                                aria-label={`Select row ${index + 1}`}
                                data-testid={`checkbox-row-${index}`}
                              />
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.map((column) => {
                          const value = getNestedValue(item, column.accessorKey);
                          return (
                            <TableCell key={column.accessorKey}>
                              {column.cell ? column.cell(value, item) : value}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {paginationMetadata && (
          <DataTablePagination
            paginationMetadata={paginationMetadata}
            onPageChange={onPageChange || (() => {})}
            onPageSizeChange={onPageSizeChange || (() => {})}
            pageSizeOptions={pageSizeOptions}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}