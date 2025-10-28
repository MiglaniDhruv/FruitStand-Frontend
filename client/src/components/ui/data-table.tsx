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
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, LucideIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { PaginationMetadata } from "../../../shared/schema";
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SkeletonTable, SkeletonList } from "@/components/ui/skeleton-loaders";
import { EmptyState, EmptySearchState } from "@/components/ui/empty-state";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { useHapticFeedback } from "@/hooks/use-haptic-feedback";
import { PullToRefreshIndicator } from "@/components/ui/pull-to-refresh-indicator";

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
  emptyStateIcon?: LucideIcon;
  emptyStateTitle?: string;
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
  /**
   * Current search term for differentiated empty states
   */
  searchTerm?: string;
  /**
   * Whether there are active filters for differentiated empty states
   */
  hasActiveFilters?: boolean;
  /**
   * Callback for pull-to-refresh action on mobile
   */
  onRefresh?: () => Promise<void>;
  /**
   * Enable swipe-to-delete on mobile card views
   */
  enableSwipeToDelete?: boolean;
  /**
   * Callback when item is swiped to delete
   */
  onSwipeDelete?: (item: T) => void | Promise<void>;
  /**
   * Swipe distance threshold in pixels (default: 80)
   */
  swipeDeleteThreshold?: number;
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
  emptyStateIcon,
  emptyStateTitle,
  onEmptyAction,
  emptyActionLabel,
  searchTerm,
  hasActiveFilters = false,
  onRefresh,
  enableSwipeToDelete = false,
  onSwipeDelete,
  swipeDeleteThreshold = 80,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
  const [currentSortBy, setCurrentSortBy] = useState<string | null>(null);
  const [currentSortOrder, setCurrentSortOrder] = useState<'asc' | 'desc'>('asc');

  // Mobile detection and responsive logic
  const isMobile = useIsMobile();
  const { hapticHeavy } = useHapticFeedback();
  
  // Pull-to-refresh support
  const {
    ref: pullToRefreshRef,
    shouldShowIndicator,
    pullProgress,
    isRefreshing,
    refreshStatus,
  } = usePullToRefresh({
    onRefresh: onRefresh || (() => Promise.resolve()),
    enabled: !!onRefresh && isMobile,
  });
  
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

  // Clear selections when data or rowKey changes (prevents stale selections)
  useEffect(() => {
    setSelectedRows(new Set());
    onRowSelect?.([]);
    onRowSelectIds?.([]);
  }, [data, rowKey]);

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
    const rowId = getNestedValue(item, rowKey);
    
    // Guard: Require stable rowKey when selection is enabled
    if (enableRowSelection && (rowId === undefined || rowId === null)) {
      console.warn(
        `DataTable: Missing rowKey "${rowKey}" for item at index ${index}. ` +
        `Selection may be unstable. Provide a valid rowKey or disable selection.`,
        item
      );
      // Still return index as fallback, but warn about instability
    }
    
    return rowId !== undefined && rowId !== null ? rowId : index;
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

  // Helper function to render the appropriate empty state
  const renderEmptyState = () => {
    // If there's a search term or active filters, show search empty state
    if (searchTerm?.trim() || hasActiveFilters) {
      return <EmptySearchState searchTerm={searchTerm?.trim()} />;
    }
    
    // Otherwise show regular empty state
    if (emptyStateIcon) {
      return (
        <EmptyState
          icon={emptyStateIcon}
          title={emptyStateTitle || "No results"}
          description={emptyMessage}
          action={onEmptyAction ? {
            label: emptyActionLabel || "Add New",
            onClick: onEmptyAction
          } : undefined}
        />
      );
    }
    
    return (
      <div className="h-24 text-center text-muted-foreground flex items-center justify-center">
        {emptyMessage}
      </div>
    );
  };

  // Mobile Card View Component
  const MobileCardView = () => {
    if (data.length === 0) {
      return renderEmptyState();
    }

    if (mobileCardRenderer) {
      return (
        <div className="space-y-4">
          {data.map((item, index) => {
            const rowId = getRowId(item, index);
            return (
              <SwipeableCard
                key={rowId}
                item={item}
                rowId={rowId}
                index={index}
              >
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
              </SwipeableCard>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((item, index) => {
          const rowId = getRowId(item, index);
          const primaryColumn = visibleColumns[0];
          const otherColumns = visibleColumns.slice(1);
          
          return (
            <SwipeableCard
              key={rowId}
              item={item}
              rowId={rowId}
              index={index}
            >
              <Card size="sm" hover>
                <CardHeader className="pb-3">
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
                  <div className="space-y-3">
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
            </SwipeableCard>
          );
        })}
      </div>
    );
  };

  // Swipeable Card Wrapper Component
  const SwipeableCard = ({ children, item, rowId, index }: {
    children: React.ReactNode;
    item: T;
    rowId: any;
    index: number;
  }) => {
    const {
      ref: swipeRef,
      swipeDistance,
      isSwiping,
      swipeDirection,
    } = useSwipeGesture({
      onSwipeLeft: () => {
        if (onSwipeDelete) {
          hapticHeavy();
          onSwipeDelete(item);
        }
      },
      enabled: enableSwipeToDelete && isMobile,
      threshold: swipeDeleteThreshold,
    });

    if (!enableSwipeToDelete || !isMobile) {
      return <>{children}</>;
    }

    const showDeleteIndicator = isSwiping && swipeDirection === 'left' && Math.abs(swipeDistance) > swipeDeleteThreshold / 2;
    const willTriggerDelete = Math.abs(swipeDistance) >= swipeDeleteThreshold;

    return (
      <div className="relative" ref={swipeRef as React.RefObject<HTMLDivElement>}>
        {/* Delete indicator background */}
        {showDeleteIndicator && (
          <div 
            className={`absolute inset-0 flex items-center justify-end px-6 rounded-lg transition-colors ${
              willTriggerDelete ? 'bg-destructive' : 'bg-destructive/50'
            }`}
          >
            <Trash2 className="h-5 w-5 text-destructive-foreground" />
          </div>
        )}
        
        {/* Card content with swipe transform */}
        <div
          style={{
            transform: isSwiping ? `translateX(${swipeDistance}px)` : 'translateX(0)',
            transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {children}
        </div>
      </div>
    );
  };

  // Loading state with mobile card view support
  const LoadingView = () => {
    if (shouldShowCardView) {
      return <SkeletonList count={5} variant="list" />;
    }

    return (
      <SkeletonTable 
        rows={5} 
        columns={visibleColumns.length + (enableRowSelection ? 1 : 0)}
        showHeader={true}
      />
    );
  };

  if (isLoading) {
    return (
      <ErrorBoundary resetKeys={generateResetKeys()} fallback={TableErrorFallback}>
        <div className="space-y-6">
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
      <div className="space-y-6">
        {shouldShowCardView ? (
          <div ref={pullToRefreshRef as React.RefObject<HTMLDivElement>} className="relative">
            {/* Pull-to-refresh indicator */}
            {shouldShowIndicator && (
              <PullToRefreshIndicator
                refreshStatus={refreshStatus}
                pullProgress={pullProgress}
                isRefreshing={isRefreshing}
              />
            )}
            <MobileCardView />
          </div>
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
                  {visibleColumns.map((column) => {
                    const getSortLabel = () => {
                      if (currentSortBy === column.accessorKey) {
                        return currentSortOrder === 'asc' 
                          ? `Sort by ${column.header}, currently ascending` 
                          : `Sort by ${column.header}, currently descending`;
                      }
                      return `Sort by ${column.header}, currently unsorted`;
                    };
                    
                    const sortProps = column.enableSorting
                      ? {
                          "aria-sort": (
                            currentSortBy === column.accessorKey 
                              ? currentSortOrder === 'asc' ? 'ascending' : 'descending'
                              : 'none'
                          ) as 'ascending' | 'descending' | 'none'
                        }
                      : {};
                    
                    return (
                      <TableHead 
                        key={column.accessorKey}
                        {...sortProps}
                      >
                        {column.enableSorting ? (
                          <Button
                            variant="ghost"
                            onClick={() => handleSort(column.accessorKey)}
                            className="-ml-4 min-h-[44px] min-w-[44px] p-2 hover:bg-transparent transition-all duration-150"
                            data-testid={`sort-${column.accessorKey}`}
                            aria-label={getSortLabel()}
                          >
                            {column.header}
                            {getSortIcon(column.accessorKey)}
                          </Button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0)}
                      className="p-0"
                    >
                      {renderEmptyState()}
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
        {paginationMetadata && !(data.length === 0 && !isLoading && (!paginationMetadata.totalPages || paginationMetadata.totalPages <= 1)) && (
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