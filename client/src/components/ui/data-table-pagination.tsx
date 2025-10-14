import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { PaginationMetadata } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

interface DataTablePaginationProps {
  // New server-side pagination props
  paginationMetadata?: PaginationMetadata;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  selectedRowCount?: number;
  isLoading?: boolean;
  // Legacy props for backward compatibility
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  totalCount?: number;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  paginationMetadata,
  onPageChange,
  onPageSizeChange,
  selectedRowCount = 0,
  isLoading = false,
  // Legacy props for backward compatibility
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  totalCount: totalCountProp,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
  // Mobile detection
  const isMobile = useIsMobile();

  // Use metadata if available, otherwise fall back to individual props
  // Handle both naming schemes: page/currentPage, limit/pageSize, total/totalCount/totalItems
  const current = paginationMetadata?.page ?? currentPage ?? 1;
  const total = paginationMetadata?.totalPages ?? totalPages ?? 1;
  const size = paginationMetadata?.limit ?? pageSize ?? 10;
  const totalCount = paginationMetadata?.total ?? totalCountProp ?? totalItems ?? 0;
  
  const startItem = totalCount === 0 ? 0 : (current - 1) * size + 1;
  const endItem = Math.min(current * size, totalCount);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2 py-4" aria-busy={isLoading}>
      <div className="text-xs md:text-sm text-muted-foreground">
        {selectedRowCount > 0 ? (
          `${selectedRowCount} of ${totalCount} row(s) selected.`
        ) : (
          isMobile ? `${totalCount} rows` : `${totalCount} row(s) total.`
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
        <div className="flex items-center space-x-2">
          <p className="text-xs md:text-sm font-medium">Rows per page</p>
          <Select
            value={size.toString()}
            onValueChange={isLoading ? undefined : (value) => onPageSizeChange(Number(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="h-11 w-[70px]" disabled={isLoading} data-testid="select-page-size">
              <SelectValue placeholder={size} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[80px] md:w-[100px] items-center justify-center text-xs md:text-sm font-medium text-center">
          {totalCount === 0 ? (
            "0 of 0"
          ) : (
            `${startItem}-${endItem} of ${totalCount}`
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-11 w-11 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={
              (paginationMetadata?.hasPrevious !== undefined 
                ? !paginationMetadata.hasPrevious 
                : current === 1
              ) || isLoading
            }
            data-testid="button-first-page"
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-11 w-11 p-0"
            onClick={() => onPageChange(current - 1)}
            disabled={
              (paginationMetadata?.hasPrevious !== undefined 
                ? !paginationMetadata.hasPrevious 
                : current === 1
              ) || isLoading
            }
            data-testid="button-previous-page"
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex w-[80px] md:w-[100px] items-center justify-center text-xs md:text-sm font-medium">
            {isMobile ? `${current}/${total}` : `Page ${current} of ${total}`}
          </div>
          <Button
            variant="outline"
            className="h-11 w-11 p-0"
            onClick={() => onPageChange(current + 1)}
            disabled={
              (paginationMetadata?.hasNext !== undefined 
                ? !paginationMetadata.hasNext 
                : current === total
              ) || isLoading
            }
            data-testid="button-next-page"
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-11 w-11 p-0 lg:flex"
            onClick={() => onPageChange(total)}
            disabled={
              (paginationMetadata?.hasNext !== undefined 
                ? !paginationMetadata.hasNext 
                : current === total
              ) || isLoading
            }
            data-testid="button-last-page"
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}