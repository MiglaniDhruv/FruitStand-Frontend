import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface DataTableColumn<T> {
  accessorKey: string;
  header: string;
  cell?: (value: any, item: T) => React.ReactNode;
  enableSorting?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  searchTerm?: string;
  searchFields?: string[];
  pageSize?: number;
  pageSizeOptions?: number[];
  enableRowSelection?: boolean;
  onRowSelect?: (selectedRows: T[]) => void;
  rowKey?: string;
  isLoading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  searchTerm = "",
  searchFields = [],
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  enableRowSelection = false,
  onRowSelect,
  rowKey = "id",
  isLoading = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) return data;
    
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = getNestedValue(item, field);
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, searchFields]);

  // Paginate filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Helper function to get nested object values
  function getNestedValue(obj: any, path: string) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Handle page size change
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
    
    if (onRowSelect) {
      const selectedItems = data.filter(item => 
        newSelectedRows.has(getNestedValue(item, rowKey))
      );
      onRowSelect(selectedItems);
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRowIds = new Set(
        paginatedData.map(item => getNestedValue(item, rowKey))
      );
      setSelectedRows(allRowIds);
      if (onRowSelect) {
        onRowSelect(paginatedData);
      }
    } else {
      setSelectedRows(new Set());
      if (onRowSelect) {
        onRowSelect([]);
      }
    }
  };

  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every(item => selectedRows.has(getNestedValue(item, rowKey)));
  const isIndeterminate = paginatedData.some(item => 
    selectedRows.has(getNestedValue(item, rowKey))
  ) && !isAllSelected;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {enableRowSelection && <TableHead className="w-12" />}
                {columns.map((column) => (
                  <TableHead key={column.accessorKey}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {enableRowSelection && (
                    <TableCell>
                      <div className="h-4 w-4 animate-pulse bg-muted rounded" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.accessorKey}>
                      <div className="h-4 animate-pulse bg-muted rounded w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          currentPage={1}
          totalPages={1}
          pageSize={pageSize}
          totalItems={0}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          pageSizeOptions={pageSizeOptions}
          selectedRowCount={0}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {enableRowSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.accessorKey}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => {
                const rowId = getNestedValue(item, rowKey);
                const isSelected = selectedRows.has(rowId);
                
                return (
                  <TableRow
                    key={rowId || index}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    {enableRowSelection && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleRowToggle(rowId)}
                          aria-label={`Select row ${index + 1}`}
                          data-testid={`checkbox-row-${index}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => {
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
      <DataTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredData.length}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={pageSizeOptions}
        selectedRowCount={selectedRows.size}
      />
    </div>
  );
}